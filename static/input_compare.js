/**
 * Field Capacity Planning Platform - Input File Comparison Module
 * Provides comprehensive tabular & graphical comparison between any two versions
 * of operational input files (User Uploaded vs ML Model Forecasts vs Governance Baselines).
 */

// ================================================================================================
// 1. COMPARISON SVG ICONS
// ================================================================================================
function IconGitCompare({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-3-3m3 3l-3 3m-8 6H4m0 0l3 3m-3-3l3-3" />
        </svg>
    );
}

function IconSwap({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
    );
}

function IconTrendingUp({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    );
}

function IconTrendingDown({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
    );
}

function IconColumns({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
    );
}

// ================================================================================================
// 2. CORE DIFFING & STATISTICAL COMPARISON ENGINE
// ================================================================================================

/**
 * Identifies the best candidate primary key column for row-level entity matching
 */
function findIdentifierColumn(columns = []) {
    if (!columns || columns.length === 0) return null;
    const lowerCols = columns.map(c => ({ original: c, lower: String(c).toLowerCase().trim() }));
    
    // Priority matching list
    const candidateKeys = [
        "pay id", "pay_id", "payid",
        "cohort", "id", "item", "code", "metric",
        "patch", "territory", "from", "agency", "course",
        "area code", "region code", "skill"
    ];

    for (const key of candidateKeys) {
        const found = lowerCols.find(c => c.lower === key || c.lower.replace(/[\s_-]/g, '') === key.replace(/[\s_-]/g, ''));
        if (found) return found.original;
    }

    // Fallback: search for any column containing 'id' or 'code'
    const partialMatch = lowerCols.find(c => c.lower.includes("id") || c.lower.includes("code"));
    return partialMatch ? partialMatch.original : null;
}

/**
 * Checks whether a column contains largely numeric values
 */
function isNumericColumn(rows = [], colKey = "") {
    if (!rows || rows.length === 0 || !colKey) return false;
    let nonNullCount = 0;
    let numericCount = 0;

    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const val = rows[i]?.[colKey];
        if (val !== undefined && val !== null && val !== "") {
            nonNullCount++;
            if (!isNaN(Number(val)) && typeof val !== "boolean") {
                numericCount++;
            }
        }
    }
    return nonNullCount > 0 && (numericCount / nonNullCount) >= 0.8;
}

/**
 * Formats numbers gracefully for delta and percentage displays
 */
function formatDeltaNum(num, isPct = false) {
    if (num === null || num === undefined || isNaN(num)) return "—";
    const abs = Math.abs(num);
    const formatted = abs >= 1000 ? abs.toLocaleString(undefined, { maximumFractionDigits: 1 }) : abs.toFixed(abs % 1 === 0 ? 0 : 2);
    const sign = num > 0 ? "+" : num < 0 ? "-" : "";
    return `${sign}${formatted}${isPct ? "%" : ""}`;
}

/**
 * High-performance diff computation between File A and File B
 */
