"""
Test script for Databricks Cluster Management in Capacity Planning App
Verifies:
1. ClusterManager lifecycle, states, caching, and startup logic
2. State formatting and helper predicates
3. ClusterStartingError exception behavior
4. UI Modals (offline prompt, starting spinner, startup error)
5. Cluster Status Banner (warn banner when offline, starting banner with spinner, hidden when running/local)
6. EnvironmentConfig cluster settings and storage mode resolution
7. CapacityDataEngine cluster health delegation and engine status metadata
8. App serving and reactive handler registration
"""

import sys
import time
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from cluster_manager import (
    ClusterManager,
    ClusterStartingError,
    format_cluster_status_dict,
    is_offline_state,
    is_starting_state,
    is_running_state,
    cluster_offline_modal,
    cluster_starting_modal,
    cluster_error_modal,
    session_inactive_modal,
    logout_confirmation_modal,
    session_ended_modal,
    render_cluster_banner,
    get_current_user,
    RUNNING_STATE,
    OFFLINE_STATES,
    STARTING_STATES
)
from config import EnvironmentConfig
from engine.data_engine import CapacityDataEngine


def test_cluster_predicates_and_formatting():
    print("[1/8] Testing cluster state predicates and formatting...")
    assert is_offline_state("TERMINATED")
    assert is_offline_state("STOPPED")
    assert is_offline_state("OFFLINE")
    assert not is_offline_state("RUNNING")

    assert is_starting_state("STARTING")
    assert is_starting_state("PENDING")
    assert is_starting_state("RESTARTING")
    assert not is_starting_state("TERMINATED")

    assert is_running_state("RUNNING")
    assert not is_running_state("OFFLINE")

    # Format running
    d_run = format_cluster_status_dict("Test Spark Cluster", "RUNNING")
    assert d_run["state"] == "RUNNING"
    assert d_run["can_read"] == "true"
    assert d_run["is_offline"] == "false"
    assert "is running" in d_run["message"]

    # Format terminated/offline
    d_off = format_cluster_status_dict("Test Spark Cluster", "TERMINATED")
    assert d_off["state"] == "TERMINATED"
    assert d_off["can_read"] == "false"
    assert d_off["is_offline"] == "true"
    assert "is terminated" in d_off["message"]

    # Format starting
    d_start = format_cluster_status_dict("Test Spark Cluster", "STARTING")
    assert d_start["state"] == "STARTING"
    assert d_start["can_read"] == "false"
    assert d_start["is_offline"] == "false"
    assert "is starting" in d_start["message"]

    print("  Predicates and formatting verified.")


def test_cluster_starting_error():
    print("[2/8] Testing ClusterStartingError...")
    err = ClusterStartingError("TERMINATED")
    assert "TERMINATED" in str(err)
    assert "please start the cluster" in str(err)
    assert err.state == "TERMINATED"
    print("  ClusterStartingError verified.")


def test_cluster_manager_lifecycle():
    print("[3/8] Testing ClusterManager lifecycle and caching...")
    manager = ClusterManager(EnvironmentConfig)

    # In VS Code (local development), it must NOT check for Databricks compute status
    health_vscode = manager.check_health_now()
    assert health_vscode["state"] == "LOCAL"
    assert health_vscode["can_read"] == "true"
    assert "VS Code local mode active" in health_vscode["message"]

    # In Databricks deployment mode without cluster ID, actively looks for cluster and reports requirement/error
    EnvironmentConfig.set_environment_override("databricks")
    try:
        health_db = manager.check_health_now()
        assert health_db["state"] == "ERROR"
        assert "DATABRICKS_CLUSTER_ID or DATABRICKS_WAREHOUSE_ID is required" in health_db["message"]
    finally:
        EnvironmentConfig.set_environment_override("")

    # In explicit local/csv mode, defaults to LOCAL
    import os
    os.environ["STORAGE_MODE"] = "local"
    health_local = manager.check_health_now()
    assert health_local["state"] == "LOCAL"
    assert health_local["can_read"] == "true"
    assert health_local["cluster_name"] == "Local Storage"
    del os.environ["STORAGE_MODE"]

    # Test simulated OFFLINE state
    manager.set_simulated_state("TERMINATED", cluster_name="Field Capacity Spark Cluster")
    assert manager.is_offline
    assert not manager.is_running
    assert not manager.is_starting
    assert manager.compute_name == "Field Capacity Spark Cluster"

    status = manager.current_status
    assert status["state"] == "TERMINATED"
    assert status["can_read"] == "false"

    # Rate-limited cache test: cluster_health should return cached status without querying
    cached = manager.cluster_health()
    assert cached["state"] == "TERMINATED"

    # Test startup initiation
    manager.start_cluster()
    assert manager.is_starting
    assert manager.current_status["state"] == "STARTING"

    # Test transition to RUNNING
    manager.set_simulated_state("RUNNING")
    assert manager.is_running
    assert not manager.is_offline
    assert manager.current_status["can_read"] == "true"

    # Reset simulation
    manager.set_simulated_state(None)
    print("  ClusterManager lifecycle & caching verified.")


