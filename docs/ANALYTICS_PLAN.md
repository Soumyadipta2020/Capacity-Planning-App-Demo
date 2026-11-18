# Analytics investigation tab: proposed scope

Source-based product analysis, 2026-11-18. Proposal only; no UI or calculation changes implemented.

## User and purpose

Assume primary users are national capacity planners and regional operational managers. Their investigation path is: locate pressure -> isolate geography/skill/week -> inspect contributing inputs -> compare a planning alternative -> review supporting records before acting.

Keep Executive Insights as the overview, Scenario Comparison as the side-by-side overview, and introduce a separate Analytics tab for investigation. Do not infer operational causes from scenario names or canned KPI profiles.

## Evidence from the October LV selected files

- Demand: 870 records, 10 patches, three skills, 29 weeks (2026-09-14 through 2027-03-29).
- Job times: 870 records, but only 157 demand records have an exact match on patch + skill + work code + week. Unmatched rows must remain visible; they cannot be treated as zero demand hours.
- Geography: 18 territories, covering only six of the ten demand patches by exact name. Keep an Unmapped group so national totals reconcile.
- Resource plan: ten employee rows, only three Active. Other rows are leavers/inactive, with some WMIS values at area level or zero. This is insufficient for credible full-network patch capacity.
- Each downtime representation has 3,480 records; percentage, hours, and hours/FTE are different representations requiring a precedence/combination rule before calculating total loss.
- Attrition and overtime are region/skill/week inputs; transfers use From/To area-like codes. Recruitment is cohort/region/skill/week. These must not be allocated to patches without an explicit allocation rule.
- Baseline productivity contains only one HEC rate; baseline assumptions contains standard hours only.
- Actuals files contain mixed imbalance/FTE metric rows in weekly wide format, not an established job completion/operational outcome dataset. Forecast accuracy and SLA attainment are not supported merely by the filename.

These findings describe the inspected scenario versions, not every file or deployment dataset.

## Investigation workspaces

| Workspace | Planner question | Drilldown and evidence | Availability |
| --- | --- | --- | --- |
| Demand drivers | Where and when does workload rise, and which work types drive it? | Week -> region/unmapped -> patch -> skill -> work code/product -> forecast rows; jobs, change from prior week, share of demand, matched job-time coverage | Jobs available now; hours only for matched records with confirmed units |
| Capacity composition | What staffing and external support are planned? | Region/skill/week -> active roster, transfers, overtime, contractors; show each source at its actual grain | Input summaries now; integrated net capacity requires calculation rules and coverage |
| Downtime | Which loss categories dominate or spike? | Patch/skill/week -> training, sickness, annual leave and detailed level2 -> original rows | Separate source measures now; combined hours require precedence rules |
| Recruitment and attrition | Will staffing arrive before peak demand, and how dependent is the plan on uncertain hires? | Region/skill -> cohort/week -> grounded vs ungrounded, probability, ramp profile, attrition assumptions | Input profiles now; effective productive FTE requires cohort joins and rate semantics |
| Support dependence | How reliant are regions on overtime, contractors, or cross-skill support? | Region/skill/week -> agency, authorization/status, support route, limits -> source records | Planned hours and limits now; replacement/removal impact requires integrated capacity |
| Coverage and pressure | Where are deficits concentrated, how severe, and how persistent? | Week x patch x skill heatmap -> consecutive deficit weeks, gross shortfall, gross surplus, net buffer, worst week -> demand/capacity build-up | Requires validated scenario calculation output; current demo outputs must be labeled |
| Scenario change investigation | Which changed inputs explain a different plan? | Scenario A/B -> changed file selections -> added/removed/changed rows at business keys -> metric deltas | File and record differences now; contribution attribution requires recalculation |
| Data coverage | Can this result be trusted? | Missing versions, unmapped geography, unmatched job times, duplicate keys, missing weeks, absent skill rates -> affected records | Core first-release feature |

