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
  const reg = v => {
    const s = text(v).replace(/^Region\s*/i, '');
    return /^[A-E]$/.test(s) ? s : '';
  };
  const addWeeks = (date, n) => {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n * 7);
    return d.toISOString().slice(0, 10);
  };
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
      map = new Map();
    const issue = (source, index, kind, detail) => issues.push({
      source,
      row: index >= 0 ? index + 1 : null,
      kind,
      detail
    });
    rowsOf(bundle, 'geography_mapping').forEach((r, i) => {
      const n = normalize(r),
        p = text(n.territory),
        region = reg(n.region);
      if (!p || !region) issue('geography_mapping', i, 'Invalid geography', 'Territory or region missing');else if (map.has(p) && map.get(p) !== region) {
        map.set(p, 'Unmapped');
        issue('geography_mapping', i, 'Conflicting mapping', p);
      } else map.set(p, region);
    });
    for (const [source, input] of Object.entries(bundle?.sources || {})) {
      if (!input.success) issue(source, -1, 'Unavailable input', input.error || 'Missing selected input');else if (!input.rows?.length) issue(source, -1, 'Empty input', 'Selected version has no source records');
      const duplicate = new Map();
      facts[source] = rowsOf(bundle, source).map((raw, index) => {
        const n = normalize(raw),
          patch = text(n.patch || (source === 'resource_plan' ? n.wmis : ''));
        const sourceRegion = reg(n.regioncode || n.region),
          mapped = map.get(patch);
        const r = {
          source,
          row: index + 1,
          raw,
          patch,
          skill: text(n.skill).toUpperCase(),
          week: week(n.weekcomm),
          region: patch ? mapped || 'Unmapped' : sourceRegion || 'Unmapped',
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
      if (text(r.n.status).toLowerCase() === 'active' && !map.has(r.patch)) issue(r.source, r.row - 1, 'Unmapped roster', r.patch || 'No WMIS location');
    });
    const skills = new Set((facts.demand_input || []).map(r => r.skill));
    for (const skill of skills) if (!(facts.baseline_productivity || []).some(r => r.skill === skill)) issue('baseline_productivity', -1, 'Missing skill rate', skill + ' has no baseline productivity record; no rate is imputed');
    const calendar = new Set((facts.week_to_month || []).map(r => r.week));
    for (const w of new Set((facts.demand_input || []).map(r => r.week).filter(Boolean))) if (!calendar.has(w)) issue('week_to_month', -1, 'Missing fiscal week', w + ' has no fiscal calendar mapping');
    return {
      facts,
      issues,
      map,
      weeks: [...new Set((facts.demand_input || []).map(r => r.week).filter(Boolean))].sort()
    };
  }
  function inScope(r, filter = {}) {
    return (!filter.region || filter.region === 'All' || r.region === filter.region) && (!filter.patch || filter.patch === 'All' || r.patch === filter.patch) && (!filter.skill || filter.skill === 'All' || r.skill === filter.skill) && (!r.week || (!filter.start || r.week >= filter.start) && (!filter.end || r.week <= filter.end));
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
  function model(data, filter = {}, assumptions = {}, shock = {}) {
    const a = {
        ...defaults,
        ...assumptions
      },
      facts = data.facts,
      cells = new Map(),
      exclusions = new Set(),
      routes = [];
    // Resolve both sides before narrowing a donor/recipient view.
    if ((a.includeSupport || a.includeTransfers) && (!filter.patch || filter.patch === 'All') && (filter.skill && filter.skill !== 'All' || filter.region && filter.region !== 'All')) {
      const all = model(data, {
        ...filter,
        region: 'All',
        skill: 'All'
      }, a, shock);
      const rows = all.rows.filter(r => inScope(r, filter));
      return {
        ...all,
        rows,
        ...summarize(rows)
      };
    }
    const weeks = data.weeks.filter(w => (!filter.start || w >= filter.start) && (!filter.end || w <= filter.end));
    const cellKey = r => [r.region, r.skill, r.week].join('|');
    const ensure = r => {
      const k = cellKey(r);
      if (!cells.has(k)) cells.set(k, {
        region: r.region,
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
    (facts.demand_input || []).filter(r => inScope(r, filter) && r.week).forEach(r => {
      const c = ensure(r);
      c.jobs += r.jobs || 0;
      if (r.matched) {
        c.matchedJobs += r.jobs;
        c.demand += r.jobs * r.jobTime.value / (a.jobTimeUnit === 'minutes' ? 60 : 1);
      } else c.unmatched++;
    });
    // Roster is a snapshot, repeated across weeks, with explicit active status and effective dates.
    (facts.resource_plan || []).filter(r => inScope(r, filter) && !r.duplicate && text(r.n.status).toLowerCase() === 'active').forEach(r => {
      if (!data.map.has(r.patch) || data.map.get(r.patch) === 'Unmapped') {
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
        ensure({
          ...r,
          week: w
        }).roster += hours * allocation / 100;
      });
    });
    const dowSource = {
      hours: 'downtime_overlays_hours',
      percent: 'downtime_overlays_percentage',
      perFte: 'downtime_overlays_hours_fte'
    }[a.downtime];
    (facts[dowSource] || []).filter(r => inScope(r, filter) && r.week && !r.duplicate && r.value !== null && r.value >= 0).forEach(r => {
      const c = ensure(r);
      if (a.downtime === 'hours') c.downtime += r.value;
      // Percentage/FTE deductions must use the matching patch roster, not each region's total.
      else {
        const roster = (facts.resource_plan || []).filter(p => p.patch === r.patch && p.skill === r.skill && !p.duplicate && text(p.n.status).toLowerCase() === 'active' && (!week(p.n.leftdate) || week(p.n.leftdate) > r.week));
        const h = roster.reduce((v, p) => v + Math.max(0, num(p.n.hours) || 0) * Math.min(100, Math.max(0, num(p.n.allocation) || 0)) / 100, 0);
        c.downtime += a.downtime === 'percent' ? h * r.value / 100 : h / a.standardHours * r.value;
      }
    });
    const patchScope = filter.patch && filter.patch !== 'All';
    if (patchScope) exclusions.add('Region-level recruitment, overtime, contractors, transfers and support are excluded at patch scope; no allocation is assumed.');
    if (!patchScope) {
      (facts.overtime || []).filter(r => inScope(r, filter) && r.week && !r.duplicate).forEach(r => {
        if (a.includeOvertime && text(r.n.authorized).toLowerCase() === 'yes') ensure(r).overtime += Math.max(0, num(r.n.overtimehours) || 0) * (1 + (shock.overtimePct || 0) / 100);
      });
      (facts.ctr_capacity || []).filter(r => inScope(r, filter) && r.week && !r.duplicate).forEach(r => {
        if (a.includeContractors && text(r.n.status).toLowerCase() === 'active') ensure(r).contractors += Math.max(0, num(r.n.contractorhours) || 0) * (1 + (shock.contractorPct || 0) / 100);
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
            component: 'support'
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
          component: 'transfers'
        });
      });
    }
    const rows = [...cells.values()].sort((x, y) => x.week.localeCompare(y.week) || x.region.localeCompare(y.region) || x.skill.localeCompare(y.skill)).map(c => {
      c.demand *= 1 + (shock.demandPct || 0) / 100;
      const productive = Math.max(0, c.roster - c.downtime - c.roster * (shock.absencePp || 0) / 100) * (1 + (shock.productivityPct || 0) / 100);
      c.extra = (!shock.targetRegion || shock.targetRegion === 'All' || c.region === shock.targetRegion) && (!shock.targetSkill || shock.targetSkill === 'All' || c.skill === shock.targetSkill) ? shock.extraHours || 0 : 0;
      c.capacity = Math.max(0, productive + c.recruits + c.overtime + c.contractors + c.transfers + c.support + c.extra);
      return c;
    });
    const indexed = new Map(rows.map(r => [cellKey(r), r]));
    routes.forEach(route => {
      if (route.from === route.to) return;
      const donor = indexed.get(route.from),
        receiver = indexed.get(route.to);
      const hours = Math.min(route.hours, donor.capacity);
      if (hours < route.hours) exclusions.add('Planned transfers/support were capped at available modeled donor capacity; full source commitments were not assumed feasible.');
      donor.capacity -= hours;
      receiver.capacity += hours * route.ratio;
      donor[route.component] -= hours;
      receiver[route.component] += hours * route.ratio;
    });
    rows.forEach(c => {
      c.partial = c.unmatched > 0;
      c.comparable = c.matchedJobs > 0 && (!c.partial || a.allowPartial) && c.roster + c.recruits + c.overtime + c.contractors + Math.max(0, c.support) + Math.max(0, c.transfers) > 0;
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
              const n = normalize(r),
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
    demandBridge,
    persistence,
    compareSources,
    defaults,
    addWeeks
  };
  root.CapacityAnalytics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
