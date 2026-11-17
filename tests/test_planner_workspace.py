import json
from copy import deepcopy
from pathlib import Path
import tempfile
import unittest
from planning_service import demo_dataset
from planner_workspace import PlannerWorkspace, validate_run


def fixture_run():
    source=demo_dataset()
    return dict(id="RUN-workspace-test",createdAt="2026-11-16T08:15:00Z",source=source,
                rows=deepcopy(source["rows"]),baseline=deepcopy(source["rows"]),drivers=[],ledger=[],hoursPerFte=37.5,inputVersions={})


def overtime_run():
    result=fixture_run()
    row=result["rows"][0]
    driver=dict(id="ot-one",name="Newcastle cover",type="overtime",patch=row["patch"],skill=row["skill"],start=row["week"],end=row["week"],amount=20)
    result["drivers"]=[driver]
    row["capacity"]+=20
    result["id"]="RUN-workspace-overtime"
    return result


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.path=Path(self.directory.name)/"workspace.json"
        self.store=PlannerWorkspace(self.path)

    def tearDown(self):
        self.directory.cleanup()

    def test_empty_tracker_has_no_invented_actions(self):
        summary=self.store.summary()
        self.assertEqual(summary["actions"],[])
        self.assertEqual(summary["runs"],[])

    def test_reference_survives_restart_and_rows_replay(self):
        result=self.store.execute(dict(op="save_run",run=fixture_run(),pin=True))
        self.assertEqual(result["workspace"]["referenceId"],"RUN-workspace-test")
        another=PlannerWorkspace(self.path)
        loaded=another.execute(dict(op="get_run",id="RUN-workspace-test",purpose="reference"))
        self.assertEqual(len(loaded["run"]["rows"]),96)

    def test_tampered_result_rejected_without_write(self):
        result=fixture_run();result["rows"][0]["capacity"]+=1
        with self.assertRaisesRegex(ValueError,"replay"):
            self.store.execute(dict(op="save_run",run=result))
        self.assertFalse(self.path.exists())

    def test_saved_run_is_immutable(self):
        self.store.execute(dict(op="save_run",run=fixture_run()))
        changed=fixture_run();changed["scenario"]="Different input identity"
        with self.assertRaisesRegex(ValueError,"immutable"):
            self.store.execute(dict(op="save_run",run=changed))

    def test_request_and_review_have_owner_due_and_history(self):
        proposal=overtime_run()
        response=self.store.execute(dict(op="create_action",run=proposal,driverId="ot-one",owner="Regional manager",due="2026-11-20",notes="Check availability"),actor="Planner")
        action=response["workspace"]["actions"][0]
        self.assertEqual(action["status"],"Pending")
        self.assertEqual(action["sourceMode"],"demo")
        self.assertEqual(action["runId"],proposal["id"])
        with self.assertRaisesRegex(ValueError,"review note"):
            self.store.execute(dict(op="update_action",id=action["id"],status="Reviewed",note=""))
        done=self.store.execute(dict(op="update_action",id=action["id"],status="Reviewed",note="Availability checked; decision still external"),actor="Reviewer")
        recorded=done["workspace"]["actions"][0]
        self.assertEqual(len(recorded["events"]),2)
        self.assertEqual(recorded["events"][1]["actor"],"Reviewer")
        self.assertEqual(recorded["status"],"Reviewed")
        saved=json.loads(self.path.read_text())
        self.assertEqual(saved["runs"][0]["rows"][0]["capacity"],proposal["rows"][0]["capacity"])

    def test_invalid_owner_or_date_does_not_partially_save(self):
        for owner,due in [("","2026-11-20"),("Manager","bad-date")]:
            with self.subTest(owner=owner),self.assertRaises(ValueError):
                self.store.execute(dict(op="create_action",run=overtime_run(),driverId="ot-one",owner=owner,due=due))
        self.assertEqual(self.store.summary()["runs"],[])

    def test_summary_does_not_embed_full_datasets(self):
        result=self.store.execute(dict(op="save_run",run=fixture_run()))
        self.assertNotIn("rows",result["workspace"]["runs"][0])

    def test_repeated_action_request_is_idempotent(self):
        req=dict(op="create_action",requestId="request-one",run=overtime_run(),driverId="ot-one",owner="Manager",due="2026-11-20")
        self.store.execute(req)
        self.store.execute(req)
        self.assertEqual(len(self.store.summary()["actions"]),1)

    def test_reference_and_action_snapshots_survive_retention(self):
        self.store.execute(dict(op="save_run",run=fixture_run(),pin=True))
        self.store.execute(dict(op="create_action",run=overtime_run(),driverId="ot-one",owner="Manager",due="2026-11-20"))
        for i in range(25):
            run=fixture_run();run["id"]=f"RUN-history-{i}"
            self.store.execute(dict(op="save_run",run=run))
        self.assertEqual(len(self.store.summary()["runs"]),22)
        self.assertTrue(self.store.execute(dict(op="get_run",id="RUN-workspace-test"))["success"])
        self.assertTrue(self.store.execute(dict(op="get_run",id="RUN-workspace-overtime"))["success"])

    def test_transfer_and_recruitment_validation(self):
        result=fixture_run();target=result["rows"][0];donor=next(r for r in result["rows"] if r["patch"]!=target["patch"] and r["skill"]==target["skill"] and r["week"]==target["week"])
        result["drivers"]=[dict(id="transfer",name="Transfer",type="transfer",patch=target["patch"],donor=donor["patch"],skill=target["skill"],start=target["week"],end=target["week"],amount=20)]
        target["capacity"]+=20;donor["capacity"]-=20
        verified=validate_run(result)
        self.assertEqual(sum(l["hours"] for l in verified["ledger"]),0)
        result=fixture_run();row=result["rows"][0];row["capacity"]+=9.375
        result["drivers"]=[dict(id="intake",name="Recruitment",type="recruitment",patch=row["patch"],skill=row["skill"],start=row["week"],end=row["week"],amount=1,ramp=4)]
        self.assertEqual(validate_run(result)["ledger"][0]["hours"],9.375)

    def test_sparse_calendar_recruitment_replay_and_persistence(self):
        result=fixture_run()
        first=result["source"]["rows"][0]
        supplied=[dict(first,week=week,capacity=0,demand=100) for week in ["2026-11-16","2026-11-30","2026-12-14"]]
        result["source"]["rows"]=deepcopy(supplied)
        result["rows"]=[dict(row,capacity=hours) for row,hours in zip(supplied,[9.375,28.125,37.5])]
        result["drivers"]=[dict(id="sparse-hire",name="Recruitment",type="recruitment",patch=first["patch"],skill=first["skill"],start="2026-11-16",end="2026-12-14",amount=1,ramp=4)]
        verified=validate_run(result)
        self.assertEqual([line["hours"] for line in verified["ledger"]],[9.375,28.125,37.5])
        self.store.execute(dict(op="save_run",run=result,pin=True))
        loaded=PlannerWorkspace(self.path).execute(dict(op="get_run",id=result["id"]))
        self.assertEqual(loaded["run"]["rows"][1]["capacity"],28.125)
        old=deepcopy(result)
        old["rows"][1]["capacity"]=18.75
        with self.assertRaisesRegex(ValueError,"replay"):
            validate_run(old)


if __name__=="__main__":
    unittest.main()
