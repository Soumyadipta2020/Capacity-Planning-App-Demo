/* JSX/runtime rendering check; this does not replace visual browser QA. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const babel=require('../.cache/analytics-qa/node_modules/@babel/core');
const preset=require('../.cache/analytics-qa/node_modules/@babel/preset-react');
const React=require('../.cache/analytics-qa/node_modules/react');
const {renderToStaticMarkup}=require('../.cache/analytics-qa/node_modules/react-dom/server');
const A=require('../static/analytics_engine.js');
const F=require('../static/forecast_analytics_engine.js');
const bundle=JSON.parse(fs.readFileSync('.cache/analytics-live-fixture.json','utf8'));
const jsx=babel.transformSync(fs.readFileSync('static/analytics_ui.js','utf8'),{presets:[[preset,{runtime:'classic'}]]}).code;
const chartJsx=babel.transformSync(fs.readFileSync('static/analytics_charts.js','utf8'),{presets:[[preset,{runtime:'classic'}]]}).code;
const detailsJsx=babel.transformSync(fs.readFileSync('static/analytics_details.js','utf8'),{presets:[[preset,{runtime:'classic'}]]}).code;
const forecastJsx=babel.transformSync(fs.readFileSync('static/forecast_analytics_ui.js','utf8'),{presets:[[preset,{runtime:'classic'}]]}).code;
const scenarios={[bundle.scenarioId]:{id:bundle.scenarioId,inputs:{}}};
const investigations={drivers:['demand','capacity','downtime','changes','quality','jobtime','reconcile','monthly'],readiness:['deficits','recruitment','support','timing','commitments','workforce'],stress:['stress','sensitivity','stability'],choices:['actions','target']};
let count=0;
function render(area,view,extra={}){
    let stateIndex=0;
    const override={2:bundle,3:bundle,7:area,8:view,20:false,23:"investigate",...extra};
    const fake={...React,useState(initial){const i=stateIndex++;return [Object.hasOwn(override,i)?override[i]:typeof initial==='function'?initial():initial,()=>{}];},useEffect(){},useMemo(fn){return fn();},useRef(value){return {current:value};}};
    const context={React:fake,window:{CapacityAnalytics:A,CapacityForecast:F},console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Blob};
    vm.createContext(context);vm.runInContext(chartJsx,context);vm.runInContext(detailsJsx,context);vm.runInContext(forecastJsx,context);vm.runInContext(jsx,context);
    const tree=context.window.AnalyticsWorkspace({scenarios,selectedScenarioId:bundle.scenarioId,inputsState:{}});
    const html=renderToStaticMarkup(tree);
    assert.ok(html.includes('Decision Studio'));
    assert.ok(!html.includes('>NaN<')&&!html.includes('>Infinity<'));
    return html;
}
for(const [area,views] of Object.entries(investigations))for(const view of views){const html=render(area,view);assert.ok(html.length>5000);count++;console.log(`Rendered ${area}/${view}: ${html.length} bytes`);}
render('drivers','demand',{12:{title:'Source rows',rows:A.extract(bundle).facts.demand_input.slice(0,3)}});
render('drivers','changes',{12:{title:'Changes',diff:[{key:'one',status:'Changed',before:[{Values:1}],after:[{Values:2}]}]}});
render('drivers','quality',{12:{title:'Issues',issues:A.extract(bundle).issues.slice(0,3)}});
render('stress','stress',{15:true});
const d=A.extract(bundle),m=A.model(d);
assert.equal(A.sum(d.facts.demand_input,'jobs'),33828);
assert.equal(d.facts.demand_input.filter(r=>r.matched).reduce((s,r)=>s+r.jobs,0),6289);
assert.equal(d.issues.filter(r=>r.source==='demand_input'&&r.kind==='Region conflict').length,522);
assert.equal(A.compareSources(bundle,bundle).every(r=>r.status==='Unchanged'),true);
assert.deepEqual(A.model(d),m);
console.log(`PASS: ${count} investigations, source/diff/issue dialogs, assumptions panel and real fixture reconciliation`);

// Exercise the actual event handlers without claiming browser interaction coverage.
{
    let stateIndex=0,refIndex=0;const refs=[];const state=new Map(Object.entries({2:bundle,3:bundle,7:'drivers',8:'demand',20:false,23:'investigate'}).map(([k,v])=>[Number(k),v]));
    const fake={...React,useState(initial){const i=stateIndex++;if(!state.has(i))state.set(i,typeof initial==='function'?initial():initial);return [state.get(i),v=>state.set(i,typeof v==='function'?v(state.get(i)):v)];},useEffect(){},useMemo(fn){return fn();},useRef(value){const i=refIndex++;return refs[i]||(refs[i]={current:value});}};
    const context={React:fake,window:{CapacityAnalytics:A},console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Blob};vm.createContext(context);vm.runInContext(chartJsx,context);vm.runInContext(detailsJsx,context);vm.runInContext(jsx,context);
    let tree;const rerender=()=>{stateIndex=0;refIndex=0;tree=context.window.AnalyticsWorkspace({scenarios,selectedScenarioId:bundle.scenarioId,inputsState:{}});return tree;};
    function find(predicate,node=tree){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const hit=find(predicate,child);if(hit)return hit;}return null;}
    rerender();find(n=>n.props?.['aria-label']==='Analytics skill').props.onChange({target:{value:'KAC'}});rerender();assert.equal(state.get(9).skill,'KAC');
    const resetBtn=()=>find(n=>n.props?.title==='Reset filters to default'||n.props?.title==='Reset all filters to defaults');
    const week=d.weeks[2];
    find(n=>n.props?.title==='Demand trajectory').props.onSelect({key:week});rerender();assert.equal(state.get(9).start,week);assert.equal(state.get(12),null);
    resetBtn().props.onClick();rerender();assert.equal(state.get(9).start,'');assert.equal(state.get(9).skill,'All');
    find(n=>n.props?.title==='Demand trajectory').props.onSelect({key:week});rerender();find(n=>n.props?.title==='Demand trajectory').props.onSelect({key:week});rerender();assert.equal(state.get(9).start,'');
    const workbench=find(n=>n.type?.name==='AnalyticsWorkbench'&&n.props.title==='Investigate demand');assert.equal(workbench.props.panes.length,6);
    const weekly=workbench.props.panes.find(p=>p.id==='weekly').content;const focus=weekly.props.columns.find(c=>c.key==='focus').render(weekly.props.rows[0]);focus.props.onClick({stopPropagation(){}});rerender();assert.equal(state.get(9).start,weekly.props.rows[0].name);assert.equal(state.get(12),null);resetBtn().props.onClick();rerender();
    find(n=>n.type==='button'&&n.props['aria-label']==='Test what could change').props.onClick();rerender();assert.equal(state.get(8),'stress');
    find(n=>n.props?.['aria-label']==='Demand change %').props.onChange({target:{value:'25'}});rerender();assert.equal(state.get(11).demandPct,25);
    find(n=>n.type==='button'&&n.props.children==='Pin this run').props.onClick();rerender();assert.equal(state.get(13).length,1);assert.equal(state.get(13)[0].shock.demandPct,25);
    find(n=>n.type==='button'&&n.props.children==='Reset shocks').props.onClick();rerender();assert.equal(state.get(11).demandPct,0);assert.equal(state.get(13)[0].shock.demandPct,25);
    find(n=>n.props?.['aria-label']==='Evidence source').props.onChange({target:{value:'job_time_assumptions'}});rerender();
    find(n=>n.type==='button'&&n.props.children==='Inspect rows').props.onClick();rerender();assert.ok(state.get(12).rows.length>0);
    find(n=>n.type?.name==='AnalyticsRecordBrowser').props.onQueryChange('W01');rerender();assert.equal(state.get(16),'W01');
    find(n=>n.type?.name==='AnalyticsDrawer').props.onClose();rerender();assert.equal(state.get(12),null);
    console.log('PASS: actual handlers for skill scope, investigation navigation, shock input/reset, immutable pinned run and source-evidence search/close');
}

// Verify that the initial page has one focused panel and navigation preserves context.
{
    let stateIndex=0,refIndex=0;const refs=[];
    const state=new Map([[2,bundle],[3,bundle]]);
    const fake={...React,useState(initial){const i=stateIndex++;if(!state.has(i))state.set(i,typeof initial==='function'?initial():initial);return [state.get(i),v=>state.set(i,typeof v==='function'?v(state.get(i)):v)];},useEffect(){},useMemo(fn){return fn();},useRef(value){const i=refIndex++;return refs[i]||(refs[i]={current:value});}};
    const context={React:fake,window:{CapacityAnalytics:A,CapacityForecast:F},console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Blob};
    vm.createContext(context);for(const code of [chartJsx,detailsJsx,forecastJsx,jsx])vm.runInContext(code,context);
    let tree;const render=(extra={})=>{stateIndex=0;refIndex=0;tree=context.window.AnalyticsWorkspace({scenarios,selectedScenarioId:bundle.scenarioId,inputsState:{},...extra});return tree;};
    function find(p,node=tree){if(!node||typeof node!=='object')return null;if(p(node))return node;for(const c of React.Children.toArray(node.props?.children)){const found=find(p,c);if(found)return found;}return null;}
    const navButton=id=>find(n=>n.type==='button'&&n.props['aria-controls']==='analytics-presentation-panel'&&React.Children.toArray(n.props.children)[0]===({summary:'Plan summary',workload:'Upcoming workload',checks:'Data readiness',investigate:'Investigations'})[id]);
    render();assert.ok(find(n=>n.type?.name==='AnalyticsPlanSummary'));assert.equal(find(n=>n.type?.name==='AnalyticsWorkloadOutlook'),null);
    assert.equal(find(n=>n.props?.['aria-label']==='Analytics areas'),null);
    assert.equal(find(n=>n.props?.['aria-label']==='Analytics skill'),null,'advanced filters start collapsed');
    assert.ok(renderToStaticMarkup(tree).includes('What do these metrics mean?'));
    navButton('workload').props.onClick();render();
    assert.equal(find(n=>n.type?.name==='AnalyticsPlanSummary'),null);
    assert.equal(find(n=>n.type?.name==='AnalyticsWorkloadOutlook').props.mode,'workload');
    const workload=find(n=>n.type?.name==='AnalyticsWorkloadOutlook');
    workload.props.onDateChange('2026-11-23');render();
    const compact=context.AnalyticsWorkloadOutlook(find(n=>n.type?.name==='AnalyticsWorkloadOutlook').props);
    assert.equal(find(n=>n.props?.className==='av-plan-help av-readiness-checks',compact),null,'readiness details have their own view');
    navButton('checks').props.onClick();render();
    const checks=find(n=>n.type?.name==='AnalyticsWorkloadOutlook');assert.equal(checks.props.mode,'checks');assert.equal(checks.props.planningDate,'2026-11-23');
    const checkTree=context.AnalyticsWorkloadOutlook(checks.props);
    assert.equal(find(n=>n.props?.className==='av-plan-metrics',checkTree),null,'workload cards do not repeat in readiness');
    navButton('summary').props.onClick();render();
    find(n=>n.type?.name==='AnalyticsPlanSummary').props.onExplore('readiness','deficits');render();
    assert.equal(find(n=>n.type?.name==='AnalyticsPlanSummary'),null);assert.ok(find(n=>n.props?.['aria-label']==='Analytics areas'));
    assert.equal(state.get(8),'deficits');
    navButton('summary').props.onClick();render();assert.equal(state.get(8),'deficits','returning to summary preserves investigation choice');
    navButton('investigate').props.onClick();render();assert.equal(state.get(8),'deficits');
    state.clear();state.set(2,bundle);state.set(3,bundle);render({baselineScenarioId:'deleted-scenario',comparisonScenarioId:'deleted-scenario'});assert.equal(state.get(0),bundle.scenarioId);assert.equal(state.get(1),bundle.scenarioId);
    console.log('PASS: focused summary/workload/readiness/investigation views, collapsed filters, preserved planning date and direct drilldowns');
}
