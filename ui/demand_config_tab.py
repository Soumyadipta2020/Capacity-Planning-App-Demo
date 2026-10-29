"""
Demand Configuration Tab UI
Implements Demand Configuration Dropdown Menu: Job Times Assumptions, HEC on KAC, and HEC on EV.
Matching Image 11.
"""

from shiny import ui

def create_demand_config_panels():
    panel_job_times = ui.nav_panel(
        "Job Times Assumptions",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.navset_tab(
                ui.nav_panel(
                    "Job Times Upload",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Upload data for Job Time"),
                            ui.p("Download the template file to view format", class_="text-muted mb-2"),
                            ui.div(
                                {"class": "mb-3"},
                                ui.download_button("btn_download_job_time_tpl", "Download template", class_="btn-action-custom")
                            ),
                            ui.div(
                                {"class": "p-2 bg-light border rounded"},
                                ui.strong("Current file being used: "),
                                ui.span("job_time_2026-02-23 17:08:12", class_="text-primary fw-bold")
                            )
                        ),
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Uploaded data"),
                            ui.output_data_frame("table_job_times_data")
                        )
                    ),
                    value="subtab_job_times_upload"
                ),
                id="subnav_job_times"
            )
        ),
        value="tab_dem_cfg_job_times"
    )

    panel_hec_kac = ui.nav_panel(
        "HEC on KAC",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "HEC on KAC Demand Support Rules"),
                ui.p("Percentage and hours of KAC work serviced by cross-skilled HEC engineers.", class_="text-muted"),
                ui.output_data_frame("table_hec_on_kac")
            )
        ),
        value="tab_dem_cfg_hec_kac"
    )

    panel_hec_ev = ui.nav_panel(
        "HEC On EV",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "HEC on EV Demand Support Rules"),
                ui.p("EV installation and assistance allocation for dual-certified HEC technicians.", class_="text-muted"),
                ui.output_data_frame("table_hec_on_ev")
            )
        ),
        value="tab_dem_cfg_hec_ev"
    )

    return ui.nav_menu(
        ui.span(ui.HTML("&#9881;"), " Demand Configuration"),
        panel_job_times,
        panel_hec_kac,
        panel_hec_ev
    )

