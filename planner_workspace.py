"""Local planning history and decision records; no dispatch/payroll side effects."""
from copy import deepcopy
from datetime import datetime, timezone, date
import json
import math
import os
from pathlib import Path
import re
import tempfile
import threading
from uuid import uuid4

_LOCK = threading.RLock()
KEYS = ("region", "area", "patch", "skill", "week")


def _number(value):
    if isinstance(value, bool):
        raise ValueError("Hours must be numeric.")
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Hours must be finite.")
    return result


def validate_run(payload):
    """Replay the browser calculation before retaining a planning record."""
    run = deepcopy(payload)
    if len(json.dumps(run, allow_nan=False).encode()) > 8_000_000:
        raise ValueError("Run history accepts snapshots up to 8 MB.")
    if not re.fullmatch(r"RUN-[a-zA-Z0-9-]{1,90}", str(run.get("id", ""))):
        raise ValueError("Invalid run identity.")
    datetime.fromisoformat(str(run.get("createdAt", "")).replace("Z", "+00:00"))
    source = run.get("source", {})
    if source.get("contract") != "capacity-desk-hours-v1" or source.get("mode") not in ("demo", "selected"):
        raise ValueError("Unsupported source contract.")
    if not re.fullmatch(r"[a-f0-9]{64}", str(source.get("snapshot", ""))):
        raise ValueError("Missing source snapshot identity.")
    rows = deepcopy(source.get("rows", []))
    if not 1 <= len(rows) <= 50000:
        raise ValueError("Invalid planning row count.")
    seen, geography = set(), {}
    for row in rows:
        if any(not isinstance(row.get(k), str) or not row[k].strip() or "|" in row[k] for k in KEYS):
            raise ValueError("Invalid planning keys.")
        if date.fromisoformat(row["week"]).weekday() != 0:
            raise ValueError("Planning periods must start on Monday.")
        key = tuple(row[k] for k in KEYS)
        if key in seen:
            raise ValueError("Duplicate planning cell.")
        seen.add(key)
        mapping = (row["region"], row["area"])
        if row["patch"] in geography and geography[row["patch"]] != mapping:
            raise ValueError("Inconsistent patch geography.")
        geography[row["patch"]] = mapping
        for measure in ("demand", "capacity"):
            row[measure] = _number(row[measure])
            if row[measure] < 0:
                raise ValueError("Source hours cannot be negative.")
    hours = _number(run.get("hoursPerFte"))
    if hours <= 0:
        raise ValueError("FTE conversion must be positive.")
    weeks = sorted({r["week"] for r in rows})
    drivers = run.get("drivers", [])
    if not isinstance(drivers, list) or len(drivers) > 200:
        raise ValueError("Invalid driver list.")
    driver_ids = set()
    for driver in drivers:
        identity = driver.get("id")
        if not isinstance(identity, str) or not identity or identity in driver_ids or not str(driver.get("name", "")).strip():
            raise ValueError("Saved drivers need unique identities and names.")
        driver_ids.add(identity)
    ledger = []
    for driver in drivers:
        amount = _number(driver.get("amount"))
        kind, start, end = driver.get("type"), driver.get("start"), driver.get("end")
        if amount <= 0 or kind not in ("overtime", "recruitment", "transfer"):
            raise ValueError("Invalid capacity driver.")
        if start not in weeks or end not in weeks or end < start:
            raise ValueError("Invalid driver period.")
        targets = [r for r in rows if r["patch"] == driver.get("patch") and r["skill"] == driver.get("skill") and start <= r["week"] <= end]
        if len(targets) != weeks.index(end) - weeks.index(start) + 1:
            raise ValueError("Driver target is missing planning cells.")
        ramp = _number(driver.get("ramp", 1)) if kind == "recruitment" else 1
        if ramp < 1 or int(ramp) != ramp:
            raise ValueError("Recruitment ramp must be whole positive weeks.")
        for row in targets:
            calendar_age = (date.fromisoformat(row["week"]) - date.fromisoformat(start)).days // 7 + 1
            delta = amount * hours * min(1, calendar_age / ramp) if kind == "recruitment" else amount
            if kind == "transfer":
                if driver.get("donor") == driver.get("patch"):
                    raise ValueError("Transfer donor must differ from recipient.")
                donor = next((r for r in rows if r["patch"] == driver.get("donor") and r["skill"] == row["skill"] and r["week"] == row["week"]), None)
                if donor is None or donor["capacity"] < delta:
                    raise ValueError("Transfer donor has insufficient capacity.")
                donor["capacity"] -= delta
                ledger.append(dict(driver=driver.get("name", ""), patch=donor["patch"], skill=donor["skill"], week=donor["week"], hours=-delta, kind="donor"))
            row["capacity"] += delta
            ledger.append(dict(driver=driver.get("name", ""), patch=row["patch"], skill=row["skill"], week=row["week"], hours=delta, kind=kind))
    actual = run.get("rows", [])
    if len(rows) != len(actual):
        raise ValueError("Run row count does not match replay.")
    for expected, observed in zip(rows, actual):
        if any(expected[k] != observed.get(k) for k in KEYS) or any(not math.isclose(expected[m], _number(observed.get(m)), rel_tol=1e-10, abs_tol=1e-7) for m in ("demand", "capacity")):
            raise ValueError("Saved results do not match source/driver replay.")
    run["rows"], run["ledger"], run["baseline"] = rows, ledger, deepcopy(source["rows"])
    return run


