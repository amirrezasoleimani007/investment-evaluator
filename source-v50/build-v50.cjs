const fs=require('fs'),path=require('path'),vm=require('vm');
const base=__dirname;
let html=fs.readFileSync(path.join(base,'Atieh49.html'),'utf8');
let patches=[];
function once(from,to,label){const count=html.split(from).length-1;if(count!==1)throw Error(`${label}: expected 1 match, got ${count}`);html=html.replace(from,to);patches.push(label);}
function scoped(start,end,fn,label){let a=html.indexOf(start),b=html.indexOf(end,a+start.length);if(a<0||b<0)throw Error(label);html=html.slice(0,a)+fn(html.slice(a,b))+html.slice(b);patches.push(label);}
const components=fs.readFileSync(path.join(base,'v50-components.js'),'utf8');
new vm.Script(components);
once('function TA(){',''+components+'\nfunction TA(){','React UI components');
once('if(typeof e==`number`&&!Number.isFinite(e))throw Error(`پرونده دارای عدد نامعتبر است.`);return e','if(typeof e==`number`&&!Number.isFinite(e)){if(e===Infinity||e===-Infinity)return{__ipsType:`InfiniteBoundary`,sign:e===Infinity?1:-1};throw Error(`پرونده دارای عدد نامعتبر است.`)}return e','Lossless serialization of open-ended model boundaries');
once('let t=e;if(t.__ipsType===`Date`)','let t=e;if(t.__ipsType===`InfiniteBoundary`){if(t.sign!==1&&t.sign!==-1)throw Error(`مرز تنظیمات پرونده معتبر نیست.`);return t.sign===1?Infinity:-Infinity}if(t.__ipsType===`Date`)','Restore open-ended model boundaries');
once('function TA(){let[e,t]','function TA(){let[v50Intro,setV50Intro]=(0,f.useState)(()=>localStorage.getItem("atieh-ui-direct")!=="1");let[e,t]','Intro preference state');
once('[pe,me]=(0,f.useState)(`analysis`)','[pe,me]=(0,f.useState)(`overview`)','Management default');
once('if(!ie||!We)return','if(v50Intro)return R50(V50Landing,{onEnter:()=>setV50Intro(false),onRestore:()=>setTimeout(()=>Ve.current?.click(),0)});if(!ie||!We)return','Intro render');
once('className:`import-workspace`,children:','className:`import-workspace`,children:','Import anchor validation');
once('if(!ie||!We)return(0,Z.jsxs)(Z.Fragment,{children:[','if(!ie||!We)return(0,Z.jsxs)(Z.Fragment,{children:[R50(V50Files,{models:e,count:Ge.length,onIntro:()=>setV50Intro(true),onOpen:()=>{if(e.atieh&&e.metil){H("atieh");Qe("atieh",e.atieh);me("overview");ae(true)}}}),','File page heading and management entry');
once('let ut=[{key:`analysis`','let ut=[{key:`overview`,label:`نمای مدیریتی`,icon:(0,Z.jsx)(NC,{size:18})},{key:`analysis`','Overview navigation');
// Make all available tools reachable, including previously hidden utility navigation.
once('dt=ut.filter(e=>[`analysis`,`performance`,`benchmark`,`investment`,`data`].includes(e.key)),ft=ut.filter(e=>![`analysis`,`performance`,`benchmark`,`investment`,`data`].includes(e.key))','dt=ut.filter(e=>[`overview`,`analysis`,`performance`,`benchmark`,`investment`,`data`].includes(e.key)),ft=ut.filter(e=>![`overview`,`analysis`,`performance`,`benchmark`,`investment`,`data`].includes(e.key))','Sidebar sections');
once('className:`app-shell ${ve?`header-is-collapsed`:``}`,dir:`rtl`,children:[','className:`app-shell ${ve?`header-is-collapsed`:``}`,dir:`rtl`,children:[R50(V50ShellTools,{active:pe,onFiles:()=>ae(false),onIntro:()=>setV50Intro(true)}),','Sidebar brand and file actions');
once('children:[Ye,le&&','children:[Ye,pe===`overview`&&R50(V50Overview,{models:e,model:We,year:Se,holding:re,matrix:Xe,files:Ge.length,onNavigate:key=>{if(key===`benchmark`&&!i){ae(false);return}me(key)},onCompany:xe}),le&&','Management overview content');
once('className:`header-actions`,children:[','className:`header-actions`,children:[Ye,','Workspace actions in single header');
once('onClick:qe,disabled:','title:`ذخیره کامل پرونده`,"aria-label":`ذخیره کامل پرونده`,onClick:qe,disabled:','Accessible compact save action');
once('onClick:()=>Ve.current?.click(),children:','title:`بازیابی پرونده`,"aria-label":`بازیابی پرونده`,onClick:()=>Ve.current?.click(),children:','Accessible compact restore action');
once('children:[Ye,pe===`overview`','children:[pe===`overview`','Remove duplicate workspace toolbar');
once('className:`shared-context-bar no-print`,children:[','className:`shared-context-bar no-print`,children:[R50(V50Context,{model:We,company:be,year:Se,tab:pe,onCompany:xe,onYear:Ce}),','Shared context selectors');
once('[ge,_e]=(0,f.useState)(!1),[ve,ye]=(0,f.useState)(!0)','[ge,_e]=(0,f.useState)(!1),[ve,ye]=(0,f.useState)(!1)','Expanded accessible navigation');
// React state transitions should be immediate and scroll consistently on module changes.
once('onClick:()=>{me(e.key),_e(!1)}','onClick:()=>{me(e.key),_e(!1),Ce(We.years.includes(Se)?Se:We.years.at(-1))}','Primary navigation state');
// Avoid stale global labels in modules with independent company/period scopes.
once('t!==void 0&&We.years.includes(t)&&Ce(t)','t!==void 0&&Number.isInteger(t)&&Ce(t)','Budget context callback');
// Keep selected year for the investment map instead of defaulting silently to the newest budget.
once('se=D?.company===B?D:H,ce=nk','se=D?.company===B?D:re.find(e=>e.year===u)??H,ce=nk','Investment map selected period');
once('oe=ie&&ae?ie.x-ae.x:null,U=ie&&ae?ie.y-ae.y:null,se=D?.company===B?D:re.find(e=>e.year===u)??H,ce=nk(H?.x??0)','se=D?.company===B?D:re.find(e=>e.year===u)??H,v50Previous=re.filter(e=>!e.isForecast&&e.year<(se?.year??0)).at(-1)??null,oe=se&&v50Previous?se.x-v50Previous.x:null,U=se&&v50Previous?se.y-v50Previous.y:null,ce=nk(se?.x??0)','Map KPI alignment with selected period');
scoped('function dk({','function ',x=>{const a=x.indexOf('return(0,Z.jsxs)');return x.slice(0,a)+x.slice(a).replaceAll('H?.pointType','se?.pointType').replaceAll('H?.capitalSourceYear','se?.capitalSourceYear').replaceAll('H?ZO(H.x','se?ZO(se.x').replaceAll('H?ZO(H.y','se?ZO(se.y').replaceAll('H?.assetProductivity','se?.assetProductivity').replaceAll('H.assetProductivity','se.assetProductivity');},'Selected-point KPI rendering');
once('onClick:()=>O(e),children:[e.year.toLocaleString','onClick:()=>{O(e);d?.(e.company,e.year)},children:[e.year.toLocaleString','Investment period callback');
scoped('function qO({','function ',x=>x.replace('children:t.toLocaleString(`fa-IR`)','children:t.toLocaleString(`fa-IR`,{useGrouping:!1})'),'Year formatting in ROIC view');
once('let[p,m]=(0,f.useState)(`map`),[h,g]','let[p,m]=(0,f.useState)(`map`),[h,g]','Investment scope validation');
// Use a single selected path by default. Other companies remain selectable from the rail.
once('[k,A]=(0,f.useState)(!1),[j,M]=(0,f.useState)(!1),[N,P]=AD','[k,A]=(0,f.useState)(!0),[j,M]=(0,f.useState)(!1),[N,P]=AD','Focused investment chart');
once('(0,Z.jsx)(hw,{bundle:x,previousBundle:w,trendThreshold:n.performance.trendMeaningfulChange},`${r}-${a}`)','R50(V50Fold,{title:"جمع‌بندی مدیریتی، سیاست و اقدام‌ها",className:"v50-policy-fold"},(0,Z.jsx)(hw,{bundle:x,previousBundle:w,trendThreshold:n.performance.trendMeaningfulChange},`${r}-${a}`))','Progressive disclosure of watch policy');
once('(0,Z.jsxs)(`section`,{className:`dynamic-weight-panel`,children:[','(0,Z.jsxs)(`details`,{className:`dynamic-weight-panel v50-weights-fold`,children:[R50("summary",null,"تنظیم وزن‌ها و سناریوی رتبه‌بندی",R50("span",null,"+")),','Weight editor disclosure');
// Detect finance file destination with a validated schema and explicit filename hints.
once('let t=await e.arrayBuffer(),n=[];if(!/','let t=await e.arrayBuffer(),n=[],v50Companies=[];if(!/','Financial preview buffer');
once('let e=i.companies.map(lx),t=e.includes(lx(`آتیه فولاد نقش جهان`)),r=e.includes(lx(`فولاد متیل`));t?n.push(`atieh`):r?n.push(`metil`):n.push(`atieh`,`metil`)','v50Companies=i.companies.slice(0,3);let hint=e.name.toLowerCase();if(/atieh|آتیه/.test(hint))n.push(`atieh`);else if(/metil|متیل/.test(hint))n.push(`metil`);else n.push(`atieh`,`metil`)','Validated finance destination hints');
once('return{file:e,bytes:t,targets:n,target:n.length===1?n[0]:``,replace:!1,error:n.length?','return{file:e,bytes:t,targets:n,preview:v50Companies.join("، "),target:n.length===1?n[0]:``,replace:!1,error:n.length?','Financial preview payload');
once('for(let r of[`atieh`,`market`,`benchmark`,`product`,`profit`,`asset`,`activity`,`equipment`])try{',`let hint50=e.name.toLowerCase();let target50=/equipment|تجهیزات/.test(hint50)?'equipment':/metil[ _-]*group|فعالیت/.test(hint50)?'activity':/دارایی|asset/.test(hint50)?'asset':/profit/.test(hint50)?'profit':/product/.test(hint50)?'product':/compair|compare|benchmark/.test(hint50)?'benchmark':/market/.test(hint50)?'market':/atieh|آتیه/.test(hint50)?'atieh':/metil|متیل/.test(hint50)?'metil':null;if(target50){try{let detected50=await _S(e,t,target50);return {file:e,bytes:t,targets:[target50],preview:(target50==='atieh'||target50==='metil')?detected50.companies.slice(0,3).join('، '):'',target:target50,replace:false,error:''};}catch{}}for(let r of[\`atieh\`,\`market\`,\`benchmark\`,\`product\`,\`profit\`,\`asset\`,\`activity\`,\`equipment\`])try{`,'Validated fast import route');
once('(0,Z.jsx)(`td`,{children:e.file.name})','(0,Z.jsxs)(`td`,{children:[e.file.name,e.preview&&R50("small",{className:"v50-file-sample"},"نمونه شرکت‌ها: "+e.preview)]})','Finance preview in import table');
once('children:`تا معتبر شدن تمام فایل‌های این فهرست، داده فعال تغییر نمی‌کند.`','children:`مقصد پیشنهادی فایل مالی را با نمونه شرکت‌ها تطبیق دهید. تا معتبر شدن تمام فایل‌ها، داده فعال تغییر نمی‌کند.`','Explicit destination review guidance');
// Data centre formatting only: preserve stored values, calculations and raw exports.
// Replace only the component region, not engine code.
let vStart=html.indexOf('function vA({'),vEnd=html.indexOf('function ',vStart+15);
if(vEnd<0)throw Error('Data center end missing');
let v=html.slice(vStart,vEnd);
for(const [from,to] of [
 ['wb(a?.value??null,2)','V50Numeric(a)'],['wb(r?.value??null,2)','V50Numeric(r)'],['wb(ae?.value??null,2)','V50Numeric(ae)'],
 ['Rk(e,t,n,r.normalizedVariable).percent','Rk(e,t,n,r.normalizedVariable).percent']
])v=v.split(from).join(to);
for(const [from,to] of [
 ['a?.unit||`—`','V50Unit(a)'],['r?.unit||t.unit||`—`','V50Unit(r??t)'],['ae?.unit||H?.unit||`—`','V50Unit(ae??H)'],
 ['Rk(e,n,t,ie)?.value??null','V50Value(Rk(e,n,t,ie))'],
 ['i?.value??null','V50Value(i)'],['r?.value??null','V50Value(r)'],
 ['Rk(e,n,r,t.normalizedVariable)?.value??null','V50Value(Rk(e,n,r,t.normalizedVariable))'],
 ['fe[0]?.unit??``','fe[0]?V50Unit(fe[0]):``'],
 ['o.percent===null?`بدون مبنا`:`${o.percent>=0?`+`:``}${Hk(o.percent)}`','V50Change(o,!0)'],
 ['a.percent===null?`—`:Hk(a.percent)','V50Change(a)'],
 ['oe.percent===null?`—`:Hk(oe.percent)','V50Change(oe)']
])v=v.split(from).join(to);
html=html.slice(0,vStart)+v+html.slice(vEnd);
patches.push('Percentage and numeric display in data centre');
once('return i===null||a===null?{absolute:null,percent:null}:{absolute:i-a,percent:a===0?null:(i-a)/Math.abs(a)}}function gA','return i===null||a===null?{absolute:null,percent:null}:{absolute:i-a,percent:a<=0?null:(i-a)/a,status:a<0?(/سود.*(?:خالص|عملیاتی)|زیان/.test(r)?(i>0?`خروج از زیان`:`تغییر در زیان`):`پایه منفی`):a===0?`پایه صفر`:``}}function gA','Negative and zero baseline display');
once('className:`bar-company`,children:e.company','className:`bar-company`,children:[e.company,R50("small",{className:"v50-rank-group"},"رتبه در گروه "+jw(e.nature))]','Ranking peer-group labels');
once('children:`ده شرکت نخست`','children:`مقایسه امتیاز شرکت‌ها`','Accurate ranking chart title');
once('(0,Z.jsx)(`h3`,{children:`اثر وزن‌های فعال بر جایگاه شرکت‌ها`})','R50("div",null,R50("h3",null,"اثر وزن‌های فعال بر جایگاه شرکت‌ها"),R50("p",{className:"v50-rank-note"},"رتبه‌ها در دو گروه مالی و غیرمالی مستقل محاسبه می‌شوند."))','Explicit rank comparison universe');
once('label:`رتبه‌نمای عملکرد`,icon:','label:`رتبه‌بندی عملکرد`,icon:','Consistent ranking navigation');
once('label:`پایش تطبیقی`,icon:','label:`مقایسه با هم‌رده‌ها`,icon:','Consistent comparison navigation');
once('label:`تحلیل سرمایه‌گذاری`,icon:','label:`سرمایه و عملیات`,icon:','Consistent investment navigation');
// Remove old internal version badges and group separators from years, scoped to ROIC component.
html=html.replace('تحلیل سرمایه‌گذاری · نسخه ۳۲','تحلیل سرمایه‌گذاری');
html=html.split('نسخه ۴۹ · تحلیل مالی و راهبری سرمایه').join('نسخه ۵۰ · میزکار مدیریتی');
html=html.split('className:`header-brand-copy`').join('className:`header-brand-copy`');
let css=fs.readFileSync(path.join(base,'v50.css'),'utf8');
css+='\n.dashboard-report>.charts-grid{order:2}.dashboard-report>.v50-policy-fold{order:3}.charts-grid{gap:20px!important}.v50-weights-fold>summary{display:flex;justify-content:space-between;padding:18px 20px;cursor:pointer;font-weight:700;list-style:none}.v50-weights-fold>summary::-webkit-details-marker{display:none}.v50-weights-fold[open]>summary{border-bottom:1px solid #e1e8ed;margin-bottom:15px}';
html=html.replace('</head>',`<style id="atieh-v50-ui">${css}</style></head>`);
fs.writeFileSync(path.join(base,'Atieh50.html'),html);
const moduleSource=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
fs.writeFileSync(path.join(base,'v50-check.mjs'),moduleSource);
fs.writeFileSync(path.join(base,'build-manifest.json'),JSON.stringify({version:50,base:'Atieh49.html',patches,engine:'Original v49 engine; UI and explicitly listed import/context/format patches'},null,2));
console.log('Built Atieh50.html:',html.length,'characters;',patches.length,'verified patches');
