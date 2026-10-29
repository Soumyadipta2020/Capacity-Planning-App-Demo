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
    SampleDataGenerator
)
from engine.data_engine import CapacityDataEngine

def create_modern_ui_page():
    """Generates the modern full-bleed HTML layout for the React client without container-fluid."""
    sm = ScenarioManager()
    engine = CapacityDataEngine()
    
    # Pre-serialize initial scenario data for the React client
    initial_data = {
        "envInfo": engine.get_engine_status(),
        "scenarios": sm.get_all_scenarios(),
        "inputOptions": DEFAULT_INPUT_OPTIONS,
        "remarksMap": DEFAULT_REMARKS,
        "imbalanceData": SampleDataGenerator.get_imbalance_data().to_dict(orient="records"),
        "indayWorkloadData": SampleDataGenerator.get_inday_workload_data().to_dict(orient="records"),
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
                }
                #react-root {
                    width: 100vw !important;
                    height: 100vh !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    display: flex;
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
            
            # Inject Initial Backend Data
            ui.tags.script(
                ui.HTML(f"window.INITIAL_CAPACITY_DATA = {initial_json};")
            )
        ),
        
        # Root container for React
        ui.div(id="react-root"),
        
        # Load React application code from static with cache-buster
        ui.tags.script(
            type="text/babel",
            src=f"react_app.js?v={cache_bust}"
        )
    )
