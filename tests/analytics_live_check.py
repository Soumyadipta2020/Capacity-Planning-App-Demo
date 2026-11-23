"""Read-only HTTP + Shiny WebSocket integration check against a running local app."""
import asyncio
import json
from pathlib import Path
from urllib.request import urlopen
import websockets

ROOT = Path(__file__).resolve().parents[1]
URL = 'http://127.0.0.1:8010'


async def main():
    with urlopen(URL, timeout=15) as response:
        html = response.read().decode()
        assert response.status == 200
        assert 'analytics_ui.js' in html and 'analytics_engine.js' in html
    assert all(asset in html for asset in ('analytics_charts.js','analytics_details.js','analytics_details.css','analytics.css','forecast_analytics_engine.js','forecast_analytics_ui.js'))
    for asset in ('analytics_ui.js', 'analytics_engine.js', 'analytics_charts.js', 'analytics_details.js', 'analytics_details.css', 'analytics.css', 'forecast_analytics_engine.js', 'forecast_analytics_ui.js', 'react_app.js'):
        with urlopen(URL + '/' + asset, timeout=10) as response:
            assert response.status == 200 and len(response.read()) > 100
    scenarios = json.loads((ROOT / 'data/scenarios.json').read_text(encoding='utf-8'))
    scenario_id = next(s for s in scenarios if s.startswith('LV OCT'))
    async with websockets.connect('ws://127.0.0.1:8010/websocket/', max_size=32_000_000) as socket:
        await socket.send(json.dumps({'method': 'init', 'data': {}}))
        await socket.send(json.dumps({'method': 'update', 'data': {'request_analytics_bundle': {'scenarioId': scenario_id, 'requestId': 'integration-current'}}}))
        bundle = await receive_bundle(socket, 'integration-current')
        assert bundle['success'], bundle
        assert len(bundle['sources']) == 21
        assert bundle['sources']['demand_input']['rowCount'] == 870
        assert all('hash' in s for s in bundle['sources'].values() if s['success'])
        (ROOT / '.cache').mkdir(exist_ok=True)
        (ROOT / '.cache/analytics-live-fixture.json').write_text(json.dumps(bundle), encoding='utf-8')
        await socket.send(json.dumps({'method': 'update', 'data': {'request_analytics_bundle': {'draft': True, 'inputs': {'demand_input': 'does-not-exist'}, 'requestId': 'integration-missing'}}}))
        missing = await receive_bundle(socket, 'integration-missing')
        assert not missing['sources']['demand_input']['success']
        assert missing['sources']['demand_input']['rows'] == []
        await socket.send(json.dumps({'method': 'update', 'data': {'request_analytics_bundle': {'scenarioId': 'no-such-scenario', 'requestId': 'integration-invalid'}}}))
        invalid = await receive_bundle(socket, 'integration-invalid')
        assert not invalid['success'] and invalid['requestId'] == 'integration-invalid'
    print('PASS: HTML/assets, live saved-scenario loading, 21 source versions, missing draft input, and invalid scenario response')


async def receive_bundle(socket, request_id):
    async with asyncio.timeout(30):
        while True:
            message = json.loads(await socket.recv())
            result = message.get('custom', {}).get('response_analytics_bundle')
            if result and result.get('requestId') == request_id:
                return result


if __name__ == '__main__':
    asyncio.run(main())
