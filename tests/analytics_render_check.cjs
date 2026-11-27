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
    const override={2:bundle,3:bundle,7:area,8:view,20:"investigate",...extra};
    const fake={...React,useState(initial){const i=stateIndex++;return [Object.hasOwn(override,i)?override[i]:typeof initial==='function'?initial():initial,()=>{}];},useEffect(){},useMemo(fn){return fn();},useRef(value){return {current:value};}};
    const context={React:fake,window:{CapacityAnalytics:A,CapacityForecast:F},console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Blob};
    vm.createContext(context);vm.runInContext(chartJsx,context);vm.runInContext(detailsJsx,context);vm.runInContext(forecastJsx,context);vm.runInContext(jsx,context);
    const tree=context.window.AnalyticsWorkspace({scenarios,selectedScenarioId:bundle.scenarioId,inputsState:{}});
    const html=renderToStaticMarkup(tree);
    assert.ok(html.includes('Back to capacity plan'));
    assert.ok(!html.includes('>NaN<')&&!html.includes('>Infinity<'));
    return html;
}
for(const [area,views] of Object.entries(investigations))for(const view of views){const html=render(area,view);assert.ok(html.length>5000);count++;console.log(`Rendered ${area}/${view}: ${html.length} bytes`);}
render('drivers','demand',{12:{title:'Source rows',rows:A.extract(bundle).facts.demand_input.slice(0,3)}});
render('drivers','changes',{12:{title:'Changes',diff:[{key:'one',status:'Changed',before:[{Values:1}],after:[{Values:2}]}]}});
render('drivers','quality',{12:{title:'Issues',issues:A.extract(bundle).issues.slice(0,3)}});
const d=A.extract(bundle),m=A.model(d);
assert.equal(A.sum(d.facts.demand_input,'jobs'),33828);
assert.equal(d.facts.demand_input.filter(r=>r.matched).reduce((s,r)=>s+r.jobs,0),6289);
assert.equal(d.issues.filter(r=>r.source==='demand_input'&&r.kind==='Region conflict').length,522);
assert.equal(A.compareSources(bundle,bundle).every(r=>r.status==='Unchanged'),true);
assert.deepEqual(A.model(d),m);
console.log(`PASS: ${count} investigation renderers, source/diff/issue dialogs and real fixture reconciliation`);

