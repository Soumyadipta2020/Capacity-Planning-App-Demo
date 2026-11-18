# Research for analytics people will use

2026-11-18. Desk research plus inspection of checked-in CSVs and app source. User interviews and observation have not yet been performed. User-confirmed workflow: teams supply demand, available FTE and other inputs; these are loaded into the app; senior leadership reviews the plan and runs multiple simulations to plan. Senior leadership is the primary audience. Proposed feature priorities still require validation against real decisions.

## Leadership workflow: revised primary recommendation

The main design target is executive scenario review and approval. Operational exploration remains supporting evidence rather than the initial screen. Leadership needs to answer: Is this plan credible? What could break it? Which alternative is better under our constraints? What do we need to commit now? What would make us revise the decision?

Recommended investigation areas for the separate Analytics tab:

| Leadership question | Analytics and simulation | Decision supported |
| --- | --- | --- |
| Can we approve the submitted plan? | Coverage over time, gross local shortfall, persistent skill/geography gaps, source completeness, and named planning assumptions | Approve, request revision, or approve conditionally |
| How much of the plan is secured? | Confirmed versus provisional recruitment/support inputs; modeled coverage with and without unconfirmed components; avoid treating current roster as guaranteed attendance | Seek commitments, add contingency, or reduce dependence |
| Which alternative gives the best trade-off? | Comparable scenario scorecard: worst-week gap, gross shortfall, affected scope, recruitment, overtime/contractor dependence, readiness and data completeness | Select a scenario based on explicit objectives; include currency only when costs exist |
| What breaks the chosen plan? | Demand, sickness, productivity, recruitment-delay and contractor-loss shocks; single and combined assumptions; breakpoint where targets first fail | Set contingency thresholds and escalation triggers |
| Which leadership lever matters most? | Sensitivity over realistic parameter ranges, feasible bounds, interactions and targeted scope | Focus attention on assumptions/interventions with material modeled effect |
| When must we decide? | Peak-pressure timeline against intervention lead time and productivity ramp | Commit hiring/training/support early enough to affect the target period |
| Where does the national story hide exposure? | Concentration by region/skill, gross deficit versus gross surplus, persistence, drilldown to assumptions | Target a regional intervention instead of applying a national uplift |
| Does a proposed fix move the problem elsewhere? | Donor/recipient and future-week before/after effects of transfers, cross-skilling and training moves | Reject interventions that displace rather than reduce shortages |
| What is the smallest change that meets our target? | Constrained search over explicitly allowed levers and bounds, returning residual gaps and infeasibility | Choose a sufficient intervention; call it minimum cost only when costs and constraints are modeled |
| What changed since the last review? | Frozen input/content comparison, assumption changes, scope/coverage changes and recalculated impact | Explain revisions and prevent unexplained movement in the executive narrative |

Leadership-specific product structure:

1. Plan assessment: a concise statement of scope, targets, pressure periods, largest exposures and data limitations.
2. Alternatives: pin an approved baseline, compare several named scenarios with identical scope and units, expose trade-offs and show when no option dominates.
3. Stress tests: a small library of named assumptions plus custom adjustments; test individual and combined shocks, with deterministic results first.
4. Explain and decide: drilldown to component bridges and source inputs; retain selected option, rationale, assumptions and conditions for revisiting it in an exportable decision brief.

Use language that separates outputs: workload coverage is a modeled ratio; actual service performance is an observed outcome; uncertainty probability requires calibrated distributions. Leadership must be able to distinguish a deterministic stress case, an expected-value planning assumption, and a calibrated probabilistic simulation.

The existing fixed-profile KPIs and randomized Monte Carlo handler must not feed the new leadership comparisons. Content-identical demand versions must yield identical demand analytics. A leadership-ready release requires a reproducible common calculation model even if its first scope is deliberately small.

Suggested first leadership prototype tasks: compare a submitted plan with a delayed-recruitment alternative; assess a demand uplift combined with higher absence; see which regions/skills fail first; compare targeted overtime versus additional contractor hours; explain which decisions are supported or unavailable with current data. Percentage changes are user-defined test assumptions, not claimed forecasts.

Research should start with senior approvers and the analysts preparing their packs: inspect the last review pack, alternatives considered, approval conditions, disputed assumptions and actual decisions. Evaluate whether they can choose and justify a plan, detect hidden exposure and identify an unsupported conclusion. Record time and clarity of decision, not only time to explore a chart.

The operational discovery matrix below remains a supporting catalog. Its numeric priority order is provisional and is superseded by this leadership emphasis.

## Product direction

The Analytics tab should help a planner decide what needs attention, explain the evidence, assess feasible responses, and retain a reproducible decision. Its unit of work should be an investigation with scope, evidence, assumptions and an action, rather than an isolated chart.

