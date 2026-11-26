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

### Forecast planning expansion

Analytics now has 19 investigations across the same four areas. Actuals inputs are excluded from Analytics extraction, content comparisons, evidence selection and new calculations. The shared loader still serves the original scenario inputs for compatibility with the rest of the app. No delivery, forecast-accuracy or observed-productivity analysis is introduced.

Nine capabilities were added:

- **Target capacity planner** (Intervention Choices): user-selected coverage target, local productive-hour requirements and peak-week productive FTE equivalents. Unavailable model cells remain excluded. Surplus elsewhere never offsets requirements.
- **Commitment & supplier risk** (Commitments & Readiness): selected supplier or contribution withdrawal, recruitment delay/reduction, active supplier shares and regional weekly concentration. Uses fixed baseline-comparable cells so withdrawing the last capacity source cannot hide a shortage. Disabled model contributions remain explicitly disabled. This is deterministic, not a failure-probability model.
- **Demand peaks & capacity timing** extends Decision timing: forecast volume peaks, adjacent-week changes, consecutive growth runs, peak/average ratios and capacity-peak lag. Missing weeks break changes; unlike units are not subtracted. Capacity peaks use available comparable cells only. Existing intervention lead-time controls remain below.
- **Plan stability & headroom** (Stress & Sensitivity): demand-growth/capacity-loss tolerances, existing deficits and thin-headroom thresholds. Absence/productivity thresholds are local linear estimates before donor reallocation, with full stresses available in Combined stress tests.
- **Job-time review** (Drivers & Evidence): same-skill/work-code/week peer medians, configurable deviation flags and an explicit opt-in median-duration benchmark on matched scoped jobs. Peer scope retains other patches within selected geography; at least two distinct patches are required. This reviews assumptions, not engineer performance.
- **Workforce movements** (Commitments & Readiness): confirmation of effective starter/exit date semantics is required before calculating. Opening roster + starters − exits reconciles to closing roster; enabled net transfers and ramped recruitment are separate productive FTE equivalents. Inactive, duplicate, unmapped or invalid roster rows are excluded. Future move destinations and attrition units are never guessed. This date-confirmed view is separate from the existing model's snapshot/status rules.
- **Input reconciliation** (Drivers & Evidence): contractor hours versus stated FTE using selected standard hours, support limits, movement date issues and alternative downtime differences using matching patch roster evidence. Configurable percentage tolerance has a one-hour minimum. Flags require source-definition review and do not prove errors. Downtime alternatives are never summed.
- **Monthly outlook** (Drivers & Evidence): calendar week-start months or exact selected fiscal mappings, comparable totals, gross local weekly shortages, shortage-week counts, worst weeks and source drilldown. Missing/duplicate fiscal mappings remain a separate unmapped group; missing model evidence is not zero-filled.
- **Data-fix impact priorities** leads Data coverage: correction groups ranked by unique linked forecast job volume, then planning cells. Groups may overlap and should not be summed. Unquantified impact is not considered harmless. No financial or shortage benefit is inferred from fixing a record.

New views share the sticky scope toolbar, searchable/sortable evidence tables, exports and original-row drawers. CSV exports include scenario and scope. Decision briefs include visited forecast investigations, their local settings and results only when they match the current scenario/source snapshot/scope/model assumptions; original row payloads are omitted. Local controls do not modify saved scenarios.

Implementation is isolated in `static/forecast_analytics_engine.js` and `static/forecast_analytics_ui.js`. Run `node --test tests/test_forecast_analytics.cjs` for 13 deterministic calculation/edge-case tests and `node tests/forecast_analytics_ui_check.cjs` for control, confirmation, grouping, scope-focus and export checks. The expanded rendering check covers all 19 investigations; the live check verifies both new assets and saved-version loading.

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

## Plain-language planning summary

Decision Studio starts with Plan at a glance, calculated from selected source versions, current filters and model assumptions:

- Work covered: sum of min(required hours, nonnegative available hours) per assessed region/skill/week group, divided by assessed required hours. Surplus elsewhere cannot hide local shortages; coverage is capped at 100%.
- Hours still needed: gross shortage hours across assessed groups.
- Groups needing cover: groups short of hours, out of all assessed groups.
- Toughest week: week with the most gross shortage hours. Ties use the earliest week; no shortage means no peak.
- Extra cover reliance: overtime plus contractor hours divided by assessed available hours. This measures dependence, not probability or service-level performance.
- Jobs with time estimates: matched forecast job volume divided by all valid forecast job volume in current filters, including jobs outside assessed groups.

