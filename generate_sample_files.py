"""
Populate sample CSV data files in the data directory.
"""

from pathlib import Path
import pandas as pd
from data_manager import DEFAULT_INPUT_OPTIONS, SampleDataGenerator

data_root = Path(__file__).parent / "data"

# Mapping input category to folder and sample dataframe generator
category_folder_map = {
    "actuals_input": ("actuals", SampleDataGenerator.get_imbalance_data),
    "resource_plan": ("capacity", SampleDataGenerator.get_capacity_fte_data),
    "fte_transfer": ("capacity", lambda: pd.DataFrame([{"From": "EA1", "To": "EA2", "FTE": 1.5}])),
    "recruitment_grounded": ("capacity", lambda: pd.DataFrame([{"Cohort": "Grounded Q3", "Headcount": 25}])),
    "recruitment_ungrounded": ("capacity", lambda: pd.DataFrame([{"Cohort": "Ungrounded Q3", "Headcount": 40}])),
    "baseline_assumptions": ("capacity", lambda: pd.DataFrame([{"Metric": "Std Hours", "Value": 37.5}])),
    "downtime_overlays_percentage": ("capacity", lambda: SampleDataGenerator.get_overlays_data("Percentage")),
    "downtime_overlays_hours": ("capacity", lambda: SampleDataGenerator.get_overlays_data("Hours")),
    "downtime_overlays_hours_fte": ("capacity", lambda: SampleDataGenerator.get_overlays_data("Hrs/FTE")),
    "overtime": ("capacity", lambda: pd.DataFrame([{"Rate": "1.5x", "Cap": "10 hrs/week"}])),
    "baseline_productivity": ("capacity", lambda: pd.DataFrame([{"Skill": "HEC", "Rate": 3.8}])),
    "training_snm": ("capacity", lambda: pd.DataFrame([{"Course": "SNM Tier 2", "Attendees": 30}])),
    "ctr_capacity": ("capacity", lambda: pd.DataFrame([{"Agency": "Centrica Flex", "Contractors": 50}])),
    "attrition": ("capacity_config", SampleDataGenerator.get_attrition_data),
    "recruitment_config": ("capacity_config", lambda: pd.DataFrame([{"Week": 1, "Ramp": "20%"}]),),
    "demand_input": ("demand", SampleDataGenerator.get_demand_jobs_data),
    "job_time_assumptions": ("demand_config", SampleDataGenerator.get_job_times_data),
    "hec_on_kac_demand": ("demand_config", lambda: pd.DataFrame([{"Skill": "HEC", "Support": "KAC", "Ratio": 0.85}])),
    "hec_on_ev_demand": ("demand_config", lambda: pd.DataFrame([{"Skill": "HEC", "Support": "EV", "Ratio": 0.90}])),
    "geography_mapping": ("other_config", SampleDataGenerator.get_geog_mapping_data),
    "week_to_month": ("other_config", SampleDataGenerator.get_week_to_month_data),
}

for cat, file_list in DEFAULT_INPUT_OPTIONS.items():
    folder_name, gen_func = category_folder_map[cat]
    target_dir = data_root / folder_name
    target_dir.mkdir(parents=True, exist_ok=True)
    
    for filename in file_list:
        clean_name = filename if filename.endswith(".csv") else f"{filename}.csv"
        # Sanitize any timestamp colons for Windows paths if needed
        clean_name = clean_name.replace(":", "-")
        filepath = target_dir / clean_name
        if not filepath.exists():
            df = gen_func()
            df.to_csv(filepath, index=False)
            print(f"Created: {filepath.relative_to(data_root.parent)}")

print("Sample data generation complete.")

