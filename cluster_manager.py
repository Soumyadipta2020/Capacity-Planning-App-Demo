from __future__ import annotations

import asyncio
import os
import sys
import threading
import time
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional, Tuple

from shiny import Inputs, Outputs, Session, reactive, render, ui

# Databricks Compute States
STARTING_STATES = {"PENDING", "RESTARTING", "RESIZING", "STARTING"}
STOPPING_STATES = {"TERMINATING", "STOPPING", "DELETING"}
OFFLINE_STATES = {"TERMINATED", "STOPPED", "OFFLINE"}
RUNNING_STATE = "RUNNING"
UNKNOWN_STATE = "UNKNOWN"
ERROR_STATE = "ERROR"


def get_current_user(session: Session) -> str:
    """Extracts logged in user email or username from Databricks Apps reverse proxy headers or session."""
    http_conn = getattr(session, "http_conn", None)
    if http_conn and hasattr(http_conn, "headers"):
        headers = http_conn.headers
        for key in ("x-forwarded-email", "x-forwarded-preferred-username", "x-forwarded-user"):
            val = headers.get(key)
            if val and str(val).strip():
                return str(val).strip()
    user = getattr(session, "user", None)
    if user and str(user).strip():
        return str(user).strip()
    return ""


class ClusterStartingError(RuntimeError):
    """Raised when an attempt to execute a query or load data is made while compute is starting or offline."""

    def __init__(self, state: str):
        self.state = state
        super().__init__(f"Databricks cluster is {state}; please start the cluster to load data.")


def is_offline_state(state: str) -> bool:
    """Returns True if the state indicates the compute is offline/stopped/terminated."""
    return str(state).upper() in OFFLINE_STATES


def is_starting_state(state: str) -> bool:
    """Returns True if the compute is actively starting up or resizing."""
    return str(state).upper() in STARTING_STATES


def is_running_state(state: str) -> bool:
    """Returns True if the compute is running and ready to accept queries."""
    return str(state).upper() == RUNNING_STATE


def format_cluster_status_dict(name: str, state: str) -> dict[str, str]:
    """Generates standard status dictionary for the given cluster name and state."""
    display_label = name or "Databricks compute"
    state_upper = state.upper() if state else UNKNOWN_STATE

    if state_upper == RUNNING_STATE:
        return {
            "state": state_upper,
            "cluster_name": name,
            "message": f"'{display_label}' is running.",
            "can_read": "true",
            "is_offline": "false",
        }
    elif state_upper in STARTING_STATES:
        return {
            "state": state_upper,
            "cluster_name": name,
            "message": f"'{display_label}' is {state_upper.lower()}...",
            "can_read": "false",
            "is_offline": "false",
        }
    elif state_upper in STOPPING_STATES:
        return {
            "state": state_upper,
            "cluster_name": name,
            "message": f"'{display_label}' is {state_upper.lower()}...",
            "can_read": "false",
            "is_offline": "false",
        }
    elif state_upper in OFFLINE_STATES:
        return {
            "state": state_upper,
            "cluster_name": name,
            "message": f"'{display_label}' is {state_upper.lower()}.",
            "can_read": "false",
            "is_offline": "true",
        }
    else:
        is_off = state_upper not in {ERROR_STATE, UNKNOWN_STATE}
        return {
            "state": state_upper,
            "cluster_name": name,
            "message": f"'{display_label}' status: {state_upper}.",
            "can_read": "false",
            "is_offline": "true" if is_off else "false",
        }


