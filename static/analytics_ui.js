/* Leadership investigations, backed only by the strict selected-version loader. */
function AnalyticsField({
  title,
  children
}) {
  return <label className="block space-y-1.5"><span className="text-[11px] text-slate-600 dark:text-[#adbed4] font-semibold">{title}</span>{children}</label>;
}
function AnalyticsTable({
  columns,
  rows,
  onRow,
  empty = 'No source records in this scope.',
  pageSize = 50,
  searchable = true,
  title = 'Detailed records'
}) {
  const [page, setPage] = React.useState(0),
    [query, setQuery] = React.useState(''),
    [sort, setSort] = React.useState({
      key: null,
      direction: 1
    });
  React.useEffect(() => setPage(0), [rows, query]);
  const filtered = React.useMemo(() => {
    const list = rows.filter(r => !query || JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
    if (sort.key) list.sort((a, b) => {
      const x = a[sort.key],
        y = b[sort.key];
      if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
      if (y === null || y === undefined) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, {
        numeric: true
      })) * sort.direction;
    });
    return list;
  }, [rows, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    current = Math.min(page, pages - 1);
  const changeSort = key => {
    setSort({
      key,
      direction: sort.key === key ? -sort.direction : 1
    });
    setPage(0);
  };
  return <div className="av-data-table"><div className="av-table-toolbar"><div><strong>{title}</strong><span>{filtered.length.toLocaleString()} records{query ? ' matching search' : ''}</span></div>{searchable && <label className="av-search-field"><AnalyticsIcon name="search" size={14} className="text-slate-400 dark:text-[#80c6ff] flex-shrink-0" /><input aria-label={'Search ' + title.toLowerCase()} placeholder="Search these records…" value={query} onChange={e => setQuery(e.target.value)} className="text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#7d93b2]" />{query && <button onClick={() => setQuery('')} aria-label="Clear table search" className="text-slate-400 hover:text-slate-700 dark:text-[#adbed4] dark:hover:text-white cursor-pointer"><AnalyticsIcon name="close" size={12} /></button>}</label>}{onRow && <span className="av-table-hint text-slate-500 dark:text-[#adbed4]">Select a row to investigate<AnalyticsIcon name="chevron" size={12} className="text-current" /></span>}</div><div className="av-table-scroll"><table><thead><tr>{columns.map(c => {
              const sortable = rows.some(r => ['number', 'string', 'boolean'].includes(typeof r[c.key]));
              return <th key={c.key} aria-sort={sort.key === c.key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}>{sortable ? <button onClick={() => changeSort(c.key)} aria-label={'Sort by ' + c.label} className="text-slate-700 dark:text-white font-bold cursor-pointer">{c.label}<span className={sort.key === c.key ? 'av-sort-active text-[#005eb8] dark:text-[#80c6ff]' : 'text-slate-400 dark:text-slate-500'}>{sort.key === c.key ? sort.direction === 1 ? '↑' : '↓' : '↕'}</span></button> : c.label}</th>;
            })}</tr></thead><tbody>{filtered.slice(current * pageSize, (current + 1) * pageSize).map((r, i) => <tr key={r.id || i} onClick={() => onRow?.(r)} onKeyDown={e => {
            if (onRow && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRow(r);
            }
          }} tabIndex={onRow ? 0 : undefined} className={onRow ? 'av-selectable-row cursor-pointer hover:bg-blue-50/70 dark:hover:bg-[#112649]' : ''}>{columns.map(c => <td key={c.key} data-negative={typeof r[c.key] === 'number' && r[c.key] < 0 ? true : undefined}>{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}</tr>)}</tbody></table>{!filtered.length && <AnalyticsEmpty icon="search" title={rows.length ? 'No records match this search' : 'No records in this scope'} description={rows.length ? 'Try another field or value, or clear the search.' : empty} />}</div>{filtered.length > 0 && <div className="av-browser-pagination text-slate-500 dark:text-[#adbed4]"><span>Showing {current * pageSize + 1}–{Math.min((current + 1) * pageSize, filtered.length)} of {filtered.length.toLocaleString()}</span><div className="flex items-center gap-1.5"><button disabled={!current} onClick={() => setPage(current - 1)} className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-[#18365d] bg-white dark:bg-[#0c1b31] text-slate-700 dark:text-[#adbed4] hover:bg-slate-50 dark:hover:bg-[#112649] hover:text-blue-600 dark:hover:text-white disabled:opacity-40 transition cursor-pointer">Previous rows</button><span className="text-xs font-bold text-slate-700 dark:text-white px-1">{current + 1} / {pages}</span><button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-[#18365d] bg-white dark:bg-[#0c1b31] text-slate-700 dark:text-[#adbed4] hover:bg-slate-50 dark:hover:bg-[#112649] hover:text-blue-600 dark:hover:text-white disabled:opacity-40 transition cursor-pointer">Next rows</button></div></div>}</div>;
}
function AnalyticsWorkspace({
  scenarios = {},
  selectedScenarioId,
  inputsState = {},
  selectedGeographyFile,
  geographyDatasets = {},
  baselineScenarioId,
  setBaselineScenarioId,
  comparisonScenarioId,
  setComparisonScenarioId,
  onNavigateToInputs,
  onSelectScenario,
  isDarkMode = false,
  showToast,
  isAssumptionsOpen,
  setIsAssumptionsOpen
}) {
  const A = window.CapacityAnalytics;
  const V = window.AnalyticsViz;
  const [scenarioId, setScenarioId] = React.useState(baselineScenarioId || selectedScenarioId || Object.keys(scenarios)[0] || 'LV OCT V.0 2026-10-29 16:00:00');
  const [baselineId, setBaselineId] = React.useState(comparisonScenarioId || Object.keys(scenarios).find(id => id !== (baselineScenarioId || selectedScenarioId)) || selectedScenarioId || 'LV JUL V.1 2026-07-07 12:46:46');
  const [bundle, setBundle] = React.useState(null),
    [baseline, setBaseline] = React.useState(null);
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(''),
    [refresh, setRefresh] = React.useState(0);
  const [area, setArea] = React.useState('drivers'),
    [view, setView] = React.useState('demand');
  const [filter, setFilterState] = React.useState({
    region: 'All',
    patch: 'All',
    skill: 'All',
    start: '',
    end: ''
  });
  const [assumptions, setAssumptions] = React.useState({
    ...A.defaults
  });
  const [shock, setShock] = React.useState({
    demandPct: 10,
    absencePp: 2,
    productivityPct: 0,
    recruitmentDelay: 2,
    contractorPct: 0,
    overtimePct: 0,
    extraHours: 0,
    targetRegion: 'All',
    targetSkill: 'All'
  });
  const [detail, setDetail] = React.useState(null),
    [runs, setRuns] = React.useState(() => window.CAPACITY_ANALYTICS_SESSION?.runs || []),
    [rationale, setRationale] = React.useState(() => window.CAPACITY_ANALYTICS_SESSION?.rationale || '');
  const [showAssumptions, setShowAssumptions] = React.useState(false),
    [sourceSearch, setSourceSearch] = React.useState('');
  const [sourcePage, setSourcePage] = React.useState(0),
    [sourceChoice, setSourceChoice] = React.useState('demand_input');
  const [cohortSearch, setCohortSearch] = React.useState('');
  const [isFiltersCollapsed, setIsFiltersCollapsed] = React.useState(false);
  const [selectedGeo, setSelectedGeo] = React.useState({
    type: 'national',
    id: 'national',
    label: 'National',
    count: 18
  });

  // Geography hierarchy extraction matching Scenario Diff
  const geoRows = React.useMemo(() => {
    if (selectedGeographyFile && geographyDatasets && geographyDatasets[selectedGeographyFile]) {
      const d = geographyDatasets[selectedGeographyFile];
      if (Array.isArray(d) && d.length > 0) return d;
      if (typeof d === 'string' && window.parseGeographyCsvText) return window.parseGeographyCsvText(d);
    }
    if (selectedGeographyFile && geographyDatasets) {
      const cleanKey = selectedGeographyFile.replace(/\.(csv|xlsx|xls)$/i, '');
      for (const k of Object.keys(geographyDatasets)) {
        if (k.toLowerCase() === cleanKey.toLowerCase() || k.toLowerCase().includes(cleanKey.toLowerCase())) {
          const d = geographyDatasets[k];
          if (Array.isArray(d) && d.length > 0) return d;
          if (typeof d === 'string' && window.parseGeographyCsvText) return window.parseGeographyCsvText(d);
        }
      }
    }
    if (geographyDatasets) {
      const firstKey = Object.keys(geographyDatasets)[0];
      if (firstKey && geographyDatasets[firstKey]) {
        const d = geographyDatasets[firstKey];
        if (Array.isArray(d) && d.length > 0) return d;
        if (typeof d === 'string' && window.parseGeographyCsvText) return window.parseGeographyCsvText(d);
      }
    }
    if (window.getDefaultGeographyData) return window.getDefaultGeographyData();
    return [
      { Region: "A", ACDM: "A1", territory: "EA11 Inverness & Aviemore" },
      { Region: "A", ACDM: "A1", territory: "EA13 Dendee & Perth" },
      { Region: "A", ACDM: "A1", territory: "EA12 Aberdeen North" },
      { Region: "A", ACDM: "A2", territory: "EA21 Stirling & Falkirk" },
      { Region: "A", ACDM: "A2", territory: "EA22 Edinburgh Central" },
      { Region: "B", ACDM: "B1", territory: "EB11 Preston & Blackpool" },
      { Region: "B", ACDM: "B1", territory: "EB14 Stockport & Peak" },
      { Region: "B", ACDM: "B2", territory: "EB12 Altrincham" },
      { Region: "B", ACDM: "B2", territory: "EB21 Manchester Central" },
      { Region: "C", ACDM: "C1", territory: "EC91 Leicester" },
      { Region: "C", ACDM: "C1", territory: "EC92 Nottingham & Derby" },
      { Region: "C", ACDM: "C2", territory: "EC61 Norwich & Norfolk" },
      { Region: "C", ACDM: "C2", territory: "EC62 Essex East" },
      { Region: "D", ACDM: "D1", territory: "ED11 North London & Barnet" },
      { Region: "D", ACDM: "D2", territory: "ED44 Canterbury & Dover" },
      { Region: "D", ACDM: "D2", territory: "ED42 Eastbourne & Hastings" },
      { Region: "E", ACDM: "E1", territory: "EE21 Bristol North & Bath" },
      { Region: "E", ACDM: "E2", territory: "EE31 Exeter & Devon" }
    ];
  }, [selectedGeographyFile, geographyDatasets]);

  const hierarchy = React.useMemo(() => {
    if (window.buildGeographyHierarchy) return window.buildGeographyHierarchy(geoRows);
    const regions = {};
    (geoRows || []).forEach(r => {
      const reg = r.Region || 'A';
      const acdm = r.ACDM || (reg + '1');
      const terr = r.territory || r.patch || 'Territory';
      if (!regions[reg]) regions[reg] = { id: reg, label: 'Region ' + reg, acdms: {} };
      if (!regions[reg].acdms[acdm]) regions[reg].acdms[acdm] = { id: acdm, label: 'ACDM ' + acdm, territories: [] };
      if (!regions[reg].acdms[acdm].territories.includes(terr)) regions[reg].acdms[acdm].territories.push(terr);
    });
    return { regions };
  }, [geoRows]);

  const totalTerritoriesCount = React.useMemo(() => {
    const regs = Object.values(hierarchy.regions || {});
    return regs.reduce((acc, r) => {
      return acc + Object.values(r.acdms || {}).reduce((tAcc, a) => tAcc + (a.territories || []).length, 0);
    }, 0);
  }, [hierarchy]);

  React.useEffect(() => {
    if (selectedGeo.type === 'national' && totalTerritoriesCount) {
      setSelectedGeo(prev => ({ ...prev, count: totalTerritoriesCount }));
    }
  }, [totalTerritoriesCount]);

  const handleSelectGeo = (geoObj) => {
    setSelectedGeo(geoObj);
    if (!geoObj || geoObj.type === 'national') {
      setFilter(prev => ({ ...prev, region: 'All', patch: 'All' }));
    } else if (geoObj.type === 'region') {
      setFilter(prev => ({ ...prev, region: geoObj.id, patch: 'All' }));
    } else if (geoObj.type === 'acdm') {
      setFilter(prev => ({ ...prev, region: geoObj.region || 'All', patch: 'All' }));
    } else if (geoObj.type === 'territory') {
      setFilter(prev => ({ ...prev, patch: geoObj.label || geoObj.id, region: geoObj.region || prev.region }));
    }
  };

  const handleResetFilters = () => {
    setSelectedGeo({
      type: 'national',
      id: 'national',
      label: 'National',
      count: totalTerritoriesCount || 18
    });
    setFilter({
      region: 'All',
      patch: 'All',
      skill: 'All',
      start: '',
      end: ''
    });
    if (showToast) showToast('All filters reset to default', 'info');
  };

  React.useEffect(() => {
    if (isAssumptionsOpen) {
      setShowAssumptions(true);
    }
  }, [isAssumptionsOpen]);

  const handleSwapScenarios = () => {
    const temp = scenarioId;
    setScenarioId(baselineId);
    setBaselineId(temp);
    if (setBaselineScenarioId) setBaselineScenarioId(baselineId);
    if (setComparisonScenarioId) setComparisonScenarioId(temp);
    if (baselineId !== '__draft' && onSelectScenario) {
      onSelectScenario(baselineId);
    }
    if (showToast) {
      showToast('Baseline and Comparison Scenarios swapped', 'info');
    }
  };
  const requestState = React.useRef({});
  const filterHistory = React.useRef([]);
  const clearScope = {region:'All',patch:'All',skill:'All',start:'',end:''};
  const setFilter = update => {
    const next = typeof update === 'function' ? update(filter) : update;
    if (JSON.stringify(next) === JSON.stringify(filter)) return;
    filterHistory.current = [...filterHistory.current.slice(-29), {...filter}];
    setFilterState(next);
  };
  const undoFilter = () => {
    const previous = filterHistory.current.pop();
    if (previous) setFilterState(previous);
  };
  React.useEffect(() => {filterHistory.current=[];setFilterState({...clearScope});}, [scenarioId]);
  React.useEffect(() => {
    window.CAPACITY_ANALYTICS_SESSION = {
      runs,
      rationale
    };
  }, [runs, rationale]);
  React.useEffect(() => {
    setScenarioId(selectedScenarioId);
  }, [selectedScenarioId]);
  React.useEffect(() => {
    let disposed = false,
      timer,
      timeout;
    const load = () => {
      if (!window.Shiny?.setInputValue) return;
      clearInterval(timer);
      setBusy(true);
      setError('');
      setBundle(null);
      setBaseline(null);
      setDetail(null);
      const stamp = `analytics-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const requests = {
        [stamp + '-current']: 'current',
        [stamp + '-baseline']: 'baseline'
      };
      requestState.current = requests;
      window.Shiny.setInputValue('request_analytics_bundle', {
        requestId: stamp + '-current',
        scenarioId,
        draft: scenarioId === '__draft',
        inputs: scenarioId === '__draft' ? inputsState : undefined
      }, {
        priority: 'event'
      });
      // Yield separate Shiny events so the second request cannot coalesce with the first.
      timeout = setTimeout(() => {
        if (!disposed) window.Shiny.setInputValue('request_analytics_bundle', {
          requestId: stamp + '-baseline',
          scenarioId: baselineId
        }, {
          priority: 'event'
        });
      }, 100);
    };
    const receive = e => {
      const data = e.detail,
        role = requestState.current[data?.requestId];
      if (!role || disposed) return;
      delete requestState.current[data.requestId];
      if (!data.success) setError(prev => [prev, `${role}: ${data.error || 'Unable to load selected sources'}`].filter(Boolean).join(' · '));else if (role === 'current') setBundle(data);else setBaseline(data);
      if (!Object.keys(requestState.current).length) setBusy(false);
    };
    window.addEventListener('capacity-analytics-data', receive);
    timer = setInterval(load, 250);
    const deadline = setTimeout(() => {
      clearInterval(timer);
      if (!disposed) {
        setBusy(false);
        if (Object.keys(requestState.current).length || !window.Shiny?.setInputValue) setError('Analytics request timed out. Reconnect or refresh the selected sources.');
      }
    }, 45000);
    return () => {
      disposed = true;
      clearInterval(timer);
      clearTimeout(timeout);
      clearTimeout(deadline);
      requestState.current = {};
      window.removeEventListener('capacity-analytics-data', receive);
    };
  }, [scenarioId, baselineId, refresh]);
  const data = React.useMemo(() => A.extract(bundle), [bundle]);
  const baseData = React.useMemo(() => A.extract(baseline), [baseline]);
  const weeks = data.weeks;
  const current = React.useMemo(() => A.model(data, filter, assumptions), [data, filter, assumptions]);
  const tested = React.useMemo(() => A.model(data, filter, assumptions, shock), [data, filter, assumptions, shock]);
  const compared = React.useMemo(() => A.model(baseData, filter, assumptions), [baseData, filter, assumptions]);
  const differences = React.useMemo(() => A.compareSources(baseline, bundle), [baseline, bundle]);
  const demand = (data.facts.demand_input || []).filter(r => A.inScope(r, filter));
  const jobs = A.sum(demand, 'jobs'),
    matchedJobs = demand.filter(r => r.matched).reduce((v, r) => v + r.jobs, 0);
  const regions = [...new Set(Object.values(data.facts).flat().map(r => r.region))].sort();
  const patches = [...new Set((data.facts.demand_input || []).filter(r => filter.region === 'All' || r.region === filter.region).map(r => r.patch))].sort();
  const label = s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const fmt = (v, d = 1) => v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('en-GB', {
    maximumFractionDigits: d
  });
  const percent = (n, d) => d > 0 ? `${fmt(n / d * 100)}%` : '—';
  const sourceRows = key => (data.facts[key] || []).filter(r => A.inScope(r, filter));
  const sourceDetail = (key, rows) => {
    setDetail({
      title: label(key),
      source: key,
      rows: rows || sourceRows(key)
    });
    setSourceSearch('');
    setSourcePage(0);
  };
  const download = (name, contents, type = 'application/json') => {
    const url = URL.createObjectURL(new Blob([contents], {
      type
    }));
    const el = document.createElement('a');
    el.href = url;
    el.download = name;
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const csv = (name, rows) => {
    const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    download(name, [keys.map(escape).join(','), ...rows.map(r => keys.map(k => escape(typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k])).join(','))].join('\r\n'), 'text/csv;charset=utf-8');
  };
  const evidence = () => ({
    exportedAt: new Date().toISOString(),
    scenario: bundle?.scenarioId,
    baseline: baseline?.scenarioId,
    scope: filter,
    assumptions,
    shock,
    modelStatus: 'Exploratory source-based model; not SLA or a complete workforce forecast',
    rationale,
    current: summary(current),
    tested: summary(tested),
    runs,
    issues: data.issues,
    sources: Object.fromEntries(Object.entries(bundle?.sources || {}).map(([k, v]) => [k, {
      version: v.version,
      hash: v.hash,
      rowCount: v.rowCount,
      success: v.success,
      error: v.error
    }])),
    baselineSources: Object.fromEntries(Object.entries(baseline?.sources || {}).map(([k, v]) => [k, {
      version: v.version,
      hash: v.hash,
      success: v.success
    }])),
    changes: differences.map(({
      records,
      ...r
    }) => ({
      ...r,
      changedKeys: records.length
    }))
  });
  const summary = m => ({
    demand: m.demand,
    capacity: m.capacity,
    deficit: m.deficit,
    surplus: m.surplus,
    coverage: m.coverage,
    comparableCells: m.comparable,
    totalCells: m.total
  });
  const saveRun = () => {
    const run = {
      id: Date.now(),
      name: `Run ${runs.length + 1}`,
      scenario: bundle.scenarioId,
      loadedAt: bundle.loadedAt,
      scope: {
        ...filter
      },
      assumptions: {
        ...assumptions
      },
      shock: {
        ...shock
      },
      result: summary(tested),
      sourceHashes: Object.fromEntries(Object.entries(bundle.sources).map(([k, v]) => [k, v.hash || null]))
    };
    setRuns(prev => [...prev, run]);
  };
  const button = 'px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#18365d] bg-white dark:bg-[#0c1b31] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-[#112649] text-slate-700 dark:text-[#e2e8f0] transition disabled:opacity-40 cursor-pointer shadow-2xs';
  const select = 'w-full border border-slate-200 dark:border-[#18365d] rounded-lg px-2.5 py-2 bg-white dark:bg-[#070e1c] text-xs text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 shadow-2xs';
  const panel = 'analytics-panel';
  const Table = AnalyticsTable;
  const Note = ({
    children
  }) => <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 shadow-2xs">{children}</div>;
  const WaveBackground = ({ strokeColor, fillColor, id = "wave-grad" }) => (
    <svg
      className="absolute right-0 bottom-0 w-[38%] max-w-[140px] h-[65%] pointer-events-none select-none overflow-hidden"
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.14" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,60 C40,75 80,45 120,55 C160,65 180,40 200,45 L200,80 L0,80 Z"
        fill={`url(#${id})`}
      />
      <path
        d="M0,60 C40,75 80,45 120,55 C160,65 180,40 200,45"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeOpacity="0.32"
      />
    </svg>
  );

  const getCardTheme = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('shortfall') || t.includes('deficit') || t.includes('issue') || t.includes('gap')) {
      return {
        cardClass: 'diff-kpi-card-shortfall bg-gradient-to-br from-[#fff1f2] to-[#fff7f8] dark:bg-[#200a10] border-[#fecdd3] dark:border-[#f43f5e]',
        iconClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 glow-icon-rose',
        iconName: 'alert',
        stroke: '#fb7185',
        fill: '#fb7185',
        accent: '#fb7185'
      };
    }
    if (t.includes('surplus') || t.includes('coverage') || t.includes('matched') || t.includes('available')) {
      return {
        cardClass: 'diff-kpi-card-net bg-gradient-to-br from-[#eafaf1] to-[#f4fcf7] dark:bg-[#041a14] border-[#a7f3d0] dark:border-[#10b981]',
        iconClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 glow-icon-emerald',
        iconName: 'check',
        stroke: '#10b981',
        fill: '#10b981',
        accent: '#10b981'
      };
    }
    if (t.includes('demand') || t.includes('job') || t.includes('forecast') || t.includes('volume') || t.includes('mix')) {
      return {
        cardClass: 'diff-kpi-card-demand bg-gradient-to-br from-[#edf5fc] to-[#f8fbff] dark:bg-[#06152b] border-[#bfdbfe] dark:border-[#2563eb]',
        iconClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-[#80c6ff] glow-icon-blue',
        iconName: 'demand',
        stroke: '#38bdf8',
        fill: '#38bdf8',
        accent: '#38bdf8'
      };
    }
    if (t.includes('capacity') || t.includes('comparable') || t.includes('roster') || t.includes('duration') || t.includes('overtime') || t.includes('contractor')) {
      return {
        cardClass: 'diff-kpi-card-capacity bg-gradient-to-br from-[#f5efff] to-[#faf7ff] dark:bg-[#120c2a] border-[#ddd6fe] dark:border-[#7c3aed]',
        iconClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 glow-icon-purple',
        iconName: 'capacity',
        stroke: '#c084fc',
        fill: '#c084fc',
        accent: '#c084fc'
      };
    }
    return {
      cardClass: 'diff-kpi-card-scope bg-gradient-to-br from-[#fef7ec] to-[#fffcf7] dark:bg-[#1c1103] border-[#fed7aa] dark:border-[#d97706]',
      iconClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-800/60 text-amber-500 dark:text-amber-400 glow-icon-amber',
      iconName: t.includes('horizon') || t.includes('week') ? 'clock' : 'sparkles',
      stroke: '#fbbf24',
      fill: '#fbbf24',
      accent: '#fbbf24'
    };
  };

  const Card = ({
    title,
    value,
    sub
  }) => {
    const theme = getCardTheme(title);
    const waveId = "wave-" + title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    return (
      <div
        className={`analytics-metric ${theme.cardClass} glow-card group cursor-pointer px-3.5 py-2.5 rounded-xl border shadow-xs relative overflow-hidden transition-all duration-200`}
        style={{ '--accent': theme.accent }}
      >
        <WaveBackground strokeColor={theme.stroke} fillColor={theme.fill} id={waveId} />
        <div className="relative z-10 flex items-start gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${theme.iconClass} border flex items-center justify-center glow-icon flex-shrink-0 mt-0.5`}>
            <AnalyticsIcon name={theme.iconName} size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="av-metric-title text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300 tracking-wider whitespace-nowrap truncate block">
              {title}
            </span>
            <div className="av-metric-value text-xl font-extrabold text-slate-900 dark:text-white leading-tight font-mono tracking-tight mt-0.5 whitespace-nowrap truncate">
              {value}
            </div>
            {sub && (
              <div className="av-metric-sub text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap truncate">
                {sub}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const Field = AnalyticsField;
  const BarList = ({
    rows,
    valueKey = 'value',
    onRow
  }) => {
    const max = Math.max(1, ...rows.map(r => Math.abs(r[valueKey] || 0)));
    return <div className="space-y-2">{rows.slice(0, 15).map((r, i) => <button key={i} onClick={() => onRow?.(r)} className="w-full text-left rounded-lg p-2 hover:bg-blue-50 dark:hover:bg-[#112649] text-slate-800 dark:text-white transition focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 cursor-pointer"><div className="flex justify-between text-xs gap-4 mb-1"><span className="text-slate-600 dark:text-[#adbed4] truncate font-medium">{r.name}</span><span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(r[valueKey])}</span></div><div className="h-2 bg-slate-100 dark:bg-[#18365d] rounded-full overflow-hidden"><div className="h-2 bg-blue-600 dark:bg-blue-500 rounded-full transition-all" style={{
            width: Math.abs(r[valueKey] || 0) / max * 100 + '%'
          }} /></div></button>)}{!rows.length && <p className="text-sm text-slate-400 dark:text-slate-500 py-6">No values in the selected scope.</p>}</div>;
  };
  const group = (rows, key, measure) => {
    const m = new Map();
    rows.forEach(r => {
      const name = key(r);
      if (!m.has(name)) m.set(name, {
        name,
        value: 0,
        records: []
      });
      m.get(name).value += measure(r) || 0;
      m.get(name).records.push(r);
    });
    return [...m.values()].sort((a, b) => b.value - a.value);
  };
  const pressureColumns = [{
    key: 'region',
    label: 'Region'
  }, {
    key: 'skill',
    label: 'Skill'
  }, {
    key: 'week',
    label: 'Week'
  }, {
    key: 'demand',
    label: 'Matched demand h',
    render: r => fmt(r.demand)
  }, {
    key: 'capacity',
    label: 'Modeled capacity h',
    render: r => fmt(r.capacity)
  }, {
    key: 'gap',
    label: 'Buffer h',
    render: r => <span className={r.gap < 0 ? 'text-rose-600 font-bold' : 'font-mono'}>{fmt(r.gap)}</span>
  }, {
    key: 'coverage',
    label: 'Coverage',
    render: r => r.coverage === null ? 'Unavailable' : fmt(r.coverage) + '%'
  }, {
    key: 'partial',
    label: 'Evidence',
    render: r => r.partial ? 'Partial demand' : r.comparable ? 'Matched / capacity partial' : 'Insufficient data'
  }];
  const sourceColumns = [{
    key: 'source',
    label: 'Input',
    render: r => label(r.source)
  }, {
    key: 'row',
    label: 'Source row'
  }, {
    key: 'region',
    label: 'Region'
  }, {
    key: 'patch',
    label: 'Patch'
  }, {
    key: 'skill',
    label: 'Skill'
  }, {
    key: 'week',
    label: 'Week'
  }, {
    key: 'raw',
    label: 'Values',
    render: r => <dl className="av-evidence-fields">{Object.entries(r.raw).filter(([k]) => !['patch', 'skill', 'region', 'regioncode', 'weekcomm'].includes(k.toLowerCase().replace(/[ _]/g, ''))).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v ?? '\u2014')}</dd></div>)}</dl>
  }];
  const areas = {
    drivers: {
      title: 'Drivers & Evidence',
      icon: 'trend',
      views: {
        demand: 'Demand drivers',
        capacity: 'Capacity composition',
        downtime: 'Downtime',
        changes: 'Scenario changes',
        quality: 'Data coverage'
      }
    },
    readiness: {
      title: 'Commitments & Readiness',
      icon: 'handshake',
      views: {
        deficits: 'Deficit concentration',
        recruitment: 'Recruitment readiness',
        support: 'Support dependence',
        timing: 'Decision timing'
      }
    },
    stress: {
      title: 'Stress & Sensitivity',
      icon: 'shield',
      views: {
        stress: 'Combined stress tests',
        sensitivity: 'Sensitivity & breakpoints'
      }
    },
    choices: {
      title: 'Intervention Choices',
      icon: 'lightbulb',
      views: {
        actions: 'Compare interventions'
      }
    }
  };
  const control = (name, title, min, max, step = 1) => <div key={name} className="av-range-field"><Field title={title}><input aria-label={title} type="number" min={min} max={max} step={step} value={shock[name]} onChange={e => setShock({
        ...shock,
        [name]: Math.max(min, Math.min(max, Number(e.target.value) || 0))
      })} className={select} /></Field><input aria-label={'Adjust ' + title} type="range" min={min} max={max} step={step} value={shock[name]} onChange={e => setShock({
      ...shock,
      [name]: Number(e.target.value)
    })} /><div className="av-range-bounds"><span>{min}</span><span>{max}</span></div></div>;
  const modelNote = <AnalyticsDisclosure compact title="Model scope & limits" subtitle="Exploratory calculations with explicitly partial evidence"><div className="av-scope-note-grid"><section><span>Included</span><h4>Source facts and selected assumptions</h4><p>Matched demand, supplied active roster and enabled support inputs. The selected geography mapping takes precedence over conflicting region fields.</p></section><section><span>Not inferred</span><h4>A complete workforce or SLA forecast</h4><p>Unknown attrition units, unmatched ramp cohorts and overlapping deductions are not invented. Workload coverage is not observed service performance.</p></section></div></AnalyticsDisclosure>;
  const modelStats = m => <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Card title="Comparable cells" value={`${m.comparable} / ${m.total}`} sub="Region × skill × week" /><Card title="Gross shortfall" value={m.comparable ? fmt(m.deficit) + ' h' : '—'} sub="No offset from surplus elsewhere" /><Card title="Gross surplus" value={m.comparable ? fmt(m.surplus) + ' h' : '—'} sub="Transfer feasibility not assumed" /><Card title="Matched-scope coverage" value={m.coverage === null ? '—' : fmt(m.coverage) + '%'} sub="Ratio of comparable totals" /></div>;
  const sourceNames = Object.keys(bundle?.sources || {});
  const bridge = React.useMemo(() => A.demandBridge(baseData, data, filter, assumptions), [baseData, data, filter, assumptions]);
  const renderDemandBridge = () => <section className={panel}><h3 className="font-bold text-sm mb-2">Explain the demand-hours change versus baseline</h3><p className="text-xs text-slate-500 mb-4">Same patch, skill, week and work-code scope; complete job-time matches only. Contributions average all six calculation orders so they reconcile without privileging one ordering.</p><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"><Card title="Comparable change" value={bridge.rows.length ? fmt(bridge.after - bridge.before) + ' h' : '—'} sub={`${bridge.rows.length} included groups · ${bridge.excluded.length} excluded`} /><Card title="Job volume effect" value={bridge.rows.length ? fmt(bridge.volume) + ' h' : '—'} sub="Change in total jobs" /><Card title="Work mix effect" value={bridge.rows.length ? fmt(bridge.mix) + ' h' : '—'} sub="Change in work-code shares" /><Card title="Task duration effect" value={bridge.rows.length ? fmt(bridge.duration) + ' h' : '—'} sub="Change in matched job times" /></div><Table rows={bridge.rows} columns={[{
      key: 'patch',
      label: 'Patch'
    }, {
      key: 'skill',
      label: 'Skill'
    }, {
      key: 'week',
      label: 'Week'
    }, {
      key: 'volume',
      label: 'Volume h',
      render: r => fmt(r.volume)
    }, {
      key: 'mix',
      label: 'Mix h',
      render: r => fmt(r.mix)
    }, {
      key: 'duration',
      label: 'Duration h',
      render: r => fmt(r.duration)
    }]} onRow={r => sourceDetail('demand_input', r.records)} />{bridge.excluded.length > 0 && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">Why {bridge.excluded.length} groups were excluded</summary><Table rows={bridge.excluded} columns={[{
        key: 'key',
        label: 'Patch / skill / week'
      }, {
        key: 'reason',
        label: 'Reason'
      }]} /></details>}</section>;
  const renderDemandDetails = () => {
    const weekly = group(demand, r => r.week, r => r.jobs).sort((a, b) => a.name.localeCompare(b.name));
    const work = group(demand, r => r.workCode || 'Missing code', r => r.jobs);
    const scoped = demand.filter(r => r.matched),
      hours = scoped.reduce((s, r) => s + r.jobs * r.jobTime.value / (assumptions.jobTimeUnit === 'minutes' ? 60 : 1), 0);
    return <><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Card title="Forecast jobs" value={fmt(jobs, 0)} sub="Selected source rows" /><Card title="Job-time coverage" value={percent(matchedJobs, jobs)} sub={`${fmt(matchedJobs, 0)} matched jobs`} /><Card title="Matched demand hours" value={fmt(hours)} sub={`Job time interpreted as ${assumptions.jobTimeUnit}/job`} /><Card title="Scope" value={new Set(demand.map(r => r.patch)).size + ' patches'} sub={`${new Set(demand.map(r => r.week)).size} weeks`} /></div><div className="grid lg:grid-cols-2 gap-5"><section className={panel}><h3 className="font-bold text-sm mb-3">Weekly volume · click to investigate</h3><BarList rows={weekly} onRow={r => {
            setFilter({
              ...filter,
              start: r.name,
              end: r.name
            });
            sourceDetail('demand_input', r.records);
          }} /></section><section className={panel}><h3 className="font-bold text-sm mb-3">Work codes contributing to demand</h3><BarList rows={work} onRow={r => sourceDetail('demand_input', r.records)} /></section></div><section className={panel}><h3 className="font-bold text-sm mb-3">Patch and skill contribution</h3><Table columns={[{
          key: 'name',
          label: 'Patch / skill'
        }, {
          key: 'value',
          label: 'Jobs',
          render: r => fmt(r.value, 0)
        }, {
          key: 'records',
          label: 'Source rows',
          render: r => r.records.length
        }]} rows={group(demand, r => r.patch + ' / ' + r.skill, r => r.jobs)} onRow={r => sourceDetail('demand_input', r.records)} /></section>{renderDemandBridge()}<Note>Matched hours exclude unmatched jobs; they are not total required hours. Changes in job volume, work mix and task duration can be investigated through the work-code/source drilldown and the content comparison. No contribution is inferred from a scenario name.</Note></>;
  };
  const renderCapacityDetails = () => {
    const components = ['roster', 'downtime', 'recruits', 'overtime', 'contractors', 'transfers', 'support'];
    return <>{modelNote}{modelStats(current)}<div className="grid lg:grid-cols-2 gap-5"><section className={panel}><h3 className="font-bold text-sm mb-3">Modeled hours by component</h3><BarList rows={components.map(k => ({
            name: label(k),
            value: A.sum(current.rows, k),
            source: {
              roster: 'resource_plan',
              downtime: 'downtime_overlays_' + (assumptions.downtime === 'hours' ? 'hours' : assumptions.downtime === 'percent' ? 'percentage' : 'hours_fte'),
              recruits: 'recruitment_grounded',
              overtime: 'overtime',
              contractors: 'ctr_capacity',
              transfers: 'fte_transfer',
              support: 'hec_on_kac_demand'
            }[k]
          }))} onRow={r => sourceDetail(r.source)} /><p className="text-xs text-slate-400 mt-3">Roster snapshot is repeated for each selected week. Downtime is a deduction; capacity is floored at zero per cell.</p></section><section className={panel}><h3 className="font-bold text-sm mb-3">Source roster status</h3><BarList rows={group(sourceRows('resource_plan'), r => A.text(r.n.status) || 'Missing', () => 1)} onRow={r => sourceDetail('resource_plan', r.records)} /><button className={button + ' mt-3'} onClick={() => sourceDetail('resource_plan')}>Inspect staffing records</button></section></div><section className={panel}><Table columns={pressureColumns} rows={current.rows} onRow={r => {
          setFilter({
            ...filter,
            region: r.region,
            skill: r.skill,
            start: r.week,
            end: r.week
          });
          sourceDetail('resource_plan', (data.facts.resource_plan || []).filter(p => p.region === r.region && p.skill === r.skill));
        }} /></section>{current.exclusions.map(s => <Note key={s}>{s}</Note>)}</>;
  };
  const renderDowntimeDetails = () => {
    const keys = ['downtime_overlays_percentage', 'downtime_overlays_hours', 'downtime_overlays_hours_fte'];
    return <><Note>These are three alternative representations, not additive losses. Percentage-point totals across patches are not meaningful; percentages and hours/FTE below show record averages. Training SNM is available as supporting evidence and is not deducted a second time.</Note><div className="grid lg:grid-cols-3 gap-4">{keys.map((s, i) => {
          const records = sourceRows(s).filter(r => !r.duplicate && r.value !== null && r.value >= 0);
          const groups = group(records, r => r.category, r => Math.max(0, r.value || 0)).map(r => ({
            ...r,
            value: i === 1 ? r.value : r.value / r.records.length
          }));
          return <section className={panel} key={s}><h3 className="text-sm font-bold mb-1">{['Overlay percentage', 'Overlay hours', 'Overlay hours / FTE'][i]}</h3><p className="text-[11px] text-slate-400 mb-4">{i === 1 ? 'Sum of source hours' : 'Unweighted mean of valid source records'}</p><BarList rows={groups} onRow={r => sourceDetail(s, r.records)} /></section>;
        })}</div><section className={panel}><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-sm">Training attendance and scheduled hours</h3><button className={button} onClick={() => sourceDetail('training_snm')}>Inspect training source</button></div><Table columns={[{
          key: 'week',
          label: 'Week'
        }, {
          key: 'region',
          label: 'Region'
        }, {
          key: 'skill',
          label: 'Skill'
        }, {
          key: 'course',
          label: 'Course',
          render: r => r.n.course
        }, {
          key: 'attendees',
          label: 'Attendees',
          render: r => r.n.attendees
        }, {
          key: 'hours',
          label: 'Source hours',
          render: r => r.n.hours
        }]} rows={sourceRows('training_snm')} onRow={r => sourceDetail('training_snm', [r])} /></section></>;
  };
  const renderChangesDetails = () => <>{!baseline && <Note>Select an available saved baseline to compare input contents.</Note>}<section className={panel}><h3 className="font-bold text-sm mb-3">Selected-version content comparison · click a row</h3><Table rows={differences} columns={[{
        key: 'source',
        label: 'Input',
        render: r => label(r.source)
      }, {
        key: 'status',
        label: 'Result'
      }, {
        key: 'records',
        label: 'Changed business keys',
        render: r => r.records.length
      }, {
        key: 'before',
        label: 'Baseline version'
      }, {
        key: 'after',
        label: 'Current version'
      }]} onRow={r => {
        setDetail({
          title: label(r.source) + ' · record differences',
          diff: r.records,
          comparison: r
        });
        setSourcePage(0);
        setSourceSearch('');
      }} /></section><div className="grid lg:grid-cols-2 gap-4">{[{
        name: 'Baseline',
        m: compared
      }, {
        name: 'Current',
        m: current
      }].map(({
        name,
        m
      }) => <section key={name} className={panel}><h3 className="text-sm font-bold mb-3">{name} · selected common filters</h3><p className="text-xs text-slate-600">Gross shortfall {m.comparable ? fmt(m.deficit) + ' h' : 'unavailable'} · {m.comparable} comparable cells · coverage {m.coverage === null ? 'unavailable' : fmt(m.coverage) + '%'}</p></section>)}</div><Note>Source differences cover entire selected versions; global filters apply to modeled totals, not this version audit. Comparing modeled totals with different matched-cell coverage is not an attributed impact. Duplicate keys are retained as groups. A changed filename with identical contents has no modeled effect.</Note></>;
  const renderQualityDetails = () => {
    const grouped = group(data.issues, r => r.kind, () => 1);
    return <><div className="grid lg:grid-cols-3 gap-3"><Card title="Inputs available" value={`${sourceNames.filter(s => bundle.sources[s].success).length} / ${sourceNames.length}`} sub="Exact selected versions only" /><Card title="Matched demand volume" value={percent(matchedJobs, jobs)} sub="In current filters" /><Card title="Issues identified" value={data.issues.length} sub="All selected source versions" /></div><div className="grid lg:grid-cols-2 gap-5"><section className={panel}><h3 className="font-bold text-sm mb-3">Evidence gaps by category</h3><BarList rows={grouped} onRow={r => {
            setDetail({
              title: r.name,
              issues: r.records
            });
            setSourceSearch('');
            setSourcePage(0);
          }} /></section><section className={panel}><h3 className="font-bold text-sm mb-3">Source provenance</h3><Table rows={sourceNames.map(source => ({
            source,
            ...bundle.sources[source]
          }))} columns={[{
            key: 'source',
            label: 'Input',
            render: r => label(r.source)
          }, {
            key: 'rowCount',
            label: 'Rows'
          }, {
            key: 'success',
            label: 'State',
            render: r => r.success ? 'Loaded' : 'Unavailable'
          }, {
            key: 'hash',
            label: 'Content fingerprint',
            render: r => <span title={r.hash}>{r.hash?.slice(0, 12) || r.error}</span>
          }]} onRow={r => sourceDetail(r.source)} /></section></div><section className={panel}><h3 className="font-bold text-sm mb-3">Coverage issues · click for original record</h3><Table rows={data.issues} columns={[{
          key: 'source',
          label: 'Input'
        }, {
          key: 'row',
          label: 'Row'
        }, {
          key: 'kind',
          label: 'Issue'
        }, {
          key: 'detail',
          label: 'Evidence'
        }]} onRow={r => sourceDetail(r.source, (data.facts[r.source] || []).filter(x => x.row === r.row))} /></section></>;
  };
  const renderDeficitsDetails = () => {
    const grouped = A.persistence(current.rows),
      shown = current.rows.filter(r => r.comparable);
    return <>{modelNote}{modelStats(current)}<section className={panel}><h3 className="font-bold text-sm mb-3">Duration and concentration of modeled shortages</h3><Table rows={grouped} columns={[{
          key: 'region',
          label: 'Region'
        }, {
          key: 'skill',
          label: 'Skill'
        }, {
          key: 'deficit',
          label: 'Gross shortfall h',
          render: r => fmt(r.deficit)
        }, {
          key: 'surplus',
          label: 'Gross surplus h',
          render: r => fmt(r.surplus)
        }, {
          key: 'weeks',
          label: 'Shortage weeks'
        }, {
          key: 'longest',
          label: 'Longest consecutive run'
        }, {
          key: 'worst',
          label: 'Worst buffer h',
          render: r => fmt(r.worst)
        }, {
          key: 'first',
          label: 'First shortage'
        }]} onRow={r => setFilter({
          ...filter,
          region: r.region,
          skill: r.skill
        })} /></section><section className={panel}><div className="flex justify-between mb-3"><h3 className="font-bold text-sm">Weekly pressure · deficit cells highlighted</h3><button className={button} onClick={() => csv('analytics-pressure.csv', shown)}>Export scoped cells</button></div><Table columns={pressureColumns} rows={shown} empty="No comparable cells. Inspect data coverage or explicitly enable a matched-demand-only exploratory model in assumptions." /></section></>;
  };
  const renderRecruitmentDetails = () => {
    const records = ['recruitment_grounded', 'recruitment_ungrounded'].flatMap(s => sourceRows(s)).filter(r => JSON.stringify(r.raw).toLowerCase().includes(cohortSearch.toLowerCase()));
    return <><Note>Intake rows may represent repeated cohort totals or new weekly additions. They are excluded from the model by default. Enabling recruitment explicitly interprets each dated row as a new intake and uses your linear productivity ramp; source ramp cohorts are shown for inspection, not silently joined.</Note><section className={panel}><div className="flex flex-wrap justify-between gap-3 mb-4"><h3 className="text-sm font-bold">Grounded and ungrounded intake</h3><input aria-label="Search recruitment cohort" placeholder="Search cohort…" value={cohortSearch} onChange={e => setCohortSearch(e.target.value)} className={select + ' max-w-xs'} /></div><Table rows={records} columns={[{
          key: 'region',
          label: 'Region'
        }, {
          key: 'skill',
          label: 'Skill'
        }, {
          key: 'week',
          label: 'Intake week'
        }, {
          key: 'cohort',
          label: 'Cohort',
          render: r => r.n.cohort
        }, {
          key: 'headcount',
          label: 'Source headcount',
          render: r => r.n.headcount
        }, {
          key: 'source',
          label: 'Commitment',
          render: r => r.source === 'recruitment_grounded' ? 'Grounded' : 'Ungrounded'
        }, {
          key: 'probability',
          label: 'Source probability',
          render: r => r.n.probability || '—'
        }]} onRow={r => sourceDetail(r.source, [r])} /></section><div className="grid lg:grid-cols-2 gap-5"><section className={panel}><h3 className="text-sm font-bold mb-3">Modeled recruitment productive hours by week</h3><BarList rows={group(tested.rows, r => r.week, r => r.recruits)} onRow={r => setFilter({
            ...filter,
            start: r.name,
            end: r.name
          })} /><p className="text-xs text-slate-400 mt-3">{assumptions.includeRecruitment ? `Explicit weekly-additions model · ${assumptions.rampWeeks}-week ramp · ${shock.recruitmentDelay}-week delay` : 'Recruitment modeling is off. Enable only after confirming intake semantics.'}</p></section><section className={panel}><h3 className="font-bold text-sm mb-3">Inspect ramp and attrition definitions</h3><div className="flex gap-2"><button className={button} onClick={() => sourceDetail('recruitment_config')}>Source ramp curves</button><button className={button} onClick={() => sourceDetail('attrition')}>Attrition assumptions</button></div><p className="text-xs text-slate-500 mt-4">No automatic attrition deduction is applied: the input does not establish whether Values are counts, percentages or fractions.</p></section></div></>;
  };
  const renderSupportDetails = () => {
    const without = A.model(data, filter, {
      ...assumptions,
      includeOvertime: false,
      includeContractors: false,
      includeRecruitment: false,
      includeSupport: false
    });
    const rows = ['overtime', 'ctr_capacity', 'hec_on_kac_demand', 'hec_on_ev_demand'].map(s => ({
      source: s,
      count: sourceRows(s).length,
      records: sourceRows(s)
    }));
    return <>{modelNote}<div className="grid lg:grid-cols-3 gap-3"><Card title="Authorized overtime" value={fmt(A.sum(current.rows, 'overtime')) + ' h'} sub="Only Authorized = Yes" /><Card title="Active contractor cover" value={fmt(A.sum(current.rows, 'contractors')) + ' h'} sub="Only Status = Active" /><Card title="Modeled gap without cover & hires" value={without.comparable ? fmt(without.deficit) + ' h' : '—'} sub="Removes overtime, contractors, recruitment and support" /></div><section className={panel}><Table rows={rows} columns={[{
          key: 'source',
          label: 'Support source',
          render: r => label(r.source)
        }, {
          key: 'count',
          label: 'Scoped records'
        }, {
          key: 'details',
          label: 'Inspect',
          render: () => 'Hours, limits, authorization and status →'
        }]} onRow={r => sourceDetail(r.source, r.records)} /></section><Note>Active/authorized describes source status; it does not guarantee delivery. Cross-skill support, when enabled, deducts donor hours and credits recipients at the stated efficiency. Support_Hours is interpreted as donor hours. Skill-filtered views may hide the other side; use All skills to inspect displacement. Region-only inputs are not allocated to individual patches.</Note><section className={panel}><h3 className="text-sm font-bold mb-3">Exposure by week</h3><Table rows={current.rows} columns={[{
          key: 'week',
          label: 'Week'
        }, {
          key: 'region',
          label: 'Region'
        }, {
          key: 'skill',
          label: 'Skill'
        }, {
          key: 'overtime',
          label: 'Overtime h',
          render: r => fmt(r.overtime)
        }, {
          key: 'contractors',
          label: 'Contractor h',
          render: r => fmt(r.contractors)
        }, {
          key: 'uncertainRecruits',
          label: 'Weighted ungrounded h',
          render: r => fmt(r.uncertainRecruits)
        }, {
          key: 'support',
          label: 'Net support h',
          render: r => fmt(r.support)
        }]} /></section></>;
  };
  const renderTimingDetails = () => {
    const rows = A.persistence(current.rows).filter(r => r.first).map(r => ({
      ...r,
      recruitment: A.addWeeks(r.first, -(assumptions.recruitmentLeadWeeks + assumptions.rampWeeks)),
      training: A.addWeeks(r.first, -assumptions.trainingLeadWeeks),
      support: A.addWeeks(r.first, -assumptions.supportLeadWeeks)
    }));
    return <>{modelNote}<Note>Dates are planning deadlines relative to the first modeled shortage, using your lead times. Recruitment deadline includes time to full productivity. They are not supplier promises. Historical dates stay visible so missed lead time is not concealed.</Note><section className={panel}><h3 className="font-bold text-sm mb-4">Commit-by dates</h3><div className="grid md:grid-cols-3 gap-3 mb-4">{[['recruitmentLeadWeeks', 'Recruitment lead weeks'], ['trainingLeadWeeks', 'Training lead weeks'], ['supportLeadWeeks', 'Support lead weeks']].map(([k, title]) => <Field title={title} key={k}><input aria-label={title} type="number" min="0" max="104" value={assumptions[k]} className={select} onChange={e => setAssumptions({
              ...assumptions,
              [k]: Math.max(0, Math.min(104, Number(e.target.value) || 0))
            })} /></Field>)}</div><Table rows={rows} columns={[{
          key: 'region',
          label: 'Region'
        }, {
          key: 'skill',
          label: 'Skill'
        }, {
          key: 'first',
          label: 'First shortage'
        }, {
          key: 'recruitment',
          label: 'Commit recruitment by'
        }, {
          key: 'training',
          label: 'Commit training by'
        }, {
          key: 'support',
          label: 'Secure support by'
        }]} empty="No modeled shortage with comparable evidence in this scope." /></section></>;
  };
  const stressControls = <section className={panel}><h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Test assumptions</h3><p className="text-xs text-slate-400 dark:text-[#adbed4] mb-4">Deterministic changes from the selected source plan. No likelihood is implied.</p><div className="av-controls">{control('demandPct', 'Demand change %', -100, 300)}{control('absencePp', 'Additional roster absence pp', 0, 100)}{control('productivityPct', 'Roster productivity change %', -100, 100)}{control('recruitmentDelay', 'Recruitment delay weeks', 0, 52)}{control('contractorPct', 'Contractor hours change %', -100, 200)}{control('overtimePct', 'Overtime hours change %', -100, 200)}{control('extraHours', 'Additional productive h / cell / week', 0, 10000, 10)}<Field title="Target region for added hours"><select aria-label="Target region for added hours" className={select} value={shock.targetRegion} onChange={e => setShock({
          ...shock,
          targetRegion: e.target.value
        })}>{['All', ...regions].map(s => <option key={s} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{s}</option>)}</select></Field><Field title="Target skill for added hours"><select aria-label="Target skill for added hours" className={select} value={shock.targetSkill} onChange={e => setShock({
          ...shock,
          targetSkill: e.target.value
        })}>{['All', 'HEC', 'KAC', 'EV'].map(s => <option key={s} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{s}</option>)}</select></Field></div><div className="flex flex-wrap gap-2 mt-4"><button className={button} onClick={() => setShock({
        ...shock,
        demandPct: 0,
        absencePp: 0,
        productivityPct: 0,
        recruitmentDelay: 0,
        contractorPct: 0,
        overtimePct: 0,
        extraHours: 0
      })}>Reset shocks</button><button className={button + ' text-blue-700 dark:text-[#80c6ff]'} onClick={saveRun}>Pin this run</button></div></section>;
  const renderStressDetails = () => <>{modelNote}<div className="grid lg:grid-cols-2 gap-5"><section className={panel}><h3 className="text-sm font-bold mb-3">Source plan</h3>{modelStats(current)}</section><section className={panel}><h3 className="text-sm font-bold mb-3">Under test assumptions</h3>{modelStats(tested)}</section></div><section className={panel}><h3 className="text-sm font-bold mb-3">Pressure under the combined test</h3><Table rows={tested.rows} columns={pressureColumns} /></section>{renderRuns()}</>;
  const renderSensitivityDetails = () => {
    const tests = [['Demand +10%', {
      demandPct: 10
    }], ['Additional absence +5 pp', {
      absencePp: 5
    }], ['Roster productivity −10%', {
      productivityPct: -10
    }], ['Recruitment delayed 4 weeks', {
      recruitmentDelay: 4
    }], ['Contractor cover removed', {
      contractorPct: -100
    }], ['Overtime removed', {
      overtimePct: -100
    }]].map(([name, s]) => {
      const m = A.model(data, filter, assumptions, s);
      return {
        name,
        value: m.comparable ? m.deficit - current.deficit : null,
        deficit: m.comparable ? m.deficit : null,
        shock: s
      };
    });
    const breaks = current.rows.filter(r => r.comparable && r.demand > 0).map(r => ({
      ...r,
      headroom: (r.capacity / r.demand - 1) * 100
    })).sort((a, b) => a.headroom - b.headroom);
    return <>{modelNote}<section className={panel}><h3 className="text-sm font-bold mb-3">Response to named shocks</h3><Table rows={tests} columns={[{
          key: 'name',
          label: 'Assumption tested'
        }, {
          key: 'value',
          label: 'Change in gross shortfall h',
          render: r => fmt(r.value)
        }, {
          key: 'deficit',
          label: 'Resulting shortfall h',
          render: r => fmt(r.deficit)
        }]} onRow={r => {
          setShock({
            ...shock,
            demandPct: 0,
            absencePp: 0,
            productivityPct: 0,
            recruitmentDelay: 0,
            contractorPct: 0,
            overtimePct: 0,
            extraHours: 0,
            ...r.shock
          });
          setView('stress');
        }} /><p className="text-xs text-slate-400 mt-3">Shock magnitudes differ; this is a comparison of explicit tests, not normalized causal importance. Combined interactions can be tested in Stress Tests. Recruitment delay has no effect while recruitment modeling is disabled.</p></section><section className={panel}><h3 className="text-sm font-bold mb-3">Demand headroom before coverage falls below 100%</h3><Table rows={breaks} columns={[{
          key: 'region',
          label: 'Region'
        }, {
          key: 'skill',
          label: 'Skill'
        }, {
          key: 'week',
          label: 'Week'
        }, {
          key: 'headroom',
          label: 'Demand change to break-even',
          render: r => fmt(r.headroom) + '%'
        }, {
          key: 'coverage',
          label: 'Current matched-scope coverage',
          render: r => fmt(r.coverage) + '%'
        }]} /><p className="text-xs text-slate-400 mt-3">Negative headroom means the cell is already short. This assumes fixed capacity and a uniform demand uplift within each cell.</p></section></>;
  };
  function renderRuns() {
    return <AnalyticsRunCards runs={runs} onRemove={id => setRuns(prev => prev.filter(r => r.id !== id))} onExport={() => download('analytics-runs.json', JSON.stringify(runs, null, 2))} onApply={run => {
      setAssumptions({
        ...run.assumptions
      });
      setShock({
        ...run.shock
      });
      setArea('stress');
      setView('stress');
    }} />;
  }
  const renderActionsDetails = () => {
    const noCover = A.model(data, filter, {
      ...assumptions,
      includeContractors: false,
      includeOvertime: false
    });
    const options = [{
      name: 'Source plan',
      m: current
    }, {
      name: 'Without overtime / contractors',
      m: noCover
    }, {
      name: 'Current intervention test',
      m: tested
    }, ...runs.filter(r => r.scenario === bundle.scenarioId && JSON.stringify(r.scope) === JSON.stringify(filter) && JSON.stringify(r.sourceHashes) === JSON.stringify(Object.fromEntries(Object.entries(bundle.sources).map(([k, v]) => [k, v.hash || null])))).map(r => ({
      name: r.name,
      m: {
        ...r.result,
        comparable: r.result.comparableCells
      }
    }))];
    return <>{modelNote}<section className={panel}><h3 className="text-sm font-bold mb-3">Alternative outcomes at the same scope</h3><Table rows={options} columns={[{
          key: 'name',
          label: 'Option'
        }, {
          key: 'gap',
          label: 'Gross shortfall h',
          render: r => r.m.comparable ? fmt(r.m.deficit) : '—'
        }, {
          key: 'benefit',
          label: 'Shortfall reduction vs source h',
          render: r => r.m.comparable && current.comparable ? fmt(current.deficit - r.m.deficit) : '—'
        }, {
          key: 'coverage',
          label: 'Coverage',
          render: r => r.m.coverage === null ? '—' : fmt(r.m.coverage) + '%'
        }, {
          key: 'cells',
          label: 'Comparable cells',
          render: r => r.m.comparable
        }]} /><p className="text-xs text-slate-400 mt-3">Pinned runs appear here only when scenario, scope and source fingerprints match. Added productive hours are unconstrained planning assumptions, not confirmed overtime or a cheapest/optimal solution. No cost rates are available.</p></section><section className={panel}><h3 className="text-sm font-bold mb-3">Where the intervention changes the buffer</h3><Table rows={tested.rows.filter(r => r.comparable).map(r => {
          const before = current.rows.find(b => b.region === r.region && b.skill === r.skill && b.week === r.week);
          return {
            ...r,
            before: before?.gap,
            change: before?.gap === null ? null : r.gap - (before?.gap || 0)
          };
        })} columns={[{
          key: 'region',
          label: 'Region'
        }, {
          key: 'skill',
          label: 'Skill'
        }, {
          key: 'week',
          label: 'Week'
        }, {
          key: 'before',
          label: 'Source buffer h',
          render: r => fmt(r.before)
        }, {
          key: 'gap',
          label: 'Test buffer h',
          render: r => fmt(r.gap)
        }, {
          key: 'change',
          label: 'Change h',
          render: r => fmt(r.change)
        }]} /></section>{renderRuns()}</>;
  };
  const drillWeek = row => {
    setFilter({
      ...filter,
      start: filter.start === row.key && filter.end === row.key ? '' : row.key,
      end: filter.start === row.key && filter.end === row.key ? '' : row.key
    });
  };
  const focusCell = row => setFilter({
    ...filter,
    region: row.region,
    skill: row.skill,
    start: row.week,
    end: row.week
  });
  const weeklyModel = (first, second) => weeks.filter(w => (!filter.start || w >= filter.start) && (!filter.end || w <= filter.end)).map(w => {
    const x = A.summarize(first.rows.filter(r => r.week === w)),
      y = second ? A.summarize(second.rows.filter(r => r.week === w)) : null;
    return {
      key: w,
      label: w.slice(5),
      capacity: x.comparable ? x.capacity : null,
      demand: x.comparable ? x.demand : null,
      testCapacity: y?.comparable ? y.capacity : null,
      testDemand: y?.comparable ? y.demand : null,
      shortfall: x.comparable ? x.deficit : null,
      testShortfall: y?.comparable ? y.deficit : null
    };
  });
  const evidenceSection = (title, children) => {
    const panes=[], notes=[];
    const names={capacity:['Weekly accounting'],downtime:['Training records'],changes:['Input changes'],quality:['Selected files','Coverage issues'],deficits:['Persistent shortages','Weekly pressure'],recruitment:['Recruitment cohorts'],support:['Support commitments','Weekly exposure'],stress:['Weekly test results'],sensitivity:['Sensitivity results','Breakpoints'],actions:['Intervention comparison','Weekly outcomes']}[view]||[];
    const textOf = node => typeof node === 'string' ? node : React.Children.toArray(node?.props?.children).map(textOf).join(' ');
    const visit = (node, heading) => React.Children.forEach(node, child => {
      if (!React.isValidElement(child)) return;
      if (child.type === Table || child.type === AnalyticsTable) {
        const id='table-'+panes.length;
        const name=names[panes.length]||heading||child.props.title||'Detailed records';
        panes.push({id,label:name,count:child.props.rows?.length,content:React.cloneElement(child,{title:name})});
      } else if (child.type === AnalyticsRunCards) panes.push({id:'runs',label:'Saved runs',content:child});
      else if (child.type === Note || child.type === 'button') notes.push(child);
      else if (typeof child.type === 'string' || child.type === React.Fragment) {
        const items=React.Children.toArray(child.props.children);
        const h=items.find(c=>React.isValidElement(c)&&/^h[1-6]$/.test(c.type));
        visit(child.props.children,h?textOf(h):heading);
      }
    });
    visit(children);
    panes.push({id:'definitions',label:'Definitions & sources',content:<div className="av-workbench-notes"><p>Tables use the current filters and selected source versions. Select a row to inspect its evidence. Search within a table or select a column heading to sort.</p>{notes.map((n,i)=><React.Fragment key={i}>{n}</React.Fragment>)}{modelNote}<button className={button} onClick={()=>sourceDetail(sourceChoice)}>Inspect selected source records</button></div>});
    return <AnalyticsWorkbench key={view} title="Investigate the numbers" panes={panes} idPrefix={'details-'+view}/>;
  };
  const demandTimeline = [...new Set(demand.map(r => r.week).filter(Boolean))].sort().map(w => ({
    key: w,
    label: w.slice(5),
    ...Object.fromEntries(['HEC', 'KAC', 'EV'].map(skill => [skill, A.sum(demand.filter(r => r.week === w && r.skill === skill), 'jobs')]))
  }));
  const renderDemandWorkbench = () => {
    const hours = rows => rows.filter(r=>r.matched).reduce((s,r)=>s+r.jobs*r.jobTime.value/(assumptions.jobTimeUnit==='minutes'?60:1),0);
    const contributions = key => group(demand,key,r=>r.jobs).map(r=>({...r,matched:r.value?100*A.sum(r.records.filter(x=>x.matched),'jobs')/r.value:null,hours:hours(r.records),share:jobs?100*r.value/jobs:null}));
    const patches = contributions(r=>r.patch+' / '+r.skill);
    const weekly = contributions(r=>r.week).sort((a,b)=>a.name.localeCompare(b.name));
    const work = contributions(r=>r.workCode||'Missing code');
    const columns = name => [{key:'name',label:name},{key:'value',label:'Forecast jobs',render:r=>fmt(r.value,0)},{key:'share',label:'Share of jobs',render:r=>r.share===null?'—':fmt(r.share)+'%'},{key:'matched',label:'Job-time coverage',render:r=>r.matched===null?'—':fmt(r.matched)+'%'},{key:'hours',label:'Matched hours',render:r=>fmt(r.hours)},{key:'records',label:'Source rows',render:r=>r.records.length}];
    const table = (rows,name,extra=[]) => <Table title={name} columns={[...columns(name),...extra]} rows={rows} onRow={r=>sourceDetail('demand_input',r.records)}/>;
    const gaps = demand.filter(r=>!r.matched||r.duplicate||!r.week||r.jobs===null||r.jobs<0).map(r=>({...r,reason:[!r.matched&&'No matching job time',r.duplicate&&'Duplicate business key',!r.week&&'Missing week',(r.jobs===null||r.jobs<0)&&'Invalid job volume'].filter(Boolean).join('; ')}));
    const exportRows = rows => csv('demand-contributions.csv',rows.map(({records,...r})=>({...r,sourceRows:records.length})));
    return <AnalyticsWorkbench title="Investigate demand" idPrefix="demand-investigation" subtitle="Choose a question, inspect a contribution, then open the source records behind it." panes={[
      {id:'patch',label:'Patch & skill',count:patches.length,description:'Which teams contribute most? Select a row to see its original demand records.',content:table(patches,'Patch / skill'),onExport:()=>exportRows(patches)},
      {id:'weekly',label:'Weekly totals',count:weekly.length,description:'Compare the planning weeks. Open a row for evidence, or use Focus week to narrow the entire view.',content:table(weekly,'Week',[{key:'focus',label:'Explore',render:r=><button className="av-table-focus" onClick={e=>{e.stopPropagation();drillWeek({key:r.name});}}>{filter.start===r.name&&filter.end===r.name?'Show all weeks':'Focus week'}<AnalyticsIcon name="chevron" size={12}/></button>}]),onExport:()=>exportRows(weekly)},
      {id:'work',label:'Work codes',count:work.length,description:'Which activities explain the workload? Hours cover only jobs with a matching job-time record.',content:table(work,'Work code'),onExport:()=>exportRows(work)},
      {id:'change',label:'Explain changes',count:bridge.rows.length,description:'Same-scope contributions to the change in matched hours. Excluded groups are listed under Data gaps.',content:<Table title="Change in demand hours" rows={bridge.rows} columns={[{key:'patch',label:'Patch'},{key:'skill',label:'Skill'},{key:'week',label:'Week'},{key:'before',label:'Baseline h',render:r=>fmt(r.before)},{key:'after',label:'Current h',render:r=>fmt(r.after)},{key:'volume',label:'Volume h',render:r=>fmt(r.volume)},{key:'mix',label:'Work mix h',render:r=>fmt(r.mix)},{key:'duration',label:'Duration h',render:r=>fmt(r.duration)}]} onRow={r=>sourceDetail('demand_input',r.records)}/>},
      {id:'gaps',label:'Data gaps',count:gaps.length,description:'Records needing attention in the current scope. A count of records is different from a count of affected jobs.',content:<><Table title="Demand records needing attention" rows={gaps} columns={[{key:'patch',label:'Patch'},{key:'skill',label:'Skill'},{key:'week',label:'Week'},{key:'workCode',label:'Work code'},{key:'jobs',label:'Jobs'},{key:'reason',label:'Why review'}]} onRow={r=>sourceDetail('demand_input',[r])}/>{bridge.excluded.length>0&&<Table title="Groups excluded from the change comparison" rows={bridge.excluded} columns={[{key:'key',label:'Patch / skill / week'},{key:'reason',label:'Reason'}]}/>}</>},
      {id:'formula',label:'How calculated',content:<div className="av-formula-cards"><article><span>01 · Volume</span><h4>Forecast jobs</h4><code>Sum of source job volumes</code><p>Uses demand records within the selected region, patch, skill and week range.</p></article><article><span>02 · Workload</span><h4>Matched demand hours</h4><code>Jobs × job time {assumptions.jobTimeUnit==='minutes'?'÷ 60':''}</code><p>Job time is interpreted as {assumptions.jobTimeUnit} per job. Unmatched jobs are excluded, so this is a partial workload total.</p></article><article><span>03 · Confidence</span><h4>Job-time coverage</h4><code>Matched jobs ÷ forecast jobs × 100</code><p>Measures the share of job volume that can be translated into hours. It does not measure staffing sufficiency.</p></article></div>}
    ]}/>;
  };
  const renderDemand = () => <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Card title="Forecast jobs" value={fmt(jobs, 0)} sub="Selected source volume" /><Card title="Job-time coverage" value={percent(matchedJobs, jobs)} sub={fmt(matchedJobs, 0) + ' matched jobs'} /><Card title="Patches in scope" value={new Set(demand.map(r => r.patch)).size} sub="Across the selected geography" /><Card title="Planning horizon" value={demandTimeline.length + ' weeks'} sub="Dates derived from source inputs" /></div>
    <V.Trend title="Demand trajectory" subtitle="Weekly forecast jobs by skill. Toggle a legend to isolate a work stream." data={demandTimeline} series={[{
      key: 'HEC',
      label: 'HEC',
      color: '#2563eb'
    }, {
      key: 'KAC',
      label: 'KAC',
      color: '#14b8a6'
    }, {
      key: 'EV',
      label: 'EV',
      color: '#8b5cf6'
    }]} unit="jobs" stacked onSelect={drillWeek} />
    <div className="grid xl:grid-cols-2 gap-5"><V.Donut title="Work-code mix" subtitle="Share of forecast jobs in the current scope" segments={group(demand, r => r.workCode || 'Missing', r => r.jobs)} center={fmt(jobs, 0)} caption="forecast jobs" onSelect={r => sourceDetail('demand_input', r.records)} /><V.Donut title="How much can we explain in hours?" subtitle="Coverage is based on job volume, not just row counts" segments={[{
        name: 'Matched job time',
        value: matchedJobs,
        color: '#2563eb',
        matched: true
      }, {
        name: 'Unmatched job time',
        value: Math.max(0, jobs - matchedJobs),
        color: '#e2e8f0',
        matched: false
      }]} center={percent(matchedJobs, jobs)} caption="volume matched" onSelect={r => sourceDetail('demand_input', demand.filter(x => x.matched === r.matched))} /></div>
    <V.Waterfall title="What changed in demand hours?" subtitle={bridge.rows.length + ' comparable patch / skill / week groups; ' + bridge.excluded.length + ' groups excluded. Same-scope contributions only.'} steps={bridge.rows.length ? [{
      name: 'Baseline demand',
      value: bridge.before,
      total: true
    }, {
      name: 'Job volume',
      value: bridge.volume
    }, {
      name: 'Work mix',
      value: bridge.mix
    }, {
      name: 'Task duration',
      value: bridge.duration
    }, {
      name: 'Current demand',
      value: bridge.after,
      total: true
    }] : []} onSelect={() => sourceDetail('demand_input', bridge.rows.flatMap(r => r.records))} />
    {renderDemandWorkbench()}
  </>;
  const renderCapacity = () => <>{modelNote}{modelStats(current)}
    <V.Trend title="Capacity and matched workload" subtitle="Only comparable region / skill / week cells are included. Missing evidence breaks the line." data={weeklyModel(current)} series={[{
      key: 'capacity',
      label: 'Modeled capacity',
      color: '#2563eb'
    }, {
      key: 'demand',
      label: 'Matched demand',
      color: '#14b8a6'
    }]} onSelect={r => setFilter({
      ...filter,
      start: r.key,
      end: r.key
    })} />
    <div className="grid xl:grid-cols-2 gap-5"><V.Bars title="Capacity components" subtitle="Source hours across the horizon; downtime is shown as a deduction. Flooring is applied per cell." rows={['roster', 'downtime', 'recruits', 'overtime', 'contractors', 'transfers', 'support'].map(k => ({
        name: label(k),
        value: A.sum(current.rows, k) * (k === 'downtime' ? -1 : 1),
        source: {
          roster: 'resource_plan',
          downtime: 'downtime_overlays_' + (assumptions.downtime === 'percent' ? 'percentage' : assumptions.downtime === 'perFte' ? 'hours_fte' : 'hours'),
          recruits: 'recruitment_grounded',
          overtime: 'overtime',
          contractors: 'ctr_capacity',
          transfers: 'fte_transfer',
          support: 'hec_on_kac_demand'
        }[k]
      }))} diverging onSelect={r => sourceDetail(r.source)} /><V.Donut title="Workforce snapshot" subtitle="Record status in the selected resource plan; headcount, not modeled FTE" segments={group(sourceRows('resource_plan'), r => A.text(r.n.status) || 'Missing', () => 1).map(r => ({
        ...r,
        color: r.name === 'Active' ? '#14b8a6' : r.name === 'Leaver' ? '#94a3b8' : '#f59e0b'
      }))} center={sourceRows('resource_plan').length} caption="source records" onSelect={r => sourceDetail('resource_plan', r.records)} /></div>
    {evidenceSection('Inspect capacity accounting and weekly figures', renderCapacityDetails())}
  </>;
  const renderDowntime = () => <><Note>Choose one representation for modeling. Hours, percentages and hours/FTE are not additive.</Note><div className="grid xl:grid-cols-3 gap-5">{['downtime_overlays_hours', 'downtime_overlays_percentage', 'downtime_overlays_hours_fte'].map((source, i) => {
        const records = sourceRows(source).filter(r => !r.duplicate && r.value !== null && r.value >= 0);
        const values = group(records, r => r.category, r => r.value).map(r => ({
          ...r,
          value: i ? r.value / r.records.length : r.value,
          color: r.name === 'Training' ? '#8b5cf6' : r.name === 'Sickness' ? '#f43f5e' : r.name === 'Annual Leave' ? '#2563eb' : '#14b8a6'
        }));
        return <V.Bars key={source} title={['Downtime hours', 'Overlay percentages', 'Hours per FTE'][i]} subtitle={i ? 'Mean of valid source records' : 'Total of valid source hours'} unit={['h', '%', 'h/FTE'][i]} rows={values} onSelect={r => sourceDetail(source, r.records)} />;
      })}</div>{evidenceSection('Inspect overlay records and training schedules', renderDowntimeDetails())}</>;
  const renderChanges = () => <><div className="grid xl:grid-cols-2 gap-5"><V.Donut title="How different are these plans?" subtitle="Selected input contents, independently of filenames" segments={group(differences, r => r.status, () => 1)} center={differences.length} caption="input sources" onSelect={r => {
        setDetail({
          title: r.name,
          rows: r.records.flatMap(d => data.facts[d.source] || [])
        });
        setSourcePage(0);
        setSourceSearch('');
      }} /><V.Waterfall title="Comparable demand change" subtitle="Volume, work mix and duration on matched common source scope" steps={bridge.rows.length ? [{
        name: 'Baseline',
        value: bridge.before,
        total: true
      }, {
        name: 'Volume',
        value: bridge.volume
      }, {
        name: 'Mix',
        value: bridge.mix
      }, {
        name: 'Duration',
        value: bridge.duration
      }, {
        name: 'Current',
        value: bridge.after,
        total: true
      }] : []} /></div>{evidenceSection('Input changes',renderChangesDetails())}</>;
  const renderQuality = () => <><div className="grid xl:grid-cols-2 gap-5"><V.Donut title="Demand evidence coverage" subtitle="Select a segment to inspect the affected jobs" segments={[{
        name: 'Matched',
        value: matchedJobs,
        color: '#2563eb',
        matched: true
      }, {
        name: 'Unmatched',
        value: Math.max(0, jobs - matchedJobs),
        color: '#f59e0b',
        matched: false
      }]} center={percent(matchedJobs, jobs)} caption="job volume matched" onSelect={r => sourceDetail('demand_input', demand.filter(x => x.matched === r.matched))} /><V.Bars title="What limits this analysis?" subtitle="Source-version checks; select a category for evidence" unit="issues" rows={group(data.issues, r => r.kind, () => 1).slice(0, 8)} onSelect={r => {
        setDetail({
          title: r.name,
          issues: r.records
        });
        setSourcePage(0);
        setSourceSearch('');
      }} /></div>{evidenceSection('All coverage issues and source fingerprints', renderQualityDetails())}</>;
  const renderDeficits = () => <>{modelNote}{modelStats(current)}<V.Heatmap title="Where pressure persists" subtitle="Region × skill × week. Grey cells have insufficient evidence; they are not balanced cells." rows={current.rows} onSelect={focusCell} /><V.Bars title="Shortfall concentration" subtitle="Gross shortage hours are never offset by surplus in another region" rows={A.persistence(current.rows).filter(r => r.deficit > 0).map(r => ({
      name: r.region + ' / ' + r.skill,
      value: r.deficit,
      color: '#f43f5e',
      record: r
    }))} onSelect={r => setFilter({
      ...filter,
      region: r.record.region,
      skill: r.record.skill
    })} />{evidenceSection('Duration, worst-week and pressure-cell tables', renderDeficitsDetails())}</>;
  const renderRecruitment = () => {
    const grounded = sourceRows('recruitment_grounded'),
      ungrounded = sourceRows('recruitment_ungrounded');
    const points = [...new Set([...grounded, ...ungrounded].map(r => r.week).filter(Boolean))].sort().map(w => ({
      key: w,
      label: w.slice(5),
      grounded: grounded.filter(r => r.week === w).reduce((t, r) => t + (A.num(r.n.headcount) || 0), 0),
      ungrounded: ungrounded.filter(r => r.week === w).reduce((t, r) => t + (A.num(r.n.headcount) || 0), 0)
    }));
    return <><V.Trend title="Recruitment commitment profile" subtitle="Dated source headcount. Repeated cohort rows are not assumed to be cumulative additions." data={points} series={[{
        key: 'grounded',
        label: 'Grounded intake',
        color: '#2563eb'
      }, {
        key: 'ungrounded',
        label: 'Ungrounded intake',
        color: '#8b5cf6'
      }]} unit="people" onSelect={r => sourceDetail('recruitment_grounded', [...grounded, ...ungrounded].filter(x => x.week === r.key))} />{evidenceSection('Cohort records, probability and modeled ramp', renderRecruitmentDetails())}</>;
  };
  const renderSupport = () => <>{modelNote}<V.Trend title="Dependence on additional cover" subtitle="Authorized overtime and active contractor source hours in the current scope" data={weeks.filter(w => (!filter.start || w >= filter.start) && (!filter.end || w <= filter.end)).map(w => ({
      key: w,
      label: w.slice(5),
      overtime: A.sum(current.rows.filter(r => r.week === w), 'overtime'),
      contractors: A.sum(current.rows.filter(r => r.week === w), 'contractors')
    }))} series={[{
      key: 'overtime',
      label: 'Overtime',
      color: '#8b5cf6'
    }, {
      key: 'contractors',
      label: 'Contractors',
      color: '#2563eb'
    }]} stacked onSelect={r => setFilter({
      ...filter,
      start: r.key,
      end: r.key
    })} />{evidenceSection('Cover commitments, support limits and exposure tables', renderSupportDetails())}</>;
  const renderTiming = () => <><V.Bars title="Time needed before an intervention is fully effective" subtitle="Your planning assumptions; recruitment includes the productivity ramp" unit="weeks" rows={[{
      name: 'Recruitment + ramp',
      value: assumptions.recruitmentLeadWeeks + assumptions.rampWeeks,
      color: '#2563eb'
    }, {
      name: 'Training lead time',
      value: assumptions.trainingLeadWeeks,
      color: '#8b5cf6'
    }, {
      name: 'Additional support',
      value: assumptions.supportLeadWeeks,
      color: '#14b8a6'
    }]} />{renderTimingDetails()}</>;
  const renderStress = () => <>{modelNote}<div className="av-simulation">{stressControls}<V.Trend title="How does the plan respond?" subtitle="Source plan versus your live test. Values use comparable modeled cells only." data={weeklyModel(current, tested)} series={[{
        key: 'capacity',
        label: 'Source capacity',
        color: '#94a3b8'
      }, {
        key: 'testCapacity',
        label: 'Test capacity',
        color: '#2563eb'
      }, {
        key: 'testDemand',
        label: 'Test demand',
        color: '#f59e0b'
      }]} onSelect={r => setFilter({
        ...filter,
        start: r.key,
        end: r.key
      })} /></div><div className="grid xl:grid-cols-2 gap-5"><V.Bars title="Gross shortfall before and after" subtitle="No likelihood or service-level probability is implied" rows={[{
        name: 'Source plan',
        value: current.comparable ? current.deficit : null,
        color: '#94a3b8'
      }, {
        name: 'Current test',
        value: tested.comparable ? tested.deficit : null,
        color: '#f43f5e'
      }]} /><V.Donut title="Comparable model scope" subtitle="A stress result is limited by its supporting evidence" segments={[{
        name: 'Comparable cells',
        value: tested.comparable,
        color: '#2563eb'
      }, {
        name: 'Unavailable cells',
        value: Math.max(0, tested.total - tested.comparable),
        color: '#e2e8f0'
      }]} center={percent(tested.comparable, tested.total)} caption="cells comparable" onSelect={() => {
        setArea('drivers');
        setView('quality');
      }} /></div>{evidenceSection('Detailed test outputs and pinned runs', renderStressDetails())}</>;
  const renderSensitivity = () => {
    const cases = [['Demand +10%', {
      demandPct: 10
    }], ['Absence +5 pp', {
      absencePp: 5
    }], ['Productivity −10%', {
      productivityPct: -10
    }], ['Recruitment delay +4 weeks', {
      recruitmentDelay: 4
    }], ['Contractors removed', {
      contractorPct: -100
    }], ['Overtime removed', {
      overtimePct: -100
    }]].map(([name, test]) => {
      const result = A.model(data, filter, assumptions, test);
      return {
        name,
        value: result.comparable ? result.deficit - current.deficit : null,
        test
      };
    });
    return <>{modelNote}<V.Bars title="Which assumption changes exposure most?" subtitle="Change in gross shortfall under each named shock. Magnitudes differ; this is not normalized causal importance." rows={cases} diverging onSelect={r => {
        setShock({
          ...shock,
          demandPct: 0,
          absencePp: 0,
          productivityPct: 0,
          recruitmentDelay: 0,
          contractorPct: 0,
          overtimePct: 0,
          extraHours: 0,
          ...r.test
        });
        setView('stress');
      }} />{evidenceSection('Breakpoints and full sensitivity figures', renderSensitivityDetails())}</>;
  };
  const renderActions = () => <>{modelNote}<div className="av-simulation">{stressControls}<V.Trend title="Intervention impact through time" subtitle="Source and test capacity against test demand; donor deductions are retained when support is enabled" data={weeklyModel(current, tested)} series={[{
        key: 'capacity',
        label: 'Source capacity',
        color: '#94a3b8'
      }, {
        key: 'testCapacity',
        label: 'With intervention',
        color: '#2563eb'
      }, {
        key: 'testDemand',
        label: 'Test demand',
        color: '#f59e0b'
      }]} onSelect={r => setFilter({
        ...filter,
        start: r.key,
        end: r.key
      })} /></div><V.Heatmap title="Does the intervention move the pressure?" subtitle="Test buffers across regions and skills. Select a cell to investigate the remaining exposure." rows={tested.rows} onSelect={focusCell} />{evidenceSection('Compare alternative outcomes and pinned runs', renderActionsDetails())}</>;
  const renderers = {
    demand: renderDemand,
    capacity: renderCapacity,
    downtime: renderDowntime,
    changes: renderChanges,
    quality: renderQuality,
    deficits: renderDeficits,
    recruitment: renderRecruitment,
    support: renderSupport,
    timing: renderTiming,
    stress: renderStress,
    sensitivity: renderSensitivity,
    actions: renderActions
  };
  const detailRows = detail?.rows || [],
    visibleDetail = detailRows.filter(r => JSON.stringify(r.raw).toLowerCase().includes(sourceSearch.toLowerCase()));

  const allWeeks = [
    "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19",
    "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"
  ];
  const availableWeeks = React.useMemo(() => {
    if (weeks && weeks.length > 0) {
      const set = new Set([...allWeeks, ...weeks]);
      return Array.from(set).sort();
    }
    return allWeeks;
  }, [weeks]);

  const scen1 = scenarios[scenarioId] || {};
  const scen2 = scenarios[baselineId] || {};

  return <div className="analytics-workspace space-y-4 pb-8">
        {/* UNIFIED SCENARIO COMPARATOR & OPERATIONAL FILTERS CARD MATCHING SCENARIO DIFF */}
        <div className="diff-filter-card bg-white/95 dark:bg-[#06101f] p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 dark:border-2 dark:border-[#1e40af] shadow-sm dark:shadow-[0_0_24px_rgba(30,64,175,0.25)] relative z-30 space-y-3 transition-all duration-200">
          {/* Header row: Filters pill & Actions */}
          <div className="flex items-center justify-between gap-2">
            <span className="px-3 py-1 bg-[#005eb8] text-white font-bold text-xs rounded-full flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filters</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAssumptions(true)}
                className="px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 text-[#005eb8] dark:text-[#80c6ff] border border-blue-200 dark:border-blue-500/40 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                title="Open Model Assumptions & Planning Controls"
              >
                <AnalyticsIcon name="sliders" size={12} className="text-current" />
                <span>Model Assumptions</span>
              </button>
              {!isFiltersCollapsed ? (
                <>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1 rounded-full bg-white dark:bg-[#0c1b31] hover:bg-slate-100 dark:hover:bg-[#18365d] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                    title="Reset filters to default"
                  >
                    <svg className="w-3 h-3 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFiltersCollapsed(true)}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-[#80c6ff] ml-1.5 cursor-pointer transition select-none"
                  >
                    Collapse &#9652;
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsFiltersCollapsed(false)}
                  className="text-xs font-bold text-blue-600 dark:text-[#80c6ff] hover:underline cursor-pointer select-none"
                >
                  Expand &#9662;
                </button>
              )}
            </div>
          </div>

          {!isFiltersCollapsed && (
            <>
              {/* Row 1: Dual Scenario Selectors with Swap */}
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 pt-1">
                {/* Baseline Scenario (1) */}
                <div className="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-50/70 dark:bg-[#08162b] border border-slate-200 dark:border-[#1a3862] rounded-xl px-3 py-2 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-[#80c6ff] flex-shrink-0 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900" />
                    <span>BASELINE SCENARIO (D1)</span>
                    <span title="Primary baseline reference scenario" className="cursor-help text-slate-400 dark:text-[#adbed4]">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                  </span>
                  <select
                    aria-label="Investigate scenario"
                    value={scenarioId}
                    onChange={(e) => {
                      setScenarioId(e.target.value);
                      if (setBaselineScenarioId) setBaselineScenarioId(e.target.value);
                      if (e.target.value !== '__draft' && onSelectScenario) onSelectScenario(e.target.value);
                    }}
                    className="flex-1 min-w-0 text-xs font-bold bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white border border-slate-200 dark:border-[#18365d] rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-blue-500 cursor-pointer truncate shadow-2xs"
                    title={`Baseline Scenario (1): ${scenarioId} - ${scen1.remarks || 'Operating Plan Baseline'}`}
                  >
                    {Object.keys(scenarios).map(id => (
                      <option key={id} value={id} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{id}</option>
                    ))}
                    <option value="__draft" className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">Current draft inputs (unsaved)</option>
                  </select>
                </div>

                {/* Swap Scenarios Button */}
                <button
                  type="button"
                  onClick={handleSwapScenarios}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 dark:bg-[#0c1f38] dark:hover:bg-[#122b4d] text-slate-700 dark:text-white hover:text-[#005eb8] dark:hover:text-[#80c6ff] border border-slate-200 dark:border-blue-600/50 transition shadow-2xs flex-shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-bold select-none"
                  title="Swap Baseline and Comparison Scenarios"
                >
                  <svg className="w-3.5 h-3.5 text-[#005eb8] dark:text-[#80c6ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m16 3 4 4-4 4" />
                    <path d="M20 7H4" />
                    <path d="m8 21-4-4 4-4" />
                    <path d="M4 17h16" />
                  </svg>
                  <span>Swap Scenarios</span>
                </button>

                {/* Comparison Scenario (2) */}
                <div className="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-50/70 dark:bg-[#08162b] border border-slate-200 dark:border-[#1a3862] rounded-xl px-3 py-2 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-emerald-400 flex-shrink-0 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900" />
                    <span>COMPARISON SCENARIO (2I)</span>
                    <span title="Secondary comparison scenario" className="cursor-help text-slate-400 dark:text-[#adbed4]">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                  </span>
                  <select
                    aria-label="Saved baseline for changes"
                    value={baselineId}
                    onChange={(e) => {
                      setBaselineId(e.target.value);
                      if (setComparisonScenarioId) setComparisonScenarioId(e.target.value);
                    }}
                    className="flex-1 min-w-0 text-xs font-bold bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white border border-slate-200 dark:border-[#18365d] rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 cursor-pointer truncate shadow-2xs"
                    title={`Comparison Scenario (2): ${baselineId} - ${scen2.remarks || 'Secondary revision'}`}
                  >
                    {Object.keys(scenarios).map(id => (
                      <option key={id} value={id} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: 3 Drill-Down Filters (Geography, Skill, Date) */}
              <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-[#18365d]/80">
                {/* A. Geography Hierarchy Scope Filter */}
                <div className="flex-1 min-w-[200px] flex items-center gap-2 relative z-50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-[#80c6ff] whitespace-nowrap flex items-center gap-1 flex-shrink-0" title="Geography Scope">
                    <svg className="w-3.5 h-3.5 text-[#005eb8] dark:text-[#80c6ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>GEOGRAPHY:</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    {window.GeographyHierarchySelector ? (
                      <window.GeographyHierarchySelector
                        hierarchy={hierarchy}
                        selectedGeo={selectedGeo}
                        onSelectGeo={handleSelectGeo}
                        sourceFileName={selectedGeographyFile}
                        onNavigateToInputs={onNavigateToInputs}
                        compact={true}
                      />
                    ) : (
                      <div className="h-[32px] px-2.5 rounded-lg bg-white dark:bg-[#081324] border border-slate-300 dark:border-[#18365d] shadow-2xs flex items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-white">
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-800 dark:border-white flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                          </span>
                          <span>{selectedGeo.label || 'National'}</span>
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-[#0c1b31] text-slate-700 dark:text-[#adbed4] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#18365d]">
                          {selectedGeo.count || 18} Terr &#9662;
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* B. Skill Type Filter */}
                <div className="flex items-center gap-2 flex-shrink-0" title="Skill Type Filter">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-[#80c6ff] whitespace-nowrap flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[#005eb8] dark:text-[#80c6ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>SKILL:</span>
                  </span>
                  <div className="flex items-center bg-white dark:bg-[#081324] p-0.5 rounded-xl border border-slate-200 dark:border-[#18365d] h-[34px] shadow-2xs">
                    {[
                      { id: 'All', label: 'All Skills', icon: 'users' },
                      { id: 'HEC', label: 'HEC Core', icon: 'bolt' },
                      { id: 'KAC', label: 'KAC Appliance', icon: 'wrench' }
                    ].map(s => {
                      const isSelected = (filter.skill === s.id) || (s.id === 'All' && (!filter.skill || filter.skill === 'All' || filter.skill === 'ALL'));
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setFilter(prev => ({ ...prev, skill: s.id }))}
                          className={`px-3 h-full text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                            isSelected
                              ? 'bg-blue-100 text-[#005eb8] dark:bg-[#1d4ed8] dark:text-white shadow-xs font-extrabold'
                              : 'text-slate-600 dark:text-[#adbed4] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#112649]'
                          }`}
                        >
                          {s.icon === 'users' && (
                            <svg className="w-3 h-3 flex-shrink-0 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                            </svg>
                          )}
                          {s.icon === 'bolt' && (
                            <svg className="w-3 h-3 flex-shrink-0 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                          )}
                          {s.icon === 'wrench' && (
                            <svg className="w-3 h-3 flex-shrink-0 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                          )}
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Keep accessible aria-label select for tests and assistive technology */}
                  <select
                    aria-label="Analytics skill"
                    className="sr-only"
                    value={filter.skill}
                    onChange={e => setFilter({ ...filter, skill: e.target.value })}
                  >
                    <option value="All">All</option>
                    <option value="HEC">HEC</option>
                    <option value="KAC">KAC</option>
                    <option value="EV">EV</option>
                  </select>
                </div>

                {/* C. Date Range Filter */}
                <div className="flex items-center gap-2 flex-shrink-0" title="Date Range Filter">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-[#80c6ff] whitespace-nowrap flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[#005eb8] dark:text-[#80c6ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>DATE:</span>
                  </span>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-[#081324] border border-slate-200 dark:border-[#18365d] rounded-xl px-2.5 h-[34px] shadow-2xs">
                    <select
                      aria-label="Analytics from week"
                      value={filter.start || availableWeeks[0] || '2026-09-28'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilter({
                          ...filter,
                          start: val,
                          end: filter.end && val > filter.end ? val : filter.end
                        });
                      }}
                      className="text-[11px] font-bold bg-transparent text-slate-800 dark:text-white cursor-pointer focus:outline-none"
                      title="Start Week"
                    >
                      {availableWeeks.map(w => (
                        <option key={w} value={w} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{w}</option>
                      ))}
                    </select>
                    <span className="text-slate-400 dark:text-[#80c6ff] text-xs font-bold select-none">&rarr;</span>
                    <select
                      aria-label="Analytics through week"
                      value={filter.end || availableWeeks[availableWeeks.length - 1] || '2026-11-16'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilter({
                          ...filter,
                          end: val,
                          start: filter.start && val < filter.start ? val : filter.start
                        });
                      }}
                      className="text-[11px] font-bold bg-transparent text-slate-800 dark:text-white cursor-pointer focus:outline-none"
                      title="End Week"
                    >
                      {availableWeeks.map(w => (
                        <option key={w} value={w} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{w}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {showAssumptions && <AnalyticsAssumptions value={assumptions} onChange={setAssumptions} onClose={() => { setShowAssumptions(false); setIsAssumptionsOpen && setIsAssumptionsOpen(false); }} onReset={() => setAssumptions({
      ...A.defaults
    })} />}
        {/* Top: 4 Category Navigation Cards */}
        <nav aria-label="Analytics areas" className="av-area-nav grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(areas).map(([id, a]) => {
            const isSelected = area === id;
            const subCount = Object.keys(a.views).length;
            return (
              <button
                key={id}
                onClick={() => {
                  setArea(id);
                  setView(Object.keys(a.views)[0]);
                  setDetail(null);
                }}
                aria-current={isSelected ? 'page' : undefined}
                className={`group relative flex items-center gap-3.5 p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-[#eff6ff] dark:bg-[#0c223f] border border-blue-400/80 dark:border-blue-500/60 shadow-sm'
                    : 'bg-white dark:bg-[#071324] border border-slate-200/90 dark:border-[#18365d] hover:bg-slate-50 dark:hover:bg-[#0c1e36] hover:border-blue-300 dark:hover:border-[#2b5288]'
                }`}
              >
                <div className={`flex-shrink-0 transition-colors ${isSelected ? 'text-[#005eb8] dark:text-[#38bdf8]' : 'text-slate-400 dark:text-[#94a3b8] group-hover:text-slate-600 dark:group-hover:text-slate-200'}`}>
                  <AnalyticsIcon name={a.icon || 'trend'} size={21} />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className={`av-card-title block text-xs sm:text-[13px] font-bold truncate ${
                    isSelected ? 'text-[#005eb8] dark:text-white' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {a.title}
                  </span>
                  <small className={`block text-[11px] mt-1 font-medium truncate ${
                    isSelected ? 'text-blue-600 dark:text-[#80c6ff]' : 'text-slate-400 dark:text-[#adbed4]'
                  }`}>
                    {subCount} {subCount === 1 ? 'investigation' : 'investigations'}
                  </small>
                </div>
                {/* Active bottom indicator line matching the image */}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#005eb8] dark:bg-[#38bdf8] rounded-b-md" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Subtabs Row: Displayed ONLY if category has more than 1 subtab */}
        {Object.keys(areas[area].views).length > 1 && (
          <nav aria-label="Analytics investigations" className="av-view-nav flex items-center flex-wrap gap-y-2 border-b border-slate-200 dark:border-[#18365d]/50 mt-3 pt-1 pb-0 overflow-x-auto">
            {Object.entries(areas[area].views).map(([id, title], idx) => {
              const isSelected = view === id;
              return (
                <React.Fragment key={id}>
                  {idx > 0 && (
                    <span className="av-view-divider text-slate-300 dark:text-[#1c365a] select-none mx-2.5 sm:mx-3 text-xs opacity-75">
                      |
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setView(id);
                      setDetail(null);
                    }}
                    aria-current={isSelected ? 'page' : undefined}
                    className={`av-subtab-btn relative pb-2.5 pt-1 px-1 text-xs sm:text-[13px] transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'active text-[#005eb8] dark:text-white font-bold'
                        : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    <span>{title}</span>
                    {isSelected && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#005eb8] dark:bg-[#38bdf8] rounded-full" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        )}

        {error && <div role="alert" className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-sm mt-3">{error}</div>}
        {busy && <div role="status" className={panel + ' text-sm text-slate-500 dark:text-[#adbed4] animate-pulse mt-3'}>Reading selected source versions and baseline…</div>}
        {!busy && bundle && (
          <>
            {/* If category has more than 1 subtab, render subtab heading; if only 1 subtab, no need to create subtab heading */}
            <div className={`flex flex-wrap justify-between items-center gap-2 ${Object.keys(areas[area].views).length > 1 ? 'mt-4 mb-3' : 'mt-3 mb-2'}`}>
              {Object.keys(areas[area].views).length > 1 && (
                <h2 className="av-section-title text-lg font-bold text-slate-900 dark:text-white">
                  {areas[area].views[view]}
                </h2>
              )}
              <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full ml-auto">
                Source facts + explicitly partial model
              </span>
            </div>
            {renderers[view]()}
            <section className={panel}><div className="flex flex-wrap justify-between items-center gap-3 mb-3"><h3 className="text-sm font-bold text-slate-900 dark:text-white">Source evidence explorer</h3><div className="flex gap-2"><select aria-label="Evidence source" className={select} value={sourceChoice} onChange={e => setSourceChoice(e.target.value)}>{sourceNames.map(s => <option key={s} value={s} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{label(s)}</option>)}</select><button className={button + ' whitespace-nowrap'} onClick={() => sourceDetail(sourceChoice)}>Inspect rows</button></div></div><textarea aria-label="Decision rationale" value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Decision rationale, conditions for approval, or questions for the submitting team…" className={select + ' min-h-[70px]'} /><p className="text-[10px] text-slate-400 dark:text-[#adbed4] mt-2">Rationale and pinned runs stay in memory across app tabs. Export the decision brief before reloading or closing the page.</p></section>
          </>
        )}
        {detail && <AnalyticsDrawer title={detail.title} eyebrow={detail.diff ? 'Scenario comparison' : detail.issues ? 'Evidence coverage' : 'Source evidence'} subtitle={detail.diff ? 'Understand exactly which source records changed.' : detail.issues ? 'Inspect the checks behind the data-coverage result.' : 'Browse original records and their selected source versions.'} onClose={() => setDetail(null)}>
          {detail.diff ? <AnalyticsDiffBrowser rows={detail.diff} comparison={detail.comparison || {}} query={sourceSearch} onQueryChange={setSourceSearch} onExport={rows => csv('analytics-record-changes.csv', rows)} /> : detail.issues ? <AnalyticsIssueBrowser issues={detail.issues} query={sourceSearch} onQueryChange={setSourceSearch} onExport={rows => csv('analytics-evidence-issues.csv', rows)} onInspect={r => sourceDetail(r.source, r.row ? (data.facts[r.source] || []).filter(x => x.row === r.row) : undefined)} /> : <AnalyticsRecordBrowser key={detail.title} rows={detailRows} columns={sourceColumns} sources={bundle?.sources || {}} sourceKey={detail.source} query={sourceSearch} onQueryChange={setSourceSearch} page={sourcePage} onPageChange={setSourcePage} onExport={rows => csv('analytics-source-evidence.csv', rows.map(r => ({
        input: r.source,
        version: bundle?.sources[r.source]?.version,
        sourceRow: r.row,
        ...r.raw
      })))} />}
        </AnalyticsDrawer>}
    </div>;
}
window.AnalyticsWorkspace = AnalyticsWorkspace;
