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
from engine.perf_cache import (
    fast_pack_final_dataframe,
    get_cached_packed_final,
    get_cached_scenario_log,
    get_verified_default_state,
    invalidate_namespace,
    load_partitioned_dataframe,
    mark_default_state_verified,
    path_signature,
)

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

# Canonical schemas for the 6 sub-calculation tables matching Databricks (`sample_images/`)
SUBCALC_SPECS: Dict[str, Dict[str, Any]] = {
    "fte": {
        "table": "es_shiny_fte_calc",
        "log_col": "fte_key",
        "columns": ["key", "patch", "skill", "group", "weekcomm", "values"],
        "numeric_cols": ["values"],
    },
    "available_hours": {
        "table": "es_shiny_avlhr_calc",
        "log_col": "avl_key",
        "columns": ["key", "patch", "skill", "group", "weekcomm", "values"],
        "numeric_cols": ["values"],
    },
    "capacity": {
        "table": "es_shiny_capacity_calc",
        "log_col": "capacity_key",
        "columns": ["key", "patch", "skill", "group", "weekcomm", "values"],
        "numeric_cols": ["values"],
    },
    "demand": {
        "table": "es_shiny_demand_calc",
        "log_col": "demand_key",
        "columns": ["key", "patch", "skill", "work_code", "product", "weekcomm", "values"],
        "numeric_cols": ["values"],
    },
    "workload": {
        "table": "es_shiny_workload_calc",
        "log_col": "workload_key",
        "columns": ["key", "patch", "skill", "weekcomm", "values"],
        "numeric_cols": ["values"],
    },
    "imbalance": {
        "table": "es_shiny_imbalance_calc",
        "log_col": "imbalance_key",
        "columns": ["key", "patch", "skill", "metric", "type", "weekcomm", "values"],
        "numeric_cols": ["values"],
    },
}

IMBALANCE_METRIC_COMBINATIONS: List[Tuple[str, str, str]] = [
    ("HEC", "DL_FTE", "pre_sp"),
    ("KAC", "DL_FTE", "pre_sp"),
    ("HEC", "DL_FTE", "post_sp"),
    ("KAC", "imb_presp", "pre_sp"),
    ("KAC", "DL_FTE", "post_sp"),
    ("HEC", "imb_presp", "pre_sp"),
    ("KAC", "imb_postsp", "post_sp"),
    ("HEC", "imb_postsp", "post_sp"),
]

# Plan horizon: week 2nd Nov, 2026 to week 27th Dec, 2027 (both Mondays)
PLAN_START_WEEK = "2026-11-02"
PLAN_END_WEEK = "2027-12-27"