class ClusterManager:
    """
    Manages Databricks compute (All-Purpose Spark Cluster or SQL Warehouse) lifecycle,
    cached health polling, startup requests, and SQL database connection cursors.
    """

    def __init__(self, settings: Any = None):
        self.settings = settings
        self._status_lock = threading.Lock()
        self._compute_name = ""
        self._cluster_status = {
            "state": UNKNOWN_STATE,
            "cluster_name": "",
            "message": "Checking compute status...",
            "can_read": "false",
            "is_offline": "false",
        }
        self._last_status_check = 0.0
        self._startup_in_progress = False
        self._startup_requested_at = 0.0
        self._simulated_state: Optional[str] = None

    def set_simulated_state(self, state: Optional[str], cluster_name: str = "Capacity Planning Spark Cluster") -> None:
        """Allow simulated cluster state for local development or testing without active cloud credentials."""
        self._simulated_state = state
        if cluster_name:
            self._compute_name = cluster_name
        if state is not None:
            self._cluster_status = format_cluster_status_dict(self._compute_name, state)
            self._last_status_check = time.time()

    @property
    def compute_name(self) -> str:
        with self._status_lock:
            return self._compute_name or self._cluster_status.get("cluster_name", "")

    @property
    def current_status(self) -> dict[str, str]:
        with self._status_lock:
            return dict(self._cluster_status)

    @property
    def is_running(self) -> bool:
        with self._status_lock:
            return self._cluster_status.get("state") == RUNNING_STATE

    @property
    def is_offline(self) -> bool:
        with self._status_lock:
            state = self._cluster_status.get("state", UNKNOWN_STATE)
            return self._cluster_status.get("is_offline") == "true" or state in OFFLINE_STATES

    @property
    def is_starting(self) -> bool:
        with self._status_lock:
            state = self._cluster_status.get("state", UNKNOWN_STATE)
            return state in STARTING_STATES or self._startup_in_progress

    def _get_setting(self, name: str, default: str = "") -> str:
        """Resolves setting from settings object or environment variables."""
        if self.settings:
            val = getattr(self.settings, name, None)
            if callable(val):
                val = val()
            if val is not None and str(val).strip():
                return str(val).strip()
        env_val = os.environ.get(name.upper(), "")
        if env_val.strip():
            return env_val.strip()
        return default

    def is_cluster_configured(self) -> bool:
        """Checks if a Databricks cluster ID or warehouse ID is configured."""
        if self._simulated_state is not None:
            return True
        from config import EnvironmentConfig
        # In VS Code (local mode), Databricks compute is not configured unless explicitly in databricks storage mode
        if EnvironmentConfig.is_vscode() and EnvironmentConfig.get_storage_mode() in {"local", "csv"}:
            return False
        cid = self._get_setting("databricks_cluster_id") or os.environ.get("DATABRICKS_CLUSTER_ID", "").strip()
        wid = self._get_setting("databricks_warehouse_id") or os.environ.get("DATABRICKS_WAREHOUSE_ID", "").strip()
        return bool(cid or wid)

    def get_workspace_client(self):
        """Constructs and returns an authenticated Databricks WorkspaceClient."""
        from databricks.sdk import WorkspaceClient

        kwargs = {}
        host = self._get_setting("databricks_host") or os.environ.get("DATABRICKS_HOST", "").strip()
        token = self._get_setting("databricks_token") or os.environ.get("DATABRICKS_TOKEN", "").strip()
        if host:
            kwargs["host"] = host
        if token:
            kwargs["token"] = token
        return WorkspaceClient(**kwargs)

    def get_compute_info(self) -> tuple[str, str]:
        """Queries the Databricks API and returns (cluster_or_warehouse_name, state)."""
        sim = self._simulated_state or os.environ.get("SIMULATE_CLUSTER_STATE")
        if sim:
            name = self._compute_name or "Capacity Planning Spark Cluster"
            return name, sim.upper()

        from config import EnvironmentConfig
        # For VS Code, skip Databricks compute queries and run completely offline
        if EnvironmentConfig.is_vscode() and not self.is_cluster_configured():
            return "Local Storage", "LOCAL"

        storage_mode = EnvironmentConfig.get_storage_mode()
        cluster_id = self._get_setting("databricks_cluster_id") or os.environ.get("DATABRICKS_CLUSTER_ID", "").strip()
        warehouse_id = self._get_setting("databricks_warehouse_id") or os.environ.get("DATABRICKS_WAREHOUSE_ID", "").strip()

        # If user explicitly opted for local offline mode via STORAGE_MODE=local or STORAGE_MODE=csv
        if storage_mode in {"local", "csv"} and not cluster_id and not warehouse_id:
            return "Local Storage", "LOCAL"

        if not cluster_id and not warehouse_id:
            if EnvironmentConfig.is_vscode():
                return "Local Storage", "LOCAL"
            raise RuntimeError("DATABRICKS_CLUSTER_ID or DATABRICKS_WAREHOUSE_ID is required for Databricks compute.")

        client = self.get_workspace_client()

        if cluster_id:
            cluster = client.clusters.get(cluster_id)
            state = getattr(cluster.state, "value", str(cluster.state)).upper()
            name = getattr(cluster, "cluster_name", None) or getattr(cluster, "name", "")
            return (str(name) if name else self._compute_name or cluster_id), state

        warehouse = client.warehouses.get(warehouse_id)
        state = getattr(warehouse.state, "value", str(warehouse.state)).upper()
        name = getattr(warehouse, "name", "")
        return (str(name) if name else self._compute_name or warehouse_id), state

    def check_health_now(self) -> dict[str, str]:
        """Performs a direct single on-demand health check against Databricks API."""
        from config import EnvironmentConfig
        # For VS Code without configured compute, skip API check and return LOCAL
        if EnvironmentConfig.is_vscode() and not self.is_cluster_configured():
            new_status = {
                "state": "LOCAL",
                "cluster_name": "Local Storage",
                "message": "VS Code local mode active. Databricks compute checks disabled.",
                "can_read": "true",
                "is_offline": "false",
            }
            with self._status_lock:
                self._cluster_status = new_status
                self._last_status_check = time.time()
            return dict(new_status)

        try:
            name, state = self.get_compute_info()
            if name:
                self._compute_name = name

            if state == "LOCAL":
                new_status = {
                    "state": "LOCAL",
                    "cluster_name": "Local Storage",
                    "message": "Using local Pandas / CSV storage.",
                    "can_read": "true",
                    "is_offline": "false",
                }
                with self._status_lock:
                    self._cluster_status = new_status
                    self._last_status_check = time.time()
                return dict(new_status)

            elapsed_since_start = time.time() - self._startup_requested_at
            if self._startup_in_progress:
                if state == RUNNING_STATE:
                    self._startup_in_progress = False
                elif state in OFFLINE_STATES and elapsed_since_start < 45:
                    # Databricks takes 5-20s after API call to update state from STOPPED to STARTING.
                    # Preserve STARTING state during this transition window.
                    state = "STARTING"
                elif elapsed_since_start >= 300:
                    self._startup_in_progress = False

            new_status = format_cluster_status_dict(name, state)
            display_label = name or "Databricks compute"
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER STATUS] '{display_label}' State: {state} | {new_status['message']}",
                flush=True,
            )
            with self._status_lock:
                self._cluster_status = new_status
                self._last_status_check = time.time()
            return dict(new_status)
        except Exception as exc:
            new_status = {
                "state": ERROR_STATE,
                "cluster_name": self._compute_name,
                "message": f"{type(exc).__name__}: {str(exc)}",
                "can_read": "false",
                "is_offline": "false",
            }
            display_label = self._compute_name or "Databricks compute"
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER STATUS] '{display_label}' State: ERROR | {new_status['message']}",
                flush=True,
            )
            with self._status_lock:
                self._cluster_status = new_status
                self._last_status_check = time.time()
            return dict(new_status)

    def cluster_health(self, force_refresh: bool = False) -> dict[str, str]:
        """
        Returns cached status if queried within 6 seconds; otherwise queries Databricks.
        This rate-limits polling checks and prevents spamming the Databricks API.
        For VS Code without configured compute, immediately returns LOCAL without querying Databricks.
        """
        from config import EnvironmentConfig
        if EnvironmentConfig.is_vscode() and not self.is_cluster_configured():
            return {
                "state": "LOCAL",
                "cluster_name": "Local Storage",
                "message": "VS Code local mode active. Databricks compute checks disabled.",
                "can_read": "true",
                "is_offline": "false",
            }

        now = time.time()
        with self._status_lock:
            cached = dict(self._cluster_status)
            last_check = self._last_status_check
            state = cached.get("state", UNKNOWN_STATE)

        if not force_refresh and state != UNKNOWN_STATE and (now - last_check) < 6.0:
            return cached

        return self.check_health_now()

    def start_cluster(self) -> None:
        """Sends startup request to Databricks for the configured cluster or warehouse."""
        self._startup_in_progress = True
        self._startup_requested_at = time.time()
        target_name = self._compute_name or "compute"
        target_id = (
            self._get_setting("databricks_cluster_id")
            or self._get_setting("databricks_warehouse_id")
            or os.environ.get("DATABRICKS_CLUSTER_ID", "")
            or os.environ.get("DATABRICKS_WAREHOUSE_ID", "")
            or "compute"
        )
        print(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER ACTION] Starting Databricks compute: '{target_name}' ({target_id})...",
            flush=True,
        )

        sim = self._simulated_state or os.environ.get("SIMULATE_CLUSTER_STATE")
        if sim:
            # In simulated mode, transition from STARTING to RUNNING
            self._simulated_state = "STARTING"
            with self._status_lock:
                self._cluster_status = {
                    "state": "STARTING",
                    "cluster_name": self._compute_name,
                    "message": f"Startup for '{target_name}' has been initiated. Waiting for cluster to be ready...",
                    "can_read": "false",
                    "is_offline": "false",
                }
                self._last_status_check = time.time()
            return

        self._start_compute()
        with self._status_lock:
            self._cluster_status = {
                "state": "STARTING",
                "cluster_name": self._compute_name,
                "message": f"Startup for '{target_name}' has been initiated. Waiting for cluster to be ready...",
                "can_read": "false",
                "is_offline": "false",
            }
            self._last_status_check = time.time()

    def _start_compute(self) -> None:
        cluster_id = self._get_setting("databricks_cluster_id") or os.environ.get("DATABRICKS_CLUSTER_ID", "").strip()
        warehouse_id = self._get_setting("databricks_warehouse_id") or os.environ.get("DATABRICKS_WAREHOUSE_ID", "").strip()
        client = self.get_workspace_client()
        if cluster_id:
            client.clusters.start(cluster_id)
        elif warehouse_id:
            client.warehouses.start(warehouse_id)

    def pause_polling(self, reason: str = "app is idle") -> None:
        """Compatibility no-op for polling pause."""
        pass

    def resume_polling(self) -> None:
        """Compatibility no-op for polling resume."""
        pass

    def get_cursor(self):
        """
        Verifies compute is RUNNING and opens a database cursor via Databricks SQL connector.
        Raises ClusterStartingError if compute is not currently in RUNNING state.
        """
        with self._status_lock:
            cached_status = self._cluster_status

        state = cached_status.get("state", UNKNOWN_STATE)
        if state != RUNNING_STATE:
            raise ClusterStartingError(state)

        from databricks import sql

        workspace_client = self.get_workspace_client()

        cluster_id = self._get_setting("databricks_cluster_id") or os.environ.get("DATABRICKS_CLUSTER_ID", "").strip()
        warehouse_id = self._get_setting("databricks_warehouse_id") or os.environ.get("DATABRICKS_WAREHOUSE_ID", "").strip()
        host = self._get_setting("databricks_host") or os.environ.get("DATABRICKS_HOST", "").strip()
        token = self._get_setting("databricks_token") or os.environ.get("DATABRICKS_TOKEN", "").strip()

        if cluster_id:
            workspace_id = self._get_setting("databricks_workspace_id") or os.environ.get("DATABRICKS_WORKSPACE_ID", "").strip()
            if not workspace_id:
                clean_host = host.replace("https://", "")
                if clean_host.startswith("adb-") or clean_host.startswith("dbc-"):
                    workspace_id = clean_host.split("-")[1].split(".")[0]
                else:
                    workspace_id = "0"
            http_path = f"/sql/protocolv1/o/{workspace_id}/{cluster_id}"
        elif warehouse_id:
            warehouse = workspace_client.warehouses.get(warehouse_id)
            http_path = warehouse.odbc_params.path
        else:
            raise RuntimeError("DATABRICKS_CLUSTER_ID or DATABRICKS_WAREHOUSE_ID is required to open SQL cursor.")

        connect_kwargs = {
            "server_hostname": workspace_client.config.host.replace("https://", ""),
            "http_path": http_path,
        }

        if token:
            connect_kwargs["access_token"] = token
        else:
            connect_kwargs["credentials_provider"] = self._sql_credentials_provider(workspace_client.config)

        connection = sql.connect(**connect_kwargs)
        return connection.cursor()

    @staticmethod
    def _sql_credentials_provider(config):
        credentials_provider = getattr(config, "credentials_provider", None)
        if credentials_provider is not None:
            return credentials_provider

        authenticate = getattr(config, "authenticate", None)
        if authenticate is None:
            raise RuntimeError("Databricks SDK config does not expose a SQL credentials provider.")
        return lambda: authenticate


