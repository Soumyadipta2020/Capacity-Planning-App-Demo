"""
Capacity Configuration Tab UI
Implements Capacity Configuration Dropdown Menu: Attrition Rate and Recruitment Productivity.
Matching Image 10.
"""

from shiny import ui

def create_capacity_config_panels():
    panel_attrition = ui.nav_panel(
        "Attrition Rate",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.navset_tab(
                ui.nav_panel(
                    "Attrition Rate Upload",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Upload data for Attrition Rate"),
                            ui.p("Download the template file to view format", class_="text-muted mb-2"),
                            ui.div(
                                {"class": "mb-3"},
                                ui.download_button("btn_download_attrition_tpl", "Download template", class_="btn-action-custom")
                            ),
                            ui.div(
                                {"class": "p-2 bg-light border rounded"},
                                ui.strong("Current file being used: "),
                                ui.span("es_shiny_attrition_input2_2026-02-05 09:54:11", class_="text-primary fw-bold")
                            )
                        ),
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Uploaded data"),
                            ui.output_data_frame("table_attrition_data")
                        )
                    ),
                    value="subtab_attrition_upload"
                ),
                id="subnav_attrition"
            )
        ),
        value="tab_cap_cfg_attrition"
    )

    panel_recruitment_prod = ui.nav_panel(
        "Recruitment Productivity",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Recruitment Productivity Ramp-Up Schedule"),
                ui.p("Ramp curve % productivity by week since engineer onboarded.", class_="text-muted"),
                ui.output_data_frame("table_recruitment_ramp")
            )
        ),
        value="tab_cap_cfg_recruit_prod"
    )

    return ui.nav_menu(
        ui.span(ui.HTML("&#9881;"), " Capacity Configuration"),
        panel_attrition,
        panel_recruitment_prod
    )

