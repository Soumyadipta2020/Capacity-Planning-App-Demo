"""
Databricks Unity Catalog Table Initializer & App Loader
-------------------------------------------------------
Workflow:
1. Verifies Databricks connection, cluster/warehouse compute, and Unity Catalog coordinates.
2. Checks all 21 operational input Delta tables + scenarios table in Databricks.
3. If any tables are not present, creates them in Databricks first and seeds them with baseline data.
4. Next, loads and launches the Capacity Planning PyShiny / React application using them.

Usage:
    # Check/create tables in Databricks first, next load the app:
    python init_databricks_tables.py

    # Verify/create tables only (without launching the web server):
    python init_databricks_tables.py --check-only

    # Run for a specific stage (e.g. dev, uat, prod):
    python init_databricks_tables.py --stage dev --port 8000
"""

import sys
import argparse
from pathlib import Path

# Ensure application root directory is on the Python path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from config import EnvironmentConfig
from engine.data_engine import CapacityDataEngine


def main():
    parser = argparse.ArgumentParser(
        description="Verify and create Databricks Unity Catalog tables, then load the Capacity Planning app."
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only verify/create tables in Databricks, do not launch the web app server."
    )
    parser.add_argument(
        "--stage",
        type=str,
        default="",
        help="Override Databricks stage ('dev', 'uat', 'prod')."
    )
    parser.add_argument(
        "--host",
        type=str,
        default="",
        help="Server host IP to bind (default from config or 127.0.0.1 / 0.0.0.0)."
    )
    parser.add_argument(
        "--port",
        type=int,
        default=0,
        help="Server port to bind (default from config or 8000)."
    )
    parser.add_argument(
        "--simulate",
        type=str,
        default="",
        help="Simulate cluster state (e.g. 'RUNNING', 'TERMINATED') for local development testing."
    )
    args = parser.parse_args()

    if args.stage:
        EnvironmentConfig.set_stage_override(args.stage)

    engine = CapacityDataEngine.get_instance()

    if args.simulate:
        engine.cluster_manager.set_simulated_state(args.simulate.upper())

    catalog = EnvironmentConfig.get_catalog()
    schema = EnvironmentConfig.get_schema()
    stage = EnvironmentConfig.get_stage()

    print("=" * 80)
    print(" BRITISH GAS | FIELD CAPACITY PLANNING PLATFORM")
    print(" DATABRICKS UNITY CATALOG PROVISIONING & APP RUNNER")
    print("=" * 80)
    print(f" Environment : {EnvironmentConfig.get_environment_name()}")
    print(f" Stage       : {stage.upper()}")
    print(f" Catalog     : {catalog}")
    print(f" Schema      : {schema}")
    print(f" Namespace   : `{catalog}`.`{schema}`")
    print("-" * 80)

    # -------------------------------------------------------------------------
    # STEP 1: If tables are not present in Databricks, create them in Databricks first
    # -------------------------------------------------------------------------
    print("\n[STEP 1/2] Verifying Databricks Unity Catalog tables...")
    res = engine.ensure_all_tables(async_init=False, auto_start_compute=True)

    status = res.get("status")
    if status == "success":
        created = res.get("created_tables", [])
        existing = res.get("existing_tables", [])
        
        if created:
            print(f"\n  [CREATED] Created {len(created)} missing table(s) in Databricks Unity Catalog:")
            for tbl in created:
                print(f"    + {catalog}.{schema}.{tbl} (Delta Lake format, seeded)")
        else:
            print(f"\n  [CHECK] All tables are already present in `{catalog}`.`{schema}`.")

        if existing:
            print(f"  [PRESENT] Verified {len(existing)} existing table(s) in `{catalog}`.`{schema}`.")

        print(f"\n  [STATUS] All {res.get('count', 22)} tables are verified and ready in Databricks!")
    else:
        reason = res.get("reason", "Local or offline execution mode active")
        print(f"  [INFO] Table auto-provisioning status: {reason}")
        print("  [INFO] Continuing with configured data engine.")

    if args.check_only:
        print("\n[Done] Table verification and provisioning completed (--check-only flag provided).")
        return 0

    # -------------------------------------------------------------------------
    # STEP 2: Next, load the app using them
    # -------------------------------------------------------------------------
    host = args.host or EnvironmentConfig.get_server_host()
    port = args.port or EnvironmentConfig.get_server_port()
    is_db = EnvironmentConfig.is_databricks()
    engine_status = engine.get_engine_status()

    print("\n" + "=" * 80)
    print("[STEP 2/2] Loading British Gas Capacity Planning application using verified tables...")
    print(f" UI Framework       : Modern React 18 + Tailwind CSS")
    print(f" Execution Engine   : {engine_status['engine_type']}")
    print(f" Storage Target     : {engine_status['storage_target']}")
    print(f" Calculation Mode   : {engine_status['calculation_mode']}")
    print(f" Server URL         : http://{host}:{port}")
    print("=" * 80 + "\n")

    import uvicorn
    uvicorn.run("app:app", host=host, port=port, reload=not is_db, log_level="info")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
