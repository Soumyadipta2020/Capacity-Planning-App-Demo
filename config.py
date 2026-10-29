"""
Configuration and Environment Detection Module
Supports seamless execution across VS Code (Local) and Databricks Apps.
"""

import os
import sys
import platform
from pathlib import Path

# Base workspace directory
WORKSPACE_DIR = Path(__file__).resolve().parent

class EnvironmentConfig:
    """Manages environment detection, paths, and runtime settings."""
    
    # Active simulation override (can be set via UI or ENV var)
    _override_env: str = os.environ.get("CAPACITY_PLANNING_ENV", "").lower()
    
    @classmethod
    def set_environment_override(cls, env: str):
        """Allow switching or simulating environment mode (e.g. from UI)."""
        cls._override_env = env.lower() if env else ""

    @classmethod
    def get_override_env(cls) -> str:
        return cls._override_env

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
        """
        Detects whether running locally inside VS Code or local terminal.
        """
        if cls.is_databricks():
            return False
        return True

    @classmethod
    def get_environment_name(cls) -> str:
        if cls.is_databricks():
            return "Databricks Apps"
        return "VS Code (Local)"

    @classmethod
    def get_badge_text(cls) -> str:
        if cls.is_databricks():
            return "ES Dev (Databricks Apps)"
        return "ES Dev (VS Code / Local)"

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
        """
        Databricks Apps requires binding to 0.0.0.0; local VS Code prefers 127.0.0.1.
        """
        if cls.is_databricks():
            return "0.0.0.0"
        return os.environ.get("APP_HOST", "127.0.0.1")

    @classmethod
    def get_server_port(cls) -> int:
        """
        Port resolution: Databricks Apps sets DATABRICKS_APP_PORT or standard PORT.
        """
        for port_var in ["DATABRICKS_APP_PORT", "PORT", "APP_PORT"]:
            val = os.environ.get(port_var)
            if val and val.isdigit():
                return int(val)
        return 8000

    @classmethod
    def get_diagnostics(cls) -> dict:
        """
        Returns diagnostic information about the runtime environment.
        """
        return {
            "environment": cls.get_environment_name(),
            "is_databricks": cls.is_databricks(),
            "is_vscode": cls.is_vscode(),
            "badge_text": cls.get_badge_text(),
            "override_active": bool(cls._override_env),
            "override_value": cls._override_env or "None (Auto-detected)",
            "data_directory": str(cls.get_data_dir()),
            "server_host": cls.get_server_host(),
            "server_port": cls.get_server_port(),
            "python_version": sys.version.split()[0],
            "os_system": f"{platform.system()} {platform.release()}",
            "workspace_dir": str(WORKSPACE_DIR),
            "databricks_app_id": os.environ.get("DATABRICKS_APP_ID", "Not set (Local mode)"),
            "databricks_host": os.environ.get("DATABRICKS_HOST", "Not set (Local mode)"),
            "databricks_app_name": os.environ.get("DATABRICKS_APP_NAME", "Not set (Local mode)"),
            "databricks_runtime": os.environ.get("DATABRICKS_RUNTIME_VERSION", "Not set (Local mode)")
        }

