"""
Home Tab UI
Implements Bulk Upload, Metrics configuration dropdowns with Delete/Undo/Remarks, and Scenario Management.
"""

from shiny import ui
from data_manager import DEFAULT_INPUT_OPTIONS, ScenarioManager

def make_input_widget(input_id: str, label: str, choices: list, selected: str = None):
    """
    Renders an input selection box containing:
    - Title / Label
    - Flex row with full-width dropdown, [Delete] button, and [Undo] button
    - Dynamic Remarks display directly underneath
    """
    return ui.div(
        {"class": "mb-3 p-2 bg-light border rounded"},
        ui.div(
            {"class": "mb-1", "style": "font-weight: 500; font-size: 0.9rem; color: #212529;"},
            label
        ),
        ui.div(
            {"class": "d-flex align-items-center gap-2 mb-1"},
            ui.div(
                {"style": "flex: 1; min-width: 0;"},
                ui.input_select(
                    input_id,
                    None,
                    choices=choices,
                    selected=selected or choices[0],
                    width="100%"
                )
            ),
            ui.input_action_button(
                f"btn_del_{input_id}",
                "Delete",
                class_="btn-danger-custom",
                style="height: 38px; line-height: 1; padding: 0 16px;"
            ),
            ui.input_action_button(
                f"btn_undo_{input_id}",
                "Undo",
                class_="btn-action-custom",
                style="height: 38px; line-height: 1; padding: 0 16px;"
            )
        ),
        ui.output_ui(f"ui_remarks_{input_id}")
    )


