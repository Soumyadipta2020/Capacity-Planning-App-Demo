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
function AnalyticsPlanSummary({model, demand, onExplore, onFocus, scenario, loadedAt, outlook}) {
  const h = window.CapacityAnalytics.planHealth(model, demand);
  const n = v => v === null ? 'Unavailable' : Number(v).toLocaleString('en-GB', {maximumFractionDigits:1});
  const date = v => v ? new Date(v+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'None in assessed groups';
  const metrics = [
    ['Work covered', h.coveredPct===null ? null : n(h.coveredPct)+'%', 'Share of assessed work hours covered in the same region, skill and week. 100% means enough hours in every assessed group.', 'readiness','deficits'],
    ['Hours still needed', h.comparable ? n(h.shortage)+' h' : null, 'Shortage hours added across assessed groups before offsetting any surplus.', 'readiness','deficits'],
    ['Groups needing cover', h.comparable ? h.shortGroups+' / '+h.comparable : null, 'Each group is one region, one skill and one week. Only groups with enough evidence are assessed.', 'readiness','deficits'],
    ['Toughest week', h.comparable ? date(h.peakWeek) : null, h.peakWeek ? n(h.peakShortage)+' shortage hours in the week starting on this date.' : 'Week with the largest combined shortage. No shortage was found in assessed groups.', 'readiness','timing'],
    ['Extra cover reliance', h.extraCoverPct===null || outlook?.extraCoverKnown===false ? null : n(h.extraCoverPct)+'%', 'Overtime and contractor hours as a share of assessed available hours. Unavailable when selected cover files do not provide explicit compatible fields.', 'readiness','support'],
    ['Jobs with time estimates', h.matchedPct===null ? null : n(h.matchedPct)+'%', 'Share of forecast jobs with a matching job duration. Missing durations mean some work cannot be assessed.', 'drivers','quality']
  ];
  const Trend=window.AnalyticsViz?.Trend;
  const weekly=[...new Set(model.rows.map(r=>r.week))].sort().map(week=>{const m=window.CapacityAnalytics.summarize(model.rows.filter(r=>r.week===week));return {key:week,label:week.slice(5),demand:m.comparable?m.demand:null,capacity:m.comparable?m.capacity:null};});
  const names={'Work covered':'Work covered','Hours still needed':'Shortfall','Groups needing cover':'Groups short','Jobs with time estimates':'Job-time match'};
  return <section className="av-plan-summary av-executive-dashboard" aria-label="Plan at a glance">
    <header><div><span className="av-plan-kicker">Decision Studio</span><h2>Plan at a glance</h2></div><span className="av-plan-status" data-tone={!h.comparable?'neutral':h.shortGroups?'risk':'positive'}>{!h.comparable ? 'More data needed' : h.shortGroups ? 'Cover needed' : h.excluded || h.unmatchedJobs>0 ? 'Partial assessment' : 'Assessed groups covered'}</span></header>
    <div className="av-snapshot-line"><span title={scenario}>{scenario==='__draft'?'Draft inputs':scenario}</span><span>{loadedAt?'Updated '+new Date(loadedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'Snapshot unavailable'}</span></div>
    <div className="av-executive-kpis">{[metrics[0],metrics[1],metrics[2],metrics[5]].map(([title,value,help,area,view],i)=><button key={title} type="button" onClick={()=>onExplore(area,view)} aria-label={'Explore '+title.toLowerCase()} title={help} data-tone={i===1&&h.shortage>0?'risk':i===0&&h.coveredPct===100?'positive':'neutral'}><span>{names[title]}<span className="av-kpi-info" aria-hidden="true">i</span></span><strong>{value ?? '—'}</strong><small>{value===null?'No assessable data':i===0?'Assessed work hours':i===1?'Hours needed':i===2?'Region · skill · week':'Forecast jobs with duration'}</small></button>)}</div>
    <div className="av-secondary-stats">{[metrics[3],metrics[4]].map(([title,value,help,area,view])=><button key={title} type="button" onClick={()=>onExplore(area,view)} title={help}><span>{title}</span><strong>{value??'Unavailable'}</strong></button>)}</div>
    <div className="av-executive-body"><div className="av-executive-trend">{Trend&&h.comparable>0?<Trend title="Demand vs available time" subtitle="Assessed groups · hours" data={weekly} unit="h" series={[{key:'demand',label:'Demand',color:'#3b82f6'},{key:'capacity',label:'Capacity',color:'#10b981'}]}/>:<div className="av-chart-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 17l6-6 4 3 8-10M15 4h6v6"/></svg><strong>Capacity outlook unavailable</strong><span>Complete matching demand and staffing inputs to see the trend.</span><button type="button" onClick={()=>onExplore('drivers','quality')}>Review inputs</button></div>}</div><aside className="av-decision-card"><span className="av-plan-kicker">Priority insight</span><h3>{!h.comparable?'Complete the evidence':h.shortGroups?'Close the local gaps':'Validate your cover'}</h3><p>{!h.comparable?'Demand and capacity cannot yet be compared.':h.shortGroups?`${n(h.shortage)} hours short across ${h.shortGroups} assessed groups.`:'Assessed work is covered under current assumptions.'}</p><div className="av-evidence-mini"><span>Unassessed groups<strong>{h.excluded} / {h.total}</strong></span><span>Jobs missing durations<strong>{n(h.unmatchedJobs)}</strong></span></div><div className="av-plan-actions">{h.worst&&<button className="av-primary-action" type="button" title={`${h.worst.region} · ${h.worst.skill} · ${date(h.worst.week)}`} onClick={()=>{onFocus(h.worst);onExplore('readiness','deficits');}}>Investigate largest gap: {h.worst.region} · {h.worst.skill}</button>}<button type="button" onClick={()=>onExplore('drivers','quality')}>Check missing data</button><button type="button" onClick={()=>onExplore('stress','stress')}>Test a change in demand</button></div></aside></div>
    <p className="av-dashboard-footnote">Planning estimate · Assessed groups only · Missing evidence can hide shortages.</p>
    <details className="av-plan-help"><summary>What do these metrics mean?</summary><div><dl className="av-metric-definitions">{metrics.map(([title,value,help])=><div key={title}><dt>{title}</dt><dd>{help}</dd></div>)}</dl><p><strong>Demand</strong> is expected work. <strong>Capacity</strong> is available working time. <strong>FTE</strong> measures full-time equivalent working time, not necessarily people. A <strong>baseline</strong> is the saved comparison plan. Recruitment is excluded unless enabled in Model Assumptions.</p></div></details>
  </section>;
}

function AnalyticsWorkloadOutlook({report:r, planningDate, onDateChange, onExplore, onSource, mode='all'}) {
  const n = v => v===null || v===undefined ? 'Unavailable' : Number(v).toLocaleString('en-GB',{maximumFractionDigits:1});
  const date = v => new Date(v+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const checks=r.readiness.filter(x=>!x.ready).length;
  const Trend=window.AnalyticsViz?.Trend;
  const chartWeeks=[];r.weekly.forEach((w,i)=>{if(i&&window.CapacityAnalytics.addWeeks(r.weekly[i-1].name,1)!==w.name)chartWeeks.push({key:window.CapacityAnalytics.addWeeks(r.weekly[i-1].name,1),label:'Gap',jobs:null});chartWeeks.push({key:w.name,label:w.name.slice(5),jobs:w.jobs});});
  const mix=(title,items,kind)=><section className="av-workload-breakdown"><h3>{title}</h3><p>Share of upcoming jobs.</p>{items.length ? <ul>{items.slice(0,kind==='patch'?5:items.length).map(x=><li key={x.name}><div><strong>{x.name}</strong><span>{n(x.jobs)} jobs · {n(x.share)}%</span></div><meter min="0" max="100" value={x.share??0} aria-label={x.name+' share of forecast jobs'}/></li>)}</ul>:<p>No valid upcoming forecast jobs in this scope.</p>}{kind==='patch'&&r.totalJobs>0&&<p><strong>The top {r.topPatchCount} of {r.patches.length} locations account for {n(r.top5Share)}% of work.</strong> High volume does not itself mean a shortage.</p>}{kind==='skill'&&<p>Source skill codes.</p>}</section>;
  return <section className="av-plan-summary av-workload-outlook" aria-label={mode==='checks'?'Data readiness':'Upcoming workload'}>
    <header><div><span className="av-plan-kicker">{mode==='checks'?'Input health':'Demand outlook'}</span><h2>{mode==='checks'?'Data readiness':'Upcoming workload'}</h2><p>From {date(r.anchor)} · Current filters · Full current week</p></div><label className="av-planning-date">Planning date<input type="date" aria-label="Workload planning date" value={planningDate} onChange={e=>e.target.value&&onDateChange(e.target.value)}/></label></header>
    {mode!=='checks'&&<>
    <div className="av-plan-metrics">
      <button type="button" onClick={()=>onExplore('drivers','demand')}><span>Next four weeks</span><strong>{r.next4.some(x=>x.jobs!==null)?n(r.next4Jobs):'—'}</strong><small>{r.next4Complete?'Forecast jobs · 4 weeks':`${r.next4.filter(x=>x.jobs!==null).length}/4 weeks · partial total`}</small></button>
      <button type="button" onClick={()=>onExplore('readiness','timing')} title={r.peak?'Uplift vs average of submitted upcoming weeks; demand peak, not a capacity shortage.':'No valid upcoming forecast.'}><span>Busiest demand week</span><strong>{r.peak?date(r.peak.name):'—'}</strong><small>{r.peak?`${n(r.peak.jobs)} jobs · ${n(r.peakUplift)}% above average`:'No upcoming forecast'}</small></button>
      <button type="button" onClick={()=>onExplore('drivers','quality')}><span>Unmapped jobs</span><strong>{r.totalJobs>0?n(r.unmappedJobs):'—'}</strong><small>{r.unmappedPct===null?'No upcoming forecast':`${n(r.unmappedPct)}% without a region match`}</small></button>
    </div>
    {Trend&&r.weekly.length>0&&<div className="av-workload-visuals"><div className="av-workload-chart"><Trend title="Weekly job forecast" subtitle="Submitted upcoming weeks" unit="jobs" data={chartWeeks} series={[{key:'jobs',label:'Forecast jobs',color:'#3b82f6'}]}/></div>{mix('Work by skill',r.skills,'skill')}</div>}
    <details className="av-plan-help"><summary>Location concentration</summary><div>{mix('Where work is concentrated',r.patches,'patch')}</div></details>
    <details className="av-plan-help"><summary>Weekly detail and how this is calculated</summary><div><table className="av-outlook-table"><caption>Four calendar weeks from the planning week</caption><thead><tr><th scope="col">Week starting</th><th scope="col">Forecast jobs</th></tr></thead><tbody>{r.next4.map(w=><tr key={w.week}><td>{date(w.week)}</td><td>{w.jobs===null?'Not submitted':n(w.jobs)}</td></tr>)}</tbody></table><p>Only valid, dated, nonduplicate demand records are counted. {r.excludedDemandRows} invalid, duplicate or undated demand rows were excluded in the current filters. A missing week is unknown; an explicitly submitted zero remains zero. Date, region, patch and skill filters all apply. Peak uplift uses submitted upcoming weeks only.</p></div></details>
    <details className="av-plan-help"><summary>When should we act? Shortages and cover withdrawal</summary><section className="av-plan-next av-capacity-next" aria-label="Capacity action outlook"><div><h3>When should we act?</h3><p>{!r.assessedGroups?'No upcoming groups can be assessed for capacity. Resolve the data checks before deciding that the plan has enough cover.':r.firstShortage?`First assessed shortage: week starting ${date(r.firstShortage)} (${r.weeksToFirst} weeks from the planning week).`:'No shortage was found in assessed upcoming groups under current assumptions.'} {r.unassessedGroups} upcoming groups remain unassessed.</p>{r.firstShortage&&<p>Assumed time to full effect: recruitment {n(r.leadWeeks.recruitment)} weeks including ramp-up; training {n(r.leadWeeks.training)} weeks; support {n(r.leadWeeks.support)} weeks. {r.weeksToFirst<r.leadWeeks.recruitment?'The first shortage arrives before the assumed recruitment ramp can finish. Review a faster response.':'Check that recruitment and other commitments can be delivered on time.'} These are planning assumptions, not confirmed commitments.</p>}<p><strong>Persistent shortages:</strong> {!r.assessedGroups?'Unavailable.':r.persistent.length?`${r.persistent.length} region/skill groups have at least two consecutive assessed shortage weeks. The longest run is ${r.persistent[0].longest} weeks in ${r.persistent[0].region} / ${r.persistent[0].skill}.`:'No consecutive shortage run found in assessed upcoming groups.'}</p><p><strong>If overtime and contractor cover disappear:</strong> {r.additionalShortage===null?'Impact is unavailable until explicit cover fields and assessable capacity are present.':`${n(r.additionalShortage)} additional shortage hours across the same ${r.assessedGroups} assessed groups. This removes modeled overtime and contractors together; it does not predict supplier failure.`}</p></div><div className="av-plan-actions"><button type="button" onClick={()=>onExplore('readiness','deficits')}>Review shortages</button><button type="button" onClick={()=>onExplore('readiness','support')}>Review extra cover</button><button type="button" onClick={()=>onExplore('choices','actions')}>Compare possible responses</button></div></section></details>
    </>}
    {mode!=='workload'&&<details className="av-plan-help av-readiness-checks" open={mode==='checks'}><summary>{r.readiness.length-checks}/{r.readiness.length} checks passed · {checks} to review</summary><div><p className="av-dashboard-footnote">Compatibility checks · Data accuracy and capacity are not certified.</p><ul>{r.readiness.map(c=><li key={c.source}><details className="av-check-row"><summary><span className="av-check-symbol" data-ready={c.ready}>{c.ready?'✓':'!'}</span><strong>{c.title}</strong><span className="av-check-status" data-ready={c.ready}>{c.ready?'Passed':'Review'}</span><span className="av-check-details">Details</span></summary><div><p>{c.detail}</p><button type="button" onClick={()=>onSource(c.source)}>Inspect {c.title.toLowerCase()}</button></div></details></li>)}</ul></div></details>}
  </section>;
}

const ANALYTICS_QUESTIONS = {
  demand:['How much work is expected?', 'Jobs are the expected tasks. Hours use only jobs with matching durations. Start by checking how much of the forecast has a time estimate.'],
  capacity:['How much time is available?', 'See which parts of the resource plan, overtime and contractor cover contribute available hours. Review the assumptions before treating hours as confirmed.'],
  downtime:['How much working time is lost?', 'Downtime is time unavailable for planned work. The three input formats describe alternative ways to record it.'],
  changes:['What changed between plans?', 'Compare selected input contents with the saved comparison plan. A new filename alone does not mean the data changed.'],
  quality:['Can we trust the inputs?', 'Check missing files, unmatched job durations and flagged records first. Missing evidence means an unknown result, not zero work.'],
  deficits:['Where do we need more cover?', 'Look for shortages by region, skill and week. Each group is assessed separately.'],
  recruitment:['When will new starters help?', 'Review intake dates and training time. New starters contribute to the model only when recruitment is explicitly enabled.'],
  support:['How dependent are we on extra cover?', 'Inspect overtime and contractors, then check what happens without them. Source hours are not a guarantee that cover will arrive.'],
  timing:['When is pressure highest?', 'Find the weeks needing attention and compare them with the time needed for an intervention to take effect.'],
  stress:['What if the plan changes?', 'Try a demand increase or capacity loss. The source plan stays unchanged; the test shows an estimate under your chosen assumptions.'],
  sensitivity:['Which changes hurt most?', 'Compare separate tests to see which deserves attention. These are different planning scenarios, not probabilities of what will happen.'],
  actions:['Which response could help?', 'Compare possible interventions in the same scope. Check timing, donor capacity and feasibility before committing to a response.'],
  target:['How much extra cover would meet our target?', 'Choose a coverage target and inspect the additional productive time required. Required FTE is not automatically the number of hires.'],
  commitments:['What if promised cover falls through?', 'Review supplier concentration and recruitment timing, then test a delay or withdrawal.'],
  stability:['How much room does the plan have?', 'Find groups with shortages or limited capacity before testing a demand increase.'],
  jobtime:['Are job durations reasonable?', 'Compare durations for similar work. Missing or inconsistent time estimates can distort the forecast hours.'],
  workforce:['How do staff movements affect cover?', 'Review start dates, departures and transfers. Confirm date assumptions before counting movements as available time.'],
  reconcile:['Do the inputs agree?', 'Check overlapping or conflicting records before adding staffing, recruitment or downtime figures together.'],
  monthly:['How does the outlook change by month?', 'Review monthly demand and shortages. Unmapped weeks stay visible so missing calendar data cannot hide work.']
};
function decisionPeriodLabel(period, short = false) {
  if (period.length===4) return period;
  if (period.length===10) return new Date(period+'T00:00:00Z').toLocaleDateString('en-GB',{
    day:'numeric',month:'short',year:short?'2-digit':'numeric',timeZone:'UTC'
  });
  if (period.includes('-Q')) return period.slice(5)+' '+(short ? period.slice(2,4) : period.slice(0,4));
  return new Date(period+'-01T00:00:00Z').toLocaleDateString('en-GB',{
    month:short?'short':'long',year:short?'2-digit':'numeric',timeZone:'UTC'
  });
}

function decisionPeriods(A, weeks, interval) {
  const observed = [...new Set(weeks)].sort();
  if (!observed.length) return [];
  const periods = new Set(observed.map(week=>A.calendarPeriod(week,interval)));
  if (interval==='week') {
    for (let week=observed[0];week<=observed.at(-1);week=A.addWeeks(week,1)) periods.add(week);
  } else {
    const end = observed.at(-1).slice(0,7);
    for (let month=observed[0].slice(0,7);month<=end;) {
      periods.add(A.calendarPeriod(month,interval));
      const next = new Date(month+'-01T00:00:00Z');
      next.setUTCMonth(next.getUTCMonth()+1);
      month=next.toISOString().slice(0,7);
    }
  }
  return [...periods].sort();
}

function DecisionStudioPeriodControls({A, weeks, filter, setFilter}) {
  const months = [...new Set(weeks.map(week=>A.calendarPeriod(week)))].sort();
  const years = [...new Set(months.map(month=>month.slice(0,4)))];
  const startMonth = filter.start?.slice(0,7) || '';
  const endMonth = filter.end?.slice(0,7) || '';
  const activeYear = startMonth && endMonth && startMonth.slice(0,4)===endMonth.slice(0,4) ? startMonth.slice(0,4) : '';
  const visibleMonths = months.filter(month=>!activeYear || month.startsWith(activeYear));
  const setMonth = (key, month) => {
    const next = {...filter,[key]:A.calendarBounds(month)?.[key] || ''};
    if (next.start && next.end && next.start>next.end) Object.assign(next,A.calendarBounds(month));
    setFilter(next);
  };
  const monthPicker = (label,key,value) => <label>{label}<select aria-label={label} value={value}
    onChange={event=>setMonth(key,event.target.value)} disabled={!months.length}>
    <option value="">{key==='start'?'First available':'Last available'}</option>
    {[...new Set([...visibleMonths,value].filter(Boolean))].sort().map(month=><option key={month} value={month}>{decisionPeriodLabel(month)}</option>)}
  </select></label>;
  return <div className="ds-period-controls">
    <label>Planning year<select aria-label="Planning year" value={activeYear} disabled={!years.length}
      onChange={event=>setFilter({...filter,...(A.calendarBounds(event.target.value) || {start:'',end:''})})}>
      <option value="">All years</option>
      {[...new Set([...years,activeYear].filter(Boolean))].sort().map(year=><option key={year}>{year}</option>)}
    </select></label>
    {monthPicker('From month','start',startMonth)}
    {monthPicker('Through month','end',endMonth)}
  </div>;
}

function DecisionStudioMonthlyWorkload({A, V, data, filter, setFilter}) {
  const groups = new Map();
  for (const row of data.facts.demand_input || []) {
    if (!row.week || row.jobs===null || !A.inScope(row,filter)) continue;
    const period = A.calendarPeriod(row.week);
    groups.set(period,(groups.get(period) || 0)+row.jobs);
  }
  const chart = [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,jobs])=>({key,label:decisionPeriodLabel(key,true),jobs}));
  return <div className="ds-overview-chart">
    <V.Trend title="Forecast work by month" subtitle="Jobs in the selected geography, skill and planning period"
      data={chart} series={[{key:'jobs',label:'Forecast jobs',bar:true,color:'#6595e8'}]} unit="jobs"
      actionLabel="Select a month" onSelect={row=>setFilter({...filter,...A.calendarBounds(row.key)})}/>
  </div>;
}

function DecisionStudioResponsiveTrend({Trend, data, measure, ...props}) {
  const container = React.useRef(null);
  const [width,setWidth] = React.useState(700);
  React.useEffect(()=>{
    const plot = container.current?.querySelector('svg.av-trend-svg');
    if (!plot || typeof ResizeObserver==='undefined') return;
    const observer = new ResizeObserver(([entry])=>setWidth(Math.max(240,Math.round(entry.contentRect.width))));
    observer.observe(plot);
    return ()=>observer.disconnect();
  },[data.length>0]);
  return <div className="ds-overview-chart" data-measure={measure} ref={container}>
    <Trend data={data} plotWidth={width} {...props}/>
  </div>;
}

function DecisionStudioDemandTrend({Trend, chart, periodSwitch, periodLabel, focusedPeriod, setFocusedPeriod}) {
  return <DecisionStudioResponsiveTrend Trend={Trend} title="Demand and available capacity"
      tools={periodSwitch} subtitle="Hours by planning period" actionLabel={'Select a '+periodLabel+' to filter'}
      data={chart} selectedKey={focusedPeriod} onClearSelection={()=>setFocusedPeriod('')} series={[
        {key:'demand',label:'Required hours',color:'var(--ds-chart-demand)',bar:true},
        {key:'capacity',label:'Available capacity',color:'var(--ds-chart-capacity)'}
      ]} onSelect={row=>setFocusedPeriod(old=>old===row.key?'':row.key)}/>;
}

const decisionMeasures = [
  ['jobs','Forecast jobs','jobs'], ['demand','Required hours','h'], ['roster','Roster hours','h'],
  ['capacity','Available capacity','h'], ['fte','Allocated FTE','FTE'], ['downtime','Downtime','h'],
  ['shortage','Gross shortfall','h'], ['gap','Capacity imbalance','h']
];
const decisionMeasure = key => decisionMeasures.find(([id])=>id===key);
const decisionValue = (key,value,format) => value==null ? 'Unavailable' : format(value)+' '+decisionMeasure(key)[2];
const decisionSigned = (value,format) => {
  const absolute = Math.round(Math.abs(value)*10)/10;
  return (absolute===0 ? '' : value<0 ? '−' : '+')+format(absolute);
};
const decisionChange = (key,value,format) => value==null ? 'Unavailable'
  : decisionSigned(value,format)+' '+decisionMeasure(key)[2];

function moveDecisionMatrixFocus(event) {
  const offsets = {ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]};
  if (!offsets[event.key] && !['Home','End'].includes(event.key)) return;
  const cell = event.currentTarget.closest('td');
  const row = cell.parentElement;
  const rows = row.parentElement.rows;
  const [vertical,horizontal] = offsets[event.key] || [0,0];
  const targetRow = rows[row.sectionRowIndex+vertical];
  const index = event.key==='Home' ? 1 : event.key==='End' ? row.cells.length-1 : cell.cellIndex+horizontal;
  event.preventDefault();
  targetRow?.cells[index]?.querySelector('button.ds-matrix-cell')?.focus();
}