class PlannerWorkspace:
    def __init__(self, path=None):
        if path is None:
            from config import EnvironmentConfig
            path = EnvironmentConfig.get_data_dir() / "planner_workspace.json"
        self.path = Path(path)

    def _read(self):
        if not self.path.exists():
            return {"revision": 0, "runs": [], "actions": [], "referenceId": None}
        return json.loads(self.path.read_text(encoding="utf-8"))

    @staticmethod
    def _summary(data):
        return {"revision": data["revision"], "referenceId": data.get("referenceId"),
                "storage": "Local planning records", "actions": data["actions"],
                "runs": [{"id": r["id"], "createdAt": r["createdAt"], "sourceMode": r["source"]["mode"],
                          "snapshot": r["source"]["snapshot"], "drivers": len(r["drivers"]), "cells": len(r["rows"])} for r in data["runs"]]}

    def summary(self):
        with _LOCK:
            return self._summary(self._read())

    @staticmethod
    def _retain(data, run):
        existing = next((r for r in data["runs"] if r["id"] == run["id"]), None)
        if existing and existing != run:
            raise ValueError("A saved run is immutable. Calculate a new run for changed inputs.")
        if not existing:
            data["runs"].insert(0, run)
        # Preserve pinned/action-linked snapshots; retain 20 additional recent runs.
        protected = {data.get("referenceId")} | {a["runId"] for a in data["actions"]}
        ordinary = [r["id"] for r in data["runs"] if r["id"] not in protected][:20]
        data["runs"] = [r for r in data["runs"] if r["id"] in protected or r["id"] in ordinary]

    def execute(self, request, actor="Local planner"):
        with _LOCK:
            data = self._read()
            op = request.get("op")
            response = {"op": op, "purpose": request.get("purpose"), "requestId": request.get("requestId")}
            if op == "create_action" and request.get("requestId") and any(a.get("requestId") == request["requestId"] for a in data["actions"]):
                response.update(success=True, workspace=self._summary(data))
                return response
            if op == "refresh":
                pass
            elif op == "get_run":
                run = next((r for r in data["runs"] if r["id"] == request.get("id")), None)
                if run is None:
                    raise ValueError("That saved run is no longer available.")
                response["run"] = run
            elif op in ("save_run", "create_action"):
                run = validate_run(request.get("run", {}))
                response["runId"] = run["id"]
                self._retain(data, run)
                if request.get("pin"):
                    data["referenceId"] = run["id"]
                if op == "create_action":
                    if len(data["actions"]) >= 500:
                        raise ValueError("The local tracker supports 500 records. Archive records before adding more.")
                    driver = next((d for d in run["drivers"] if d.get("id") == request.get("driverId")), None)
                    if not driver:
                        raise ValueError("Choose a driver from the saved calculation.")
                    owner = str(request.get("owner", "")).strip()
                    notes = str(request.get("notes", "")).strip()
                    due = str(request.get("due", ""))
                    if not owner or len(owner) > 120 or len(notes) > 2000:
                        raise ValueError("Provide a decision owner; keep notes under 2,000 characters.")
                    date.fromisoformat(due)
                    target = next(r for r in run["rows"] if r["patch"] == driver["patch"] and r["skill"] == driver["skill"])
                    timestamp = datetime.now(timezone.utc).isoformat()
                    data["actions"].insert(0, dict(id="ACT-" + str(uuid4()), runId=run["id"], driver=deepcopy(driver),
                        owner=owner, due=due, notes=notes, status="Pending", region=target["region"], skill=target["skill"],
                        patch=target["patch"], start=driver["start"], end=driver["end"], sourceMode=run["source"]["mode"],
                        createdAt=timestamp, requestId=request.get("requestId"), events=[dict(status="Pending", actor=actor, at=timestamp, note=notes)]))
            elif op == "set_reference":
                if not any(r["id"] == request.get("id") for r in data["runs"]):
                    raise ValueError("Reference run not found.")
                data["referenceId"] = request["id"]
            elif op == "update_action":
                action = next((a for a in data["actions"] if a["id"] == request.get("id")), None)
                if not action:
                    raise ValueError("Action not found.")
                status, note = request.get("status"), str(request.get("note", "")).strip()
                if action["status"] != "Pending" or status not in ("Reviewed", "Cancelled") or not note or len(note) > 2000:
                    raise ValueError("Pending actions can be marked Reviewed or Cancelled with a review note.")
                action["status"] = status
                action["events"].append(dict(status=status, actor=actor, at=datetime.now(timezone.utc).isoformat(), note=note))
            else:
                raise ValueError("Unsupported planner workspace operation.")
            if op not in ("refresh", "get_run"):
                data["revision"] += 1
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=self.path.parent, delete=False, suffix=".tmp") as stream:
                    json.dump(data, stream, allow_nan=False, indent=2)
                    temporary = stream.name
                os.replace(temporary, self.path)
            response.update(success=True, workspace=self._summary(data))
            return response
