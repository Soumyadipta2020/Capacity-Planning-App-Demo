"""
Visuals Tab UI
Provides interactive high-level capacity planning charts, KPI cards, and trend analytics.
"""

from shiny import ui
from shinywidgets import output_widget
from data_manager import SKILLS, REGIONS

def create_visuals_tab():
    return ui.nav_panel(
        ui.span(ui.HTML("&#128202;"), " Visuals"),
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            
            # --- KPI SUMMARY CARDS ---
            ui.div(
                {"class": "row g-3 mb-4"},
                ui.div(
                    {"class": "col-md-3"},
                    ui.div(
                        {"class": "card border-0 shadow-sm p-3", "style": "background: #eef5fc; border-left: 5px solid #002D62 !important;"},
                        ui.div({"class": "text-muted small text-uppercase fw-bold"}, "Total Demand Hours"),
                        ui.h3("38,450 hrs", class_="fw-bold text-dark mt-1"),
                        ui.span({"class": "text-muted small"}, "Forecasted across active weeks")
                    )
                ),
                ui.div(
                    {"class": "col-md-3"},
                    ui.div(
                        {"class": "card border-0 shadow-sm p-3", "style": "background: #eefaf6; border-left: 5px solid #198754 !important;"},
                        ui.div({"class": "text-muted small text-uppercase fw-bold"}, "Total Available Capacity"),
                        ui.h3("41,200 hrs", class_="fw-bold text-success mt-1"),
                        ui.span({"class": "text-muted small"}, "Net productive engineering hours")
                    )
                ),
                ui.div(
                    {"class": "col-md-3"},
                    ui.div(
                        {"class": "card border-0 shadow-sm p-3", "style": "background: #fdf8eb; border-left: 5px solid #ffc107 !important;"},
                        ui.div({"class": "text-muted small text-uppercase fw-bold"}, "Net Imbalance (FTE)"),
                        ui.h3("+73.3 FTE", class_="fw-bold text-primary mt-1"),
                        ui.span({"class": "text-muted small"}, "Current surplus capacity buffer")
                    )
                ),
                ui.div(
                    {"class": "col-md-3"},
                    ui.div(
                        {"class": "card border-0 shadow-sm p-3", "style": "background: #f4f6fc; border-left: 5px solid #0d6efd !important;"},
                        ui.div({"class": "text-muted small text-uppercase fw-bold"}, "Capacity Coverage"),
                        ui.h3("107.2%", class_="fw-bold text-info mt-1"),
                        ui.span({"class": "text-muted small"}, "Target SLA buffer maintained")
                    )
                )
            ),
            
            # --- FILTER BAR ---
            ui.div(
                {"class": "card p-3 mb-4 bg-white border shadow-sm"},
                ui.div(
                    {"class": "row g-3 align-items-center"},
                    ui.div(
                        {"class": "col-md-4"},
                        ui.input_select("vis_skill_filter", "Filter by Skill:", choices=["All Skills"] + SKILLS, selected="All Skills", width="100%")
                    ),
                    ui.div(
                        {"class": "col-md-4"},
                        ui.input_select("vis_region_filter", "Filter by Region:", choices=["All Regions"] + [f"Region {r}" for r in REGIONS], selected="All Regions", width="100%")
                    ),
                    ui.div(
                        {"class": "col-md-4"},
                        ui.input_select("vis_metric_view", "Metric View:", choices=["Hours", "FTE Equivalent", "Productivity Index"], selected="Hours", width="100%")
                    )
                )
            ),
            
            # --- CHARTS ROW 1 ---
            ui.div(
                {"class": "row g-4 mb-4"},
                ui.div(
                    {"class": "col-md-8"},
                    ui.div(
                        {"class": "card border shadow-sm p-3 h-100"},
                        ui.div({"class": "section-banner-header"}, "Demand vs Capacity Trend by Week"),
                        output_widget("plot_vis_trend")
                    )
                ),
                ui.div(
                    {"class": "col-md-4"},
                    ui.div(
                        {"class": "card border shadow-sm p-3 h-100"},
                        ui.div({"class": "section-banner-header"}, "Skill Distribution"),
                        output_widget("plot_vis_skill_pie")
                    )
                )
            ),
            
            # --- CHARTS ROW 2 ---
            ui.div(
                {"class": "row g-4"},
                ui.div(
                    {"class": "col-md-12"},
                    ui.div(
                        {"class": "card border shadow-sm p-3"},
                        ui.div({"class": "section-banner-header"}, "Regional Capacity Imbalance Distribution"),
                        output_widget("plot_vis_regional_bar")
                    )
                )
            )
        ),
        value="tab_visuals"
    )

