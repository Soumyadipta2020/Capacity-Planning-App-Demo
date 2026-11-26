"""
Data Manager Module
Handles sample data generation, file version listings, and scenario management.
"""

import json
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import math
import numpy as np
import pandas as pd

from config import EnvironmentConfig
from engine.perf_cache import (
    fast_clean_for_json,
    fast_sanitize_dataframe_for_json,
    get_cached_calc_module,
    get_cached_input_table,
    get_write_epoch,
    invalidate_namespace,
    path_signature,
)

def clean_for_json(obj: Any) -> Any:
    """
    Recursively sanitizes Python objects (dicts, lists, scalars) for standard JSON serialization.
    Replaces any float NaN, Inf, -Inf, pd.NA, or pd.NaT values with None (which serialize as 'null'),
    strictly preventing invalid non-standard 'NaN' tokens from appearing in JSON output.
    """
    return fast_clean_for_json(obj)

def sanitize_dataframe_for_json(df: pd.DataFrame) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Converts a pandas DataFrame into strictly JSON-compliant columns and rows.
    Guarantees that all NaN, NaT, Inf, -Inf, and pd.NA values are converted to None,
    preventing non-standard 'NaN' tokens from being emitted in JSON strings which crash JSON.parse() on client.
    """
    if df is None or not isinstance(df, pd.DataFrame) or df.empty:
        return (list(df.columns) if isinstance(df, pd.DataFrame) else []), []
    return fast_sanitize_dataframe_for_json(df)

# Common UK Patches and Skills from Field Capacity Planning
PATCHES = [
    "ED44 Canterbury & Dover",
    "EB12 Altrincham",
    "EC62 Essex East",
    "EB14 Stockport",
    "ED22 Cobham & Heathrow",
    "EA62 Blackpool & Lancaster",
    "EA62 Preston & Southport",
    "EB24 The Wirral",
    "EC91 Leicester",
    "ED41 Bromley & Dartford",
    "EB13 Manchester Centre",
    "EB12 Lancashire South",
    "EB43 Hereford & Worcs",
    "EA11 Inverness & Aviemore",
    "EA12 Aberdeen North",
    "EA12 Aberdeen South",
    "EA13 Dundee & Perth",
    "EA13 Fife",
    "EA21 Dunbartonshire & Glasgow North",
    "EA21 Stirling & Falkirk",
    "EA31 Clyde Coast",
    "EA31 Glasgow South & Renfrewshire",
    "EC41 Reading",
    "EC13 Devon South",
    "EC81 Peterborough",
    "EC31 New Forest",
    "EC22 Cheltenham & Gloucester",
    "EA41 East Lothian Coast",
    "EA53 Tees & Boro",
    "EA42 West Lothian",
    "EC11 Cornwall",
    "ED11 Chiswick & City"
]

SKILLS = ["HEC", "KAC", "EV"]
REGIONS = ["A", "B", "C", "D", "E"]
WORK_CODES = ["W00", "W01", "W17", "W18", "W20", "W23", "W26", "W31"]

# Weekly date columns starting Monday
DATE_COLS = [
    "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19",
    "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16",
    "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14"
]

# Weekly Trajectory Envelope Planning Horizon (29 weeks: Q3 2026 - Q1 2027)
TRAJECTORY_HORIZON_WEEKS = [
    "2026-09-14", "2026-09-21",
    "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19",
    "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16",
    "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14",
    "2026-12-21", "2026-12-28",
    "2027-01-04", "2027-01-11", "2027-01-18", "2027-01-25",
    "2027-02-01", "2027-02-08", "2027-02-15", "2027-02-22",
    "2027-03-01", "2027-03-08", "2027-03-15", "2027-03-22", "2027-03-29"
]

# Complete options catalog for every single user input
DEFAULT_INPUT_OPTIONS = {
    "actuals_input": [
        "actuals_2026-07-01_final",
        "actuals_2026-06-01_v2",
        "actuals_2026-05-01_v1",
        "actuals_2026-04-01_v1"
    ],
    "resource_plan": [
        "Latest Resource Plan V3_2026-07-07",
        "Resource Plan V2_2026-06-15",
        "Resource Plan V1_2026-05-01",
        "Resource Plan Draft V0_2026-04-10"
    ],
    "fte_transfer": [
        "fte_transfer_v3_2026-07-01",
        "fte_transfer_v2_2026-06-01",
        "fte_transfer_v1_2026-05-01"
    ],
    "recruitment_grounded": [
        "recruitment_grounded_2026_q3_v2",
        "recruitment_grounded_2026_q2_v1",
        "recruitment_grounded_target_v1"
    ],
    "recruitment_ungrounded": [
        "recruitment_ungrounded_upside_v2",
        "recruitment_ungrounded_baseline_v1",
        "recruitment_ungrounded_conservative_v1"
    ],
    "baseline_assumptions": [
        "baseline_assumptions_fy26_final",
        "baseline_assumptions_fy26_draft",
        "baseline_assumptions_q2_v2"
    ],
    "downtime_overlays_percentage": [
        "es_shiny_overlays_percentage_input2_2026-02-24 15:39:40",
        "overlays_percentage_v1_2026-01-15",
        "overlays_percentage_approved_q3"
    ],
    "downtime_overlays_hours": [
        "overlays_hours_v2_2026-07-01",
        "overlays_hours_v1_2026-05-01",
        "overlays_hours_baseline_v1"
    ],
    "downtime_overlays_hours_fte": [
        "overlays_hrs_fte_v2_2026-07-01",
        "overlays_hrs_fte_v1_2026-04-15",
        "overlays_hrs_fte_approved_v3"
    ],
    "overtime": [
        "overtime_allowance_q3_v2",
        "overtime_allowance_q2_v1",
        "overtime_cap_standard_2026"
    ],
    "baseline_productivity": [
        "baseline_productivity_2026_v3",
        "baseline_productivity_2026_v2",
        "baseline_productivity_benchmark_v1"
    ],
    "training_snm": [
        "training_snm_schedule_2026_v2",
        "training_snm_schedule_2026_v1",
        "training_snm_cohort_2026"
    ],
    "ctr_capacity": [
        "ctr_capacity_allocations_v2",
        "ctr_capacity_allocations_v1",
        "ctr_capacity_contractors_v1"
    ],
    "attrition": [
        "es_shiny_attrition_input2_2026-02-05 09:54:11",
        "attrition_rates_fy26_v1",
        "attrition_forecast_q3_v2"
    ],
    "recruitment_config": [
        "recruitment_productivity_ramp_v2",
        "recruitment_productivity_ramp_v1",
        "recruitment_config_standard_v1"
    ],
    "demand_input": [
        "es_shiny_es_mtp_demand2_input3_2026-02-04 08:10:23",
        "demand_forecast_q3_unconstrained_v2",
        "demand_forecast_q2_baseline_v1"
    ],
    "job_time_assumptions": [
        "job_time_2026-02-23 17:08:12",
        "job_time_assumptions_standard_v2",
        "job_time_assumptions_v1"
    ],
    "hec_on_kac_demand": [
        "hec_on_kac_crosskill_v2_2026",
        "hec_on_kac_crosskill_v1_2026",
        "hec_on_kac_standard_transfer"
    ],
    "hec_on_ev_demand": [
        "hec_on_ev_demand_transfer_v2",
        "hec_on_ev_demand_transfer_v1",
        "hec_on_ev_pilot_model"
    ],
    "geography_mapping": [
        "es_shiny_geog_mapping_input2_2026-02-18 13:04:22",
        "geography_patch_mapping_2026_v1",
        "geography_mapping_updated_q2"
    ],
    "week_to_month": [
        "week_to_month_fiscal_2026_v2",
        "week_to_month_standard_v1",
        "week_to_month_calendar_2026"
    ]
}

# Detailed remarks for every file version matching Field Operations
DEFAULT_REMARKS = {
    # Actuals Input
    "actuals_2026-07-01_final": "Audited Q3 Actuals closed by Finance",
    "actuals_2026-06-01_v2": "Pre-close June actuals with late timesheet adjustments",
    "actuals_2026-05-01_v1": "Baseline May operational actuals",
    "actuals_2026-04-01_v1": "Fiscal Q1 reconciled actuals",
    
    # Resource Plan
    "Latest Resource Plan V3_2026-07-07": "Baseline Operating Plan V3 (Approved by Capacity Governance)",
    "Resource Plan V2_2026-06-15": "Mid-year revised capacity headcount",
    "Resource Plan V1_2026-05-01": "Initial annual operating plan",
    "Resource Plan Draft V0_2026-04-10": "Unapproved preliminary draft",
    
    # FTE transfer
    "fte_transfer_v3_2026-07-01": "Inter-patch rebalancing post-Q2 review",
    "fte_transfer_v2_2026-06-01": "Northern region mutual aid transfers",
    "fte_transfer_v1_2026-05-01": "Baseline seasonal technician transfers",
    
    # Recruitment grounded
    "recruitment_grounded_2026_q3_v2": "Committed apprentice and direct hire cohorts",
    "recruitment_grounded_2026_q2_v1": "Q2 signed contracts in onboarding",
    "recruitment_grounded_target_v1": "Annual recruitment plan target",
    
    # Recruitment ungrounded
    "recruitment_ungrounded_upside_v2": "Contingent agency pipeline buffer",
    "recruitment_ungrounded_baseline_v1": "Standard talent acquisition pipeline",
    "recruitment_ungrounded_conservative_v1": "Constrained hiring market assumption",
    
    # Baseline assumptions
    "baseline_assumptions_fy26_final": "37.5 hrs/wk contractual standard shift",
    "baseline_assumptions_fy26_draft": "Proposed 38 hrs compressed hours pilot",
    "baseline_assumptions_q2_v2": "Legacy working time regulations assumptions",
    
    # Downtime Overlays Percentage
    "es_shiny_overlays_percentage_input2_2026-02-24 15:39:40": "Approved operational downtime overlays (%)",
    "overlays_percentage_v1_2026-01-15": "Draft winter sickness and storm contingency",
    "overlays_percentage_approved_q3": "Audited Q3 operational downtime overlays",
    
    # Downtime Overlays Hours
    "overlays_hours_v2_2026-07-01": "Mandatory safety stand-down hours overlay",
    "overlays_hours_v1_2026-05-01": "Toolbox talks and compliance briefing hours",
    "overlays_hours_baseline_v1": "Standard weekly non-productive downtime hours",
    
    # Downtime Overlays Hours/FTE
    "overlays_hrs_fte_v2_2026-07-01": "Per-engineer training overlay (1.8 hrs/FTE)",
    "overlays_hrs_fte_v1_2026-04-15": "Annual leave standard factor (2.2 hrs/FTE)",
    "overlays_hrs_fte_approved_v3": "Centrica field union agreed downtime factor",
    
    # Overtime
    "overtime_allowance_q3_v2": "15% capped weekend voluntary overtime",
    "overtime_allowance_q2_v1": "10% baseline overtime authorization",
    "overtime_cap_standard_2026": "Standard winter surge overtime mandate",
    
    # Baseline productivity
    "baseline_productivity_2026_v3": "3.8 jobs/day standard HEC benchmark",
    "baseline_productivity_2026_v2": "3.6 jobs/day winter adjustment benchmark",
    "baseline_productivity_benchmark_v1": "Historical 12-month trailing average",
    
    # Training SNM
    "training_snm_schedule_2026_v2": "Smart meter & EV dual-fuel academy cohorts",
    "training_snm_schedule_2026_v1": "Heat pump upskilling program",
    "training_snm_cohort_2026": "Standard apprentice academy rotation",
    
    # CTR Capacity
    "ctr_capacity_allocations_v2": "Third-party contractor allocation Q3/Q4",
    "ctr_capacity_allocations_v1": "Core framework contractor agreement",
    "ctr_capacity_contractors_v1": "Spot market emergency contractor capacity",
    
    # Attrition
    "es_shiny_attrition_input2_2026-02-05 09:54:11": "Regional annualized attrition forecast (8.5%)",
    "attrition_rates_fy26_v1": "Budget baseline attrition model",
    "attrition_forecast_q3_v2": "Q3 seasonal leaver projection",
    
    # Recruitment config
    "recruitment_productivity_ramp_v2": "12-week onboarding ramp (20% to 100%)",
    "recruitment_productivity_ramp_v1": "Accelerated 8-week experienced hire ramp",
    "recruitment_config_standard_v1": "Standard graduate / apprentice curve",
    
    # Demand input
    "es_shiny_es_mtp_demand2_input3_2026-02-04 08:10:23": "MTP Demand unconstrained forecast run #3",
    "demand_forecast_q3_unconstrained_v2": "Marketing campaign boosted heating demand",
    "demand_forecast_q2_baseline_v1": "Baseline customer breakdown call volume",
    
    # Job time assumptions
    "job_time_2026-02-23 17:08:12": "Standard job duration matrix by work code",
    "job_time_assumptions_standard_v2": "Optimized travel & first-time fix durations",
    "job_time_assumptions_v1": "Historical task duration baseline",
    
    # HEC on KAC Demand
    "hec_on_kac_crosskill_v2_2026": "HEC engineers supporting 15% KAC appliance demand",
    "hec_on_kac_crosskill_v1_2026": "Limited gas boiler cross-skill coverage",
    "hec_on_kac_standard_transfer": "Standard operational mutual support",
    
    # HEC on EV Demand
    "hec_on_ev_demand_transfer_v2": "Level 3 certified HEC engineers on EV chargers",
    "hec_on_ev_demand_transfer_v1": "Pilot commercial EV installation support",
    "hec_on_ev_pilot_model": "Regional EV charger rollout model",
    
    # Geography mapping
    "es_shiny_geog_mapping_input2_2026-02-18 13:04:22": "UK 32-patch to 5-region master mapping",
    "geography_patch_mapping_2026_v1": "Q1 postal code boundary mapping",
    "geography_mapping_updated_q2": "Post-boundary alignment patch map",
    
    # Week to month
    "week_to_month_fiscal_2026_v2": "Centrica 4-4-5 fiscal retail calendar",
    "week_to_month_standard_v1": "Calendar month proportioning model",
    "week_to_month_calendar_2026": "Standard ISO calendar week mapping"
}

# Automated registration of dummy ML forecast files for all 21 operational inputs
ML_FORECAST_DESCRIPTIONS = {
    "resource_plan": "Centrica AI ML Model: XGBoost + LSTM engineer staffing allocation forecast (94.8% confidence)",
    "fte_transfer": "ML Autonomous Transfer Optimizer: Mixed-integer linear programming rebalancing recommendations",
    "recruitment_grounded": "ML Grounded Attrition-Adjusted Intake Pipeline (Gradient Boosted Classifier)",
    "recruitment_ungrounded": "ML Contingent Contractor Upside Model (Monte Carlo simulation, 90th percentile)",
    "baseline_assumptions": "ML Automated Contractual Hours & Productivity Baseline (Telemetry tuned)",
    "downtime_overlays_percentage": "ML Weather & Seasonality Predictive Downtime Overlays (Prophet v3)",
    "downtime_overlays_hours": "ML Stand-Down Hours Anomaly Detection & Forecast (DeepAR)",
    "downtime_overlays_hours_fte": "ML Per-FTE Training & Sickness Variance Forecaster",
    "overtime": "ML Dynamic Overtime Allocation Recommendation (Cost-constrained MILP)",
    "baseline_productivity": "ML Historical Job Duration & Productive Pace Model (LightGBM 96.1% R²)",
    "training_snm": "ML Smart Metering (SnM) Upskilling Progression Forecaster",
    "ctr_capacity": "ML Third-Party Contractor Capacity Availability Prediction",
    "attrition": "Predictive HR Churn Engine: Survival Analysis & Random Forest (93.2% accuracy)",
    "recruitment_config": "ML Learning Curve & Field Ramp-Up Simulator",
    "demand_input": "Centrica AI Demand Engine: Prophet + Met Office weather regressors (95.4% accuracy)",
    "job_time_assumptions": "ML Automated Standard Job Times (Telematics & IoT meter telemetry)",
    "hec_on_kac_demand": "ML Cross-Skilling HEC-on-KAC Transfer Demand Forecast",
    "hec_on_ev_demand": "ML EV Charging Points Installation Demand Acceleration Model",
    "geography_mapping": "ML Dynamic Patch Boundary & Geo-Routing Matrix (K-Means + Voronoi)",
    "week_to_month": "ML Financial Calendar & Workday Weighting Predictor",
    "actuals_input": "ML Auto-Reconciled Operational & Ledger Actuals (Anomaly Cleaned)"
}

for _cat_key, _desc in ML_FORECAST_DESCRIPTIONS.items():
    if _cat_key in DEFAULT_INPUT_OPTIONS:
        _ml_v1 = f"ml_forecast_{_cat_key}_2026-10-30 06:00:00"
        _ml_v2 = f"ml_forecast_{_cat_key}_2026-10-29 06:00:00"
        if _ml_v1 not in DEFAULT_INPUT_OPTIONS[_cat_key]:
            DEFAULT_INPUT_OPTIONS[_cat_key].append(_ml_v1)
        if _ml_v2 not in DEFAULT_INPUT_OPTIONS[_cat_key]:
            DEFAULT_INPUT_OPTIONS[_cat_key].append(_ml_v2)
        DEFAULT_REMARKS[_ml_v1] = _desc
        DEFAULT_REMARKS[_ml_v2] = f"{_desc} (Previous Day Run)"

CATEGORY_FOLDER_MAP = {
    "actuals_input": "actuals",
    "resource_plan": "capacity",
    "fte_transfer": "capacity",
    "recruitment_grounded": "capacity",
    "recruitment_ungrounded": "capacity",
    "baseline_assumptions": "capacity",
    "downtime_overlays_percentage": "capacity",
    "downtime_overlays_hours": "capacity",
    "downtime_overlays_hours_fte": "capacity",
    "overtime": "capacity",
    "baseline_productivity": "capacity",
    "training_snm": "capacity",
    "ctr_capacity": "capacity",
    "attrition": "capacity_config",
    "recruitment_config": "capacity_config",
    "demand_input": "demand",
    "job_time_assumptions": "demand_config",
    "hec_on_kac_demand": "demand_config",
    "hec_on_ev_demand": "demand_config",
    "geography_mapping": "other_config",
    "week_to_month": "other_config"
}

def parse_date_from_option(val: str) -> float:
    """Parses date/time stamp from version string for descending sorting (latest at top)."""
    if not val or not isinstance(val, str):
        return 0.0
    import re
    from datetime import datetime
    m = re.search(r'(\d{4})[-_](\d{2})[-_](\d{2})(?:[ _T](\d{2})[:-_](\d{2})(?:[:-_](\d{2})?)?)?', val)
    if m:
        try:
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            hh = int(m.group(4)) if m.group(4) else 0
            mm = int(m.group(5)) if m.group(5) else 0
            ss = int(m.group(6)) if m.group(6) else 0
            return datetime(y, mo, d, hh, mm, ss).timestamp()
        except Exception:
            return 0.0
    return 0.0

def register_uploaded_file(file_type: str, filename: str, remarks: str = "", content: str = None) -> bool:
    """Registers an uploaded file in DEFAULT_INPUT_OPTIONS and DEFAULT_REMARKS, saving content to disk if provided."""
    import re
    if file_type not in DEFAULT_INPUT_OPTIONS:
        DEFAULT_INPUT_OPTIONS[file_type] = []
    
    # Clean file extension if present so dropdowns strictly have user uploaded file name _datetimestamp
    clean_name = re.sub(r'\.(csv|xlsx|xls)$', '', filename, flags=re.IGNORECASE)
    
    if clean_name not in DEFAULT_INPUT_OPTIONS[file_type]:
        DEFAULT_INPUT_OPTIONS[file_type].append(clean_name)
        
    # Sort dropdown options descending by timestamp (latest at top)
    DEFAULT_INPUT_OPTIONS[file_type].sort(key=parse_date_from_option, reverse=True)
    
    if remarks:
        DEFAULT_REMARKS[clean_name] = remarks
    else:
        DEFAULT_REMARKS[clean_name] = f"User uploaded version for {file_type}"
        
    if content is not None:
        try:
            folder = CATEGORY_FOLDER_MAP.get(file_type, "capacity")
            target_dir = EnvironmentConfig.get_data_dir() / folder
            target_dir.mkdir(parents=True, exist_ok=True)
            safe_filename = clean_name if clean_name.endswith((".csv", ".xlsx", ".xls")) else f"{clean_name}.csv"
            safe_filename = safe_filename.replace(":", "-")
            file_path = target_dir / safe_filename
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"Warning: could not write uploaded file to disk: {e}")

        # Ingest into Databricks Unity Catalog Delta table if compute is active
        try:
            from engine.data_engine import CapacityDataEngine
            engine = CapacityDataEngine.get_instance()
            if engine.is_databricks_active():
                import io
                df_up = pd.read_csv(io.StringIO(content))
                engine.append_uploaded_file_to_databricks(file_type, clean_name, df_up)
        except Exception as e:
            print(f"[Databricks] Upload Delta ingestion warning: {e}")
            
    return True

def get_file_remark(filename: str, fallback_label: str = "") -> str:
    """Returns the operational remark associated with a selected file version."""
    if not filename:
        return "No file selected."
    if filename in DEFAULT_REMARKS:
        return DEFAULT_REMARKS[filename]
    return f"Active configuration for {fallback_label or filename} (Updated)"


def get_weekly_synthetic_data(input_key: str) -> pd.DataFrame:
    """
    Generates rich synthetic data at the weekly level covering the 29-week
    planning horizon defined in TRAJECTORY_HORIZON_WEEKS (Sep 14, 2026 to Mar 29, 2027)
    with geography, skill, and numeric metrics for bulk modification and scenario modeling.
    """
    random.seed(42)  # Deterministic seed for reproducible baseline
    
    # 1. FTE Transfer (Present Patch, Start Date, End Date, Future Patch, Outgoing Skill, Incoming Skill, Fte)
    if input_key == "fte_transfer":
        pairs = [
            ("EB12 Altrincham", "2026-08-30", "2099-01-01", "EB12 Altrincham", "KAC", "EV", 1.0),
            ("EC82 Scunthorpe", "2026-07-31", "2099-01-01", "EC82 Scunthorpe", "KAC", "EV", 1.0),
            ("ED42 Maidstone & Medway", "2027-07-01", "2099-01-01", "ED42 Maidstone & Medway", "KAC", "EV", 1.0),
            ("EA11 Inverness & Aviemore", "2026-09-01", "2099-01-01", "EA12 Aberdeen North", "HEC", "HEC", 1.5),
            ("EB13 Manchester Centre", "2026-10-01", "2099-01-01", "EB14 Stockport", "HEC", "HEC", 2.0),
            ("EC91 Leicester", "2026-09-15", "2099-01-01", "EC62 Essex East", "KAC", "HEC", 1.0),
            ("ED22 Cobham & Heathrow", "2026-11-01", "2099-01-01", "ED41 Bromley & Dartford", "HEC", "EV", 1.0),
            ("EA21 Stirling & Falkirk", "2026-08-15", "2099-01-01", "EA13 Dundee & Perth", "HEC", "HEC", 1.5),
            ("EB24 The Wirral", "2026-10-15", "2099-01-01", "EB12 Altrincham", "HEC", "HEC", 1.0),
            ("EC41 Reading", "2026-09-01", "2099-01-01", "EC31 New Forest", "KAC", "EV", 1.0),
            ("EA62 Preston & Southport", "2026-10-01", "2099-01-01", "EA62 Blackpool & Lancaster", "HEC", "HEC", 1.5),
            ("ED11 Chiswick & City", "2026-11-15", "2099-01-01", "ED22 Cobham & Heathrow", "KAC", "EV", 1.0),
        ]
        rows = []
        for pres_p, st_dt, end_dt, fut_p, out_sk, in_sk, fte_val in pairs:
            rows.append({
                "Present Patch": pres_p,
                "Start Date": st_dt,
                "End Date": end_dt,
                "Future Patch": fut_p,
                "Outgoing Skill": out_sk,
                "Incoming Skill": in_sk,
                "Fte": fte_val
            })
        return pd.DataFrame(rows)

    # 2. Recruitment Grounded (Discipline, Journey, Classlist, Induction Date, Go Live Date, Sap Pay Number, Class List Status, Workday Status, Ward, Area Code)
    elif input_key == "recruitment_grounded":
        cohorts = [
            ("SEE", "FQ", "LEI SEE FA 01 26", "2026-01-12", "2030-01-01", "nan", "Non Starter", "", "46B", "D1"),
            ("UKI", "HSA", "DA HSA 01 26", "2026-01-12", "2030-01-01", "962147", "New To Brand", "Active", "5D", "5D"),
            ("SEE", "FQ", "LEI SEE FA 01 26", "2026-01-12", "2030-01-01", "961272", "New To Brand", "Active", "55C", "D6"),
            ("UKI", "HSA", "DA HSA 01 26", "2026-01-12", "2030-01-01", "962146", "New To Brand", "Active", "5E", "5E"),
            ("UKI", "HSA", "DA HSA 01 26", "2026-01-12", "2030-01-01", "962428", "New To Brand", "Active", "5E", "5E"),
            ("SEE", "FQ", "LEI SEE FA 01 26", "2026-01-12", "2030-01-01", "961514", "New To Brand", "Active", "42D", "B1"),
            ("UKI", "HSA", "DA HSA 01 26", "2026-01-12", "2030-01-01", "962264", "New To Brand", "Active", "6B", "6B"),
            ("UKI", "HSA", "DA HSA 01 26", "2026-01-12", "2030-01-01", "962148", "New To Brand", "Active", "6B", "6B"),
            ("UKI", "HSA", "DA HSA 01 26", "2026-01-12", "2030-01-01", "94434", "New To Brand", "Active", "6A", "6A"),
            ("SEE", "FQ", "LEI SEE FA 01 26", "2026-01-12", "2030-01-01", "962551", "New To Brand", "Active", "41A", "D2"),
            ("UKI", "HSA", "DA HSA 01 26", "2026-01-12", "2030-01-01", "962612", "New To Brand", "Active", "5C", "5C"),
            ("SEE", "FQ", "LEI SEE FA 01 26", "2026-01-12", "2030-01-01", "962705", "New To Brand", "Active", "44D", "D4"),
        ]
        rows = []
        for disc, jrny, clist, ind_dt, gl_dt, sap, cl_st, wd_st, ward, acode in cohorts:
            rows.append({
                "Discipline": disc,
                "Journey": jrny,
                "Classlist": clist,
                "Induction Date": ind_dt,
                "Go Live Date": gl_dt,
                "Sap Pay Number": sap,
                "Class List Status": cl_st,
                "Workday Status": wd_st,
                "Ward": ward,
                "Area Code": acode
            })
        return pd.DataFrame(rows)

    # 3. Recruitment Ungrounded (Area Code, Patch, Position, Pay Id, Id Cohort, Start Date, End Date, Fte, Fq, Trainee, Cross Skill, Apprentice)
    elif input_key == "recruitment_ungrounded":
        pipelines = [
            ("EA5", "EA53 Tees & Boro", "HEC", "", "Ungrounded", "2027-01-11", "", 1, 1, 0, 0, 0),
            ("EA6", "EA62 Blackpool & Lancaster", "HEC", "", "Ungrounded", "2027-01-11", "", 1, 1, 0, 0, 0),
            ("EA7", "EA72 Leeds & Harrogate", "HEC", "", "Ungrounded", "2027-01-11", "", 1, 1, 0, 0, 0),
            ("EA7", "EA74 Hull & York", "HEC", "", "Ungrounded", "2027-01-11", "", 1, 1, 0, 0, 0),
            ("EB4", "EB43 Birmingham", "HEC", "", "Ungrounded", "2027-01-11", "", 1, 1, 0, 0, 0),
            ("EB1", "EB12 Altrincham", "KAC", "", "Ungrounded", "2027-01-18", "", 1, 1, 0, 0, 0),
            ("EC9", "EC91 Leicester", "HEC", "", "Ungrounded", "2027-01-18", "", 1, 1, 0, 0, 0),
            ("ED4", "ED44 Canterbury & Dover", "EV", "", "Ungrounded", "2027-02-01", "", 1, 0, 1, 0, 0),
            ("EC6", "EC62 Essex East", "HEC", "", "Ungrounded", "2027-02-01", "", 1, 1, 0, 0, 0),
            ("EB2", "EB24 The Wirral", "KAC", "", "Ungrounded", "2027-02-08", "", 1, 0, 0, 1, 0),
            ("EA1", "EA11 Inverness & Aviemore", "HEC", "", "Ungrounded", "2027-02-08", "", 1, 1, 0, 0, 0),
            ("EC4", "EC41 Reading", "EV", "", "Ungrounded", "2027-02-15", "", 1, 0, 0, 0, 1),
        ]
        rows = []
        for acode, patch, pos, pid, coh, sdt, edt, fte_val, fq, trn, crs, app in pipelines:
            rows.append({
                "Area Code": acode,
                "Patch": patch,
                "Position": pos,
                "Pay Id": pid,
                "Id Cohort": coh,
                "Start Date": sdt,
                "End Date": edt,
                "Fte": fte_val,
                "Fq": fq,
                "Trainee": trn,
                "Cross Skill": crs,
                "Apprentice": app
            })
        return pd.DataFrame(rows)

    # 4. Downtime Overlays Percentage (patch, skill, metric, level2, weekcomm, values)
    elif input_key in ["downtime_overlays_percentage", "overlays_percentage"]:
        metrics = [
            ("Other", "EV Van", -0.0097484),
            ("Training", "Safety", 0.0),
            ("Sickness", "Short Term Absence", -0.0152),
            ("Annual Leave", "Holiday Overlay", -0.0421),
            ("Meeting", "Team Briefing", -0.0085)
        ]
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            doy = datetime.strptime(w, "%Y-%m-%d").timetuple().tm_yday
            theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)
            # Lower holiday/training overlays in winter, higher in summer/shoulder
            season = 1.0 - 0.28 * math.cos(theta)
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    for m_name, lvl2, base_val in metrics:
                        s_mult = 1.0 + 0.15 * math.cos(theta) if m_name == "Sickness" else season
                        val = 0.0 if base_val == 0.0 else round(base_val * s_mult + random.uniform(-0.004, 0.004), 8)
                        rows.append({
                            "patch": p,
                            "skill": sk,
                            "metric": m_name,
                            "level2": lvl2,
                            "weekcomm": w,
                            "values": val
                        })
        return pd.DataFrame(rows)

    # 5. Downtime Overlays Hours (patch, skill, metric, level2, weekcomm, values)
    elif input_key in ["downtime_overlays_hours", "overlays_hours"]:
        metrics = [
            ("Training", "Safety", 0.0),
            ("Sickness", "Short Term Absence", 18.5),
            ("Annual Leave", "Holiday Overlay", 45.0),
            ("Meeting", "Team Briefing", 8.0)
        ]
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            doy = datetime.strptime(w, "%Y-%m-%d").timetuple().tm_yday
            theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)
            season = 1.0 - 0.30 * math.cos(theta)
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    for m_name, lvl2, base_val in metrics:
                        s_mult = 1.0 + 0.15 * math.cos(theta) if m_name == "Sickness" else season
                        val = 0.0 if base_val == 0.0 else round(max(0.0, base_val * s_mult + random.uniform(-3.0, 4.0)), 1)
                        rows.append({
                            "patch": p,
                            "skill": sk,
                            "metric": m_name,
                            "level2": lvl2,
                            "weekcomm": w,
                            "values": val
                        })
        return pd.DataFrame(rows)

    # 6. Downtime Overlays Hours/FTE (patch, skill, metric, level2, period, weekcomm, values)
    elif input_key in ["downtime_overlays_hours_fte", "overlays_hours_fte", "overlays_hrs_fte"]:
        metrics = [
            ("Other", "HEC SCT Investment Time - Hrs/FTE", "Monthly", 0.0),
            ("Training", "SNM Academy Technical - Hrs/FTE", "Monthly", 1.8),
            ("Annual Leave", "Holiday Factor - Hrs/FTE", "Monthly", 2.2),
            ("Meeting", "Safety Briefing - Hrs/FTE", "Weekly", 0.8)
        ]
        areas = ["EA1", "EA2", "EA3", "EA4", "EB1", "EB2", "EC1", "EC2", "ED1", "ED2"]
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for a in areas:
                for sk in SKILLS:
                    for m_name, lvl2, period, base_val in metrics:
                        val = 0.0 if base_val == 0.0 else round(max(0.0, base_val + random.uniform(-0.3, 0.4)), 2)
                        rows.append({
                            "patch": a,
                            "skill": sk,
                            "metric": m_name,
                            "level2": lvl2,
                            "period": period,
                            "weekcomm": w,
                            "values": val
                        })
        return pd.DataFrame(rows)

    # 7. Baseline Assumptions (Patch, Skill, Metric, Weekcomm, Values)
    elif input_key == "baseline_assumptions":
        metrics = ["Holiday", "Sickness", "Training", "Meeting"]
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    for m in metrics:
                        val = -round(random.uniform(0.015, 0.055), 8)
                        rows.append({
                            "Patch": p,
                            "Skill": sk,
                            "Metric": m,
                            "Weekcomm": w,
                            "Values": val
                        })
        return pd.DataFrame(rows)

    # 8. Overtime (Patch, Skill, Weekcomm, Values)
    elif input_key == "overtime":
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            doy = datetime.strptime(w, "%Y-%m-%d").timetuple().tm_yday
            theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)
            # Higher overtime in peak winter, lower in summer/shoulder
            winter_ovt = 1.0 + 0.45 * math.cos(theta)
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    val = round(max(1.0, random.uniform(3.0, 7.5) * winter_ovt), 8)
                    rows.append({
                        "Patch": p,
                        "Skill": sk,
                        "Weekcomm": w,
                        "Values": val
                    })
        return pd.DataFrame(rows)

    # 9. Baseline Productivity (Patch, Skill, Weekcomm, Values)
    elif input_key == "baseline_productivity":
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    base = 0.46 if sk == "HEC" else (0.58 if sk == "KAC" else 0.70)
                    val = round(base + random.uniform(-0.08, 0.12), 8)
                    rows.append({
                        "Patch": p,
                        "Skill": sk,
                        "Weekcomm": w,
                        "Values": val
                    })
        return pd.DataFrame(rows)

    # 10. Training SNM (Patch, Skill, Weekcomm, Values)
    elif input_key == "training_snm":
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    val = random.choice([0.0, 0.0, 2.5, 5.0, 7.5])
                    rows.append({
                        "Patch": p,
                        "Skill": sk,
                        "Weekcomm": w,
                        "Values": val
                    })
        return pd.DataFrame(rows)

    # 11. CTR Capacity (Patch, Skill, Sp, Utilisation, Weekcomm, Values)
    elif input_key == "ctr_capacity":
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            doy = datetime.strptime(w, "%Y-%m-%d").timetuple().tm_yday
            theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)
            winter_sp = 1.0 + 0.50 * math.cos(theta)
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    base_sp = random.choice([0.0, 12.0, 24.0, 36.0])
                    val = round(max(0.0, base_sp * winter_sp), 2)
                    rows.append({
                        "Patch": p,
                        "Skill": sk,
                        "Sp": "General",
                        "Utilisation": 0.56,
                        "Weekcomm": w,
                        "Values": val
                    })
        return pd.DataFrame(rows)

    # 12. Attrition (Region Code, Skill, Weekcomm, Values)
    elif input_key == "attrition":
        skills_attr = ["EV", "HEC", "HEC Recruitment", "KAC", "KAC Recruitment"]
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for reg in REGIONS:
                for sk in skills_attr:
                    val = 0.0 if sk == "EV" else (0.12 if "HEC" in sk else 0.07)
                    rows.append({
                        "Region Code": reg,
                        "Skill": sk,
                        "Weekcomm": w,
                        "Values": val
                    })
        return pd.DataFrame(rows)

    # 13. Recruitment Config (Skill, Type, Weeknum, Values)
    elif input_key == "recruitment_config":
        types_map = {
            "HEC": [("Mentor_FQ", 1), ("Mentor_Trainee", 1), ("Trainee", 1), ("Trainee_SnM", 0)],
            "KAC": [("FQ", 1), ("FQ_SnM", 0), ("Mentor_FQ", 1), ("Mentor_Trainee", 1), ("Trainee", 0), ("Trainee_SnM", 0)],
            "EV": [("FQ", 1), ("Mentor_FQ", 1), ("Trainee", 1), ("Trainee_SnM", 0)]
        }
        rows = []
        for wnum in [10, 20, 30, 40, 50, 60]:
            for sk, tlist in types_map.items():
                for tname, default_v in tlist:
                    rows.append({
                        "Skill": sk,
                        "Type": tname,
                        "Weeknum": wnum,
                        "Values": default_v
                    })
        return pd.DataFrame(rows)

    # 14. Demand Input (Region Code, Area Code, Patch, Skill, Type, Work Code, Product, Weekcomm, Values)
    elif input_key == "demand_input":
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            doy = datetime.strptime(w, "%Y-%m-%d").timetuple().tm_yday
            theta = 2.0 * math.pi * ((doy - 12.0) / 365.25)
            winter_dem = 1.0 + 0.30 * math.cos(theta)
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    for wcode, prod in [("W00", "Partnerships"), ("W01", "Gas Servicing"), ("W17", "Appliance Maintenance")]:
                        base_jobs = random.choice([0, 0, 15, 28, 42])
                        jobs = int(round(base_jobs * winter_dem)) if base_jobs > 0 else 0
                        rows.append({
                            "Region Code": p[:1],
                            "Area Code": p[:3],
                            "Patch": p,
                            "Skill": sk,
                            "Type": "Patch",
                            "Work Code": wcode,
                            "Product": prod,
                            "Weekcomm": w,
                            "Values": jobs
                        })
        return pd.DataFrame(rows)

    # 15. Job Time Assumptions (Patch, Work Code, Skill, Weekcomm, Values)
    elif input_key == "job_time_assumptions":
        wcodes = ["W00", "W01", "W17", "W23", "W26"]
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for p in PATCHES[:12]:
                for sk in SKILLS:
                    for wc in wcodes:
                        dur = round(1.3 + (int(wc[1:]) % 5) * 0.25, 2)
                        rows.append({
                            "Patch": p,
                            "Work Code": wc,
                            "Skill": sk,
                            "Weekcomm": w,
                            "Values": dur
                        })
        return pd.DataFrame(rows)

    # 16. HEC on KAC Demand (Patch, Weekcomm, Values)
    elif input_key == "hec_on_kac_demand":
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for p in PATCHES[:15]:
                val = random.choice([0.0, 0.0, 0.15, 0.20])
                rows.append({
                    "Patch": p,
                    "Weekcomm": w,
                    "Values": val
                })
        return pd.DataFrame(rows)

    # 17. HEC on EV Demand (Patch, Weekcomm, Values)
    elif input_key == "hec_on_ev_demand":
        rows = []
        for w in TRAJECTORY_HORIZON_WEEKS:
            for p in PATCHES[:15]:
                val = random.choice([0.0, 0.0, 0.009, 0.05, 0.10])
                rows.append({
                    "Patch": p,
                    "Weekcomm": w,
                    "Values": val
                })
        return pd.DataFrame(rows)

    return pd.DataFrame([{"ID": 1, "Name": input_key, "Status": "Active"}])


def _generate_sample_df_for_category(input_key: str, filename: str = "") -> pd.DataFrame:
    """Helper to generate sample DataFrame for an input category."""
    WEEKLY_INPUT_KEYS = [
        "fte_transfer", "recruitment_grounded", "recruitment_ungrounded",
        "baseline_assumptions", "downtime_overlays_percentage", "downtime_overlays_hours",
        "downtime_overlays_hours_fte", "overtime", "baseline_productivity",
        "training_snm", "ctr_capacity", "attrition", "recruitment_config",
        "demand_input", "job_time_assumptions", "hec_on_kac_demand", "hec_on_ev_demand"
    ]
    if input_key in WEEKLY_INPUT_KEYS:
        base_df = get_weekly_synthetic_data(input_key)
    elif input_key == "actuals_input":
        base_df = SampleDataGenerator.get_imbalance_data()
    elif input_key == "resource_plan":
        base_df = SampleDataGenerator.get_capacity_fte_data()
    elif input_key == "geography_mapping":
        base_df = SampleDataGenerator.get_geog_mapping_data()
    elif input_key == "week_to_month":
        base_df = SampleDataGenerator.get_week_to_month_data()
    else:
        base_df = pd.DataFrame([{"ID": 1, "Name": input_key, "Status": "Active"}])

    if filename:
        try:
            from populate_distinct_version_data import transform_dataframe_for_version
            return transform_dataframe_for_version(input_key, filename, 0, base_df)
        except Exception:
            pass
    return base_df


def load_input_table_data(input_key: str, filename: str) -> Dict[str, Any]:
    """
    Reads tabular data for the specified input category and file version.
    When Databricks mode is active and compute is available, queries Databricks Unity Catalog
    Delta table (<catalog>.<schema>.es_shiny_<input_key>), auto-creating it if not present.
    Otherwise falls back to local data/<folder>/ CSV or category sample generator.
    """
    if not input_key:
        return {
            "success": False,
            "inputKey": "",
            "fileName": filename or "",
            "columns": [],
            "rows": [],
            "totalRows": 0,
            "error": "Input category must be provided."
        }

    if not filename:
        opts = DEFAULT_INPUT_OPTIONS.get(input_key, [])
        filename = opts[0] if opts else f"{input_key}_default"

    # Route to Databricks Unity Catalog when compute is active
    try:
        from engine.data_engine import CapacityDataEngine
        engine = CapacityDataEngine.get_instance()
        if engine.is_databricks_active():
            return engine.load_input_table_data(input_key, filename=filename)
    except Exception as e:
        from cluster_manager import ClusterStartingError
        if isinstance(e, ClusterStartingError):
            raise
        print(f"[Databricks] Falling back to local filesystem for '{input_key}': {e}")
    
    folder = CATEGORY_FOLDER_MAP.get(input_key, "capacity")
    data_dir = EnvironmentConfig.get_data_dir() / folder
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate list of candidate file paths to search on disk
    candidates = [
        data_dir / filename,
        data_dir / f"{filename}.csv",
        data_dir / filename.replace(":", "-"),
        data_dir / f"{filename.replace(':', '-')}.csv",
        data_dir / f"{filename}.xlsx",
        data_dir / f"{filename.replace(':', '-')}.xlsx"
    ]
    
    target_path = None
    for cand in candidates:
        if cand.exists() and cand.is_file():
            target_path = cand
            break
            
    # If not found via exact candidates, perform case-insensitive stem matching
    if target_path is None and data_dir.exists():
        clean_target = filename.replace(":", "-").lower()
        for f in data_dir.iterdir():
            if f.is_file() and (f.stem.lower() == clean_target or f.name.lower() == clean_target):
                target_path = f
                break

    # If file still doesn't exist on disk, generate sample data using the category generator
    if target_path is None:
        try:
            df = _generate_sample_df_for_category(input_key, filename=filename)
            safe_name = filename.replace(":", "-")
            if not safe_name.endswith((".csv", ".xlsx", ".xls")):
                safe_name = f"{safe_name}.csv"
            target_path = data_dir / safe_name
            df.to_csv(target_path, index=False)
        except Exception as e:
            return {
                "success": False,
                "inputKey": input_key,
                "fileName": filename,
                "columns": [],
                "rows": [],
                "totalRows": 0,
                "error": f"File '{filename}' not found and could not generate fallback: {e}"
            }
            
    try:
        def _read_and_sanitize() -> Dict[str, Any]:
            if target_path.suffix.lower() in [".xlsx", ".xls"]:
                df = pd.read_excel(target_path)
            else:
                df = pd.read_csv(target_path, low_memory=False)

            columns, rows = sanitize_dataframe_for_json(df)
            return {
                "success": True,
                "inputKey": input_key,
                "fileName": filename,
                "filePath": target_path.name,
                "columns": columns,
                "rows": rows,
                "totalRows": len(rows),
                "error": None
            }

        return get_cached_input_table(path_signature(target_path), input_key, filename, _read_and_sanitize)
    except Exception as e:
        return {
            "success": False,
            "inputKey": input_key,
            "fileName": filename,
            "columns": [],
            "rows": [],
            "totalRows": 0,
            "error": f"Failed reading table '{target_path.name}': {e}"
        }


def save_input_table_data(
    input_key: str,
    filename: str,
    rows: List[Dict[str, Any]],
    columns: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Saves edited tabular data for the specified input category and file version.
    Saves to the local CSV/Excel file in data/<folder>/ and updates Databricks Delta table if active.
    """
    if not input_key:
        return {"success": False, "error": "Input category must be specified."}
    if not filename:
        return {"success": False, "error": "File name must be specified."}
    if rows is None:
        return {"success": False, "error": "Table rows must be provided."}

    try:
        if columns and len(columns) > 0:
            df = pd.DataFrame(rows, columns=columns)
        else:
            df = pd.DataFrame(rows)

        # Strip any internal frontend tracking fields like __rowId, __id, etc.
        keep_cols = [c for c in df.columns if not str(c).startswith("__")]
        df = df[keep_cols]

        folder = CATEGORY_FOLDER_MAP.get(input_key, "capacity")
        data_dir = EnvironmentConfig.get_data_dir() / folder
        data_dir.mkdir(parents=True, exist_ok=True)

        candidates = [
            data_dir / filename,
            data_dir / f"{filename}.csv",
            data_dir / filename.replace(":", "-"),
            data_dir / f"{filename.replace(':', '-')}.csv",
            data_dir / f"{filename}.xlsx",
            data_dir / f"{filename.replace(':', '-')}.xlsx"
        ]

        target_path = None
        for cand in candidates:
            if cand.exists() and cand.is_file():
                target_path = cand
                break

        if target_path is None and data_dir.exists():
            clean_target = filename.replace(":", "-").lower()
            for f in data_dir.iterdir():
                if f.is_file() and (f.stem.lower() == clean_target or f.name.lower() == clean_target):
                    target_path = f
                    break

        if target_path is None:
            safe_name = filename.replace(":", "-")
            if not safe_name.endswith((".csv", ".xlsx", ".xls")):
                safe_name = f"{safe_name}.csv"
            target_path = data_dir / safe_name

        # Persist to disk (CSV or Excel)
        if target_path.suffix.lower() in [".xlsx", ".xls"]:
            df.to_excel(target_path, index=False)
        else:
            df.to_csv(target_path, index=False)
        invalidate_namespace("input_tables")

        # Route to Databricks Unity Catalog if compute is active
        try:
            from engine.data_engine import CapacityDataEngine
            engine = CapacityDataEngine.get_instance()
            if engine.is_databricks_active():
                engine.save_input_table_data(input_key, filename, df)
        except Exception as db_err:
            print(f"[Databricks] Unity Catalog save warning for '{input_key}': {db_err}")

        # Clean null/NaN values for JSON serialization
        out_cols, out_rows = sanitize_dataframe_for_json(df)

        return {
            "success": True,
            "inputKey": input_key,
            "fileName": filename,
            "filePath": target_path.name,
            "columns": out_cols,
            "rows": out_rows,
            "totalRows": len(out_rows),
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "inputKey": input_key,
            "fileName": filename,
            "error": f"Failed saving table data to '{filename}': {str(e)}"
        }


