# Capacity Desk implementation

The default React + PyShiny workspace now uses the selected Capacity Desk direction. Existing input management, scenario storage, Databricks lifecycle handlers and specialist views remain available.

**Daily planner integration:** Capacity Desk remains the landing page. My review, What changed, My actions, Data health and Planning brief are separate views, with saved filters and persisted run/reference records. See [PLANNER-REVIEW.md](PLANNER-REVIEW.md) for the current workflow and persistence boundaries.

## Start locally

From this directory, in PowerShell:

```powershell
# First install only (a working .venv is already present in this workspace)
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt

# Start
$env:CAPACITY_PLANNING_ENV='vscode'
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. `CAPACITY_UI_MODE=classic` retains the classic PyShiny fallback. The precompiled frontend is included; Node is needed only after source edits:

```powershell
node tools/build-frontend.cjs
```

## What's implemented

- Capacity Desk: patch × skill × week gap matrix, selected-cell inspector, named drivers, explicit units and run state.
- Main analytics: demand/capacity trend with exact-value table, shortage ranking, skill pressure, separate net and uncovered hours, FTE-week conversion.
- Comparison: fixed source baseline against its proposal, matching scope and source snapshot, donor deductions in the capacity ledger.
- Input studio: the existing 21 categories, file preview, upload, scenario save, version selection, delete/undo selection and templates. Uploaded category membership survives restart. Backend confirmation determines upload success.
- Data & method: combined-hours template/import, source validation, hashes, formula explanations, research attribution and run snapshot replay.
- CSV exports use the displayed scope. JSON snapshots include the full run, frozen source hours, applied drivers and all selected input names. Edits block exports until recalculation.
- Existing tools: access to legacy finance, maps, architecture and other views, explicitly labelled as containing illustrative outputs.
- Locally served, pinned React dependencies and precompiled JSX. Responsive layout and keyboard focus styles.

## Source contract and operational limitation

The default dataset is a **synthetic 96-cell demonstration**, clearly labelled in the interface. No operational forecast or SLA accuracy is claimed.

The supplied raw files contain inconsistent schemas and planning periods: job-count demand, employee-level roster records, policy-level overtime and differently dated assumptions. The legacy calculation generators also do not reconcile to one dataset. They have not been silently joined into a purported production model.

Operational mode requires **weekly productive hours** in Demand Input and Resource Plan, with these shared keys:

```csv
region,area,patch,skill,week,demandHours,capacityHours
North,N1,Example patch,HEC,2026-11-16,100,80
```

The combined template can be imported into both categories directly from Data & method. The adapter requires matching, unique planning cells, finite non-negative hours and Monday dates. It rejects missing files, incompatible schemas, duplicate keys, inconsistent patch geography and unmatched source cells. In Databricks it queries the exact file version, with no full-table or local fallback.

Only the two validated hours sources and explicit proposal drivers feed the new core calculation. The other 19 categories remain managed and included in the manifest; their operational transformations require agreed business rules. Productive-hour inputs must already include the appropriate baseline downtime/productivity treatment. Automatically applying raw overlays again would double count them.

Uncovered hours are summed at patch × skill × week; a regional surplus cannot automatically cancel a shortage. Overtime adds hours per selected week. Recruitment adds FTE × hours/FTE-week with a linear ramp. Transfers deduct identical hours from the donor, including any resulting donor shortage. Operational eligibility and routing are outside this hours model.

Input scenarios persist file selections on the existing backend. Full calculation/driver snapshots can be downloaded/restored and are now also retained in the app-file planning history. This history is not yet a transactional multi-replica service or a Unity Catalog workflow. Replay checks calculation consistency, not cryptographic authenticity.

The existing Databricks provisioning/legacy tools still include example seeding and calculations. Live Databricks deployment and real production data were not verified in this local implementation.

## Source structure

| File | Responsibility |
| --- | --- |
| `planning_service.py` | Deterministic demonstration; strict local/Databricks source adapter; normalization and provenance |
| `static/planning-model.js` | Pure immutable driver calculations, aggregation, scope and CSV |
| `static/capacity-desk.jsx` | New workspace and reused input studio integration |
| `static/capacity-desk.css` | Scoped responsive design |
| `static/react_app.js` | Existing components and specialist workspace |
| `tools/build-frontend.cjs` | Build the ordered browser bundle |
| `static/capacity-app.js` | Generated browser bundle |
| `ui/modern_ui.py`, `app.py` | Bootstrap data, local assets and PyShiny message bridge |
| `data_manager.py` | Existing scenario persistence, strict previews, uploaded version catalog |

## Research basis

The detailed research log and published UI references are in the workspace's `ux-concepts/research-v4` folder. Oracle, ServiceNow, Salesforce and IFS informed scoped field-service planning; Genesys and Amazon Connect supplied staffing/scenario analogues. Their interaction patterns inform the UI, not a claim that their models validate this application's calculations.

## Verification

```powershell
.venv\Scripts\python.exe -m unittest discover -s tests -p test_planning_service.py -v
node tests/capacity-desk.check.cjs
.venv\Scripts\python.exe tests/test_app.py
.venv\Scripts\python.exe tests/test_cluster_management.py
.venv\Scripts\python.exe tests/test_table_provisioning.py
```

The Node check expects the app on port 8000. It checks actual HTTP assets, calculation invariants and the compiled JSX with a React hook harness. It is not a browser screenshot test. Databricks regression suites use mocks; they do not prove a live connection. The old `test_app.py` catches failures without a failing exit code: inspect its final success message.
