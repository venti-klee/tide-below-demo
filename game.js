const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const app = $('#app');

const state = {
  version: 3, act: 0, phase: 0, muted: false, truthful: null, trust: 0,
  gauges: new Set(), doorStep: 0, beats: [],
  words: {}, selectedWord: null, facility: null,
  route: 0, flood: 18, syncHits: 0, syncMisses: 0,
  pipe:[90,90,0,270,90,0,90], pipeVersion:2, day:1, materials:1, support:0, lexicon:0,
  roomClues:[], inventory:[], selectedItem:null, traceStep:0
};

const copy = {
  1:{title:'水位正常',objective:'环顾岗房，利用现场物品确认五条相互关联的线索。'},
  2:{title:'门后有人',objective:'确认敲击节奏，按维护经验打开观察孔。'},
  3:{title:'先听懂名字',objective:'用两个不同语境，验证三个关键守语词。'},
  4:{title:'同声',objective:'赶在潮线前抵达三个节点，让一套系统重新协同。'}
};

let audioCtx;
function tone(freq=220,dur=.08,type='sine',vol=.035){
  if(state.muted) return;
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);
    o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}
function knock(){tone(92,.11,'triangle',.06)}
function notify(msg){
  let t=$('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>t.classList.remove('show'),1800);
}
function dialogue(speaker,text){
  const box=$('.story-box'); if(!box)return;
  box.innerHTML=`<div class="speaker">${speaker}</div><div class="dialogue">${text}</div>`;
}
function save(){localStorage.setItem('tide-demo',JSON.stringify({...state,gauges:[...state.gauges]}))}
function reset(){localStorage.removeItem('tide-demo');location.reload()}

function header(act){
  return `<header class="topbar">
    <div class="brand">门下有潮声</div>
    <nav class="act-nav" aria-label="章节进度">${[1,2,3,4].map(n=>`<i class="act-dot ${n<act?'done':''} ${n===act?'active':''}"><span>${['值守','门声','译词','同声'][n-1]}</span></i>`).join('')}</nav>
    <div class="top-tools"><button class="icon-btn" id="sound" aria-label="切换声音">${state.muted?'×':'♪'}</button><button class="icon-btn" id="restart" aria-label="重新开始">↺</button></div>
  </header>`;
}
function shell(act,stage,story,extra=''){
  const c=copy[act];
  app.innerHTML=`<section class="screen game">${header(act)}<div class="chapter">
    <div class="stage">${stage}</div>
    <aside class="side"><div class="chapter-no">ACT 0${act} / CONDENSED DEMO</div><h2>${c.title}</h2><div class="objective"><b>当前目标</b><br>${c.objective}</div>
    <div class="story-box"><div class="speaker">${story.speaker}</div><div class="dialogue">${story.text}</div></div>
    ${extra}<div class="side-bottom"><div class="status-row"><span>潮压</span><span id="pressureText">${Math.round(state.flood)}%</span></div><div class="meter"><i id="pressure" style="width:${state.flood}%"></i></div><div class="action-row" id="actions"></div></div>
    </aside></div></section>`;
  $('#sound').onclick=()=>{state.muted=!state.muted;$('#sound').textContent=state.muted?'×':'♪'};
  $('#restart').onclick=()=>{if(confirm('重新开始这段值守？'))reset()};
}

function cover(){
  state.act=0;
  app.innerHTML=`<section class="screen cover"><div class="cover-art"></div><div class="cover-inner">
    <div><div class="seal"><span>潮</span></div><div class="eyebrow">A CONDENSED WEB GAME PROTOTYPE</div><h1 class="title">门下有潮声</h1><p class="cover-sub">听见人声，先问名字</p>
      <p class="cover-copy">你叫梁顺，是守了二十七年石门的旧渠值守人。规章说门后只有废渠，水表说一切正常。今晚，石头却叫出了你的名字。</p>
      <div class="cover-actions"><button class="btn primary" id="start">开始值守</button><button class="btn ghost" id="continue">读取记录</button></div>
      <div class="cover-meta"><span>叙事解谜</span><span>键鼠 / 触屏</span><span>约 20 分钟</span></div>
    </div>
    <div class="cover-note"><b>本次试玩</b><p>四幕各截取一个关键交互，并用同一套“观察—记录—沟通—协同”循环连接。选择不会堵死主线，但会改变最后的损失与记录。</p></div>
  </div></section>`;
  $('#start').onclick=()=>{tone(180,.2,'triangle');act1()};
  const saved=localStorage.getItem('tide-demo');let parsed=null;try{parsed=JSON.parse(saved)}catch(e){}$('#continue').disabled=!parsed||parsed.version!==3;
  $('#continue').onclick=()=>{const s=parsed;Object.assign(state,s);state.gauges=new Set(s.gauges||[]);renderAct(Math.max(1,state.act))};
}
function renderAct(n){({1:act1,2:act2,3:act3,4:act4,5:ending}[n]||cover)()}

function act1(){
  state.act=1;save();
  const done=id=>state.roomClues.includes(id);
  const hotspot=(id,label,x,y)=>`<button class="room-hotspot ${done(id)?'found':''}" data-hotspot="${id}" data-hx="${x}" style="top:${y}%"><i></i><span>${label}</span></button>`;
  const stage=`<div class="pano-viewport" id="pano" tabindex="0"><div class="pano-world" id="panoWorld">
    <div class="pano-light"></div>${hotspot('gauges','三路水表',11,37)}${hotspot('desk','值守桌',87,62)}${hotspot('map','歪斜水路图',93,40)}${hotspot('cabinet','墙后空响',96,58)}${hotspot('door','石门观察孔',44,48)}${hotspot('bowl','缺口酒碗',63,61)}${hotspot('drain','沉积格栅',25,68)}
  </div><div class="pano-reticle">＋</div><div class="pano-help">按住拖动环顾 · 滚轮／方向键转向</div><div class="pano-compass"><i id="compassNeedle"></i><span>岗房 180°</span></div></div><div id="roomModal"></div>`;
  const inv=`<div class="room-progress"><span>已确认线索</span><b id="clueCount">${state.roomClues.filter(x=>['desk','gauges','map','cabinet','door'].includes(x)).length} / 5</b></div><div class="inventory" id="inventory"></div>`;
  shell(1,stage,{speaker:'梁顺 · 夜班',text:'这次不从谜题面板开始。先环顾整间岗房，决定什么值得靠近、什么应该带在身上。'},inv);
  renderInventory();bindPanorama();
  $$('[data-hotspot]').forEach(h=>h.onclick=e=>{e.stopPropagation();openRoomInspect(h.dataset.hotspot)});
  checkRoomComplete();
}

function addClue(id){if(!state.roomClues.includes(id))state.roomClues.push(id);save()}
function addItem(id){if(!state.inventory.includes(id))state.inventory.push(id);save()}
function bindPanorama(){
  const view=$('#pano'),world=$('#panoWorld');let yaw=.44,start=0,origin=0,drag=false;
  const wrap=v=>((v%1)+1)%1;
  const draw=()=>{
    const scale=view.clientWidth<=700?1.65:1.42,panoWidth=view.clientHeight*2.000*scale;
    world.style.backgroundPosition=`${view.clientWidth/2-yaw*panoWidth}px center`;
    $$('[data-hx]',world).forEach(h=>{let d=wrap(+h.dataset.hx/100-yaw+.5)-.5,px=view.clientWidth/2+d*panoWidth;h.style.left=px+'px';h.style.visibility=px>-55&&px<view.clientWidth+55?'visible':'hidden'});
    $('#compassNeedle').style.transform=`translateX(${yaw*112}px)`;
  };draw();
  view.onpointerdown=e=>{if(e.target.closest('button'))return;drag=true;start=e.clientX;origin=yaw;view.setPointerCapture(e.pointerId);view.classList.add('dragging')};
  view.onpointermove=e=>{if(drag){const panoWidth=view.clientHeight*2*(view.clientWidth<=700?1.65:1.42);yaw=wrap(origin-(e.clientX-start)/panoWidth);draw()}};view.onpointerup=()=>{drag=false;view.classList.remove('dragging')};
  view.onwheel=e=>{yaw=wrap(yaw+(e.deltaY+e.deltaX)*.00032);draw();e.preventDefault()};
  view.onkeydown=e=>{if(e.key==='ArrowLeft')yaw=wrap(yaw-.035);if(e.key==='ArrowRight')yaw=wrap(yaw+.035);draw()};
  window.onresize=draw;
}
function renderInventory(){
  const box=$('#inventory');if(!box)return;const meta={horn:['听潮筒','0% 0%'],oil:['灯油','50% 0%'],hook:['检样钩','0% 100%'],notebook:['赵川册','100% 0%']};
  box.innerHTML=state.inventory.length?state.inventory.map(id=>`<button class="inventory-item ${state.selectedItem===id?'selected':''}" data-item="${id}"><i style="background-position:${meta[id][1]}"></i><span>${meta[id][0]}</span></button>`).join(''):'<div class="inventory-empty">腰包是空的</div>';
  $$('[data-item]').forEach(b=>b.onclick=()=>{state.selectedItem=state.selectedItem===b.dataset.item?null:b.dataset.item;renderInventory();notify(state.selectedItem?`已拿起：${meta[state.selectedItem][0]}`:'已放回腰包');save()});
}
function closeRoomModal(){const m=$('#roomModal');if(m)m.innerHTML=''}
function roomModal(title,body,actions=''){const m=$('#roomModal');m.innerHTML=`<div class="inspect-shade"><section class="inspect-modal"><button class="inspect-close" id="inspectClose">×</button><div class="eyebrow">场景近景 / ${title}</div>${body}<div class="action-row">${actions}</div></section></div>`;$('#inspectClose').onclick=closeRoomModal}
function openRoomInspect(id){
  if(id==='desk')roomModal('值守桌',`<div class="inspect-layout"><div class="prop-crop notebook"></div><div><h3>五月十九值守簿</h3><p>往年这一页的三路读数整齐得不自然。桌角还放着听潮筒、灯油和检样钩。</p></div></div>`,`<button class="btn primary" id="collectDesk">整理腰包</button>`),$('#collectDesk').onclick=()=>{['horn','oil','hook'].forEach(addItem);addClue('desk');renderInventory();closeRoomModal();act1()};
  if(id==='gauges'){
    if(!state.inventory.includes('oil')){roomModal('三路水表','<p class="inspect-message">玻璃蒙着矿灰，灯光太暗。值守桌上应该有能清洁、补光的东西。</p>');return}
    const data=[['主门',4.1,-18],['侧渠',7.8,46],['街井',4.0,-20]];roomModal('三路水表',`<p class="inspect-message">移动灯光，逐一点击表盘读数。</p><div class="mini-gauges">${data.map((g,i)=>`<button class="mini-gauge ${state.gauges.has(i)?'read':''}" data-read="${i}" style="--rot:${g[2]}deg"><i></i><span>${g[0]}<b>${state.gauges.has(i)?g[1]:'—'}</b></span></button>`).join('')}</div><div id="stampArea"></div>`);
    $$('[data-read]').forEach(b=>b.onclick=()=>{const i=+b.dataset.read;state.gauges.add(i);b.classList.add('read');b.querySelector('b').textContent=data[i][1];tone(180+i*50,.1);if(state.gauges.size===3){$('#stampArea').innerHTML='<p class="blue">主门与街井持平，侧渠压力却高了一倍。</p><button class="stamp" data-record="normal">水位平稳</button> <button class="stamp truth" data-record="truth">总压异常</button>';$$('[data-record]').forEach(s=>s.onclick=()=>{state.truthful=s.dataset.record==='truth';if(state.truthful)state.trust++;addClue('gauges');save();closeRoomModal();act1()})}save()});
  }
  if(id==='map'){
    if(!state.roomClues.includes('gauges')){roomModal('歪斜水路图','<p class="inspect-message">图上有三条褪色管线，但你还不知道该追哪一条。先取得真实读数。</p>');return}
    roomModal('歪斜水路图','<div class="inspect-layout"><div class="prop-crop blueprint"></div><div><h3>官方图删去了一段旧渠</h3><p>侧渠的红线在纸边突然中断，墙后却传来空响。</p></div></div>','<button class="btn primary" id="markMap">在墙上标记空腔</button>');$('#markMap').onclick=()=>{addClue('map');closeRoomModal();act1()};
  }
  if(id==='cabinet'){
    if(!state.roomClues.includes('map')){roomModal('墙后空响','<p class="inspect-message">石墙听起来是空的，但现行水路图挡住了接缝。</p>');return}
    roomModal('隐藏铁柜','<div class="inspect-layout"><div class="prop-crop notebook"></div><div><h3>封门预案</h3><p>“听见人声不得回应。”如果门后真的只有死渠，为什么会有这一条？</p></div></div>','<button class="btn primary" id="takeNote">收起赵川册页</button>');$('#takeNote').onclick=()=>{addItem('notebook');addClue('cabinet');closeRoomModal();act1()};
  }
  if(id==='door'){
    if(state.selectedItem!=='horn'){roomModal('石门观察孔',`<p class="inspect-message">石面后的声音太轻。请先在腰包中选择<strong>听潮筒</strong>，再调查这里。</p>`);return}
    roomModal('石门听潮点',`<div class="listen-close"><div class="wave">${waveBars()}</div><div class="rhythm-readout">● ● ●　|　● ●　|　●</div></div><p class="inspect-message">不规则水声里，有人稳定地敲出三下、两下、一下。</p>`,'<button class="btn primary" id="confirmVoice">确认：这是人为报码</button>');$('#confirmVoice').onclick=()=>{addClue('door');state.selectedItem=null;closeRoomModal();act1()};
  }
  if(id==='bowl'){roomModal('缺口酒碗','<p class="inspect-message">梁顺每年都给赵川留一口酒。碗沿的缺口朝向石门，像一个没有说完的回答。</p>','<button class="btn" id="pourWine">倒一点酒</button>');$('#pourWine').onclick=()=>{addClue('bowl');state.trust++;closeRoomModal();act1()}}
  if(id==='drain'){roomModal('沉积格栅','<p class="inspect-message">格栅里卡着一根本地没有的亮蓝纤维。用检样钩可以完整取出。</p>',state.selectedItem==='hook'?'<button class="btn primary" id="takeFiber">勾出蓝色纤维</button>':'<span class="muted">选择检样钩后再来</span>');const t=$('#takeFiber');if(t)t.onclick=()=>{addClue('drain');state.support++;state.selectedItem=null;closeRoomModal();act1()}}
}
function checkRoomComplete(){
  const req=['desk','gauges','map','cabinet','door'],n=req.filter(x=>state.roomClues.includes(x)).length;const c=$('#clueCount');if(c)c.textContent=`${n} / 5`;
  if(n===5){$('#actions').innerHTML='<button class="btn primary" id="next">在墙图上追踪真实水路</button>';$('#next').onclick=wallTracePuzzle;dialogue('梁顺 · 调查结论','读数、旧图、封门预案和门后报码现在指向同一个结论：这间岗房一直把“人”记录成了“设备异常”。')}
}

function wallTracePuzzle(){
  state.traceStep=0;const points=[['侧渠异常',12,70],['墙后空腔',33,48],['观察孔',52,63],['被删旧渠',70,38],['门后水路',88,22]];
  const stage=`<div class="trace-stage"><div class="trace-paper"></div><svg class="trace-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline id="traceLine" points=""/></svg>${points.map((p,i)=>`<button class="trace-node ${i===0?'available':''}" data-trace="${i}" style="left:${p[1]}%;top:${p[2]}%"><i>${i+1}</i><span>${p[0]}</span></button>`).join('')}</div>`;
  shell(1,stage,{speaker:'梁顺 · 水路图近景',text:'不要旋转一组没有空间意义的方格。按照刚才在房间里找到的证据，从“侧渠异常”开始，把真实水路逐点连到门后。'});
  $$('[data-trace]').forEach(b=>b.onclick=()=>{const i=+b.dataset.trace;if(i!==state.traceStep){notify('这条线缺少前一段证据');return}b.classList.add('done');state.traceStep++;const pts=points.slice(0,state.traceStep).map(p=>`${p[1]},${p[2]}`).join(' ');$('#traceLine').setAttribute('points',pts);const next=$(`[data-trace="${state.traceStep}"]`);if(next)next.classList.add('available');tone(240+i*60,.12);if(state.traceStep===points.length){dialogue('梁顺 · 水路图','红线没有止于废渠。它穿过石门，继续向图纸被裁掉的上方延伸。');$('#actions').innerHTML='<button class="btn primary" id="next">把听潮筒贴上石门</button>';$('#next').onclick=()=>{state.act=2;save();act2()}}});
}

function pipePuzzle(){
  const route=[
    {idx:0,type:'straight',target:0}, {idx:1,type:'corner',target:180},
    {idx:5,type:'straight',target:90}, {idx:9,type:'corner',target:0},
    {idx:10,type:'straight',target:0}, {idx:11,type:'corner',target:180},
    {idx:15,type:'corner',target:0}
  ];
  if(state.pipeVersion!==2||!Array.isArray(state.pipe)||state.pipe.length!==7){state.pipe=[90,90,0,270,90,0,90];state.pipeVersion=2}
  const byIndex=new Map(route.map((p,i)=>[p.idx,{...p,order:i}]));
  const stage=`<div class="gauge-stage" style="position:absolute;inset:0;filter:brightness(.55)"></div><div class="pipe-board"><span class="pipe-source" style="top:30%">街井来水 →</span><div class="pipe-grid">${Array.from({length:16},(_,i)=>{const p=byIndex.get(i);return p?`<button class="pipe-tile ${p.type}" data-pipe="${i}" data-order="${p.order}" aria-label="旋转第 ${p.order+1} 段水管" style="--r:${state.pipe[p.order]}deg"></button>`:`<button class="pipe-tile blank" disabled></button>`}).join('')}<div class="pipe-hint" id="pipeHint">已从入口接通 <b id="pipeCount">0</b> / 7 段 · 直管反向也算接通</div></div><span class="pipe-exit" style="top:74%">→ 沉积槽</span></div>`;
  shell(1,stage,{speaker:'梁顺 · 水位廊',text:'水表只能告诉你哪里不对。要确认回流，得把旁通旧管重新接上——水会自己画出答案。'});
  $('#actions').innerHTML='<button class="btn small ghost" id="resetPipe">重置水管</button>';
  const isMatch=(v,p)=>p.type==='straight'?(v%180)===(p.target%180):v%360===p.target;
  function updateFlow(){
    let connected=0;for(let i=0;i<route.length;i++){if(isMatch(state.pipe[i],route[i]))connected++;else break}
    $$('[data-pipe]').forEach(el=>el.classList.toggle('flow',+el.dataset.order<connected));$('#pipeCount').textContent=connected;
    $('#pipeHint').classList.toggle('blue',connected>0);
    if(connected===route.length){dialogue('梁顺 · 确认','蓝色回流从入口一路亮到沉积槽。不是雨季水涨，是门后有一股压力正在找出口。');notify('水路接通：异常来自石门后');$('#actions').innerHTML='<button class="btn primary" id="next">沿着回声走向石门</button>';$('#next').onclick=()=>{state.act=2;state.phase=0;save();act2()}}
  }
  $$('[data-pipe]').forEach(el=>el.onclick=()=>{const i=+el.dataset.order;state.pipe[i]=(state.pipe[i]+90)%360;el.style.setProperty('--r',state.pipe[i]+'deg');tone(165+i*18,.07,'triangle');updateFlow();save()});
  $('#resetPipe').onclick=()=>{state.pipe=[90,90,0,270,90,0,90];$$('[data-pipe]').forEach(el=>{const i=+el.dataset.order;el.style.setProperty('--r',state.pipe[i]+'deg')});updateFlow();save();notify('已恢复初始管路')};
  updateFlow();
}

function waveBars(){return Array.from({length:25},(_,i)=>`<i style="--h:${18+Math.abs(Math.sin(i*.88))*70}%;--d:${-i*.055}s"></i>`).join('')}
function act2(){
  state.act=2;save();
  const groups=[3,2,1],done=state.beats.length;
  const stage=`<div class="door-stage" style="position:absolute;inset:0;filter:brightness(.45)"></div><div class="rhythm-board"><div class="rhythm-card"><div class="eyebrow">听筒回声 / 自动转写已开启</div><div class="rhythm-demo">${groups.map((n,i)=>`<div class="rhythm-group ${i<done?'done':i===done?'current':''}" data-label="${i<done?'已确认':i===done?'正在回应':'等待'}">${'<i></i>'.repeat(n)}</div>`).join('')}</div><div class="rhythm-status"><span id="rhythmHint">${done?'继续当前进度':'门后示范：三下｜两下｜一下'}</span><span id="rhythmCount">已确认 ${done} / 3 组</span></div><button class="tap-large" id="tap">敲击当前组 · 需要 ${groups[done]||0} 下</button></div></div>`;
  shell(2,stage,{speaker:'门后 · 未知',text:'这不是考反应的音游。先看清完整节奏，再逐组回应；每组确认后都会保存，不会整段清空。'});
  let group=done,taps=0,locked=false;
  $('#tap').onclick=()=>{
    if(locked||group>=3)return;knock();taps++;const g=$$('.rhythm-group')[group],pips=$$('i',g);if(pips[taps-1])pips[taps-1].classList.add('hit');$('#rhythmHint').textContent=`第 ${group+1} 组：${taps} / ${groups[group]} 下`;
    if(taps===groups[group]){locked=true;setTimeout(()=>{g.classList.add('done');g.classList.remove('current');state.beats.push(groups[group]);group++;taps=0;$('#rhythmCount').textContent=`已确认 ${group} / 3 组`;notify(`第 ${group} 组已确认，进度已保存`);if(group<3){$$('.rhythm-group')[group].classList.add('current');$('#tap').textContent=`敲击当前组 · 需要 ${groups[group]} 下`;$('#rhythmHint').textContent=`停顿已自动确认。请回应第 ${group+1} 组。`;locked=false}else{tone(520,.3,'sine');$('#tap').disabled=true;$('#tap').textContent='回应完成：三｜二｜一';dialogue('门后 · 年轻女声','“……梁顺。”她停了一下，又说：“赵川。”她知道你，也知道那个失踪二十七年的人。');$('#actions').innerHTML='<button class="btn primary" id="next">打开观察孔</button>';$('#next').onclick=doorTools}save()},280)}
  };
  if(done===3){$('#actions').innerHTML='<button class="btn primary" id="next">打开观察孔</button>';$('#next').onclick=doorTools}
}

function doorTools(){
  const stage=`<div class="door-stage" style="position:absolute;inset:0"></div><div class="door-ui"><div class="tool-tray" style="left:50%;transform:translateX(-50%);bottom:11%"><button class="tool ${state.doorStep>0?'used':state.doorStep===0?'next':''}" data-tool="0"><em>♨</em>热气</button><button class="tool ${state.doorStep>1?'used':state.doorStep===1?'next':''}" data-tool="1"><em>◒</em>灯油</button><button class="tool ${state.doorStep>2?'used':state.doorStep===2?'next':''}" data-tool="2"><em>⌁</em>轻敲</button></div></div>`;
  shell(2,stage,{speaker:'梁顺 · 观察孔',text:'锁扣锈死了。墙边摆着铜壶、灯油和刀背。第一幕学过的维护顺序，现在成了开门的办法。'},'<div class="scene-progress"><i class="on"></i><i class="on"></i><i></i></div><div class="prop-display" style="height:150px;aspect-ratio:auto;background-position:0 0" aria-label="听潮铜筒物品立绘"></div>');
  $$('[data-tool]').forEach(el=>el.onclick=()=>{
    const n=+el.dataset.tool;if(n!==state.doorStep){notify(n===0?'锁扣已经热过了':n===1?'要先让锈层受热':'油还没渗进缝里');tone(90,.1,'square');return}
    state.doorStep++;tone(220+n*110,.18,'triangle');el.classList.add('used');el.classList.remove('next');const next=$(`[data-tool="${state.doorStep}"]`);if(next)next.classList.add('next');
    dialogue('梁顺 · 维护经验',['蒸汽钻进锁扣，锈层细响。','灯油沿热胀开的缝渗入。','刀背第三下落定，观察孔滑开。暖风、花香与一只蓝灯同时出现。'][n]);
    if(state.doorStep===3){$('#actions').innerHTML='<button class="btn primary" id="next">接住油布册</button>';$('#next').onclick=jigsaw}save();
  });
}

function jigsaw(){
  const fragments=['封面：门与三道水纹','左三、右二……','梁顺，不要再……','旧渠延伸向上'];let selected=null,placed=0;
  const stage=`<div class="lex-stage" style="position:absolute;inset:0"></div><div class="jigsaw"><div><div class="prop-display"></div><div class="eyebrow" style="margin-top:10px">关键物品 · 赵川的湿册</div></div><div><div class="piece-bank">${fragments.map((x,i)=>`<button class="paper-piece" data-piece="${i}">${x}</button>`).join('')}</div><div class="piece-slots" style="margin-top:18px">${fragments.map((x,i)=>`<button class="paper-slot" data-slot="${i}">第 ${i+1} 块纤维</button>`).join('')}</div></div></div>`;
  shell(2,stage,{speaker:'梁顺 · 桌面近景',text:'四块湿页的纸纤维、墨线和缝孔各不相同。选中碎页，再放进对应位置；错放不会损坏原件。'},'<div class="scene-progress"><i class="on"></i><i class="on"></i><i class="on"></i></div>');
  $$('[data-piece]').forEach(p=>p.onclick=()=>{selected=+p.dataset.piece;$$('[data-piece]').forEach(x=>x.classList.toggle('selected',x===p));tone(280,.06)});
  $$('[data-slot]').forEach(s=>s.onclick=()=>{if(selected===null){notify('先选一块湿页');return}if(+s.dataset.slot!==selected){notify('纤维方向接不上，再对照缝线');tone(90,.1,'square');return}s.textContent=fragments[selected];s.classList.add('filled');$(`[data-piece="${selected}"]`).style.visibility='hidden';selected=null;placed++;tone(420,.13);if(placed===4){dialogue('赵川册页 · 拼合完成','赵川没有死在门前。他去过另一边，还画下了被官方水路图删掉的上行旧渠。');$('#actions').innerHTML='<button class="btn primary" id="next">解除主门卡榫</button>';$('#next').onclick=gateCG}});
}

function gateCG(){
  app.innerHTML=`<section class="screen cg-screen gate-cg"><div class="cg-caption"><div class="eyebrow">剧情 CG · 门槛</div><h2>门后不是废渠</h2><p>卡榫落下。门缝里先涌出暖风和花香，接着是一只抓住门沿的手。蓝衣少女被局部来水冲进缓冲廊，清醒着将安全绳扣在自己腰间。</p><button class="btn primary" id="cgNext">拉紧安全绳</button></div></section>`;
  $('#cgNext').onclick=()=>{state.act=3;state.day=1;save();dayHub()};
}

function act3(){state.act=3;save();dayHub()}

function portraitPos(exp){return {guarded:'0% 0%',curious:'50% 0%',focused:'100% 0%',frustrated:'0% 100%',smile:'50% 100%',alarmed:'100% 100%'}[exp]||'0% 0%'}
function dayHub(){
  state.act=3;save();const plan=['修好被水浸过的蓝灯','去断桥核对水流方向','把完整警告拼出来'][state.day-1];
  const exp=['guarded','curious','focused'][state.day-1],pos=portraitPos(exp).split(' ');
  const stage=`<div class="day-stage" style="position:absolute;inset:0"></div><div class="day-room"><div class="full-portrait" style="--px:${pos[0]};--py:${pos[1]}"></div><div class="day-actions"><div class="eyebrow">第 ${state.day} 钟日 / 小满的计划</div><h3>${plan}</h3><p class="muted" style="font-size:12px;line-height:1.7">她会执行自己的计划。你选择的是梁顺如何参与，而不是替她安排日程。</p><button class="choice-card" data-choice="join"><b>加入她的计划</b><small>更快理解意图，增加共享词汇</small></button><button class="choice-card" data-choice="parallel"><b>平行工作</b><small>她修蓝灯，你整理工料，各自推进</small></button><button class="choice-card" data-choice="control"><b>要求她留在门内</b><small>她仍会行动，但不再共享路线</small></button><div class="resource-row"><span>工料 ${state.materials}</span><span>支援 ${state.support}</span><span>词典 ${state.lexicon}</span></div></div></div>`;
  const portrait=`<div class="portrait-wrap"><div class="portrait breathe" style="--px:${pos[0]};--py:${pos[1]}"></div><div class="portrait-copy"><b>小满 · ${['戒备','观察','专注'][state.day-1]}</b><small>${['她把油布包留在膝上，仍不允许别人随意触碰。','她开始主动把工具放在共桌中央。','她纠正梁顺的发音，也等待梁顺纠正她。'][state.day-1]}</small></div></div>`;
  shell(3,stage,{speaker:'梁顺 · 门槛据点',text:`钟声把地下分成白昼与暗灯。今天，小满先用灯、绳结和图画说明了自己的计划。`},portrait);
  $$('[data-choice]').forEach(b=>b.onclick=()=>{
    const c=b.dataset.choice;if(c==='join'){state.trust++;state.lexicon++;dialogue('小满 · 好奇','她先指向断桥，再指向梁顺手里的安全绳，最后把“等”和“回来”写上词板。')}
    if(c==='parallel'){state.materials+=2;dialogue('小满 · 专注','她没有等候指令，自行拆开蓝灯。两人偶尔交换工具，工作节奏逐渐合上。')}
    if(c==='control'){state.support++;dialogue('小满 · 不悦','她摇头，把工作区移到门外。她仍去断桥，但只在词板留下方向。')}
    save();setTimeout(()=>{if(state.day===1)memoryGame();else if(state.day===2)languageBoard();else facilityBuild()},500);
  });
}

function memoryGame(){
  const vals=['◈','◉','⌁','≋','◈','◉','⌁','≋'];let open=[],matched=0,busy=false;
  const stage=`<div class="lex-stage" style="position:absolute;inset:0"></div><div class="memory-grid">${vals.map((v,i)=>`<button class="memory-card" data-card="${i}" data-val="${v}">${v}</button>`).join('')}</div>`;
  const pos=portraitPos('focused').split(' ');shell(3,stage,{speaker:'小满 · 清淤检样',text:'她把矿渣按纹理排成对。翻开两块样本，找出相同沉积物；配对完成的样本会进入废料槽。'},`<div class="portrait-wrap"><div class="portrait" style="--px:${pos[0]};--py:${pos[1]}"></div><div class="portrait-copy"><b>动作差分 · 俯身检样</b><small>配错时她会自己把样本翻回去；不会等待玩家替她完成所有工作。</small></div></div>`);
  $$('[data-card]').forEach(c=>c.onclick=()=>{if(busy||c.classList.contains('done')||c.classList.contains('open'))return;c.classList.add('open');open.push(c);tone(260,.06);if(open.length===2){busy=true;setTimeout(()=>{if(open[0].dataset.val===open[1].dataset.val){open.forEach(x=>x.classList.add('done'));matched++;tone(430,.13);notify(`沉渣配对 ${matched} / 4`)}else{open.forEach(x=>x.classList.remove('open'));tone(100,.1,'square')}open=[];busy=false;if(matched===4){state.materials+=2;state.day=2;save();dialogue('小满 · 放松','最后一对蓝矿渣落进槽里。她把梁顺刚教的“清、浑、一样”念了一遍，发音很怪。');$('#actions').innerHTML='<button class="btn primary" id="next">进入第二钟日</button>';$('#next').onclick=dayHub}},450)}});
}

function languageBoard(){
  state.act=3;save();
  const tokens=[['sui','𐌀𐌔','水'],['gar','𐌋𐌙','危险'],['hem','𐌏𐌏','一起']];
  const stage=`<div class="lex-stage" style="position:absolute;inset:0"></div><div class="lex-board">
    <div class="contexts"><div class="eyebrow">两次语境，才算一个词</div>
      <div class="context-card"><b>语境 01 · 裂碗</b><p>少女指着从碗缝流出的液体，反复说出同一音节。</p><div class="vine-word"><i></i><i></i><i></i></div></div>
      <div class="context-card"><b>语境 02 · 水位廊</b><p>她指着上升的蓝线，再次说“sui”，然后画出向下的箭头。</p><div class="vine-word"><i></i><i></i><i></i></div></div>
      <div class="word-bank">${tokens.map(t=>`<button class="word-token ${state.selectedWord===t[0]?'selected':''}" data-word="${t[0]}">${t[1]} · ${t[0]}</button>`).join('')}</div>
    </div>
    <div class="meanings"><div class="eyebrow">共桌词板 / 待确认</div>
      ${['水','危险','一起'].map((m,i)=>{const val=Object.entries(state.words).find(([,v])=>v===m)?.[0];return `<button class="meaning-slot ${val?'filled correct':''}" data-meaning="${m}"><strong>${m}</strong><span>${val?tokens.find(t=>t[0]===val)[1]+' · 蓝线结':'点击放入词块'}</span></button>`}).join('')}
      <div class="context-card" style="margin-top:auto"><b>少女的警告</b><p id="sentence">上面 · <span class="blue">未知</span> · 水 · <span class="blue">未知</span>。三个机关 · <span class="blue">未知</span>。</p></div>
      <div class="lex-status"><span>共享词典</span><span id="wordCount">${Object.keys(state.words).length} / 3 已确认</span></div>
    </div>
  </div>`;
  const p=portraitPos('curious').split(' '),extra=`<div class="portrait-wrap"><div class="portrait breathe" style="--px:${p[0]};--py:${p[1]}"></div><div class="portrait-copy"><b>小满 · 等待验证</b><small>词义必须在裂碗与水位廊两个语境中同时成立。猜错会被她划掉，而不是立刻 Game Over。</small></div></div>`;
  shell(3,stage,{speaker:'小满 · 共桌时刻',text:'她把裂碗、绳环和三张藤字卡摆上共桌。现在要学的不是单词表，而是怎样确认彼此理解的是同一件事。'},extra);
  function refreshLex(){
    $('#wordCount').textContent=`${Object.keys(state.words).length} / 3 已确认`;
    if(Object.keys(state.words).length===3){$('#sentence').innerHTML='上面 · <span class="blue">裂</span> · 水 · <span class="blue">危险</span>。三个机关 · <span class="blue">一起</span>。';dialogue('小满 · 微笑','“下一次水来，下面会死。三个机关，要一起动。”梁顺说：“你、我，上去看。”她纠正：不是你我——是我们。');tone(540,.35,'sine');state.lexicon+=3;$('#actions').innerHTML='<button class="btn primary" id="next">进入第三钟日</button>';$('#next').onclick=()=>{state.day=3;save();dayHub()}}
  }
  $$('.word-token').forEach(el=>el.onclick=()=>{state.selectedWord=el.dataset.word;$$('.word-token').forEach(x=>x.classList.toggle('selected',x===el));tone(300,.08)});
  $$('.meaning-slot').forEach(el=>el.onclick=()=>{
    if(!state.selectedWord){notify('先选一个藤字词块');return}
    const token=tokens.find(t=>t[0]===state.selectedWord);if(token[2]!==el.dataset.meaning){notify('这个解释与第二个语境冲突');tone(100,.15,'square');return}
    state.words[state.selectedWord]=el.dataset.meaning;el.classList.add('filled','correct');el.querySelector('span').textContent=token[1]+' · 蓝线结';notify(`已确认：${token[1]} = ${token[2]}`);state.selectedWord=null;$$('.word-token').forEach(x=>x.classList.remove('selected'));refreshLex();save();
  });
  if(Object.keys(state.words).length===3){$('#actions').innerHTML='<button class="btn primary" id="next">进入第三钟日</button>';$('#next').onclick=()=>{state.day=3;save();dayHub()}}
}

function facilityBuild(){
  const pos=portraitPos('focused').split(' '),stage=`<div class="day-stage" style="position:absolute;inset:0"></div><div class="day-room"><div class="full-portrait" style="--px:${pos[0]};--py:${pos[1]}"></div><div class="day-actions"><div class="eyebrow">第三钟日 · 据点建设</div><h3>工料只够先完成一项</h3><button class="choice-card" data-facility="rope"><b>安全绳道</b><small>第四幕开放较安全路线</small></button><button class="choice-card" data-facility="pipe"><b>听钟管</b><small>提前获得潮水预警</small></button><button class="choice-card" data-facility="filter"><b>植物滤槽</b><small>解开黑藤封路</small></button></div></div>`;
  shell(3,stage,{speaker:'梁顺 · 共桌决定',text:'这不是三选一奖励菜单。你现在搭建的东西，会留在场景里，也会改变第四幕真实可走的路线。'});
  $$('[data-facility]').forEach(el=>el.onclick=()=>{state.facility=el.dataset.facility;state.trust++;save();const desc={rope:'绳索穿过维护廊，断桥两端第一次有了稳定来路。',pipe:'六音校验从高处传来；下一次排潮比预计更早。',filter:'蓝纤维在温盐水中收缩。小满记住了让黑藤退开的配方。'}[state.facility];dialogue('建设完成 · 小满微笑',desc);$('#actions').innerHTML='<button class="btn primary" id="next">登上观察缺口</button>';$('#next').onclick=towerCG});
}

function towerCG(){
  app.innerHTML=`<section class="screen cg-screen tower-cg"><div class="cg-caption"><div class="eyebrow">剧情 CG · 第一次抬头</div><h2>所谓山腹，是一座塔的底部</h2><p>雾退后，环道、悬桥、瀑布和一层层向上的灯火同时显现。小满没有催促。梁顺第一次拥有几秒钟，只用来抬头看。</p><button class="btn primary" id="cgNext">沿绳道进入穹城下缘</button></div></section>`;
  $('#cgNext').onclick=()=>{state.act=4;save();act4()};
}

function act4(){
  state.act=4;
  if(state.route===0){state.flood=state.facility==='pipe'?10:18}
  save();
  const stage=`<div class="chase-stage" style="position:absolute;inset:0"><div class="tower"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i></div><div class="water-rise" style="--water:${state.flood}%"></div>
    <div class="route-map"><i class="route-line"></i>
      <button class="route-node n1 ${state.route>0?'done':''} ${state.route<0?'locked':''}" data-node="1">下层旧泵站<small>听见墙里的水</small></button>
      <button class="route-node n2 ${state.route>1?'done':''} ${state.route<1?'locked':''}" data-node="2">界壁档案室<small>黑藤封住近路</small></button>
      <button class="route-node n3 ${state.route>2?'done':''} ${state.route<2?'locked':''}" data-node="3">联合水门<small>三节点等待报码</small></button>
    </div></div>`;
  const ep=portraitPos(state.flood>55?'alarmed':state.route?'focused':'curious').split(' ');
  shell(4,stage,{speaker:'小满 · 绳灯讯号',text:state.route===0?'水已经漫过下层石阶。不要把这一幕做成无尽逃亡——每一次停下调查，都必须换来一条能救人的信息。':'潮线在追赶，但你们已经知道它为什么来。'},`<div class="portrait-wrap"><div class="portrait" style="--px:${ep[0]};--py:${ep[1]}"></div><div class="portrait-copy"><b>小满 · ${state.flood>55?'警觉':state.route?'专注':'观察路线'}</b><small>她会指出梁顺听不见的穹语广播；梁顺则判断现代传感器漏掉的墙内暗渠。</small></div></div>`);
  bindRouteNodes();
}
function setFlood(delta){state.flood=Math.min(92,state.flood+delta);$('#pressure').style.width=state.flood+'%';$('#pressureText').textContent=Math.round(state.flood)+'%';$('.water-rise').style.setProperty('--water',state.flood+'%');tone(delta>0?85:380,.18,delta>0?'sawtooth':'sine');save()}
function bindRouteNodes(){
  $$('[data-node]').forEach(el=>el.onclick=()=>{const n=+el.dataset.node;if(n>state.route+1)return;if(n===1)routeOne();if(n===2)routeTwo();if(n===3)routeThree()});
}
function routeOne(){
  dialogue('旧泵站 · 现代监测屏','屏幕把二十七年的报码标作：T-17 自动传感器。可那正是梁顺每天亲手敲出的三、二、一。');
  $('#actions').innerHTML='<button class="btn" data-r1="screen">相信屏幕：封住暗渠</button><button class="btn primary" data-r1="listen">相信水声：打开报码器</button>';
  $$('[data-r1]').forEach(b=>b.onclick=()=>{
    if(b.dataset.r1==='screen'){setFlood(13);notify('错误分类仍在继续：潮压上升')}
    else{state.trust++;setFlood(-4);notify('结论：上下层从未真正断联')}
    state.route=1;save();act4();dialogue('梁顺 · 旧泵站','“他们一直听见，只是不肯承认另一头坐着人。”');
  });
}
function routeTwo(){
  const options=state.facility==='filter'
    ?'<button class="btn primary" data-r2="safe">用植物滤槽的温盐水</button><button class="btn" data-r2="bad">砍断黑藤</button>'
    :state.facility==='rope'
    ?'<button class="btn primary" data-r2="safe">沿安全绳道绕过藤墙</button><button class="btn" data-r2="bad">挤过坍塌缝</button>'
    :'<button class="btn primary" data-r2="safe">按听钟预警等待回落</button><button class="btn" data-r2="bad">立刻强行通过</button>';
  dialogue('小满 · 界壁档案室','黑藤缠住门轴，潮线逼近。第三幕建成的设施，此刻不是数值奖励，而是一条真实的新路线。');
  $('#actions').innerHTML=options;
  $$('[data-r2]').forEach(b=>b.onclick=()=>{
    if(b.dataset.r2==='safe'){setFlood(4);state.trust++;notify('保住工料，并恢复一页旧协议')}
    else{setFlood(18);notify('强行通过：遗失一箱应急工料')}
    state.route=2;save();act4();dialogue('赵川册页 · 受潮字迹','“止潮协议：暂行三十日。共钟既响，诸门皆开。”三十天，后来成了五百年。');
  });
}
function routeThree(){
  dialogue('联合水门 · 三方就位','上层泄洪、界壁均压、下层回流——任何一边都只有半套办法。共钟转起来后，在琥珀色信号区落杆。');
  $('#actions').innerHTML='<button class="btn primary" id="syncStart">启动共钟</button>';
  $('#syncStart').onclick=syncGame;
}
function syncGame(){
  state.route=3;save();
  const labels=['三下 · 准备并拉紧','两下 · 共同承重','一下 · 同时落杆'];
  $('.route-map').outerHTML=`<div class="sync-panel"><div class="sync-ring"><i class="sync-target" style="--target:0deg"></i><i class="sync-hand" style="--angle:0deg"></i><button class="sync-button" id="strike">落 杆</button><div class="sync-count" id="syncLabel">${labels[state.syncHits]}</div></div></div>`;
  let angle=0,target=0;
  const hand=$('.sync-hand'),targetEl=$('.sync-target');
  const timer=setInterval(()=>{angle=(angle+4)%360;hand.style.setProperty('--angle',angle+'deg')},35);
  $('#strike').onclick=()=>{
    const d=Math.min(Math.abs(angle-target),360-Math.abs(angle-target));
    if(d<34){state.syncHits++;tone(260+state.syncHits*100,.28,'triangle',.06);notify(labels[state.syncHits-1]+'：完成');target=(target+118)%360;targetEl.style.setProperty('--target',target+'deg');
      if(state.syncHits>=3){clearInterval(timer);state.flood=Math.max(6,state.flood-45);state.act=5;save();setTimeout(ending,700)}else $('#syncLabel').textContent=labels[state.syncHits];
    }else{state.syncMisses++;setFlood(5);notify('没有同拍——等琥珀信号转到正上方');tone(78,.18,'square')}
  };
}

function ending(){
  state.act=5;save();
  const loss=state.flood<35?'粮仓、药圃与旧档案都保住了':state.flood<60?'人都撤离，但一处物资库被淹':'人都撤离，两处物资区没能保住';
  app.innerHTML=`<section class="screen ending"><div class="ending-card"><div class="ending-mark">〰</div><div class="eyebrow">DEMO COMPLETE</div><h2>水位下降</h2><p class="muted">三节点恢复协同。门不再自动重封。</p><div class="new-rule">听见人声，先问名字。</div>
    <div class="summary"><div>记录选择<b>${state.truthful?'如实上报':'沿用常值'}</b></div><div>共同建设<b>${{rope:'安全绳道',pipe:'听钟管',filter:'植物滤槽'}[state.facility]||'未完成'}</b></div><div>救灾结果<b>${Math.round(state.flood)}% 潮压</b></div></div>
    <p style="font-size:13px;line-height:1.8">${loss}。穹城公共频道第一次收到来自“无人区”的人工报码。许多人这才意识到：档案里的机器，正在回答他们。</p>
    <div class="cover-actions" style="justify-content:center"><button class="btn primary" id="again">重新值守</button><button class="btn" id="design">查看玩法结论</button></div><div id="designNote" style="display:none;text-align:left;margin-top:24px;padding-top:20px;border-top:1px solid var(--line);font-size:13px;line-height:1.8;color:#aaa">统一玩法不是让四幕“长得一样”，而是让玩家反复使用同一组认知动作：读出异常、留下记录、交换半套信息、同步执行。第四幕可有洪水追逐与路线构筑，但不建议做随机刷怪式肉鸽；更适合做<strong style="color:var(--blue)">有追逐压力的调查闯关</strong>，让前三幕积累的词典、设施与信任直接改变路线。</div>
  </div></section>`;
  $('#again').onclick=reset;$('#design').onclick=()=>{$('#designNote').style.display='block';$('#design').style.display='none'};
}

cover();