# ================================================================================================
# CALCULATION MODULES ENGINE (FTE, DOWNTIME, PRODUCTIVITY -> CAPACITY; DEMAND -> IMBALANCE)
# ================================================================================================

CALC_MODULE_METADATA = {
    "imbalance": {
        "name": "Imbalance Calculation Module",
        "title": "Imbalance Calculation Module",
        "table": "es_shiny_imbalance_calc",
        "keyCol": "imbalance_key",
        "category": "Combined Master Engine",
        "role": "Combines Capacity (`Productive hrs` + `SP`) and Workload (`workload hrs`) into pre-SP and post-SP imbalances (`DL_FTE`, `imb_presp`, `imb_postsp`)",
        "formula": "imb_presp = Productive hrs - Workload hrs | imb_postsp = (Productive hrs + SP) - Workload hrs | DL_FTE = Imbalance Hours / 37.5",
        "feedsInto": "Final Scenario Data (es_powerbi_model_checker_plan) & Decision Studio",
        "inputs": ["Capacity Calculation (es_shiny_capacity_calc)", "Workload Calculation (es_shiny_workload_calc)", "SP Contractors"]
    },
    "workload": {
        "name": "Workload Calculation Module",
        "title": "Workload Calculation Module",
        "table": "es_shiny_workload_calc",
        "keyCol": "workload_key",
        "category": "Workload Aggregation Engine",
        "role": "Aggregates detailed Demand Hours by patch, skill, and weekcomm into total skill workload hours",
        "formula": "Workload Hours (patch, skill, weekcomm) = Σ Demand Hours (es_shiny_demand_calc)",
        "feedsInto": "Imbalance Calculation Module & Final Scenario Data",
        "inputs": ["Demand Calculation (es_shiny_demand_calc)", "baseline_productivity", "geography_mapping"]
    },
    "demand": {
        "name": "Demand Calculation Module",
        "title": "Demand Calculation Module",
        "table": "es_shiny_demand_calc",
        "keyCol": "demand_key",
        "category": "Customer Workload Engine",
        "role": "Forecasts weekly customer demand hours across every patch, skill, work_code, and product category",
        "formula": "Demand Hours (work_code, product) = Forecasted Jobs * Standard Task Duration * Seasonal Curve",
        "feedsInto": "Workload Calculation Module & Final Scenario Data",
        "inputs": ["demand_input", "job_time_assumptions", "hec_on_kac_demand", "hec_on_ev_demand"]
    },
    "capacity": {
        "name": "Capacity Calculation Module",
        "title": "Capacity Calculation Module",
        "table": "es_shiny_capacity_calc",
        "keyCol": "capacity_key",
        "category": "Capacity Engine",
        "role": "Calculates Productive Capacity Hours from Available Hours minus operational Downtime Overlay Hours",
        "formula": "Productive Capacity Hours = Available Hours (es_shiny_avlhr_calc) - Downtime Overlay Hours",
        "feedsInto": "Imbalance Calculation Module & Final Scenario Data",
        "inputs": ["Available Hours Calculation (es_shiny_avlhr_calc)", "downtime_overlays_percentage", "baseline_productivity", "ctr_capacity"]
    },
    "available_hours": {
        "name": "Available Hours Calculation Module",
        "title": "Available Hours Calculation Module",
        "table": "es_shiny_avlhr_calc",
        "keyCol": "avl_key",
        "category": "Availability Engine",
        "role": "Converts effective FTE into Core & Available Hours after Holiday, Sickness, Training, Meeting, Other, and Overtime",
        "formula": "Core Hrs = (FTE * 37.5) - (Holiday + Sickness + Training + Meeting + Other) | Available Hrs = Core Hrs + Overtime",
        "feedsInto": "Capacity Calculation Module & Final Scenario Data",
        "inputs": ["FTE Calculation (es_shiny_fte_calc)", "baseline_assumptions", "overtime", "training_snm"]
    },
    "fte": {
        "name": "FTE Calculation Module",
        "title": "FTE Calculation Module",
        "table": "es_shiny_fte_calc",
        "keyCol": "fte_key",
        "category": "Resource & Staffing Feed",
        "role": "Determines weekly active FTE and recruitment cohort ramps by patch, skill, and group",
        "formula": "Effective FTE = Active Headcount + Recruitment Cohorts - Attrition ± Inter-Patch Transfers",
        "feedsInto": "Available Hours Calculation Module & Final Scenario Data",
        "inputs": ["resource_plan", "fte_transfer", "recruitment_grounded", "recruitment_ungrounded", "attrition"]
    }
}

