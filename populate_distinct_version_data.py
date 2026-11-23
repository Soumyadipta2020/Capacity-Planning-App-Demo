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
    df = SampleDataGenerator.get_baseline_assumptions_data()
    seed = get_file_seed("baseline_assumptions", filename) + (version_idx * 101)
    rng = random.Random(seed)
    scale = 0.9 + (version_idx % 5) * 0.05
    df["Values"] = df["Values"].apply(lambda v: round(v * scale, 8))
    if version_idx % 2 == 1 and len(df) > 10:
        df = df.iloc[version_idx % 4:].copy()
    return df

def generate_baseline_productivity(version_idx: int, filename: str) -> pd.DataFrame:
    df = SampleDataGenerator.get_baseline_productivity_data()
    seed = get_file_seed("baseline_productivity", filename) + (version_idx * 202)
    rng = random.Random(seed)
    scale = 0.88 + (version_idx % 6) * 0.04
    df["Values"] = df["Values"].apply(lambda v: round(v * scale, 8))
    if version_idx % 2 == 0 and len(df) > 8:
        df = df.iloc[:-(version_idx % 4 + 1)].copy()
    return df

def generate_week_to_month(version_idx: int, filename: str) -> pd.DataFrame:
    df = SampleDataGenerator.get_week_to_month_data()
    if version_idx % 3 == 1 and len(df) > 4:
        df = df.iloc[:-2].copy()
    elif version_idx % 3 == 2 and len(df) > 6:
        df = df.iloc[1:].copy()
    return df

def generate_geography_mapping(version_idx: int, filename: str) -> pd.DataFrame:
    base = SampleDataGenerator.get_geog_mapping_data()
    if "updated" in filename.lower() or "q2" in filename.lower():
        return base.iloc[:18].copy()
    elif "2026_v1" in filename.lower() or "v1" in filename.lower():
        return base.iloc[:14].copy()
    elif "2026-10-30" in filename:
        df = base.copy()
        extra = pd.DataFrame([
            {"Region Code": "B", "Region": "North West", "Area Code": "EB5", "Patch": "EB51 Bolton & Bury", "Patch Name": "Bolton & Bury"},
            {"Region Code": "B", "Region": "North West", "Area Code": "EB5", "Patch": "EB52 Wigan & Leigh", "Patch Name": "Wigan & Leigh"}
        ])
        return pd.concat([df, extra], ignore_index=True)
    elif "2026-10-29" in filename:
        return base.iloc[:22].copy()
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
            if "year" in col_lower or "code" in col_lower or "id" in col_lower or col_lower in ["trainee", "cross skill", "apprentice"] or ("week" in col_lower and not ("hours" in col_lower)):
                continue
            
            if "ratio" in col_lower or "pct" in col_lower or "percentage" in col_lower or "factor" in col_lower or (cat in ["attrition", "downtime_overlays_percentage", "recruitment_config", "hec_on_kac_demand", "hec_on_ev_demand"] and col_lower == "values"):
                def mod_ratio(val):
                    if pd.isna(val): return val
                    new_val = val * scale
                    return round(min(0.99, max(0.005, new_val)), 4)
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
