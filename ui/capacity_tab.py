"""
Capacity Tab UI
Implements the Capacity Dropdown Menu navigation with FTE, Downtime Overlays, and capacity dimensions.
Matching Images 8 and 9.
"""

from shiny import ui

def create_capacity_panels():
    """Returns the list of nav_panels for the Capacity dropdown menu."""
    
    # 1. FTE Panel (Image 8)
    panel_fte = ui.nav_panel(
        "FTE",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.navset_tab(
                ui.nav_panel(
                    "F.T.E. Upload",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Upload data for F.T.E. calculation"),
                            ui.p("Download the template file to view format", class_="text-muted mb-2"),
                            ui.div(
                                {"class": "mb-3"},
                                ui.download_button("btn_download_fte_tpl", "Download template", class_="btn-action-custom")
                            ),
                            ui.div(
                                {"class": "p-2 bg-light border rounded"},
                                ui.strong("Current file being used: "),
                                ui.span("Latest Resource Plan V3_2026-07-07 11:20:57", class_="text-primary fw-bold")
                            )
                        ),
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Uploaded data"),
                            ui.output_data_frame("table_fte_uploaded")
                        )
                    ),
                    value="subtab_fte_upload"
                ),
                ui.nav_panel(
                    "F.T.E Transfer Upload",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "F.T.E Transfer Schedule"),
                            ui.p("Active resource inter-patch and inter-skill transfers.")
                        ),
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.output_data_frame("table_fte_transfer")
                        )
                    ),
                    value="subtab_fte_transfer_upload"
                ),
                ui.nav_panel(
                    "F.T.E. Weekly View",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Weekly Net Effective FTE"),
                            ui.output_data_frame("table_fte_weekly")
                        )
                    ),
                    value="subtab_fte_weekly_view"
                ),
                id="subnav_fte"
            )
        ),
        value="tab_cap_fte"
    )

    # 2. Downtime Overlays Panel (Image 9)
    panel_overlays = ui.nav_panel(
        "Downtime Overlays",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.navset_tab(
                ui.nav_panel(
                    "Overlay Upload",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Upload data for Overlay"),
                            ui.p("Download the template file to view format", class_="text-muted mb-2"),
                            ui.div(
                                {"class": "mb-3"},
                                ui.download_button("btn_download_overlay_tpl", "Download template", class_="btn-action-custom")
                            ),
                            ui.div(
                                {"class": "mb-3"},
                                ui.input_radio_buttons(
                                    "overlay_format_type",
                                    "Upload Format:",
                                    choices=["Percentage", "Hours", "Hrs/FTE"],
                                    selected="Percentage",
                                    inline=True
                                )
                            ),
                            ui.div(
                                {"class": "p-2 bg-light border rounded"},
                                ui.strong("Current file being used: "),
                                ui.span("es_shiny_overlays_percentage_input2_2026-02-24 15:39:40", class_="text-primary fw-bold")
                            )
                        ),
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Uploaded data"),
                            ui.output_data_frame("table_overlays_uploaded")
                        )
                    ),
                    value="subtab_overlay_upload"
                ),
                id="subnav_overlays"
            )
        ),
        value="tab_cap_overlays"
    )

    # 3. Recruitment Panel
    panel_recruitment = ui.nav_panel(
        "Recruitment",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Recruitment Schedules (Grounded vs Ungrounded)"),
                ui.output_data_frame("table_recruitment_summary")
            )
        ),
        value="tab_cap_recruitment"
    )

    # 4. Baseline Assumptions Panel
    panel_baseline = ui.nav_panel(
        "Baseline Assumptions",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Baseline Shift & Working Hours Assumptions"),
                ui.output_data_frame("table_baseline_assumptions")
            )
        ),
        value="tab_cap_baseline"
    )

    # 5. Bank Hours Panel
    panel_bank = ui.nav_panel(
        "Bank Hours",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Bank Hours Tracking & Banking Balance"),
                ui.output_data_frame("table_bank_hours")
            )
        ),
        value="tab_cap_bank_hours"
    )

    # 6. Available Hours Panel
    panel_avail = ui.nav_panel(
        "Available Hours",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Net Available Engineering Productive Hours"),
                ui.output_data_frame("table_available_hours")
            )
        ),
        value="tab_cap_avail_hours"
    )

    # 7. Baseline Productivity Panel
    panel_prod = ui.nav_panel(
        "Baseline Productivity",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Baseline Productivity Benchmarks"),
                ui.output_data_frame("table_baseline_prod")
            )
        ),
        value="tab_cap_prod"
    )

    # 8. Training SNM Panel
    panel_snm = ui.nav_panel(
        "Training SNM",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Training SNM Allocations"),
                ui.output_data_frame("table_training_snm")
            )
        ),
        value="tab_cap_snm"
    )

    # 9. Total Capacity Panel
    panel_total = ui.nav_panel(
        "Total Capacity",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Total Consolidated Capacity by Patch"),
                ui.output_data_frame("table_total_capacity")
            )
        ),
        value="tab_cap_total"
    )

    # 10. SP Commitment Panel
    panel_sp = ui.nav_panel(
        "SP Commitment",
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            ui.div(
                {"class": "card border shadow-sm p-3 bg-white mb-3"},
                ui.div({"class": "section-banner-header"}, "Strategic Planning Commitments"),
                ui.output_data_frame("table_sp_commitments")
            )
        ),
        value="tab_cap_sp"
    )

    return ui.nav_menu(
        ui.span(ui.HTML("&#128202;"), " Capacity"),
        panel_fte,
        panel_recruitment,
        panel_baseline,
        panel_overlays,
        panel_bank,
        panel_avail,
        panel_prod,
        panel_snm,
        panel_total,
        panel_sp
    )