def _generate_imbalance_calc_df() -> pd.DataFrame:
    """Generates Imbalance Calculation Module table combining Capacity and Demand."""
    rows = []
    patches = PATCHES[:20]
    skills = ["HEC", "KAC", "EV"]
    for i, p in enumerate(patches):
        skill = skills[i % len(skills)]
        dem_hrs = round(1100.0 + (i * 45.5) + random.uniform(-40, 60), 1)
        cap_factors = [0.93, 0.96, 1.05, 1.08, 1.02, 0.94, 1.06, 0.98, 1.04, 0.91]
        cap_factor = cap_factors[i % len(cap_factors)]
        cap_hrs = round(dem_hrs * cap_factor, 1)
        imb_hrs = round(cap_hrs - dem_hrs, 1)
        imb_fte = round(imb_hrs / 37.5, 2)
        cov_ratio = round((cap_hrs / dem_hrs) * 100, 1)
        status = "Surplus" if cov_ratio >= 102.0 else ("Deficit" if cov_ratio <= 98.0 else "Balanced")
        action = "Mutual aid export to adjacent patch" if status == "Surplus" else ("Authorize weekend surge overtime" if status == "Deficit" else "Within normal operating tolerance")
        
        rows.append({
            "Patch": p,
            "Skill": skill,
            "Weekcomm": "2026-10-05",
            "Demand Hours": dem_hrs,
            "Capacity Hours": cap_hrs,
            "Net Imbalance (Hours)": imb_hrs,
            "Net Imbalance (FTE)": imb_fte,
            "Coverage Ratio (%)": f"{cov_ratio}%",
            "Status": status,
            "Calculation Stage": "post_sp" if i % 2 == 0 else "pre_sp",
            "Operational Recommendation": action
        })
    return pd.DataFrame(rows)