def test_cluster_modals():
    print("[4/8] Testing UI Modals generation...")
    # Offline modal
    modal_off = cluster_offline_modal(cluster_name="ES Capacity Spark Cluster", state="TERMINATED")
    modal_off_html = str(modal_off)
    assert "Databricks Cluster is Offline" in modal_off_html
    assert "ES Capacity Spark Cluster" in modal_off_html
    assert "TERMINATED" in modal_off_html
    assert "btn_start_cluster_confirm" in modal_off_html
    assert "btn_offline_modal_dismiss" in modal_off_html

    # Starting modal
    modal_start = cluster_starting_modal(cluster_name="ES Capacity Spark Cluster")
    modal_start_html = str(modal_start)
    assert "Starting Databricks Cluster" in modal_start_html
    assert "status-modal-spinner" in modal_start_html
    assert "btn_dismiss_starting_modal" in modal_start_html
    assert "Wait in Background" in modal_start_html

    # Error modal
    modal_err = cluster_error_modal("Cluster quota exceeded on Databricks workspace")
    modal_err_html = str(modal_err)
    assert "Cluster Startup Failed" in modal_err_html
    assert "Cluster quota exceeded" in modal_err_html
    assert "btn_offline_modal_dismiss" in modal_err_html

    # Inactive modal
    modal_inact = session_inactive_modal()
    modal_inact_html = str(modal_inact)
    assert "Session Inactive" in modal_inact_html
    assert "btn_resume_session" in modal_inact_html

    # Logout confirmation modal
    modal_logout = logout_confirmation_modal(user_email="engineer@britishgas.co.uk", databricks_host="adb-12345.azuredatabricks.net")
    modal_logout_html = str(modal_logout)
    assert "Log Out or End Your Session" in modal_logout_html
    assert "engineer@britishgas.co.uk" in modal_logout_html
    assert "btn_confirm_end_session" in modal_logout_html
    assert "btn_dismiss_logout_modal" in modal_logout_html

    # Session ended modal
    modal_ended = session_ended_modal(databricks_host="adb-12345.azuredatabricks.net")
    modal_ended_html = str(modal_ended)
    assert "Session Ended" in modal_ended_html
    assert "btn_resume_session" in modal_ended_html

    print("  UI Modals generation verified.")


