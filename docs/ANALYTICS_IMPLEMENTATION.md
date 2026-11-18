# Analytics tab

Implemented in the modern React interface. The classic PyShiny interface is unchanged.

## Using the workspace

Choose **Analytics** in the sidebar. Select a saved scenario or the current draft input selections, a saved comparison baseline, geography, skill and week range. The tab reads exact selected versions; it does not generate missing data or substitute a different version. **Refresh sources** captures changes made to inputs after loading.

Four areas contain the twelve investigations:

- Drivers & Evidence: demand drivers, capacity composition, downtime, scenario changes, data coverage.
- Commitments & Readiness: deficit concentration/persistence, recruitment readiness, support dependence, decision timing.
- Stress & Sensitivity: combined stress tests, sensitivity and breakpoints.
- Intervention Choices: intervention impact comparison.

Charts, ranked rows and coverage issues open original source records. The evidence explorer also allows direct inspection of each selected input. Tables are paginated, and source records/differences/pressure cells can be exported to CSV. The decision brief is JSON containing scope, assumptions, model results, source fingerprints, evidence issues, pinned runs and rationale. It does not publish to Power BI.

The visual interface includes stacked skill-demand trajectories, workload/capacity comparison lines, work-code and evidence-coverage rings, contribution waterfalls, regional skill/week pressure heatmaps and signed sensitivity bars. Legends toggle individual series; week/segment/cell selection opens source evidence or focuses the shared scope. Hover and keyboard focus expose values, and range sliders are paired with exact numeric simulation inputs. Detailed tables remain in expandable evidence sections. Identical comparable inputs show an explicit no-change state. Simulation controls and their response chart sit side by side on wide screens.

Expanded components use consistent disclosure headers, nested evidence cards and searchable/sortable tables. Evidence drawers offer card/table layouts, skill/region facets, filtered exports, source versions and fingerprints. Scenario differences use a selectable business-key list with highlighted baseline/current fields; duplicate groups remain separate and unavailable comparisons are never labeled unchanged. Coverage issues use inspectable cards. Model assumptions open in a grouped settings drawer with live switches, units, loss representation and lead-time controls. Pinned runs appear as snapshot cards; “Load test settings” reuses their assumptions and shocks while retaining the current scenario and scope. Drawers support Escape, focus containment and focus return on close.

Pinned runs and rationale remain in browser memory across app-tab navigation; export before reloading or closing the page. Intervention comparison only reuses pinned runs when scenario, scope and source hashes match. No new server-side history or scenario overwrites are performed.

## Explicit model contract

Source facts are separated from an exploratory model. The current datasets do not establish a complete operational workforce forecast. Every pressure/simulation view identifies this limitation.

- Job times default to hours per job; the assumptions panel permits minutes. Exact patch + skill + work-code + week matches are required. Duplicate business keys are flagged and excluded from calculations. Unmatched demand is not zero-filled.
- Demand volume, work-mix and duration change contributions use all six factor orderings (a symmetric three-factor decomposition) on comparable patch/skill/week groups with complete matching work-code scope. Excluded groups remain visible.
- Authoritative selected geography is used over conflicting source region fields, with conflicts reported. Unmapped records stay identifiable; unmapped active roster rows do not create capacity.
- Active roster Hours × Allocation / 100 is repeated across selected weeks, subject to available update/leaver dates. Standard weekly FTE hours are an editable assumption (default 37.5).
- Only one downtime representation is applied: absolute hours, percentage of matching patch roster hours, or hours per FTE. Training SNM is supporting evidence and is not also deducted. Available roster hours are floored at zero.
- Authorized overtime and active contractor hours are included by default. Status is a source label, not a delivery guarantee. Regional inputs are excluded at patch scope because no patch allocation is established.
- Recruitment is off by default. Opt-in explicitly treats each dated row as a new weekly intake, with an editable linear ramp. Ungrounded intake is probability weighted; recruitment delay shifts its start. The supplied ramp cohorts and attrition units are not sufficiently defined to join/deduct automatically.
- Transfers and cross-skill support are opt-in. Location mapping must resolve; donor and recipient are modeled together before applying skill/region filters. Hours are capped at modeled donor availability. Support_Hours is interpreted as donor hours, with recipient credit multiplied by Ratio. This is a planned-hours calculation, not route/eligibility optimization; donors can still lose headroom.
- Coverage and pressure require matched demand and supplied capacity evidence. Incomplete demand cells are excluded unless the user explicitly enables matched-demand-only pressure calculations. Cells with no matched demand remain unavailable even after opt-in.
- Coverage is a ratio of comparable totals. Gross deficit and surplus are kept separate. Consecutive shortage runs break on missing or non-comparable weeks.
- Deterministic stress inputs affect demand, additional roster absence, roster productivity, recruitment timing, contractor/overtime cover and targeted additional productive hours. These are explicit assumptions, not probabilities. Source productivity in jobs/day is not multiplied into hours automatically.
- Decision dates subtract user-specified lead times from first modeled shortage. Recruitment also includes the assumed ramp to full productivity. No supplier promise, staffing feasibility or cost optimality is inferred.

