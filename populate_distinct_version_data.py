"""
Script: populate_distinct_version_data.py
Populates realistic, differentiated version files across ALL 21 operational planning inputs.
Ensures every version file has distinct row counts, distinct numeric values, and operational variations,
so comparing ANY pair of files (220/220 combinations) in the Compare View immediately shows distinct differences.
"""

import os
import random
from pathlib import Path
import pandas as pd
from data_manager import (
    DEFAULT_INPUT_OPTIONS,
    CATEGORY_FOLDER_MAP,
    TRAJECTORY_HORIZON_WEEKS,
    PATCHES,
    SKILLS,
    REGIONS,
    WORK_CODES,
    SampleDataGenerator
)

DATA_ROOT = Path("data")

def get_file_seed(cat: str, filename: str) -> int:
    """Generate a consistent numeric seed from category and filename."""
    h = 0
    s = f"{cat}_{filename}"
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFF
    return h

def generate_baseline_assumptions(version_idx: int, filename: str) -> pd.DataFrame:
    base_rows = [
        {"Metric": "Contractual Standard Hours", "Value": 37.5, "Unit": "hrs/week", "Category": "Working Time"},
        {"Metric": "Shift Length", "Value": 7.5, "Unit": "hrs/day", "Category": "Working Time"},
        {"Metric": "Working Days per Week", "Value": 5, "Unit": "days", "Category": "Working Time"},
        {"Metric": "Annual Leave Allowance", "Value": 25, "Unit": "days/year", "Category": "Leave"},
        {"Metric": "Sickness Absence Reserve", "Value": 4.5, "Unit": "%", "Category": "Absence"},
        {"Metric": "Overtime Pay Multiplier", "Value": 1.5, "Unit": "x", "Category": "Compensation"},
        {"Metric": "Bank Holiday Multiplier", "Value": 2.0, "Unit": "x", "Category": "Compensation"},
        {"Metric": "Mandatory Training Days", "Value": 10, "Unit": "days/FTE", "Category": "Training"},
        {"Metric": "Travel Time Allowance", "Value": 42.0, "Unit": "mins/job", "Category": "Field Productivity"},
        {"Metric": "Stand-down Safety Reserve", "Value": 2.0, "Unit": "%", "Category": "Governance"}
    ]
    df = pd.DataFrame(base_rows)
    
    if "final" in filename.lower():
        pass
    elif "draft" in filename.lower():
        df.loc[df["Metric"] == "Contractual Standard Hours", "Value"] = 38.0
        df.loc[df["Metric"] == "Shift Length", "Value"] = 7.6
        df.loc[df["Metric"] == "Mandatory Training Days", "Value"] = 12
        df.loc[df["Metric"] == "Travel Time Allowance", "Value"] = 45.0
        df.loc[df["Metric"] == "Sickness Absence Reserve", "Value"] = 5.0
    elif "q2" in filename.lower() or "v2" in filename.lower():
        df.loc[df["Metric"] == "Overtime Pay Multiplier", "Value"] = 1.45
        df.loc[df["Metric"] == "Bank Holiday Multiplier", "Value"] = 1.75
        df.loc[df["Metric"] == "Travel Time Allowance", "Value"] = 40.0
        df.loc[df["Metric"] == "Mandatory Training Days", "Value"] = 8
        df = df.iloc[:-1].copy()
    elif "2026-10-30" in filename:
        df.loc[df["Metric"] == "Contractual Standard Hours", "Value"] = 37.6
        df.loc[df["Metric"] == "Travel Time Allowance", "Value"] = 38.8
        df.loc[df["Metric"] == "Sickness Absence Reserve", "Value"] = 4.9
        extra = pd.DataFrame([
            {"Metric": "First-time Fix Target Rate", "Value": 88.5, "Unit": "%", "Category": "AI Telemetry"},
            {"Metric": "Mean Travel Mileage per Shift", "Value": 24.8, "Unit": "miles", "Category": "Route Telemetry"}
        ])
        df = pd.concat([df, extra], ignore_index=True)
    elif "2026-10-29" in filename:
        df.loc[df["Metric"] == "Contractual Standard Hours", "Value"] = 37.1
        df.loc[df["Metric"] == "Travel Time Allowance", "Value"] = 38.2
        df.loc[df["Metric"] == "Sickness Absence Reserve", "Value"] = 4.7
        extra = pd.DataFrame([
            {"Metric": "First-time Fix Target Rate", "Value": 87.2, "Unit": "%", "Category": "AI Telemetry"}
        ])
        df = pd.concat([df, extra], ignore_index=True)
    else:
        seed = get_file_seed("baseline_assumptions", filename)
        df.loc[df["Metric"] == "Travel Time Allowance", "Value"] = round(40.0 + (seed % 10), 1)
    return df