function DecisionStudioOverview({A, V, data, bundle, scenarios, scenarioId, setScenarioId, filter,
  setFilter, clearScope, undoFilter, canUndo, assumptions, busy, onChecks, onImbalance,
  baseline, baselineId, setBaselineId, comparisonEnabled, setComparisonEnabled, baseData, geographyChanges, presentation}) {
  const imbalance = presentation==='imbalance';
  const [view,setView] = React.useState(imbalance?'matrix':'table');
  const [measure,setMeasure] = React.useState('gap');
  const [showPlanValues,setShowPlanValues] = React.useState(false);
  const [interval, setInterval] = React.useState('month');
  const [locationLevel,setLocationLevel] = React.useState('auto');
  const [periodsOnRows,setPeriodsOnRows] = React.useState(false);
  const [drillBy,setDrillBy] = React.useState('');
  const [matrixExpanded,setMatrixExpanded] = React.useState({});
  const [,measureLabel,measureUnit] = decisionMeasure(measure);
  const breakdownLabel = {downtime:'Downtime category',fte:'Skill and labour type',roster:'Skill and labour type',
    jobs:'Skill and work code',demand:'Skill and work code',capacity:'Capacity component'}[measure];
  const hasProduct = ['jobs','demand'].includes(measure) &&
    [data,baseData].some(input=>input.facts.demand_input?.some(row=>row.n.product));
  const drillOptions = {...(breakdownLabel ? {breakdown:breakdownLabel} : {}),geography:'Geography',
    skill:interval==='week'?'Skill':'Skill and week',...(hasProduct ? {product:'Product and work code'} : {})};
  const matrixDrill = Object.hasOwn(drillOptions,drillBy) ? drillBy : breakdownLabel?'breakdown':'geography';
  const [groupBy, setGroupBy] = React.useState('month');
  const [allColumns,setAllColumns] = React.useState(false);
  const [expanded, setExpanded] = React.useState({});
  const [focusedPeriod, setFocusedPeriod] = React.useState('');
  const [metric, setMetric] = React.useState(null);
  const [filtersOpen, setFiltersOpen] = React.useState(true);
  const [shortfallsOnly, setShortfallsOnly] = React.useState(false);
  const model = React.useMemo(() => A.model(data, filter, assumptions, {}, true), [data, filter, assumptions]);
  const baselineRows = React.useMemo(() => comparisonEnabled && baseline && baselineId!==scenarioId
    ? A.model(baseData, filter, assumptions, {}, true).rows : null,
    [comparisonEnabled, baseline, baselineId, scenarioId, baseData, filter, assumptions]);
  const inFocus = React.useCallback(row => !focusedPeriod || A.calendarPeriod(row.week,interval)===focusedPeriod,
    [A,focusedPeriod,interval]);
  const beforeRows = React.useMemo(()=>baselineRows?.filter(inFocus),[baselineRows,inFocus]);
  React.useEffect(() => {setFocusedPeriod('');setExpanded({});setMetric(null);}, [filter, scenarioId]);
  React.useEffect(() => {
    setView(imbalance?'matrix':'table');
    setMeasure('gap');
    setShowPlanValues(false);
    setFocusedPeriod('');
    setShortfallsOnly(false);
    setMetric(null);
  }, [presentation]);
  React.useEffect(()=>setShowPlanValues(false),[scenarioId,baselineId]);
  const format = value => value == null ? 'Unavailable' : new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(value);
  const signedHours = value => value==null ? '—' : decisionSigned(value,format);
  const gapLabel = gap => {
    if (gap == null) return 'Unavailable';
    if (Math.abs(gap) < 1e-8) return 'Balanced';
    return (gap < 0 ? 'Short ' : '+') + format(Math.abs(gap)) + ' h';
  };
  const tableMeasures = allColumns ? decisionMeasures : ['fte','downtime','capacity','demand','gap'].map(decisionMeasure);
  const metrics = tableMeasures.map(([key,label,unit])=>[
    key,key==='gap'?'Gap (h)':key==='capacity'?'Available (h)':key==='demand'?'Required (h)':unit==='h'?label+' (h)':label
  ]);
  const selected = key => filter[key] && filter[key] !== 'All';
  const scopeLevel = selected('patch') ? 'patch' : selected('area') ? 'area' : 'region';
  const rows = React.useMemo(()=>model.rows.filter(inFocus),[model,inFocus]);
  const scopedTotals = React.useMemo(()=>A.planningSummary(rows,scopeLevel,assumptions),[A,rows,scopeLevel,assumptions]);
  const patchAssessment = scopeLevel!=='patch' && !scopedTotals.comparable && rows.some(row=>row.patch && row.comparable);
  const level = patchAssessment ? 'patch' : scopeLevel;
  const summary = cells => A.planningSummary(cells,level,assumptions);
  const totals = React.useMemo(()=>patchAssessment ? A.planningSummary(rows,'patch',assumptions) : scopedTotals,
    [A,rows,assumptions,patchAssessment,scopedTotals]);
  const geography = [...data.geography.values()];
  const options = values => [...new Set(values.filter(Boolean))].sort();
  const regions = options(geography.map(row=>row.region).concat(model.rows.map(row=>row.region)));
  const locations = geography.filter(row=>!selected('region') || row.region===filter.region);
  const areas = options(locations.map(row=>row.area));
  const patches = options(locations.filter(row=>!selected('area') || row.area===filter.area).map(row=>row.patch));
  const skills = options(Object.values(data.facts).flat().filter(row=>A.inScope(row,{...filter,skill:'All',start:'',end:''})).map(row=>row.skill));
  const change = (key, value) => {
    const next = {...filter, [key]:value};
    if (key === 'region') Object.assign(next,{area:'All',patch:'All',skill:'All'});
    if (key === 'area') Object.assign(next,{patch:'All',skill:'All'});
    if (key === 'patch') next.skill = 'All';
    if (key === 'start' && next.end && next.end < value) next.end = value;
    if (key === 'end' && next.start && next.start > value) next.start = value;
    setFilter(next);
  };
  const choose = (label,key,values) => <label>{label}<select aria-label={label} value={filter[key] || 'All'} onChange={e=>change(key,e.target.value)}>
    <option value="All">All {key==='patch'?'patches':key+'s'}</option>{values.map(v=><option key={v}>{v}</option>)}
  </select></label>;
  const rowValue = (row,key) => ['month','quarter','year'].includes(key)
    ? A.calendarPeriod(row.week,key) : row[key] || '';
  const split = (cells,key) => {
    const groups = new Map();
    for (const cell of cells) {
      const value = rowValue(cell,key);
      if (!groups.has(value)) groups.set(value,[]);
      groups.get(value).push(cell);
    }
    return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b));
  };
  const visibleRows = [];
  function addRows(cells, baselineCells, key, parent = '', depth = 0) {
    const planGroups = new Map(split(cells,key));
    const baselineGroups = new Map(split(baselineCells || [],key));
    const keys = [...new Set([...planGroups.keys(),...baselineGroups.keys()])].sort((a,b)=>a.localeCompare(b));
    for (const value of keys) {
      const group = planGroups.get(value) || [];
      const previous = baselineGroups.get(value) || [];
      const combined = [...group,...previous];
      const id = JSON.stringify([parent,key,value]);
      const title = ['month','quarter'].includes(key) ? decisionPeriodLabel(value)
        : key==='region' ? (value==='Unmapped' ? value : 'Region '+value)
        : value || (key==='area' ? 'Area unavailable / regional inputs' : 'Patch unavailable / unallocated');
      const childKey = key==='quarter' ? 'month' : key==='month' ? 'week'
        : key==='region' ? (combined.some(row=>row.area) ? 'area' : 'patch') : key==='area' ? 'patch' : null;
      const children = childKey && combined.some(row=>rowValue(row,childKey));
      const assessment = ['region','area','patch'].includes(key) ? key : level;
      visibleRows.push({id,title,depth,children,report:A.planningSummary(group,assessment,assumptions),
        removed:!group.length && !!previous.length,
        before:baselineCells ? A.planningSummary(previous,assessment,assumptions) : null});
      if (children && expanded[id]) addRows(group,baselineCells ? previous : null,childKey,id,depth+1);
    }
  }
  if (view==='table') addRows(rows,beforeRows,groupBy==='geography' ? level : groupBy);
  const planningWeeks = React.useMemo(()=>[...new Set([...data.weeks,...(baselineRows ? baseData.weeks : [])])].sort(),
    [data.weeks,baselineRows,baseData.weeks]);
  const periodList = React.useMemo(()=>{
    const observed = planningWeeks.filter(week=>(!filter.start || week>=filter.start)&&(!filter.end || week<=filter.end));
    return decisionPeriods(A,observed,interval).map(key=>({key,label:decisionPeriodLabel(key,true)}));
  },[A,filter.start,filter.end,interval,planningWeeks]);
  const visiblePeriods = React.useMemo(()=>periodList.filter(period=>!focusedPeriod || period.key===focusedPeriod),
    [periodList,focusedPeriod]);
  const chart = React.useMemo(()=>{
    if (imbalance) return [];
    const byPeriod = new Map(split(model.rows,interval));
    return periodList.map(period=>{
      const result = A.planningSummary(byPeriod.get(period.key) || [],level,assumptions);
      return {...period,capacity:result.capacity,demand:result.demand};
    });
  },[A,imbalance,periodList,model,interval,level,assumptions]);
  const trend = view==='trend' ? visiblePeriods.map(period=>{
    const matches = row=>A.calendarPeriod(row.week,interval)===period.key;
    const report = summary(model.rows.filter(matches));
    const before = baselineRows ? summary(baselineRows.filter(matches)) : null;
    return {...period,report,before,plan:A.planningMeasures(report)[measure],
      baseline:before ? A.planningMeasures(before)[measure] : null};
  }) : [];
  const defaultPlace = selected('patch') || selected('area') || (selected('region') && !areas.length) ? 'patch'
    : selected('region') ? 'area' : 'region';
  const placeKey = locationLevel==='auto'
    ? (patchAssessment && ['gap','shortage'].includes(measure) ? 'patch' : defaultPlace)
    : locationLevel;
  const placeLabel = {region:'Region',area:'Area',patch:'Patch'}[placeKey];
  const periodLabel = {week:'Week commencing',month:'Month',quarter:'Quarter',year:'Year'}[interval];
  const patchGaps = A.planningSummary(rows.filter(row=>row.patch),'patch',assumptions).assessed.filter(group=>group.gap<0);
  const priorityLevel = patchGaps.length ? 'patch' : level;
  const shortages = patchGaps.length ? patchGaps : totals.assessed.filter(group=>group.gap<0);
  const priorities = shortages.sort((a,b)=>a.gap-b.gap || a.week.localeCompare(b.week)).slice(0,3);
  const openMetric = (key, report, title, before,detail,matrixChange,sourceBundle) =>
    setMetric({key,title,report,before,detail,matrixChange,sourceBundle,scope:[
      selected('region') && 'Region '+filter.region, selected('area') && filter.area,
      selected('patch') && filter.patch, selected('skill') && filter.skill, filter.start,filter.end
    ].filter(Boolean).join(' · '),
    impact:before && key==='gap' ? A.planningImpact(before,report,geographyChanges,assumptions) : null});
  const periodSwitch = label => <div className="ds-period-switch" role="group" aria-label={label}>
    {Object.entries({week:'Weekly',month:'Monthly',quarter:'Quarterly',year:'Yearly'}).map(([unit,name])=>
      <button key={unit} type="button" aria-pressed={interval===unit}
        onClick={()=>{setInterval(unit);setFocusedPeriod('');}}>{name}</button>)}
  </div>;
  const scopeNote = [
    selected('region') && 'Region '+filter.region, selected('area') && 'Area '+filter.area,
    selected('patch') && 'Patch '+filter.patch,
    selected('skill') && 'Skill '+filter.skill, comparisonEnabled && baselineId!==scenarioId && 'Compared with '+baselineId,
    bundle && !areas.length && 'Area mapping unavailable',
    (filter.start || filter.end) && [filter.start || 'First date',filter.end || 'Last date'].join(' → ')
  ].filter(Boolean).join(' · ');
  const periodTitle = focusedPeriod ? decisionPeriodLabel(focusedPeriod) : 'Planning horizon';
  const priorityList = <section className="ds-panel ds-priorities" aria-label="Where cover is needed">
    <h2><span className="ds-chart-icon"><AnalyticsIcon name="alert" size={15}/></span>Where cover is needed</h2>
    {priorities.length ? <>
      <p className="ds-context">Largest weekly shortages by {priorityLevel} and skill</p>
      <ul>{priorities.map(group=>{
        const place = priorityLevel==='patch' ? group.patch : priorityLevel==='area' ? group.area : 'Region '+group.region;
        const date = new Date(group.week+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
        return <li key={group.id}><button type="button" onClick={()=>{
          const before = beforeRows?.filter(row=>row.week===group.week && row.region===group.region && row.skill===group.skill &&
            (priorityLevel==='region' || row.area===group.area) && (priorityLevel!=='patch' || row.patch===group.patch));
          openMetric('gap',A.planningSummary(group.cells,priorityLevel,assumptions),
            [place,group.skill,'Week of '+date].join(' · '),before && A.planningSummary(before,priorityLevel,assumptions));
        }}>
          <span><strong>{place} · {group.skill}</strong><small>Week of {date}</small></span>
          <b>{format(-group.gap)} h short</b><AnalyticsIcon name="chevron" size={15}/>
        </button></li>;
      })}</ul>
    </> : <p className="ds-context">{totals.comparable ? 'No shortage found in the assessed weeks.' : 'Available and required hours could not be compared for these weeks.'}</p>}
    {!imbalance && <button type="button" className="ds-all-locations" onClick={onImbalance}>View imbalance by location <AnalyticsIcon name="chevron" size={14}/></button>}
  </section>;
  const matrixPeriods = visiblePeriods;
  const showMatrixChange = !!beforeRows;
  const [focusedCell, setFocusedCell] = React.useState(null);
  const matrixRows = React.useMemo(()=>{
    const matrixRows = [];
    if (view!=='matrix') return matrixRows;
    const openRow = id => !!matrixExpanded[id];
    const locationValues = (cells, key) => {
      if (key==='region') return [cells.region];
      if (key==='area') return [cells.region,cells.area];
      return [cells.region,cells.area,cells.patch];
    };
    const bucket = (plan, baselineCells, getKey) => {
      const groups = new Map();
      for (const [side,cells] of [['plan',plan],['baseline',baselineCells]]) {
        for (const cell of cells) {
          const keys = getKey(cell);
          const id = JSON.stringify(keys);
          if (!groups.has(id)) groups.set(id,{id,label:keys.at(-1),plan:[],baseline:[]});
          groups.get(id)[side].push(cell);
        }
      }
      return [...groups.values()].sort((a,b)=>(a.label || '').localeCompare(b.label || ''));
    };
    const byPeriod = cells => {
      const result = new Map();
      for (const cell of cells) {
        const key = A.calendarPeriod(cell.week,interval);
        if (!result.has(key)) result.set(key,[]);
        result.get(key).push(cell);
      }
      return result;
    };
    function appendBreakdown(parent, depth, path, periods) {
      const paths = new Map();
      for (const cell of periods) for (const groups of [cell.planParts,cell.baseParts]) {
        for (const [id,group] of groups) {
          if (group.path.length===path.length+1 && path.every((label,index)=>label===group.path[index])) paths.set(id,group.path);
        }
      }
      for (const [key,labels] of [...paths].sort((a,b)=>a[1].at(-1).localeCompare(b[1].at(-1)))) {
        const label = labels.at(-1);
        const id = parent.id+'/'+key;
        const hasChildren = periods.some(({planParts,baseParts})=>[planParts,baseParts].some(groups=>
          [...groups.values()].some(group=>group.path.length>labels.length && labels.every((text,index)=>text===group.path[index]))));
        const title = parent.title+' · '+label;
        const cells = periods.map(cell=>{
          const plan = cell.planParts.get(key), baselinePart = cell.baseParts.get(key);
          const componentValue = (report,part) => part ? part.value
            : report && A.planningMeasures(report)[measure]!=null ? 0 : null;
          const planValue = componentValue(cell.report,plan);
          const baseValue = componentValue(cell.before,baselinePart);
          const value = showMatrixChange
            ? (cell.value==null || planValue==null || baseValue==null ? null : planValue-baseValue)
            : planValue;
          return {...cell,title:title+' · '+decisionPeriodLabel(cell.period.key),value,detail:{
            planValue,baseValue,value,title,planEvidence:plan?.evidence || [],baselineEvidence:baselinePart?.evidence || []
          }};
        });
        const row = {id,label,title,depth,hasChildren,cells};
        matrixRows.push(row);
        if (hasChildren && openRow(id)) appendBreakdown(row,depth+1,labels,periods);
      }
    }
    function appendLocation(group, assessment, label, title, id, depth, next, parentCells) {
      const plan = byPeriod(group.plan), baselineByPeriod = byPeriod(group.baseline);
      const cells = matrixPeriods.map((period,index)=>{
        const parent = measure==='fte' ? parentCells?.[index] : null;
        const report = A.planningSummary(plan.get(period.key) || [],assessment,assumptions,parent?.report.fteWeeks);
        const before = beforeRows ? A.planningSummary(baselineByPeriod.get(period.key) || [],assessment,assumptions,parent?.before?.fteWeeks) : null;
        const comparison = before && measure==='gap' ? A.planningImpact(before,report,geographyChanges,assumptions,false) : null;
        return {report,before,period,comparison,title:title+' · '+decisionPeriodLabel(period.key),
          value:showMatrixChange ? (comparison ? comparison.delta : A.planningMeasureChange(before,report,measure,geographyChanges,assumptions))
            : A.planningMeasures(report)[measure]};
      });
      if (measure==='gap' && shortfallsOnly && !cells.some(({report,before})=>
        report.grossShortfall>0 || before?.grossShortfall>0)) return;
      const allCells = [...group.plan,...group.baseline];
      const breakdown = next==='breakdown';
      const hasChildren = breakdown ? cells.some(({report,before})=>A.hasPlanningBreakdown(report,measure) ||
        (before && A.hasPlanningBreakdown(before,measure)))
        : !!next && allCells.some(cell=>next==='week' ? interval!=='week' : !!cell[next]);
      const row = {id,label,title,depth,hasChildren,cells};
      matrixRows.push(row);
      if (!hasChildren || !openRow(id)) return;
      if (breakdown) {
        appendBreakdown(row,depth+1,[],cells.map(cell=>({...cell,
          planParts:A.planningBreakdown(cell.report,measure,matrixDrill,assumptions),
          baseParts:cell.before ? A.planningBreakdown(cell.before,measure,matrixDrill,assumptions) : new Map()
        })));
        return;
      }
      const groupKeys = cell=>['area','patch'].includes(next) ? locationValues(cell,next) : [cell[next]];
      for (const child of bucket(group.plan,group.baseline,groupKeys)) {
        const geography = ['area','patch'].includes(next);
        const childLevel = geography && child.label ? next : assessment;
        const hasPatches = next==='area' && [...child.plan,...child.baseline].some(cell=>cell.patch);
        const childLabel = next==='week' ? decisionPeriodLabel(child.label) : child.label || (hasPatches?'Area unavailable':geography
          ? (assessment==='region'?'Region only':'Area only') : 'Unspecified skill');
        const following = {area:'patch',patch:'skill',skill:'week'}[next];
        appendLocation(child,childLevel,childLabel,title+' · '+childLabel,id+'/'+child.id,depth+1,
          geography && !child.label && next==='patch' ? 'skill' : following,cells);
      }
    }
    for (const group of bucket(rows,beforeRows || [],cell=>locationValues(cell,placeKey))) {
      const label = placeKey==='region' && group.label && group.label!=='Unmapped' ? 'Region '+group.label
        : group.label || 'Held at parent level';
      const next = matrixDrill==='geography' ? ({region:'area',area:'patch',patch:'skill'}[placeKey])
        : matrixDrill==='skill' ? 'skill' : 'breakdown';
      appendLocation(group,group.label ? placeKey : (placeKey==='area'?'region':'area'),label,label,
        [measure,matrixDrill,placeKey,group.id].join('/'),0,next);
    }
    return matrixRows;
  },[A,view,matrixExpanded,interval,measure,matrixDrill,matrixPeriods,assumptions,beforeRows,rows,
    showMatrixChange,geographyChanges,shortfallsOnly,placeKey]);
  const openRow = id => !!matrixExpanded[id];
  const matrixValues = matrixRows.map(row=>row.cells);
  const matrixMax = matrixValues.reduce((max,row)=>row.reduce((largest,cell)=>Math.max(largest,Math.abs(cell.value ?? 0)),max),1);
  function matrixHeading(row, transpose = false) {
    return <span className="ds-matrix-heading" style={{paddingInlineStart:row.depth*12}}>
      {row.hasChildren && <button type="button" className="ds-expand" aria-expanded={openRow(row.id)}
        aria-label={(openRow(row.id)?'Collapse ':'Expand ')+row.title}
        onClick={()=>setMatrixExpanded(old=>({...old,[row.id]:!old[row.id]}))}>{openRow(row.id)?'−':'+'}</button>}
      {transpose ? row.title : row.label}
    </span>;
  }
  const matrixHeaders = periodsOnRows ? matrixRows.map(row=>({key:row.id,label:matrixHeading(row,true)})) : matrixPeriods;
  const matrixRecords = periodsOnRows ? matrixPeriods.map((period,index)=>({
    key:period.key,label:period.label,cells:matrixValues.map(row=>row[index])
  })) : matrixRows.map((row,index)=>({key:row.id,label:matrixHeading(row),cells:matrixValues[index]}));
  const matrixCellId = (row,index) => JSON.stringify([row.key,matrixHeaders[index].key]);
  const activeMatrixCell = focusedCell && matrixRecords.some(row=>row.cells.some((_,index)=>matrixCellId(row,index)===focusedCell))
    ? focusedCell : matrixRecords[0]?.cells.length ? matrixCellId(matrixRecords[0],0) : null;
  function renderMatrixCell({report,before,value,title,detail,comparison},id) {
    const gross = measure==='gap' && !showMatrixChange && report.grossShortfall;
    const risk = gross>0 && (value==null || Math.abs(gross+value)>1e-8);
    const adverse = measure==='gap' ? value<0 : measure==='shortage' && value>0;
    const favourable = measure==='gap' ? value>0 : measure==='shortage' && showMatrixChange && value<0;
    const tone = value==null?'unavailable':adverse?'short':favourable?'spare':value>0?'higher':value<0?'lower':'neutral';
    const display = showMatrixChange || measure==='gap' ? signedHours(value) : value==null ? '—' : format(value);
    const partial = report.partialByMeasure[measure] || (showMatrixChange &&
      (before?.partialByMeasure[measure] || comparison?.baselineCoverage.groups>0 || comparison?.revisedCoverage.groups>0));
    const planValues = showMatrixChange && showPlanValues && [
      'Baseline '+decisionValue(measure,detail ? detail.baseValue : measure==='gap' ? comparison.gapBefore : A.planningMeasures(before)[measure],format),
      'Plan '+decisionValue(measure,detail ? detail.planValue : measure==='gap' ? comparison.gapAfter : A.planningMeasures(report)[measure],format)
    ];
    return <button type="button" className="ds-matrix-cell" data-tone={tone}
      tabIndex={activeMatrixCell===id ? 0 : -1} onFocus={()=>setFocusedCell(id)} onKeyDown={moveDecisionMatrixFocus}
      style={{'--ds-cell-weight':Math.abs(value ?? 0)/matrixMax}}
      aria-label={[title,measureLabel,showMatrixChange?'Change vs baseline':null,value==null?'Unavailable':display+' '+measureUnit,
        ...(planValues || []),risk?format(gross)+' hours gross shortfall':null,partial?'Partial assessment':null].filter(Boolean).join(' · ')}
      onClick={()=>openMetric(measure,report,title,before,detail,showMatrixChange ? {value} : null)}>
      <strong>{display}<AnalyticsIcon name="chevron" size={11}/></strong>
      {planValues && <span className="ds-matrix-plan-values">{planValues.map(label=><span key={label}>{label}</span>)}</span>}
      {(risk || partial) && <span className="ds-gap-detail" aria-hidden="true">
        {risk && <span className="ds-gap-risk"><AnalyticsIcon name="alert" size={11}/>{format(gross)}</span>}
        {partial && <AnalyticsIcon name="info" size={11}/>}
      </span>}
    </button>;
  }
  const rowMarkup = ({id,title,depth=0,children,report,before,removed}, total=false) => {
    const heading = <th scope="row"><span style={{paddingInlineStart:depth*14}}>{children && <button type="button" className="ds-expand"
        aria-label={(expanded[id]?'Collapse ':'Expand ')+title} aria-expanded={!!expanded[id]}
        onClick={()=>setExpanded(old=>({...old,[id]:!old[id]}))}>{expanded[id]?'−':'+'}</button>} {title}</span></th>;
    if (removed) return <tr key={id}>{heading}
      <td colSpan={metrics.length}><button type="button" className="ds-metric-link"
        onClick={()=>openMetric('gap',before,title+' · Baseline only',null,null,null,baseline)}>
        Removed from selected plan · View baseline records <AnalyticsIcon name="chevron" size={11}/>
      </button></td>
    </tr>;
    const impact = before ? A.planningImpact(before,report,geographyChanges,assumptions,false) : null;
    const gross = report.grossShortfall;
    const values = A.planningMeasures(report);
    const showGross = gross>0 && (report.gap==null || Math.abs(gross+report.gap)>1e-8);
    const gapText = [
      gapLabel(report.gap), showGross && format(gross)+' hours gross shortfall',
      impact && (impact.delta==null ? 'Baseline change unavailable' : 'Baseline change '+signedHours(impact.delta)+' hours'),
      report.partial && 'Partial assessment'
    ].filter(Boolean).join('. ');
    return <tr key={id} className={total?'ds-total':undefined}>
    {heading}
    {metrics.map(([key,label])=><td key={key} className={'ds-'+key}>
      {key==='gap' ? <button type="button" className="ds-gap-value" aria-label={title+' · '+gapText} title={gapText}
        onClick={()=>openMetric(key,report,title,before)}>
        <span className={report.gap<0?'ds-short':report.gap>0?'ds-spare':'ds-neutral'}>
          {signedHours(report.gap)}<AnalyticsIcon name="chevron" size={11}/>
        </span>
        {(impact || showGross || report.partial) && <span className="ds-gap-detail" aria-hidden="true">
          {showGross && <span className="ds-gap-risk"><AnalyticsIcon name="alert" size={11}/>{format(gross)}</span>}
          {impact && <span data-tone={impact.delta>0?'positive':impact.delta<0?'negative':undefined}>Δ {signedHours(impact.delta)}</span>}
          {report.partial && <span className="ds-gap-partial"><AnalyticsIcon name="info" size={12}/></span>}
        </span>}
      </button> : <button type="button" className="ds-metric-link" data-available={values[key]!=null} aria-label={title+' · '+label+' · '+format(values[key])+
        (report.partialByMeasure[key]?' · Partial assessment':'')}
        onClick={()=>openMetric(key,report,title,before)}>{format(values[key])}
        {report.partialByMeasure[key] && <span title="Partial assessment" aria-hidden="true"><AnalyticsIcon name="info" size={11}/></span>}
      </button>}
    </td>)}
  </tr>;
  };
  return <>
    <section className="ds-panel ds-controls diff-filter-card" aria-label="Planning filters">
      <div className="ds-filter-header">
        <span className="ds-filter-pill"><AnalyticsIcon name="filter" size={14}/>Filters</span>
        <div className="ds-filter-actions">
          {filtersOpen && <>
            {canUndo && <button type="button" onClick={undoFilter}>Undo</button>}
            <button type="button" onClick={()=>setFilter(clearScope)}><AnalyticsIcon name="refresh" size={13}/>Reset</button>
          </>}
          <button type="button" className="ds-filter-toggle" aria-expanded={filtersOpen} aria-controls="ds-planning-filters"
            onClick={()=>setFiltersOpen(open=>!open)}>
            {filtersOpen?'Collapse':'Expand'} <AnalyticsIcon name="chevron" size={13}/>
          </button>
        </div>
      </div>
      <div className="ds-filter-body" id="ds-planning-filters" hidden={!filtersOpen}>
        <div className="ds-filter-main">
          <div className="ds-plan-fields">
            <label>Plan<select aria-label="Plan" value={scenarioId} onChange={e=>setScenarioId(e.target.value)}>
              <option value="__draft">Draft inputs</option>{Object.keys(scenarios).map(id=><option key={id}>{id}</option>)}
            </select></label>
            {choose('Area','area',areas)}
          </div>
          <DecisionStudioPeriodControls A={A} weeks={planningWeeks} filter={filter} setFilter={setFilter}/>
        </div>
        {scopeNote && <p className="ds-context ds-scope-note">{scopeNote}</p>}
        {focusedPeriod && <button type="button" className="ds-drill-link" onClick={()=>setFocusedPeriod('')}>
          Clear period focus · {decisionPeriodLabel(focusedPeriod)}</button>}
        <div className="ds-filter-fields">
          {choose('Region','region',regions)}{choose('Patch','patch',patches)}{choose('Skill','skill',skills)}
          <label>Compare with<select aria-label="Compare with" value={comparisonEnabled && baselineId!==scenarioId ? baselineId : ''}
            onChange={e=>{setMetric(null);setComparisonEnabled(!!e.target.value);if(e.target.value)setBaselineId(e.target.value);}}>
            <option value="">No baseline</option>{Object.keys(scenarios).filter(id=>id!==scenarioId).map(id=><option key={id}>{id}</option>)}
          </select></label>
          <details className="ds-date-detail"><summary>Exact dates</summary><div>
            {['start','end'].map(key=><label key={key}>{key==='start'?'From date':'Through date'}
              <input type="date" value={filter[key]||''} onChange={e=>change(key,e.target.value)}/></label>)}
          </div></details>
        </div>
      </div>
    </section>
    {bundle && !busy && !imbalance && model.rows.length>0 && <>
        <section className="ds-outlook-metrics" aria-label="Planning horizon totals">
          {[
            ['gap','Net capacity gap',gapLabel(totals.gap),[
              totals.grossShortfall>Math.max(0,-(totals.gap ?? 0)) && format(totals.grossShortfall)+' h gross shortfall',
              totals.partial && totals.comparable+' of '+totals.assessed.length+' groups assessed'
            ].filter(Boolean).join(' · ') || periodTitle],
            ['demand','Required hours',format(totals.demand),totals.partialByMeasure.demand?'Some job durations are missing':'Forecast work'],
            ['capacity','Available capacity',format(totals.capacity),totals.partialByMeasure.capacity
              ? (totals.capacity!=null?'Assessed locations only':'Downtime could not be assessed'):'After downtime and cover'],
            ['fte','Allocated FTE',format(totals.fte),'Average per roster week']
          ].map(([key,label,value,note])=><button type="button" className="ds-outlook-metric" key={key} data-measure={key}
            data-available={totals[key]!=null}
            data-tone={key==='gap' ? (totals.gap<0?'short':totals.gap>0?'spare':'neutral') : key}
            onClick={()=>openMetric(key,totals,periodTitle,beforeRows ? summary(beforeRows) : null)}>
            <span className="ds-kpi-icon"><AnalyticsIcon name={{gap:'scale',demand:'demand',capacity:'bolt',fte:'users'}[key]} size={16}/></span>
            <span className="ds-kpi-content">
              <span className="ds-metric-title">{label}</span>
              <strong>{value}{['capacity','demand'].includes(key) && totals[key]!=null && <small> h</small>}</strong>
              <span className="ds-kpi-note">{note}</span>
            </span>
            <AnalyticsIcon name="chevron" size={13} className="ds-kpi-chevron"/>
          </button>)}
        </section>
        <div className="ds-outlook-grid">
          <DecisionStudioDemandTrend Trend={V.Trend} chart={chart} periodSwitch={periodSwitch('Outlook period')}
            periodLabel={interval} focusedPeriod={focusedPeriod} setFocusedPeriod={setFocusedPeriod}/>
          {priorityList}
        </div>
    </>}
    {bundle && !busy && <section className="ds-panel ds-plan-views">
      <div className="ds-heading ds-plan-heading"><h2>{imbalance?'Capacity imbalance':'Capacity plan'}</h2>
        {data.issues.length>0 && <button type="button" className="ds-issues" onClick={onChecks}>Input completeness</button>}
        <div className="ds-period-switch" role="group" aria-label="Capacity plan view">
          {[['table','Table'],['trend','Trend'],['matrix','Matrix']].map(([id,label])=><button type="button" key={id}
            aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}
        </div>
      </div>
      {patchAssessment && <p className="ds-context">
        Capacity imbalance uses assessed patches. Some regional and area totals have gaps in demand, roster or downtime coverage.
      </p>}
      {view!=='table' && <div className="ds-plan-view-controls">
        <label>Measure<select aria-label="Planning measure" value={measure} onChange={e=>setMeasure(e.target.value)}>
          {decisionMeasures.map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select></label>
        {periodSwitch('Capacity plan period')}
        {view==='matrix' && <>
          <label>Location<select aria-label="Matrix location level" value={locationLevel} onChange={e=>setLocationLevel(e.target.value)}>
          <option value="auto">Auto ({placeLabel})</option><option value="region">Region</option>
            <option value="area">Area</option><option value="patch">Patch</option>
          </select></label>
          <label>Drill by<select aria-label="Matrix drill by" value={matrixDrill} onChange={e=>setDrillBy(e.target.value)}>
            {Object.entries(drillOptions).map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select></label>
          <button type="button" className="ds-drill-link" onClick={()=>setPeriodsOnRows(!periodsOnRows)}>
            Swap rows and columns</button>
          {showMatrixChange && <label><input type="checkbox" checked={showPlanValues}
            onChange={event=>setShowPlanValues(event.target.checked)}/> Show plan values</label>}
        </>}
        {view==='matrix' && measure==='gap' && <label className="ds-shortfalls-toggle"><input type="checkbox" checked={shortfallsOnly}
          onChange={event=>setShortfallsOnly(event.target.checked)}/> {showMatrixChange?'Shortfall in either plan':'Shortfalls only'}</label>}
      </div>}
      {view==='trend' && <DecisionStudioResponsiveTrend Trend={V.Trend} key={measure} measure={measure} title={measureLabel+' by period'}
          data={trend} unit={measureUnit} signed={measure==='gap'} actionLabel="Select a period"
          series={[{key:'plan',label:'Selected plan',color:'var(--ds-measure-accent, var(--ds-chart-plan))'},
            ...(beforeRows ? [{key:'baseline',label:'Baseline',color:'var(--ds-chart-baseline, var(--ds-chart-capacity))',dash:'6 4'}] : [])]}
          onSelect={row=>openMetric(measure,row.report,decisionPeriodLabel(row.key),row.before)}/>}
      {view==='matrix' && <>
        <p className="ds-context">{measureLabel} ({measureUnit}) by {placeKey} and period.</p>
        {measure==='fte' && matrixDrill==='breakdown' && <p className="ds-context">Skill and labour type show their contribution to the location’s average weekly FTE.</p>}
        {measure==='gap' && rows.length>0 && (!showMatrixChange || showPlanValues) && <div className="ds-imbalance-summary">
          <button type="button" onClick={()=>openMetric('gap',totals,periodTitle,beforeRows && summary(beforeRows))}>
            Net position <strong data-tone={totals.gap>0?'positive':undefined}>{gapLabel(totals.gap)}</strong><AnalyticsIcon name="chevron" size={12}/>
          </button>
          <button type="button" onClick={()=>openMetric('shortage',totals,periodTitle,beforeRows && summary(beforeRows))}>
            Gross shortfall <strong>{decisionValue('shortage',totals.grossShortfall,format)}</strong><AnalyticsIcon name="chevron" size={12}/>
          </button>
        </div>}
        <div className="ds-gap-key">{measure==='gap' && !showMatrixChange && <><span><b>−</b> Shortfall</span><span><b>+</b> Surplus</span>
          <span><AnalyticsIcon name="alert" size={12}/> Gross shortfall</span></>}
          {showMatrixChange && <span>{measure==='gap'?'Δ Change in matched groups':'Δ Selected plan minus baseline'}</span>}
          {showMatrixChange && (measure==='gap' || measure==='shortage'
            ? <span>Red = worse · Green = better</span>
            : <span>Blue = increase · Purple = decrease</span>)}
          <span><b>—</b> Unavailable</span></div>
        {showMatrixChange && matrixRows.length>0 && !matrixRows.some(row=>row.cells.some(cell=>cell.value!=null)) &&
          <p className="ds-context">The plans have no comparable values for this measure and scope.
            {' '}Choose No baseline to review the selected plan figures.</p>}
        {matrixRows.length && matrixPeriods.length ? <div className="ds-scroll ds-imbalance-matrix" tabIndex="0"
          data-measure={measure} data-show-delta={showMatrixChange}
          aria-label={measureLabel+' matrix'} aria-describedby="ds-matrix-keyboard-help">
          <span className="sr-only" id="ds-matrix-keyboard-help">Use arrow keys to move between values and Enter to open details.</span>
          <table><thead><tr><th scope="col">{periodsOnRows?periodLabel:placeLabel}</th>
            {matrixHeaders.map(header=><th scope="col" key={header.key}>{header.label}</th>)}
          </tr></thead><tbody>{matrixRecords.map(row=><tr key={row.key}><th scope="row">{row.label}</th>
            {row.cells.map((cell,index)=><td key={matrixHeaders[index].key}>{renderMatrixCell(cell,matrixCellId(row,index))}</td>)}
          </tr>)}</tbody></table>
        </div> : <p className="ds-context">{measure==='gap' && shortfallsOnly?'No assessed shortfalls in this scope.':'No planning periods in this scope.'}</p>}
      </>}
      {view==='table' && <>
        <div className="ds-plan-view-controls"><label>Group by <select aria-label="Group by" value={groupBy} onChange={e=>setGroupBy(e.target.value)}>
          <option value="month">Month</option><option value="quarter">Quarter</option><option value="geography">Geography</option>
          <option value="skill">Skill</option><option value="week">Week</option>
        </select></label>
          <label className="ds-shortfalls-toggle"><input type="checkbox" checked={allColumns}
            onChange={event=>setAllColumns(event.target.checked)}/> All 8 measures</label>
        </div>
        {visibleRows.length ? <>
          <div className="ds-gap-key" aria-label="Gap column key">
            <span><b>−</b> Shortfall</span><span><b>+</b> Surplus</span>
            <span><AnalyticsIcon name="alert" size={12}/> Gross shortfall</span>
            {beforeRows && <span><b>Δ</b> vs baseline</span>}
            <span><AnalyticsIcon name="info" size={12}/> Partial</span>
          </div>
          <div className="ds-scroll ds-planning-table" tabIndex="0" aria-label="Capacity plan table"><table>
          <thead><tr><th scope="col">{{month:'Month',quarter:'Quarter',geography:'Location',skill:'Skill',week:'Week commencing'}[groupBy]}</th>{metrics.map(([key,label])=><th scope="col" key={key} className={'ds-'+key}>{label}</th>)}</tr></thead>
          <tbody>{visibleRows.map(row=>rowMarkup(row))}{rowMarkup({id:'total',title:'Net position',report:totals,
            before:beforeRows ? summary(beforeRows) : null},true)}</tbody>
        </table></div></> : <p className="ds-context">{data.weeks.length?'No planning rows match these filters.':'This plan has no forecast weeks. Select a plan or draft with demand and staffing inputs.'}</p>}
      </>}
      {totals.unallocated!==0 && <p className="ds-context">{format(totals.unallocated)} h of capacity adjustments held at region level.</p>}
      {comparisonEnabled && baselineId!==scenarioId && !baseline && <p className="ds-context">Baseline unavailable. Showing the selected plan.</p>}
      {view==='table' && beforeRows && <p className="ds-context">Gap change compares matching assessed groups. Direction is selected plan minus baseline.</p>}
    </section>}
    {bundle && !busy && imbalance && model.rows.length>0 && priorityList}
    {metric && (metric.detail ? <DecisionStudioBreakdownEvidence key={metric.title} A={A} V={V} metric={metric} format={format}
      bundle={bundle} baseline={baseline} assumptions={assumptions} onClose={()=>setMetric(null)}/>
      : <DecisionStudioEvidence key={metric.key+metric.title} A={A} geographyChanges={geographyChanges} metric={metric} format={format} gapLabel={gapLabel}
        assumptions={assumptions} bundle={metric.sourceBundle || bundle} baseline={baseline} V={V} onClose={()=>setMetric(null)}
        productivity={(metric.sourceBundle ? baseData : data).facts.baseline_productivity}
        baselineProductivity={baseData.facts.baseline_productivity}
        onSimulate={(group,driver,amount,level)=>A.simulatePlanningChange(data,filter,assumptions,group,level,driver,amount)}/>)}
  </>;
}

function DecisionStudioImpact({impact, format, V, baseline, revised}) {
  const [driver, setDriver] = React.useState(null);
  if (impact.delta === null) return <p>No comparable groups in these plans. Outside the bridge:
    {' '}{impact.baselineCoverage.groups} baseline groups and {impact.revisedCoverage.groups} selected-plan groups.
    Check input completeness and geography.</p>;
  const signed = value => (value > 0 ? '+' : '')+format(value);
  const changed = impact.components.filter(row => Math.abs(row.delta)>1e-8);
  const residual = Math.abs(impact.residual)>1e-8
    ? [{name:'Other adjustments',value:impact.residual}] : [];
  const steps = [{name:'Baseline gap',value:impact.gapBefore,total:true},
    ...changed,...residual,{name:'Selected plan gap',value:impact.gapAfter,total:true}];
  const rows = [
    ...impact.components.filter(row=>row.before || row.after).filter(row=>row.key!=='demand'),
    {name:'Available capacity',before:impact.capacityBefore,after:impact.capacityAfter,delta:impact.capacityAfter-impact.capacityBefore},
    impact.components.find(row=>row.key==='demand'),
    {name:'Capacity gap',before:impact.gapBefore,after:impact.gapAfter,delta:impact.delta}
  ];
  const sources = {
    roster:['resource_plan'], appliedDowntime:['downtime_overlays_hours','downtime_overlays_percentage','downtime_overlays_hours_fte'],
    recruits:['recruitment_grounded','recruitment_ungrounded'], overtime:['overtime'], contractors:['ctr_capacity'],
    transfers:['fte_transfer'], support:['hec_on_kac_demand','hec_on_ev_demand'], demand:['demand_input']
  };
  const ranked = [...changed].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,3);
  const remove = impact.baselineCoverage, add = impact.revisedCoverage;
  const sourceTable = (entries, bundle, label) => {
    const records = new Map();
    for (const {row} of entries) {
      if (!sources[driver]?.includes(row.source)) continue;
      for (const original of [row,row.jobTime].filter(Boolean)) records.set(original.source+':'+original.row,original);
    }
    const values = [...records.values()].map(row=>({
      ...row.raw, Source:row.source, Version:bundle?.sources?.[row.source]?.version, 'Source row':row.row
    }));
    const fields = [...new Set(['Source','Version','Source row',...values.flatMap(Object.keys)])];
    return <AnalyticsTable title={label} rows={values} pageSize={12}
      columns={fields.map(key=>({key,label:key}))}/>;
  };
  const roster = entries => {
    const totals = new Map();
    for (const {row,hours} of entries) {
      if (row.source!=='resource_plan' || !row.n.payid) continue;
      if (!totals.has(row.n.payid)) totals.set(row.n.payid,{row,allocated:0});
      totals.get(row.n.payid).allocated += hours;
    }
    return totals;
  };
  const rosterChanges = () => {
    const before = roster(impact.beforeEvidence), after = roster(impact.afterEvidence);
    return [...new Set([...before.keys(),...after.keys()])].flatMap(id=>{
      const start = before.get(id), end = after.get(id);
      const display = key => [start?.row.n[key],end?.row.n[key]].map(value=>value ?? '—').join(' → ');
      if (start && end && start.allocated===end.allocated &&
          ['hours','allocation','wmis','skill','status'].every(key=>start.row.n[key]===end.row.n[key])) return [];
      return [{id, hours:display('hours'), allocation:display('allocation'), location:display('wmis'),
        skill:display('skill'), change:format((end?.allocated || 0)-(start?.allocated || 0)),
        status:!start?'Added to assessed roster':!end?'Removed from assessed roster':'Changed'}];
    });
  };
  return <section className="ds-impact ds-gap-bridge">
    <div className="ds-impact-heading"><h3>Why the gap changed</h3>
      <span data-tone={impact.delta<0?'short':impact.delta>0?'spare':undefined}>
        {signed(impact.delta)} h vs baseline
      </span>
    </div>
    <p className="ds-context">{baseline?.scenarioId} → {revised?.scenarioId} · {impact.pairs.length} matching assessed groups</p>
    <p>{impact.delta===0 ? 'The net gap is unchanged.' : 'The gap is '+format(Math.abs(impact.delta))+' h '+(impact.delta<0?'worse.':'better.')}
      {ranked.length>0 && ' Largest contributors were '+ranked.map(row=>row.name.toLowerCase()+' ('+signed(row.value)+' h)').join(', ')+'.'}</p>
    <div className="ds-impact-grid">
      {changed.length || residual.length ? <V.Waterfall title="Impact on gap" steps={steps} onSelect={row=>row.key&&setDriver(row.key)}/>
        : <p>No component changes across comparable groups.</p>}
      <div className="ds-scroll"><table><thead><tr><th scope="col">Hours</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Change</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.name}><th scope="row">{row.key ?
          <button type="button" className="ds-issues" aria-pressed={driver===row.key}
            onClick={()=>setDriver(driver===row.key?null:row.key)}>{row.name}</button> : row.name}</th>
          <td>{format(row.before)}</td><td>{format(row.after)}</td><td>{signed(row.delta)}</td></tr>)}</tbody></table></div>
    </div>
    {(remove.groups>0 || add.groups>0) && <p className="ds-context">
      Outside the bridge: {remove.groups} baseline groups ({signed(remove.hours)} h assessed gap) and {add.groups} selected-plan groups
      ({signed(add.hours)} h assessed gap). Includes missing evidence or changed geography.</p>}
    {driver==='demand' && <p className="ds-context">For {impact.demandBridge.rows.length} matched work-code groups,
      volume {signed(impact.demandBridge.volume)} h · mix {signed(impact.demandBridge.mix)} h · duration {signed(impact.demandBridge.duration)} h.
      {impact.demandBridge.excluded.length ? ' '+impact.demandBridge.excluded.length+' groups are outside this decomposition.' : ''}</p>}
    {driver==='roster' && <AnalyticsTable title="Roster changes by Pay ID" rows={rosterChanges()} columns={[
      {key:'id',label:'Pay ID'},{key:'status',label:'Plan change'},{key:'hours',label:'Working hours'},
      {key:'allocation',label:'Allocation %'},{key:'location',label:'Location'},{key:'skill',label:'Skill'},
      {key:'change',label:'Allocated hours change'}
    ]}/>}
    {driver && <div className="ds-impact-grid">
      {sourceTable(impact.beforeEvidence,baseline,'Baseline source records')}
      {sourceTable(impact.afterEvidence,revised,'Selected plan source records')}
    </div>}
  </section>;
}

