const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../static/analytics_engine.js');
const source = rows => ({success:true, rows, hash:JSON.stringify(rows),version:'v1'});
function fixture(){return {sources:{
    geography_mapping:source([{Region:'A',territory:'EA11 North'},{Region:'B',territory:'EB11 South'}]),
    demand_input:source([{Patch:'EA11 North','Region Code':'E',Skill:'HEC','Work Code':'W01',Weekcomm:'2026-11-02',Values:100},{Patch:'EB11 South','Region Code':'B',Skill:'HEC','Work Code':'W01',Weekcomm:'2026-11-02',Values:20}]),
    job_time_assumptions:source([{Patch:'EA11 North',Skill:'HEC','Work Code':'W01',Weekcomm:'2026-11-02',Values:1},{Patch:'EB11 South',Skill:'HEC','Work Code':'W01',Weekcomm:'2026-11-02',Values:1}]),
    resource_plan:source([{Status:'Active','Pay Id':1,Wmis:'EA11 North',Skill:'HEC',Hours:75,Allocation:100},{Status:'Active','Pay Id':2,Wmis:'EB11 South',Skill:'HEC',Hours:50,Allocation:100},{Status:'Leaver','Pay Id':3,Wmis:'EA11 North',Skill:'HEC',Hours:100,Allocation:100}]),
    downtime_overlays_hours:source([{patch:'EA11 North',skill:'HEC',metric:'Training',weekcomm:'2026-11-02',values:5}]),
    overtime:source([{Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Overtime_Hours:10,Authorized:'Yes'}]),
    ctr_capacity:source([{Region:'A',Skill:'HEC',Weekcomm:'2026-11-02',Contractor_Hours:5,Status:'Active'}]),
}};}
test('matched source facts reconcile capacity and retain gross local deficits',()=>{
    const data=A.extract(fixture()),m=A.model(data);
    assert.equal(m.demand,120);assert.equal(m.capacity,135);assert.equal(m.deficit,15);assert.equal(m.surplus,30);assert.equal(m.coverage,112.5);
    assert.ok(data.issues.some(i=>i.kind==='Region conflict'));
});
test('missing job times do not become zero demand or comparable pressure',()=>{
    const b=fixture();b.sources.job_time_assumptions.rows.pop();const d=A.extract(b),m=A.model(d);
    assert.equal(m.comparable,1);assert.equal(m.rows.find(r=>r.region==='B').gap,null);
    assert.equal(A.model(d,{}, {allowPartial:true}).rows.find(r=>r.region==='B').comparable,false);
});
test('duplicate join keys excluded instead of inflating totals',()=>{
    const b=fixture();b.sources.job_time_assumptions.rows.push({...b.sources.job_time_assumptions.rows[0]});const d=A.extract(b);
    assert.equal(d.facts.demand_input[0].matched,false);assert.ok(d.issues.some(i=>i.kind==='Duplicate business key'));
});
test('patch filtering excludes regional interventions',()=>{
    const m=A.model(A.extract(fixture()),{patch:'EA11 North'});assert.equal(m.capacity,70);assert.equal(m.deficit,30);assert.equal(A.sum(m.rows,'overtime'),0);
});
test('stress is deterministic, zero shocks reconcile, and demand increases shortfall',()=>{
    const d=A.extract(fixture()),base=A.model(d),s=A.model(d,{}, {},{demandPct:10});
    assert.deepEqual(A.model(d,{}, {},{}),base);assert.deepEqual(s,A.model(d,{}, {},{demandPct:10}));assert.ok(s.deficit>base.deficit);
});
test('cross-skill support deducts donor and credits at efficiency',()=>{
    const b=fixture();b.sources.hec_on_kac_demand=source([{Region:'A',Skill:'HEC',Support:'KAC',Weekcomm:'2026-11-02',Support_Hours:10,Max_Weekly_Hours:50,Ratio:0.8}]);
    const m=A.model(A.extract(b),{}, {includeSupport:true});assert.equal(m.rows.find(r=>r.region==='A'&&r.skill==='HEC').support,-10);assert.equal(m.rows.find(r=>r.skill==='KAC').support,8);assert.equal(A.sum(m.rows,'support'),-2);
});
test('support cannot create hours when donor has no capacity, including skill-filtered views',()=>{
    const b=fixture();b.sources.hec_on_kac_demand=source([{Region:'B',Skill:'EV',Support:'KAC',Weekcomm:'2026-11-02',Support_Hours:100,Max_Weekly_Hours:100,Ratio:1}]);
    const d=A.extract(b),m=A.model(d,{}, {includeSupport:true});assert.equal(A.sum(m.rows,'support'),0);
    const filtered=A.model(d,{region:'B',skill:'KAC'}, {includeSupport:true});assert.equal(filtered.rows[0].capacity,0);
});
test('consecutive deficits do not bridge missing weeks',()=>{
    const rows=['2026-11-02','2026-11-09','2026-11-23'].map(week=>({region:'A',skill:'HEC',week,comparable:true,gap:-10,deficit:10,surplus:0,demand:20,capacity:10}));
    assert.equal(A.persistence(rows)[0].longest,2);assert.equal(A.persistence(rows)[0].weeks,3);
});
test('identical content under different versions is explicitly identified',()=>{
    const a=fixture(),b=fixture();b.sources.demand_input.version='new filename';
    const diff=A.compareSources(a,b).find(r=>r.source==='demand_input');assert.equal(diff.status,'Same contents / new version');assert.equal(diff.records.length,0);
});
test('record changes match on business keys, retaining before and after',()=>{
    const a=fixture(),b=fixture();b.sources.demand_input.rows[0].Values=110;b.sources.demand_input.hash='changed';
    const diff=A.compareSources(a,b).find(r=>r.source==='demand_input');assert.equal(diff.records.length,1);assert.equal(diff.records[0].before[0].Values,100);assert.equal(diff.records[0].after[0].Values,110);
});
test('recruitment is opt-in and delayed intake has no early capacity',()=>{
    const b=fixture();b.sources.recruitment_grounded=source([{Region:'A',Skill:'HEC',Cohort:'One',Weekcomm:'2026-11-02',Headcount:4}]);const d=A.extract(b);
    assert.equal(A.sum(A.model(d).rows,'recruits'),0);assert.equal(A.sum(A.model(d,{}, {includeRecruitment:true,rampWeeks:4}).rows,'recruits'),37.5);assert.equal(A.sum(A.model(d,{}, {includeRecruitment:true},{recruitmentDelay:1}).rows,'recruits'),0);
});
test('minutes are converted once, region-only filters preserve totals',()=>{
    const d=A.extract(fixture());assert.equal(A.model(d,{region:'A'}).demand,100);assert.equal(A.model(d,{}, {jobTimeUnit:'minutes'}).demand,2);
});
test('unavailable sources stay issues and empty models have no coverage',()=>{
    const d=A.extract({sources:{demand_input:{success:false,error:'Missing version'}}});assert.equal(d.issues.length,1);assert.equal(A.model(d).coverage,null);
});
test('volume/mix/duration decomposition reconciles without choosing an arbitrary order',()=>{
    const b=fixture(),c=fixture();c.sources.demand_input.rows[0].Values=120;c.sources.job_time_assumptions.rows[0].Values=2;
    const bridge=A.demandBridge(A.extract(b),A.extract(c));
    assert.equal(bridge.before,120);assert.equal(bridge.after,260);
    assert.ok(Math.abs(bridge.volume+bridge.mix+bridge.duration-140)<1e-8);
    assert.ok(Math.abs(bridge.volume-30)<1e-8);assert.ok(Math.abs(bridge.duration-110)<1e-8);
});
test('decomposition excludes unmatched and changed-scope groups',()=>{
    const b=fixture(),c=fixture();c.sources.job_time_assumptions.rows.pop();
    const bridge=A.demandBridge(A.extract(b),A.extract(c));assert.equal(bridge.rows.length,1);assert.equal(bridge.excluded.length,1);
});
test('unmapped patches stay in an explicit group rather than trusting a conflicting source region',()=>{
    const b=fixture();b.sources.geography_mapping.rows.pop();const d=A.extract(b);assert.equal(d.facts.demand_input[1].region,'Unmapped');
});
test('invalid calendar dates are excluded without crashing recruitment simulation',()=>{
    const b=fixture();b.sources.recruitment_grounded=source([{Region:'A',Skill:'HEC',Cohort:'Bad',Weekcomm:'2026-02-31',Headcount:4}]);const d=A.extract(b);assert.ok(d.issues.some(r=>r.kind==='Invalid week'));assert.equal(A.sum(A.model(d,{}, {includeRecruitment:true}).rows,'recruits'),0);
});