## Files

- `engine/analytics_loader.py`: strict local/Databricks selected-version reads, JSON-safe records and order-independent content hashes.
- `static/analytics_engine.js`: normalization, evidence checks, deterministic model, persistence, content comparison and demand decomposition; also runnable in Node tests.
- `static/analytics_ui.js`: separate investigation workspace, filters, assumption controls, evidence dialogs, pinned runs and export.
- `static/analytics_charts.js`, `static/analytics.css`: responsive SVG chart components and scoped presentation styles; no production chart-package dependency.
- `static/analytics_details.js`, `static/analytics_details.css`: disclosures, evidence browsers, comparison workbench, model settings and pinned-run cards.
- `app.py`: `request_analytics_bundle` / `response_analytics_bundle` Shiny bridge.
- `ui/modern_ui.py`, `static/react_app.js`: script registration, navigation and message dispatch.

`python-dotenv` was added to requirements because configuration imports it.

## Validation

Passed:

1. Seventeen Node calculation tests: totals, missing/duplicate joins, patch exclusions, deterministic stresses, donor accounting, persistence, content/row differences, recruitment, units, decomposition, unmapped geography, invalid dates and missing inputs.
2. Seven isolated Python loader tests: stable hashes, null serialization, exact filenames, path validation, missing-file behavior, cloud failure and per-input reporting. Tests use temporary storage.
3. Live HTTP/static asset and Shiny WebSocket check: saved-scenario loading for all 21 sources, missing draft input and invalid scenario errors.
4. JSX parsing and server-side rendering of all twelve investigations, evidence/difference/issue dialogs and assumptions panel against the live fixture bundle. Fixture reconciliation confirms 33,828 jobs, 6,289 matched jobs and 522 demand-region conflicts. Actual event handlers were also exercised for skill filtering, investigation navigation, shock changes/reset, pinned-run immutability and source-evidence search/close; this is not a browser test.

Desktop browser QA subsequently became available for the visual redesign: the Analytics layout and demand charts were inspected in Edge, and series toggling, weekly source drilldown, evidence drawer close and a live demand-stress input/slider/chart update were verified. Chart-specific checks cover missing/empty values and keyboard/drilldown handlers. Mobile layouts and Databricks reads have not been verified against live environments.

The later expanded-component revision passed rendering, event-handler and live asset/API checks. A new visual browser inspection could not complete because the preview window remained minimized after a supported restore attempt. Dialog lifecycle checks use a small DOM boundary to verify focus containment, Escape and restoration; they are not a replacement for browser QA.

Reproduce calculation tests with `node --test tests/test_analytics_engine.cjs`. Run isolated loader tests with `.venv/Scripts/python.exe -m unittest discover -s tests -p test_analytics_loader.py`.

The live check targets localhost port 8010: start the app with local environment/storage settings and `.venv/Scripts/python.exe -m uvicorn app:app --host 127.0.0.1 --port 8010`, then run `.venv/Scripts/python.exe tests/analytics_live_check.py`. It writes a fixture bundle under ignored `.cache/` for rendering checks.

Rendering QA tools were installed only in ignored `.cache/analytics-qa` (React 18, ReactDOM 18, Babel core and React preset). After the live check, `node tests/analytics_render_check.cjs` performs the non-browser rendering checks. Production remains buildless and requires no Node installation.

Run `node tests/analytics_charts_check.cjs` for chart rendering and interaction checks using the same temporary QA dependencies.

Run `node tests/analytics_details_check.cjs` for expanded-component behavior: record layouts/facets/export, sorting without input mutation, content-difference states, settings, issue drilldown, pinned runs and dialog lifecycle.

## Investigation usability revision

The large lower evidence expander is replaced by an always-visible tabbed investigation workbench. Demand offers Patch & skill, Weekly totals, Work codes, Explain changes, Data gaps and How calculated. Tables provide scoped contributions, volume-weighted job-time coverage, matched hours, evidence row drilldown and contribution exports. Other investigations expose named record tables and preserve their source links and calculation notes under Definitions & sources, without repeating the overview charts and KPI cards.

A sticky Current view toolbar stays available during scrolling. Users can remove individual scope chips, clear all filters, undo up to 30 scope changes, step between available weeks, or open quick filters in place. Removing region also clears its dependent patch; removing a week preserves geography and skill. Scenario changes reset scope/history. Chart-week selections focus the view without opening a modal; selecting the same week again removes the week filter. Weekly-table evidence and Focus week are separate actions.

Rendering/event checks cover all twelve investigations plus actual scope undo/reset, chart-week toggle, table focus without a modal, independent chip removal, week boundaries, date ordering and keyboard tab navigation. Calculations and source-loading behavior are unchanged.

Desktop Edge inspection confirmed the new workbench and persistent toolbar while scrolled. Switching to Weekly totals, focusing its first week without opening a drawer, and using toolbar Undo restored all 29 planning weeks in place. Responsive rules are implemented; mobile browser behavior has not been visually verified.
