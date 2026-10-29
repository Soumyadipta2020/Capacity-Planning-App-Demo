"""
Scenario Comparison Tab UI
Allows side-by-side comparison of two scenarios across Demand, Capacity, and Tabular metrics.
"""

from shiny import ui
from shinywidgets import output_widget
from data_manager import ScenarioManager

def create_scenario_comparison_tab():
    sm = ScenarioManager()
    scenario_choices = sm.get_scenario_names()
    default_scen_1 = scenario_choices[0] if scenario_choices else "LV JUL V.1 2026-07-07 12:46:46"
    default_scen_2 = scenario_choices[1] if len(scenario_choices) > 1 else default_scen_1

    return ui.nav_panel(
        ui.span(ui.HTML("&#9878;"), " Scenario Comparison"),
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            
            # --- CARD: SCENARIO COMPARISON FILTERS ---
            ui.div(
                {"class": "card-metric-container"},
                ui.div(
                    {"class": "section-banner-header"},
                    ui.span("Scenario Comparison")
                ),
                
                # Filters
                ui.div(
                    {"class": "row g-3 mb-3"},
                    ui.div(
                        {"class": "col-md-12"},
                        ui.input_select(
                            "cmp_view_type",
                            "Select Type to view:",
                            choices=["National", "Regional - North", "Regional - South", "Regional - Midlands", "Regional - Scotland", "Patch Level"],
                            selected="National",
                            width="100%"
                        )
                    ),
                    ui.div(
                        {"class": "col-md-12"},
                        ui.input_select(
                            "cmp_fte_type",
                            "Select FTE Type to view:",
                            choices=["HEC", "KAC", "EV", "All Skills"],
                            selected="HEC",
                            width="100%"
                        )
                    ),
                    ui.div(
                        {"class": "col-md-6"},
                        ui.input_date_range(
                            "cmp_week_commencing",
                            "Select Week commencing:",
                            start="2026-10-26",
                            end="2027-10-26",
                            width="100%"
                        )
                    )
                ),
                
                # Side-by-Side Scenario Selectors
                ui.div(
                    {"class": "row g-4 p-3 bg-light rounded border mb-3"},
                    ui.div(
                        {"class": "col-md-6 border-end"},
                        ui.h5("Scenario 1", class_="fw-bold text-primary"),
                        ui.input_select(
                            "cmp_scenario_1",
                            "Choose Baseline Scenario:",
                            choices=scenario_choices,
                            selected=default_scen_1,
                            width="100%"
                        ),
                        ui.output_ui("ui_cmp_remarks_1")
                    ),
                    ui.div(
                        {"class": "col-md-6"},
                        ui.h5("Scenario 2", class_="fw-bold text-success"),
                        ui.input_select(
                            "cmp_scenario_2",
                            "Choose Comparison Scenario:",
                            choices=scenario_choices,
                            selected=default_scen_2,
                            width="100%"
                        ),
                        ui.output_ui("ui_cmp_remarks_2")
                    )
                )
            ),
            
            # --- COLLAPSIBLE VISUALIZATIONS & TABLE ---
            ui.accordion(
                ui.accordion_panel(
                    "Demand Plot",
                    ui.div(
                        {"class": "p-2"},
                        output_widget("plot_cmp_demand")
                    )
                ),
                ui.accordion_panel(
                    "Capacity Plot",
                    ui.div(
                        {"class": "p-2"},
                        output_widget("plot_cmp_capacity")
                    )
                ),
                ui.accordion_panel(
                    "Tabular Comparison",
                    ui.div(
                        {"class": "p-2"},
                        ui.output_data_frame("table_cmp_tabular")
                    )
                ),
                id="acc_scenario_comparison",
                open=["Demand Plot", "Tabular Comparison"]
            )
        ),
        value="tab_scenario_comparison"
    )

