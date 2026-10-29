"""
About Tab UI
Provides system documentation and live environment detection / diagnostics.
"""

from shiny import ui
from config import EnvironmentConfig

def create_about_tab():
    diag = EnvironmentConfig.get_diagnostics()
    
    return ui.nav_panel(
        ui.span(ui.HTML("&#8505;"), " About"),
        ui.div(
            {"class": "container-fluid", "style": "padding: 18px 24px;"},
            
            # Application Overview
            ui.div(
                {"class": "card border shadow-sm p-4 mb-4 bg-white"},
                ui.div({"class": "section-banner-header"}, "British Gas Field Capacity Planning Application"),
                ui.p(
                    "This PyShiny application manages field engineering capacity and demand alignment across UK regions and patches. "
                    "Planners configure and evaluate multiple operational scenarios by dynamically swapping input files and version parameters."
                )
            ),
            
            # Live Environment Detection & Diagnostics
            ui.div(
                {"class": "card border shadow-sm p-4 mb-4 bg-white"},
                ui.div({"class": "section-banner-header"}, "Environment Detection & Diagnostics"),
                ui.p(
                    "The application automatically detects whether it is running locally in VS Code or deployed inside a Databricks Apps container.",
                    class_="text-muted"
                ),
                
                # Interactive Environment Simulator Switch
                ui.div(
                    {"class": "p-3 mb-3 bg-light border rounded"},
                    ui.h6("Environment Mode Simulator:", class_="fw-bold"),
                    ui.div(
                        {"class": "row align-items-center g-3"},
                        ui.div(
                            {"class": "col-md-6"},
                            ui.input_radio_buttons(
                                "simulated_env_selector",
                                "Select active runtime environment:",
                                choices={
                                    "auto": "Auto-Detect (Current host environment)",
                                    "vscode": "VS Code (Local Development mode: 127.0.0.1, ./data)",
                                    "databricks": "Databricks Apps (Cloud mode: 0.0.0.0, Unity Catalog Volumes)"
                                },
                                selected="auto"
                            )
                        ),
                        ui.div(
                            {"class": "col-md-6"},
                            ui.input_action_button("btn_apply_env_change", "Apply & Switch Environment", class_="btn-primary")
                        )
                    )
                ),
                
                # Diagnostics table / status view
                ui.output_ui("ui_environment_diagnostics")
            ),
            
            # Deployment Guide for Databricks Apps
            ui.div(
                {"class": "card border shadow-sm p-4 bg-white"},
                ui.div({"class": "section-banner-header"}, "Databricks Apps Deployment Guide"),
                ui.markdown(
                    """
### How Environment Detection Works

1. **Automatic Detection**:
   - The app inspects environment variables automatically (`DATABRICKS_APP_ID`, `DATABRICKS_HOST`, `DATABRICKS_RUNTIME_VERSION`).
   - If present, it binds to `0.0.0.0` and the port configured by `DATABRICKS_APP_PORT` (default 8000), using cloud storage/volume paths.
   - If absent, it runs in **VS Code (Local)** mode, binding to `127.0.0.1:8000` with local file storage in `./data`.

2. **Deploying to Databricks Apps**:
   ```bash
   # 1. Sync project files to Databricks Workspace or Unity Catalog Volume
   databricks sync . /Workspace/Users/you/capacity-planning-app

   # 2. Deploy using Databricks Apps CLI
   databricks apps deploy capacity-planning --source-code-path /Workspace/Users/you/capacity-planning-app
   ```
   The included `app.yaml` file configures the app entry point, commands, and environment variables automatically.
                    """
                )
            )
        ),
        value="tab_about"
    )

