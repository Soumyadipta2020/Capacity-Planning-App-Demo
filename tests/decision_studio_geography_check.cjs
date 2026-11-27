const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../static/analytics_engine.js');
const week = '2026-11-23';
const next = '2026-11-30';
const demand = (patch, value, date = week) => ({Patch:patch, Skill:'S', WorkCode:'X', Weekcomm:date, Values:value});
const staff = (id, wmis, hours, start = week) => ({
  'Pay Id':id, Wmis:wmis, Skill:'S', Status:'Active', Hours:hours, Allocation:100, 'Up Date':start
});
test('final plans preserve hours and FTE across periods without supplying jobs or headcount', () => {
  const assumptions = {...A.defaults,jobTimeUnit:'minutes'};
  const scope = {area:'A1',skill:'HEC',start:'2026-11-01',end:'2026-11-30'};
  const plan = extraDemand => A.extract({mode:'final_data',scenarioId:'November',finalData:{
    patches:['P1','P2'],regions:['A'],areaCodes:['A1','A2'],periods:['W','M'],weeks:[week,next],
    combos:[
      ['HEC','HEC','FTE','','FTE'],
      ['HEC','HEC','Gross Hrs','','Available Hours'],
      ['HEC','HEC','Holiday','','Available Hours'],
      ['HEC','HEC','Overtime','','Available Hours'],
      ['HEC','General','SP','','Capacity Hours'],
      ['HEC','HEC','W1','','Demand Hours']
    ],
    rows:[week,next].flatMap((_,index)=>[2,75,10,4,3,42+extraDemand]
      .map((value,combo)=>[0,combo,0,index,value,0,0])).concat([
      [1,5,0,0,200,0,1], [0,5,1,0,84+extraDemand*2,0,0]
    ])
  }});
  const data = plan(0);
  const model = A.model(data,scope,assumptions,{},true);
  const before = A.planningSummary(model.rows,'area',assumptions);
  const after = A.planningSummary(A.model(plan(4),scope,assumptions,{},true).rows,'area',assumptions);
  assert.deepEqual(A.planningMeasures(before),{jobs:null,demand:84,roster:150,capacity:144,gap:60,shortage:0,fte:2,downtime:20});
  assert.equal(before.headcount,null);
  assert.ok(!data.facts.resource_plan.some(row=>row.n.payid));
  assert.deepEqual(data.facts.job_time_assumptions,[]);
  assert.equal(A.planningMeasureChange(before,after,'demand',[],assumptions),8);
  assert.equal(A.planningMeasureChange(before,after,'gap',[],assumptions),-8);
  assert.equal(A.planningBreakdown(before,'demand','skill',assumptions).get(JSON.stringify(['HEC','W1'])).value,84);
  const readiness = A.workloadOutlook(data,scope,week,model,assumptions).readiness;
  assert.ok(readiness.some(check=>check.title==='Required hours' && check.ready));
  assert.ok(readiness.some(check=>check.title==='FTE and gross roster hours' && check.ready));
});
test('calendar planning periods preserve leap days, quarter ends and week-commencing groups', () => {
  assert.deepEqual(A.calendarBounds('2028-02'),{start:'2028-02-01',end:'2028-02-29'});
  assert.deepEqual(A.calendarBounds('2027'),{start:'2027-01-01',end:'2027-12-31'});
  assert.deepEqual(A.calendarBounds('2027-Q4'),{start:'2027-10-01',end:'2027-12-31'});
  assert.equal(A.calendarBounds('2027-13'),null);
  assert.equal(A.calendarPeriod('2026-12-28','quarter'),'2026-Q4');
  assert.equal(A.calendarPeriod('2027-01-04'),'2027-01');
});
function fixture() {
  return {sources:Object.fromEntries(Object.entries({
    geography_mapping:[{'Region Code':'A','Area Code':'A1',Patch:'P1'},{'Region Code':'A','Area Code':'A2',Patch:'P2'}],
    demand_input:[demand('P1',40),demand('P2',20),demand('P1',0,next),demand('P2',20,next)],
    job_time_assumptions:[demand('P1',1),demand('P2',1),demand('P1',1,next),demand('P2',1,next)],
    resource_plan:[staff(1,'P1',30),staff(2,'P2',40),staff(3,'P1',10,next)],
    downtime_overlays_hours:[],
    downtime_overlays_percentage:[{patch:'P1',skill:'S',metric:'Training',weekcomm:week,values:20}],
    overtime:[{Region:'A',Skill:'S',Weekcomm:week,Authorized:'Yes',OvertimeHours:8}]
  }).map(([key,rows])=>[key,{success:true,rows}]))};
}
test('metric views count valid forecast jobs without requiring durations and distinguish zero from missing', () => {
  const plan = fixture();
  const report = scoped => A.planningSummary(A.model(A.extract(plan),scoped,A.defaults,{},true).rows,'patch');
  const scope = {patch:'P1',start:week,end:week};
  const before = report(scope);
  plan.sources.job_time_assumptions.rows.shift();
  const after = report(scope);
  assert.deepEqual(A.planningMeasures(after),{jobs:40,demand:null,roster:30,capacity:30,gap:null,shortage:null,fte:0.8,downtime:0});
  assert.equal(A.planningMeasureChange(before,after,'jobs'),0);
  assert.equal(A.planningMeasureChange(before,after,'fte'),0);
  assert.equal(A.planningMeasureChange(before,after,'demand'),null);
  assert.equal(A.planningMeasures(report({patch:'P1',start:next,end:next})).jobs,0);
  plan.sources.demand_input.rows.push({...plan.sources.demand_input.rows[0]});
  assert.equal(A.planningMeasures(report(scope)).jobs,null);
});
test('period FTE compares weekly averages and suppresses deltas for changed time or geography coverage', () => {
  const plan = fixture();
  const report = scope => A.planningSummary(A.model(A.extract(plan),scope,A.defaults,{},true).rows,'area');
  const before = report({area:'A1'});
  plan.sources.resource_plan.rows[0].Hours = 22.5;
  const after = report({area:'A1'});
  assert.ok(Math.abs(A.planningMeasureChange(before,after,'fte')+0.2)<1e-8);
  assert.equal(A.planningMeasureChange(before,after,'roster'),-15);
  assert.equal(A.planningMeasureChange(before,report({area:'A1',start:next}),'fte'),null);
  assert.equal(A.planningMeasureChange(before,after,'roster',[{patch:'P1'}]),null);
});
test('required-hours drill distinguishes an unknown duration from measured zero', () => {
  const plan = fixture();
  plan.sources.demand_input.rows.push({...demand('P1',10),WorkCode:'Unknown'});
  const rows = A.model(A.extract(plan),{patch:'P1'},A.defaults,{},true).rows;
  const report = A.planningSummary(rows,'patch');
  const parts = A.planningBreakdown(report,'demand','breakdown');
  const unmatched = parts.get(JSON.stringify(['S','Unknown']));
  assert.equal(report.demand,40);
  assert.equal(report.partialByMeasure.demand,true);
  assert.equal(report.partialByMeasure.jobs,false);
  assert.equal(parts.get(JSON.stringify(['S'])).value,null);
  assert.equal(unmatched.value,null);
  assert.equal(unmatched.evidence[0].row.jobs,10);
  assert.equal(parts.get(JSON.stringify(['S','X'])).value,40);
  const zero = A.planningSummary(rows.filter(row=>row.week===next),'patch');
  assert.equal(A.planningBreakdown(zero,'demand','breakdown').get(JSON.stringify(['S','X'])).value,0);
});
test('location FTE contributions use the parent period denominator', () => {
  const cells = [
    {week,area:'A1',roster:37.5},
    {week:next,area:'A2',roster:37.5}
  ].map(cell=>({...cell,region:'A',skill:'S',rosterKnown:true,downtimeKnown:true}));
  const parent = A.planningSummary(cells,'region');
  const children = cells.map(cell=>A.planningSummary([cell],'area',A.defaults,parent.fteWeeks));
  assert.equal(parent.fte,1);
  assert.deepEqual(children.map(child=>child.fte),[0.5,0.5]);
  assert.equal(children[0].rosterWeeks,1);
});
test('gross shortfall combines separate patch and regional shortages without counting overlapping deficits twice', () => {
  const cells = [
    {week,patch:'P1',capacity:20,demand:30}, {week,patch:'',capacity:10,demand:0},
    {week:next,patch:'P1',capacity:20,demand:25}, {week:next,patch:'',capacity:-5,demand:0}
  ].map(row=>({...row,area:'A1',region:'A',skill:'S',rosterKnown:true,capacityKnown:true,demandKnown:true,
    downtimeKnown:true,comparable:true,deficit:Math.max(0,row.demand-row.capacity),evidence:[]}));
  const report = A.planningSummary(cells);
  assert.equal(report.gap,-10);
  assert.equal(report.localShortage,15);
  assert.equal(A.planningMeasures(report).shortage,20);
  assert.equal(A.planningMeasureChange(report,report,'shortage'),0);
  assert.equal(A.planningMeasures(A.planningSummary([])).shortage,null);
});
test('area scope, eligible percent base, regional cover and weekly FTE reconcile', () => {
  const data = A.extract(fixture());
  const assumptions = {...A.defaults,downtime:'percent'};
  const model = scope => A.model(data,scope,assumptions,{},true);
  const full = model({});
  const left = model({area:'A1'});
  const right = model({area:'A2'});
  const report = (result, level) => A.planningSummary(result.rows,level,assumptions);
  assert.deepEqual(left.rows.map(r=>r.roster), [30,40]);
  assert.equal(left.rows[0].appliedDowntime,6);
  assert.equal(report(left,'area').fte,35/37.5);
  assert.equal(report(left,'area').headcount,2);
  assert.equal(report(left,'area').gap,24);
  assert.equal(report(right,'area').gap,40);
  assert.equal(report(full,'region').gap,72);
  assert.equal(report(full,'region').unallocated,8);
  assert.equal(report(full,'region').localShortage,16);
  assert.equal(left.rows[1].comparable,true);
});
test('planning breakdowns reconcile capped downtime, signed capacity and shared FTE denominator', () => {
  const plan = fixture();
  plan.sources.resource_plan.rows[0]['Labour Type'] = 'Engineer';
  plan.sources.resource_plan.rows[2]['Labour Type'] = 'Trainee';
  plan.sources.downtime_overlays_hours.rows = [
    {patch:'P1',skill:'S',metric:'Training',level2:'Safety',weekcomm:week,values:40},
    {patch:'P1',skill:'S',metric:'Leave',level2:'Holiday',weekcomm:week,values:20}
  ];
  const cells = A.model(A.extract(plan),{patch:'P1'},A.defaults,{},true).rows;
  const report = A.planningSummary(cells,'patch');
  const parts = measure=>A.planningBreakdown(report,measure,'breakdown');
  for (const measure of ['jobs','demand','roster','fte','downtime','capacity']) {
    const subtotal = [...parts(measure).values()].filter(group=>group.path.length===1)
      .reduce((sum,group)=>sum+group.value,0);
    assert.ok(Math.abs(subtotal-A.planningMeasures(report)[measure])<1e-8,measure);
  }
  assert.equal(parts('downtime').get('["Training","Safety"]').value,20);
  assert.equal(parts('downtime').get('["Leave","Holiday"]').value,10);
  assert.equal(parts('capacity').get('["Downtime deducted","Training"]').value,-20);
  assert.equal(parts('fte').get('["S","Trainee"]').value,10/75);
  assert.equal(parts('downtime').get('["Training","Safety"]').evidence[0].contribution,20);
});
test('missing evidence and unmatched demand stay unavailable while mapped zero stays valid', () => {
  const bundle = fixture();
  bundle.sources.downtime_overlays_hours.success = false;
  const run = () => A.model(A.extract(bundle),{area:'A1'},A.defaults,{},true);
  assert.equal(run().rows[0].gap,null);
  bundle.sources.downtime_overlays_hours.success = true;
  bundle.sources.job_time_assumptions.rows.shift();
  bundle.sources.resource_plan.rows[0].Hours = 0;
  assert.equal(run().rows[0].gap,null);
  assert.equal(run().rows[1].gap,10);
  bundle.sources.geography_mapping.rows.push({'Region Code':'A','Area Code':'A2',Patch:'P1'});
  assert.equal(A.extract(bundle).geography.get('P1').region,'Unmapped');
});

