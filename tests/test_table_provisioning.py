"""
Unit Test for Databricks Table Provisioning and Application Loading
Verifies the exact requirement:
"If the tables are not present in databricks, create them in databricks first, next load the app using them"
"""

import sys
import re
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import pandas as pd
from config import EnvironmentConfig
from engine.data_engine import CapacityDataEngine
from cluster_manager import RUNNING_STATE


def test_databricks_table_provisioning_and_loading():
    print("=" * 70)
    print("TESTING DATABRICKS TABLE PROVISIONING & APP LOADING WORKFLOW")
    print("=" * 70)

    engine = CapacityDataEngine.get_instance()
    EnvironmentConfig.set_stage_override("dev")

    # Mock cursor tracking table state in memory
    databricks_mock_db = set()
    executed_sql = []

    class MockDatabricksCursor:
        def __init__(self):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def execute(self, query: str):
            clean = " ".join(query.strip().split())
            executed_sql.append(clean)
            
            # Detect CREATE TABLE
            m_create = re.search(r"CREATE TABLE IF NOT EXISTS `([^`]+)`\.`([^`]+)`\.`([^`]+)`", clean, re.IGNORECASE)
            if m_create:
                tbl = m_create.group(3).lower()
                databricks_mock_db.add(tbl)

            # Detect DELETE
            m_del = re.search(r"DELETE FROM `([^`]+)`\.`([^`]+)`\.`([^`]+)`", clean, re.IGNORECASE)
            if m_del:
                pass

        def fetchall(self):
            last_sql = executed_sql[-1].upper() if executed_sql else ""
            if "SHOW TABLES" in last_sql:
                # Handle LIKE
                m_like = re.search(r"LIKE '([^']+)'", executed_sql[-1], re.IGNORECASE)
                if m_like:
                    target = m_like.group(1).lower()
                    if target in databricks_mock_db:
                        return [(target,)]
                    return []
                # SHOW TABLES without LIKE -> return all tables in databricks_mock_db
                return [(tbl,) for tbl in databricks_mock_db]
            if "SELECT" in last_sql:
                return [("1", "Sample", "baseline")]
            return []

        def fetchall_arrow(self):
            class ArrowWrapper:
                def __init__(self, df):
                    self._df = df
                def to_pandas(self):
                    return self._df

            last_sql = executed_sql[-1].upper() if executed_sql else ""
            if "SCENARIOS" in last_sql:
                return ArrowWrapper(pd.DataFrame([{
                    "id": "LV OCT V.0 2026-10-29 16:00:00",
                    "plan_type": "LV",
                    "month": "OCT",
                    "version": "0",
                    "remarks": "October Databricks Provisioned Plan",
                    "created_at": "2026-10-29 16:00:00",
                    "inputs": '{"actuals_input": "actuals_2026-07-01_final"}'
                }]))
            return ArrowWrapper(pd.DataFrame([{"Patch": "ED44", "Skill": "HEC", "Value": 100.0, "file_version": "v1"}]))

    mock_cur = MockDatabricksCursor()

    # Step 1: Simulate Databricks compute is RUNNING
    engine.cluster_manager.set_simulated_state(RUNNING_STATE, cluster_name="Field Capacity Spark Cluster")
    orig_get_cursor = engine.cluster_manager.get_cursor
    engine.cluster_manager.get_cursor = lambda: mock_cur
    engine._verified_tables.clear()

    try:
        # Initial state: Tables are NOT present in Databricks
        assert len(databricks_mock_db) == 0, "Initial mock DB must be empty"
        print("[1/4] Verified tables are initially NOT present in Databricks.")

        # Execute provisioning: "If the tables are not present in databricks, create them in databricks first"
        print("[2/4] Running ensure_all_tables(async_init=False) to create missing tables first...")
        result = engine.ensure_all_tables(async_init=False)

        assert result["status"] == "success"
        # All 22 tables (21 inputs + scenarios) must be created
        created_tables = result["created_tables"]
        assert len(created_tables) == 22, f"Expected 22 created tables, got {len(created_tables)}: {created_tables}"
        assert "es_shiny_scenarios" in created_tables
        assert "es_shiny_actuals_input" in created_tables
        assert "es_shiny_resource_plan" in created_tables
        assert "es_shiny_week_to_month" in created_tables

        # Verify SQL DDL and INSERT statements were executed
        create_stmts = [s for s in executed_sql if "CREATE TABLE IF NOT EXISTS" in s]
        insert_stmts = [s for s in executed_sql if "INSERT INTO" in s]
        assert len(create_stmts) == 22, f"Expected 22 CREATE TABLE statements, got {len(create_stmts)}"
        assert len(insert_stmts) >= 22, f"Expected at least 22 INSERT INTO statements, got {len(insert_stmts)}"
        print(f"  Successfully created {len(created_tables)} missing tables in Databricks.")

        # Step 2: Next, run again to verify idempotency (tables ARE now present)
        print("[3/4] Verifying idempotency: tables already present must be verified without recreation...")
        executed_sql.clear()
        res_second = engine.ensure_all_tables(async_init=False)
        assert res_second["status"] == "success"
        assert len(res_second["created_tables"]) == 0, "No tables should be recreated"
        assert len(res_second["existing_tables"]) == 22, "All 22 tables should be recognized as existing"
        print("  Idempotency verified: all tables recognized as already present.")

        # Step 3: "Next load the app using them"
        print("[4/4] Verifying that the app loads and queries data using these Databricks tables...")
        table_data = engine.load_input_table_data("actuals_input")
        assert table_data["success"] is True
        assert "Databricks Unity Catalog" in table_data["source"]
        assert table_data["format"] == "Delta Lake"
        assert len(table_data["rows"]) > 0

        scenarios = engine.load_scenarios()
        assert len(scenarios) > 0
        assert "LV OCT V.0 2026-10-29 16:00:00" in scenarios
        print("  Successfully verified app loads data directly from Databricks Unity Catalog Delta tables!")

    finally:
        engine.cluster_manager.get_cursor = orig_get_cursor
        engine.cluster_manager.set_simulated_state(None)
        EnvironmentConfig.set_stage_override("")

    print("=" * 70)
    print("ALL TABLE PROVISIONING & APP LOADING TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    test_databricks_table_provisioning_and_loading()
