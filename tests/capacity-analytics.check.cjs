const assert=require('node:assert/strict');
const M=require('../static/planning-model.js');
require('../static/planner-review-model.js');
const A=require('../static/capacity-analytics-model.js');
const weeks=['2026-11-16','2026-11-23'];
const dataset={mode:'demo',contract:'weekly-hours-v1',snapshot:'synthetic',rows:weeks.flatMap((week,i)=>[
 {region:'North',area:'N1',patch:'A',skill:'HEC',week,demand:100+i*10,capacity:80},
 {region:'North',area:'N1',patch:'A',skill:'KAC',week,demand:10,capacity:40},
 {region:'South',area:'S1',patch:'B',skill:'HEC',week,demand:100,capacity:150}
])};
const before=M.run(dataset,[]);
const driver={id:'ot',name:'Overtime',patch:'A',skill:'HEC',start:weeks[0],end:weeks[0],type:'overtime',amount:20};
const after=M.run(dataset,[driver,{...driver,id:'r',name:'Recruitment',type:'recruitment',amount:1,ramp:2,end:weeks[1]},
 {...driver,id:'t',name:'Transfer',type:'transfer',donor:'B',amount:10,end:weeks[1]}]);
const filter={region:'All',skill:'All',week:'All'};
function close(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
const national=A.scenario(after,filter);assert.equal(national.available,true);
close(national.end,M.total(after.rows).net);close(national.residual,0);
assert.equal(national.steps.find(s=>s.label==='Transfers received').value,20);
assert.equal(national.steps.find(s=>s.label==='Transfers given').value,-20);
close(national.steps.find(s=>s.label==='Effective recruitment').value,56.25);
const north=A.scenario(after,{...filter,region:'North'}),south=A.scenario(after,{...filter,region:'South'});
assert.equal(north.steps.find(s=>s.label==='Transfers received').value,20);
assert.equal(north.steps.find(s=>s.label==='Transfers given').value,0);
assert.equal(south.steps.find(s=>s.label==='Transfers given').value,-20);
assert.equal(A.scenario(after,{...filter,week:weeks[0]}).steps.find(s=>s.label==='Effective recruitment').value,18.75);
const summary=A.summary(before,filter);assert.ok(summary.totals.net>0);assert.equal(summary.totals.shortage,50,'Surplus must not net away skill shortages');
assert.equal(summary.cellsAtRisk,2);assert.equal(summary.weeksAtRisk,2);assert.equal(summary.peak.name,weeks[1]);close(summary.shortageFteWeeks,50/37.5);
close(A.summary(after,filter).shortageReduction,M.total(before.rows).shortage-M.total(after.rows).shortage);
const oldSource=M.clone(dataset);oldSource.rows.forEach(r=>{r.demand-=5;r.capacity+=3;});
const reference=M.run(oldSource,[{...driver,amount:7}]);
const change=A.reference(after,reference,filter);assert.equal(change.available,true);close(change.residual,0);
assert.equal(change.steps.find(s=>s.label==='Source capacity change').value,-18);
assert.equal(change.steps.find(s=>s.label==='Demand change effect').value,-30);
close(change.end-change.start,M.total(after.rows).net-M.total(reference.rows).net);
const position=A.position(after,filter);close(position.steps[0].value-position.steps[1].value*-1,position.end);
assert.equal(A.reference(after,null,filter).available,false);
assert.equal(A.reference(after,{...reference,source:{...reference.source,mode:'selected'}},filter).available,false);
assert.equal(A.reference(after,{...reference,rows:reference.rows.slice(1)},filter).available,false);
assert.equal(A.scenario(after,{...filter,region:'Unknown'}).available,false);
assert.equal(A.scenario({...after,ledger:[]},filter).available,false,'Missing adjustment entries block a misleading waterfall');
assert.equal(A.scenario({...after,baseline:after.baseline.slice(1)},filter).available,false);
const cross=A.bridge('Start',-50,[{label:'Up',value:100},{label:'Down',value:-80}],'End',-30);
assert.equal(cross.reconciled,true);assert.deepEqual(cross.steps.map(s=>s.to),[-50,50,-30,-30]);
assert.equal(A.bridge('Start',0,[{label:'Add',value:3}],'End',4).reconciled,false);
const zero=M.run({...dataset,rows:[{...dataset.rows[0],demand:0,capacity:0}]},[]);
assert.equal(A.summary(zero,filter).totals.coverage,null);assert.equal(A.position(zero,filter).available,true);
const weekly=A.weekly(after,{...filter,week:weeks[1]});assert.equal(weekly.length,2);assert.equal(weekly[0].previous,null);assert.equal(weekly[1].comparable,true);
const missing={...after,rows:after.rows.filter(r=>!(r.patch==='B'&&r.week===weeks[1]))};assert.equal(A.weekly(missing,filter)[1].comparable,false);
const gap={...after,rows:after.rows.map(r=>({...r,week:r.week===weeks[1]?'2026-11-30':r.week}))};assert.equal(A.weekly(gap,filter)[1].comparable,false);
assert.equal(A.weekly(after,{...filter,region:'Unknown'}).length,0);
console.log('PASS: analytics bridge reconciliation, signed transfers, recruitment ramp, scoped totals, reference matching, missing data, zero demand, negative crossings and comparable weekly tracking.');