# All 29 patches across all 4 UK regions (A, B, C, D) and 17 Area Codes in default geography_mapping
FINAL_DATA_PATCHES: List[str] = [
    "EA11 Inverness & Aviemore",
    "EA12 Aberdeen North",
    "EA12 Aberdeen South",
    "EA13 Dundee & Perth",
    "EA13 Fife",
    "EA21 Dunbartonshire & Glasgow North",
    "EA21 Stirling & Falkirk",
    "EA31 Clyde Coast",
    "EA31 Glasgow South & Renfrewshire",
    "EA32 South West Ayrshire",
    "EA33 Dumfriesshire",
    "EA41 East Lothian Coast",
    "EB12 Altrincham",
    "EB13 Manchester Centre",
    "EB14 Stockport",
    "EB24 The Wirral",
    "EB43 Hereford & Worcs",
    "EC91 Leicester",
    "EC62 Essex East",
    "EC41 Reading",
    "EC31 New Forest",
    "EC22 Cheltenham & Gloucester",
    "EC81 Peterborough",
    "EC11 Cornwall",
    "EC13 Devon South",
    "ED11 Chiswick & City",
    "ED22 Cobham & Heathrow",
    "ED41 Bromley & Dartford",
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
    csv_path = EnvironmentConfig.get_data_dir() / "es_powerbi_model_checker_plan.csv"
    compressed_path = csv_path.with_suffix(f"{csv_path.suffix}.gz")
    return csv_path if csv_path.exists() or not compressed_path.exists() else compressed_path


def get_subcalc_path(subcalc_key: str) -> Path:
    key = str(subcalc_key or "").strip().lower()
    table_name = EnvironmentConfig.get_subcalc_table_name(key)
    return EnvironmentConfig.get_data_dir() / f"{table_name}.csv"


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
                # Normalize into a balanced multiplier [0.97, 1.035]
                sig = (abs(total) % 1000.0) / 1000.0
                return 0.97 + 0.05 * sig + min(0.015, len(df) / 400000.0)
            except Exception:
                return None
    return None


def _compute_scenario_multipliers(scenario_key: str, inputs: Dict[str, str], log_row: Dict[str, str]) -> Dict[str, float]:
    """Derives demand, capacity, overtime, downtime, and recruitment multipliers deterministically from each stage key."""
    dem_sig = _measure_selected_input_signal("demand_input", inputs.get("demand_input", ""))
    job_sig = _measure_selected_input_signal("job_time_assumptions", inputs.get("job_time_assumptions", ""))
    res_sig = _measure_selected_input_signal("resource_plan", inputs.get("resource_plan", ""))
    ovt_sig = _measure_selected_input_signal("overtime", inputs.get("overtime", ""))
    ctr_sig = _measure_selected_input_signal("ctr_capacity", inputs.get("ctr_capacity", ""))
    dwt_sig = _measure_selected_input_signal("downtime_overlays_hours", inputs.get("downtime_overlays_hours", ""))
    rec_sig = _measure_selected_input_signal("recruitment_ungrounded", inputs.get("recruitment_ungrounded", ""))

    dem_key = log_row.get("demand_key", scenario_key)
    fte_key = log_row.get("fte_key", scenario_key)
    avl_key = log_row.get("avl_key", scenario_key)
    cap_key = log_row.get("capacity_key", scenario_key)

    demand_mult = dem_sig if dem_sig is not None else _stable_factor(dem_key, 0.97, 1.03)
    if job_sig is not None:
        demand_mult = 0.65 * demand_mult + 0.35 * job_sig
    if "q3" in dem_key.lower() or "v2" in dem_key.lower():
        demand_mult *= 1.032

    cap_mult = res_sig if res_sig is not None else _stable_factor(fte_key, 0.97, 1.03)
    if "v2" in fte_key.lower() or "v.2" in fte_key.lower():
        cap_mult *= 0.992
    elif "2026_q3_v2" in fte_key.lower():
        cap_mult *= 0.995

    overtime_mult = ovt_sig if ovt_sig is not None else _stable_factor(avl_key, 0.95, 1.08)
    if "v2" in avl_key.lower():
        overtime_mult *= 1.04

    contractor_mult = ctr_sig if ctr_sig is not None else _stable_factor(cap_key, 0.95, 1.08)
    if "allocations_v1" in cap_key.lower():
        contractor_mult *= 1.04

    downtime_mult = dwt_sig if dwt_sig is not None else _stable_factor(avl_key + "|dwt", 0.95, 1.05)
    if "approved_q3" in cap_key.lower():
        downtime_mult *= 0.96

    recruit_mult = rec_sig if rec_sig is not None else _stable_factor(fte_key + "|rec", 0.95, 1.08)
    if "upside_v2" in fte_key.lower():
        recruit_mult *= 1.04

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


def generate_subcalc_bundle_for_scenario(
    scenario_key: str,
    create_datestamp: str,
    inputs: Dict[str, str],
    log_row: Optional[Dict[str, str]] = None,
    patches: Optional[List[str]] = None,
) -> Dict[str, pd.DataFrame]:
    """
    Runs the 6 chained sub-calculation engines keyed by the columns in `es_shiny_scenario_log`:
      1. FTE (`fte_key`)             -> `es_shiny_fte_calc`
      2. Available Hours (`avl_key`) -> `es_shiny_avlhr_calc`
      3. Capacity (`capacity_key`)   -> `es_shiny_capacity_calc`
      4. Demand (`demand_key`)       -> `es_shiny_demand_calc`
      5. Workload (`workload_key`)   -> `es_shiny_workload_calc`
      6. Imbalance (`imbalance_key`) -> `es_shiny_imbalance_calc`
    Then combines them into `final_data` (`es_powerbi_model_checker_plan`).
    """
    if log_row is None:
        log_row = build_scenario_log_row(scenario_key, create_datestamp, "", inputs)

    fte_key = str(log_row.get("fte_key") or scenario_key)
    avl_key = str(log_row.get("avl_key") or scenario_key)
    capacity_key = str(log_row.get("capacity_key") or scenario_key)
    demand_key = str(log_row.get("demand_key") or scenario_key)
    workload_key = str(log_row.get("workload_key") or scenario_key)
    imbalance_key = str(log_row.get("imbalance_key") or scenario_key)

    geo_lookup = _resolve_patch_geo_lookup(inputs)
    patch_list = patches or (list(geo_lookup.keys()) if geo_lookup else FINAL_DATA_PATCHES)
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

    patch_scales = {p: round(_stable_factor(f"patch:{p}", 0.78, 1.32), 4) for p in patch_list}
    patch_cap_bias = {p: round(_stable_factor(f"cap_bias:{p}", 0.90, 1.15), 4) for p in patch_list}
    patch_dem_bias = {p: round(_stable_factor(f"dem_bias:{p}", 0.92, 1.09), 4) for p in patch_list}

    def _rng_from(key_str: str) -> random.Random:
        seed_int = int(hashlib.sha256(key_str.encode("utf-8")).hexdigest()[:8], 16)
        return random.Random(seed_int)

    # ------------------------------------------------------------------
    # Stage 1: FTE Sub-Calculation (`es_shiny_fte_calc`, keyed by `fte_key`)
    # ------------------------------------------------------------------
    rng_fte = _rng_from(f"fte|{fte_key}")
    fte_calc_rows: List[Dict[str, Any]] = []
    fte_lookup: Dict[Tuple[str, str, str], float] = {}

    for w_idx, w in enumerate(weeks):
        wk_date = datetime.strptime(w, "%Y-%m-%d").date()
        doy = wk_date.timetuple().tm_yday
        theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)

        # Seasonal staffing flex: slightly higher active FTE availability in winter, lower in summer
        cap_fluct_w = (
            (1.0 + 0.050 * math.cos(theta))
            * (1.0 + 0.022 * math.sin(w_idx * 0.72 + 0.5) + 0.014 * math.cos(w_idx * 1.45 - 0.3))
            + rng_fte.uniform(-0.012, 0.012)
        )
        for patch in patch_list:
            p_scale = patch_scales[patch]
            p_cap_b = patch_cap_bias[patch]
            patch_jitter = 1.0 + rng_fte.uniform(-0.022, 0.022)

            for sk in ("HEC", "KAC"):
                is_hec = sk == "HEC"
                base_fte = (22.6 if is_hec else 13.1) * p_scale * p_cap_b * mult["capacity"]
                fte_val = round(base_fte * (1.0 + 0.0010 * w_idx) * cap_fluct_w * patch_jitter, 4)
                fte_lookup[(patch, sk, w)] = fte_val
                fte_calc_rows.append({
                    "key": fte_key, "patch": patch, "skill": sk, "group": sk, "weekcomm": w, "values": fte_val
                })

            for r_idx, combo in enumerate(recruit_combos):
                r_skill, r_group, _, _, _ = combo
                is_ungrounded = r_group == "Ungrounded"
                cohort_start = 12 if is_ungrounded else (r_idx % 16) * 2
                if w_idx < cohort_start:
                    r_fte = 0.0
                else:
                    age = w_idx - cohort_start
                    ramp = min(1.0, (age + 1) / 8.0)
                    base_r = (0.95 if is_ungrounded else 0.45) * p_scale * mult["recruit"]
                    r_fte = round(base_r * ramp * (0.85 + 0.3 * _stable_factor(f"{patch}:{r_group}", 0.0, 1.0)), 4)
                fte_calc_rows.append({
                    "key": fte_key, "patch": patch, "skill": r_skill, "group": r_group, "weekcomm": w, "values": r_fte
                })

    df_fte = pd.DataFrame(fte_calc_rows, columns=SUBCALC_SPECS["fte"]["columns"])

    # ------------------------------------------------------------------
    # Stage 2: Available Hours Sub-Calculation (`es_shiny_avlhr_calc`, keyed by `avl_key`)
    # ------------------------------------------------------------------
    rng_avl = _rng_from(f"avl|{fte_key}|{avl_key}")
    avlhr_calc_rows: List[Dict[str, Any]] = []
    avl_breakdown_rows: List[Dict[str, Any]] = []
    overlay_rows: List[Dict[str, Any]] = []
    overlay_totals: Dict[Tuple[str, str, str], float] = {}
    avl_lookup: Dict[Tuple[str, str, str], float] = {}
    gross_lookup: Dict[Tuple[str, str, str], float] = {}

    for w_idx, w in enumerate(weeks):
        wk_date = datetime.strptime(w, "%Y-%m-%d").date()
        doy = wk_date.timetuple().tm_yday
        theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)

        # Winter: lower annual leave & training/overlays, higher overtime surge
        # Summer: higher annual leave & training/overlays, minimal overtime
        holiday_wave = 0.084 + 0.038 * (-math.cos(theta - 0.15)) + 0.008 * math.sin(w_idx * 0.95)
        sickness_wave = 0.043 + 0.015 * math.cos(theta) + 0.005 * math.cos(w_idx * 1.35)
        overlay_wave = (0.052 + 0.024 * (-math.cos(theta))) * (1.0 + 0.12 * math.cos(w_idx * 0.85))
        overtime_wave = max(0.008, (0.064 + 0.050 * math.cos(theta)) * (1.0 + 0.18 * math.sin(w_idx * 1.15 + 0.4)))

        for p_idx, patch in enumerate(patch_list):
            region_val, area_code_val = patch_geo[patch]
            for sk in ("HEC", "KAC"):
                fte_val = fte_lookup[(patch, sk, w)]
                gross_hrs = round(fte_val * 37.5, 4)
                gross_lookup[(patch, sk, w)] = gross_hrs

                holiday_hrs = round(gross_hrs * max(0.025, holiday_wave * (1.0 + rng_avl.uniform(-0.05, 0.05))), 4)
                sickness_hrs = round(gross_hrs * max(0.015, sickness_wave * (1.0 + rng_avl.uniform(-0.06, 0.06))), 4)
                training_hrs = round(gross_hrs * max(0.012, 0.030 * (1.0 - 0.35 * math.cos(theta)) * (1.0 + 0.12 * math.sin(w_idx * 0.72 + p_idx))), 4)
                meeting_hrs = round(gross_hrs * max(0.010, 0.020 * (1.0 - 0.25 * math.cos(theta)) * (1.0 + 0.09 * math.cos(w_idx * 1.08 + p_idx))), 4)
                other_hrs = round(gross_hrs * max(0.008, 0.017 * (1.0 - 0.25 * math.cos(theta)) * (1.0 + 0.10 * math.sin(w_idx * 1.42))), 4)
                core_hrs = round(max(0.0, gross_hrs - (holiday_hrs + sickness_hrs + training_hrs + meeting_hrs + other_hrs)), 4)
                overtime_hrs = round(gross_hrs * overtime_wave * mult["overtime"] * (1.0 + rng_avl.uniform(-0.06, 0.06)), 4)
                available_hrs = round(core_hrs + overtime_hrs, 4)

                avl_lookup[(patch, sk, w)] = available_hrs
                avlhr_calc_rows.append({
                    "key": avl_key, "patch": patch, "skill": sk, "group": sk, "weekcomm": w, "values": available_hrs
                })

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
                    avl_breakdown_rows.append({
                        "region": region_val, "area_code": area_code_val,
                        "patch": patch, "skill": sk, "group": sk, "metric": met_name,
                        "level2": "-", "flag": "Available Hours", "period": "W", "weekcomm": w,
                        "value": met_val, "version": scenario_key, "create_datestamp": create_datestamp,
                    })

                ov_combos = overlay_combos_by_skill[sk]
                target_overlay_total = gross_hrs * overlay_wave * mult["downtime"] * (1.0 + rng_avl.uniform(-0.05, 0.05))
                ov_weights = [_stable_factor(f"{c[2]}:{c[3]}:{w_idx}", 0.5, 1.5) for c in ov_combos]
                ov_w_sum = sum(ov_weights) or 1.0
                actual_overlay_total = 0.0
                for ov_w, combo in zip(ov_weights, ov_combos):
                    ov_val = round(target_overlay_total * (ov_w / ov_w_sum), 4)
                    actual_overlay_total += ov_val
                    overlay_rows.append({
                        "region": region_val, "area_code": area_code_val,
                        "patch": patch, "skill": combo[0], "group": combo[1],
                        "metric": combo[2], "level2": combo[3], "flag": combo[4],
                        "period": "W", "weekcomm": w, "value": ov_val,
                        "version": scenario_key, "create_datestamp": create_datestamp,
                    })
                overlay_totals[(patch, sk, w)] = actual_overlay_total

    df_avlhr = pd.DataFrame(avlhr_calc_rows, columns=SUBCALC_SPECS["available_hours"]["columns"])

    # ------------------------------------------------------------------
    # Stage 3: Capacity Sub-Calculation (`es_shiny_capacity_calc`, keyed by `capacity_key`)
    # ------------------------------------------------------------------
    rng_cap = _rng_from(f"cap|{avl_key}|{capacity_key}")
    capacity_calc_rows: List[Dict[str, Any]] = []
    cap_lookup: Dict[Tuple[str, str, str], float] = {}
    sp_lookup: Dict[Tuple[str, str, str], float] = {}
    sp_plan_rows: List[Dict[str, Any]] = []

    for w_idx, w in enumerate(weeks):
        wk_date = datetime.strptime(w, "%Y-%m-%d").date()
        doy = wk_date.timetuple().tm_yday
        theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)
        sp_wave = max(0.010, (0.064 + 0.054 * math.cos(theta)) * (1.0 + 0.16 * math.sin(w_idx * 0.95 - 0.3)))

        for patch in patch_list:
            region_val, area_code_val = patch_geo[patch]
            for sk in ("HEC", "KAC"):
                available_hrs = avl_lookup[(patch, sk, w)]
                actual_overlay_total = overlay_totals[(patch, sk, w)]
                productive_hrs = round(max(0.0, available_hrs - actual_overlay_total), 4)
                sp_hrs = round(gross_lookup[(patch, sk, w)] * sp_wave * mult["contractor"] * (1.0 + rng_cap.uniform(-0.06, 0.06)), 4)

                cap_lookup[(patch, sk, w)] = productive_hrs
                sp_lookup[(patch, sk, w)] = sp_hrs

                capacity_calc_rows.append({
                    "key": capacity_key, "patch": patch, "skill": sk, "group": sk, "weekcomm": w, "values": productive_hrs
                })
                sp_plan_rows.append({
                    "region": region_val, "area_code": area_code_val,
                    "patch": patch, "skill": sk, "group": "General", "metric": "SP",
                    "level2": "-", "flag": "Capacity Hours", "period": "W", "weekcomm": w,
                    "value": sp_hrs, "version": scenario_key, "create_datestamp": create_datestamp,
                })

    df_capacity = pd.DataFrame(capacity_calc_rows, columns=SUBCALC_SPECS["capacity"]["columns"])

    # ------------------------------------------------------------------
    # Stage 4: Demand Sub-Calculation (`es_shiny_demand_calc`, keyed by `demand_key`)
    # ------------------------------------------------------------------
    rng_dem = _rng_from(f"dem|{demand_key}")
    demand_calc_rows: List[Dict[str, Any]] = []

    for w_idx, w in enumerate(weeks):
        wk_date = datetime.strptime(w, "%Y-%m-%d").date()
        doy = wk_date.timetuple().tm_yday
        theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)

        dem_fluct = 1.0 + 0.058 * math.sin(w_idx * 0.85 - 0.4) + 0.038 * math.cos(w_idx * 1.65 + 0.7) + rng_dem.uniform(-0.018, 0.018)
        winter_wave = (1.0 + 0.24 * math.cos(theta)) * dem_fluct
        growth_trend = 1.0 + 0.0005 * w_idx

        for patch in patch_list:
            p_scale = patch_scales[patch]
            p_dem_b = patch_dem_bias[patch]
            dem_patch_jitter = 1.0 + rng_dem.uniform(-0.028, 0.028)

            for sk in ("HEC", "KAC"):
                is_hec = sk == "HEC"
                base_demand = (740.0 if is_hec else 425.0) * p_scale * p_dem_b * winter_wave * growth_trend * mult["demand"] * dem_patch_jitter
                dem_pairs = hec_dem_weights if is_hec else kac_dem_weights
                dem_w_sum = hec_dem_tot_w if is_hec else kac_dem_tot_w
                for dw, combo in dem_pairs:
                    item_noise = 1.0 + rng_dem.uniform(-0.04, 0.04)
                    d_val = round(base_demand * (dw / dem_w_sum) * item_noise, 4)
                    demand_calc_rows.append({
                        "key": demand_key,
                        "patch": patch,
                        "skill": combo[0],
                        "work_code": combo[2],
                        "product": combo[3],
                        "weekcomm": w,
                        "values": d_val,
                    })

    df_demand = pd.DataFrame(demand_calc_rows, columns=SUBCALC_SPECS["demand"]["columns"])

    # ------------------------------------------------------------------
    # Stage 5: Workload Sub-Calculation (`es_shiny_workload_calc`, keyed by `workload_key`)
    # Computed directly by summing Demand Hours per (patch, skill, weekcomm).
    # ------------------------------------------------------------------
    df_work_agg = (
        df_demand.groupby(["patch", "skill", "weekcomm"], as_index=False)["values"]
        .sum()
    )
    df_work_agg["values"] = df_work_agg["values"].round(4)
    df_work_agg.insert(0, "key", workload_key)
    df_workload = df_work_agg[SUBCALC_SPECS["workload"]["columns"]].copy()

    work_lookup: Dict[Tuple[str, str, str], float] = {
        (row.patch, row.skill, row.weekcomm): float(row.values)
        for row in df_workload.itertuples(index=False)
    }

    # ------------------------------------------------------------------
    # Stage 6: Imbalance Sub-Calculation (`es_shiny_imbalance_calc`, keyed by `imbalance_key`)
    # Combines Capacity (`Productive hrs` + `SP`) and Workload (`workload hrs`).
    # Emits all 8 distinct (skill, metric, type) combinations per patch & weekcomm.
    # ------------------------------------------------------------------
    imbalance_calc_rows: List[Dict[str, Any]] = []
    for w in weeks:
        for patch in patch_list:
            for sk in ("HEC", "KAC"):
                prod_h = cap_lookup[(patch, sk, w)]
                sp_h = sp_lookup[(patch, sk, w)]
                work_h = work_lookup[(patch, sk, w)]
                imb_pre = round(prod_h - work_h, 4)
                imb_post = round((prod_h + sp_h) - work_h, 4)
                dl_fte_pre = round(imb_pre / 37.5, 4)
                dl_fte_post = round(imb_post / 37.5, 4)
                for met_name, typ_name, val_num in (
                    ("DL_FTE", "pre_sp", dl_fte_pre),
                    ("imb_presp", "pre_sp", imb_pre),
                    ("DL_FTE", "post_sp", dl_fte_post),
                    ("imb_postsp", "post_sp", imb_post),
                ):
                    imbalance_calc_rows.append({
                        "key": imbalance_key,
                        "patch": patch,
                        "skill": sk,
                        "metric": met_name,
                        "type": typ_name,
                        "weekcomm": w,
                        "values": val_num,
                    })

    df_imbalance = pd.DataFrame(imbalance_calc_rows, columns=SUBCALC_SPECS["imbalance"]["columns"])

    # ------------------------------------------------------------------
    # Combine all Sub-Calculations into `es_powerbi_model_checker_plan`
    # ------------------------------------------------------------------
    def _attach_geo(df_src: pd.DataFrame) -> Tuple[List[str], List[str]]:
        regs = [patch_geo[p][0] for p in df_src["patch"].tolist()]
        areas = [patch_geo[p][1] for p in df_src["patch"].tolist()]
        return regs, areas

    fte_regs, fte_areas = _attach_geo(df_fte)
    df_plan_fte = pd.DataFrame({
        "region": fte_regs,
        "area_code": fte_areas,
        "patch": df_fte["patch"].values,
        "skill": df_fte["skill"].values,
        "group": df_fte["group"].values,
        "metric": "FTE",
        "level2": "-",
        "flag": "FTE",
        "period": "W",
        "weekcomm": df_fte["weekcomm"].values,
        "value": df_fte["values"].values,
        "version": scenario_key,
        "create_datestamp": create_datestamp,
    })

    cap_regs, cap_areas = _attach_geo(df_capacity)
    df_plan_cap = pd.DataFrame({
        "region": cap_regs,
        "area_code": cap_areas,
        "patch": df_capacity["patch"].values,
        "skill": df_capacity["skill"].values,
        "group": df_capacity["group"].values,
        "metric": "Productive hrs",
        "level2": "-",
        "flag": "Capacity Hours",
        "period": "W",
        "weekcomm": df_capacity["weekcomm"].values,
        "value": df_capacity["values"].values,
        "version": scenario_key,
        "create_datestamp": create_datestamp,
    })

    dem_regs, dem_areas = _attach_geo(df_demand)
    df_plan_dem = pd.DataFrame({
        "region": dem_regs,
        "area_code": dem_areas,
        "patch": df_demand["patch"].values,
        "skill": df_demand["skill"].values,
        "group": df_demand["skill"].values,
        "metric": df_demand["work_code"].values,
        "level2": df_demand["product"].values,
        "flag": "Demand Hours",
        "period": "W",
        "weekcomm": df_demand["weekcomm"].values,
        "value": df_demand["values"].values,
        "version": scenario_key,
        "create_datestamp": create_datestamp,
    })

    wrk_regs, wrk_areas = _attach_geo(df_workload)
    df_plan_wrk = pd.DataFrame({
        "region": wrk_regs,
        "area_code": wrk_areas,
        "patch": df_workload["patch"].values,
        "skill": df_workload["skill"].values,
        "group": df_workload["skill"].values,
        "metric": "workload hrs",
        "level2": "-",
        "flag": "Workload Hours",
        "period": "W",
        "weekcomm": df_workload["weekcomm"].values,
        "value": df_workload["values"].values,
        "version": scenario_key,
        "create_datestamp": create_datestamp,
    })

    df_weekly = pd.concat(
        [
            pd.DataFrame(avl_breakdown_rows, columns=FINAL_DATA_COLUMNS),
            pd.DataFrame(overlay_rows, columns=FINAL_DATA_COLUMNS),
            df_plan_cap[FINAL_DATA_COLUMNS],
            pd.DataFrame(sp_plan_rows, columns=FINAL_DATA_COLUMNS),
            df_plan_dem[FINAL_DATA_COLUMNS],
            df_plan_wrk[FINAL_DATA_COLUMNS],
            df_plan_fte[FINAL_DATA_COLUMNS],
        ],
        ignore_index=True,
    )

    # Monthly ('M') aggregation: mean for FTE, sum for Hours
    df_m_src = df_weekly.copy()
    df_m_src["month_comm"] = df_m_src["weekcomm"].str.slice(0, 7) + "-01"

    key_cols = ["region", "area_code", "patch", "skill", "group", "metric", "level2", "flag", "month_comm", "version", "create_datestamp"]
    is_fte = df_m_src["flag"] == "FTE"

    df_m_fte = df_m_src[is_fte].groupby(key_cols, as_index=False)["value"].mean()
    df_m_hrs = df_m_src[~is_fte].groupby(key_cols, as_index=False)["value"].sum()

    df_monthly = pd.concat([df_m_hrs, df_m_fte], ignore_index=True)
    df_monthly["period"] = "M"
    df_monthly["weekcomm"] = df_monthly.pop("month_comm")
    df_monthly["value"] = df_monthly["value"].round(4)
    df_monthly = df_monthly[FINAL_DATA_COLUMNS]

    df_final = pd.concat([df_weekly, df_monthly], ignore_index=True)

    return {
        "fte": df_fte,
        "available_hours": df_avlhr,
        "capacity": df_capacity,
        "demand": df_demand,
        "workload": df_workload,
        "imbalance": df_imbalance,
        "final_data": df_final,
    }