# ---------------------------------------------------------------------------
# Cluster UI Components & Modals
# ---------------------------------------------------------------------------

def cluster_offline_modal(cluster_name: str = "", state: str = "OFFLINE") -> ui.Tag:
    """Displays the floating modal prompting the user to start the stopped/offline compute."""
    display_state = state if state else "OFFLINE"
    has_name = bool(cluster_name and cluster_name.strip())

    if has_name:
        subtitle_text = (
            f"The compute cluster '{cluster_name}' is currently {display_state.lower()}. "
            "Would you like to start the cluster to load data and use the app?"
        )
    else:
        subtitle_text = (
            f"The compute cluster is currently {display_state.lower()}. "
            "Would you like to start the cluster to load data and use the app?"
        )

    badge_items = []
    if has_name:
        badge_items.extend([
            ui.div("CLUSTER NAME", class_="status-modal-id-label"),
            ui.div(
                cluster_name,
                class_="status-modal-id-value",
                style="color: #1a202c; font-size: 1.15rem; font-weight: 600; margin-bottom: 10px; word-break: break-word;",
            ),
        ])
    badge_items.extend([
        ui.div("COMPUTE STATUS", class_="status-modal-id-label"),
        ui.div(
            display_state.upper(),
            class_="status-modal-id-value",
            style="color: #e07000; font-size: 1.25rem; font-weight: 700;",
        ),
    ])

    return ui.modal(
        ui.div(
            ui.div(
                ui.div(
                    ui.HTML('''
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                    '''),
                    class_="status-modal-icon-circle cluster-offline",
                ),
                ui.div("Databricks Cluster is Offline", class_="status-modal-title"),
                ui.div(subtitle_text, class_="status-modal-subtitle"),
                ui.div(
                    ui.div(
                        *badge_items,
                        class_="status-modal-badge-card",
                        style="padding: 14px 20px; margin-bottom: 20px; text-align: center;",
                    ),
                    style="width: 100%; display: flex; justify-content: center;",
                ),
                ui.div(
                    ui.input_action_button(
                        "btn_start_cluster_confirm",
                        "Yes, Start Cluster",
                        class_="btn-primary",
                        style="min-width: 160px; font-weight: 700; padding: 10px 20px;",
                    ),
                    ui.input_action_button(
                        "btn_offline_modal_dismiss",
                        "Cancel",
                        class_="btn-outline-secondary",
                        style="min-width: 100px; padding: 10px 20px;",
                    ),
                    style="display: flex; justify-content: center; gap: 12px; margin-top: 6px;",
                ),
                class_="status-modal-content",
            ),
            class_="status-modal-wrapper",
        ),
        title=None,
        footer=None,
        easy_close=False,
        size="m",
    )