def generate_baseline_productivity(version_idx: int, filename: str) -> pd.DataFrame:
    base_rows = [
        {"Skill": "HEC (Home Energy)", "Rate": 3.8, "Target": 4.0, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 5.0},
        {"Skill": "KAC (Kitchen Appliances)", "Rate": 3.5, "Target": 3.8, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 5.0},
        {"Skill": "EV (Charging Infrastructure)", "Rate": 2.2, "Target": 2.5, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 8.0},
        {"Skill": "Smart Metering (SnM)", "Rate": 4.2, "Target": 4.5, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 4.0},
        {"Skill": "Heat Pumps & Renewables", "Rate": 1.8, "Target": 2.1, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 10.0},
        {"Skill": "Commercial Heating", "Rate": 2.8, "Target": 3.1, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 6.0},
        {"Skill": "Apprentice HEC", "Rate": 2.1, "Target": 2.4, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 12.0}
    ]
    df = pd.DataFrame(base_rows)
    
    if "v3" in filename.lower():
        pass
    elif "v2" in filename.lower():
        df["Rate"] = (df["Rate"] * 0.92).round(2)
        df["Target"] = (df["Target"] * 0.95).round(2)
        df["Benchmark_Year"] = 2025
    elif "benchmark" in filename.lower() or "v1" in filename.lower():
        df = df.iloc[:-1].copy()
        df["Rate"] = (df["Rate"] * 0.97).round(2)
        df["Benchmark_Year"] = 2024
    elif "2026-10-30" in filename:
        df["Rate"] = (df["Rate"] * 1.06).round(2)
        df["Target"] = (df["Target"] * 1.05).round(2)
        extra = pd.DataFrame([
            {"Skill": "EV Rapid Charger Specialist", "Rate": 1.95, "Target": 2.30, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 7.5}
        ])
        df = pd.concat([df, extra], ignore_index=True)
    elif "2026-10-29" in filename:
        df["Rate"] = (df["Rate"] * 1.02).round(2)
        df["Target"] = (df["Target"] * 1.03).round(2)
        extra = pd.DataFrame([
            {"Skill": "EV Rapid Charger Specialist", "Rate": 1.90, "Target": 2.25, "Benchmark_Year": 2026, "Variance_Tolerance_Pct": 7.5}
        ])
        df = pd.concat([df, extra], ignore_index=True)
    else:
        seed = get_file_seed("baseline_productivity", filename)
        df["Rate"] = (df["Rate"] * (0.95 + (seed % 10) / 100.0)).round(2)
    return df