def generate_scenario_final_rows(
    scenario_key: str,
    create_datestamp: str,
    inputs: Dict[str, str],
    log_row: Optional[Dict[str, str]] = None,
    patches: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Generates all weekly ('W') and monthly ('M') rows for a scenario in `es_powerbi_model_checker_plan`
    by combining the 6 sub-calculation modules (`fte`, `available_hours`, `capacity`, `demand`, `workload`, `imbalance`).
    """
    bundle = generate_subcalc_bundle_for_scenario(
        scenario_key=scenario_key,
        create_datestamp=create_datestamp,
        inputs=inputs,
        log_row=log_row,
        patches=patches,
    )
    return bundle["final_data"]


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
        sig = path_signature(path)
        def _load_log() -> pd.DataFrame:
            df = pd.read_csv(path, dtype=str).fillna("")
            for col in SCENARIO_LOG_COLUMNS:
                if col not in df.columns:
                    df[col] = ""
            return df[SCENARIO_LOG_COLUMNS]
        return get_cached_scenario_log(sig, _load_log)
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
    invalidate_namespace("scenario_log")

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

    sig = path_signature(path)

    def _raw_load_final() -> pd.DataFrame:
        df = pd.read_csv(path, low_memory=False)
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

    return load_partitioned_dataframe(
        "final_plan",
        sig,
        "version",
        str(version) if version else None,
        _raw_load_final,
        period=str(period) if period else None,
    )


def save_final_scenario_rows(version: str, df_new_rows: pd.DataFrame, engine=None) -> None:
    """Replaces rows for `version` in local CSV and syncs to Databricks if active."""
    path = get_final_plan_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        df_existing = load_final_scenario_data(version=None, engine=None)
        df_existing = df_existing[df_existing["version"] != version]
        df_combined = pd.concat([df_existing, df_new_rows[FINAL_DATA_COLUMNS]], ignore_index=True)
    else:
        df_combined = df_new_rows[FINAL_DATA_COLUMNS].copy()

    df_combined.to_csv(path, index=False)
    invalidate_namespace("final_plan")

    if engine is not None and engine.is_databricks_active():
        try:
            engine.save_final_plan_version_to_databricks(version, df_new_rows[FINAL_DATA_COLUMNS])
        except Exception as e:
            print(f"[Databricks] Final plan save warning: {e}")


def load_subcalc_data(subcalc_key: str, calc_key: Optional[str] = None, engine=None) -> pd.DataFrame:
    """Loads one of the 6 sub-calculation datasets (`fte`, `available_hours`, `capacity`, `demand`, `workload`, `imbalance`)."""
    spec = SUBCALC_SPECS[subcalc_key]
    cols = spec["columns"]

    if engine is not None and engine.is_databricks_active():
        try:
            df_db = engine.load_subcalc_table(subcalc_key, calc_key_value=calc_key)
            if df_db is not None:
                return df_db
        except Exception as e:
            print(f"[Databricks] Sub-calc '{subcalc_key}' read fallback: {e}")

    path = get_subcalc_path(subcalc_key)
    if not path.exists():
        return pd.DataFrame(columns=cols)

    sig = path_signature(path)

    def _raw_load_subcalc() -> pd.DataFrame:
        df = pd.read_csv(path, low_memory=False)
        for col in cols:
            if col not in df.columns:
                df[col] = 0.0 if col == "values" else ""
        if "key" in df.columns:
            df["key"] = df["key"].astype(str)
        return df[cols]

    return load_partitioned_dataframe(
        f"subcalc:{subcalc_key}",
        sig,
        "key",
        str(calc_key) if calc_key else None,
        _raw_load_subcalc,
    )


def save_subcalc_key_rows(subcalc_key: str, calc_key: str, df_new_rows: pd.DataFrame, engine=None) -> None:
    """Upserts rows for a specific `key` in a sub-calculation table (deduplicated by `key`)."""
    spec = SUBCALC_SPECS[subcalc_key]
    cols = spec["columns"]
    path = get_subcalc_path(subcalc_key)
    path.parent.mkdir(parents=True, exist_ok=True)

    clean_new = df_new_rows[cols].copy()
    if path.exists():
        df_existing = load_subcalc_data(subcalc_key, calc_key=None, engine=None)
        df_existing = df_existing[df_existing["key"].astype(str) != str(calc_key)]
        df_combined = pd.concat([df_existing, clean_new], ignore_index=True)
    else:
        df_combined = clean_new

    df_combined.to_csv(path, index=False)
    invalidate_namespace(f"subcalc:{subcalc_key}")

    if engine is not None and engine.is_databricks_active():
        try:
            engine.save_subcalc_key_to_databricks(subcalc_key, calc_key, clean_new)
        except Exception as e:
            print(f"[Databricks] Sub-calc '{subcalc_key}' save warning: {e}")


def save_subcalc_bundle(subcalc_bundle: Dict[str, pd.DataFrame], log_row: Dict[str, str], engine=None) -> None:
    """Persists all 6 sub-calculation DataFrames for a scenario's log keys."""
    for subcalc_key, spec in SUBCALC_SPECS.items():
        if subcalc_key in subcalc_bundle and not subcalc_bundle[subcalc_key].empty:
            calc_key_val = str(log_row.get(spec["log_col"], "") or "")
            if calc_key_val:
                save_subcalc_key_rows(subcalc_key, calc_key_val, subcalc_bundle[subcalc_key], engine=engine)


def load_subcalc_for_scenario(
    subcalc_key: str,
    scenario_id: Optional[str] = None,
    engine=None,
) -> Tuple[pd.DataFrame, str, str, Dict[str, str]]:
    """
    Loads the active scenario's sub-calculation rows from the corresponding `es_shiny_*_calc` dataset
    filtered by its `*_key` column in `es_shiny_scenario_log`.
    Returns: (df, resolved_scenario_id, resolved_calc_key, log_row)
    """
    spec = SUBCALC_SPECS[subcalc_key]
    df_log = load_scenario_log(engine=engine)
    log_row: Dict[str, str] = {}
    resolved_id = str(scenario_id or "").strip()

    if not df_log.empty:
        active_log = df_log[df_log["delete_flag"] != "Y"] if "delete_flag" in df_log.columns else df_log
        if active_log.empty:
            active_log = df_log
        if resolved_id:
            match = active_log[active_log["key"] == resolved_id]
            if match.empty:
                match = df_log[df_log["key"] == resolved_id]
            if not match.empty:
                log_row = match.iloc[-1].to_dict()
        if not log_row and not active_log.empty:
            log_row = active_log.iloc[0].to_dict()
            resolved_id = str(log_row.get("key", ""))

    calc_key_val = str(log_row.get(spec["log_col"], "") or "")
    df = load_subcalc_data(subcalc_key, calc_key=calc_key_val or None, engine=engine)

    # Ensure on-the-fly population if key isn't materialized yet
    if df.empty and resolved_id and log_row:
        inputs = {
            inp_k: log_row.get(l_col, "")
            for l_col, inp_k in LOG_COL_TO_INPUT_KEY.items()
            if log_row.get(l_col)
        }
        bundle = generate_subcalc_bundle_for_scenario(
            scenario_key=resolved_id,
            create_datestamp=log_row.get("last_update", ""),
            inputs=inputs,
            log_row=log_row,
        )
        save_subcalc_bundle(bundle, log_row, engine=engine)
        df = bundle[subcalc_key]

    return df, resolved_id, calc_key_val, log_row


def delete_scenario_from_log_and_plan(version: str, engine=None) -> None:
    """Marks scenario delete_flag='Y' in scenario log and removes its rows from final plan."""
    df_log = load_scenario_log(engine=engine)
    if not df_log.empty:
        df_log.loc[df_log["key"] == version, "delete_flag"] = "Y"
        save_scenario_log(df_log, engine=engine)

    path = get_final_plan_path()
    if path.exists():
        df = load_final_scenario_data(version=None, engine=None)
        df = df[df["version"] != version]
        df.to_csv(path, index=False)
        invalidate_namespace("final_plan")

    if engine is not None and engine.is_databricks_active():
        try:
            engine.delete_final_plan_version_from_databricks(version)
        except Exception as e:
            print(f"[Databricks] Final plan delete warning: {e}")


# ---------------------------------------------------------------------------
# Compact Transport Payloads for Scenario Diff & Decision Studio
# ---------------------------------------------------------------------------

def _pack_final_dataframe(df: pd.DataFrame, json_safe: bool = False) -> Dict[str, Any]:
    """Packs final_data DataFrame into a compact indexed payload (~6x smaller than record dicts)."""
    if df is not None and not df.empty and ("region" not in df.columns or "area_code" not in df.columns):
        df = df.copy()
        geo_lookup = _resolve_patch_geo_lookup()
        inferred = df["patch"].astype(str).map(lambda p: _infer_geo_for_patch(p, geo_lookup))
        if "region" not in df.columns:
            df["region"] = [x[0] for x in inferred]
        if "area_code" not in df.columns:
            df["area_code"] = [x[1] for x in inferred]
    return fast_pack_final_dataframe(df, json_safe=json_safe)


def _get_packed_final_for_version(version: str, engine=None, json_safe: bool = True) -> Dict[str, Any]:
    """Return packed final_data for *version* using mtime+size cache when in local mode."""
    use_db = engine is not None and engine.is_databricks_active()
    if use_db:
        df = load_final_scenario_data(version=version, engine=engine)
        return _pack_final_dataframe(df, json_safe=json_safe)

    path = get_final_plan_path()
    sig = path_signature(path)

    def _build() -> Dict[str, Any]:
        df = load_final_scenario_data(version=version, engine=engine)
        return _pack_final_dataframe(df, json_safe=json_safe)

    return get_cached_packed_final(sig, version, None, _build)


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
    packed = _get_packed_final_for_version(scenario_id, engine=engine, json_safe=True)
    if not packed or packed.get("rowCount", 0) == 0:
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
    packed_base = _get_packed_final_for_version(baseline_version, engine=engine, json_safe=True)
    if not packed_base or packed_base.get("rowCount", 0) == 0:
        raise ValueError(f"No final scenario data found for baseline scenario '{baseline_version}'.")
    packed_comp = _get_packed_final_for_version(comparison_version, engine=engine, json_safe=True)
    if not packed_comp or packed_comp.get("rowCount", 0) == 0:
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
        "baselineData": packed_base,
        "comparisonData": packed_comp,
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
        "geography_mapping": base_inputs.get("geography_mapping", ""),
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
    subcalc_paths_exist = all(get_subcalc_path(k).exists() for k in SUBCALC_SPECS)

    if not force_rebuild and subcalc_paths_exist and log_path.exists() and plan_path.exists() and scen_json_path.exists():
        sig_tuple = (
            path_signature(plan_path),
            path_signature(log_path),
            path_signature(scen_json_path),
            tuple(path_signature(get_subcalc_path(k)) for k in SUBCALC_SPECS),
            tuple(sorted(expected_ids)),
        )
        cached_verified = get_verified_default_state(sig_tuple)
        if cached_verified is not None:
            return cached_verified
        try:
            header_cols = set(pd.read_csv(plan_path, nrows=0).columns)
            if {"region", "area_code", "patch"}.issubset(header_cols):
                df_existing_plan = pd.read_csv(plan_path, usecols=["version", "period", "weekcomm", "patch"])
                versions = set(df_existing_plan["version"].astype(str).unique())
                patches_present = set(df_existing_plan["patch"].astype(str).unique())
                if (
                    expected_ids.issubset(versions)
                    and set(FINAL_DATA_PATCHES).issubset(patches_present)
                    and PLAN_START_WEEK in set(df_existing_plan["weekcomm"].astype(str))
                    and PLAN_END_WEEK in set(df_existing_plan["weekcomm"].astype(str))
                ):
                    result = {
                        "status": "existing",
                        "versions": sorted(versions),
                        "rows": len(df_existing_plan),
                    }
                    mark_default_state_verified(sig_tuple, result)
                    return result
        except Exception:
            pass

    log_rows: List[Dict[str, str]] = []
    plan_frames: List[pd.DataFrame] = []
    subcalc_frames_by_key: Dict[str, Dict[str, pd.DataFrame]] = {k: {} for k in SUBCALC_SPECS}
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
        bundle = generate_subcalc_bundle_for_scenario(
            scenario_key=s["id"],
            create_datestamp=s["created_at"],
            inputs=s["inputs"],
            log_row=log_row,
        )
        for subcalc_key, spec in SUBCALC_SPECS.items():
            ck_val = str(log_row.get(spec["log_col"], "") or "")
            if ck_val and ck_val not in subcalc_frames_by_key[subcalc_key]:
                subcalc_frames_by_key[subcalc_key][ck_val] = bundle[subcalc_key]

        plan_frames.append(bundle["final_data"])
        scenarios_dict[s["id"]] = s

    df_log = pd.DataFrame(log_rows, columns=SCENARIO_LOG_COLUMNS)
    df_plan = pd.concat(plan_frames, ignore_index=True)[FINAL_DATA_COLUMNS]

    log_path.parent.mkdir(parents=True, exist_ok=True)
    df_log.to_csv(log_path, index=False)
    df_plan.to_csv(plan_path, index=False)
    for subcalc_key, keyed_dict in subcalc_frames_by_key.items():
        cols = SUBCALC_SPECS[subcalc_key]["columns"]
        df_sub = pd.concat(list(keyed_dict.values()), ignore_index=True)[cols] if keyed_dict else pd.DataFrame(columns=cols)
        df_sub.to_csv(get_subcalc_path(subcalc_key), index=False)
    scen_json_path.write_text(json.dumps(scenarios_dict, indent=2), encoding="utf-8")
    invalidate_namespace("final_plan")
    invalidate_namespace("subcalc_all")
    invalidate_namespace("scenario_log")

    return {
        "status": "generated",
        "versions": [s["id"] for s in defs],
        "logRows": len(df_log),
        "planRows": len(df_plan),
        "subcalcTables": {k: sum(len(v) for v in kd.values()) for k, kd in subcalc_frames_by_key.items()},
    }
