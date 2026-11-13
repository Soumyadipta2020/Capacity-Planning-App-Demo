import subprocess
import time
import urllib.request
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from data_manager import (
    TRAJECTORY_HORIZON_WEEKS,
    load_input_table_data,
    save_input_table_data,
    get_weekly_synthetic_data
)

def test_weekly_synthetic_data_15_inputs():
    print("Testing 15 inputs have weekly data across 29-week trajectory...")
    input_keys = [
        "fte_transfer",
        "recruitment_grounded",
        "recruitment_ungrounded",
        "downtime_overlays_percentage",
        "downtime_overlays_hours",
        "downtime_overlays_hours_fte",
        "overtime",
        "training_snm",
        "ctr_capacity",
        "attrition",
        "recruitment_config",
        "demand_input",
        "job_time_assumptions",
        "hec_on_kac_demand",
        "hec_on_ev_demand"
    ]
    
    assert len(TRAJECTORY_HORIZON_WEEKS) == 29, f"Expected 29 weeks, got {len(TRAJECTORY_HORIZON_WEEKS)}"
    start_wk = "2026-09-14"
    end_wk = "2027-03-29"
    assert TRAJECTORY_HORIZON_WEEKS[0] == start_wk
    assert TRAJECTORY_HORIZON_WEEKS[-1] == end_wk

    for k in input_keys:
        res = load_input_table_data(k, None)
        assert res["success"], f"Failed to load table data for {k}: {res.get('error')}"
        rows = res["rows"]
        cols = [c.lower() for c in res["columns"]]
        assert len(rows) > 0, f"No rows loaded for {k}"
        
        # Check that weekcomm column exists
        has_week = any("week" in c or "date" in c for c in cols)
        assert has_week, f"No week column found in {k}: {cols}"
        
        # Check that rows span the horizon
        week_candidates = [c for c in res["columns"] if "weekcomm" in c.lower()]
        if not week_candidates:
            week_candidates = [c for c in res["columns"] if "date" in c.lower()]
        if not week_candidates:
            week_candidates = [c for c in res["columns"] if "week" in c.lower()]
        week_col_name = week_candidates[0]
        distinct_weeks = set(str(r[week_col_name]).strip() for r in rows if r.get(week_col_name))
        assert start_wk in distinct_weeks, f"Start week {start_wk} missing in {k}"
        assert end_wk in distinct_weeks, f"End week {end_wk} missing in {k}"
        assert len(distinct_weeks) == 29, f"Expected 29 distinct weeks in {k}, found {len(distinct_weeks)}"
        print(f"  [OK] {k}: {len(rows)} rows spanning {len(distinct_weeks)} weeks ({start_wk} to {end_wk})")

def test_bulk_save_integration():
    print("Testing bulk save integration on attrition table...")
    res = load_input_table_data("attrition", None)
    assert res["success"]
    filename = res["fileName"]
    rows = [dict(r) for r in res["rows"]]
    cols = res["columns"]
    
    # Simulate a bulk modification: increase first row value by 15%
    orig_val = float(rows[0]["Values"])
    target_val = round(orig_val * 1.15, 2)
    rows[0]["Values"] = target_val
    
    save_res = save_input_table_data("attrition", filename, rows, cols)
    assert save_res["success"], f"Save failed: {save_res.get('error')}"
    
    # Reload to verify persistence
    reload_res = load_input_table_data("attrition", filename)
    assert reload_res["success"]
    assert float(reload_res["rows"][0]["Values"]) == target_val
    assert len(reload_res["rows"]) == len(rows)
    print(f"  [OK] Bulk modification persisted {orig_val} -> {target_val} across all {len(rows)} rows successfully")

def test_frontend_dom_edge():
    print("Testing frontend DOM compilation and rendering with headless Edge...")
    import threading
    import uvicorn
    from app import app as shiny_app

    def run_server():
        uvicorn.run(shiny_app, host="127.0.0.1", port=8004, log_level="warning")

    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(3)
    try:
        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        cmd = [edge_path, "--headless=new", "--virtual-time-budget=6000", "--dump-dom", "http://127.0.0.1:8004"]
        out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=20)
        dom = out.stdout
        print(f"  DOM Length: {len(dom)} bytes")
        assert len(dom) > 1000000, f"DOM too small ({len(dom)} bytes), likely Babel or React crash!"
        assert "ES Capacity App" in dom
        assert "Executive Insights" in dom
        assert "Weekly Trajectory Envelope" in dom
        assert "Bulk Change" in dom
        print("  [OK] React App mounted cleanly without Babel/JS crashes!")
    except Exception as e:
        raise e

def restore_attrition_baseline():
    df = get_weekly_synthetic_data("attrition")
    target = Path(__file__).parent.parent / "data" / "capacity_config" / "es_shiny_attrition_input2_2026-02-05 09-54-11.csv"
    df.to_csv(target, index=False)

if __name__ == "__main__":
    restore_attrition_baseline()
    test_weekly_synthetic_data_15_inputs()
    test_bulk_save_integration()
    test_frontend_dom_edge()
    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