// Exercise the actual event handlers without claiming browser interaction coverage.
{
    let stateIndex=0,refIndex=0;const refs=[];const state=new Map(Object.entries({2:bundle,3:bundle,7:'drivers',8:'demand',20:'investigate'}).map(([k,v])=>[Number(k),v]));
    const fake={...React,useState(initial){const i=stateIndex++;if(!state.has(i))state.set(i,typeof initial==='function'?initial():initial);return [state.get(i),v=>state.set(i,typeof v==='function'?v(state.get(i)):v)];},useEffect(){},useMemo(fn){return fn();},useRef(value){const i=refIndex++;return refs[i]||(refs[i]={current:value});}};
    const context={React:fake,window:{CapacityAnalytics:A},console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Blob};vm.createContext(context);vm.runInContext(chartJsx,context);vm.runInContext(detailsJsx,context);vm.runInContext(jsx,context);
    let tree;const rerender=()=>{stateIndex=0;refIndex=0;tree=context.window.AnalyticsWorkspace({scenarios,selectedScenarioId:bundle.scenarioId,inputsState:{}});return tree;};
    function find(predicate,node=tree){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const hit=find(predicate,child);if(hit)return hit;}return null;}
    rerender();
    const week=d.weeks[2];
    find(n=>n.props?.title==='Demand trajectory').props.onSelect({key:week});rerender();assert.equal(state.get(9).start,week);assert.equal(state.get(12),null);
    find(n=>n.props?.title==='Demand trajectory').props.onSelect({key:week});rerender();assert.equal(state.get(9).start,'');
    const workbench=find(n=>n.type?.name==='AnalyticsWorkbench'&&n.props.title==='Investigate demand');assert.equal(workbench.props.panes.length,6);
    const weekly=workbench.props.panes.find(p=>p.id==='weekly').content;const focus=weekly.props.columns.find(c=>c.key==='focus').render(weekly.props.rows[0]);focus.props.onClick({stopPropagation(){}});rerender();assert.equal(state.get(9).start,weekly.props.rows[0].name);assert.equal(state.get(12),null);
    find(n=>n.props?.title==='Demand trajectory').props.onSelect({key:weekly.props.rows[0].name});rerender();
    find(n=>n.type==='button'&&n.props['aria-label']==='Test what could change').props.onClick();rerender();assert.equal(state.get(8),'stress');
    find(n=>n.props?.['aria-label']==='Demand change %').props.onChange({target:{value:'25'}});rerender();assert.equal(state.get(11).demandPct,25);
    find(n=>n.type==='button'&&n.props.children==='Pin this run').props.onClick();rerender();assert.equal(state.get(13).length,1);assert.equal(state.get(13)[0].shock.demandPct,25);
    find(n=>n.type==='button'&&n.props.children==='Reset shocks').props.onClick();rerender();assert.equal(state.get(11).demandPct,0);assert.equal(state.get(13)[0].shock.demandPct,25);
    find(n=>n.props?.['aria-label']==='Evidence source').props.onChange({target:{value:'job_time_assumptions'}});rerender();
    find(n=>n.type==='button'&&n.props.children==='Inspect rows').props.onClick();rerender();assert.ok(state.get(12).rows.length>0);
    find(n=>n.type?.name==='AnalyticsRecordBrowser').props.onQueryChange('W01');rerender();assert.equal(state.get(15),'W01');
    find(n=>n.type?.name==='AnalyticsDrawer').props.onClose();rerender();assert.equal(state.get(12),null);
    console.log('PASS: investigation handlers for period scope, navigation, shock input/reset, immutable pinned run and evidence search');
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
    const navButton=id=>{
      const heading=find(n=>n.type?.name==='DecisionStudioNavigation');
      const nav=context.DecisionStudioNavigation(heading.props);
      const labels={summary:'Back to capacity plan'};
      return find(n=>n.type==='button'&&(n.props['aria-label']||n.props.children)===labels[id],nav);
    };
    render();assert.ok(find(n=>n.type?.name==='DecisionStudioOverview'));assert.equal(find(n=>n.type?.name==='AnalyticsWorkloadOutlook'),null);
    assert.equal(find(n=>n.props?.['aria-label']==='Analytics areas'),null);
    const markup=renderToStaticMarkup(tree);
    assert.ok(markup.includes('Capacity plan'));
    assert.ok(markup.includes('diff-filter-card'));
    assert.ok(markup.includes('ds-kpi-icon'));
    assert.ok(markup.includes('ds-chart-icon'));
    assert.ok(markup.includes('Capacity imbalance uses assessed patches'));
    assert.ok(markup.includes('Assessed locations only'));
    assert.ok(markup.includes('class="ds-outlook-grid"'));
    assert.ok(!markup.includes('<h1'));
    assert.ok(!markup.includes('Advanced analytics'));
    assert.ok(!markup.includes('Model Assumptions'));
    assert.ok(!markup.includes('aria-label="Planning views"'));
    let destination;
    render({presentation:'summary',onPresentationChange:value=>{destination=value;}});
    find(n=>n.type?.name==='DecisionStudioOverview').props.onImbalance();
    assert.equal(destination,'imbalance');
    render({presentation:destination,onPresentationChange:value=>{destination=value;}});
    context.React = React;
    const imbalance = renderToStaticMarkup(tree);
    context.React = fake;
    assert.ok(imbalance.includes('<h2>Capacity imbalance</h2>'));
    assert.ok(imbalance.includes('ds-imbalance-matrix'));
    navButton('summary').props.onClick();
    assert.equal(destination,'summary');
    render();
    find(n=>n.type?.name==='DecisionStudioOverview').props.onChecks();render();
    const checks=find(n=>n.type?.name==='AnalyticsWorkloadOutlook');assert.equal(checks.props.mode,'checks');
    const checkTree=context.AnalyticsWorkloadOutlook(checks.props);
    assert.equal(find(n=>n.props?.className==='av-plan-metrics',checkTree),null,'workload cards do not repeat in readiness');
    navButton('summary').props.onClick();render();
    assert.ok(find(n=>n.type?.name==='DecisionStudioOverview'));
    state.clear();
    render({scenarios:{...scenarios,SharedBaseline:{inputs:{demand_input:'baseline.csv'}}},baselineScenarioId:'SharedBaseline'});
    assert.equal(state.get(0),bundle.scenarioId);
    assert.equal(state.get(1),'SharedBaseline');
    state.clear();
    render({selectedScenarioId:'deleted-scenario',inputsState:{demand_input:'app-selected.csv'}});
    assert.equal(state.get(0),'__draft');
    state.clear();
    render({scenarios:{...scenarios,Empty:{inputs:{}}},selectedScenarioId:'Empty',
      inputsState:{demand_input:'app-selected.csv'}});
    assert.equal(state.get(0),'__draft');
    console.log('PASS: simplified Decision Studio, filter and icon markup, data readiness, shared scenario and draft selection');
}

