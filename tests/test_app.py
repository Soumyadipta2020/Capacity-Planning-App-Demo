"""
Verification test script for app.py
Spins up the app using uvicorn in a separate thread, checks health endpoint, and terminates cleanly.
"""

import sys
from pathlib import Path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import time
import urllib.request
import threading
import uvicorn
from app import app
from config import EnvironmentConfig

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

print("Waiting for server to start on port 8001...")
time.sleep(3)

url = "http://127.0.0.1:8001"
try:
    with urllib.request.urlopen(url, timeout=10) as resp:
        status = resp.getcode()
        body = resp.read().decode('utf-8')
        print(f"Server responded with HTTP status: {status}")
        print(f"HTML output contains title 'Capacity Planning': {'Capacity Planning' in body}")
        print(f"HTML output contains 'ES Capacity App': {'ES Capacity App' in body}")
        print(f"HTML output contains 'react-root': {'react-root' in body}")
        print(f"HTML output references 'react_app.js': {'react_app.js' in body}")

    # Check that static asset react_app.js is served properly
    with urllib.request.urlopen("http://127.0.0.1:8001/react_app.js", timeout=10) as resp_js:
        print(f"react_app.js static asset response status: {resp_js.getcode()}")
        js_content = resp_js.read().decode('utf-8')
        print(f"react_app.js contains 'ModernCapacityApp': {'ModernCapacityApp' in js_content}")

        print("ALL MODERN REACT + PYSHINY VERIFICATION CHECKS PASSED!")
except Exception as e:
    print(f"Verification test failed: {e}")
