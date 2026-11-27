/* Buildless, responsive SVG charts. All marks retain source-driven drilldown. */
(function () {
  const palette = [
    'var(--av-series-blue, #2563eb)', 'var(--av-series-teal, #14b8a6)',
    'var(--av-series-violet, #8b5cf6)', 'var(--av-series-amber, #f59e0b)',
    'var(--av-series-rose, #f43f5e)', 'var(--av-series-slate, #64748b)'
  ];
  const format = n => n === null || n === undefined ? 'Unavailable' : Number(n).toLocaleString('en-GB', {
    maximumFractionDigits: 1
  });
  const valid = n => n !== null && n !== undefined && Number.isFinite(Number(n));
  function ChartHeading({
    title,
    subtitle,
    badge,
    tools,
    icon = 'trend'
  }) {
    return <div className="av-chart-heading flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-[#18365d] gap-2 mb-3">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
          <span className="ds-chart-icon"><AnalyticsIcon name={icon} size={15}/></span>{title}
        </h3>
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-[#adbed4] mt-0.5">{subtitle}</p>}
      </div>
      {tools || (badge && <span className="av-chart-badge text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-[#80c6ff] border border-blue-200/60 dark:border-blue-800">{badge}</span>)}
    </div>;
  }
  function Trend({
    title,
    subtitle,
    data = [],
    series = [],
    unit = 'h',
    stacked = false,
    signed = false,
    selectedKey,
    actionLabel,
    tools,
    plotWidth,
    plotHeight,
    embedded = false,
    onClearSelection,
    onSelect
  }) {
    const [hidden, setHidden] = React.useState([]),
      [hover, setHover] = React.useState(null);
    const shown = series.filter(s => !hidden.includes(s.key));
    const W = plotWidth || 900,
      H = plotHeight || (tools ? 164 : 276),
      L = 62,
      R = 18,
      T = 18,
      B = 38,
      plotW = W - L - R,
      plotH = H - T - B;
    const combo = series.some(item=>item.bar);
    const visibleBars = shown.filter(item=>item.bar);
    const band = plotW / Math.max(1,data.length);
    const barWidth = Math.min(54,band*.56) / Math.max(1,visibleBars.length);
    const barOffset = series => (visibleBars.indexOf(series)+.5-visibleBars.length/2)*barWidth;
    const upperBound = Math.max(1, ...data.map(r => stacked ? shown.reduce((v, s) => v + (valid(r[s.key]) ? Math.max(0, r[s.key]) : 0), 0) : Math.max(0, ...shown.map(s => valid(r[s.key]) ? r[s.key] : 0)))) * 1.12;
    const magnitude = Math.pow(10,Math.floor(Math.log10(upperBound/4)));
    let max = combo ? Math.ceil(upperBound/(4*magnitude))*4*magnitude : upperBound;
    let min = 0;
    let ticks = [0,1,2,3,4].map(i=>max*i/4);
    if (signed) {
      const values = data.flatMap(row=>shown.map(s=>row[s.key]).filter(valid));
      const high = Math.max(0,...values), low = Math.min(0,...values);
      const target = (high-low || 1)/4;
      const power = 10**Math.floor(Math.log10(target));
      const step = power*([1,2,2.5,5,10].find(n=>n*power>=target) || 10);
      min = Math.floor(low/step)*step;
      max = Math.ceil(high/step)*step;
      if (max===min) max += step;
      ticks = Array.from({length:Math.round((max-min)/step)+1},(_,i)=>min+i*step);
    }
    const periodLayout = combo || !!plotWidth;
    const x = i => L + (periodLayout ? (i+.5)*band : data.length > 1 ? i / (data.length - 1) * plotW : plotW / 2),
      y = v => T + (max-v)/(max-min)*plotH;
    const gradient = 'av-' + title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const selectedIndex = hover ?? data.findIndex(row => row.key === selectedKey);
    const selected = data[selectedIndex];
    const seriesColor = (s,row,index) => s.signedColors && row?.[s.key]
      ? (row[s.key]<0?'var(--ds-change-negative)':'var(--ds-change-positive)') : s.color || palette[index];
    const seriesValue = (s,row) => valid(row[s.key]) ? format(s.absolute ? Math.abs(row[s.key]) : row[s.key])+' '+unit : 'Unavailable';
    const activate = (event, row) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.(row);
      }
    };
    return <section className={embedded ? 'av-chart ds-outlook-trend-chart' : 'analytics-panel av-chart bg-white dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-xs glow-card space-y-3'}>
      {embedded ? tools && <div className="ds-outlook-trend-periods">{tools}</div> :
        <ChartHeading title={title} subtitle={subtitle} tools={tools} badge={onSelect ? actionLabel || 'Click a week to drill down' : unit} />}
      {!data.length ? <div className="av-empty">No observations in this scope. Reset filters or inspect source coverage.</div> : <>
      <div className="av-legend">{series.map((s, i) => <button key={s.key} aria-pressed={!hidden.includes(s.key)} onClick={() => setHidden(old => old.includes(s.key) ? old.filter(k => k !== s.key) : [...old, s.key])} style={{
            opacity: hidden.includes(s.key) ? 0.4 : 1
          }}><i style={{
              background: s.signedColors ? 'linear-gradient(90deg,var(--ds-change-negative) 50%,var(--ds-change-positive) 50%)' : s.color || palette[i]
            }} />{s.label}</button>)}{!tools && <span>Toggle a series</span>}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="av-trend-svg" role="group" aria-label={title}>
        <defs>{shown.map((s, i) => <linearGradient key={s.key} id={gradient + s.key} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color || palette[i]} stopOpacity={stacked ? 0.65 : 0.16} /><stop offset="100%" stopColor={s.color || palette[i]} stopOpacity={stacked ? 0.2 : 0.01} /></linearGradient>)}</defs>
        {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={signed && t===0?'av-chart-zero':'av-chart-grid'} strokeDasharray={t ? '3 5' : undefined} /><text x={L - 10} y={y(t) + 4} textAnchor="end" className="av-axis">{format(t)}</text></g>)}
        {shown.map((s, si) => {
            if (s.marker) return <g key={s.key}>{data.map((r,i)=>valid(r[s.key]) &&
              <circle key={r.key} className="av-trend-marker" cx={x(i)} cy={y(r[s.key])} r="4" fill={seriesColor(s,r,si)}/>)}</g>;
            if (s.bar) {
              return <g key={s.key}>{data.map((r,i)=>valid(r[s.key]) && <rect key={r.key}
                x={x(i)+barOffset(s)-barWidth/2} y={Math.min(y(0),y(r[s.key]))} width={barWidth}
                height={signed ? Math.abs(y(0)-y(r[s.key])) : Math.max(0,y(0)-y(r[s.key]))}
                rx="5" fill={seriesColor(s,r,si)} className="av-trend-bar" data-selected={r.key===selectedKey}/>)}</g>;
            }
            const lower = data.map(r => stacked ? shown.slice(0, si).reduce((v, p) => v + (valid(r[p.key]) ? Math.max(0, r[p.key]) : 0), 0) : 0);
            const upper = data.map((r, i) => lower[i] + (valid(r[s.key]) ? (signed ? r[s.key] : Math.max(0,r[s.key])) : 0));
            const segments = [];
            let segment = [];
            data.forEach((r, i) => {
              if (valid(r[s.key])) segment.push(i);else if (segment.length) {
                segments.push(segment);
                segment = [];
              }
            });
            if (segment.length) segments.push(segment);
            return <g key={s.key}>{segments.map((indices, k) => {
                const line = indices.map((i, j) => `${j ? 'L' : 'M'} ${x(i)} ${y(upper[i])}`).join(' ');
                const fill = line + ' ' + indices.slice().reverse().map(i => `L ${x(i)} ${y(lower[i])}`).join(' ') + ' Z';
                return <g key={k}><path d={fill} fill={`url(#${gradient + s.key})`} /><path className="av-trend-line" d={line} stroke={s.color || palette[si]} strokeWidth="2.5" strokeDasharray={s.dash} fill="none" strokeLinecap="round" strokeLinejoin="round" />{indices.length === 1 && <circle className="av-trend-single" cx={x(indices[0])} cy={y(upper[indices[0]])} r="3" fill={s.color || palette[si]} />}</g>;
              })}</g>;
          })}
        {data.map((r, i) => <g key={r.key || i} tabIndex="0" role={onSelect ? 'button' : 'img'}
          className={periodLayout && onSelect ? 'av-period-mark' : undefined}
          aria-pressed={onSelect && selectedKey!==undefined ? r.key===selectedKey : undefined}
          aria-label={`${r.label || r.key}: ${shown.map(s => s.label + ' ' + seriesValue(s,r)).join(', ')}`} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(r)} onKeyDown={e => activate(e, r)} style={{
            cursor: onSelect ? 'pointer' : 'crosshair'
          }}>
          <rect className="av-period-hit" x={periodLayout ? L+i*band : Math.max(L, x(i) - plotW / Math.max(2, data.length - 1) / 2)} y={T} width={periodLayout ? band : plotW / Math.max(1, data.length - 1)} height={plotH} fill="transparent" />
          {i % Math.max(1, Math.ceil(data.length / (plotWidth ? Math.max(2,Math.floor(plotW/65)) : 7))) === 0 && <text x={x(i)} y={H - 11} textAnchor="middle" className="av-axis">{r.label || r.key}</text>}
        </g>)}
        {selected && <g pointerEvents="none"><line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={T} y2={T + plotH} className="av-chart-guide" strokeDasharray="4 4" />{shown.map((s, i) => !s.marker && valid(selected[s.key]) && <circle key={s.key} className="av-chart-point" cx={x(selectedIndex)+(s.bar ? barOffset(s) : 0)} cy={y((stacked ? shown.slice(0, i).reduce((v, p) => v + (selected[p.key] || 0), 0) : 0) + selected[s.key])} r="4.5" fill={seriesColor(s,selected,i)} strokeWidth="2" />)}</g>}
      </svg>
      <div className="av-chart-readout" aria-live="polite">{(selected || !tools) && <strong>{(periodLayout ? selected?.label : selected?.key) || (periodLayout ? 'Period details' : 'Explore the trajectory')}</strong>}{selected ? shown.map((s, i) => <span key={s.key}><i style={{
              background: s.color || palette[i]
            }} />{s.label}: <b>{seriesValue(s,selected)}</b></span>) : <span>{actionLabel || (plotWidth && !combo ? 'Select a period for its breakdown.' : combo ? 'Select a period to focus the plan table.' : 'Hover or focus a week for values. '+(onSelect ? 'Select it to focus the investigation.' : ''))}</span>}
        {selectedKey && onClearSelection && <button type="button" className="ds-issues" onClick={onClearSelection}>Show all periods</button>}
      </div>
      </>}
    </section>;
  }
  function Donut({
    title,
    subtitle,
    segments = [],
    center,
    caption,
    onSelect
  }) {
    const [active, setActive] = React.useState(null);
    const total = segments.reduce((v, s) => v + Math.max(0, s.value || 0), 0),
      radius = 71,
      circumference = 2 * Math.PI * radius;
    let offset = 0;
    return <section className="analytics-panel av-chart bg-white dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-xs glow-card space-y-3"><ChartHeading title={title} subtitle={subtitle} /><div className="av-donut-layout"><div className="av-donut-graphic"><svg viewBox="0 0 190 190" role="group" aria-label={title}><circle cx="95" cy="95" r={radius} fill="none" stroke="#eef2f7" strokeWidth="17" />{segments.map((s, i) => {
              const length = total ? s.value / total * circumference : 0,
                start = offset;
              offset += length;
              return <circle key={s.name} cx="95" cy="95" r={radius} fill="none" stroke={s.color || palette[i]} strokeWidth={active === i ? 22 : 17} strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={-start} transform="rotate(-90 95 95)" tabIndex={total ? 0 : undefined} role="button" aria-label={`${s.name}: ${format(s.value)}, ${total ? format(s.value / total * 100) : 0}%`} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => onSelect?.(s)} onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect?.(s);
                }
              }} className="av-donut-segment" />;
            })}<text x="95" y="94" textAnchor="middle" className="av-donut-value">{active === null ? center : total ? format(segments[active].value / total * 100) + '%' : '—'}</text><text x="95" y="114" textAnchor="middle" className="av-axis">{active === null ? caption : 'of visible total'}</text></svg></div><div className="av-donut-legend">{segments.map((s, i) => <button key={s.name} onClick={() => onSelect?.(s)} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}><i style={{
              background: s.color || palette[i]
            }} /><span>{s.name}<small>{total ? format(s.value / total * 100) : 0}% of total</small></span><b>{format(s.value)}</b></button>)}</div></div></section>;
  }
  function Bars({
    title,
    subtitle,
    rows = [],
    unit = 'h',
    onSelect,
    showDrilldown = false,
    selectedKey,
    emptyText = 'No values in this scope.',
    diverging = false
  }) {
    const max = Math.max(1, ...rows.filter(r => valid(r.value)).map(r => Math.abs(r.value)));
    return <section className="analytics-panel av-chart bg-white dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-xs glow-card space-y-3"><ChartHeading title={title} subtitle={subtitle} badge={onSelect ? 'Select to investigate' : unit} /><div className="av-bars">{rows.map((r, i) => <button key={r.name} onClick={() => onSelect?.(r)} disabled={!onSelect}
      aria-pressed={selectedKey===undefined ? undefined : r.key===selectedKey} className="av-bar-row"><span className="av-bar-label">{r.name}</span><span className={`av-bar-track ${diverging ? 'av-diverging' : ''}`}>{diverging && <span className="av-zero" />}<span className="av-bar-fill" style={{
              width: valid(r.value) ? `${Math.abs(r.value) / max * (diverging ? 49 : 100)}%` : '0%',
              left: diverging ? r.value < 0 ? `${50 - Math.abs(r.value) / max * 49}%` : '50%' : '0',
              background: r.color || (r.value < 0 ? palette[4] : palette[i % palette.length])
            }} /></span><b className={showDrilldown && onSelect ? 'av-bar-end' : undefined}>
              {valid(r.value) ? `${showDrilldown && diverging && r.value>0 ? '+' : ''}${format(r.value)} ${unit}` : 'Unavailable'}
              {showDrilldown && onSelect && <AnalyticsIcon name="chevron" size={12}/>}
            </b></button>)}{!rows.length && <div className="av-empty">{emptyText}</div>}</div></section>;
  }
  function Heatmap({
    title,
    subtitle,
    rows = [],
    onSelect
  }) {
    const [hover, setHover] = React.useState(null);
    const weeks = [...new Set(rows.map(r => r.week))].sort(),
      groups = [...new Set(rows.map(r => r.region + ' / ' + r.skill))].sort();
    const index = new Map(rows.map(r => [r.region + ' / ' + r.skill + '|' + r.week, r]));
    const max = Math.max(1, ...rows.filter(r => valid(r.gap)).map(r => Math.abs(r.gap)));
    return <section className="analytics-panel av-chart bg-white dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-xs glow-card space-y-3"><ChartHeading title={title} subtitle={subtitle} badge="Select a cell to focus" /><div className="av-heat-legend"><span><i data-tone="short" />Shortfall</span><span><i data-tone="surplus" />Surplus</span><span><i className="av-missing" />Unavailable evidence</span></div>{!rows.length ? <div className="av-empty">No pressure observations in this scope.</div> : <div className="av-heat-scroll"><div className="av-heat-grid" style={{
          gridTemplateColumns: `110px repeat(${weeks.length}, minmax(29px,1fr))`
        }}><span className="av-heat-label">Region / skill</span>{weeks.map(w => <span key={w} className="av-heat-week">{w.slice(5)}</span>)}{groups.map(g => <React.Fragment key={g}><span className="av-heat-label">{g}</span>{weeks.map(w => {
              const r = index.get(g + '|' + w),
                known = valid(r?.gap),
                negative = known && r.gap < 0,
                strength = known ? 15 + Math.sqrt(Math.abs(r.gap) / max) * 75 : 0;
              return <button key={w} className={`av-heat-cell ${!known ? 'av-missing' : ''}`}
                data-tone={known ? (negative ? 'short' : 'surplus') : undefined}
                style={known ? {'--av-heat-strength': strength+'%'} : undefined} onMouseEnter={() => setHover(r || {
                region: g,
                week: w,
                gap: null
              })} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r || {
                region: g,
                week: w,
                gap: null
              })} onBlur={() => setHover(null)} onClick={() => r && onSelect?.(r)} aria-label={`${g}, ${w}: ${known ? format(r.gap) + ' hours buffer' : 'unavailable evidence'}`} title={`${g} · ${w} · ${known ? format(r.gap) + ' h' : 'Unavailable'}`} disabled={!r}>{known ? negative ? '−' : '+' : '·'}</button>;
            })}</React.Fragment>)}</div></div>}<div className="av-chart-readout" aria-live="polite"><strong>{hover ? `${hover.region} ${hover.skill || ''} · ${hover.week}` : 'Find a pressure pocket'}</strong><span>{hover ? hover.gap === null ? 'This cell has insufficient evidence for a buffer calculation.' : `${format(hover.gap)} h buffer · ${format(hover.coverage)}% matched-scope coverage` : 'Color intensity is relative to the largest visible buffer; grey cells are never treated as zero.'}</span></div></section>;
  }
  function Waterfall({
    title,
    subtitle,
    steps = [],
    onSelect,
    unit = 'h'
  }) {
    let running = 0;
    const bars = steps.map(s => {
      const start = s.total ? 0 : running,
        end = s.total ? s.value : running + s.value;
      running = end;
      return {
        ...s,
        start,
        end
      };
    });
    const values = bars.flatMap(s => [s.start, s.end]),
      low = Math.min(0, ...values),
      high = Math.max(1, ...values),
      span = high - low || 1;
    const W = 900,
      H = 286,
      L = 60,
      T = 24,
      B = 66,
      plotH = H - T - B,
      barW = Math.min(85, 740 / Math.max(1, bars.length)),
      stepW = 810 / Math.max(1, bars.length),
      y = v => T + (high - v) / span * plotH;
    const unchanged = bars.length > 1 && steps.filter(s => !s.total).every(s => valid(s.value) && Math.abs(s.value) < 1e-9) && Math.abs(bars[0].value - bars[bars.length - 1].value) < 1e-9;
    return <section className="analytics-panel av-chart bg-white dark:bg-[#0c1b31] p-4 rounded-xl border border-slate-200/80 dark:border-[#18365d] shadow-xs glow-card space-y-3"><ChartHeading title={title} subtitle={subtitle} badge={unit} />{unchanged ? <div className="av-no-change"><span className="av-no-change-icon">=</span><div><strong>No change across comparable scope</strong><p>Volume, work mix and duration contributions are unchanged.</p></div><b>{format(bars[0].value)} {unit}</b></div> : !bars.length ? <div className="av-empty">No comparable contribution data.</div> : <svg className="av-waterfall-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={title}><line x1={L} x2={W - 15} y1={y(0)} y2={y(0)} stroke="#cbd5e1" />{bars.map((s, i) => {
          const x = L + i * stepW + (stepW - barW) / 2;
          return <g key={s.name} role={onSelect ? 'button' : 'img'} tabIndex="0" aria-label={`${s.name}: ${format(s.value)} ${unit}`} onClick={() => onSelect?.(s)} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect?.(s);
            }
          }} className="av-waterfall-mark"><title>{s.name + ': ' + format(s.value) + ' ' + unit}</title>{i < bars.length - 1 && <line x1={x + barW} x2={x + stepW} y1={y(s.end)} y2={y(s.end)} stroke="#94a3b8" strokeDasharray="3 4" />}<rect x={x} y={Math.min(y(s.start), y(s.end))} width={barW} height={Math.max(2, Math.abs(y(s.start) - y(s.end)))} rx="5" fill={s.color || (s.total ? 'var(--av-series-blue, #1d4ed8)' : s.value < 0 ? palette[4] : palette[1])} /><text x={x + barW / 2} y={Math.max(14, Math.min(y(s.start), y(s.end)) - 8)} textAnchor="middle" className="av-value">{s.total ? '' : s.value > 0 ? '+' : ''}{format(s.value)}</text><text x={x + barW / 2} y={H - B + 22} textAnchor="middle" className="av-axis">{s.name.split(' ').slice(0, 2).join(' ')}<tspan x={x + barW / 2} dy="15">{s.name.split(' ').slice(2).join(' ')}</tspan></text></g>;
        })}</svg>}</section>;
  }
  window.AnalyticsViz = {
    Trend,
    Donut,
    Bars,
    Heatmap,
    Waterfall,
    palette
  };
})();
