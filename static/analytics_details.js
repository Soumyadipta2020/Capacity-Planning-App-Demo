/* Secondary analytics surfaces: disclosures, evidence, comparisons and settings. */
function AnalyticsScopeBar({filter,weeks=[],regions=[],patches=[],onChange,onReset,onUndo,canUndo,scenario}) {
  const [expanded,setExpanded]=React.useState(false),container=React.useRef(null);
  React.useEffect(()=>{
    if(!expanded)return;
    const outside=e=>{if(!container.current?.contains(e.target))setExpanded(false);};
    const escape=e=>{if(e.key==='Escape'){setExpanded(false);container.current?.querySelector('[aria-label="Edit analytics filters"]')?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[expanded]);
  const single=!!filter.start&&filter.start===filter.end,index=single?weeks.indexOf(filter.start):-1;
  const active=Number(filter.region!=='All')+Number(filter.patch!=='All')+Number(filter.skill!=='All')+Number(!!filter.start||!!filter.end);
  const date=value=>{if(!value)return '';const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())?d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit',timeZone:'UTC'}):value;};
  const remove=part=>onChange(part==='week'?{...filter,start:'',end:''}:part==='region'?{...filter,region:'All',patch:'All'}:{...filter,[part]:'All'});
  const chip=(part,label)=><button key={part} className="av-scope-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-[#80c6ff] border border-blue-200/80 dark:border-blue-700/60 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 hover:border-rose-300 transition cursor-pointer" aria-label={'Remove '+part+' filter'} onClick={()=>remove(part)}>{label}<AnalyticsIcon name="close" size={11}/></button>;
  const field=(label,key,options,empty)=> <label className="block text-xs font-semibold text-slate-700 dark:text-[#adbed4] space-y-1"><span>{label}</span><select aria-label={'Quick '+label.toLowerCase()} className="w-full text-xs font-bold bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white border border-slate-200 dark:border-[#18365d] rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs" value={filter[key]} onChange={e=>{
    const next={...filter,[key]:e.target.value};if(key==='region')next.patch='All';
    if(key==='start'&&next.end&&next.start>next.end)next.end=next.start;
    if(key==='end'&&next.start&&next.end&&next.end<next.start)next.start=next.end;
    onChange(next);
  }}>{empty&&<option value="">{empty}</option>}{options.map(v=><option key={v} value={v}>{/^\d{4}-/.test(v)?date(v):v}</option>)}</select></label>;
  return <div ref={container} className="av-scope-livebar relative flex flex-wrap items-center justify-between gap-2.5 py-1.5 text-xs" aria-label="Persistent analytics scope">
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      <div className="av-scope-live-title flex items-center gap-1.5 font-bold text-slate-700 dark:text-[#80c6ff] pr-3 border-r border-slate-200 dark:border-[#18365d] flex-shrink-0">
        <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-[#80c6ff] flex items-center justify-center flex-shrink-0">
          <AnalyticsIcon name="sliders" size={13}/>
        </span>
        <div className="leading-tight">
          <strong className="text-[11px] font-black uppercase tracking-wider block text-slate-800 dark:text-white">Scope</strong>
          <small className="text-[10px] text-slate-400 dark:text-[#adbed4] block truncate max-w-[130px]" title={scenario}>{scenario||'Analytics'}</small>
        </div>
      </div>
      <div className="av-scope-live-chips flex flex-wrap items-center gap-1.5 min-w-0" aria-live="polite">
        {filter.region!=='All'&&chip('region','Region '+filter.region)}
        {filter.patch!=='All'&&chip('patch',filter.patch)}
        {filter.skill!=='All'&&chip('skill',filter.skill)}
        {(filter.start||filter.end)&&chip('week',single?'Week of '+date(filter.start):date(filter.start||weeks[0])+' – '+date(filter.end||weeks[weeks.length-1]))}
        {!active&&<span className="av-scope-all text-[11px] font-semibold text-slate-400 dark:text-[#adbed4]">All regions · all skills · full horizon</span>}
      </div>
    </div>
    <div className="av-scope-live-actions flex items-center gap-1.5 flex-shrink-0">
      {single&&<div className="av-week-stepper inline-flex items-center gap-1 bg-slate-50 dark:bg-[#08162b] border border-slate-200 dark:border-[#18365d] rounded-lg px-2 py-0.5">
        <button aria-label="Previous available week" disabled={index<=0} onClick={()=>onChange({...filter,start:weeks[index-1],end:weeks[index-1]})} className="px-1 text-slate-600 dark:text-[#adbed4] hover:text-blue-600 dark:hover:text-[#80c6ff] disabled:opacity-30 font-bold cursor-pointer">
          <span>‹</span>
        </button>
        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-[#adbed4]">Week</span>
        <button aria-label="Next available week" disabled={index<0||index>=weeks.length-1} onClick={()=>onChange({...filter,start:weeks[index+1],end:weeks[index+1]})} className="px-1 text-slate-600 dark:text-[#adbed4] hover:text-blue-600 dark:hover:text-[#80c6ff] disabled:opacity-30 font-bold cursor-pointer">
          <span>›</span>
        </button>
      </div>}
      <button className="av-scope-undo px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-[#18365d] bg-white dark:bg-[#08162b] text-slate-700 dark:text-[#adbed4] hover:bg-slate-50 dark:hover:bg-[#122b4d] disabled:opacity-40 transition flex items-center gap-1 cursor-pointer shadow-2xs" disabled={!canUndo} onClick={onUndo} aria-label="Undo last filter change">
        <span>↶</span>Undo
      </button>
      <button className="av-scope-reset px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-[#18365d] bg-white dark:bg-[#08162b] text-slate-700 dark:text-[#adbed4] hover:bg-slate-50 dark:hover:bg-[#122b4d] disabled:opacity-40 transition cursor-pointer shadow-2xs" disabled={!active} onClick={onReset}>
        Clear all
      </button>
      <button className="av-scope-edit px-2.5 py-1 text-xs font-bold rounded-lg border border-blue-600 dark:border-blue-500 bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs" aria-label="Edit analytics filters" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>
        <AnalyticsIcon name="sliders" size={12}/>
        <span>Filters</span>
        {active>0&&<b className="ml-0.5 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">{active}</b>}
      </button>
    </div>
    {expanded&&<div className="av-scope-flyout absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#0c1b31] border border-slate-200 dark:border-[#18365d] rounded-xl shadow-2xl p-4 z-50 space-y-3 glow-card">
      <header className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#18365d]">
        <div>
          <strong className="text-xs font-black uppercase text-slate-900 dark:text-white">Refine Scope</strong>
          <p className="text-[10px] text-slate-500 dark:text-[#adbed4]">Changes apply across all investigations.</p>
        </div>
        <button aria-label="Close quick filters" onClick={()=>setExpanded(false)} className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-[#18365d] flex items-center justify-center text-slate-500 cursor-pointer">
          <AnalyticsIcon name="close" size={13}/>
        </button>
      </header>
      <div className="space-y-2">
        {field('Region','region',['All',...regions])}
        {field('Skill','skill',['All','HEC','KAC','EV'])}
        {field('Patch','patch',['All',...patches])}
        {field('From week','start',weeks,'First available')}
        {field('Through week','end',weeks,'Last available')}
      </div>
      <footer className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#18365d]">
        <span className="text-[10px] text-slate-400">Click chips to remove.</span>
        <button onClick={()=>setExpanded(false)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">Done</button>
      </footer>
    </div>}
  </div>;
}
function AnalyticsWorkbench({title='Investigate the numbers',subtitle='Choose a question. All tables follow the current view.',panes=[],idPrefix='analytics-workbench'}) {
  const [active,setActive]=React.useState(panes[0]?.id);
  const pane=panes.find(p=>p.id===active)||panes[0];
  const activate=(index,event)=>{const next=(index+panes.length)%panes.length;setActive(panes[next].id);event?.currentTarget?.parentElement?.querySelectorAll('[role="tab"]')?.[next]?.focus();};
  return <section className="analytics-panel av-workbench bg-white dark:bg-[#0c1b31] border border-slate-200/80 dark:border-[#18365d] rounded-xl shadow-xs glow-card overflow-hidden">
    <header className="p-3.5 bg-slate-50/70 dark:bg-[#08162b] border-b border-slate-100 dark:border-[#18365d] flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-[#80c6ff] flex items-center justify-center glow-icon glow-icon-blue flex-shrink-0">
          <AnalyticsIcon name="table" size={16}/>
        </span>
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{title}</h3>
          <p className="text-[11px] text-slate-500 dark:text-[#adbed4]">{subtitle}</p>
        </div>
      </div>
      {pane?.onExport&&<button className="av-secondary-button px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-[#18365d] bg-white dark:bg-[#08162b] text-slate-700 dark:text-[#adbed4] hover:text-blue-600 dark:hover:text-[#80c6ff] transition flex items-center gap-1.5 cursor-pointer shadow-2xs" disabled={!pane.count} onClick={pane.onExport}>
        <AnalyticsIcon name="download" size={13}/>
        <span>Export table</span>
      </button>}
    </header>
    {!pane?<AnalyticsEmpty title="No detailed records in this scope" description="Adjust the filters above or inspect the selected input files."/>:<>
      <nav role="tablist" aria-label={title} className="flex gap-1.5 p-2 bg-slate-50/40 dark:bg-[#08162b]/40 border-b border-slate-100 dark:border-[#18365d] overflow-x-auto">
        {panes.map((p,i)=>{
          const isSelected = pane.id === p.id;
          return <button key={p.id} role="tab" id={idPrefix+'-tab-'+p.id} aria-controls={idPrefix+'-panel-'+p.id} aria-selected={isSelected} tabIndex={isSelected?0:-1} onClick={()=>setActive(p.id)} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();activate(e.key==='Home'?0:e.key==='End'?panes.length-1:i+(e.key==='ArrowRight'?1:-1),e);}}} className={`av-workbench-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            isSelected
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-[#80c6ff] border border-blue-200 dark:border-blue-700/80 shadow-2xs'
              : 'text-slate-600 dark:text-[#adbed4] hover:bg-slate-100 dark:hover:bg-[#122b4d]'
          }`}>
            <span className="av-workbench-tab-label">{p.label}</span>
            {p.count!==undefined&&<span className={`av-workbench-tab-count px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              isSelected
                ? 'bg-blue-200/60 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                : 'bg-slate-200/70 text-slate-600 dark:bg-[#18365d] dark:text-[#adbed4]'
            }`}>{Number(p.count).toLocaleString()}</span>}
          </button>;
        })}
      </nav>
      <div role="tabpanel" id={idPrefix+'-panel-'+pane.id} aria-labelledby={idPrefix+'-tab-'+pane.id} tabIndex="0" className="av-workbench-panel p-4">
        {pane.description&&<div className="av-workbench-explanation mb-3.5 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2 text-xs text-blue-900 dark:text-[#80c6ff]">
          <AnalyticsIcon name="info" size={14} className="mt-0.5 text-blue-600 flex-shrink-0"/>
          <p className="leading-relaxed">{pane.description}</p>
        </div>}
        {pane.content}
      </div>
    </>}
  </section>;
}
function AnalyticsIcon({
  name = 'file',
  size = 16,
  className = ""
}) {
  const paths = {
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
    search: 'm21 21-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
    chevron: 'm9 5 7 7-7 7',
    close: 'm6 6 12 12 M6 18 18 6',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    table: 'M3 3h18v18H3z M3 9h18 M9 9v12',
    sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
    compare: 'M8 3 4 7l4 4 M4 7h13v6 M16 21l4-4-4-4 M20 17H7v-6',
    download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    refresh: 'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    alert: 'M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    demand: 'M3 3v18h18 M7 16l4-8 4 5 5-9',
    capacity: 'M4 6h16M4 12h16M4 18h16',
    buffer: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    coverage: 'M21.21 15.89A10 10 0 1 1 8 2.83 M22 12A10 10 0 0 0 12 2v10z',
    sparkles: 'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    trend: 'M3 3v18h18 M19 9l-5 5-4-4-3 3',
    handshake: 'm11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-2-2m-3.7-3.7 2-2a1 1 0 0 1 1.4 0l4.3 4.3a1 1 0 0 1 0 1.4l-2 2M2 13l4-4a2 2 0 0 1 2.8 0l1.2 1.2M7 18l3-3',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v4l2 1',
    lightbulb: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5 M9 18h6 M10 22h4'
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d={paths[name] || paths.file} /></svg>;
}
function AnalyticsDisclosure({
  title,
  subtitle = 'Supporting records, assumptions and calculations',
  count,
  children,
  compact = false,
  open = false
}) {
  return <details className={'av-disclosure ' + (compact ? 'av-disclosure-compact' : 'analytics-panel')} open={open || undefined}><summary><span className="av-disclosure-icon"><AnalyticsIcon name={compact ? 'sliders' : 'table'} /></span><span className="av-disclosure-heading"><strong>{title}</strong><small>{subtitle}</small></span>{count !== undefined && <span className="av-count-badge">{count}</span>}<span className="av-disclosure-action"><span className="av-label-closed">Explore</span><span className="av-label-open">Collapse</span><AnalyticsIcon name="chevron" /></span></summary><div className="av-disclosure-body">{children}</div></details>;
}
function AnalyticsDrawer({
  title,
  eyebrow = 'Source evidence',
  subtitle,
  onClose,
  children,
  footer,
  settings = false
}) {
  const panel = React.useRef(null),
    closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.querySelector('[data-dialog-focus]')?.focus();
    const keyboard = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const controls = [...node.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"],summary')].filter(el => el.getClientRects().length);
      if (!controls.length) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = controls[0],
        last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <div className="av-drawer-backdrop" onClick={e => {
    if (e.target === e.currentTarget) onClose();
  }}><section ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={'av-drawer ' + (settings ? 'av-settings-drawer' : '')}><header className="av-drawer-header"><div className="av-drawer-title-icon"><AnalyticsIcon name={settings ? 'sliders' : 'file'} size={22} className="text-current" /></div><div className="av-drawer-heading"><p className="av-drawer-eyebrow text-[10px] font-bold uppercase tracking-wider text-[#005eb8] dark:text-[#80c6ff] m-0 mb-1">{eyebrow}</p><h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight m-0">{title}</h2>{subtitle && <span className="block text-xs text-slate-500 dark:text-[#adbed4] mt-1 leading-relaxed">{subtitle}</span>}</div><button data-dialog-focus className="av-close-button cursor-pointer" onClick={onClose} aria-label={settings ? 'Close model assumptions' : 'Close evidence panel'}><AnalyticsIcon name="close" size={13} className="text-current" /><span>Close</span></button></header><div className="av-drawer-body">{children}</div><footer className="av-drawer-footer"><span className="flex items-center gap-1.5"><AnalyticsIcon name="info" size={13} className="text-[#005eb8] dark:text-[#80c6ff] flex-shrink-0" />{footer || 'Evidence is read-only. Input edits remain in Inputs & Parameters.'}</span><kbd>Esc to close</kbd></footer></section></div>;
}
function AnalyticsEmpty({
  title,
  description,
  icon = 'file',
  children
}) {
  return <div className="av-secondary-empty"><span><AnalyticsIcon name={icon} size={25} /></span><h3>{title}</h3><p>{description}</p>{children}</div>;
}
function AnalyticsRecordBrowser({
  rows = [],
  columns,
  sources = {},
  sourceKey,
  query = '',
  onQueryChange,
  onExport,
  page = 0,
  onPageChange
}) {
  const [layout, setLayout] = React.useState('cards'),
    [skill, setSkill] = React.useState('All'),
    [region, setRegion] = React.useState('All');
  const skills = [...new Set(rows.map(r => r.skill).filter(Boolean))].sort(),
    regions = [...new Set(rows.map(r => r.region).filter(Boolean))].sort();
  const filtered = rows.filter(r => (skill === 'All' || r.skill === skill) && (region === 'All' || r.region === region) && JSON.stringify(r.raw).toLowerCase().includes(query.toLowerCase()));
  const pageSize = 6,
    pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    current = Math.min(page, pages - 1);
  const selectedSources = [...new Set(rows.length ? rows.map(r => r.source) : sourceKey ? [sourceKey] : [])];
  const fieldEntries = r => Object.entries(r.raw || {}).filter(([k]) => !['patch', 'skill', 'region', 'regioncode', 'weekcomm'].includes(k.toLowerCase().replace(/[ _]/g, '')));
  const updateFacet = (setter, value) => {
    setter(value);
    onPageChange(0);
  };
  return <div className="av-record-browser"><div className="av-evidence-stats"><div><span>Records in view</span><strong>{filtered.length.toLocaleString()}<small> / {rows.length.toLocaleString()}</small></strong></div><div><span>Skills</span><strong>{skills.length || '—'}</strong></div><div><span>Input sources</span><strong>{selectedSources.length || '—'}</strong></div><div className="av-readonly-label"><AnalyticsIcon name="check" /><span>Original source values<br /><small>Read-only inspection</small></span></div></div>
    <div className="av-record-toolbar"><label className="av-search-field"><AnalyticsIcon name="search" size={14} className="text-slate-400 dark:text-[#80c6ff]" /><input aria-label="Search evidence records" placeholder="Find a patch, work code, identifier or value…" value={query} onChange={e => {
          onQueryChange(e.target.value);
          onPageChange(0);
        }} /></label><div className="av-layout-toggle" role="group" aria-label="Evidence layout"><button aria-pressed={layout === 'cards'} aria-label="Evidence cards" onClick={() => setLayout('cards')}><AnalyticsIcon name="grid" size={13} className="text-current" />Cards</button><button aria-pressed={layout === 'table'} aria-label="Evidence table" onClick={() => setLayout('table')}><AnalyticsIcon name="table" size={13} className="text-current" />Table</button></div><button className="av-secondary-button" disabled={!filtered.length} onClick={() => onExport(filtered)}><AnalyticsIcon name="download" size={13} className="text-current" />Export filtered rows</button></div>
    <div className="av-record-facets"><label>Skill<select aria-label="Evidence skill" value={skill} onChange={e => updateFacet(setSkill, e.target.value)}>{['All', ...skills].map(s => <option key={s} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{s}</option>)}</select></label><label>Region<select aria-label="Evidence region" value={region} onChange={e => updateFacet(setRegion, e.target.value)}>{['All', ...regions].map(s => <option key={s} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{s}</option>)}</select></label><span>Source row numbers exclude the header</span>{(query || skill !== 'All' || region !== 'All') && <button className="cursor-pointer hover:underline text-[#005eb8] dark:text-[#80c6ff] font-semibold" onClick={() => {
        setSkill('All');
        setRegion('All');
        onQueryChange('');
        onPageChange(0);
      }}>Clear filters</button>}</div>
    {!filtered.length ? <AnalyticsEmpty title={rows.length ? 'No records match these filters' : sources[sourceKey]?.success === false ? 'Selected source unavailable' : 'No source records available'} description={rows.length ? 'Try a different search, skill or region.' : sources[sourceKey]?.error || 'The selected input or scope has no records to inspect. Check Data coverage for the source availability.'} /> : layout === 'table' ? <AnalyticsTable columns={columns} rows={filtered} searchable={false} title="Original records" /> : <><div className="av-record-grid">{filtered.slice(current * pageSize, (current + 1) * pageSize).map(r => <article key={r.source + '-' + r.row} className="av-record-card"><header><span className={'av-skill-pill av-skill-' + r.skill}>{r.skill || 'Input'}</span><span>Row {r.row}</span></header><h3>{r.patch || r.region || r.source.replace(/_/g, ' ')}</h3><div className="av-record-context">{r.region && <span>Region {r.region}</span>}{r.week && <span><AnalyticsIcon name="clock" size={12} />{r.week}</span>}{r.workCode && <span>{r.workCode}</span>}</div><dl className="av-record-fields">{fieldEntries(r).slice(0, 6).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v === null || v === '' ? 'Not supplied' : String(v)}</dd></div>)}</dl>{fieldEntries(r).length > 6 && <details className="av-extra-fields"><summary>Show {fieldEntries(r).length - 6} more fields</summary><dl className="av-record-fields">{fieldEntries(r).slice(6).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v === null || v === '' ? 'Not supplied' : String(v)}</dd></div>)}</dl></details>}{r.jobTime && <div className="av-match-evidence"><AnalyticsIcon name="check" size={12} className="text-current" /><span>Job-time record matched · source row {r.jobTime.row}</span></div>}<footer><span>Source version</span><strong title={sources[r.source]?.version}>{sources[r.source]?.version || r.source}</strong></footer></article>)}</div><div className="av-browser-pagination"><span>Showing {current * pageSize + 1}–{Math.min((current + 1) * pageSize, filtered.length)} of {filtered.length.toLocaleString()} records</span><div><button disabled={!current} onClick={() => onPageChange(current - 1)}>Previous</button><span>{current + 1} / {pages}</span><button disabled={current >= pages - 1} onClick={() => onPageChange(current + 1)}>Next</button></div></div></>}
    {selectedSources.length > 0 && <details className="av-provenance"><summary><AnalyticsIcon name="file" size={14} className="text-current" />Source versions and fingerprints</summary>{selectedSources.map(k => <div key={k}><strong>{k.replace(/_/g, ' ')}</strong><span>{sources[k]?.version}</span><code title={sources[k]?.hash}>{sources[k]?.hash?.slice(0, 16) || 'Fingerprint unavailable'}</code></div>)}</details>}
  </div>;
}
function AnalyticsDiffBrowser({
  rows = [],
  comparison = {},
  query = '',
  onQueryChange,
  onExport
}) {
  const [status, setStatus] = React.useState('All'),
    [selectedKey, setSelectedKey] = React.useState(null),
    [page, setPage] = React.useState(0);
  const filtered = rows.filter(r => (status === 'All' || r.status.startsWith(status)) && JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 30)),
    current = Math.min(page, pages - 1),
    visible = filtered.slice(current * 30, (current + 1) * 30);
  const selected = visible.find(r => r.key === selectedKey) || visible[0];
  const fields = selected ? [...new Set([...(selected.before[0] ? Object.keys(selected.before[0]) : []), ...(selected.after[0] ? Object.keys(selected.after[0]) : [])])] : [];
  const value = v => v === undefined ? 'Not present' : v === null || v === '' ? 'Not supplied' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const duplicates = selected && (selected.before.length > 1 || selected.after.length > 1);
  return <><div className="av-version-pair"><div><span>Baseline version</span><strong>{comparison.before || 'Baseline input'}</strong></div><AnalyticsIcon name="compare" size={21} className="text-[#005eb8] dark:text-[#80c6ff] flex-shrink-0" /><div><span>Current version</span><strong>{comparison.after || 'Current input'}</strong></div></div><div className="av-diff-totals">{['Added', 'Changed', 'Removed'].map(kind => <div key={kind}><i className={'av-change-dot av-change-' + kind.toLowerCase()} /><span>{kind} keys</span><strong>{rows.filter(r => r.status.startsWith(kind)).length}</strong></div>)}</div><div className="av-record-toolbar"><label className="av-search-field"><AnalyticsIcon name="search" size={14} className="text-slate-400 dark:text-[#80c6ff]" /><input aria-label="Search record differences" placeholder="Search a business key, field or value…" value={query} onChange={e => {
          onQueryChange(e.target.value);
          setPage(0);
        }} /></label><button className="av-secondary-button" disabled={!filtered.length} onClick={() => onExport(filtered)}><AnalyticsIcon name="download" size={13} className="text-current" />Export record differences</button></div><div className="av-status-tabs" role="group" aria-label="Difference type">{['All', 'Added', 'Changed', 'Removed'].map(k => <button key={k} aria-pressed={status === k} onClick={() => {
        setStatus(k);
        setPage(0);
        setSelectedKey(null);
      }}>{k}<span>{k === 'All' ? rows.length : rows.filter(r => r.status.startsWith(k)).length}</span></button>)}</div>
    {!selected ? <AnalyticsEmpty icon="compare" title={comparison.status === 'Unavailable' ? 'Comparison unavailable' : rows.length ? 'No changes match this search' : comparison.status === 'Same contents / new version' ? 'Different filename. Identical contents.' : 'No content changes'} description={comparison.status === 'Unavailable' ? 'One or both exact selected inputs could not be loaded. Inspect Data coverage before drawing a comparison.' : rows.length ? 'Change the search or status filter to see other records.' : 'The comparison found no changed records to attribute to this input.'} /> : <div className="av-diff-workbench"><aside aria-label="Changed business keys">{visible.map(r => <button key={r.key} aria-pressed={selected.key === r.key} onClick={() => setSelectedKey(r.key)}><span className={'av-status-pill av-status-' + r.status.split(' ')[0].toLowerCase()}>{r.status}</span><strong>{r.key.replace(/\|/g, ' · ')}</strong><small>{r.before.length} baseline / {r.after.length} current records</small></button>)}</aside><section className="av-diff-record"><header><span>Selected business key</span><h3>{selected.key.replace(/\|/g, ' / ')}</h3></header>{duplicates ? <><p className="av-inline-notice">This key contains duplicate records. Each side is retained separately; no row pairing is assumed.</p><div className="av-duplicate-pair">{[['Baseline', selected.before], ['Current', selected.after]].map(([label, records]) => <section key={label}><h4>{label} · {records.length} records</h4>{records.map((r, i) => <dl key={i}>{Object.entries(r).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{value(v)}</dd></div>)}</dl>)}</section>)}</div></> : <div className="av-field-comparison"><div className="av-field-comparison-head"><span>Field</span><span>Baseline</span><span>Current</span></div>{fields.map(k => {
            const b = selected.before[0]?.[k],
              a = selected.after[0]?.[k],
              changed = JSON.stringify(b) !== JSON.stringify(a);
            return <div key={k} className={changed ? 'av-field-changed' : ''}><strong>{k}{changed && <i>changed</i>}</strong><span>{value(b)}</span><span>{value(a)}</span></div>;
          })}</div>}</section></div>}
    {pages > 1 && <div className="av-browser-pagination"><span>{filtered.length} matching business keys</span><div><button disabled={!current} onClick={() => {
          setPage(current - 1);
          setSelectedKey(null);
        }}>Previous keys</button><span>{current + 1} / {pages}</span><button disabled={current >= pages - 1} onClick={() => {
          setPage(current + 1);
          setSelectedKey(null);
        }}>Next keys</button></div></div>}
  </>;
}
function AnalyticsIssueBrowser({
  issues = [],
  query = '',
  onQueryChange,
  onInspect,
  onExport
}) {
  const [kind, setKind] = React.useState('All'),
    [page, setPage] = React.useState(0);
  const kinds = [...new Set(issues.map(r => r.kind || 'Evidence issue'))];
  const filtered = issues.filter(r => (kind === 'All' || (r.kind || 'Evidence issue') === kind) && JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    current = Math.min(page, pages - 1);
  return <><div className="av-inline-notice"><AnalyticsIcon name="info" size={14} className="text-current flex-shrink-0" /><span>These checks explain the limits of the source evidence. They do not represent observed service failures.</span></div><div className="av-record-toolbar"><label className="av-search-field"><AnalyticsIcon name="search" size={14} className="text-slate-400 dark:text-[#80c6ff]" /><input aria-label="Search evidence issues" placeholder="Find a patch, input or evidence issue…" value={query} onChange={e => {
          onQueryChange(e.target.value);
          setPage(0);
        }} /></label><button className="av-secondary-button" disabled={!filtered.length} onClick={() => onExport(filtered)}><AnalyticsIcon name="download" size={13} className="text-current" />Export issues</button></div><label className="av-issue-type">Issue type<select aria-label="Evidence issue type" value={kind} onChange={e => {
        setKind(e.target.value);
        setPage(0);
      }}>{['All', ...kinds].map(k => <option key={k} className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">{k}</option>)}</select><span>{filtered.length.toLocaleString()} issues in view</span></label>{!filtered.length ? <AnalyticsEmpty title="No issues match these filters" description="Clear the search or choose a different issue type." icon="check" /> : <div className="av-issue-grid">{filtered.slice(current * 8, (current + 1) * 8).map((r, i) => <article key={i} className="av-issue-card"><span className="av-issue-mark"><AnalyticsIcon name="alert" size={14} className="text-current" /></span><div><header><h3>{r.kind || 'Evidence issue'}</h3><span>{r.row ? 'Row ' + r.row : 'Source-level check'}</span></header><p>{r.detail}</p><footer><span>{r.source.replace(/_/g, ' ')}</span><button onClick={() => onInspect(r)}>{r.row ? 'Inspect source record' : 'Inspect input source'}<AnalyticsIcon name="chevron" size={12} className="text-current" /></button></footer></div></article>)}</div>}{pages > 1 && <div className="av-browser-pagination"><span>Showing {current * 8 + 1}–{Math.min((current + 1) * 8, filtered.length)} of {filtered.length.toLocaleString()}</span><div><button disabled={!current} onClick={() => setPage(current - 1)}>Previous issues</button><span>{current + 1} / {pages}</span><button disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next issues</button></div></div>}</>;
}
function AnalyticsAssumptions({
  value,
  onChange,
  onClose,
  onReset
}) {
  const field = (key, title, min, max, help) => <label className="av-setting-field"><span>{title}</span><div><input aria-label={title} type="number" min={min} max={max} value={value[key]} onChange={e => onChange({
        ...value,
        [key]: Math.max(min, Math.min(max, Number(e.target.value) || min))
      })} /><small>{key === 'standardHours' ? 'h / FTE / week' : 'weeks'}</small></div><p>{help}</p></label>;
  const toggle = (key, title, description, tag) => <label className={'av-setting-toggle ' + (value[key] ? 'av-setting-enabled' : '')}><input type="checkbox" checked={value[key]} onChange={e => onChange({
      ...value,
      [key]: e.target.checked
    })} /><span className="av-switch" /><span><strong>{title}{tag && <i>{tag}</i>}</strong><small>{description}</small></span></label>;
  return <AnalyticsDrawer title="Model assumptions" eyebrow="Planning controls" subtitle="Define how source inputs enter the exploratory model. Changes update the current investigation immediately." settings onClose={onClose} footer="Changes affect this investigation only. Original input files are not edited."><div className="av-settings-status"><span><i />Live model updates</span><button className="av-secondary-button" onClick={onReset}><AnalyticsIcon name="refresh" size={12} className="mr-1 text-current inline" />Restore defaults</button></div><section className="av-settings-section"><header><span>01</span><div><h3>Measurement basis</h3><p>Keep units and loss representations consistent.</p></div></header><div className="av-setting-grid"><label className="av-setting-field"><span>Job-time units</span><select aria-label="Job-time units" value={value.jobTimeUnit} onChange={e => onChange({
            ...value,
            jobTimeUnit: e.target.value
          })}><option value="hours" className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">Hours per job</option><option value="minutes" className="bg-white dark:bg-[#0c1b31] text-slate-800 dark:text-white">Minutes per job</option></select><p>Used only where an exact job-time record matches.</p></label>{field('standardHours', 'Standard hours per FTE', 1, 80, 'Basis for FTE conversions and the explicit intake model.')}</div><fieldset className="av-downtime-options"><legend>One downtime representation</legend>{[['hours', 'Absolute hours', 'Use supplied loss hours.'], ['percent', 'Percentage', 'Apply to matching roster hours.'], ['perFte', 'Hours per FTE', 'Scale by matching roster FTE.']].map(([key, title, description]) => <label key={key} className={value.downtime === key ? 'av-option-selected' : ''}><input type="radio" name="analytics-downtime" checked={value.downtime === key} onChange={() => onChange({
            ...value,
            downtime: key
          })} /><strong>{title}</strong><small>{description}</small></label>)}</fieldset></section>
    <section className="av-settings-section"><header><span>02</span><div><h3>Coverage and commitments</h3><p>Choose which inputs are included. Missing evidence stays visible.</p></div></header>{toggle('allowPartial', 'Allow matched-demand-only calculations', 'Unmatched jobs remain excluded; outputs are explicitly partial.', 'Partial model')}{toggle('includeOvertime', 'Authorized overtime', 'Include only records marked Authorized = Yes.')}{toggle('includeContractors', 'Active contractor cover', 'Include only contractor records marked Active.')}{toggle('includeTransfers', 'Mapped FTE transfers', 'Resolve both locations and cap transfer hours by donor availability.', 'Opt-in')}{toggle('includeSupport', 'Cross-skill support', 'Deduct donor hours and credit recipients at source efficiency.', 'Opt-in')}{toggle('includeRecruitment', 'Weekly recruitment additions', 'Interpret every dated source row as a NEW weekly intake. Confirm cohort semantics first.', 'Explicit assumption')}</section>
    <section className="av-settings-section"><header><span>03</span><div><h3>Readiness and decision lead times</h3><p>Planning assumptions, not confirmed delivery dates.</p></div></header><div className="av-setting-grid">{field('rampWeeks', 'Recruitment ramp weeks', 1, 52, 'Linear ramp to full productivity when intake modeling is enabled.')}{field('recruitmentLeadWeeks', 'Recruitment lead weeks', 0, 104, 'Decision-to-intake time; the ramp is added for full readiness.')}{field('trainingLeadWeeks', 'Training lead weeks', 0, 104, 'Lead time used to calculate training commit-by dates.')}{field('supportLeadWeeks', 'Support lead weeks', 0, 104, 'Lead time used for additional cover decisions.')}</div></section><div className="av-inline-notice"><AnalyticsIcon name="info" size={14} className="text-current flex-shrink-0" /><span>Attrition units, unmatched source ramp cohorts and overlapping training deductions are not inferred automatically. Workload coverage is not observed SLA performance.</span></div><button className="av-primary-button av-settings-done" onClick={onClose}>Return to investigation<AnalyticsIcon name="chevron" size={13} className="ml-1 text-current inline" /></button></AnalyticsDrawer>;
}
function AnalyticsRunCards({
  runs = [],
  onRemove,
  onApply,
  onExport
}) {
  const fmt = v => v === null || v === undefined ? 'Unavailable' : Number(v).toLocaleString('en-GB', {
    maximumFractionDigits: 1
  });
  const descriptions = r => [['Demand', r.shock.demandPct, '%'], ['Additional absence', r.shock.absencePp, ' pp'], ['Productivity', r.shock.productivityPct, '%'], ['Recruitment delay', r.shock.recruitmentDelay, ' weeks'], ['Contractor cover', r.shock.contractorPct, '%'], ['Overtime', r.shock.overtimePct, '%'], ['Extra hours', r.shock.extraHours, ' h/cell/week']].filter(([, v]) => v).map(([k, v, u]) => k + ' ' + (v > 0 ? '+' : '') + v + u);
  return <section className="analytics-panel av-pinned-panel"><header><span className="av-disclosure-icon"><AnalyticsIcon name="compare" /></span><div><h3>Pinned test runs</h3><p>Compare saved snapshots, or load their settings against current inputs.</p></div><button className="av-secondary-button" disabled={!runs.length} onClick={onExport}><AnalyticsIcon name="download" size={13} className="text-current" />Export runs</button></header>{!runs.length ? <AnalyticsEmpty icon="compare" title="Keep the alternatives worth discussing" description="Use “Pin this run” above to retain an option while you explore another. Export before reloading the page." /> : <div className="av-run-grid">{runs.map(r => <article key={r.id} className="av-run-card"><header><span><AnalyticsIcon name="compare" size={13} className="text-current" />{r.name}</span><button onClick={() => onRemove(r.id)} aria-label={'Remove ' + r.name}>Remove</button></header><h4>{r.scenario}</h4><p>{r.scope.region === 'All' ? 'All regions' : 'Region ' + r.scope.region} · {r.scope.skill === 'All' ? 'All skills' : r.scope.skill} · {r.scope.patch === 'All' ? 'All patches' : r.scope.patch}</p><div className="av-run-measures"><div><span>Gross shortfall</span><strong>{r.result.comparableCells ? fmt(r.result.deficit) + ' h' : 'Unavailable'}</strong></div><div><span>Coverage</span><strong>{r.result.coverage === null ? 'Unavailable' : fmt(r.result.coverage) + '%'}</strong></div></div><div className="av-run-chips">{descriptions(r).length ? descriptions(r).map(t => <span key={t}>{t}</span>) : <span>No additional shocks</span>}</div><footer><span>{r.result.comparableCells} comparable cells · snapshot</span><button onClick={() => onApply(r)}>Load test settings<AnalyticsIcon name="chevron" size={13} className="text-current" /></button></footer></article>)}</div>}</section>;
}


if (typeof window !== 'undefined') {
  window.AnalyticsAssumptions = AnalyticsAssumptions;
}
