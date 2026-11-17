"""Contract tests for operational hours: no guessed or generated production data."""
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
import pandas as pd
from planning_service import demo_dataset, normalize_frames, selected_dataset


class PlanningSourceTests(unittest.TestCase):
    def setUp(self):
        self.row = dict(region="North", area="N1", patch="Newcastle", skill="HEC", week="2026-11-16")
        self.demand = pd.DataFrame([{**self.row, "demandHours": 100}])
        self.supply = pd.DataFrame([{**self.row, "capacityHours": 80}])

    def test_normalized_hours_and_aliases(self):
        rows = normalize_frames(self.demand.rename(columns={"area": "ACDM", "week": "Weekcomm"}), self.supply)
        self.assertEqual(rows[0]["capacity"], 80)
        self.assertEqual(rows[0]["demand"], 100)

    def test_duplicate_keys_rejected(self):
        with self.assertRaisesRegex(ValueError, "duplicate"):
            normalize_frames(pd.concat([self.demand, self.demand]), self.supply)

    def test_unmatched_week_not_zero_filled(self):
        self.supply["week"] = "2026-11-23"
        with self.assertRaisesRegex(ValueError, "unmatched"):
            normalize_frames(self.demand, self.supply)

    def test_invalid_hours(self):
        for value in (-1, float("inf"), "not hours", None):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "finite"):
                normalize_frames(self.demand.assign(demandHours=value), self.supply)

    def test_non_monday_rejected(self):
        with self.assertRaisesRegex(ValueError, "Monday"):
            normalize_frames(self.demand.assign(week="2026-11-17"), self.supply)

    def test_raw_roster_is_not_productive_hours(self):
        with self.assertRaisesRegex(ValueError, "approved transformation"):
            normalize_frames(self.demand, pd.DataFrame([{"Pay Id": "synthetic", "Hours": 37.5}]))

    def test_source_package_keeps_both_hashes(self):
        with patch("planning_service._read_source", side_effect=[
            (self.demand, {"category":"demand_input", "file":"demand-v1", "sha256":"a"*64}),
            (self.supply, {"category":"resource_plan", "file":"supply-v1", "sha256":"b"*64})]):
            result = selected_dataset({"demand_input":"demand-v1","resource_plan":"supply-v1"})
        self.assertEqual(result["mode"], "selected")
        self.assertEqual(len(result["snapshot"]), 64)
        self.assertEqual(len(result["sources"]), 2)

    def test_demo_is_deterministic_and_explicit(self):
        first, second = demo_dataset(), demo_dataset()
        self.assertEqual(first, second)
        self.assertEqual(first["mode"], "demo")
        self.assertEqual(len(first["rows"]), 96)

    def test_missing_source_never_generates_file(self):
        with self.assertRaisesRegex(ValueError, "missing"):
            selected_dataset({"demand_input":"capacity-desk-deliberately-absent"})

    def test_path_escape_rejected(self):
        with self.assertRaisesRegex(ValueError, "valid file"):
            selected_dataset({"demand_input":"../outside.csv"})

    def test_upload_persist_restore_and_real_file_adapter(self):
        import data_manager as dm
        old_options = {k:list(v) for k,v in dm.DEFAULT_INPUT_OPTIONS.items()}
        old_remarks = dict(dm.DEFAULT_REMARKS)
        combined = self.demand.merge(self.supply, on=list(self.row)).to_csv(index=False)
        try:
            with tempfile.TemporaryDirectory() as folder, patch.object(dm.EnvironmentConfig, "get_data_dir", return_value=Path(folder)):
                self.assertTrue(dm.register_uploaded_file("demand_input", "test-hours.csv", "Demand test", combined))
                self.assertTrue(dm.register_uploaded_file("resource_plan", "test-hours.csv", "Supply test", combined))
                result = selected_dataset({"demand_input":"test-hours", "resource_plan":"test-hours"})
                self.assertEqual(result["rows"][0]["capacity"], 80)
                self.assertTrue(all(len(s["sha256"]) == 64 for s in result["sources"]))
                dm.DEFAULT_INPUT_OPTIONS["demand_input"].remove("test-hours")
                dm._restore_uploaded_catalog()
                self.assertIn("test-hours", dm.DEFAULT_INPUT_OPTIONS["demand_input"])
                self.assertFalse(dm.register_uploaded_file("demand_input", "../outside.csv", "", combined))
                preview = dm.load_input_table_data("demand_input", "does-not-exist", allow_generated=False)
                self.assertFalse(preview["success"])
                self.assertFalse((Path(folder)/"demand"/"does-not-exist.csv").exists())
        finally:
            dm.DEFAULT_INPUT_OPTIONS.clear(); dm.DEFAULT_INPUT_OPTIONS.update(old_options)
            dm.DEFAULT_REMARKS.clear(); dm.DEFAULT_REMARKS.update(old_remarks)


if __name__ == "__main__":
    unittest.main()
