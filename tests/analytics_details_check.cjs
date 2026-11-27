/* Secondary-surface checks using actual component event handlers and source rows. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const babel=require('../.cache/analytics-qa/node_modules/@babel/core');
const preset=require('../.cache/analytics-qa/node_modules/@babel/preset-react');
const React=require('../.cache/analytics-qa/node_modules/react');
const {renderToStaticMarkup}=require('../.cache/analytics-qa/node_modules/react-dom/server');
const A=require('../static/analytics_engine.js');
const code=['static/analytics_details.js','static/analytics_ui.js'].map(f=>babel.transformSync(fs.readFileSync(f,'utf8'),{presets:[[preset,{runtime:'classic'}]]}).code).join('\n');
function studioHarness(name,props) {
  let index = 0;
  const states = [];
  const fake = {...React,
    useState(initial) {
      const slot = index++;
      if (!(slot in states)) states[slot] = typeof initial==='function' ? initial() : initial;
      return [states[slot],value=>{states[slot] = typeof value==='function' ? value(states[slot]) : value;}];
    },
    useMemo:fn=>fn(),
    useCallback:fn=>fn,
    useEffect(){},
    useRef:current=>({current})
  };
  const context = {React:fake,window:{},console};
  vm.createContext(context);
  vm.runInContext(code,context);
  return () => {index=0;return context[name](props);};
}
function harness(name,initial){let index=0;const states=[];let props=initial;const fake={...React,useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useEffect(){},useMemo(fn){return fn();},useRef(value){return {current:value};}};const context={React:fake,window:{CapacityAnalytics:A},console,URL,Blob,setTimeout,clearTimeout,setInterval,clearInterval};vm.createContext(context);vm.runInContext(code,context);return {render(){index=0;return context[name](props);},update(change){props={...props,...change};}};}
function findAll(node,predicate,result=[]){if(!node||typeof node!=='object')return result;if(predicate(node))result.push(node);for(const child of React.Children.toArray(node.props?.children))findAll(child,predicate,result);return result;}
const find=(tree,predicate)=>findAll(tree,predicate)[0];
function html(tree){const result=renderToStaticMarkup(tree);assert.ok(!result.includes('NaN')&&!result.includes('Infinity'));return result;}
const rawRows=[{source:'demand_input',row:1,region:'A',patch:'North',skill:'HEC',week:'2026-11-02',raw:{Patch:'North',Skill:'HEC','Work Code':'W01',Values:10}},{source:'demand_input',row:2,region:'A',patch:'North',skill:'KAC',week:'2026-11-02',raw:{Patch:'North',Skill:'KAC','Work Code':'W17',Values:30}},{source:'demand_input',row:3,region:'B',patch:'South',skill:'HEC',week:'2026-11-09',raw:{Patch:'South',Skill:'HEC','Work Code':'W01',Values:20}}];
let exported;
const browser=harness('AnalyticsRecordBrowser',{rows:rawRows,columns:[{key:'row',label:'Row'}],sources:{demand_input:{version:'Forecast v1',hash:'abc'}},query:'',onQueryChange:q=>browser.update({query:q}),onExport:r=>exported=r,page:0,onPageChange:p=>browser.update({page:p})});
let tree=browser.render();assert.ok(html(tree).includes('Forecast v1'));
find(tree,n=>n.props?.['aria-label']==='Evidence skill').props.onChange({target:{value:'HEC'}});tree=browser.render();
find(tree,n=>n.props?.['aria-label']==='Search evidence records').props.onChange({target:{value:'South'}});tree=browser.render();
find(tree,n=>n.type==='button'&&n.props.children?.[1]==='Export filtered rows').props.onClick();assert.equal(exported.length,1);assert.equal(exported[0].row,3);
find(tree,n=>n.props?.['aria-label']==='Evidence table').props.onClick();tree=browser.render();assert.equal(find(tree,n=>n.type?.name==='AnalyticsTable').props.rows[0].row,3);html(tree);
const missing=harness('AnalyticsRecordBrowser',{rows:[],sourceKey:'demand_input',sources:{demand_input:{success:false,version:'Missing v1',error:'Exact selected version missing'}},query:'',onQueryChange(){},onExport(){},page:0,onPageChange(){}});assert.ok(html(missing.render()).includes('Selected source unavailable'));
const tableRows=[{name:'Alpha',value:100},{name:'Beta',value:-2},{name:'Gamma',value:10}];
const table=harness('AnalyticsTable',{columns:[{key:'name',label:'Name'},{key:'value',label:'Value'}],rows:tableRows,pageSize:2});tree=table.render();
find(tree,n=>n.props?.['aria-label']==='Sort by Value').props.onClick();tree=table.render();let trs=findAll(tree,n=>n.type==='tr').slice(1);assert.equal(trs[0].props.children[0].props.children,'Beta');assert.equal(tableRows[0].name,'Alpha');
find(tree,n=>n.props?.['aria-label']==='Search detailed records').props.onChange({target:{value:'Gamma'}});tree=table.render();assert.ok(html(tree).includes('Gamma'));assert.ok(!html(tree).includes('Alpha'));
const diffs=[{key:'North|HEC|2026-11-02',status:'Changed',before:[{Values:10,Skill:'HEC'}],after:[{Values:15,Skill:'HEC'}]}];
const diff=harness('AnalyticsDiffBrowser',{rows:diffs,comparison:{before:'v1',after:'v2'},query:'',onQueryChange(){},onExport(){}});const diffHtml=html(diff.render());assert.ok(diffHtml.includes('av-field-changed'));assert.ok(diffHtml.includes('Baseline'));assert.ok(!diffHtml.includes('<pre'));
const duplicate=harness('AnalyticsDiffBrowser',{rows:[{...diffs[0],before:[{Values:10},{Values:20}]}],comparison:{},query:'',onQueryChange(){},onExport(){}});assert.ok(html(duplicate.render()).includes('no row pairing is assumed'));
const unavailable=harness('AnalyticsDiffBrowser',{rows:[],comparison:{status:'Unavailable'},query:'',onQueryChange(){},onExport(){}});assert.ok(html(unavailable.render()).includes('Comparison unavailable'));
let values={...A.defaults};const settings=harness('AnalyticsAssumptions',{value:values,onChange:v=>{values=v;settings.update({value:v});},onClose(){},onReset(){}});tree=settings.render();
find(tree,n=>n.props?.['aria-label']==='Recruitment ramp weeks').props.onChange({target:{value:'8'}});assert.equal(values.rampWeeks,8);tree=settings.render();
find(tree,n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});assert.equal(values.allowPartial,true);html(settings.render());
const issues=harness('AnalyticsIssueBrowser',{issues:[{source:'demand_input',row:1,kind:'Unmatched job time',detail:'North / W01'}],query:'',onQueryChange(){},onInspect:r=>exported=r,onExport(){}});tree=issues.render();find(tree,n=>n.type==='button'&&n.props.children?.[0]==='Inspect source record').props.onClick();assert.equal(exported.row,1);html(tree);
const run={id:1,name:'Run 1',scenario:'Plan',scope:{region:'All',skill:'HEC',patch:'All'},shock:{demandPct:10},result:{deficit:12,coverage:94,comparableCells:3}};
const cards=harness('AnalyticsRunCards',{runs:[run],onRemove:id=>exported=id,onApply:r=>exported=r,onExport(){}});tree=cards.render();find(tree,n=>n.type==='button'&&n.props.children?.[0]==='Load test settings').props.onClick();assert.equal(exported,run);find(tree,n=>n.props?.['aria-label']==='Remove Run 1').props.onClick();assert.equal(exported,1);html(tree);
console.log('PASS: source card/table switching, search/facets/export, missing-source state, non-mutating numeric sort, table search, highlighted/duplicate/unavailable differences, live settings, issue drilldown and pinned-run actions');

let scopeValue={region:'A',patch:'North',skill:'HEC',start:'2026-11-02',end:'2026-11-02'};
const scope=harness('AnalyticsScopeBar',{filter:scopeValue,weeks:['2026-11-02','2026-11-09'],regions:['A','B'],patches:['North'],canUndo:true,onChange:v=>{scopeValue=v;scope.update({filter:v});},onReset(){},onUndo(){}});
tree=scope.render();find(tree,n=>n.props?.['aria-label']==='Remove week filter').props.onClick();assert.equal(scopeValue.start,'');assert.equal(scopeValue.skill,'HEC');
tree=scope.render();find(tree,n=>n.props?.['aria-label']==='Remove region filter').props.onClick();assert.equal(scopeValue.region,'All');assert.equal(scopeValue.patch,'All');assert.equal(scopeValue.skill,'HEC');
scope.update({filter:{...scopeValue,start:'2026-11-02',end:'2026-11-02'}});tree=scope.render();assert.equal(find(tree,n=>n.props?.['aria-label']==='Previous available week').props.disabled,true);find(tree,n=>n.props?.['aria-label']==='Next available week').props.onClick();assert.equal(scopeValue.start,'2026-11-09');
tree=scope.render();find(tree,n=>n.props?.['aria-label']==='Edit analytics filters').props.onClick();tree=scope.render();find(tree,n=>n.props?.['aria-label']==='Quick from week').props.onChange({target:{value:'2026-11-16'}});assert.equal(scopeValue.end,'2026-11-16');html(scope.render());
const bench=harness('AnalyticsWorkbench',{title:'Investigate demand',panes:[{id:'patch',label:'Patch & skill',content:'Patch content'},{id:'week',label:'Weekly totals',content:'Weekly content'}]});tree=bench.render();assert.ok(html(tree).includes('Patch content'));find(tree,n=>n.props?.role==='tab'&&n.props.id==='analytics-workbench-tab-patch').props.onKeyDown({key:'End',preventDefault(){}});tree=bench.render();assert.ok(html(tree).includes('Weekly content'));assert.equal(find(tree,n=>n.props?.role==='tab'&&n.props['aria-selected']).props.id,'analytics-workbench-tab-week');
console.log('PASS: independent filter removal, dependent patch reset, week navigation boundaries, date-range validation and keyboard investigation tabs');

// Unit-check dialog lifecycle against a small DOM boundary; this is not browser QA.
{
  const handlers={},effects=[];let closed=0,restored=0,prevented=0,refIndex=0;
  const document={body:{style:{overflow:'auto'}},activeElement:{isConnected:true,focus(){restored++;}},addEventListener(k,fn){handlers[k]=fn;},removeEventListener(k){delete handlers[k];}};
  const first={getClientRects:()=>[{}],focus(){document.activeElement=first;}},last={getClientRects:()=>[{}],focus(){document.activeElement=last;}};
  const panel={querySelector:()=>first,querySelectorAll:()=>[first,last],contains:el=>el===first||el===last,focus(){document.activeElement=first;}};
  const fake={...React,useRef(initial){return {current:refIndex++===0?panel:initial};},useEffect(fn){effects.push(fn);}};
  const context={React:fake,window:{},document};vm.createContext(context);vm.runInContext(code,context);
  context.AnalyticsDrawer({title:'Evidence',onClose(){closed++;},children:null});const cleanup=effects[0]();
  assert.equal(document.body.style.overflow,'hidden');assert.equal(document.activeElement,first);
  document.activeElement=last;handlers.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented++;}});assert.equal(document.activeElement,first);
  handlers.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented++;}});assert.equal(document.activeElement,last);
  handlers.keydown({key:'Escape',preventDefault(){prevented++;}});assert.equal(closed,1);assert.equal(prevented,3);
  cleanup();assert.equal(document.body.style.overflow,'auto');assert.equal(restored,1);assert.equal(handlers.keydown,undefined);
  console.log('PASS: dialog initial focus, forward/backward focus containment, Escape close, scroll restoration and focus return');
}

{
  const week = '2026-11-23';
  const job = (Patch,Values)=>({Patch,Skill:'S',WorkCode:'X',Weekcomm:week,Values});
  const staff = (id,patch)=>({'Pay Id':id,Wmis:patch,Skill:'S',Status:'Active',Hours:37.5,Allocation:100,'Up Date':week});
  const bundle = (scenarioId,demand,roster)=>({scenarioId,sources:Object.fromEntries(Object.entries({
    geography_mapping:['A','B','C'].map(region=>({'Region Code':region,'Area Code':region+'1',Patch:region})),
    demand_input:demand,job_time_assumptions:['A','B','C'].map(patch=>job(patch,1)),
    resource_plan:roster,downtime_overlays_hours:[]
  }).map(([key,rows])=>[key,{success:true,rows,version:scenarioId+' '+key}]))});
  const baseline = bundle('Baseline',[job('A',47.5),job('B',57.5)],[staff(1,'A'),staff(2,'B')]);
  const selected = bundle('Selected',[job('A',37.5)],[staff(1,'A'),staff(3,'C')]);
  const V = {Trend:()=>null,Bars:()=>null,Waterfall:()=>null,Heatmap:()=>null,Donut:()=>null};
  const render = studioHarness('DecisionStudioOverview',{
    A,V,bundle:selected,baseline,baselineId:baseline.scenarioId,scenarioId:selected.scenarioId,
    data:A.extract(selected),baseData:A.extract(baseline),scenarios:{Baseline:{},Selected:{}},
    filter:{},assumptions:A.defaults,comparisonEnabled:true,geographyChanges:[]
  });
  let tree = render();
  const chart = find(tree,node=>node.type?.name==='DecisionStudioDemandTrend');
  assert.equal(chart.props.chart[0].capacity,75);
  assert.equal(chart.props.chart[0].demand,37.5);
  const filterToggle = tree=>find(tree,node=>node.props?.className==='ds-filter-toggle');
  const filterBody = tree=>find(tree,node=>node.props?.id===filterToggle(tree).props['aria-controls']);
  const planSelect = (tree,label)=>find(filterBody(tree),node=>node.props?.['aria-label']===label);
  assert.equal(filterToggle(tree).props['aria-expanded'],true);
  assert.equal(filterBody(tree).props.hidden,false);
  assert.equal(planSelect(tree,'Plan').props.value,'Selected');
  assert.equal(planSelect(tree,'Compare with').props.value,'Baseline');
  assert.ok(find(filterBody(tree),node=>node.type?.name==='DecisionStudioPeriodControls'));
  filterToggle(tree).props.onClick();
  tree = render();
  assert.equal(filterToggle(tree).props['aria-expanded'],false);
  assert.equal(filterBody(tree).props.hidden,true);
  assert.equal(find(tree,node=>node.type?.name==='DecisionStudioDemandTrend').props.chart[0].capacity,75);
  filterToggle(tree).props.onClick();
  tree = render();
  assert.equal(filterBody(tree).props.hidden,false);
  assert.equal(planSelect(tree,'Plan').props.value,'Selected');
  assert.equal(planSelect(tree,'Compare with').props.value,'Baseline');
  find(tree,node=>node.props?.['aria-label']==='Group by').props.onChange({target:{value:'geography'}});
  tree = render();
  const removed = find(tree,node=>node.type==='button' &&
    node.props.children?.[0]?.includes?.('Removed from selected plan'));
  assert.ok(removed);
  removed.props.onClick();
  tree = render();
  const removedDrawer = find(tree,node=>node.type?.name==='DecisionStudioEvidence');
  assert.equal(removedDrawer.props.bundle.scenarioId,'Baseline');
  const showRemoved = studioHarness('DecisionStudioEvidence',removedDrawer.props);
  assert.ok(html(showRemoved()).includes('Baseline resource_plan'));
  assert.ok(!html(showRemoved()).includes('Test a change'));
  find(tree,node=>node.type?.name==='DecisionStudioEvidence').props.onClose();
  tree = render();
  find(tree,node=>node.type==='button' && node.props.children==='Matrix').props.onClick();
  tree = render();
  const cellButtons = tree=>findAll(tree,node=>node.props?.className==='ds-matrix-cell');
  assert.equal(cellButtons(tree).filter(node=>node.props.tabIndex===0).length,1);
  const a = cellButtons(tree).find(node=>node.props['aria-label'].startsWith('Region A'));
  assert.ok(a.props['aria-label'].includes('+10 h'));
  let focused = false;
  const firstRow = {sectionRowIndex:0};
  firstRow.parentElement = {rows:[firstRow,{cells:[null,{querySelector:()=>({focus(){focused=true;}})}]}]};
  a.props.onKeyDown({
    key:'ArrowDown',preventDefault(){},
    currentTarget:{closest:()=>({cellIndex:1,parentElement:firstRow})}
  });
  assert.ok(focused);
  a.props.onClick();
  const drawer = find(render(),node=>node.type?.name==='DecisionStudioEvidence');
  const renderDrawer = studioHarness('DecisionStudioEvidence',drawer.props);
  const markup = html(renderDrawer());
  assert.match(markup,/ds-drill-result">\+10 h/);
  assert.match(markup,/<dt>Matched baseline<\/dt><dd>-10 h/);
  assert.match(markup,/<dt>Matched selected plan<\/dt><dd>0 h/);
  assert.match(markup,/<summary><strong>All metrics/);
  drawer.props.onClose();
  tree = render();
  const filter = find(tree,node=>node.type==='label' && node.props.className==='ds-shortfalls-toggle');
  assert.ok(html(filter).includes('Shortfall in either plan'));
  filter.props.children[0].props.onChange({target:{checked:true}});
  assert.equal(cellButtons(render()).length,2);
  find(render(),node=>node.type==='button' && node.props.children==='Swap rows and columns').props.onClick();
  assert.ok(html(render()).includes('<th scope="col">Month</th>'));
  console.log('PASS: full filter collapse, preserved plan selections, consistent overview totals, matched gap drawer and comparison shortfall filter');

  const secondWeek = '2026-12-07';
  const fixture = (name,hours)=>{
    const input = bundle(name,[job('A',20),job('B',25),{...job('A',30),Weekcomm:secondWeek}],
      [staff(1,'A'),staff(2,'B')]);
    input.sources.job_time_assumptions.rows.push({...job('A',1),Weekcomm:secondWeek});
    input.sources.downtime_overlays_hours.rows = [
      {patch:'A',skill:'S',metric:'Training',level2:'Classroom',weekcomm:week,values:hours},
      {patch:'A',skill:'S',metric:'Training',level2:'Classroom',weekcomm:secondWeek,values:6}
    ];
    return input;
  };
  const revisedPlan = fixture('Selected',4), earlierPlan = fixture('Baseline',2);
  const summary = input=>A.planningSummary(A.model(A.extract(input),{},A.defaults,{},true).rows);
  const report = summary(revisedPlan), before = summary(earlierPlan);
  const drawerProps = {A,V,format:String,gapLabel:String,assumptions:A.defaults,
    bundle:revisedPlan,baseline:earlierPlan,geographyChanges:[],onClose(){},
    metric:{report,before,title:'Planning horizon'}};
  const fteDrawer = studioHarness('DecisionStudioEvidence',{...drawerProps,metric:{...drawerProps.metric,key:'fte'}});
  const fteTimeline = find(fteDrawer(),node=>node.type?.name==='DecisionStudioMetricTimeline');
  const drawFte = studioHarness('DecisionStudioMetricTimeline',fteTimeline.props);
  const fteChart = find(drawFte(),node=>node.type?.name==='DecisionStudioResponsiveTrend');
  assert.equal(fteChart.props.data[0].selected,2);
  assert.equal(fteChart.props.data[1].key,'2026-12');
  assert.equal(fteChart.props.series.map(series=>series.key).join(','),'change');
  find(fteChart.props.tools,node=>node.type==='input' && node.props.type==='checkbox').props.onChange({target:{checked:true}});
  assert.equal(find(drawFte(),node=>node.type?.name==='DecisionStudioResponsiveTrend').props.series.map(series=>series.key).join(','),'selected,baseline');
  fteChart.props.onSelect(fteChart.props.data[1]);
  assert.ok(html(fteDrawer()).includes('December 2026'));
  assert.ok(html(fteDrawer()).includes('Skill and labour type in this period'));

  const downtimeDrawer = studioHarness('DecisionStudioEvidence',{...drawerProps,metric:{...drawerProps.metric,key:'downtime'}});
  const downtime = downtimeDrawer();
  assert.ok(html(downtime).includes('Roster availability'));
  const categoryChart = find(downtime,node=>node.type?.name==='DecisionStudioDowntimeCategories');
  const drawCategories = studioHarness('DecisionStudioDowntimeCategories',categoryChart.props);
  const bulletChart = find(drawCategories(),node=>node.type?.name==='DecisionStudioComparisonBars');
  assert.equal(bulletChart.props.bullet,true);
  const training = bulletChart.props.rows.find(row=>row.name==='Training');
  assert.equal(training.plan,10);
  assert.equal(training.baseline,8);
  assert.equal(training.change,2);
  const marker = html(studioHarness('DecisionStudioComparisonBars',bulletChart.props)());
  assert.ok(marker.includes('ds-baseline-marker'));
  const nonMatchingCategory = studioHarness('DecisionStudioDowntimeCategories',{...categoryChart.props,comparable:false});
  const noMarker = html(nonMatchingCategory());
  assert.ok(!noMarker.includes('ds-baseline-marker'));
  bulletChart.props.onSelect(training);
  const openedCategory = find(downtimeDrawer(),node=>node.type?.name==='DecisionStudioDowntimeCategories');
  assert.ok(html(studioHarness('DecisionStudioDowntimeCategories',openedCategory.props)()).includes('Classroom'));
  assert.equal(find(downtime,node=>node.type?.name==='DecisionStudioMetricTimeline'),undefined);
  find(downtime,node=>node.type==='button' && node.props.children==='Trend').props.onClick();
  const downtimeTimeline = find(downtimeDrawer(),node=>node.type?.name==='DecisionStudioMetricTimeline');
  const drawDowntime = studioHarness('DecisionStudioMetricTimeline',downtimeTimeline.props);
  const downtimeChart = find(drawDowntime(),node=>node.type?.name==='DecisionStudioResponsiveTrend');
  assert.equal(downtimeChart.props.data[0].core,75);
  assert.equal(downtimeChart.props.data[0].working,71);
  assert.equal(downtimeChart.props.data[0].baselineWorking,73);
  assert.equal(downtimeChart.props.series.filter(series=>series.bar).length,2);
  downtimeChart.props.onSelect(downtimeChart.props.data[1]);
  const records = html(downtimeDrawer());
  assert.ok(records.includes('December 2026'));
  assert.ok(records.includes('Selected resource_plan'));
  assert.ok(records.includes('Selected downtime_overlays_hours'));
  assert.ok(!records.includes('2026-11-23</td><td>4</td>'));

  const capacityDrawer = studioHarness('DecisionStudioEvidence',{...drawerProps,metric:{...drawerProps.metric,key:'capacity'}});
  const distribution = find(capacityDrawer(),node=>node.type?.name==='DecisionStudioCapacityDistribution');
  const drawCapacity = studioHarness('DecisionStudioCapacityDistribution',distribution.props);
  const capacityBars = find(drawCapacity(),node=>node.type?.name==='DecisionStudioComparisonBars');
  assert.equal(capacityBars.props.rows[0].name,'Region A');
  assert.equal(capacityBars.props.rows[0].change,-2);
  assert.ok(capacityBars.props.rows[0].share>0);
  const changedGeography = studioHarness('DecisionStudioCapacityDistribution',{
    ...distribution.props,geographyChanges:[{patch:'B'}]
  });
  assert.equal(find(changedGeography(),node=>node.type?.name==='DecisionStudioComparisonBars').props.rows
    .find(row=>row.name==='Region B').change,null);
  find(drawCapacity(),node=>node.type==='button' && node.props.children==='Selected plan').props.onClick();
  const donut = find(drawCapacity(),node=>node.type===V.Donut);
  assert.equal(A.sum(donut.props.segments,'value'),report.capacity);
  donut.props.onSelect(donut.props.segments.find(segment=>segment.name==='Region B'));
  assert.ok(html(capacityDrawer()).includes('Region B'));
  const planPart = A.planningBreakdown(report,'fte','breakdown',A.defaults).get(JSON.stringify(['S']));
  const basePart = A.planningBreakdown(before,'fte','breakdown',A.defaults).get(JSON.stringify(['S']));
  const deepDrawer = studioHarness('DecisionStudioBreakdownEvidence',{
    ...drawerProps,metric:{key:'fte',title:'Skill S',before,detail:{
      title:'Skill S',planValue:planPart.value,baseValue:basePart.value,value:planPart.value-basePart.value,
      planEvidence:planPart.evidence,baselineEvidence:basePart.evidence
    }}
  });
  const contribution = find(deepDrawer(),node=>node.type?.name==='DecisionStudioResponsiveTrend');
  assert.equal(contribution.props.data.find(row=>row.key==='2026-11-30').plan,null);
  contribution.props.onSelect(contribution.props.data.find(row=>row.key===secondWeek));
  const rosterRecords = find(deepDrawer(),node=>node.type?.name==='AnalyticsTable').props.rows;
  assert.ok(rosterRecords.length && rosterRecords.every(row=>row['Modeled week']===secondWeek));
  const productivity = studioHarness('DecisionStudioProductivity',{
    A,report,before,format:String,productivity:[{skill:'S',n:{jobsperday:'5'}}],
    baselineProductivity:[{skill:'S',n:{values:'10'}}]
  });
  assert.match(html(productivity()),/<th scope="row">S<\/th><td>5<\/td><td>Unavailable<\/td>/);
  const imbalancePlan = fixture('Selected',4);
  imbalancePlan.sources.geography_mapping.rows[1]['Region Code'] = 'A';
  imbalancePlan.sources.demand_input.rows[0].Values = 50;
  imbalancePlan.sources.demand_input.rows[1].Values = 10;
  const renderGap = studioHarness('DecisionStudioMetricTimeline',{
    A,V,measure:'gap',report:summary(imbalancePlan),assumptions:A.defaults,format:String,onSelect(){}
  });
  const gapChart = find(renderGap(),node=>node.type?.name==='DecisionStudioResponsiveTrend');
  assert.equal(gapChart.props.data[0].selected,11);
  assert.equal(gapChart.props.data[0].grossMarker,-16.5);
  assert.ok(gapChart.props.series.some(series=>series.marker));
  assert.ok(gapChart.props.series.some(series=>series.signedColors));
  const finalBundle = {mode:'final_data',scenarioId:'Selected',finalData:{
    version:'NOV 2026 V2',regions:['A'],areaCodes:['A1'],patches:['A'],periods:['W'],weeks:[week],
    combos:[['HEC','HEC','FTE','','FTE'],['HEC','HEC','W1','Repair','Demand Hours']],
    rows:[[0,0,0,0,2,0,0],[0,1,0,0,42,0,0]]
  }};
  const finalData = A.extract(finalBundle);
  const renderFinal = studioHarness('DecisionStudioOverview',{
    A,V,bundle:finalBundle,scenarioId:'Selected',data:finalData,baseData:A.extract(null),scenarios:{Selected:{}},
    filter:{},assumptions:A.defaults,comparisonEnabled:false,geographyChanges:[]
  });
  const allMeasures = find(renderFinal(),node=>node.type==='label' && node.props.className==='ds-shortfalls-toggle');
  assert.ok(html(allMeasures).includes('All 7 measures'));
  allMeasures.props.children[0].props.onChange({target:{checked:true}});
  assert.ok(!html(renderFinal()).includes('Forecast jobs'));
  find(renderFinal(),node=>node.type==='button' && node.props.children==='Matrix').props.onClick();
  assert.ok(!html(renderFinal()).includes('Forecast jobs'));
  const finalSummary = summary(finalBundle);
  const renderFinalDrawer = studioHarness('DecisionStudioEvidence',{
    ...drawerProps,bundle:finalBundle,baseline:null,metric:{key:'demand',report:finalSummary,title:'Planning horizon'}
  });
  const details = html(renderFinalDrawer());
  assert.ok(details.includes('Required hours by work code and week'));
  assert.ok(!details.includes('Duration ('));
  assert.ok(!details.includes('>Jobs<'));
  find(renderFinalDrawer(),node=>node.type==='button'
    && Array.isArray(node.props.children) && node.props.children.includes('Final plan records')).props.onClick();
  const finalRecords = html(renderFinalDrawer());
  assert.ok(finalRecords.includes('Scenario version · NOV 2026 V2'));
  assert.ok(finalRecords.includes('Plan row'));
  const renderFinalFte = studioHarness('DecisionStudioEvidence',{
    ...drawerProps,bundle:finalBundle,baseline:null,metric:{key:'fte',report:finalSummary,title:'Planning horizon'}
  });
  assert.ok(!html(renderFinalFte()).includes('Eligible people'));
  console.log('PASS: scoped FTE trends, downtime hours and baseline comparison, and capacity distribution record drilldown');
}
