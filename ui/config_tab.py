"""
Configuration Tab UI
Implements Geog Mapping Upload (with Mismatch Patch with Actuals), Week to Month Data, All Search, Export Date, and Demo Code.
Matching Image 12.
"""

from shiny import ui

def create_config_tab():
    return ui.nav_panel(
        ui.span(ui.HTML("&#9881;"), " Configuration"),
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            
            ui.navset_tab(
                # Sub-Tab 1: Geog Mapping Upload (Image 12)
                ui.nav_panel(
                    "Geog Mapping Upload",
                    ui.div(
                        {"class": "mt-3"},
                        
                        # Upload card
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Upload data for Geographical Mapping"),
                            ui.p("Download the template file to view format", class_="text-muted mb-2"),
                            ui.div(
                                {"class": "mb-3"},
                                ui.download_button("btn_download_geog_tpl", "Download template", class_="btn-action-custom")
                            ),
                            ui.div(
                                {"class": "p-2 bg-light border rounded"},
                                ui.strong("Current file being used: "),
                                ui.span("es_shiny_geog_mapping_input2_2026-02-18 13:04:22", class_="text-primary fw-bold")
                            )
                        ),
                        
                        # Uploaded data table
                        ui.div(
                            {"class": "card border shadow-sm p-3 mb-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Uploaded data"),
                            ui.output_data_frame("table_geog_mapping")
                        ),
                        
                        # Mismatch Patch with Actuals (matches Image 12)
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Mismatch Patch with Actuals"),
                            ui.output_data_frame("table_mismatch_patches"),
                            ui.div({"class": "text-muted small mt-2"}, "Viewing rows 1 through 3 of 4")
                        )
                    ),
                    value="subtab_geog_mapping"
                ),
                
                # Sub-Tab 2: Week to Month Data
                ui.nav_panel(
                    "Week to Month Data",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header"}, "Week to Month Calendar & Fiscal Conversion"),
                            ui.output_data_frame("table_week_to_month")
                        )
                    ),
                    value="subtab_week_to_month"
                ),
                
                # Sub-Tab 3: All Search
                ui.nav_panel(
                    "All Search",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header mb-3"}, "Global Search Across Patches & Work Codes"),
                            ui.div(
                                {"class": "row g-3 mb-3"},
                                ui.div(
                                    {"class": "col-md-6"},
                                    ui.input_text("global_search_term", "Search query:", placeholder="e.g. Canterbury, HEC, W01, 950718...")
                                )
                            ),
                            ui.output_data_frame("table_global_search_results")
                        )
                    ),
                    value="subtab_all_search"
                ),
                
                # Sub-Tab 4: Export Date
                ui.nav_panel(
                    "Export Date",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header mb-3"}, "Consolidated Data & Scenario Export"),
                            ui.p("Export all current scenario metrics, imbalances, and staffing allocations."),
                            ui.div(
                                {"class": "d-flex gap-2"},
                                ui.download_button("btn_export_all_csv", "Export Scenario CSV", class_="btn-primary"),
                                ui.download_button("btn_export_all_json", "Export Config JSON", class_="btn-action-custom")
                            )
                        )
                    ),
                    value="subtab_export_date"
                ),
                
                # Sub-Tab 5: Demo Code
                ui.nav_panel(
                    "Demo Code",
                    ui.div(
                        {"class": "mt-3"},
                        ui.div(
                            {"class": "card border shadow-sm p-3 bg-white"},
                            ui.div({"class": "section-banner-header mb-3"}, "Capacity Model Integration & API Hooks"),
                            ui.tags.pre(
                                """# Databricks PySpark / Python API example
from pyspark.sql import functions as F

def load_capacity_scenario(spark, scenario_name):
    df_imbalances = spark.read.table("capacity_catalog.gold.imbalances") \\
        .filter(F.col("scenario_id") == scenario_name)
    return df_imbalances
"""
                            )
                        )
                    ),
                    value="subtab_demo_code"
                ),
                id="subnav_configuration"
            )
        ),
        value="tab_configuration"
    )