function computeFileDiff(dataA, dataB, inputKey = "") {
    const rowsA = (dataA && dataA.rows) || [];
    const rowsB = (dataB && dataB.rows) || [];
    const colsA = (dataA && dataA.columns) || [];
    const colsB = (dataB && dataB.columns) || [];

    // Unified list of all columns
    const allColsSet = new Set([...colsA, ...colsB]);
    const commonCols = colsA.filter(c => colsB.includes(c));
    const addedCols = colsB.filter(c => !colsA.includes(c));
    const removedCols = colsA.filter(c => !colsB.includes(c));
    const allColumns = Array.from(allColsSet);

    // Identify primary key column
    const idCol = findIdentifierColumn(commonCols);

    // Build row index maps
    const diffRows = [];
    let identicalCount = 0;
    let modifiedCount = 0;
    let addedCount = 0;
    let removedCount = 0;
    let totalCellMods = 0;
    const colModCounts = {};
    commonCols.forEach(c => { colModCounts[c] = 0; });

    // Numeric metrics accumulator for magnitude analysis
    const numericColStats = {};
    commonCols.forEach(col => {
        if (isNumericColumn(rowsA, col) || isNumericColumn(rowsB, col)) {
            numericColStats[col] = {
                colKey: col,
                sumA: 0,
                sumB: 0,
                countA: 0,
                countB: 0,
                rowsChanged: 0,
                maxPosDelta: 0,
                maxNegDelta: 0
            };
        }
    });

    // Populate baseline stats for File A
    rowsA.forEach(r => {
        Object.keys(numericColStats).forEach(c => {
            const v = Number(r[c]);
            if (!isNaN(v)) {
                numericColStats[c].sumA += v;
                numericColStats[c].countA += 1;
            }
        });
    });

    // Populate baseline stats for File B
    rowsB.forEach(r => {
        Object.keys(numericColStats).forEach(c => {
            const v = Number(r[c]);
            if (!isNaN(v)) {
                numericColStats[c].sumB += v;
                numericColStats[c].countB += 1;
            }
        });
    });

    if (idCol) {
        // Matched by primary identifier
        const mapA = new Map();
        rowsA.forEach((r, idx) => {
            const key = String(r[idCol] ?? `__row_${idx}`).trim();
            mapA.set(key, { row: r, idx });
        });

        const mapB = new Map();
        rowsB.forEach((r, idx) => {
            const key = String(r[idCol] ?? `__row_${idx}`).trim();
            mapB.set(key, { row: r, idx });
        });

        // 1. Evaluate records present in File A
        mapA.forEach((itemA, key) => {
            const rowA = itemA.row;
            if (mapB.has(key)) {
                // Present in both files: check cell by cell
                const rowB = mapB.get(key).row;
                const cellDiffs = {};
                let hasDifferences = false;

                allColumns.forEach(col => {
                    const valA = rowA[col];
                    const valB = rowB[col];
                    const strA = (valA === null || valA === undefined) ? "" : String(valA).trim();
                    const strB = (valB === null || valB === undefined) ? "" : String(valB).trim();

                    if (strA !== strB) {
                        hasDifferences = true;
                        totalCellMods++;
                        if (colModCounts[col] !== undefined) colModCounts[col]++;

                        const numA = Number(valA);
                        const numB = Number(valB);
                        const isNum = !isNaN(numA) && !isNaN(numB) && strA !== "" && strB !== "";
                        const delta = isNum ? (numB - numA) : null;
                        const pct = isNum && numA !== 0 ? ((delta / Math.abs(numA)) * 100) : null;

                        cellDiffs[col] = {
                            isModified: true,
                            valA,
                            valB,
                            delta,
                            pct
                        };

                        if (numericColStats[col] && isNum) {
                            numericColStats[col].rowsChanged++;
                            if (delta > numericColStats[col].maxPosDelta) numericColStats[col].maxPosDelta = delta;
                            if (delta < numericColStats[col].maxNegDelta) numericColStats[col].maxNegDelta = delta;
                        }
                    } else {
                        cellDiffs[col] = {
                            isModified: false,
                            valA,
                            valB
                        };
                    }
                });

                if (hasDifferences) {
                    modifiedCount++;
                    diffRows.push({
                        __diffId: `mod_${key}`,
                        __status: "MODIFIED",
                        __idVal: key,
                        __rowA: rowA,
                        __rowB: rowB,
                        cellDiffs,
                        displayRow: { ...rowA, ...rowB }
                    });
                } else {
                    identicalCount++;
                    diffRows.push({
                        __diffId: `ident_${key}`,
                        __status: "IDENTICAL",
                        __idVal: key,
                        __rowA: rowA,
                        __rowB: rowB,
                        cellDiffs,
                        displayRow: rowA
                    });
                }
            } else {
                // Record in File A, but missing in File B -> REMOVED
                removedCount++;
                const cellDiffs = {};
                allColumns.forEach(col => {
                    cellDiffs[col] = { isModified: true, valA: rowA[col], valB: null, isRemoved: true };
                });
                diffRows.push({
                    __diffId: `rem_${key}`,
                    __status: "REMOVED",
                    __idVal: key,
                    __rowA: rowA,
                    __rowB: null,
                    cellDiffs,
                    displayRow: rowA
                });
            }
        });

        // 2. Evaluate records added in File B
        mapB.forEach((itemB, key) => {
            if (!mapA.has(key)) {
                addedCount++;
                const rowB = itemB.row;
                const cellDiffs = {};
                allColumns.forEach(col => {
                    cellDiffs[col] = { isModified: true, valA: null, valB: rowB[col], isAdded: true };
                });
                diffRows.push({
                    __diffId: `add_${key}`,
                    __status: "ADDED",
                    __idVal: key,
                    __rowA: null,
                    __rowB: rowB,
                    cellDiffs,
                    displayRow: rowB
                });
            }
        });
    } else {
        // Fallback: match sequentially by index
        const maxLen = Math.max(rowsA.length, rowsB.length);
        for (let i = 0; i < maxLen; i++) {
            const rowA = rowsA[i];
            const rowB = rowsB[i];

            if (rowA && rowB) {
                let hasDifferences = false;
                const cellDiffs = {};

                allColumns.forEach(col => {
                    const valA = rowA[col];
                    const valB = rowB[col];
                    const strA = (valA === null || valA === undefined) ? "" : String(valA).trim();
                    const strB = (valB === null || valB === undefined) ? "" : String(valB).trim();

                    if (strA !== strB) {
                        hasDifferences = true;
                        totalCellMods++;
                        if (colModCounts[col] !== undefined) colModCounts[col]++;

                        const numA = Number(valA);
                        const numB = Number(valB);
                        const isNum = !isNaN(numA) && !isNaN(numB) && strA !== "" && strB !== "";
                        const delta = isNum ? (numB - numA) : null;
                        const pct = isNum && numA !== 0 ? ((delta / Math.abs(numA)) * 100) : null;

                        cellDiffs[col] = { isModified: true, valA, valB, delta, pct };
                        if (numericColStats[col] && isNum) {
                            numericColStats[col].rowsChanged++;
                        }
                    } else {
                        cellDiffs[col] = { isModified: false, valA, valB };
                    }
                });

                if (hasDifferences) {
                    modifiedCount++;
                    diffRows.push({
                        __diffId: `mod_idx_${i}`,
                        __status: "MODIFIED",
                        __idVal: `Row #${i + 1}`,
                        __rowA: rowA,
                        __rowB: rowB,
                        cellDiffs,
                        displayRow: { ...rowA, ...rowB }
                    });
                } else {
                    identicalCount++;
                    diffRows.push({
                        __diffId: `ident_idx_${i}`,
                        __status: "IDENTICAL",
                        __idVal: `Row #${i + 1}`,
                        __rowA: rowA,
                        __rowB: rowB,
                        cellDiffs,
                        displayRow: rowA
                    });
                }
            } else if (rowA && !rowB) {
                removedCount++;
                const cellDiffs = {};
                allColumns.forEach(col => {
                    cellDiffs[col] = { isModified: true, valA: rowA[col], valB: null, isRemoved: true };
                });
                diffRows.push({
                    __diffId: `rem_idx_${i}`,
                    __status: "REMOVED",
                    __idVal: `Row #${i + 1}`,
                    __rowA: rowA,
                    __rowB: null,
                    cellDiffs,
                    displayRow: rowA
                });
            } else if (!rowA && rowB) {
                addedCount++;
                const cellDiffs = {};
                allColumns.forEach(col => {
                    cellDiffs[col] = { isModified: true, valA: null, valB: rowB[col], isAdded: true };
                });
                diffRows.push({
                    __diffId: `add_idx_${i}`,
                    __status: "ADDED",
                    __idVal: `Row #${i + 1}`,
                    __rowA: null,
                    __rowB: rowB,
                    cellDiffs,
                    displayRow: rowB
                });
            }
        }
    }

    // Finish numeric column stats
    Object.keys(numericColStats).forEach(c => {
        const item = numericColStats[c];
        item.deltaSum = item.sumB - item.sumA;
        item.pctDelta = item.sumA !== 0 ? ((item.deltaSum / Math.abs(item.sumA)) * 100) : (item.sumB > 0 ? 100 : 0);
        item.meanA = item.countA > 0 ? (item.sumA / item.countA) : 0;
        item.meanB = item.countB > 0 ? (item.sumB / item.countB) : 0;
        item.deltaMean = item.meanB - item.meanA;
    });

    // Categorical distribution analysis for key dimensions (e.g. Status, Skill, Labour Type)
    const categoricalDist = {};
    const catCandidates = ["status", "skill", "labour type", "type", "wmis", "cohort", "from", "category"];
    
    commonCols.forEach(col => {
        const lower = col.toLowerCase();
        if (catCandidates.some(cc => lower.includes(cc)) && !numericColStats[col]) {
            const countsA = {};
            const countsB = {};
            const allVals = new Set();

            rowsA.forEach(r => {
                const v = String(r[col] || "Unassigned").trim();
                countsA[v] = (countsA[v] || 0) + 1;
                allVals.add(v);
            });

            rowsB.forEach(r => {
                const v = String(r[col] || "Unassigned").trim();
                countsB[v] = (countsB[v] || 0) + 1;
                allVals.add(v);
            });

            const breakdown = Array.from(allVals).map(val => {
                const cA = countsA[val] || 0;
                const cB = countsB[val] || 0;
                return {
                    name: val,
                    countA: cA,
                    countB: cB,
                    delta: cB - cA,
                    pctDelta: cA !== 0 ? (((cB - cA) / cA) * 100) : (cB > 0 ? 100 : 0)
                };
            }).sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));

            categoricalDist[col] = breakdown;
        }
    });

    // Summary aggregates
    const totalRecordsEvaluated = diffRows.length;
    const differentRowsCount = modifiedCount + addedCount + removedCount;
    const diffPct = totalRecordsEvaluated > 0 ? ((differentRowsCount / totalRecordsEvaluated) * 100) : 0;
    const rowCountDelta = rowsB.length - rowsA.length;
    const rowCountPct = rowsA.length > 0 ? ((rowCountDelta / rowsA.length) * 100) : 0;

    return {
        idCol,
        allColumns,
        commonCols,
        addedCols,
        removedCols,
        rowsA_Count: rowsA.length,
        rowsB_Count: rowsB.length,
        totalRecordsEvaluated,
        identicalCount,
        modifiedCount,
        addedCount,
        removedCount,
        differentRowsCount,
        diffPct,
        rowCountDelta,
        rowCountPct,
        totalCellMods,
        colModCounts,
        numericColStats,
        categoricalDist,
        diffRows
    };
}

