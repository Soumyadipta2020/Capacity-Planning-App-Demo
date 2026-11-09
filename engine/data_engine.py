"""
Capacity Data Engine: Dual Execution Engine (PySpark / Unity Catalog vs Local Pandas)
Automatically selects the appropriate engine based on the detected environment:
- Databricks Apps (Production / UAT / Dev):
  Uses PySpark / Databricks SQL Warehouse to query Databricks Unity Catalog tables (<catalog>.<schema>.<table>).
  - Catalog: capacity_planning (remains same)
  - Schema: dynamically resolved to prod, uat, or dev based on DATABRICKS_APP_NAME in app.yaml
  - Table Names: es_shiny_<input_key> (e.g. es_shiny_actuals_input) (remains same)
  - Scenarios Table: es_shiny_scenarios
  - Automatic Table Creation: If Unity Catalog tables do not exist upon deployment,
    creates the schema and Delta tables automatically and seeds them with baseline data.
- VS Code (Development):
  Uses local CSV engine or in-memory generator without requiring a Spark cluster.
"""

import os
import re
import json
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Set
import pandas as pd
import numpy as np

from config import EnvironmentConfig
from cluster_manager import ClusterManager, ClusterStartingError, RUNNING_STATE, OFFLINE_STATES

class CapacityDataEngine:
    """Manages data access, schema/table lifecycle, and calculation execution across Unity Catalog and local storage."""

    _instance: Optional["CapacityDataEngine"] = None

    @classmethod
    def get_instance(cls) -> "CapacityDataEngine":
        """Singleton accessor to share cluster status and table cache across modules."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.is_databricks = EnvironmentConfig.is_databricks()
        self.app_name = EnvironmentConfig.get_app_name()
        self.stage = EnvironmentConfig.get_stage()
        self.catalog = EnvironmentConfig.get_catalog()
        self.schema = EnvironmentConfig.get_schema()
        self._validate_identifier(self.catalog)
        self._validate_identifier(self.schema)

        self.spark = self._init_spark_session() if self.is_databricks else None
        self.data_dir = EnvironmentConfig.get_data_dir()
        self.cluster_manager = ClusterManager(EnvironmentConfig)

        # In-memory cache of verified Unity Catalog tables to avoid redundant DDL checks
        self._verified_tables: Set[str] = set()
        self._init_lock = threading.Lock()

    @staticmethod
    def _validate_identifier(identifier: str) -> None:
        """Validates Unity Catalog identifier to prevent SQL injection."""
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", str(identifier)):
            raise ValueError(f"Invalid Unity Catalog identifier: {identifier}")

    def _schema_name(self) -> str:
        """Returns backtick-quoted 2-level schema coordinate: `<catalog>`.`<schema>`."""
        self.catalog = EnvironmentConfig.get_catalog()
        self.schema = EnvironmentConfig.get_schema()
        return f"`{self.catalog}`.`{self.schema}`"

    def _full_table_name(self, table_name: str) -> str:
        """Returns backtick-quoted 3-level table coordinate: `<catalog>`.`<schema>`.`<table>`."""
        return f"{self._schema_name()}.`{table_name}`"

    def cluster_health(self, force_refresh: bool = False) -> Dict[str, str]:
        """Returns cached compute health or queries Databricks API."""
        return self.cluster_manager.cluster_health(force_refresh=force_refresh)

    def check_health_now(self) -> Dict[str, str]:
        """Forces an on-demand compute health check against Databricks."""
        return self.cluster_manager.check_health_now()

    def start_cluster(self) -> None:
        """Sends startup command to Databricks compute."""
        self.cluster_manager.start_cluster()

    def _init_spark_session(self):
        """Attempts to initialize or retrieve the active Databricks SparkSession."""
        try:
            from pyspark.sql import SparkSession
            spark = SparkSession.builder.appName("CapacityPlanningApp").getOrCreate()
            return spark
        except Exception:
            return None

    def is_databricks_active(self) -> bool:
        """
        Determines whether Databricks execution is active and compute is healthy and reachable.
        In VS Code, returns False so Databricks compute is not checked or queried.
        """
        if EnvironmentConfig.is_vscode() and not self.cluster_manager._simulated_state:
            if EnvironmentConfig.get_storage_mode() in {"local", "csv"} or not self.cluster_manager.is_cluster_configured():
                return False

        is_mode_db = (
            self.is_databricks
            or EnvironmentConfig.get_storage_mode() == "databricks"
            or self.cluster_manager._simulated_state is not None
        )
        if not is_mode_db:
            return False

        if not self.cluster_manager.is_cluster_configured():
            return False

        health = self.cluster_health()
        return health.get("can_read") == "true"

    def get_table_name(self, input_key: str) -> str:
        """Returns the Databricks table name (e.g. es_shiny_actuals_input)."""
        return EnvironmentConfig.get_table_name(input_key)

    def get_full_table_path(self, input_key: str) -> str:
        """Returns full Unity Catalog 3-level path (catalog.schema.table)."""
        return EnvironmentConfig.get_full_table_path(input_key)

    def get_engine_status(self) -> Dict[str, Any]:
        """Returns metadata about the active query and calculation engine and Unity Catalog paths."""
        self.stage = EnvironmentConfig.get_stage()
        self.catalog = EnvironmentConfig.get_catalog()
        self.schema = EnvironmentConfig.get_schema()
        self.app_name = EnvironmentConfig.get_app_name()
        self.is_databricks = EnvironmentConfig.is_databricks()

        has_spark = self.spark is not None
        if self.is_databricks and has_spark:
            engine_type = f"PySpark (Databricks Unity Catalog - {self.stage.upper()})"
            storage_target = f"Unity Catalog: `{self.catalog}`.`{self.schema}`"
            calc_mode = "Distributed PySpark Cluster"
        elif self.is_databricks and not has_spark:
            engine_type = f"Databricks Apps ({self.stage.upper()} - SQL Warehouse)"
            storage_target = f"Unity Catalog: `{self.catalog}`.`{self.schema}`"
            calc_mode = "Databricks SQL Warehouse (Arrow)"
        else:
            engine_type = f"Local Development (VS Code - {self.stage.upper()})"
            storage_target = f"Local Filesystem: {self.data_dir}"
            calc_mode = "Local Pandas / NumPy"

        health = self.cluster_health()
        return {
            "engine_type": engine_type,
            "is_databricks": self.is_databricks,
            "has_spark": has_spark,
            "app_name": self.app_name,
            "stage": self.stage,
            "catalog": self.catalog,
            "schema": self.schema,
            "storage_target": storage_target,
            "calculation_mode": calc_mode,
            "storage_mode": EnvironmentConfig.get_storage_mode(),
            "cluster_info": health,
            "cluster_name": self.cluster_manager.compute_name,
            "cluster_state": health.get("state", "LOCAL"),
            "table_mappings": EnvironmentConfig.get_all_table_mappings(),
            "tables_verified": list(self._verified_tables)
        }

    # ---------------------------------------------------------------------------
    # Seed Data Extraction & DDL Utilities
    # ---------------------------------------------------------------------------

    @staticmethod
    def _sql_literal(value: Any) -> str:
        """Formats a Python / Pandas value as a safe Databricks SQL literal."""
        if value is None or pd.isna(value):
            return "NULL"
        if isinstance(value, (bool, np.bool_)):
            return "TRUE" if value else "FALSE"
        if isinstance(value, (int, np.integer)):
            return str(value)
        if isinstance(value, (float, np.floating)):
            if np.isnan(value) or np.isinf(value):
                return "NULL"
            return str(value)
        # String or timestamp
        s = str(value).replace("'", "''")
        return f"'{s}'"

    @staticmethod
    def pandas_dtype_to_spark_sql(series: pd.Series, col_name: str = "") -> str:
        """Maps Pandas Series data types to Databricks Delta / Spark SQL data types."""
        if pd.api.types.is_integer_dtype(series.dtype):
            return "BIGINT"
        elif pd.api.types.is_float_dtype(series.dtype):
            return "DOUBLE"
        elif pd.api.types.is_bool_dtype(series.dtype):
            return "BOOLEAN"
        elif pd.api.types.is_datetime64_any_dtype(series.dtype):
            return "TIMESTAMP"
        else:
            try:
                non_null = series.dropna()
                if not non_null.empty and len(non_null) > 0:
                    pd.to_numeric(non_null)
                    return "DOUBLE"
            except Exception:
                pass
            return "STRING"

    @classmethod
    def _build_batch_insert_sql(cls, table_name: str, df: pd.DataFrame, batch_size: int = 100) -> List[str]:
        """Generates batch INSERT INTO statements for seeding Delta tables."""
        if df.empty:
            return []

        cols = [f"`{str(col).replace('`', '``')}`" for col in df.columns]
        cols_str = ", ".join(cols)

        statements = []
        num_rows = len(df)
        for start_idx in range(0, num_rows, batch_size):
            chunk = df.iloc[start_idx : start_idx + batch_size]
            value_rows = []
            for _, row in chunk.iterrows():
                row_literals = [cls._sql_literal(row[col]) for col in df.columns]
                value_rows.append(f"({', '.join(row_literals)})")

            sql = f"INSERT INTO {table_name} ({cols_str}) VALUES\n" + ",\n".join(value_rows)
            statements.append(sql)
        return statements

    def get_seed_dataframe(self, input_key: str, filename: str = None) -> pd.DataFrame:
        """
        Retrieves seed data for a given operational input.
        Prioritizes existing local CSVs in `./data/<folder>/` and falls back to `SampleDataGenerator`.
        Appends `file_version` column to support versioning in Delta Lake.
        """
        from data_manager import CATEGORY_FOLDER_MAP, _generate_sample_df_for_category, DEFAULT_INPUT_OPTIONS

        folder = CATEGORY_FOLDER_MAP.get(input_key, "capacity")
        target_dir = self.data_dir / folder
        default_version = (DEFAULT_INPUT_OPTIONS.get(input_key, ["baseline"])[0])
        effective_version = filename or default_version

        df: Optional[pd.DataFrame] = None

        # Check candidate files in directory
        if target_dir.exists():
            candidates = [
                target_dir / f"{effective_version}.csv",
                target_dir / f"{effective_version.replace(':', '-')}.csv",
                target_dir / effective_version,
                target_dir / f"{default_version}.csv",
                target_dir / f"{default_version.replace(':', '-')}.csv"
            ]
            for cand in candidates:
                if cand.exists() and cand.is_file():
                    try:
                        df = pd.read_csv(cand)
                        break
                    except Exception:
                        pass

        # Generator fallback
        if df is None or df.empty:
            df = _generate_sample_df_for_category(input_key)

        # Standardize column headers to string
        df.columns = [str(c) for c in df.columns]

        # Add file_version column if not present
        if "file_version" not in df.columns:
            df["file_version"] = effective_version

        return df

    # ---------------------------------------------------------------------------
    # Automatic Unity Catalog Table & Schema Lifecycle Management
    # ---------------------------------------------------------------------------

    def ensure_schema_exists(self, cursor=None) -> None:
        """
        Executes `CREATE SCHEMA IF NOT EXISTS <catalog>.<schema>` in Databricks.
        Supports both PySpark session and Databricks SQL Warehouse cursor.
        """
        schema_ident = self._schema_name()
        if self.spark is not None:
            try:
                self.spark.sql(f"CREATE SCHEMA IF NOT EXISTS {schema_ident}")
                return
            except Exception as e:
                print(f"[Warning] Spark CREATE SCHEMA failed: {e}")

        # SQL Warehouse cursor
        def _exec_create_schema(cur):
            try:
                cur.execute(f"CREATE CATALOG IF NOT EXISTS `{self.catalog}`")
            except Exception:
                pass
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_ident}")

        if cursor is not None:
            _exec_create_schema(cursor)
        else:
            with self.cluster_manager.get_cursor() as cur:
                _exec_create_schema(cur)

    def ensure_table_exists(self, input_key: str, cursor=None) -> bool:
        """
        Verifies whether the Unity Catalog table for `input_key` exists in Databricks.
        If it does not exist, automatically creates it (`CREATE TABLE IF NOT EXISTS ... USING DELTA`)
        and seeds it with initial data.
        """
        table_name = self.get_table_name(input_key)
        self._validate_identifier(table_name)
        full_table_path = self._full_table_name(table_name)

        if table_name in self._verified_tables:
            return True

        with self._init_lock:
            if table_name in self._verified_tables:
                return True

            # Mode 1: PySpark Session
            if self.spark is not None:
                try:
                    self.spark.sql(f"CREATE SCHEMA IF NOT EXISTS {self._schema_name()}")
                    table_exists = self.spark.catalog.tableExists(f"{self.catalog}.{self.schema}.{table_name}")
                    if not table_exists:
                        seed_df = self.get_seed_dataframe(input_key)
                        spark_df = self.spark.createDataFrame(seed_df)
                        spark_df.write.format("delta").mode("ignore").saveAsTable(full_table_path)
                        print(f"[Databricks Unity Catalog] Auto-created Delta table '{full_table_path}' with {len(seed_df)} seed records.")
                    self._verified_tables.add(table_name)
                    return True
                except Exception as e:
                    print(f"[Warning] Spark ensure table failed for '{full_table_path}': {e}. Trying SQL cursor.")

            # Mode 2: Databricks SQL Warehouse Cursor
            def _execute_with_cursor(cur):
                cur.execute(f"CREATE SCHEMA IF NOT EXISTS {self._schema_name()}")
                cur.execute(f"SHOW TABLES IN {self._schema_name()} LIKE '{table_name}'")
                rows = cur.fetchall()
                table_exists = len(rows) > 0

                if not table_exists:
                    seed_df = self.get_seed_dataframe(input_key)
                    col_defs = []
                    for col in seed_df.columns:
                        dtype = seed_df[col]
                        sql_type = self.pandas_dtype_to_spark_sql(dtype, col)
                        escaped_col = str(col).replace("`", "``")
                        col_defs.append(f"`{escaped_col}` {sql_type}")

                    ddl = f"CREATE TABLE IF NOT EXISTS {full_table_path} (\n  " + ",\n  ".join(col_defs) + "\n) USING DELTA"
                    cur.execute(ddl)

                    # Batch insert seed data
                    for stmt in self._build_batch_insert_sql(full_table_path, seed_df):
                        cur.execute(stmt)

                    print(f"[Databricks Unity Catalog] Auto-created Delta table '{full_table_path}' via SQL Warehouse with {len(seed_df)} records.")

                self._verified_tables.add(table_name)
                return True

            if cursor is not None:
                return _execute_with_cursor(cursor)
            else:
                with self.cluster_manager.get_cursor() as cur:
                    return _execute_with_cursor(cur)

    def ensure_scenarios_table(self, cursor=None) -> bool:
        """
        Verifies and auto-creates `es_shiny_scenarios` in Unity Catalog if it does not exist.
        Seeds it with default scenarios if newly created.
        """
        table_name = "es_shiny_scenarios"
        full_table_path = self._full_table_name(table_name)

        if table_name in self._verified_tables:
            return True

        with self._init_lock:
            if table_name in self._verified_tables:
                return True

            from data_manager import ScenarioManager
            default_scens = ScenarioManager._generate_default_scenarios()

            scen_rows = []
            for scen_id, scen in default_scens.items():
                scen_rows.append({
                    "id": scen["id"],
                    "plan_type": scen.get("plan_type", "LV"),
                    "month": scen.get("month", "OCT"),
                    "version": str(scen.get("version", "0")),
                    "remarks": scen.get("remarks", ""),
                    "created_at": scen.get("created_at", ""),
                    "inputs": json.dumps(scen.get("inputs", {}))
                })
            seed_df = pd.DataFrame(scen_rows)

            # Spark path
            if self.spark is not None:
                try:
                    self.spark.sql(f"CREATE SCHEMA IF NOT EXISTS {self._schema_name()}")
                    if not self.spark.catalog.tableExists(f"{self.catalog}.{self.schema}.{table_name}"):
                        spark_df = self.spark.createDataFrame(seed_df)
                        spark_df.write.format("delta").mode("ignore").saveAsTable(full_table_path)
                        print(f"[Databricks Unity Catalog] Auto-created scenarios Delta table '{full_table_path}'.")
                    self._verified_tables.add(table_name)
                    return True
                except Exception as e:
                    print(f"[Warning] Spark scenarios table init failed: {e}")

            # SQL cursor path
            def _execute_cur(cur):
                cur.execute(f"CREATE SCHEMA IF NOT EXISTS {self._schema_name()}")
                cur.execute(f"SHOW TABLES IN {self._schema_name()} LIKE '{table_name}'")
                rows = cur.fetchall()
                if not rows:
                    ddl = f"""
                    CREATE TABLE IF NOT EXISTS {full_table_path} (
                        `id` STRING,
                        `plan_type` STRING,
                        `month` STRING,
                        `version` STRING,
                        `remarks` STRING,
                        `created_at` STRING,
                        `inputs` STRING
                    ) USING DELTA
                    """
                    cur.execute(ddl)
                    for stmt in self._build_batch_insert_sql(full_table_path, seed_df):
                        cur.execute(stmt)
                    print(f"[Databricks Unity Catalog] Auto-created scenarios Delta table '{full_table_path}' via SQL Warehouse.")
                self._verified_tables.add(table_name)
                return True

            if cursor is not None:
                return _execute_cur(cursor)
            else:
                with self.cluster_manager.get_cursor() as cur:
                    return _execute_cur(cur)

    def ensure_all_tables(
        self,
        async_init: bool = False,
        auto_start_compute: bool = True,
        compute_timeout_seconds: int = 180
    ) -> Dict[str, Any]:
        """
        Ensures all 21 operational input Delta tables + scenarios table exist in Databricks.
        If tables are not present in Databricks, creates them in Databricks first and seeds them.
        Can run synchronously before app load or asynchronously in a background thread.
        """
        def _run_init():
            is_mode_db = (
                self.is_databricks
                or EnvironmentConfig.get_storage_mode() == "databricks"
                or self.cluster_manager._simulated_state is not None
            )

            # Auto-start compute if offline and configured
            if auto_start_compute and is_mode_db and self.cluster_manager.is_cluster_configured():
                if self.spark is None and self.cluster_manager._simulated_state is None:
                    health = self.cluster_health()
                    state = health.get("state", "UNKNOWN").upper()
                    if state in OFFLINE_STATES:
                        target_name = self.cluster_manager.compute_name or "compute"
                        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [Databricks Unity Catalog] Compute '{target_name}' is {state}. Starting compute before verifying tables...")
                        self.start_cluster()
                        start_wait = time.time()
                        while (time.time() - start_wait) < compute_timeout_seconds:
                            time.sleep(3.0)
                            curr_health = self.check_health_now()
                            curr_state = curr_health.get("state", "").upper()
                            if curr_state == RUNNING_STATE:
                                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [Databricks Unity Catalog] Compute is now RUNNING and ready for table queries.")
                                break
                            elif curr_state in ("ERROR", "UNKNOWN") and not self.cluster_manager._startup_in_progress:
                                break

            if not self.is_databricks_active() and self.spark is None:
                return {
                    "status": "skipped",
                    "reason": "Compute offline or not in Databricks mode",
                    "schema": self._schema_name(),
                    "tables_verified": list(self._verified_tables),
                    "count": len(self._verified_tables),
                    "created_tables": [],
                    "existing_tables": []
                }

            created = []
            already_existing = []

            # Mode 1: Spark Session
            if self.spark is not None:
                try:
                    self.ensure_schema_exists()
                    spark_tables = set()
                    try:
                        spark_tables = {t.name.lower() for t in self.spark.catalog.listTables(f"{self.catalog}.{self.schema}")}
                    except Exception:
                        pass

                    if "es_shiny_scenarios" not in spark_tables:
                        print(f"[Databricks Unity Catalog] Table 'es_shiny_scenarios' not found in {self._schema_name()}. Creating Delta table...")
                        self.ensure_scenarios_table()
                        created.append("es_shiny_scenarios")
                    else:
                        self._verified_tables.add("es_shiny_scenarios")
                        already_existing.append("es_shiny_scenarios")

                    for key in EnvironmentConfig.OPERATIONAL_INPUT_LABELS.keys():
                        tbl_name = self.get_table_name(key)
                        if tbl_name.lower() not in spark_tables:
                            print(f"[Databricks Unity Catalog] Table '{tbl_name}' not found in {self._schema_name()}. Creating Delta table...")
                            self.ensure_table_exists(key)
                            created.append(tbl_name)
                        else:
                            self._verified_tables.add(tbl_name)
                            already_existing.append(tbl_name)

                    return {
                        "status": "success",
                        "schema": self._schema_name(),
                        "created_tables": created,
                        "existing_tables": already_existing,
                        "tables_verified": list(self._verified_tables),
                        "count": len(self._verified_tables)
                    }
                except Exception as e:
                    print(f"[Warning] Spark ensure_all_tables error: {e}. Trying SQL cursor.")

            # Mode 2: Databricks SQL Warehouse Cursor
            try:
                with self.cluster_manager.get_cursor() as cur:
                    self.ensure_schema_exists(cursor=cur)

                    # Ensure scenarios table
                    scen_table = "es_shiny_scenarios"
                    was_verified = scen_table in self._verified_tables
                    self.ensure_scenarios_table(cursor=cur)
                    if not was_verified:
                        created.append(scen_table)
                    else:
                        already_existing.append(scen_table)

                    # Ensure all 21 operational tables
                    for key in EnvironmentConfig.OPERATIONAL_INPUT_LABELS.keys():
                        tbl_name = self.get_table_name(key)
                        was_verified = tbl_name in self._verified_tables
                        try:
                            self.ensure_table_exists(key, cursor=cur)
                            if not was_verified:
                                created.append(tbl_name)
                            else:
                                already_existing.append(tbl_name)
                        except Exception as e:
                            print(f"[Warning] Failed ensuring table for '{key}': {e}")
            except Exception as e:
                print(f"[Databricks Unity Catalog] Table initialization check error: {e}")

            return {
                "status": "success",
                "schema": self._schema_name(),
                "created_tables": created,
                "existing_tables": already_existing,
                "tables_verified": list(self._verified_tables),
                "count": len(self._verified_tables)
            }

        if async_init:
            t = threading.Thread(target=_run_init, daemon=True, name="DatabricksTableInitializer")
            t.start()
            return {"status": "background_thread_started"}
        else:
            return _run_init()

    # ---------------------------------------------------------------------------
    # Data Reading & Ingestion Across Unity Catalog & Local Storage
    # ---------------------------------------------------------------------------

    def load_table(
        self,
        input_key: str,
        fallback_generator=None,
        file_version: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Loads data from Unity Catalog table in production/UAT/dev (e.g. capacity_planning.dev.es_shiny_actuals_input).
        If the table does not exist, automatically creates it and seeds it.
        Falls back to local CSV or generator when running offline / locally.
        """
        table_name = self.get_table_name(input_key)
        full_table_path = self._full_table_name(table_name)

        # In VS Code local development without simulated state, bypass Databricks compute checks
        if EnvironmentConfig.is_vscode() and not self.cluster_manager._simulated_state and not self.is_databricks_active():
            from data_manager import CATEGORY_FOLDER_MAP
            folder = CATEGORY_FOLDER_MAP.get(input_key, "capacity")
            data_dir = self.data_dir / folder

            if file_version:
                local_csv = data_dir / f"{file_version.replace(':', '-')}.csv"
                if local_csv.exists():
                    return pd.read_csv(local_csv)

            local_tbl_csv = self.data_dir / f"{table_name}.csv"
            if local_tbl_csv.exists():
                return pd.read_csv(local_tbl_csv)

            local_csv_alt = self.data_dir / f"{input_key}.csv"
            if local_csv_alt.exists():
                return pd.read_csv(local_csv_alt)

            if fallback_generator:
                return fallback_generator()

            return self.get_seed_dataframe(input_key, filename=file_version)

        # Databricks compute check
        is_cluster_active = (
            self.is_databricks
            or EnvironmentConfig.get_storage_mode() == "databricks"
            or self.cluster_manager._simulated_state is not None
        )
        if is_cluster_active and self.cluster_manager.is_cluster_configured():
            health = self.cluster_health()
            if health.get("can_read") != "true":
                raise ClusterStartingError(health.get("state", "OFFLINE"))

        # Mode A: PySpark Session
        if self.is_databricks and self.spark:
            try:
                self.ensure_table_exists(input_key)
                df_spark = self.spark.read.table(full_table_path)
                if file_version and "file_version" in df_spark.columns:
                    filtered = df_spark.filter(df_spark.file_version == file_version)
                    if filtered.count() > 0:
                        df_spark = filtered
                return df_spark.toPandas()
            except Exception as e:
                print(f"[Warning] Spark read failed for table '{full_table_path}': {e}. Trying SQL cursor.")

        # Mode B: Databricks SQL Warehouse Cursor
        if is_cluster_active and self.cluster_manager.is_cluster_configured():
            try:
                self.ensure_table_exists(input_key)
                with self.cluster_manager.get_cursor() as cur:
                    where_clause = ""
                    if file_version:
                        try:
                            cur.execute(f"DESCRIBE {full_table_path}")
                            desc = cur.fetchall()
                            col_names = [r[0].lower() for r in desc]
                            if "file_version" in col_names:
                                where_clause = f" WHERE file_version = {self._sql_literal(file_version)}"
                        except Exception:
                            pass

                    query = f"SELECT * FROM {full_table_path}{where_clause}"
                    cur.execute(query)
                    try:
                        arrow_tbl = cur.fetchall_arrow()
                        df = arrow_tbl.to_pandas()
                    except Exception:
                        cols = [d[0] for d in cur.description]
                        df = pd.DataFrame(cur.fetchall(), columns=cols)

                    # If filtered query returned 0 rows, fallback to full table
                    if df.empty and where_clause:
                        cur.execute(f"SELECT * FROM {full_table_path}")
                        try:
                            df = cur.fetchall_arrow().to_pandas()
                        except Exception:
                            cols = [d[0] for d in cur.description]
                            df = pd.DataFrame(cur.fetchall(), columns=cols)

                    if not df.empty:
                        return df
            except ClusterStartingError:
                raise
            except Exception as e:
                print(f"[Warning] SQL Warehouse read failed for table '{full_table_path}': {e}. Using local fallback.")

        # Mode C: Development / Local CSV fallback
        from data_manager import CATEGORY_FOLDER_MAP
        folder = CATEGORY_FOLDER_MAP.get(input_key, "capacity")
        data_dir = self.data_dir / folder

        if file_version:
            local_csv = data_dir / f"{file_version.replace(':', '-')}.csv"
            if local_csv.exists():
                return pd.read_csv(local_csv)

        local_tbl_csv = self.data_dir / f"{table_name}.csv"
        if local_tbl_csv.exists():
            return pd.read_csv(local_tbl_csv)

        local_csv_alt = self.data_dir / f"{input_key}.csv"
        if local_csv_alt.exists():
            return pd.read_csv(local_csv_alt)

        if fallback_generator:
            return fallback_generator()

        return self.get_seed_dataframe(input_key, filename=file_version)

    def load_input_table_data(self, input_key: str, filename: str = None) -> Dict[str, Any]:
        """
        Loads operational input table data formatted for React UI display and PyShiny tables.
        Queries Databricks Unity Catalog when compute is running, else reads local storage.
        """
        df = self.load_table(input_key, file_version=filename)
        display_df = df.copy()

        # Clean nulls for JSON serialization
        display_df = display_df.where(pd.notnull(display_df), None)
        columns = [str(c) for c in display_df.columns]
        rows = display_df.to_dict(orient="records")

        table_name = self.get_table_name(input_key)
        full_path = f"{self.catalog}.{self.schema}.{table_name}"
        source = (
            f"Databricks Unity Catalog ({self.catalog}.{self.schema})"
            if self.is_databricks_active()
            else "Local Filesystem"
        )

        return {
            "success": True,
            "inputKey": input_key,
            "fileName": filename or table_name,
            "filePath": full_path,
            "columns": columns,
            "rows": rows,
            "totalRows": len(rows),
            "source": source,
            "format": "Delta Lake" if self.is_databricks_active() else "CSV"
        }

    # ---------------------------------------------------------------------------
    # Scenario Management in Unity Catalog
    # ---------------------------------------------------------------------------

    def load_scenarios(self) -> Dict[str, Any]:
        """
        Reads saved planning scenarios directly from `es_shiny_scenarios` in Unity Catalog.
        """
        table_name = "es_shiny_scenarios"
        full_table_path = self._full_table_name(table_name)
        self.ensure_scenarios_table()

        scenarios = {}
        with self.cluster_manager.get_cursor() as cur:
            cur.execute(f"SELECT id, plan_type, month, version, remarks, created_at, inputs FROM {full_table_path} ORDER BY created_at DESC")
            try:
                df = cur.fetchall_arrow().to_pandas()
            except Exception:
                cols = [d[0] for d in cur.description]
                df = pd.DataFrame(cur.fetchall(), columns=cols)

            for _, row in df.iterrows():
                scen_id = str(row["id"])
                inputs_val = row["inputs"]
                if isinstance(inputs_val, str):
                    try:
                        inputs_dict = json.loads(inputs_val)
                    except Exception:
                        inputs_dict = {}
                elif isinstance(inputs_val, dict):
                    inputs_dict = inputs_val
                else:
                    inputs_dict = {}

                scenarios[scen_id] = {
                    "id": scen_id,
                    "plan_type": str(row["plan_type"]),
                    "month": str(row["month"]),
                    "version": str(row["version"]),
                    "remarks": str(row["remarks"] or ""),
                    "created_at": str(row["created_at"] or ""),
                    "inputs": inputs_dict
                }
        return scenarios

    def save_scenario_to_databricks(self, scenario: Dict[str, Any]) -> None:
        """
        Persists a new or updated planning scenario to `es_shiny_scenarios` in Unity Catalog.
        Uses Delta MERGE INTO for idempotent persistence.
        """
        table_name = "es_shiny_scenarios"
        full_table_path = self._full_table_name(table_name)
        self.ensure_scenarios_table()

        scen_id = scenario["id"]
        plan_type = scenario.get("plan_type", "LV")
        month = scenario.get("month", "OCT")
        version = scenario.get("version", "0")
        remarks = scenario.get("remarks", "")
        created_at = scenario.get("created_at", "")
        inputs_json = json.dumps(scenario.get("inputs", {}))

        merge_sql = f"""
        MERGE INTO {full_table_path} AS target
        USING (
            SELECT
                {self._sql_literal(scen_id)} AS id,
                {self._sql_literal(plan_type)} AS plan_type,
                {self._sql_literal(month)} AS month,
                {self._sql_literal(version)} AS version,
                {self._sql_literal(remarks)} AS remarks,
                {self._sql_literal(created_at)} AS created_at,
                {self._sql_literal(inputs_json)} AS inputs
        ) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
            UPDATE SET
                target.plan_type = source.plan_type,
                target.month = source.month,
                target.version = source.version,
                target.remarks = source.remarks,
                target.created_at = source.created_at,
                target.inputs = source.inputs
        WHEN NOT MATCHED THEN
            INSERT (id, plan_type, month, version, remarks, created_at, inputs)
            VALUES (source.id, source.plan_type, source.month, source.version, source.remarks, source.created_at, source.inputs)
        """
        with self.cluster_manager.get_cursor() as cur:
            cur.execute(merge_sql)
        print(f"[Databricks Unity Catalog] Scenario '{scen_id}' merged into '{full_table_path}'.")

    def delete_scenario_from_databricks(self, scenario_id: str) -> None:
        """Deletes a planning scenario from `es_shiny_scenarios` in Unity Catalog."""
        table_name = "es_shiny_scenarios"
        full_table_path = self._full_table_name(table_name)
        self.ensure_scenarios_table()

        delete_sql = f"DELETE FROM {full_table_path} WHERE id = {self._sql_literal(scenario_id)}"
        with self.cluster_manager.get_cursor() as cur:
            cur.execute(delete_sql)
        print(f"[Databricks Unity Catalog] Scenario '{scenario_id}' deleted from '{full_table_path}'.")

    def append_uploaded_file_to_databricks(self, input_key: str, filename: str, df: pd.DataFrame) -> None:
        """
        Ingests user-uploaded records into the corresponding Unity Catalog Delta table.
        Appends `file_version = filename` for version tracking.
        """
        self.ensure_table_exists(input_key)
        full_table_path = self._full_table_name(self.get_table_name(input_key))

        upload_df = df.copy()
        upload_df["file_version"] = filename

        with self.cluster_manager.get_cursor() as cur:
            for stmt in self._build_batch_insert_sql(full_table_path, upload_df):
                cur.execute(stmt)
        print(f"[Databricks Unity Catalog] Uploaded {len(upload_df)} records for '{filename}' into '{full_table_path}'.")

    def run_imbalance_calculation(self, scenario_id: str, demand_file: str, resource_file: str) -> pd.DataFrame:
        """
        Executes imbalance calculation.
        In Databricks, runs via PySpark transformations on Unity Catalog tables.
        In VS Code, runs via Pandas.
        """
        if self.is_databricks and self.spark:
            try:
                demand_tbl = self._full_table_name(self.get_table_name('demand_input'))
                cap_tbl = self._full_table_name(self.get_table_name('resource_plan'))
                self.ensure_table_exists('demand_input')
                self.ensure_table_exists('resource_plan')
            except Exception:
                pass

        # Development / Local fallback:
        from data_manager import SampleDataGenerator
        return SampleDataGenerator.get_imbalance_data()