Unassessed groups and unmatched jobs remain explicit. Empty or zero-denominator metrics display Unavailable. Summary actions open related investigations; the largest-gap action also applies region, skill and week filters. Summary metrics are included in decision-brief JSON exports. Every investigation has a plain-language question and reading guidance.

Validate summary calculations, unknown states and navigation with `node --test tests/plan_health_check.cjs`. Rendering checks cover 19 investigations. Visual browser verification for this revision was unavailable because the browser access host was unavailable.

## Upcoming workload and readiness

Decision Studio now includes an editable planning date, defaulting to the browser's local calendar date. The selected date anchors to Monday; the current week's full forecast is included. Existing date/geography/skill filters still restrict the result. The next-four-week window uses four calendar weeks, not the next four submitted records; missing weeks are unknown, while submitted zeros remain zero. Busiest-demand-week uplift compares with the average across submitted upcoming weeks only. Location concentration and skill mix use valid dated forecast job volume, without capacity assumptions or actual-delivery data. Invalid, duplicate and undated demand rows are excluded and counted separately.

Readiness checks distinguish loaded files from compatible inputs: authoritative geography, unique job-duration matches, calendar coverage and explicit staffing/cover fields. Geography accepts both Territory/Region-letter and Patch/Region Code layouts, retaining original source rows. Conflicting mappings remain Unmapped; unmapped groups cannot be classified as assessed capacity. Generic overtime/contractor Values are not assumed to mean hours or confirmed cover. Their compatibility failures keep extra-cover reliance and withdrawal impact unavailable. A passing field check does not certify numeric validity, units, eligibility or complete staffing coverage.

The capacity action outlook reports the first future assessed shortage, weeks until it, and assumed recruitment/training/support lead times. Consecutive shortage runs break across missing, balanced and unassessed weeks. Extra-cover withdrawal reruns the model with overtime and contractor hours removed and compares on the original assessed population, so withdrawing the final capacity source cannot erase its shortage. Unassessed groups remain explicit. These are conditional planning estimates rather than service-level or supplier-failure predictions.

Upcoming workload and readiness are included in decision-brief JSON exports. Tests: `node --test tests/workload_outlook_check.cjs tests/plan_health_check.cjs tests/test_analytics_engine.cjs tests/test_forecast_analytics.cjs`. All 43 tests pass, and all 19 investigations render. The local server serves the updated assets successfully. Browser visual verification remains unavailable in this environment.

## Focused analytics presentation

Decision Studio defaults to a compact Plan summary rather than stacking every dashboard on one page. Four top-level views show one surface at a time: Plan summary, Upcoming workload, Data readiness and Investigations. Summary KPI cards retain short captions and direct drilldowns; full definitions are in a closed disclosure. Workload location/skill distributions, weekly calculation detail and capacity-action explanations are closed until requested. Readiness has a dedicated view; an always-visible warning button and review count remain on other loaded views when checks need attention. Advanced filters start collapsed, while the live scope toolbar remains available.

Switching views preserves filters, planning date, chosen investigation and decision notes. Summary and workload actions open the appropriate investigation directly. Loading and error messages remain available in every view; source drawers can open from readiness. Automated rendering/handler checks cover these transitions, single-surface rendering, collapsed filters, planning-date retention and all 19 investigations. Responsive grid rules preserve readable cards without fixed panel heights or nested content scrolling. Actual viewport fit and browser visual behavior remain unverified because browser preview access is unavailable.

## Dashboard visual refinement

The overview uses four primary KPI cards (work covered, shortfall, groups short and job-time match), with toughest week and extra-cover reliance in a secondary row. A demand/capacity chart and concise priority panel replace the explanatory block. Workload uses three compact figures, a weekly demand chart and skill distribution; geographic detail and calculation notes remain disclosures. Missing forecast weeks explicitly break the workload trend. Readiness uses seven short status rows with per-row details instead of expanded descriptive cards. Investigation introductions are also collapsed disclosures.

Navigation uses compact underlined controls; the duplicated collapsed filter header is replaced by Scenario & compare on the same toolbar. Source timestamps, assessment limits and data warnings remain visible without long introductory paragraphs. Styles use shared light/dark surface tokens and container-based responsive grids. Deleted scenario preferences now fall back to an available saved scenario instead of requesting a nonexistent preset.

The populated desktop summary, workload chart and readiness rows were inspected in the local Brave window. The final toolbar consolidation and side-by-side skill layout were verified through rendering/handler checks; mobile and dark-mode visual inspection remain outstanding. All 19 investigations and the summary/workload checks pass, including the stale-scenario fallback.