def create_home_tab():
    sm = ScenarioManager()
    scenario_choices = sm.get_scenario_names()
    
    return ui.nav_panel(
        ui.span(ui.HTML("&#127968;"), " Home"),
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            
            # --- CARD 1: BULK UPLOAD ---
            ui.div(
                {"class": "section-banner-header"},
                ui.span("Bulk Upload")
            ),
            ui.accordion(
                ui.accordion_panel(
                    "Upload files",
                    ui.div(
                        {"class": "p-2"},
                        ui.input_file(
                            "bulk_upload_files",
                            "Choose CSV / Excel files to upload:",
                            multiple=True,
                            button_label="Browse...",
                            placeholder="No file selected"
                        ),
                        ui.div(
                            {"class": "text-muted small mt-1"},
                            "Drop multiple input files (Actuals, Resource Plan, Overlays, Demand Forecast, Attrition) to auto-assign."
                        )
                    )
                ),
                ui.accordion_panel(
                    "File Assignment",
                    ui.div(
                        {"class": "p-2"},
                        ui.output_data_frame("table_file_assignment")
                    )
                ),
                ui.accordion_panel(
                    "File Validation Results",
                    ui.div(
                        {"class": "p-2"},
                        ui.output_ui("ui_file_validation_status")
                    )
                ),
                id="acc_bulk_upload",
                open=False
            ),
            
            ui.div({"style": "height: 18px;"}),
            
            # --- CARD 2: METRICS INPUT ACCORDIONS ---
            ui.div(
                {"class": "section-banner-header"},
                ui.span("Metrics")
            ),
            ui.accordion(
                # 1. Actuals Input
                ui.accordion_panel(
                    "Actuals Input",
                    ui.div(
                        {"class": "p-2"},
                        ui.div(
                            {"class": "row"},
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget(
                                    "actuals_input",
                                    "Actuals input:",
                                    DEFAULT_INPUT_OPTIONS["actuals_input"]
                                )
                            )
                        )
                    )
                ),
                
                # 2. Capacity Inputs
                ui.accordion_panel(
                    "Capacity Inputs",
                    ui.div(
                        {"class": "p-2"},
                        ui.div(
                            {"class": "row g-3"},
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("resource_plan", "Resource Plan:", DEFAULT_INPUT_OPTIONS["resource_plan"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("fte_transfer", "FTE transfer:", DEFAULT_INPUT_OPTIONS["fte_transfer"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("recruitment_grounded", "Recruitment grounded:", DEFAULT_INPUT_OPTIONS["recruitment_grounded"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("recruitment_ungrounded", "Recruitment ungrounded:", DEFAULT_INPUT_OPTIONS["recruitment_ungrounded"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("baseline_assumptions", "Baseline assumptions:", DEFAULT_INPUT_OPTIONS["baseline_assumptions"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("downtime_overlays_percentage", "Downtime Overlays Percentage:", DEFAULT_INPUT_OPTIONS["downtime_overlays_percentage"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("downtime_overlays_hours", "Downtime Overlays Hours:", DEFAULT_INPUT_OPTIONS["downtime_overlays_hours"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("downtime_overlays_hours_fte", "Downtime Overlays Hours/FTE:", DEFAULT_INPUT_OPTIONS["downtime_overlays_hours_fte"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("overtime", "Overtime:", DEFAULT_INPUT_OPTIONS["overtime"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("baseline_productivity", "Baseline productivity:", DEFAULT_INPUT_OPTIONS["baseline_productivity"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("training_snm", "Training SNM:", DEFAULT_INPUT_OPTIONS["training_snm"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("ctr_capacity", "CTR Capacity:", DEFAULT_INPUT_OPTIONS["ctr_capacity"])
                            )
                        )
                    )
                ),
                
                # 3. Capacity Configuration inputs
                ui.accordion_panel(
                    "Capacity Configuration inputs",
                    ui.div(
                        {"class": "p-2"},
                        ui.div(
                            {"class": "row g-3"},
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("attrition", "Attrition:", DEFAULT_INPUT_OPTIONS["attrition"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("recruitment_config", "Recruitment:", DEFAULT_INPUT_OPTIONS["recruitment_config"])
                            )
                        )
                    )
                ),
                
                # 4. Demand input
                ui.accordion_panel(
                    "Demand input",
                    ui.div(
                        {"class": "p-2"},
                        ui.div(
                            {"class": "row"},
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("demand_input", "Demand input:", DEFAULT_INPUT_OPTIONS["demand_input"])
                            )
                        )
                    )
                ),
                
                # 5. Demand configuration inputs
                ui.accordion_panel(
                    "Demand configuration inputs",
                    ui.div(
                        {"class": "p-2"},
                        ui.div(
                            {"class": "row g-3"},
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("job_time_assumptions", "Job time assumptions:", DEFAULT_INPUT_OPTIONS["job_time_assumptions"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("hec_on_kac_demand", "HEC on KAC Demand:", DEFAULT_INPUT_OPTIONS["hec_on_kac_demand"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("hec_on_ev_demand", "HEC on EV Demand:", DEFAULT_INPUT_OPTIONS["hec_on_ev_demand"])
                            )
                        )
                    )
                ),
                
                # 6. Other configuration inputs
                ui.accordion_panel(
                    "Other configuration inputs",
                    ui.div(
                        {"class": "p-2"},
                        ui.div(
                            {"class": "row g-3"},
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("geography_mapping", "Geography mapping:", DEFAULT_INPUT_OPTIONS["geography_mapping"])
                            ),
                            ui.div(
                                {"class": "col-lg-6 col-12"},
                                make_input_widget("week_to_month", "Week to month:", DEFAULT_INPUT_OPTIONS["week_to_month"])
                            )
                        )
                    )
                ),
                id="acc_metrics",
                open=["Capacity Inputs"]
            ),
            
            ui.div({"style": "height: 20px;"}),
            
            # --- CARD 3: SCENARIOS MANAGEMENT (Matching Image 2) ---
            ui.div(
                {"class": "card-metric-container"},
                ui.div(
                    {"class": "section-banner-header"},
                    ui.span("Scenarios")
                ),
                
                # Scenario Creation Controls
                ui.div(
                    {"class": "row g-3 align-items-end mb-4"},
                    ui.div(
                        {"class": "col-md-2"},
                        ui.input_select(
                            "scenario_plan_type",
                            "Plan Type",
                            choices=["LV", "HV", "Combined", "Mid-Term", "Short-Term"],
                            selected="LV",
                            width="100%"
                        )
                    ),
                    ui.div(
                        {"class": "col-md-2"},
                        ui.input_select(
                            "scenario_month",
                            "Month",
                            choices=["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
                            selected="OCT",
                            width="100%"
                        )
                    ),
                    ui.div(
                        {"class": "col-md-2"},
                        ui.input_numeric("scenario_version", "Version", value=0, min=0, width="100%")
                    ),
                    ui.div(
                        {"class": "col-md-4"},
                        ui.input_text("scenario_remarks", "Remarks", value="", placeholder="e.g. October baseline run", width="100%")
                    ),
                    ui.div(
                        {"class": "col-md-2"},
                        ui.input_action_button("btn_save_scenario", "Save Scenario", class_="btn-primary w-100")
                    )
                ),
                
                # Scenario Selection & Execution Controls
                ui.div(
                    {"class": "row g-3 align-items-end pt-2 border-top"},
                    ui.div(
                        {"class": "col-md-6"},
                        ui.input_select(
                            "scenario_select",
                            "Select Scenario",
                            choices=scenario_choices,
                            selected=scenario_choices[0] if scenario_choices else None,
                            width="100%"
                        )
                    ),
                    ui.div(
                        {"class": "col-md-6 d-flex gap-2 flex-wrap"},
                        ui.input_action_button("btn_load_scenario", "Load Scenario", class_="btn-primary"),
                        ui.download_button("btn_download_scenario", "Download", class_="btn-action-custom"),
                        ui.input_action_button("btn_delete_scenario", "Delete", class_="btn-danger-custom"),
                        ui.input_action_button("btn_undo_scenario", "Undo", class_="btn-action-custom")
                    )
                ),
                
                # Scenario Feedback Alert Banner
                ui.div(
                    {"class": "mt-3"},
                    ui.output_ui("ui_scenario_feedback")
                )
            )
        ),
        value="tab_home"
    )
