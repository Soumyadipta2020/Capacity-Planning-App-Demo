"""
Main PyShiny Application Entry Point
Field Capacity Planning Platform
Supports Modern React 18 / Tailwind Frontend with PyShiny Backend.
Dual Engine: PySpark on Databricks Unity Catalog (Production) vs Pandas on VS Code (Development).
"""

import asyncio
import os
from pathlib import Path

import orjson
import pandas as pd
from shiny import App, reactive, ui
from starlette.middleware.gzip import GZipMiddleware
from starlette.responses import Response
from starlette.routing import Route

from cluster_manager import register_cluster_handlers
from config import EnvironmentConfig
from data_manager import (
    ScenarioManager,
    clean_for_json,
    export_scenario_to_powerbi,
    get_calculation_module_data,
    load_input_table_data,
    register_uploaded_file,
    save_input_table_data,
)
from engine.data_engine import CapacityDataEngine
from server_logic import register_server_handlers
from ui import (
    CUSTOM_CSS,
    create_about_tab,
    create_capacity_config_panels,
    create_capacity_panels,
    create_config_tab,
    create_dem_vs_cap_tab,
    create_demand_config_panels,
    create_demand_tab,
    create_home_tab,
    create_modern_ui_page,
    create_scenario_comparison_tab,
    create_visuals_tab,
    get_company_logo_html,
    get_env_badge_html,
)
from ui.modern_ui import get_cached_modern_ui_page

WORKSPACE_DIR = Path(__file__).resolve().parent
STATIC_DIR = WORKSPACE_DIR / "static"

# Determine UI theme mode ('modern' for React 18 / Tailwind, 'classic' for PyShiny Bootstrap)
ui_mode = os.environ.get("CAPACITY_UI_MODE", "modern").lower()

def create_classic_ui():
    """Classic PyShiny navigation UI for fallback or side-by-side evaluation."""
    is_databricks = EnvironmentConfig.is_databricks()
    env_name = EnvironmentConfig.get_environment_name()
    
    return ui.page_navbar(
        create_home_tab(),
        create_scenario_comparison_tab(),
        create_visuals_tab(),
        create_dem_vs_cap_tab(),
        create_demand_tab(),
        create_capacity_panels(),
        create_capacity_config_panels(),
        create_demand_config_panels(),
        create_config_tab(),
        create_about_tab(),
        ui.nav_spacer(),
        ui.nav_control(ui.HTML(get_env_badge_html(env_name, is_databricks))),
        ui.nav_control(
            ui.input_action_button(
                "btn_logout_session",
                "Log Out",
                class_="btn-outline-secondary compact-btn",
                style="font-size: 0.78rem; padding: 3px 10px; margin-left: 6px; font-weight: 700;",
            )
        ),
        ui.nav_control(ui.HTML(get_company_logo_html())),
        title="Capacity Planning",
        id="main_navbar",
        header=ui.TagList(
            ui.tags.head(
                ui.tags.style(CUSTOM_CSS),
                ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
                ui.tags.link(rel="icon", type="image/x-icon", href="favicon.ico"),
                ui.tags.link(rel="shortcut icon", href="favicon.ico"),
                ui.tags.link(rel="apple-touch-icon", href="favicon.png"),
                ui.tags.script("""
                    (function() {
                        var origParse = JSON.parse;
                        JSON.parse = function(text, reviver) {
                            if (typeof text === 'string' && (text.indexOf('NaN') !== -1 || text.indexOf('Infinity') !== -1)) {
                                text = text.replace(/:\\s*NaN\\b/g, ': null')
                                           .replace(/:\\s*-Infinity\\b/g, ': null')
                                           .replace(/:\\s*Infinity\\b/g, ': null');
                            }
                            return origParse.call(this, text, reviver);
                        };
                    })();
                """),
                ui.tags.script("""
                    $(document).on('hidden.bs.modal hide.bs.modal', function () {
                        setTimeout(function() {
                            $('.modal-backdrop').remove();
                            $('#shiny-modal-wrapper').empty();
                            $('body').removeClass('modal-open').css({'overflow': '', 'padding-right': ''});
                        }, 50);
                    });

                    (function() {
                        var lastPingTime = Date.now();
                        var THROTTLE_MS = 30000;

                        function pingActivity() {
                            var now = Date.now();
                            if (now - lastPingTime >= THROTTLE_MS) {
                                lastPingTime = now;
                                if (window.Shiny && window.Shiny.setInputValue) {
                                    Shiny.setInputValue('user_activity_ping', now);
                                }
                            }
                        }

                        ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function(evt) {
                            window.addEventListener(evt, pingActivity, { passive: true });
                        });
                    })();
                """)
            ),
            ui.output_ui("cluster_banner")
        ),
        fillable=True
    )

