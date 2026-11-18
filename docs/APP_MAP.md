# Application working map

Reviewed from repository source on 2026-11-18. This describes observed implementation, not a guarantee that deployment or browser behavior has been verified.

## Purpose and workflows

British Gas / Centrica field capacity planning demo. Planners select versioned operational inputs, save those selections as scenarios, inspect demand versus capacity by geography and skill, compare scenarios, edit input tables, and export data.

The modern navigation has Executive Insights, Scenario Inputs, Scenario Comparison, and Demand vs Capacity views. Additional workflows include bulk upload with validation, template download, geography filtering, calculation module inspection, an Excel-style table editor, a Copilot drawer, and compute/session dialogs.

## Architecture and change locations

| File | Responsibility |
| --- | --- |
| `app.py` | Shiny app entry point, modern/classic UI selection, React event handlers, startup table provisioning, Uvicorn runner |
| `static/react_app.js` | Main unbundled JSX application: components, client state, tables, filters, charts, validation, templates, comparison, demo analytics |
| `ui/modern_ui.py` | HTML shell, CSS, CDN scripts, initial backend data serialization |
| `ui/*_tab.py`, `ui/styles.py` | Classic PyShiny interface and styling |
| `server_logic.py` | Classic reactive handlers and outputs, shared input delete/undo behavior, downloads, environment switching |
| `data_manager.py` | Input catalog, remarks, CSV/Excel loading and saving, synthetic data generators, scenarios, calculation module metadata, Power BI file export |
| `engine/data_engine.py` | Databricks/local data access, schema and Delta table provisioning, versioned input storage, scenario storage |
| `cluster_manager.py` | Compute health/startup, SQL connections, user identity, inactivity/logout handlers, classic and modern modal bridge |
| `config.py` | Environment detection, storage mode, catalog/schema/table mapping, stage overrides, diagnostics |
| `app.yaml` | Databricks deployment command and environment settings |
| `init_databricks_tables.py` | Standalone table provisioning utility |
| `generate_sample_files.py` | Local sample file generation |
| `tests/` | Script-style and function-style checks for startup, editing, scenarios, compute lifecycle, and provisioning |

Modern UI is the default; `CAPACITY_UI_MODE=classic` selects the classic UI. React and ReactDOM 18, Tailwind, Babel Standalone, JSZip, and fonts load from external CDNs. JSX is transpiled in the browser; there is no npm build pipeline. The frontend file is about 786 KB, so changes frequently touch one large file.

## Runtime data flow

1. Importing `app.py` builds the UI. The modern wrapper preloads scenarios, first-choice input tables, calculation modules, imbalance/inday samples, geography data, and engine status into `window.INITIAL_CAPACITY_DATA`.
2. React initializes its state and caches from that object. Most modern interaction is React state; it sends selected actions through `Shiny.setInputValue`.
3. `app.py` receives save/load/upload/editor/calculation/export events and calls data-manager functions. It returns results through custom messages registered by React.
4. `register_server_handlers` also installs classic reactive outputs and shared handlers. `register_cluster_handlers` supplies compute polling and session dialogs.

Important bridge pairs:

| Client event | Server response |
| --- | --- |
| `save_scenario_event`, `load_scenario_event` | `update_scenario_data`, `show_toast` |
| `bulk_upload_event` | `show_toast` |
| `request_input_file_data` | `response_input_file_data` |
| `save_input_file_data` | `response_save_input_file_data` |
| `request_calc_module_data` | `response_calc_module_data` |
| `export_powerbi_scenario` | `response_export_powerbi` |

Compute/session custom messages include `update_env_status`, `update_cluster_status`, `show_cluster_modal`, and `hide_cluster_modal`. Editor and calculation requests carry request IDs; client caches are primarily keyed by filename or module key.

## Inputs and business model

There are 21 operational input categories:

- Actuals: historical actuals.
- Capacity: resource plan, FTE transfers, grounded and ungrounded recruitment, baseline assumptions, downtime percentages, downtime hours, downtime hours/FTE, overtime, baseline productivity, training SNM, CTR capacity.
- Capacity configuration: attrition and recruitment ramp configuration.
- Demand: forecast jobs.
- Demand configuration: job times, HEC-on-KAC support, HEC-on-EV support.
- Other configuration: geography mapping and week-to-month conversion.

Common dimensions include patch, skill (HEC/KAC/EV), work code, and week commencing. Some tables store weeks as columns; export converts imbalance data to long format. Geography supports national, region, ACDM, and territory selection. Several views have fixed 2026 planning horizons.

The displayed calculation model is FTE -> gross hours -> downtime -> available hours -> productivity/capacity; forecast jobs and job times -> demand hours; capacity minus demand -> imbalance, with 37.5 hours used for weekly FTE conversion. Much of this remains illustrative rather than an integrated calculation pipeline.

## Storage and scenarios

