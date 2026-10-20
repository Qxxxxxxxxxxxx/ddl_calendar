'use strict';

const DB_NAME = 'ddl_calendar_local_v1';
const STORE_NAME = 'tasks';
const DAY_MS = 86400000;
const WEEKDAY_NAMES = ['日','一','二','三','四','五','六'];
const ICONS = {
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  'calendar-check':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 6 2 2 4-4"/>',
  list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
  settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.07-1.9 1.9-.07-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1.4 1.5V21h-5.2v-1.1A1.7 1.7 0 0 0 8 18.4a1.7 1.7 0 0 0-1.83.38l-.08.06-1.9-1.9.06-.07A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1.4H2v-3.2h1.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.35-1.86l-.06-.08 1.9-1.9.08.06A1.7 1.7 0 0 0 8 5.6a1.7 1.7 0 0 0 1.4-1.5V3h5.2v1.1A1.7 1.7 0 0 0 16 5.6a1.7 1.7 0 0 0 1.83-.38l.07-.06 1.9 1.9-.06.08A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.5 1.4H22v3.2h-1.1a1.7 1.7 0 0 0-1.5 1.4Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  'chevron-left':'<path d="m15 18-6-6 6-6"/>',
  'chevron-right':'<path d="m9 18 6-6-6-6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  circle:'<circle cx="12" cy="12" r="9"/>',
  'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
  repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/>',
  inbox:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.circle}</svg>`;
const $ = selector => document.querySelector(selector);
const todayISO = () => localISO(new Date());
function localISO(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function parseISO(value) { const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12); }
function plusDays(value,n) { const date=parseISO(value);date.setDate(date.getDate()+n);return localISO(date); }
function diffDays(a,b) { return Math.round((Date.UTC(...a.split('-').map((v,i)=>Number(v)-(i===1?1:0))) - Date.UTC(...b.split('-').map((v,i)=>Number(v)-(i===1?1:0))))/DAY_MS); }
function monthDiff(a,b) { const aa=parseISO(a),bb=parseISO(b);return (aa.getFullYear()-bb.getFullYear())*12 + aa.getMonth()-bb.getMonth(); }
function mondayOf(iso) { const day=parseISO(iso).getDay();return plusDays(iso,-((day+6)%7)); }
function newId() { return (globalThis.crypto?.randomUUID?.() || `t_${Date.now()}_${Math.random().toString(36).slice(2)}`); }
function readableDate(iso) { if(!iso)return '无DDL';const dt=parseISO(iso);return `${dt.getMonth()+1}月${dt.getDate()}日`; }
function fullDate(iso) { if(!iso)return '无DDL';const dt=parseISO(iso);return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`; }
function displayDue(task) { return task.date ? `${readableDate(task.date)}${task.time?' '+task.time:''}` : '无DDL'; }
function timeLeft(task) { if(!task.date)return Number.POSITIVE_INFINITY;const [y,m,d]=task.date.split('-').map(Number);if(task.time){const[h,minute]=task.time.split(':').map(Number);return new Date(y,m-1,d,h,minute,0,0).getTime()-Date.now();}return new Date(y,m-1,d,23,59,59,999).getTime()-Date.now(); }
function durationText(ms) { const minutes=Math.floor(Math.abs(ms)/60000);if(minutes<1)return '不足1分钟';const days=Math.floor(minutes/1440);const hours=Math.floor((minutes%1440)/60);const mm=minutes%60;if(days)return `${days}天${hours?hours+'小时':''}`;if(hours)return `${hours}小时${mm?mm+'分钟':''}`;return `${mm}分钟`; }
function groupStatus(task) { if(task.completedAt)return 'completed';if(task.date && timeLeft(task)<0)return 'overdue';return 'pending'; }
function normalizeDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date||'') && localISO(parseISO(date))===date; }
function repeatRuleMatches(rule,anchor,date) {
  if(date<anchor || (rule.endDate && date>rule.endDate))return false;
  const n=Number(rule.every)||1;
  switch(rule.kind){
    case 'daily':return diffDays(date,anchor)%n===0;
    case 'weekly':return diffDays(mondayOf(date),mondayOf(anchor))%(n*7)===0 && (rule.weekdays||[parseISO(anchor).getDay()]).includes(parseISO(date).getDay());
    case 'monthly':{
      const months=monthDiff(date,anchor);
      if(months%n!==0)return false;
      const dt=parseISO(date),base=parseISO(anchor);
      const last=new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate();
      return dt.getDate()===Math.min(base.getDate(),last);
    }
    default:return false;
  }
}
function repeatDates(series,start,end){
  if(!series.date || start>end)return [];
  let cursor=series.date>start?series.date:start;
  let stop=series.repeat.endDate && series.repeat.endDate<end ? series.repeat.endDate : end;
  if(cursor>stop)return [];
  const dates=[];
  // 日期按本地日历逐日迭代，避免夏令时跳变问题。
  for(let i=0;cursor<=stop && i<250000;i++,cursor=plusDays(cursor,1)){
    if(repeatRuleMatches(series.repeat,series.date,cursor))dates.push(cursor);
  }
  return dates;
}
function singleView(record){return {key:`single:${record.id}`,sourceId:record.id,kind:'single',title:record.title,note:record.note,date:record.date||null,time:record.time||null,completedAt:record.completedAt||null};}
function recurringView(record,date){const ex=(record.exceptions||{})[date]||{};return {key:`repeat:${record.id}:${date}`,sourceId:record.id,kind:'series',occurrenceDate:date,title:record.title,note:record.note,date,time:record.time||null,completedAt:ex.completedAt||null};}
function instancesRange(start,end){
  const out=[];
  for(const rec of state.items){
    if(rec.type==='single'){if(rec.date&&rec.date>=start&&rec.date<=end)out.push(singleView(rec));}
    else if(rec.type==='series'){
      for(const date of repeatDates(rec,start,end)){
        if(rec.exceptions?.[date]?.skip)continue;
        out.push(recurringView(rec,date));
      }
    }
  }
  return out;
}
function listInstances(){
  const now=todayISO(),end=plusDays(now,state.seriesHorizon);
  const out=[];
  for(const rec of state.items){
    if(rec.type==='single'){out.push(singleView(rec));continue;}
    if(rec.type==='series'){
      const start=rec.date;
      if(!start)continue;
      for(const date of repeatDates(rec,start,end)){
        if(rec.exceptions?.[date]?.skip)continue;
        out.push(recurringView(rec,date));
      }
    }
  }
  return out;
}
function isFutureSeriesBeyond(){
  const end=plusDays(todayISO(),state.seriesHorizon),far=plusDays(end,365);
  return state.items.some(rec=>rec.type==='series'&&repeatDates(rec,plusDays(end,1),far).some(d=>!rec.exceptions?.[d]?.skip));
}
function sortTasks(tasks,status){
  return tasks.sort((a,b)=>{
    if(status==='completed')return (b.completedAt||'').localeCompare(a.completedAt||'')||(b.date||'').localeCompare(a.date||'');
    if(status==='overdue')return (b.date||'').localeCompare(a.date||'') || (b.time||'23:59').localeCompare(a.time||'23:59');
    if(status==='undated')return a.title.localeCompare(b.title,'zh');
    return (a.date||'').localeCompare(b.date||'') || (a.time||'23:59').localeCompare(b.time||'23:59');
  });
}
const state={items:[],page:'calendar',selectedDate:todayISO(),viewMonth:todayISO().slice(0,7),status:'pending',subtype:'dated',seriesHorizon:90,prefs:{theme:'system',weekStart:1,lastBackup:''},editor:null,mode:'date',scope:'once',weekdays:[],toastTimer:null};
let db;
function openDB(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{const database=req.result;if(!database.objectStoreNames.contains(STORE_NAME))database.createObjectStore(STORE_NAME,{keyPath:'id'});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
function getAllDB(){return new Promise((resolve,reject)=>{const request=db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function putDB(rec){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).put(rec);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function delDB(id){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function replaceDB(items){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME);store.clear();for(const item of items)store.put(item);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
async function saveRecord(rec){await putDB(rec);state.items=state.items.filter(x=>x.id!==rec.id).concat(rec);render();}
async function deleteRecord(id){await delDB(id);state.items=state.items.filter(x=>x.id!==id);render();}
function loadPrefs(){try{const value=JSON.parse(localStorage.getItem('ddl_calendar_prefs')||'{}');if(value&&typeof value==='object')state.prefs={...state.prefs,...value};}catch{}}
function savePrefs(){try{localStorage.setItem('ddl_calendar_prefs',JSON.stringify(state.prefs));}catch{showToast('当前无法保存外观偏好');}}
function setTheme(){document.documentElement.dataset.theme=state.prefs.theme==='system'?'system':state.prefs.theme;}
function showToast(text){const node=$('#toast');node.textContent=text;node.classList.add('visible');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>node.classList.remove('visible'),2900);}
function createEmpty(title,subtitle){const el=document.createElement('div');el.className='empty-state';el.innerHTML=`<div class="empty-icon">${icon('inbox')}</div><strong></strong><p></p>`;el.querySelector('strong').textContent=title;el.querySelector('p').textContent=subtitle;return el;}
function render(){renderNav();if(state.page==='calendar')renderCalendar();if(state.page==='tasks')renderTasks();if(state.page==='settings')renderSettings();}
function renderNav(){
  for(const el of document.querySelectorAll('.page'))el.classList.toggle('hidden',el.id!==`page-${state.page}`);
  for(const el of document.querySelectorAll('.nav-item')){const active=el.dataset.page===state.page;el.classList.toggle('active',active);el.setAttribute('aria-current',active?'page':'false');}
  $('#add-task-button').hidden=state.page==='settings';
}
function setPage(page){state.page=page;if(page==='tasks'){state.status='pending';state.subtype='dated';}render();window.scrollTo({top:0,behavior:'instant'});}
function renderCalendar(){
  const [year,month]=state.viewMonth.split('-').map(Number);
  $('#month-title').textContent=`${year}年${String(month).padStart(2,'0')}月`;
  const weekday=$('#calendar-weekdays');weekday.replaceChildren();
  for(let i=0;i<7;i++){const d=document.createElement('div');d.className='weekday-label';d.textContent='周'+WEEKDAY_NAMES[(state.prefs.weekStart+i)%7];weekday.append(d);}
  const firstDay=new Date(year,month-1,1),offset=(firstDay.getDay()-state.prefs.weekStart+7)%7;
  const monthDays=new Date(year,month,0).getDate();
  const cells=Math.ceil((offset+monthDays)/7)*7;
  const rangeStart=localISO(new Date(year,month-1,1-offset,12));
  const rangeEnd=plusDays(rangeStart,cells-1);
  const aggregate=new Map();
  for(const entry of instancesRange(rangeStart,rangeEnd)){
    const row=aggregate.get(entry.date)||{total:0,pending:0,overdue:0,completed:0};
    row.total++;row[groupStatus(entry)]++;aggregate.set(entry.date,row);
  }
  const grid=$('#calendar-grid');grid.replaceChildren();
  for(let i=0;i<cells;i++){
    const iso=plusDays(rangeStart,i),date=parseISO(iso),outside=date.getMonth()!==month-1,today=iso===todayISO(),selected=iso===state.selectedDate;
    const button=document.createElement('button');button.type='button';button.className='day-button'+(outside?' outside':'')+(today?' today':'')+(selected?' selected':'');button.dataset.date=iso;
    const day=document.createElement('span');day.className='day-number';day.textContent=String(date.getDate());button.append(day);
    const marks=document.createElement('span');marks.className='day-indicators';
    const data=aggregate.get(iso);
    if(data){
      let status=data.overdue?'overdue':data.pending?'pending':'completed';
      const d=document.createElement('i');d.className=`dot ${status}`;marks.append(d);
      if(data.total>1){const cnt=document.createElement('i');cnt.className='dot';cnt.style.opacity='.28';cnt.style.background='var(--muted)';marks.append(cnt);}
    }
    button.append(marks);button.setAttribute('aria-label',`${fullDate(iso)}${data?'，'+data.total+'项DDL任务':''}`);
    grid.append(button);
  }
  const selected=parseISO(state.selectedDate);
  $('#selected-date-label').textContent=`${selected.getMonth()+1}月${selected.getDate()}日 · ${state.selectedDate===todayISO()?'今天':'星期'+WEEKDAY_NAMES[selected.getDay()]}`;
  const entries=instancesRange(state.selectedDate,state.selectedDate);
  const done=entries.filter(x=>x.completedAt).length;
  $('#selected-day-summary').textContent=entries.length?`${entries.length-done}项待完成 · ${done}项已完成`:'当天没有DDL任务';
  const sorted=entries.sort((a,b)=>Boolean(a.completedAt)-Boolean(b.completedAt)|| (a.time||'23:59').localeCompare(b.time||'23:59'));
  renderCards($('#day-list'),sorted,'这一天没有DDL','点击右下角＋，记录新的截止任务。');
}
function renderTasks(){
  const all=listInstances();
  const pending=all.filter(t=>groupStatus(t)==='pending');
  const overdue=all.filter(t=>groupStatus(t)==='overdue');
  const completed=all.filter(t=>groupStatus(t)==='completed');
  $('#count-pending').textContent=pending.length;
  $('#count-overdue').textContent=overdue.length;
  $('#count-completed').textContent=completed.length;
  for(const btn of $('#status-tabs').querySelectorAll('button')){const active=btn.dataset.status===state.status;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));}
  $('#tasks-filter-row').hidden=state.status!=='pending';
  for(const b of $('#tasks-filter-row').querySelectorAll('button'))b.classList.toggle('active',b.dataset.subtype===state.subtype);
  const holder=$('#task-list-title');holder.replaceChildren();
  const heading=document.createElement('h2');const right=document.createElement('span');right.className='heading-sub';
  let entries=[];
  if(state.status==='pending'){
    entries=pending.filter(x=>state.subtype==='dated'?Boolean(x.date):!x.date);
    heading.textContent=state.subtype==='dated'?'未完成 · 有DDL':'未完成 · 无DDL';
    right.textContent=`${entries.length}项`;
  }else if(state.status==='overdue'){
    entries=overdue;heading.textContent='已逾期';right.textContent=`${entries.length}项`;
  }else{
    entries=completed;heading.textContent='已完成';
    if(entries.length){const clear=document.createElement('button');clear.className='text-button';clear.textContent='清空已完成';clear.addEventListener('click',clearCompleted);holder.append(heading,clear);}
    else right.textContent='0项';
  }
  if(state.status!=='completed'||!entries.length)holder.append(heading,right);
  const sorted=sortTasks(entries,state.status==='pending'&&!entries[0]?.date?'undated':state.status);
  const label=state.status==='completed'?'还没有已完成的任务':state.status==='overdue'?'没有逾期任务':state.subtype==='undated'?'还没有无DDL任务':'目前没有待完成的DDL';
  renderCards($('#all-task-list'),sorted,label,'你可以点击右下角＋添加任务。');
  const showHorizon=state.status==='pending'&&state.subtype==='dated'&&state.items.some(x=>x.type==='series')&&isFutureSeriesBeyond();
  $('#horizon-note').hidden=!showHorizon;$('#horizon-days').textContent=state.seriesHorizon;
}
function renderCards(container,tasks,emptyTitle,emptySubtitle){
  container.replaceChildren();if(!tasks.length){container.append(createEmpty(emptyTitle,emptySubtitle));return;}
  const fragment=document.createDocumentFragment();
  for(const t of tasks){
    const status=groupStatus(t),card=document.createElement('article');card.className=`task-card${status==='completed'?' is-complete':''}${status==='overdue'?' urgent':''}`;
    const check=document.createElement('button');check.type='button';check.className='complete-button'+(status==='completed'?' done':'');
    check.innerHTML=icon(status==='completed'?'check-circle':'circle');check.setAttribute('aria-label',status==='completed'?`取消完成：${t.title}`:`完成：${t.title}`);
    check.addEventListener('click',()=>toggleComplete(t));
    const body=document.createElement('button');body.type='button';body.className='task-body';body.setAttribute('aria-label',`编辑任务：${t.title}`);
    const name=document.createElement('div');name.className='task-name';name.textContent=t.title;body.append(name);
    const info=document.createElement('div');info.className='task-detail';
    const due=document.createElement('span');due.textContent=t.date?`DDL ${displayDue(t)}`:'无DDL';info.append(due);
    if(status==='completed'){
      const label=document.createElement('span');label.className='success-label';label.textContent='✓ 已完成';info.append(label);
    }else if(status==='overdue'){
      const label=document.createElement('span');label.className='urgent-label';label.textContent=`已逾期${durationText(timeLeft(t))}`;info.append(label);
    }else if(t.date){
      const diff=timeLeft(t),label=document.createElement('span');
      if(diff<24*60*60*1000){label.className='urgent-label';label.textContent=`剩余${durationText(diff)}`;}
      else if(diff<7*24*60*60*1000){label.textContent=`剩余${durationText(diff)}`;}
      if(label.textContent)info.append(label);
    }
    if(t.kind==='series'){const label=document.createElement('span');label.className='repeat-indicator';label.innerHTML=icon('repeat');label.append(document.createTextNode('重复'));info.append(label);}
    body.append(info);
    if(t.note){const desc=document.createElement('p');desc.className='note-preview';desc.textContent=t.note;body.append(desc);}
    body.addEventListener('click',()=>openEditor(t));
    const chevron=document.createElement('span');chevron.className='edit-chevron';chevron.innerHTML=icon('chevron-right');
    card.append(check,body,chevron);fragment.append(card);
  }
  container.append(fragment);
}
function renderSettings(){
  $('#theme-select').value=state.prefs.theme;
  $('#week-select').value=String(state.prefs.weekStart);
  $('#backup-time').textContent=state.prefs.lastBackup?`上次导出备份：${new Date(state.prefs.lastBackup).toLocaleString('zh-CN')}`:'还没有导出过备份。建议定期保存到“文件”App。';
  $('#connection-state').textContent=navigator.onLine?'当前在线':'当前离线';
}
function chooseMode(mode){state.mode=mode;
  $('#deadline-fields').hidden=mode==='none';$('#time-field').hidden=mode!=='datetime';
  for(const btn of $('#deadline-modes').querySelectorAll('button'))btn.classList.toggle('active',btn.dataset.mode===mode);
  if(mode==='none'){$('#repeat-kind').value='none';updateRepeatControls();}
  $('#recurrence-fields').hidden=mode==='none'||(state.editor?.kind==='series'&&state.scope==='once');
}
function chooseScope(scope){state.scope=scope;for(const btn of $('#scope-field').querySelectorAll('button'))btn.classList.toggle('active',btn.dataset.scope===scope);
  $('#recurrence-fields').hidden=state.mode==='none'||(state.editor?.kind==='series'&&scope==='once');
  if(scope==='future'&&state.editor?.kind==='series'){const rule=state.items.find(x=>x.id===state.editor.sourceId)?.repeat;if(rule)populateRepeat(rule);}
}
function populateRepeat(rule){
  $('#repeat-kind').value=rule?.kind||'none';$('#repeat-every').value=rule?.every||2;
  $('#repeat-unit').value=rule?.unit||'days';$('#repeat-end').value=rule?.endDate||'';
  state.weekdays=rule?.weekdays ? [...rule.weekdays] : [parseISO($('#task-date').value||todayISO()).getDay()];
  updateRepeatControls();
}
function updateRepeatControls(){
  const kind=$('#repeat-kind').value;
  $('#weekly-options').hidden=kind!=='weekly';$('#custom-options').hidden=kind!=='custom';$('#repeat-end-wrapper').hidden=kind==='none';
  const parent=$('#weekday-picker');parent.replaceChildren();
  for(const day of [1,2,3,4,5,6,0]){
    const button=document.createElement('button');button.type='button';button.textContent='周'+WEEKDAY_NAMES[day];button.classList.toggle('active',state.weekdays.includes(day));button.setAttribute('aria-pressed',String(state.weekdays.includes(day)));
    button.addEventListener('click',()=>{state.weekdays=state.weekdays.includes(day)?state.weekdays.filter(x=>x!==day):[...state.weekdays,day];updateRepeatControls();});
    parent.append(button);
  }
}
function openEditor(task=null){
  state.editor=task;state.scope='once';$('#task-form').reset();$('#form-error').hidden=true;
  $('#editor-heading').textContent=task?'编辑任务':'新增任务';$('#delete-task-button').hidden=!task;
  $('#scope-field').hidden=!task||task.kind!=='series';
  const source=task?state.items.find(x=>x.id===task.sourceId):null;
  $('#task-title').value=task?.title||'';$('#task-note').value=task?.note||'';
  const dated=task?Boolean(task.date):(state.page==='calendar'||state.subtype==='dated');
  const time=task?.time||null;
  const defaultDate=state.page==='calendar'?state.selectedDate:todayISO();
  $('#task-date').value=task?.date||defaultDate;
  $('#task-time').value=time||'23:59';
  const mode=dated?(time?'datetime':'date'):'none';
  populateRepeat(task?.kind==='series'?source?.repeat:null);
  chooseMode(mode);chooseScope('once');
  $('#task-dialog').showModal();
  // 不自动弹出手机键盘；需要编辑时由用户点输入框。
}
function closeEditor(){$('#task-dialog').close();state.editor=null;}
function errorForm(message){const el=$('#form-error');el.textContent=message;el.hidden=false;el.scrollIntoView({behavior:'smooth',block:'center'});}
function formPayload(){
  const title=$('#task-title').value.trim(),note=$('#task-note').value.trim(),mode=state.mode;
  if(!title){errorForm('请填写任务名称。');return null;}
  const date=mode==='none'?null:$('#task-date').value;
  if(mode!=='none'&&!normalizeDate(date)){errorForm('请选择有效的截止日期。');return null;}
  const time=mode==='datetime'?$('#task-time').value:null;
  if(mode==='datetime'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){errorForm('请填写有效的截止时间。');return null;}
  const repeatKind=(state.editor?.kind==='series'&&state.scope==='once')||mode==='none'?'none':$('#repeat-kind').value;
  let repeat=null;
  if(repeatKind!=='none'){
    let every=1,kind=repeatKind,weekdays=[];
    if(repeatKind==='custom'){
      every=Number($('#repeat-every').value);
      if(!Number.isInteger(every)||every<1||every>365){errorForm('自定义重复间隔需为1～365。');return null;}
      kind={days:'daily',weeks:'weekly',months:'monthly'}[$('#repeat-unit').value];
      if(!kind){errorForm('无效的重复单位。');return null;}
    }
    if(kind==='weekly'){
      weekdays=repeatKind==='weekly'?[...state.weekdays]:[parseISO(date).getDay()];
      if(!weekdays.length){errorForm('请至少选择一个每周重复日。');return null;}
      if(!weekdays.includes(parseISO(date).getDay())){errorForm('首次截止日期的星期必须包含在重复日中。');return null;}
    }
    const endDate=$('#repeat-end').value||null;
    if(endDate&&(!normalizeDate(endDate)||endDate<date)){errorForm('重复结束日期不能早于首次DDL。');return null;}
    repeat={kind,every,weekdays,endDate};
  }
  return {title,note,date,time,repeat};
}
async function submitTask(e){
  e.preventDefault();const payload=formPayload();if(!payload)return;
  const editing=state.editor,now=new Date().toISOString();
  try{
    if(!editing){
      const item={id:newId(),type:payload.repeat?'series':'single',title:payload.title,note:payload.note,date:payload.date,time:payload.time,createdAt:now,updatedAt:now};
      if(payload.repeat){item.repeat=payload.repeat;item.exceptions={};}else item.completedAt=null;
      await saveRecord(item);closeEditor();showToast('任务已添加');return;
    }
    const source=state.items.find(x=>x.id===editing.sourceId);if(!source){errorForm('找不到原任务，请关闭后重试。');return;}
    if(editing.kind==='single'){
      const item={...source,type:payload.repeat?'series':'single',title:payload.title,note:payload.note,date:payload.date,time:payload.time,updatedAt:now};
      if(payload.repeat){item.repeat=payload.repeat;item.exceptions={};if(source.completedAt)item.exceptions[payload.date]={completedAt:source.completedAt};delete item.completedAt;}
      else{item.completedAt=source.completedAt||null;delete item.repeat;delete item.exceptions;}
      await saveRecord(item);
    }else if(state.scope==='once'){
      const copied={...source,exceptions:{...source.exceptions,[editing.occurrenceDate]:{skip:true}},updatedAt:now};
      const alone={id:newId(),type:'single',title:payload.title,note:payload.note,date:payload.date,time:payload.time,completedAt:editing.completedAt||null,createdAt:now,updatedAt:now};
      // 一次数据库事务，保证拆分实例和遮蔽原实例同时保存。
      await batchPut([copied,alone]);
    }else{
      await splitFuture(source,editing.occurrenceDate,payload,now);
    }
    closeEditor();showToast('任务已保存');
  }catch(err){console.error(err);errorForm('保存失败。请检查设备存储空间后重试。');}
}
function batchPut(records){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME);for(const item of records)store.put(item);tx.oncomplete=()=>{const ids=new Set(records.map(x=>x.id));state.items=state.items.filter(x=>!ids.has(x.id)).concat(records);render();resolve();};tx.onerror=()=>reject(tx.error);});}
async function splitFuture(source,start,payload,now){
  const until=plusDays(start,-1);
  const earlier={...source,repeat:{...source.repeat,endDate:source.repeat.endDate&&source.repeat.endDate<until?source.repeat.endDate:until},exceptions:{...source.exceptions},updatedAt:now};
  const moved=[];
  for(const [date,exception] of Object.entries(earlier.exceptions)){
    if(date>=start){
      if(exception.completedAt&&!exception.skip)moved.push({id:newId(),type:'single',title:source.title,note:source.note,date,time:source.time,completedAt:exception.completedAt,createdAt:now,updatedAt:now});
      delete earlier.exceptions[date];
    }
  }
  const replacement={id:newId(),type:payload.repeat?'series':'single',title:payload.title,note:payload.note,date:payload.date,time:payload.time,createdAt:now,updatedAt:now};
  if(payload.repeat){replacement.repeat=payload.repeat;replacement.exceptions={};}
  else replacement.completedAt=null;
  await batchPut([earlier,replacement,...moved]);
}
async function toggleComplete(task){
  const now=new Date().toISOString(),isDone=Boolean(task.completedAt);
  const source=state.items.find(x=>x.id===task.sourceId);if(!source)return;
  try{
    if(task.kind==='single')await saveRecord({...source,completedAt:isDone?null:now,updatedAt:now});
    else{
      const next={...source,exceptions:{...source.exceptions,[task.occurrenceDate]:isDone?{}:{completedAt:now}},updatedAt:now};
      await saveRecord(next);
    }
    showToast(isDone?'已取消完成':'已完成 ✓');
  }catch{showToast('更新失败，请重试');}
}
function choose(title,message,buttons){
  return new Promise(resolve=>{
    const dialog=$('#choice-dialog'),container=$('#choice-actions');
    $('#choice-title').textContent=title;$('#choice-message').textContent=message;container.replaceChildren();
    let decided=false;
    const finish=result=>{if(decided)return;decided=true;dialog.close();resolve(result);};
    for(const b of buttons){
      const btn=document.createElement('button');btn.type='button';btn.textContent=b.text;btn.className=b.style||'';btn.addEventListener('click',()=>finish(b.value));container.append(btn);
    }
    $('#choice-cancel').onclick=()=>finish(null);
    dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);},{once:true});
    dialog.showModal();
  });
}
async function deleteTask(){
  const t=state.editor;if(!t)return;
  const scope=t.kind==='series' ? await choose('删除重复任务','请选择删除当前这一次，还是停止从本次开始的所有未来重复。',[
    {text:'仅删除本次',value:'once',style:'danger'},{text:'删除本次及以后',value:'future',style:'secondary'}
  ]) : await choose('删除任务',`确定删除“${t.title}”吗？`,[{text:'确认删除',value:'once',style:'danger'}]);
  if(!scope)return;
  const source=state.items.find(x=>x.id===t.sourceId);if(!source)return;
  try{
    if(t.kind==='single')await deleteRecord(source.id);
    else if(scope==='once')await saveRecord({...source,exceptions:{...source.exceptions,[t.occurrenceDate]:{skip:true}},updatedAt:new Date().toISOString()});
    else{
      const stop=plusDays(t.occurrenceDate,-1);
      await saveRecord({...source,repeat:{...source.repeat,endDate:source.repeat.endDate&&source.repeat.endDate<stop?source.repeat.endDate:stop},updatedAt:new Date().toISOString()});
    }
    closeEditor();showToast('已删除任务');
  }catch{showToast('删除失败，请重试');}
}
async function clearCompleted(){
  const completed=listInstances().filter(x=>x.completedAt);
  const answer=await choose('清空已完成',`将删除${completed.length}项已完成记录。重复任务的未来安排不会受到影响。此操作不可撤销。`,[{text:'确认清空',value:true,style:'danger'}]);
  if(!answer)return;
  const toDelete=new Set(completed.filter(x=>x.kind==='single').map(x=>x.sourceId));
  const recurring=new Map();
  for(const t of completed.filter(x=>x.kind==='series')){if(!recurring.has(t.sourceId))recurring.set(t.sourceId,[]);recurring.get(t.sourceId).push(t.occurrenceDate);}
  try{
    const tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME);
    for(const id of toDelete)store.delete(id);
    const updated=[];
    for(const [id,dates] of recurring){const source=state.items.find(x=>x.id===id);if(!source)continue;
      const exceptions={...source.exceptions};for(const day of dates)exceptions[day]={skip:true};
      const newer={...source,exceptions,updatedAt:new Date().toISOString()};store.put(newer);updated.push(newer);
    }
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    state.items=state.items.filter(x=>!toDelete.has(x.id));for(const newer of updated)state.items=state.items.filter(x=>x.id!==newer.id).concat(newer);
    render();showToast('已清空已完成任务');
  }catch{showToast('清空失败，请重试');}
}
function validateBackup(input){
  if(!input||input.app!=='ddl-calendar'||input.schemaVersion!==1||!Array.isArray(input.items)||input.items.length>150000)throw new Error('不是受支持的DDL日历备份文件。');
  const ids=new Set();
  const clean=input.items.map(raw=>{
    if(!raw||typeof raw!=='object'||!['single','series'].includes(raw.type)||typeof raw.id!=='string'||raw.id.length>150||!raw.id||ids.has(raw.id)||typeof raw.title!=='string'||raw.title.length>160||!raw.title.trim())throw new Error('备份中有无效任务或重复ID。');
    ids.add(raw.id);
    const date=raw.date??null,time=raw.time??null;
    if(date!==null&&!normalizeDate(date))throw new Error('备份日期无效。');
    if(time!==null&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!date))throw new Error('备份时间无效。');
    const rec={id:raw.id,type:raw.type,title:raw.title,note:typeof raw.note==='string'?raw.note.slice(0,3000):'',date,time,createdAt:raw.createdAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString()};
    if(raw.type==='single')rec.completedAt=typeof raw.completedAt==='string'?raw.completedAt:null;
    else{
      const rule=raw.repeat;
      if(!date||!rule||!['daily','weekly','monthly'].includes(rule.kind)||!Number.isInteger(rule.every)||rule.every<1||rule.every>365)throw new Error('备份重复规则无效。');
      if(rule.endDate!=null&&!normalizeDate(rule.endDate))throw new Error('备份重复结束日期无效。');
      const weekdays=Array.isArray(rule.weekdays)?rule.weekdays.filter(x=>Number.isInteger(x)&&x>=0&&x<=6):[];
      if(rule.kind==='weekly'&&!weekdays.length)throw new Error('备份每周重复日无效。');
      rec.repeat={kind:rule.kind,every:rule.every,weekdays,endDate:rule.endDate||null};rec.exceptions={};
      if(raw.exceptions&&typeof raw.exceptions==='object'&&!Array.isArray(raw.exceptions)){
        for(const [d,ex] of Object.entries(raw.exceptions)){
          if(!normalizeDate(d)||!ex||typeof ex!=='object')continue;
          rec.exceptions[d]={};if(ex.skip===true)rec.exceptions[d].skip=true;
          if(typeof ex.completedAt==='string')rec.exceptions[d].completedAt=ex.completedAt;
        }
      }
    }
    return rec;
  });
  return {items:clean,prefs:input.prefs&&typeof input.prefs==='object'?input.prefs:{}};
}
function makeBackup(){return {app:'ddl-calendar',schemaVersion:1,exportedAt:new Date().toISOString(),items:state.items,prefs:{theme:state.prefs.theme,weekStart:state.prefs.weekStart}};}
async function exportBackup(){
  const json=JSON.stringify(makeBackup(),null,2),blob=new Blob([json],{type:'application/json'});
  const filename=`DDL日历备份_${todayISO()}.json`;
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  state.prefs.lastBackup=new Date().toISOString();savePrefs();renderSettings();showToast('备份文件已生成，请确认已保存到“文件”App');
}
async function importBackup(file){
  if(!file)return;if(file.size>15*1024*1024){showToast('备份文件过大（上限15MB）');return;}
  let backup;try{backup=validateBackup(JSON.parse(await file.text()));}catch(e){showToast(e.message||'无法读取备份文件');return;}
  const mode=await choose('导入备份',`检测到${backup.items.length}条任务或重复规则。\n请选择保留现有数据后合并，或先清空再完全替换。`,[
    {text:'合并到现有任务',value:'merge'}, {text:'替换现有所有任务',value:'replace',style:'danger'}
  ]);
  if(!mode)return;
  try{
    let final=backup.items;
    if(mode==='merge'){
      const ids=new Set(state.items.map(x=>x.id));
      final=state.items.concat(backup.items.map(rec=>{if(ids.has(rec.id)){rec={...rec,id:newId()};}ids.add(rec.id);return rec;}));
    }
    await replaceDB(final);state.items=final;
    if(mode==='replace'){
      if(['system','light','dark'].includes(backup.prefs.theme))state.prefs.theme=backup.prefs.theme;
      if([0,1].includes(backup.prefs.weekStart))state.prefs.weekStart=backup.prefs.weekStart;
      savePrefs();setTheme();
    }
    render();showToast(`导入成功，当前共${state.items.length}条任务或重复规则`);
  }catch(err){console.error(err);showToast('导入失败，请检查本机存储空间');}
}
async function clearAll(){
  const answer=await choose('清空全部任务','将永久删除此设备上的所有任务、完成记录和重复规则。请先导出备份。', [{text:'我确认清空全部',value:true,style:'danger'}]);
  if(!answer)return;
  try{await replaceDB([]);state.items=[];render();showToast('已清空全部任务');}catch{showToast('清空失败，请重试');}
}
function installEvents(){
  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
  $('#add-task-button').addEventListener('click',()=>openEditor());
  $('#prev-month').addEventListener('click',()=>changeMonth(-1));$('#next-month').addEventListener('click',()=>changeMonth(1));
  $('#jump-today').addEventListener('click',()=>goToday());$('#month-title').addEventListener('click',()=>goToday());
  $('#calendar-grid').addEventListener('click',event=>{const btn=event.target.closest('[data-date]');if(!btn)return;state.selectedDate=btn.dataset.date;state.viewMonth=state.selectedDate.slice(0,7);render();});
  let gesture=null;
  $('#calendar-grid').addEventListener('touchstart',e=>{const t=e.touches[0];gesture={x:t.clientX,y:t.clientY};},{passive:true});
  $('#calendar-grid').addEventListener('touchend',e=>{if(!gesture)return;const t=e.changedTouches[0];const dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;gesture=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.6){changeMonth(dx<0?1:-1);}}, {passive:true});
  document.querySelectorAll('#status-tabs button').forEach(btn=>btn.addEventListener('click',()=>{state.status=btn.dataset.status;render();}));
  document.querySelectorAll('#tasks-filter-row button').forEach(btn=>btn.addEventListener('click',()=>{state.subtype=btn.dataset.subtype;render();}));
  $('#load-more-series').addEventListener('click',()=>{state.seriesHorizon+=90;render();});
  $('#cancel-editor').addEventListener('click',closeEditor);
  $('#task-form').addEventListener('submit',submitTask);
  $('#delete-task-button').addEventListener('click',deleteTask);
  $('#task-dialog').addEventListener('click',e=>{if(e.target===$('#task-dialog'))closeEditor();});
  document.querySelectorAll('#deadline-modes button').forEach(btn=>btn.addEventListener('click',()=>chooseMode(btn.dataset.mode)));
  document.querySelectorAll('#scope-field button').forEach(btn=>btn.addEventListener('click',()=>chooseScope(btn.dataset.scope)));
  $('#repeat-kind').addEventListener('change',()=>{
    if($('#repeat-kind').value==='weekly'&&state.editor?.kind!=='series')state.weekdays=[parseISO($('#task-date').value||todayISO()).getDay()];
    updateRepeatControls();
  });
  $('#task-date').addEventListener('change',()=>{if($('#repeat-kind').value==='weekly'&&state.editor?.kind!=='series'&&normalizeDate($('#task-date').value))state.weekdays=[parseISO($('#task-date').value).getDay()];updateRepeatControls();});
  $('#theme-select').addEventListener('change',e=>{state.prefs.theme=e.target.value;savePrefs();setTheme();});
  $('#week-select').addEventListener('change',e=>{state.prefs.weekStart=Number(e.target.value);savePrefs();render();});
  $('#export-button').addEventListener('click',exportBackup);
  $('#import-button').addEventListener('click',()=>$('#import-file').click());
  $('#import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';await importBackup(file);});
  $('#clear-all-button').addEventListener('click',clearAll);
  window.addEventListener('online',()=>{if(state.page==='settings')renderSettings();});
  window.addEventListener('offline',()=>{if(state.page==='settings')renderSettings();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  setInterval(()=>{if(!document.hidden)render();},60000);
}
function changeMonth(amount){
  const [y,m]=state.viewMonth.split('-').map(Number);
  const date=new Date(y,m-1+amount,1,12);
  state.viewMonth=localISO(date).slice(0,7);
  const selected=parseISO(state.selectedDate);
  const day=Math.min(selected.getDate(),new Date(date.getFullYear(),date.getMonth()+1,0).getDate());
  state.selectedDate=localISO(new Date(date.getFullYear(),date.getMonth(),day,12));
  render();
}
function goToday(){state.selectedDate=todayISO();state.viewMonth=state.selectedDate.slice(0,7);render();}
async function main(){
  loadPrefs();setTheme();installEvents();
  try{db=await openDB();state.items=await getAllDB();render();}
  catch(err){console.error(err);$('#day-list').replaceChildren(createEmpty('无法开启本地数据库','请使用Safari或Chrome正常浏览模式打开，不要使用限制存储的浏览模式。'));showToast('本地存储不可用，任务无法保存');$('#add-task-button').disabled=true;}
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('离线缓存未能注册:',err));
  }
}
main();