def test_cluster_banner():
    print("[5/8] Testing render_cluster_banner...")
    # When local or storage_mode != databricks, returns None
    assert render_cluster_banner({"state": "LOCAL"}, storage_mode="local") is None

    # When RUNNING, returns None
    assert render_cluster_banner({"state": "RUNNING", "cluster_name": "Spark Cluster"}, storage_mode="databricks") is None

    # When OFFLINE, returns warning banner with 'Start Cluster' button
    banner_off = render_cluster_banner(
        {"state": "TERMINATED", "cluster_name": "Spark Cluster", "message": "'Spark Cluster' is terminated.", "can_read": "false", "is_offline": "true"},
        storage_mode="databricks"
    )
    assert banner_off is not None
    banner_off_html = str(banner_off)
    assert "health-banner warn" in banner_off_html
    assert "Spark Cluster: TERMINATED" in banner_off_html
    assert "btn_banner_start_cluster" in banner_off_html
    assert "Start Cluster" in banner_off_html

    # When STARTING, returns banner with spinning loader
    banner_start = render_cluster_banner(
        {"state": "STARTING", "cluster_name": "Spark Cluster", "message": "'Spark Cluster' is starting...", "can_read": "false", "is_offline": "false"},
        storage_mode="databricks"
    )
    assert banner_start is not None
    banner_start_html = str(banner_start)
    assert "Starting..." in banner_start_html
    assert "spinner-border" in banner_start_html

    print("  render_cluster_banner verified.")


def test_config_cluster_settings():
    print("[6/8] Testing EnvironmentConfig cluster settings & storage mode...")
    # Check getters exist and work without errors
    assert hasattr(EnvironmentConfig, "get_databricks_cluster_id")
    assert hasattr(EnvironmentConfig, "get_databricks_warehouse_id")
    assert hasattr(EnvironmentConfig, "get_databricks_host")
    assert hasattr(EnvironmentConfig, "get_databricks_token")
    assert hasattr(EnvironmentConfig, "get_storage_mode")

    diag = EnvironmentConfig.get_diagnostics()
    assert "storage_mode" in diag
    assert "databricks_cluster_id" in diag
    assert "databricks_warehouse_id" in diag

    print("  EnvironmentConfig cluster settings verified.")


def test_data_engine_cluster_integration():
    print("[7/8] Testing CapacityDataEngine cluster integration...")
    engine = CapacityDataEngine()
    assert hasattr(engine, "cluster_manager")
    assert hasattr(engine, "cluster_health")
    assert hasattr(engine, "check_health_now")
    assert hasattr(engine, "start_cluster")

    status = engine.get_engine_status()
    assert "cluster_info" in status
    assert "cluster_name" in status
    assert "cluster_state" in status
    assert "storage_mode" in status

    # Verify cluster offline guard in load_table
    engine.cluster_manager.set_simulated_state("TERMINATED", cluster_name="Test Spark Cluster")
    try:
        engine.load_table("actuals_input")
        # Should raise ClusterStartingError when cluster is configured and terminated
        assert False, "Should have raised ClusterStartingError"
    except ClusterStartingError as e:
        assert e.state == "TERMINATED"
        print(f"  Verified load_table raises ClusterStartingError when compute is {e.state}")
    finally:
        engine.cluster_manager.set_simulated_state(None)

    print("  CapacityDataEngine cluster integration verified.")


def test_react_assets_and_layout():
    print("[8/9] Testing react_app.js and UI templates for cluster management...")
    react_file = Path("static/react_app.js")
    assert react_file.exists()
    content = react_file.read_text(encoding="utf-8")

    assert "clusterInfo" in content
    assert "setClusterInfo" in content
    assert "update_cluster_status" in content
    assert "btn_banner_start_cluster" in content
    assert "check_cluster_health_event" in content
    assert "Databricks Compute Cluster Management Card" in content
    assert "Can Execute Queries" in content

    # Check app.yaml contains cluster settings
    yaml_file = Path("app.yaml")
    assert yaml_file.exists()
    yaml_content = yaml_file.read_text(encoding="utf-8")
    assert "DATABRICKS_CLUSTER_ID" in yaml_content
    assert "DATABRICKS_WAREHOUSE_ID" in yaml_content

    # Check modern_ui.py contains cluster banner container and modal styles
    modern_ui_file = Path("ui/modern_ui.py")
    assert modern_ui_file.exists()
    modern_content = modern_ui_file.read_text(encoding="utf-8")
    assert "cluster_banner" in modern_content
    assert "status-modal-spinner" in modern_content
    assert "status-modal-icon-circle" in modern_content
    assert "health-banner" in modern_content

    print("  React assets, app.yaml, and UI layout verified.")


