"""
Modern React UI Wrapper for PyShiny
Hosts the modern React 18 / Tailwind CSS client directly inside PyShiny.
Uses ui.TagList to completely eliminate Bootstrap container-fluid and body gutters,
achieving a true 100% full-bleed edge-to-edge layout with zero left margin.
"""

import json
import time
from shiny import ui
from data_manager import (
    DEFAULT_INPUT_OPTIONS,
    DEFAULT_REMARKS,
    ScenarioManager,
    SampleDataGenerator,
    clean_for_json,
    load_input_table_data,
    get_calculation_module_data
)
from engine.data_engine import CapacityDataEngine
from engine.scenario_data_engine import get_decision_studio_bundle, load_scenario_log

def create_modern_ui_page():
    """Generates the modern full-bleed HTML layout for the React client without container-fluid."""
    sm = ScenarioManager()
    engine = CapacityDataEngine()
    
    # Pre-load initial table data for currently selected input versions
    initial_table_data = {}
    for cat_key, opts in DEFAULT_INPUT_OPTIONS.items():
        if opts:
            first_opt = opts[0]
            try:
                tbl = load_input_table_data(cat_key, first_opt)
                if tbl.get("success"):
                    initial_table_data[first_opt] = tbl
            except Exception:
                pass

    scenarios_map = sm.get_all_scenarios()
    first_scen_id = next(iter(scenarios_map), None)

    # Pre-load ONLY the 6 sub-calculation datasets combined into final_data
    initial_calc_data = {}
    for mod_key in ["fte", "available_hours", "capacity", "demand", "workload", "imbalance"]:
        try:
            res = clean_for_json(get_calculation_module_data(mod_key, scenario_id=first_scen_id))
            if first_scen_id:
                initial_calc_data[f"{first_scen_id}::{mod_key}"] = res
            else:
                initial_calc_data[mod_key] = res
        except Exception:
            pass

    try:
        scenario_log_rows = clean_for_json(load_scenario_log(engine=engine).to_dict(orient="records"))
    except Exception:
        scenario_log_rows = []

    initial_final_bundle = None
    if first_scen_id:
        try:
            initial_final_bundle = clean_for_json(
                get_decision_studio_bundle(first_scen_id, engine=engine, scenario_meta=scenarios_map.get(first_scen_id))
            )
        except Exception:
            initial_final_bundle = None

    # Pre-serialize initial scenario data for the React client
    initial_data = {
        "envInfo": engine.get_engine_status(),
        "scenarios": scenarios_map,
        "scenarioLog": scenario_log_rows,
        "initialFinalBundle": initial_final_bundle,
        "inputOptions": DEFAULT_INPUT_OPTIONS,
        "remarksMap": DEFAULT_REMARKS,
        "initialTableData": initial_table_data,
        "initialCalcModulesData": initial_calc_data,
        "imbalanceData": SampleDataGenerator.get_imbalance_data().to_dict(orient="records"),
        "indayWorkloadData": SampleDataGenerator.get_inday_workload_data().to_dict(orient="records"),
        "geographyDatasets": SampleDataGenerator.get_all_geography_files_data(),
    }
    
    initial_json = json.dumps(initial_data)
    cache_bust = int(time.time())

    return ui.TagList(
        ui.tags.head(
            ui.tags.meta(charset="utf-8"),
            ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"),
            ui.tags.title("ES Capacity App | Capacity Planning Platform"),
            ui.tags.link(rel="icon", type="image/x-icon", href="favicon.ico"),
            ui.tags.link(rel="shortcut icon", href="favicon.ico"),
            ui.tags.link(rel="apple-touch-icon", href="favicon.png"),

            # Global JSON.parse sanitizer to prevent non-standard NaN / Infinity tokens from crashing Shiny client websocket
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
            
            # Google Font: Inter
            ui.tags.link(rel="preconnect", href="https://fonts.googleapis.com"),
            ui.tags.link(rel="preconnect", href="https://fonts.gstatic.com", crossorigin=""),
            ui.tags.link(rel="stylesheet", href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"),
            
            # Tailwind CSS CDN
            ui.tags.script(src="https://cdn.tailwindcss.com"),
            
            # React 18 & ReactDOM
            ui.tags.script(src="https://unpkg.com/react@18/umd/react.production.min.js"),
            ui.tags.script(src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"),
            
            # Babel Standalone for live JSX interpretation with zero node.js build
            ui.tags.script(src="https://unpkg.com/@babel/standalone/babel.min.js"),
            
            # JSZip for bundling templates into a single zip download
            ui.tags.script(src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"),
            
            # Tailwind configuration
            ui.tags.script(
                """
                tailwind.config = {
                    darkMode: 'class',
                    theme: {
                        extend: {
                            fontFamily: {
                                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                            },
                            colors: {
                                brandBlue: '#005eb8',
                                brandBlueHover: '#004b87',
                                brandBlueDark: '#002f5f',
                                brandBlueLight: '#eff6ff',
                                chartTeal: '#38d4c3',
                                chartCoral: '#f87171',
                                chartYellow: '#facc15',
                                midnightAbyss: '#070e1c',
                                midnightNavy: '#0c1b31',
                                midnightBorder: '#18365d',
                                midnightCyan: '#80c6ff',
                                midnightText: '#adbed4'
                            }
                        }
                    }
                }
                """
            ),

            # Instant Dark Mode Initialization (prevents flash of white on refresh)
            ui.tags.script(
                """
                (function() {
                    try {
                        if (localStorage.getItem('capacity-app-dark-mode') === 'true') {
                            document.documentElement.classList.add('dark');
                        }
                    } catch (e) {}
                })();
                """
            ),
            
            # Reset CSS: Force 0 margin & padding on html, body, and root (preventing left whitespace & double scrollbars)
            ui.tags.style(
                r"""
                *, *::before, *::after {
                    box-sizing: border-box;
                }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: 100vw !important;
                    max-height: 100vh !important;
                    overflow: hidden !important;
                    background-color: #fcfdfd !important;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                    display: flex !important;
                    flex-direction: column !important;
                    transition: background-color 0.3s ease, color 0.3s ease;
                }
                html.dark body, html.dark {
                    background-color: #070e1c !important;
                    color: #adbed4 !important;
                }
                #cluster_banner_container {
                    width: 100%;
                    z-index: 50;
                    flex-shrink: 0;
                }
                #cluster_banner_container:empty {
                    display: none;
                }
                #react-root {
                    width: 100vw !important;
                    flex: 1 1 0% !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    display: flex;
                }

                /* Suppress unstyled PyShiny default notification panel in Modern React UI */
                #shiny-notification-panel {
                    display: none !important;
                }

                /* Cluster Status Banner & Modals */
                .health-banner {
                    align-items: center;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    display: flex;
                    gap: 12px;
                    margin: 8px 16px;
                    min-height: 42px;
                    padding: 8px 16px;
                    font-size: 0.85rem;
                }

                .health-banner.ok {
                    background: rgba(223, 247, 251, 0.95);
                    border-color: rgba(0, 174, 239, 0.4);
                }

                .health-banner.warn {
                    background: #fff8df;
                    border-color: #f4d36c;
                }

                .health-state {
                    color: #005eb8;
                    font-weight: 800;
                    white-space: nowrap;
                }

                .status-modal-wrapper {
                    position: relative;
                    width: 100%;
                }

                .status-modal-content {
                    text-align: center;
                    padding: 28px 24px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .status-modal-spinner {
                    width: 52px;
                    height: 52px;
                    border: 4px solid rgba(0, 94, 184, 0.18);
                    border-top-color: #005eb8;
                    border-right-color: #00a3e0;
                    border-radius: 50%;
                    animation: modal-spin 0.75s linear infinite;
                    margin-bottom: 20px;
                }

                @keyframes modal-spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                .status-modal-icon-circle {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 18px;
                }

                .status-modal-icon-circle.cluster-offline {
                    background-color: rgba(244, 162, 97, 0.18);
                    color: #d97706;
                    border: 2px solid rgba(244, 162, 97, 0.45);
                }

                .status-modal-icon-circle.error {
                    background-color: rgba(255, 138, 138, 0.16);
                    color: #dc3545;
                    border: 2px solid rgba(255, 138, 138, 0.4);
                }

                .status-modal-title {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 8px;
                    line-height: 1.25;
                }

                .status-modal-subtitle {
                    font-size: 0.92rem;
                    color: #64748b;
                    margin-bottom: 20px;
                    line-height: 1.45;
                    max-width: 420px;
                }

                .status-modal-badge-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 16px 22px;
                    margin-bottom: 24px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 2px 8px rgba(0, 94, 184, 0.04);
                    text-align: center;
                }

                .status-modal-id-label {
                    font-size: 0.74rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: #64748b;
                    margin-bottom: 4px;
                }

                .status-modal-id-value {
                    font-family: monospace;
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: #005eb8;
                    letter-spacing: 0.04em;
                }

                .status-modal-icon-circle.inactive {
                    background-color: rgba(100, 116, 139, 0.16);
                    color: #475569;
                    border: 2px solid rgba(100, 116, 139, 0.35);
                }

                .status-modal-icon-circle.logout-icon {
                    background-color: rgba(239, 68, 68, 0.12);
                    color: #dc2626;
                    border: 2px solid rgba(239, 68, 68, 0.35);
                }

                .session-options-row {
                    display: flex;
                    gap: 14px;
                    width: 100%;
                }

                .session-option-box {
                    flex: 1;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px 14px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    transition: all 0.15s ease;
                }

                .session-option-box:hover {
                    border-color: #cbd5e1;
                    background: #f1f5f9;
                }

                @media (max-width: 600px) {
                    .session-options-row {
                        flex-direction: column;
                    }
                }
                
                /* MODERN GLOWING HOVER EFFECTS WITH COLOR-MATCHED ICON GLOWS */
                .glow-card {
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .glow-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px -4px rgba(0, 94, 184, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
                }
                .glow-icon {
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .glow-card:hover .glow-icon, .glow-icon:hover {
                    transform: scale(1.08);
                }

                /* 1. Blue Icon Glow (Total Demand / Upload) */
                .glow-icon-blue, [class*="text-blue-"].glow-icon {
                    box-shadow: 0 0 10px rgba(37, 99, 235, 0.25);
                    border-color: rgba(59, 130, 246, 0.35) !important;
                }
                .glow-card:hover .glow-icon-blue, .glow-icon-blue:hover, button:hover .glow-icon-blue, .glow-card:hover [class*="text-blue-"].glow-icon, [class*="text-blue-"].glow-icon:hover {
                    box-shadow: 0 0 18px rgba(37, 99, 235, 0.55), 0 0 6px rgba(37, 99, 235, 0.35);
                    border-color: #2563eb !important;
                }
                html.dark .glow-icon-blue, html.dark [class*="text-blue-"].glow-icon {
                    box-shadow: 0 0 12px rgba(59, 130, 246, 0.4), inset 0 0 8px rgba(59, 130, 246, 0.2);
                    border-color: rgba(96, 165, 250, 0.5) !important;
                    background-color: rgba(30, 58, 138, 0.35) !important;
                }
                html.dark .glow-card:hover .glow-icon-blue, html.dark .glow-icon-blue:hover, html.dark button:hover .glow-icon-blue, html.dark .glow-card:hover [class*="text-blue-"].glow-icon, html.dark [class*="text-blue-"].glow-icon:hover {
                    box-shadow: 0 0 22px rgba(96, 165, 250, 0.75), 0 0 8px rgba(96, 165, 250, 0.45);
                    border-color: #60a5fa !important;
                }

                /* 2. Sky / Cyan Icon Glow (Net Capacity) */
                .glow-icon-sky, [class*="text-sky-"].glow-icon {
                    box-shadow: 0 0 10px rgba(14, 165, 233, 0.25);
                    border-color: rgba(14, 165, 233, 0.35) !important;
                }
                .glow-card:hover .glow-icon-sky, .glow-icon-sky:hover, button:hover .glow-icon-sky, .glow-card:hover [class*="text-sky-"].glow-icon, [class*="text-sky-"].glow-icon:hover {
                    box-shadow: 0 0 18px rgba(14, 165, 233, 0.55), 0 0 6px rgba(14, 165, 233, 0.35);
                    border-color: #0ea5e9 !important;
                }
                html.dark .glow-icon-sky, html.dark [class*="text-sky-"].glow-icon {
                    box-shadow: 0 0 12px rgba(56, 189, 248, 0.4), inset 0 0 8px rgba(56, 189, 248, 0.2);
                    border-color: rgba(56, 189, 248, 0.5) !important;
                    background-color: rgba(12, 74, 110, 0.35) !important;
                }
                html.dark .glow-card:hover .glow-icon-sky, html.dark .glow-icon-sky:hover, html.dark button:hover .glow-icon-sky, html.dark .glow-card:hover [class*="text-sky-"].glow-icon, html.dark [class*="text-sky-"].glow-icon:hover {
                    box-shadow: 0 0 22px rgba(56, 189, 248, 0.75), 0 0 8px rgba(56, 189, 248, 0.45);
                    border-color: #38bdf8 !important;
                }

                /* 3. Emerald / Green Icon Glow (Net Buffer) */
                .glow-icon-emerald, [class*="text-emerald-"].glow-icon {
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
                    border-color: rgba(16, 185, 129, 0.35) !important;
                }
                .glow-card:hover .glow-icon-emerald, .glow-icon-emerald:hover, button:hover .glow-icon-emerald, .glow-card:hover [class*="text-emerald-"].glow-icon, [class*="text-emerald-"].glow-icon:hover {
                    box-shadow: 0 0 18px rgba(16, 185, 129, 0.55), 0 0 6px rgba(16, 185, 129, 0.35);
                    border-color: #10b981 !important;
                }
                html.dark .glow-icon-emerald, html.dark [class*="text-emerald-"].glow-icon {
                    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4), inset 0 0 8px rgba(16, 185, 129, 0.2);
                    border-color: rgba(52, 211, 153, 0.5) !important;
                    background-color: rgba(6, 78, 59, 0.35) !important;
                }
                html.dark .glow-card:hover .glow-icon-emerald, html.dark .glow-icon-emerald:hover, html.dark button:hover .glow-icon-emerald, html.dark .glow-card:hover [class*="text-emerald-"].glow-icon, html.dark [class*="text-emerald-"].glow-icon:hover {
                    box-shadow: 0 0 22px rgba(52, 211, 153, 0.75), 0 0 8px rgba(52, 211, 153, 0.45);
                    border-color: #34d399 !important;
                }

                /* 4. Amber / Gold Icon Glow (Coverage Ratio) */
                .glow-icon-amber, [class*="text-amber-"].glow-icon {
                    box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
                    border-color: rgba(245, 158, 11, 0.4) !important;
                }
                .glow-card:hover .glow-icon-amber, .glow-icon-amber:hover, button:hover .glow-icon-amber, .glow-card:hover [class*="text-amber-"].glow-icon, [class*="text-amber-"].glow-icon:hover {
                    box-shadow: 0 0 20px rgba(245, 158, 11, 0.65), 0 0 6px rgba(245, 158, 11, 0.4);
                    border-color: #f59e0b !important;
                }
                html.dark .glow-icon-amber, html.dark [class*="text-amber-"].glow-icon {
                    box-shadow: 0 0 14px rgba(245, 158, 11, 0.5), inset 0 0 8px rgba(245, 158, 11, 0.25);
                    border-color: rgba(251, 191, 36, 0.6) !important;
                    background-color: rgba(120, 53, 15, 0.4) !important;
                }
                html.dark .glow-card:hover .glow-icon-amber, html.dark .glow-icon-amber:hover, html.dark button:hover .glow-icon-amber, html.dark .glow-card:hover [class*="text-amber-"].glow-icon, html.dark [class*="text-amber-"].glow-icon:hover {
                    box-shadow: 0 0 24px rgba(251, 191, 36, 0.8), 0 0 8px rgba(251, 191, 36, 0.5);
                    border-color: #fbbf24 !important;
                }

                /* 5. Purple / Violet Icon Glow (Shortfall Risk) */
                .glow-icon-purple, [class*="text-purple-"].glow-icon {
                    box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
                    border-color: rgba(168, 85, 247, 0.4) !important;
                }
                .glow-card:hover .glow-icon-purple, .glow-icon-purple:hover, button:hover .glow-icon-purple, .glow-card:hover [class*="text-purple-"].glow-icon, [class*="text-purple-"].glow-icon:hover {
                    box-shadow: 0 0 20px rgba(168, 85, 247, 0.65), 0 0 6px rgba(168, 85, 247, 0.4);
                    border-color: #a855f7 !important;
                }
                html.dark .glow-icon-purple, html.dark [class*="text-purple-"].glow-icon {
                    box-shadow: 0 0 14px rgba(168, 85, 247, 0.5), inset 0 0 8px rgba(168, 85, 247, 0.25);
                    border-color: rgba(192, 132, 252, 0.6) !important;
                    background-color: rgba(88, 28, 135, 0.4) !important;
                }
                html.dark .glow-card:hover .glow-icon-purple, html.dark .glow-icon-purple:hover, html.dark button:hover .glow-icon-purple, html.dark .glow-card:hover [class*="text-purple-"].glow-icon, html.dark [class*="text-purple-"].glow-icon:hover {
                    box-shadow: 0 0 24px rgba(192, 132, 252, 0.8), 0 0 8px rgba(192, 132, 252, 0.5);
                    border-color: #c084fc !important;
                }

                /* 6. Indigo Icon Glow */
                .glow-icon-indigo, [class*="text-indigo-"].glow-icon {
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
                    border-color: rgba(99, 102, 241, 0.4) !important;
                }
                .glow-card:hover .glow-icon-indigo, .glow-icon-indigo:hover, button:hover .glow-icon-indigo, .glow-card:hover [class*="text-indigo-"].glow-icon, [class*="text-indigo-"].glow-icon:hover {
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.65), 0 0 6px rgba(99, 102, 241, 0.4);
                    border-color: #6366f1 !important;
                }
                html.dark .glow-icon-indigo, html.dark [class*="text-indigo-"].glow-icon {
                    box-shadow: 0 0 14px rgba(99, 102, 241, 0.5), inset 0 0 8px rgba(99, 102, 241, 0.25);
                    border-color: rgba(129, 140, 248, 0.6) !important;
                    background-color: rgba(49, 46, 129, 0.4) !important;
                }
                html.dark .glow-card:hover .glow-icon-indigo, html.dark .glow-icon-indigo:hover, html.dark button:hover .glow-icon-indigo, html.dark .glow-card:hover [class*="text-indigo-"].glow-icon, html.dark [class*="text-indigo-"].glow-icon:hover {
                    box-shadow: 0 0 24px rgba(129, 140, 248, 0.8), 0 0 8px rgba(129, 140, 248, 0.5);
                    border-color: #818cf8 !important;
                }

                /* 7. Rose / Red Icon Glow */
                .glow-icon-rose, [class*="text-rose-"].glow-icon {
                    box-shadow: 0 0 10px rgba(244, 63, 94, 0.3);
                    border-color: rgba(244, 63, 94, 0.4) !important;
                }
                .glow-card:hover .glow-icon-rose, .glow-icon-rose:hover, button:hover .glow-icon-rose, .glow-card:hover [class*="text-rose-"].glow-icon, [class*="text-rose-"].glow-icon:hover {
                    box-shadow: 0 0 20px rgba(244, 63, 94, 0.65), 0 0 6px rgba(244, 63, 94, 0.4);
                    border-color: #f43f5e !important;
                }
                html.dark .glow-icon-rose, html.dark [class*="text-rose-"].glow-icon {
                    box-shadow: 0 0 14px rgba(244, 63, 94, 0.5), inset 0 0 8px rgba(244, 63, 94, 0.25);
                    border-color: rgba(251, 113, 133, 0.6) !important;
                    background-color: rgba(136, 19, 55, 0.4) !important;
                }
                html.dark .glow-card:hover .glow-icon-rose, html.dark .glow-icon-rose:hover, html.dark button:hover .glow-icon-rose, html.dark .glow-card:hover [class*="text-rose-"].glow-icon, html.dark [class*="text-rose-"].glow-icon:hover {
                    box-shadow: 0 0 24px rgba(251, 113, 133, 0.8), 0 0 8px rgba(251, 113, 133, 0.5);
                    border-color: #fb7185 !important;
                }

                /* 8. Slate / Neutral Icon Glow */
                .glow-icon-slate, [class*="text-slate-"].glow-icon {
                    box-shadow: 0 0 10px rgba(100, 116, 139, 0.2);
                    border-color: rgba(148, 163, 184, 0.35) !important;
                }
                .glow-card:hover .glow-icon-slate, .glow-icon-slate:hover, button:hover .glow-icon-slate, .glow-card:hover [class*="text-slate-"].glow-icon, [class*="text-slate-"].glow-icon:hover {
                    box-shadow: 0 0 18px rgba(100, 116, 139, 0.45), 0 0 6px rgba(100, 116, 139, 0.3);
                    border-color: #64748b !important;
                }
                html.dark .glow-icon-slate, html.dark [class*="text-slate-"].glow-icon {
                    box-shadow: 0 0 12px rgba(148, 163, 184, 0.3), inset 0 0 8px rgba(148, 163, 184, 0.15);
                    border-color: rgba(203, 213, 225, 0.4) !important;
                    background-color: rgba(30, 41, 59, 0.5) !important;
                }
                html.dark .glow-card:hover .glow-icon-slate, html.dark .glow-icon-slate:hover, html.dark button:hover .glow-icon-slate, html.dark .glow-card:hover [class*="text-slate-"].glow-icon, html.dark [class*="text-slate-"].glow-icon:hover {
                    box-shadow: 0 0 20px rgba(203, 213, 225, 0.6), 0 0 8px rgba(203, 213, 225, 0.35);
                    border-color: #cbd5e1 !important;
                }
                .glow-button {
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .glow-button:hover {
                    box-shadow: 0 0 20px rgba(0, 94, 184, 0.4);
                    transform: translateY(-1px);
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideLeft {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-slide-left { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-fade-in { animation: fadeIn 0.2s ease-out; }

                /* Custom slim scrollbar */
                ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 9999px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                html.dark ::-webkit-scrollbar-thumb {
                    background: #475569;
                }
                html.dark ::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }

                /* Guarantee raw PyShiny bootstrap modal popups do not overlay modern React UI */
                #shiny-modal-wrapper, #shiny-modal-wrapper .modal, #shiny-modal-wrapper .modal-backdrop {
                    display: none !important;
                }
                body > .modal-backdrop {
                    display: none !important;
                }

                /* ========================================================================
                   LEADERSHIP PLANNING WORKSPACE - MIDNIGHT OCEANIC THEME
                   Inspired by Leadership Analytics Command Center (Dark Sapphire & Cyan)
                   ======================================================================== */
                html.dark {
                    color-scheme: dark;
                }
                html.dark body,
                html.dark #react-root {
                    background-color: #070e1c !important;
                    background-image: radial-gradient(ellipse at 85% 0%, rgba(26, 60, 107, 0.35) 0%, transparent 60%), radial-gradient(ellipse at 15% 100%, rgba(12, 30, 60, 0.4) 0%, transparent 50%) !important;
                    color: #adbed4 !important;
                }

                /* Fine blueprint technical grid overlay */
                html.dark body::before {
                    content: "";
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    background-image: linear-gradient(rgba(56, 189, 248, 0.02) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(56, 189, 248, 0.02) 1px, transparent 1px);
                    background-size: 32px 32px;
                    z-index: 0;
                }

                /* Headers & Bold Text -> Brilliant White */
                html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6 {
                    color: #ffffff !important;
                    letter-spacing: -0.02em;
                }
                html.dark strong, html.dark b, html.dark .font-black, html.dark .font-extrabold {
                    color: #ffffff !important;
                }

                /* Eyebrows & Overlines -> Ice Sky Cyan (#80c6ff), excluding elements with explicit semantic colors */
                html.dark [class*="uppercase"][class*="tracking-"]:not([class*="text-rose"]):not([class*="text-emerald"]):not([class*="text-purple"]):not([class*="text-amber"]):not([class*="text-slate"]):not([class*="text-red"]):not([class*="text-green"]),
                html.dark [class*="av-eyebrow"],
                html.dark .tracking-widest:not([class*="text-rose"]):not([class*="text-emerald"]):not([class*="text-purple"]):not([class*="text-amber"]):not([class*="text-slate"]) {
                    color: #80c6ff !important;
                }

                /* Text contrast remapping (Leadership Palette: White, Silvery Slate, Oceanic Blue) */
                html.dark .text-slate-900, html.dark [class*="text-slate-900"] { color: #ffffff !important; }
                html.dark .text-slate-800, html.dark [class*="text-slate-800"] { color: #f1f5f9 !important; }
                html.dark .text-slate-700, html.dark [class*="text-slate-700"] { color: #e2edff !important; }
                html.dark .text-slate-600, html.dark [class*="text-slate-600"] { color: #c4d4e9 !important; }
                html.dark .text-slate-500, html.dark [class*="text-slate-500"] { color: #adbed4 !important; }
                html.dark .text-slate-400, html.dark [class*="text-slate-400"] { color: #8fa5c2 !important; }
                html.dark .text-slate-300, html.dark [class*="text-slate-300"] { color: #c4d4e9 !important; }
                html.dark .text-slate-200, html.dark [class*="text-slate-200"] { color: #e2edff !important; }

                /* Colored Text on Dark Surfaces */
                html.dark .text-\[\#005eb8\], html.dark [class*="text-[#005eb8]"],
                html.dark .text-blue-950, html.dark [class*="text-blue-950"],
                html.dark .text-blue-900, html.dark [class*="text-blue-900"],
                html.dark .text-blue-800, html.dark [class*="text-blue-800"],
                html.dark .text-blue-700, html.dark [class*="text-blue-700"] { color: #80c6ff !important; }
                html.dark .text-blue-600, html.dark [class*="text-blue-600"] { color: #93c5fd !important; }

                html.dark .text-emerald-950, html.dark [class*="text-emerald-950"],
                html.dark .text-emerald-900, html.dark [class*="text-emerald-900"],
                html.dark .text-emerald-800, html.dark [class*="text-emerald-800"],
                html.dark .text-emerald-700, html.dark [class*="text-emerald-700"] { color: #6ee7b7 !important; }
                html.dark .text-emerald-600, html.dark [class*="text-emerald-600"] { color: #34d399 !important; }

                html.dark .text-rose-950, html.dark [class*="text-rose-950"],
                html.dark .text-rose-900, html.dark [class*="text-rose-900"],
                html.dark .text-rose-800, html.dark [class*="text-rose-800"],
                html.dark .text-rose-700, html.dark [class*="text-rose-700"] { color: #fca5a5 !important; }
                html.dark .text-rose-600, html.dark [class*="text-rose-600"] { color: #f87171 !important; }

                html.dark .text-amber-950, html.dark [class*="text-amber-950"],
                html.dark .text-amber-900, html.dark [class*="text-amber-900"],
                html.dark .text-amber-800, html.dark [class*="text-amber-800"],
                html.dark .text-amber-700, html.dark [class*="text-amber-700"] { color: #fbbf24 !important; }
                html.dark .text-amber-600, html.dark [class*="text-amber-600"],
                html.dark .text-amber-500, html.dark [class*="text-amber-500"] { color: #fbbf24 !important; }

                /* Always keep text on high-luminance amber/yellow backgrounds dark */
                .bg-amber-400, [class*="bg-amber-400"],
                .bg-amber-400 *, [class*="bg-amber-400"] *,
                html.dark .bg-amber-400, html.dark [class*="bg-amber-400"],
                html.dark .bg-amber-400 *, html.dark [class*="bg-amber-400"] *,
                .bg-yellow-400, [class*="bg-yellow-400"],
                .bg-yellow-400 *, [class*="bg-yellow-400"] *,
                html.dark .bg-yellow-400, html.dark [class*="bg-yellow-400"],
                html.dark .bg-yellow-400 *, html.dark [class*="bg-yellow-400"] * {
                    color: #0f172a !important;
                }

                html.dark .text-purple-950, html.dark [class*="text-purple-950"],
                html.dark .text-purple-900, html.dark [class*="text-purple-900"],
                html.dark .text-purple-800, html.dark [class*="text-purple-800"],
                html.dark .text-purple-700, html.dark [class*="text-purple-700"] { color: #d8b4fe !important; }
                html.dark .text-purple-600, html.dark [class*="text-purple-600"] { color: #c084fc !important; }

                html.dark .text-white, html.dark [class*="text-white"] { color: #ffffff !important; }

                /* Surface backgrounds - Deep Sapphire Ocean with Ambient Glow */
                html.dark .bg-white, html.dark [class*="bg-white"],
                html.dark .bg-slate-800, html.dark [class*="bg-slate-800"],
                html.dark .bg-slate-900, html.dark [class*="bg-slate-900"] {
                    background-image: radial-gradient(ellipse at 84% 8%, rgba(37, 91, 156, 0.22) 0%, transparent 55%), linear-gradient(135deg, #0c1b31 0%, #081324 100%) !important;
                    background-color: #0b1a30 !important;
                    border-color: #18365d !important;
                    box-shadow: 0 8px 24px -4px rgba(2, 6, 23, 0.75), inset 0 1px 0 rgba(147, 197, 253, 0.1) !important;
                }
                html.dark .bg-\[\#fbfcfd\], html.dark [class*="bg-[#fbfcfd]"],
                html.dark .bg-\[\#fcfdfd\], html.dark [class*="bg-[#fcfdfd]"],
                html.dark .bg-\[\#f8fafc\], html.dark [class*="bg-[#f8fafc]"],
                html.dark .bg-\[\#f0f7ff\], html.dark [class*="bg-[#f0f7ff]"] {
                    background-image: none !important;
                    background-color: #070e1c !important;
                }
                html.dark .bg-slate-50, html.dark [class*="bg-slate-50"] {
                    background-image: none !important;
                    background-color: #091629 !important;
                    border-color: #18365d !important;
                }
                html.dark .bg-slate-100, html.dark [class*="bg-slate-100"],
                html.dark .bg-slate-200, html.dark [class*="bg-slate-200"] {
                    background-image: none !important;
                    background-color: #0d1e38 !important;
                    border-color: #18365d !important;
                }

                /* Neutralize ALL linear gradients with white/light stops */
                html.dark [class*="from-white"], html.dark [class*="via-white"], html.dark [class*="to-white"],
                html.dark [class*="from-slate-50"], html.dark [class*="via-slate-50"], html.dark [class*="to-slate-50"],
                html.dark [class*="from-blue-50"], html.dark [class*="via-blue-50"], html.dark [class*="to-blue-50"],
                html.dark [class*="from-indigo-50"], html.dark [class*="via-indigo-50"], html.dark [class*="to-indigo-50"],
                html.dark [class*="from-sky-50"], html.dark [class*="via-sky-50"], html.dark [class*="to-sky-50"],
                html.dark [class*="from-emerald-50"], html.dark [class*="via-emerald-50"], html.dark [class*="to-emerald-50"],
                html.dark [class*="from-rose-50"], html.dark [class*="via-rose-50"], html.dark [class*="to-rose-50"],
                html.dark [class*="from-amber-50"], html.dark [class*="via-amber-50"], html.dark [class*="to-amber-50"],
                html.dark [class*="from-purple-50"], html.dark [class*="via-purple-50"], html.dark [class*="to-purple-50"] {
                    background-image: radial-gradient(ellipse at 84% 8%, rgba(37, 91, 156, 0.22) 0%, transparent 55%), linear-gradient(135deg, #0c1b31 0%, #081324 100%) !important;
                    background-color: #0b1a30 !important;
                    border-color: #18365d !important;
                }

                /* Frosted Pills & Metadata Capsules (Inspired by Image Pills) */
                html.dark [class*="rounded-full"][class*="border"] {
                    background-color: rgba(255, 255, 255, 0.06) !important;
                    border-color: rgba(255, 255, 255, 0.14) !important;
                    color: #c4d4e9 !important;
                }
                html.dark [class~="bg-blue-50"], html.dark [class*="bg-blue-50/"], html.dark [class~="bg-sky-50"], html.dark [class*="bg-sky-50/"] {
                    background-color: rgba(20, 48, 88, 0.6) !important;
                    border-color: #1e457d !important;
                    color: #80c6ff !important;
                }
                html.dark [class~="bg-blue-100"], html.dark [class*="bg-blue-100/"] {
                    background-color: rgba(30, 68, 130, 0.75) !important;
                    border-color: #255b9c !important;
                    color: #d8efff !important;
                }
                html.dark [class~="bg-emerald-50"], html.dark [class*="bg-emerald-50/"] {
                    background-color: rgba(6, 78, 59, 0.45) !important;
                    border-color: rgba(16, 185, 129, 0.4) !important;
                    color: #6ee7b7 !important;
                }
                html.dark [class~="bg-emerald-100"], html.dark [class*="bg-emerald-100/"] {
                    background-color: rgba(6, 95, 70, 0.6) !important;
                    border-color: rgba(16, 185, 129, 0.5) !important;
                    color: #a7f3d0 !important;
                }
                html.dark [class~="bg-rose-50"], html.dark [class*="bg-rose-50/"] {
                    background-color: rgba(136, 19, 55, 0.45) !important;
                    border-color: rgba(244, 63, 94, 0.4) !important;
                    color: #fca5a5 !important;
                }
                html.dark [class~="bg-rose-100"], html.dark [class*="bg-rose-100/"] {
                    background-color: rgba(159, 18, 57, 0.6) !important;
                    border-color: rgba(244, 63, 94, 0.5) !important;
                    color: #fecdd3 !important;
                }
                html.dark [class~="bg-amber-50"], html.dark [class*="bg-amber-50/"] {
                    background-color: rgba(120, 53, 15, 0.45) !important;
                    border-color: rgba(245, 158, 11, 0.4) !important;
                    color: #fbbf24 !important;
                }
                html.dark [class~="bg-amber-100"], html.dark [class*="bg-amber-100/"] {
                    background-color: rgba(146, 64, 14, 0.6) !important;
                    border-color: rgba(245, 158, 11, 0.5) !important;
                    color: #fde68a !important;
                }
                html.dark [class~="bg-purple-50"], html.dark [class*="bg-purple-50/"] {
                    background-color: rgba(88, 28, 135, 0.45) !important;
                    border-color: rgba(168, 85, 247, 0.4) !important;
                    color: #d8b4fe !important;
                }
                html.dark [class~="bg-purple-100"], html.dark [class*="bg-purple-100/"] {
                    background-color: rgba(107, 33, 168, 0.6) !important;
                    border-color: rgba(168, 85, 247, 0.5) !important;
                    color: #e9d5ff !important;
                }
                html.dark [class~="bg-indigo-50"], html.dark [class*="bg-indigo-50/"] {
                    background-color: rgba(49, 46, 129, 0.45) !important;
                    border-color: rgba(99, 102, 241, 0.4) !important;
                    color: #a5b4fc !important;
                }

                /* Borders - Sapphire Blue (#18365d) */
                html.dark [class*="border-slate-100"],
                html.dark [class*="border-slate-200"],
                html.dark [class*="divide-slate-100"],
                html.dark [class*="divide-slate-200"] { border-color: #18365d !important; }
                html.dark [class*="border-slate-300"],
                html.dark [class*="divide-slate-300"] { border-color: #214472 !important; }

                /* Form Controls (Leadership Sapphire Theme) */
                select.bg-transparent,
                select[class*="bg-transparent"],
                input.bg-transparent,
                input[class*="bg-transparent"],
                html.dark select.bg-transparent,
                html.dark select[class*="bg-transparent"],
                html.dark input.bg-transparent,
                html.dark input[class*="bg-transparent"] {
                    background: transparent !important;
                    background-color: transparent !important;
                    border: none !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                select.bg-transparent:focus,
                select[class*="bg-transparent"]:focus,
                input.bg-transparent:focus,
                input[class*="bg-transparent"]:focus,
                html.dark select.bg-transparent:focus,
                html.dark select[class*="bg-transparent"]:focus,
                html.dark input.bg-transparent:focus,
                html.dark input[class*="bg-transparent"]:focus {
                    background: transparent !important;
                    background-color: transparent !important;
                    border: none !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                html.dark select:not(.bg-transparent):not([class*="bg-transparent"]),
                html.dark input[type="text"]:not(.bg-transparent):not([class*="bg-transparent"]),
                html.dark input[type="number"]:not(.bg-transparent):not([class*="bg-transparent"]),
                html.dark input[type="search"]:not(.bg-transparent):not([class*="bg-transparent"]),
                html.dark textarea:not(.bg-transparent) {
                    background-color: #081324 !important;
                    color: #ffffff !important;
                    border: 1px solid #18365d !important;
                    border-radius: 8px !important;
                }
                html.dark select:not(.bg-transparent):not([class*="bg-transparent"]):focus,
                html.dark input:not(.bg-transparent):not([class*="bg-transparent"]):focus,
                html.dark textarea:not(.bg-transparent):focus {
                    border-color: #2563eb !important;
                    outline: 2px solid rgba(37, 99, 235, 0.25) !important;
                    outline-offset: 1px !important;
                }
                html.dark select option, html.dark select optgroup {
                    background-color: #081324 !important;
                    color: #ffffff !important;
                }
                html.dark input::placeholder, html.dark textarea::placeholder {
                    color: #7d93b2 !important;
                }

                /* Buttons (Sapphire Accent & Glassy Navy) */
                html.dark .bg-\[\#005eb8\], html.dark [class*="bg-[#005eb8]"] {
                    background: linear-gradient(135deg, #005eb8 0%, #1d4ed8 100%) !important;
                    border: 1px solid rgba(147, 197, 253, 0.35) !important;
                    box-shadow: 0 4px 14px rgba(0, 94, 184, 0.4) !important;
                    color: #ffffff !important;
                }
                html.dark .bg-\[\#005eb8\]:hover, html.dark [class*="bg-[#005eb8]"]:hover {
                    background: linear-gradient(135deg, #004b87 0%, #1e40af 100%) !important;
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5) !important;
                }

                /* Tables (Leadership Cockpit Grid) */
                html.dark table { color: #c4d4e9 !important; border-color: #18365d !important; }
                html.dark table th, html.dark thead th {
                    background-color: #0c1b31 !important;
                    color: #80c6ff !important;
                    border-color: #18365d !important;
                }
                html.dark table td { border-color: #122846 !important; }
                html.dark table tr:hover td {
                    background-color: #112649 !important;
                    color: #ffffff !important;
                }
                html.dark thead, html.dark thead tr, html.dark th {
                    background-color: #1e293b !important;
                    color: #ffffff !important;
                    border-color: #334155 !important;
                }
                html.dark th span, html.dark th div { color: #f8fafc !important; }
                html.dark td { color: #cbd5e1 !important; border-color: #334155 !important; }
                html.dark td span, html.dark td div, html.dark td strong, html.dark td b { color: inherit; }
                html.dark tbody tr:hover, html.dark tbody tr:hover td {
                    background-color: #334155 !important;
                }
                html.dark tfoot, html.dark tfoot tr, html.dark tfoot td {
                    background-color: #1e293b !important;
                    color: #f8fafc !important;
                    border-color: #334155 !important;
                }
                html.dark [class*="sticky"] { background-color: #1e293b !important; }

                /* Floating Windows & Modal Backdrop: completely conceal background elements */
                .floating-modal-backdrop,
                div[class*="fixed"][class*="inset-0"][class*="z-"] {
                    background-color: rgba(2, 6, 23, 0.98) !important;
                    backdrop-filter: blur(16px) !important;
                    -webkit-backdrop-filter: blur(16px) !important;
                }
                html.dark .floating-modal-backdrop,
                html.dark div[class*="fixed"][class*="inset-0"][class*="z-"] {
                    background-color: rgba(2, 6, 23, 0.98) !important;
                }

                /* Modals & Dialogs */
                html.dark .fixed .bg-white,
                html.dark [class*="fixed"] [class*="bg-white"],
                html.dark .status-modal-content,
                html.dark .status-modal-badge-card,
                html.dark .modal-content {
                    background-color: #1e293b !important;
                    background-image: none !important;
                    border-color: #334155 !important;
                    color: #f8fafc !important;
                }
                html.dark .status-modal-title { color: #ffffff !important; }
                html.dark .status-modal-subtitle { color: #cbd5e1 !important; }
                html.dark .session-option-box {
                    background: #0f172a !important;
                    border-color: #334155 !important;
                    color: #e2e8f0 !important;
                }
                html.dark .session-option-box:hover {
                    background: #334155 !important;
                    border-color: #60a5fa !important;
                }

                /* SVG elements */
                html.dark svg text { fill: #cbd5e1; }
                html.dark svg text[fill="#0f172a"], html.dark svg text[fill="#17243b"], html.dark svg text[fill="#24344e"] { fill: #ffffff !important; }
                html.dark svg text[fill="#334155"], html.dark svg text[fill="#475569"] { fill: #f1f5f9 !important; }
                html.dark svg text[fill="#64748b"], html.dark svg text[fill="#94a3b8"] { fill: #cbd5e1 !important; }
                html.dark svg text[fill="#005eb8"], html.dark svg text[fill="#1d4ed8"], html.dark svg text[fill="#2563eb"], html.dark svg text[fill="#0284c7"] { fill: #60a5fa !important; }
                html.dark svg text[fill="#059669"], html.dark svg text[fill="#10b981"], html.dark svg text[fill="#16a34a"] { fill: #6ee7b7 !important; }
                html.dark svg text[fill="#dc2626"], html.dark svg text[fill="#ef4444"], html.dark svg text[fill="#f43f5e"] { fill: #fca5a5 !important; }
                html.dark svg line[stroke="#f1f5f9"], html.dark svg line[stroke="#e2e8f0"], html.dark svg line[stroke="#eef2f7"], html.dark svg line[stroke="#e8edf5"] { stroke: #334155 !important; }
                html.dark svg line[stroke="#94a3b8"] { stroke: #64748b !important; }
                html.dark svg circle[stroke="#fff"], html.dark svg circle[stroke="#ffffff"] { stroke: #1e293b !important; }
                """
            ),
            
            # Modal backdrop cleanup and user activity ping script matching reference repo
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
            """),
            
            # Inject Initial Backend Data
            ui.tags.script(
                ui.HTML(f"window.INITIAL_CAPACITY_DATA = {initial_json};")
            )
        ),
        
        # Top cluster banner (visible if cluster is offline/starting/error)
        ui.div(ui.output_ui("cluster_banner"), id="cluster_banner_container"),
        
        # Root container for React
        ui.div(id="react-root"),
        
        ui.tags.script(src=f"analytics_engine.js?v={cache_bust}"),
        ui.tags.script(src=f"forecast_analytics_engine.js?v={cache_bust}"),
        ui.tags.link(rel="stylesheet", href=f"analytics.css?v={cache_bust}"),
        ui.tags.link(rel="stylesheet", href=f"analytics_details.css?v={cache_bust}"),
        ui.tags.link(rel="stylesheet", href=f"dark_theme.css?v={cache_bust}"),
        ui.tags.script(type="text/babel", src=f"analytics_charts.js?v={cache_bust}"),
        ui.tags.script(type="text/babel", src=f"analytics_details.js?v={cache_bust}"),
        ui.tags.script(type="text/babel", src=f"forecast_analytics_ui.js?v={cache_bust}"),
        ui.tags.script(type="text/babel", src=f"analytics_ui.js?v={cache_bust}"),
        ui.tags.script(type="text/babel", src=f"input_compare.js?v={cache_bust}"),
        # Load React application code from static with cache-buster
        ui.tags.script(
            type="text/babel",
            src=f"react_app.js?v={cache_bust}"
        )
    )