function DecisionStudioResponse({groups, focused, level, format, gapLabel, onSimulate}) {
  const [targetId, setTargetId] = React.useState(() => groups.find(group=>group.id===focused?.id)?.id || groups[0]?.id);
  const [driver, setDriver] = React.useState('overtime');
  const [amount, setAmount] = React.useState('');
  const group = groups.find(row=>row.id===targetId) || groups[0];
  const trial = React.useMemo(() => amount.trim() && group ? onSimulate(group,driver,Number(amount),level) : null,
    [group,driver,amount,level,onSimulate]);
  if (!group) return null;
  return <section className="ds-impact ds-response" aria-label="Test a planning change">
    <h3>Test a change</h3>
    <p className="ds-context">Hypothetical result for one skill and week. Demand inputs stay fixed.</p>
    <div className="ds-response-controls">
      <label>Shortfall group<select value={group.id} onChange={e=>{setTargetId(e.target.value);setAmount('');}}>
        {groups.map(row=><option key={row.id} value={row.id}>{[
          row.region,level!=='region' && row.area,level==='patch' && row.patch,row.skill,row.week
        ].filter(Boolean).join(' · ')}</option>)}</select></label>
      <label>Change<select value={driver} onChange={e=>{setDriver(e.target.value);setAmount('');}}>
        <option value="overtime">Add overtime</option><option value="roster">Change allocated roster hours</option>
        <option value="fte">Change allocated FTE</option><option value="downtime">Reduce applied downtime</option>
      </select></label>
      <label>{driver==='fte'?'FTE change':'Hours in selected week'}<input type="number" step="any"
        min={['overtime','downtime'].includes(driver)?0:undefined} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <button type="button" onClick={()=>setAmount('')}>Reset</button>
    </div>
    {driver==='fte' || driver==='roster' ? <p className="ds-context">Use a signed value. The change is spread across the group’s allocated roster in proportion to existing hours.</p> : null}
    {amount.trim() && !trial && <p role="status">Enter a change supported by the group’s roster or downtime.</p>}
    {trial?.gap!=null && <p className="ds-trial-result" aria-live="polite">
      <span>Hypothetical gap · {group.skill} · Week of {decisionPeriodLabel(group.week)}</span>
      <strong data-tone={trial.gap>0?'positive':undefined}>{gapLabel(trial.gap)}</strong>
      <small>{(trial.gap-group.gap)>=0?'+':''}{format(trial.gap-group.gap)} h vs selected plan</small>
    </p>}
    <div className="ds-scroll"><table><thead><tr><th scope="col">Measure</th><th scope="col">Selected plan</th><th scope="col">Hypothetical</th></tr></thead>
      <tbody><tr><th scope="row">Available hours</th><td>{format(group.capacity)}</td><td>{format(trial?.capacity ?? group.capacity)}</td></tr>
      <tr><th scope="row">Required hours</th><td>{format(group.demand)}</td><td>{format(trial?.demand ?? group.demand)}</td></tr>
      <tr><th scope="row">Capacity gap</th><td>{gapLabel(group.gap)}</td><td data-tone={trial?.gap>0?'positive':undefined}
        aria-live="polite">{gapLabel(trial ? trial.gap : group.gap)}</td></tr></tbody></table></div>
  </section>;
}

