/**
 * British Gas Capacity Planning Platform - Modern Fluid React Application
 * Re-skinned with modern SVG icons, glowing hover effects, and 100% full-bleed edge-to-edge layout.
 */

const { useState, useEffect, useRef, useMemo } = React;

// ================================================================================================
// MODERN SVG ICON COMPONENTS WITH CRISP VECTOR STYLING
// ================================================================================================
function IconDemand({ className = "w-5 h-5" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}

function IconCapacity({ className = "w-5 h-5" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    );
}

function IconBuffer({ className = "w-5 h-5" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    );
}

function IconCoverage({ className = "w-5 h-5" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <circle cx="12" cy="12" r="6" strokeWidth="2" />
            <circle cx="12" cy="12" r="2" strokeWidth="2" />
        </svg>
    );
}

function IconDashboard({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM14 5a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
    );
}

function IconSliders({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
    );
}

function IconScale({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
    );
}

function IconMatrix({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}

function IconMap({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
    );
}

function IconCalendar({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function IconCurrency({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function IconDatabase({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
    );
}

function IconRobot({ className = "w-5 h-5" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="10" rx="2" strokeWidth="2" />
            <circle cx="12" cy="5" r="2" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 7v4m-4 5h.01m7.99 0h.01" />
        </svg>
    );
}

function IconSparkles({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    );
}

function IconGear({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
    );
}

function IconRefresh({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}

function IconDownload({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

function IconCheck({ className = "w-3.5 h-3.5" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
    );
}

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================
function ModernCapacityApp() {
    const [activeTab, setActiveTab] = useState('insights');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);
    
    // Engine & Environment state
    const [envInfo, setEnvInfo] = useState({
        is_databricks: false,
        environment: "VS Code (Local Dev)",
        catalog: "capacity_planning",
        schema: "gold",
        storage_target: "Local Filesystem: ./data",
        calc_mode: "Local Pandas / NumPy"
    });

    // Scenario State
    const [scenarios, setScenarios] = useState({});
    const [selectedScenarioId, setSelectedScenarioId] = useState("LV OCT V.0 2026-10-29 16:00:00");
    const [comparisonScenarioId, setComparisonScenarioId] = useState("LV JUL V.1 2026-07-07 12:46:46");
    
    // Scenario form metadata
    const [planType, setPlanType] = useState("LV");
    const [month, setMonth] = useState("OCT");
    const [version, setVersion] = useState("0");
    const [remarks, setRemarks] = useState("October Operating Plan baseline");

    // All 21 Input Selections & History
    const [inputsState, setInputsState] = useState({});
    const [inputsChoices, setInputsChoices] = useState({});
    const [deletedHistory, setDeletedHistory] = useState({});
    const [remarksMap, setRemarksMap] = useState({});

    // Tabular Data
    const [imbalanceData, setImbalanceData] = useState([]);
    const [indayWorkloadData, setIndayWorkloadData] = useState([]);
    const [demCapSubTab, setDemCapSubTab] = useState('imbalance');
    const [imbalanceFilter, setImbalanceFilter] = useState('');
    const [selectedTerritory, setSelectedTerritory] = useState('All');

    // Copilot Chat
    const [copilotMessages, setCopilotMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your ES Capacity Planning Copilot. Ask me about patch deficits, cross-skilling recommendations, or scenario variance.' }
    ]);
    const [copilotInput, setCopilotInput] = useState('');

    // Notifications toast
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load initial data from backend
    useEffect(() => {
        if (window.INITIAL_CAPACITY_DATA) {
            const init = window.INITIAL_CAPACITY_DATA;
            if (init.envInfo) setEnvInfo(init.envInfo);
            if (init.scenarios) setScenarios(init.scenarios);
            if (init.inputOptions) {
                setInputsChoices(init.inputOptions);
                const initialSelections = {};
                Object.keys(init.inputOptions).forEach(k => {
                    initialSelections[k] = init.inputOptions[k][0];
                });
                setInputsState(initialSelections);
            }
            if (init.remarksMap) setRemarksMap(init.remarksMap);
            if (init.imbalanceData) setImbalanceData(init.imbalanceData);
            if (init.indayWorkloadData) setIndayWorkloadData(init.indayWorkloadData);
        }

        if (window.Shiny && window.Shiny.addCustomMessageHandler) {
            window.Shiny.addCustomMessageHandler('update_scenario_data', function(data) {
                if (data.scenarios) setScenarios(data.scenarios);
                if (data.selectedScenarioId) setSelectedScenarioId(data.selectedScenarioId);
                if (data.inputsState) setInputsState(data.inputsState);
                if (data.imbalanceData) setImbalanceData(data.imbalanceData);
                if (data.envInfo) setEnvInfo(data.envInfo);
                showToast("Data synchronized with backend.", "success");
            });

            window.Shiny.addCustomMessageHandler('show_toast', function(data) {
                showToast(data.message, data.type || "info");
            });
        }
    }, []);

    // Current scenario object
    const currentScenario = useMemo(() => {
        return scenarios[selectedScenarioId] || {
            id: selectedScenarioId,
            plan_type: planType,
            month: month,
            version: version,
            remarks: remarks,
            inputs: inputsState
        };
    }, [scenarios, selectedScenarioId, planType, month, version, remarks, inputsState]);

    // Handle Input Selection Change
    const handleInputChange = (key, val) => {
        setInputsState(prev => ({ ...prev, [key]: val }));
        if (window.Shiny && window.Shiny.setInputValue) {
            window.Shiny.setInputValue(key, val, { priority: 'event' });
        }
    };

    // Handle Input Delete
    const handleInputDelete = (key, label) => {
        const choices = inputsChoices[key] || [];
        const curr = inputsState[key] || choices[0];
        if (choices.length <= 1) {
            showToast(`Cannot delete the last remaining option for ${label}.`, 'warning');
            return;
        }

        const newChoices = choices.filter(c => c !== curr);
        const newSel = newChoices[0];
        setInputsChoices(prev => ({ ...prev, [key]: newChoices }));
        setInputsState(prev => ({ ...prev, [key]: newSel }));
        setDeletedHistory(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), curr]
        }));

        showToast(`Deleted '${curr}' from ${label}. Click Undo to restore.`, 'info');

        if (window.Shiny && window.Shiny.setInputValue) {
            window.Shiny.setInputValue(`btn_del_${key}`, Math.random(), { priority: 'event' });
        }
    };

    // Handle Input Undo
    const handleInputUndo = (key, label) => {
        const history = deletedHistory[key] || [];
        if (history.length === 0) {
            showToast(`No deleted versions to undo for ${label}.`, 'warning');
            return;
        }

        const restored = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        const choices = inputsChoices[key] || [];
        const newChoices = choices.includes(restored) ? choices : [restored, ...choices];

        setDeletedHistory(prev => ({ ...prev, [key]: newHistory }));
        setInputsChoices(prev => ({ ...prev, [key]: newChoices }));
        setInputsState(prev => ({ ...prev, [key]: restored }));

        showToast(`Restored version '${restored}' for ${label}.`, 'success');

        if (window.Shiny && window.Shiny.setInputValue) {
            window.Shiny.setInputValue(`btn_undo_${key}`, Math.random(), { priority: 'event' });
        }
    };

    // Save Scenario
    const handleSaveScenario = () => {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const newId = `${planType} ${month} V.${version} ${now}`;
        const newScenario = {
            id: newId,
            plan_type: planType,
            month: month,
            version: version,
            remarks: remarks,
            created_at: now,
            inputs: { ...inputsState }
        };

        setScenarios(prev => ({ ...prev, [newId]: newScenario }));
        setSelectedScenarioId(newId);
        showToast(`Scenario '${newId}' saved!`, 'success');

        if (window.Shiny && window.Shiny.setInputValue) {
            window.Shiny.setInputValue('save_scenario_event', {
                plan_type: planType,
                month: month,
                version: version,
                remarks: remarks,
                inputs: inputsState
            }, { priority: 'event' });
        }
    };

    // Load Scenario
    const handleLoadScenario = (scenarioId) => {
        const scen = scenarios[scenarioId];
        if (!scen) return;
        setSelectedScenarioId(scenarioId);
        setPlanType(scen.plan_type || "LV");
        setMonth(scen.month || "OCT");
        setVersion(scen.version || "0");
        setRemarks(scen.remarks || "");
        if (scen.inputs) {
            setInputsState({ ...scen.inputs });
        }
        showToast(`Loaded scenario: ${scenarioId}`, 'info');

        if (window.Shiny && window.Shiny.setInputValue) {
            window.Shiny.setInputValue('load_scenario_event', scenarioId, { priority: 'event' });
        }
    };

    // Copilot Submit
    const handleSendCopilot = () => {
        if (!copilotInput.trim()) return;
        const q = copilotInput.trim();
        setCopilotMessages(prev => [...prev, { role: 'user', text: q }]);
        setCopilotInput('');

        setTimeout(() => {
            let reply = "";
            const lower = q.toLowerCase();
            if (lower.includes("deficit") || lower.includes("imbalance") || lower.includes("leicester")) {
                reply = "Diagnostic for " + selectedScenarioId + ":\n• Deficit of -4.1 FTE identified in EC91 Leicester during Week 44.\n• Root Cause: 3 recent leavers in KAC appliances coupled with high winter boiler breakdown volume.\n• Optimal Recommendation: Authorize 2 cross-skilled HEC technicians from Region B (North) via mutual aid to satisfy SLA without external agency cost.";
            } else if (lower.includes("cost") || lower.includes("contractor") || lower.includes("finance")) {
                reply = "Financial Analysis:\n• Direct Engineering Labor: £1,420,000.\n• CTR Agency Contractor Spend: £184,500 (12 shifts).\n• Actionable Saving: Increasing HEC-on-KAC cross-skilling support factor to 90% cuts contractor cost by £34,200.";
            } else {
                reply = "Under " + selectedScenarioId + ", national capacity coverage is 107.2% with a net buffer of +73.3 FTE. Highest operational stress occurs between 2026-11-09 and 2026-11-23.";
            }
            setCopilotMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        }, 500);
    };

    return (
        <div className="flex h-screen w-full bg-[#fcfdfd] font-sans text-slate-800 overflow-hidden antialiased">
            {/* FLOATING TOAST */}
            {toast && (
                <div className={`fixed bottom-20 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-xs font-semibold border backdrop-blur-md animate-slide-up ${
                    toast.type === 'success' ? 'bg-[#005eb8] text-white border-blue-500' :
                    toast.type === 'warning' ? 'bg-amber-500 text-white border-amber-400' :
                    'bg-slate-900 text-white border-slate-700'
                }`}>
                    <span>{toast.message}</span>
                </div>
            )}

            {/* WHITE & BRITISH GAS BLUE SIDEBAR (FLUSH TO LEFT EDGE: 0 MARGIN) */}
            <aside className={`bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 z-30 shadow-[2px_0_12px_rgba(0,0,0,0.02)] flex-shrink-0 h-full ${
                isSidebarCollapsed ? 'w-20' : 'w-64'
            }`}>
                {/* Brand Header */}
                <div className="h-14 flex items-center justify-center px-4 border-b border-slate-100 flex-shrink-0">
                    <div className="bg-[#005eb8] text-white font-black tracking-tight px-3 py-1.5 rounded-lg text-sm shadow-sm flex items-center justify-center glow-button whitespace-nowrap">
                        {isSidebarCollapsed ? 'ES' : 'ES Capacity App'}
                    </div>
                </div>

                {/* Engine Mode Pill (with environment at left) */}
                {!isSidebarCollapsed && (
                    <div className="px-4 py-1.5 border-b border-slate-100 flex items-center justify-center gap-2 bg-slate-50/40">
                        <span className="text-[10px] font-medium text-slate-400 lowercase">environment</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                            envInfo.is_databricks 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${envInfo.is_databricks ? 'bg-rose-500' : 'bg-blue-600'}`}></span>
                            <span>{envInfo.is_databricks ? 'databricks' : 'vscode'}</span>
                        </span>
                    </div>
                )}

                {/* Navigation Menu (All 8 Original Tabs with Modern SVG Icons) */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                    {[
                        { id: 'insights', label: 'Executive Insights', icon: <IconDashboard />, badge: 'Home' },
                        { id: 'inputs', label: 'Inputs & Parameters', icon: <IconSliders />, badge: '21 Files' },
                        { id: 'comparison', label: 'Scenario Diff & Variance', icon: <IconScale /> },
                        { id: 'dem_cap', label: 'Dem vs Cap Matrix', icon: <IconMatrix /> },
                        { id: 'map', label: 'UK Geospatial Map', icon: <IconMap /> },
                        { id: 'shifts', label: 'Shift & Roster Plan', icon: <IconCalendar /> },
                        { id: 'finance', label: 'Financial Cost-to-Serve', icon: <IconCurrency /> },
                        { id: 'architecture', label: 'Unity Catalog Architecture', icon: <IconDatabase /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-all group ${
                                activeTab === tab.id
                                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs border border-blue-100/80'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`transition-transform duration-200 group-hover:scale-110 ${
                                    activeTab === tab.id ? 'text-blue-700' : 'text-slate-400 group-hover:text-blue-600'
                                }`}>
                                    {tab.icon}
                                </span>
                                {!isSidebarCollapsed && <span>{tab.label}</span>}
                            </div>
                            {!isSidebarCollapsed && tab.badge && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    activeTab === tab.id ? 'bg-[#005eb8] text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Sidebar Footer Controls */}
                <div className="p-2.5 border-t border-slate-100 flex items-center justify-center">
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="text-slate-400 hover:text-slate-700 text-[11px] font-medium px-2 py-1 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
                        title="Toggle Sidebar"
                    >
                        <span>◫</span>
                        {!isSidebarCollapsed && <span>Collapse</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN APP SHELL (FULL-BLEED FLUID) */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* TOP HEADER (COMPACT 56PX HEIGHT) */}
                <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between z-20 flex-shrink-0">
                    {/* Scenario Quick Selector Pill */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 transition shadow-xs flex-shrink-0 hover:text-slate-800">
                            <IconGear className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Scenario:</span>
                            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-xs hover:border-blue-300 transition">
                                <select
                                    value={selectedScenarioId}
                                    onChange={(e) => handleLoadScenario(e.target.value)}
                                    className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer max-w-sm truncate"
                                >
                                    {Object.keys(scenarios).map(id => (
                                        <option key={id} value={id}>{id}</option>
                                    ))}
                                </select>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 ml-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Synced
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Action Icons & Shortcuts */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('inputs')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition flex items-center gap-1.5 shadow-xs hover:border-blue-300"
                        >
                            <IconSliders className="w-3.5 h-3.5 text-blue-600" />
                            <span>Configure Inputs (21)</span>
                        </button>
                        <button 
                            onClick={() => showToast("Refreshed scenario data from backend.", "success")}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 flex items-center justify-center text-slate-600 shadow-xs transition hover:text-blue-600"
                            title="Refresh Data"
                        >
                            <IconRefresh className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => showToast("Exporting scenario report...", "info")}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 flex items-center justify-center text-slate-600 shadow-xs transition hover:text-blue-600"
                            title="Download Report"
                        >
                            <IconDownload className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setIsCopilotOpen(true)}
                            className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-50 to-sky-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-xs hover:shadow transition glow-button"
                            title="Capacity AI Assistant"
                        >
                            <IconSparkles className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                    </div>
                </header>

                {/* TAB CONTENT AREA (FLUID SCROLLABLE MAIN WITH TIGHT SPACING) */}
                <main className="flex-1 overflow-y-auto px-6 py-4 bg-[#fbfcfd] space-y-3.5">
                    {/* TAB 1: EXECUTIVE SCENARIO INSIGHTS (HOMEPAGE) */}
                    {activeTab === 'insights' && (
                        <ScenarioExecutiveInsightsView
                            scenario={currentScenario}
                            onConfigureInputs={() => setActiveTab('inputs')}
                            onCompareScenario={() => setActiveTab('comparison')}
                            imbalanceData={imbalanceData}
                            selectedTerritory={selectedTerritory}
                            setSelectedTerritory={setSelectedTerritory}
                            showToast={showToast}
                        />
                    )}

                    {/* TAB 2: SCENARIO INPUTS & PARAMETERS STUDIO */}
                    {activeTab === 'inputs' && (
                        <ScenarioInputsStudioView
                            planType={planType}
                            setPlanType={setPlanType}
                            month={month}
                            setMonth={setMonth}
                            version={version}
                            setVersion={setVersion}
                            remarks={remarks}
                            setRemarks={setRemarks}
                            onSave={handleSaveScenario}
                            inputsState={inputsState}
                            inputsChoices={inputsChoices}
                            remarksMap={remarksMap}
                            onInputChange={handleInputChange}
                            onInputDelete={handleInputDelete}
                            onInputUndo={handleInputUndo}
                            showToast={showToast}
                        />
                    )}

                    {/* TAB 3: SCENARIO DIFF & COMPARISON */}
                    {activeTab === 'comparison' && (
                        <ScenarioComparisonView
                            scenarios={scenarios}
                            scenario1Id={selectedScenarioId}
                            scenario2Id={comparisonScenarioId}
                            setScenario2Id={setComparisonScenarioId}
                            inputsChoices={inputsChoices}
                        />
                    )}

                    {/* TAB 4: DEM VS CAP MATRIX */}
                    {activeTab === 'dem_cap' && (
                        <DemVsCapView
                            subTab={demCapSubTab}
                            setSubTab={setDemCapSubTab}
                            imbalanceData={imbalanceData}
                            indayData={indayWorkloadData}
                            filterText={imbalanceFilter}
                            setFilterText={setImbalanceFilter}
                            showToast={showToast}
                        />
                    )}

                    {/* TAB 5: UK GEOSPATIAL MAP */}
                    {activeTab === 'map' && (
                        <GeospatialMapView />
                    )}

                    {/* TAB 6: SHIFT & ROSTER PLANNING */}
                    {activeTab === 'shifts' && (
                        <ShiftPlanningView />
                    )}

                    {/* TAB 7: FINANCIAL IMPACT */}
                    {activeTab === 'finance' && (
                        <FinancialImpactView />
                    )}

                    {/* TAB 8: DATABRICKS ARCHITECTURE */}
                    {activeTab === 'architecture' && (
                        <DatabricksArchitectureView envInfo={envInfo} setEnvInfo={setEnvInfo} showToast={showToast} />
                    )}
                </main>
            </div>


            {/* CAPACITY COPILOT SLIDE-OVER DRAWER */}
            {isCopilotOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 text-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                                    <IconRobot className="w-5 h-5 text-blue-700" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm">Capacity Intelligence Copilot</h3>
                                    <p className="text-[11px] text-slate-400">Databricks Unified Intelligence</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCopilotOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fbfcfd]">
                            {copilotMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs shadow-xs leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-[#005eb8] text-white font-semibold rounded-br-none'
                                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                                    }`}>
                                        <p className="whitespace-pre-line">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Prompts */}
                        <div className="p-3 border-t border-slate-100 bg-white flex gap-2 overflow-x-auto text-[11px]">
                            <button 
                                onClick={() => { setCopilotInput("Explain Leicester patch deficit"); }}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap font-medium transition"
                            >
                                ⚡ Leicester deficit
                            </button>
                            <button 
                                onClick={() => { setCopilotInput("Suggest contractor cost reduction"); }}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap font-medium transition"
                            >
                                💰 Contractor savings
                            </button>
                        </div>

                        {/* Input Box */}
                        <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
                            <input
                                type="text"
                                placeholder="Ask Copilot about imbalances, shifts, rosters..."
                                value={copilotInput}
                                onChange={(e) => setCopilotInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendCopilot()}
                                className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005eb8]"
                            />
                            <button
                                onClick={handleSendCopilot}
                                className="bg-[#005eb8] hover:bg-[#004b87] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition glow-button"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 1. EXECUTIVE SCENARIO INSIGHTS VIEW (HOMEPAGE: MODERN ICONS & GLOWING EFFECTS)
// ------------------------------------------------------------------------------------------------
function ScenarioExecutiveInsightsView({ scenario, onConfigureInputs, onCompareScenario, imbalanceData, selectedTerritory, setSelectedTerritory, showToast }) {
    const weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"];

    return (
        <div className="space-y-3.5 w-full">
            {/* HERO SCENARIO BANNER (COMPACT FLUID THEME) */}
            <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 glow-card">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase tracking-wider">
                            {scenario.plan_type || 'LV'} Operating Scenario
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                            Month: <strong className="text-slate-800">{scenario.month || 'OCT'}</strong> • Rev <strong className="text-slate-800">{scenario.version || '0'}</strong>
                        </span>
                    </div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">{scenario.id || "Operating Baseline"}</h2>
                    <p className="text-xs text-slate-500 max-w-3xl truncate leading-normal">
                        {scenario.remarks || "Approved operating plan incorporating seasonal winter demand, revised sickness downtime factor, and grounded apprentice cohorts."}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={onConfigureInputs}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-xs transition flex items-center gap-1.5 hover:border-blue-400 hover:text-blue-700"
                    >
                        <IconSliders className="w-3.5 h-3.5 text-slate-500" />
                        <span>Configure 21 Inputs</span>
                    </button>
                    <button
                        onClick={onCompareScenario}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-xs transition flex items-center gap-1.5 hover:border-blue-400 hover:text-blue-700"
                    >
                        <IconScale className="w-3.5 h-3.5 text-slate-500" />
                        <span>Compare Diff</span>
                    </button>
                </div>
            </div>

            {/* BENTO KPI SUMMARY GRID (COMPACT GLOWING CARDS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total Demand Card */}
                <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-xs glow-card group flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Demand</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center glow-icon">
                            <IconDemand className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-slate-900 tracking-tight leading-none">38,450</span>
                            <span className="text-xs font-semibold text-slate-400">hrs</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                ↑ +2.4%
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">vs Q3 baseline</span>
                        </div>
                    </div>
                </div>

                {/* 2. Net Capacity Card */}
                <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-xs glow-card group flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Net Capacity</span>
                        <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center glow-icon">
                            <IconCapacity className="w-3.5 h-3.5 text-sky-600" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-slate-900 tracking-tight leading-none">41,200</span>
                            <span className="text-xs font-semibold text-slate-400">hrs</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                88.5%
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">Direct Labor Efficiency</span>
                        </div>
                    </div>
                </div>

                {/* 3. Net Buffer Card */}
                <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-xs glow-card group flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Net Buffer</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center glow-icon">
                            <IconBuffer className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-emerald-600 tracking-tight leading-none">+73.3</span>
                            <span className="text-xs font-semibold text-slate-400">FTE</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <IconCheck className="w-3 h-3 text-emerald-700" />
                                SLA Met
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">National Buffer Healthy</span>
                        </div>
                    </div>
                </div>

                {/* 4. Coverage Ratio Card */}
                <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-xs glow-card group flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Coverage Ratio</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center glow-icon">
                            <IconCoverage className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900 tracking-tight leading-none">107.2%</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">Target: 105%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60">
                                1 Deficit Patch
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">Leicester (-4.1)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN INSIGHTS GRID: TRAJECTORY CURVE & TERRITORY HEALTH */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                {/* 1. Demand vs Capacity Weekly Trajectory */}
                <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5 glow-card">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <IconCalendar className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800">Weekly Trajectory Envelope</h3>
                                <p className="text-[11px] text-slate-400">Forecasted Demand vs Net Productive Engineering Hours</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium">
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2 rounded-sm bg-[#38d4c3]"></span> Capacity
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2 rounded-sm bg-[#f87171]"></span> Demand
                            </span>
                        </div>
                    </div>

                    {/* Fluid Interactive SVG Chart (Height reduced to h-44 for minimized vertical scroll) */}
                    <div className="h-44 relative flex items-end">
                        <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="capacityGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38d4c3" stopOpacity="0.28"/>
                                    <stop offset="100%" stopColor="#38d4c3" stopOpacity="0.0"/>
                                </linearGradient>
                            </defs>

                            {/* Gridlines */}
                            <line x1="0" y1="50" x2="600" y2="50" stroke="#f1f5f9" strokeWidth="1"/>
                            <line x1="0" y1="100" x2="600" y2="100" stroke="#f1f5f9" strokeWidth="1"/>
                            <line x1="0" y1="150" x2="600" y2="150" stroke="#f1f5f9" strokeWidth="1"/>

                            {/* Shaded Capacity Area */}
                            <path
                                d="M 0 100 Q 75 90 150 95 T 300 85 T 450 70 T 600 65 L 600 200 L 0 200 Z"
                                fill="url(#capacityGrad)"
                            />

                            {/* Capacity Line (Teal #38d4c3) */}
                            <path
                                d="M 0 100 Q 75 90 150 95 T 300 85 T 450 70 T 600 65"
                                fill="none"
                                stroke="#38d4c3"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />

                            {/* Demand Line (Coral #f87171) */}
                            <path
                                d="M 0 130 Q 75 120 150 115 T 300 105 T 450 90 T 600 85"
                                fill="none"
                                stroke="#f87171"
                                strokeWidth="2.5"
                                strokeDasharray="4 4"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>

                    {/* Timeline Week Labels */}
                    <div className="grid grid-cols-8 text-center text-[10px] text-slate-400 font-semibold pt-1.5 border-t border-slate-100">
                        {weeks.map(w => (
                            <div key={w} className="truncate">{w.slice(5)}</div>
                        ))}
                    </div>
                </div>

                {/* 2. Territory Health Breakdown */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2 glow-card">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-800">Territory Health Status</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">5 Divisions</span>
                    </div>

                    <div className="space-y-1">
                        {[
                            { name: "Region B (North)", buffer: "+28.5 FTE", status: "Surplus", pct: 100, color: "bg-emerald-500", text: "text-emerald-700" },
                            { name: "Region D (South East)", buffer: "+22.8 FTE", status: "Surplus", pct: 95, color: "bg-emerald-500", text: "text-emerald-700" },
                            { name: "Region A (Scotland)", buffer: "+14.2 FTE", status: "Surplus", pct: 90, color: "bg-emerald-500", text: "text-emerald-700" },
                            { name: "Region E (South West)", buffer: "+11.9 FTE", status: "Surplus", pct: 85, color: "bg-emerald-500", text: "text-emerald-700" },
                            { name: "Region C (Midlands)", buffer: "-4.1 FTE", status: "Deficit", pct: 70, color: "bg-rose-500", text: "text-rose-600" },
                        ].map(t => (
                            <div key={t.name} className="space-y-0.5 p-1 rounded-lg hover:bg-slate-50 transition">
                                <div className="flex items-center justify-between text-[11px] font-semibold">
                                    <span className="text-slate-800">{t.name}</span>
                                    <span className={t.text}>{t.buffer}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className={`${t.color} h-full rounded-full transition-all`} style={{ width: `${Math.min(t.pct, 100)}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI DIAGNOSTICS & ACTIVE INPUT SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                {/* Copilot Executive Takeaways */}
                <div className="lg:col-span-2 bg-[#f0f7ff] p-4 rounded-xl border border-blue-200/80 shadow-xs space-y-2 glow-card">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-800">
                            <IconRobot className="w-3.5 h-3.5 text-blue-800" />
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-blue-900">Capacity Copilot Scenario Takeaways</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                        <div className="bg-white/90 p-3 rounded-lg border border-blue-200/60 shadow-xs hover:border-blue-300 transition">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">🟢 Core Strength</span>
                            <p className="text-xs text-slate-700 leading-relaxed">
                                Winter SLA target is achieved nationally. North and South East regions maintain comfortable buffers (+51.3 FTE combined).
                            </p>
                        </div>

                        <div className="bg-white/90 p-3 rounded-lg border border-blue-200/60 shadow-xs hover:border-rose-300 transition">
                            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-0.5">⚠️ Localized Watchpoint</span>
                            <p className="text-xs text-slate-700 leading-relaxed">
                                EC91 Leicester faces a -4.1 FTE gap during November boiler heating spikes. Mutual aid transfer from Altrincham recommended.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Inputs Pill Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between glow-card">
                    <div>
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">Active Input Blueprint</h4>
                            <span className="text-[10px] font-bold text-slate-400">21 Linked Files</span>
                        </div>

                        <div className="space-y-1 mt-2 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="font-medium text-[11px]">Resource Plan:</span>
                                <span className="font-mono text-[11px] text-blue-700 font-semibold truncate max-w-[150px]">{scenario.inputs?.resource_plan || "V3_2026-07-07"}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="font-medium text-[11px]">Demand Input:</span>
                                <span className="font-mono text-[11px] text-blue-700 font-semibold truncate max-w-[150px]">{scenario.inputs?.demand_input || "MTP_Demand_#3"}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="font-medium text-[11px]">Overlays (%):</span>
                                <span className="font-mono text-[11px] text-blue-700 font-semibold truncate max-w-[150px]">{scenario.inputs?.downtime_overlays_percentage || "Overlays_Q3"}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onConfigureInputs}
                        className="w-full mt-2 text-center text-xs font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-50 py-1.5 rounded-lg border border-blue-200 transition glow-button"
                    >
                        View & Modify All 21 Inputs →
                    </button>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 2. SCENARIO INPUTS & PARAMETERS STUDIO (DEDICATED SCREEN FOR ALL 21 INPUTS)
// ------------------------------------------------------------------------------------------------
function ScenarioInputsStudioView({
    planType, setPlanType,
    month, setMonth,
    version, setVersion,
    remarks, setRemarks,
    onSave,
    inputsState,
    inputsChoices,
    remarksMap,
    onInputChange,
    onInputDelete,
    onInputUndo,
    showToast
}) {
    const [filterCategory, setFilterCategory] = useState('all');

    const capacityInputs = [
        { key: "resource_plan", label: "Resource Plan" },
        { key: "fte_transfer", label: "FTE transfer" },
        { key: "recruitment_grounded", label: "Recruitment grounded" },
        { key: "recruitment_ungrounded", label: "Recruitment ungrounded" },
        { key: "baseline_assumptions", label: "Baseline assumptions" },
        { key: "downtime_overlays_percentage", label: "Downtime Overlays Percentage" },
        { key: "downtime_overlays_hours", label: "Downtime Overlays Hours" },
        { key: "downtime_overlays_hours_fte", label: "Downtime Overlays Hours/FTE" },
        { key: "overtime", label: "Overtime" },
        { key: "baseline_productivity", label: "Baseline productivity" },
        { key: "training_snm", label: "Training SNM" },
        { key: "ctr_capacity", label: "CTR Capacity" }
    ];

    const demandInputs = [
        { key: "demand_input", label: "Demand input" },
        { key: "job_time_assumptions", label: "Job time assumptions" },
        { key: "hec_on_kac_demand", label: "HEC on KAC Demand" },
        { key: "hec_on_ev_demand", label: "HEC on EV Demand" }
    ];

    const configInputs = [
        { key: "attrition", label: "Attrition" },
        { key: "recruitment_config", label: "Recruitment" },
        { key: "geography_mapping", label: "Geography mapping" },
        { key: "week_to_month", label: "Week to month" }
    ];

    const actualsInputs = [
        { key: "actuals_input", label: "Actuals input" }
    ];

    return (
        <div className="space-y-3.5 w-full">
            {/* STUDIO HEADER */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs glow-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-sm font-extrabold text-slate-900">Scenario Inputs & Parameters Studio</h2>
                        <p className="text-[11px] text-slate-400">Configure individual file versions, review operational remarks, and manage all 21 inputs</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {['all', 'capacity', 'demand', 'config', 'actuals'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`text-[11px] font-semibold px-3 py-1 rounded-lg capitalize transition ${
                                    filterCategory === cat
                                        ? 'bg-[#005eb8] text-white shadow-xs font-bold'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scenario Metadata Editor */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5 pt-3 items-end">
                    <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Plan Type</label>
                        <select
                            value={planType}
                            onChange={(e) => setPlanType(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="LV">LV (Standard Operating Plan)</option>
                            <option value="HV">HV (Surge Volume Plan)</option>
                            <option value="Combined">Combined FY26 Plan</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Month</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-blue-500"
                        >
                            {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Version</label>
                        <input
                            type="number"
                            min="0"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Scenario Remarks</label>
                        <input
                            type="text"
                            placeholder="e.g. October baseline run with revised sick overlays"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <button
                            onClick={onSave}
                            className="w-full bg-[#005eb8] hover:bg-[#004b87] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 glow-button"
                        >
                            <IconCheck className="w-3.5 h-3.5" />
                            <span>Save Scenario</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* INPUT CARDS GRID (ALL 21 INPUTS IN THEME-ALIGNED GLOWING CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(filterCategory === 'all' || filterCategory === 'capacity') && capacityInputs.map(item => (
                    <ModernInputCard
                        key={item.key}
                        label={item.label}
                        choices={inputsChoices[item.key] || []}
                        selected={inputsState[item.key]}
                        remarks={remarksMap[inputsState[item.key]] || "Active governance version."}
                        onChange={(val) => onInputChange(item.key, val)}
                        onDelete={() => onInputDelete(item.key, item.label)}
                        onUndo={() => onInputUndo(item.key, item.label)}
                    />
                ))}

                {(filterCategory === 'all' || filterCategory === 'demand') && demandInputs.map(item => (
                    <ModernInputCard
                        key={item.key}
                        label={item.label}
                        choices={inputsChoices[item.key] || []}
                        selected={inputsState[item.key]}
                        remarks={remarksMap[inputsState[item.key]] || "Active demand forecasting file."}
                        onChange={(val) => onInputChange(item.key, val)}
                        onDelete={() => onInputDelete(item.key, item.label)}
                        onUndo={() => onInputUndo(item.key, item.label)}
                    />
                ))}

                {(filterCategory === 'all' || filterCategory === 'config') && configInputs.map(item => (
                    <ModernInputCard
                        key={item.key}
                        label={item.label}
                        choices={inputsChoices[item.key] || []}
                        selected={inputsState[item.key]}
                        remarks={remarksMap[inputsState[item.key]] || "Master mapping configuration."}
                        onChange={(val) => onInputChange(item.key, val)}
                        onDelete={() => onInputDelete(item.key, item.label)}
                        onUndo={() => onInputUndo(item.key, item.label)}
                    />
                ))}

                {(filterCategory === 'all' || filterCategory === 'actuals') && actualsInputs.map(item => (
                    <ModernInputCard
                        key={item.key}
                        label={item.label}
                        choices={inputsChoices[item.key] || []}
                        selected={inputsState[item.key]}
                        remarks={remarksMap[inputsState[item.key]] || "Reconciled financial actuals."}
                        onChange={(val) => onInputChange(item.key, val)}
                        onDelete={() => onInputDelete(item.key, item.label)}
                        onUndo={() => onInputUndo(item.key, item.label)}
                    />
                ))}
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// REUSABLE MODERN INPUT CARD WITH DELETE, UNDO & REMARKS
// ------------------------------------------------------------------------------------------------
function ModernInputCard({ label, choices, selected, remarks, onChange, onDelete, onUndo }) {
    return (
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs glow-card transition-all duration-150">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">{label}:</span>
                <span className="text-[10px] text-slate-400 font-mono">{choices.length} versions</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <select
                        value={selected || (choices[0] || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full text-xs bg-slate-50 text-slate-800 font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs truncate"
                    >
                        {choices.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={onDelete}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-rose-200 transition flex-shrink-0 hover:shadow-xs"
                    title="Delete version"
                >
                    Delete
                </button>

                <button
                    onClick={onUndo}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition flex-shrink-0 hover:shadow-xs"
                    title="Undo delete"
                >
                    Undo
                </button>
            </div>

            <div className="mt-1.5 text-[11px] text-slate-500 flex items-start gap-1">
                <span className="font-semibold text-slate-600">Remarks:</span>
                <span className="truncate" title={remarks}>{remarks}</span>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 3. SCENARIO COMPARISON VIEW
// ------------------------------------------------------------------------------------------------
function ScenarioComparisonView({ scenarios, scenario1Id, scenario2Id, setScenario2Id }) {
    const scen1 = scenarios[scenario1Id] || {};
    const scen2 = scenarios[scenario2Id] || {};
    const weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"];

    return (
        <div className="space-y-3.5 w-full">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs glow-card">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 mb-2 flex items-center gap-2">
                    <IconScale className="w-4 h-4 text-blue-600" />
                    <span>Side-by-Side Scenario Diff & Variance Analysis</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="border-r border-slate-200 pr-3.5">
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Baseline Scenario (1)</span>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{scenario1Id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Remarks: {scen1.remarks || "Operating baseline"}</p>
                    </div>

                    <div>
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Comparison Scenario (2)</span>
                        <select
                            value={scenario2Id}
                            onChange={(e) => setScenario2Id(e.target.value)}
                            className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.keys(scenarios).map(id => (
                                <option key={id} value={id}>{id}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-0.5">Remarks: {scen2.remarks || "Secondary revision"}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto glow-card">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 mb-3">Weekly Demand vs Capacity Variance Breakdown</h4>
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <th className="py-3 px-4 font-semibold">Week Commencing</th>
                            <th className="py-3 px-4 font-semibold">Demand (Baseline)</th>
                            <th className="py-3 px-4 font-semibold">Demand (Comparison)</th>
                            <th className="py-3 px-4 font-semibold">Capacity (Baseline)</th>
                            <th className="py-3 px-4 font-semibold">Capacity (Comparison)</th>
                            <th className="py-3 px-4 font-semibold">Delta Imbalance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {weeks.map((w, idx) => {
                            const d1 = 4300 + idx * 45;
                            const d2 = 4280 + idx * 40;
                            const c1 = 4550 + idx * 30;
                            const c2 = 4610 + idx * 35;
                            const delta = (c2 - d2) - (c1 - d1);
                            return (
                                <tr key={w} className="hover:bg-slate-50 transition">
                                    <td className="py-2.5 px-4 font-medium text-slate-800">{w}</td>
                                    <td className="py-2.5 px-4">{d1} hrs</td>
                                    <td className="py-2.5 px-4 font-semibold text-blue-700">{d2} hrs</td>
                                    <td className="py-2.5 px-4">{c1} hrs</td>
                                    <td className="py-2.5 px-4 font-semibold text-emerald-600">{c2} hrs</td>
                                    <td className="py-2.5 px-4 font-bold text-emerald-600">+{delta} hrs</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 4. DEM VS CAP MATRIX VIEW
// ------------------------------------------------------------------------------------------------
function DemVsCapView({ subTab, setSubTab, imbalanceData, indayData, filterText, setFilterText, showToast }) {
    const dates = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"];

    const filtered = useMemo(() => {
        const term = filterText.toLowerCase();
        if (!term) return imbalanceData;
        return imbalanceData.filter(r => 
            (r.Patch && r.Patch.toLowerCase().includes(term)) ||
            (r.Skill && r.Skill.toLowerCase().includes(term)) ||
            (r.Metric && r.Metric.toLowerCase().includes(term))
        );
    }, [imbalanceData, filterText]);

    return (
        <div className="space-y-3 w-full">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 glow-card">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSubTab('imbalance')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            subTab === 'imbalance' ? 'bg-[#005eb8] text-white shadow-xs font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Imbalances View
                    </button>
                    <button
                        onClick={() => setSubTab('inday')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            subTab === 'inday' ? 'bg-[#005eb8] text-white shadow-xs font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Inday Workload
                    </button>
                </div>

                <div className="flex items-center gap-2.5">
                    <input
                        type="text"
                        placeholder="Filter by patch or skill..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        onClick={() => showToast("Recalculating imbalances across UK patches...", "info")}
                        className="bg-[#005eb8] hover:bg-[#004b87] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition glow-button"
                    >
                        Calculate
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden glow-card">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                        <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 shadow-xs z-10 font-semibold">
                            <tr>
                                <th className="py-3 px-4">Patch</th>
                                <th className="py-3 px-4">Skill</th>
                                <th className="py-3 px-4">Metric</th>
                                <th className="py-3 px-4">Type</th>
                                {dates.map(d => (
                                    <th key={d} className="py-3 px-4 text-center whitespace-nowrap">{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition">
                                    <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">{row.Patch}</td>
                                    <td className="py-2.5 px-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                            row.Skill === 'HEC' ? 'bg-blue-50 text-blue-700' :
                                            row.Skill === 'KAC' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'
                                        }`}>
                                            {row.Skill}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{row.Metric}</td>
                                    <td className="py-2.5 px-4 text-slate-500">{row.Type}</td>
                                    {dates.map(d => {
                                        const val = row[d] !== undefined ? row[d] : 0.0;
                                        const isDeficit = val < 0;
                                        return (
                                            <td key={d} className={`py-2.5 px-4 text-right font-mono text-[11px] ${
                                                isDeficit ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-700'
                                            }`}>
                                                {typeof val === 'number' ? val.toFixed(2) : val}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 5. GEOSPATIAL MAP VIEW
// ------------------------------------------------------------------------------------------------
function GeospatialMapView() {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3.5 w-full glow-card">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                    <IconMap className="w-4 h-4 text-blue-600" />
                    <span>UK Geospatial Capacity Imbalance Heatmap</span>
                </h3>
                <span className="text-[11px] text-slate-400">Centrica Field Regional Distribution</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                    { region: "Region A (Scotland)", status: "Surplus", fte: "+14.2 FTE", color: "border-blue-500 bg-blue-50/50 text-blue-800" },
                    { region: "Region B (North)", status: "Surplus", fte: "+28.5 FTE", color: "border-blue-500 bg-blue-50/50 text-blue-800" },
                    { region: "Region C (Midlands)", status: "Deficit", fte: "-4.1 FTE", color: "border-rose-500 bg-rose-50/60 text-rose-800" },
                    { region: "Region D (South East)", status: "Surplus", fte: "+22.8 FTE", color: "border-blue-500 bg-blue-50/50 text-blue-800" },
                    { region: "Region E (South West)", status: "Surplus", fte: "+11.9 FTE", color: "border-blue-500 bg-blue-50/50 text-blue-800" },
                ].map(r => (
                    <div key={r.region} className={`p-3 rounded-xl border-l-4 shadow-xs glow-card ${r.color}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{r.region}</p>
                        <h4 className="text-lg font-black mt-0.5">{r.fte}</h4>
                        <span className="text-[10px] font-semibold">{r.status}</span>
                    </div>
                ))}
            </div>

            <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center border border-dashed border-slate-200 text-slate-400 text-xs">
                [Interactive UK Territory Map: 32 Patches with live hover buffer and skill breakdown]
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 6. SHIFT & ROSTER PLANNING VIEW
// ------------------------------------------------------------------------------------------------
function ShiftPlanningView() {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 w-full glow-card">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                <IconCalendar className="w-4 h-4 text-blue-600" />
                <span>Engineer Roster & Shift Pattern Modeling</span>
            </h3>
            <p className="text-xs text-slate-500">
                Simulate 4-day compressed hours vs standard 37.5-hour shifts to optimize peak heating breakdown coverage.
            </p>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 7. FINANCIAL IMPACT VIEW
// ------------------------------------------------------------------------------------------------
function FinancialImpactView() {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3.5 w-full glow-card">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                <IconCurrency className="w-4 h-4 text-blue-600" />
                <span>Financial Cost-to-Serve & Contractor Optimization</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl glow-card">
                    <p className="text-[11px] font-bold text-slate-500">Direct Labor Base Cost</p>
                    <h3 className="text-xl font-black text-slate-800 mt-0.5">£1,420,000</h3>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl glow-card">
                    <p className="text-[11px] font-bold text-slate-500">CTR Contractor Spend</p>
                    <h3 className="text-xl font-black text-blue-600 mt-0.5">£184,500</h3>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl glow-card">
                    <p className="text-[11px] font-bold text-slate-500">Overtime Premiums</p>
                    <h3 className="text-xl font-black text-rose-500 mt-0.5">£42,800</h3>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// 8. DATABRICKS ARCHITECTURE VIEW
// ------------------------------------------------------------------------------------------------
function DatabricksArchitectureView({ envInfo, setEnvInfo, showToast }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3.5 w-full glow-card">
            <div className="pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                    <IconDatabase className="w-4 h-4 text-blue-600" />
                    <span>Databricks Unity Catalog & Execution Architecture</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Dual-mode engine: PySpark in Databricks Apps container vs Pandas in VS Code local dev</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 glow-card">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Database</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{envInfo.catalog}.{envInfo.schema}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Direct PySpark Delta table access on Databricks Lakehouse.</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 glow-card">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Calculation Engine</span>
                    <h4 className="text-sm font-bold text-blue-600 mt-0.5">{envInfo.calc_mode}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Zero cluster spin-up cost during VS Code local iteration.</p>
                </div>
            </div>
        </div>
    );
}

// Mount React Root
const rootElement = document.getElementById("react-root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(ModernCapacityApp));
}
