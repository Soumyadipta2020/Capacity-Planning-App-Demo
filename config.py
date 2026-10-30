"""
Configuration and Environment Detection Module
Supports seamless execution across VS Code (Local) and Databricks Apps.
Handles dynamic Databricks Unity Catalog 3-level namespace resolution:
<catalog>.<schema>.<table>
- Based on DATABRICKS_APP_NAME in app.yaml, resolves stage to prod, uat, or dev.
- Database/Schema changes dynamically per stage (e.g. dev, uat, prod).
- Databricks Catalog (capacity_planning) and Table Names (es_shiny_*) remain constant.
"""

import os
import sys
import platform
from pathlib import Path
from typing import Dict, List, Any

# Base workspace directory
WORKSPACE_DIR = Path(__file__).resolve().parent

class EnvironmentConfig:
    """Manages environment detection, Databricks Unity Catalog paths, and runtime settings."""
    
    # Active simulation override for container mode ('databricks', 'vscode')
    _override_env: str = os.environ.get("CAPACITY_PLANNING_ENV", "").lower()
    # Active simulation override for stage ('prod', 'uat', 'dev')
    _override_stage: str = ""

    # Canonical mapping of all 21 operational inputs
    OPERATIONAL_INPUT_LABELS: Dict[str, str] = {
        "actuals_input": "Actuals input",
        "resource_plan": "Resource Plan",
        "fte_transfer": "FTE transfer",
        "recruitment_grounded": "Recruitment grounded",
        "recruitment_ungrounded": "Recruitment ungrounded",
        "baseline_assumptions": "Baseline assumptions",
        "downtime_overlays_percentage": "Downtime Overlays Percentage",
        "downtime_overlays_hours": "Downtime Overlays Hours",
        "downtime_overlays_hours_fte": "Downtime Overlays Hours/FTE",
        "overtime": "Overtime",
        "baseline_productivity": "Baseline productivity",
        "training_snm": "Training SNM",
        "ctr_capacity": "CTR Capacity",
        "attrition": "Attrition",
        "recruitment_config": "Recruitment config",
        "demand_input": "Demand input",
        "job_time_assumptions": "Job time assumptions",
        "hec_on_kac_demand": "HEC on KAC Demand",
        "hec_on_ev_demand": "HEC on EV Demand",
        "geography_mapping": "Geography mapping",
        "week_to_month": "Week to month"
    }

    @classmethod
    def set_environment_override(cls, env: str):
        """Allow switching or simulating environment mode (e.g. from UI)."""
        cls._override_env = env.lower() if env else ""

    @classmethod
    def get_override_env(cls) -> str:
        return cls._override_env

    @classmethod
    def set_stage_override(cls, stage: str):
        """Allow dynamically simulating or switching environment stage (dev, uat, prod)."""
        cls._override_stage = stage.lower() if stage else ""

    @classmethod
    def get_app_name(cls) -> str:
        """
        Retrieves Databricks App Name dynamically from the deployment environment.
        Falls back to 'Not available' when not running in a deployed Databricks Apps container.
        """
        return os.environ.get("DATABRICKS_APP_NAME", "Not available")

    @classmethod
    def get_stage(cls) -> str:
        """
        Determines whether the application stage is 'prod', 'uat', or 'dev'
        based on the app name fetched from the deployment environment:
        os.environ.get("DATABRICKS_APP_NAME", "Not available").
        - If 'prod' in app name -> 'prod'
        - If 'uat'  in app name -> 'uat'
        - Otherwise (including 'dev' or 'Not available') -> 'dev'
        """
        if cls._override_stage:
            return cls._override_stage

        app_name = cls.get_app_name().lower()
        if "prod" in app_name:
            return "prod"
        elif "uat" in app_name:
            return "uat"
        return "dev"

    @classmethod
    def get_catalog(cls) -> str:
        """
        Unity Catalog name. Remains constant across dev, uat, and prod.
        """
        return os.environ.get("DATABRICKS_CATALOG", "capacity_planning")

    @classmethod
    def get_schema(cls) -> str:
        """
        Unity Catalog schema / database name.
        Dynamically resolved based on the app name (stage):
        - prod -> uses prod schema
        - uat  -> uses uat schema
        - dev  -> uses dev schema
        """
        # If explicit override is set, use it
        if "DATABRICKS_SCHEMA" in os.environ and os.environ["DATABRICKS_SCHEMA"]:
            return os.environ["DATABRICKS_SCHEMA"]

        stage = cls.get_stage()
        stage_var = f"DATABRICKS_SCHEMA_{stage.upper()}"
        return os.environ.get(stage_var, stage)

    @classmethod
    def get_table_name(cls, input_key: str) -> str:
        """
        Returns the Databricks table name for a given operational input.
        Follows the convention: es_shiny_<input_key> (e.g. es_shiny_actuals_input).
        Table names remain identical across dev, uat, and prod.
        """
        env_var = f"TABLE_{input_key.upper()}"
        return os.environ.get(env_var, f"es_shiny_{input_key}")

    @classmethod
    def get_full_table_path(cls, input_key: str) -> str:
        """
        Returns the full 3-level Databricks Unity Catalog path:
        <catalog>.<schema>.<table>
        e.g. capacity_planning.dev.es_shiny_actuals_input
             capacity_planning.prod.es_shiny_actuals_input
        """
        return f"{cls.get_catalog()}.{cls.get_schema()}.{cls.get_table_name(input_key)}"

    @classmethod
    def get_all_table_mappings(cls) -> List[Dict[str, str]]:
        """
        Returns the full mapping for all 21 operational inputs with their
        Unity Catalog 3-level coordinates.
        """
        catalog = cls.get_catalog()
        schema = cls.get_schema()
        stage = cls.get_stage()
        mappings = []
        for key, label in cls.OPERATIONAL_INPUT_LABELS.items():
            tbl_name = cls.get_table_name(key)
            mappings.append({
                "key": key,
                "label": label,
                "table_name": tbl_name,
                "catalog": catalog,
                "schema": schema,
                "stage": stage,
                "full_path": f"{catalog}.{schema}.{tbl_name}",
                "format": "Delta Lake (Unity Catalog)"
            })
        return mappings

    @classmethod
    def is_databricks(cls) -> bool:
        """
        Detects whether the application is running inside a Databricks Apps container
        or cluster environment, checking standard Databricks environment variables.
        """
        if cls._override_env == "databricks":
            return True
        if cls._override_env == "vscode" or cls._override_env == "local":
            return False

        databricks_markers = [
            "DATABRICKS_APP_ID",
            "DATABRICKS_APP_NAME",
            "DATABRICKS_HOST",
            "DATABRICKS_RUNTIME_VERSION",
            "DB_APP_NAME",
            "DATABRICKS_WORKSPACE_ID"
        ]
        return any(bool(os.environ.get(marker)) for marker in databricks_markers)

    @classmethod
    def is_vscode(cls) -> bool:
        """Detects whether running locally inside VS Code or local terminal."""
        if cls.is_databricks():
            return False
        return True

    @classmethod
    def get_environment_name(cls) -> str:
        stage_upper = cls.get_stage().upper()
        if cls.is_databricks():
            return f"Databricks Apps ({stage_upper})"
        return f"VS Code (Local - {stage_upper})"

    @classmethod
    def get_badge_text(cls) -> str:
        stage_upper = cls.get_stage().upper()
        if cls.is_databricks():
            return f"ES {stage_upper} (Databricks Apps)"
        return f"ES {stage_upper} (VS Code / Local)"

    @classmethod
    def get_data_dir(cls) -> Path:
        """
        Returns data path. If on Databricks and a Volume path is configured,
        use it, otherwise fall back to local `./data`.
        """
        if cls.is_databricks():
            db_volume = os.environ.get("DATABRICKS_DATA_VOLUME")
            if db_volume and Path(db_volume).exists():
                return Path(db_volume)
        return WORKSPACE_DIR / "data"

    @classmethod
    def get_server_host(cls) -> str:
        """Databricks Apps requires binding to 0.0.0.0; local VS Code prefers 127.0.0.1."""
        if cls.is_databricks():
            return "0.0.0.0"
        return os.environ.get("APP_HOST", "127.0.0.1")

    @classmethod
    def get_server_port(cls) -> int:
        """Port resolution: Databricks Apps sets DATABRICKS_APP_PORT or standard PORT."""
        for port_var in ["DATABRICKS_APP_PORT", "PORT", "APP_PORT"]:
            val = os.environ.get(port_var)
            if val and val.isdigit():
                return int(val)
        return 8000

    @classmethod
    def get_diagnostics(cls) -> dict:
        """Returns diagnostic information about the runtime environment and Unity Catalog."""
        return {
            "environment": cls.get_environment_name(),
            "stage": cls.get_stage(),
            "app_name": cls.get_app_name(),
            "catalog": cls.get_catalog(),
            "schema": cls.get_schema(),
            "is_databricks": cls.is_databricks(),
            "is_vscode": cls.is_vscode(),
            "badge_text": cls.get_badge_text(),
            "override_active": bool(cls._override_env or cls._override_stage),
            "override_value": f"env={cls._override_env or 'auto'}, stage={cls._override_stage or 'auto'}",
            "data_directory": str(cls.get_data_dir()),
            "server_host": cls.get_server_host(),
            "server_port": cls.get_server_port(),
            "python_version": sys.version.split()[0],
            "os_system": f"{platform.system()} {platform.release()}",
            "workspace_dir": str(WORKSPACE_DIR),
            "databricks_app_id": os.environ.get("DATABRICKS_APP_ID", "Not set (Local mode)"),
            "databricks_host": os.environ.get("DATABRICKS_HOST", "Not set (Local mode)"),
            "databricks_runtime": os.environ.get("DATABRICKS_RUNTIME_VERSION", "Not set (Local mode)"),
            "sample_table_actuals": cls.get_full_table_path("actuals_input")
        }