if ui_mode == "classic":
    app_ui = create_classic_ui()
else:
    def app_ui(request):
        return get_cached_modern_ui_page()

def server(input, output, session):
    engine = CapacityDataEngine.get_instance()
    sm = ScenarioManager()

    # Register Databricks compute lifecycle & cluster management handlers
    register_cluster_handlers(input, output, session, engine=engine)

    # Ensure Databricks Unity Catalog Delta tables exist before serving data
    if EnvironmentConfig.is_databricks() or EnvironmentConfig.get_storage_mode() == "databricks":
        engine.ensure_all_tables(async_init=False)

    # --- REACT JAVASCRIPT EVENT BRIDGE ---

    @reactive.effect
    @reactive.event(input.request_analytics_bundle)
    async def _on_request_analytics_bundle():
        from datetime import datetime, timezone
        from engine.scenario_data_engine import (
            _load_geography_rows,
            _pack_final_dataframe,
            build_scenario_log_row,
            generate_scenario_final_rows,
            get_decision_studio_bundle,
        )
        request = input.request_analytics_bundle()
        if not isinstance(request, dict):
            return
        request_id = request.get("requestId")

        def _compute_bundle():
            if request.get("draft"):
                draft_inputs = request.get("inputs", {})
                now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")
                log_row = build_scenario_log_row("Draft inputs", now_iso, "Unsaved draft inputs", draft_inputs)
                df_draft = generate_scenario_final_rows("Draft inputs", now_iso, draft_inputs, log_row=log_row)
                return {
                    "success": True,
                    "mode": "final_data",
                    "scenarioId": "Draft inputs",
                    "createDatestamp": now_iso,
                    "loadedAt": datetime.now(timezone.utc).isoformat(),
                    "scenarioLog": clean_for_json(log_row),
                    "geographyRows": clean_for_json(_load_geography_rows(draft_inputs)),
                    "finalData": _pack_final_dataframe(df_draft, json_safe=True),
                }
            scen_id = request.get("scenarioId", "")
            scenario = sm.get_scenario(scen_id)
            if not scenario:
                raise ValueError("Selected scenario no longer exists")
            bundle = get_decision_studio_bundle(scen_id, engine=engine, scenario_meta=scenario)
            bundle["scenarioLog"] = clean_for_json(bundle.get("scenarioLog") or {})
            bundle["geographyRows"] = clean_for_json(bundle.get("geographyRows") or [])
            return bundle

        try:
            result = await asyncio.to_thread(_compute_bundle)
        except Exception as error:
            result = {"success": False, "error": str(error)}
        result["requestId"] = request_id
        await session.send_custom_message("response_analytics_bundle", result)

    @reactive.effect
    @reactive.event(input.request_scenario_diff_data)
    async def _on_request_scenario_diff_data():
        from engine.scenario_data_engine import get_scenario_diff_payload
        request = input.request_scenario_diff_data()
        if not isinstance(request, dict):
            return
        request_id = request.get("requestId")
        baseline_id = request.get("baselineId", "")
        comparison_id = request.get("comparisonId", "")

        def _compute_diff():
            payload = get_scenario_diff_payload(baseline_id, comparison_id, engine=engine)
            payload["scenarioLogs"] = clean_for_json(payload.get("scenarioLogs") or {})
            payload["geographyRows"] = clean_for_json(payload.get("geographyRows") or [])
            return payload

        try:
            result = await asyncio.to_thread(_compute_diff)
        except Exception as error:
            result = {"success": False, "error": str(error)}
        result["requestId"] = request_id
        await session.send_custom_message("response_scenario_diff_data", result)

    # Handle Scenario Save from React UI
    @reactive.effect
    @reactive.event(input.save_scenario_event)
    async def _on_react_save():
        from engine.scenario_data_engine import load_scenario_log
        data = input.save_scenario_event()
        if not data:
            return
        
        plan_type = data.get("plan_type", "LV")
        month = data.get("month", "NOV")
        version = data.get("version", "1")
        year = str(data.get("year") or "2026")
        remarks = data.get("remarks", "")
        inputs = data.get("inputs", {})
        
        new_id = await asyncio.to_thread(sm.save_scenario, plan_type, month, version, remarks, inputs, year=year)
        try:
            log_rows = clean_for_json((await asyncio.to_thread(load_scenario_log, engine=engine)).to_dict(orient="records"))
        except Exception:
            log_rows = []
        
        # Broadcast updated scenarios back to React
        await session.send_custom_message("update_scenario_data", {
            "scenarios": sm.get_all_scenarios(),
            "scenarioLog": log_rows,
            "selectedScenarioId": new_id,
            "inputsState": inputs,
            "envInfo": engine.get_engine_status()
        })
        await session.send_custom_message("show_toast", {
            "message": f"Scenario '{new_id}' saved, logged, and final data generated!",
            "type": "success"
        })

    # Handle Scenario Load from React UI
    @reactive.effect
    @reactive.event(input.load_scenario_event)
    async def _on_react_load():
        scenario_id = input.load_scenario_event()
        if not scenario_id:
            return
        
        scen = sm.get_scenario(scenario_id)
        if scen:
            await session.send_custom_message("update_scenario_data", {
                "selectedScenarioId": scenario_id,
                "inputsState": scen.get("inputs", {}),
                "envInfo": engine.get_engine_status()
            })
            await session.send_custom_message("show_toast", {
                "message": f"Loaded scenario: {scenario_id}",
                "type": "info"
            })

    # Handle Bulk File Upload & Ingestion from React UI
    @reactive.effect
    @reactive.event(input.bulk_upload_event)
    async def _on_react_bulk_upload():
        data = input.bulk_upload_event()
        if not data or not isinstance(data, dict):
            return
        
        files = data.get("files", [])
        saved_count = 0
        for f in files:
            f_name = f.get("name")
            f_type = f.get("type")
            f_remarks = f.get("remarks", "")
            f_content = f.get("content", None)
            if f_name and f_type:
                register_uploaded_file(f_type, f_name, f_remarks, f_content)
                saved_count += 1
                
        await session.send_custom_message("show_toast", {
            "message": f"Successfully registered {saved_count} validated file(s) in backend.",
            "type": "success"
        })

    # Handle Input File Table Data Request from React UI
    @reactive.effect
    @reactive.event(input.request_input_file_data)
    async def _on_request_input_file_data():
        req = input.request_input_file_data()
        if not req or not isinstance(req, dict):
            return
        
        input_key = req.get("inputKey", "")
        file_name = req.get("fileName", "")
        request_id = req.get("requestId", None)
        
        result = await asyncio.to_thread(load_input_table_data, input_key, file_name)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_input_file_data", clean_for_json(result))

    # Handle Input File Table Data Save from React UI
    @reactive.effect
    @reactive.event(input.save_input_file_data)
    async def _on_save_input_file_data():
        req = input.save_input_file_data()
        if not req or not isinstance(req, dict):
            return
        
        input_key = req.get("inputKey", "")
        file_name = req.get("fileName", "")
        rows = req.get("rows", [])
        columns = req.get("columns", [])
        request_id = req.get("requestId", None)
        
        result = await asyncio.to_thread(save_input_table_data, input_key, file_name, rows, columns)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_save_input_file_data", clean_for_json(result))
        if result.get("success"):
            await session.send_custom_message("show_toast", {
                "message": f"Saved changes to '{file_name}' ({len(rows)} rows)!",
                "type": "success"
            })
        else:
            await session.send_custom_message("show_toast", {
                "message": f"Failed saving '{file_name}': {result.get('error')}",
                "type": "warning"
            })

    # Handle Calculation Module Data Request from React UI
    @reactive.effect
    @reactive.event(input.request_calc_module_data)
    async def _on_request_calc_module_data():
        req = input.request_calc_module_data()
        if not req or not isinstance(req, dict):
            return
        
        module_key = req.get("moduleKey", "imbalance")
        scenario_id = req.get("scenarioId") or None
        request_id = req.get("requestId", None)

        result = await asyncio.to_thread(get_calculation_module_data, module_key, scenario_id=scenario_id)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_calc_module_data", clean_for_json(result))

    # Handle Scenario Export to Power BI (Private / Public with custom name of choice)
    @reactive.effect
    @reactive.event(input.export_powerbi_scenario)
    async def _on_export_powerbi_scenario():
        req = input.export_powerbi_scenario()
        if not req or not isinstance(req, dict):
            return
        
        scenario_id = req.get("scenarioId", "")
        export_target = req.get("exportTarget", "private") # "private" or "public"
        export_name = req.get("exportName", "")
        description = req.get("description", "")
        request_id = req.get("requestId", None)
        
        result = export_scenario_to_powerbi(scenario_id, export_target, export_name, description)
        if request_id is not None:
            result["requestId"] = request_id
            
        await session.send_custom_message("response_export_powerbi", result)
        if result.get("success"):
            target_label = "Private Power BI" if export_target == "private" else "Public Power BI"
            await session.send_custom_message("show_toast", {
                "message": f"Successfully exported scenario to {target_label} as '{result.get('exportName')}'!",
                "type": "success"
            })
        else:
            await session.send_custom_message("show_toast", {
                "message": f"Failed exporting scenario to Power BI: {result.get('error')}",
                "type": "warning"
            })

    # Register standard PyShiny server handlers (calculators, downloads, classic views)
    register_server_handlers(input, output, session)

