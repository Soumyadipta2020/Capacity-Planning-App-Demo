"""
Main PyShiny Application Entry Point
British Gas Field Capacity Planning Platform
Supports Modern React 18 / Tailwind Frontend with PyShiny Backend.
Dual Engine: PySpark on Databricks Unity Catalog (Production) vs Pandas on VS Code (Development).
"""

import os
import sys
from pathlib import Path
from shiny import App, ui, reactive

from config import EnvironmentConfig
from data_manager import (
    DEFAULT_INPUT_OPTIONS,
    DEFAULT_REMARKS,
    ScenarioManager,
    SampleDataGenerator,
    register_uploaded_file,
    load_input_table_data,
    save_input_table_data,
    get_calculation_module_data,
    export_scenario_to_powerbi,
    get_powerbi_export_history
)
from engine.data_engine import CapacityDataEngine
from cluster_manager import register_cluster_handlers
from ui import (
    CUSTOM_CSS,
    get_british_gas_logo_html,
    get_env_badge_html,
    create_home_tab,
    create_scenario_comparison_tab,
    create_visuals_tab,
    create_dem_vs_cap_tab,
    create_demand_tab,
    create_capacity_panels,
    create_capacity_config_panels,
    create_demand_config_panels,
    create_config_tab,
    create_about_tab,
    create_modern_ui_page
)
from server_logic import register_server_handlers

WORKSPACE_DIR = Path(__file__).resolve().parent
STATIC_DIR = WORKSPACE_DIR / "static"

# Determine UI theme mode ('modern' for React 18 / Tailwind, 'classic' for PyShiny Bootstrap)
ui_mode = os.environ.get("CAPACITY_UI_MODE", "modern").lower()

def create_classic_ui():
    """Classic PyShiny navigation UI for fallback or side-by-side evaluation."""
    is_databricks = EnvironmentConfig.is_databricks()
    env_name = EnvironmentConfig.get_environment_name()
    
    return ui.page_navbar(
        create_home_tab(),
        create_scenario_comparison_tab(),
        create_visuals_tab(),
        create_dem_vs_cap_tab(),
        create_demand_tab(),
        create_capacity_panels(),
        create_capacity_config_panels(),
        create_demand_config_panels(),
        create_config_tab(),
        create_about_tab(),
        ui.nav_spacer(),
        ui.nav_control(ui.HTML(get_env_badge_html(env_name, is_databricks))),
        ui.nav_control(
            ui.input_action_button(
                "btn_logout_session",
                "Log Out",
                class_="btn-outline-secondary compact-btn",
                style="font-size: 0.78rem; padding: 3px 10px; margin-left: 6px; font-weight: 700;",
            )
        ),
        ui.nav_control(ui.HTML(get_british_gas_logo_html())),
        title="Capacity Planning",
        id="main_navbar",
        header=ui.TagList(
            ui.tags.head(
                ui.tags.style(CUSTOM_CSS),
                ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
                ui.tags.script("""
                    $(document).on('hidden.bs.modal hide.bs.modal', function () {
                        setTimeout(function() {
                            $('.modal-backdrop').remove();
                            $('#shiny-modal-wrapper').empty();
                            $('body').removeClass('modal-open').css({'overflow': '', 'padding-right': ''});
                        }, 50);
                    });

                    (function() {
                        var lastPingTime = Date.now();
                        var THROTTLE_MS = 30000;

                        function pingActivity() {
                            var now = Date.now();
                            if (now - lastPingTime >= THROTTLE_MS) {
                                lastPingTime = now;
                                if (window.Shiny && window.Shiny.setInputValue) {
                                    Shiny.setInputValue('user_activity_ping', now);
                                }
                            }
                        }

                        ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function(evt) {
                            window.addEventListener(evt, pingActivity, { passive: true });
                        });
                    })();
                """)
            ),
            ui.output_ui("cluster_banner")
        ),
        fillable=True
    )

if ui_mode == "classic":
    app_ui = create_classic_ui()
