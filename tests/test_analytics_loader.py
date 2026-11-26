"""Isolated analytics loader checks; never mutate operational files."""
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ['STORAGE_MODE'] = 'local'
os.environ['CAPACITY_PLANNING_ENV'] = 'local'

import pandas as pd
from engine.analytics_loader import frame_payload, load_source, load_analytics_bundle


class AnalyticsLoaderTests(unittest.TestCase):
    def test_hash_ignores_row_column_order_and_transport_metadata(self):
        a = pd.DataFrame([{'A': 1, 'B': 2}, {'A': 3, 'B': 4}])
        b = a.iloc[::-1][['B', 'A']].copy()
        b['file_version'] = 'another filename'
        self.assertEqual(frame_payload(a)['hash'], frame_payload(b)['hash'])

    def test_nulls_are_json_safe(self):
        result = frame_payload(pd.DataFrame({'Value': [float('nan'), 1]}))
        self.assertIsNone(result['rows'][0]['Value'])
        json.dumps(result, allow_nan=False)

    def test_missing_file_never_creates_seed(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch('engine.analytics_loader.EnvironmentConfig.get_data_dir', return_value=Path(temp)):
                with self.assertRaises(ValueError):
                    load_source('demand_input', 'missing')
            self.assertEqual(list(Path(temp).iterdir()), [])

    def test_exact_version_extension_and_windows_timestamp(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'demand').mkdir()
            (root / 'demand' / 'plan_2026-01-01 12-00-00.csv').write_text('Patch,Values\nNorth,3\n')
            with patch('engine.analytics_loader.EnvironmentConfig.get_data_dir', return_value=root):
                a = load_source('demand_input', 'plan_2026-01-01 12:00:00')
                b = load_source('demand_input', 'plan_2026-01-01 12:00:00.csv')
            self.assertEqual(a['hash'], b['hash'])
            self.assertEqual(a['rowCount'], 1)

    def test_paths_and_unknown_categories_rejected(self):
        for key, version in [('unknown', 'x'), ('demand_input', '../x'), ('demand_input', 'C:\\x'), ('demand_input', '')]:
            with self.assertRaises(ValueError):
                load_source(key, version)

    def test_cloud_failure_never_uses_local_file(self):
        with patch('engine.analytics_loader.EnvironmentConfig.get_storage_mode', return_value='databricks'):
            with self.assertRaises(RuntimeError):
                load_source('demand_input', 'any version')

    def test_bundle_reports_individual_missing_inputs(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch('engine.analytics_loader.EnvironmentConfig.get_data_dir', return_value=Path(temp)):
                result = load_analytics_bundle({'id': 'Test', 'inputs': {}})
        self.assertTrue(result['success'])
        self.assertEqual(len(result['sources']), 21)
        self.assertTrue(all(not v['success'] for v in result['sources'].values()))


if __name__ == '__main__':
    unittest.main()