# ---------------------------------------------------------------------------
# Fast GZip + orjson HTTP API Endpoints (bypasses slow WebSocket framing)
# ---------------------------------------------------------------------------


def _orjson_response(payload: dict, status_code: int = 200) -> Response:
    body = orjson.dumps(payload, default=lambda x: None if pd.isna(x) else str(x))
    return Response(
        body,
        status_code=status_code,
        media_type="application/json",
        headers={"Cache-Control": "no-store"},
    )


async def _api_analytics_bundle(request):
    from engine.scenario_data_engine import get_decision_studio_bundle

    scenario_id = (request.query_params.get("scenario_id") or "").strip()
    request_id = request.query_params.get("request_id")

    def _run():
        sm = ScenarioManager()
        engine = CapacityDataEngine.get_instance()
        scenario = sm.get_scenario(scenario_id)
        if not scenario:
            raise ValueError("Selected scenario no longer exists")
        return get_decision_studio_bundle(scenario_id, engine=engine, scenario_meta=scenario)

    try:
        result = await asyncio.to_thread(_run)
        if request_id is not None:
            result["requestId"] = request_id
        return _orjson_response(result)
    except Exception as exc:
        return _orjson_response({"success": False, "error": str(exc), "requestId": request_id}, status_code=200)


async def _api_scenario_diff(request):
    from engine.scenario_data_engine import get_scenario_diff_payload

    baseline_id = (request.query_params.get("baseline_id") or "").strip()
    comparison_id = (request.query_params.get("comparison_id") or "").strip()
    request_id = request.query_params.get("request_id")

    def _run():
        engine = CapacityDataEngine.get_instance()
        return get_scenario_diff_payload(baseline_id, comparison_id, engine=engine)

    try:
        result = await asyncio.to_thread(_run)
        if request_id is not None:
            result["requestId"] = request_id
        return _orjson_response(result)
    except Exception as exc:
        return _orjson_response({"success": False, "error": str(exc), "requestId": request_id}, status_code=200)