else:
    app_ui = create_modern_ui_page()

def server(input, output, session):
    engine = CapacityDataEngine.get_instance()
    sm = ScenarioManager()

    # Register Databricks compute lifecycle & cluster management handlers
    register_cluster_handlers(input, output, session, engine=engine)

    # Ensure Databricks Unity Catalog Delta tables exist before serving data
    if EnvironmentConfig.is_databricks() or EnvironmentConfig.get_storage_mode() == "databricks":
        engine.ensure_all_tables(async_init=False)

    # --- REACT JAVASCRIPT EVENT BRIDGE ---

    # Handle Scenario Save from React UI
    @reactive.effect
    @reactive.event(input.save_scenario_event)
    async def _on_react_save():
        data = input.save_scenario_event()
        if not data:
            return
        
        plan_type = data.get("plan_type", "LV")
        month = data.get("month", "OCT")
        version = data.get("version", "0")
        remarks = data.get("remarks", "")
        inputs = data.get("inputs", {})
        
        new_id = sm.save_scenario(plan_type, month, version, remarks, inputs)
        
        # Broadcast updated scenarios back to React
        await session.send_custom_message("update_scenario_data", {
            "scenarios": sm.get_all_scenarios(),
            "selectedScenarioId": new_id,
            "inputsState": inputs,
            "envInfo": engine.get_engine_status()
        })
        await session.send_custom_message("show_toast", {
            "message": f"Scenario '{new_id}' saved successfully to backend!",
            "type": "success"
        })

    # Handle Scenario Load from React UI
    @reactive.effect
    @reactive.event(input.load_scenario_event)
    async def _on_react_load():
        scenario_id = input.load_scenario_event()
        if not scenario_id:
            return
        
        scen = sm.get_scenario(scenario_id)
        if scen:
            await session.send_custom_message("update_scenario_data", {
                "selectedScenarioId": scenario_id,
                "inputsState": scen.get("inputs", {}),
                "envInfo": engine.get_engine_status()
            })
            await session.send_custom_message("show_toast", {
                "message": f"Loaded scenario: {scenario_id}",
                "type": "info"
            })

    # Handle Bulk File Upload & Ingestion from React UI
    @reactive.effect
    @reactive.event(input.bulk_upload_event)
    async def _on_react_bulk_upload():
        data = input.bulk_upload_event()
        if not data or not isinstance(data, dict):
            return
        
        files = data.get("files", [])
        saved_count = 0
        for f in files:
            f_name = f.get("name")
            f_type = f.get("type")
            f_remarks = f.get("remarks", "")
            f_content = f.get("content", None)
            if f_name and f_type:
                register_uploaded_file(f_type, f_name, f_remarks, f_content)
                saved_count += 1
                
        await session.send_custom_message("show_toast", {
            "message": f"Successfully registered {saved_count} validated file(s) in backend.",
            "type": "success"
        })

    # Handle Input File Table Data Request from React UI
    @reactive.effect
    @reactive.event(input.request_input_file_data)
    async def _on_request_input_file_data():
        req = input.request_input_file_data()
        if not req or not isinstance(req, dict):
            return
        
        input_key = req.get("inputKey", "")
        file_name = req.get("fileName", "")
        request_id = req.get("requestId", None)
        
        result = load_input_table_data(input_key, file_name)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_input_file_data", result)

    # Handle Input File Table Data Save from React UI
    @reactive.effect
    @reactive.event(input.save_input_file_data)
    async def _on_save_input_file_data():
        req = input.save_input_file_data()
        if not req or not isinstance(req, dict):
            return
        
        input_key = req.get("inputKey", "")
        file_name = req.get("fileName", "")
        rows = req.get("rows", [])
        columns = req.get("columns", [])
        request_id = req.get("requestId", None)
        
        result = save_input_table_data(input_key, file_name, rows, columns)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_save_input_file_data", result)
        if result.get("success"):
            await session.send_custom_message("show_toast", {
                "message": f"Saved changes to '{file_name}' ({len(rows)} rows)!",
                "type": "success"
            })
        else:
            await session.send_custom_message("show_toast", {
                "message": f"Failed saving '{file_name}': {result.get('error')}",
                "type": "warning"
            })

    # Handle Calculation Module Data Request from React UI
    @reactive.effect
    @reactive.event(input.request_calc_module_data)
    async def _on_request_calc_module_data():
        req = input.request_calc_module_data()
        if not req or not isinstance(req, dict):
            return
        
        module_key = req.get("moduleKey", "imbalance")
        request_id = req.get("requestId", None)
        
        result = get_calculation_module_data(module_key)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_calc_module_data", result)

    # Handle Scenario Export to Power BI (Private / Public with custom name of choice)
    @reactive.effect
    @reactive.event(input.export_powerbi_scenario)
    async def _on_export_powerbi_scenario():
        req = input.export_powerbi_scenario()
        if not req or not isinstance(req, dict):
            return
        
        scenario_id = req.get("scenarioId", "")
        export_target = req.get("exportTarget", "private") # "private" or "public"
        export_name = req.get("exportName", "")
        description = req.get("description", "")
        request_id = req.get("requestId", None)
        
        result = export_scenario_to_powerbi(scenario_id, export_target, export_name, description)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_export_powerbi", result)
        if result.get("success"):
            target_label = "Private Power BI" if export_target == "private" else "Public Power BI"
            await session.send_custom_message("show_toast", {
                "message": f"Successfully exported scenario to {target_label} as '{result.get('exportName')}'!",
                "type": "success"
            })
        else:
            await session.send_custom_message("show_toast", {
                "message": f"Failed exporting scenario to Power BI: {result.get('error')}",
                "type": "warning"
            })

    # Register standard PyShiny server handlers (calculators, downloads, classic views)
    register_server_handlers(input, output, session)