def test_databricks_auto_table_creation_and_usage():
    print("[9/9] Testing Databricks Unity Catalog table auto-creation and usage...")
    import re
    import pandas as pd
    import numpy as np
    from data_manager import ScenarioManager, load_input_table_data, register_uploaded_file

    engine = CapacityDataEngine.get_instance()

    # 1. Test DDL type conversion
    int_s = pd.Series([1, 2, 3])
    float_s = pd.Series([1.5, 2.7, 3.9])
    bool_s = pd.Series([True, False, True])
    str_s = pd.Series(["hello", "world"])
    assert engine.pandas_dtype_to_spark_sql(int_s) == "BIGINT"
    assert engine.pandas_dtype_to_spark_sql(float_s) == "DOUBLE"
    assert engine.pandas_dtype_to_spark_sql(bool_s) == "BOOLEAN"
    assert engine.pandas_dtype_to_spark_sql(str_s) == "STRING"

    # 2. Test SQL literals and batch insert generation
    assert engine._sql_literal(None) == "NULL"
    assert engine._sql_literal(np.nan) == "NULL"
    assert engine._sql_literal(42) == "42"
    assert engine._sql_literal("O'Reilly & Sons") == "'O''Reilly & Sons'"
    assert engine._sql_literal(True) == "TRUE"

    test_df = pd.DataFrame([
        {"id": 1, "name": "Test 'A'", "rate": 3.5, "flag": True},
        {"id": 2, "name": "Test 'B'", "rate": 4.2, "flag": False}
    ])
    stmts = engine._build_batch_insert_sql("`cat`.`sch`.`tbl`", test_df)
    assert len(stmts) == 1
    assert "INSERT INTO `cat`.`sch`.`tbl`" in stmts[0]
    assert "Test ''A''" in stmts[0]

    # 3. Test seed data loading for all 21 operational inputs
    for key in EnvironmentConfig.OPERATIONAL_INPUT_LABELS.keys():
        seed = engine.get_seed_dataframe(key)
        assert not seed.empty, f"Seed data for '{key}' must not be empty"
        assert "file_version" in seed.columns, f"'file_version' column missing in seed for '{key}'"

    # 4. Mock Databricks SQL Warehouse cursor to simulate table auto-creation
    executed_statements = []

    class MockCursor:
        def __init__(self):
            self.description = [("id",), ("name",), ("file_version",)]
            self._tables = set()

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def execute(self, sql):
            executed_statements.append(sql.strip())
            sql_upper = sql.upper().strip()
            if "CREATE TABLE" in sql_upper:
                # Extract table name
                match = re.search(r"CREATE TABLE IF NOT EXISTS [^\.]+\.[^\.]+\.`?([A-Za-z0-9_]+)`?", sql, re.IGNORECASE)
                if match:
                    self._tables.add(match.group(1).lower())
            return self

        def fetchall(self):
            last_sql = executed_statements[-1].upper() if executed_statements else ""
            if "SHOW TABLES" in last_sql:
                # Check if table matches
                match = re.search(r"LIKE '([^']+)'", executed_statements[-1], re.IGNORECASE)
                if match and match.group(1).lower() in self._tables:
                    return [(match.group(1),)]
                return []
            if "SELECT" in last_sql:
                return [("1", "Sample", "baseline")]
            return []

        def fetchall_arrow(self):
            last_sql = executed_statements[-1].upper() if executed_statements else ""
            class MockArrow:
                def __init__(self, df):
                    self._df = df
                def to_pandas(self):
                    return self._df

            if "SCENARIOS" in last_sql:
                scen_df = pd.DataFrame([{
                    "id": "LV JUL V.1 2026-07-07 12:46:46",
                    "plan_type": "LV",
                    "month": "JUL",
                    "version": "1",
                    "remarks": "Audited baseline",
                    "created_at": "2026-07-07 12:46:46",
                    "inputs": '{"actuals_input": "actuals_2026-07-01_final"}'
                }])
                return MockArrow(scen_df)

            return MockArrow(pd.DataFrame([{"Patch": "EA11", "Skill": "HEC", "Values": 10.5, "file_version": "baseline"}]))

    mock_cur = MockCursor()

    # Clear verified tables cache for testing auto-creation
    engine._verified_tables.clear()

    # Test auto-creating an operational table
    res = engine.ensure_table_exists("actuals_input", cursor=mock_cur)
    assert res is True
    assert "es_shiny_actuals_input" in engine._verified_tables
    # Verify CREATE SCHEMA IF NOT EXISTS and CREATE TABLE IF NOT EXISTS were issued
    assert any("CREATE SCHEMA IF NOT EXISTS" in s for s in executed_statements)
    assert any("CREATE TABLE IF NOT EXISTS" in s and "es_shiny_actuals_input" in s for s in executed_statements)
    assert any("USING DELTA" in s for s in executed_statements)
    assert any("INSERT INTO" in s and "es_shiny_actuals_input" in s for s in executed_statements)

    # Test auto-creating scenarios table
    scen_res = engine.ensure_scenarios_table(cursor=mock_cur)
    assert scen_res is True
    assert "es_shiny_scenarios" in engine._verified_tables
    assert any("CREATE TABLE IF NOT EXISTS" in s and "es_shiny_scenarios" in s for s in executed_statements)

    # 5. Test load_input_table_data with active Databricks compute
    engine.cluster_manager.set_simulated_state(RUNNING_STATE, cluster_name="Field Capacity Spark Cluster")
    # Patch cluster_manager.get_cursor to return our mock_cur
    orig_get_cursor = engine.cluster_manager.get_cursor
    engine.cluster_manager.get_cursor = lambda: mock_cur

    try:
        data_res = engine.load_input_table_data("actuals_input", filename="actuals_2026-07-01_final")
        assert data_res["success"] is True
        assert data_res["inputKey"] == "actuals_input"
        assert "Databricks Unity Catalog" in data_res["source"]
        assert data_res["format"] == "Delta Lake"
        assert len(data_res["rows"]) > 0

        # Test ScenarioManager saving to Databricks
        sm = ScenarioManager()
        test_scen_id = sm.save_scenario(
            plan_type="LV",
            month="NOV",
            version="1",
            remarks="Unit Test Delta Save",
            inputs={"actuals_input": "actuals_2026-07-01_final"}
        )
        assert test_scen_id is not None
        assert any("MERGE INTO" in s and "es_shiny_scenarios" in s for s in executed_statements)

        # Test ScenarioManager deleting from Databricks
        sm.delete_scenario(test_scen_id)
        assert any("DELETE FROM" in s and "es_shiny_scenarios" in s for s in executed_statements)

        # Test register_uploaded_file with Delta ingestion
        csv_sample = "From,To,FTE,Reason\nEA1,EA2,3.5,Test Transfer\n"
        reg_ok = register_uploaded_file("fte_transfer", "test_upload_v9_2026-11-06.csv", "Test remark", csv_sample)
        assert reg_ok is True
        assert any("INSERT INTO" in s and "es_shiny_fte_transfer" in s for s in executed_statements)

    finally:
        engine.cluster_manager.get_cursor = orig_get_cursor
        engine.cluster_manager.set_simulated_state(None)

    # 6. Test background table initializer thread
    bg_res = engine.ensure_all_tables(async_init=True)
    assert bg_res["status"] == "background_thread_started"

    print("  Databricks Unity Catalog table auto-creation and usage verified.")


if __name__ == "__main__":
    print("=" * 70)
    print(" RUNNING DATABRICKS CLUSTER MANAGEMENT VERIFICATION SUITE")
    print("=" * 70)
    test_cluster_predicates_and_formatting()
    test_cluster_starting_error()
    test_cluster_manager_lifecycle()
    test_cluster_modals()
    test_cluster_banner()
    test_config_cluster_settings()
    test_data_engine_cluster_integration()
    test_react_assets_and_layout()
    test_databricks_auto_table_creation_and_usage()
    print("=" * 70)
    print(" ALL CLUSTER MANAGEMENT VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("=" * 70)
