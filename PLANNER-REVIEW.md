# Daily planner review integration

The application's default route is **Capacity Desk**, with the full source-week horizon unless the user remembers a narrower view. **My review** is a separate tab using the same calculation result. This is the integrated workspace, not the standalone research sample. Existing analytics, comparison, input management and legacy tools remain available.

## Daily use

1. Open http://127.0.0.1:8000 for Capacity Desk, then choose **My review** for the daily review. Select source, region, skill and planning week. **Remember this view** retains those filters on this browser. **All source weeks** gives the complete horizon.
2. Inspect uncovered hours and the ranked patch/skill/week exception queue. Select a cell to inspect demand, capacity and the shortage.

Capacity Desk's Planning Horizon also has a local **Show skills** selector (All/HEC/KAC/EV), per-patch expand/collapse and Expand/Collapse all controls. Patch summaries show net hours and independently summed uncovered hours. Collapsing rows only changes visibility; scoped totals and exports still include their selected skill cells.

Matrix colors follow values: red for negative net, green for surplus without uncovered work, amber for offsetting skill shortages despite a non-negative net, and neutral for zero balance. Larger hour magnitudes use stronger shading. The scale is anchored to the full source baseline and remains fixed when filtering skills or previewing scenario changes; shading is capped at the displayed limit. These are visual encodings, not client-approved service-risk thresholds.
3. **Save & pin current run** creates a named reference. It is a workspace reference, not an approved staffing plan. Select another saved reference when needed.
4. **What changed** compares matching source modes, contracts and planning cells. Source demand/capacity differences are separate from proposal-driver capacity differences. Source capacity lost is the gross reduction at the same planning cells; reasons such as absence are not invented.
5. In the response inspector, enter productive overtime hours and **Preview impact**. Preview retains the main scenario unchanged. Choose **Use proposal in Capacity Desk** to edit and run the main scenario, or provide an owner/due date and **Track decision request**.
6. **My actions** shows persistent records for the selected source mode, geography, skill and week. Inspect the linked proposal, add a review note and record Reviewed or Cancelled. These are internal tracking states, not authorization to spend, change shifts or dispatch work. No email/notification is sent.
7. **Data health** shows exact source versions, hashes, unknown business cutoffs, unavailable operational feeds and saved calculations. Restore a saved proposal when needed; replacing an edited draft requires confirmation.
8. **Planning brief** summarizes the same scope, reference differences, top shortages, pending decisions and source caveats.

## Metrics and unavailable data

The five review measures are uncovered productive hours, distinct affected patches, gross source capacity lost against a comparable reference, pending decisions (including overdue records), and explicit data-readiness checks. Demand/capacity/net balance are supporting context.

No reference means change metrics show unavailable, rather than a fabricated yesterday/approved baseline. Incompatible modes or mismatched planning keys are not compared. The selected planning period applies across review, desk, charts, comparison and scoped exports.

The default source remains clearly labelled synthetic. Real operational use requires validated productive-hours sources. Business source cutoffs, live work orders/bookings, daily availability, absence/intake cause events, actual costs and SLA risk are not supplied by the current source contract. A calculation timestamp is not labelled as source freshness.

## Persistence and boundaries

- Backend storage: `EnvironmentConfig.get_data_dir()/planner_workspace.json`, on the app's file storage. This is not a Unity Catalog/SQL-backed workflow.
- Successful calculations are sent to history; saves and requests require backend confirmation, with errors/timeouts surfaced. Saving a pinned reference is explicit.
- Run source/driver arithmetic is replayed on the server before storage. Saved run identities are immutable. Source hashes are retained identifiers, not a cryptographic proof of external file authenticity.
- The store retains 20 ordinary recent runs plus pinned/action-linked runs. Snapshot size limit is 8 MB; action limit is 500. Summaries sent to the page do not embed every full dataset.
- Decision records contain owner, due date, proposal run, driver, source mode, review notes, actor and event history. Request IDs protect against duplicated retries of the same request.
- File replacement is atomic, with a lock inside one server process. Multiple workers/replicas need a transactional shared store before deployment. Approval authority and per-user permissions are not implemented by this tracker.
- New-workspace state survives visiting **Existing tools** and returning, without forcing a reload. Unrun drafts are still in-memory; browser reload does not persist unrun driver edits. Scenario/run snapshots remain the durable recovery mechanism.

## Source structure and checks

| File | Purpose |
| --- | --- |
| `planner_workspace.py` | Server-side replay validation, immutable run history, pinned reference, decision records and review history |
| `static/planner-review-model.js` | Comparable scope checks, source/driver deltas and scoped exceptions/actions |
| `static/planner-review.jsx` | Review, changes, actions, data health and planning brief |
| `static/planner-review.css` | Responsive review layout |
| `static/capacity-desk.jsx` | Shared state, scope, previews, persistence bridge and retained existing routes |

After source edits run `node tools/build-frontend.cjs`. Verification:

```powershell
.venv\Scripts\python.exe -m unittest discover -s tests -p test_planner_workspace.py -v
.venv\Scripts\python.exe -m unittest discover -s tests -p test_planning_service.py -v
node tests/capacity-desk.check.cjs
```

The Node check uses the running app on port 8000 and exercises the compiled JSX with a hook harness. It does not constitute visual browser QA. The live Shiny WebSocket refresh bridge was separately checked without modifying planning records.
