"""Tests for final scenario data, scenario log table, and Decision Studio / Scenario Diff integration."""

import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ["STORAGE_MODE"] = "local"
os.environ["CAPACITY_PLANNING_ENV"] = "local"

import pandas as pd

from data_manager import DEFAULT_INPUT_OPTIONS, SampleDataGenerator, ScenarioManager, get_calculation_module_data
from engine.scenario_data_engine import (
    CALC_KEY_INPUTS,
    DISTINCT_COMBINATIONS,
    FINAL_DATA_COLUMNS,
    FINAL_DATA_PATCHES,
    IMBALANCE_METRIC_COMBINATIONS,
    LOG_COL_TO_INPUT_KEY,
    PLAN_END_WEEK,
    PLAN_START_WEEK,
    SCENARIO_LOG_COLUMNS,
    SUBCALC_SPECS,
    ensure_default_scenarios_and_final_data,
    get_decision_studio_bundle,
    get_final_plan_path,
    get_scenario_diff_payload,
    load_final_scenario_data,
    load_subcalc_for_scenario,
)


class FinalScenarioDataTests(unittest.TestCase):
    def test_existing_final_plan_and_scenario_log_schemas(self):
        df_plan = load_final_scenario_data()
        df_log = pd.read_csv("data/es_shiny_scenario_log.csv", dtype=str).fillna("")
        df_geo = SampleDataGenerator.get_geog_mapping_data()

        self.assertEqual(list(df_plan.columns), FINAL_DATA_COLUMNS)
        self.assertIn("region", FINAL_DATA_COLUMNS)
        self.assertIn("area_code", FINAL_DATA_COLUMNS)
        self.assertTrue((df_plan["region"].astype(str).str.len() > 0).all())
        self.assertTrue((df_plan["area_code"].astype(str).str.len() > 0).all())
        self.assertEqual(set(df_plan["patch"].unique()), set(df_geo["Patch"].unique()))
        self.assertEqual(set(df_plan["region"].unique()), set(df_geo["Region"].unique()))
        self.assertEqual(set(df_plan["area_code"].unique()), set(df_geo["Area Code"].unique()))
        self.assertEqual(len(FINAL_DATA_PATCHES), len(df_geo))
        self.assertEqual(list(df_log.columns), SCENARIO_LOG_COLUMNS)
        self.assertEqual(set(df_plan["version"].unique()), {"LV NOV V.1 2026", "LV NOV V.2 2026", "GFF2 2026"})
        for ver in ("LV NOV V.1 2026", "LV NOV V.2 2026", "GFF2 2026"):
            ver_w = sorted(df_plan[(df_plan["version"] == ver) & (df_plan["period"] == "W")]["weekcomm"].unique())
            self.assertEqual(ver_w[0], PLAN_START_WEEK)
            self.assertEqual(ver_w[-1], PLAN_END_WEEK)
            self.assertEqual(len(ver_w), 61)
            ver_m = sorted(df_plan[(df_plan["version"] == ver) & (df_plan["period"] == "M")]["weekcomm"].unique())
            self.assertEqual(ver_m[0], "2026-11-01")
            self.assertEqual(ver_m[-1], "2027-12-01")
            self.assertEqual(len(ver_m), 14)
        self.assertEqual(set(df_plan["period"].unique()), {"W", "M"})

        w_weeks = sorted(df_plan[df_plan["period"] == "W"]["weekcomm"].unique())
        self.assertEqual(w_weeks[0], PLAN_START_WEEK)
        self.assertEqual(w_weeks[-1], PLAN_END_WEEK)
        self.assertEqual(len(w_weeks), 61)

        m_months = sorted(df_plan[df_plan["period"] == "M"]["weekcomm"].unique())
        self.assertEqual(m_months[0], "2026-11-01")
        self.assertEqual(m_months[-1], "2027-12-01")
        self.assertEqual(len(m_months), 14)

        combos = set(
            df_plan[["skill", "group", "metric", "level2", "flag"]]
            .itertuples(index=False, name=None)
        )
        self.assertEqual(combos, set(DISTINCT_COMBINATIONS))

        # Verify calc keys equal combinations of their constituent input keys
        for _, row in df_log.iterrows():
            for calc_col, comp_cols in CALC_KEY_INPUTS.items():
                expected = " | ".join(row[c] for c in comp_cols)
                self.assertEqual(row[calc_col], expected)

    def test_demand_workload_and_capacity_reconcile(self):
        df_plan = load_final_scenario_data()
        sample_w = df_plan[
            (df_plan["version"] == "LV NOV V.1 2026")
            & (df_plan["period"] == "W")
            & (df_plan["weekcomm"] == PLAN_START_WEEK)
            & (df_plan["patch"] == "EC81 Peterborough")
            & (df_plan["skill"] == "HEC")
        ]
        demand_sum = sample_w[sample_w["flag"] == "Demand Hours"]["value"].sum()
        workload_val = sample_w[sample_w["flag"] == "Workload Hours"]["value"].sum()
        self.assertAlmostEqual(demand_sum, workload_val, places=2)

        core = sample_w[(sample_w["flag"] == "Available Hours") & (sample_w["metric"] == "Core Hrs")]["value"].sum()
        overtime = sample_w[(sample_w["flag"] == "Available Hours") & (sample_w["metric"] == "Overtime")]["value"].sum()
        avail = sample_w[(sample_w["flag"] == "Available Hours") & (sample_w["metric"] == "Available Hrs")]["value"].sum()
        self.assertAlmostEqual(core + overtime, avail, places=2)

        overlays = sample_w[sample_w["flag"] == "Downtime Overlay Hours"]["value"].sum()
        productive = sample_w[(sample_w["flag"] == "Capacity Hours") & (sample_w["metric"] == "Productive hrs")]["value"].sum()
        self.assertAlmostEqual(avail - overlays, productive, places=2)

    def test_save_scenario_links_log_and_final_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            with patch("config.EnvironmentConfig.get_data_dir", return_value=tmp_path):
                ensure_default_scenarios_and_final_data(force_rebuild=True)
                sm = ScenarioManager()
                inputs = {k: v[-1] for k, v in DEFAULT_INPUT_OPTIONS.items()}
                new_id = sm.save_scenario("LV", "DEC", "9", "Unit test scenario", inputs)
                self.assertEqual(new_id, "LV DEC V.9 2026")

                df_log = pd.read_csv(tmp_path / "es_shiny_scenario_log.csv", dtype=str).fillna("")
                match = df_log[(df_log["key"] == "LV DEC V.9 2026") & (df_log["delete_flag"] == "N")]
                self.assertEqual(len(match), 1)
                self.assertEqual(match.iloc[0]["remarks"], "Unit test scenario")
                for log_col, inp_key in LOG_COL_TO_INPUT_KEY.items():
                    self.assertEqual(match.iloc[0][log_col], inputs[inp_key])

                ds_bundle = get_decision_studio_bundle("LV DEC V.9 2026")
                self.assertEqual(ds_bundle["mode"], "final_data")
                self.assertEqual(ds_bundle["finalData"]["version"], "LV DEC V.9 2026")
                expected_dec_patches = len(ds_bundle["geographyRows"])
                self.assertEqual(ds_bundle["finalData"]["rowCount"], expected_dec_patches * 125 * 75)
                self.assertGreater(len(ds_bundle["finalData"]["regions"]), 0)
                self.assertGreater(len(ds_bundle["finalData"]["areaCodes"]), 0)
                self.assertEqual(len(ds_bundle["finalData"]["rows"][0]), 7)

                diff = get_scenario_diff_payload("LV NOV V.1 2026", "LV DEC V.9 2026")
                self.assertTrue(diff["success"])
                self.assertEqual(diff["baselineData"]["rowCount"], len(FINAL_DATA_PATCHES) * 125 * 75)
                self.assertEqual(diff["comparisonData"]["rowCount"], expected_dec_patches * 125 * 75)

    def test_compressed_final_plan_is_loaded_when_csv_is_absent(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            sample = pd.DataFrame(
                [[
                    "Region", "AREA1", "Patch", "HEC", "Group", "Metric", "Level2",
                    "Flag", "W", PLAN_START_WEEK, 1.0, "Scenario", "2026-11-02",
                ]],
                columns=FINAL_DATA_COLUMNS,
            )
            compressed_path = tmp_path / "es_powerbi_model_checker_plan.csv.gz"
            sample.to_csv(compressed_path, index=False)
            with patch("config.EnvironmentConfig.get_data_dir", return_value=tmp_path):
                self.assertEqual(get_final_plan_path(), compressed_path)
                pd.testing.assert_frame_equal(load_final_scenario_data(), sample)

    def test_subcalculations_align_with_final_data_and_view_calculations(self):
        df_plan = load_final_scenario_data()
        df_log = pd.read_csv("data/es_shiny_scenario_log.csv", dtype=str).fillna("")
        scen = "LV NOV V.1 2026"
        log_row = df_log[df_log["key"] == scen].iloc[0].to_dict()

        # Verify all 6 sub-calculation tables exist with exact schema & active scenario keys
        for sub_k, spec in SUBCALC_SPECS.items():
            df_sub, resolved_id, calc_key, _ = load_subcalc_for_scenario(sub_k, scen)
            self.assertEqual(resolved_id, scen)
            self.assertEqual(calc_key, log_row[spec["log_col"]])
            self.assertEqual(list(df_sub.columns), spec["columns"])
            self.assertEqual(set(df_sub["key"].unique()), {calc_key})

            # Verify View Calculations loader returns data directly from this subcalc table
            view_res = get_calculation_module_data(sub_k, scenario_id=scen)
            self.assertTrue(view_res["success"])
            self.assertEqual(view_res["columns"], spec["columns"])
            self.assertEqual(view_res["calcKey"], calc_key)
            self.assertEqual(view_res["scenarioId"], scen)

        # Verify numerical alignment between the 6 sub-calc tables and final_data
        patch = "EC81 Peterborough"
        sk = "HEC"
        wk = PLAN_START_WEEK
        sub_plan = df_plan[
            (df_plan["version"] == scen)
            & (df_plan["period"] == "W")
            & (df_plan["weekcomm"] == wk)
            & (df_plan["patch"] == patch)
            & (df_plan["skill"] == sk)
        ]

        df_fte, _, _, _ = load_subcalc_for_scenario("fte", scen)
        df_avl, _, _, _ = load_subcalc_for_scenario("available_hours", scen)
        df_cap, _, _, _ = load_subcalc_for_scenario("capacity", scen)
        df_dem, _, _, _ = load_subcalc_for_scenario("demand", scen)
        df_wrk, _, _, _ = load_subcalc_for_scenario("workload", scen)
        df_imb, _, _, _ = load_subcalc_for_scenario("imbalance", scen)

        fte_sub_val = df_fte[(df_fte["patch"] == patch) & (df_fte["skill"] == sk) & (df_fte["weekcomm"] == wk)]["values"].iloc[0]
        fte_plan_val = sub_plan[sub_plan["flag"] == "FTE"]["value"].iloc[0]
        self.assertAlmostEqual(fte_sub_val, fte_plan_val, places=4)

        avl_sub_val = df_avl[(df_avl["patch"] == patch) & (df_avl["skill"] == sk) & (df_avl["weekcomm"] == wk)]["values"].iloc[0]
        avl_plan_val = sub_plan[(sub_plan["flag"] == "Available Hours") & (sub_plan["metric"] == "Available Hrs")]["value"].iloc[0]
        self.assertAlmostEqual(avl_sub_val, avl_plan_val, places=4)

        cap_sub_val = df_cap[(df_cap["patch"] == patch) & (df_cap["skill"] == sk) & (df_cap["weekcomm"] == wk)]["values"].iloc[0]
        cap_plan_val = sub_plan[(sub_plan["flag"] == "Capacity Hours") & (sub_plan["metric"] == "Productive hrs")]["value"].iloc[0]
        sp_plan_val = sub_plan[(sub_plan["flag"] == "Capacity Hours") & (sub_plan["metric"] == "SP")]["value"].iloc[0]
        self.assertAlmostEqual(cap_sub_val, cap_plan_val, places=4)

        dem_sub_sum = df_dem[(df_dem["patch"] == patch) & (df_dem["skill"] == sk) & (df_dem["weekcomm"] == wk)]["values"].sum()
        dem_plan_sum = sub_plan[sub_plan["flag"] == "Demand Hours"]["value"].sum()
        self.assertAlmostEqual(dem_sub_sum, dem_plan_sum, places=2)

        wrk_sub_val = df_wrk[(df_wrk["patch"] == patch) & (df_wrk["skill"] == sk) & (df_wrk["weekcomm"] == wk)]["values"].iloc[0]
        wrk_plan_val = sub_plan[sub_plan["flag"] == "Workload Hours"]["value"].iloc[0]
        self.assertAlmostEqual(wrk_sub_val, wrk_plan_val, places=4)
        self.assertAlmostEqual(wrk_sub_val, dem_sub_sum, places=2)

        # Verify all 8 imbalance metric combinations match Productive hrs, SP, Workload hrs
        imb_combos = set(df_imb[["skill", "metric", "type"]].itertuples(index=False, name=None))
        self.assertEqual(imb_combos, set(IMBALANCE_METRIC_COMBINATIONS))
        imb_cell = df_imb[(df_imb["patch"] == patch) & (df_imb["skill"] == sk) & (df_imb["weekcomm"] == wk)]
        imb_pre = imb_cell[imb_cell["metric"] == "imb_presp"]["values"].iloc[0]
        imb_post = imb_cell[imb_cell["metric"] == "imb_postsp"]["values"].iloc[0]
        dl_pre = imb_cell[(imb_cell["metric"] == "DL_FTE") & (imb_cell["type"] == "pre_sp")]["values"].iloc[0]
        dl_post = imb_cell[(imb_cell["metric"] == "DL_FTE") & (imb_cell["type"] == "post_sp")]["values"].iloc[0]
        self.assertAlmostEqual(imb_pre, cap_sub_val - wrk_sub_val, places=2)
        self.assertAlmostEqual(imb_post, (cap_sub_val + sp_plan_val) - wrk_sub_val, places=2)
        self.assertAlmostEqual(dl_pre, round(imb_pre / 37.5, 4), places=4)
        self.assertAlmostEqual(dl_post, round(imb_post / 37.5, 4), places=4)


if __name__ == "__main__":
    unittest.main()