test('skill and week surpluses do not hide assessed local shortages', () => {
  const bundle = fixture();
  bundle.sources.demand_input.rows = [demand('P1',40),demand('P2',30)];
  bundle.sources.job_time_assumptions.rows = [demand('P1',1),demand('P2',1)];
  bundle.sources.overtime.rows = [];
  const data = A.extract(bundle);
  const cells = A.model(data,{},A.defaults,{},true).rows;
  const report = A.planningSummary(cells,'region',A.defaults);
  assert.equal(report.gap,0);
  assert.equal(report.localShortage,10);
  const revised = fixture();
  revised.sources.geography_mapping.rows[0]['Area Code'] = 'A3';
  assert.deepEqual(A.geographyChanges(data,A.extract(revised)),[{patch:'P1',before:'A / A1',after:'A / A3'}]);
});
test('patch deductions cannot be assigned to roster recorded only at area level', () => {
  const bundle = fixture();
  bundle.sources.resource_plan.rows[0].Wmis = 'A1';
  const data = A.extract(bundle);
  const assumptions = {...A.defaults,downtime:'percent'};
  const model = A.model(data,{area:'A1',start:week,end:week},assumptions,{},true);
  const report = A.planningSummary(model.rows,'area',assumptions);
  assert.equal(report.roster,30);
  assert.equal(report.downtime,null);
  assert.equal(report.gap,null);
});
test('unmatched downtime at one patch preserves assessed capacity at another', () => {
  const bundle = fixture();
  bundle.sources.resource_plan.rows = [staff(1,'P1',30)];
  bundle.sources.downtime_overlays_hours.rows = [
    {patch:'P1',skill:'S',metric:'Training',weekcomm:week,values:4},
    {patch:'P2',skill:'S',metric:'Training',weekcomm:week,values:6}
  ];
  bundle.sources.overtime.rows = [];
  const result = A.model(A.extract(bundle),{start:week,end:week},A.defaults,{},true);
  const report = A.planningSummary(result.rows,'region');
  assert.equal(report.capacity,26);
  assert.equal(report.downtime,4);
  assert.equal(report.partialByMeasure.capacity,true);
  assert.equal(report.partialByMeasure.downtime,true);
  assert.equal(report.gap,null);
  assert.equal(A.planningSummary(result.rows,'patch').gap,-14);
  const parts = A.planningBreakdown(report,'downtime','breakdown');
  assert.equal(parts.get(JSON.stringify(['Training'])).value,4);
  assert.equal(parts.get(JSON.stringify(['Training'])).evidence[0].cell.patch,'P1');
});
test('baseline bridge explains a 90-hour decline in gap with four reconciled drivers', () => {
  const plan = (hours, downtime, overtime, jobs) => {
    const bundle = fixture();
    bundle.sources.resource_plan.rows = [staff(1,'P1',hours)];
    bundle.sources.demand_input.rows = [demand('P1',jobs)];
    bundle.sources.job_time_assumptions.rows = [demand('P1',1)];
    bundle.sources.downtime_overlays_hours.rows = [{patch:'P1',skill:'S',metric:'Training',weekcomm:week,values:downtime}];
    bundle.sources.overtime.rows[0].OvertimeHours = overtime;
    const data = A.extract(bundle);
    return A.planningSummary(A.model(data,{},A.defaults,{},true).rows,'region',A.defaults);
  };
  const baseline = plan(1000,150,50,860);
  const revised = plan(940,180,70,880);
  const impact = A.planningImpact(baseline,revised);
  assert.equal(impact.gapBefore,40);
  assert.equal(impact.gapAfter,-50);
  assert.equal(impact.delta,-90);
  assert.deepEqual(impact.components.filter(row=>row.value).map(row=>row.value),[-60,-30,20,-20]);
  assert.equal(impact.residual,0);
  assert.equal(impact.demandBridge.volume,20);
  assert.equal(A.planningImpact(baseline,baseline).delta,0);
  const moved = A.planningImpact(baseline,revised,[{patch:'P1'}]);
  assert.equal(moved.delta,null);
  assert.equal(moved.revisedCoverage.groups,1);
  assert.equal(moved.revisedCoverage.hours,-50);
});
test('hypothetical roster changes recalculate selected downtime; overtime and downtime cuts stay scoped', () => {
  const bundle = fixture();
  bundle.sources.resource_plan.rows[0].Hours = 37.5;
  bundle.sources.resource_plan.rows[0].Allocation = 80;
  bundle.sources.downtime_overlays_hours.rows = [{patch:'P1',skill:'S',metric:'Training',weekcomm:week,values:6}];
  const data = A.extract(bundle);
  const snapshot = JSON.stringify(data.facts);
  for (const [downtime,loss] of [['percent',6],['hours',7.5]]) {
    const assumptions = {...A.defaults,downtime};
    const result = A.model(data,{},assumptions,{},true);
    const group = A.planningSummary(result.rows,'area',assumptions).assessed.find(r=>r.area==='A1' && r.week===week);
    const simulate = (driver,amount) => A.simulatePlanningChange(data,{},assumptions,group,'area',driver,amount);
    assert.equal(group.capacity,24);
    const fte = simulate('fte',-0.2);
    assert.equal(fte.capacity,24-loss);
    assert.equal(fte.demand,group.demand);
    assert.equal(fte.cells.length,1);
    assert.equal(fte.cells[0].roster,22.5);
    assert.equal(fte.cells[0].area,'A1');
    assert.equal(simulate('overtime',25).capacity,49);
    assert.equal(simulate('downtime',4).capacity,28);
    assert.equal(simulate('downtime',7),null);
    assert.equal(simulate('roster',-31),null);
  }
  assert.equal(JSON.stringify(data.facts),snapshot);
});