async def _api_input_file(request):
    category = (request.query_params.get("category") or "").strip()
    version = (request.query_params.get("version") or "").strip()
    request_id = request.query_params.get("request_id")
    try:
        result = await asyncio.to_thread(load_input_table_data, category, version)
        if request_id is not None:
            result["requestId"] = request_id
        return _orjson_response(result)
    except Exception as exc:
        return _orjson_response({"success": False, "error": str(exc), "requestId": request_id}, status_code=200)


async def _api_calc_module(request):
    module_key = (request.query_params.get("module") or "imbalance").strip()
    scenario_id = (request.query_params.get("scenario_id") or "").strip() or None
    request_id = request.query_params.get("request_id")
    try:
        result = await asyncio.to_thread(get_calculation_module_data, module_key, scenario_id=scenario_id)
        if request_id is not None:
            result["requestId"] = request_id
        return _orjson_response(result)
    except Exception as exc:
        return _orjson_response({"success": False, "error": str(exc), "requestId": request_id}, status_code=200)


# Instantiate App with static assets path + GZip + HTTP API routes
app = App(app_ui, server, static_assets=STATIC_DIR)
_api_routes = [
    Route("/api/analytics_bundle", _api_analytics_bundle, methods=["GET"]),
    Route("/api/scenario_diff", _api_scenario_diff, methods=["GET"]),
    Route("/api/input_file", _api_input_file, methods=["GET"]),
    Route("/api/calc_module", _api_calc_module, methods=["GET"]),
]
app.starlette_app.routes[:0] = _api_routes
app.starlette_app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=3)
app.starlette_app.middleware_stack = app.starlette_app.build_middleware_stack()

