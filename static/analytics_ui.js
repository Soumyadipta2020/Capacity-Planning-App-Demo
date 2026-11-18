/* Leadership investigations, backed only by the strict selected-version loader. */
function AnalyticsField({
  title,
  children
}) {
  return <label className="block space-y-1.5"><span className="text-[11px] text-slate-500 font-semibold">{title}</span>{children}</label>;
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
  return <div className="av-data-table"><div className="av-table-toolbar"><div><strong>{title}</strong><span>{filtered.length.toLocaleString()} records{query ? ' matching search' : ''}</span></div>{searchable && <label className="av-search-field"><AnalyticsIcon name="search" size={14} /><input aria-label={'Search ' + title.toLowerCase()} placeholder="Search these records…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="Clear table search"><AnalyticsIcon name="close" size={12} /></button>}</label>}{onRow && <span className="av-table-hint">Select a row to investigate<AnalyticsIcon name="chevron" size={12} /></span>}</div><div className="av-table-scroll"><table><thead><tr>{columns.map(c => {
              const sortable = rows.some(r => ['number', 'string', 'boolean'].includes(typeof r[c.key]));
              return <th key={c.key} aria-sort={sort.key === c.key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}>{sortable ? <button onClick={() => changeSort(c.key)} aria-label={'Sort by ' + c.label}>{c.label}<span className={sort.key === c.key ? 'av-sort-active' : ''}>{sort.key === c.key ? sort.direction === 1 ? '↑' : '↓' : '↕'}</span></button> : c.label}</th>;
            })}</tr></thead><tbody>{filtered.slice(current * pageSize, (current + 1) * pageSize).map((r, i) => <tr key={r.id || i} onClick={() => onRow?.(r)} onKeyDown={e => {
            if (onRow && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRow(r);
            }
          }} tabIndex={onRow ? 0 : undefined} className={onRow ? 'av-selectable-row' : ''}>{columns.map(c => <td key={c.key} data-negative={typeof r[c.key] === 'number' && r[c.key] < 0 ? true : undefined}>{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}</tr>)}</tbody></table>{!filtered.length && <AnalyticsEmpty icon="search" title={rows.length ? 'No records match this search' : 'No records in this scope'} description={rows.length ? 'Try another field or value, or clear the search.' : empty} />}</div>{filtered.length > 0 && <div className="av-browser-pagination"><span>Showing {current * pageSize + 1}–{Math.min((current + 1) * pageSize, filtered.length)} of {filtered.length.toLocaleString()}</span><div><button disabled={!current} onClick={() => setPage(current - 1)}>Previous rows</button><span>{current + 1} / {pages}</span><button disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next rows</button></div></div>}</div>;
}
function AnalyticsWorkspace({
  scenarios,
  selectedScenarioId,
  inputsState,
  onNavigateToInputs,
  onSelectScenario
}) {
  const A = window.CapacityAnalytics;
  const V = window.AnalyticsViz;
  const [scenarioId, setScenarioId] = React.useState(selectedScenarioId);
  const [baselineId, setBaselineId] = React.useState(Object.keys(scenarios).find(id => id !== selectedScenarioId) || selectedScenarioId);
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
  const button = 'px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-40';
  const select = 'w-full border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-xs text-slate-700 focus:ring-2 focus:ring-blue-100';
  const panel = 'analytics-panel';
  const Table = AnalyticsTable;
  const Note = ({
    children
  }) => <div className="text-xs leading-relaxed text-amber-900 bg-amber-50 border border-amber-100 rounded-xl p-3">{children}</div>;
  const Card = ({
    title,
    value,
    sub
  }) => <div className="analytics-metric" style={{
    '--accent': title.toLowerCase().includes('shortfall') ? '#f43f5e' : title.toLowerCase().includes('surplus') ? '#14b8a6' : title.toLowerCase().includes('coverage') ? '#8b5cf6' : '#2563eb'
  }}><p className="av-metric-title whitespace-nowrap truncate">{title}</p><p className="av-metric-value whitespace-nowrap">{value}</p><p className="av-metric-sub whitespace-nowrap truncate">{sub}</p></div>;
  const Field = AnalyticsField;
  const BarList = ({
    rows,
    valueKey = 'value',
    onRow
  }) => {
    const max = Math.max(1, ...rows.map(r => Math.abs(r[valueKey] || 0)));
    return <div className="space-y-2">{rows.slice(0, 15).map((r, i) => <button key={i} onClick={() => onRow?.(r)} className="w-full text-left rounded-lg p-2 hover:bg-blue-50 focus:ring-2 focus:ring-blue-200"><div className="flex justify-between text-xs gap-4 mb-1"><span className="text-slate-600 truncate">{r.name}</span><span className="font-mono font-semibold">{fmt(r[valueKey])}</span></div><div className="h-2 bg-slate-100 rounded-full"><div className="h-2 bg-blue-600 rounded-full" style={{
            width: Math.abs(r[valueKey] || 0) / max * 100 + '%'
          }} /></div></button>)}{!rows.length && <p className="text-sm text-slate-400 py-6">No values in the selected scope.</p>}</div>;
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
      views: {
        deficits: 'Deficit concentration',
        recruitment: 'Recruitment readiness',
        support: 'Support dependence',
        timing: 'Decision timing'
      }
    },
    stress: {
      title: 'Stress & Sensitivity',
      views: {
        stress: 'Combined stress tests',
        sensitivity: 'Sensitivity & breakpoints'
      }
    },
    choices: {
      title: 'Intervention Choices',
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
  const stressControls = <section className={panel}><h3 className="text-sm font-bold mb-1">Test assumptions</h3><p className="text-xs text-slate-400 mb-4">Deterministic changes from the selected source plan. No likelihood is implied.</p><div className="av-controls">{control('demandPct', 'Demand change %', -100, 300)}{control('absencePp', 'Additional roster absence pp', 0, 100)}{control('productivityPct', 'Roster productivity change %', -100, 100)}{control('recruitmentDelay', 'Recruitment delay weeks', 0, 52)}{control('contractorPct', 'Contractor hours change %', -100, 200)}{control('overtimePct', 'Overtime hours change %', -100, 200)}{control('extraHours', 'Additional productive h / cell / week', 0, 10000, 10)}<Field title="Target region for added hours"><select aria-label="Target region for added hours" className={select} value={shock.targetRegion} onChange={e => setShock({
          ...shock,
          targetRegion: e.target.value
        })}>{['All', ...regions].map(s => <option key={s}>{s}</option>)}</select></Field><Field title="Target skill for added hours"><select aria-label="Target skill for added hours" className={select} value={shock.targetSkill} onChange={e => setShock({
          ...shock,
          targetSkill: e.target.value
        })}>{['All', 'HEC', 'KAC', 'EV'].map(s => <option key={s}>{s}</option>)}</select></Field></div><div className="flex flex-wrap gap-2 mt-4"><button className={button} onClick={() => setShock({
        ...shock,
        demandPct: 0,
        absencePp: 0,
        productivityPct: 0,
        recruitmentDelay: 0,
        contractorPct: 0,
        overtimePct: 0,
        extraHours: 0
      })}>Reset shocks</button><button className={button + ' text-blue-700'} onClick={saveRun}>Pin this run</button></div></section>;
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
  return <div className="analytics-workspace space-y-5 pb-8">
        <AnalyticsScopeBar filter={filter} weeks={weeks} regions={regions} patches={patches} scenario={scenarioId} onChange={setFilter} onReset={()=>setFilter({...clearScope})} onUndo={undoFilter} canUndo={filterHistory.current.length>0}/>
        <header className="analytics-hero flex flex-wrap justify-between gap-4 items-start"><div><div className="av-eyebrow">Leadership planning workspace</div><h1 className="text-2xl font-extrabold text-slate-900">Analytics</h1><p className="text-sm text-slate-500 mt-1">Investigate the evidence. Challenge assumptions. Compare decisions.</p></div><div className="flex gap-2"><button className={button} onClick={() => setShowAssumptions(!showAssumptions)}>Model assumptions</button><button className={button} disabled={busy} onClick={() => setRefresh(refresh + 1)}>{busy ? 'Loading…' : 'Refresh sources'}</button><button className={button + ' text-blue-700'} disabled={!bundle || busy} onClick={() => download('analytics-decision-brief.json', JSON.stringify(evidence(), null, 2))}>Export decision brief</button></div><div className="av-hero-meta w-full"><span><i />{sourceNames.filter(k => bundle.sources[k].success).length} / {sourceNames.length || 21} selected sources</span><span><i className="av-amber" />{percent(matchedJobs, jobs)} job-time volume matched</span><span><i />{runs.length} pinned test runs</span><span>12 connected investigations</span></div></header>
        <section className={panel + " av-scope"}><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3"><Field title="Investigate scenario"><select aria-label="Investigate scenario" className={select} value={scenarioId} onChange={e => {
            setScenarioId(e.target.value);
            if (e.target.value !== '__draft') onSelectScenario?.(e.target.value);
            setFilter({
              region: 'All',
              patch: 'All',
              skill: 'All',
              start: '',
              end: ''
            });
          }}>{Object.keys(scenarios).map(id => <option key={id}>{id}</option>)}<option value="__draft">Current draft inputs (unsaved)</option></select></Field><Field title="Saved baseline for changes"><select aria-label="Saved baseline for changes" className={select} value={baselineId} onChange={e => setBaselineId(e.target.value)}>{Object.keys(scenarios).map(id => <option key={id}>{id}</option>)}</select></Field><Field title="Region"><select aria-label="Analytics region" className={select} value={filter.region} onChange={e => setFilter({
            ...filter,
            region: e.target.value,
            patch: 'All'
          })}>{['All', ...regions].map(s => <option key={s}>{s}</option>)}</select></Field><Field title="Skill"><select aria-label="Analytics skill" className={select} value={filter.skill} onChange={e => setFilter({
            ...filter,
            skill: e.target.value
          })}>{['All', 'HEC', 'KAC', 'EV'].map(s => <option key={s}>{s}</option>)}</select></Field></div><AnalyticsDisclosure compact title="Patch & date filters" subtitle="Refine location, skill and planning horizon"><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3"><Field title="Patch (regional cover excluded)"><select aria-label="Analytics patch" className={select} value={filter.patch} onChange={e => setFilter({
              ...filter,
              patch: e.target.value
            })}>{['All', ...patches].map(s => <option key={s}>{s}</option>)}</select></Field><Field title="From week"><select aria-label="Analytics from week" value={filter.start} className={select} onChange={e => setFilter({
              ...filter,
              start: e.target.value,
              end: filter.end && e.target.value > filter.end ? e.target.value : filter.end
            })}><option value="">First available</option>{weeks.map(w => <option key={w}>{w}</option>)}</select></Field><Field title="Through week"><select aria-label="Analytics through week" value={filter.end} className={select} onChange={e => setFilter({
              ...filter,
              end: e.target.value,
              start: filter.start && e.target.value && e.target.value < filter.start ? e.target.value : filter.start
            })}><option value="">Last available</option>{weeks.map(w => <option key={w}>{w}</option>)}</select></Field><div className="flex items-end gap-2"><button className={button} onClick={() => setFilter({
              region: 'All',
              patch: 'All',
              skill: 'All',
              start: '',
              end: ''
            })}>Reset scope</button><button className={button} onClick={onNavigateToInputs}>Open inputs</button></div></div></AnalyticsDisclosure><p className="text-[10px] text-slate-400 mt-3">{bundle ? `Source snapshot: ${new Date(bundle.loadedAt).toLocaleString()} · refresh after edits. Draft input selections are captured when sources load.` : 'Loading exact selected versions; no generated fallback data.'}</p></section>
        {showAssumptions && <AnalyticsAssumptions value={assumptions} onChange={setAssumptions} onClose={() => setShowAssumptions(false)} onReset={() => setAssumptions({
      ...A.defaults
    })} />}
        <nav aria-label="Analytics areas" className="av-area-nav">{Object.entries(areas).map(([id, a], index) => <button key={id} onClick={() => {
        setArea(id);
        setView(Object.keys(a.views)[0]);
        setDetail(null);
      }} aria-current={area === id ? 'page' : undefined}><i>{String(index + 1).padStart(2, '0')}</i><span>{a.title}<small>{Object.keys(a.views).length} {Object.keys(a.views).length === 1 ? 'investigation' : 'investigations'}</small></span></button>)}</nav>
        <nav aria-label="Analytics investigations" className="av-view-nav">{Object.entries(areas[area].views).map(([id, title]) => <button key={id} onClick={() => {
        setView(id);
        setDetail(null);
      }} className={button} aria-current={view === id ? 'page' : undefined}>{title}</button>)}</nav>
        {error && <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">{error}</div>}
        {busy && <div role="status" className={panel + ' text-sm text-slate-500 animate-pulse'}>Reading selected source versions and baseline…</div>}
        {!busy && bundle && <><div className="flex flex-wrap justify-between items-center gap-2"><h2 className="av-section-title text-lg font-bold text-slate-900">{areas[area].views[view]}</h2><span className="text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-full">Source facts + explicitly partial model</span></div>{renderers[view]()}
            <section className={panel}><div className="flex flex-wrap justify-between items-center gap-3 mb-3"><h3 className="text-sm font-bold">Source evidence explorer</h3><div className="flex gap-2"><select aria-label="Evidence source" className={select} value={sourceChoice} onChange={e => setSourceChoice(e.target.value)}>{sourceNames.map(s => <option key={s} value={s}>{label(s)}</option>)}</select><button className={button + ' whitespace-nowrap'} onClick={() => sourceDetail(sourceChoice)}>Inspect rows</button></div></div><textarea aria-label="Decision rationale" value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Decision rationale, conditions for approval, or questions for the submitting team…" className={select + ' min-h-[70px]'} /><p className="text-[10px] text-slate-400 mt-2">Rationale and pinned runs stay in memory across app tabs. Export the decision brief before reloading or closing the page.</p></section>
        </>}
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
