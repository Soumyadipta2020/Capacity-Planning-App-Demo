"""Capacity Desk source adapter. Missing source data never becomes generated data."""
from datetime import date, timedelta
from hashlib import sha256
from pathlib import Path
import json
import math
import pandas as pd
from terminology import input_label

CONTRACT = "capacity-desk-hours-v1"


def demo_dataset():
    """Deterministic demonstration, independent of the legacy random analytics."""
    rows = []
    regions = [("North", "N1", "Newcastle"), ("Midlands", "M1", "Birmingham"),
               ("East", "E1", "Cambridge"), ("South", "S1", "Reading")]
    for r, (region, area, patch) in enumerate(regions):
        for s, skill in enumerate(("HEC", "KAC", "EV")):
            for w in range(8):
                demand = 700 + r * 115 + s * 160 + w * 32
                capacity = demand + [-85, 45, -30, 90, -15, 50, -60, 75, -25, 95, 40, 60][r * 3 + s] - w * (s + 2) * 6
                rows.append(dict(region=region, area=area, patch=patch, skill=skill,
                                 week=(date(2026, 11, 16) + timedelta(weeks=w)).isoformat(),
                                 demand=float(demand), capacity=float(capacity)))
    return _package(rows, "demo", [{"category": "demonstration", "file": "Deterministic 8-week example", "sha256": None}],
                    ["Synthetic planning hours. No operational staffing or SLA claim.",
                     "37.5 hours per FTE-week is a planning assumption; change it before running."])


def _package(rows, mode, sources, notes):
    encoded = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()
    return dict(contract=CONTRACT, mode=mode, rows=rows, sources=sources, notes=notes,
                snapshot=sha256(encoded).hexdigest(), hoursPerFte=37.5)


def _read_source(category, filename):
    from config import EnvironmentConfig
    from data_manager import CATEGORY_FOLDER_MAP
    display = input_label(category)
    if not isinstance(filename, str) or not filename or Path(filename).name != filename or any(c in filename for c in ("/", "\\", "..")):
        raise ValueError(f"{display}: select a valid file version.")
    from engine.data_engine import CapacityDataEngine
    engine = CapacityDataEngine.get_instance()
    if engine.is_databricks_active():
        # The legacy engine retries the entire table when a version is empty.
        # Planning must query the exact version and must never take that fallback.
        table = engine._full_table_name(engine.get_table_name(category))
        query = f"SELECT * FROM {table} WHERE file_version = {engine._sql_literal(filename)}"
        if engine.spark is not None:
            frame = engine.spark.sql(query).toPandas()
        else:
            with engine.cluster_manager.get_cursor() as cursor:
                cursor.execute(query)
                columns = [str(c[0]) for c in cursor.description]
                frame = pd.DataFrame(cursor.fetchall(), columns=columns)
        if frame.empty:
            raise ValueError(f"{display}: selected Databricks version has no rows. No other version was substituted.")
        frame = frame.drop(columns=["file_version"], errors="ignore")
        digest = sha256(frame.to_csv(index=False).encode()).hexdigest()
        return frame, dict(category=category, file=filename, sha256=digest, storage="databricks")
    if EnvironmentConfig.is_databricks() or EnvironmentConfig.get_storage_mode() == "databricks":
        raise ValueError("Databricks is unavailable. Reconnect compute before validating selected sources; no local data was substituted.")
    folder = (EnvironmentConfig.get_data_dir() / CATEGORY_FOLDER_MAP[category]).resolve()
    target = filename.replace(":", "-")
    candidates = [p for p in folder.iterdir() if p.is_file() and (p.stem.lower() == target.lower() or p.name.lower() == target.lower())] if folder.exists() else []
    if not candidates:
        raise ValueError(f"{display}: file '{filename}' is missing. No example data was substituted.")
    path = sorted(candidates)[0].resolve()
    if path.parent != folder:
        raise ValueError("Source path is outside its input folder.")
    frame = pd.read_excel(path) if path.suffix.lower() in (".xlsx", ".xls") else pd.read_csv(path)
    return frame, dict(category=category, file=filename, sha256=sha256(path.read_bytes()).hexdigest(), storage="local")


def normalize_frames(demand, supply):
    """Explicit hours contract: unique region/area/patch/skill/Monday, no inferred roster math."""
    keys = ["region", "area", "patch", "skill", "week"]
    frames = []
    for label, frame, measure in (("Demand", demand, "demand"), ("Resource plan", supply, "capacity")):
        frame = frame.copy()
        frame.columns = [str(c).strip().lower().replace(" ", "").replace("_", "") for c in frame.columns]
        frame = frame.rename(columns={"acdm": "area", "weekcomm": "week", "demandhours": "demand", "capacityhours": "capacity"})
        missing = set(keys + [measure]) - set(frame.columns)
        if missing:
            raise ValueError(f"{label}: missing hours-contract columns: {', '.join(sorted(missing))}. Download the Capacity Desk source template. Raw job counts and roster records need an approved transformation into weekly productive hours.")
        frame = frame[keys + [measure]].copy()
        if frame.empty or frame[keys].isna().any().any():
            raise ValueError(f"{label}: empty data or missing planning keys.")
        for key in keys[:-1]:
            frame[key] = frame[key].astype(str).str.strip()
            if (frame[key] == "").any():
                raise ValueError(f"{label}: blank {key}.")
        dates = pd.to_datetime(frame["week"], errors="coerce")
        if dates.isna().any() or (dates.dt.day_of_week != 0).any():
            raise ValueError(f"{label}: week must be a valid Monday date.")
        frame["week"] = dates.dt.strftime("%Y-%m-%d")
        frame[measure] = pd.to_numeric(frame[measure], errors="coerce")
        if not frame[measure].map(lambda v: math.isfinite(v) and v >= 0).all():
            raise ValueError(f"{label}: hours must be finite and non-negative.")
        if frame.duplicated(keys).any():
            raise ValueError(f"{label}: duplicate patch/skill/week keys. Aggregate explicitly before upload.")
        frames.append(frame)
    merged = frames[0].merge(frames[1], on=keys, how="outer", indicator=True, validate="one_to_one")
    if (merged["_merge"] != "both").any():
        raise ValueError("Demand and capacity have unmatched region/area/patch/skill/weeks. Align both sources; missing capacity is not silently treated as zero.")
    if merged.groupby("patch")[["region", "area"]].nunique().gt(1).any().any():
        raise ValueError("A patch maps to multiple regions or areas.")
    return merged.drop(columns="_merge").sort_values(keys).to_dict(orient="records")


def selected_dataset(inputs):
    demand, ds = _read_source("demand_input", inputs.get("demand_input", ""))
    supply, ss = _read_source("resource_plan", inputs.get("resource_plan", ""))
    rows = normalize_frames(demand, supply)
    return _package(rows, "selected", [ds, ss], [
        "Selected demand and resource-plan files supply weekly productive hours.",
        "The other 19 input versions remain in the scenario manifest. They are not silently applied to productive hours a second time.",
        "Overtime, recruitment ramp and transfers are applied only through the explicit scenario drivers."])
