const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const babel=require('../.cache/analytics-qa/node_modules/@babel/core');
const preset=require('../.cache/analytics-qa/node_modules/@babel/preset-react');
const React=require('../.cache/analytics-qa/node_modules/react');
const {renderToStaticMarkup}=require('../.cache/analytics-qa/node_modules/react-dom/server');
const code=['analytics_charts.js','analytics_details.js'].map(file=>
  babel.transformSync(fs.readFileSync('static/'+file,'utf8'),{presets:[[preset,{runtime:'classic'}]]}).code).join('\n');
function harness(name,props){let index=0;const states=[];const fake={...React,useState(initial){const i=index++;if(!(i in states))states[i]=initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];}};const context={React:fake,window:{}};vm.createContext(context);vm.runInContext(code,context);return {render(){index=0;return context.window.AnalyticsViz[name](props);}};}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const hit=find(child,predicate);if(hit)return hit;}return null;}
function safe(tree){const html=renderToStaticMarkup(tree);assert.ok(!html.includes('NaN')&&!html.includes('Infinity'));return html;}
const points=[{key:'2026-11-02',label:'11-02',jobs:10},{key:'2026-11-09',label:'11-09',jobs:null},{key:'2026-11-16',label:'11-16',jobs:20}];let selected;
const trend=harness('Trend',{title:'Demand test',data:points,series:[{key:'jobs',label:'Jobs'}],unit:'jobs',onSelect:r=>selected=r});let tree=trend.render();safe(tree);
find(tree,n=>n.props?.['aria-label']?.startsWith('11-02:')).props.onKeyDown({key:'Enter',preventDefault(){}});assert.equal(selected.key,points[0].key);
find(tree,n=>n.type==='button'&&n.props.children?.[1]==='Jobs').props.onClick();tree=trend.render();assert.equal(find(tree,n=>n.type==='button'&&n.props.children?.[1]==='Jobs').props['aria-pressed'],false);safe(tree);
const heat=harness('Heatmap',{title:'Pressure',rows:[{region:'A',skill:'HEC',week:'2026-11-02',gap:null},{region:'A',skill:'HEC',week:'2026-11-09',gap:-12,coverage:80}],onSelect:r=>selected=r});tree=heat.render();const html=safe(tree);assert.ok(html.includes('unavailable evidence'));assert.ok(html.includes('−'));find(tree,n=>n.props?.['aria-label']?.includes('-12 hours')).props.onClick();assert.equal(selected.gap,-12);
for(const [name,props] of [['Trend',{title:'Empty trend',data:[],series:[]}],['Donut',{title:'Empty ring',segments:[{name:'No data',value:0}],center:'—'}],['Waterfall',{title:'Empty bridge',steps:[]}],['Bars',{title:'Missing values',rows:[{name:'Missing',value:null}]}],['Heatmap',{title:'Empty pressure',rows:[]}]])safe(harness(name,props).render());
const ring=harness('Donut',{title:'Evidence',segments:[{name:'Matched',value:20},{name:'Missing',value:80}],center:'20%',onSelect:r=>selected=r});tree=ring.render();safe(tree);find(tree,n=>n.type==='circle'&&n.props['aria-label']?.startsWith('Matched')).props.onClick();assert.equal(selected.name,'Matched');
const signedTrend=harness('Trend',{
  title:'Net gap',signed:true,plotWidth:420,data:[{key:'Nov',gap:-12},{key:'Dec',gap:null},{key:'Jan',gap:8}],
  series:[{key:'gap',label:'Net gap',color:'#178'}],onSelect:r=>selected=r
});
const signedTree=signedTrend.render();
safe(signedTree);
const zeroGuide=find(signedTree,n=>n.type==='line' && n.props.className==='av-chart-zero').props.y1;
const negative=find(signedTree,n=>n.type==='circle' && n.props.cy>zeroGuide);
const positive=find(signedTree,n=>n.type==='circle' && n.props.cy<zeroGuide);
assert.ok(negative && positive,'Missing middle period breaks the signed series into isolated points on opposite sides of zero');
find(signedTree,n=>n.props?.['aria-label']?.startsWith('Nov:')).props.onKeyDown({key:'Enter',preventDefault(){}});
assert.equal(selected.key,'Nov');
const grouped = harness('Trend',{
  title:'Working hours',data:[{key:'Nov',selected:70,baseline:68,roster:90}],selectedKey:'Nov',
  series:[{key:'selected',label:'Selected',color:'#168',bar:true},
    {key:'baseline',label:'Baseline',color:'#da6',bar:true},{key:'roster',label:'Roster',color:'#579'}]
}).render();
const planBar = find(grouped,n=>n.type==='rect' && n.props.fill==='#168');
const baselineBar = find(grouped,n=>n.type==='rect' && n.props.fill==='#da6');
assert.ok(planBar.props.x+planBar.props.width<=baselineBar.props.x,'Plan and baseline bars sit side by side');
const planMarker = find(grouped,n=>n.props?.className==='av-chart-point' && n.props.fill==='#168');
assert.equal(planMarker.props.cx,planBar.props.x+planBar.props.width/2);
console.log('PASS: chart rendering, missing/empty values, keyboard drilldown, legend toggles, heatmap selection and ring evidence selection');
