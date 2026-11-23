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
    "fte_transfer": ("capacity", SampleDataGenerator.get_fte_transfer_data),
    "recruitment_grounded": ("capacity", SampleDataGenerator.get_recruitment_grounded_data),
    "recruitment_ungrounded": ("capacity", SampleDataGenerator.get_recruitment_ungrounded_data),
    "baseline_assumptions": ("capacity", SampleDataGenerator.get_baseline_assumptions_data),
    "downtime_overlays_percentage": ("capacity", lambda: SampleDataGenerator.get_overlays_data("Percentage")),
    "downtime_overlays_hours": ("capacity", lambda: SampleDataGenerator.get_overlays_data("Hours")),
    "downtime_overlays_hours_fte": ("capacity", lambda: SampleDataGenerator.get_overlays_data("Hrs/FTE")),
    "overtime": ("capacity", SampleDataGenerator.get_overtime_data),
    "baseline_productivity": ("capacity", SampleDataGenerator.get_baseline_productivity_data),
    "training_snm": ("capacity", SampleDataGenerator.get_training_snm_data),
    "ctr_capacity": ("capacity", SampleDataGenerator.get_ctr_capacity_data),
    "attrition": ("capacity_config", SampleDataGenerator.get_attrition_data),
    "recruitment_config": ("capacity_config", SampleDataGenerator.get_recruitment_config_data),
    "demand_input": ("demand", SampleDataGenerator.get_demand_jobs_data),
    "job_time_assumptions": ("demand_config", SampleDataGenerator.get_job_times_data),
    "hec_on_kac_demand": ("demand_config", SampleDataGenerator.get_hec_on_kac_data),
    "hec_on_ev_demand": ("demand_config", SampleDataGenerator.get_hec_on_ev_data),
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

