"""
Data Manager Module
Handles sample data generation, file version listings, and scenario management.
"""

import json
import os
import random
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
            
    return True

def get_file_remark(filename: str, fallback_label: str = "") -> str:
    """Returns the operational remark associated with a selected file version."""
    if not filename:
        return "No file selected."
    if filename in DEFAULT_REMARKS:
        return DEFAULT_REMARKS[filename]
    return f"Active configuration for {fallback_label or filename} (Updated)"



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

    def _generate_default_scenarios(self) -> Dict[str, Any]:
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
        """Saves a new scenario and returns its unique scenario id."""
        scenarios = self.get_all_scenarios()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        scenario_id = f"{plan_type} {month} V.{version} {now_str}"
        
        scenarios[scenario_id] = {
            "id": scenario_id,
            "plan_type": plan_type,
            "month": month,
            "version": str(version),
            "remarks": remarks or "",
            "created_at": now_str,
            "inputs": inputs
        }
        
        with open(self.scenarios_file, "w", encoding="utf-8") as f:
            json.dump(scenarios, f, indent=2)
            
        return scenario_id

    def delete_scenario(self, scenario_id: str) -> bool:
        scenarios = self.get_all_scenarios()
        if scenario_id in scenarios:
            del scenarios[scenario_id]
            with open(self.scenarios_file, "w", encoding="utf-8") as f:
                json.dump(scenarios, f, indent=2)
            return True
        return False


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
        Generates Geographical Mapping table matching Image 12.
        """
        data = [
            {"Region Code": "A", "Area Code": "EA1", "Patch Name": "EA11 Inverness & Aviemore", "Postcode Prefix": "IV, PH", "Status": "Matched"},
            {"Region Code": "A", "Area Code": "EA1", "Patch Name": "EA12 Aberdeen North", "Postcode Prefix": "AB", "Status": "Matched"},
            {"Region Code": "A", "Area Code": "EA1", "Patch Name": "EA12 Aberdeen South", "Postcode Prefix": "AB", "Status": "Matched"},
            {"Region Code": "B", "Area Code": "EB1", "Patch Name": "EB12 Altrincham", "Postcode Prefix": "WA, M", "Status": "Matched"},
            {"Region Code": "B", "Area Code": "EB1", "Patch Name": "EB14 Stockport", "Postcode Prefix": "SK", "Status": "Matched"},
            {"Region Code": "C", "Area Code": "EC6", "Patch Name": "EC62 Essex East", "Postcode Prefix": "CO, CM", "Status": "Matched"},
            {"Region Code": "D", "Area Code": "ED4", "Patch Name": "ED44 Canterbury & Dover", "Postcode Prefix": "CT", "Status": "Matched"}
        ]
        return pd.DataFrame(data)

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

