"""
Data Manager Module
Handles sample data generation, file version listings, and scenario management.
"""

import json
import os
import random
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np

from config import EnvironmentConfig

# Common UK Patches and Skills from Centrica / British Gas Capacity Planning
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

# Detailed remarks for every file version matching British Gas operations
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


def _generate_sample_df_for_category(input_key: str) -> pd.DataFrame:
    """Helper to generate sample DataFrame for an input category."""
    if input_key == "actuals_input":
        return SampleDataGenerator.get_imbalance_data()
    elif input_key == "resource_plan":
        return SampleDataGenerator.get_capacity_fte_data()
    elif input_key == "fte_transfer":
        return pd.DataFrame([
            {"From": "EA1", "To": "EA2", "FTE": 1.5, "Reason": "Peak Winter Demand"},
            {"From": "EB1", "To": "EB2", "FTE": 2.0, "Reason": "Storm Response"},
            {"From": "EC1", "To": "EC2", "FTE": 1.0, "Reason": "Apprentice Support"}
        ])
    elif input_key == "recruitment_grounded":
        return pd.DataFrame([
            {"Cohort": "Grounded Q3 Cohort 1", "Headcount": 25, "Skill": "HEC", "Start Date": "2026-10-01"},
            {"Cohort": "Grounded Q3 Cohort 2", "Headcount": 20, "Skill": "KAC", "Start Date": "2026-11-01"},
            {"Cohort": "Grounded Q4 Cohort 1", "Headcount": 15, "Skill": "EV", "Start Date": "2026-12-01"}
        ])
    elif input_key == "recruitment_ungrounded":
        return pd.DataFrame([
            {"Cohort": "Ungrounded Upside A", "Headcount": 40, "Skill": "HEC", "Probability": "75%"},
            {"Cohort": "Ungrounded Upside B", "Headcount": 30, "Skill": "EV", "Probability": "60%"},
            {"Cohort": "Contingent Academy C", "Headcount": 20, "Skill": "KAC", "Probability": "80%"}
        ])
    elif input_key == "baseline_assumptions":
        return pd.DataFrame([
            {"Metric": "Contractual Standard Hours", "Value": 37.5, "Unit": "hrs/week"},
            {"Metric": "Shift Length", "Value": 7.5, "Unit": "hrs/day"},
            {"Metric": "Working Days per Week", "Value": 5, "Unit": "days"},
            {"Metric": "Annual Leave Factor", "Value": 11.2, "Unit": "%"}
        ])
    elif input_key == "downtime_overlays_percentage":
        return SampleDataGenerator.get_overlays_data("Percentage")
    elif input_key == "downtime_overlays_hours":
        return SampleDataGenerator.get_overlays_data("Hours")
    elif input_key == "downtime_overlays_hours_fte":
        return SampleDataGenerator.get_overlays_data("Hrs/FTE")
    elif input_key == "overtime":
        return pd.DataFrame([
            {"Rate": "1.5x Standard", "Cap": "10 hrs/week", "Voluntary": "Yes", "Authorized": "Yes"},
            {"Rate": "2.0x Weekend", "Cap": "8 hrs/week", "Voluntary": "Yes", "Authorized": "Pre-Approved"}
        ])
    elif input_key == "baseline_productivity":
        return pd.DataFrame([
            {"Skill": "HEC", "Rate": 3.8, "Target": 4.0, "Benchmark Year": 2025},
            {"Skill": "KAC", "Rate": 3.5, "Target": 3.8, "Benchmark Year": 2025},
            {"Skill": "EV", "Rate": 2.2, "Target": 2.5, "Benchmark Year": 2026}
        ])
    elif input_key == "training_snm":
        return pd.DataFrame([
            {"Course": "SNM Tier 2 Academy", "Attendees": 30, "Duration": "2 weeks", "Location": "Leeds Academy"},
            {"Course": "EV Installer Level 3", "Attendees": 18, "Duration": "3 weeks", "Location": "Dartford Academy"},
            {"Course": "Heat Pump Fundamentals", "Attendees": 24, "Duration": "4 weeks", "Location": "Leicester Academy"}
        ])
    elif input_key == "ctr_capacity":
        return pd.DataFrame([
            {"Agency": "Centrica Flex Contractors", "Contractors": 50, "Skill": "HEC", "Status": "Active"},
            {"Agency": "UK Field Solutions", "Contractors": 30, "Skill": "KAC", "Status": "Standby"},
            {"Agency": "GreenEnergy Tech Partners", "Contractors": 20, "Skill": "EV", "Status": "Mobilizing"}
        ])
    elif input_key == "attrition":
        return SampleDataGenerator.get_attrition_data()
    elif input_key == "recruitment_config":
        return pd.DataFrame([
            {"Week": 1, "Ramp": "20%", "Productivity Factor": 0.20},
            {"Week": 4, "Ramp": "50%", "Productivity Factor": 0.50},
            {"Week": 8, "Ramp": "80%", "Productivity Factor": 0.80},
            {"Week": 12, "Ramp": "100%", "Productivity Factor": 1.00}
        ])
    elif input_key == "demand_input":
        return SampleDataGenerator.get_demand_jobs_data()
    elif input_key == "job_time_assumptions":
        return SampleDataGenerator.get_job_times_data()
    elif input_key == "hec_on_kac_demand":
        return pd.DataFrame([
            {"Skill": "HEC", "Support": "KAC", "Ratio": 0.85, "Max Weekly Hours": 120},
            {"Skill": "HEC", "Support": "KAC Tier 2", "Ratio": 0.60, "Max Weekly Hours": 60}
        ])
    elif input_key == "hec_on_ev_demand":
        return pd.DataFrame([
            {"Skill": "HEC", "Support": "EV", "Ratio": 0.90, "Max Weekly Hours": 80},
            {"Skill": "HEC", "Support": "EV Commercial", "Ratio": 0.70, "Max Weekly Hours": 40}
        ])
    elif input_key == "geography_mapping":
        return SampleDataGenerator.get_geog_mapping_data()
    elif input_key == "week_to_month":
        return SampleDataGenerator.get_week_to_month_data()
    else:
        return pd.DataFrame([{"ID": 1, "Name": input_key, "Status": "Active"}])


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
            df = _generate_sample_df_for_category(input_key)
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
        if target_path.suffix.lower() in [".xlsx", ".xls"]:
            df = pd.read_excel(target_path)
        else:
            df = pd.read_csv(target_path)
            
        # Clean null/NaN values for JSON serialization
        df = df.where(pd.notnull(df), None)
        columns = [str(c) for c in df.columns]
        rows = df.to_dict(orient="records")
        
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

        # Route to Databricks Unity Catalog if compute is active
        try:
            from engine.data_engine import CapacityDataEngine
            engine = CapacityDataEngine.get_instance()
            if engine.is_databricks_active():
                engine.save_input_table_data(input_key, filename, df)
        except Exception as db_err:
            print(f"[Databricks] Unity Catalog save warning for '{input_key}': {db_err}")

        # Clean null/NaN values for JSON serialization
        df_clean = df.where(pd.notnull(df), None)
        out_cols = [str(c) for c in df_clean.columns]
        out_rows = df_clean.to_dict(orient="records")

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
        "category": "Combined Master Engine",
        "role": "Combines Capacity and Demand to calculate patch surpluses, deficits, and coverage ratios",
        "formula": "Net Imbalance (Hours) = Capacity Hours - Demand Hours | Coverage Ratio = (Capacity / Demand) * 100% | Net Imbalance (FTE) = Net Imbalance Hours / 37.5",
        "feedsInto": "Executive Planning, Patch Rebalancing & Overtime Authorization",
        "inputs": ["Capacity Calculation Output", "Demand Calculation Output"]
    },
    "capacity": {
        "name": "Capacity Calculation Module",
        "title": "Capacity Calculation Module",
        "category": "Capacity Engine",
        "role": "Calculates Net Available Productive Hours and Capacity Jobs from FTE, Downtime, and Productivity",
        "formula": "Available Hours = Gross FTE Hours - Downtime Hours | Net Capacity (Jobs) = Available Hours * Productivity Pace",
        "feedsInto": "Imbalance Calculation Module",
        "inputs": ["FTE Calculation Module", "Downtime Calculation Module", "Productivity Calculation Module"]
    },
    "fte": {
        "name": "FTE Calculation Module",
        "title": "FTE Calculation Module",
        "category": "Resource & Staffing Feed",
        "role": "Determines total effective field headcount, contractual hours, and mutual aid transfers",
        "formula": "Effective FTE = Active Headcount + Recruitment Cohorts - Leavers ± Inter-Patch Transfers",
        "feedsInto": "Capacity Calculation Module",
        "inputs": ["resource_plan", "fte_transfer", "recruitment_grounded", "recruitment_ungrounded", "attrition"]
    },
    "downtime": {
        "name": "Downtime Overlays Calculation Module",
        "title": "Downtime Overlays Calculation Module",
        "category": "Non-Productive Factors Feed",
        "role": "Calculates planned and unplanned non-productive downtime (absence, sickness, training, meetings)",
        "formula": "Total Downtime Hours = Gross Contract Hours * (Sickness% + Holiday% + Training% + Meeting% + Weather%)",
        "feedsInto": "Capacity Calculation Module",
        "inputs": ["downtime_overlays_percentage", "downtime_overlays_hours", "downtime_overlays_hours_fte", "baseline_assumptions"]
    },
    "productivity": {
        "name": "Productivity Calculation Module",
        "title": "Productivity Calculation Module",
        "category": "Efficiency & Benchmark Feed",
        "role": "Determines standard task completion durations, productive paces, and learning curve ramps by skill",
        "formula": "Productivity Pace (jobs/day) = Daily Shift Hours (7.5) / Standard Task Duration (Hours/Job)",
        "feedsInto": "Capacity Calculation Module",
        "inputs": ["baseline_productivity", "job_time_assumptions", "recruitment_config"]
    },
    "demand": {
        "name": "Demand Calculation Module",
        "title": "Demand Calculation Module",
        "category": "Customer Workload Engine",
        "role": "Forecasts customer breakdown volume, task mix, and converts job demand into required labor hours",
        "formula": "Total Demand Hours = Σ (Forecasted Jobs by Work Code * Standard Task Duration)",
        "feedsInto": "Imbalance Calculation Module",
        "inputs": ["demand_input", "job_time_assumptions", "hec_on_kac_demand", "hec_on_ev_demand"]
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

def get_calculation_module_data(module_key: str) -> Dict[str, Any]:
    """
    Returns structured tabular data and operational metadata for a selected calculation module:
    fte, downtime, productivity, capacity, demand, imbalance.
    """
    key = module_key.lower().strip() if module_key else "imbalance"
    meta = CALC_MODULE_METADATA.get(key, CALC_MODULE_METADATA["imbalance"])
    
    try:
        if key == "imbalance":
            df = _generate_imbalance_calc_df()
        elif key == "capacity":
            df = _generate_capacity_calc_df()
        elif key == "fte":
            df = _generate_fte_calc_df()
        elif key == "downtime":
            df = _generate_downtime_calc_df()
        elif key == "productivity":
            df = _generate_productivity_calc_df()
        elif key == "demand":
            df = _generate_demand_calc_df()
        else:
            df = _generate_imbalance_calc_df()
            
        df = df.where(pd.notnull(df), None)
        columns = [str(c) for c in df.columns]
        rows = df.to_dict(orient="records")
        
        return {
            "success": True,
            "moduleKey": key,
            "moduleName": meta["name"],
            "category": meta["category"],
            "role": meta["role"],
            "formula": meta["formula"],
            "feedsInto": meta["feedsInto"],
            "inputs": meta["inputs"],
            "columns": columns,
            "rows": rows,
            "totalRows": len(rows),
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "moduleKey": key,
            "moduleName": meta["name"],
            "category": meta["category"],
            "role": meta["role"],
            "formula": meta["formula"],
            "feedsInto": meta["feedsInto"],
            "inputs": meta["inputs"],
            "columns": [],
            "rows": [],
            "totalRows": 0,
            "error": str(e)
        }



class ScenarioManager:
    """Handles storing, retrieving, and serializing planning scenarios."""
    
    def __init__(self):
        self.scenarios_file = EnvironmentConfig.get_data_dir() / "scenarios.json"
        self._ensure_storage()

    def _ensure_storage(self):
        """Ensures the scenarios file exists with realistic default scenarios."""
        self.scenarios_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.scenarios_file.exists():
            default_scenarios = self._generate_default_scenarios()
            with open(self.scenarios_file, "w", encoding="utf-8") as f:
                json.dump(default_scenarios, f, indent=2)

    @classmethod
    def _generate_default_scenarios(cls) -> Dict[str, Any]:
        """Creates sample scenarios matching user screenshots."""
        scenario_jul = {
            "id": "LV JUL V.1 2026-07-07 12:46:46",
            "plan_type": "LV",
            "month": "JUL",
            "version": "1",
            "remarks": "test2",
            "created_at": "2026-07-07 12:46:46",
            "inputs": {k: v[0] for k, v in DEFAULT_INPUT_OPTIONS.items()}
        }
        
        scenario_oct = {
            "id": "LV OCT V.0 2026-10-29 16:00:00",
            "plan_type": "LV",
            "month": "OCT",
            "version": "0",
            "remarks": "October Operating Plan baseline",
            "created_at": "2026-10-29 16:00:00",
            "inputs": {
                **{k: v[0] for k, v in DEFAULT_INPUT_OPTIONS.items()},
                "resource_plan": "Latest Resource Plan V3_2026-07-07",
                "demand_input": "es_shiny_es_mtp_demand2_input3_2026-02-04 08:10:23",
                "downtime_overlays_percentage": "es_shiny_overlays_percentage_input2_2026-02-24 15:39:40",
                "attrition": "es_shiny_attrition_input2_2026-02-05 09:54:11",
                "job_time_assumptions": "job_time_2026-02-23 17:08:12",
                "geography_mapping": "es_shiny_geog_mapping_input2_2026-02-18 13:04:22"
            }
        }

        scenario_hv = {
            "id": "HV OCT V.1 2026-10-29 16:15:00",
            "plan_type": "HV",
            "month": "OCT",
            "version": "1",
            "remarks": "High Volume Winter Stress Test",
            "created_at": "2026-10-29 16:15:00",
            "inputs": {
                **{k: (v[1] if len(v) > 1 else v[0]) for k, v in DEFAULT_INPUT_OPTIONS.items()},
                "resource_plan": "Resource Plan V2_2026-06-15",
                "recruitment_ungrounded": "recruitment_ungrounded_upside_v2"
            }
        }
        
        return {
            scenario_jul["id"]: scenario_jul,
            scenario_oct["id"]: scenario_oct,
            scenario_hv["id"]: scenario_hv
        }

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
        inputs: Dict[str, str]
    ) -> str:
        """Saves a new scenario and persists to both local storage and Unity Catalog."""
        scenarios = self.get_all_scenarios()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        scenario_id = f"{plan_type} {month} V.{version} {now_str}"
        
        new_scen = {
            "id": scenario_id,
            "plan_type": plan_type,
            "month": month,
            "version": str(version),
            "remarks": remarks or "",
            "created_at": now_str,
            "inputs": inputs
        }
        scenarios[scenario_id] = new_scen
        
        try:
            with open(self.scenarios_file, "w", encoding="utf-8") as f:
                json.dump(scenarios, f, indent=2)
        except Exception as e:
            print(f"Warning: could not write local scenarios.json: {e}")

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
        
        # Exact values from screenshot row 2 to 7
        sample_values = [
            [-0.0173, -0.1431, -0.2717, -0.4692, -0.8923, -0.2042, -0.3122, -0.2449, -0.2100, -0.1950, -0.1800, -0.1700],
            [3.2941, 2.9939, 2.1902, 1.6973, 1.9911, 3.5244, 3.4477, 3.8701, 3.6500, 3.5000, 3.4000, 3.3500],
            [41.5807, 32.2399, 33.1615, 28.9343, 23.9211, 35.0622, 35.3835, 28.6424, 29.1000, 30.2000, 31.0000, 30.5000],
            [3.1014, 2.7310, 2.4880, 2.0533, 1.8481, 3.4252, 3.3091, 3.7751, 3.5000, 3.4000, 3.3000, 3.2000],
            [2.9365, 2.8386, 2.7449, 2.6118, 2.2623, 2.6056, 2.4967, 2.4583, 2.4000, 2.3500, 2.3000, 2.2500],
            [0.7078, 0.5499, 0.5695, 0.4832, 0.3997, 0.5547, 0.5604, 0.4172, 0.4500, 0.4300, 0.4200, 0.4000]
        ]
        
        for idx, row in enumerate(rows):
            if idx == 0:
                for c in DATE_COLS:
                    row[c] = round(random.uniform(-0.5, 0.5), 4)
            elif idx <= len(sample_values):
                vals = sample_values[idx - 1]
                for c_idx, c in enumerate(DATE_COLS):
                    row[c] = vals[c_idx] if c_idx < len(vals) else round(vals[-1] + random.uniform(-0.1, 0.1), 4)
            else:
                base = random.choice([2.5, -0.5, 1.2, 5.0, 18.0])
                for c in DATE_COLS:
                    row[c] = round(base + random.uniform(-0.3, 0.3), 4)
                    
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
        Generates National Demand Jobs table matching Image 6.
        Columns: Region Code, Area Code, Patch, Skill, Type, Work Code, Product, Weekcomm, Values.
        """
        data = [
            {"Region Code": "A", "Area Code": "EA1", "Patch": "EA11 Inverness & Aviemore", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA1", "Patch": "EA12 Aberdeen North", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA1", "Patch": "EA12 Aberdeen South", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA1", "Patch": "EA13 Dundee & Perth", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA1", "Patch": "EA13 Fife", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA2", "Patch": "EA21 Dunbartonshire & Glasgow North", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA2", "Patch": "EA21 Stirling & Falkirk", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA3", "Patch": "EA31 Clyde Coast", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "A", "Area Code": "EA3", "Patch": "EA31 Glasgow South & Renfrewshire", "Skill": "HEC", "Type": "Patch", "Work Code": "W00", "Product": "W00", "Weekcomm": "2025-01-06", "Values": 0},
            {"Region Code": "B", "Area Code": "EB1", "Patch": "EB12 Altrincham", "Skill": "KAC", "Type": "Patch", "Work Code": "W01", "Product": "W01", "Weekcomm": "2025-01-06", "Values": 14},
            {"Region Code": "B", "Area Code": "EB1", "Patch": "EB14 Stockport", "Skill": "HEC", "Type": "Patch", "Work Code": "W17", "Product": "W17", "Weekcomm": "2025-01-06", "Values": 28},
            {"Region Code": "C", "Area Code": "EC6", "Patch": "EC62 Essex East", "Skill": "EV", "Type": "Patch", "Work Code": "W23", "Product": "W23", "Weekcomm": "2025-01-06", "Values": 19},
            {"Region Code": "D", "Area Code": "ED4", "Patch": "ED44 Canterbury & Dover", "Skill": "HEC", "Type": "Patch", "Work Code": "W26", "Product": "W26", "Weekcomm": "2025-01-06", "Values": 35}
        ]
        return pd.DataFrame(data)

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
        Generates Downtime Overlays table matching Image 9.
        Columns: patch, skill, metric, level2, weekcomm, values.
        """
        suffix = " %" if format_type == "Percentage" else " Hrs"
        mult = 1.0 if format_type == "Percentage" else 7.5
        
        data = [
            {"patch": "EA11 Aberdeen North", "skill": "HEC", "metric": "Training", "level2": f"GFF3 HEC SIPD Training{suffix}", "weekcomm": "2025-01-06", "values": 0.0 * mult},
            {"patch": "EA11 Inverness & Aviemore", "skill": "HEC", "metric": "Training", "level2": f"GFF3 HEC SIPD Training{suffix}", "weekcomm": "2025-01-06", "values": 0.0 * mult},
            {"patch": "EA12 Aberdeen South", "skill": "HEC", "metric": "Training", "level2": f"GFF3 HEC SIPD Training{suffix}", "weekcomm": "2025-01-06", "values": 0.0 * mult},
            {"patch": "EA12 Dundee & Perth", "skill": "HEC", "metric": "Training", "level2": f"GFF3 HEC SIPD Training{suffix}", "weekcomm": "2025-01-06", "values": 0.0 * mult},
            {"patch": "EA12 Fife", "skill": "HEC", "metric": "Training", "level2": f"GFF3 HEC SIPD Training{suffix}", "weekcomm": "2025-01-06", "values": 0.0 * mult},
            {"patch": "EA21 Dunbartonshire & Glasgow North", "skill": "HEC", "metric": "Training", "level2": f"GFF3 HEC SIPD Training{suffix}", "weekcomm": "2025-01-06", "values": 0.0 * mult},
            {"patch": "EB12 Altrincham", "skill": "HEC", "metric": "Sickness", "level2": f"Short Term Absence{suffix}", "weekcomm": "2025-01-06", "values": round(3.5 * mult, 2)},
            {"patch": "EC62 Essex East", "skill": "EV", "metric": "Annual Leave", "level2": f"Bank Holiday Overlay{suffix}", "weekcomm": "2025-01-06", "values": round(5.0 * mult, 2)}
        ]
        return pd.DataFrame(data)

    @staticmethod
    def get_attrition_data() -> pd.DataFrame:
        """
        Generates Attrition table matching Image 10.
        Columns: Region Code, Skill, Weekcomm, Values.
        """
        data = [
            {"Region Code": "A", "Skill": "HEC", "Weekcomm": "2025-01-06", "Values": 0.20000000298023224},
            {"Region Code": "B", "Skill": "HEC", "Weekcomm": "2025-01-06", "Values": 0.20000000298023224},
            {"Region Code": "C", "Skill": "HEC", "Weekcomm": "2025-01-06", "Values": 0.20000000298023224},
            {"Region Code": "D", "Skill": "HEC", "Weekcomm": "2025-01-06", "Values": 0.20000000298023224},
            {"Region Code": "A", "Skill": "KAC", "Weekcomm": "2025-01-06", "Values": 0.08500000089406967},
            {"Region Code": "B", "Skill": "KAC", "Weekcomm": "2025-01-06", "Values": 0.045000000178813934},
            {"Region Code": "C", "Skill": "KAC", "Weekcomm": "2025-01-06", "Values": 0.045000000178813934},
            {"Region Code": "D", "Skill": "KAC", "Weekcomm": "2025-01-06", "Values": 0.13500000536441803},
            {"Region Code": "A", "Skill": "EV", "Weekcomm": "2025-01-06", "Values": 0.0},
            {"Region Code": "B", "Skill": "EV", "Weekcomm": "2025-01-06", "Values": 0.0},
            {"Region Code": "C", "Skill": "EV", "Weekcomm": "2025-01-06", "Values": 0.0}
        ]
        return pd.DataFrame(data)

    @staticmethod
    def get_job_times_data() -> pd.DataFrame:
        """
        Generates Job Times Assumptions table matching Image 11.
        Columns: Patch, Work Code, Skill, Weekcomm, Values.
        """
        patches_subset = [
            "EA74 Hull & York", "EB11 Liverpool & Formby", "EB12 Altrincham",
            "EB12 Lancashire South", "EB13 Manchester Centre", "EB13 Oldham & Glossop",
            "EB14 Cheshire East", "EB14 Stockport", "EB21 Cheshire West",
            "EB22 Wales North West", "EB23 Wales North East"
        ]
        data = []
        for p in patches_subset:
            data.append({
                "Patch": p,
                "Work Code": "W01",
                "Skill": "KAC",
                "Weekcomm": "2025-07-21",
                "Values": 1.27
            })
        return pd.DataFrame(data)

    @staticmethod
    def get_geog_mapping_data() -> pd.DataFrame:
        """
        Generates Geographical Mapping table matching operational hierarchy (Region, ACDM, territory).
        """
        data = [
            {"Region": "A", "ACDM": "A1", "territory": "EA11 Inverness & Aviemore"},
            {"Region": "A", "ACDM": "A1", "territory": "EA13 Dendee & Perth"},
            {"Region": "A", "ACDM": "A1", "territory": "EA12 Aberdeen North"},
            {"Region": "A", "ACDM": "A2", "territory": "EA21 Stirling & Falkirk"},
            {"Region": "A", "ACDM": "A2", "territory": "EA22 Edinburgh Central"},
            {"Region": "B", "ACDM": "B1", "territory": "EB11 Preston & Blackpool"},
            {"Region": "B", "ACDM": "B1", "territory": "EB14 Stockport & Peak"},
            {"Region": "B", "ACDM": "B2", "territory": "EB12 Altrincham"},
            {"Region": "B", "ACDM": "B2", "territory": "EB21 Manchester Central"},
            {"Region": "C", "ACDM": "C1", "territory": "EC91 Leicester"},
            {"Region": "C", "ACDM": "C1", "territory": "EC92 Nottingham & Derby"},
            {"Region": "C", "ACDM": "C2", "territory": "EC61 Norwich & Norfolk"},
            {"Region": "C", "ACDM": "C2", "territory": "EC62 Essex East"},
            {"Region": "D", "ACDM": "D1", "territory": "ED11 North London & Barnet"},
            {"Region": "D", "ACDM": "D2", "territory": "ED44 Canterbury & Dover"},
            {"Region": "D", "ACDM": "D2", "territory": "ED42 Eastbourne & Hastings"},
            {"Region": "E", "ACDM": "E1", "territory": "EE21 Bristol North & Bath"},
            {"Region": "E", "ACDM": "E2", "territory": "EE31 Exeter & Devon"}
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
        """Generates Week to Month data table."""
        data = [
            {"Weekcomm": "2026-09-28", "Calendar Month": "October", "Fiscal Month": "P07", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-05", "Calendar Month": "October", "Fiscal Month": "P07", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-12", "Calendar Month": "October", "Fiscal Month": "P07", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-19", "Calendar Month": "October", "Fiscal Month": "P07", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-26", "Calendar Month": "November", "Fiscal Month": "P08", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-11-02", "Calendar Month": "November", "Fiscal Month": "P08", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-11-09", "Calendar Month": "November", "Fiscal Month": "P08", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-11-16", "Calendar Month": "November", "Fiscal Month": "P08", "Fiscal Year": "FY26", "Weeks In Month": 4}
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