function DecisionStudioBreakdownEvidence({A,V,metric,format,bundle,baseline,assumptions,onClose}) {
  const [side,setSide] = React.useState('plan');
  const [selectedWeek,setSelectedWeek] = React.useState('');
  const {key,title,detail,before} = metric;
  const [,label,unit] = decisionMeasure(key);
  const entries = side==='plan' ? detail.planEvidence : detail.baselineEvidence;
  const timeline = React.useMemo(()=>{
    const plan = new Map(), base = new Map();
    for (const [evidence,weeks] of [[detail.planEvidence,plan],[detail.baselineEvidence,base]]) {
      for (const entry of evidence) {
        const week = entry.cell.week;
        if (!weeks.has(week)) weeks.set(week,0);
        const total = weeks.get(week);
        weeks.set(week,total==null || entry.contribution==null ? null : total+entry.contribution);
      }
    }
    return decisionPeriods(A,[...plan.keys(),...base.keys()],'week').map(key=>({
      key,label:decisionPeriodLabel(key,true),plan:plan.get(key) ?? null,baseline:base.get(key) ?? null
    }));
  },[A,detail]);
  const groups = new Map();
  for (const entry of entries) {
    if (selectedWeek && entry.cell.week!==selectedWeek) continue;
    const source = entry.row.source;
    if (!groups.has(source)) groups.set(source,[]);
    groups.get(source).push({
      'Source row':entry.row.row, 'Modeled week':entry.cell.week,
      ...entry.row.raw, ...(entry.row.jobTime && {['Matched duration ('+assumptions.jobTimeUnit+')']:entry.row.jobTime.value}),
      ['Contribution ('+unit+')']:format(entry.contribution)
    });
  }
  const selectedPlan = side==='plan' ? bundle : baseline;
  const change = decisionChange(key,detail.value,format);
  return <AnalyticsDrawer title={label+' breakdown'} subtitle={title} eyebrow="Decision Studio" panelClassName="ds-planning-drawer"
    onClose={onClose}>
    <section className="ds-drill-hero" data-measure={key}>
      <p className="ds-drill-scope">{bundle?.scenarioId}{before && ' vs '+baseline?.scenarioId}</p>
      <strong className="ds-drill-result">{before ? change : decisionValue(key,detail.planValue,format)}</strong>
      {before && <dl>
        <div><dt>Baseline</dt><dd>{decisionValue(key,detail.baseValue,format)}</dd></div>
        <div><dt>Selected plan</dt><dd>{decisionValue(key,detail.planValue,format)}</dd></div>
      </dl>}
    </section>
    {before && <div className="ds-drill-nav" role="group" aria-label="Source plan">
      <button type="button" aria-pressed={side==='plan'} onClick={()=>setSide('plan')}>Selected plan records</button>
      <button type="button" aria-pressed={side==='baseline'} onClick={()=>setSide('baseline')}>Baseline records</button>
    </div>}
    <div className="ds-drill-body">
      {timeline.length>1 && timeline.some(row=>row.plan!=null || row.baseline!=null) &&
        <DecisionStudioResponsiveTrend Trend={V.Trend} title={label+' contribution by week'} measure={key}
          subtitle={key==='fte'?'Weekly contributions to the selected period’s average FTE. Select a week to filter records.'
            : 'Select a week to filter records.'}
          data={timeline} unit={unit} signed={timeline.some(row=>row.plan<0 || row.baseline<0)}
          series={[{key:'plan',label:'Selected plan',color:'var(--ds-measure-accent, var(--ds-chart-plan))'},
            ...(before ? [{key:'baseline',label:'Baseline',color:'var(--ds-chart-baseline, #9c6644)',dash:'6 4'}] : [])]}
          selectedKey={selectedWeek} onSelect={row=>setSelectedWeek(current=>current===row.key?'':row.key)}
          actionLabel="Select a week" onClearSelection={()=>setSelectedWeek('')}/>}
      {[...groups].map(([source,records])=><AnalyticsTable key={side+source}
        title={selectedPlan?.sources?.[source]?.version || source.replaceAll('_',' ')}
        rows={records} columns={[...new Set(records.flatMap(Object.keys))].map(key=>({key,label:key}))}/>)}
      {!groups.size && <p className="ds-context">{detail.title.endsWith('Other modeled adjustments')
        ? 'This figure reconciles modeled capacity with its source components.' : 'No source records for this breakdown in the selected plan.'}</p>}
    </div>
  </AnalyticsDrawer>;
}