{
    const states = [], refs = [];
    let stateIndex = 0, refIndex = 0;
    const fake = {...React,
        useState(initial) {
            const index = stateIndex++;
            if (!(index in states)) states[index] = typeof initial==='function' ? initial() : initial;
            return [states[index],value=>{states[index] = typeof value==='function' ? value(states[index]) : value;}];
        },
        useRef(initial) {
            const index = refIndex++;
            return refs[index] || (refs[index] = {current:initial});
        },
        useEffect(){},useMemo:fn=>fn(),useCallback:fn=>fn
    };
    const context = vm.createContext({React:fake,window:{},document:{getElementById:()=>null},AnalyticsWorkspace:()=>null,console});
    vm.runInContext(babel.transformSync(fs.readFileSync('static/react_app.js','utf8'),{presets:[[preset,{runtime:'classic'}]]}).code,context);
    const renderApp = () => {stateIndex=0;refIndex=0;return context.ModernCapacityApp();};
    function find(node,predicate) {
        if (!node || typeof node!=='object') return null;
        if (predicate(node)) return node;
        for (const child of React.Children.toArray(node.props?.children)) {
            const match = find(child,predicate);
            if (match) return match;
        }
        return null;
    }
    const workspace = tree=>find(tree,node=>node.type===context.AnalyticsWorkspace);
    const navigationItem = (tree,label)=>find(tree,node=>node.type==='button' &&
        find(node,child=>child.type==='span' && child.props.children===label));
    let app = renderApp();
    navigationItem(app,'Decision Studio').props.onClick();
    app = renderApp();
    assert.equal(workspace(app).props.presentation,'summary');
    const submenu = find(app,node=>node.props?.id==='capacity-navigation-decision_studio');
    navigationItem(submenu,'Imbalances').props.onClick({stopPropagation(){}});
    app = renderApp();
    assert.equal(workspace(app).props.presentation,'imbalance');
    assert.equal(navigationItem(app,'Imbalances').props['aria-current'],'page');
    workspace(app).props.onPresentationChange('summary');
    app = renderApp();
    assert.equal(navigationItem(app,'Capacity Drilldown').props['aria-current'],'page');
    navigationItem(app,'Inputs & Parameters').props.onClick();
    app = renderApp();
    assert.ok(find(app,node=>node.props?.id==='capacity-navigation-inputs'));
    assert.equal(navigationItem(app,'Scenario & Inputs').props['aria-current'],'page');
    console.log('PASS: Decision Studio sidebar opens and highlights Capacity Imbalance, with the same submenu behavior as Inputs & Parameters');
}
