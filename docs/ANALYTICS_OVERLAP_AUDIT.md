# Analytics overlap audit

2026-11-18. Source inspection of modern React UI, classic PyShiny UI, and calculation paths. Browser behavior was not reverified. Includes both the leadership capabilities and the eight requested investigation paths; these overlap and should not become separate duplicate modules.

## Existing evidence

Locations in `static/react_app.js`:

- `ScenarioExecutiveInsightsView` (~2806): KPI overview, weekly trajectory, territory health, FTE/downtime/productivity trends, input blueprint.
- `computeScenarioAnalytics` (~2533): fixed scenario-type/month profiles rather than calculation from selected input contents.
- `MonteCarloSimulationModal` (~1812): risk distribution, bell curve, executive stress-test examples (~2356), overtime guardrail and takeaway. Rerun (~2891) updates random values after a timer; CSV export uses predefined buckets.
- `ScenarioComparisonView` (~11050): two scenarios, geography/skill/date filters, hours/FTE, demand/capacity and delta tables, weekly comparison and waterfalls. Weekly values (~11175) use fixed equations and geography/skill multipliers, not selected scenario records; changing scenario IDs is not a calculation dependency there.
- `computeCapacityWaterfall` (~9889): gross hours and downtime components reverse-engineered from totals using fixed factors.
- `computeDemandWaterfall` (~10051): work-stream splits from fixed shares of totals. `WorkStreamRebalanceChart` (~10624) visualizes those derived shares.
- `DemVsCapView` (~11821): weekly imbalance matrix, filters, deficit-only view, averages/minima, weekly profile, regional view, inday view, per-row detail and CSV exports. Profile uses fixed series scaled by scenario profiles.
- `deficitActionRows` (~12122): per-negative-cell severity and recommendations; recommendations are canned rules, not evaluated interventions. Recalculate (~12154) changes timestamp after a timer.
- `InputTableViewModal` (~4969): source table search/sort/edit/bulk changes/export. `CalculationModulesModal` (~7604): formulas, module tables and metadata. Backend module values are generated samples.
- `validateFileItem` (~3930): upload format/schema checks. These are not cross-input analytical coverage checks.

Classic UI also has demand, capacity/FTE, recruitment, overlays, attrition, ramp, available hours and comparison views under `ui/`, with many outputs supplied by sample generators in `server_logic.py`. Existing classic tables are additional reuse/reference points, not evidence of an integrated calculation pipeline.

## Consolidated capability assessment

| Capability | Existing overlap | Missing analytical capability | Action |
| --- | --- | --- | --- |
| Plan assessment | Executive KPIs, trajectory, territory health, deficits and trend cards | Reconciled selected-input calculation, completeness and persistent exposure; approval conditions | Extend overview and link to investigation; no second KPI dashboard |
| Scenario comparison | Existing two-scenario comparison with filters, tables and chart/waterfall views | Content-based calculations, several-alternative scorecard, commitments and resilience trade-offs | Reuse existing comparison; add deeper analysis rather than a second pairwise screen |
| Regional/skill exposure and deficit concentration | Matrix, region/skill filters, deficit-only toggle, min/average, weekly/regional profiles, action rows | Consecutive deficit runs, gross shortfall/surplus, concentration and reconciliation | Extend/reuse matrix and regional components |
| Demand drivers | Demand tables, demand module, work-stream bridge and rebalance chart | Actual job-volume/work-mix/job-time contributions and source-key drilldown | Reuse waterfall/chart shell, replace fixed shares with validated facts |
| Capacity composition | FTE/capacity modules, input tables, classic capacity panels, capacity bridge | Integrated roster/recruitment/attrition/transfers/support accounting and source contributions | Reuse bridge and record viewer; implement calculation |
| Downtime | Overlay inputs, downtime module, trend card and category waterfall | Actual patch/skill/week/category contributions; representation precedence and overlap detection | Extend existing bridge/module; no duplicate generic loss chart |
| Recruitment readiness and decision timing | Grounded/ungrounded input tables, ramp tables, classic recruitment summaries | Cohort readiness at demand peak, delay scenarios, dependency and last-action dates | New analysis using existing inputs/viewers |
| Support/commitment dependence | Overtime, contractor, cross-skill inputs; demo overtime stress card and suggestions | Confirmed/provisional exposure, removal tests, support utilization/limits and residual gap | New analysis using existing inputs |
| Stress testing/resilience | Monte Carlo UI, fixed stress-case examples and risk displays | User-defined single/combined shocks, reproducible recalculation, local breakpoints and saved runs | Extend/replace demo behavior; reuse suitable modal/chart components |
| Sensitivity | No implemented parameter-response analysis found | Impact ranking over stated ranges, interactions, threshold/breakpoint analysis | New capability |
| Intervention comparison | Fixed overtime example, action recommendations and work-stream rebalance visualization | Recalculated alternatives with donor effects, feasibility, residual deficits and timing | New analysis behind reusable comparison/bridge components |
| Scenario changes and data coverage | Scenario metadata/input versions, raw-record viewer, upload validation, module formulas | Row/content diffs, identical-content detection, matched volume, geography conflicts, missing rates/weeks, provenance and reproducible review snapshots | Extend source tools; add cross-input evidence analysis |

## No-duplication product boundary

Keep current Executive Insights as the high-level entry. Keep Scenario Comparison as the existing two-scenario overview. Keep Demand vs Capacity as the matrix/profile explorer. Keep Scenario Inputs as the file selection and editing workspace.

The separate Analytics tab should add these linked investigations:

1. Drivers and evidence: demand, capacity, downtime, scenario changes and source coverage.
2. Commitments and readiness: recruitment, support dependence, timing and pressure concentration.
3. Stress and sensitivity: reproducible shocks, breakpoints and assumption impact.
4. Intervention choices: evaluated alternative actions and their displaced/residual effects.

Deep-link from existing views with scenario, geography, skill and period carried through. Share data calculations, filters, chart components and record viewers. Use one baseline/comparison state and one definition of every metric. Where the current app already has a good view, improve its calculation and expose the same component rather than create a competing version.

Cross-cutting decision brief export is an extension of existing exports, adding scope, assumptions, evidence status and rationale; it is not a second Power BI workflow. No functionality was changed as part of this audit.
