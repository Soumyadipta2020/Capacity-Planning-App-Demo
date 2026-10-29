"""
Main PyShiny Application Entry Point
British Gas Field Capacity Planning Application
Supports local execution (VS Code) and cloud deployment (Databricks Apps).
"""

import os
import sys
from shiny import App, ui

from config import EnvironmentConfig
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
    create_about_tab
)
from server_logic import register_server_handlers

# Determine initial environment indicator
is_databricks = EnvironmentConfig.is_databricks()
env_name = EnvironmentConfig.get_environment_name()

# Assemble App UI
app_ui = ui.page_navbar(
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
    
    # Right-aligned brand badge and British Gas logo
    ui.nav_spacer(),
    ui.nav_control(
        ui.HTML(get_env_badge_html(env_name, is_databricks))
    ),
    ui.nav_control(
        ui.HTML(get_british_gas_logo_html())
    ),
    
    title="Capacity Planning",
    id="main_navbar",
    header=ui.tags.head(
        ui.tags.style(CUSTOM_CSS),
        ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1")
    ),
    fillable=True
)

def server(input, output, session):
    register_server_handlers(input, output, session)

app = App(app_ui, server)

if __name__ == "__main__":
    import uvicorn
    
    host = EnvironmentConfig.get_server_host()
    port = EnvironmentConfig.get_server_port()
    is_db = EnvironmentConfig.is_databricks()
    env_display = EnvironmentConfig.get_environment_name()
    
    print("=" * 64)
    print(" BRITISH GAS - FIELD CAPACITY PLANNING APPLICATION")
    print(f" Active Environment : {env_display}")
    print(f" Server Binding     : http://{host}:{port}")
    print(f" Data Directory     : {EnvironmentConfig.get_data_dir()}")
    print("=" * 64)
    
    # In Databricks Apps, run on 0.0.0.0 without reload; in VS Code, run on 127.0.0.1 with reload
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=not is_db,
        log_level="info"
    )