function DecisionStudioMetricTimeline({A,V,report,before,measure,assumptions,geographyChanges,format,onSelect}) {
  const [requestedInterval,setInterval] = React.useState('');
  const [view,setView] = React.useState('working');
  const [showBoth,setShowBoth] = React.useState(false);
  const weeks = [...new Set([...report.assessed,...(before?.assessed || [])].map(group=>group.week))];
  const timeScales = [['week','Weekly'],['month','Monthly'],['quarter','Quarterly'],['year','Yearly']]
    .filter(([id])=>new Set(weeks.map(week=>A.calendarPeriod(week,id))).size>1);
  const interval = requestedInterval || (timeScales.some(([id])=>id==='month') ? 'month' : 'week');
  const rosterView = measure==='downtime' && view==='working';
  const rosterComparison = !!before && ['fte','roster'].includes(measure);
  const deltaView = rosterComparison && !showBoth;
  const [,label,unit] = decisionMeasure(measure);
  const rows = React.useMemo(()=>{
    const byPeriod = source => {
      const groups = new Map();
      for (const group of source?.assessed || []) {
        const key = A.calendarPeriod(group.week,interval);
        if (!groups.has(key)) groups.set(key,[]);
        groups.get(key).push(...group.cells);
      }
      return groups;
    };
    const selected = byPeriod(report), baseline = byPeriod(before);
    const rosterHours = summary => summary?.downtime!=null ? summary.assessedRoster : null;
    const workingHours = summary => summary?.downtime!=null ? summary.assessedRoster-summary.downtime : null;
    return decisionPeriods(A,weeks,interval).map(key=>{
      const plan = A.planningSummary(selected.get(key) || [],report.level,assumptions);
      const base = before && A.planningSummary(baseline.get(key) || [],before.level,assumptions);
      const matched = base && measure==='gap' ? A.planningImpact(base,plan,geographyChanges,assumptions,false) : null;
      const selectedValue = matched ? matched.gapAfter : A.planningMeasures(plan)[measure];
      const gross = measure==='gap' && selectedValue!=null
        ? matched ? A.planningSummary(matched.pairs.flatMap(pair=>pair.after.cells),plan.level,assumptions).grossShortfall
          : plan.grossShortfall
        : null;
      return {
        key,label:decisionPeriodLabel(key,true),report:plan,before:base,
        selected:selectedValue,grossMarker:gross>Math.max(0,-selectedValue)+1e-8 ? -gross : null,
        baseline:matched ? matched.gapBefore : base ? A.planningMeasures(base)[measure] : null,
        change:matched ? matched.delta : A.planningMeasureChange(base,plan,measure,geographyChanges,assumptions),
        pairs:matched?.pairs,
        core:rosterHours(plan), working:workingHours(plan),
        baselineCore:rosterHours(base), baselineWorking:workingHours(base)
      };
    });
  },[A,report,before,interval,assumptions,geographyChanges,measure]);
  if (!timeScales.length) return null;
  if (!rows.some(row=>row.selected!=null || row.baseline!=null || rosterView && (row.core!=null || row.baselineCore!=null))) {
    return <p className="ds-context">{measure==='gap' && before
      ? 'No matching groups have an assessed gap in this period range.' : 'No assessed figures are available for this timeline.'}</p>;
  }
  const series = deltaView ? [{key:'change',label:'Change vs baseline',color:'var(--ds-measure-accent, var(--ds-chart-plan))'}]
    : rosterView ? [
    {key:'working',label:'After downtime',color:'var(--ds-chart-capacity)',bar:true},
    {key:'core',label:'Assessed roster',color:'var(--ds-chart-demand)'},
    ...(before ? [
      {key:'baselineWorking',label:'Baseline after downtime',color:'var(--ds-chart-baseline, #9c6644)',bar:true},
      {key:'baselineCore',label:'Baseline roster',color:'var(--ds-chart-fte, #7c3aed)',dash:'6 4'}
    ] : [])
  ] : [
    {key:'selected',label:measure==='gap'?'Net gap':'Selected plan',color:'var(--ds-measure-accent, var(--ds-chart-plan))',
      bar:measure==='gap',signedColors:measure==='gap'},
    ...(before ? [{key:'baseline',label:'Baseline',color:'var(--ds-chart-baseline, #9c6644)',dash:'6 4'}] : []),
    ...(measure==='gap' && rows.some(row=>row.grossMarker!=null) ? [
      {key:'grossMarker',label:'Gross shortfall',color:'var(--ds-shortfall-marker)',marker:true,absolute:true}
    ] : [])
  ];
  const open = row=>onSelect({...row,label:decisionPeriodLabel(row.key),includeRoster:rosterView},
    (rosterView ? row.core : row.selected)==null && (rosterView ? row.baselineCore : row.baseline)!=null ? 'baseline' : 'plan');
  return <section className="ds-metric-history">
    <DecisionStudioResponsiveTrend Trend={V.Trend} data={rows} measure={rosterView?'capacity':measure}
      title={rosterView?'Roster hours and availability':deltaView?label+' change by period':label+' timeline'}
      subtitle={rosterView?'Assessed hours before and after downtime. Select a period to see its records.'
        : measure==='gap' && before?'Matched groups only. Select a period to see its records.'
        : measure==='fte'?'Average FTE per roster week. Select a period to see its records.'
        : 'Select a period to see its records.'}
      tools={<div className="ds-history-controls">
        {timeScales.length>1 && <div className="ds-period-switch" role="group" aria-label="Breakdown period">
          {timeScales.map(([id,name])=><button key={id} type="button" aria-pressed={interval===id}
            onClick={()=>setInterval(id)}>{name}</button>)}
        </div>}
        {measure==='downtime' && <div className="ds-period-switch" role="group" aria-label="Downtime timeline measure">
          {[['working','Roster hours'],['measure','Downtime']].map(([id,name])=>
            <button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}>{name}</button>)}
        </div>}
        {rosterComparison && <label className="ds-history-toggle">
          <input type="checkbox" checked={showBoth} onChange={event=>setShowBoth(event.target.checked)}/> Show both plans
        </label>}
      </div>}
      unit={unit} signed={measure==='gap' || deltaView} series={series} onSelect={open}
      actionLabel={rosterComparison?'Select a period to see its workforce breakdown.':'Select a period to open records.'}/>
    {deltaView && !rows.some(row=>row.change!=null) &&
      <p className="ds-context">No periods have matching assessed scope. Use Show both plans to review their figures.</p>}
    <details className="ds-drill-section"><summary>{label} figures by period</summary>
      <div className="ds-scroll" tabIndex="0" aria-label={label+' figures by period'}>
        <table><thead><tr><th scope="col">Period</th><th scope="col">Selected plan</th>
          {before && <><th scope="col">Baseline</th><th scope="col">Change</th></>}
          {rosterView && <><th scope="col">Assessed roster</th><th scope="col">After downtime</th><th scope="col">Availability</th></>}
        </tr></thead><tbody>{rows.map(row=><tr key={row.key}><th scope="row">
          <button type="button" className="ds-drill-link" onClick={()=>open(row)}>
            {row.label} <AnalyticsIcon name="chevron" size={11}/></button></th>
          <td>{decisionValue(measure,row.selected,format)}</td>
          {before && <><td>{decisionValue(measure,row.baseline,format)}</td>
            <td>{decisionChange(measure,row.change,format)}</td></>}
          {rosterView && <><td>{decisionValue('roster',row.core,format)}</td>
            <td>{decisionValue('roster',row.working,format)}</td>
            <td>{row.report.downtimeRate==null?'Unavailable':format(100-row.report.downtimeRate)+'%'}</td></>}
        </tr>)}</tbody></table>
      </div>
    </details>
  </section>;
}

