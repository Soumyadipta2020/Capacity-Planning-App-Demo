"""
Demand Tab UI
Implements National Demand Jobs Upload and Total Demand Hours View matching Images 6 and 7.
"""

from shiny import ui

def create_demand_tab():
    return ui.nav_panel(
        ui.span(ui.HTML("&#128200;"), " Demand"),
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            
            ui.navset_tab(
                # Sub-Tab 1: National Demand Jobs Upload
                ui.nav_panel(
                    "National Demand Jobs Upload",
                    ui.div(
                        {"class": "mt-3"},
                        
                        # Upload card
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Upload data for National Forecast"),
                            ui.p("Download the template file to view format", class_="text-muted mb-2"),
                            ui.div(
                                {"class": "mb-3"},
                                ui.download_button("btn_download_demand_tpl", "Download template", class_="btn-action-custom")
                            ),
                            ui.div(
                                {"class": "p-2 bg-light border rounded"},
                                ui.strong("Current file being used: "),
                                ui.span("es_shiny_es_mtp_demand2_input3_2026-02-04 08:10:23", class_="text-primary fw-bold")
                            )
                        ),
                        
                        # Uploaded data table
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Uploaded data"),
                            ui.output_data_frame("table_demand_jobs")
                        )
                    ),
                    value="subtab_demand_jobs_upload"
                ),
                
                # Sub-Tab 2: Total Demand Hours View
                ui.nav_panel(
                    "Total Demand Hours View",
                    ui.div(
                        {"class": "mt-3"},
                        
                        # Actions
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header mb-3"}, "Demand Hours"),
                            ui.div(
                                {"class": "d-flex justify-content-between align-items-center"},
                                ui.input_action_button("btn_calc_demand_hours", "Calculate", class_="btn-primary"),
                                ui.download_button("btn_download_demand_hours", "Download", class_="btn-action-custom")
                            )
                        ),
                        
                        # Data table
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Demand Hours"),
                            ui.output_data_frame("table_demand_hours")
                        )
                    ),
                    value="subtab_demand_hours_view"
                ),
                id="subnav_demand"
            )
        ),
        value="tab_demand"
    )

