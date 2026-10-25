/* UI components compiled into the standalone release. Uses the existing React runtime. */
const R50 = (...args) => f.createElement(...args);
const N50 = n => Number(n || 0).toLocaleString('fa-IR');
function V50Landing({onEnter,onRestore}) {
  const [direct,setDirect] = f.useState(()=>localStorage.getItem('atieh-ui-direct')==='1');
  const enter=()=>{localStorage.setItem('atieh-ui-direct',direct?'1':'0');onEnter();};
  return R50('section',{className:'v50-intro',dir:'rtl','aria-label':'معرفی سامانه'},
    R50('header',{className:'v50-intro-header'},R50('div',{className:'v50-logo','aria-hidden':true},'آ'),R50('span',null,'آتیه فولاد نقش جهان'),R50('small',null,'میزکار تحلیل مالی · نسخه ۵۰')),
    R50('div',{className:'v50-intro-body'},
      R50('div',{className:'v50-intro-copy'},R50('span',{className:'v50-kicker'},'شفافیت در عملکرد، اطمینان در تصمیم'),R50('h1',null,'سامانه تحلیل مالی',R50('br'),'و راهبری سرمایه آتیه'),R50('p',null,'از عملکرد مالی شرکت‌ها تا تصمیم درباره سرمایه؛ تصویری روشن از وضعیت، مسیر حرکت و فرصت‌های بهبود پرتفوی.'),
        R50('div',{className:'v50-intro-tags'},...['پایش عملکرد','مقایسه شرکت‌ها','راهبری سرمایه'].map(x=>R50('span',{key:x},x))),
        R50('div',{className:'v50-intro-actions'},R50('button',{className:'v50-enter',onClick:enter},'ورود به میزکار',R50('span',{'aria-hidden':true},'←')),R50('button',{className:'v50-restore',onClick:()=>{onEnter();onRestore();}},'بازیابی پرونده')),
        R50('label',{className:'v50-direct'},R50('input',{type:'checkbox',checked:direct,onChange:e=>setDirect(e.target.checked)}),'در مراجعه بعد مستقیم وارد میزکار شوم')),
      R50('div',{className:'v50-constellation'},
        R50('div',{className:'v50-graphic-label'},R50('span',{className:'v50-live-dot'}),'از داده تا بینش'),
        R50('svg',{viewBox:'0 0 620 520',role:'img','aria-label':'تصویر شماتیک ارتباط شرکت‌ها و مسیر تحلیل سرمایه'},
          R50('defs',null,R50('linearGradient',{id:'v50-line',x1:'0',y1:'0',x2:'1',y2:'1'},R50('stop',{stopColor:'#49c9b6'}),R50('stop',{offset:'1',stopColor:'#c8ad76'}))),
          ...[100,180,260,340,420].map(y=>R50('line',{key:'h'+y,x1:55,x2:565,y1:y,y2:y,stroke:'#ffffff0b'})),
          ...[100,180,260,340,420,500].map(x=>R50('line',{key:'v'+x,x1:x,x2:x,y1:70,y2:450,stroke:'#ffffff0b'})),
          R50('circle',{cx:310,cy:260,r:185,className:'v50-orbit'}),R50('circle',{cx:310,cy:260,r:132,className:'v50-orbit inner'}),
          R50('path',{d:'M105 370 Q190 335 230 290 T360 220 T510 120',className:'v50-path'}),
          ...[[105,370],[230,290],[360,220],[510,120]].map(([x,y],i)=>R50('g',{key:i,className:'v50-node',style:{animationDelay:`${i*.22}s`}},R50('circle',{cx:x,cy:y,r:19,fill:'#42c5b322'}),R50('circle',{cx:x,cy:y,r:7,fill:i===3?'#d4bb86':'#57d7c3'}))),
          ...[[140,150],[440,355],[200,410],[490,230],[290,100]].map(([x,y],i)=>R50('g',{key:'s'+i,className:'v50-satellite'},R50('line',{x1:x,y1:y,x2:310,y2:260,stroke:'#73c5bc2b',strokeDasharray:'4 7'}),R50('circle',{cx:x,cy:y,r:5,fill:'#a6c9cb'}))),
          R50('rect',{x:248,y:205,width:124,height:110,rx:25,fill:'#153d50',stroke:'#5ccbb069'}),R50('path',{d:'M274 283 V254 M299 283 V239 M325 283 V226 M349 283 V247',stroke:'url(#v50-line)',strokeWidth:9,strokeLinecap:'round'})),
        R50('div',{className:'v50-graphic-note'},R50('strong',null,'یک نگاه به کل پرتفوی'),R50('span',null,'تصویر مفهومی · بدون داده یا رتبه نمایشی')))),
    R50('footer',{className:'v50-intro-footer'},R50('span',null,'گروه سرمایه‌گذاری آتیه فولاد نقش جهان'),R50('span',null,'پردازش فایل‌ها در مرورگر شما')));
}
function V50Files({models,count,onOpen,onIntro}) {
  const [expanded,setExpanded]=f.useState(false);
  f.useEffect(()=>{document.body.classList.toggle('v50-files-expanded',expanded);return()=>document.body.classList.remove('v50-files-expanded');},[expanded]);
  return R50('section',{className:'v50-file-heading',dir:'rtl'},
    R50('div',{className:'v50-file-brand'},R50('button',{onClick:onIntro,'aria-label':'نمایش معرفی سامانه',className:'v50-logo'},'آ'),R50('div',null,R50('small',null,'سامانه تحلیل مالی و راهبری سرمایه آتیه'),R50('h1',null,'پرونده و داده‌ها'))),
    R50('p',null,'فایل‌ها را انتخاب کنید، وضعیت داده‌ها را بررسی کنید و وارد میزکار شوید.'),
    R50('div',{className:'v50-file-actions'},R50('span',{className:'v50-file-status'},`${N50(count)} از ۹ ورودی آماده`),R50('button',{className:'v50-enter',disabled:!models.atieh||!models.metil,onClick:onOpen},'ورود به نمای مدیریتی ←'),R50('button',{className:'outline-button',onClick:()=>setExpanded(x=>!x),'aria-expanded':expanded},expanded?'نمای خلاصه فایل‌ها':'جزئیات و بارگذاری جداگانه')));
}
function V50Context({model,company,year,tab,onCompany,onYear}) {
  if(tab==='investment'||tab==='benchmark') return R50('div',{className:'v50-context-local'},R50('span',{className:'v50-context-dot'}),'شرکت و دوره تحلیل را در فیلتر همین صفحه انتخاب کنید');
  return R50('div',{className:'v50-context-selects'},R50('label',null,'شرکت',R50('select',{'aria-label':'شرکت فعال میزکار',value:company,onChange:e=>onCompany(e.target.value)},R50('option',{value:'',disabled:true},'انتخاب شرکت'),...model.companies.map(x=>R50('option',{key:x,value:x},x)))),R50('label',null,'دوره',R50('select',{'aria-label':'دوره فعال میزکار',value:year,onChange:e=>onYear(Number(e.target.value))},...[...model.years].reverse().map(x=>R50('option',{key:x,value:x},`${x.toLocaleString('fa-IR',{useGrouping:false})} · واقعی`)))));
}
function V50Overview({models,model,year,holding,matrix,files,onNavigate,onCompany}) {
  const rows=model.companies.map(company=>({company,state:matrix.get(company)?.get(year)}));
  return R50('div',{className:'v50-overview'},R50('header',{className:'v50-page-heading'},R50('div',null,R50('span',{className:'v50-kicker'},'نمای مدیریتی'),R50('h1',null,'تصویر روشن‌تری از پرتفوی'),R50('p',null,`خلاصه پرونده فعال ${holding==='metil'?'فولاد متیل':'آتیه فولاد'}؛ برای تحلیل هر شرکت، مسیر موردنظر را انتخاب کنید.`)),R50('span',{className:'v50-period'},year.toLocaleString('fa-IR',{useGrouping:false})+' · واقعی')),
    R50('section',{className:'v50-stats','aria-label':'خلاصه پرونده'},...[['شرکت‌های گروه فعال',model.companies.length,'شرکت'],['رکوردهای مالی',model.summary.totalRecords,'رکورد'],['پوشش زمانی',model.years.length,'سال'],['ورودی‌های آماده',files,'از ۹ فایل']].map(([label,value,unit])=>R50('article',{key:label},R50('span',null,label),R50('strong',null,N50(value)),R50('small',null,unit)))),
    R50('section',{className:'v50-workflow'},R50('div',null,R50('span',{className:'v50-kicker'},'مسیر تحلیل'),R50('h2',null,'از مشاهده وضعیت تا بررسی اقدام')),R50('div',{className:'v50-route-cards'},...[['analysis','۰۱','دیدبان مالی','وضعیت و مسیر مالی شرکت‌ها'],['performance','۰۲','رتبه‌بندی عملکرد','جایگاه شرکت‌ها و اثر تغییر وزن‌ها'],['benchmark','۰۳','مقایسه با هم‌رده‌ها','عملکرد شرکت منتخب در برابر رقبا'],['investment','۰۴','سرمایه و عملیات','بازده سرمایه و محرک‌های عملیاتی']].map(([key,num,title,desc])=>R50('button',{key,onClick:()=>onNavigate(key)},R50('span',{className:'v50-route-number'},num),R50('strong',null,title),R50('small',null,desc),R50('span',{'aria-hidden':true},'←'))))),
    R50('section',{className:'v50-company-section'},R50('header',null,R50('div',null,R50('h2',null,'شرکت‌های پرونده'),R50('p',null,'انتخاب هر شرکت، دیدبان همان شرکت را باز می‌کند.')),R50('button',{className:'outline-button',onClick:()=>onNavigate('quality')},'بررسی سلامت داده‌ها')),
      R50('div',{className:'v50-company-list'},...rows.map(({company,state})=>R50('button',{key:company,onClick:()=>{onCompany(company);onNavigate('analysis');}},R50('span',{className:'v50-company-initial','aria-hidden':true},company.slice(0,1)),R50('span',null,R50('strong',null,company),R50('small',null,model.natureByCompany.get(company)||'ماهیت نامشخص')),R50('span',{className:state?'v50-data-ready':'v50-data-warning'},state?'تحلیل دوره در دسترس':'نیازمند بررسی پوشش'),R50('span',{'aria-hidden':true},'←'))))),
    R50('aside',{className:'v50-overview-note'},'این نما خلاصه پوشش پرونده است. برای تشخیص مالی و پیشنهادهای مدیریتی، دیدبان یا بخش سرمایه و عملیات را باز کنید.'));
}
function V50Fold({title,children,className=''}) {return R50('details',{className:'v50-fold '+className},R50('summary',null,title,R50('span',{'aria-hidden':true},'+')),R50('div',{className:'v50-fold-body'},children));}
function V50ShellTools({onFiles,onIntro,onNavigate,active}) {
  f.useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});document.querySelector('.app-content')?.scrollTo({top:0});document.body.dataset.v50Tab=active;},[active]);
  return R50('div',{className:'v50-sidebar-extras no-print'},R50('div',{className:'v50-side-brand'},R50('span',{className:'v50-logo'},'آ'),R50('strong',null,'آتیه',R50('small',null,'تحلیل مالی و راهبری سرمایه'))),R50('div',{className:'v50-side-bottom'},R50('button',{onClick:onFiles},'پرونده و داده‌ها'),R50('button',{onClick:onIntro},'معرفی سامانه'),R50('small',null,'نسخه ۵۰ · میزکار مدیریتی')));
}
function V50Numeric(record) {
  if(!record||record.value===null||record.value===undefined)return '—';
  const value=record.value;
  const percentage=record.unit==='درصد';
  return wb(percentage?value*100:value,percentage?1:Math.abs(value)>=1000?0:2);
}
function V50Value(record) {return record?.value==null?null:record.unit==='درصد'?record.value*100:record.value;}
function V50Unit(record) {return record?.code==='176'?'واحد درصد':record?.unit||'—';}
function V50Change(change,plus=false) {return change.status||(change.percent==null?'بدون مبنا':(plus&&change.percent>=0?'+':'')+Hk(change.percent));}