/**
 * Generates automated executive key insights based on calculated diff metrics
 */
function generateExecutiveInsights(diffData, fileAName = "", fileBName = "", inputLabel = "") {
    if (!diffData) return [];
    const insights = [];
    const {
        rowsA_Count,
        rowsB_Count,
        differentRowsCount,
        diffPct,
        modifiedCount,
        addedCount,
        removedCount,
        rowCountDelta,
        rowCountPct,
        numericColStats,
        categoricalDist,
        idCol,
        addedCols,
        removedCols
    } = diffData;

    // 1. High-Level Record Volume & Difference Magnitude
    if (differentRowsCount === 0 && rowCountDelta === 0) {
        insights.push({
            type: "identical",
            badge: "Identical Files",
            color: "emerald",
            title: "Zero Operational Variance Detected",
            detail: `Both files (${fileAName} and ${fileBName}) are 100% byte-for-byte identical across all ${rowsA_Count} records and attributes.`
        });
        return insights;
    }

    // Volume insight
    let volumeDetail = "";
    if (rowCountDelta !== 0) {
        const direction = rowCountDelta > 0 ? "more" : "fewer";
        volumeDetail = `File B contains ${Math.abs(rowCountDelta)} ${direction} records (${formatDeltaNum(rowCountPct, true)}) compared to File A (${rowsB_Count} vs ${rowsA_Count} rows). `;
    } else {
        volumeDetail = `Both files contain the exact same record count (${rowsA_Count} rows). `;
    }
    volumeDetail += `Overall, ${differentRowsCount} of ${diffData.totalRecordsEvaluated} records (${diffPct.toFixed(1)}%) exhibit differences (${modifiedCount} modified, ${addedCount} added, ${removedCount} removed).`;

    insights.push({
        type: "volume",
        badge: "Volume Variance",
        color: diffPct > 50 ? "amber" : "blue",
        title: `${differentRowsCount} Rows Differ (${diffPct.toFixed(1)}% Variance)`,
        detail: volumeDetail
    });

    // 2. Numerical Metrics Magnitude Analysis ("how much different")
    const numericKeys = Object.keys(numericColStats || {});
    if (numericKeys.length > 0) {
        // Sort by absolute sum delta
        const sortedNumerics = numericKeys
            .map(k => numericColStats[k])
            .filter(n => n.rowsChanged > 0 || Math.abs(n.deltaSum) > 0.001)
            .sort((a, b) => Math.abs(b.pctDelta) - Math.abs(a.pctDelta));

        if (sortedNumerics.length > 0) {
            const topMetric = sortedNumerics[0];
            const direction = topMetric.deltaSum > 0 ? "increased" : "decreased";
            const metricTitle = `Numerical Impact: '${topMetric.colKey}' ${direction} by ${formatDeltaNum(topMetric.deltaSum)} (${formatDeltaNum(topMetric.pctDelta, true)})`;
            
            let metricDetail = `Total '${topMetric.colKey}' moved from ${topMetric.sumA.toLocaleString()} in File A to ${topMetric.sumB.toLocaleString()} in File B across ${topMetric.rowsChanged} modified records.`;
            if (sortedNumerics.length > 1) {
                const secondary = sortedNumerics.slice(1, 3).map(m => `'${m.colKey}': ${formatDeltaNum(m.deltaSum)} (${formatDeltaNum(m.pctDelta, true)})`).join(", ");
                metricDetail += ` Other shifted metrics: ${secondary}.`;
            }

            insights.push({
                type: "numeric",
                badge: "Quantitative Shift",
                color: topMetric.deltaSum < 0 ? "rose" : "emerald",
                title: metricTitle,
                detail: metricDetail
            });
        }
    }

    // 3. Categorical & Operational Distribution Shifts (Status, Skill, etc.)
    const catKeys = Object.keys(categoricalDist || {});
    if (catKeys.length > 0) {
        for (const catCol of catKeys.slice(0, 2)) {
            const items = categoricalDist[catCol];
            const shiftedItems = items.filter(i => Math.abs(i.delta) > 0);
            if (shiftedItems.length > 0) {
                const topShift = shiftedItems[0];
                const shiftDir = topShift.delta > 0 ? "grew" : "contracted";
                const catTitle = `${catCol.toUpperCase()} Shift: '${topShift.name}' ${shiftDir} by ${Math.abs(topShift.delta)} records`;
                
                const breakdownSummary = shiftedItems.map(i => `${i.name}: ${formatDeltaNum(i.delta)}`).join(", ");
                insights.push({
                    type: "category",
                    badge: "Operational Shift",
                    color: "indigo",
                    title: catTitle,
                    detail: `Category transitions in '${catCol}': ${breakdownSummary}. This reflects workload or staffing realignments.`
                });
            }
        }
    }

    // 4. Roster & Entity Key Shifts
    if (idCol && (addedCount > 0 || removedCount > 0)) {
        insights.push({
            type: "entity",
            badge: "Entity Roster Delta",
            color: "amber",
            title: `Roster Rebalancing: ${addedCount} New & ${removedCount} Retired`,
            detail: `Matching by primary key '${idCol}' identified ${addedCount} new entity IDs introduced in File B, while ${removedCount} entity IDs from File A are no longer present.`
        });
    }

    // 5. Schema Parity & Drift Check
    if (addedCols.length > 0 || removedCols.length > 0) {
        insights.push({
            type: "schema",
            badge: "Schema Drift",
            color: "purple",
            title: `Schema Drift Detected: ${addedCols.length} Added, ${removedCols.length} Removed`,
            detail: `Columns added in File B: [${addedCols.join(", ") || "None"}]. Columns missing from File B: [${removedCols.join(", ") || "None"}].`
        });
    } else {
        insights.push({
            type: "schema",
            badge: "Schema Integrity",
            color: "emerald",
            title: "100% Schema Parity Maintained",
            detail: `Both files share identical ${diffData.commonCols.length} columns with zero structural schema drift.`
        });
    }

    // 6. Source & Model Context
    const isFileAML = typeof fileAName === "string" && (fileAName.toLowerCase().includes("ml_forecast") || fileAName.toLowerCase().includes("ml_"));
    const isFileBML = typeof fileBName === "string" && (fileBName.toLowerCase().includes("ml_forecast") || fileBName.toLowerCase().includes("ml_"));
    
    if (isFileAML !== isFileBML) {
        insights.push({
            type: "governance",
            badge: "Model vs Baseline",
            color: "cyan",
            title: "Machine Learning vs Governance Comparison",
            detail: `Comparing an automated ML forecast with a user governance baseline highlights algorithmic adjustments against human-curated operational expectations.`
        });
    }

    return insights;
}