## Example investigation journeys

1. A regional manager sees a demand peak: select the peak week, drill to patch and skill, rank work-code contributions, and inspect job times and match coverage. Determine whether volume or task mix is associated with the increase; quantify hour contributions only where supported.
2. A planner sees a capacity dip: inspect roster status, transfers, downtime and recruitment timing for the same scope. Show source movements first; call something a quantified driver only after a reconciled calculation supports it.
3. A manager wants to move training: inspect training concentration, compare affected weeks and available headroom, then create a scenario alternative. Avoid adding training table hours to overlay training loss unless they represent separate deductions.
4. A planner tests recruitment delay: compare grounded intake with probability-weighted ungrounded intake, join valid cohort ramps, and check the productive capacity timing against peak weeks. Probability weighting is an explicit planning assumption, not a guarantee.
5. A planner investigates cross-skill support: inspect donor HEC demand/capacity and receiving KAC/EV requirements together, support limits, and conversion efficiency. Receiving capacity must not be credited without the corresponding donor deduction.
6. A governance reviewer challenges a result: open the result's source trail, selected file versions, filters, formulas, exclusions, and unmatched records; export the same scope.

## Tab layout and interaction

Persistent context: saved scenario or clearly marked draft, comparator when relevant, week range, geography hierarchy, and skill. Work-code, downtime-category, cohort and agency filters appear in their relevant workspace. Derive dates from data.

Top area: scope summary and data coverage status. Main area: linked chart and ranked contribution table. Selecting a chart cell/bar or table row sets the investigation scope. Detail panel: trend, component measures, source rows, selected filename, units, formula and join/exclusion notes. Visible breadcrumb and reset controls preserve orientation.

CSV export includes the current filtered rows, source versions and calculation status. Respect source grain: region-only inputs stay regional when a patch is selected unless an approved allocation exists.

## Calculation contract before derived analytics

- Normalize inputs to common date, skill and geography codes while retaining original values, source file/version and source row identifiers.
- Keep separate facts at natural grain: demand patch/work-code/week; overlays patch/category/week; regional interventions; roster snapshots; recruitment cohorts. Validate join cardinality before aggregating.
- Validate job time units and uniqueness. Demand hours = jobs x applicable duration only for matched rows; publish jobs coverage and, where meaningful, matched volume percentage alongside the partial total.
- Confirm whether recruitment counts are weekly additions or repeated cohort totals, ramp week is relative or calendar-based, and attrition values are percentages, fractions or counts.
- Define which downtime inputs are alternatives and which are additive; account for training overlap.
- Confirm overtime/contractor status filters, productive efficiency, transfer geography and conservation, and cross-skill donor/recipient accounting.
- Calculate coverage as total comparable capacity hours / total comparable demand hours, never an unweighted mean of patch percentages. Zero demand has explicit handling.
- Preserve gross deficit and gross surplus separately from net imbalance. Show persistence and peak shortfall so surplus elsewhere cannot hide local pressure.
- Do not label coverage as SLA achievement without a service-level model or observed service outcomes.
- Publish calculated, partial, unavailable or demo status with provenance. Never substitute synthetic rows for missing analytical inputs silently.

## Delivery order

1. Separate Analytics navigation, selected-version loader, normalization/coverage checks, demand explorer, downtime explorer and source drilldown. This provides useful analysis from existing files without pretending the full capacity model is complete.
2. Agree and implement calculation rules, then add capacity build-up, deficit concentration/persistence, recruitment readiness and support dependence.
3. Scenario impact attribution through controlled recalculations, temporary what-if assumptions, and forecast-versus-actual evaluation once comparable actual measures exist.

Acceptance criteria: source totals reconcile under filtering; unmapped/unmatched rows remain accounted for; duplicate joins do not inflate totals; region-only values are not repeated per patch; input edits invalidate affected analytics; comparisons use aligned periods/grains; every displayed derived metric has a reproducible formula and selected-version trail.
