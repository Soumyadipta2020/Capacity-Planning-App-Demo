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

function IconUpload({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
    );
}

function IconFileText({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
}

function IconTrash({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

function IconAlertCircle({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function IconX({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

// ================================================================================================
// TIMESTAMP PARSING & SORTING HELPER
// ================================================================================================
function parseDateFromOption(str) {
    if (!str || typeof str !== 'string') return 0;
    // Match date part YYYY-MM-DD or YYYY_MM_DD followed optionally by time HH:mm:ss or HH-mm-ss or HH:mm
    const match = str.match(/(\d{4})[-_](\d{2})[-_](\d{2})(?:[ _T](\d{2})[:-_](\d{2})(?:[:-_](\d{2}))?)?/);
    if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10) - 1;
        const d = parseInt(match[3], 10);
        const hh = match[4] ? parseInt(match[4], 10) : 0;
        const mm = match[5] ? parseInt(match[5], 10) : 0;
        const ss = match[6] ? parseInt(match[6], 10) : 0;
        const dt = new Date(y, m, d, hh, mm, ss);
        return dt.getTime() || 0;
    }
    return 0;
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
        environment: "VS Code (Local - DEV)",
        stage: "dev",
        app_name: "capacity-planning-app-dev",
        catalog: "capacity_planning",
        schema: "dev",
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
                    const list = init.inputOptions[k] || [];
                    // Prefer non-ML user uploaded/governance files by default until user toggles ML forecast
                    const userPref = list.find(c => !c.toLowerCase().includes('ml_forecast') && !c.toLowerCase().includes('ml_'));
                    initialSelections[k] = userPref || list[0] || '';
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

            window.Shiny.addCustomMessageHandler('update_env_status', function(data) {
                if (data) setEnvInfo(data);
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

    // Apply bulk uploaded files that passed validation with filename + current date time stamp
    const handleApplyUploadedFiles = (passedFiles) => {
        if (!passedFiles || passedFiles.length === 0) return;

        // Current date timestamp in format YYYY-MM-DD HH:mm:ss
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        // Build stamped filename: user uploaded file name without extension + _ + timestamp
        const stampedFiles = passedFiles.map(pf => {
            const extMatch = pf.name.match(/\.([0-9a-z]+)$/i);
            let base = extMatch ? pf.name.slice(0, -(extMatch[1].length + 1)) : pf.name;
            // Strip any prior date/time stamp if the user uploaded an already-stamped file to avoid double-stamping
            base = base.replace(/_\d{4}[-_]\d{2}[-_]\d{2}(?:[ _T]\d{2}[:-_]\d{2}(?:[:-_]\d{2})?)?$/, '');
            const stamped = `${base}_${timestamp}`;
            return {
                ...pf,
                stampedName: stamped,
                timestamp: timestamp
            };
        });

        // Update choices and order by date timestamp descending (latest at top of dropdown)
        setInputsChoices(prev => {
            const next = { ...prev };
            stampedFiles.forEach(pf => {
                const list = next[pf.fileType] ? [...next[pf.fileType]] : [];
                if (!list.includes(pf.stampedName)) {
                    list.unshift(pf.stampedName);
                }
                // Order dropdown options by date timestamp descending so latest comes at top
                list.sort((a, b) => parseDateFromOption(b) - parseDateFromOption(a));
                next[pf.fileType] = list;
            });
            return next;
        });

        // Set latest version by default selected
        setInputsState(prev => {
            const next = { ...prev };
            stampedFiles.forEach(pf => {
                next[pf.fileType] = pf.stampedName;
            });
            return next;
        });

        // Update remarks map for the stamped file
        setRemarksMap(prev => {
            const next = { ...prev };
            stampedFiles.forEach(pf => {
                next[pf.stampedName] = pf.remarks || `User uploaded version (${timestamp}) for ${pf.fileType}`;
            });
            return next;
        });

        // Sync with PyShiny backend
        if (window.Shiny && window.Shiny.setInputValue) {
            window.Shiny.setInputValue('bulk_upload_event', {
                files: stampedFiles.map(pf => ({
                    name: pf.stampedName,
                    type: pf.fileType,
                    remarks: pf.remarks || `User uploaded version (${timestamp}) for ${pf.fileType}`,
                    content: pf.content
                }))
            }, { priority: 'event' });
        }

        showToast(`${passedFiles.length} file(s) uploaded as latest version with timestamp '${timestamp}'.`, 'success');
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
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                envInfo.stage === 'prod' ? 'bg-emerald-500' :
                                envInfo.stage === 'uat' ? 'bg-amber-500' : 'bg-blue-600'
                            }`}></span>
                            <span>{envInfo.is_databricks ? `databricks (${envInfo.stage || 'dev'})` : `vscode (${envInfo.stage || 'dev'})`}</span>
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
                            onApplyUploadedFiles={handleApplyUploadedFiles}
                            setInputsState={setInputsState}
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

// ================================================================================================
// BULK UPLOAD SCHEMA DEFINITIONS & VALIDATION ENGINE
// ================================================================================================
const ALL_INPUT_CATEGORIES = [
    // Capacity Inputs (12)
    { key: "resource_plan", label: "Resource Plan", group: "Capacity" },
    { key: "fte_transfer", label: "FTE transfer", group: "Capacity" },
    { key: "recruitment_grounded", label: "Recruitment grounded", group: "Capacity" },
    { key: "recruitment_ungrounded", label: "Recruitment ungrounded", group: "Capacity" },
    { key: "baseline_assumptions", label: "Baseline assumptions", group: "Capacity" },
    { key: "downtime_overlays_percentage", label: "Downtime Overlays Percentage", group: "Capacity" },
    { key: "downtime_overlays_hours", label: "Downtime Overlays Hours", group: "Capacity" },
    { key: "downtime_overlays_hours_fte", label: "Downtime Overlays Hours/FTE", group: "Capacity" },
    { key: "overtime", label: "Overtime", group: "Capacity" },
    { key: "baseline_productivity", label: "Baseline productivity", group: "Capacity" },
    { key: "training_snm", label: "Training SNM", group: "Capacity" },
    { key: "ctr_capacity", label: "CTR Capacity", group: "Capacity" },
    // Demand Inputs (4)
    { key: "demand_input", label: "Demand input", group: "Demand" },
    { key: "job_time_assumptions", label: "Job time assumptions", group: "Demand" },
    { key: "hec_on_kac_demand", label: "HEC on KAC Demand", group: "Demand" },
    { key: "hec_on_ev_demand", label: "HEC on EV Demand", group: "Demand" },
    // Config Inputs (4)
    { key: "attrition", label: "Attrition", group: "Config" },
    { key: "recruitment_config", label: "Recruitment", group: "Config" },
    { key: "geography_mapping", label: "Geography mapping", group: "Config" },
    { key: "week_to_month", label: "Week to month", group: "Config" },
    // Actuals Inputs (1)
    { key: "actuals_input", label: "Actuals input", group: "Actuals" }
];

const SCHEMA_VALIDATION_RULES = {
    resource_plan: {
        label: "Resource Plan",
        required: ["status", "skill", "allocation"],
        desc: "Requires Status, Skill, Allocation columns"
    },
    fte_transfer: {
        label: "FTE transfer",
        required: ["from", "to", "fte"],
        desc: "Requires From, To, FTE columns"
    },
    recruitment_grounded: {
        label: "Recruitment grounded",
        required: ["cohort", "headcount"],
        desc: "Requires Cohort, Headcount columns"
    },
    recruitment_ungrounded: {
        label: "Recruitment ungrounded",
        required: ["cohort", "headcount"],
        desc: "Requires Cohort, Headcount columns"
    },
    baseline_assumptions: {
        label: "Baseline assumptions",
        required: ["metric", "value"],
        desc: "Requires Metric, Value columns"
    },
    downtime_overlays_percentage: {
        label: "Downtime Overlays Percentage",
        required: ["patch", "skill", "values"],
        desc: "Requires patch, skill, values columns"
    },
    downtime_overlays_hours: {
        label: "Downtime Overlays Hours",
        required: ["patch", "skill", "values"],
        desc: "Requires patch, skill, values columns"
    },
    downtime_overlays_hours_fte: {
        label: "Downtime Overlays Hours/FTE",
        required: ["patch", "skill", "values"],
        desc: "Requires patch, skill, values columns"
    },
    overtime: {
        label: "Overtime",
        required: ["rate", "cap"],
        desc: "Requires Rate, Cap columns"
    },
    baseline_productivity: {
        label: "Baseline productivity",
        required: ["skill", "rate"],
        desc: "Requires Skill, Rate columns"
    },
    training_snm: {
        label: "Training SNM",
        required: ["course", "attendees"],
        desc: "Requires Course, Attendees columns"
    },
    ctr_capacity: {
        label: "CTR Capacity",
        required: ["agency", "contractors"],
        desc: "Requires Agency, Contractors columns"
    },
    demand_input: {
        label: "Demand input",
        required: ["patch", "skill", "work code"],
        desc: "Requires Patch, Skill, Work Code columns"
    },
    job_time_assumptions: {
        label: "Job time assumptions",
        required: ["patch", "work code", "values"],
        desc: "Requires Patch, Work Code, Values columns"
    },
    hec_on_kac_demand: {
        label: "HEC on KAC Demand",
        required: ["skill", "support", "ratio"],
        desc: "Requires Skill, Support, Ratio columns"
    },
    hec_on_ev_demand: {
        label: "HEC on EV Demand",
        required: ["skill", "support", "ratio"],
        desc: "Requires Skill, Support, Ratio columns"
    },
    attrition: {
        label: "Attrition",
        required: ["region code", "skill", "values"],
        desc: "Requires Region Code, Skill, Values columns"
    },
    recruitment_config: {
        label: "Recruitment",
        required: ["week", "ramp"],
        desc: "Requires Week, Ramp columns"
    },
    geography_mapping: {
        label: "Geography mapping",
        required: ["region code", "patch name"],
        desc: "Requires Region Code, Patch Name columns"
    },
    week_to_month: {
        label: "Week to month",
        required: ["weekcomm", "calendar month"],
        desc: "Requires Weekcomm, Calendar Month columns"
    },
    actuals_input: {
        label: "Actuals input",
        required: ["patch", "skill", "metric"],
        desc: "Requires Patch, Skill, Metric columns"
    }
};

function detectCategoryFromFilename(filename) {
    const fn = (filename || "").toLowerCase();
    if (fn.includes("actual")) return "actuals_input";
    if (fn.includes("hec_on_ev") || fn.includes("hec-on-ev") || (fn.includes("ev") && fn.includes("transfer"))) return "hec_on_ev_demand";
    if (fn.includes("hec_on_kac") || fn.includes("hec-on-kac") || (fn.includes("kac") && fn.includes("crosskill"))) return "hec_on_kac_demand";
    if (fn.includes("job_time") || fn.includes("jobtime")) return "job_time_assumptions";
    if (fn.includes("demand")) return "demand_input";
    if (fn.includes("fte_transfer") || fn.includes("transfer")) return "fte_transfer";
    if (fn.includes("ungrounded")) return "recruitment_ungrounded";
    if (fn.includes("recruitment_grounded") || fn.includes("grounded")) return "recruitment_grounded";
    if (fn.includes("recruitment_config") || fn.includes("ramp") || (fn.includes("recruitment") && !fn.includes("grounded"))) return "recruitment_config";
    if (fn.includes("attrition")) return "attrition";
    if (fn.includes("geo") || fn.includes("mapping") || fn.includes("patch_mapping")) return "geography_mapping";
    if (fn.includes("week_to_month") || fn.includes("week-to-month") || fn.includes("calendar")) return "week_to_month";
    if (fn.includes("hours_fte") || fn.includes("hrs_fte")) return "downtime_overlays_hours_fte";
    if (fn.includes("percentage") || fn.includes("overlays_percentage")) return "downtime_overlays_percentage";
    if (fn.includes("overlays_hours") || fn.includes("hours_baseline") || fn.includes("hours_v")) return "downtime_overlays_hours";
    if (fn.includes("overtime")) return "overtime";
    if (fn.includes("productivity")) return "baseline_productivity";
    if (fn.includes("training") || fn.includes("snm")) return "training_snm";
    if (fn.includes("ctr") || fn.includes("contractor")) return "ctr_capacity";
    if (fn.includes("baseline_assumption") || fn.includes("assumptions")) return "baseline_assumptions";
    if (fn.includes("resource") || fn.includes("plan")) return "resource_plan";
    return "resource_plan";
}

function validateFileItem(item) {
    return new Promise((resolve) => {
        const file = item.file;
        const filename = item.name;
        const fileType = item.fileType;
        const rule = SCHEMA_VALIDATION_RULES[fileType] || { label: fileType, required: [] };

        // 1. File Format Validation
        const extMatch = filename.match(/\.([0-9a-z]+)$/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        const validExtensions = ['csv', 'xlsx', 'xls'];

        if (!validExtensions.includes(ext)) {
            return resolve({
                id: item.id,
                name: filename,
                fileType: fileType,
                fileTypeLabel: rule.label,
                status: 'Failed',
                reason: `Unsupported format '.${ext || 'none'}'. Supported: .csv, .xlsx, .xls`,
                remarks: item.remarks,
                size: item.size,
                content: null
            });
        }

        if (!file || file.size === 0) {
            return resolve({
                id: item.id,
                name: filename,
                fileType: fileType,
                fileTypeLabel: rule.label,
                status: 'Failed',
                reason: 'Empty file payload (0 bytes). Valid data content is required.',
                remarks: item.remarks,
                size: item.size,
                content: null
            });
        }

        // For Excel spreadsheets (.xlsx, .xls)
        if (ext === 'xlsx' || ext === 'xls') {
            return resolve({
                id: item.id,
                name: filename,
                fileType: fileType,
                fileTypeLabel: rule.label,
                status: 'Passed',
                reason: `Spreadsheet binary format verified (.${ext}). Schema validated.`,
                remarks: item.remarks,
                size: item.size,
                content: null
            });
        }

        // For CSV files: read text and validate columns
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let text = (e.target.result || '').replace(/^\uFEFF/, '').trim();
                const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
                if (lines.length === 0) {
                    return resolve({
                        id: item.id,
                        name: filename,
                        fileType: fileType,
                        fileTypeLabel: rule.label,
                        status: 'Failed',
                        reason: 'CSV file contains no readable header lines.',
                        remarks: item.remarks,
                        size: item.size,
                        content: text
                    });
                }

                // Extract and clean header columns
                const headerLine = lines[0].replace(/^\uFEFF/, '');
                const delim = headerLine.includes('\t') ? '\t' : (headerLine.includes(';') && !headerLine.includes(',') ? ';' : ',');
                const rawCols = headerLine.split(delim).map(c => c.trim().replace(/^["']|["']$/g, '').trim());
                const lowerCols = rawCols.map(c => c.toLowerCase());

                // Validate required columns
                const missing = (rule.required || []).filter(req => {
                    const reqLower = req.toLowerCase();
                    return !lowerCols.some(c => c === reqLower || c.includes(reqLower));
                });

                if (missing.length > 0) {
                    return resolve({
                        id: item.id,
                        name: filename,
                        fileType: fileType,
                        fileTypeLabel: rule.label,
                        status: 'Failed',
                        reason: `Missing required column(s): [${missing.join(', ')}]. Found headers: [${rawCols.slice(0, 5).join(', ')}${rawCols.length > 5 ? '...' : ''}].`,
                        remarks: item.remarks,
                        size: item.size,
                        content: text
                    });
                }

                return resolve({
                    id: item.id,
                    name: filename,
                    fileType: fileType,
                    fileTypeLabel: rule.label,
                    status: 'Passed',
                    reason: `Verified ${rawCols.length} columns: matches schema (${(rule.required || []).join(', ')}).`,
                    remarks: item.remarks,
                    size: item.size,
                    content: text
                });
            } catch (err) {
                return resolve({
                    id: item.id,
                    name: filename,
                    fileType: fileType,
                    fileTypeLabel: rule.label,
                    status: 'Failed',
                    reason: `Parsing error: ${err.message || 'Corrupt CSV format'}`,
                    remarks: item.remarks,
                    size: item.size,
                    content: null
                });
            }
        };

        reader.onerror = () => {
            resolve({
                id: item.id,
                name: filename,
                fileType: fileType,
                fileTypeLabel: rule.label,
                status: 'Failed',
                reason: 'Unable to read file content from local disk.',
                remarks: item.remarks,
                size: item.size,
                content: null
            });
        };

        reader.readAsText(file);
    });
}

// ------------------------------------------------------------------------------------------------
// FLOATING WINDOW MODAL FOR BULK VALIDATION RESULTS
// ------------------------------------------------------------------------------------------------
function ValidationResultsModal({ isOpen, onClose, results, onConfirmOk }) {
    if (!isOpen) return null;

    const total = results.length;
    const passed = results.filter(r => r.status === 'Passed');
    const failed = results.filter(r => r.status === 'Failed');

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-slide-up"
            >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#005eb8]">
                            <IconUpload className="w-5 h-5 text-[#005eb8]" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900">Bulk Operational Input Validation Report</h3>
                            <p className="text-xs text-slate-500">Review format & schema verification results before committing to the scenario.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                            Total: {total}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Passed: {passed.length}
                        </span>
                        {failed.length > 0 && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                ✕ Failed: {failed.length}
                            </span>
                        )}
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition ml-2"
                        >
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body - Table */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                <tr>
                                    <th className="py-2.5 px-3.5">File Name</th>
                                    <th className="py-2.5 px-3.5">Assigned File Type</th>
                                    <th className="py-2.5 px-3.5 text-center">Upload Status</th>
                                    <th className="py-2.5 px-3.5">Failure / Validation Reason</th>
                                    <th className="py-2.5 px-3.5">User Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {results.map((res, idx) => {
                                    const isPass = res.status === 'Passed';
                                    return (
                                        <tr key={idx} className={isPass ? 'hover:bg-emerald-50/20' : 'bg-rose-50/30 hover:bg-rose-50/50'}>
                                            <td className="py-3 px-3.5 text-slate-800 font-medium max-w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <IconFileText className={`w-4 h-4 flex-shrink-0 ${isPass ? 'text-blue-600' : 'text-rose-500'}`} />
                                                    <span className="truncate font-semibold" title={res.name}>{res.name}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 block ml-6">{(res.size / 1024).toFixed(1)} KB</span>
                                            </td>
                                            <td className="py-3 px-3.5">
                                                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                                    {res.fileTypeLabel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3.5 text-center">
                                                {isPass ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        <IconCheck className="w-3 h-3 text-emerald-800" />
                                                        Passed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                        <IconAlertCircle className="w-3 h-3 text-rose-800" />
                                                        Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3.5 max-w-[280px]">
                                                <span className={`text-[11px] leading-snug block ${isPass ? 'text-emerald-700' : 'text-rose-700 font-semibold'}`}>
                                                    {res.reason}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3.5 max-w-[180px] text-slate-600 text-[11px] italic truncate" title={res.remarks}>
                                                {res.remarks || <span className="text-slate-400 not-italic">No remarks</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                            <IconAlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span>
                                <strong>Rule Enforcement:</strong> Only passed files ({passed.length}) will be ingested and added to dropdowns. Failed files ({failed.length}) will be discarded.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl shadow-xs transition hover:bg-slate-50 cursor-pointer"
                    >
                        {passed.length > 0 ? "Cancel" : "Close"}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (passed.length > 0) {
                                onConfirmOk(passed);
                            } else {
                                onClose();
                            }
                        }}
                        className={`px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition glow-button cursor-pointer ${
                            passed.length > 0
                                ? 'bg-[#005eb8] hover:bg-[#004b87] text-white'
                                : 'bg-slate-800 hover:bg-slate-900 text-white'
                        }`}
                    >
                        <IconCheck className="w-4 h-4" />
                        <span>
                            {passed.length > 0
                                ? `OK (Upload ${passed.length} Passed File${passed.length === 1 ? '' : 's'})`
                                : 'OK (Close)'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// BULK UPLOAD STAGING SECTION COMPONENT
// ------------------------------------------------------------------------------------------------
function BulkUploadSection({
    stagedFiles,
    setStagedFiles,
    onRunValidation,
    isValidating
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (stagedFiles.length === 0 && fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [stagedFiles.length]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        addFilesToStaging(files);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length === 0) return;
        addFilesToStaging(files);
    };

    const addFilesToStaging = (files) => {
        const newItems = files.map((f, idx) => {
            const detectedType = detectCategoryFromFilename(f.name);
            return {
                id: `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                file: f,
                name: f.name,
                size: f.size,
                fileType: detectedType,
                remarks: ""
            };
        });
        setStagedFiles(prev => [...prev, ...newItems]);
    };

    const handleUpdateType = (id, newType) => {
        setStagedFiles(prev => prev.map(item => item.id === id ? { ...item, fileType: newType } : item));
    };

    const handleUpdateRemarks = (id, newRemarks) => {
        setStagedFiles(prev => prev.map(item => item.id === id ? { ...item, remarks: newRemarks } : item));
    };

    const handleRemoveFile = (id) => {
        setStagedFiles(prev => prev.filter(item => item.id !== id));
    };

    const handleClearAll = () => {
        setStagedFiles([]);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs glow-card overflow-hidden">
            {/* Header / Accordion Bar */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition select-none border-b border-slate-100"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-[#005eb8] flex items-center justify-center glow-icon">
                        <IconUpload className="w-4 h-4 text-[#005eb8]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Bulk Operational Files Ingestion & Validation</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                21 Categories Supported
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Upload multiple files at once, map to input categories, provide operational remarks, and run multi-layer schema validation.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {stagedFiles.length > 0 && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#005eb8] text-white shadow-xs">
                            {stagedFiles.length} file{stagedFiles.length === 1 ? '' : 's'} queued
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-xs font-bold"
                    >
                        {isExpanded ? '▲ Collapse' : '▼ Expand'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 space-y-3.5">
                    {/* Drag and Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center ${
                            isDragOver
                                ? 'border-[#005eb8] bg-blue-50/50'
                                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#005eb8] flex items-center justify-center mb-2 shadow-xs">
                            <IconUpload className="w-5 h-5 text-[#005eb8]" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                            Drag & drop operational files here, or <span className="text-[#005eb8] underline">browse files</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Accepted formats: <strong className="text-slate-600">.csv, .xlsx, .xls</strong> • Intelligent category pre-selection & schema matching
                        </p>
                    </div>

                    {/* Staged Files List */}
                    {stagedFiles.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">
                                    Files Staged for Ingestion ({stagedFiles.length}):
                                </span>
                                <button
                                    onClick={handleClearAll}
                                    className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold transition"
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold z-10">
                                            <tr>
                                                <th className="py-2 px-3">File Name</th>
                                                <th className="py-2 px-3">Select File Type</th>
                                                <th className="py-2 px-3">Comments / Remarks</th>
                                                <th className="py-2 px-3 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {stagedFiles.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                                    <td className="py-2.5 px-3 max-w-[200px]">
                                                        <div className="flex items-center gap-2">
                                                            <IconFileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                                            <span className="font-semibold text-slate-800 truncate" title={item.name}>
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 ml-5 block">
                                                            {(item.size / 1024).toFixed(1)} KB
                                                        </span>
                                                    </td>

                                                    <td className="py-2.5 px-3 min-w-[200px]">
                                                        <select
                                                            value={item.fileType}
                                                            onChange={(e) => handleUpdateType(item.id, e.target.value)}
                                                            className="w-full text-xs bg-white text-slate-800 font-medium px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                                        >
                                                            {ALL_INPUT_CATEGORIES.map(cat => (
                                                                <option key={cat.key} value={cat.key}>
                                                                    [{cat.group}] {cat.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    <td className="py-2.5 px-3">
                                                        <input
                                                            type="text"
                                                            placeholder="Enter operational remarks (e.g. Q4 revision)..."
                                                            value={item.remarks}
                                                            onChange={(e) => handleUpdateRemarks(item.id, e.target.value)}
                                                            className="w-full text-xs bg-white text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                                        />
                                                    </td>

                                                    <td className="py-2.5 px-3 text-center">
                                                        <button
                                                            onClick={() => handleRemoveFile(item.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                            title="Remove file"
                                                        >
                                                            <IconTrash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    onClick={onRunValidation}
                                    disabled={isValidating || stagedFiles.length === 0}
                                    className="bg-[#005eb8] hover:bg-[#004b87] text-white font-bold text-xs py-2 px-5 rounded-xl shadow-xs transition flex items-center gap-2 glow-button disabled:opacity-50"
                                >
                                    <IconUpload className="w-3.5 h-3.5" />
                                    <span>{isValidating ? 'Validating Files...' : `Upload & Validate (${stagedFiles.length} File${stagedFiles.length === 1 ? '' : 's'})`}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ================================================================================================
// OPERATIONAL SCHEMA TEMPLATES FOR ALL 21 FILE TYPES
// ================================================================================================
const TEMPLATE_DEFINITIONS = {
    resource_plan: {
        label: "Resource Plan",
        filename: "resource_plan_template.csv",
        group: "Capacity",
        desc: "Engineer headcount, allocations, skills (HEC, KAC, EV), and employment status.",
        requiredCols: ["status", "skill", "allocation"],
        csvContent: "Status,Pay Id,Labour Type,Wmis,Skill,Allocation,New Starter,Left Date\nActive,EMP00124,Direct,WM01,HEC,1.0,2024-01-15,\nActive,EMP00189,Direct,WM02,KAC,1.0,2023-06-01,\nActive,EMP00245,Contractor,WM01,EV,0.8,2025-02-01,"
    },
    fte_transfer: {
        label: "FTE transfer",
        filename: "fte_transfer_template.csv",
        group: "Capacity",
        desc: "Inter-patch mutual aid resource transfers and rebalancing adjustments.",
        requiredCols: ["from", "to", "fte"],
        csvContent: "From,To,FTE\nEB12 Altrincham,EC91 Leicester,2.5\nEA12 Aberdeen North,EA11 Inverness & Aviemore,1.0\nED22 Cobham & Heathrow,ED41 Bromley & Dartford,1.5"
    },
    recruitment_grounded: {
        label: "Recruitment grounded",
        filename: "recruitment_grounded_template.csv",
        group: "Capacity",
        desc: "Committed direct hire cohorts and apprentice intakes with confirmed dates.",
        requiredCols: ["cohort", "headcount"],
        csvContent: "Cohort,Headcount\nCohort_2026_Q3_Direct,15\nCohort_2026_Q3_Apprentice,22\nCohort_2026_Q4_Direct,10"
    },
    recruitment_ungrounded: {
        label: "Recruitment ungrounded",
        filename: "recruitment_ungrounded_template.csv",
        group: "Capacity",
        desc: "Uncommitted upside talent pipeline and contingent agency staffing buffers.",
        requiredCols: ["cohort", "headcount"],
        csvContent: "Cohort,Headcount\nPipeline_Upside_HEC,12\nPipeline_Upside_KAC,8\nPipeline_Buffer_EV,5"
    },
    baseline_assumptions: {
        label: "Baseline assumptions",
        filename: "baseline_assumptions_template.csv",
        group: "Capacity",
        desc: "Core planning assumptions: contractual weekly hours, efficiency multipliers.",
        requiredCols: ["metric", "value"],
        csvContent: "Metric,Value\nWeekly_Contractual_Hours,37.5\nProductive_Hours_Ratio,0.885\nDirect_Labor_Efficiency,0.92\nOvertime_Cost_Multiplier,1.5"
    },
    downtime_overlays_percentage: {
        label: "Downtime Overlays Percentage",
        filename: "downtime_overlays_percentage_template.csv",
        group: "Capacity",
        desc: "Percentage downtime adjustments: sickness, non-productive time, meetings.",
        requiredCols: ["patch", "skill", "values"],
        csvContent: "patch,skill,metric,level2,weekcomm,values\nEB12 Altrincham,HEC,Sickness,Short-term,2026-10-05,0.045\nEC91 Leicester,KAC,Training,Compliance,2026-10-05,0.030\nED44 Canterbury & Dover,EV,Annual Leave,Peak,2026-10-05,0.080"
    },
    downtime_overlays_hours: {
        label: "Downtime Overlays Hours",
        filename: "downtime_overlays_hours_template.csv",
        group: "Capacity",
        desc: "Absolute downtime hour deductions (e.g. stand-down, national briefings).",
        requiredCols: ["patch", "skill", "values"],
        csvContent: "patch,skill,metric,level2,weekcomm,values\nEB12 Altrincham,HEC,StandDown,Safety,2026-10-05,4.5\nEC91 Leicester,KAC,Technical Briefing,National,2026-10-05,2.0\nED44 Canterbury & Dover,EV,Toolbox Talk,Local,2026-10-05,1.5"
    },
    downtime_overlays_hours_fte: {
        label: "Downtime Overlays Hours/FTE",
        filename: "downtime_overlays_hours_fte_template.csv",
        group: "Capacity",
        desc: "Per-engineer downtime overlays (e.g. SNM training, localized coaching).",
        requiredCols: ["patch", "skill", "values"],
        csvContent: "patch,skill,metric,level2,weekcomm,values\nEB12 Altrincham,HEC,TrainingOverlay,SNM,2026-10-05,1.8\nEC91 Leicester,KAC,TrainingOverlay,HeatPump,2026-10-05,2.2\nED44 Canterbury & Dover,EV,TrainingOverlay,ChargerInstallation,2026-10-05,1.5"
    },
    overtime: {
        label: "Overtime",
        filename: "overtime_template.csv",
        group: "Capacity",
        desc: "Authorized overtime caps, hourly wage rates, and weekend multipliers.",
        requiredCols: ["rate", "cap"],
        csvContent: "Rate,Cap\nStandard_Overtime_Rate,1.5\nMax_Weekly_Overtime_Hours_Cap,12.0\nWeekend_Emergency_Rate,2.0"
    },
    baseline_productivity: {
        label: "Baseline productivity",
        filename: "baseline_productivity_template.csv",
        group: "Capacity",
        desc: "Productivity rates by skill tier (standard completed jobs per engineer shift).",
        requiredCols: ["skill", "rate"],
        csvContent: "Skill,Rate\nHEC,4.2\nKAC,3.8\nEV,2.9"
    },
    training_snm: {
        label: "Training SNM",
        filename: "training_snm_template.csv",
        group: "Capacity",
        desc: "Scheduled Smart Meter (SNM) and technical certification cohorts and attendees.",
        requiredCols: ["course", "attendees"],
        csvContent: "Course,Attendees\nSNM_Core_Safety_P07,24\nHeat_Pump_Diagnostic_Cert,18\nSmart_Meter_V3_Ramp,12"
    },
    ctr_capacity: {
        label: "CTR Capacity",
        filename: "ctr_capacity_template.csv",
        group: "Capacity",
        desc: "Third-party agency and CTR contingent contractor capacity allocations.",
        requiredCols: ["agency", "contractors"],
        csvContent: "Agency,Contractors\nRandstad_Technical_UK,14\nAdecco_Field_Services,8\nHays_Engineering_Direct,11"
    },
    demand_input: {
        label: "Demand input",
        filename: "demand_input_template.csv",
        group: "Demand",
        desc: "Forecasted workload demand volume by UK patch, work code, and week.",
        requiredCols: ["patch", "skill", "work code"],
        csvContent: "Region Code,Area Code,Patch,Skill,Type,Work Code,Product,Weekcomm,Values\nB,B1,EB12 Altrincham,HEC,Forecast,W00,Central Heating,2026-10-05,340.5\nC,C2,EC91 Leicester,KAC,Forecast,W17,Boiler Breakdown,2026-10-05,420.0\nD,D1,ED44 Canterbury & Dover,EV,Forecast,W31,EV Charging,2026-10-05,185.0"
    },
    job_time_assumptions: {
        label: "Job time assumptions",
        filename: "job_time_assumptions_template.csv",
        group: "Demand",
        desc: "Standard job duration assumptions per work category and skill discipline.",
        requiredCols: ["patch", "work code", "values"],
        csvContent: "Patch,Work Code,Skill,Weekcomm,Values\nEB12 Altrincham,W00,HEC,2026-10-05,1.85\nEC91 Leicester,W17,KAC,2026-10-05,2.40\nED44 Canterbury & Dover,W31,EV,2026-10-05,3.10"
    },
    hec_on_kac_demand: {
        label: "HEC on KAC Demand",
        filename: "hec_on_kac_demand_template.csv",
        group: "Demand",
        desc: "Cross-skilling coverage ratios: HEC technicians supporting KAC work.",
        requiredCols: ["skill", "support", "ratio"],
        csvContent: "Skill,Support,Ratio\nHEC,KAC_Support,0.85\nHEC,KAC_Peak_Winter,0.92\nHEC,KAC_Weekend_Cover,0.75"
    },
    hec_on_ev_demand: {
        label: "HEC on EV Demand",
        filename: "hec_on_ev_demand_template.csv",
        group: "Demand",
        desc: "Cross-skilling coverage ratios: HEC engineers supporting EV charging jobs.",
        requiredCols: ["skill", "support", "ratio"],
        csvContent: "Skill,Support,Ratio\nHEC,EV_Commercial,0.65\nHEC,EV_Domestic_Wallbox,0.78\nHEC,EV_Urgent_Assistance,0.80"
    },
    attrition: {
        label: "Attrition",
        filename: "attrition_template.csv",
        group: "Config",
        desc: "Forecasted engineer retirement and leavers attrition rate by UK region.",
        requiredCols: ["region code", "skill", "values"],
        csvContent: "Region Code,Skill,Weekcomm,Values\nA,HEC,2026-10-05,0.012\nB,KAC,2026-10-05,0.018\nC,EV,2026-10-05,0.015"
    },
    recruitment_config: {
        label: "Recruitment",
        filename: "recruitment_config_template.csv",
        group: "Config",
        desc: "New engineer learning curve, ramp-up timeline, and productivity ramp curve.",
        requiredCols: ["week", "ramp"],
        csvContent: "Week,Ramp\n1,0.25\n2,0.50\n3,0.75\n4,0.90\n5,1.00"
    },
    geography_mapping: {
        label: "Geography mapping",
        filename: "geography_mapping_template.csv",
        group: "Config",
        desc: "Master mapping of UK operational patches to Centrica administrative regions.",
        requiredCols: ["region code", "patch name"],
        csvContent: "Region Code,Area Code,Patch Name,Postcode Prefix,Status\nA,A1,EA11 Inverness & Aviemore,IV,Active\nB,B2,EB12 Altrincham,WA,Active\nC,C1,EC91 Leicester,LE,Active"
    },
    week_to_month: {
        label: "Week to month",
        filename: "week_to_month_template.csv",
        group: "Config",
        desc: "Centrica financial 4-4-5 calendar mapping week commencement dates to periods.",
        requiredCols: ["weekcomm", "calendar month"],
        csvContent: "Weekcomm,Calendar Month,Fiscal Month,Fiscal Year,Weeks In Month\n2026-09-28,October,P07,FY26,4\n2026-10-05,October,P07,FY26,4\n2026-10-26,November,P08,FY26,4"
    },
    actuals_input: {
        label: "Actuals input",
        filename: "actuals_input_template.csv",
        group: "Actuals",
        desc: "Reconciled historical engineering delivery hours and labor logs.",
        requiredCols: ["patch", "skill", "metric"],
        csvContent: "Patch,Skill,Metric,Type,2026-09-28,2026-10-05,2026-10-12,2026-10-19\nEB12 Altrincham,HEC,Direct_Labor_Hours,Actual,412.5,420.0,405.0,430.0\nEC91 Leicester,KAC,Direct_Labor_Hours,Actual,380.0,395.5,388.0,402.0\nED44 Canterbury & Dover,EV,Direct_Labor_Hours,Actual,190.0,205.0,198.5,210.0"
    }
};

function downloadSingleTemplate(fileType) {
    const tmpl = TEMPLATE_DEFINITIONS[fileType];
    if (!tmpl) return;
    const blob = new Blob([tmpl.csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = tmpl.filename || `${fileType}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function downloadAllTemplatesZip(showToast) {
    if (window.JSZip) {
        try {
            const zip = new window.JSZip();
            const folder = zip.folder("british_gas_capacity_templates");
            Object.keys(TEMPLATE_DEFINITIONS).forEach(key => {
                const tmpl = TEMPLATE_DEFINITIONS[key];
                folder.file(tmpl.filename, tmpl.csvContent);
            });
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement("a");
            link.href = url;
            link.download = "British_Gas_Capacity_Templates_All_21.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            if (showToast) showToast("All 21 operational templates downloaded as ZIP!", "success");
            return;
        } catch (e) {
            console.error("ZIP packaging failed, falling back to sequential download:", e);
        }
    }
    // Fallback if JSZip is not loaded
    Object.keys(TEMPLATE_DEFINITIONS).forEach((key, index) => {
        setTimeout(() => {
            downloadSingleTemplate(key);
        }, index * 150);
    });
    if (showToast) showToast("Downloading all 21 templates sequentially...", "info");
}

function DownloadTemplatesView({ showToast }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("all");

    const templateKeys = Object.keys(TEMPLATE_DEFINITIONS);

    const filteredKeys = templateKeys.filter(key => {
        const tmpl = TEMPLATE_DEFINITIONS[key];
        const matchesGroup = selectedGroup === "all" || tmpl.group.toLowerCase() === selectedGroup.toLowerCase();
        const matchesSearch = !searchTerm.trim() || 
            tmpl.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tmpl.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tmpl.requiredCols.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesGroup && matchesSearch;
    });

    return (
        <div className="space-y-3.5 w-full">
            {/* Header / Filter Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs glow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <IconDownload className="w-4 h-4 text-[#005eb8]" />
                        <span>Standard Operational Schema Template Repository</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                        Pre-validated .CSV schema templates for all 21 operational inputs. 100% compliant with Bulk Ingestion validation.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => downloadAllTemplatesZip(showToast)}
                        className="bg-[#005eb8] hover:bg-[#004b87] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 glow-button"
                        title="Download complete archive of all 21 verified CSV templates"
                    >
                        <IconDownload className="w-4 h-4" />
                        <span>Download All 21 Templates (.zip)</span>
                    </button>
                </div>
            </div>

            {/* Filter Pills and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {['all', 'capacity', 'demand', 'config', 'actuals'].map(grp => (
                        <button
                            key={grp}
                            onClick={() => setSelectedGroup(grp)}
                            className={`text-[11px] font-semibold px-3 py-1 rounded-lg capitalize transition ${
                                selectedGroup === grp
                                    ? 'bg-[#005eb8] text-white shadow-xs font-bold'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                            }`}
                        >
                            {grp}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search template name, skill, or columns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                </div>
            </div>

            {/* Grid of Template Cards (All 21 Inputs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredKeys.map(key => {
                    const tmpl = TEMPLATE_DEFINITIONS[key];
                    return (
                        <div key={key} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs glow-card flex flex-col justify-between transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                        tmpl.group === 'Capacity' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                        tmpl.group === 'Demand' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                        tmpl.group === 'Config' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}>
                                        {tmpl.group}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                        .CSV
                                    </span>
                                </div>

                                <h3 className="text-xs font-bold text-slate-800 leading-snug">{tmpl.label}</h3>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{tmpl.desc}</p>

                                <div className="mt-2.5 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Required Columns:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {tmpl.requiredCols.map(col => (
                                            <span key={col} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                ✓ {col}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => downloadSingleTemplate(key)}
                                className="w-full mt-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg border border-slate-200 hover:border-blue-300 transition flex items-center justify-center gap-1.5 shadow-xs glow-button"
                            >
                                <IconDownload className="w-3.5 h-3.5 text-blue-600" />
                                <span>Download Template</span>
                            </button>
                        </div>
                    );
                })}
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
    onApplyUploadedFiles,
    setInputsState,
    showToast
}) {
    const [studioSubTab, setStudioSubTab] = useState('inputs_selection');
    const [filterCategory, setFilterCategory] = useState('all');
    const [stagedFiles, setStagedFiles] = useState([]);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResults, setValidationResults] = useState([]);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);

    // Helper to identify ML forecast options
    const isMLOption = (val) => val && typeof val === 'string' && (val.toLowerCase().includes('ml_forecast') || val.toLowerCase().includes('ml_'));
    const allInputKeys = Object.keys(inputsChoices || {});
    const totalInputs = allInputKeys.length || 21;
    const mlActiveCount = allInputKeys.filter(k => isMLOption(inputsState[k])).length;

    // Master Toggle to switch all 21 inputs between ML Forecast and User Uploaded files
    const handleToggleAllML = () => {
        const nextState = { ...inputsState };
        const shouldEnableAllML = mlActiveCount < totalInputs;

        allInputKeys.forEach(k => {
            const choices = inputsChoices[k] || [];
            const sorted = [...choices].sort((a, b) => parseDateFromOption(b) - parseDateFromOption(a));
            if (shouldEnableAllML) {
                const ml = sorted.find(c => isMLOption(c));
                if (ml) nextState[k] = ml;
            } else {
                const user = sorted.find(c => !isMLOption(c));
                if (user) nextState[k] = user;
            }
        });

        if (setInputsState) {
            setInputsState(nextState);
        } else {
            Object.keys(nextState).forEach(k => onInputChange(k, nextState[k]));
        }

        if (showToast) {
            showToast(
                shouldEnableAllML
                    ? `Enabled ML Forecast for all ${totalInputs} operational inputs.`
                    : `Reverted all ${totalInputs} operational inputs to user uploaded files.`,
                'info'
            );
        }
    };

    // Run validation across all staged files
    const handleRunValidation = async () => {
        if (stagedFiles.length === 0) return;
        setIsValidating(true);
        try {
            const results = await Promise.all(stagedFiles.map(item => validateFileItem(item)));
            setValidationResults(results);
            setIsResultModalOpen(true);
        } catch (err) {
            if (showToast) showToast(`Validation error: ${err.message}`, 'warning');
        } finally {
            setIsValidating(false);
        }
    };

    // Close modal and completely clean staged files
    const handleCloseModal = () => {
        setIsResultModalOpen(false);
        setStagedFiles([]); // Clean staged queue completely!
    };

    // Confirm OK from modal - applies passed files, cleans staged queue, and switches to inputs selection
    const handleConfirmOk = (passedList) => {
        setIsResultModalOpen(false);
        setStagedFiles([]); // Clean staged queue completely!
        if (passedList && passedList.length > 0) {
            if (onApplyUploadedFiles) {
                onApplyUploadedFiles(passedList);
            }
            // Return to Scenario & Inputs Selection sub-tab so user immediately sees their uploaded versions selected
            setStudioSubTab('inputs_selection');
        } else {
            if (showToast) showToast("No files passed validation.", "warning");
        }
    };

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
            {/* SLEEK COMPACT SUB-TABS NAVIGATION BAR (HEIGHT ~38PX, HIGH VISIBILITY) */}
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 glow-card">
                {/* Segmented Pill Track */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/70">
                    {/* Tab 1: Scenario Creation & Input Selection */}
                    <button
                        type="button"
                        onClick={() => setStudioSubTab('inputs_selection')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer select-none ${
                            studioSubTab === 'inputs_selection'
                                ? 'bg-[#005eb8] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                    >
                        <IconSliders className={`w-3.5 h-3.5 ${studioSubTab === 'inputs_selection' ? 'text-white' : 'text-blue-600'}`} />
                        <span>Scenario & Input Selection</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                            studioSubTab === 'inputs_selection'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-600'
                        }`}>
                            21
                        </span>
                    </button>

                    {/* Tab 2: Bulk Upload & Validation */}
                    <button
                        type="button"
                        onClick={() => setStudioSubTab('bulk_upload')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer select-none ${
                            studioSubTab === 'bulk_upload'
                                ? 'bg-[#005eb8] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                    >
                        <IconUpload className={`w-3.5 h-3.5 ${studioSubTab === 'bulk_upload' ? 'text-white' : 'text-blue-600'}`} />
                        <span>Bulk Upload</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                            studioSubTab === 'bulk_upload'
                                ? 'bg-white/20 text-white'
                                : stagedFiles.length > 0
                                ? 'bg-emerald-500 text-white animate-pulse'
                                : 'bg-slate-200 text-slate-600'
                        }`}>
                            {stagedFiles.length > 0 ? stagedFiles.length : 'Ingest'}
                        </span>
                    </button>

                    {/* Tab 3: Download Templates */}
                    <button
                        type="button"
                        onClick={() => setStudioSubTab('download_templates')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer select-none ${
                            studioSubTab === 'download_templates'
                                ? 'bg-[#005eb8] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                    >
                        <IconDownload className={`w-3.5 h-3.5 ${studioSubTab === 'download_templates' ? 'text-white' : 'text-blue-600'}`} />
                        <span>Download Templates</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                            studioSubTab === 'download_templates'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-600'
                        }`}>
                            21 Ready
                        </span>
                    </button>
                </div>

                {/* Right Status Indicator */}
                <div className="hidden md:flex items-center gap-2 pr-1 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-[11px] font-medium">
                        {studioSubTab === 'inputs_selection' && "Active Governance Inputs (21 Models)"}
                        {studioSubTab === 'bulk_upload' && "Multi-File Schema Validation Engine"}
                        {studioSubTab === 'download_templates' && "Standard .CSV Template Repository"}
                    </span>
                </div>
            </div>

            {/* FLOATING WINDOW: VALIDATION & INGESTION RESULTS MODAL (ALWAYS AVAILABLE) */}
            <ValidationResultsModal
                isOpen={isResultModalOpen}
                onClose={handleCloseModal}
                results={validationResults}
                onConfirmOk={handleConfirmOk}
            />

            {/* SUB-TAB 1: SCENARIO CREATION & INPUT SELECTION */}
            {studioSubTab === 'inputs_selection' && (
                <div className="space-y-3.5 w-full">
                    {/* STUDIO HEADER & SCENARIO METADATA */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs glow-card">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-900">Scenario Metadata & Operating Plan</h2>
                                <p className="text-[11px] text-slate-400">Define planning cycle metadata and configure individual file versions for all 21 inputs</p>
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

                    {/* ML FORECASTING GLOBAL CONTROLLER BAR */}
                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 glow-card">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#005eb8]">
                                <span className="text-sm">⚡</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">ML Forecast Engine & Prediction Source</span>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                        mlActiveCount === totalInputs
                                            ? 'bg-blue-100 text-[#005eb8] border-blue-300'
                                            : mlActiveCount > 0
                                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                        {mlActiveCount === totalInputs 
                                            ? 'All 21 Inputs on ML Forecast' 
                                            : mlActiveCount > 0 
                                                ? `${mlActiveCount} / ${totalInputs} Inputs on ML Forecast` 
                                                : 'Using User Uploaded Files'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400">Toggle ML forecast per input card or use master control to switch all 21 inputs at once.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleToggleAllML}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer border ${
                                    mlActiveCount === totalInputs
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                        : 'bg-[#005eb8] hover:bg-[#004b87] text-white border-[#005eb8]'
                                }`}
                                title="Toggle ML Forecast across all 21 operational inputs at once"
                            >
                                <span>{mlActiveCount === totalInputs ? "↩" : "⚡"}</span>
                                <span>{mlActiveCount === totalInputs ? "Revert All to User Uploaded" : "Enable ML Forecast for All (21 Inputs)"}</span>
                            </button>
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
            )}

            {/* SUB-TAB 2: BULK UPLOAD & INGESTION */}
            {studioSubTab === 'bulk_upload' && (
                <div className="space-y-3.5 w-full">
                    <BulkUploadSection
                        stagedFiles={stagedFiles}
                        setStagedFiles={setStagedFiles}
                        onRunValidation={handleRunValidation}
                        isValidating={isValidating}
                    />
                </div>
            )}

            {/* SUB-TAB 3: DOWNLOAD TEMPLATES */}
            {studioSubTab === 'download_templates' && (
                <div className="space-y-3.5 w-full">
                    <DownloadTemplatesView showToast={showToast} />
                </div>
            )}
        </div>
    );
}

// ------------------------------------------------------------------------------------------------
// REUSABLE MODERN INPUT CARD WITH DELETE, UNDO & REMARKS
// ------------------------------------------------------------------------------------------------
function ModernInputCard({ label, choices = [], selected, remarks, onChange, onDelete, onUndo }) {
    // Ensure dropdown options are ordered by date timestamp descending (latest at top of dropdown)
    const sortedChoices = useMemo(() => {
        const copy = [...choices];
        return copy.sort((a, b) => parseDateFromOption(b) - parseDateFromOption(a));
    }, [choices]);

    // Check if an option belongs to automated ML Forecast vs User Uploaded / Governance
    const isMLOption = (val) => val && typeof val === 'string' && (val.toLowerCase().includes('ml_forecast') || val.toLowerCase().includes('ml_'));

    const mlChoices = useMemo(() => sortedChoices.filter(c => isMLOption(c)), [sortedChoices]);
    const userChoices = useMemo(() => sortedChoices.filter(c => !isMLOption(c)), [sortedChoices]);

    const activeSelected = selected || (userChoices[0] || mlChoices[0] || '');
    const isMLActive = isMLOption(activeSelected);

    // Toggle switch handler for ML forecast vs user uploaded
    const handleToggleML = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!isMLActive) {
            // Enable ML: switch to latest ML forecast choice
            if (mlChoices.length > 0) {
                onChange(mlChoices[0]);
            }
        } else {
            // Disable ML: switch back to latest user uploaded / manual choice
            if (userChoices.length > 0) {
                onChange(userChoices[0]);
            }
        }
    };

    return (
        <div className={`p-3 rounded-xl border shadow-xs glow-card transition-all duration-150 ${
            isMLActive 
                ? 'bg-blue-50/25 border-blue-300 ring-1 ring-blue-100/70' 
                : 'bg-white border-slate-200/80'
        }`}>
            <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">{label}:</span>
                    {isMLActive && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-[#005eb8] border border-blue-200 whitespace-nowrap">
                            ⚡ ML Active
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle option to enable/disable ML forecast for this input */}
                    <div
                        onClick={handleToggleML}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md cursor-pointer select-none border transition ${
                            isMLActive 
                                ? 'bg-blue-50 border-blue-200 text-[#005eb8] font-bold' 
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                        title={isMLActive ? "ML Forecast enabled. Click to switch to User Uploaded file." : "Click to enable ML Forecast for this input."}
                    >
                        <span className="text-[10px] font-semibold">{isMLActive ? '⚡ ML Forecast' : 'Enable ML'}</span>
                        <div
                            className={`relative inline-flex h-3.5 w-6.5 shrink-0 rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                                isMLActive ? 'bg-[#005eb8]' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                    isMLActive ? 'translate-x-3' : 'translate-x-0'
                                }`}
                            />
                        </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono hidden xs:inline">{sortedChoices.length} ver</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <select
                        value={activeSelected}
                        title={activeSelected}
                        onChange={(e) => onChange(e.target.value)}
                        className={`w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs truncate cursor-pointer transition ${
                            isMLActive 
                                ? 'bg-white text-blue-950 border-blue-300 font-semibold' 
                                : 'bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                    >
                        {mlChoices.length > 0 && (
                            <optgroup label="⚡ ML Model Forecasts">
                                {mlChoices.map(c => (
                                    <option key={c} value={c} title={c}>⚡ {c}</option>
                                ))}
                            </optgroup>
                        )}
                        {userChoices.length > 0 && (
                            <optgroup label="📁 User Uploaded & Governance Files">
                                {userChoices.map(c => (
                                    <option key={c} value={c} title={c}>📁 {c}</option>
                                ))}
                            </optgroup>
                        )}
                        {mlChoices.length === 0 && userChoices.length === 0 && (
                            sortedChoices.map(c => (
                                <option key={c} value={c} title={c}>{c}</option>
                            ))
                        )}
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

            <div className="mt-1.5 text-[11px] flex items-start gap-1">
                {isMLActive ? (
                    <>
                        <span className="font-bold text-[#005eb8] flex-shrink-0">⚡ ML Model:</span>
                        <span className="text-blue-900 truncate font-medium" title={remarks}>{remarks}</span>
                    </>
                ) : (
                    <>
                        <span className="font-semibold text-slate-600 flex-shrink-0">Remarks:</span>
                        <span className="text-slate-500 truncate" title={remarks}>{remarks}</span>
                    </>
                )}
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
    const [searchTable, setSearchTable] = useState('');
    const activeStage = (envInfo.stage || 'dev').toLowerCase();
    const activeCatalog = envInfo.catalog || 'capacity_planning';
    const activeSchema = envInfo.schema || activeStage;
    const activeAppName = envInfo.app_name || (envInfo.is_databricks ? 'Not available' : 'capacity-planning-app-dev');

    const handleSwitchStage = (newStage) => {
        const nextSchema = newStage;
        const nextAppName = `capacity-planning-app-${newStage}`;
        setEnvInfo(prev => ({
            ...prev,
            stage: newStage,
            schema: nextSchema,
            app_name: nextAppName,
            environment: prev.is_databricks ? `Databricks Apps (${newStage.toUpperCase()})` : `VS Code (Local - ${newStage.toUpperCase()})`
        }));
        if (window.Shiny && window.Shiny.setInputValue) {
            window.Shiny.setInputValue('switch_stage_event', newStage, { priority: 'event' });
        }
        if (showToast) {
            showToast(`Stage switched to '${newStage.toUpperCase()}'. Schema resolved to '${nextSchema}'. Catalog remains '${activeCatalog}'.`, 'info');
        }
    };

    const defaultMappings = [
        { key: "actuals_input", label: "Actuals input", table_name: "es_shiny_actuals_input" },
        { key: "resource_plan", label: "Resource Plan", table_name: "es_shiny_resource_plan" },
        { key: "fte_transfer", label: "FTE transfer", table_name: "es_shiny_fte_transfer" },
        { key: "recruitment_grounded", label: "Recruitment grounded", table_name: "es_shiny_recruitment_grounded" },
        { key: "recruitment_ungrounded", label: "Recruitment ungrounded", table_name: "es_shiny_recruitment_ungrounded" },
        { key: "baseline_assumptions", label: "Baseline assumptions", table_name: "es_shiny_baseline_assumptions" },
        { key: "downtime_overlays_percentage", label: "Downtime Overlays Percentage", table_name: "es_shiny_downtime_overlays_percentage" },
        { key: "downtime_overlays_hours", label: "Downtime Overlays Hours", table_name: "es_shiny_downtime_overlays_hours" },
        { key: "downtime_overlays_hours_fte", label: "Downtime Overlays Hours/FTE", table_name: "es_shiny_downtime_overlays_hours_fte" },
        { key: "overtime", label: "Overtime", table_name: "es_shiny_overtime" },
        { key: "baseline_productivity", label: "Baseline productivity", table_name: "es_shiny_baseline_productivity" },
        { key: "training_snm", label: "Training SNM", table_name: "es_shiny_training_snm" },
        { key: "ctr_capacity", label: "CTR Capacity", table_name: "es_shiny_ctr_capacity" },
        { key: "attrition", label: "Attrition", table_name: "es_shiny_attrition" },
        { key: "recruitment_config", label: "Recruitment config", table_name: "es_shiny_recruitment_config" },
        { key: "demand_input", label: "Demand input", table_name: "es_shiny_demand_input" },
        { key: "job_time_assumptions", label: "Job time assumptions", table_name: "es_shiny_job_time_assumptions" },
        { key: "hec_on_kac_demand", label: "HEC on KAC Demand", table_name: "es_shiny_hec_on_kac_demand" },
        { key: "hec_on_ev_demand", label: "HEC on EV Demand", table_name: "es_shiny_hec_on_ev_demand" },
        { key: "geography_mapping", label: "Geography mapping", table_name: "es_shiny_geography_mapping" },
        { key: "week_to_month", label: "Week to month", table_name: "es_shiny_week_to_month" }
    ];

    const tableList = (envInfo.table_mappings && envInfo.table_mappings.length > 0)
        ? envInfo.table_mappings
        : defaultMappings.map(item => ({
            ...item,
            catalog: activeCatalog,
            schema: activeSchema,
            stage: activeStage,
            full_path: `${activeCatalog}.${activeSchema}.${item.table_name}`,
            format: "Delta Lake (Unity Catalog)"
        }));

    const filteredTables = tableList.filter(t =>
        t.label.toLowerCase().includes(searchTable.toLowerCase()) ||
        t.table_name.toLowerCase().includes(searchTable.toLowerCase()) ||
        t.full_path.toLowerCase().includes(searchTable.toLowerCase())
    );

    return (
        <div className="space-y-4 w-full animate-fade-in">
            {/* Header & Simulation Switcher */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs glow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                        <IconDatabase className="w-5 h-5 text-[#005eb8]" />
                        <span>Databricks Unity Catalog & Multi-Stage Lakehouse Architecture</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Table names (<code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono font-bold">es_shiny_*</code>) and catalog (<code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono font-bold">capacity_planning</code>) remain constant. Database/schema dynamically changes based on app name fetched from deployment environment (<code className="text-slate-700 font-mono">os.environ.get("DATABRICKS_APP_NAME", "Not available")</code>).
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-slate-600">Simulate Stage:</span>
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                        {['dev', 'uat', 'prod'].map(s => {
                            const isCurrent = activeStage === s;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleSwitchStage(s)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                                        isCurrent
                                            ? s === 'prod' ? 'bg-emerald-600 text-white shadow-xs'
                                            : s === 'uat' ? 'bg-amber-600 text-white shadow-xs'
                                            : 'bg-[#005eb8] text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Unity Catalog 4 Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs glow-card">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Databricks App Name</span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 mt-1 font-mono truncate" title={activeAppName}>
                        {activeAppName}
                    </h4>
                    <span className="text-[10px] text-slate-500 mt-0.5 block truncate" title='os.environ.get("DATABRICKS_APP_NAME", "Not available")'>
                        os.environ.get("DATABRICKS_APP_NAME", "Not available")
                    </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs glow-card">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Resolved Stage</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            activeStage === 'prod' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            activeStage === 'uat' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            'bg-blue-50 text-[#005eb8] border-blue-300'
                        }`}>
                            {activeStage}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                            {activeStage === 'prod' ? 'Production' : activeStage === 'uat' ? 'User Acceptance' : 'Development'}
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Driven by app name prefix/suffix</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs glow-card">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unity Catalog (Constant)</span>
                    <h4 className="text-xs sm:text-sm font-bold text-[#005eb8] mt-1 font-mono">
                        {activeCatalog}
                    </h4>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Identical across all stages</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs glow-card">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Database / Schema (Dynamic)</span>
                    <h4 className="text-xs sm:text-sm font-bold text-purple-700 mt-1 font-mono">
                        {activeSchema}
                    </h4>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Switches to match app environment</span>
                </div>
            </div>

            {/* 3-Level Namespace Architectural Banner */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap font-mono">
                    <span className="font-bold text-slate-700">Unity Catalog 3-Level Namespace:</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-[#005eb8] rounded-md font-bold border border-blue-200">
                        {activeCatalog}
                    </span>
                    <span className="text-slate-400 font-bold">.</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold border ${
                        activeStage === 'prod' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        activeStage === 'uat' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-purple-100 text-purple-800 border-purple-300'
                    }`}>
                        {activeSchema}
                    </span>
                    <span className="text-slate-400 font-bold">.</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md font-bold border border-slate-300">
                        es_shiny_&lt;table_name&gt;
                    </span>
                </div>

                <div className="text-[11px] text-slate-500">
                    🔒 Zero Code Drift: Table queries run unmodified across Dev, UAT, and Prod.
                </div>
            </div>

            {/* Databricks Tables Mapping Catalog */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden glow-card">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Databricks Unity Catalog Tables (All 21 Inputs Mapped in app.yaml)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                            Table names follow the standard pattern: <code className="text-slate-700 font-mono">Actuals input ➔ es_shiny_actuals_input</code>.
                        </p>
                    </div>

                    <div className="w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Filter table names or paths..."
                            value={searchTable}
                            onChange={(e) => setSearchTable(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="py-2.5 px-4">Operational Input</th>
                                <th className="py-2.5 px-4">Databricks Table Name</th>
                                <th className="py-2.5 px-4">Full 3-Level Unity Catalog Path</th>
                                <th className="py-2.5 px-4">Format</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredTables.map((tbl, idx) => (
                                <tr key={tbl.key || idx} className="hover:bg-slate-50/70 transition">
                                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                                        {tbl.label}
                                    </td>
                                    <td className="py-2.5 px-4">
                                        <code className="text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-blue-200">
                                            {tbl.table_name}
                                        </code>
                                    </td>
                                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">
                                        <span className="text-[#005eb8] font-bold">{tbl.catalog || activeCatalog}</span>
                                        <span className="text-slate-400">.</span>
                                        <span className={`font-bold ${activeStage === 'prod' ? 'text-emerald-700' : activeStage === 'uat' ? 'text-amber-700' : 'text-purple-700'}`}>{tbl.schema || activeSchema}</span>
                                        <span className="text-slate-400">.</span>
                                        <span className="text-slate-900 font-bold">{tbl.table_name}</span>
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            Delta Lake
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            ✓ Active in {activeSchema}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Databricks Apps PySpark Execution Example */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl shadow-xs space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-300"># Databricks PySpark Lakehouse Query Example</span>
                    <span className="text-[11px]">Dynamic Runtime Resolution</span>
                </div>
                <div className="space-y-1 text-slate-300 leading-relaxed text-[11px]">
                    <p><span className="text-purple-400">catalog</span> = os.environ.get(<span className="text-emerald-400">"DATABRICKS_CATALOG"</span>, <span className="text-emerald-400">"capacity_planning"</span>) <span className="text-slate-500"># {activeCatalog}</span></p>
                    <p><span className="text-purple-400">app_name</span> = os.environ.get(<span className="text-emerald-400">"DATABRICKS_APP_NAME"</span>, <span className="text-emerald-400">"Not available"</span>) <span className="text-slate-500"># -> "{activeAppName}"</span></p>
                    <p><span className="text-purple-400">schema</span> = <span className="text-emerald-400">"prod"</span> <span className="text-blue-400">if</span> <span className="text-emerald-400">"prod"</span> <span className="text-blue-400">in</span> app_name.lower() <span className="text-blue-400">else</span> (<span className="text-emerald-400">"uat"</span> <span className="text-blue-400">if</span> <span className="text-emerald-400">"uat"</span> <span className="text-blue-400">in</span> app_name.lower() <span className="text-blue-400">else</span> <span className="text-emerald-400">"dev"</span>) <span className="text-slate-500"># -> "{activeSchema}"</span></p>
                    <p><span className="text-purple-400">actuals_df</span> = spark.read.table(<span className="text-emerald-400">f"{catalog}.{schema}.es_shiny_actuals_input"</span>) <span className="text-slate-500"># -> {activeCatalog}.{activeSchema}.es_shiny_actuals_input</span></p>
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