Separate three horizons: near-term exceptions and available interventions; medium-term recruitment/training/support readiness; longer-term structural skill/geography mismatch. Do not confuse this weekly planning app with appointment-level dispatch optimization.

## External evidence and implications

1. [Microsoft: Resource Scheduling Optimization goals](https://learn.microsoft.com/en-us/dynamics365/field-service/rso-optimization-goal) describes working-hour, skill/proficiency and scheduling-window constraints, and ordered objectives. Implication for this app: aggregate surplus does not establish that engineers can serve another location/skill. Transfer and cross-skill opportunities need eligibility constraints; an unvalidated opportunity is only a candidate.
2. [Salesforce: Workforce Scheduling capabilities](https://trailhead.salesforce.com/content/learn/modules/workforce-scheduling-for-field-service-and-operations/explore-workforce-scheduling-capabilities) treats skills, travel, service territories, operating hours and priorities as field scheduling inputs. Implication: classify weekly capacity as planned, eligible and eventually schedulable; current files cannot establish route feasibility.
3. [NHS England: Demand and capacity models](https://www.england.nhs.uk/ourwork/demand-and-capacity/service-level-demand-and-capacity-planning/models/) includes demand variability in required capacity. This is a cross-domain capacity-planning principle, not evidence about British Gas workflows. Implication: averages and a single national buffer are insufficient; inspect timing, persistence, peaks and sensitivity. The page's search-index summary was accessible; direct page access was blocked by site verification.
4. [Hyndman and Athanasopoulos: Forecasting toolbox](https://otexts.com/fpp3/toolbox.html) covers genuine forecast evaluation, prediction intervals and time-series cross-validation. Implication: demand scenarios are not calibrated probabilities; compare forecasts issued before an outcome against matched actuals, by forecast horizon, before claiming confidence or forecast quality.
5. [GOV.UK: Learning about users and their needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs) recommends interviewing and observing users and treating unvalidated suggestions as assumptions. Implication: desk research generates candidate investigations; actual planning meetings and recent decisions determine priorities.
6. [GOV.UK: Setting performance metrics](https://www.gov.uk/service-manual/measuring-success/how-to-set-performance-metrics-for-your-service) connects service purpose, user benefits, hypotheses and measurement. Implication: measure investigation accuracy, time and decision use alongside product activity.

## New dataset findings

Audit scope: local files, especially the October LV selected demand, job-time, geography and resource-plan versions. No live Databricks validation.

- Five demand versions have identical SHA-256 content, including two ML-labeled forecasts and baseline/unconstrained versions. Filename changes alone do not imply forecast changes.
- All five inspected job-time versions are identical. Identical groups also exist for HEC-on-KAC, HEC-on-EV, recruitment ramp and most attrition versions.
- Demand contains 33,828 jobs; 6,289 jobs have an exact patch/skill/work-code/week job-time match (about 18.6% of volume). This is more informative than row coverage alone. These are fixture totals, not operational demand claims.
- No duplicate exact business keys were found in the inspected demand or job-time files. Missing matches, rather than duplicate expansion, explain their immediate join coverage problem.
- Every demand row uses Region Code E. There are 522 records whose region conflicts with their exact territory match in geography. Do not silently choose one source as authoritative; establish a mapping rule and report conflicts.
- The generator uses the first character of patch labels as Region Code. Patch labels begin with E, which explains the generated demand region defect.
- Resource-plan and geography coverage is too sparse for a credible national staffing conclusion. Weekly input availability is not the same as complete spatial/skill coverage.

Required behavior: when two scenarios have equal relevant contents and assumptions, derived analytics should agree even if names/types/month labels differ. Report version changes with unchanged contents explicitly.

## Prioritized decision scenarios

Availability labels: A = source-level analysis possible with current files after normalization; B = requires validated capacity/demand calculation rules; C = needs additional operational data. A does not imply production data quality.

| Priority | Trigger and question | Analysis | Decision/output | Readiness |
| --- | --- | --- | --- | --- |
| 1 | Weekly review: what deteriorated since the approved plan? | Aligned snapshot comparison, changed source contents, added/removed scope, driver deltas and coverage changes | Prioritized exceptions with baseline, owner and evidence | A for input differences; B for derived pressure |
| 2 | National buffer looks healthy: where are shortages hidden? | Gross deficit, gross surplus, net buffer, deficit share, worst week, consecutive deficit runs by patch/skill | Focus support on persistent shortages rather than netting them away | B |
| 3 | Demand rises: more jobs, different work mix or longer tasks? | Volume/mix/job-time decomposition at stable scope and business keys, with unmatched volume separately | Review demand forecast, job standards or skill mix | A for volume/mix; B for full hour attribution |
| 4 | Capacity falls: which input movements explain the loss? | Reconciled bridge from roster and hires through attrition, transfers, downtime and interventions | Identify the input needing action or correction | B |
| 5 | A peak is approaching: when is the last useful action date? | First deficit week, peak gap, intervention lead time and ramp | Recruitment, training or contractor decision deadline | B plus explicit lead-time assumptions |
| 6 | Shortage seems temporary: flex capacity or permanent recruitment? | Deficit duration, repeated runs, affected weeks and cumulative gross shortfall | Temporary cover versus structural staffing review | B; repeated historical evidence strengthens structural inference |
| 7 | Recruitment plan appears sufficient: when is it productive? | Confirmed/unconfirmed intake, cohort ramp, readiness at peak, delayed/failed-intake stress cases | Bring intake forward or secure bridge support | B; cohort semantics and joins need resolution |
| 8 | Training coincides with pressure: can it move? | Candidate alternative weeks, eligible attendees, workload headroom, completion deadlines and future skill benefit | Compare training schedules without counting training loss twice | A for timing; B/C for feasible rescheduling |
| 9 | Another skill has surplus: does support solve the problem safely? | Donor/recipient before/after gaps, eligible hours, efficiency, caps and retained donor reserve | Candidate support transfer with residual gaps | B; C for individual eligibility/travel constraints |
| 10 | Plan depends on external cover: what if it fails? | Remove/reduce unauthorized overtime, unconfirmed contractors or ungrounded recruitment; recompute remaining gap | Secure cover or revise plan | A for source exposure; B for gap impact |
| 11 | Proposed fixes compete: which delivers useful capacity on time? | Compare gap reduction, lead time, feasibility and residual pressure under shared assumptions | Shortlist interventions; Pareto trade-offs once cost data exists | B; C for defensible monetary comparison |
| 12 | Plan barely passes: how fragile is it? | Break-even demand uplift, absence increase, recruitment delay and productivity reduction; combined stress cases | Reserve contingency or escalate fragile scope | B; user-defined shocks are not likelihood estimates |
| 13 | Forecast changes each version: are revisions stable and useful? | Content-based revisions for same target week, by issue date/horizon; compare with subsequent actuals | Review systematic over/underplanning and unstable forecasts | A for revisions if real differences; C for accuracy |
| 14 | Shortfalls repeat: is unfinished work accumulating? | Backlog recurrence, recovery time, aging and priority mix | Extra recovery capacity or reprioritization | C; B only for explicit hypothetical carryover model |
| 15 | Result looks suspicious: data problem or operational issue? | Coverage, conflicts, stale/missing inputs, outliers, incompatible units, join cardinality and changed definitions | Correct data or continue operational investigation | A |
| 16 | A past action was approved: did it help? | Compare modeled expectation, implemented action and observed outcomes over the same scope | Learn which interventions to repeat | C; causal claims need appropriate evaluation design |

## Detailed calculations and traps

### Hidden deficit and persistence

For comparable patch/skill/week cells: deficit hours = max(demand - capacity, 0); surplus hours = max(capacity - demand, 0). Aggregate both separately. Net buffer = surplus - deficit. Persistently negative cells may warrant different interventions from a one-week spike; thresholds should be agreed by planners and editable.

Illustrative only: one patch has +200 hours and another -150. National +50 does not mean the second patch's work is covered. A transfer requires the relevant skills, location, timing and eligibility. Summed weekly deficits represent gross workload shortfall; label them as backlog only if work can carry over and a backlog model exists.

### Demand decomposition

At a fixed scope, demand hours H = N * sum(s_k * t_k), where N is total jobs, s_k the work-type share and t_k duration. To explain a change, use a documented sequence or symmetric decomposition and retain an interaction term where necessary. A fixed-order sequential bridge reconciles but its allocations depend on order. New/removed work codes and unmatched job times get explicit categories.

Do not label every observed week-to-week difference abnormal. The current files are synthetic planning trajectories, not a historical process suitable for calibrated anomaly alerts.

### Capacity bridge

Use a single documented accounting convention for gross contracted hours, active/inactive dates, recruitment ramp, attrition, transfers, downtime, overtime, contractor hours and cross-skill exchange. Define headcount versus FTE and percentage bases. Show an unexplained residual if components do not reconcile; do not force one component to absorb the gap.

### Intervention effectiveness

Useful gain = gross deficit before action - gross deficit after action, recomputed across donor and recipient scope and affected weeks. Report displacement of shortages and residual deficit. Benefit is bounded by usable demand and timing; additional hours in an already-surplus skill/week may not relieve the target shortfall.

Until there are costs and feasibility constraints, rank by stated operational measures rather than claiming the cheapest or optimal fix. Overtime multipliers alone do not provide currency costs. Training, transfers and support can have opportunity costs absent from the files.

### Fragility and deadlines

For positive demand and fixed capacity, capacity/demand - 1 is the uniform demand uplift at which an individual cell loses its buffer. National headroom can mask local breakpoints; inspect minimum headroom and the number of cells failing under each shock. Recruitment/training lead-time inputs permit a last-action-date calculation. Missing lead times mean this date is unavailable, not zero.

Use deterministic stress tests first. Add simulation only when distributions, correlations and calibration have an evidence base. A cold-weather shock could affect regions together, so independent random regional draws can understate aggregate exposure.

### Backlog and recovery

For a hypothetical workload-hours model with compatible work and carryover permitted: B[t+1] = max(0, B[t] + D[t] - C[t]). Requires opening backlog and explicit restrictions on deferral, expiry, priority and service obligations. Real appointment aging and SLA risk need due dates, priority and actual outcomes. Never infer these from a weekly imbalance field alone.

## UX organized around decisions

One Analytics navigation tab, with four internal areas:

1. Attention: ranked exceptions, material changes, missing evidence, and upcoming decision deadlines. Show several concrete measures rather than an unexplained composite risk score.
2. Investigate: linked geography/skill/week exploration; demand, capacity, downtime, recruitment and support panels; raw-record evidence.
3. Test actions: draft adjustments against a frozen baseline, before/after impacts and constraints; do not silently save over the user's scenario.
4. Review: saved investigation scope, assumptions, changed contents, rationale, owner/status if adopted, and exportable evidence. Save references plus a reproducible snapshot/hash; current scenario references are mutable.

The initial list is an exception worklist, not a stream of generic alerts. Materiality, persistence and lead time should determine attention; users need dismiss/acknowledge reasons and scoped thresholds only after the relevant workflow is validated. An investigation can conclude that there is insufficient evidence or that no action is needed.

Every investigation should expose scenario/draft state, baseline, source versions, as-of date, scope, units, calculation completeness and unmatched records. Scope must stay consistent across panels and exports. A partial total must not be presented with the same meaning as a complete total.

## Recommended initial product slice

Build a coherent question path: What changed? -> Where is it concentrated? -> What data supports the explanation? -> Which assumption should I inspect or change?

Current-data first slice:

- Content-based scenario/input comparison, including same-content version detection.
- Demand explorer with jobs, week/skill/work-code contribution and geography conflicts/unmapped groups.
- Downtime explorer with separate measures and no unsupported combined loss.
- Recruitment/support commitment profiles at their source grain.
- Coverage and source-record evidence throughout.

Next, once the model is agreed: reconciled capacity build-up, shortage persistence, donor-safe support tests and recruitment-delay stress testing. Add financial prioritization, backlog, SLA outcomes and forecast scoring only when their inputs exist.

## Research with actual users before expanding scope

Suggested first round: observe one weekly capacity review and speak with a small purposive sample (for example, 2 national planners, 2 regional managers and 1 scenario approver). This is a qualitative discovery round, not a statistically representative adoption study. No outreach has been performed.

Ask participants to show their last real shortage decision, files used, spreadsheet calculations, evidence questioned, time spent and decision owner. Ask what they could still change at that planning horizon and which proposed fixes were infeasible. Avoid asking which charts they would like.

Test realistic tasks with a small prototype:

1. Identify a persistent local shortage hidden by national surplus.
2. Explain a demand change and detect incomplete job-time coverage.
3. Notice that a scenario's changed filenames contain identical data.
4. Evaluate cross-skill support without overlooking the donor impact.
5. Recognize that a result cannot be concluded from the available data.

Measure correct conclusions, time to a supported explanation, errors caused by missing/partial data, and whether the user can state a feasible next action. Compare with the existing spreadsheet/app workflow. During a pilot, measure repeated use in planning reviews, investigations referenced in decisions, rework avoided and action follow-through. Page views alone do not establish value; self-reported decisions are not proven savings.

## Additional data with the greatest potential value

1. Complete effective-dated workforce roster with stable geography and skill eligibility, working patterns and planned absence.
2. Authoritative geography/area/patch mappings and complete job-time definitions with units and effective dates.
3. Real demand forecast snapshots with issue timestamps plus matched arrivals/completions and durations.
4. Cohort IDs, intake definitions, joining dates, ramp applicability and attrition rate definitions.
5. Confirmed contractor/overtime availability, transfer eligibility and lead times.
6. If outcome/cost optimization is required: backlog/appointments, priorities/due dates, travel/operating constraints, cost rates, and actual action/outcome logs.

## Scope guardrails

No automatic dispatch, monetary savings claims, SLA probabilities, employee performance rankings or causal root-cause claims are supported by the current fixture data. This does not block useful planning analysis; it defines the evidence required before making each conclusion.
