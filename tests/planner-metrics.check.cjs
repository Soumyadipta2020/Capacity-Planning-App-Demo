const assert=require('node:assert/strict');
const M=require('../static/planning-model.js');
require('../static/planner-review-model.js');
require('../static/planner-usability-model.js');
const P=require('../static/planner-metrics-model.js');
const weeks=['2026-11-16','2026-11-23','2026-11-30'];
const dataset={mode:'demo',contract:'capacity-desk-hours-v1',snapshot:'synthetic',rows:weeks.flatMap(week=>[
 {region:'North',area:'N1',patch:'A',skill:'HEC',week,demand:100,capacity:80},
 {region:'North',area:'N1',patch:'A',skill:'KAC',week,demand:10,capacity:40},
 {region:'South',area:'S1',patch:'B',skill:'HEC',week,demand:100,capacity:150}
])};
const initial=M.run(dataset,[]),all={region:'All',skill:'All',week:'All'};
const actions=[
 {sourceMode:'demo',region:'North',patch:'A',skill:'HEC',start:weeks[2],end:weeks[2],due:'2026-11-15',status:'Pending'},
 {sourceMode:'demo',region:'North',patch:'A',skill:'HEC',start:weeks[0],end:weeks[0],due:'2026-11-17',status:'Pending'},
 {sourceMode:'demo',region:'South',patch:'B',skill:'HEC',start:weeks[0],end:weeks[0],due:'2026-11-15',status:'Reviewed'},
 {sourceMode:'selected',region:'North',patch:'A',skill:'HEC',due:'2026-11-15',status:'Pending'}
];
const summary=(r=initial,ref=null,f=all,loaded=true)=>P.summary(r,ref,f,actions,loaded,weeks[0],'2026-11-17');
let s=summary();assert.equal(s.totals.shortage,60);assert.ok(s.totals.net>0);
assert.equal(s.coverage,(630-60)/630,'Coverage must preserve matching-cell shortages');
assert.equal(s.nextTwo.shortage,40);assert.equal(s.nextTwo.complete,true);assert.equal(s.cellsBelow,3);
assert.equal(s.pending,2);assert.equal(s.overdue,1,'Due today is not overdue; reviewed and other source modes excluded');
assert.equal(summary(initial,null,all,false).pending,null,'Unknown planning records must not appear as zero');
s=summary(initial,null,{...all,week:weeks[0]});assert.equal(s.nextTwo.shortage,20);assert.deepEqual(s.nextTwo.expected,[weeks[0]]);
assert.equal(s.pending,2,'All action dates remain visible despite selected planning week');
s=summary(initial,null,{...all,week:weeks[2]});assert.equal(s.nextTwo.available,false);assert.equal(s.nextTwo.expected.length,0);
s=summary(initial,null,{...all,region:'South'});assert.equal(s.overdue,0);assert.equal(s.coverage,1);
const missingWeek={...initial,rows:initial.rows.filter(r=>r.week!==weeks[1])};
s=summary(missingWeek);assert.equal(s.nextTwo.shortage,20);assert.equal(s.nextTwo.complete,false);assert.deepEqual(s.nextTwo.missing,[weeks[1]]);
const missingCell={...initial,rows:initial.rows.filter(r=>!(r.week===weeks[1]&&r.skill==='KAC'))};
s=summary(missingCell);assert.equal(s.nextTwo.complete,false);assert.deepEqual(s.nextTwo.incomplete,[weeks[1]]);
const zero=M.run({...dataset,rows:dataset.rows.map(r=>({...r,demand:0}))},[]);assert.equal(summary(zero).coverage,null);
const improved=M.run(dataset,[{id:'ot',type:'overtime',name:'OT',patch:'A',skill:'HEC',start:weeks[0],end:weeks[0],amount:10}]);
s=summary(improved,initial);assert.equal(s.comparison.compatible,true);assert.equal(s.comparison.shortageChange,-10);assert.equal(s.referenceAt,initial.createdAt);
assert.equal(summary(initial,{...initial,source:{...initial.source,mode:'selected'}}).comparison.compatible,false);
assert.equal(summary(initial,{...initial,rows:initial.rows.slice(1)}).comparison.compatible,false);
assert.equal(s.earliest.name,weeks[0]);assert.equal(s.peak.name,weeks[1]);
console.log('PASS: planner lead measures preserve local shortages, ratio bases, two-week overlap, missing weeks/cells, reference compatibility and unknown/overdue action semantics.');
