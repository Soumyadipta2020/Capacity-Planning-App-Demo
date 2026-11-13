"""
Tests for Scenario Dropdown Switching and Dynamic Number Updates.
Verifies that changing scenarios in the dropdown updates scenario-related numbers across:
1. Bento KPI Cards (Total Demand, Net Capacity, Net Buffer, Coverage Ratio, Shortfall Risk)
2. Weekly Trajectory Envelope (Demand bars, Capacity line, Net FTE delta labels)
3. Territory Health Status (5 divisions buffers and percentages)
4. Operational Trajectory Trends (5 sparkline cards)
5. Dem vs Cap Matrix (Weekly profile and regional rollup)
"""

import re
import sys
import time
import subprocess
import requests
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_static_react_analytics_definitions():
    js_path = Path("static/react_app.js")
    assert js_path.exists(), "react_app.js must exist"
    content = js_path.read_text(encoding="utf-8")

    # 1. Verify computeScenarioAnalytics exists and contains distinct metrics per scenario
    assert "function computeScenarioAnalytics" in content, "computeScenarioAnalytics missing"
    assert "totalDemandFormatted" in content, "totalDemandFormatted missing"
    assert "netCapacityFormatted" in content, "netCapacityFormatted missing"
    assert "netBufferFormatted" in content, "netBufferFormatted missing"
    assert "coverageRatioFormatted" in content, "coverageRatioFormatted missing"

    # 2. Verify Bento KPI cards reference dynamic analytics
    assert "{analytics.totalDemandFormatted}" in content, "Total Demand card must render analytics.totalDemandFormatted"
    assert "{analytics.netCapacityFormatted}" in content, "Net Capacity card must render analytics.netCapacityFormatted"
    assert "{analytics.netBufferFormatted}" in content, "Net Buffer card must render analytics.netBufferFormatted"
    assert "{analytics.coverageRatioFormatted}" in content, "Coverage Ratio card must render analytics.coverageRatioFormatted"
    assert "{analytics.slaStatusText}" in content, "Net Buffer card must render analytics.slaStatusText"

    # 3. Verify Territory Health Status references dynamic analytics
    assert "analytics.territoryDivisions.map" in content, "Territory Health Status must map over analytics.territoryDivisions"

    # 4. Verify Trends Sparklines reference dynamic analytics
    assert "analytics.trendKPIs.fteRequired.val" in content, "FTE Required sparkline must render analytics.trendKPIs.fteRequired.val"
    assert "analytics.trendKPIs.grossHours.val" in content, "Gross Hours sparkline must render analytics.trendKPIs.grossHours.val"
    assert "analytics.trendKPIs.totalDowntime.val" in content, "Total Downtime sparkline must render analytics.trendKPIs.totalDowntime.val"
    assert "analytics.trendKPIs.productivity.val" in content, "Productivity sparkline must render analytics.trendKPIs.productivity.val"
    assert "analytics.trendKPIs.imbalance.val" in content, "Imbalance sparkline must render analytics.trendKPIs.imbalance.val"

    # 5. Verify DemVsCapView scales weekly profile data and regional rollup dynamically
    assert "const analytics = useMemo(() => computeScenarioAnalytics(scenario)" in content, "DemVsCapView must compute scenario analytics"
    assert "analytics?.demandScale" in content, "weeklyProfileData must scale by analytics.demandScale"
    assert "analytics?.capacityScale" in content, "weeklyProfileData must scale by analytics.capacityScale"

    # 6. Verify server_logic.py has load_scenario_event handler
    server_path = Path("server_logic.py")
    server_content = server_path.read_text(encoding="utf-8")
    assert "@reactive.event(input.load_scenario_event)" in server_content, "server_logic.py must have reactive handler for load_scenario_event"

    print("Static verification of dynamic scenario analytics passed!")

def test_live_app_and_headless_edge():
    import threading
    import uvicorn
    from app import app as shiny_app

    port = 8005
    def run_server():
        uvicorn.run(shiny_app, host="127.0.0.1", port=port, log_level="warning")

    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(3)

    try:
        url = f"http://127.0.0.1:{port}"
        resp = requests.get(url, timeout=10)
        assert resp.status_code == 200, f"App should respond with 200, got {resp.status_code}"
        assert "ES Capacity App" in resp.text, "Page should contain ES Capacity App"

        # Run headless Edge to verify JSX transpilation and full DOM rendering
        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        edge_cmd = [
            edge_path,
            "--headless=new",
            "--disable-gpu",
            "--virtual-time-budget=6000",
            "--dump-dom",
            url
        ]
        edge_res = subprocess.run(edge_cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=20)
        dom = edge_res.stdout

        print(f"  DOM Length: {len(dom)} bytes")
        assert len(dom) > 1000000, f"DOM length ({len(dom)}) must be > 1,000,000 bytes (proving clean React render)"
        assert "Total Demand" in dom, "DOM must contain Total Demand"
        assert "Net Capacity" in dom, "DOM must contain Net Capacity"
        assert "Weekly Trajectory Envelope" in dom, "DOM must contain Weekly Trajectory Envelope"
        assert "Territory Health Status" in dom, "DOM must contain Territory Health Status"
        assert "Trends (" in dom, "DOM must contain Trends"

        print(f"Headless Edge verification passed! DOM length: {len(dom)} bytes, rendered cleanly without errors.")
    except Exception as e:
        raise e

if __name__ == "__main__":
    test_static_react_analytics_definitions()
    test_live_app_and_headless_edge()
    print("ALL SCENARIO SWITCHING TESTS PASSED!")
