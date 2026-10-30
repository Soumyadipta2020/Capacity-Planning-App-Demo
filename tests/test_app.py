"""
Verification test script for app.py
Spins up the app using uvicorn in a separate thread, checks health endpoint, and terminates cleanly.
"""

import sys
from pathlib import Path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import time
import urllib.request
import threading
import uvicorn
from app import app
from config import EnvironmentConfig

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

print("Waiting for server to start on port 8001...")
time.sleep(3)

url = "http://127.0.0.1:8001"
try:
    with urllib.request.urlopen(url, timeout=10) as resp:
        status = resp.getcode()
        body = resp.read().decode('utf-8')
        print(f"Server responded with HTTP status: {status}")
        print(f"HTML output contains title 'Capacity Planning': {'Capacity Planning' in body}")
        print(f"HTML output contains 'ES Capacity App': {'ES Capacity App' in body}")
        print(f"HTML output contains 'react-root': {'react-root' in body}")
        print(f"HTML output references 'react_app.js': {'react_app.js' in body}")

    # Check that static asset react_app.js is served properly
    with urllib.request.urlopen("http://127.0.0.1:8001/react_app.js", timeout=10) as resp_js:
        print(f"react_app.js static asset response status: {resp_js.getcode()}")
        js_content = resp_js.read().decode('utf-8')
        print(f"react_app.js contains 'ModernCapacityApp': {'ModernCapacityApp' in js_content}")
        print(f"react_app.js contains 'BulkUploadSection': {'BulkUploadSection' in js_content}")
        print(f"react_app.js contains 'ValidationResultsModal': {'ValidationResultsModal' in js_content}")
        print(f"react_app.js contains 'SCHEMA_VALIDATION_RULES': {'SCHEMA_VALIDATION_RULES' in js_content}")
        print(f"react_app.js contains 'TEMPLATE_DEFINITIONS': {'TEMPLATE_DEFINITIONS' in js_content}")
        print(f"react_app.js contains 'DownloadTemplatesView': {'DownloadTemplatesView' in js_content}")
        print(f"react_app.js contains 'parseDateFromOption': {'parseDateFromOption' in js_content}")
        print(f"react_app.js contains 'handleCloseModal': {'handleCloseModal' in js_content}")
        assert 'BulkUploadSection' in js_content
        assert 'ValidationResultsModal' in js_content
        assert 'SCHEMA_VALIDATION_RULES' in js_content
        assert 'TEMPLATE_DEFINITIONS' in js_content
        assert 'DownloadTemplatesView' in js_content
        assert 'parseDateFromOption' in js_content
        assert 'handleCloseModal' in js_content
        assert 'isMLOption' in js_content
        assert 'handleToggleML' in js_content
        assert 'handleToggleAllML' in js_content

        # Test backend registration and sorting by datetimestamp
        from data_manager import register_uploaded_file, DEFAULT_INPUT_OPTIONS, DEFAULT_REMARKS, parse_date_from_option, CATEGORY_FOLDER_MAP
        test_file_name = "fte_transfer_q4_2026-10-30 18:00:00"
        register_uploaded_file("fte_transfer", test_file_name, "Test Q4 upload", "from,to,fte\nEast,West,10")
        assert test_file_name in DEFAULT_INPUT_OPTIONS["fte_transfer"]
        # Must be at index 0 because 2026-10-30 is newer than 2026-07-01
        assert DEFAULT_INPUT_OPTIONS["fte_transfer"][0] == test_file_name
        print(f"Verified latest timestamp option at top index 0: {DEFAULT_INPUT_OPTIONS['fte_transfer'][0]}")

        # Test uploading with extension (.csv) gets stripped from dropdown list
        register_uploaded_file("resource_plan", "Resource Plan Final V4_2026-11-01 09:30:00.csv", "Nov Plan")
        assert "Resource Plan Final V4_2026-11-01 09:30:00" in DEFAULT_INPUT_OPTIONS["resource_plan"]
        assert DEFAULT_INPUT_OPTIONS["resource_plan"][0] == "Resource Plan Final V4_2026-11-01 09:30:00"
        print(f"Verified extension stripped and option placed at top index 0: {DEFAULT_INPUT_OPTIONS['resource_plan'][0]}")

        # Verify actuals_input options do not contain .csv
        for opt in DEFAULT_INPUT_OPTIONS["actuals_input"]:
            assert not opt.endswith(".csv"), f"Option {opt} still has .csv extension"
        print("Verified all actuals_input options are clean without .csv extension!")

        # Verify ML forecast files exist across all 21 categories in DEFAULT_INPUT_OPTIONS and on disk
        for cat, folder in CATEGORY_FOLDER_MAP.items():
            ml_opt = f"ml_forecast_{cat}_2026-10-30 06:00:00"
            assert ml_opt in DEFAULT_INPUT_OPTIONS[cat], f"ML option missing for {cat}"
            assert ml_opt in DEFAULT_REMARKS, f"ML remark missing for {ml_opt}"
            # Check file on disk
            disk_file = Path("data") / folder / f"ml_forecast_{cat}_2026-10-30 06-00-00.csv"
            assert disk_file.exists(), f"Dummy ML disk file missing: {disk_file}"
        print("Verified ML forecast dummy files exist for all 21 categories in catalog and on disk!")

        # Verify Databricks Unity Catalog configuration and app.yaml specification
        from config import EnvironmentConfig
        import os

        # Verify app.yaml content (DATABRICKS_APP_NAME must NOT be defined in app.yaml)
        app_yaml_path = Path("app.yaml")
        assert app_yaml_path.exists(), "app.yaml file not found"
        app_yaml_content = app_yaml_path.read_text(encoding="utf-8")
        assert "es_shiny_actuals_input" in app_yaml_content, "es_shiny_actuals_input not in app.yaml"
        assert "DATABRICKS_APP_NAME" not in app_yaml_content, "DATABRICKS_APP_NAME should NOT be defined in app.yaml"
        assert "DATABRICKS_CATALOG" in app_yaml_content, "DATABRICKS_CATALOG not in app.yaml"
        print("Verified DATABRICKS_APP_NAME is NOT in app.yaml, and DATABRICKS_CATALOG + table names are in app.yaml!")

        # Verify default fallback when DATABRICKS_APP_NAME is not set in environment
        if "DATABRICKS_APP_NAME" in os.environ:
            del os.environ["DATABRICKS_APP_NAME"]
        EnvironmentConfig.set_stage_override("")
        assert EnvironmentConfig.get_app_name() == "Not available"
        assert EnvironmentConfig.get_stage() == "dev"
        assert EnvironmentConfig.get_schema() == "dev"
        print("Verified fallback when DATABRICKS_APP_NAME is unset: 'Not available' -> stage 'dev', schema 'dev'!")

        # Verify Table Names follow es_shiny_<input_key>
        assert EnvironmentConfig.get_table_name("actuals_input") == "es_shiny_actuals_input"
        assert EnvironmentConfig.get_table_name("resource_plan") == "es_shiny_resource_plan"
        assert EnvironmentConfig.get_table_name("demand_input") == "es_shiny_demand_input"
        assert EnvironmentConfig.get_catalog() == "capacity_planning"

        # Verify Stage & Schema resolution based on deployment environment app name
        # 1. DEV
        os.environ["DATABRICKS_APP_NAME"] = "capacity-planning-app-dev"
        assert EnvironmentConfig.get_app_name() == "capacity-planning-app-dev"
        assert EnvironmentConfig.get_stage() == "dev"
        assert EnvironmentConfig.get_schema() == "dev"
        assert EnvironmentConfig.get_full_table_path("actuals_input") == "capacity_planning.dev.es_shiny_actuals_input"

        # 2. UAT
        os.environ["DATABRICKS_APP_NAME"] = "capacity-planning-app-uat"
        assert EnvironmentConfig.get_app_name() == "capacity-planning-app-uat"
        assert EnvironmentConfig.get_stage() == "uat"
        assert EnvironmentConfig.get_schema() == "uat"
        assert EnvironmentConfig.get_full_table_path("actuals_input") == "capacity_planning.uat.es_shiny_actuals_input"

        # 3. PROD
        os.environ["DATABRICKS_APP_NAME"] = "capacity-planning-app-prod"
        assert EnvironmentConfig.get_app_name() == "capacity-planning-app-prod"
        assert EnvironmentConfig.get_stage() == "prod"
        assert EnvironmentConfig.get_schema() == "prod"
        assert EnvironmentConfig.get_full_table_path("actuals_input") == "capacity_planning.prod.es_shiny_actuals_input"
        print("Verified stage & schema dynamically resolve to dev/uat/prod based on deployment app name!")

        # Reset back to default
        os.environ["DATABRICKS_APP_NAME"] = "capacity-planning-app-dev"

        print("ALL MODERN REACT + PYSHINY VERIFICATION CHECKS PASSED!")
except Exception as e:
    print(f"Verification test failed: {e}")