# Instantiate App with static assets path
app = App(app_ui, server, static_assets=STATIC_DIR)

if __name__ == "__main__":
    import uvicorn
    
    host = EnvironmentConfig.get_server_host()
    port = EnvironmentConfig.get_server_port()
    is_db = EnvironmentConfig.is_databricks()
    engine = CapacityDataEngine.get_instance()
    
    # -----------------------------------------------------------------------
    # STEP 1: Verify & create tables in Databricks first if not present
    # -----------------------------------------------------------------------
    print("=" * 70)
    print(" BRITISH GAS | FIELD CAPACITY PLANNING PLATFORM")
    print("=" * 70)
    print(" [STEP 1/2] Verifying Databricks Unity Catalog tables...")
    
    table_init_res = engine.ensure_all_tables(async_init=False, auto_start_compute=True)
    if table_init_res.get("status") == "success":
        newly_created = table_init_res.get("created_tables", [])
        if newly_created:
            print(f" [Databricks Unity Catalog] Created {len(newly_created)} missing table(s):")
            for tbl in newly_created:
                print(f"   + {table_init_res.get('schema')}.{tbl}")
        else:
            print(f" [Databricks Unity Catalog] All {table_init_res.get('count', 22)} tables are present and verified in {table_init_res.get('schema')}.")
    else:
        print(f" [Databricks Unity Catalog] {table_init_res.get('reason', 'Local storage active')}")
    
    # -----------------------------------------------------------------------
    # STEP 2: Next, load the app using them
    # -----------------------------------------------------------------------
    status = engine.get_engine_status()
    print("\n [STEP 2/2] Loading application using verified data tables...")
    print(f" UI Framework       : Modern React 18 + Tailwind CSS")
    print(f" Execution Engine   : {status['engine_type']}")
    print(f" Storage Target     : {status['storage_target']}")
    print(f" Calculation Mode   : {status['calculation_mode']}")
    print(f" Server Binding     : http://{host}:{port}")
    print("=" * 70 + "\n")
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=not is_db,
        log_level="info"
    )