function DecisionStudioComparisonBars({rows,measure,format,onSelect,bullet=false,active}) {
  const scale = Math.max(1,...rows.map(row=>bullet ? Math.max(row.plan ?? 0,row.change!=null ? row.baseline ?? 0 : 0)
    : Math.abs(row.change ?? 0)));
  return <ul className="ds-comparison-bars">
    {rows.map(row=>{
      const value = bullet ? row.plan : row.change;
      const width = 100*Math.abs(value ?? 0)/scale*(bullet?1:.5);
      const tone = row.change==null || row.change===0?'neutral'
        : (bullet ? row.change>0 : row.change<0)?'worse':'better';
      return <li key={row.id}>
        <button type="button" className="ds-compare-row" aria-expanded={bullet ? active===row.id : undefined}
          onClick={()=>onSelect(row)}>
          <span className="ds-compare-label"><strong>{row.name}</strong>
            <small>{bullet
              ? 'Plan '+decisionValue(measure,row.plan,format)+' · Baseline '+decisionValue(measure,row.baseline,format)
              : 'Plan '+decisionValue(measure,row.plan,format)+(row.share==null?'':' · '+format(row.share)+'% share')}</small>
          </span>
          <span className="ds-compare-track" data-centred={!bullet} aria-hidden="true">
            {value!=null && <span className="ds-compare-fill" data-tone={tone}
              style={{width:width+'%',left:bullet?'0%':(value<0 ? 50-width : 50)+'%'}}/>}
            {bullet && row.change!=null && <span className="ds-baseline-marker"
              style={{left:100*row.baseline/scale+'%'}}/>}
          </span>
          <strong className="ds-compare-value" data-tone={tone}>{decisionChange(measure,row.change,format)}</strong>
          <AnalyticsIcon name="chevron" size={13}/>
        </button>
      </li>;
    })}
  </ul>;
}

const decisionLocationKey = (cell,fields) => JSON.stringify(fields.map(key=>cell[key] || ''));
function decisionCapacityDimensions(report,before) {
  const cells = [...report.capacityRows,...(before?.capacityRows || [])];
  return [['region'],['region','area'],['region','area','patch']]
    .filter(fields=>new Set(cells.map(cell=>decisionLocationKey(cell,fields))).size>1);
}

function DecisionStudioCapacityDistribution({A,V,report,before,assumptions,geographyChanges,onSelect,format}) {
  const [side,setSide] = React.useState(before ? 'change' : 'plan');
  const [groupBy,setGroupBy] = React.useState('');
  const availableDimensions = decisionCapacityDimensions(report,before);
  const dimensions = availableDimensions.find(fields=>fields.at(-1)===groupBy) || availableDimensions[0];
  if (!dimensions) return null;
  const level = dimensions.at(-1);
  const grouped = summary => {
    const groups = new Map();
    for (const cell of summary?.capacityRows || []) {
      const id = decisionLocationKey(cell,dimensions);
      if (!groups.has(id)) {
        const name = ['Region '+cell.region,...dimensions.slice(1).map(key=>cell[key] || 'Held at parent level')].join(' / ');
        groups.set(id,{id,name,value:0,cells:[]});
      }
      const group = groups.get(id);
      group.value += cell.capacity;
      group.cells.push(cell);
    }
    return groups;
  };
  const plan = grouped(report), baseline = grouped(before);
  const scoped = (summary,group) => group && A.planningSummary(group.cells,summary.level,assumptions);
  const shareEnabled = report.capacity>0 && [...plan.values()].every(group=>group.value>=0);
  const changes = side==='change' ? [...new Set([...plan.keys(),...baseline.keys()])].map(id=>{
    const current = plan.get(id), previous = baseline.get(id);
    return {
      id,name:(current || previous).name,plan:current?.value,baseline:previous?.value,
      share:shareEnabled && current ? 100*current.value/report.capacity : null,
      change:A.planningMeasureChange(scoped(before,previous),scoped(report,current),'capacity',geographyChanges,assumptions)
    };
  }).sort((a,b)=>(b.change==null?-1:Math.abs(b.change))-(a.change==null?-1:Math.abs(a.change))
    || a.name.localeCompare(b.name)) : [];
  const source = side==='baseline' ? before : report;
  const segments = [...(side==='baseline' ? baseline : plan).values()].sort((a,b)=>b.value-a.value);
  const title = 'Available capacity by '+level;
  const open = selected=>onSelect({
    label:selected.name,report:scoped(report,plan.get(selected.id)),before:scoped(before,baseline.get(selected.id))
  },side==='baseline' || !plan.has(selected.id) ? 'baseline' : 'plan');
  return <section className="ds-capacity-distribution">
    {(before || availableDimensions.length>1) && <div className="ds-history-controls">
      {before && <div className="ds-period-switch" role="group" aria-label="Capacity distribution plan">
        {[['change','Change'],['plan','Selected plan'],['baseline','Baseline']].map(([id,label])=>
          <button key={id} type="button" aria-pressed={side===id} onClick={()=>setSide(id)}>{label}</button>)}
      </div>}
      {availableDimensions.length>1 && <label className="ds-distribution-level">Group by
        <select value={level} onChange={event=>setGroupBy(event.target.value)}>
          {availableDimensions.map(fields=>{
            const key = fields.at(-1);
            return <option key={key} value={key}>{key[0].toUpperCase()+key.slice(1)}</option>;
          })}
        </select>
      </label>}
    </div>}
    {side==='change' ? <div className="ds-drill-section">
      <h3>Capacity change by {level}</h3>
      <p className="ds-context">Largest changes first. Select a location for its records.</p>
      {changes.every(row=>row.change==null) && <p className="ds-context">No locations have matching assessed scope. Review the plans separately using the controls above.</p>}
      <DecisionStudioComparisonBars rows={changes} measure="capacity" format={format} onSelect={open}/>
    </div> : segments.length>1 && segments.length<=6 && segments.every(segment=>segment.value>0)
      ? <V.Donut title={title} subtitle="Select a location to see its capacity records." segments={segments}
        center={format(source.capacity)} caption="available hours" onSelect={open}/>
      : segments.length ? <V.Bars title={title} subtitle="Select a location to see its capacity records." rows={segments}
        showDrilldown diverging={segments.some(segment=>segment.value<0)} onSelect={open}/>
      : <p className="ds-context">No assessed capacity for this plan in the selected scope.</p>}
  </section>;
}

function DecisionStudioProductivity({A,report,before,productivity,baselineProductivity,format}) {
  const rates = (summary,facts) => {
    const skills = new Set((summary?.assessed || []).map(group=>group.skill));
    const values = new Map();
    for (const row of facts || []) {
      const value = A.num(row.n.jobsperday);
      if (skills.has(row.skill) && !row.duplicate && value!=null && value>=0) values.set(row.skill,value);
    }
    return values;
  };
  const selected = rates(report,productivity), baseline = rates(before,baselineProductivity);
  const skills = [...new Set([...selected.keys(),...baseline.keys()])].sort();
  if (!skills.length) return null;
  const value = rate=>rate==null?'Unavailable':format(rate);
  return <details className="ds-drill-section"><summary>Productivity rates by skill</summary>
    <p className="ds-context">Configured jobs per day from the plan inputs.</p>
    <div className="ds-scroll" tabIndex="0" aria-label="Productivity rates by skill">
      <table><thead><tr><th scope="col">Skill</th><th scope="col">Selected plan</th>
        {before && <th scope="col">Baseline</th>}
      </tr></thead><tbody>{skills.map(skill=><tr key={skill}>
        <th scope="row">{skill}</th><td>{value(selected.get(skill))}</td>
        {before && <td>{value(baseline.get(skill))}</td>}
      </tr>)}</tbody></table>
    </div>
  </details>;
}

function DecisionStudioDowntimeCategories({V,report,before,plan,baseline,comparable,format,category,onCategory,onRecords}) {
  const value = (parts,summary,id) => {
    const part = parts.get(id);
    return summary?.downtime==null ? null : part ? part.value : 0;
  };
  const categories = [...new Map([...plan,...baseline])].filter(([,part])=>part.path.length===1)
    .map(([id,part])=>{
      const selected = value(plan,report,id), base = value(baseline,before,id);
      return {id,name:part.path[0],plan:selected,baseline:base,
        change:comparable && selected!=null && base!=null ? selected-base : null};
    }).sort((a,b)=>(b.change==null ? b.plan ?? -1 : Math.abs(b.change))-(a.change==null ? a.plan ?? -1 : Math.abs(a.change)));
  const id = JSON.stringify([category]);
  const side = plan.has(id) ? 'plan' : 'baseline';
  const types = [...(side==='plan' ? plan : baseline).values()].filter(part=>part.path.length===2 && part.path[0]===category);
  const select = row=>onCategory(row.name===category ? null : row.name);
  return <div className="ds-downtime-breakdown">
    {before ? <section className="ds-drill-section">
      <h3>Downtime by category</h3>
      <p className="ds-context">The bar shows selected-plan hours. The marker shows baseline hours on matching assessed scope.</p>
      <DecisionStudioComparisonBars rows={categories} measure="downtime" format={format}
        onSelect={select} bullet active={id}/>
    </section> : <V.Bars title="Downtime by category" subtitle="Select a category to see its types and records."
      rows={categories.map(row=>({...row,value:row.plan}))} showDrilldown onSelect={select}/>}
    {category && <section className="ds-drill-section"><h3>{category} · {side==='plan'?'Selected plan':'Baseline'}</h3>
      <dl className="ds-component-list">{types.map(({path,value})=><div key={path[1]}><dt>
        <button type="button" className="ds-drill-link" onClick={()=>onRecords(path[1],side)}>
          {path[1]} <AnalyticsIcon name="chevron" size={11}/></button></dt>
        <dd>{decisionValue('downtime',value,format)}</dd></div>)}</dl>
      <button type="button" className="ds-drill-link" onClick={()=>onRecords(null,side)}>
        Open category records <AnalyticsIcon name="chevron" size={13}/></button>
      <button type="button" className="ds-drill-link" onClick={()=>onCategory(null)}>Clear category</button>
    </section>}
  </div>;
}