def _generate_capacity_calc_df() -> pd.DataFrame:
    """Generates Capacity Calculation Module table fed by FTE, Downtime, and Productivity."""
    rows = []
    patches = PATCHES[:20]
    skills = ["HEC", "KAC", "EV"]
    for i, p in enumerate(patches):
        skill = skills[i % len(skills)]
        fte = round(28.0 + (i * 1.5) + random.uniform(-1.0, 2.0), 1)
        contract_hrs = 37.5
        gross_hrs = round(fte * contract_hrs, 1)
        down_pct = round(12.5 + (i % 5) * 0.8, 1)
        down_hrs = round(gross_hrs * (down_pct / 100.0), 1)
        avail_hrs = round(gross_hrs - down_hrs, 1)
        prod_rate = 3.8 if skill == "HEC" else (3.5 if skill == "KAC" else 2.2)
        cap_jobs = int(avail_hrs * (prod_rate / 7.5))
        
        rows.append({
            "Patch": p,
            "Skill": skill,
            "Weekcomm": "2026-10-05",
            "Effective FTE": fte,
            "Contract Shift (Hrs/Wk)": contract_hrs,
            "Gross Capacity Hours": gross_hrs,
            "Downtime Rate (%)": f"{down_pct}%",
            "Downtime Hours": down_hrs,
            "Net Available Hours": avail_hrs,
            "Productivity Pace (Jobs/Day)": prod_rate,
            "Net Capacity (Jobs)": cap_jobs,
            "Engine Status": "Calculated & Verified"
        })
    return pd.DataFrame(rows)