// ================================================================================================
// 3. INTERACTIVE SVG CHARTS FOR GRAPHICAL COMPARISON
// ================================================================================================

/**
 * Donut chart showing row composition: Identical, Modified, Added, Removed
 */
function RowCompositionDonut({ diffData }) {
    if (!diffData) return null;
    const { totalRecordsEvaluated, identicalCount, modifiedCount, addedCount, removedCount, diffPct } = diffData;
    if (totalRecordsEvaluated === 0) return null;

    const segments = [
        { label: "Identical", count: identicalCount, color: "#10b981", darkColor: "#10b981" },
        { label: "Modified", count: modifiedCount, color: "#f59e0b", darkColor: "#fbbf24" },
        { label: "Added (in B)", count: addedCount, color: "#3b82f6", darkColor: "#60a5fa" },
        { label: "Removed (from A)", count: removedCount, color: "#f43f5e", darkColor: "#fb7185" },
    ].filter(s => s.count > 0);

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
        <div className="bg-slate-50 dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-2xs flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Row Status Composition
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-[#005eb8] dark:bg-blue-950 dark:text-blue-300 font-extrabold">
                    {totalRecordsEvaluated} Total Records
                </span>
            </div>

            <div className="relative w-40 h-40 flex items-center justify-center my-1">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
                    <circle cx="80" cy="80" r={radius} fill="none" stroke="currentColor" strokeWidth="18" className="text-slate-200 dark:text-[#18365d]" />
                    {segments.map((seg, i) => {
                        const strokeDasharray = `${(seg.count / totalRecordsEvaluated) * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedAngle;
                        accumulatedAngle += (seg.count / totalRecordsEvaluated) * circumference;
                        return (
                            <circle
                                key={i}
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="18"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-500 ease-out"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">
                        {diffPct.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                        Variance
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full mt-2 text-xs">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center justify-between px-2 py-1 rounded-md bg-white dark:bg-[#070e1c] border border-slate-200/60 dark:border-[#18365d]/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">{s.label}:</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 ml-1">
                            {s.count}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Bar chart comparing Numeric Metrics between File A and File B with Delta badges
 */
function NumericMetricsVarianceChart({ numericColStats }) {
    if (!numericColStats) return null;
    const metrics = Object.values(numericColStats).filter(m => m.countA > 0 || m.countB > 0).slice(0, 5);
    if (metrics.length === 0) return null;

    return (
        <div className="bg-slate-50 dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Numeric Metrics Variance (Totals)
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    File A vs File B
                </span>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                {metrics.map(m => {
                    const maxVal = Math.max(m.sumA, m.sumB, 1);
                    const pctA = Math.min(100, Math.max(8, (m.sumA / maxVal) * 100));
                    const pctB = Math.min(100, Math.max(8, (m.sumB / maxVal) * 100));
                    const isPositive = m.deltaSum > 0;
                    const isZero = Math.abs(m.deltaSum) < 0.001;

                    return (
                        <div key={m.colKey} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight">
                                    {m.colKey}
                                </span>
                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {m.sumA.toLocaleString()} → <strong className="text-slate-800 dark:text-white">{m.sumB.toLocaleString()}</strong>
                                    </span>
                                    {!isZero ? (
                                        <span className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                                            isPositive 
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' 
                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                                        }`}>
                                            {formatDeltaNum(m.deltaSum)} ({formatDeltaNum(m.pctDelta, true)})
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 font-semibold">No Change</span>
                                    )}
                                </div>
                            </div>

                            {/* Dual side-by-side progress bars */}
                            <div className="space-y-1 bg-white dark:bg-[#070e1c] p-2 rounded-lg border border-slate-200/50 dark:border-[#18365d]/50">
                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                    <span className="w-12 text-slate-400 truncate">File A:</span>
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-slate-400 dark:bg-slate-500 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${pctA}%` }}
                                        />
                                    </div>
                                    <span className="w-12 text-right text-slate-600 dark:text-slate-300 font-bold">{m.sumA.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                    <span className="w-12 text-[#005eb8] dark:text-[#80c6ff] font-bold truncate">File B:</span>
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${pctB}%` }}
                                        />
                                    </div>
                                    <span className="w-12 text-right text-blue-700 dark:text-blue-300 font-bold">{m.sumB.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Visual breakdown chart for categorical shifts (e.g. Status or Skill distribution)
 */
function CategoricalDistributionChart({ categoricalDist }) {
    if (!categoricalDist) return null;
    const catKeys = Object.keys(categoricalDist);
    if (catKeys.length === 0) return null;

    const primaryCol = catKeys[0];
    const items = (categoricalDist[primaryCol] || []).slice(0, 6);
    if (items.length === 0) return null;

    const maxCount = Math.max(...items.map(i => Math.max(i.countA, i.countB)), 1);

    return (
        <div className="bg-slate-50 dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Distribution: {primaryCol}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                    Categorical Shift
                </span>
            </div>

            <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                {items.map(item => {
                    const pctA = Math.min(100, Math.max(6, (item.countA / maxCount) * 100));
                    const pctB = Math.min(100, Math.max(6, (item.countB / maxCount) * 100));
                    const isDiff = item.delta !== 0;

                    return (
                        <div key={item.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                    {item.name}
                                </span>
                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {item.countA} → <strong className="text-slate-800 dark:text-white">{item.countB}</strong>
                                    </span>
                                    {isDiff && (
                                        <span className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                                            item.delta > 0 
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' 
                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                                        }`}>
                                            {formatDeltaNum(item.delta)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                                    <div 
                                        className="bg-slate-400 dark:bg-slate-500 h-full transition-all duration-500" 
                                        style={{ width: `${pctA}%` }} 
                                        title={`File A: ${item.countA}`} 
                                    />
                                </div>
                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                                    <div 
                                        className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-500" 
                                        style={{ width: `${pctB}%` }} 
                                        title={`File B: ${item.countB}`} 
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200/50 dark:border-[#18365d]/50">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" /> File A Count</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 inline-block" /> File B Count</span>
            </div>
        </div>
    );
}

// ================================================================================================
// 4. MAIN INPUT FILE COMPARISON VIEW COMPONENT
// ================================================================================================

function InputCompareSection({
    inputKey,
    inputLabel,
    activeFileName,
    availableChoices = [],
    tableDataCache = {},
    onRequestFileData,
    onBackToTableView,
    showToast
}) {
    // 1. Selector states for Base File A and Comparison File B
    const [fileA, setFileA] = useState(activeFileName || (availableChoices[0] || ""));
    const [fileB, setFileB] = useState(() => {
        if (availableChoices.length > 1) {
            // Pick a different file by default (e.g. index 1)
            const secondChoice = availableChoices.find(c => c !== activeFileName) || availableChoices[1];
            return secondChoice;
        }
        return activeFileName;
    });

    // Sub-view mode inside compare section
    const [activeTab, setActiveTab] = useState("insights"); // 'insights' | 'tabular_diff'
    const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'different' | 'modified' | 'added' | 'removed' | 'identical'
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Ensure choices are loaded into cache when selected
    useEffect(() => {
        if (fileA && (!tableDataCache[fileA] || !tableDataCache[fileA].rows)) {
            if (onRequestFileData) onRequestFileData(inputKey, fileA);
        }
    }, [fileA, tableDataCache, inputKey, onRequestFileData]);

    useEffect(() => {
        if (fileB && (!tableDataCache[fileB] || !tableDataCache[fileB].rows)) {
            if (onRequestFileData) onRequestFileData(inputKey, fileB);
        }
    }, [fileB, tableDataCache, inputKey, onRequestFileData]);

    const dataA = tableDataCache[fileA];
    const dataB = tableDataCache[fileB];
    const isLoadingA = !dataA || !dataA.rows;
    const isLoadingB = !dataB || !dataB.rows;
    const isLoading = isLoadingA || isLoadingB;

    // Swap files handler
    const handleSwapFiles = () => {
        const temp = fileA;
        setFileA(fileB);
        setFileB(temp);
        if (showToast) showToast(`Swapped comparison: comparing ${fileB} (Base) against ${temp}`, "info");
    };

    // Calculate diff using core engine
    const diffData = useMemo(() => {
        if (isLoading) return null;
        return computeFileDiff(dataA, dataB, inputKey);
    }, [dataA, dataB, inputKey, isLoading]);

    // Executive Insights
    const executiveInsights = useMemo(() => {
        if (!diffData) return [];
        return generateExecutiveInsights(diffData, fileA, fileB, inputLabel);
    }, [diffData, fileA, fileB, inputLabel]);

    // Filter diff rows for tabular view
    const filteredRows = useMemo(() => {
        if (!diffData || !diffData.diffRows) return [];
        let rows = diffData.diffRows;

        // Status filtering
        if (filterStatus === "different") {
            rows = rows.filter(r => r.__status !== "IDENTICAL");
        } else if (filterStatus === "modified") {
            rows = rows.filter(r => r.__status === "MODIFIED");
        } else if (filterStatus === "added") {
            rows = rows.filter(r => r.__status === "ADDED");
        } else if (filterStatus === "removed") {
            rows = rows.filter(r => r.__status === "REMOVED");
        } else if (filterStatus === "identical") {
            rows = rows.filter(r => r.__status === "IDENTICAL");
        }

        // Search filtering
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            rows = rows.filter(r => {
                if (r.__idVal && String(r.__idVal).toLowerCase().includes(q)) return true;
                return Object.values(r.displayRow || {}).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q));
            });
        }

        return rows;
    }, [diffData, filterStatus, searchQuery]);

    // Paginated rows
    const paginatedRows = useMemo(() => {
        if (pageSize === "all") return filteredRows;
        const size = Number(pageSize);
        const start = (page - 1) * size;
        return filteredRows.slice(start, start + size);
    }, [filteredRows, page, pageSize]);

    // Export diff to CSV
    const handleExportDiffCSV = () => {
        if (!diffData || !diffData.diffRows || diffData.diffRows.length === 0) {
            if (showToast) showToast("No diff data available to export.", "warning");
            return;
        }

        const cols = diffData.allColumns;
        const headers = ["Diff Status", diffData.idCol || "Record ID", ...cols.map(c => `[Base A] ${c}`), ...cols.map(c => `[Compare B] ${c}`)];
        const csvRows = [headers.join(",")];

        diffData.diffRows.forEach(item => {
            const rowValues = [
                `"${item.__status}"`,
                `"${item.__idVal || ""}"`
            ];
            // Base A columns
            cols.forEach(c => {
                const val = item.__rowA ? item.__rowA[c] : "";
                rowValues.push(`"${String(val ?? "").replace(/"/g, '""')}"`);
            });
            // Compare B columns
            cols.forEach(c => {
                const val = item.__rowB ? item.__rowB[c] : "";
                rowValues.push(`"${String(val ?? "").replace(/"/g, '""')}"`);
            });
            csvRows.push(rowValues.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Comparison_${inputKey}_${fileA}_vs_${fileB}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (showToast) showToast(`Exported comparison diff report to CSV successfully!`, "success");
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-[#070e1c] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* COMPARISON CONTROL BAR: FILE A & FILE B SELECTORS */}
            <div className="bg-white dark:bg-[#0c1b31] border-b border-slate-200/90 dark:border-[#18365d] px-4 py-3 shadow-xs flex-shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Dual File Selection Hub */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-[280px]">
                        {/* File A (Base) */}
                        <div className="flex items-center gap-1.5 min-w-[200px] flex-1 sm:flex-initial">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Base (A):
                            </span>
                            <select
                                value={fileA}
                                onChange={(e) => setFileA(e.target.value)}
                                className="text-xs font-mono font-bold bg-slate-50 dark:bg-[#081324] text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-[#18365d] rounded-lg px-2.5 py-1.5 shadow-2xs focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[260px] truncate"
                            >
                                {availableChoices.map(c => (
                                    <option key={`a_${c}`} value={c}>{c}</option>
                                ))}
                            </select>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hidden sm:inline">
                                {dataA?.rows?.length ?? "…"} rows
                            </span>
                        </div>

                        {/* Swap Button */}
                        <button
                            type="button"
                            onClick={handleSwapFiles}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-[#18365d] bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#005eb8] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer active:scale-95"
                            title="Swap Base and Comparison files"
                        >
                            <IconSwap className="w-4 h-4" />
                        </button>

                        {/* File B (Comparison Target) */}
                        <div className="flex items-center gap-1.5 min-w-[200px] flex-1 sm:flex-initial">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-[#80c6ff]">
                                Compare (B):
                            </span>
                            <select
                                value={fileB}
                                onChange={(e) => setFileB(e.target.value)}
                                className="text-xs font-mono font-bold bg-blue-50/50 dark:bg-[#081324] text-[#005eb8] dark:text-[#80c6ff] border border-blue-300 dark:border-blue-700 rounded-lg px-2.5 py-1.5 shadow-2xs focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[260px] truncate font-extrabold"
                            >
                                {availableChoices.map(c => (
                                    <option key={`b_${c}`} value={c}>{c}</option>
                                ))}
                            </select>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold hidden sm:inline">
                                {dataB?.rows?.length ?? "…"} rows
                            </span>
                        </div>
                    </div>

                    {/* Right: Sub-tab Switcher, CSV Export & Back Button */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Tab Buttons */}
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-[#081324] border border-slate-200 dark:border-[#18365d]">
                            <button
                                type="button"
                                onClick={() => setActiveTab("insights")}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === "insights"
                                        ? "bg-white dark:bg-blue-600 text-[#005eb8] dark:text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <IconSparkles className="w-3.5 h-3.5" />
                                <span>Visual Charts</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("tabular_diff")}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === "tabular_diff"
                                        ? "bg-white dark:bg-blue-600 text-[#005eb8] dark:text-white shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <IconColumns className="w-3.5 h-3.5" />
                                <span>Diff Table</span>
                                {diffData && diffData.differentRowsCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold">
                                        {diffData.differentRowsCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Export Button */}
                        <button
                            type="button"
                            onClick={handleExportDiffCSV}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-[#081324] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#18365d] transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Export diff report to CSV"
                        >
                            <IconDownload className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Export Diff</span>
                        </button>

                        {/* Return to Table View Button */}
                        <button
                            type="button"
                            onClick={onBackToTableView}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-[#005eb8] hover:text-white text-[#005eb8] dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition shadow-2xs cursor-pointer active:scale-95"
                            title="Return to standard Table View"
                        >
                            <span>Table View</span>
                        </button>
                    </div>
                </div>

                {/* KPI METRIC CARDS BAR (Delta & Magnitude Summary) */}
                {diffData && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-[#18365d]/60">
                        {/* 1. Total Rows A vs B */}
                        <div className="bg-slate-50 dark:bg-[#081324] p-2 rounded-lg border border-slate-200/60 dark:border-[#18365d]/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                                Total Rows
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-base font-black text-slate-800 dark:text-white">
                                    {diffData.rowsB_Count}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                    (vs {diffData.rowsA_Count})
                                </span>
                                {diffData.rowCountDelta !== 0 && (
                                    <span className={`text-[10px] font-extrabold ml-auto font-mono ${
                                        diffData.rowCountDelta > 0 ? "text-emerald-500" : "text-rose-500"
                                    }`}>
                                        {formatDeltaNum(diffData.rowCountDelta)} ({formatDeltaNum(diffData.rowCountPct, true)})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2. Different Rows */}
                        <div className="bg-slate-50 dark:bg-[#081324] p-2 rounded-lg border border-slate-200/60 dark:border-[#18365d]/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                                Rows Differ
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className={`text-base font-black ${
                                    diffData.differentRowsCount > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-500"
                                }`}>
                                    {diffData.differentRowsCount}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                    ({diffData.diffPct.toFixed(1)}%)
                                </span>
                            </div>
                        </div>

                        {/* 3. Identical Rows */}
                        <div className="bg-slate-50 dark:bg-[#081324] p-2 rounded-lg border border-slate-200/60 dark:border-[#18365d]/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                                Identical Rows
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                    {diffData.identicalCount}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                    ({diffData.totalRecordsEvaluated > 0 ? ((diffData.identicalCount / diffData.totalRecordsEvaluated) * 100).toFixed(0) : 0}%)
                                </span>
                            </div>
                        </div>

                        {/* 4. Modified Rows */}
                        <div className="bg-slate-50 dark:bg-[#081324] p-2 rounded-lg border border-slate-200/60 dark:border-[#18365d]/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                                Rows Modified
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                    {diffData.modifiedCount}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-auto font-mono">
                                    {diffData.totalCellMods} cells changed
                                </span>
                            </div>
                        </div>

                        {/* 5. Added in B */}
                        <div className="bg-slate-50 dark:bg-[#081324] p-2 rounded-lg border border-slate-200/60 dark:border-[#18365d]/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                                New in File B
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                                    +{diffData.addedCount}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-auto font-mono">
                                    records
                                </span>
                            </div>
                        </div>

                        {/* 6. Removed from A */}
                        <div className="bg-slate-50 dark:bg-[#081324] p-2 rounded-lg border border-slate-200/60 dark:border-[#18365d]/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                                Missing in B
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-base font-black text-rose-600 dark:text-rose-400">
                                    -{diffData.removedCount}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-auto font-mono">
                                    records
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Loading file data for comparison...
                        </span>
                    </div>
                ) : (
                    <>
                        {/* ----------------------------------------------------------------------- */}
                        {/* SUB-VIEW 1: GRAPHICAL CHARTS */}
                        {/* ----------------------------------------------------------------------- */}
                        {activeTab === "insights" && (
                            <div className="space-y-4">
                                {/* GRAPHICAL VISUALIZATIONS SECTION */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Visual 1: Row Composition Donut */}
                                    <RowCompositionDonut diffData={diffData} />

                                    {/* Visual 2: Numeric Metrics Variance */}
                                    <NumericMetricsVarianceChart numericColStats={diffData?.numericColStats} />

                                    {/* Visual 3: Categorical Breakdown (Status/Skill) */}
                                    <CategoricalDistributionChart categoricalDist={diffData?.categoricalDist} />
                                </div>
                            </div>
                        )}

                        {/* ----------------------------------------------------------------------- */}
                        {/* SUB-VIEW 2: INTERACTIVE TABULAR DIFF GRID */}
                        {/* ----------------------------------------------------------------------- */}
                        {activeTab === "tabular_diff" && (
                            <div className="bg-white dark:bg-[#0c1b31] rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-xs flex flex-col overflow-hidden">
                                {/* Table Toolbar & Filters */}
                                <div className="p-3 border-b border-slate-200/80 dark:border-[#18365d] flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#081324]">
                                    {/* Filter Pills */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => { setFilterStatus("all"); setPage(1); }}
                                            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                                                filterStatus === "all"
                                                    ? "bg-[#005eb8] text-white shadow-xs"
                                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                            }`}
                                        >
                                            All ({diffData?.totalRecordsEvaluated ?? 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setFilterStatus("different"); setPage(1); }}
                                            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                                                filterStatus === "different"
                                                    ? "bg-amber-600 text-white shadow-xs"
                                                    : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60"
                                            }`}
                                        >
                                            Different Only ({diffData?.differentRowsCount ?? 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setFilterStatus("modified"); setPage(1); }}
                                            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                                                filterStatus === "modified"
                                                    ? "bg-amber-500 text-white shadow-xs"
                                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                            }`}
                                        >
                                            Modified ({diffData?.modifiedCount ?? 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setFilterStatus("added"); setPage(1); }}
                                            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                                                filterStatus === "added"
                                                    ? "bg-blue-600 text-white shadow-xs"
                                                    : "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60"
                                            }`}
                                        >
                                            Added in B (+{diffData?.addedCount ?? 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setFilterStatus("removed"); setPage(1); }}
                                            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                                                filterStatus === "removed"
                                                    ? "bg-rose-600 text-white shadow-xs"
                                                    : "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
                                            }`}
                                        >
                                            Removed in B (-{diffData?.removedCount ?? 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setFilterStatus("identical"); setPage(1); }}
                                            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                                                filterStatus === "identical"
                                                    ? "bg-emerald-600 text-white shadow-xs"
                                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                            }`}
                                        >
                                            Identical ({diffData?.identicalCount ?? 0})
                                        </button>
                                    </div>

                                    {/* Search & Rows Per Page */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative min-w-[160px]">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                                placeholder="Search diff table..."
                                                className="w-full text-xs bg-white dark:bg-[#070e1c] border border-slate-300 dark:border-[#18365d] rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => { setPageSize(e.target.value); setPage(1); }}
                                            className="text-xs bg-white dark:bg-[#070e1c] border border-slate-300 dark:border-[#18365d] rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300"
                                        >
                                            <option value={25}>25 rows</option>
                                            <option value={50}>50 rows</option>
                                            <option value={100}>100 rows</option>
                                            <option value="all">All rows</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Scrollable Diff Grid */}
                                <div className="overflow-x-auto max-h-[55vh] border-t border-slate-200/80 dark:border-[#18365d]">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#081324] text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-[#18365d]">
                                            <tr>
                                                <th className="py-2 px-3 font-extrabold uppercase tracking-wider text-[10px] w-28 bg-slate-100 dark:bg-[#081324]">
                                                    Status
                                                </th>
                                                <th className="py-2 px-3 font-extrabold uppercase tracking-wider text-[10px] w-32 bg-slate-100 dark:bg-[#081324]">
                                                    {diffData?.idCol || "Record ID"}
                                                </th>
                                                {diffData?.allColumns.map(col => {
                                                    const mods = diffData.colModCounts[col] || 0;
                                                    return (
                                                        <th key={col} className="py-2 px-3 font-extrabold uppercase tracking-wider text-[10px] whitespace-nowrap bg-slate-100 dark:bg-[#081324]">
                                                            <div className="flex items-center gap-1">
                                                                <span>{col}</span>
                                                                {mods > 0 && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`${mods} changes in ${col}`} />
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/60 dark:divide-[#18365d]/60 font-mono">
                                            {paginatedRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={(diffData?.allColumns.length || 0) + 2} className="py-8 text-center text-slate-400 font-sans">
                                                        No records match the selected filter.
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedRows.map((item, rowIdx) => {
                                                    const isModified = item.__status === "MODIFIED";
                                                    const isAdded = item.__status === "ADDED";
                                                    const isRemoved = item.__status === "REMOVED";

                                                    const rowBg = isAdded
                                                        ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70"
                                                        : isRemoved
                                                        ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70"
                                                        : isModified
                                                        ? "bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/60"
                                                        : "bg-white dark:bg-[#070e1c] hover:bg-slate-50 dark:hover:bg-[#0c1b31]";

                                                    return (
                                                        <tr key={item.__diffId || rowIdx} className={`${rowBg} transition-colors`}>
                                                            {/* Status Badge */}
                                                            <td className="py-2 px-3 whitespace-nowrap">
                                                                {isModified && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                                        MODIFIED
                                                                    </span>
                                                                )}
                                                                {isAdded && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                                                        + ADDED
                                                                    </span>
                                                                )}
                                                                {isRemoved && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                                                        - REMOVED
                                                                    </span>
                                                                )}
                                                                {!isModified && !isAdded && !isRemoved && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                                        IDENTICAL
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* ID Column */}
                                                            <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                                                {item.__idVal || "—"}
                                                            </td>

                                                            {/* Attribute Cells */}
                                                            {diffData.allColumns.map(col => {
                                                                const cell = item.cellDiffs?.[col];
                                                                if (!cell) {
                                                                    return <td key={col} className="py-2 px-3 text-slate-400">—</td>;
                                                                }

                                                                if (cell.isModified) {
                                                                    if (cell.isAdded) {
                                                                        return (
                                                                            <td key={col} className="py-2 px-3 text-blue-700 dark:text-blue-300 font-bold whitespace-nowrap bg-blue-100/40 dark:bg-blue-950/40">
                                                                                {String(cell.valB ?? "—")}
                                                                            </td>
                                                                        );
                                                                    }
                                                                    if (cell.isRemoved) {
                                                                        return (
                                                                            <td key={col} className="py-2 px-3 text-rose-700 dark:text-rose-400 line-through whitespace-nowrap bg-rose-100/40 dark:bg-rose-950/40">
                                                                                {String(cell.valA ?? "—")}
                                                                            </td>
                                                                        );
                                                                    }

                                                                    // In-place modification: Show Old -> New
                                                                    return (
                                                                        <td key={col} className="py-2 px-3 whitespace-nowrap bg-amber-100/50 dark:bg-amber-950/40 border-l border-r border-amber-300/60 dark:border-amber-800/60">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-slate-400 dark:text-slate-500 line-through text-[11px]">
                                                                                    {String(cell.valA ?? "null")}
                                                                                </span>
                                                                                <span className="text-slate-400">→</span>
                                                                                <span className="font-extrabold text-amber-900 dark:text-amber-200">
                                                                                    {String(cell.valB ?? "null")}
                                                                                </span>
                                                                                {cell.pct !== null && cell.pct !== undefined && !isNaN(cell.pct) && (
                                                                                    <span className={`text-[9px] font-bold px-1 rounded ${
                                                                                        cell.pct > 0 
                                                                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                                                                                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                                                                    }`}>
                                                                                        {formatDeltaNum(cell.pct, true)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                }

                                                                // Unchanged cell
                                                                return (
                                                                    <td key={col} className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                                        {String(cell.valA ?? "—")}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Table Footer / Pagination */}
                                {filteredRows.length > 0 && pageSize !== "all" && (
                                    <div className="p-3 border-t border-slate-200 dark:border-[#18365d] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#081324]">
                                        <span>
                                            Showing {Math.min(filteredRows.length, (page - 1) * Number(pageSize) + 1)} to {Math.min(filteredRows.length, page * Number(pageSize))} of {filteredRows.length} records
                                        </span>
                                        <div className="flex items-center gap-1 font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-2">Page {page} of {Math.ceil(filteredRows.length / Number(pageSize)) || 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => setPage(p => Math.min(Math.ceil(filteredRows.length / Number(pageSize)), p + 1))}
                                                disabled={page >= Math.ceil(filteredRows.length / Number(pageSize))}
                                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Attach to window for global access
window.IconGitCompare = IconGitCompare;
window.InputCompareSection = InputCompareSection;