function DecisionStudioEvidence({A, geographyChanges, metric, format, gapLabel, assumptions, bundle, baseline, V,
  productivity, baselineProductivity, onClose, onSimulate}) {
  const [focus, setFocus] = React.useState(null);
  const [recordScope, setRecordScope] = React.useState(null);
  const [category, setCategory] = React.useState(null);
  const [downtimeType, setDowntimeType] = React.useState(null);
  const [rosterPath, setRosterPath] = React.useState(null);
  const [recordSide, setRecordSide] = React.useState('plan');
  const [stage, setStage] = React.useState(metric.sourceBundle ? 'records' : 'breakdown');
  const [chartView,setChartView] = React.useState('');
  const {report,before,key,title,impact,matrixChange} = metric;
  const measures = A.planningMeasures(report);
  const baselineMeasures = before && A.planningMeasures(before);
  const comparisonFor = id => id==='gap' ? {
    baseline:gapImpact.gapBefore, selected:gapImpact.gapAfter, change:gapImpact.delta
  } : {
    baseline:baselineMeasures[id], selected:measures[id],
    change:A.planningMeasureChange(before,report,id,geographyChanges,assumptions)
  };
  const gapImpact = before && (impact || A.planningImpact(before,report,geographyChanges,assumptions,false));
  const comparison = before && comparisonFor(key);
  const filteredComparison = key==='gap' && matrixChange && gapImpact.delta!=null;
  const recordReport = recordSide==='baseline' ? (recordScope ? recordScope.before : before)
    : (recordScope ? recordScope.report : report);
  const recordBundle = recordSide==='baseline' ? baseline : bundle;
  const isShortfallMeasure = key==='gap' || key==='shortage';
  const hours = value => value==null?'Unavailable':format(value)+' h';
  const heatRows = report.assessed.map(row => ({...row,region:[row.region, report.level==='area' && row.area,
    report.level==='patch' && row.patch].filter(Boolean).join(' / '),coverage:row.comparable && row.demand > 0 ? 100*row.capacity/row.demand : null}));
  const showHeatmap = new Set(heatRows.map(row=>row.skill)).size>1 && new Set(heatRows.map(row=>row.week)).size>1;
  const shortage = report.assessed.filter(row=>row.gap<0).sort((a,b)=>a.gap-b.gap || a.week.localeCompare(b.week));
  const recordPairs = recordScope ? recordScope.pairs : filteredComparison ? gapImpact.pairs : null;
  const evidenceCells = focus ? focus.cells : recordPairs ? recordPairs.flatMap(pair=>
    (recordSide==='baseline' ? pair.before : pair.after).cells) : null;
  const entries = stage==='records'
    ? (evidenceCells ? evidenceCells.flatMap(cell=>cell.evidence.map(entry=>({...entry,cell}))) : (recordReport?.evidence || []))
    : report.evidence;
  const evidenceReport = stage==='records' ? recordReport : report;
  const assessedCells = new Set(key==='capacity' ? evidenceReport?.capacityRows : evidenceReport?.downtimeRows);
  const relevant = entries.filter(entry=>['fte','roster'].includes(key) ? entry.row.source==='resource_plan'
    : key==='downtime' ? (entry.downtime || stage==='records' && recordScope?.includeRoster && entry.row.source==='resource_plan')
      && assessedCells.has(entry.cell)
    : ['demand','jobs'].includes(key) ? entry.row.source==='demand_input'
    : key==='capacity' ? entry.row.source!=='demand_input' && assessedCells.has(entry.cell) : true);
  const sources = new Map();
  const show = (row, contribution) => {
    if (!sources.has(row.source)) sources.set(row.source,new Map());
    const records = sources.get(row.source);
    if (!records.has(row.row)) records.set(row.row,{row,hours:0,known:false});
    const total = records.get(row.row);
    if (contribution != null) {total.hours+=contribution;total.known=true;}
  };
  const rosterMeasure = ['fte','roster'].includes(key);
  const rosterParts = rosterMeasure && stage==='breakdown' ? A.planningBreakdown(report,key,'breakdown',assumptions) : new Map();
  const baselineRosterParts = rosterMeasure && before && stage==='breakdown'
    ? A.planningBreakdown(before,key,'breakdown',assumptions) : new Map();
  for (const entry of relevant) {
    const applied = entry.downtime && entry.hours!==null
      ? entry.hours * (entry.cell?.downtime ? entry.cell.appliedDowntime/entry.cell.downtime : 0) : entry.hours;
    const matchesCategory = !category || (entry.row.category || 'Uncategorised') === category;
    const matchesType = !downtimeType || (entry.row.n.level2 || 'Unspecified type')===downtimeType;
    const matchesRoster = !rosterPath || (entry.cell.skill || 'Unspecified skill')===rosterPath[0] &&
      (entry.row.n.labourtype || 'Unspecified labour type')===rosterPath[1];
    if (matchesCategory && matchesType && matchesRoster) {
      show(entry.row,applied);
      if (entry.row.jobTime) show(entry.row.jobTime,null);
    }
  }
  const names = {downtime:'Applied downtime',resource_plan:'Roster hours',overtime:'Overtime',ctr_capacity:'Contractors',
    recruitment_grounded:'Grounded recruitment',recruitment_ungrounded:'Ungrounded recruitment',fte_transfer:'Transfers',
    hec_on_kac_demand:'KAC support',hec_on_ev_demand:'EV support'};
  const capacityParts = key==='capacity' && stage==='breakdown'
    ? [...A.planningBreakdown(report,key,'breakdown',assumptions).values()].filter(part=>part.path.length===1)
    : [];
  const planDowntime = key==='downtime' && stage==='breakdown' ? A.planningBreakdown(report,key,'breakdown',assumptions) : new Map();
  const baselineDowntime = key==='downtime' && before && stage==='breakdown' ? A.planningBreakdown(before,key,'breakdown',assumptions) : new Map();
  const rankedDemand = [...relevant.filter(entry=>entry.row.source==='demand_input')]
    .sort((a,b)=>(b.hours??-1)-(a.hours??-1));
  const local = report.assessed.flatMap(row=>row.cells).filter(row=>row.patch && row.gap<0);
  const localGroups = isShortfallMeasure ? A.planningSummary(local,'patch',assumptions).assessed : [];
  const useLocal = !shortage.length || localGroups.some(group=>group.id===focus?.id);
  const responseLevel = useLocal ? 'patch' : report.level;
  const responseGroups = metric.sourceBundle ? [] : useLocal ? localGroups : shortage;
  const metricTitle = decisionMeasure(key)[1];
  const gross = report.grossShortfall;
  const weeklyShortfalls = new Map();
  if (isShortfallMeasure) for (const group of report.assessed) {
    if (!weeklyShortfalls.has(group.week)) weeklyShortfalls.set(group.week,[]);
    weeklyShortfalls.get(group.week).push(...group.cells);
  }
  const shortfallWeeks = [...weeklyShortfalls].map(([week,cells])=>({
    week,gross:A.planningSummary(cells,report.level,assumptions).grossShortfall
  })).filter(item=>item.gross>0).sort((a,b)=>a.week.localeCompare(b.week));
  const firstWeek = shortfallWeeks[0];
  const worstWeek = shortfallWeeks.reduce((worst,item)=>item.gross>worst.gross?item:worst,firstWeek);
  const singleShortage = shortage.length===1 && report.assessed.length===1;
  const hasRosterBreakdown = singleShortage && !report.partial && report.rosterWeeks && report.downtime!=null;
  const figures = {
    gap:[['Required',hours(report.assessedDemand)],['Available',hours(report.assessedCapacity)],['Gross shortfall',hours(gross)]],
    shortage:[['Net imbalance',gapLabel(report.gap)]],
    fte:[['Allocated roster hours',hours(report.rosterWeeks ? report.roster : null)],['Eligible people',format(report.headcount)],
      ['Weeks used for FTE',format(report.fteWeeks)]],
    roster:[['Average allocated FTE',format(report.fte)],['Weeks in roster',format(report.rosterWeeks)]],
    downtime:[['Assessed roster',hours(report.downtime!=null ? report.assessedRoster : null)],
      ['Roster availability',report.downtimeRate==null?'Unavailable':format(100-report.downtimeRate)+'%'],
      ['Downtime share',report.downtimeRate==null?'Unavailable':format(report.downtimeRate)+'%']],
    capacity:[['Roster',hours(report.rosterWeeks ? report.roster : null)],['Downtime',hours(report.downtime)]],
    demand:[['Matched hours',hours(report.demand)],['Unmatched job rows',format(relevant.filter(entry=>entry.hours===null).length)]]
  }[key] || [];
  if (firstWeek) figures.push(['First short week',firstWeek.week],['Worst short week',worstWeek.week+' · '+hours(worstWeek.gross)]);
  const explanation = {
    gap:report.gap==null ? 'Demand and capacity could not be paired for this selection.'
      : 'Available hours minus required hours in the same assessed planning groups.',
    fte:'Allocated roster hours divided by '+format(assumptions.standardHours)+' standard hours per FTE per week.',
    downtime:'Hours deducted from the roster using '+({hours:'fixed hours',percent:'a percentage of roster hours',perFte:'hours per FTE'}[assumptions.downtime] || 'the selected downtime method')+'. Availability uses assessed roster hours before additional cover.',
    capacity:'Roster hours after downtime, plus any eligible cover and transfers.',
    demand:'Forecast jobs multiplied by their matching job duration.',
    jobs:'Submitted forecast jobs in this scope.',
    roster:'Allocated working hours before downtime and other adjustments.',
    shortage:'Shortages in assessed groups before available surplus offsets the net position.'
  }[key];
  const sourceNames = {
    ...names,demand_input:'Forecast demand',job_time_assumptions:'Job durations',resource_plan:'Resource plan',
    downtime_overlays_hours:'Downtime in hours',downtime_overlays_percentage:'Downtime percentages',downtime_overlays_hours_fte:'Downtime hours per FTE'
  };
  const tabs = [
    ['breakdown','Breakdown','trend'],['records','Source records','file'],
    ...(responseGroups.length && isShortfallMeasure ? [['test','Test a change','sliders']] : [])
  ];
  const openRecords = group => {setRecordScope(null);setFocus(group);setRecordSide('plan');setStage('records');};
  const openScopedRecords = (scope,side) => {
    setFocus(null);
    setCategory(null);
    setDowntimeType(null);
    setRosterPath(null);
    setRecordScope(scope);
    setRecordSide(side);
    setStage('records');
  };
  const compareCapacity = key==='capacity' && !!before;
  const hasLocations = key==='capacity' && decisionCapacityDimensions(report,before).length>0;
  const hasTimeline = new Set([...report.assessed,...(before?.assessed || [])].map(group=>group.week)).size>1
    && (measures[key]!=null || baselineMeasures?.[key]!=null);
  const chartViews = [
    ...(key==='downtime' && planDowntime.size+baselineDowntime.size ? [['categories','By category']] : []),
    ...(hasLocations && compareCapacity ? [['locations','By location']] : []),
    ...(hasTimeline ? [['trend','Trend']] : []),
    ...(hasLocations && !compareCapacity ? [['locations','By location']] : []),
    ...(key==='capacity' && report.capacity!=null && capacityParts.length ? [['components','Capacity components']] : []),
    ...(isShortfallMeasure && metric.impact ? [['drivers','Change drivers']] : []),
    ...(isShortfallMeasure && showHeatmap ? [['heatmap','Heatmap']] : [])
  ];
  const activeChart = chartViews.find(([id])=>id===chartView)?.[0] || chartViews[0]?.[0];
  const scopedRoster = stage==='records' && recordScope && rosterMeasure && recordReport
    ? [...A.planningBreakdown(recordReport,key,'breakdown',assumptions).values()].filter(part=>part.path.length===2)
    : [];
  function groupList(groups, heading, localList = false) {
    if (!groups.length) return null;
    return <section className="ds-drill-section">
      <h3>{heading}</h3>
      <p className="ds-context">Select a group to open its contributing records.</p>
      <div className="ds-drill-groups">{groups.map(group=><button type="button" key={group.id} onClick={()=>openRecords(group)}>
        <span><strong>{(localList ? group.patch : [group.region,report.level!=='region' && group.area,report.level==='patch' && group.patch].filter(Boolean).join(' / '))+' · '+group.skill}</strong>
          <small>Week of {group.week}</small></span>
        <b>{gapLabel(group.gap)}</b><AnalyticsIcon name="chevron" size={14}/>
      </button>)}</div>
    </section>;
  }
  return <AnalyticsDrawer title={metricTitle} subtitle={bundle?.scenarioId} eyebrow="Decision Studio" panelClassName="ds-planning-drawer"
    footer="Source records are read-only. What-if changes stay in this panel." onClose={onClose}>
    <section className="ds-drill-hero" data-measure={key} data-tone={key==='shortage'
      ? (matrixChange ? (matrixChange.value>0?'short':matrixChange.value<0?'spare':undefined) : gross>0?'short':undefined)
      : key==='gap' && (matrixChange ? matrixChange.value : report.gap)<0?'short'
      : key==='gap' && (matrixChange ? matrixChange.value : report.gap)>0?'spare':undefined}>
      <p className="ds-drill-scope">{[...new Set([title,metric.scope].filter(Boolean).join(' · ').split(' · '))].join(' · ')}</p>
      <strong className="ds-drill-result">{matrixChange ? decisionChange(key,matrixChange.value,format)
        : key==='gap' ? gapLabel(report.gap) : decisionValue(key,measures[key],format)}</strong>
      {comparison && <dl aria-label={key==='gap'?'Matched groups':'Comparison'}>
        <div><dt>{key==='gap'?'Matched baseline':'Baseline'}</dt><dd>{decisionValue(key,comparison.baseline,format)}</dd></div>
        <div><dt>{key==='gap'?'Matched selected plan':'Selected plan'}</dt><dd>{decisionValue(key,comparison.selected,format)}</dd></div>
        {!matrixChange && <div><dt>Change</dt><dd>{decisionChange(key,comparison.change,format)}</dd></div>}
      </dl>}
      <p>{explanation}</p>
      {(report.partialByMeasure[key] || (matrixChange && before?.partialByMeasure[key])) &&
        <span className="ds-drill-coverage"><AnalyticsIcon name="info" size={13}/> Partial assessment</span>}
      {figures.length>0 && <dl aria-label="Selected plan figures">{figures.map(([text,value])=>
        <div key={text}><dt>{matrixChange ? 'Selected plan '+text.toLowerCase() : text}</dt><dd>{value}</dd></div>)}</dl>}
    </section>
    <div className="ds-drill-nav" role="group" aria-label="Metric details">
      {tabs.map(([id,text,icon])=><button key={id} type="button" aria-pressed={stage===id}
        onClick={()=>{if (id!=='records') setRecordScope(null);setStage(id);}}><AnalyticsIcon name={icon} size={15}/>{text}{id==='records'&&sources.size>0&&<small>{sources.size}</small>}</button>)}
    </div>
    {stage==='breakdown' && <div className="ds-drill-body">
      {activeChart && <div className="ds-detail-chart">
        {chartViews.length>1 && <div className="ds-period-switch" role="group" aria-label="Detail chart view">
          {chartViews.map(([id,label])=><button key={id} type="button" aria-pressed={activeChart===id}
            onClick={()=>setChartView(id)}>{label}</button>)}
        </div>}
        {activeChart==='trend' && <DecisionStudioMetricTimeline A={A} V={V} report={report} before={before} measure={key}
          assumptions={assumptions} geographyChanges={geographyChanges} format={format} onSelect={openScopedRecords}/>}
        {activeChart==='locations' && <DecisionStudioCapacityDistribution A={A} V={V} report={report} before={before}
          assumptions={assumptions} geographyChanges={geographyChanges} format={format} onSelect={openScopedRecords}/>}
        {activeChart==='categories' && <DecisionStudioDowntimeCategories V={V} report={report} before={before}
          plan={planDowntime} baseline={baselineDowntime} comparable={comparison?.change!=null}
          format={format} category={category} onCategory={setCategory}
          onRecords={(type,side)=>{setDowntimeType(type);setRecordSide(side);setStage('records');}}/>}
        {activeChart==='components' && <V.Waterfall title="From roster to available hours"
          steps={capacityParts.map(({path,value})=>({name:path[0],value}))
            .concat([{name:'Available hours',value:report.capacity,total:true}])}/>}
        {activeChart==='drivers' && <DecisionStudioImpact impact={metric.impact} format={format} V={V} baseline={baseline} revised={bundle}/>}
        {activeChart==='heatmap' && <V.Heatmap title="Gap by skill and week" rows={heatRows} onSelect={openRecords}/>}
      </div>}
      {['fte','roster'].includes(key) && <section className="ds-drill-section"><h3>{key==='fte'?'How FTE is calculated':'How roster hours are calculated'}</h3>
        <p>Weekly working hours are adjusted by each worker’s allocation. {key==='fte'?'The selected period is shown as an average per roster week.':'The selected period includes allocated hours across its roster weeks.'}</p>
        {key==='fte' && report.fteWeeks!==report.rosterWeeks &&
          <p className="ds-context">This location contributes to the parent’s {report.fteWeeks}-week FTE average.</p>}
        {rosterParts.size+baselineRosterParts.size>0 && <div className="ds-scroll" tabIndex="0" aria-label="Roster contributions">
          <table><thead><tr><th scope="col">Skill · Labour type</th><th scope="col">Selected plan</th>
            {before && <th scope="col">Change</th>}</tr></thead>
            <tbody>{[...new Map([...rosterParts,...baselineRosterParts])].filter(([,part])=>part.path.length===2)
              .map(([id,{path}])=>{
                const planValue = rosterParts.get(id)?.value ?? (measures[key]!=null ? 0 : null);
                const baseValue = baselineRosterParts.get(id)?.value ?? (baselineMeasures?.[key]!=null ? 0 : null);
                return <tr key={id}><th scope="row"><button type="button" className="ds-drill-link" onClick={()=>{
                  setRosterPath(path);setRecordSide(rosterParts.has(id)?'plan':'baseline');setStage('records');
                }}>{path.join(' · ')} <AnalyticsIcon name="chevron" size={11}/></button></th>
                  <td>{decisionValue(key,planValue,format)}</td>
                  {before && <td>{decisionChange(key,comparison.change==null ? null : planValue-baseValue,format)}</td>}
                </tr>;
              })}</tbody></table>
        </div>}
        <button type="button" className="ds-drill-link" onClick={()=>{setRosterPath(null);setStage('records');}}>
          Open resource plan <AnalyticsIcon name="chevron" size={13}/></button>
      </section>}
      {key==='capacity' && <>
        {report.unallocated!==0 && <p className="ds-context">{hours(report.unallocated)} held at region level.</p>}
        <DecisionStudioProductivity A={A} report={report} before={before} productivity={productivity}
          baselineProductivity={baselineProductivity} format={format}/>
      </>}
      {['demand','jobs'].includes(key) && <AnalyticsTable title="Forecast work by job code and week" rows={rankedDemand.map(({row,hours})=>({
        patch:row.patch,week:row.week,code:row.workCode,jobs:row.jobs,duration:row.jobTime?.value,hours
      }))} searchable={false} pageSize={12} columns={[
        {key:'patch',label:'Patch'},{key:'week',label:'Week'},{key:'code',label:'Work code'},{key:'jobs',label:'Jobs'},
        {key:'duration',label:'Duration ('+assumptions.jobTimeUnit+')'},{key:'hours',label:'Required hours',render:row=>format(row.hours)}
      ]}/>}
      {isShortfallMeasure && <>
        {singleShortage ? <section className="ds-drill-section">
          <h3>What makes up this week’s capacity?</h3>
          {hasRosterBreakdown ? <dl className="ds-component-list">
            <div><dt>Allocated roster · {format(report.fte)} FTE</dt><dd>{hours(report.roster)}</dd></div>
            <div><dt>Downtime deducted</dt><dd>{hours(-report.downtime)}</dd></div>
            {Math.abs(report.assessedCapacity-report.roster+report.downtime)>1e-8 && <div>
              <dt>Net cover and adjustments</dt><dd>{hours(report.assessedCapacity-report.roster+report.downtime)}</dd></div>}
            <div><dt>Available for work</dt><dd>{hours(report.assessedCapacity)}</dd></div>
          </dl> : <p className="ds-context">The contributing inputs show which working hours and demand could be assessed.</p>}
          <button type="button" className="ds-evidence-action" onClick={()=>openRecords(shortage[0])}>
            View supporting records <AnalyticsIcon name="chevron" size={15}/></button>
        </section> : groupList(shortage,'Shortfalls by skill and week')}
        {report.level!=='patch' && localGroups.length>0 && <details className="ds-drill-section">
          <summary>Shortfalls within patches · {localGroups.length} groups</summary>
          {groupList(localGroups,'Patch detail',true)}
        </details>}
        {!shortage.length && !localGroups.length && report.comparable>0 && <p>No assessed groups are short in this selection.</p>}
      </>}
      {report.assessed.some(group=>group.cells.some(cell=>cell.unresolvedDowntime)) &&
        <p className="ds-drill-coverage">Some downtime records have no eligible roster for the same location and week.</p>}
      {before && <details className="ds-source"><summary><strong>All metrics</strong><AnalyticsIcon name="chevron" size={13}/></summary>
        <div className="ds-scroll ds-operational-comparison" tabIndex="0" aria-label="Operational comparison"><table>
          <thead><tr><th scope="col">Measure</th><th scope="col">Baseline</th><th scope="col">Selected plan</th><th scope="col">Change</th></tr></thead>
          <tbody>{decisionMeasures.map(([id,name])=>{
            const {baseline,selected,change} = comparisonFor(id);
            return <tr key={id}><th scope="row">{name}{id==='gap' && ' (matched groups)'}</th>
              <td>{decisionValue(id,baseline,format)}</td>
              <td>{decisionValue(id,selected,format)}</td>
              <td>{decisionChange(id,change,format)}</td>
            </tr>;
          })}</tbody>
        </table></div>
        {(gapImpact.baselineCoverage.groups>0 || gapImpact.revisedCoverage.groups>0) &&
          <p className="ds-context">Outside the matched gap comparison · Baseline {gapImpact.baselineCoverage.groups} groups,
            {' '}{decisionValue('gap',gapImpact.baselineCoverage.hours,format)} assessed gap · Selected plan {gapImpact.revisedCoverage.groups} groups,
            {' '}{decisionValue('gap',gapImpact.revisedCoverage.hours,format)} assessed gap.</p>}
      </details>}
    </div>}
    {stage==='records' && <div className="ds-drill-body">
      {before && <div className="ds-drill-nav" role="group" aria-label="Source plan">
        {['plan','baseline'].map(side=><button type="button" key={side} aria-pressed={recordSide===side}
          onClick={()=>{setRecordSide(side);setFocus(null);}}>{side==='plan'?'Selected plan records':'Baseline records'}</button>)}
      </div>}
      <section className="ds-drill-section"><h3>{metric.sourceBundle || recordSide==='baseline'?'Baseline records':'Supporting records'}</h3>
        <p className="ds-context">{focus ? [focus.patch || focus.area || focus.region,focus.skill,focus.week].filter(Boolean).join(' · ')
          : recordScope?.label || [category,downtimeType].filter(Boolean).join(' · ') || rosterPath?.join(' · ') ||
            (filteredComparison?'Records from the groups used in the gap comparison.':'Records used for the selected figure.')}</p>
        {(focus || recordScope || category || rosterPath) && <button type="button" className="ds-drill-link" onClick={()=>{
          setFocus(null);setRecordScope(null);setCategory(null);setDowntimeType(null);setRosterPath(null);
        }}>Show all records in this selection</button>}
      </section>
      {scopedRoster.length>0 && <details className="ds-source" open>
        <summary><strong>Skill and labour type in this period</strong><AnalyticsIcon name="chevron" size={13}/></summary>
        <dl className="ds-component-list">{scopedRoster.map(({path,value})=><div key={JSON.stringify(path)}>
          <dt><button type="button" className="ds-drill-link" aria-pressed={rosterPath?.[0]===path[0] && rosterPath[1]===path[1]}
            onClick={()=>setRosterPath(current=>current?.[0]===path[0] && current[1]===path[1] ? null : path)}>
            {path.join(' · ')} <AnalyticsIcon name="chevron" size={11}/>
          </button></dt><dd>{decisionValue(key,value,format)}</dd>
        </div>)}</dl>
      </details>}
      {!sources.size && <p>No contributing source records for this selection.</p>}
      {[...sources].map(([source, records])=><details key={source} open={sources.size===1} className="ds-source">
        <summary><AnalyticsIcon name="file" size={16}/><strong>{sourceNames[source] || source.replace(/_/g,' ')}</strong>
          <span>{records.size} {records.size===1?'record':'records'}</span><AnalyticsIcon name="chevron" size={13}/></summary>
        <p className="ds-context ds-source-version">{recordBundle?.sources?.[source]?.version}</p>
        <AnalyticsTable title="Source records" rows={[...records.values()].map(({row,hours,known})=>({
          ...row.raw,'Source row':row.row,...(known?{'Modeled hours':format(hours)}:{})
        }))} pageSize={12} columns={[...new Set(['Source row',...[...records.values()].flatMap(({row,known})=>
          [...Object.keys(row.raw),...(known?['Modeled hours']:[])])])].map(name=>({key:name,label:name}))}/>
      </details>)}
    </div>}
    {stage==='test' && <div className="ds-drill-body"><DecisionStudioResponse groups={responseGroups} focused={focus} level={responseLevel}
      format={format} gapLabel={gapLabel} onSimulate={onSimulate}/></div>}
  </AnalyticsDrawer>;
}

