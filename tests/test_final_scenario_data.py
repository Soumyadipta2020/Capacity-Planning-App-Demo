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

from data_manager import DEFAULT_INPUT_OPTIONS, ScenarioManager
from engine.scenario_data_engine import (
    CALC_KEY_INPUTS,
    DISTINCT_COMBINATIONS,
    FINAL_DATA_COLUMNS,
    LOG_COL_TO_INPUT_KEY,
    PLAN_END_WEEK,
    PLAN_START_WEEK,
    SCENARIO_LOG_COLUMNS,
    ensure_default_scenarios_and_final_data,
    get_decision_studio_bundle,
    get_scenario_diff_payload,
)


class FinalScenarioDataTests(unittest.TestCase):
    def test_existing_final_plan_and_scenario_log_schemas(self):
        df_plan = pd.read_csv("data/es_powerbi_model_checker_plan.csv")
        df_log = pd.read_csv("data/es_shiny_scenario_log.csv", dtype=str).fillna("")

        self.assertEqual(list(df_plan.columns), FINAL_DATA_COLUMNS)
        self.assertIn("region", FINAL_DATA_COLUMNS)
        self.assertIn("area_code", FINAL_DATA_COLUMNS)
        self.assertTrue((df_plan["region"].astype(str).str.len() > 0).all())
        self.assertTrue((df_plan["area_code"].astype(str).str.len() > 0).all())
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
        df_plan = pd.read_csv("data/es_powerbi_model_checker_plan.csv")
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
                self.assertEqual(ds_bundle["finalData"]["rowCount"], 75000)
                self.assertGreater(len(ds_bundle["finalData"]["regions"]), 0)
                self.assertGreater(len(ds_bundle["finalData"]["areaCodes"]), 0)
                self.assertEqual(len(ds_bundle["finalData"]["rows"][0]), 7)

                diff = get_scenario_diff_payload("LV NOV V.1 2026", "LV DEC V.9 2026")
                self.assertTrue(diff["success"])
                self.assertEqual(diff["baselineData"]["rowCount"], 75000)
                self.assertEqual(diff["comparisonData"]["rowCount"], 75000)


if __name__ == "__main__":
    unittest.main()
