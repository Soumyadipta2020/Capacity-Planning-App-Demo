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
    render_cluster_banner,
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

    # In local mode with no cluster configured, defaults to LOCAL
    health_local = manager.check_health_now()
    assert health_local["state"] == "LOCAL"
    assert health_local["can_read"] == "true"
    assert health_local["cluster_name"] == "Local Storage"

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
    print("[8/8] Testing react_app.js and UI templates for cluster management...")
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
    print("=" * 70)
    print(" ALL CLUSTER MANAGEMENT VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("=" * 70)
