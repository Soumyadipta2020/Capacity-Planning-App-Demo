"""
Modern React UI Wrapper for PyShiny
Hosts the modern React 18 / Tailwind CSS client directly inside PyShiny.
Uses ui.TagList to completely eliminate Bootstrap container-fluid and body gutters,
achieving a true 100% full-bleed edge-to-edge layout with zero left margin.
"""

import json
import time
from pathlib import Path
from shiny import ui
from config import EnvironmentConfig
from data_manager import (
    DEFAULT_INPUT_OPTIONS,
    DEFAULT_REMARKS,
    ScenarioManager,
    SampleDataGenerator,
    load_input_table_data,
    get_calculation_module_data
)
from engine.data_engine import CapacityDataEngine

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

    # Pre-load calculation modules data (fte, downtime, productivity -> capacity; demand -> imbalance)
    initial_calc_data = {}
    for mod_key in ["imbalance", "capacity", "fte", "downtime", "productivity", "demand"]:
        try:
            initial_calc_data[mod_key] = get_calculation_module_data(mod_key)
        except Exception:
            pass

    # Pre-serialize initial scenario data for the React client
    initial_data = {
        "envInfo": engine.get_engine_status(),
        "scenarios": sm.get_all_scenarios(),
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
                                chartYellow: '#facc15'
                            }
                        }
                    }
                }
                """
            ),
            
            # Reset CSS: Force 0 margin & padding on html, body, and root (preventing left whitespace & double scrollbars)
            ui.tags.style(
                """
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
                
                /* MODERN GLOWING HOVER EFFECTS (BRITISH GAS BLUE THEME) */
                .glow-card {
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .glow-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px -4px rgba(0, 94, 184, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
                    border-color: #005eb8 !important;
                }
                .glow-icon {
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .glow-card:hover .glow-icon {
                    box-shadow: 0 0 16px rgba(0, 114, 206, 0.35);
                    transform: scale(1.08);
                    border-color: #005eb8 !important;
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
        
        # Load React application code from static with cache-buster
        ui.tags.script(
            type="text/babel",
            src=f"react_app.js?v={cache_bust}"
        )
    )