function DecisionStudioNavigation({presentation, onNavigate}) {
  if (presentation==='summary') return null;
  const heading = {investigate:'Investigations',workload:'Upcoming workload',checks:'Data readiness'}[presentation];
  return <header className="ds-nav">
    <div className="ds-view-heading">
      <button type="button" className="ds-return" onClick={()=>onNavigate('summary')}>Back to capacity plan</button>
      {heading && <h1>{heading}</h1>}
    </div>
  </header>;
}

function AnalyticsWorkspace({
  scenarios = {},
  selectedScenarioId,
  inputsState = {},
  baselineScenarioId,
  comparisonScenarioId,
  presentation:activePresentation,
  onPresentationChange
}) {
  const A = window.CapacityAnalytics;
  const V = window.AnalyticsViz;
  const savedIds = Object.keys(scenarios);
  const draftHasInputs = Object.values(inputsState).some(Boolean);
  const activeSavedPlan = savedIds.includes(selectedScenarioId);
  const savedPlanHasInputs = Object.values(scenarios[selectedScenarioId]?.inputs || {}).some(Boolean);
  const activePlan = activeSavedPlan && (savedPlanHasInputs || !draftHasInputs) ? selectedScenarioId
    : selectedScenarioId==='__draft' || draftHasInputs ? '__draft'
    : [baselineScenarioId,...savedIds].find(id=>savedIds.includes(id)) || '__draft';
  const defaultBaseline = [baselineScenarioId,comparisonScenarioId,...savedIds]
    .find(id=>id!==activePlan && savedIds.includes(id)) || '';
  const [scenarioId, setScenarioId] = React.useState(activePlan);
  const [baselineId, setBaselineId] = React.useState(defaultBaseline);
  const [loadedPlan, setBundle] = React.useState(null),
    [loadedBaseline, setBaseline] = React.useState(null);
  const bundle = loadedPlan?.scenarioId === (scenarioId==='__draft' ? 'Draft inputs' : scenarioId) ? loadedPlan : null;
  const baseline = loadedBaseline?.scenarioId === baselineId ? loadedBaseline : null;
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(''),
    [refresh, setRefresh] = React.useState(0);
  const [area, setArea] = React.useState('drivers'),
    [view, setView] = React.useState('demand');
  const [filter, setFilterState] = React.useState({
    region: 'All',
    area: 'All',
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
  const [sourceSearch, setSourceSearch] = React.useState('');
  const [sourcePage, setSourcePage] = React.useState(0),
    [sourceChoice, setSourceChoice] = React.useState('demand_input');
  const [cohortSearch, setCohortSearch] = React.useState('');
  const [planningDate, setPlanningDate] = React.useState(() => {
    const now=new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  });
  const [localPresentation, setLocalPresentation] = React.useState('summary');
  const presentation = activePresentation ?? localPresentation;
  const setPresentation = onPresentationChange ?? setLocalPresentation;
  const navigate = destination => {
    setDetail(null);
    setPresentation(destination);
  };
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false);
  const planningView = presentation==='summary' || presentation==='imbalance';

  const forecastBundle = value => value ? {...value,sources:Object.fromEntries(Object.entries(value.sources||{}).filter(([key])=>key!=='actuals_input'))} : null;
  const data = React.useMemo(() => A.extract(forecastBundle(bundle)), [bundle]);
  const baseData = React.useMemo(() => A.extract(forecastBundle(baseline)), [baseline]);
  const requestState = React.useRef({});
  const filterHistory = React.useRef([]);
  const forecastReports = React.useRef({});
  const clearScope = {region:'All',area:'All',patch:'All',skill:'All',start:'',end:''};
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
    setScenarioId(activePlan);
  }, [activePlan]);
  React.useEffect(() => {
    setBaselineId(defaultBaseline);
  }, [defaultBaseline]);
  const baselineToLoad = comparisonEnabled && baselineId!==scenarioId ? baselineId : '';
  const draftInputVersions = scenarioId==='__draft' ? JSON.stringify(inputsState) : null;
  const planInputVersions = JSON.stringify(scenarios[scenarioId]?.inputs);
  const baselineInputVersions = JSON.stringify(scenarios[baselineToLoad]?.inputs);
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
      const loadBaseline = !!baselineToLoad;
      const requests = {[stamp + '-current']: 'current'};
      if (loadBaseline) requests[stamp + '-baseline'] = 'baseline';
      requestState.current = requests;
      window.Shiny.setInputValue('request_analytics_bundle', {
        requestId: stamp + '-current',
        scenarioId,
        draft: scenarioId === '__draft',
        inputs: draftInputVersions==null ? undefined : JSON.parse(draftInputVersions)
      }, {
        priority: 'event'
      });
      // Yield separate Shiny events so the second request cannot coalesce with the first.
      if (loadBaseline) timeout = setTimeout(() => {
        if (!disposed) window.Shiny.setInputValue('request_analytics_bundle', {
          requestId: stamp + '-baseline',
          scenarioId: baselineToLoad
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
      if (!data.success) setError(prev => [prev, `${role}: ${data.error || 'Unable to load selected sources'}`].filter(Boolean).join(' · '));
      else if (role === 'current') {
        setBundle(data);
      } else setBaseline(data);
      if (role === 'current') setBusy(false);
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
  }, [scenarioId,baselineToLoad,refresh,draftInputVersions,planInputVersions,baselineInputVersions]);
  const weeks = data.weeks;
  const current = React.useMemo(() => A.model(data, filter, assumptions), [data, filter, assumptions]);
  const tested = React.useMemo(() => A.model(data, filter, assumptions, shock), [data, filter, assumptions, shock]);
  const compared = React.useMemo(() => A.model(baseData, filter, assumptions), [baseData, filter, assumptions]);
  const outlook = React.useMemo(() => A.workloadOutlook(data, filter, planningDate, current, assumptions), [data, filter, planningDate, current, assumptions]);
  const geographyChanges = React.useMemo(() => baseline && bundle ? A.geographyChanges(baseData,data) : [], [baseline,bundle,baseData,data]);
  const differences = React.useMemo(() => A.compareSources(forecastBundle(baseline), forecastBundle(bundle)), [baseline, bundle]);
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
    planAtAGlance: A.planHealth(current, demand),
    upcomingWorkload: outlook,
    forecastInvestigations: Object.values(forecastReports.current).filter(r=>r.context===JSON.stringify({scenarioId,loadedAt:bundle?.loadedAt,filter,assumptions})).map(({context,...r})=>r),
    modelStatus: 'Exploratory source-based model; not SLA or a complete workforce forecast',
    rationale,
    current: summary(current),
    tested: summary(tested),
    runs,
    issues: data.issues,
    sources: Object.fromEntries(Object.entries(bundle?.sources || {}).filter(([key])=>key!=='actuals_input').map(([k, v]) => [k, {
      version: v.version,
      hash: v.hash,
      rowCount: v.rowCount,
      success: v.success,
      error: v.error
    }])),
    baselineSources: Object.fromEntries(Object.entries(baseline?.sources || {}).filter(([key])=>key!=='actuals_input').map(([k, v]) => [k, {
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
      sourceHashes: Object.fromEntries(Object.entries(bundle.sources).filter(([key])=>key!=='actuals_input').map(([k, v]) => [k, v.hash || null]))
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
      title: 'Understand the plan',
      icon: 'trend',
      views: {
        demand: 'Demand drivers',
        capacity: 'Capacity composition',
        downtime: 'Downtime',
        changes: 'Scenario changes',
        quality: 'Data coverage'
        ,jobtime: 'Job-time review',reconcile:'Input reconciliation',monthly:'Monthly outlook'
      }
    },
    readiness: {
      title: 'Find gaps & risks',
      icon: 'handshake',
      views: {
        deficits: 'Deficit concentration',
        recruitment: 'Recruitment readiness',
        support: 'Support dependence',
        timing: 'Peaks & decision timing',commitments:'Commitment & supplier risk',workforce:'Workforce movements'
      }
    },
    stress: {
      title: 'Test what could change',
      icon: 'shield',
      views: {
        stress: 'Combined stress tests',
        sensitivity: 'Sensitivity & breakpoints',stability:'Plan stability & headroom'
      }
    },
    choices: {
      title: 'Choose a response',
      icon: 'lightbulb',
      views: {
        actions: 'Compare interventions',target:'Target capacity planner'
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
  const sourceNames = Object.keys(bundle?.sources || {}).filter(k=>k!=='actuals_input');
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
  const renderChangesDetails = () => <>{geographyChanges.length>0 && <Table title="Changed geography assignments" rows={geographyChanges} columns={[
      {key:'patch',label:'Patch'},{key:'before',label:'Baseline'},{key:'after',label:'Selected plan'}
    ]}/>} {!baseline && <Note>Select an available saved baseline to compare input contents.</Note>}<section className={panel}><h3 className="font-bold text-sm mb-3">Selected-version content comparison · click a row</h3><Table rows={differences} columns={[{
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
    }, ...runs.filter(r => r.scenario === bundle.scenarioId && JSON.stringify(r.scope) === JSON.stringify(filter) && JSON.stringify(r.sourceHashes) === JSON.stringify(Object.fromEntries(Object.entries(bundle.sources).filter(([key])=>key!=='actuals_input').map(([k, v]) => [k, v.hash || null])))).map(r => ({
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
  const explore = (nextArea,nextView) => {
    setPresentation('investigate');setArea(nextArea);setView(nextView);setDetail(null);
    if(typeof document!=='undefined')setTimeout(()=>document.getElementById('analytics-investigation-heading')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
  };
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
  const forecastSettingsKey = id => JSON.stringify({id,scenarioId,sources:sourceNames.map(key=>[key,bundle.sources[key].hash||bundle.sources[key].error||null])});
  const forecastView = id => <AnalyticsForecastView key={forecastSettingsKey(id)} settingsKey={forecastSettingsKey(id)} view={id} data={data} current={current} filter={filter} assumptions={assumptions} onInspect={sourceDetail} onFocus={setFilter} onExport={(name,rows)=>csv(name,rows.map(r=>({scenario:scenarioId,scope:JSON.stringify(filter),...r})))} onReport={report=>{
    const clean=JSON.parse(JSON.stringify(report,(key,value)=>['records','raw','n','jobTime'].includes(key)?undefined:value));
    forecastReports.current[id]={...clean,context:JSON.stringify({scenarioId,loadedAt:bundle?.loadedAt,filter,assumptions})};
  }}/>;
  const renderers = {
    demand: renderDemand,
    capacity: renderCapacity,
    downtime: renderDowntime,
    changes: renderChanges,
    quality: ()=><>{forecastView('priorities')}{renderQuality()}</>,
    deficits: renderDeficits,
    recruitment: renderRecruitment,
    support: renderSupport,
    timing: ()=><>{forecastView('peaks')}{renderTiming()}</>,
    stress: renderStress,
    sensitivity: renderSensitivity,
    actions: renderActions,
    target:()=>forecastView('target'),commitments:()=>forecastView('commitments'),stability:()=>forecastView('stability'),jobtime:()=>forecastView('jobtime'),workforce:()=>forecastView('workforce'),reconcile:()=>forecastView('reconcile'),monthly:()=>forecastView('monthly')
  };
  const detailRows = detail?.rows || [],
    visibleDetail = detailRows.filter(r => JSON.stringify(r.raw).toLowerCase().includes(sourceSearch.toLowerCase()));

  return <div className="analytics-workspace ds-workspace pb-8">
        <DecisionStudioNavigation presentation={presentation} onNavigate={navigate}/>
        <div id="analytics-presentation-panel">
        {planningView && <DecisionStudioOverview A={A} V={V} data={data} bundle={bundle} scenarios={scenarios}
          presentation={presentation}
          scenarioId={scenarioId} setScenarioId={setScenarioId} filter={filter} setFilter={setFilter} clearScope={clearScope}
          baseline={baseline} baselineId={baselineId} setBaselineId={setBaselineId} baseData={baseData} geographyChanges={geographyChanges}
          comparisonEnabled={comparisonEnabled} setComparisonEnabled={setComparisonEnabled}
          undoFilter={undoFilter} canUndo={filterHistory.current.length>0} assumptions={assumptions} busy={busy}
          onImbalance={()=>navigate('imbalance')}
          onChecks={()=>navigate('checks')}/>}
        {!busy && bundle && presentation==='workload' && <>
          <DecisionStudioMonthlyWorkload A={A} V={V} data={data} filter={filter} setFilter={setFilter}/>
          <details className="ds-panel ds-workload-detail"><summary>Weekly workload and decisions</summary>
            <AnalyticsWorkloadOutlook mode="workload" report={outlook} planningDate={planningDate} onDateChange={setPlanningDate} onExplore={explore} onSource={sourceDetail}/>
          </details>
        </>}
        {!busy && bundle && presentation==='checks' && <AnalyticsWorkloadOutlook mode="checks" report={outlook}
          planningDate={planningDate} onDateChange={setPlanningDate} onExplore={explore} onSource={sourceDetail}/>}
        {presentation==='investigate'&&<>
        {/* Top: 4 Category Navigation Cards */}
        <nav aria-label="Analytics areas" className="av-area-nav grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(areas).map(([id, a]) => {
            const isSelected = area === id;
            const subCount = Object.keys(a.views).length;
            return (
              <button
                key={id}
                aria-label={a.title}
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

        {!busy && bundle && (
          <>
            <details id="analytics-investigation-heading" className="av-question-guide" aria-label="About this investigation"><summary>{ANALYTICS_QUESTIONS[view]?.[0]}<span>About this view</span></summary><p>{ANALYTICS_QUESTIONS[view]?.[1]}</p></details>
            {/* If category has more than 1 subtab, render subtab heading; if only 1 subtab, no need to create subtab heading */}
            <div className={`flex flex-wrap justify-between items-center gap-2 ${Object.keys(areas[area].views).length > 1 ? 'mt-4 mb-3' : 'mt-3 mb-2'}`}>
              {Object.keys(areas[area].views).length > 1 && (
                <h2 className="av-section-title text-lg font-bold text-slate-900 dark:text-white">
                  {areas[area].views[view]}
                </h2>
              )}
              <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full ml-auto">
                Estimate based on available evidence
              </span>
            </div>
            {renderers[view]()}
            <section className={panel}><div className="flex flex-wrap justify-between items-center gap-3 mb-3"><h3 className="text-sm font-bold text-slate-900 dark:text-white">Source evidence explorer</h3><div className="flex gap-2"><select aria-label="Evidence source" className={select} value={sourceChoice} onChange={e => setSourceChoice(e.target.value)}>{sourceNames.map(s => <option key={s} value={s} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{label(s)}</option>)}</select><button className={button + ' whitespace-nowrap'} onClick={() => sourceDetail(sourceChoice)}>Inspect rows</button></div></div><textarea aria-label="Decision rationale" value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Decision rationale, conditions for approval, or questions for the submitting team…" className={select + ' min-h-[70px]'} /><p className="text-[10px] text-slate-400 dark:text-[#adbed4] mt-2">Rationale and pinned runs stay in memory across app tabs. Export the decision brief before reloading or closing the page.</p></section>
          </>
        )}
        </>}
        </div>
        {error && <div role="alert" className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-sm mt-3">{error}</div>}
        {busy && <div role="status" className={panel + ' text-sm text-slate-500 dark:text-[#adbed4] animate-pulse mt-3'}>Reading selected source versions and baseline…</div>}
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
