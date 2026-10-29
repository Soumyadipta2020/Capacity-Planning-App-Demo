# British Gas Field Capacity Planning Platform (React + PyShiny)

A production-grade Capacity Planning application combining a **Modern React 18 & Tailwind CSS Frontend** with a **PyShiny & PySpark Backend**. 

Engineered for **Dual Environment Execution**:
- **Production (Databricks Apps)**: Queries Databricks Unity Catalog (`catalog.schema.table`) with PySpark distributed calculation.
- **Development (VS Code)**: Runs locally with zero cluster spin-up cost using local Pandas/NumPy in `./data/`.
- **Zero Node.js Dependency**: The React frontend is compiled and served natively by PyShiny's ASGI server without requiring `npm` or `node` in your local environment or inside the Databricks container.

---

## 🌟 Key Capabilities & Redesigned UI

- **Modern React 18 UI Shell**:
  - Slim collapsible sidebar navigation with Centrica flame branding.
  - Live Environment Indicator Pill (`🔷 Databricks Apps (Unity Catalog)` vs `💻 VS Code (Local)`).
  - Quick Scenario selector pill with live synchronization to PyShiny backend.
  - Global Search (`Cmd + K`) for patches, skills, work codes, and leavers.
- **Scenario Studio (Home Redesign)**:
  - Bento Grid layout with 4 KPI summary cards (Total Demand, Available Capacity, Net Buffer, SLA Coverage).
  - Unified grid for all 21 inputs (Capacity Inputs, Capacity Config, Demand, Demand Config, Other Config, Actuals).
  - Every input card contains the file dropdown, **Delete** button, **Undo** button, and dynamic operational remarks.
  - Drag-and-drop bulk upload dropzone with auto-assignment.
- **Scenario Diff & Comparison**:
  - Side-by-side parameter diff highlighting what changed between Scenario A and Scenario B.
  - Delta Imbalance variance tables.
- **Interactive Dem vs Cap Matrix**:
  - Imbalances view with color-coded positive/negative badges (green for surplus, red for deficit).
  - Inday workload profile matrix across all 32 UK engineering patches.
- **New Feature Modules**:
  1. 🤖 **Capacity Copilot**: Slide-over AI assistant drawer for root-cause analysis, deficit explanation, and automated scenario suggestions.
  2. 🗺️ **UK Geospatial Imbalance Map**: Visual regional overview highlighting surplus and deficit territories.
  3. 📅 **Shift & Roster Planning**: Modeling 4-day compressed hours vs standard 37.5-hour shifts.
  4. 💰 **Financial Impact**: Cost waterfall analyzing direct labor vs overtime vs CTR contractor spend.
  5. ⚙️ **Unity Catalog Architecture Console**: Live inspection of Databricks Unity Catalog schemas and PySpark execution state.

---

## 🏛️ Technical Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MODERN BROWSER CLIENT                           │
│                                                                        │
│   React 18 + Tailwind CSS + Lucide Icons + Responsive Bento Grid       │
│   • Communicates with PyShiny via Shiny JavaScript bindings & events   │
│   • Zero Node.js build pipeline needed                                 │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Events (Save, Load, Delete)    │ Custom Messages
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PYSHINY & DATA ENGINE BACKEND                        │
│                                                                        │
│   [config.py] Auto-detects runtime environment:                        │
│                                                                        │
│   ┌─────────────────────────────────┐   ┌───────────────────────────┐  │
│   │   PRODUCTION: DATABRICKS APPS   │   │  DEVELOPMENT: VS CODE     │  │
│   │   • Engine: PySpark             │   │  • Engine: Pandas / NumPy │  │
│   │   • Storage: Unity Catalog (UC) │   │  • Storage: Local ./data/ │  │
│   │     `capacity_planning.gold.*`  │   │  • Hot Reload: Enabled    │  │
│   │   • Host: 0.0.0.0:DATABRICKS_PORT│  │  • Host: 127.0.0.1:8000  │  │
│   └─────────────────────────────────┘   └───────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

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

