const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../static/analytics_engine.js'),F=require('../static/forecast_analytics_engine.js');
const source=rows=>({success:true,rows,version:'v1',hash:JSON.stringify(rows)});
function fixture(){return {sources:{
 geography_mapping:source([{territory:'North',Region:'A'},{territory:'South',Region:'B'}]),
 demand_input:source([{Patch:'North',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-02',Values:100},{Patch:'South',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-02',Values:10}]),
 job_time_assumptions:source([{Patch:'North',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-02',Values:1},{Patch:'South',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-02',Values:3}]),
 resource_plan:source([{Status:'Active','Pay Id':'one',Wmis:'North',Skill:'HEC',Hours:75,Allocation:100},{Status:'Active','Pay Id':'two',Wmis:'South',Skill:'HEC',Hours:75,Allocation:100}]),
 ctr_capacity:source([{Agency:'One',Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Contractor_Hours:10,FTE:1,Status:'Active'},{Agency:'Two',Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Contractor_Hours:5,FTE:1,Status:'Active'}]),
 overtime:source([{Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Overtime_Hours:10,Authorized:'Yes'}]),
 actuals_input:source([{Metric:'Actual delivery',Values:999999}])
}};}
test('target requirements preserve local shortages and unavailable evidence; productive FTE is not summed as hires',()=>{
 const d=A.extract(fixture()),m=A.model(d),r=F.target(m,110,37.5);
 assert.ok(Math.abs(r.required-10)<1e-9);assert.ok(Math.abs(r.rows.find(x=>x.region==='A').fte-10/37.5)<1e-9);assert.equal(r.rows.find(x=>x.region==='B').required,0);
 const b=fixture();b.sources.job_time_assumptions.rows.pop();const incomplete=F.target(A.model(A.extract(b)));assert.equal(incomplete.excluded,1);assert.equal(incomplete.rows.find(x=>x.region==='B').required,null);
});
test('agency withdrawal affects only selected supplier and never mutates submitted inputs',()=>{
 const d=A.extract(fixture()),before=JSON.stringify(d);const r=F.commitment(d,{},A.defaults,{kind:'contractors',agency:'One',reduction:100});
 assert.equal(r.after-r.before,10);assert.equal(r.rows.find(x=>x.region==='A').change,-10);assert.equal(JSON.stringify(d),before);
 assert.equal(F.commitment(d,{},A.defaults,{kind:'contractors',agency:'One',reduction:0}).after,r.before);
 assert.equal(F.commitment(d,{patch:'North'},A.defaults,{kind:'contractors',reduction:100}).enabled,false);
});
test('complete withdrawal of the last capacity source retains the baseline comparison population',()=>{
 const b=fixture();b.sources.resource_plan.rows=[];b.sources.overtime.rows=[];const d=A.extract(b),r=F.commitment(d,{},A.defaults,{kind:'contractors',reduction:100});
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].after,0);assert.equal(r.after,100);assert.equal(r.excluded,1);
});
test('supplier mix uses active unique hours with regional skill and week concentration',()=>{
 const b=fixture();b.sources.ctr_capacity.rows.push({Agency:'Off',Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Contractor_Hours:999,Status:'Inactive'});
 const r=F.suppliers(A.extract(b));assert.equal(r.total,15);assert.equal(r.rows.length,2);assert.ok(Math.abs(r.concentration[0].largestShare-100*10/15)<1e-9);
});
test('recruitment failure is opt-in and delay shifts intake without inventing commitments',()=>{
 const b=fixture();b.sources.recruitment_grounded=source([{Cohort:'One',Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Headcount:2}]);const d=A.extract(b);
 assert.equal(F.commitment(d,{},A.defaults,{kind:'recruitment',reduction:100}).affected,0);
 const r=F.commitment(d,{}, {...A.defaults,includeRecruitment:true,rampWeeks:1},{kind:'recruitment',reduction:0,delay:1});assert.equal(r.rows.find(x=>x.region==='A').change,-75);
});
test('forecast peaks break missing-week changes and keep jobs separate from capacity hours',()=>{
 const b=fixture();b.sources.demand_input.rows.push({Patch:'North',Skill:'HEC','Work Code':'W1',Weekcomm:'2026-11-16',Values:200});
 const d=A.extract(b),r=F.peaks(d,{},A.model(d));assert.equal(r.weekly.find(x=>x.week==='2026-11-16').change,null);assert.equal(r.rows.find(x=>x.region==='A').peakJobs,200);
 assert.equal(r.rows.find(x=>x.region==='A').capacityPeak,'2026-11-02');
});
test('headroom distinguishes existing shortfall, thin balance and unavailable cells',()=>{
 const rows=F.stability({rows:[{comparable:true,capacity:100,demand:100,gap:0,roster:100,downtime:0},{comparable:true,capacity:90,demand:100,gap:-10,roster:100,downtime:0},{comparable:false,capacity:0,demand:100}]});
 assert.equal(rows[0].status,'Thin headroom');assert.equal(rows[0].demandTolerance,0);assert.equal(rows[1].status,'Already short');assert.equal(rows[2].demandTolerance,null);
});
test('job-time peer comparisons respect units and require multiple patches; benchmark is explicit',()=>{
 const d=A.extract(fixture()),r=F.jobTimes(d,{},A.defaults,25,false);assert.equal(r.rows[0].reference,2);assert.equal(r.rows[0].deviation,-50);assert.equal(r.impact,null);
 const tested=F.jobTimes(d,{patch:'North'}, {...A.defaults,jobTimeUnit:'minutes'},25,true);assert.equal(tested.rows.length,1);assert.equal(tested.rows[0].peers,2);assert.ok(Math.abs(tested.impact-100/60)<1e-9);
 assert.equal(F.jobTimes(d,{region:'A'},A.defaults).rows[0].reference,null);
});
test('workforce dates require confirmation and dated roster movements reconcile',()=>{
 const b=fixture();b.sources.resource_plan.rows[0]['New Starter']='2026-11-02';b.sources.resource_plan.rows[1]['Left Date']='2026-11-02';const d=A.extract(b);
 assert.equal(F.workforce(d,{},A.defaults,false).rows.length,0);const r=F.workforce(d,{},A.defaults,true);
 r.rows.forEach(x=>assert.equal(x.opening+x.starters-x.exits,x.closing));assert.equal(r.rows.find(x=>x.region==='A').starters,2);assert.equal(r.rows.find(x=>x.region==='B').exits,2);
 b.sources.resource_plan.rows[0]['New Starter']='2026-02-30';assert.equal(F.workforce(A.extract(b),{},A.defaults,true).excluded,1);
});
test('reconciliation identifies source disagreements without summing alternative losses',()=>{
 const b=fixture();b.sources.downtime_overlays_hours=source([{patch:'North',skill:'HEC',metric:'Training',level2:'One',weekcomm:'2026-11-02',values:20}]);b.sources.downtime_overlays_percentage=source([{patch:'North',skill:'HEC',metric:'Training',level2:'One',weekcomm:'2026-11-02',values:10}]);
 const r=F.reconciliation(A.extract(b));assert.ok(r.some(x=>x.check==='Contractor hours / stated FTE'));const loss=r.find(x=>x.check==='Alternative downtime differs');assert.equal(loss.expected,7.5);assert.equal(loss.supplied,20);assert.equal(loss.records.length,2);
});
test('period summaries retain gross shortages and explicitly group missing fiscal mappings',()=>{
 const d=A.extract(fixture()),m=A.model(d),r=F.monthly(d,{},m,'calendar');assert.equal(r.rows[0].period,'2026-11');assert.equal(r.rows[0].deficit,m.deficit);assert.equal(r.rows[0].capacity,m.capacity);
 const fiscal=F.monthly(d,{},m,'fiscal');assert.equal(fiscal.unmapped.length,1);assert.equal(fiscal.rows[0].period,'Unmapped fiscal weeks');
 const b=fixture();b.sources.job_time_assumptions.rows=[];assert.equal(F.monthly(A.extract(b),{},A.model(A.extract(b))).rows[0].demand,null);
});
test('overlapping staffing and recruitment submissions are review flags, not automatic additions',()=>{
 const b=fixture();b.sources.resource_plan.rows.push({...b.sources.resource_plan.rows[0],Skill:'KAC',Allocation:50});
 b.sources.recruitment_grounded=source([{Cohort:'Intake',Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Headcount:2}]);b.sources.recruitment_ungrounded=source([{Cohort:'Intake',Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Headcount:3,Probability:0.5}]);
 const rows=F.reconciliation(A.extract(b));assert.ok(rows.some(r=>r.check==='Potential overlapping roster assignments'));assert.ok(rows.some(r=>r.check==='Potential overlapping recruitment commitments'));
});
test('fix priorities deduplicate affected jobs within a group and exclude actuals',()=>{
 const b=fixture();b.sources.job_time_assumptions.rows=[];const d=A.extract(b);d.issues.push({...d.issues.find(x=>x.kind==='Unmatched job time')});d.issues.push({source:'actuals_input',kind:'Invalid measure',row:1,detail:'Actuals'});
 const r=F.priorities(d),gap=r.find(x=>x.kind==='Unmatched job time');assert.equal(gap.jobs,110);assert.equal(gap.cells,2);assert.ok(!r.some(x=>x.source==='actuals_input'));
 const scoped=F.priorities(d,{region:'A'}).find(x=>x.kind==='Unmatched job time');assert.equal(scoped.jobs,100);
});
test('forecast investigations are invariant to actual-delivery input changes',()=>{
 const b=fixture(),d=A.extract(b);b.sources.actuals_input.rows=[{Values:1,Metric:'Changed actuals'}];const e=A.extract(b);
 for(const fn of [x=>F.target(A.model(x)),x=>F.suppliers(x),x=>F.peaks(x,{},A.model(x)),x=>F.stability(A.model(x)),x=>F.jobTimes(x),x=>F.workforce(x,{},A.defaults,true),x=>F.reconciliation(x),x=>F.monthly(x,{},A.model(x)),x=>F.priorities(x)])assert.deepEqual(fn(d),fn(e));
});
