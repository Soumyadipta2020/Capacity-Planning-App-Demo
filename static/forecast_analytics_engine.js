/* Forecast planning investigations. Never consumes actuals_input. */
(function(root){
  'use strict';
  const A=typeof module!=='undefined'&&module.exports?require('./analytics_engine.js'):root.CapacityAnalytics;
  const valid=n=>typeof n==='number'&&Number.isFinite(n);
  const scoped=(d,k,f)=> (d.facts[k]||[]).filter(r=>A.inScope(r,f));
  const usable=r=>!r.duplicate&&!!r.week;
  const cell=r=>[r.region,r.skill,r.week].join('|');
  const groups=(rows,key)=>{const m=new Map();rows.forEach(r=>{const k=key(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r);});return m;};
  const median=values=>{const x=[...values].sort((a,b)=>a-b),i=Math.floor(x.length/2);return x.length?x.length%2?x[i]:(x[i-1]+x[i])/2:null;};
  const date=v=>{const s=A.text(v).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?s:'';};
  const horizon=(d,f)=>d.weeks.filter(w=>(!f.start||w>=f.start)&&(!f.end||w<=f.end));
  function target(model,coverage=100,standardHours=37.5){
    const ratio=Math.max(0,Number(coverage)||0)/100;
    const rows=model.rows.map(r=>({...r,required:r.comparable?Math.max(0,r.demand*ratio-r.capacity):null,fte:r.comparable&&standardHours>0?Math.max(0,r.demand*ratio-r.capacity)/standardHours:null}));
    return {rows,required:A.sum(rows,'required'),affected:rows.filter(r=>r.required>0).length,excluded:rows.filter(r=>!r.comparable).length,peak:Math.max(0,...rows.map(r=>r.required||0))};
  }
  function suppliers(data,filter={}){
    const records=scoped(data,'ctr_capacity',filter).filter(r=>usable(r)&&A.text(r.n.status).toLowerCase()==='active'&&A.num(r.n.contractorhours)!==null&&A.num(r.n.contractorhours)>=0);
    const total=records.reduce((s,r)=>s+A.num(r.n.contractorhours),0);
    const rows=[...groups(records,r=>A.text(r.n.agency)||'Unspecified agency')].map(([name,rs])=>({name,hours:rs.reduce((s,r)=>s+A.num(r.n.contractorhours),0),records:rs})).sort((a,b)=>b.hours-a.hours);
    rows.forEach(r=>r.share=total?100*r.hours/total:null);
    const concentration=[...groups(records,r=>cell(r))].map(([key,rs])=>{const by=[...groups(rs,r=>A.text(r.n.agency)||'Unspecified agency')].map(([agency,x])=>({agency,hours:x.reduce((s,r)=>s+A.num(r.n.contractorhours),0)})).sort((a,b)=>b.hours-a.hours);const hours=by.reduce((s,r)=>s+r.hours,0);return {key,region:rs[0].region,skill:rs[0].skill,week:rs[0].week,agency:by[0]?.agency,hours,largestShare:hours?100*by[0].hours/hours:null,records:rs};});
    return {rows,concentration,total};
  }
  function commitment(data,filter={},assumptions={},options={}){
    const kind=options.kind||'contractors',reduction=Math.min(100,Math.max(0,Number(options.reduction)||0))/100;
    const base=A.model(data,filter,assumptions),facts={...data.facts};
    const keys={contractors:['ctr_capacity'],overtime:['overtime'],recruitment:['recruitment_grounded','recruitment_ungrounded'],support:['hec_on_kac_demand','hec_on_ev_demand']}[kind]||[];
    keys.forEach(k=>{facts[k]=(facts[k]||[]).map(r=>{if(kind==='contractors'&&options.agency&&options.agency!=='All'&&(A.text(r.n.agency)||'Unspecified agency')!==options.agency)return r;const field={contractors:'contractorhours',overtime:'overtimehours',recruitment:'headcount',support:'supporthours'}[kind];return {...r,n:{...r.n,[field]:(A.num(r.n[field])||0)*(1-reduction)}};});});
    const test=A.model({...data,facts},filter,assumptions,kind==='recruitment'?{recruitmentDelay:Math.max(0,Number(options.delay)||0)}:{});
    const indexed=new Map(test.rows.map(r=>[cell(r),r]));
    // Compare the baseline evidence population. A fully withdrawn source must not erase its shortage.
    const rows=base.rows.filter(r=>r.comparable).map(r=>{const t=indexed.get(cell(r));const capacity=t?.capacity??0;return {...r,before:r.capacity,after:capacity,change:capacity-r.capacity,beforeDeficit:Math.max(0,r.demand-r.capacity),afterDeficit:Math.max(0,r.demand-capacity),records:keys.flatMap(k=>scoped(data,k,filter).filter(x=>x.region===r.region&&x.skill===r.skill&&x.week===r.week))};});
    const enabled={contractors:assumptions.includeContractors??A.defaults.includeContractors,overtime:assumptions.includeOvertime??A.defaults.includeOvertime,recruitment:assumptions.includeRecruitment??A.defaults.includeRecruitment,support:assumptions.includeSupport??A.defaults.includeSupport}[kind];
    return {rows,enabled:!!enabled&&(!filter.patch||filter.patch==='All'),before:A.sum(rows,'beforeDeficit'),after:A.sum(rows,'afterDeficit'),affected:rows.filter(r=>Math.abs(r.change)>1e-8).length,excluded:base.rows.filter(r=>!r.comparable).length};
  }
  function peaks(data,filter={},model){
    const demand=scoped(data,'demand_input',filter).filter(r=>usable(r)&&r.jobs!==null),indexed=new Map((model?.rows||[]).map(r=>[cell(r),r]));
    const weekly=[...groups(demand,r=>cell(r))].map(([key,records])=>({key,region:records[0].region,skill:records[0].skill,week:records[0].week,jobs:A.sum(records,'jobs'),capacity:indexed.get(key)?.comparable?indexed.get(key).capacity:null,records}));
    const rows=[...groups(weekly,r=>[r.region,r.skill].join('|'))].map(([key,list])=>{
      list.sort((a,b)=>a.week.localeCompare(b.week));const average=A.sum(list,'jobs')/list.length,peak=[...list].sort((a,b)=>b.jobs-a.jobs)[0];let previous=null,run=0,longest=0,maxIncrease=null;
      list.forEach(r=>{r.change=previous&&A.addWeeks(previous.week,1)===r.week&&previous.jobs>0?100*(r.jobs-previous.jobs)/previous.jobs:null;run=r.change>0?run+1:0;longest=Math.max(longest,run);if(r.change!==null)maxIncrease=Math.max(maxIncrease??-Infinity,r.change);previous=r;});
      const caps=list.filter(r=>r.capacity!==null),capPeak=[...caps].sort((a,b)=>b.capacity-a.capacity)[0];
      return {key,region:peak.region,skill:peak.skill,peakWeek:peak.week,peakJobs:peak.jobs,average,peakRatio:average?peak.jobs/average:null,maxIncrease,longest,capacityPeak:capPeak?.week||'',lag:capPeak?Math.round((Date.parse(capPeak.week)-Date.parse(peak.week))/604800000):null,weeks:list.length,records:list.flatMap(r=>r.records)};
    });return {rows,weekly};
  }
  function stability(model,threshold=5){
    return model.rows.map(r=>{const demandTolerance=r.comparable&&r.demand>0?100*(r.capacity/r.demand-1):null;
      // Absence/productivity thresholds are local estimates before transfer reallocation.
      const roster=Math.max(0,r.roster-(r.downtime||0));
      return {...r,demandTolerance,capacityTolerance:r.comparable&&r.capacity>0?100*(r.capacity-r.demand)/r.capacity:null,absenceTolerance:r.comparable&&r.roster>0?100*(r.capacity-r.demand)/r.roster:null,productivityTolerance:r.comparable&&roster>0?100*(r.capacity-r.demand)/roster:null,status:!r.comparable?'Insufficient evidence':r.gap<0?'Already short':demandTolerance<=threshold?'Thin headroom':'Above threshold'};
    });
  }
  function jobTimes(data,filter={},assumptions={},deviation=25,benchmark=false){
    const divisor=assumptions.jobTimeUnit==='minutes'?60:1;
    // Peer pool respects skill/week/region but retains other patches for a selected-patch comparison.
    const times=scoped(data,'job_time_assumptions',{...filter,patch:'All'}).filter(r=>usable(r)&&r.value!==null&&r.value>=0);
    const peers=groups(times,r=>[r.skill,r.workCode,r.week].join('|'));
    const demand=groups(scoped(data,'demand_input',filter).filter(r=>usable(r)&&r.jobs!==null),r=>[r.patch,r.skill,r.workCode,r.week].join('|'));
    const rows=times.filter(r=>A.inScope(r,filter)).map(r=>{const pool=peers.get([r.skill,r.workCode,r.week].join('|')),count=new Set(pool.map(p=>p.patch)).size;const reference=count>=2?median(pool.map(p=>p.value)):null;const records=demand.get([r.patch,r.skill,r.workCode,r.week].join('|'))||[],jobs=A.sum(records,'jobs');const delta=reference!==null&&reference>0?100*(r.value-reference)/reference:null;return {...r,duration:r.value,reference,peers:count,jobs,deviation:delta,hours:jobs*r.value/divisor,impact:benchmark&&reference!==null?jobs*(reference-r.value)/divisor:null,review:delta!==null&&Math.abs(delta)>=deviation?'Review difference':reference===null?'No peer comparison':'Within threshold',records:[r]};});
    return {rows,impact:benchmark?A.sum(rows,'impact'):null,flagged:rows.filter(r=>r.review==='Review difference').length};
  }
  function workforce(data,filter={},assumptions={},confirmed=false){
    const weeks=horizon(data,filter),standard=assumptions.standardHours||A.defaults.standardHours;
    if(!confirmed)return {rows:[],events:[],excluded:0};
    const all=scoped(data,'resource_plan',filter),events=[],eligible=[];let excluded=0;
    all.forEach(r=>{const status=A.text(r.n.status).toLowerCase(),hours=A.num(r.n.hours),allocation=A.num(r.n.allocation),start=date(r.n.newstarter),left=date(r.n.leftdate);const invalidDate=(A.text(r.n.newstarter)&&!start)||(A.text(r.n.leftdate)&&!left);
      if(r.duplicate||!['active','leaver'].includes(status)||hours===null||hours<0||allocation===null||allocation<0||allocation>100||r.region==='Unmapped'||invalidDate||(start&&left&&left<start)||(status==='leaver'&&!left)){excluded++;return;}
      const fte=hours*allocation/100/standard;eligible.push({...r,start,left,fte});
      if(start)events.push({...r,date:start,event:'Planned starter',fte});if(left)events.push({...r,date:left,event:'Planned exit',fte:-fte});
      if(A.text(r.n.futuremovedate))events.push({...r,date:date(r.n.futuremovedate),event:'Move date only: destination not established',fte:null});
    });
    const model=A.model(data,filter,assumptions),mi=groups(model.rows,r=>[r.region,r.skill].join('|'));
    const populations=groups(eligible,r=>[r.region,r.skill].join('|'));for(const [key] of mi)if(!populations.has(key))populations.set(key,[]);
    const rows=[];for(const [key,records] of populations){const [region,skill]=key.split('|');weeks.forEach(week=>{const prior=A.addWeeks(week,-1),activeAt=d=>records.filter(r=>(!r.start||r.start<=d)&&(!r.left||r.left>d)).reduce((s,r)=>s+r.fte,0);const opening=activeAt(prior),starters=records.filter(r=>r.start>prior&&r.start<=week).reduce((s,r)=>s+r.fte,0),exits=records.filter(r=>r.left>prior&&r.left<=week).reduce((s,r)=>s+r.fte,0),m=(mi.get(key)||[]).find(r=>r.week===week);rows.push({region,skill,week,opening,starters,exits,closing:activeAt(week),transfers:(m?.transfers||0)/standard,recruitment:(m?.recruits||0)/standard,records});});}
    return {rows,events:events.filter(r=>r.date&&weeks.length&&r.date> A.addWeeks(weeks[0],-1)&&r.date<=weeks[weeks.length-1]),excluded};
  }
  function reconciliation(data,filter={},assumptions={},tolerance=10){
    const result=[],standard=assumptions.standardHours||A.defaults.standardHours;
    const add=(r,check,detail,expected,supplied)=>result.push({...r,check,detail,expected,supplied,records:[r]});
    scoped(data,'ctr_capacity',filter).filter(usable).forEach(r=>{const hours=A.num(r.n.contractorhours),fte=A.num(r.n.fte);if(hours!==null&&fte!==null&&fte>=0){const expected=fte*standard;if(Math.abs(hours-expected)>Math.max(1,expected*tolerance/100))add(r,'Contractor hours / stated FTE','Review whether FTE and Contractor_Hours use the same weekly basis.',expected,hours);}});
    scoped(data,'hec_on_kac_demand',filter).concat(scoped(data,'hec_on_ev_demand',filter)).filter(usable).forEach(r=>{const h=A.num(r.n.supporthours),limit=A.num(r.n.maxweeklyhours);if(h!==null&&limit!==null&&h>limit)add(r,'Support exceeds stated limit','Submitted donor hours exceed Max_Weekly_Hours.',limit,h);});
    scoped(data,'resource_plan',filter).forEach(r=>{if(A.text(r.n.futuremovedate))add(r,'Unresolved future movement','A move date is supplied, but a destination is not established in this row.',null,null);const start=date(r.n.newstarter),left=date(r.n.leftdate);if(start&&left&&left<start)add(r,'Workforce date order','Left Date precedes New Starter.',null,null);});
    for(const [,rows] of groups(scoped(data,'resource_plan',filter).filter(r=>A.text(r.n.payid)&&A.text(r.n.status).toLowerCase()==='active'),r=>A.text(r.n.payid))){
      const allocations=rows.map(r=>A.num(r.n.allocation));if(rows.length>1&&allocations.every(v=>v!==null&&v>=0)&&allocations.reduce((s,v)=>s+v,0)>100){add(rows[0],'Potential overlapping roster assignments','The same staffing identifier has active allocations totaling more than 100%. Confirm whether these are concurrent assignments or duplicate records.',null,null);result[result.length-1].records=rows;}
    }
    const intakes=scoped(data,'recruitment_grounded',filter).concat(scoped(data,'recruitment_ungrounded',filter)).filter(r=>usable(r)&&A.text(r.n.cohort));
    for(const [,rows] of groups(intakes,r=>[r.region,r.skill,r.week,A.text(r.n.cohort)].join('|')))if(new Set(rows.map(r=>r.source)).size>1){add(rows[0],'Potential overlapping recruitment commitments','The same cohort / region / skill / intake week appears in grounded and ungrounded inputs. Confirm whether these are distinct additions.',null,null);result[result.length-1].records=rows;}
    // Compare alternative downtime representations at the identical business key, never add them.
    const lossKey=r=>[r.patch,r.skill,r.week,r.category,A.text(r.n.level2)].join('|');
    const raw=scoped(data,'downtime_overlays_hours',filter).filter(r=>usable(r)&&r.value!==null&&r.value>=0);
    const roster=(data.facts.resource_plan||[]).filter(r=>!r.duplicate&&A.text(r.n.status).toLowerCase()==='active');
    for(const [source,perFte] of [['downtime_overlays_percentage',false],['downtime_overlays_hours_fte',true]]){
      const index=new Map(scoped(data,source,filter).filter(r=>usable(r)&&r.value!==null&&r.value>=0).map(r=>[lossKey(r),r]));
      raw.forEach(r=>{const other=index.get(lossKey(r));if(!other)return;const matches=roster.filter(p=>p.patch===r.patch&&p.skill===r.skill&&(!date(p.n.leftdate)||date(p.n.leftdate)>r.week)&&(!date(p.n.update)||date(p.n.update)<=r.week));if(!matches.length)return;const hours=matches.reduce((s,p)=>{const h=A.num(p.n.hours),allocation=A.num(p.n.allocation);return s+(h!==null&&h>=0&&allocation!==null&&allocation>=0&&allocation<=100?h*allocation/100:0);},0),expected=perFte?hours/standard*other.value:hours*other.value/100;if(Math.abs(r.value-expected)>Math.max(1,expected*tolerance/100)){add(r,'Alternative downtime differs',perFte?'Hours versus hours/FTE representation.':'Hours versus percentage representation.',expected,r.value);result[result.length-1].records.push(other);}});
    }
    return result;
  }
  function monthly(data,filter={},model,mode='calendar'){
    const map=groups((data.facts.week_to_month||[]).filter(r=>usable(r)),r=>r.week),demand=scoped(data,'demand_input',filter).filter(r=>usable(r)&&r.jobs!==null),weeks=horizon(data,filter),unmapped=[];
    const records=weeks.map(week=>{const mappings=map.get(week)||[];let period;if(mode==='fiscal'){const r=mappings.length===1?mappings[0]:null;period=r&&A.text(r.n.fiscalyear)&&A.text(r.n.fiscalmonth)?A.text(r.n.fiscalyear)+' / '+A.text(r.n.fiscalmonth):'Unmapped fiscal weeks';if(!r||period==='Unmapped fiscal weeks')unmapped.push(week);}else period=week.slice(0,7);const cells=(model.rows||[]).filter(r=>r.week===week),validCells=cells.filter(r=>r.comparable),rows=demand.filter(r=>r.week===week);return {week,period,jobs:A.sum(rows,'jobs'),demand:validCells.length?A.sum(validCells,'demand'):null,capacity:validCells.length?A.sum(validCells,'capacity'):null,deficit:validCells.length?A.sum(validCells,'deficit'):null,comparable:validCells.length,total:cells.length,records:rows};});
    const rows=[...groups(records,r=>r.period)].map(([period,rs])=>({period,weeks:rs.length,jobs:A.sum(rs,'jobs'),demand:rs.some(r=>r.comparable)?A.sum(rs,'demand'):null,capacity:rs.some(r=>r.comparable)?A.sum(rs,'capacity'):null,deficit:rs.some(r=>r.comparable)?A.sum(rs,'deficit'):null,shortageWeeks:rs.filter(r=>r.deficit>0).length,worstWeek:[...rs].filter(r=>r.deficit!==null).sort((a,b)=>b.deficit-a.deficit)[0]?.week||'',comparable:A.sum(rs,'comparable'),total:A.sum(rs,'total'),records:rs.flatMap(r=>r.records)}));return {rows,weekly:records,unmapped};
  }
  function priorities(data,filter={}){
    const demand=scoped(data,'demand_input',filter),by=new Map();
    const matches=(r,d)=> (!r.patch||r.patch===d.patch)&&(!r.skill||r.skill===d.skill)&&(!r.week||r.week===d.week)&&(!r.workCode||r.workCode===d.workCode);
    data.issues.filter(i=>i.source!=='actuals_input').forEach(issue=>{
      const row=issue.row?(data.facts[issue.source]||[]).find(r=>r.row===issue.row):null;
      if(row&&!A.inScope(row,filter))return;
      let affected=row?demand.filter(r=>matches(row,r)):issue.source==='week_to_month'?demand.filter(r=>r.week&&issue.detail.includes(r.week)):issue.source==='demand_input'||issue.source==='job_time_assumptions'?demand:[];
      if(issue.source==='geography_mapping'&&row)affected=demand.filter(r=>r.patch===A.text(row.n.territory));
      const key=[issue.source,issue.kind].join('|');if(!by.has(key))by.set(key,{source:issue.source,kind:issue.kind,issues:[],records:[],affected:new Map()});const group=by.get(key);group.issues.push(issue);if(row)group.records.push(row);affected.forEach(r=>group.affected.set(r.row,r));
    });
    return [...by.values()].map(g=>({...g,issueCount:g.issues.length,jobs:A.sum([...g.affected.values()],'jobs'),cells:new Set([...g.affected.values()].map(cell)).size,affected:undefined,action:g.kind.includes('job time')?'Complete matching patch / skill / work-code / week durations':g.kind.includes('mapping')||g.kind.includes('Region')||g.kind.includes('geography')?'Confirm authoritative geography':g.kind.includes('Duplicate')?'Resolve duplicate business keys':g.source==='week_to_month'?'Complete fiscal week mappings':'Review selected input with submitting team'})).sort((a,b)=>b.jobs-a.jobs||b.cells-a.cells||b.issueCount-a.issueCount);
  }
  const api={target,suppliers,commitment,peaks,stability,jobTimes,workforce,reconciliation,monthly,priorities};root.CapacityForecast=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