if __name__ == "__main__":
    import uvicorn
    
    host = EnvironmentConfig.get_server_host()
    port = EnvironmentConfig.get_server_port()
    is_db = EnvironmentConfig.is_databricks()
    engine = CapacityDataEngine.get_instance()
    
    # -----------------------------------------------------------------------
    # STEP 1: Verify & create tables in Databricks first if not present
    # -----------------------------------------------------------------------
    print("=" * 70)
    print(" FIELD CAPACITY PLANNING PLATFORM")
    print("=" * 70)
    print(" [STEP 1/2] Verifying Databricks Unity Catalog tables...")
    
    table_init_res = engine.ensure_all_tables(async_init=False, auto_start_compute=True)
    if table_init_res.get("status") == "success":
        newly_created = table_init_res.get("created_tables", [])
        if newly_created:
            print(f" [Databricks Unity Catalog] Created {len(newly_created)} missing table(s):")
            for tbl in newly_created:
                print(f"   + {table_init_res.get('schema')}.{tbl}")
        else:
            print(f" [Databricks Unity Catalog] All {table_init_res.get('count', 22)} tables are present and verified in {table_init_res.get('schema')}.")
    else:
        print(f" [Databricks Unity Catalog] {table_init_res.get('reason', 'Local storage active')}")
    
    # -----------------------------------------------------------------------
    # STEP 2: Next, load the app using them
    # -----------------------------------------------------------------------
    status = engine.get_engine_status()
    print("\n [STEP 2/2] Loading application using verified data tables...")
    print(" UI Framework       : Modern React 18 + Tailwind CSS")
    print(f" Execution Engine   : {status['engine_type']}")
    print(f" Storage Target     : {status['storage_target']}")
    print(f" Calculation Mode   : {status['calculation_mode']}")
    print(f" Server Binding     : http://{host}:{port}")
    print("=" * 70 + "\n")
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=not is_db,
        log_level="info"
    )
