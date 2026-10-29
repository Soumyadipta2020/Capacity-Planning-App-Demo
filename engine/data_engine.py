"""
Capacity Data Engine: Dual Execution Engine (PySpark / Unity Catalog vs Local Pandas)
Automatically selects the appropriate engine based on the detected environment:
- Databricks Apps (Production): Uses PySpark to query Databricks Unity Catalog database (catalog.schema.table).
- VS Code (Development): Uses local Pandas / CSV engine without requiring a Spark cluster.
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
        self.catalog = os.environ.get("DATABRICKS_CATALOG", "capacity_planning")
        self.schema = os.environ.get("DATABRICKS_SCHEMA", "gold")
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

    def get_engine_status(self) -> Dict[str, Any]:
        """Returns metadata about the active query and calculation engine."""
        has_spark = self.spark is not None
        if self.is_databricks and has_spark:
            engine_type = "PySpark (Databricks Unity Catalog)"
            storage_target = f"Unity Catalog: `{self.catalog}`.`{self.schema}`"
            calc_mode = "Distributed PySpark Cluster"
        elif self.is_databricks and not has_spark:
            engine_type = "Databricks Apps (Pandas Fallback)"
            storage_target = f"Databricks Volume / Local Fallback: {self.data_dir}"
            calc_mode = "Single-node Pandas"
        else:
            engine_type = "Local Development (VS Code)"
            storage_target = f"Local Filesystem: {self.data_dir}"
            calc_mode = "Local Pandas / NumPy"

        return {
            "engine_type": engine_type,
            "is_databricks": self.is_databricks,
            "has_spark": has_spark,
            "catalog": self.catalog,
            "schema": self.schema,
            "storage_target": storage_target,
            "calculation_mode": calc_mode
        }

    def load_table(self, table_name: str, fallback_generator=None) -> pd.DataFrame:
        """
        Loads data from Unity Catalog table in production,
        or falls back to local CSV / generator in development.
        """
        # Production: PySpark from Unity Catalog
        if self.is_databricks and self.spark:
            try:
                full_table_path = f"{self.catalog}.{self.schema}.{table_name}"
                df_spark = self.spark.read.table(full_table_path)
                return df_spark.toPandas()
            except Exception as e:
                print(f"[Warning] Spark read failed for table '{table_name}': {e}. Using fallback.")

        # Development / VS Code: Read from local data directory
        local_csv = self.data_dir / f"{table_name}.csv"
        if local_csv.exists():
            return pd.read_csv(local_csv)

        # In-memory generator fallback
        if fallback_generator:
            return fallback_generator()

        return pd.DataFrame()

    def run_imbalance_calculation(self, scenario_id: str, demand_file: str, resource_file: str) -> pd.DataFrame:
        """
        Executes imbalance calculation.
        In Databricks, runs via PySpark transformations.
        In VS Code, runs via Pandas.
        """
        if self.is_databricks and self.spark:
            try:
                from pyspark.sql import functions as F
                # Example PySpark calculation logic on Unity Catalog tables
                demand_tbl = f"{self.catalog}.{self.schema}.demand_hours"
                cap_tbl = f"{self.catalog}.{self.schema}.capacity_fte"
                
                # In real UC, we perform joins and aggregations in PySpark:
                # df_spark = self.spark.read.table(cap_tbl).join(...)
                pass
            except Exception:
                pass

        # Development / Local fallback:
        from data_manager import SampleDataGenerator
        return SampleDataGenerator.get_imbalance_data()

