"""
Final Scenario Data & Scenario Log Engine
-----------------------------------------
Manages:
1. Final Scenario Plan Data (`es_powerbi_model_checker_plan`) with exact 11 columns:
   patch, skill, group, metric, level2, flag, period, weekcomm, value, version, create_datestamp
   covering all 125 distinct (skill, group, metric, level2, flag) combinations,
   period='W' (weekly from 2026-11-02 to 2027-12-27) and period='M' (monthly 2026-11-01 to 2027-12-01).
2. Scenario Log Table (`es_shiny_scenario_log`) with exact 32 columns:
   key, last_update, remarks, delete_flag,
   fte_key, avl_key, capacity_key, demand_key, workload_key, imbalance_key,
   fte, fte_tran, attr, recr_grnd, recr_ungrnd, baseline_assmp,
   overlaysperc, overlayshours, overlayshrsfte, bank_hrs, recr_prod,
   baseline_prod, training_snm, mtp_demand, job_time, heconkac, heconev,
   contractors, geog_map, weektomonth, fte_tran_check, recr_ungr_check.
3. Deterministic scenario generation linked to the Inputs & Parameters selections.
4. Compact serialization payloads for Scenario Diff and Decision Studio tabs.
"""

from __future__ import annotations

import hashlib
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from config import EnvironmentConfig

# ---------------------------------------------------------------------------
# Canonical Schemas
# ---------------------------------------------------------------------------

FINAL_DATA_COLUMNS: List[str] = [
    "region",
    "area_code",
    "patch",
    "skill",
    "group",
    "metric",
    "level2",
    "flag",
    "period",
    "weekcomm",
    "value",
    "version",
    "create_datestamp",
]

SCENARIO_LOG_COLUMNS: List[str] = [
    "key",
    "last_update",
    "remarks",
    "delete_flag",
    "fte_key",
    "avl_key",
    "capacity_key",
    "demand_key",
    "workload_key",
    "imbalance_key",
    "fte",
    "fte_tran",
    "attr",
    "recr_grnd",
    "recr_ungrnd",
    "baseline_assmp",
    "overlaysperc",
    "overlayshours",
    "overlayshrsfte",
    "bank_hrs",
    "recr_prod",
    "baseline_prod",
    "training_snm",
    "mtp_demand",
    "job_time",
    "heconkac",
    "heconev",
    "contractors",
    "geog_map",
    "weektomonth",
    "fte_tran_check",
    "recr_ungr_check",
]

# Mapping from 20 scenario log input columns -> operational input keys in config.py
LOG_COL_TO_INPUT_KEY: Dict[str, str] = {
    "fte": "resource_plan",
    "fte_tran": "fte_transfer",
    "attr": "attrition",
    "recr_grnd": "recruitment_grounded",
    "recr_ungrnd": "recruitment_ungrounded",
    "baseline_assmp": "baseline_assumptions",
    "overlaysperc": "downtime_overlays_percentage",
    "overlayshours": "downtime_overlays_hours",
    "overlayshrsfte": "downtime_overlays_hours_fte",
    "bank_hrs": "overtime",
    "recr_prod": "recruitment_config",
    "baseline_prod": "baseline_productivity",
    "training_snm": "training_snm",
    "mtp_demand": "demand_input",
    "job_time": "job_time_assumptions",
    "heconkac": "hec_on_kac_demand",
    "heconev": "hec_on_ev_demand",
    "contractors": "ctr_capacity",
    "geog_map": "geography_mapping",
    "weektomonth": "week_to_month",
}

INPUT_KEY_TO_LOG_COL: Dict[str, str] = {v: k for k, v in LOG_COL_TO_INPUT_KEY.items()}

# Which input columns combine to form each Calculation Key
CALC_KEY_INPUTS: Dict[str, List[str]] = {
    "fte_key": ["fte", "fte_tran", "recr_grnd", "recr_ungrnd", "attr", "geog_map", "weektomonth"],
    "avl_key": [
        "fte", "fte_tran", "recr_grnd", "recr_ungrnd", "attr",
        "baseline_assmp", "overlaysperc", "overlayshours", "overlayshrsfte",
        "bank_hrs", "training_snm", "contractors", "geog_map", "weektomonth",
    ],
    "capacity_key": [
        "fte", "fte_tran", "recr_grnd", "recr_ungrnd", "attr",
        "baseline_assmp", "overlaysperc", "overlayshours", "overlayshrsfte",
        "bank_hrs", "recr_prod", "baseline_prod", "training_snm",
        "contractors", "geog_map", "weektomonth",
    ],
    "demand_key": ["mtp_demand", "job_time", "heconkac", "heconev", "geog_map", "weektomonth"],
    "workload_key": ["mtp_demand", "job_time", "heconkac", "heconev", "baseline_prod", "geog_map", "weektomonth"],
    "imbalance_key": [
        "fte", "fte_tran", "recr_grnd", "recr_ungrnd", "attr",
        "baseline_assmp", "overlaysperc", "overlayshours", "overlayshrsfte",
        "bank_hrs", "recr_prod", "baseline_prod", "training_snm",
        "contractors", "mtp_demand", "job_time", "heconkac", "heconev",
        "geog_map", "weektomonth",
    ],
}

# Plan horizon: week 2nd Nov, 2026 to week 27th Dec, 2027 (both Mondays)
PLAN_START_WEEK = "2026-11-02"
PLAN_END_WEEK = "2027-12-27"

# Representative patches across all 4 UK regions (A, B, C, D) in geography_mapping
FINAL_DATA_PATCHES: List[str] = [
    "EA11 Inverness & Aviemore",
    "EA21 Stirling & Falkirk",
    "EB12 Altrincham",
    "EB24 The Wirral",
    "EC81 Peterborough",
    "EC91 Leicester",
    "ED11 Chiswick & City",
    "ED44 Canterbury & Dover",
]

