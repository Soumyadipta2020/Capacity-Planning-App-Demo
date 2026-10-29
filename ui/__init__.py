"""
UI package initialization.
"""

from ui.styles import CUSTOM_CSS, get_british_gas_logo_html, get_env_badge_html
from ui.home_tab import create_home_tab
from ui.scenario_comparison_tab import create_scenario_comparison_tab
from ui.visuals_tab import create_visuals_tab
from ui.dem_vs_cap_tab import create_dem_vs_cap_tab
from ui.demand_tab import create_demand_tab
from ui.capacity_tab import create_capacity_panels
from ui.capacity_config_tab import create_capacity_config_panels
from ui.demand_config_tab import create_demand_config_panels
from ui.config_tab import create_config_tab
from ui.about_tab import create_about_tab

__all__ = [
    "CUSTOM_CSS",
    "get_british_gas_logo_html",
    "get_env_badge_html",
    "create_home_tab",
    "create_scenario_comparison_tab",
    "create_visuals_tab",
    "create_dem_vs_cap_tab",
    "create_demand_tab",
    "create_capacity_panels",
    "create_capacity_config_panels",
    "create_demand_config_panels",
    "create_config_tab",
    "create_about_tab"
]

