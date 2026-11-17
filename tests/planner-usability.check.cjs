const assert=require('node:assert/strict'),M=require('../static/planning-model.js'),U=require('../static/planner-usability-model.js');
const P=require('../static/planner-review-model.js');
const weeks=['2026-11-16','2026-11-23','2026-11-30'];
const dataset={mode:'demo',rows:weeks.flatMap((week,i)=>[
 {region:'North',area:'N1',patch:'A',skill:'HEC',week,demand:100+i*10,capacity:80},
 {region:'South',area:'S1',patch:'B',skill:'HEC',week,demand:10,capacity:60}
])};
const rows=dataset.rows,all=U.coverage(rows);assert.ok(all.aggregate>1);assert.ok(all.matched<1);assert.equal(U.coverage([{demand:0,capacity:20}]).matched,null);
assert.equal(U.monday(new Date('2026-03-29T23:30:00Z')),'2026-03-30','Use the British business week across BST boundary');
assert.equal(U.today(new Date('2026-03-29T23:30:00Z')),'2026-03-30');
assert.equal(U.monday(new Date('2026-11-22T12:00:00Z')),weeks[0]);assert.equal(U.addWeeks(weeks[0],2),weeks[2]);
assert.equal(U.reviewRows(rows,'this-week',weeks[0]).length,2);assert.equal(U.reviewRows(rows,'next-two',weeks[0]).length,4);assert.equal(U.reviewRows(rows,'full',weeks[0]).length,6);
assert.equal(U.reviewRows(rows,'this-week','2027-02-01').length,0,'Do not silently substitute a historical week');
assert.equal(U.rank(rows,'week')[0].week,weeks[0]);assert.equal(U.rank(rows,'largest')[0].week,weeks[2]);
assert.equal(U.rank(rows,'worsening',[{...rows[0],shortageChange:100}])[0].week,weeks[0]);
const source={mode:'selected',sources:[{category:'demand_input',file:'plan.csv'}]};
assert.equal(U.inputUsage('demand_input','plan.csv',source).tone,'used');assert.equal(U.inputUsage('demand_input','new.csv',source).tone,'pending');
assert.equal(U.inputUsage('training_snm','training.csv',source).tone,'reference');assert.equal(U.inputUsage('demand_input','ml_forecast_v1',source).tone,'illustrative');
assert.equal(U.inputUsage('demand_input','ml_forecast_v1',{mode:'selected',sources:[{category:'demand_input',file:'ml_forecast_v1'}]}).tone,'used','Validated hours may be used regardless of filename; naming alone never executes a model');
const draft={patch:'A',skill:'HEC',start:weeks[0],end:weeks[0],type:'overtime',amount:20,name:'Cover'};
const original=M.clone(dataset),ot=U.draftPreview(dataset,[],draft,37.5);assert.equal(ot.ready,true);assert.equal(ot.oldTarget.shortage,20);assert.equal(ot.target.shortage,0);assert.equal(ot.added,20);assert.deepEqual(dataset,original);
const transfer=U.draftPreview(dataset,[],{...draft,type:'transfer',donor:'B',amount:55},37.5);assert.equal(transfer.ready,true);assert.equal(transfer.donor.shortage,5,'Expose a donor skill shortage even when the recipient improves');
assert.equal(U.draftPreview(dataset,[],{...draft,type:'transfer',donor:'B',amount:61},37.5).ready,false);
const hire=U.draftPreview(dataset,[],{...draft,type:'recruitment',amount:1,ramp:4,end:weeks[1]},37.5);assert.equal(hire.ready,true);assert.equal(hire.added,28.125);
for(const invalid of [{amount:''},{amount:-5},{start:weeks[1],end:weeks[0]},{patch:''},{type:'recruitment',ramp:0},{type:'transfer',donor:'A'}])assert.equal(U.draftPreview(dataset,[],{...draft,...invalid},37.5).ready,false);
assert.equal(U.draftPreview(dataset,[],draft,0).ready,false);
const oldAction={sourceMode:'demo',region:'North',patch:'A',skill:'HEC',start:'2026-11-02',end:'2026-11-02'};
assert.equal(P.actionsInScope([oldAction],M.run(dataset,[]),{region:'North',skill:'HEC',week:'All'}).length,1,'All dates must retain older action follow-up for known planning cells');
assert.equal(P.actionsInScope([oldAction],M.run(dataset,[]),{region:'North',skill:'HEC',week:weeks[0]}).length,0,'An explicit planning week retains its date filter');
console.log('PASS: matched coverage, UK review windows, urgency sorting, missing-week handling, exact input roles, immutable draft preview, donor consequences, recruitment ramp and invalid responses.');
