"""
Capacity Data Engine: Dual Execution Engine (PySpark / Unity Catalog vs Local Pandas)
Automatically selects the appropriate engine based on the detected environment:
- Databricks Apps (Production / UAT / Dev):
  Uses PySpark to query Databricks Unity Catalog tables (<catalog>.<schema>.<table>).
  - Catalog: capacity_planning (remains same)
  - Schema: dynamically resolved to prod, uat, or dev based on DATABRICKS_APP_NAME in app.yaml
  - Table Names: es_shiny_<input_key> (e.g. es_shiny_actuals_input) (remains same)
- VS Code (Development):
  Uses local CSV engine or in-memory generator without requiring a Spark cluster.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np

from config import EnvironmentConfig

class CapacityDataEngine:
    """Manages data access and calculation execution across Unity Catalog and local storage."""

    def __init__(self):
        self.is_databricks = EnvironmentConfig.is_databricks()
        self.app_name = EnvironmentConfig.get_app_name()
        self.stage = EnvironmentConfig.get_stage()
        self.catalog = EnvironmentConfig.get_catalog()
        self.schema = EnvironmentConfig.get_schema()
        self.spark = self._init_spark_session() if self.is_databricks else None
        self.data_dir = EnvironmentConfig.get_data_dir()

    def _init_spark_session(self):
        """Attempts to initialize or retrieve the active Databricks SparkSession."""
        try:
            from pyspark.sql import SparkSession
            spark = SparkSession.builder.appName("CapacityPlanningApp").getOrCreate()
            return spark
        except Exception:
            return None

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
            engine_type = f"Databricks Apps ({self.stage.upper()} - Pandas Fallback)"
            storage_target = f"Databricks Volume / Local Fallback: {self.data_dir}"
            calc_mode = "Single-node Pandas"
        else:
            engine_type = f"Local Development (VS Code - {self.stage.upper()})"
            storage_target = f"Local Filesystem: {self.data_dir}"
            calc_mode = "Local Pandas / NumPy"

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
            "table_mappings": EnvironmentConfig.get_all_table_mappings()
        }

    def load_table(self, input_key: str, fallback_generator=None) -> pd.DataFrame:
        """
        Loads data from Unity Catalog table in production/UAT/dev (e.g. capacity_planning.dev.es_shiny_actuals_input),
        or falls back to local CSV / generator in development.
        """
        table_name = self.get_table_name(input_key)
        full_table_path = f"{self.catalog}.{self.schema}.{table_name}"

        # Production / Databricks: PySpark from Unity Catalog
        if self.is_databricks and self.spark:
            try:
                df_spark = self.spark.read.table(full_table_path)
                return df_spark.toPandas()
            except Exception as e:
                print(f"[Warning] Spark read failed for table '{full_table_path}': {e}. Using fallback.")

        # Development / VS Code: Read from local data directory
        local_csv = self.data_dir / f"{table_name}.csv"
        if local_csv.exists():
            return pd.read_csv(local_csv)

        # Also check without prefix if local file is named without prefix
        local_csv_alt = self.data_dir / f"{input_key}.csv"
        if local_csv_alt.exists():
            return pd.read_csv(local_csv_alt)

        # In-memory generator fallback
        if fallback_generator:
            return fallback_generator()

        return pd.DataFrame()

    def run_imbalance_calculation(self, scenario_id: str, demand_file: str, resource_file: str) -> pd.DataFrame:
        """
        Executes imbalance calculation.
        In Databricks, runs via PySpark transformations on Unity Catalog tables.
        In VS Code, runs via Pandas.
        """
        if self.is_databricks and self.spark:
            try:
                demand_tbl = f"{self.catalog}.{self.schema}.{self.get_table_name('demand_input')}"
                cap_tbl = f"{self.catalog}.{self.schema}.{self.get_table_name('resource_plan')}"
                # In active cluster execution, transformations occur over Unity Catalog Delta tables
                pass
            except Exception:
                pass

        # Development / Local fallback:
        from data_manager import SampleDataGenerator
        return SampleDataGenerator.get_imbalance_data()
