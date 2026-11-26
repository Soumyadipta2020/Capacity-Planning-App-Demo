const test=require('node:test'), assert=require('node:assert/strict');
const A=require('../static/analytics_engine.js');
const rows=[
  {region:'A',skill:'HEC',week:'2026-11-02',demand:100,capacity:50,comparable:true,overtime:10,contractors:5},
  {region:'B',skill:'HEC',week:'2026-11-02',demand:100,capacity:200,comparable:true,overtime:0,contractors:5},
  {region:'A',skill:'HEC',week:'2026-11-09',demand:50,capacity:40,comparable:true,overtime:0,contractors:0},
  {region:'C',skill:'EV',week:'2026-11-09',demand:500,capacity:0,comparable:false}
];
test('local cover and gross gaps remain visible despite an overall surplus',()=>{
  const h=A.planHealth({rows},[{jobs:300,matched:true},{jobs:100,matched:false}]);
  assert.equal(h.demand,250);assert.equal(h.capacity,290);assert.equal(h.shortage,60);
  assert.equal(h.coveredPct,76);assert.equal(h.shortGroups,2);assert.equal(h.excluded,1);
  assert.equal(h.matchedPct,75);assert.equal(h.unmatchedJobs,100);
  assert.equal(h.extraCoverPct,20/290*100);assert.equal(h.peakWeek,'2026-11-02');assert.equal(h.peakShortage,50);
  assert.equal(h.worst.region,'A');assert.equal(h.worst.week,'2026-11-02');
});
test('unknown and zero-volume scopes have no invented coverage or peak',()=>{
  for(const scope of [[],[rows[3]]]){
    const h=A.planHealth({rows:scope});
    assert.equal(h.coveredPct,null);assert.equal(h.matchedPct,null);assert.equal(h.extraCoverPct,null);
    assert.equal(h.peakWeek,null);assert.equal(h.worst,null);assert.equal(h.comparable,0);
  }
  const h=A.planHealth({rows:[{demand:0,capacity:50,comparable:true}]},[{jobs:0,matched:true}]);
  assert.equal(h.coveredPct,null);assert.equal(h.matchedPct,null);assert.equal(h.peakWeek,null);
});
test('summary follows a changed scope without mutating source rows',()=>{
  const before=JSON.stringify(rows),h=A.planHealth({rows:rows.filter(r=>r.region==='B')},[{jobs:100,matched:true}]);
  assert.equal(h.coveredPct,100);assert.equal(h.shortage,0);assert.equal(h.shortGroups,0);assert.equal(h.peakWeek,null);
  assert.equal(JSON.stringify(rows),before);
});

const fs=require('node:fs'),vm=require('node:vm');
const babel=require('../.cache/analytics-qa/node_modules/@babel/core');
const preset=require('../.cache/analytics-qa/node_modules/@babel/preset-react');
const React=require('../.cache/analytics-qa/node_modules/react');
const {renderToStaticMarkup}=require('../.cache/analytics-qa/node_modules/react-dom/server');
const context={React,window:{CapacityAnalytics:A},console};
vm.createContext(context);vm.runInContext(babel.transformSync(fs.readFileSync('static/analytics_ui.js','utf8'),{presets:[[preset,{runtime:'classic'}]]}).code,context);
test('beginner metrics render unknown states and link to the right investigation',()=>{
  const events=[];
  const tree=context.AnalyticsPlanSummary({model:{rows},demand:[],scenario:'Test plan',onExplore:(...args)=>events.push(args),onFocus:r=>events.push(r)});
  const html=renderToStaticMarkup(tree);
  assert.ok(html.includes('Plan at a glance'));assert.ok(html.includes('Unavailable'));assert.ok(html.includes('More data needed')===false);
  assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const c of React.Children.toArray(node.props?.children)){const v=find(c,predicate);if(v)return v;}return null;}
  find(tree,n=>n.props?.['aria-label']==='Explore jobs with time estimates').props.onClick();
  assert.deepEqual(events.pop(),['drivers','quality']);
  find(tree,n=>n.type==='button'&&String(n.props.children).startsWith('Investigate largest gap:')).props.onClick();
  assert.deepEqual(events.pop(),['readiness','deficits']);assert.equal(events.pop().region,'A');
  const empty=renderToStaticMarkup(context.AnalyticsPlanSummary({model:{rows:[]},demand:[],scenario:'Empty'}));
  assert.ok(empty.includes('More data needed'));assert.ok(!empty.includes('Assessed groups covered'));
});
