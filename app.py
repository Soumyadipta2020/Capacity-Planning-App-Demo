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
    register_uploaded_file
)
from engine.data_engine import CapacityDataEngine
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
        ui.nav_control(ui.HTML(get_british_gas_logo_html())),
        title="Capacity Planning",
        id="main_navbar",
        header=ui.tags.head(
            ui.tags.style(CUSTOM_CSS),
            ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1")
        ),
        fillable=True
    )

if ui_mode == "classic":
    app_ui = create_classic_ui()
else:
    app_ui = create_modern_ui_page()

def server(input, output, session):
    sm = ScenarioManager()
    engine = CapacityDataEngine()

    # --- REACT JAVASCRIPT EVENT BRIDGE ---

    # Handle Scenario Save from React UI
    @reactive.effect
    @reactive.event(input.save_scenario_event)
    def _on_react_save():
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
        session.send_custom_message("update_scenario_data", {
            "scenarios": sm.get_all_scenarios(),
            "selectedScenarioId": new_id,
            "inputsState": inputs,
            "envInfo": engine.get_engine_status()
        })
        session.send_custom_message("show_toast", {
            "message": f"Scenario '{new_id}' saved successfully to backend!",
            "type": "success"
        })

    # Handle Scenario Load from React UI
    @reactive.effect
    @reactive.event(input.load_scenario_event)
    def _on_react_load():
        scenario_id = input.load_scenario_event()
        if not scenario_id:
            return
        
        scen = sm.get_scenario(scenario_id)
        if scen:
            session.send_custom_message("update_scenario_data", {
                "selectedScenarioId": scenario_id,
                "inputsState": scen.get("inputs", {}),
                "envInfo": engine.get_engine_status()
            })
            session.send_custom_message("show_toast", {
                "message": f"Loaded scenario: {scenario_id}",
                "type": "info"
            })

    # Handle Bulk File Upload & Ingestion from React UI
    @reactive.effect
    @reactive.event(input.bulk_upload_event)
    def _on_react_bulk_upload():
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
                
        session.send_custom_message("show_toast", {
            "message": f"Successfully registered {saved_count} validated file(s) in backend.",
            "type": "success"
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
    engine = CapacityDataEngine()
    status = engine.get_engine_status()
    
    print("=" * 70)
    print(" BRITISH GAS | FIELD CAPACITY PLANNING PLATFORM (REACT + PYSHINY)")
    print(f" UI Framework       : Modern React 18 + Tailwind CSS")
    print(f" Execution Engine   : {status['engine_type']}")
    print(f" Storage Target     : {status['storage_target']}")
    print(f" Calculation Mode   : {status['calculation_mode']}")
    print(f" Server Binding     : http://{host}:{port}")
    print("=" * 70)
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=not is_db,
        log_level="info"
    )
