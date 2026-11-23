const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../static/analytics_engine.js');
const source=rows=>({success:true,rows});
function fixture(){return {sources:{
  geography_mapping:source([{Patch:'North','Region Code':'A',Region:'Northern region'},{Patch:'South','Region Code':'B',Region:'Southern region'}]),
  demand_input:source([
    {Patch:'North',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-23',Values:100},
    {Patch:'South',Skill:'EV','Work Code':'W1',Weekcomm:'2026-11-30',Values:50},
    {Patch:'Unknown',Skill:'EV','Work Code':'W1',Weekcomm:'2026-12-14',Values:50},
    {Patch:'North',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-16',Values:999}
  ]),
  job_time_assumptions:source([{Patch:'North',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-23',Values:1}]),
  resource_plan:source([{Status:'Active','Pay Id':'1',Wmis:'North',Skill:'HEC',Hours:50,Allocation:100}]),
  overtime:source([{Region:'A',Skill:'HEC',Weekcomm:'2026-11-23',Authorized:'Yes',Overtime_Hours:30}]),
  ctr_capacity:source([{Region:'A',Skill:'HEC',Weekcomm:'2026-11-23',Status:'Active',Contractor_Hours:10}]),
  week_to_month:source([{Weekcomm:'2026-11-23'}])
}};}
function report(b=fixture(),filter={},date='2026-11-25'){const d=A.extract(b);return A.workloadOutlook(d,filter,date,A.model(d,filter));}
test('geography supports both CSV layouts without changing original rows or inventing mappings',()=>{
  const b=fixture(),before=JSON.stringify(b),d=A.extract(b);
  assert.equal(d.map.get('North'),'A');assert.equal(d.facts.demand_input[0].region,'A');
  assert.equal(d.facts.demand_input[2].region,'Unmapped');assert.equal(JSON.stringify(b),before);
  b.sources.geography_mapping=source([{territory:'North',Region:'A'},{Patch:'North','Region Code':'B',Region:'South'}]);
  const conflict=A.extract(b);assert.equal(conflict.map.get('North'),'Unmapped');
  assert.equal(A.model(conflict).comparable,0);
});
test('next four weeks are calendar weeks, include the current full week and retain missing weeks',()=>{
  const r=report();assert.equal(r.anchor,'2026-11-23');assert.equal(r.totalJobs,200);
  assert.equal(r.next4Jobs,200);assert.equal(r.next4Complete,false);
  assert.deepEqual(r.next4.map(w=>w.jobs),[100,50,null,50]);assert.equal(r.peak.name,'2026-11-23');
  assert.ok(Math.abs(r.peakUplift-50)<1e-9);assert.equal(r.weekly.length,3);
  assert.equal(r.skills.find(x=>x.name==='EV').jobs,100);assert.equal(r.top5Share,100);
  assert.equal(r.unmappedJobs,50);assert.equal(r.unmappedPct,25);
});
test('regional scope excludes unknown regions; date and skill scope affect every distribution',()=>{
  const r=report(fixture(),{region:'A',skill:'HEC',start:'2026-11-30'});
  assert.equal(r.totalJobs,0);assert.equal(r.peak,null);assert.equal(r.top5Share,null);
  const later=report(fixture(),{},'2026-12-01');assert.equal(later.anchor,'2026-11-30');assert.equal(later.totalJobs,100);
});
test('an explicit zero is not missing and invalid or duplicate demand is excluded',()=>{
  const b=fixture();b.sources.demand_input.rows.push({Patch:'North',Skill:'HEC','Work Code':'W2',Weekcomm:'2026-12-07',Values:0});
  assert.equal(report(b).next4Complete,true);assert.equal(report(b).next4[2].jobs,0);
  b.sources.demand_input.rows.push({...b.sources.demand_input.rows[0]});
  b.sources.demand_input.rows.push({Patch:'North',Skill:'HEC',Weekcomm:'bad',Values:20});
  const r=report(b);assert.equal(r.totalJobs,100);assert.equal(r.excludedDemandRows,3);
  assert.throws(()=>report(b,{},'2026-02-31'),/planning date/);
});
test('cover withdrawal preserves baseline assessed groups even after the final capacity source disappears',()=>{
  const b=fixture();b.sources.resource_plan.rows=[];
  const r=report(b);assert.equal(r.assessedGroups,1);assert.equal(r.firstShortage,'2026-11-23');
  assert.equal(r.weeksToFirst,0);assert.equal(r.additionalShortage,40);assert.equal(r.shortageWithoutExtra,100);
});
test('generic cover Values do not silently become known hours or a zero-risk result',()=>{
  const b=fixture();b.sources.overtime=source([{Patch:'North',Skill:'HEC',Weekcomm:'2026-11-23',Values:12}]);
  const r=report(b);assert.equal(r.extraCoverKnown,false);assert.equal(r.additionalShortage,null);
  assert.equal(r.readiness.find(x=>x.source==='overtime').ready,false);
  assert.match(r.readiness.find(x=>x.source==='overtime').detail,/Generic Values/);
});
test('persistent runs break across unassessed and missing weeks',()=>{
  const d=A.extract(fixture());const rows=['2026-11-23','2026-11-30','2026-12-14'].map(week=>({region:'A',skill:'HEC',week,comparable:true,gap:-10,deficit:10,demand:100,capacity:90}));
  const r=A.workloadOutlook(d,{},'2026-11-25',{rows});assert.equal(r.persistent[0].longest,2);
  rows[1]={...rows[1],comparable:false,gap:null,deficit:null};
  assert.equal(A.workloadOutlook(d,{},'2026-11-25',{rows}).persistent.length,0);
});

const fs=require('node:fs'),vm=require('node:vm');
const babel=require('../.cache/analytics-qa/node_modules/@babel/core'),preset=require('../.cache/analytics-qa/node_modules/@babel/preset-react');
const React=require('../.cache/analytics-qa/node_modules/react'),{renderToStaticMarkup}=require('../.cache/analytics-qa/node_modules/react-dom/server');
const context={React,window:{CapacityAnalytics:A},console};vm.createContext(context);
vm.runInContext(babel.transformSync(fs.readFileSync('static/analytics_ui.js','utf8'),{presets:[[preset,{runtime:'classic'}]]}).code,context);
function find(node,p){if(!node||typeof node!=='object')return null;if(p(node))return node;for(const c of React.Children.toArray(node.props?.children)){const f=find(c,p);if(f)return f;}return null;}
test('outlook renders readable partial, empty and compatibility states and its controls route correctly',()=>{
  let changed,opened;const routes=[];
  const tree=context.AnalyticsWorkloadOutlook({report:report(),planningDate:'2026-11-25',onDateChange:v=>changed=v,onExplore:(...v)=>routes.push(v),onSource:v=>opened=v});
  const html=renderToStaticMarkup(tree);for(const s of ['Upcoming workload','Not submitted','partial total','Busiest demand week','When should we act?'])assert.ok(html.includes(s));
  assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
  find(tree,n=>n.props?.['aria-label']==='Workload planning date').props.onChange({target:{value:'2026-12-01'}});assert.equal(changed,'2026-12-01');
  find(tree,n=>n.type==='button'&&n.props.children==='Review shortages').props.onClick();assert.deepEqual(routes.pop(),['readiness','deficits']);
  find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).join('')==='Inspect location mapping').props.onClick();assert.equal(opened,'geography_mapping');
  const empty=context.AnalyticsWorkloadOutlook({report:report({sources:{}}),planningDate:'2026-11-25'});
  const emptyHtml=renderToStaticMarkup(empty);assert.ok(emptyHtml.includes('Unavailable'));assert.ok(emptyHtml.includes('No upcoming groups can be assessed'));
});