def cluster_starting_modal(cluster_name: str = "") -> ui.Tag:
    """Displays the floating modal with spinner while compute startup is in progress."""
    target_text = f" '{cluster_name}'" if cluster_name and cluster_name.strip() else ""
    return ui.modal(
        ui.div(
            ui.div(
                ui.div(class_="status-modal-spinner"),
                ui.div(f"Starting Databricks Cluster{target_text}...", class_="status-modal-title"),
                ui.div(
                    "Startup has been requested in Databricks. It usually takes 2 to 4 minutes for compute to become ready. The app will automatically connect and load data once online.",
                    class_="status-modal-subtitle",
                ),
                ui.div(
                    ui.input_action_button(
                        "btn_dismiss_starting_modal",
                        "Wait in Background",
                        class_="btn-outline-secondary compact-btn",
                        style="padding: 8px 18px;",
                    ),
                    style="display: flex; justify-content: center; margin-top: 10px;",
                ),
                class_="status-modal-content",
            ),
            class_="status-modal-wrapper",
        ),
        title=None,
        footer=None,
        easy_close=False,
        size="m",
    )


def cluster_error_modal(error_message: str) -> ui.Tag:
    """Displays error modal if cluster startup encountered an exception."""
    return ui.modal(
        ui.div(
            ui.div(
                ui.div(
                    ui.HTML('''
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    '''),
                    class_="status-modal-icon-circle error",
                ),
                ui.div("Cluster Startup Failed", class_="status-modal-title"),
                ui.div(
                    f"An error occurred while attempting to start the cluster: {error_message}",
                    class_="status-modal-subtitle",
                ),
                ui.div(
                    ui.input_action_button(
                        "btn_offline_modal_dismiss",
                        "Close",
                        class_="btn-outline-secondary compact-btn",
                        style="padding: 8px 20px;",
                    ),
                    style="display: flex; justify-content: center; margin-top: 10px;",
                ),
                class_="status-modal-content",
            ),
            class_="status-modal-wrapper",
        ),
        title=None,
        footer=None,
        easy_close=True,
        size="m",
    )


