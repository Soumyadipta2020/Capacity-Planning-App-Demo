"""Read selected analytics inputs without synthetic rows or version fallbacks."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from config import EnvironmentConfig
from data_manager import CATEGORY_FOLDER_MAP


def frame_payload(frame):
    frame = frame.drop(columns=[c for c in frame.columns if str(c).startswith("__") or c == "file_version"], errors="ignore")
    rows = json.loads(frame.to_json(orient="records", date_format="iso"))
    canonical = sorted(json.dumps(row, sort_keys=True, ensure_ascii=True) for row in rows)
    digest = hashlib.sha256("\n".join(canonical).encode("utf-8")).hexdigest()
    return {"rows": rows, "columns": list(frame.columns), "hash": digest, "rowCount": len(rows)}


def load_source(key, version, engine=None):
    """A missing exact version is an error, never an invitation to seed sample data."""
    if key not in EnvironmentConfig.OPERATIONAL_INPUT_LABELS:
        raise ValueError("Unknown input category")
    if not isinstance(version, str) or not version.strip() or any(c in version for c in ("/", "\\", "\x00")) or version in {".", ".."}:
        raise ValueError("A valid selected file version is required")
    if EnvironmentConfig.get_storage_mode() == "databricks":
        if engine is None or not engine.is_databricks_active():
            raise RuntimeError("Databricks is unavailable; analytics will not substitute local data")
        table = engine.get_table_name(key)
        engine._validate_identifier(table)
        engine._validate_identifier(EnvironmentConfig.get_catalog())
        engine._validate_identifier(EnvironmentConfig.get_schema())
        with engine.cluster_manager.get_cursor() as cursor:
            cursor.execute(f"SELECT * FROM {engine._full_table_name(table)} WHERE file_version = {engine._sql_literal(version)}")
            frame = pd.DataFrame(cursor.fetchall(), columns=[c[0] for c in cursor.description])
        if frame.empty:
            raise ValueError("Selected Databricks version has no rows")
        return {**frame_payload(frame), "source": "Databricks", "version": version}

    directory = (EnvironmentConfig.get_data_dir() / CATEGORY_FOLDER_MAP[key]).resolve()
    name = version.replace(":", "-")
    names = {name.lower(), f"{name}.csv".lower(), f"{name}.xlsx".lower(), f"{name}.xls".lower()}
    candidates = [p for p in directory.iterdir() if p.is_file() and p.name.lower() in names] if directory.exists() else []
    if len(candidates) != 1:
        raise ValueError("Selected file is missing or ambiguous")
    path = candidates[0].resolve()
    if path.parent != directory:
        raise ValueError("Selected file is outside its input folder")
    frame = pd.read_excel(path) if path.suffix.lower() in {".xlsx", ".xls"} else pd.read_csv(path)
    return {**frame_payload(frame), "source": "Local file", "version": version}


def load_analytics_bundle(scenario, engine=None):
    sources = {}
    for key in EnvironmentConfig.OPERATIONAL_INPUT_LABELS:
        version = scenario.get("inputs", {}).get(key, "")
        try:
            sources[key] = {"success": True, **load_source(key, version, engine)}
        except Exception as error:
            sources[key] = {"success": False, "version": version, "rows": [], "columns": [], "rowCount": 0, "error": str(error)}
    return {
        "success": True,
        "scenarioId": scenario.get("id", "Draft inputs"),
        "loadedAt": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
    }