def _generate_fte_calc_df() -> pd.DataFrame:
    """Generates FTE Calculation Module table (Staffing, Headcount, Transfers)."""
    df = SampleDataGenerator.get_capacity_fte_data()
    return df

def _generate_downtime_calc_df() -> pd.DataFrame:
    """Generates Downtime Overlays Calculation Module table."""
    df = SampleDataGenerator.get_overlays_data("Percentage")
    return df

def _generate_productivity_calc_df() -> pd.DataFrame:
    """Generates Productivity Calculation Module table (Standard Durations & Benchmark Paces)."""
    data = [
        {"Skill": "HEC", "Work Code": "W00", "Product": "Gas Heating Breakdown Repair", "Standard Task Duration (Hrs)": 1.45, "Productivity Pace (Jobs/Day)": 3.8, "Weekly Output Target (Jobs)": 19, "Benchmark Year": 2026, "Ramp Factor": "100%"},
        {"Skill": "HEC", "Work Code": "W01", "Product": "First Time Fix Gas Appliance", "Standard Task Duration (Hrs)": 1.25, "Productivity Pace (Jobs/Day)": 4.0, "Weekly Output Target (Jobs)": 20, "Benchmark Year": 2026, "Ramp Factor": "100%"},
        {"Skill": "HEC", "Work Code": "W17", "Product": "S&R EHI Bonding Leads", "Standard Task Duration (Hrs)": 1.85, "Productivity Pace (Jobs/Day)": 3.2, "Weekly Output Target (Jobs)": 16, "Benchmark Year": 2026, "Ramp Factor": "100%"},
        {"Skill": "HEC", "Work Code": "W18", "Product": "CHI Fuse Board Upgrade", "Standard Task Duration (Hrs)": 2.10, "Productivity Pace (Jobs/Day)": 2.8, "Weekly Output Target (Jobs)": 14, "Benchmark Year": 2026, "Ramp Factor": "95%"},
        {"Skill": "HEC", "Work Code": "W20", "Product": "H Code Heating System Powerflush", "Standard Task Duration (Hrs)": 1.95, "Productivity Pace (Jobs/Day)": 3.0, "Weekly Output Target (Jobs)": 15, "Benchmark Year": 2026, "Ramp Factor": "100%"},
        {"Skill": "HEC", "Work Code": "W23", "Product": "Electrical Heating Circuit Repair", "Standard Task Duration (Hrs)": 1.65, "Productivity Pace (Jobs/Day)": 3.4, "Weekly Output Target (Jobs)": 17, "Benchmark Year": 2026, "Ramp Factor": "90%"},
        {"Skill": "HEC", "Work Code": "W26", "Product": "Breakdown Assist Tier 1", "Standard Task Duration (Hrs)": 1.35, "Productivity Pace (Jobs/Day)": 3.8, "Weekly Output Target (Jobs)": 19, "Benchmark Year": 2026, "Ramp Factor": "100%"},
        {"Skill": "HEC", "Work Code": "W31", "Product": "EICR Domestic Electrical Inspection", "Standard Task Duration (Hrs)": 2.50, "Productivity Pace (Jobs/Day)": 2.2, "Weekly Output Target (Jobs)": 11, "Benchmark Year": 2026, "Ramp Factor": "95%"},
        {"Skill": "KAC", "Work Code": "W01", "Product": "KAC Whitegoods Appliance Repair", "Standard Task Duration (Hrs)": 1.55, "Productivity Pace (Jobs/Day)": 3.5, "Weekly Output Target (Jobs)": 18, "Benchmark Year": 2026, "Ramp Factor": "100%"},
        {"Skill": "KAC", "Work Code": "W17", "Product": "KAC Appliance Annual Safety Check", "Standard Task Duration (Hrs)": 1.15, "Productivity Pace (Jobs/Day)": 4.2, "Weekly Output Target (Jobs)": 21, "Benchmark Year": 2026, "Ramp Factor": "100%"},
        {"Skill": "EV", "Work Code": "W23", "Product": "EV Charging Point Home Installation", "Standard Task Duration (Hrs)": 2.75, "Productivity Pace (Jobs/Day)": 2.2, "Weekly Output Target (Jobs)": 11, "Benchmark Year": 2026, "Ramp Factor": "85%"},
        {"Skill": "EV", "Work Code": "W26", "Product": "EV Fast Charger Commissioning", "Standard Task Duration (Hrs)": 1.90, "Productivity Pace (Jobs/Day)": 2.6, "Weekly Output Target (Jobs)": 13, "Benchmark Year": 2026, "Ramp Factor": "90%"}
    ]
    return pd.DataFrame(data)

def _generate_demand_calc_df() -> pd.DataFrame:
    """Generates Demand Calculation Module table (Forecasted Jobs & Required Demand Hours)."""
    df = SampleDataGenerator.get_demand_jobs_data()
    return df