def generate_week_to_month(version_idx: int, filename: str) -> pd.DataFrame:
    if "calendar" in filename.lower():
        rows = [
            {"Weekcomm": "2026-09-14", "Calendar Month": "September", "Fiscal Month": "P09", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-09-21", "Calendar Month": "September", "Fiscal Month": "P09", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-09-28", "Calendar Month": "September", "Fiscal Month": "P09", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-05", "Calendar Month": "October", "Fiscal Month": "P10", "Fiscal Year": "FY26", "Weeks In Month": 5},
            {"Weekcomm": "2026-10-12", "Calendar Month": "October", "Fiscal Month": "P10", "Fiscal Year": "FY26", "Weeks In Month": 5},
            {"Weekcomm": "2026-10-19", "Calendar Month": "October", "Fiscal Month": "P10", "Fiscal Year": "FY26", "Weeks In Month": 5},
            {"Weekcomm": "2026-10-26", "Calendar Month": "October", "Fiscal Month": "P10", "Fiscal Year": "FY26", "Weeks In Month": 5},
            {"Weekcomm": "2026-11-02", "Calendar Month": "November", "Fiscal Month": "P11", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-11-09", "Calendar Month": "November", "Fiscal Month": "P11", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-11-16", "Calendar Month": "November", "Fiscal Month": "P11", "Fiscal Year": "FY26", "Weeks In Month": 4}
        ]
        return pd.DataFrame(rows)
    elif "standard" in filename.lower() or "v1" in filename.lower():
        rows = [
            {"Weekcomm": "2026-09-28", "Calendar Month": "September", "Fiscal Month": "P09", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-05", "Calendar Month": "October", "Fiscal Month": "P10", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-12", "Calendar Month": "October", "Fiscal Month": "P10", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-19", "Calendar Month": "October", "Fiscal Month": "P10", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-10-26", "Calendar Month": "November", "Fiscal Month": "P11", "Fiscal Year": "FY26", "Weeks In Month": 4},
            {"Weekcomm": "2026-11-02", "Calendar Month": "November", "Fiscal Month": "P11", "Fiscal Year": "FY26", "Weeks In Month": 4}
        ]
        return pd.DataFrame(rows)
    elif "2026-10-30" in filename:
        base = SampleDataGenerator.get_week_to_month_data()
        extra = pd.DataFrame([
            {"Weekcomm": "2026-11-23", "Calendar Month": "November", "Fiscal Month": "P08", "Fiscal Year": "FY26", "Weeks In Month": 4}
        ])
        return pd.concat([base, extra], ignore_index=True)
    elif "2026-10-29" in filename:
        base = SampleDataGenerator.get_week_to_month_data()
        return base.iloc[:-1].copy()
    else:
        return SampleDataGenerator.get_week_to_month_data()

def generate_geography_mapping(version_idx: int, filename: str) -> pd.DataFrame:
    base = SampleDataGenerator.get_geog_mapping_data()
    if "updated" in filename.lower() or "q2" in filename.lower():
        return base.iloc[:13].copy()
    elif "2026_v1" in filename.lower() or "v1" in filename.lower():
        return base.iloc[:9].copy()
    elif "2026-10-30" in filename:
        df = base.copy()
        extra = pd.DataFrame([
            {"Patch": "EE11 East Midlands North", "Region": "B", "Division": "Central"},
            {"Patch": "EE12 Lincoln Coast", "Region": "B", "Division": "Central"}
        ])
        return pd.concat([df, extra], ignore_index=True)
    elif "2026-10-29" in filename:
        return base.iloc[:15].copy()
    else:
        return base

def transform_dataframe_for_version(cat: str, filename: str, version_idx: int, df_base: pd.DataFrame) -> pd.DataFrame:
    """Takes a baseline DataFrame and creates a realistic, version-specific variant."""
    if cat == "baseline_assumptions":
        return generate_baseline_assumptions(version_idx, filename)
    if cat == "baseline_productivity":
        return generate_baseline_productivity(version_idx, filename)
    if cat == "week_to_month":
        return generate_week_to_month(version_idx, filename)
    if cat == "geography_mapping":
        return generate_geography_mapping(version_idx, filename)

    df = df_base.copy()
    seed = get_file_seed(cat, filename) + (version_idx * 1337)
    rng = random.Random(seed)

    # 1. Distinct Row Trimming per version_idx
    # Ensuring every version has a DIFFERENT row count
    initial_len = len(df)
    if initial_len >= 10:
        trim_schedule = [0, 2, 4, 1, 3, 5, 6, 7]
        drop_count = trim_schedule[version_idx % len(trim_schedule)]
        if drop_count > 0 and initial_len - drop_count >= 2:
            if version_idx % 2 == 1:
                df = df.iloc[:-drop_count].copy()
            else:
                df = df.iloc[drop_count:].copy()

    # 2. Unique scale factor per version
    version_scales = [1.00, 0.88, 1.15, 0.94, 1.07, 1.03, 1.11]
    scale = version_scales[version_idx % len(version_scales)]
    if "2026-10-30" in filename:
        scale = 1.09
    elif "2026-10-29" in filename:
        scale = 1.04

    for col in df.columns:
        col_lower = col.lower()
        if pd.api.types.is_numeric_dtype(df[col]):
            if "year" in col_lower or "code" in col_lower or "id" in col_lower or ("week" in col_lower and not ("hours" in col_lower)):
                continue
            
            if "ratio" in col_lower or "pct" in col_lower or "percentage" in col_lower or "factor" in col_lower:
                def mod_ratio(val):
                    if pd.isna(val): return val
                    new_val = val * scale
                    return round(min(0.99, max(0.05, new_val)), 3)
                df[col] = df[col].apply(mod_ratio)
            elif "hours" in col_lower or "headcount" in col_lower or "values" in col_lower or "contractors" in col_lower or "attendees" in col_lower or "fte" in col_lower:
                def mod_num(val):
                    if pd.isna(val): return val
                    jitter = 1.0 + rng.uniform(-0.04, 0.05)
                    new_val = val * scale * jitter
                    if isinstance(val, int) or float(val).is_integer():
                        return max(1, int(round(new_val)))
                    return max(0.1, round(new_val, 1 if "fte" in col_lower or "dur" in col_lower else 2))
                df[col] = df[col].apply(mod_num)
            elif "dur" in col_lower or "rate" in col_lower:
                def mod_rate(val):
                    if pd.isna(val): return val
                    return round(max(0.5, val * scale), 2)
                df[col] = df[col].apply(mod_rate)

        elif pd.api.types.is_string_dtype(df[col]) or pd.api.types.is_object_dtype(df[col]):
            if "status" in col_lower and len(df) > 5 and version_idx > 0:
                def mod_status(val):
                    if rng.random() < 0.15:
                        return "Leaver" if val == "Active" else ("Standby" if val == "Active" else "Active")
                    return val
                df[col] = df[col].apply(mod_status)
            elif "ramp" in col_lower and version_idx == 1:
                def mod_ramp(val):
                    if val == "20%": return "30%"
                    if val == "50%": return "60%"
                    return val
                df[col] = df[col].apply(mod_ramp)

    return df

def main():
    print("=" * 70)
    print("POPULATING DISTINCT VERSION DATA ACROSS ALL 21 INPUTS (STRICT PAIRWISE)")
    print("=" * 70)
    
    total_written = 0
    from data_manager import load_input_table_data, _generate_sample_df_for_category

    for cat, file_list in DEFAULT_INPUT_OPTIONS.items():
        folder = CATEGORY_FOLDER_MAP.get(cat, "capacity")
        target_dir = DATA_ROOT / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        
        base_df = _generate_sample_df_for_category(cat)
        print(f"\n[{cat.upper()}] Folder: '{folder}', Files: {len(file_list)}, Base shape: {base_df.shape}")
        
        for idx, filename in enumerate(file_list):
            transformed_df = transform_dataframe_for_version(cat, filename, idx, base_df)
            
            clean_name = filename if filename.endswith(".csv") else f"{filename}.csv"
            sanitized_name = clean_name.replace(":", "-")
            
            primary_path = target_dir / sanitized_name
            transformed_df.to_csv(primary_path, index=False)
            total_written += 1
            print(f"  -> Version {idx}: '{sanitized_name}' ({len(transformed_df)} rows, {len(transformed_df.columns)} cols)")

    print("\n" + "=" * 70)
    print(f"COMPLETED! Total files successfully written: {total_written}")
    print("=" * 70)

if __name__ == "__main__":
    main()
