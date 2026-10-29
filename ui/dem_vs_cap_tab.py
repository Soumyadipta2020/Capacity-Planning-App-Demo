"""
Dem vs Cap Tab UI
Implements Imbalances View and Inday Workload View matching Images 4 and 5.
"""

from shiny import ui

def create_dem_vs_cap_tab():
    return ui.nav_panel(
        ui.span(ui.HTML("&#9881;"), " Dem vs Cap"),
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            
            ui.navset_tab(
                # Sub-Tab 1: Imbalances
                ui.nav_panel(
                    "Imbalances",
                    ui.div(
                        {"class": "mt-3"},
                        
                        # Fields Action Ribbon
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header mb-3"}, "Fields"),
                            ui.div(
                                {"class": "d-flex justify-content-between align-items-center"},
                                ui.div(
                                    {"class": "d-flex gap-2 align-items-center"},
                                    ui.input_action_button("btn_calc_imbalances", "Calculate", class_="btn-primary"),
                                    ui.output_ui("ui_imbalance_calc_status")
                                ),
                                ui.download_button("btn_download_imbalances", "Download", class_="btn-action-custom")
                            )
                        ),
                        
                        # Imbalance View Table
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Imbalance View"),
                            ui.output_data_frame("table_imbalances")
                        )
                    ),
                    value="subtab_imbalances"
                ),
                
                # Sub-Tab 2: Inday Workload
                ui.nav_panel(
                    "Inday Workload",
                    ui.div(
                        {"class": "mt-3"},
                        
                        # Fields Action Ribbon
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header mb-3"}, "Fields"),
                            ui.div(
                                {"class": "d-flex justify-content-between align-items-center"},
                                ui.div(
                                    {"class": "d-flex gap-2 align-items-center"},
                                    ui.input_action_button("btn_calc_inday", "Calculate", class_="btn-primary"),
                                    ui.output_ui("ui_inday_calc_status")
                                ),
                                ui.download_button("btn_download_inday", "Download", class_="btn-action-custom")
                            )
                        ),
                        
                        # Inday Workload Table
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Inday Workload"),
                            ui.output_data_frame("table_inday_workload")
                        )
                    ),
                    value="subtab_inday_workload"
                ),
                id="subnav_dem_vs_cap"
            )
        ),
        value="tab_dem_vs_cap"
    )