def get_calculation_module_data(module_key: str, scenario_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns structured tabular data and operational metadata for one of the 6 sub-calculation modules:
    fte, available_hours, capacity, demand, workload, imbalance (backed directly by `es_shiny_*_calc`
    datasets keyed from `es_shiny_scenario_log` and combined into `es_powerbi_model_checker_plan`).
    """
    key = module_key.lower().strip() if module_key else "imbalance"
    if key == "avlhr":
        key = "available_hours"
    if key not in CALC_MODULE_METADATA:
        key = "imbalance"
    meta = CALC_MODULE_METADATA[key]

    try:
        from engine.data_engine import CapacityDataEngine
        from engine.scenario_data_engine import (
            SUBCALC_SPECS,
            get_scenario_log_path,
            get_subcalc_path,
            load_subcalc_for_scenario,
        )

        resolved_scen = str(scenario_id or "").strip()
        target_key = key if key in SUBCALC_SPECS else "imbalance"
        max_preview_rows = 5000

        def _build_calc_payload() -> Dict[str, Any]:
            df, res_scen, calc_key_val, _ = load_subcalc_for_scenario(target_key, scenario_id=resolved_scen or None)

            if "weekcomm" in df.columns and "patch" in df.columns:
                df = df.sort_values(["weekcomm", "patch"], kind="mergesort").reset_index(drop=True)

            total_rows_full = len(df)
            truncated = total_rows_full > max_preview_rows
            df_view = df.head(max_preview_rows) if truncated else df

            columns, rows = sanitize_dataframe_for_json(df_view)

            return {
                "success": True,
                "moduleKey": key,
                "moduleName": meta["name"],
                "tableName": meta.get("table", ""),
                "keyCol": meta.get("keyCol", ""),
                "calcKey": calc_key_val,
                "scenarioId": res_scen,
                "category": meta["category"],
                "role": meta["role"],
                "formula": meta["formula"],
                "feedsInto": meta["feedsInto"],
                "inputs": meta["inputs"],
                "columns": columns,
                "rows": rows,
                "totalRows": total_rows_full,
                "shownRows": len(rows),
                "truncated": truncated,
                "error": None
            }

        eng = CapacityDataEngine.get_instance()
        if eng.is_databricks_active():
            return _build_calc_payload()

        calc_sig = (
            path_signature(get_subcalc_path(target_key)),
            path_signature(get_scenario_log_path()),
            get_write_epoch("scenario_log"),
        )
        return get_cached_calc_module(calc_sig, target_key, resolved_scen or None, max_preview_rows, _build_calc_payload)
    except Exception as e:
        return {
            "success": False,
            "moduleKey": key,
            "moduleName": meta["name"],
            "tableName": meta.get("table", ""),
            "keyCol": meta.get("keyCol", ""),
            "calcKey": "",
            "scenarioId": scenario_id or "",
            "category": meta["category"],
            "role": meta["role"],
            "formula": meta["formula"],
            "feedsInto": meta["feedsInto"],
            "inputs": meta["inputs"],
            "columns": [],
            "rows": [],
            "totalRows": 0,
            "shownRows": 0,
            "truncated": False,
            "error": str(e)
        }



class ScenarioManager:
    """Handles storing, retrieving, and serializing planning scenarios."""
    
    def __init__(self):
        self.scenarios_file = EnvironmentConfig.get_data_dir() / "scenarios.json"
        self._ensure_storage()

    def _ensure_storage(self):
        """Ensures scenarios.json, es_shiny_scenario_log.csv, and es_powerbi_model_checker_plan.csv exist."""
        self.scenarios_file.parent.mkdir(parents=True, exist_ok=True)
        from engine.scenario_data_engine import ensure_default_scenarios_and_final_data
        ensure_default_scenarios_and_final_data(force_rebuild=False)

    @classmethod
    def _generate_default_scenarios(cls) -> Dict[str, Any]:
        """Creates default scenarios covering Nov 2, 2026 - Dec 27, 2027."""
        from engine.scenario_data_engine import get_default_scenario_definitions
        return {s["id"]: s for s in get_default_scenario_definitions()}

    def get_all_scenarios(self) -> Dict[str, Any]:
        """
        Retrieves all planning scenarios.
        Queries Databricks Unity Catalog `es_shiny_scenarios` Delta table when compute is active,
        and falls back to local `scenarios.json`.
        """
        try:
            from engine.data_engine import CapacityDataEngine
            engine = CapacityDataEngine.get_instance()
            if engine.is_databricks_active():
                db_scens = engine.load_scenarios()
                if db_scens:
                    try:
                        with open(self.scenarios_file, "w", encoding="utf-8") as f:
                            json.dump(db_scens, f, indent=2)
                    except Exception:
                        pass
                    return db_scens
        except Exception as e:
            from cluster_manager import ClusterStartingError
            if isinstance(e, ClusterStartingError):
                raise
            print(f"[Databricks] Scenarios read fallback: {e}")

        try:
            with open(self.scenarios_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return self._generate_default_scenarios()

    def get_scenario_names(self) -> List[str]:
        scenarios = self.get_all_scenarios()
        return list(scenarios.keys())

    def get_scenario(self, name: str) -> Optional[Dict[str, Any]]:
        scenarios = self.get_all_scenarios()
        return scenarios.get(name)

    def save_scenario(
        self,
        plan_type: str,
        month: str,
        version: str,
        remarks: str,
        inputs: Dict[str, str],
        year: Optional[str] = None
    ) -> str:
        """
        Saves a new scenario, logs all input keys & calc keys into `es_shiny_scenario_log`,
        and generates/links its final scenario data in `es_powerbi_model_checker_plan`.
        """
        from datetime import timezone
        from engine.scenario_data_engine import (
            append_scenario_log_entry,
            build_scenario_log_row,
            generate_subcalc_bundle_for_scenario,
            save_final_scenario_rows,
            save_subcalc_bundle,
        )

        scenarios = self.get_all_scenarios()
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")
        scenario_year = str(year or "2026").strip()
        scenario_id = f"{plan_type} {month} V.{version} {scenario_year}"

        new_scen = {
            "id": scenario_id,
            "plan_type": plan_type,
            "month": month,
            "version": str(version),
            "year": scenario_year,
            "remarks": remarks or "",
            "created_at": now_iso,
            "inputs": inputs or {},
        }
        scenarios[scenario_id] = new_scen

        try:
            with open(self.scenarios_file, "w", encoding="utf-8") as f:
                json.dump(scenarios, f, indent=2)
        except Exception as e:
            print(f"Warning: could not write local scenarios.json: {e}")

        engine = None
        try:
            from engine.data_engine import CapacityDataEngine
            engine = CapacityDataEngine.get_instance()
            if engine.is_databricks_active():
                engine.save_scenario_to_databricks(new_scen)
        except Exception as e:
            from cluster_manager import ClusterStartingError
            if isinstance(e, ClusterStartingError):
                raise
            print(f"[Databricks] Save scenario Delta warning: {e}")

        # Log into es_shiny_scenario_log and generate linked final scenario data
        log_row = build_scenario_log_row(
            scenario_key=scenario_id,
            last_update=now_iso,
            remarks=remarks or "",
            inputs=inputs or {},
            delete_flag="N",
        )
        append_scenario_log_entry(log_row, engine=engine)

        subcalc_bundle = generate_subcalc_bundle_for_scenario(
            scenario_key=scenario_id,
            create_datestamp=now_iso,
            inputs=inputs or {},
            log_row=log_row,
        )
        save_subcalc_bundle(subcalc_bundle, log_row, engine=engine)
        save_final_scenario_rows(scenario_id, subcalc_bundle["final_data"], engine=engine)

        return scenario_id

    def delete_scenario(self, scenario_id: str) -> bool:
        scenarios = self.get_all_scenarios()
        deleted = False
        if scenario_id in scenarios:
            del scenarios[scenario_id]
            try:
                with open(self.scenarios_file, "w", encoding="utf-8") as f:
                    json.dump(scenarios, f, indent=2)
            except Exception:
                pass
            deleted = True

        engine = None
        try:
            from engine.data_engine import CapacityDataEngine
            engine = CapacityDataEngine.get_instance()
            if engine.is_databricks_active():
                engine.delete_scenario_from_databricks(scenario_id)
                deleted = True
        except Exception as e:
            from cluster_manager import ClusterStartingError
            if isinstance(e, ClusterStartingError):
                raise
            print(f"[Databricks] Delete scenario Delta warning: {e}")

        try:
            from engine.scenario_data_engine import delete_scenario_from_log_and_plan
            delete_scenario_from_log_and_plan(scenario_id, engine=engine)
        except Exception as e:
            print(f"[ScenarioLog] Delete warning: {e}")

        return deleted


class SampleDataGenerator:
    """Generates and manages tabular data structures matching user UI screenshots."""
    
    @staticmethod
    def get_imbalance_data() -> pd.DataFrame:
        """
        Generates Dem vs Cap Imbalances table matching Image 4.
        Columns: Patch, Skill, Metric, Type, and weekly date columns.
        """
        rows = [
            {"Patch": "ED44 Canterbury & Dover", "Skill": "HEC", "Metric": "imb_presp", "Type": "pre_sp"},
            {"Patch": "EB12 Altrincham", "Skill": "HEC", "Metric": "DL_FTE", "Type": "pre_sp"},
            {"Patch": "EC62 Essex East", "Skill": "HEC", "Metric": "DL_FTE", "Type": "pre_sp"},
            {"Patch": "EB14 Stockport", "Skill": "KAC", "Metric": "imb_postsp", "Type": "post_sp"},
            {"Patch": "ED22 Cobham & Heathrow", "Skill": "HEC", "Metric": "DL_FTE", "Type": "post_sp"},
            {"Patch": "EA62 Blackpool & Lancaster", "Skill": "HEC", "Metric": "DL_FTE", "Type": "post_sp"},
            {"Patch": "EA62 Preston & Southport", "Skill": "KAC", "Metric": "DL_FTE", "Type": "post_sp"},
            {"Patch": "EB24 The Wirral", "Skill": "HEC", "Metric": "DL_FTE", "Type": "pre_sp"},
            {"Patch": "EC91 Leicester", "Skill": "HEC", "Metric": "imb_postsp", "Type": "post_sp"},
            {"Patch": "ED41 Bromley & Dartford", "Skill": "HEC", "Metric": "DL_FTE", "Type": "post_sp"},
            {"Patch": "EB13 Manchester Centre", "Skill": "KAC", "Metric": "imb_presp", "Type": "pre_sp"},
            {"Patch": "EB12 Lancashire South", "Skill": "HEC", "Metric": "DL_FTE", "Type": "post_sp"},
            {"Patch": "EB43 Hereford & Worcs", "Skill": "HEC", "Metric": "imb_presp", "Type": "pre_sp"},
            {"Patch": "EA11 Inverness & Aviemore", "Skill": "HEC", "Metric": "DL_FTE", "Type": "pre_sp"},
            {"Patch": "EC41 Reading", "Skill": "HEC", "Metric": "DL_FTE", "Type": "post_sp"}
        ]
        
        # Mixed surplus and deficit weeks across patches and horizon
        sample_values = [
            [1.45, -1.85, -2.65, 1.95, 2.40, -1.55, -2.20, 1.75, 2.15, -1.90, 1.85, 2.30],
            [3.2941, -2.4500, -3.1902, 1.6973, 2.9911, -1.5244, -2.4477, 3.8701, 2.6500, -2.5000, 3.4000, 3.3500],
            [12.5807, -14.2399, -18.1615, 9.9343, 14.9211, -11.0622, -16.3835, 15.6424, 11.1000, -13.2000, 14.0000, 16.5000],
            [3.1014, -2.7310, -2.4880, 2.0533, 1.8481, -2.4252, -3.3091, 3.7751, 3.5000, -2.4000, 3.3000, 3.2000],
            [2.9365, -1.8386, -2.7449, 2.6118, 2.2623, -1.6056, -2.4967, 2.4583, 2.4000, -1.3500, 2.3000, 2.2500],
            [0.7078, -0.5499, -0.5695, 0.4832, 0.3997, -0.5547, -0.5604, 0.4172, 0.4500, -0.4300, 0.4200, 0.4000]
        ]

        week_signs = [1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]
        for idx, row in enumerate(rows):
            if idx == 0:
                for c_idx, c in enumerate(DATE_COLS):
                    row[c] = round(week_signs[c_idx] * random.uniform(0.35, 0.95), 4)
            elif idx <= len(sample_values):
                vals = sample_values[idx - 1]
                for c_idx, c in enumerate(DATE_COLS):
                    row[c] = vals[c_idx] if c_idx < len(vals) else round(vals[-1] + random.uniform(-0.1, 0.1), 4)
            else:
                mag = random.choice([1.2, 2.5, 3.8, 5.0, 6.5])
                for c_idx, c in enumerate(DATE_COLS):
                    sign = week_signs[c_idx] if (idx + c_idx) % 4 != 0 else -week_signs[c_idx]
                    row[c] = round(sign * mag + random.uniform(-0.3, 0.3), 4)
                    
        return pd.DataFrame(rows)

    @staticmethod
    def get_inday_workload_data() -> pd.DataFrame:
        """
        Generates Dem vs Cap Inday Workload table matching Image 5.
        Columns: Patch, Skill, weekly dates.
        """
        rows = [
            {"Patch": "EB12 Altrincham", "Skill": "KAC", "base": 40.50},
            {"Patch": "EC81 Peterborough", "Skill": "HEC", "base": 43.23},
            {"Patch": "EC31 New Forest", "Skill": "HEC", "base": 62.50},
            {"Patch": "EC22 Cheltenham & Gloucester", "Skill": "KAC", "base": 31.76},
            {"Patch": "EA41 East Lothian Coast", "Skill": "KAC", "base": 17.43},
            {"Patch": "EA53 Tees & Boro", "Skill": "KAC", "base": 52.62},
            {"Patch": "EA42 West Lothian", "Skill": "HEC", "base": 26.06},
            {"Patch": "EC11 Cornwall", "Skill": "HEC", "base": 17.84},
            {"Patch": "ED11 Chiswick & City", "Skill": "KAC", "base": 46.10},
            {"Patch": "ED44 Canterbury & Dover", "Skill": "HEC", "base": 38.40},
            {"Patch": "EB14 Stockport", "Skill": "HEC", "base": 49.20},
            {"Patch": "EC62 Essex East", "Skill": "EV", "base": 22.80}
        ]
        
        for r in rows:
            b = r.pop("base")
            for c_idx, c in enumerate(DATE_COLS):
                trend = (c_idx * 0.4) + random.uniform(-1.0, 1.5)
                r[c] = round(b + trend, 4)
                
        return pd.DataFrame(rows)

    @staticmethod
    def get_demand_jobs_data() -> pd.DataFrame:
        """
        Generates National Demand Jobs table at weekly level.
        Columns: Region Code, Area Code, Patch, Skill, Type, Work Code, Product, Weekcomm, Values.
        """
        return get_weekly_synthetic_data("demand_input")

    @staticmethod
    def get_demand_hours_data() -> pd.DataFrame:
        """
        Generates Total Demand Hours table matching Image 7.
        Columns: Patch, Skill, Work Code, Product, weekly date columns.
        """
        data = [
            {"Patch": "EC91 Leicester", "Skill": "HEC", "Work Code": "W26", "Product": "Additional Work HEC"},
            {"Patch": "ED41 Bromley & Dartford", "Skill": "HEC", "Work Code": "W17", "Product": "S&R EHI bonding leads"},
            {"Patch": "EC91 Leicester", "Skill": "HEC", "Work Code": "W31", "Product": "EICR Appliance Check"},
            {"Patch": "EB13 Manchester Centre", "Skill": "HEC", "Work Code": "W18", "Product": "CHI Fuse Board"},
            {"Patch": "EB12 Lancashire South", "Skill": "HEC", "Work Code": "W23", "Product": "Electrical Heating"},
            {"Patch": "EB43 Hereford & Worcs", "Skill": "HEC", "Work Code": "W20", "Product": "H Code"},
            {"Patch": "EC81 Peterborough", "Skill": "HEC", "Work Code": "W01", "Product": "First Time Fix Gas"},
            {"Patch": "ED22 Cobham & Heathrow", "Skill": "KAC", "Work Code": "W17", "Product": "Annual Service"},
            {"Patch": "EA11 Inverness & Aviemore", "Skill": "HEC", "Work Code": "W26", "Product": "Breakdown Assist"}
        ]
        
        for r in data:
            for c in DATE_COLS:
                # Mostly 0s with periodic peak hours matching screenshot
                r[c] = random.choice([0, 0, 0, round(random.uniform(5.5, 45.0), 2)])
                
        return pd.DataFrame(data)

    @staticmethod
    def get_capacity_fte_data() -> pd.DataFrame:
        """
        Generates Capacity FTE table matching Image 8.
        Columns: Status, Pay Id, Labour Type, Wmis, Skill, Allocation, New Starter, Left Date, Future Move Date, Hec Fte, Hours, Up Date.
        """
        data = [
            {"Status": "Leaver", "Pay Id": "950718", "Labour Type": "Engineer", "Wmis": "0", "Skill": "KAC", "Allocation": 100, "New Starter": "N", "Left Date": "2025-06-09", "Future Move Date": "", "Hec Fte": 0, "Hours": 0, "Up Date": "2026-07-07"},
            {"Status": "Leaver", "Pay Id": "897363", "Labour Type": "Engineer", "Wmis": "0", "Skill": "KAC", "Allocation": 100, "New Starter": "N", "Left Date": "2022-02-24", "Future Move Date": "", "Hec Fte": 0, "Hours": 0, "Up Date": "2026-07-07"},
            {"Status": "Leaver", "Pay Id": "47846", "Labour Type": "Engineer", "Wmis": "0", "Skill": "HEC", "Allocation": 100, "New Starter": "N", "Left Date": "2021-07-20", "Future Move Date": "", "Hec Fte": 0, "Hours": 0, "Up Date": "2026-07-07"},
            {"Status": "Leaver", "Pay Id": "166183", "Labour Type": "Engineer", "Wmis": "EA1", "Skill": "HEC", "Allocation": 100, "New Starter": "N", "Left Date": "2021-09-02", "Future Move Date": "", "Hec Fte": 0, "Hours": 0, "Up Date": "2026-07-07"},
            {"Status": "Inactive", "Pay Id": "203601", "Labour Type": "Engineer", "Wmis": "EA1", "Skill": "HEC", "Allocation": 100, "New Starter": "N", "Left Date": "", "Future Move Date": "", "Hec Fte": 0, "Hours": 0, "Up Date": "2026-07-07"},
            {"Status": "Leaver", "Pay Id": "907778", "Labour Type": "Engineer", "Wmis": "EA1", "Skill": "KAC", "Allocation": 100, "New Starter": "N", "Left Date": "2022-11-07", "Future Move Date": "", "Hec Fte": 0, "Hours": 0, "Up Date": "2026-07-07"},
            {"Status": "Leaver", "Pay Id": "947410", "Labour Type": "Engineer", "Wmis": "0", "Skill": "KAC", "Allocation": 100, "New Starter": "N", "Left Date": "2025-02-07", "Future Move Date": "", "Hec Fte": 0, "Hours": 0, "Up Date": "2026-07-07"},
            {"Status": "Active", "Pay Id": "139276", "Labour Type": "Engineer", "Wmis": "EA11 Inverness & Aviemore", "Skill": "KAC", "Allocation": 100, "New Starter": "N", "Left Date": "", "Future Move Date": "", "Hec Fte": 1, "Hours": 37.5, "Up Date": "2026-07-07"},
            {"Status": "Active", "Pay Id": "967219", "Labour Type": "Engineer", "Wmis": "EC41 Reading", "Skill": "HEC", "Allocation": 100, "New Starter": "N", "Left Date": "", "Future Move Date": "", "Hec Fte": 1, "Hours": 37.5, "Up Date": "2026-07-07"},
            {"Status": "Active", "Pay Id": "966554", "Labour Type": "Engineer", "Wmis": "EC13 Devon South", "Skill": "HEC", "Allocation": 100, "New Starter": "N", "Left Date": "", "Future Move Date": "", "Hec Fte": 1, "Hours": 37.5, "Up Date": "2026-07-07"}
        ]
        return pd.DataFrame(data)

    @staticmethod
    def get_overlays_data(format_type: str = "Percentage") -> pd.DataFrame:
        """
        Generates Downtime Overlays table at weekly level.
        Columns: patch, skill, metric, level2, weekcomm, values (or with period for Hrs/FTE).
        """
        fmt = str(format_type).lower()
        if "fte" in fmt:
            return get_weekly_synthetic_data("downtime_overlays_hours_fte")
        elif "hour" in fmt:
            return get_weekly_synthetic_data("downtime_overlays_hours")
        else:
            return get_weekly_synthetic_data("downtime_overlays_percentage")

    @staticmethod
    def get_fte_transfer_data() -> pd.DataFrame:
        """Generates FTE Transfer table matching fte transfer.jpg."""
        return get_weekly_synthetic_data("fte_transfer")

    @staticmethod
    def get_recruitment_grounded_data() -> pd.DataFrame:
        """Generates Recruitment Grounded table matching recruitment grounded.jpg."""
        return get_weekly_synthetic_data("recruitment_grounded")

    @staticmethod
    def get_recruitment_ungrounded_data() -> pd.DataFrame:
        """Generates Recruitment Ungrounded table matching Recruitment ungrounded.jpg."""
        return get_weekly_synthetic_data("recruitment_ungrounded")

    @staticmethod
    def get_baseline_assumptions_data() -> pd.DataFrame:
        """Generates Baseline Assumptions table matching baseline assumptions downtimes.jpg."""
        return get_weekly_synthetic_data("baseline_assumptions")

    @staticmethod
    def get_baseline_productivity_data() -> pd.DataFrame:
        """Generates Baseline Productivity table matching baseline productivity.jpg."""
        return get_weekly_synthetic_data("baseline_productivity")

    @staticmethod
    def get_overtime_data() -> pd.DataFrame:
        """Generates Overtime table matching overtime.jpg."""
        return get_weekly_synthetic_data("overtime")

    @staticmethod
    def get_training_snm_data() -> pd.DataFrame:
        """Generates Training SNM table matching training snm.jpg."""
        return get_weekly_synthetic_data("training_snm")

    @staticmethod
    def get_ctr_capacity_data() -> pd.DataFrame:
        """Generates CTR Capacity table matching CTR Capacity.jpg."""
        return get_weekly_synthetic_data("ctr_capacity")

    @staticmethod
    def get_recruitment_config_data() -> pd.DataFrame:
        """Generates Recruitment Config table matching Recruitment.jpg."""
        return get_weekly_synthetic_data("recruitment_config")

    @staticmethod
    def get_hec_on_kac_data() -> pd.DataFrame:
        """Generates HEC on KAC Demand table matching HEC on KAC Demand.jpg."""
        return get_weekly_synthetic_data("hec_on_kac_demand")

    @staticmethod
    def get_hec_on_ev_data() -> pd.DataFrame:
        """Generates HEC on EV Demand table matching HEC on EV Demand.jpg."""
        return get_weekly_synthetic_data("hec_on_ev_demand")

    @staticmethod
    def get_attrition_data() -> pd.DataFrame:
        """
        Generates Attrition table at weekly level covering full trajectory horizon.
        Columns: Region Code, Skill, Weekcomm, Values.
        """
        return get_weekly_synthetic_data("attrition")

    @staticmethod
    def get_job_times_data() -> pd.DataFrame:
        """
        Generates Job Times Assumptions table at weekly level.
        Columns: Patch, Work Code, Skill, Weekcomm, Values.
        """
        return get_weekly_synthetic_data("job_time_assumptions")

    @staticmethod
    def get_geog_mapping_data() -> pd.DataFrame:
        """
        Generates Geographical Mapping table matching geog mapping.jpg:
        Columns: Region Code, Region, Area Code, Patch, Patch Name.
        """
        data = [
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA1", "Patch": "EA11 Inverness & Aviemore", "Patch Name": "Inverness & Aviemore"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA1", "Patch": "EA12 Aberdeen North", "Patch Name": "Aberdeen North"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA1", "Patch": "EA12 Aberdeen South", "Patch Name": "Aberdeen South"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA1", "Patch": "EA13 Dundee & Perth", "Patch Name": "Dundee & Perth"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA1", "Patch": "EA13 Fife", "Patch Name": "Fife"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA2", "Patch": "EA21 Dunbartonshire & Glasgow North", "Patch Name": "Dunbartonshire & Glasgow North"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA2", "Patch": "EA21 Stirling & Falkirk", "Patch Name": "Stirling & Falkirk"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA3", "Patch": "EA31 Clyde Coast", "Patch Name": "Clyde Coast"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA3", "Patch": "EA31 Glasgow South & Renfrewshire", "Patch Name": "Glasgow South & Renfrewshire"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA3", "Patch": "EA32 South West Ayrshire", "Patch Name": "South West Ayrshire"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA3", "Patch": "EA33 Dumfriesshire", "Patch Name": "Dumfriesshire"},
            {"Region Code": "A", "Region": "Scotland and Northern England", "Area Code": "EA4", "Patch": "EA41 East Lothian Coast", "Patch Name": "East Lothian Coast"},
            {"Region Code": "B", "Region": "North West", "Area Code": "EB1", "Patch": "EB12 Altrincham", "Patch Name": "Altrincham"},
            {"Region Code": "B", "Region": "North West", "Area Code": "EB1", "Patch": "EB13 Manchester Centre", "Patch Name": "Manchester Centre"},
            {"Region Code": "B", "Region": "North West", "Area Code": "EB1", "Patch": "EB14 Stockport", "Patch Name": "Stockport"},
            {"Region Code": "B", "Region": "North West", "Area Code": "EB2", "Patch": "EB24 The Wirral", "Patch Name": "The Wirral"},
            {"Region Code": "B", "Region": "North West", "Area Code": "EB4", "Patch": "EB43 Hereford & Worcs", "Patch Name": "Hereford & Worcs"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC9", "Patch": "EC91 Leicester", "Patch Name": "Leicester"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC6", "Patch": "EC62 Essex East", "Patch Name": "Essex East"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC4", "Patch": "EC41 Reading", "Patch Name": "Reading"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC3", "Patch": "EC31 New Forest", "Patch Name": "New Forest"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC2", "Patch": "EC22 Cheltenham & Gloucester", "Patch Name": "Cheltenham & Gloucester"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC8", "Patch": "EC81 Peterborough", "Patch Name": "Peterborough"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC1", "Patch": "EC11 Cornwall", "Patch Name": "Cornwall"},
            {"Region Code": "C", "Region": "Midlands", "Area Code": "EC1", "Patch": "EC13 Devon South", "Patch Name": "Devon South"},
            {"Region Code": "D", "Region": "London and South East", "Area Code": "ED1", "Patch": "ED11 Chiswick & City", "Patch Name": "Chiswick & City"},
            {"Region Code": "D", "Region": "London and South East", "Area Code": "ED2", "Patch": "ED22 Cobham & Heathrow", "Patch Name": "Cobham & Heathrow"},
            {"Region Code": "D", "Region": "London and South East", "Area Code": "ED4", "Patch": "ED41 Bromley & Dartford", "Patch Name": "Bromley & Dartford"},
            {"Region Code": "D", "Region": "London and South East", "Area Code": "ED4", "Patch": "ED44 Canterbury & Dover", "Patch Name": "Canterbury & Dover"}
        ]
        return pd.DataFrame(data)

    @staticmethod
    def get_all_geography_files_data() -> dict:
        """Loads and parses all geography files in other_config to dictionaries of rows."""
        import csv
        geo_dir = EnvironmentConfig.get_data_dir() / "other_config"
        result = {}
        if geo_dir.exists():
            for f in geo_dir.glob("*.csv"):
                if "geog" in f.name.lower() or "geo" in f.name.lower() or "patch_mapping" in f.name.lower():
                    clean_key = f.stem
                    try:
                        with open(f, mode="r", encoding="utf-8") as csvfile:
                            reader = csv.DictReader(csvfile)
                            rows = [row for row in reader]
                            result[clean_key] = rows
                    except Exception:
                        pass
        if not result:
            result["default"] = SampleDataGenerator.get_geog_mapping_data().to_dict(orient="records")
        return result

    @staticmethod
    def get_mismatch_patches() -> pd.DataFrame:
        """
        Generates Mismatch Patch with Actuals table matching Image 12.
        """
        data = [
            {"Patch": "ED42 Canterbury & Dover"},
            {"Patch": "ED42 Eastbourne & Hastings"},
            {"Patch": "EC21 Bristol South"}
        ]
        return pd.DataFrame(data)

    @staticmethod
    def get_week_to_month_data() -> pd.DataFrame:
        """
        Generates Week to Month data table matching Week to month.jpg:
        Columns: Month, Week, Day, Weekcomm, England Holiday, Scotland Holiday, England Percentage, Scotland Percentage.
        """
        data = [
            {"Month": "January", "Week": "2024-01-22", "Day": "Sunday", "Weekcomm": "2024-01-28", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 1.0, "Scotland Percentage": 1.0},
            {"Month": "January", "Week": "2024-01-29", "Day": "Monday", "Weekcomm": "2024-01-29", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 0.6, "Scotland Percentage": 0.6},
            {"Month": "January", "Week": "2024-01-29", "Day": "Tuesday", "Weekcomm": "2024-01-30", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 0.6, "Scotland Percentage": 0.6},
            {"Month": "January", "Week": "2024-01-29", "Day": "Wednesday", "Weekcomm": "2024-01-31", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 0.6, "Scotland Percentage": 0.6},
            {"Month": "February", "Week": "2024-01-29", "Day": "Thursday", "Weekcomm": "2024-02-01", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 0.4, "Scotland Percentage": 0.4},
            {"Month": "February", "Week": "2024-01-29", "Day": "Friday", "Weekcomm": "2024-02-02", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 0.4, "Scotland Percentage": 0.4},
            {"Month": "February", "Week": "2024-01-29", "Day": "Saturday", "Weekcomm": "2024-02-03", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 0.4, "Scotland Percentage": 0.4},
            {"Month": "February", "Week": "2024-01-29", "Day": "Sunday", "Weekcomm": "2024-02-04", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 1.0, "Scotland Percentage": 1.0},
            {"Month": "February", "Week": "2024-02-05", "Day": "Monday", "Weekcomm": "2024-02-05", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 1.0, "Scotland Percentage": 1.0},
            {"Month": "February", "Week": "2024-02-05", "Day": "Tuesday", "Weekcomm": "2024-02-06", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 1.0, "Scotland Percentage": 1.0},
            {"Month": "February", "Week": "2024-02-05", "Day": "Wednesday", "Weekcomm": "2024-02-07", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 1.0, "Scotland Percentage": 1.0},
            {"Month": "February", "Week": "2024-02-05", "Day": "Thursday", "Weekcomm": "2024-02-08", "England Holiday": "", "Scotland Holiday": "", "England Percentage": 1.0, "Scotland Percentage": 1.0}
        ]
        return pd.DataFrame(data)

    @staticmethod
    def get_scenario_comparison_metrics(scen_1: str, scen_2: str) -> pd.DataFrame:
        """
        Generates Tabular Comparison for Scenario Comparison tab.
        """
        weeks = DATE_COLS[:8]
        rows = []
        for w in weeks:
            d1 = round(random.uniform(4200, 4800), 1)
            c1 = round(random.uniform(4100, 4700), 1)
            imb1 = round(c1 - d1, 1)
            
            d2 = round(d1 * random.uniform(0.96, 1.05), 1)
            c2 = round(c1 * random.uniform(0.98, 1.08), 1)
            imb2 = round(c2 - d2, 1)
            
            rows.append({
                "Week Commencing": w,
                f"Demand ({scen_1[:12]})": d1,
                f"Demand ({scen_2[:12]})": d2,
                f"Capacity ({scen_1[:12]})": c1,
                f"Capacity ({scen_2[:12]})": c2,
                f"Imbalance ({scen_1[:12]})": imb1,
                f"Imbalance ({scen_2[:12]})": imb2,
                "Delta Imbalance": round(imb2 - imb1, 1)
            })
        return pd.DataFrame(rows)


def export_scenario_to_powerbi(
    scenario_id: str,
    export_target: str = "private",
    export_name: str = "",
    description: str = ""
) -> Dict[str, Any]:
    """
    Exports the selected scenario data for Microsoft Power BI.
    Supports 2 targets:
      - 'private': Centrica Energy Services - Private Capacity Planning Workspace (Restricted, Executive RLS)
      - 'public': Centrica Energy Services - Shared Organization Capacity Reports (Public, Organization Shared)
    Allows exporting with custom dataset/report name of user's choice.
    Saves CSV and .pbids to data/exports/ and records in powerbi_export_history.json.
    """
    try:
        # Sanitize export name or build default fallback
        raw_name = (export_name or "").strip()
        clean_name = re.sub(r'[^a-zA-Z0-9_\- ]', '_', raw_name)
        if not clean_name:
            clean_name = f"{scenario_id.replace(' ', '_').replace(':', '-')}_PowerBI"
        clean_name = clean_name.replace(" ", "_")

        is_private = (str(export_target).lower() == "private")
        workspace_name = (
            "Centrica Energy Services - Private Capacity Planning Workspace"
            if is_private
            else "Centrica Energy Services - Shared Organization Capacity Reports (Public)"
        )
        access_level = "Restricted (Executive RLS)" if is_private else "Organization-Wide (Public Shared)"
        target_label = "Private Power BI" if is_private else "Public Power BI"

        # Pull scenario dataset
        df_imbalance = SampleDataGenerator.get_imbalance_data()
        date_cols = [c for c in df_imbalance.columns if re.match(r'^\d{4}-\d{2}-\d{2}$', str(c))]

        # Build enriched tabular dataset for Power BI DirectQuery / Import
        records = []
        now_dt = datetime.now()
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")

        for _, row in df_imbalance.iterrows():
            patch = row.get("Patch", "")
            skill = row.get("Skill", "")
            metric = row.get("Metric", "")
            stage = row.get("Type", "")
            for d in date_cols:
                val = float(row[d]) if pd.notnull(row[d]) else 0.0
                status = "Surplus" if val > 0.05 else ("Deficit" if val < -0.05 else "Balanced")
                records.append({
                    "Scenario_ID": scenario_id,
                    "Export_Name": clean_name,
                    "Export_Target": target_label,
                    "Target_Workspace": workspace_name,
                    "Access_Level": access_level,
                    "Published_Timestamp": now_str,
                    "Week_Commencing": d,
                    "Patch": patch,
                    "Skill": skill,
                    "Metric": metric,
                    "Calculation_Stage": stage,
                    "Net_Imbalance_Hours": round(val, 2),
                    "Net_Imbalance_FTE": round(val / 37.5, 3),
                    "Buffer_Status": status,
                    "Export_Notes": description or ""
                })

        export_df = pd.DataFrame(records)

        # Ensure output directory exists
        exports_dir = Path("data") / "exports"
        exports_dir.mkdir(parents=True, exist_ok=True)

        csv_path = exports_dir / f"{clean_name}.csv"
        export_df.to_csv(csv_path, index=False)

        # Create standard Power BI Data Source (.pbids) file
        pbids_path = exports_dir / f"{clean_name}.pbids"
        abs_csv_path = str(csv_path.resolve()).replace("\\", "\\\\")
        pbids_content = {
            "version": "0.1",
            "connections": [
                {
                    "details": {
                        "path": abs_csv_path
                    },
                    "connectionType": "File"
                }
            ]
        }
        with open(pbids_path, "w", encoding="utf-8") as f:
            json.dump(pbids_content, f, indent=2)

        # Write metadata JSON
        meta = {
            "export_name": clean_name,
            "scenario_id": scenario_id,
            "export_target": "private" if is_private else "public",
            "target_label": target_label,
            "workspace_name": workspace_name,
            "access_level": access_level,
            "description": description or "",
            "timestamp": now_str,
            "rows_count": len(export_df),
            "csv_file": f"{clean_name}.csv",
            "pbids_file": f"{clean_name}.pbids"
        }
        with open(exports_dir / f"{clean_name}_meta.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        # Append to export history
        history_file = exports_dir / "powerbi_export_history.json"
        history = []
        if history_file.exists():
            try:
                history = json.loads(history_file.read_text(encoding="utf-8"))
            except Exception:
                history = []
        history.insert(0, meta)
        history = history[:30]
        history_file.write_text(json.dumps(history, indent=2), encoding="utf-8")

        return {
            "success": True,
            "exportName": clean_name,
            "scenarioId": scenario_id,
            "exportTarget": "private" if is_private else "public",
            "targetLabel": target_label,
            "targetWorkspace": workspace_name,
            "accessLevel": access_level,
            "timestamp": now_str,
            "totalRows": len(export_df),
            "csvFileName": f"{clean_name}.csv",
            "pbidsFileName": f"{clean_name}.pbids",
            "columns": list(export_df.columns),
            "sampleRows": export_df.head(15).to_dict(orient="records"),
            "history": history
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "scenarioId": scenario_id,
            "exportName": export_name
        }


def get_powerbi_export_history() -> List[Dict[str, Any]]:
    """Retrieves previous Power BI exports history."""
    history_file = Path("data") / "exports" / "powerbi_export_history.json"
    if history_file.exists():
        try:
            return json.loads(history_file.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


