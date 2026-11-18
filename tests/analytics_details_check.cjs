/* Secondary-surface checks using actual component event handlers and source rows. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const babel=require('../.cache/analytics-qa/node_modules/@babel/core');
const preset=require('../.cache/analytics-qa/node_modules/@babel/preset-react');
const React=require('../.cache/analytics-qa/node_modules/react');
const {renderToStaticMarkup}=require('../.cache/analytics-qa/node_modules/react-dom/server');
const A=require('../static/analytics_engine.js');
const code=['static/analytics_details.js','static/analytics_ui.js'].map(f=>babel.transformSync(fs.readFileSync(f,'utf8'),{presets:[[preset,{runtime:'classic'}]]}).code).join('\n');
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
const bench=harness('AnalyticsWorkbench',{title:'Investigate demand',panes:[{id:'patch',label:'Patch & skill',content:'Patch content'},{id:'week',label:'Weekly totals',content:'Weekly content'}]});tree=bench.render();assert.ok(html(tree).includes('Patch content'));find(tree,n=>n.props?.role==='tab'&&n.props.children[0]==='Patch & skill').props.onKeyDown({key:'End',preventDefault(){}});tree=bench.render();assert.ok(html(tree).includes('Weekly content'));assert.equal(find(tree,n=>n.props?.role==='tab'&&n.props['aria-selected']).props.id,'analytics-workbench-tab-week');
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
