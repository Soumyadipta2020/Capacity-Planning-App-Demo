# British Gas Field Capacity Planning Application (PyShiny)

A production-ready PyShiny web application for British Gas field engineering capacity and demand planning, scenario modeling, and operational forecasting.

---

## 🌟 Key Capabilities

- **Multi-Input Scenario Architecture**:
  Planners dynamically change individual file inputs across 6 distinct operational categories to generate, evaluate, and save distinct capacity scenarios (e.g. `LV JUL V.1`, `LV OCT V.0`, `HV OCT V.1`).
- **Dual-Environment Detection**:
  The application automatically detects whether it is running locally in **VS Code** or deployed inside a **Databricks Apps** container, automatically reconfiguring network binding (`127.0.0.1` vs `0.0.0.0`), port resolution, and data storage pathways (local filesystem `./data` vs Unity Catalog Volumes `/Volumes/...`).
- **Complete Visual & Tabular Alignment**:
  Faithfully recreates all screens from the production Centrica/British Gas system:
  - **Home**: Bulk File Upload, Category Assignment, Metrics Dropdowns, Scenario Save/Load/Delete/Download.
  - **Scenario Comparison**: Side-by-side comparison of baseline vs proposal across Demand Plots, Capacity Plots, and variance tables.
  - **Visuals**: High-level executive KPI cards, weekly trajectory charts, regional imbalance distributions, and skill breakdown.
  - **Dem vs Cap**: Imbalance calculations and Inday Workload profiles across 32 UK engineering patches and skills (`HEC`, `KAC`, `EV`).
  - **Demand**: National demand forecast job volumes and hourly workload conversion.
  - **Capacity**: FTE rosters, inter-patch transfers, downtime overlays (Percentage, Hours, Hours/FTE), baseline assumptions, bank hours, and SNM training cohorts.
  - **Capacity Configuration**: Regional attrition rates and new starter productivity ramp curves.
  - **Demand Configuration**: Standard job times, HEC-on-KAC cross-skilling support, and EV transition models.
  - **Configuration**: Geographical patch mapping, patch mismatch diagnostics, fiscal week-to-month calendar, and consolidated exports.
  - **About**: Real-time environment diagnostics and an interactive environment mode switcher.

---

## 🏗️ Architecture & Directory Structure

```
Capacity-Planning-App-Demo/
├── app.py                      # Main PyShiny entry point & uvicorn server runner
├── app.yaml                    # Databricks Apps configuration specification
├── config.py                   # Automatic environment detection & configuration
├── data_manager.py             # Scenario management & sample data generation
├── requirements.txt            # Python dependencies
├── generate_sample_files.py    # Sample CSV file population script
├── data/                       # Sample data storage root
│   ├── scenarios.json          # Persistent scenario definitions
│   ├── actuals/                # Historical actuals files
│   ├── capacity/               # FTE rosters, transfers, overlays, productivity
│   ├── capacity_config/        # Attrition rates & recruitment ramp curves
│   ├── demand/                 # Demand job volumes
│   ├── demand_config/          # Standard job times & cross-skill support
│   └── other_config/           # Geography mapping & week-to-month calendar
├── ui/                         # Modular UI definitions
│   ├── __init__.py
│   ├── styles.py               # British Gas blue theme & custom CSS
│   ├── home_tab.py             # Home tab (Bulk upload, Metrics, Scenarios)
│   ├── scenario_comparison_tab.py # Side-by-side comparison & plots
│   ├── visuals_tab.py          # Executive KPIs & analytics
│   ├── dem_vs_cap_tab.py       # Imbalances & Inday Workload
│   ├── demand_tab.py           # Demand jobs & hours
│   ├── capacity_tab.py         # Capacity navigation menu
│   ├── capacity_config_tab.py  # Capacity configuration navigation menu
│   ├── demand_config_tab.py    # Demand configuration navigation menu
│   ├── config_tab.py           # Configuration navigation menu
│   └── about_tab.py            # Live diagnostics & environment switcher
└── server_logic.py             # Reactive event handlers, calculations & data binding
```

---

## ⚙️ Environment Detection: VS Code vs Databricks Apps

The application inspects runtime markers via `config.py`:

| Parameter | VS Code (Local Mode) | Databricks Apps (Cloud Mode) |
|---|---|---|
| **Detection Markers** | Standard local environment (`VSCODE_PID`, local shell) | `DATABRICKS_APP_ID`, `DATABRICKS_HOST`, `DATABRICKS_RUNTIME_VERSION` |
| **Server Host** | `127.0.0.1` | `0.0.0.0` |
| **Server Port** | `8000` (or `PORT` env var) | `DATABRICKS_APP_PORT` |
| **Hot Reload** | Enabled (`reload=True`) | Disabled (production container) |
| **Data Storage** | `./data` (Local filesystem) | Unity Catalog Volume or `./data` |
| **Header Badge** | `ES Dev (VS Code / Local)` | `ES Dev (Databricks Apps)` |

> Planners can also switch between environments on-the-fly inside the **About** tab via the **Environment Mode Simulator** to preview how the app behaves in both environments.

---

## 🚀 Running the App

### 1. In VS Code / Local Terminal

Activate your Python environment and run:

```bash
# Option A: Run directly via Python (uses environment-aware configuration)
python app.py

# Option B: Run via PyShiny CLI
shiny run --reload app.py
```

Open your browser at [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

### 2. In Databricks Apps

1. **Verify `app.yaml`**:
   The repository contains `app.yaml`:
   ```yaml
   command:
     - "python"
     - "app.py"
   env:
     - name: "CAPACITY_PLANNING_ENV"
       value: "databricks"
     - name: "DATABRICKS_APP_NAME"
       value: "capacity-planning-app"
   ```

2. **Sync and Deploy using Databricks CLI**:
   ```bash
   # Sync workspace code
   databricks sync . /Workspace/Users/you/Capacity-Planning-App-Demo

   # Deploy the app to your Databricks Workspace
   databricks apps deploy capacity-planning-app --source-code-path /Workspace/Users/you/Capacity-Planning-App-Demo
   ```

3. Databricks Apps automatically spins up the container, runs `pip install -r requirements.txt`, starts `app.py` bound to `0.0.0.0:DATABRICKS_APP_PORT`, and attaches workspace single-sign-on (SSO).

---

## 📊 Complete Inputs Catalog

Every input is equipped with:
1. **Version Selection Dropdown**: Switch between available file revisions.
2. **Delete Button (`btn-danger-custom`)**: Removes the currently selected version from active options (with single-option deletion protection).
3. **Undo Button (`btn-action-custom`)**: Restores previously deleted revisions back to the dropdown choices and selects them.
4. **Dynamic Operational Remarks**: Displays specific governance or operational context for the selected version (e.g. `Remarks: Baseline Operating Plan V3 (Approved by Capacity Governance)`).

| Input Category | Configurable File Inputs with Delete, Undo & Remarks |
|---|---|
| **Actuals Input** | Actuals historical files |
| **Capacity Inputs** | Resource Plan (FTE Versions), FTE Transfer, Recruitment Grounded, Recruitment Ungrounded, Baseline Assumptions, Downtime Overlays Percentage, Downtime Overlays Hours, Downtime Overlays Hours/FTE, Overtime, Baseline Productivity, Training SNM, CTR Capacity |
| **Capacity Config Inputs** | Attrition, Recruitment Ramp Curves |
| **Demand Input** | National Demand Forecast Jobs |
| **Demand Config Inputs** | Job Time Assumptions, HEC on KAC Support, HEC on EV Support |
| **Other Config Inputs** | Geography Mapping, Week to Month Fiscal Conversion |

