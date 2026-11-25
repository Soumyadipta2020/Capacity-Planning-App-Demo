/* Shared deterministic analytics. No scenario-name profiles or random results. */
(function (root) {
  'use strict';

  const num = v => v === null || v === undefined || String(v).trim() === '' ? null : Number.isFinite(Number(String(v).replace(/,/g, '').replace(/%$/, ''))) ? Number(String(v).replace(/,/g, '').replace(/%$/, '')) : null;
  const text = v => String(v ?? '').trim();
  const week = v => {
    const s = text(v).slice(0, 10),
      time = Date.parse(s + 'T00:00:00Z');
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === s ? s : '';
  };
  const canonical = row => JSON.stringify(Object.keys(row).sort().reduce((a, k) => {
    a[k] = row[k];
    return a;
  }, {}));
  const sum = (rows, key) => rows.reduce((a, r) => a + (num(r[key]) ?? 0), 0);
  const normalize = row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[ _]/g, ''), v]));
  const normalizeSource = (source, row) => {
    const n = normalize(row);
    if (source === 'geography_mapping') {
      n.territory = text(n.territory || n.patch);
      n.region = reg(n.regioncode) || reg(n.region);
    }
    return n;
  };
  const reg = v => {
    const s = text(v).replace(/^Region\s*/i, '');
    return /^[A-E]$/.test(s) ? s : '';
  };
  const addWeeks = (date, n) => {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n * 7);
    return d.toISOString().slice(0, 10);
  };
  function calendarBounds(period) {
    const match = /^(\d{4})(?:-(0[1-9]|1[0-2]|Q[1-4]))?$/.exec(period || '');
    if (!match) return null;
    const [,year,part] = match;
    const quarter = part?.startsWith('Q');
    const first = !part ? 1 : quarter ? (Number(part[1])-1)*3+1 : Number(part);
    const last = !part ? 12 : quarter ? first+2 : first;
    const start = year+'-'+String(first).padStart(2,'0')+'-01';
    const end = new Date(start+'T00:00:00Z');
    end.setUTCMonth(last,0);
    return {start,end:end.toISOString().slice(0,10)};
  }
  function calendarPeriod(date, interval = 'month') {
    if (interval === 'week') return date.slice(0,10);
    if (interval === 'year') return date.slice(0,4);
    const month = date.slice(0,7);
    return interval === 'quarter' ? month.slice(0,4)+'-Q'+Math.ceil(Number(month.slice(5))/3) : month;
  }
  const planningKey = (row, level) => JSON.stringify([
    row.region, level !== 'region' ? row.area : '', level === 'patch' ? row.patch : '', row.skill, row.week
  ]);
  const key = r => [r.patch, r.skill, r.workCode, r.week].join('|');
  const rowsOf = (bundle, source) => bundle?.sources?.[source]?.success ? bundle.sources[source].rows || [] : [];
  const KEYS = {
    resource_plan: ['Pay Id'],
    demand_input: ['Patch', 'Skill', 'Work Code', 'Weekcomm'],
    job_time_assumptions: ['Patch', 'Skill', 'Work Code', 'Weekcomm'],
    geography_mapping: ['territory'],
    fte_transfer: ['From', 'To', 'Skill', 'Weekcomm', 'Reason'],
    recruitment_grounded: ['Cohort', 'Skill', 'Region', 'Weekcomm'],
    recruitment_ungrounded: ['Cohort', 'Skill', 'Region', 'Weekcomm'],
    downtime_overlays_percentage: ['patch', 'skill', 'metric', 'level2', 'weekcomm'],
    downtime_overlays_hours: ['patch', 'skill', 'metric', 'level2', 'weekcomm'],
    downtime_overlays_hours_fte: ['patch', 'skill', 'metric', 'level2', 'weekcomm'],
    overtime: ['Region', 'Skill', 'Weekcomm'],
    ctr_capacity: ['Agency', 'Skill', 'Region', 'Weekcomm'],
    attrition: ['Region Code', 'Skill', 'Weekcomm'],
    recruitment_config: ['Cohort', 'Skill', 'Weekcomm', 'Week'],
    baseline_assumptions: ['Metric'],
    baseline_productivity: ['Skill'],
    training_snm: ['Course', 'Skill', 'Region', 'Weekcomm', 'Location'],
    hec_on_kac_demand: ['Region', 'Skill', 'Support', 'Weekcomm'],
    hec_on_ev_demand: ['Region', 'Skill', 'Support', 'Weekcomm'],
    week_to_month: ['Weekcomm']
  };
  function extract(bundle) {
    const facts = {},
      issues = [],
      map = new Map(), geography = new Map(), areaRegions = new Map();
    const issue = (source, index, kind, detail) => issues.push({
      source,
      row: index >= 0 ? index + 1 : null,
      kind,
      detail
    });
    rowsOf(bundle, 'geography_mapping').forEach((r, i) => {
      const n = normalizeSource('geography_mapping', r),
        p = text(n.territory),
        region = reg(n.region), area = text(n.areacode || n.acdm);
      if (!p || !region) issue('geography_mapping', i, 'Invalid geography', 'Territory or region missing');else if (geography.has(p) && (map.get(p) !== region || geography.get(p).area !== area)) {
        map.set(p, 'Unmapped');
        geography.set(p, {patch:p, area:'', region:'Unmapped'});
        issue('geography_mapping', i, 'Conflicting mapping', p);
      } else {
        map.set(p, region);
        geography.set(p, {patch:p, area, region, label:text(n.patchname) || p});
      }
    });
    for (const {area, region} of geography.values()) {
      if (!area || region === 'Unmapped') continue;
      areaRegions.set(area, areaRegions.has(area) && areaRegions.get(area) !== region ? 'Unmapped' : region);
    }
    for (const [source, input] of Object.entries(bundle?.sources || {})) {
      if (!input.success) issue(source, -1, 'Unavailable input', input.error || 'Missing selected input');else if (!input.rows?.length) issue(source, -1, 'Empty input', 'Selected version has no source records');
      const duplicate = new Map();
      facts[source] = rowsOf(bundle, source).map((raw, index) => {
        const n = normalizeSource(source, raw),
          location = text(n.patch || (source === 'resource_plan' ? n.wmis : ''));
        const areaOnly = source === 'resource_plan' && !map.has(location) && areaRegions.get(location) && areaRegions.get(location) !== 'Unmapped';
        const patch = areaOnly ? '' : location;
        const sourceRegion = reg(n.regioncode || n.region),
          mapped = map.get(patch);
        const r = {
          source,
          row: index + 1,
          raw,
          patch,
          area: areaOnly ? location : geography.get(patch)?.area || '',
          skill: text(n.skill).toUpperCase(),
          week: week(n.weekcomm),
          region: areaOnly ? areaRegions.get(location) : patch ? mapped || 'Unmapped' : sourceRegion || 'Unmapped',
          workCode: text(n.workcode),
          value: num(n.values ?? n.value),
          category: text(n.metric),
          n
        };
        if ('weekcomm' in n && !r.week) issue(source, index, 'Invalid week', 'Missing or invalid Weekcomm date; excluded from the weekly model');
        if (patch && source !== 'resource_plan' && !mapped) issue(source, index, 'Unmapped patch', patch);
        if (mapped && sourceRegion && mapped !== sourceRegion) issue(source, index, 'Region conflict', `File ${sourceRegion}; geography ${mapped}. Geography used.`);
        const keys = KEYS[source];
        if (keys) {
          const id = keys.map(k => text(n[k.toLowerCase().replace(/[ _]/g, '')])).join('|');
          if (duplicate.has(id)) {
            r.duplicate = true;
            duplicate.get(id).duplicate = true;
            issue(source, index, 'Duplicate business key', id);
          } else duplicate.set(id, r);
        }
        if ('values' in n && (r.value === null || r.value < 0)) issue(source, index, 'Invalid measure', 'Expected a nonnegative numeric Values field');
        return r;
      });
    }
    const times = new Map();
    (facts.job_time_assumptions || []).forEach(r => {
      if (!r.duplicate && r.value !== null && r.value >= 0) times.set(key(r), r);
    });
    (facts.demand_input || []).forEach(r => {
      r.jobs = r.value !== null && r.value >= 0 && !r.duplicate ? r.value : null;
      r.jobTime = times.get(key(r));
      r.matched = r.jobs !== null && !!r.jobTime && !!r.week;
      if (!r.jobTime) issue(r.source, r.row - 1, 'Unmatched job time', [r.patch, r.skill, r.workCode, r.week].join(' / '));
      if (!r.week) issue(r.source, r.row - 1, 'Missing week', 'Demand row cannot enter the weekly model');
    });
    const roster = facts.resource_plan || [];
    roster.forEach(r => {
      if (text(r.n.status).toLowerCase() === 'active' && r.region === 'Unmapped') issue(r.source, r.row - 1, 'Unmapped roster', r.patch || 'No WMIS location');
    });
    const skills = new Set((facts.demand_input || []).map(r => r.skill));
    for (const skill of skills) if (!(facts.baseline_productivity || []).some(r => r.skill === skill)) issue('baseline_productivity', -1, 'Missing skill rate', skill + ' has no baseline productivity record; no rate is imputed');
    const calendar = new Set((facts.week_to_month || []).map(r => r.week));
    for (const w of new Set((facts.demand_input || []).map(r => r.week).filter(Boolean))) if (!calendar.has(w)) issue('week_to_month', -1, 'Missing fiscal week', w + ' has no fiscal calendar mapping');
    return {
      facts,
      issues,
      map,
      geography,
      sources: bundle?.sources || {},
      weeks: [...new Set((facts.demand_input || []).map(r => r.week).filter(Boolean))].sort()
    };
  }
  function inScope(r, filter = {}) {
    return (!filter.region || filter.region === 'All' || r.region === filter.region) && (!filter.area || filter.area === 'All' || r.area === filter.area) && (!filter.patch || filter.patch === 'All' || r.patch === filter.patch) && (!filter.skill || filter.skill === 'All' || r.skill === filter.skill) && (!r.week || (!filter.start || r.week >= filter.start) && (!filter.end || r.week <= filter.end));
  }
  const defaults = {
    jobTimeUnit: 'hours',
    standardHours: 37.5,
    downtime: 'hours',
    allowPartial: false,
    includeOvertime: true,
    includeContractors: true,
    includeRecruitment: false,
    includeSupport: false,
    includeTransfers: false,
    rampWeeks: 4,
    recruitmentLeadWeeks: 8,
    trainingLeadWeeks: 4,
    supportLeadWeeks: 1
  };
  function model(data, filter = {}, assumptions = {}, shock = {}, geographic = false) {
    const a = {
        ...defaults,
        ...assumptions
      },
      facts = data.facts,
      cells = new Map(),
      exclusions = new Set(),
      routes = [];
    const childScope = [filter.area, filter.patch].some(value => value && value !== 'All');
    const regionKey = r => JSON.stringify([r.region, r.skill, r.week]);
    const rosterByLocation = new Map();
    const locationKey = r => JSON.stringify([r.region, r.area, r.patch, r.skill, r.week]);
    const change = geographic ? shock.planningChange : null;
    const affected = row => change && planningKey(row, change.level) === change.id;
    // Resolve both sides before narrowing a donor/recipient view.
    if ((a.includeSupport || a.includeTransfers) && !childScope && (filter.skill && filter.skill !== 'All' || filter.region && filter.region !== 'All')) {
      const all = model(data, {
        ...filter,
        region: 'All',
        skill: 'All'
      }, a, shock, geographic);
      const rows = all.rows.filter(r => inScope(r, filter));
      return {
        ...all,
        rows,
        ...summarize(rows)
      };
    }
    const weeks = data.weeks.filter(w => (!filter.start || w >= filter.start) && (!filter.end || w <= filter.end));
    const cellKey = r => geographic ? locationKey(r) : regionKey(r);
    const ensure = r => {
      const k = cellKey(r);
      if (!cells.has(k)) cells.set(k, {
        region: r.region,
        ...(geographic ? {area:r.area || '', patch:r.patch || '', evidence:[], rosterKnown:false, demandKnown:false} : {}),
        skill: r.skill,
        week: r.week,
        jobs: 0,
        matchedJobs: 0,
        demand: 0,
        unmatched: 0,
        roster: 0,
        downtime: 0,
        recruits: 0,
        uncertainRecruits: 0,
        overtime: 0,
        contractors: 0,
        transfers: 0,
        support: 0,
        extra: 0
      });
      return cells.get(k);
    };
    const record = (cell, row, hours, other = {}) => {
      if (geographic) cell.evidence.push({row, hours, ...other});
    };
    (facts.demand_input || []).filter(r => inScope(r, filter) && r.week).forEach(r => {
      const c = ensure(r);
      c.jobs += r.jobs || 0;
      if (r.matched) {
        c.matchedJobs += r.jobs;
        c.demand += r.jobs * r.jobTime.value / (a.jobTimeUnit === 'minutes' ? 60 : 1);
        if (geographic) c.demandKnown = true;
      } else c.unmatched++;
      record(c, r, r.matched ? r.jobs * r.jobTime.value / (a.jobTimeUnit === 'minutes' ? 60 : 1) : null);
    });
    // Roster is a snapshot, repeated across weeks, with explicit active status and effective dates.
    (facts.resource_plan || []).filter(r => inScope(r, filter) && !r.duplicate && text(r.n.status).toLowerCase() === 'active').forEach(r => {
      if (r.region === 'Unmapped' || (!r.area && !data.map.has(r.patch))) {
        exclusions.add('Unmapped active roster rows excluded from capacity.');
        return;
      }
      const hours = num(r.n.hours),
        allocation = num(r.n.allocation);
      if (hours === null || hours < 0 || allocation === null || allocation < 0 || allocation > 100) {
        exclusions.add('Roster rows with invalid hours/allocation excluded.');
        return;
      }
      weeks.forEach(w => {
        if (week(r.n.leftdate) && week(r.n.leftdate) <= w || week(r.n.upddate || r.n.update) && week(r.n.upddate || r.n.update) > w) return;
        const dated = {...r, week:w};
        const c = ensure(dated);
        const allocated = hours * allocation / 100 * (affected(c) ? change.rosterScale : 1);
        c.roster += allocated;
        if (geographic) c.rosterKnown = true;
        const location = locationKey(dated);
        rosterByLocation.set(location, (rosterByLocation.get(location) || 0) + allocated);
        record(c, r, allocated, {week:w});
      });
    });
    const dowSource = {
      hours: 'downtime_overlays_hours',
      percent: 'downtime_overlays_percentage',
      perFte: 'downtime_overlays_hours_fte'
    }[a.downtime];
    (facts[dowSource] || []).filter(r => inScope(r, filter) && r.week && !r.duplicate && r.value !== null && r.value >= 0).forEach(r => {
      const c = ensure(r);
      const roster = rosterByLocation.get(locationKey(r));
      const hours = a.downtime === 'hours' ? r.value
        : a.downtime === 'percent' ? (roster ?? 0) * r.value / 100
        : (roster ?? 0) / a.standardHours * r.value;
      c.downtime += hours;
      if (geographic && roster === undefined && r.value > 0) c.unresolvedDowntime = true;
      record(c, r, c.unresolvedDowntime && roster === undefined ? null : hours, {downtime:true});
    });
    const patchScope = childScope;
    if (patchScope) exclusions.add('Region-level recruitment, overtime, contractors, transfers and support are excluded at area or patch scope; no allocation is assumed.');
    if (!patchScope) {
      (facts.overtime || []).filter(r => inScope(r, filter) && r.week && !r.duplicate).forEach(r => {
        if (a.includeOvertime && text(r.n.authorized).toLowerCase() === 'yes' && num(r.n.overtimehours) !== null) {
          const c = ensure(r);
          const hours = Math.max(0, num(r.n.overtimehours)) * (1 + (shock.overtimePct || 0) / 100);
          c.overtime += hours;
          record(c, r, hours);
        }
      });
      (facts.ctr_capacity || []).filter(r => inScope(r, filter) && r.week && !r.duplicate).forEach(r => {
        if (a.includeContractors && text(r.n.status).toLowerCase() === 'active' && num(r.n.contractorhours) !== null) {
          const c = ensure(r);
          const hours = Math.max(0, num(r.n.contractorhours)) * (1 + (shock.contractorPct || 0) / 100);
          c.contractors += hours;
          record(c, r, hours);
        }
      });
      if (a.includeRecruitment) ['recruitment_grounded', 'recruitment_ungrounded'].forEach(source => {
        (facts[source] || []).filter(r => !r.duplicate && r.week && (!filter.region || filter.region === 'All' || r.region === filter.region) && (!filter.skill || filter.skill === 'All' || r.skill === filter.skill)).forEach(r => {
          const count = Math.max(0, num(r.n.headcount) || 0),
            p = source === 'recruitment_grounded' ? 1 : Math.min(1, Math.max(0, (num(r.n.probability) || 0) / (String(r.n.probability).includes('%') ? 100 : 1)));
          const start = addWeeks(r.week, shock.recruitmentDelay || 0);
          weeks.forEach(w => {
            if (w >= start) {
              const age = Math.floor((Date.parse(w) - Date.parse(start)) / 604800000) + 1;
              const h = count * p * a.standardHours * Math.min(1, age / Math.max(1, a.rampWeeks));
              const c = ensure({
                ...r,
                week: w
              });
              c.recruits += h;
              record(c, r, h, {week:w});
              if (source === 'recruitment_ungrounded') c.uncertainRecruits += h;
            }
          });
        });
      });
      // Explicit support is a transfer of donor hours, credited at its source efficiency.
      if (a.includeSupport) ['hec_on_kac_demand', 'hec_on_ev_demand'].forEach(source => {
        (facts[source] || []).filter(r => r.week && !r.duplicate && (!filter.region || filter.region === 'All' || r.region === filter.region) && (!filter.start || r.week >= filter.start) && (!filter.end || r.week <= filter.end)).forEach(r => {
          const h = Math.min(Math.max(0, num(r.n.supporthours) || 0), Math.max(0, num(r.n.maxweeklyhours) || 0)),
            ratio = num(r.n.ratio);
          if (ratio === null || ratio < 0 || ratio > 1) return;
          const target = {
            ...r,
            skill: text(r.n.support).toUpperCase()
          };
          ensure(r);
          ensure(target);
          routes.push({
            from: cellKey(r),
            to: cellKey(target),
            hours: h,
            ratio,
            component: 'support', row:r
          });
        });
      });
      if (a.includeTransfers) (facts.fte_transfer || []).filter(r => r.week && !r.duplicate && (!filter.start || r.week >= filter.start) && (!filter.end || r.week <= filter.end) && (!filter.skill || filter.skill === 'All' || r.skill === filter.skill)).forEach(r => {
        const resolve = v => reg(v) || [...new Set([...data.map].filter(([p]) => p.startsWith(text(v))).map(([, region]) => region))].filter(x => x !== 'Unmapped').join('');
        const from = resolve(r.n.from),
          to = resolve(r.n.to),
          fte = num(r.n.fte);
        if (!/^[A-E]$/.test(from) || !/^[A-E]$/.test(to) || fte === null || fte < 0) {
          exclusions.add('Unresolved transfer locations excluded.');
          return;
        }
        const donor = {
            ...r,
            region: from
          },
          receiver = {
            ...r,
            region: to
          };
        ensure(donor);
        ensure(receiver);
        routes.unshift({
          from: cellKey(donor),
          to: cellKey(receiver),
          hours: fte * a.standardHours,
          ratio: 1,
          component: 'transfers', row:r
        });
      });
    }
    const rows = [...cells.values()].sort((x, y) => x.week.localeCompare(y.week) || x.region.localeCompare(y.region) || x.skill.localeCompare(y.skill)).map(c => {
      c.demand *= 1 + (shock.demandPct || 0) / 100;
      if (affected(c)) {
        if (change.downtimeScale !== 1) c.downtime = Math.min(c.roster,c.downtime) * change.downtimeScale;
        if (locationKey(c) === change.overtimeLocation) c.overtime += change.overtime;
      }
      c.appliedDowntime = Math.min(c.roster, c.downtime);
      const productive = Math.max(0, c.roster - c.downtime - c.roster * (shock.absencePp || 0) / 100) * (1 + (shock.productivityPct || 0) / 100);
      c.extra = (!shock.targetRegion || shock.targetRegion === 'All' || c.region === shock.targetRegion) && (!shock.targetSkill || shock.targetSkill === 'All' || c.skill === shock.targetSkill) ? shock.extraHours || 0 : 0;
      c.capacity = Math.max(0, productive + c.recruits + c.overtime + c.contractors + c.transfers + c.support + c.extra);
      return c;
    });
    const indexed = new Map(rows.map(r => [cellKey(r), r]));
    const regionalCapacity = new Map();
    if (geographic) for (const row of rows) {
      const key = regionKey(row);
      regionalCapacity.set(key, (regionalCapacity.get(key) || 0) + row.capacity);
    }
    routes.forEach(route => {
      if (route.from === route.to) return;
      const donor = indexed.get(route.from),
        receiver = indexed.get(route.to);
      const donorRegion = regionKey(donor), receiverRegion = regionKey(receiver);
      const hours = Math.min(route.hours, geographic ? regionalCapacity.get(donorRegion) : donor.capacity);
      if (geographic) {
        regionalCapacity.set(donorRegion, regionalCapacity.get(donorRegion) - hours);
        regionalCapacity.set(receiverRegion, regionalCapacity.get(receiverRegion) + hours * route.ratio);
      }
      if (hours < route.hours) exclusions.add('Planned transfers/support were capped at available modeled donor capacity; full source commitments were not assumed feasible.');
      donor.capacity -= hours;
      receiver.capacity += hours * route.ratio;
      donor[route.component] -= hours;
      receiver[route.component] += hours * route.ratio;
      record(donor, route.row, -hours);
      record(receiver, route.row, hours * route.ratio);
    });
    rows.forEach(c => {
      c.partial = c.unmatched > 0;
      c.comparable = c.region !== 'Unmapped' && c.matchedJobs > 0 && (!c.partial || a.allowPartial) && c.roster + c.recruits + c.overtime + c.contractors + Math.max(0, c.support) + Math.max(0, c.transfers) > 0;
      if (geographic) {
        c.capacityKnown = c.region !== 'Unmapped' && (c.rosterKnown || c.evidence.some(entry =>
          ['overtime','ctr_capacity','recruitment_grounded','recruitment_ungrounded','fte_transfer','hec_on_kac_demand','hec_on_ev_demand'].includes(entry.row.source)));
        c.downtimeKnown = data.sources[dowSource]?.success === true && c.rosterKnown;
        c.comparable = c.capacityKnown && !c.unresolvedDowntime && (!c.rosterKnown || c.downtimeKnown)
          && c.demandKnown && (!c.partial || a.allowPartial);
      }
      c.gap = c.comparable ? c.capacity - c.demand : null;
      c.deficit = c.comparable ? Math.max(0, -c.gap) : null;
      c.surplus = c.comparable ? Math.max(0, c.gap) : null;
      c.coverage = c.comparable && c.demand > 0 ? c.capacity / c.demand * 100 : null;
    });
    return {
      rows,
      exclusions: [...exclusions],
      ...summarize(rows)
    };
  }
  function summarize(rows) {
    const comparable = rows.filter(r => r.comparable),
      demand = sum(comparable, 'demand'),
      capacity = sum(comparable, 'capacity');
    return {
      demand,
      capacity,
      deficit: sum(comparable, 'deficit'),
      surplus: sum(comparable, 'surplus'),
      coverage: demand > 0 ? capacity / demand * 100 : null,
      comparable: comparable.length,
      total: rows.length
    };
  }
  function planningSummary(rows, level = 'region', assumptions = defaults, parentFteWeeks) {
    const groups = new Map();
    for (const row of rows) {
      const id = planningKey(row, level);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(row);
    }
    const assessed = [...groups].map(([id, cells]) => {
      const {region, area, patch, skill, week} = cells[0];
      const demand = sum(cells, 'demand');
      const capacity = sum(cells, 'capacity');
      const comparable = region !== 'Unmapped' && cells.some(r => r.demandKnown)
        && cells.some(r => r.capacityKnown)
        && cells.every(r => !r.unresolvedDowntime && (!r.rosterKnown || r.downtimeKnown) && (!r.partial || assumptions.allowPartial));
      return {id, region, area, patch, skill, week, demand, capacity, comparable, cells,
        gap: comparable ? capacity - demand : null};
    });
    const comparable = assessed.filter(r => r.comparable);
    const rosterRows = rows.filter(row => row.rosterKnown);
    const rosterWeeks = new Set(rosterRows.map(row => row.week)).size;
    const fteWeeks = parentFteWeeks ?? rosterWeeks;
    const roster = sum(rosterRows, 'roster');
    const unresolvedParents = new Set();
    for (const row of rows.filter(row=>row.unresolvedDowntime)) {
      unresolvedParents.add(planningKey(row,'region'));
      if (row.area) unresolvedParents.add(planningKey(row,'area'));
    }
    const downtimeRows = rosterRows.filter(row=>row.downtimeKnown && !row.unresolvedDowntime &&
      (row.patch || !unresolvedParents.has(planningKey(row,row.area?'area':'region'))));
    const eligibleRoster = new Set(downtimeRows);
    const downtime = downtimeRows.length ? sum(downtimeRows,'appliedDowntime') : null;
    const evidence = rows.flatMap(cell => (cell.evidence || []).map(entry => ({...entry,cell})));
    // Parent-only capacity and local deficits can overlap within the same skill/week.
    // Count the larger shortfall there, then add distinct groups across the period.
    let grossShortfall = null;
    for (const group of assessed) {
      const local = group.cells.filter(cell => cell.patch && cell.deficit != null);
      if (group.comparable || local.length) {
        grossShortfall = (grossShortfall ?? 0) + Math.max(0, -(group.gap ?? 0), sum(local,'deficit'));
      }
    }
    const capacityRows = rows.filter(row=>row.capacityKnown && !row.unresolvedDowntime &&
      (row.rosterKnown ? eligibleRoster.has(row)
        : row.patch || !unresolvedParents.has(planningKey(row,row.area?'area':'region'))));
    const unknownDowntime = unresolvedParents.size>0 || downtimeRows.length<rosterRows.length;
    const assessedRoster = sum(downtimeRows,'roster');
    const partial = comparable.length < assessed.length || rows.some(row => row.partial);
    return {
      roster, rosterWeeks, fteWeeks, downtime, assessedRoster, evidence, assessed, level, grossShortfall, capacityRows, downtimeRows,
      jobs: evidence.some(entry => entry.row.source === 'demand_input' && entry.row.jobs != null) ? sum(rows,'jobs') : null,
      headcount: new Set(evidence.filter(e => e.row.source === 'resource_plan').map(e => e.row.n.payid).filter(Boolean)).size,
      fte: rosterWeeks && fteWeeks && assumptions.standardHours > 0 ? roster / fteWeeks / assumptions.standardHours : null,
      downtimeRate: downtime !== null && assessedRoster > 0 ? 100 * downtime / assessedRoster : null,
      capacity: capacityRows.length ? sum(capacityRows,'capacity') : null,
      demand: rows.some(row => row.demandKnown) ? sum(rows, 'demand') : null,
      assessedCapacity: comparable.length ? sum(comparable, 'capacity') : null,
      assessedDemand: comparable.length ? sum(comparable, 'demand') : null,
      gap: comparable.length ? sum(comparable, 'gap') : null,
      shortage: comparable.reduce((total, row) => total + Math.max(0, -row.gap), 0),
      localShortage: sum(rows.filter(row => row.patch), 'deficit'),
      unallocated: sum(rows.filter(row => !row.patch && !row.area), 'capacity'),
      partial,
      partialByMeasure: {
        gap:partial, shortage:partial, capacity:unknownDowntime, downtime:unknownDowntime,
        demand:rows.some(row=>row.partial),
        jobs:evidence.some(entry=>entry.row.source==='demand_input' && entry.row.jobs==null)
      },
      comparable: comparable.length
    };
  }
  function planningMeasures(report) {
    return {
      jobs:report.jobs, demand:report.demand, roster:report.rosterWeeks ? report.roster : null,
      capacity:report.capacity, gap:report.gap, shortage:report.grossShortfall,
      fte:report.fte, downtime:report.downtime
    };
  }

  const planningComponents = {
    resource_plan:'Allocated roster hours', overtime:'Overtime', ctr_capacity:'Contractor cover',
    recruitment_grounded:'Grounded recruitment', recruitment_ungrounded:'Ungrounded recruitment',
    fte_transfer:'Transfers', hec_on_kac_demand:'KAC support', hec_on_ev_demand:'EV support'
  };
  const planningBreakdownEntry = {
    downtime:entry=>entry.downtime,
    fte:entry=>entry.row.source==='resource_plan',
    roster:entry=>entry.row.source==='resource_plan',
    jobs:entry=>entry.row.source==='demand_input',
    demand:entry=>entry.row.source==='demand_input',
    capacity:({downtime,hours,row})=>hours!=null && (downtime || Object.hasOwn(planningComponents,row.source))
  };
  const eligibleBreakdownEntry = (report,measure) => {
    const matches = planningBreakdownEntry[measure];
    const eligibleCells = measure==='capacity' ? new Set(report.capacityRows)
      : measure==='downtime' ? new Set(report.downtimeRows) : null;
    return entry=>matches && matches(entry) && (!eligibleCells || eligibleCells.has(entry.cell));
  };
  function hasPlanningBreakdown(report, measure) {
    return report.evidence.some(eligibleBreakdownEntry(report,measure)) || (measure==='capacity' && Math.abs(report.capacity)>1e-8);
  }
  function planningBreakdown(report, measure, dimension, assumptions = defaults) {
    const total = planningMeasures(report)[measure];
    const groups = new Map();
    function add(path, value, entry) {
      for (let depth=1;depth<=path.length;depth++) {
        const labels = path.slice(0,depth);
        const id = JSON.stringify(labels);
        if (!groups.has(id)) groups.set(id,{path:labels,value:total==null ? null : 0,evidence:[]});
        const group = groups.get(id);
        if (value==null) group.value = null;
        else if (group.value!=null) group.value += value;
        if (entry) group.evidence.push({...entry,contribution:value});
      }
    }
    const eligible = eligibleBreakdownEntry(report,measure);
    for (const entry of report.evidence) {
      if (!eligible(entry)) continue;
      const {row,cell,hours,downtime} = entry;
      const category = [row.category || 'Uncategorised', row.n.level2 || 'Unspecified type'];
      const skill = cell.skill || 'Unspecified skill';
      const applied = hours==null ? null : cell.downtime>0 ? hours*cell.appliedDowntime/cell.downtime : 0;
      if (measure==='downtime') add(category,applied,entry);
      if (measure==='fte' || measure==='roster') {
        const denominator = measure==='fte' ? report.fteWeeks*assumptions.standardHours : 1;
        add([skill,row.n.labourtype || 'Unspecified labour type'],denominator>0 ? hours/denominator : null,entry);
      }
      if (measure==='jobs' || measure==='demand') {
        const workCode = row.workCode || 'Unspecified work code';
        const path = dimension==='product' ? [row.n.product || 'Unspecified product',workCode] : [skill,workCode];
        const value = measure==='jobs' ? row.jobs : hours;
        add(path,value,entry);
      }
      if (measure==='capacity') {
        if (downtime) add(['Downtime deducted',...category],-applied,entry);
        else add([planningComponents[row.source]],hours,entry);
      }
    }
    if (measure==='capacity' && total!=null) {
      const explained = sum([...groups.values()].filter(group=>group.path.length===1),'value');
      if (Math.abs(total-explained)>1e-8) add(['Other modeled adjustments'],total-explained);
    }
    return groups;
  }

  function planningMeasureChange(before, after, key, geography = [], assumptions = defaults) {
    if (!before || !after || before.level !== after.level) return null;
    if (key === 'gap') return planningImpact(before,after,geography,assumptions,false).delta;
    const start = planningMeasures(before)[key], end = planningMeasures(after)[key];
    if (start == null || end == null) return null;
    // Check evidence for this measure independently. Missing durations affect hours
    // but valid job counts and roster hours still support their own comparisons.
    const moved = new Set(geography.map(row => row.patch));
    const coverage = report => {
      const eligible = key==='capacity' ? new Set(report.capacityRows) : key==='downtime' ? new Set(report.downtimeRows) : null;
      const ids = new Set();
      for (const group of report.assessed) {
        if (key === 'shortage' && group.comparable) ids.add('group:'+group.id);
        for (const cell of group.cells) {
          if (moved.has(cell.patch)) return null;
          if ((key === 'demand' || key === 'shortage') && cell.partial) return null;
          const known = key === 'jobs' ? cell.evidence.some(e => e.row.source === 'demand_input' && e.row.jobs != null)
            : key === 'demand' ? cell.demandKnown
            : eligible ? eligible.has(cell)
            : key === 'shortage' ? cell.patch && cell.comparable
            : cell.rosterKnown;
          if (known) ids.add(planningKey(cell,'patch'));
        }
      }
      return ids;
    };
    const previous = coverage(before), current = coverage(after);
    if (!previous || !current || previous.size !== current.size) return null;
    for (const id of previous) if (!current.has(id)) return null;
    return end-start;
  }
  function planningImpact(baseline, revised, geography = [], assumptions = defaults, includeEvidence = true) {
    const moved = new Set(geography.map(row => row.patch));
    const beforeIndex = new Map(baseline.assessed.map(group => [group.id, group]));
    const pairs = revised.assessed.flatMap(after => {
      const before = beforeIndex.get(after.id);
      if (!after.comparable || !before?.comparable ||
          [...after.cells, ...before.cells].some(row => row.partial || moved.has(row.patch))) return [];
      return [{before, after}];
    });
    const before = pairs.flatMap(pair => pair.before.cells);
    const after = pairs.flatMap(pair => pair.after.cells);
    const metrics = [
      ['roster','Roster hours',1], ['appliedDowntime','Applied downtime',-1], ['recruits','Recruitment',1],
      ['overtime','Overtime',1], ['contractors','Contractor cover',1], ['transfers','Transfers',1],
      ['support','Cross-skill support',1], ['demand','Required hours',-1]
    ];
    const components = metrics.map(([key,name,sign]) => {
      const start = sum(before,key), end = sum(after,key);
      return {key,name,before:start,after:end,delta:end-start,value:sign*(end-start)};
    });
    const gapBefore = pairs.length ? pairs.reduce((total, pair) => total + pair.before.gap, 0) : null;
    const gapAfter = pairs.length ? pairs.reduce((total, pair) => total + pair.after.gap, 0) : null;
    const delta = pairs.length ? gapAfter-gapBefore : null;
    const residual = delta === null ? 0 : delta-sum(components,'value');
    const evidence = cells => cells.flatMap(cell => cell.evidence || []);
    const demandData = cells => ({facts:{demand_input:evidence(cells).filter(entry =>
      entry.row.source === 'demand_input').map(entry => entry.row)}});
    const pairIds = new Set(pairs.map(pair => pair.before.id));
    const coverage = side => ({
      groups: side.assessed.length-pairs.length,
      hours: sum(side.assessed.filter(group => !pairIds.has(group.id) && group.comparable), 'gap')
    });
    return {components, pairs, gapBefore, gapAfter, delta, residual,
      capacityBefore:sum(before,'capacity'), capacityAfter:sum(after,'capacity'),
      baselineCoverage:coverage(baseline), revisedCoverage:coverage(revised),
      ...(includeEvidence ? {beforeEvidence:evidence(before), afterEvidence:evidence(after),
        demandBridge:demandBridge(demandData(before),demandData(after),{},assumptions)} : {})};
  }

  function simulatePlanningChange(data, filter, assumptions, group, level, driver, amount) {
    if (!group?.comparable || !Number.isFinite(amount) || !['fte','roster','downtime','overtime'].includes(driver)) return null;
    const roster = sum(group.cells,'roster');
    const downtime = sum(group.cells,'appliedDowntime');
    if (['fte','roster'].includes(driver) && roster <= 0) return null;
    if (driver === 'downtime' && (amount < 0 || downtime <= 0 || amount > downtime)) return null;
    if (driver === 'overtime' && amount < 0) return null;
    const rosterDelta = driver === 'fte' ? amount*assumptions.standardHours : driver === 'roster' ? amount : 0;
    if (roster+rosterDelta < 0) return null;
    const target = group.cells.find(cell => cell.rosterKnown) || group.cells[0];
    const planningChange = {id:group.id,level,rosterScale:roster ? (roster+rosterDelta)/roster : 1,
      downtimeScale:driver === 'downtime' ? (downtime-amount)/downtime : 1, overtime:driver === 'overtime' ? amount : 0,
      overtimeLocation:JSON.stringify([target.region,target.area,target.patch,target.skill,target.week])};
    const result = model(data,filter,assumptions,{planningChange},true);
    return planningSummary(result.rows.filter(row => planningKey(row,level) === group.id),level,assumptions).assessed[0] || null;
  }
  function workloadOutlook(data, filter = {}, asOf = new Date().toISOString().slice(0,10), modelResult = {rows:[]}, assumptions = {}) {
    if (!week(asOf)) throw new Error('Choose a valid planning date');
    const day = new Date(asOf+'T00:00:00Z'), offset = (day.getUTCDay()+6)%7;
    day.setUTCDate(day.getUTCDate()-offset);
    const anchor = day.toISOString().slice(0,10), a = {...defaults,...assumptions};
    const scoped = source => (data.facts[source]||[]).filter(r=>inScope(r,filter));
    const submitted = scoped('demand_input');
    const valid = submitted.filter(r=>r.jobs!==null && r.jobs!==undefined && r.week && !r.duplicate);
    const future = valid.filter(r=>r.week>=anchor), totalJobs = sum(future,'jobs');
    const aggregate = (rows, getKey) => {
      const m = new Map();
      rows.forEach(r=>{const name=getKey(r)||'Unspecified';m.set(name,(m.get(name)||0)+r.jobs);});
      return [...m].map(([name,jobs])=>({name,jobs,share:totalJobs>0?100*jobs/totalJobs:null})).sort((x,y)=>y.jobs-x.jobs||x.name.localeCompare(y.name));
    };
    const weekly=aggregate(future,r=>r.week).sort((x,y)=>x.name.localeCompare(y.name));
    const next4=Array.from({length:4},(_,i)=>{const w=addWeeks(anchor,i),r=weekly.find(x=>x.name===w);return {week:w,jobs:r?.jobs??null};});
    const peak=[...weekly].sort((x,y)=>y.jobs-x.jobs||x.name.localeCompare(y.name))[0]||null;
    const average=weekly.length?totalJobs/weekly.length:null;
    const patches=aggregate(future,r=>r.patch), skills=aggregate(future,r=>r.skill);
    const mapped=sum(future.filter(r=>r.region!=='Unmapped'),'jobs'), matched=sum(future.filter(r=>r.matched),'jobs');
    const calendar=new Set((data.facts.week_to_month||[]).filter(r=>!r.duplicate&&r.week).map(r=>r.week));
    const readiness=[
      {source:'demand_input',title:'Upcoming forecast',ready:future.length>0,detail:future.length?`${future.length} valid rows in ${weekly.length} submitted weeks. Missing weeks remain unknown.`:'No valid demand rows on or after the planning week in this scope.'},
      {source:'geography_mapping',title:'Location mapping',ready:totalJobs>0&&mapped===totalJobs,detail:totalJobs>0?`${totalJobs-mapped} of ${totalJobs} upcoming jobs have no authoritative region mapping.`:'No valid upcoming job volume to check.'},
      {source:'job_time_assumptions',title:'Job durations',ready:totalJobs>0&&matched===totalJobs,detail:totalJobs>0?`${totalJobs-matched} upcoming jobs lack a unique matching duration. Model assumption: ${a.jobTimeUnit} per job.`:'No valid upcoming job volume to check.'},
      {source:'week_to_month',title:'Week-to-month calendar',ready:weekly.length>0&&weekly.every(r=>calendar.has(r.name)),detail:`${weekly.filter(r=>calendar.has(r.name)).length} of ${weekly.length} upcoming weeks have a unique calendar match. Calendar-month demand charts can still use week-start dates; fiscal reporting needs fiscal fields too.`}
    ];
    let extraCoverKnown=true;
    for(const [source,enabled,fields,title] of [
      ['resource_plan',true,['status','payid','wmis','skill','hours','allocation'],'Staffing inputs'],
      ['overtime',a.includeOvertime,['authorized','overtimehours','skill','weekcomm'],'Overtime inputs'],
      ['ctr_capacity',a.includeContractors,['status','contractorhours','skill','weekcomm'],'Contractor inputs']
    ]) {
      if(!enabled)continue;
      const records=scoped(source),unsupported=records.filter(r=>fields.some(k=>!(k in r.n))).length;
      const ready=records.length>0&&unsupported===0;
      if(source!=='resource_plan'&&!ready)extraCoverKnown=false;
      readiness.push({source,title,ready,detail:!records.length?'Selected source is missing, empty or outside this scope.':unsupported?`${unsupported} rows do not supply the explicit fields needed by the model. Generic Values are not assumed to be hours or confirmed cover.`:'Required field names are present. Eligibility, dates and location still determine which records enter the model.'});
    }
    const cells=(modelResult.rows||[]).filter(r=>r.week>=anchor), assessed=cells.filter(r=>r.comparable), short=assessed.filter(r=>r.deficit>0);
    const first=[...short].sort((x,y)=>x.week.localeCompare(y.week))[0]||null;
    const persistent=persistence(cells).filter(r=>r.longest>=2).sort((x,y)=>y.longest-x.longest||y.deficit-x.deficit);
    const withoutModel=extraCoverKnown&&assessed.length ? model(data,filter,assumptions,{overtimePct:-100,contractorPct:-100}) : null;
    const withoutIndex=new Map((withoutModel?.rows||[]).map(r=>[[r.region,r.skill,r.week].join('|'),r]));
    const withoutExtra=withoutModel ? assessed.reduce((s,r)=>s+Math.max(0,r.demand-(withoutIndex.get([r.region,r.skill,r.week].join('|'))?.capacity??0)),0) : null;
    return {asOf,anchor,totalJobs,weekly,next4,next4Complete:next4.every(r=>r.jobs!==null),next4Jobs:sum(next4.filter(r=>r.jobs!==null),'jobs'),peak,
      average,peakUplift:average>0?100*(peak.jobs/average-1):null,patches,skills,
      topPatchCount:Math.min(5,patches.length),top5Share:totalJobs>0?100*sum(patches.slice(0,5),'jobs')/totalJobs:null,
      unmappedJobs:totalJobs-mapped,unmappedPct:totalJobs>0?100*(totalJobs-mapped)/totalJobs:null,matchedJobs:matched,
      excludedDemandRows:submitted.filter(r=>r.jobs===null||r.jobs===undefined||!r.week||r.duplicate).length,
      readiness,extraCoverKnown,firstShortage:first?.week||null,weeksToFirst:first?Math.round((Date.parse(first.week)-Date.parse(anchor))/604800000):null,
      assessedGroups:assessed.length,unassessedGroups:cells.length-assessed.length,persistent,
      shortageWithoutExtra:withoutExtra,additionalShortage:withoutExtra===null?null:Math.max(0,withoutExtra-sum(assessed,'deficit')),
      leadWeeks:{recruitment:a.recruitmentLeadWeeks+a.rampWeeks,training:a.trainingLeadWeeks,support:a.supportLeadWeeks}};
  }
  // Shortages remain local: spare hours in another region/skill/week cannot cover them automatically.
  function planHealth(model, demandRows = []) {
    const rows = model.rows || [], comparable = rows.filter(r => r.comparable);
    const demand = sum(comparable, 'demand'), capacity = sum(comparable, 'capacity');
    const shortage = comparable.reduce((n, r) => n + Math.max(0, r.demand - r.capacity), 0);
    const covered = comparable.reduce((n, r) => n + Math.min(r.demand, Math.max(0, r.capacity)), 0);
    const shortGroups = comparable.filter(r => r.capacity < r.demand);
    const weekly = new Map();
    shortGroups.forEach(r => weekly.set(r.week, (weekly.get(r.week) || 0) + Math.max(0, r.demand - r.capacity)));
    const peak = [...weekly].sort((a,b) => b[1]-a[1] || String(a[0]).localeCompare(String(b[0])))[0];
    const jobs = sum(demandRows, 'jobs'), matched = sum(demandRows.filter(r => r.matched), 'jobs');
    const extra = sum(comparable, 'overtime') + sum(comparable, 'contractors');
    return {demand, capacity, shortage, covered, shortGroups:shortGroups.length,
      comparable:comparable.length, excluded:rows.length-comparable.length, total:rows.length,
      coveredPct:demand>0 ? covered/demand*100 : null,
      extraCoverPct:capacity>0 ? extra/capacity*100 : null,
      matchedPct:jobs>0 ? matched/jobs*100 : null, unmatchedJobs:Math.max(0,jobs-matched),
      peakWeek:peak?.[0] || null, peakShortage:peak?.[1] || 0,
      worst:shortGroups.slice().sort((a,b)=>(b.demand-b.capacity)-(a.demand-a.capacity) || String(a.week).localeCompare(String(b.week)))[0] || null};
  }
  function demandBridge(before, after, filter = {}, assumptions = {}) {
    const divisor = assumptions.jobTimeUnit === 'minutes' ? 60 : 1;
    const groups = data => {
      const result = new Map();
      (data.facts.demand_input || []).filter(r => inScope(r, filter)).forEach(r => {
        const k = [r.patch, r.skill, r.week].join('|');
        if (!result.has(k)) result.set(k, []);
        result.get(k).push(r);
      });
      return result;
    };
    const b = groups(before),
      c = groups(after),
      rows = [],
      excluded = [];
    for (const k of new Set([...b.keys(), ...c.keys()])) {
      const x = b.get(k),
        y = c.get(k);
      if (!x || !y || x.some(r => !r.matched) || y.some(r => !r.matched) || x.map(r => r.workCode).sort().join('|') !== y.map(r => r.workCode).sort().join('|')) {
        excluded.push({
          key: k,
          reason: 'Missing source group, unmatched task time or changed work-code scope'
        });
        continue;
      }
      const n = [sum(x, 'jobs'), sum(y, 'jobs')];
      if (!n[0] || !n[1]) {
        excluded.push({
          key: k,
          reason: 'Zero-volume baseline or current group'
        });
        continue;
      }
      const codes = x.map(r => r.workCode),
        shares = [x, y].map((list, i) => Object.fromEntries(list.map(r => [r.workCode, r.jobs / n[i]]))),
        times = [x, y].map(list => Object.fromEntries(list.map(r => [r.workCode, r.jobTime.value / divisor])));
      const value = s => n[s[0]] * codes.reduce((total, code) => total + shares[s[1]][code] * times[s[2]][code], 0);
      const impacts = [0, 0, 0],
        orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      orders.forEach(order => {
        const state = [0, 0, 0];
        order.forEach(i => {
          const old = value(state);
          state[i] = 1;
          impacts[i] += (value(state) - old) / 6;
        });
      });
      rows.push({
        patch: y[0].patch,
        region: y[0].region,
        skill: y[0].skill,
        week: y[0].week,
        before: value([0, 0, 0]),
        after: value([1, 1, 1]),
        volume: impacts[0],
        mix: impacts[1],
        duration: impacts[2],
        records: y
      });
    }
    return {
      rows,
      excluded,
      before: sum(rows, 'before'),
      after: sum(rows, 'after'),
      volume: sum(rows, 'volume'),
      mix: sum(rows, 'mix'),
      duration: sum(rows, 'duration')
    };
  }
  function persistence(rows) {
    const groups = new Map();
    rows.forEach(r => {
      const k = r.region + '|' + r.skill;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    return [...groups.values()].map(list => {
      list.sort((a, b) => a.week.localeCompare(b.week));
      let run = 0,
        longest = 0,
        previous = '';
      list.forEach(r => {
        run = r.gap !== null && r.gap < 0 ? previous && addWeeks(previous, 1) === r.week ? run + 1 : 1 : 0;
        longest = Math.max(longest, run);
        previous = r.week;
      });
      const valid = list.filter(r => r.comparable);
      return {
        region: list[0].region,
        skill: list[0].skill,
        deficit: sum(valid, 'deficit'),
        surplus: sum(valid, 'surplus'),
        weeks: valid.filter(r => r.gap < 0).length,
        longest,
        worst: valid.length ? Math.min(...valid.map(r => r.gap)) : null,
        first: valid.find(r => r.gap < 0)?.week || '',
        ...{
          coverage: summarize(list).coverage
        }
      };
    }).sort((a, b) => b.deficit - a.deficit);
  }
  function geographyChanges(before, after) {
    const label = mapping => !mapping || mapping.region === 'Unmapped' ? 'Unavailable'
      : [mapping.region, mapping.area].filter(Boolean).join(' / ');
    const patches = new Set([...before.geography.keys(), ...after.geography.keys()]);
    return [...patches].flatMap(patch => {
      const from = label(before.geography.get(patch)), to = label(after.geography.get(patch));
      return from === to ? [] : [{patch,before:from,after:to}];
    });
  }

  function compareSources(base, current) {
    const result = [];
    for (const source of new Set([...Object.keys(base?.sources || {}), ...Object.keys(current?.sources || {})])) {
      const b = base?.sources?.[source],
        c = current?.sources?.[source];
      const records = [];
      if (b?.success && c?.success) {
        const keys = KEYS[source];
        if (keys) {
          const group = rows => {
            const m = new Map();
            rows.forEach(r => {
              const n = normalizeSource(source, r),
                k = keys.map(s => text(n[s.toLowerCase().replace(/[ _]/g, '')])).join('|');
              if (!m.has(k)) m.set(k, []);
              m.get(k).push(r);
            });
            return m;
          };
          const bm = group(b.rows),
            cm = group(c.rows);
          for (const k of new Set([...bm.keys(), ...cm.keys()])) {
            const before = bm.get(k) || [],
              after = cm.get(k) || [];
            if (JSON.stringify(before.map(canonical).sort()) !== JSON.stringify(after.map(canonical).sort())) records.push({
              key: k,
              status: before.length === 0 ? 'Added' : after.length === 0 ? 'Removed' : before.length > 1 || after.length > 1 ? 'Changed (duplicate key)' : 'Changed',
              before,
              after
            });
          }
        } else if (b.hash !== c.hash) records.push({
          key: 'Whole source',
          status: 'Changed',
          before: b.rows,
          after: c.rows
        });
      }
      result.push({
        source,
        before: b?.version || '',
        after: c?.version || '',
        status: !b?.success || !c?.success ? 'Unavailable' : b.hash === c.hash ? b.version === c.version ? 'Unchanged' : 'Same contents / new version' : 'Contents changed',
        records
      });
    }
    return result;
  }
  const api = {
    num,
    sum,
    text,
    canonical,
    rowsOf,
    extract,
    inScope,
    model,
    summarize,
    planningSummary,
    planningMeasures,
    planningBreakdown,
    hasPlanningBreakdown,
    planningMeasureChange,
    planningImpact,
    simulatePlanningChange,
    planHealth,
    workloadOutlook,
    demandBridge,
    persistence,
    compareSources,
    geographyChanges,
    defaults,
    addWeeks,
    calendarBounds,
    calendarPeriod
  };
  root.CapacityAnalytics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
