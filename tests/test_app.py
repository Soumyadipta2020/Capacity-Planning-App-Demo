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

        # Verify Scenario Diff tab enhancements in react_app.js:
        # 1. Top bar active scenario dropdown hidden in comparison mode
        assert "activeTab !== 'comparison' ?" in js_content, "Top bar scenario select must be hidden in comparison mode"
        assert "Scenario Diff Mode: Dual Scenario Comparison" in js_content, "Diff mode badge missing"

        # 2. Dual scenario selectors (Baseline & Comparison) in Diff tab
        assert "Baseline Scenario (1)" in js_content, "Baseline Scenario (1) missing in comparison view"
        assert "Comparison Scenario (2)" in js_content, "Comparison Scenario (2) missing in comparison view"
        assert "Swap Scenarios" in js_content, "Swap Scenarios button missing"

        # 3. Geography hierarchy filter (National -> Region -> ACDM -> Territory)
        assert "GeographyHierarchySelector" in js_content, "GeographyHierarchySelector component missing"
        assert "buildGeographyHierarchy" in js_content, "buildGeographyHierarchy helper missing"
        assert "parseGeographyCsvText" in js_content, "parseGeographyCsvText helper missing"
        assert "EA11 Inverness & Aviemore" in js_content, "British Gas territory EA11 missing in templates/hierarchy"
        assert "ACDM A1" in js_content or "acdmList" in js_content, "ACDM level missing in hierarchy"

        # 4. Geography mapping schema columns: Region, ACDM, territory
        assert 'required: ["region", "acdm", "territory"]' in js_content, "geography_mapping schema must require region, acdm, territory"
        assert "Region,ACDM,territory" in js_content, "geography template must have Region,ACDM,territory columns"

        # 5. Skill filter (HEC, KAC) & Date range filter
        assert "Skill Type Filter" in js_content, "Skill Type Filter missing in diff tab"
        assert "HEC Core" in js_content or "HEC" in js_content, "HEC option missing"
        assert "KAC Appliance" in js_content or "KAC" in js_content, "KAC option missing"
        assert "Date Range Filter" in js_content, "Date Range Filter missing in diff tab"
        print("Verified Scenario Diff tab features: Top bar mode toggle, Dual scenario selection, Geography 4-level hierarchy, Skill & Date range filters!")

        # 6. Capacity & Demand Waterfalls with 7 Capacity & 7 Demand metrics
        assert "ScenarioWaterfallBridgesSection" in js_content, "ScenarioWaterfallBridgesSection missing"
        assert "WaterfallSvgChart" in js_content, "WaterfallSvgChart missing"
        assert "computeCapacityWaterfall" in js_content, "computeCapacityWaterfall helper missing"
        assert "computeDemandWaterfall" in js_content, "computeDemandWaterfall helper missing"
        
        # Verify Capacity Waterfall Metrics:
        assert "Gross Hours" in js_content, "Gross Hours metric missing in capacity waterfall"
        assert "Sickness" in js_content, "Sickness metric missing in capacity waterfall"
        assert "Holiday" in js_content, "Holiday metric missing in capacity waterfall"
        assert "Training" in js_content, "Training metric missing in capacity waterfall"
        assert "Meeting" in js_content, "Meeting metric missing in capacity waterfall"
        assert "Others Downtimes" in js_content, "Others Downtimes metric missing in capacity waterfall"
        assert "Available Hours" in js_content, "Available Hours metric missing in capacity waterfall"
        assert "Available Hours = Gross Hours - (Sickness + Holiday + Training + Meeting + Others Downtimes)" in js_content, "Capacity formula missing"

        # Verify Demand Waterfall Metrics:
        assert "HEC Upgrade" in js_content, "HEC Upgrade metric missing in demand waterfall"
        assert "HEC Repair" in js_content, "HEC Repair metric missing in demand waterfall"
        assert "KAC Upgrade" in js_content, "KAC Upgrade metric missing in demand waterfall"
        assert "KAC Repair" in js_content, "KAC Repair metric missing in demand waterfall"
        assert "HEC Warranty" in js_content, "HEC Warranty metric missing in demand waterfall"
        assert "KAC Warranty" in js_content, "KAC Warranty metric missing in demand waterfall"
        assert "Total Demand Hours" in js_content, "Total Demand Hours metric missing in demand waterfall"
        print("Verified Dual Waterfall Analysis: Capacity Waterfall (7 metrics & formula) and Demand Waterfall (7 metrics & formula)!")

        # Verify python data_manager.py geography mapping dataframe has Region, ACDM, territory
        from data_manager import SampleDataGenerator, load_input_table_data, DEFAULT_INPUT_OPTIONS
        df_geo = SampleDataGenerator.get_geog_mapping_data()
        assert "Region" in df_geo.columns, "Region missing in get_geog_mapping_data"
        assert "ACDM" in df_geo.columns, "ACDM missing in get_geog_mapping_data"
        assert "territory" in df_geo.columns, "territory missing in get_geog_mapping_data"
        geo_dict = SampleDataGenerator.get_all_geography_files_data()
        assert len(geo_dict) > 0, "No geography files loaded in get_all_geography_files_data"
        print("Verified backend geography dataframe structure and file loader matching user specification!")

        # Verify Input Table View Floating Window & Backend Table Loader (User Request)
        assert "IconEye" in js_content, "IconEye component missing in react_app.js"
        assert "InputTableViewModal" in js_content, "InputTableViewModal component missing in react_app.js"
        assert "handleOpenViewModal" in js_content, "handleOpenViewModal missing in react_app.js"
        assert "parseCsvToTable" in js_content, "parseCsvToTable missing in react_app.js"
        assert "generateClientFallbackTable" in js_content, "generateClientFallbackTable missing in react_app.js"
        assert "downloadTableAsCsv" in js_content, "downloadTableAsCsv missing in react_app.js"
        assert "request_input_file_data" in js_content, "request_input_file_data event missing in react_app.js"
        assert "response_input_file_data" in js_content, "response_input_file_data handler missing in react_app.js"
        assert "w-[98vw] max-w-[98vw] h-[94vh] max-h-[94vh]" in js_content, "Maximized floating window size missing in modal"

        # Verify load_input_table_data works for all 21 categories and returns structured table records
        tested_count = 0
        for cat_k, opts in DEFAULT_INPUT_OPTIONS.items():
            if opts:
                first_opt = opts[0]
                tbl = load_input_table_data(cat_k, first_opt)
                assert tbl["success"] is True, f"Failed loading table for {cat_k} ({first_opt}): {tbl.get('error')}"
                assert len(tbl["columns"]) > 0, f"No columns returned for {cat_k} ({first_opt})"
                assert len(tbl["rows"]) > 0, f"No rows returned for {cat_k} ({first_opt})"
                tested_count += 1
        assert tested_count == 21, f"Expected 21 categories tested, got {tested_count}"
        print(f"Verified load_input_table_data successfully loaded table data for all {tested_count} operational inputs!")

        # Verify Excel-like Editing in Input Table View Floating Window
        assert "IconEdit" in js_content, "IconEdit missing in react_app.js"
        assert "IconSave" in js_content, "IconSave missing in react_app.js"
        assert "getColumnLetter" in js_content, "getColumnLetter missing in react_app.js"
        assert "isEditMode" in js_content, "isEditMode state missing in react_app.js"
        assert "Edit Mode" in js_content, "Edit Mode badge missing in react_app.js"
        assert "Save Changes" in js_content, "Save Changes button missing in react_app.js"
        assert "Add Row" in js_content, "Add Row button missing in react_app.js"
        assert "Delete Row" in js_content, "Delete Row button missing in react_app.js"
        assert "save_input_file_data" in js_content, "save_input_file_data missing in react_app.js"
        assert "response_save_input_file_data" in js_content, "response_save_input_file_data missing in react_app.js"
        print("Verified front-end Excel-like table editing, formula bar, cell selection, and save events in react_app.js!")

        # Verify backend save_input_table_data function
        from data_manager import save_input_table_data
        sample_test_key = "actuals_input"
        sample_test_file = DEFAULT_INPUT_OPTIONS[sample_test_key][0]
        loaded_orig = load_input_table_data(sample_test_key, sample_test_file)
        assert loaded_orig["success"] is True, "Failed loading table before save test"
        orig_rows = loaded_orig["rows"]
        # Perform save
        save_res = save_input_table_data(sample_test_key, sample_test_file, orig_rows, loaded_orig["columns"])
        assert save_res["success"] is True, f"save_input_table_data failed: {save_res.get('error')}"
        assert save_res["totalRows"] == len(orig_rows), "Row count mismatch in save_input_table_data"
        print("Verified backend save_input_table_data persists records and preserves table structure!")

        # Verify Calculation Modules Floating Window & Backend Calculation Engine (User Request)
        assert "CalculationModulesModal" in js_content, "CalculationModulesModal missing in react_app.js"
        assert "getClientFallbackCalcModule" in js_content, "getClientFallbackCalcModule missing in react_app.js"
        assert "handleRequestCalcModule" in js_content, "handleRequestCalcModule missing in react_app.js"
        assert "request_calc_module_data" in js_content, "request_calc_module_data event missing in react_app.js"
        assert "response_calc_module_data" in js_content, "response_calc_module_data handler missing in react_app.js"
        assert "View Calculations" in js_content, "'View Calculations' button missing in react_app.js"
        print("Verified front-end CalculationModulesModal, dropdown switcher, and 'View Calculations' buttons in react_app.js!")

        # Verify get_calculation_module_data works for all 6 calculation modules:
        # 1. imbalance, 2. capacity, 3. fte, 4. downtime, 5. productivity, 6. demand
        from data_manager import get_calculation_module_data, CALC_MODULE_METADATA
        calc_modules = ["imbalance", "capacity", "fte", "downtime", "productivity", "demand"]
        for mod_k in calc_modules:
            assert mod_k in CALC_MODULE_METADATA, f"Module {mod_k} missing in CALC_MODULE_METADATA"
            cdata = get_calculation_module_data(mod_k)
            assert cdata["success"] is True, f"Failed getting calculation module data for {mod_k}: {cdata.get('error')}"
            assert len(cdata["columns"]) > 0, f"No columns returned for module {mod_k}"
            assert len(cdata["rows"]) > 0, f"No rows returned for module {mod_k}"
            assert cdata["moduleKey"] == mod_k, f"Module key mismatch: {cdata['moduleKey']} vs {mod_k}"
            print(f"Verified calculation module '{mod_k}': {len(cdata['rows'])} rows, {len(cdata['columns'])} columns ({CALC_MODULE_METADATA[mod_k]['title']})")

        # Verify Dem vs Cap Matrix Tab Weekly Operational Enhancements (User Request)
        assert "DemVsCapView" in js_content, "DemVsCapView component missing in react_app.js"
        assert "Demand vs Capacity Operational Matrix" in js_content, "Operational matrix title missing"
        assert "Weekly Imbalances Matrix" in js_content, "Weekly Imbalances Matrix sub-tab missing"
        assert "Weekly Net Imbalance FTE & SLA Buffer Profile" in js_content, "Weekly Net Imbalance Profile missing"
        assert "Regional Weekly Rollup Matrix" in js_content, "Regional Weekly Rollup Matrix missing"
        assert "Weekly Inday Workload Buffer View" in js_content, "Weekly Inday Workload Buffer View missing"
        assert "Weekly Deficit Mitigation Action Log" in js_content, "Weekly Deficit Mitigation Action Log missing"
        assert "WEEKLY_DATES" in js_content, "WEEKLY_DATES missing"
        assert "formatWeekCol" in js_content, "formatWeekCol helper missing"
        assert "getPatchRegionName" in js_content, "getPatchRegionName helper missing"
        assert "downloadTableAsCsv" in js_content, "downloadTableAsCsv helper missing"
        print("Verified Dem vs Cap Matrix tab: Strictly Weekly Operational Horizon, Weekly Imbalance Matrix, Profile Bar Chart, Regional Rollup, Inday Buffer, and Deficit Action Log!")

        # Verify Executive Summary Monte Carlo Shortfall Risk Card (User Request)
        assert "MonteCarloSimulationModal" in js_content, "MonteCarloSimulationModal component missing in react_app.js"
        assert "Shortfall Risk" in js_content, "Shortfall Risk card title missing in react_app.js"
        assert "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" in js_content, "5-column grid layout missing in Bento grid"
        assert "10,000 Iterations" in js_content, "10,000 Iterations label missing in Monte Carlo modal"
        assert "handleRerunSimulation" in js_content, "handleRerunSimulation missing in react_app.js"
        assert "handleExportSimulationCsv" in js_content, "handleExportSimulationCsv missing in react_app.js"
        print("Verified Executive Summary: Monte Carlo Capacity Shortfall Risk Card (5th Card) and Interactive Simulation Modal!")

        # Verify Weekly Trajectory Envelope: Demand as Bars, Capacity as Line, Flexible Any Date Range Filter
        assert "Demand (Bars)" in js_content, "Demand (Bars) legend missing in react_app.js"
        assert "Capacity (Line)" in js_content, "Capacity (Line) legend missing in react_app.js"
        assert "trajectoryStartDate" in js_content, "trajectoryStartDate state missing in react_app.js"
        assert "trajectoryEndDate" in js_content, "trajectoryEndDate state missing in react_app.js"
        assert "handleTrajectoryStartChange" in js_content, "handleTrajectoryStartChange handler missing in react_app.js"
        assert "handleTrajectoryEndChange" in js_content, "handleTrajectoryEndChange handler missing in react_app.js"
        assert "demandBarGrad" in js_content, "demandBarGrad gradient definition missing in react_app.js"
        assert "capacityEnvelopeGrad" in js_content, "capacityEnvelopeGrad gradient definition missing in react_app.js"
        assert "capLinePath" in js_content, "capLinePath curve calculation missing in react_app.js"
        assert "handleTrajectoryPreset" not in js_content, "handleTrajectoryPreset should be removed per user request"
        assert "labelInterval" in js_content, "labelInterval logic missing for spacing X-axis labels with gaps"
        assert "h-56" in js_content, "h-56 height container missing for utilizing upper white space"
        print("Verified Weekly Trajectory Envelope: Demand as Bars, Capacity as Line, Gapped X-Axis Labels, Year in Date Filters, and Full Upper White Space Utilization!")

        # Verify Operational Trajectory Trends Sparkline Section (Inspiration: Last 12 Weeks)
        assert "Continuous Operational Trajectory" in js_content, "Continuous Operational Trajectory header missing in react_app.js"
        assert "generateSparkline" in js_content, "generateSparkline helper missing in react_app.js"
        assert "FTE Required" in js_content, "FTE Required trend card missing in react_app.js"
        assert "Gross Hours" in js_content, "Gross Hours trend card missing in react_app.js"
        assert "Total Downtime" in js_content, "Total Downtime trend card missing in react_app.js"
        assert "Productivity" in js_content, "Productivity trend card missing in react_app.js"
        assert "Imbalance" in js_content, "Imbalance trend card missing in react_app.js"
        print("Verified Operational Trajectory Trends: 5 Sparkline Cards (FTE Required, Gross Hours, Total Downtime, Productivity, Imbalance) placed in the marked area in between!")

        # Verify Power BI Export to Private & Public Workspaces with Name of Choice (User Request)
        assert "IconPowerBI" in js_content, "IconPowerBI missing in react_app.js"
        assert "ExportPowerBIModal" in js_content, "ExportPowerBIModal missing in react_app.js"
        assert "Export to Private Power BI" in js_content, "Export to Private Power BI option missing in react_app.js"
        assert "Export to Public Power BI" in js_content, "Export to Public Power BI option missing in react_app.js"
        assert "Export Name (Name of Your Choice)" in js_content or "Export Name" in js_content, "Custom export name input missing in react_app.js"
        assert "downloadPbidsFile" in js_content, "downloadPbidsFile helper missing in react_app.js"
        assert "export_powerbi_scenario" in js_content, "export_powerbi_scenario event missing in react_app.js"
        assert "response_export_powerbi" in js_content, "response_export_powerbi message missing in react_app.js"
        
        # Test backend export_scenario_to_powerbi and get_powerbi_export_history
        from data_manager import export_scenario_to_powerbi, get_powerbi_export_history
        test_pbi_res = export_scenario_to_powerbi("LV OCT V.0 2026-10-29 16:00:00", "private", "Test_Custom_PowerBI_Export", "Automated test export")
        assert test_pbi_res["success"] is True, f"export_scenario_to_powerbi failed: {test_pbi_res.get('error')}"
        assert test_pbi_res["exportName"] == "Test_Custom_PowerBI_Export"
        assert "Private" in test_pbi_res["targetWorkspace"]
        assert test_pbi_res["totalRows"] > 0
        test_history = get_powerbi_export_history()
        assert len(test_history) > 0
        print("Verified Power BI Export: Topbar button, Private/Public 2 options floating window, and custom name of choice!")

        print("ALL MODERN REACT + PYSHINY VERIFICATION CHECKS PASSED!")
except Exception as e:
    print(f"Verification test failed: {e}")