# All 125 distinct (skill, group, metric, level2, flag) combinations from sample_images/distinct combination.jpg
DISTINCT_COMBINATIONS: List[Tuple[str, str, str, str, str]] = [
    # --- Block 1 (45 combinations) ---
    ("HEC", "HEC", "W19", "CHI earth spikes", "Demand Hours"),
    ("HEC", "HEC", "W33", "Hive_Link", "Demand Hours"),
    ("HEC", "HEC", "W17", "S&R EHI bonding leads", "Demand Hours"),
    ("HEC", "HEC", "W10", "HEC OD", "Demand Hours"),
    ("HEC", "HEC", "workload hrs", "-", "Workload Hours"),
    ("HEC", "HEC", "W23", "Electrical Heating", "Demand Hours"),
    ("KAC", "KAC", "W07", "KAC Service Visits", "Demand Hours"),
    ("KAC", "KAC", "W04", "KAC R&C", "Demand Hours"),
    ("KAC", "KAC", "W31", "Samsung", "Demand Hours"),
    ("HEC", "HEC", "W08", "EV Warranty", "Demand Hours"),
    ("KAC", "KAC", "W09", "KAC OD", "Demand Hours"),
    ("HEC", "HEC", "W05", "HEC R&C", "Demand Hours"),
    ("HEC", "HEC", "W02", "HEC_Firstline", "Demand Hours"),
    ("HEC", "HEC", "W11", "EHI", "Demand Hours"),
    ("HEC", "HEC", "W28", "Internal Support HEC", "Demand Hours"),
    ("HEC", "HEC", "W22", "Safety recall", "Demand Hours"),
    ("HEC", "HEC", "W12", "EHI Quote", "Demand Hours"),
    ("HEC", "HEC", "W32", "Hive_Camera", "Demand Hours"),
    ("HEC", "HEC", "W24", "HI PEB", "Demand Hours"),
    ("HEC", "HEC", "W18", "CHI Fuse Board", "Demand Hours"),
    ("KAC", "KAC", "W01", "KAC_Demand", "Demand Hours"),
    ("HEC", "HEC", "W29", "Internal Support KAC", "Demand Hours"),
    ("HEC", "HEC", "W16", "CHI earth Inspections", "Demand Hours"),
    ("HEC", "HEC", "W99", "Haier HEC", "Demand Hours"),
    ("HEC", "HEC", "W25", "SMART follow-up", "Demand Hours"),
    ("HEC", "HEC", "W15", "ES_Hive", "Demand Hours"),
    ("HEC", "HEC", "W00", "W00", "Demand Hours"),
    ("HEC", "HEC", "W26", "Additional Work HEC", "Demand Hours"),
    ("HEC", "HEC", "W13", "HEC Demand", "Demand Hours"),
    ("HEC", "HEC", "W27", "Additional Work KAC", "Demand Hours"),
    ("HEC", "HEC", "W30", "Electrium Safety Recall", "Demand Hours"),
    ("HEC", "HEC", "W14", "EICR", "Demand Hours"),
    ("KAC", "KAC", "workload hrs", "-", "Workload Hours"),
    ("KAC", "KAC", "W98", "Haier KAC", "Demand Hours"),
    ("HEC", "HEC", "W06", "HEC Service Visits", "Demand Hours"),
    ("HEC", "HEC", "W03", "HEC_Secondline", "Demand Hours"),
    ("KAC", "KAC", "Core Hrs", "-", "Available Hours"),
    ("KAC", "KAC", "Available Hrs", "-", "Available Hours"),
    ("KAC", "KAC", "Holiday", "-", "Available Hours"),
    ("KAC", "KAC", "Overtime", "-", "Available Hours"),
    ("KAC", "KAC", "Gross Hrs", "-", "Available Hours"),
    ("KAC", "KAC", "Training", "-", "Available Hours"),
    ("KAC", "KAC", "Sickness", "-", "Available Hours"),
    ("KAC", "KAC", "Other", "-", "Available Hours"),
    ("KAC", "KAC", "Meeting", "-", "Available Hours"),
    # --- Block 2 (45 combinations) ---
    ("HEC", "HEC", "Meeting", "Base Meeting", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Meeting", "Roadshow", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Other", "Assisting", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Meeting", "121", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Other", "HEC SCT Investment Time - Hrs/FTE", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Other", "KAC SCT Investment Time - Hrs/FTE", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Meeting", "Roadshow", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Holiday", "Toil - Hrs/FTE", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Meeting", "GFF3 KAC Pay Negotiations - Hrs/FTE", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Meeting", "Base Meeting", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Meeting", "121", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Meeting", "GFF3 HEC Pay Negotiations - Hrs/FTE", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Holiday", "Toil - Hrs/FTE", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Productive hrs", "-", "Capacity Hours"),
    ("HEC", "HEC", "FTE", "-", "FTE"),
    ("KAC", "KAC", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Productive hrs", "-", "Capacity Hours"),
    ("HEC", "General", "SP", "-", "Capacity Hours"),
    ("KAC", "General", "SP", "-", "Capacity Hours"),
    ("KAC Recruitment", "FQ - DA HEC FA 03 26", "FTE", "-", "FTE"),
    ("HEC Recruitment", "Apprentice - LEI HEC APP 02 26", "FTE", "-", "FTE"),
    ("HEC Recruitment", "Apprentice - TH HEC APP 01 25", "FTE", "-", "FTE"),
    ("HEC Recruitment", "FQ - LEI HEC FA 01 26", "FTE", "-", "FTE"),
    ("HEC Recruitment", "Apprentice - DA HEC APP 01 26", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Holiday", "-", "Available Hours"),
    ("HEC", "HEC", "Other", "SAE Support", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Other", "-", "Available Hours"),
    ("HEC", "HEC", "Training", "ISO", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Training", "EICR", "Downtime Overlay Hours"),
    ("KAC Recruitment", "FQ - LEI HEC FA 04 25", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Training", "Ladders", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Training", "Safety", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Training", "Boiler Wireup Hrs", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Training", "AM2", "Downtime Overlay Hours"),
    ("KAC Recruitment", "Trainee - TH WG 01 25", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Meeting", "-", "Available Hours"),
    ("HEC Recruitment", "Cross Skill - NO CLASS SEE ES 01 25", "FTE", "-", "FTE"),
    ("KAC", "KAC", "Training", "Safety", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Training", "ASHP WIRE UPS", "Downtime Overlay Hours"),
    ("HEC Recruitment", "FQ - HEC FA NO CLASS 03 26", "FTE", "-", "FTE"),
    ("KAC", "KAC", "Other", "EV Van", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Training", "EV Repair", "Downtime Overlay Hours"),
    ("KAC Recruitment", "Trainee - TH WG 01 26", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Sickness", "-", "Available Hours"),
    ("HEC", "HEC", "Gross Hrs", "-", "Available Hours"),
    # --- Block 3 (35 combinations) ---
    ("HEC Recruitment", "FQ - DA HEC FA 03 26", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Overtime", "-", "Available Hours"),
    ("HEC Recruitment", "FQ - LEI HEC FA 02 26", "FTE", "-", "FTE"),
    ("HEC Recruitment", "Apprentice - DA HEC APP 01 25", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Training", "New Starter SnM", "Downtime Overlay Hours"),
    ("KAC", "KAC", "Meeting", "ES Forum", "Downtime Overlay Hours"),
    ("HEC Recruitment", "Apprentice - LEI HEC APP 03 26", "FTE", "-", "FTE"),
    ("HEC Recruitment", "Apprentice - HA HEC APP 01 25", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Training", "EV Installation", "Downtime Overlay Hours"),
    ("KAC Recruitment", "Trainee - LEI WG 01 26", "FTE", "-", "FTE"),
    ("HEC Recruitment", "Apprentice - DA HEC APP 02 26", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Training", "Coaching", "Downtime Overlay Hours"),
    ("KAC Recruitment", "Trainee - TH WG 02 26", "FTE", "-", "FTE"),
    ("KAC Recruitment", "Ungrounded", "FTE", "-", "FTE"),
    ("KAC Recruitment", "Trainee - DA WG 02 26", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Training", "Home Improvement", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Other", "Wire Ups Downtime Overlay", "Downtime Overlay Hours"),
    ("HEC Recruitment", "Apprentice - LEI HEC APP 04 26", "FTE", "-", "FTE"),
    ("HEC Recruitment", "Apprentice - LEI HEC APP 01 26", "FTE", "-", "FTE"),
    ("KAC Recruitment", "FQ - LEI HEC FA 01 26", "FTE", "-", "FTE"),
    ("KAC", "KAC", "Training", "New Starter SnM", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Available Hrs", "-", "Available Hours"),
    ("HEC Recruitment", "FQ - DA HEC 01 25", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Training", "-", "Available Hours"),
    ("HEC Recruitment", "Ungrounded", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Core Hrs", "-", "Available Hours"),
    ("HEC Recruitment", "Apprentice - DA HEC APP 03 26", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Other", "EV Van", "Downtime Overlay Hours"),
    ("HEC Recruitment", "FQ - LEI HEC FA 02 25", "FTE", "-", "FTE"),
    ("HEC", "HEC", "Training", "CAT & GENNY", "Downtime Overlay Hours"),
    ("KAC Recruitment", "Trainee - LEI WG 02 25", "FTE", "-", "FTE"),
    ("KAC", "KAC", "Training", "Samsung", "Downtime Overlay Hours"),
    ("HEC", "HEC", "Meeting", "ES Forum", "Downtime Overlay Hours"),
    ("HEC Recruitment", "FQ - TH HEC FA 01 27", "FTE", "-", "FTE"),
    ("HEC Recruitment", "FQ - TH HEC FA 01 26", "FTE", "-", "FTE"),
]


# ---------------------------------------------------------------------------
# Horizon Helpers
# ---------------------------------------------------------------------------

def get_plan_weeks(start: str = PLAN_START_WEEK, end: str = PLAN_END_WEEK) -> List[str]:
    """Returns all weekly Monday dates from start to end inclusive."""
    d = datetime.strptime(start, "%Y-%m-%d").date()
    end_d = datetime.strptime(end, "%Y-%m-%d").date()
    out: List[str] = []
    while d <= end_d:
        out.append(d.isoformat())
        d += timedelta(days=7)
    return out


def get_plan_months(start: str = PLAN_START_WEEK, end: str = PLAN_END_WEEK) -> List[str]:
    """Returns monthly anchor dates (YYYY-MM-01) covering start through end."""
    weeks = get_plan_weeks(start, end)
    return sorted({f"{w[:7]}-01" for w in weeks})


# ---------------------------------------------------------------------------
# Scenario Log Helpers
# ---------------------------------------------------------------------------

def _calc_key_string(log_values: Dict[str, str], cols: List[str]) -> str:
    """Combines the input keys used for a calculation into a deterministic calc key."""
    return " | ".join(str(log_values.get(c, "") or "").strip() for c in cols)


def build_scenario_log_row(
    scenario_key: str,
    last_update: str,
    remarks: str,
    inputs: Dict[str, str],
    delete_flag: str = "N",
) -> Dict[str, str]:
    """Builds a 32-column scenario log row matching es_shiny_scenario_log."""
    row: Dict[str, str] = {
        "key": scenario_key,
        "last_update": last_update,
        "remarks": remarks or "",
        "delete_flag": delete_flag,
    }
    for log_col, input_key in LOG_COL_TO_INPUT_KEY.items():
        row[log_col] = str((inputs or {}).get(input_key, "") or "")

    for calc_col, comp_cols in CALC_KEY_INPUTS.items():
        row[calc_col] = _calc_key_string(row, comp_cols)

    row["fte_tran_check"] = "Y" if row.get("fte_tran") else "N"
    row["recr_ungr_check"] = "Y" if row.get("recr_ungrnd") else "N"
    return {col: row.get(col, "") for col in SCENARIO_LOG_COLUMNS}


def get_scenario_log_path() -> Path:
    return EnvironmentConfig.get_data_dir() / "es_shiny_scenario_log.csv"


def get_final_plan_path() -> Path:
    return EnvironmentConfig.get_data_dir() / "es_powerbi_model_checker_plan.csv"


# ---------------------------------------------------------------------------
# Deterministic Final Data Generator Linked to Selected Inputs
# ---------------------------------------------------------------------------

def _stable_factor(text_val: str, low: float = 0.90, high: float = 1.12) -> float:
    digest = hashlib.sha256(str(text_val).encode("utf-8")).hexdigest()
    ratio = int(digest[:8], 16) / 0xFFFFFFFF
    return low + (high - low) * ratio


def _measure_selected_input_signal(input_key: str, version_name: str) -> Optional[float]:
    """Reads an actual selected local CSV if present to compute a deterministic signal."""
    if not version_name:
        return None
    from data_manager import CATEGORY_FOLDER_MAP

    folder = CATEGORY_FOLDER_MAP.get(input_key)
    if not folder:
        return None
    base_dir = EnvironmentConfig.get_data_dir() / folder
    clean = version_name.replace(":", "-")
    for cand in (base_dir / clean, base_dir / f"{clean}.csv"):
        if cand.exists() and cand.is_file():
            try:
                df = pd.read_csv(cand)
                if df.empty:
                    return None
                num_cols = [
                    c for c in df.columns
                    if pd.api.types.is_numeric_dtype(df[c])
                    and not any(tok in str(c).lower() for tok in ("year", "code", "id"))
                ]
                total = float(df[num_cols].fillna(0).values.sum()) if num_cols else float(len(df))
                # Normalize into a stable multiplier [0.85, 1.20]
                sig = (abs(total) % 1000.0) / 1000.0
                return 0.88 + 0.28 * sig + min(0.06, len(df) / 100000.0)
            except Exception:
                return None
    return None


def _compute_scenario_multipliers(scenario_key: str, inputs: Dict[str, str], log_row: Dict[str, str]) -> Dict[str, float]:
    """Derives demand, capacity, overtime, downtime, and recruitment multipliers from scenario inputs & calc keys."""
    dem_sig = _measure_selected_input_signal("demand_input", inputs.get("demand_input", ""))
    job_sig = _measure_selected_input_signal("job_time_assumptions", inputs.get("job_time_assumptions", ""))
    res_sig = _measure_selected_input_signal("resource_plan", inputs.get("resource_plan", ""))
    ovt_sig = _measure_selected_input_signal("overtime", inputs.get("overtime", ""))
    ctr_sig = _measure_selected_input_signal("ctr_capacity", inputs.get("ctr_capacity", ""))
    dwt_sig = _measure_selected_input_signal("downtime_overlays_hours", inputs.get("downtime_overlays_hours", ""))
    rec_sig = _measure_selected_input_signal("recruitment_ungrounded", inputs.get("recruitment_ungrounded", ""))

    demand_mult = dem_sig if dem_sig is not None else _stable_factor(log_row.get("demand_key", scenario_key), 0.92, 1.14)
    if job_sig is not None:
        demand_mult = 0.65 * demand_mult + 0.35 * job_sig

    cap_mult = res_sig if res_sig is not None else _stable_factor(log_row.get("fte_key", scenario_key), 0.92, 1.12)
    overtime_mult = ovt_sig if ovt_sig is not None else _stable_factor(log_row.get("avl_key", scenario_key), 0.85, 1.25)
    contractor_mult = ctr_sig if ctr_sig is not None else _stable_factor(log_row.get("capacity_key", scenario_key), 0.85, 1.22)
    downtime_mult = dwt_sig if dwt_sig is not None else _stable_factor(inputs.get("downtime_overlays_percentage", scenario_key), 0.88, 1.15)
    recruit_mult = rec_sig if rec_sig is not None else _stable_factor(inputs.get("recruitment_grounded", scenario_key), 0.85, 1.25)

    # Differentiate well-known plan types cleanly (LV NOV V.1, LV NOV V.2, GFF2, HV)
    key_upper = scenario_key.upper()
    if key_upper.startswith("HV"):
        demand_mult *= 1.08
        overtime_mult *= 1.15
        contractor_mult *= 1.18
    elif "V.2" in key_upper:
        demand_mult *= 1.09
        cap_mult *= 0.93
        overtime_mult *= 1.12
        recruit_mult *= 1.10
    elif key_upper.startswith("GFF2"):
        demand_mult *= 0.98
        cap_mult *= 0.95
        downtime_mult *= 0.94
        contractor_mult *= 1.10
    elif "V.3" in key_upper:
        cap_mult *= 1.04
        downtime_mult *= 0.94
        recruit_mult *= 1.12

    return {
        "demand": round(demand_mult, 4),
        "capacity": round(cap_mult, 4),
        "overtime": round(overtime_mult, 4),
        "contractor": round(contractor_mult, 4),
        "downtime": round(downtime_mult, 4),
        "recruit": round(recruit_mult, 4),
    }


def _resolve_patch_geo_lookup(inputs: Optional[Dict[str, str]] = None) -> Dict[str, Tuple[str, str]]:
    """Returns patch -> (region, area_code) mapping from geography_mapping."""
    lookup: Dict[str, Tuple[str, str]] = {}
    try:
        rows = _load_geography_rows(inputs)
    except Exception:
        rows = []
    for r in rows:
        p = str(r.get("Patch") or r.get("patch") or r.get("Territory") or "").strip()
        reg = str(r.get("Region") or r.get("region") or "").strip()
        area = str(r.get("Area Code") or r.get("area_code") or r.get("AreaCode") or r.get("ACDM") or "").strip()
        if p:
            lookup[p] = (reg, area)
    return lookup


def _infer_geo_for_patch(patch: str, geo_lookup: Dict[str, Tuple[str, str]]) -> Tuple[str, str]:
    if patch in geo_lookup:
        reg, area = geo_lookup[patch]
        if reg or area:
            return reg, area
    prefix = str(patch or "").strip().split(" ")[0].upper()
    area = prefix[:3] if len(prefix) >= 3 and prefix.startswith("E") else prefix
    reg_code = area[1:2] if len(area) >= 2 and area.startswith("E") else (prefix[:1] if prefix else "")
    reg_names = {
        "A": "Scotland and Northern England",
        "B": "North West",
        "C": "Midlands",
        "D": "London and South East",
        "E": "South West",
    }
    return reg_names.get(reg_code, "National"), area or "UNM"


def generate_scenario_final_rows(
    scenario_key: str,
    create_datestamp: str,
    inputs: Dict[str, str],
    log_row: Optional[Dict[str, str]] = None,
    patches: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Generates all weekly ('W') and monthly ('M') rows for a scenario in `es_powerbi_model_checker_plan`
    covering 2026-11-02 through 2027-12-27 across all 125 distinct combinations.
    """
    if log_row is None:
        log_row = build_scenario_log_row(scenario_key, create_datestamp, "", inputs)

    patch_list = patches or FINAL_DATA_PATCHES
    geo_lookup = _resolve_patch_geo_lookup(inputs)
    patch_geo = {p: _infer_geo_for_patch(p, geo_lookup) for p in patch_list}
    weeks = get_plan_weeks(PLAN_START_WEEK, PLAN_END_WEEK)
    mult = _compute_scenario_multipliers(scenario_key, inputs, log_row)

    # Pre-group combinations by role for clean, mathematically consistent generation
    demand_combos_by_skill: Dict[str, List[Tuple[str, str, str, str, str]]] = {"HEC": [], "KAC": []}
    overlay_combos_by_skill: Dict[str, List[Tuple[str, str, str, str, str]]] = {"HEC": [], "KAC": []}
    recruit_combos: List[Tuple[str, str, str, str, str]] = []

    for combo in DISTINCT_COMBINATIONS:
        sk, grp, met, lvl2, flg = combo
        if flg == "Demand Hours":
            demand_combos_by_skill[sk].append(combo)
        elif flg == "Downtime Overlay Hours":
            overlay_combos_by_skill[sk].append(combo)
        elif flg == "FTE" and "Recruitment" in sk:
            recruit_combos.append(combo)

    # Deterministic work-code weights
    def _work_weight(sk: str, met: str) -> float:
        major = {
            "W01": 4.2, "W13": 4.0, "W06": 2.8, "W26": 2.4, "W02": 2.1,
            "W03": 1.8, "W04": 2.6, "W07": 2.3, "W17": 1.9, "W23": 1.7,
        }
        return major.get(met, 0.55 + _stable_factor(f"{sk}:{met}", 0.0, 0.85))

    hec_dem_weights = [(_work_weight(c[0], c[2]), c) for c in demand_combos_by_skill["HEC"]]
    kac_dem_weights = [(_work_weight(c[0], c[2]), c) for c in demand_combos_by_skill["KAC"]]
    hec_dem_tot_w = sum(w for w, _ in hec_dem_weights)
    kac_dem_tot_w = sum(w for w, _ in kac_dem_weights)

    patch_scales = {
        p: round(_stable_factor(f"patch:{p}", 0.78, 1.32), 4)
        for p in patch_list
    }
    patch_cap_bias = {
        p: round(_stable_factor(f"cap_bias:{p}", 0.90, 1.15), 4)
        for p in patch_list
    }
    patch_dem_bias = {
        p: round(_stable_factor(f"dem_bias:{p}", 0.92, 1.09), 4)
        for p in patch_list
    }

    seed_int = int(hashlib.sha256(f"{scenario_key}|{log_row.get('imbalance_key', '')}".encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(seed_int)

    weekly_rows: List[Dict[str, Any]] = []

    for w_idx, w in enumerate(weeks):
        # Continuous seasonal curve anchored to exact day-of-year (no discrete monthly step jumps).
        # Peaks in winter (~mid-Jan, doy=12), dips in summer (~mid-Jul, doy=194).
        wk_date = datetime.strptime(w, "%Y-%m-%d").date()
        doy = wk_date.timetuple().tm_yday
        theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)

        # Realistic week-to-week operational fluctuations around the smooth seasonal curve
        dem_fluct = 1.0 + 0.032 * math.sin(w_idx * 1.15 + 0.4) + 0.022 * math.cos(w_idx * 2.15 - 0.7) + rng.uniform(-0.024, 0.024)
        winter_wave = (1.0 + 0.24 * math.cos(theta)) * dem_fluct
        growth_trend = 1.0 + 0.0008 * w_idx

        cap_fluct = 1.0 + 0.020 * math.sin(w_idx * 0.65 + 1.1) + 0.012 * math.cos(w_idx * 1.55) + rng.uniform(-0.015, 0.015)
        holiday_wave = 0.088 + 0.036 * (-math.cos(theta - 0.15)) + 0.008 * math.sin(w_idx * 0.95)
        sickness_wave = 0.042 + 0.016 * math.cos(theta) + 0.005 * math.cos(w_idx * 1.35)
        overlay_wave = (0.056 + 0.014 * (-math.cos(theta))) * (1.0 + 0.10 * math.cos(w_idx * 0.85))
        overtime_wave = (0.046 + 0.036 * max(0.0, math.cos(theta))) * (1.0 + 0.14 * math.sin(w_idx * 1.25))
        sp_wave = (0.044 + 0.024 * max(0.0, math.cos(theta))) * (1.0 + 0.11 * math.sin(w_idx * 0.9))

        for p_idx, patch in enumerate(patch_list):
            region_val, area_code_val = patch_geo[patch]
            p_scale = patch_scales[patch]
            p_cap_b = patch_cap_bias[patch]
            p_dem_b = patch_dem_bias[patch]
            patch_jitter = 1.0 + rng.uniform(-0.022, 0.022)
            dem_patch_jitter = 1.0 + rng.uniform(-0.028, 0.028)

            for sk in ("HEC", "KAC"):
                is_hec = sk == "HEC"
                base_fte = (23.4 if is_hec else 13.5) * p_scale * p_cap_b * mult["capacity"]
                # Smooth staffing trajectory + continuous weekly variability (no staircase steps)
                fte_val = round(base_fte * (1.0 + 0.0014 * w_idx) * cap_fluct * patch_jitter, 4)
                gross_hrs = round(fte_val * 37.5, 4)

                # Available Hours breakdown (continuous seasonal holiday & sickness curves + small weekly variation)
                holiday_hrs = round(gross_hrs * max(0.03, holiday_wave * (1.0 + rng.uniform(-0.05, 0.05))), 4)
                sickness_hrs = round(gross_hrs * max(0.015, sickness_wave * (1.0 + rng.uniform(-0.06, 0.06))), 4)
                training_hrs = round(gross_hrs * (0.028 * (1.0 + 0.12 * math.sin(w_idx * 0.72 + p_idx))), 4)
                meeting_hrs = round(gross_hrs * (0.019 * (1.0 + 0.09 * math.cos(w_idx * 1.08 + p_idx))), 4)
                other_hrs = round(gross_hrs * (0.016 * (1.0 + 0.10 * math.sin(w_idx * 1.42))), 4)
                core_hrs = round(max(0.0, gross_hrs - (holiday_hrs + sickness_hrs + training_hrs + meeting_hrs + other_hrs)), 4)

                overtime_hrs = round(gross_hrs * overtime_wave * mult["overtime"] * (1.0 + rng.uniform(-0.06, 0.06)), 4)
                available_hrs = round(core_hrs + overtime_hrs, 4)

                # Downtime Overlay Hours breakdown
                ov_combos = overlay_combos_by_skill[sk]
                target_overlay_total = gross_hrs * overlay_wave * mult["downtime"] * (1.0 + rng.uniform(-0.05, 0.05))
                ov_weights = [_stable_factor(f"{c[2]}:{c[3]}:{w_idx}", 0.5, 1.5) for c in ov_combos]
                ov_w_sum = sum(ov_weights) or 1.0
                actual_overlay_total = 0.0
                for ov_w, combo in zip(ov_weights, ov_combos):
                    ov_val = round(target_overlay_total * (ov_w / ov_w_sum), 4)
                    actual_overlay_total += ov_val
                    weekly_rows.append({
                        "region": region_val,
                        "area_code": area_code_val,
                        "patch": patch,
                        "skill": combo[0],
                        "group": combo[1],
                        "metric": combo[2],
                        "level2": combo[3],
                        "flag": combo[4],
                        "period": "W",
                        "weekcomm": w,
                        "value": ov_val,
                        "version": scenario_key,
                        "create_datestamp": create_datestamp,
                    })

                productive_hrs = round(max(0.0, available_hrs - actual_overlay_total), 4)
                sp_hrs = round(gross_hrs * sp_wave * mult["contractor"] * (1.0 + rng.uniform(-0.06, 0.06)), 4)

                # Demand Hours breakdown (high & tight in winter peak -> shortfalls, lower in summer -> surpluses)
                base_demand = (645.0 if is_hec else 370.0) * p_scale * p_dem_b * winter_wave * growth_trend * mult["demand"] * dem_patch_jitter
                dem_pairs = hec_dem_weights if is_hec else kac_dem_weights
                dem_w_sum = hec_dem_tot_w if is_hec else kac_dem_tot_w
                total_demand_hrs = 0.0
                for dw, combo in dem_pairs:
                    item_noise = 1.0 + rng.uniform(-0.04, 0.04)
                    d_val = round(base_demand * (dw / dem_w_sum) * item_noise, 4)
                    total_demand_hrs += d_val
                    weekly_rows.append({
                        "region": region_val,
                        "area_code": area_code_val,
                        "patch": patch,
                        "skill": combo[0],
                        "group": combo[1],
                        "metric": combo[2],
                        "level2": combo[3],
                        "flag": combo[4],
                        "period": "W",
                        "weekcomm": w,
                        "value": d_val,
                        "version": scenario_key,
                        "create_datestamp": create_datestamp,
                    })

                total_demand_hrs = round(total_demand_hrs, 4)

                # Workload Hours
                weekly_rows.append({
                    "region": region_val, "area_code": area_code_val,
                    "patch": patch, "skill": sk, "group": sk, "metric": "workload hrs",
                    "level2": "-", "flag": "Workload Hours", "period": "W", "weekcomm": w,
                    "value": total_demand_hrs, "version": scenario_key, "create_datestamp": create_datestamp,
                })

                # FTE
                weekly_rows.append({
                    "region": region_val, "area_code": area_code_val,
                    "patch": patch, "skill": sk, "group": sk, "metric": "FTE",
                    "level2": "-", "flag": "FTE", "period": "W", "weekcomm": w,
                    "value": fte_val, "version": scenario_key, "create_datestamp": create_datestamp,
                })

                # Available Hours family (9 metrics)
                for met_name, met_val in (
                    ("Gross Hrs", gross_hrs),
                    ("Core Hrs", core_hrs),
                    ("Available Hrs", available_hrs),
                    ("Holiday", holiday_hrs),
                    ("Overtime", overtime_hrs),
                    ("Training", training_hrs),
                    ("Sickness", sickness_hrs),
                    ("Other", other_hrs),
                    ("Meeting", meeting_hrs),
                ):
                    weekly_rows.append({
                        "region": region_val, "area_code": area_code_val,
                        "patch": patch, "skill": sk, "group": sk, "metric": met_name,
                        "level2": "-", "flag": "Available Hours", "period": "W", "weekcomm": w,
                        "value": met_val, "version": scenario_key, "create_datestamp": create_datestamp,
                    })

                # Capacity Hours family (Productive hrs + SP)
                weekly_rows.append({
                    "region": region_val, "area_code": area_code_val,
                    "patch": patch, "skill": sk, "group": sk, "metric": "Productive hrs",
                    "level2": "-", "flag": "Capacity Hours", "period": "W", "weekcomm": w,
                    "value": productive_hrs, "version": scenario_key, "create_datestamp": create_datestamp,
                })
                weekly_rows.append({
                    "region": region_val, "area_code": area_code_val,
                    "patch": patch, "skill": sk, "group": "General", "metric": "SP",
                    "level2": "-", "flag": "Capacity Hours", "period": "W", "weekcomm": w,
                    "value": sp_hrs, "version": scenario_key, "create_datestamp": create_datestamp,
                })

            # Recruitment FTE rows
            for r_idx, combo in enumerate(recruit_combos):
                r_skill, r_group, r_met, r_lvl2, r_flag = combo
                is_ungrounded = r_group == "Ungrounded"
                # Staggered cohort ramp across the 61-week horizon
                cohort_start = 12 if is_ungrounded else (r_idx % 16) * 2
                if w_idx < cohort_start:
                    r_fte = 0.0
                else:
                    age = w_idx - cohort_start
                    ramp = min(1.0, (age + 1) / 8.0)
                    base_r = (0.95 if is_ungrounded else 0.45) * p_scale * mult["recruit"]
                    r_fte = round(base_r * ramp * (0.85 + 0.3 * _stable_factor(f"{patch}:{r_group}", 0.0, 1.0)), 4)

                weekly_rows.append({
                    "region": region_val,
                    "area_code": area_code_val,
                    "patch": patch,
                    "skill": r_skill,
                    "group": r_group,
                    "metric": r_met,
                    "level2": r_lvl2,
                    "flag": r_flag,
                    "period": "W",
                    "weekcomm": w,
                    "value": r_fte,
                    "version": scenario_key,
                    "create_datestamp": create_datestamp,
                })

    df_weekly = pd.DataFrame(weekly_rows, columns=FINAL_DATA_COLUMNS)

    # Build monthly ('M') rows by aggregating weekly rows per month:
    # - FTE rows -> mean across weeks in that month
    # - Hours rows -> sum across weeks in that month
    df_m_src = df_weekly.copy()
    df_m_src["month_comm"] = df_m_src["weekcomm"].str.slice(0, 7) + "-01"

    key_cols = ["region", "area_code", "patch", "skill", "group", "metric", "level2", "flag", "month_comm", "version", "create_datestamp"]
    is_fte = df_m_src["flag"] == "FTE"

    df_m_fte = (
        df_m_src[is_fte]
        .groupby(key_cols, as_index=False)["value"]
        .mean()
    )
    df_m_hrs = (
        df_m_src[~is_fte]
        .groupby(key_cols, as_index=False)["value"]
        .sum()
    )

    df_monthly = pd.concat([df_m_hrs, df_m_fte], ignore_index=True)
    df_monthly["period"] = "M"
    df_monthly["weekcomm"] = df_monthly.pop("month_comm")
    df_monthly["value"] = df_monthly["value"].round(4)
    df_monthly = df_monthly[FINAL_DATA_COLUMNS]

    df_all = pd.concat([df_weekly, df_monthly], ignore_index=True)
    return df_all


# ---------------------------------------------------------------------------
# Persistence Layer (Local CSV + Databricks Unity Catalog)
# ---------------------------------------------------------------------------

def load_scenario_log(engine=None) -> pd.DataFrame:
    """Loads the scenario log table from Databricks (if active) or local CSV."""
    if engine is not None and engine.is_databricks_active():
        try:
            tbl = engine.load_scenario_log_table()
            if tbl is not None:
                return tbl
        except Exception as e:
            print(f"[Databricks] Scenario log read fallback: {e}")

    path = get_scenario_log_path()
    if path.exists():
        df = pd.read_csv(path, dtype=str).fillna("")
        for col in SCENARIO_LOG_COLUMNS:
            if col not in df.columns:
                df[col] = ""
        return df[SCENARIO_LOG_COLUMNS]
    return pd.DataFrame(columns=SCENARIO_LOG_COLUMNS)


def save_scenario_log(df_log: pd.DataFrame, engine=None) -> None:
    """Persists the full scenario log table locally and to Databricks if active."""
    path = get_scenario_log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    out = df_log.copy()
    for col in SCENARIO_LOG_COLUMNS:
        if col not in out.columns:
            out[col] = ""
    out = out[SCENARIO_LOG_COLUMNS]
    out.to_csv(path, index=False)

    if engine is not None and engine.is_databricks_active():
        try:
            engine.save_scenario_log_to_databricks(out)
        except Exception as e:
            print(f"[Databricks] Scenario log save warning: {e}")


def append_scenario_log_entry(log_row: Dict[str, str], engine=None) -> pd.DataFrame:
    """Marks any previous active row with same key as delete_flag='Y' and appends the new row."""
    df_log = load_scenario_log(engine=engine)
    if not df_log.empty and "key" in df_log.columns:
        mask = (df_log["key"] == log_row["key"]) & (df_log["delete_flag"] != "Y")
        df_log.loc[mask, "delete_flag"] = "Y"
    new_df = pd.DataFrame([log_row], columns=SCENARIO_LOG_COLUMNS)
    df_log = pd.concat([df_log, new_df], ignore_index=True) if not df_log.empty else new_df
    save_scenario_log(df_log, engine=engine)
    return df_log


def load_final_scenario_data(
    version: Optional[str] = None,
    period: Optional[str] = None,
    engine=None,
) -> pd.DataFrame:
    """Loads `es_powerbi_model_checker_plan` from Databricks (if active) or local CSV."""
    if engine is not None and engine.is_databricks_active():
        try:
            df = engine.load_final_plan_table(version=version, period=period)
            if df is not None:
                return df
        except Exception as e:
            print(f"[Databricks] Final plan read fallback: {e}")

    path = get_final_plan_path()
    if not path.exists():
        return pd.DataFrame(columns=FINAL_DATA_COLUMNS)

    df = pd.read_csv(path)
    if version:
        df = df[df["version"] == version]
    if period:
        df = df[df["period"] == period]
    if "region" not in df.columns or "area_code" not in df.columns:
        geo_lookup = _resolve_patch_geo_lookup()
        inferred = df["patch"].astype(str).map(lambda p: _infer_geo_for_patch(p, geo_lookup))
        if "region" not in df.columns:
            df["region"] = [x[0] for x in inferred]
        if "area_code" not in df.columns:
            df["area_code"] = [x[1] for x in inferred]
    for col in FINAL_DATA_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0 if col == "value" else ""
    return df[FINAL_DATA_COLUMNS]


def save_final_scenario_rows(version: str, df_new_rows: pd.DataFrame, engine=None) -> None:
    """Replaces rows for `version` in local CSV and syncs to Databricks if active."""
    path = get_final_plan_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        df_existing = pd.read_csv(path)
        df_existing = df_existing[df_existing["version"] != version]
        df_combined = pd.concat([df_existing, df_new_rows[FINAL_DATA_COLUMNS]], ignore_index=True)
    else:
        df_combined = df_new_rows[FINAL_DATA_COLUMNS].copy()

    df_combined.to_csv(path, index=False)

    if engine is not None and engine.is_databricks_active():
        try:
            engine.save_final_plan_version_to_databricks(version, df_new_rows[FINAL_DATA_COLUMNS])
        except Exception as e:
            print(f"[Databricks] Final plan save warning: {e}")


def delete_scenario_from_log_and_plan(version: str, engine=None) -> None:
    """Marks scenario delete_flag='Y' in scenario log and removes its rows from final plan."""
    df_log = load_scenario_log(engine=engine)
    if not df_log.empty:
        df_log.loc[df_log["key"] == version, "delete_flag"] = "Y"
        save_scenario_log(df_log, engine=engine)

    path = get_final_plan_path()
    if path.exists():
        df = pd.read_csv(path)
        df = df[df["version"] != version]
        df.to_csv(path, index=False)

    if engine is not None and engine.is_databricks_active():
        try:
            engine.delete_final_plan_version_from_databricks(version)
        except Exception as e:
            print(f"[Databricks] Final plan delete warning: {e}")


# ---------------------------------------------------------------------------
# Compact Transport Payloads for Scenario Diff & Decision Studio
# ---------------------------------------------------------------------------

def _pack_final_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """Packs final_data DataFrame into a compact indexed payload (~6x smaller than record dicts)."""
    if df is None or df.empty:
        return {
            "regions": [],
            "areaCodes": [],
            "patches": [],
            "combos": [],
            "periods": [],
            "weeks": [],
            "rows": [],
            "rowCount": 0,
        }

    geo_lookup = _resolve_patch_geo_lookup()
    if "region" not in df.columns or "area_code" not in df.columns:
        df = df.copy()
        inferred = df["patch"].astype(str).map(lambda p: _infer_geo_for_patch(p, geo_lookup))
        if "region" not in df.columns:
            df["region"] = [x[0] for x in inferred]
        if "area_code" not in df.columns:
            df["area_code"] = [x[1] for x in inferred]

    regions = sorted(df["region"].astype(str).unique().tolist())
    region_idx = {r: i for i, r in enumerate(regions)}

    area_codes = sorted(df["area_code"].astype(str).unique().tolist())
    area_idx = {a: i for i, a in enumerate(area_codes)}

    patches = sorted(df["patch"].astype(str).unique().tolist())
    patch_idx = {p: i for i, p in enumerate(patches)}

    periods = sorted(df["period"].astype(str).unique().tolist())
    period_idx = {p: i for i, p in enumerate(periods)}

    weeks = sorted(df["weekcomm"].astype(str).unique().tolist())
    week_idx = {w: i for i, w in enumerate(weeks)}

    combo_tuples = (
        df[["skill", "group", "metric", "level2", "flag"]]
        .astype(str)
        .drop_duplicates()
        .itertuples(index=False, name=None)
    )
    combos = [list(t) for t in sorted(combo_tuples)]
    combo_idx = {tuple(c): i for i, c in enumerate(combos)}

    r_col = df["region"].astype(str).map(region_idx).tolist()
    a_col = df["area_code"].astype(str).map(area_idx).tolist()
    p_col = df["patch"].astype(str).map(patch_idx).tolist()
    s_col = df["skill"].astype(str).tolist()
    g_col = df["group"].astype(str).tolist()
    m_col = df["metric"].astype(str).tolist()
    l_col = df["level2"].astype(str).tolist()
    f_col = df["flag"].astype(str).tolist()
    per_col = df["period"].astype(str).map(period_idx).tolist()
    w_col = df["weekcomm"].astype(str).map(week_idx).tolist()
    v_col = [round(float(v), 4) if pd.notna(v) else 0.0 for v in df["value"].tolist()]

    packed_rows = [
        [p_col[i], combo_idx[(s_col[i], g_col[i], m_col[i], l_col[i], f_col[i])], per_col[i], w_col[i], v_col[i], r_col[i], a_col[i]]
        for i in range(len(df))
    ]

    version_val = str(df["version"].iloc[0]) if "version" in df.columns and len(df) else ""
    create_val = str(df["create_datestamp"].iloc[0]) if "create_datestamp" in df.columns and len(df) else ""

    return {
        "version": version_val,
        "create_datestamp": create_val,
        "regions": regions,
        "areaCodes": area_codes,
        "patches": patches,
        "combos": combos,
        "periods": periods,
        "weeks": weeks,
        "rows": packed_rows,
        "rowCount": len(packed_rows),
    }


def _load_geography_rows(inputs: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    from data_manager import SampleDataGenerator, load_input_table_data

    geog_file = (inputs or {}).get("geography_mapping", "")
    if geog_file:
        try:
            res = load_input_table_data("geography_mapping", geog_file)
            if res.get("success") and res.get("rows"):
                return res["rows"]
        except Exception:
            pass
    return SampleDataGenerator.get_geog_mapping_data().to_dict(orient="records")


def get_decision_studio_bundle(scenario_id: str, engine=None, scenario_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Loads ONLY final scenario data (`es_powerbi_model_checker_plan`) + `es_shiny_scenario_log`
    for Decision Studio.
    """
    df = load_final_scenario_data(version=scenario_id, engine=engine)
    if df.empty:
        raise ValueError(f"No final scenario data found in es_powerbi_model_checker_plan for '{scenario_id}'.")

    df_log = load_scenario_log(engine=engine)
    log_row: Dict[str, str] = {}
    if not df_log.empty:
        matches = df_log[(df_log["key"] == scenario_id) & (df_log["delete_flag"] != "Y")]
        if matches.empty:
            matches = df_log[df_log["key"] == scenario_id]
        if not matches.empty:
            log_row = matches.iloc[-1].to_dict()

    inputs = (scenario_meta or {}).get("inputs") or {}
    if not inputs and log_row:
        inputs = {
            input_key: log_row.get(log_col, "")
            for log_col, input_key in LOG_COL_TO_INPUT_KEY.items()
            if log_row.get(log_col)
        }

    geog_rows = _load_geography_rows(inputs)
    packed = _pack_final_dataframe(df)

    return {
        "success": True,
        "mode": "final_data",
        "scenarioId": scenario_id,
        "createDatestamp": packed["create_datestamp"],
        "loadedAt": datetime.now(timezone.utc).isoformat(),
        "scenarioLog": log_row,
        "geographyRows": geog_rows,
        "finalData": packed,
    }


def get_scenario_diff_payload(
    baseline_version: str,
    comparison_version: str,
    engine=None,
) -> Dict[str, Any]:
    """
    Loads ONLY final scenario data (`es_powerbi_model_checker_plan`) + `es_shiny_scenario_log`
    for the Scenario Diff & Variance tab.
    """
    df_base = load_final_scenario_data(version=baseline_version, engine=engine)
    df_comp = load_final_scenario_data(version=comparison_version, engine=engine)

    if df_base.empty:
        raise ValueError(f"No final scenario data found for baseline scenario '{baseline_version}'.")
    if df_comp.empty:
        raise ValueError(f"No final scenario data found for comparison scenario '{comparison_version}'.")

    df_log = load_scenario_log(engine=engine)
    log_map: Dict[str, Dict[str, str]] = {}
    if not df_log.empty:
        for ver in (baseline_version, comparison_version):
            m = df_log[(df_log["key"] == ver) & (df_log["delete_flag"] != "Y")]
            if m.empty:
                m = df_log[df_log["key"] == ver]
            if not m.empty:
                log_map[ver] = m.iloc[-1].to_dict()

    geog_rows = _load_geography_rows(
        {"geography_mapping": log_map.get(baseline_version, {}).get("geog_map", "")}
    )

    return {
        "success": True,
        "mode": "final_data",
        "baselineVersion": baseline_version,
        "comparisonVersion": comparison_version,
        "baselineData": _pack_final_dataframe(df_base),
        "comparisonData": _pack_final_dataframe(df_comp),
        "scenarioLogs": log_map,
        "geographyRows": geog_rows,
    }


# ---------------------------------------------------------------------------
# Bootstrap Default Scenarios (>= 2 scenarios, Nov 2, 2026 - Dec 27, 2027)
# ---------------------------------------------------------------------------

def get_default_scenario_definitions() -> List[Dict[str, Any]]:
    """Defines 3 default scenarios covering 2026-11-02 through 2027-12-27."""
    from data_manager import DEFAULT_INPUT_OPTIONS

    base_inputs = {k: v[0] for k, v in DEFAULT_INPUT_OPTIONS.items()}
    v2_inputs = {
        **{k: (v[1] if len(v) > 1 else v[0]) for k, v in DEFAULT_INPUT_OPTIONS.items()},
        "resource_plan": "Resource Plan V2_2026-06-15",
        "demand_input": "demand_forecast_q3_unconstrained_v2",
        "overtime": "overtime_allowance_q3_v2",
        "recruitment_ungrounded": "recruitment_ungrounded_upside_v2",
    }
    gff2_inputs = {
        **base_inputs,
        "fte_transfer": "fte_transfer_v2_2026-06-01",
        "downtime_overlays_percentage": "overlays_percentage_approved_q3",
        "ctr_capacity": "ctr_capacity_allocations_v1",
        "recruitment_grounded": "recruitment_grounded_2026_q3_v2",
    }

    return [
        {
            "id": "LV NOV V.1 2026",
            "plan_type": "LV",
            "month": "NOV",
            "version": "1",
            "year": "2026",
            "remarks": "November LV V.1 Operating Plan Baseline (Nov 2026 - Dec 2027)",
            "created_at": "2026-11-02T09:30:00.000+00:00",
            "inputs": base_inputs,
        },
        {
            "id": "LV NOV V.2 2026",
            "plan_type": "LV",
            "month": "NOV",
            "version": "2",
            "year": "2026",
            "remarks": "November LV V.2 Updated Demand & Overtime Plan (Nov 2026 - Dec 2027)",
            "created_at": "2026-11-06T14:20:00.000+00:00",
            "inputs": v2_inputs,
        },
        {
            "id": "GFF2 2026",
            "plan_type": "GFF2",
            "month": "NOV",
            "version": "1",
            "year": "2026",
            "remarks": "GFF2 2026 Agreed Framework Operating Plan (Nov 2026 - Dec 2027)",
            "created_at": "2026-11-11T13:14:55.000+00:00",
            "inputs": gff2_inputs,
        },
    ]


def ensure_default_scenarios_and_final_data(force_rebuild: bool = False) -> Dict[str, Any]:
    """
    Ensures `es_shiny_scenario_log.csv`, `es_powerbi_model_checker_plan.csv`,
    and `scenarios.json` are populated with the default scenarios (Nov 2, 2026 - Dec 27, 2027).
    """
    import json

    log_path = get_scenario_log_path()
    plan_path = get_final_plan_path()
    scen_json_path = EnvironmentConfig.get_data_dir() / "scenarios.json"

    defs = get_default_scenario_definitions()
    expected_ids = {d["id"] for d in defs}

    if not force_rebuild and log_path.exists() and plan_path.exists() and scen_json_path.exists():
        try:
            header_cols = set(pd.read_csv(plan_path, nrows=0).columns)
            if {"region", "area_code"}.issubset(header_cols):
                df_existing_plan = pd.read_csv(plan_path, usecols=["version", "period", "weekcomm"])
                versions = set(df_existing_plan["version"].astype(str).unique())
                if expected_ids.issubset(versions) and PLAN_START_WEEK in set(df_existing_plan["weekcomm"].astype(str)) and PLAN_END_WEEK in set(df_existing_plan["weekcomm"].astype(str)):
                    return {
                        "status": "existing",
                        "versions": sorted(versions),
                        "rows": len(df_existing_plan),
                    }
        except Exception:
            pass

    log_rows: List[Dict[str, str]] = []
    plan_frames: List[pd.DataFrame] = []
    scenarios_dict: Dict[str, Any] = {}

    for s in defs:
        log_row = build_scenario_log_row(
            scenario_key=s["id"],
            last_update=s["created_at"],
            remarks=s["remarks"],
            inputs=s["inputs"],
            delete_flag="N",
        )
        log_rows.append(log_row)
        df_s = generate_scenario_final_rows(
            scenario_key=s["id"],
            create_datestamp=s["created_at"],
            inputs=s["inputs"],
            log_row=log_row,
        )
        plan_frames.append(df_s)
        scenarios_dict[s["id"]] = s

    df_log = pd.DataFrame(log_rows, columns=SCENARIO_LOG_COLUMNS)
    df_plan = pd.concat(plan_frames, ignore_index=True)[FINAL_DATA_COLUMNS]

    log_path.parent.mkdir(parents=True, exist_ok=True)
    df_log.to_csv(log_path, index=False)
    df_plan.to_csv(plan_path, index=False)
    scen_json_path.write_text(json.dumps(scenarios_dict, indent=2), encoding="utf-8")

    return {
        "status": "generated",
        "versions": [s["id"] for s in defs],
        "logRows": len(df_log),
        "planRows": len(df_plan),
    }