def session_inactive_modal() -> ui.Tag:
    """Displays modal when compute is offline and no activity detected for 30 minutes."""
    return ui.modal(
        ui.div(
            ui.div(
                ui.div(
                    ui.HTML('''
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    '''),
                    class_="status-modal-icon-circle inactive",
                ),
                ui.div("Session Inactive", class_="status-modal-title"),
                ui.div(
                    "The Databricks cluster is offline and no activity was detected for 30 minutes. Background polling has been paused to conserve resources.",
                    class_="status-modal-subtitle",
                ),
                ui.div(
                    ui.input_action_button(
                        "btn_resume_session",
                        "Resume Session",
                        class_="btn-primary",
                        style="min-width: 170px; font-weight: 700; padding: 10px 24px;",
                    ),
                    style="display: flex; justify-content: center; margin-top: 10px;",
                ),
                class_="status-modal-content",
            ),
            class_="status-modal-wrapper",
        ),
        title=None,
        footer=None,
        easy_close=False,
        size="m",
    )


def logout_confirmation_modal(user_email: str = "", databricks_host: str = "") -> ui.Tag:
    """Displays modal giving user choice to pause active session or log out of Databricks."""
    user_info = (
        ui.div(
            ui.div("LOGGED IN AS", class_="status-modal-id-label"),
            ui.div(
                user_email,
                class_="status-modal-id-value",
                style="color: #1a202c; font-size: 1.05rem; font-weight: 600;",
            ),
            class_="status-modal-badge-card",
            style="padding: 10px 18px; margin-bottom: 18px;",
        )
        if user_email
        else None
    )

    if databricks_host:
        clean_host = databricks_host if databricks_host.startswith("http") else f"https://{databricks_host}"
        databricks_logout_url = f"{clean_host.rstrip('/')}/login.html"
    else:
        databricks_logout_url = "/login.html"

    return ui.modal(
        ui.div(
            ui.div(
                ui.div(
                    ui.HTML('''
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    '''),
                    class_="status-modal-icon-circle logout-icon",
                ),
                ui.div("Log Out or End Your Session", class_="status-modal-title"),
                ui.div(
                    "You can end your active application session or sign out of your Databricks workspace completely.",
                    class_="status-modal-subtitle",
                ),
                user_info,
                ui.div(
                    ui.div(
                        ui.div(
                            ui.HTML('''
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #005eb8; margin-bottom: 8px;">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="10" y1="15" x2="10" y2="9"></line>
                                    <line x1="14" y1="15" x2="14" y2="9"></line>
                                </svg>
                            '''),
                            ui.div("End App Session", style="font-weight: 700; color: #1e293b; margin-bottom: 4px; font-size: 0.95rem;"),
                            ui.div("Pause background compute polling and lock your session without losing login credentials.", style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px; line-height: 1.35; flex-grow: 1;"),
                            ui.input_action_button(
                                "btn_confirm_end_session",
                                "End Session",
                                class_="btn-primary compact-btn",
                                style="width: 100%; font-weight: 700;",
                            ),
                            class_="session-option-box",
                        ),
                        ui.div(
                            ui.HTML('''
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #dc2626; margin-bottom: 8px;">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            '''),
                            ui.div("Log Out of Databricks", style="font-weight: 700; color: #1e293b; margin-bottom: 4px; font-size: 0.95rem;"),
                            ui.div("Sign out completely from your Databricks workspace and close this application.", style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px; line-height: 1.35; flex-grow: 1;"),
                            ui.tags.a(
                                "Log Out",
                                href=databricks_logout_url,
                                target="_top",
                                class_="btn btn-outline-danger compact-btn",
                                style="width: 100%; font-weight: 700; text-align: center; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;",
                            ),
                            class_="session-option-box",
                        ),
                        class_="session-options-row",
                    ),
                    style="margin-bottom: 16px; width: 100%;",
                ),
                ui.div(
                    ui.input_action_button(
                        "btn_dismiss_logout_modal",
                        "Cancel",
                        class_="btn-outline-secondary",
                        style="min-width: 100px; padding: 8px 22px;",
                    ),
                    style="display: flex; justify-content: center;",
                ),
                class_="status-modal-content",
            ),
            class_="status-modal-wrapper",
        ),
        title=None,
        footer=None,
        easy_close=True,
        size="m",
    )


def session_ended_modal(databricks_host: str = "") -> ui.Tag:
    """Displays modal when user manually ends session."""
    if databricks_host:
        clean_host = databricks_host if databricks_host.startswith("http") else f"https://{databricks_host}"
        databricks_logout_url = f"{clean_host.rstrip('/')}/login.html"
    else:
        databricks_logout_url = "/login.html"

    return ui.modal(
        ui.div(
            ui.div(
                ui.div(
                    ui.HTML('''
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    '''),
                    class_="status-modal-icon-circle inactive",
                ),
                ui.div("Session Ended", class_="status-modal-title"),
                ui.div(
                    "Your session has been ended and compute polling is paused. You can resume your session at any time or sign out completely.",
                    class_="status-modal-subtitle",
                ),
                ui.div(
                    ui.input_action_button(
                        "btn_resume_session",
                        "Resume Session",
                        class_="btn-primary",
                        style="min-width: 160px; font-weight: 700; padding: 10px 22px;",
                    ),
                    ui.tags.a(
                        "Log Out of Databricks",
                        href=databricks_logout_url,
                        target="_top",
                        class_="btn btn-outline-danger",
                        style="min-width: 160px; font-weight: 700; padding: 10px 22px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;",
                    ),
                    style="display: flex; justify-content: center; gap: 12px; margin-top: 10px;",
                ),
                ui.div(
                    "You may also safely close this browser tab.",
                    style="font-size: 0.78rem; color: #64748b; margin-top: 16px; text-align: center;",
                ),
                class_="status-modal-content",
            ),
            class_="status-modal-wrapper",
        ),
        title=None,
        footer=None,
        easy_close=False,
        size="m",
    )


def render_cluster_banner(cluster_info: dict[str, str], storage_mode: str = "databricks") -> ui.Tag | None:
    """Renders the top status banner when compute is stopped, starting, or in an error state."""
    state = cluster_info.get("state", "LOCAL")
    cluster_name = cluster_info.get("cluster_name", "")
    message = cluster_info.get("message", "")

    # Hide banner when local mode or compute is already running
    if storage_mode not in {"databricks", "spark"} or state == RUNNING_STATE or state == "LOCAL":
        return None

    banner_class = "ok" if cluster_info.get("can_read") == "true" else "warn"
    is_offline = cluster_info.get("is_offline") == "true" or state in OFFLINE_STATES
    is_starting = state in STARTING_STATES

    action_btn = None
    if is_offline:
        action_btn = ui.input_action_button(
            "btn_banner_start_cluster",
            "Start Cluster",
            class_="btn-primary compact-btn",
            style="margin-left: auto;",
        )
    elif is_starting:
        action_btn = ui.div(
            ui.tags.span(
                class_="spinner-border spinner-border-sm text-primary",
                role="status",
                style="width: 0.9rem; height: 0.9rem; margin-right: 6px;",
            ),
            ui.tags.span("Starting..."),
            style="margin-left: auto; display: flex; align-items: center; font-size: 0.85rem; font-weight: 700; color: #005eb8;",
        )

    display_state_label = f"{cluster_name}: {state}" if cluster_name else f"Cluster {state}"

    return ui.div(
        ui.tags.span(display_state_label, class_="health-state"),
        ui.tags.span(message),
        action_btn,
        class_=f"health-banner {banner_class}",
    )


def register_cluster_handlers(input: Inputs, output: Outputs, session: Session, engine: Any = None) -> dict[str, Any]:
    """
    Registers reactive lifecycle handlers, auto-polling effects, startup loops,
    inactivity checks, session management, and UI renderers for Databricks compute management.
    """
    from config import EnvironmentConfig

    if engine is None:
        from engine.data_engine import CapacityDataEngine
        engine = CapacityDataEngine()

    # Initial status lookup executed immediately on server connection
    cluster_info = reactive.value(engine.cluster_health())
    previous_cluster_state = None
    last_user_activity = time.time()
    is_app_inactive = reactive.value(False)
    cluster_modal_state = reactive.value("none")
    offline_modal_dismissed = reactive.value(False)
    cluster_poll_trigger = reactive.value(0)
    ui_mode = os.environ.get("CAPACITY_UI_MODE", "modern").lower()

    def _send_client_message(msg_type: str, payload: Any):
        """Safely dispatches custom message to client whether inside sync or async context."""
        try:
            res = session.send_custom_message(msg_type, payload)
            if asyncio.iscoroutine(res):
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(res)
                except RuntimeError:
                    pass
        except Exception:
            pass

    def _show_cluster_modal(modal_type: str, **kwargs):
        """Displays cluster floating modal: native React event in modern mode, Bootstrap modal in classic mode."""
        if ui_mode == "classic":
            if modal_type == "offline":
                ui.modal_show(cluster_offline_modal(cluster_name=kwargs.get("cluster_name", ""), state=kwargs.get("state", "OFFLINE")))
            elif modal_type == "starting":
                ui.modal_show(cluster_starting_modal(cluster_name=kwargs.get("cluster_name", "")))
            elif modal_type == "error":
                ui.modal_show(cluster_error_modal(kwargs.get("message", "An error occurred.")))
            elif modal_type == "inactive":
                ui.modal_show(session_inactive_modal())
            elif modal_type == "logout":
                ui.modal_show(logout_confirmation_modal(user_email=kwargs.get("user_email", ""), databricks_host=kwargs.get("databricks_host", "")))
            elif modal_type == "session_ended":
                ui.modal_show(session_ended_modal(databricks_host=kwargs.get("databricks_host", "")))
        else:
            payload = {"type": modal_type, **kwargs}
            _send_client_message("show_cluster_modal", payload)

    def _hide_cluster_modal():
        """Hides cluster floating modal across both modern React and classic Shiny modes."""
        if ui_mode == "classic":
            ui.modal_remove()
        else:
            _send_client_message("hide_cluster_modal", {})
            ui.modal_remove()

    def trigger_cluster_poll():
        cluster_poll_trigger.set(cluster_poll_trigger() + 1)

    @output
    @render.ui
    def cluster_banner():
        if ui_mode != "classic":
            # In modern React mode, React renders its own native Tailwind cluster banner
            return None
        storage_mode = EnvironmentConfig.get_storage_mode()
        return render_cluster_banner(cluster_info(), storage_mode=storage_mode)

    # Throttled user activity ping to track user presence
    @reactive.effect
    @reactive.event(input.user_activity_ping, ignore_none=True, ignore_init=True)
    def on_user_activity_ping():
        nonlocal last_user_activity
        with reactive.isolate():
            inactive = is_app_inactive()
        if not inactive:
            last_user_activity = time.time()

    # Inactivity monitor: if compute is offline and 30m pass without activity, pause polling
    @reactive.effect
    def check_user_inactivity():
        if EnvironmentConfig.is_vscode() and not engine.cluster_manager.is_cluster_configured():
            return
        if is_app_inactive():
            return
        now = time.time()
        idle_seconds = now - last_user_activity
        with reactive.isolate():
            info = cluster_info()
        state = info.get("state", "UNKNOWN")
        is_offline = info.get("is_offline") == "true" or state in OFFLINE_STATES
        if is_offline and idle_seconds >= 1800:  # 30 minutes
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [SESSION INACTIVE] 30m of user inactivity detected while cluster is offline. Pausing background activity.",
                flush=True,
            )
            is_app_inactive.set(True)
            cluster_modal_state.set("inactive")
            _show_cluster_modal("inactive")
            return
        reactive.invalidate_later(60)

    @reactive.effect
    async def poll_cluster_health():
        cluster_poll_trigger()
        # In VS Code local development, do not query or poll Databricks compute status
        if EnvironmentConfig.is_vscode() and not engine.cluster_manager.is_cluster_configured():
            local_status = {
                "state": "LOCAL",
                "cluster_name": "Local Storage",
                "message": "VS Code local mode active. Databricks compute checks disabled.",
                "can_read": "true",
                "is_offline": "false",
            }
            cluster_info.set(local_status)
            _send_client_message("update_cluster_status", local_status)
            return

        storage_mode = EnvironmentConfig.get_storage_mode()
        if storage_mode not in {"databricks", "spark"}:
            return

        if is_app_inactive():
            return

        try:
            health = await asyncio.to_thread(engine.cluster_health)
            cluster_info.set(health)

            # Broadcast updated cluster status to React client
            session.send_custom_message("update_cluster_status", health)

            state = health.get("state", "UNKNOWN")
            is_offline = health.get("is_offline") == "true" or state in OFFLINE_STATES
            is_starting = state in STARTING_STATES

            nonlocal previous_cluster_state
            prev_state = previous_cluster_state
            if prev_state is not None and prev_state != state:
                if is_offline and prev_state not in OFFLINE_STATES:
                    offline_modal_dismissed.set(False)
            previous_cluster_state = state

            with reactive.isolate():
                modal_state = cluster_modal_state()
                dismissed = offline_modal_dismissed()

            # If cluster is RUNNING (can_read == "true"):
            if health.get("can_read") == "true":
                if modal_state in {"starting", "offline_prompt"}:
                    print(
                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER READY] Poller detected RUNNING compute. Auto-closing modals and loading data.",
                        flush=True,
                    )
                    cluster_modal_state.set("none")
                    _hide_cluster_modal()
                    ui.notification_show("Databricks cluster is running! Loading data...", type="message", duration=5)
                    session.send_custom_message("update_env_status", engine.get_engine_status())
                # While RUNNING, check every 15s to detect if compute terminates from idle timeout:
                reactive.invalidate_later(15)
                return

            if modal_state == "starting":
                # Active foreground loop in on_start_cluster_confirmed is polling every 2s.
                # Schedule backup check in 5s:
                reactive.invalidate_later(5)
                return

            if is_starting:
                # While STARTING (e.g. user clicked Wait in Background), check every 3 seconds until RUNNING
                reactive.invalidate_later(3)
            elif is_offline:
                # Cluster is OFFLINE: show prompt modal if not dismissed
                if not dismissed and modal_state in {"none", "details"}:
                    cluster_name = health.get("cluster_name", "")
                    print(
                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER PROMPT] Cluster '{cluster_name}' is {state}. Displaying offline prompt modal to user.",
                        flush=True,
                    )
                    cluster_modal_state.set("offline_prompt")
                    _hide_cluster_modal()
                    _show_cluster_modal("offline", cluster_name=cluster_name, state=state)
                # STOP POLLING! The cluster is offline and user is notified.
                # App becomes completely idle. No reactive.invalidate_later!
                return
            elif state == "UNKNOWN":
                # Initial check still in flight, retry in 2 seconds
                reactive.invalidate_later(2)
            else:
                reactive.invalidate_later(15)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            error_msg = f"{type(exc).__name__}: {str(exc)}"
            cluster_info.set({
                "state": "ERROR",
                "cluster_name": engine.cluster_manager.compute_name,
                "message": error_msg,
                "can_read": "false",
                "is_offline": "false",
            })
            reactive.invalidate_later(15)

    @reactive.effect
    @reactive.event(input.btn_start_cluster_confirm)
    async def on_start_cluster_confirmed():
        nonlocal last_user_activity
        last_user_activity = time.time()
        with reactive.isolate():
            cluster_name = cluster_info().get("cluster_name", "")
        print(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER ACTION] User confirmed start cluster: '{cluster_name or 'Databricks Compute'}'.",
            flush=True,
        )
        cluster_modal_state.set("starting")
        _show_cluster_modal("starting", cluster_name=cluster_name)
        try:
            await asyncio.to_thread(engine.start_cluster)
            cluster_info.set(engine.cluster_health())
            trigger_cluster_poll()

            # Actively wait for compute to become ready in the foreground:
            start_time = time.time()
            while time.time() - start_time < 300:  # 5 minutes max
                await asyncio.sleep(2)
                with reactive.isolate():
                    current_modal = cluster_modal_state()
                if current_modal != "starting":
                    print(
                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER STARTUP] Modal closed or changed by user. Exiting foreground wait.",
                        flush=True,
                    )
                    break

                health = await asyncio.to_thread(engine.check_health_now)
                cluster_info.set(health)
                session.send_custom_message("update_cluster_status", health)
                state = health.get("state", "UNKNOWN")
                can_read = health.get("can_read") == "true"

                if can_read or state == "RUNNING":
                    print(
                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER READY] Cluster '{cluster_name}' is now RUNNING! Auto-closing modal and loading data.",
                        flush=True,
                    )
                    nonlocal previous_cluster_state
                    previous_cluster_state = "RUNNING"
                    offline_modal_dismissed.set(False)
                    cluster_modal_state.set("none")
                    _hide_cluster_modal()
                    ui.notification_show(
                        f"Databricks compute '{cluster_name or 'Cluster'}' is ready! Loading data...",
                        type="message",
                        duration=5,
                    )
                    session.send_custom_message("update_env_status", engine.get_engine_status())
                    session.send_custom_message("show_toast", {
                        "message": f"Databricks cluster '{cluster_name or 'Cluster'}' is online and ready!",
                        "type": "success"
                    })
                    trigger_cluster_poll()
                    return

            if time.time() - start_time >= 300:
                print(
                    f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [CLUSTER TIMEOUT] Startup wait timed out after 5 minutes.",
                    flush=True,
                )
                cluster_modal_state.set("none")
                _hide_cluster_modal()
                ui.notification_show("Cluster startup is taking longer than expected. Please check Databricks console.", type="warning", duration=8)

        except Exception as exc:
            import traceback
            traceback.print_exc()
            cluster_modal_state.set("error")
            _show_cluster_modal("error", message=str(exc))

    @reactive.effect
    @reactive.event(input.btn_offline_modal_dismiss)
    def on_offline_modal_dismissed():
        nonlocal last_user_activity
        last_user_activity = time.time()
        offline_modal_dismissed.set(True)
        cluster_modal_state.set("none")
        _hide_cluster_modal()

    @reactive.effect
    @reactive.event(input.btn_dismiss_starting_modal)
    def on_dismiss_starting_modal():
        nonlocal last_user_activity
        last_user_activity = time.time()
        cluster_modal_state.set("none")
        _hide_cluster_modal()
        trigger_cluster_poll()

    @reactive.effect
    @reactive.event(input.btn_banner_start_cluster)
    def on_banner_start_cluster():
        nonlocal last_user_activity
        last_user_activity = time.time()
        offline_modal_dismissed.set(False)
        with reactive.isolate():
            info = cluster_info()
        state = info.get("state", "OFFLINE")
        cluster_name = info.get("cluster_name", "")
        cluster_modal_state.set("offline_prompt")
        _show_cluster_modal("offline", cluster_name=cluster_name, state=state)
        trigger_cluster_poll()

    @reactive.effect
    @reactive.event(input.btn_resume_session)
    async def on_resume_session():
        nonlocal last_user_activity
        print(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [SESSION RESUME] User clicked Resume Session. Reactivating session.",
            flush=True,
        )
        is_app_inactive.set(False)
        last_user_activity = time.time()
        offline_modal_dismissed.set(False)
        cluster_modal_state.set("none")
        _hide_cluster_modal()
        storage_mode = EnvironmentConfig.get_storage_mode()
        if storage_mode == "databricks":
            try:
                health = await asyncio.to_thread(engine.check_health_now)
                cluster_info.set(health)
                session.send_custom_message("update_cluster_status", health)
                state = health.get("state", "UNKNOWN")
                is_offline = health.get("is_offline") == "true" or state in OFFLINE_STATES
                if is_offline:
                    cluster_name = health.get("cluster_name", "")
                    cluster_modal_state.set("offline_prompt")
                    _show_cluster_modal("offline", cluster_name=cluster_name, state=state)
            except Exception:
                pass
        trigger_cluster_poll()

    @reactive.effect
    @reactive.event(input.btn_logout_session)
    def on_click_logout_session():
        user_email = get_current_user(session)
        host = EnvironmentConfig.get_databricks_host()
        cluster_modal_state.set("logout_prompt")
        _show_cluster_modal("logout", user_email=user_email, databricks_host=host)

    @reactive.effect
    @reactive.event(input.btn_confirm_end_session)
    def on_confirm_end_session():
        nonlocal last_user_activity
        print(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [SESSION ENDED] User manually ended their session. App is now idle.",
            flush=True,
        )
        is_app_inactive.set(True)
        last_user_activity = time.time()
        cluster_modal_state.set("session_ended")
        host = EnvironmentConfig.get_databricks_host()
        _show_cluster_modal("session_ended", databricks_host=host)

    @reactive.effect
    @reactive.event(input.btn_dismiss_logout_modal)
    def on_dismiss_logout_modal():
        cluster_modal_state.set("none")
        _hide_cluster_modal()

    @session.on_ended
    def on_session_ended():
        print(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [SESSION CLOSED] Client disconnected. App is now idle.",
            flush=True,
        )

    # React JS bridge listener to trigger health check
    @reactive.effect
    @reactive.event(input.check_cluster_health_event)
    async def on_react_check_health():
        health = await asyncio.to_thread(engine.check_health_now)
        cluster_info.set(health)
        session.send_custom_message("update_cluster_status", health)
        session.send_custom_message("update_env_status", engine.get_engine_status())

    # React JS bridge listener to trigger start cluster
    @reactive.effect
    @reactive.event(input.start_cluster_from_react_event)
    def on_react_start_cluster():
        nonlocal last_user_activity
        last_user_activity = time.time()
        offline_modal_dismissed.set(False)
        with reactive.isolate():
            info = cluster_info()
        state = info.get("state", "OFFLINE")
        cluster_name = info.get("cluster_name", "")
        cluster_modal_state.set("offline_prompt")
        _show_cluster_modal("offline", cluster_name=cluster_name, state=state)
        trigger_cluster_poll()

    return {
        "cluster_info": cluster_info,
        "cluster_modal_state": cluster_modal_state,
        "offline_modal_dismissed": offline_modal_dismissed,
        "is_app_inactive": is_app_inactive,
        "trigger_cluster_poll": trigger_cluster_poll,
    }