- Local inputs live under `data/{actuals,capacity,capacity_config,demand,demand_config,other_config}`.
- `DEFAULT_INPUT_OPTIONS`, `DEFAULT_REMARKS`, and `CATEGORY_FOLDER_MAP` in `data_manager.py` define the initial catalog. Upload registration changes module-level dictionaries and writes content; it does not persist a separate catalog/remarks index.
- Input reads try Databricks when active, then local files. Missing local versions can cause sample data to be generated and written during a read.
- Input edits write local CSV/Excel first and then attempt Databricks persistence. A Databricks write exception can be logged while the overall local save still reports success.
- Scenarios contain ID, plan type, month, version, remarks, creation timestamp, and a dictionary mapping input categories to selected filenames. They are references to versions, not immutable copies of their input contents.
- `ScenarioManager` stores `data/scenarios.json`; when Databricks is active it also reads/writes `es_shiny_scenarios`. Current checked-in JSON contains four scenarios: July LV, October LV, October HV, and November LV.
- Unity Catalog has one table per operational input plus scenarios. Input rows use `file_version`; uploads append rows, editor saves delete and reinsert a version.
- When a requested Databricks version is missing, read logic may return the full table. This can conceal a version mismatch.
- Local scenario and history updates use whole-file JSON writes; concurrent updates and immutable scenario snapshots are not implemented by those paths.

## Configuration and compute

`CAPACITY_PLANNING_ENV` overrides automatic environment detection. Databricks markers include app name, host, app ID, runtime version, and workspace ID. `STORAGE_MODE=local` or `csv` selects local storage; `databricks`, `delta`, or `spark` requests Databricks mode. Environment identity and storage selection are separate, so both matter when troubleshooting.

Catalog defaults to `capacity_planning`; schema resolves from explicit `DATABRICKS_SCHEMA`, stage-specific variables, or stage. App names containing `prod` or `uat` select that stage; otherwise dev. Table defaults are `es_shiny_<input_key>`.

The checked-in `app.yaml` instead configures catalog `project_data` and dev schema `capacity_planning_demo`, with a SQL warehouse ID. README examples differ from the deployment file.

Compute access uses Databricks SDK plus SQL connector, or an available PySpark session. Health checks cache results for six seconds. Compute startup, starting/offline/error modals, polling, inactivity, and logout have their own handlers. Simulation is supported through `SIMULATE_CLUSTER_STATE`. `python app.py` invokes provisioning with `auto_start_compute=True`, so launching in cloud mode can initiate compute and create/seed tables.

## Implemented versus simulated behavior

- Input read/edit/save, scenario persistence, and Databricks SQL/provisioning paths have concrete implementations; cloud execution has not been verified in this review.
- `computeScenarioAnalytics` in React assigns fixed KPI profiles based on scenario type/month/version; changing input contents does not establish a recalculated dashboard.
- Calculation module requests in `data_manager.py` call synthetic generators rather than calculating from all selected scenario inputs.
- `CapacityDataEngine.run_imbalance_calculation` ultimately returns sample imbalance data, including after its Spark setup branch.
- Many classic outputs call `SampleDataGenerator` directly.
- Copilot uses keyword-based canned replies in `handleSendCopilot`; it has no model/API integration.
- The Monte Carlo rerun handler changes displayed results using random values and a timer; the displayed trial count does not establish a real statistical simulation.
- Power BI export writes CSV, PBIDS, metadata JSON, and history under `data/exports`. It labels private/public targets but does not publish to Power BI or enforce workspace access/RLS. Exported imbalance values come from a sample generator with the requested scenario ID attached.

## Verification status and known gaps

This review inspected source, deployment settings, test implementations, local data organization, and scenario JSON. No application code or input data was changed during the review.

Runtime tests were not run: Python, `py`, and pytest were not discoverable on the current terminal PATH. Git was also not discoverable, so working-tree status could not be established through Git.

Before running the test suite, account for these properties:

- `test_app.py` starts a server at import time and performs writes/uploads. Other tests modify input data or use simulated cloud state. Run with isolated data and explicit local settings.
- Browser checks invoke a hard-coded Windows Edge executable and use DOM size/string assertions; these are limited evidence of user workflow correctness.
- `test_app.py` requests `favicon.png`, but only `static/favicon.ico` is present in the inspected static directory.
- `requirements.txt` lists Shiny, shinywidgets, Plotly, pandas, NumPy, and Uvicorn without pinned versions. It omits `python-dotenv` despite `config.py` importing dotenv. Cloud paths additionally import Databricks SDK/SQL connector; Excel paths need appropriate pandas Excel engines. Test code also imports requests.

Areas requiring care in future implementation: backend validation of category/filename paths, SQL literal handling (the editor DELETE interpolates filenames directly), cloud-write failure reporting, shared global environment/catalog state across sessions, cache invalidation after edits, persisted upload discovery, and replacing demo analytics with a single scenario calculation pipeline.
