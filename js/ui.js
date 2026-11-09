/* Кот на крышах — экраны и HUD. */
(function(K){
'use strict';
const U=K.ui={};
const $=id=>document.getElementById(id);
const scr=()=>$('screen');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtT=s=>{s=Math.max(0,s);const m=Math.floor(s/60),r=Math.floor(s%60),d=Math.floor(s*10%10);return `${m}:${String(r).padStart(2,'0')}.${d}`};
U.fmtT=fmtT;
const click=()=>K.audio.sfxPlay('click');
function show(html,cls='dim'){const s=scr();s.className='screen '+cls;s.innerHTML=html;s.hidden=false;s._t=performance.now();
  s.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',e=>{if(performance.now()-s._t<250&&!/^(tab|shop|equip|music|sfx)/.test(b.dataset.act))return;click();const a=b.dataset.act;K.app.act(a,b.dataset,e)}));
  const f=s.querySelector('[autofocus]')||s.querySelector('.btn');if(f)try{f.focus({preventScroll:true})}catch(e){}}
U.hide=function(){scr().hidden=true;scr().innerHTML=''};
U.visible=()=>!scr().hidden;

/* ---------- титульный экран ---------- */
U.title=function(){
  const S=K.app.save,started=Object.keys(S.levels).length>0;
  show(`<div class="title">
    <h1 class="logo">Кот на<br><span>крышах</span></h1>
    <p class="tag">Король Теней запер друзей кота в клетках на крышах ночного города. Спасите всех, научитесь новому и верните свет.</p>
    <div class="row"><button class="btn" data-act="enter" autofocus>${started?'Продолжить':'Играть'}</button>
    ${K.app.canInstall()?'<button class="btn ghost" data-act="install">Установить</button>':''}</div>
    <p class="desk">Бег <kbd>←</kbd><kbd>→</kbd> · прыжок <kbd>Пробел</kbd> · перекат <kbd>Shift</kbd> · лапа <kbd>X</kbd> · пауза <kbd>P</kbd> · звук <kbd>M</kbd></p>
    <p class="sub rotate show">Поверните телефон горизонтально — так удобнее.</p>
  </div>`,'dim');
};

/* ---------- дом ---------- */
let tab='map',shopCat='color',shopSel=null;
U.hub=function(t){
  if(t)tab=t;
  const S=K.app.save;
  const fishGot=Object.values(S.levels).reduce((a,l)=>a+(l.fish?1:0),0),fishAll=K.LEVELS.filter(l=>!l.boss).length;
  const tabs=[['map','Карта'],['shop','Лавка'],['friends','Друзья'],['ch','Испытания'],['set','Настройки']];
  show(`<div class="hubui safe">
    <div class="hubtop"><h1>Кот на <span>крышах</span></h1>
      <div class="row"><span class="chip"><span class="s">★</span><b>${S.wallet}</b></span><span class="chip" title="Золотые рыбки">🐟 <b>${fishGot}/${fishAll}</b></span></div></div>
    <div class="sheet" role="dialog" aria-label="Меню">
      <div class="tabs" role="tablist">${tabs.map(([k,n])=>`<button role="tab" class="${k===tab?'on':''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="pane" id="pane">${pane()}</div>
    </div></div>`,'');
};
function pane(){
  switch(tab){
    case 'map':return mapPane();
    case 'shop':return shopPane();
    case 'friends':return friendsPane();
    case 'ch':return chPane();
    case 'set':return setPane();
  }
  return '';
}
function stars3(arr){return [0,1,2].map(i=>arr&&arr[i]?'★':'<span class="off">★</span>').join('')}
function mapPane(){
  const S=K.app.save;let html='';
  K.WORLDS.forEach((w,wi)=>{
    const lv=K.LEVELS.filter(l=>l.world===wi);
    html+=`<div class="world"><h3>${wi+1}. ${esc(w.name)}</h3><p class="sub">${esc(w.sub)}</p><div class="nodes">`;
    lv.forEach(l=>{
      const st=S.levels[l.id],open=K.app.unlocked(l.id),next=open&&!st;
      const cls=['node',l.boss?'boss':'',st?'done':'',next?'next':'',open?'':'lock'].join(' ');
      const label=l.boss?(l.boss==='king'?'♛':'☠'):l.id;
      html+=`<button class="${cls}" ${open?`data-act="level" data-id="${l.id}"`:'disabled'} aria-label="${esc(l.name)}">
        <span class="o">${open?label:'🔒'}${st&&st.fish?'<span class="fish">🐟</span>':''}</span>
        <span class="st">${open?stars3(st&&st.stars):''}</span><span class="nm">${esc(l.name)}</span></button>`;
    });
    html+='</div></div>';
  });
  const total=Object.values(S.levels).reduce((a,l)=>a+(l.stars||[]).filter(Boolean).length,0);
  html+=`<p class="sub">Оценок: ${total} из ${K.LEVELS.length*3}. Пройдите уровень, соберите все звёзды и уложитесь во время, чтобы получить три ★.</p>`;
  return html;
}
function hex(n){return '#'+n.toString(16).padStart(6,'0')}
const HAT_ICON={none:'—',bandana:'🎀',ushanka:'🧢',flower:'🌸',party:'🎉',tophat:'🎩',headphones:'🎧',halo:'😇',crown:'👑'};
const TAIL_ICON={normal:'〰',fluffy:'☁',bow:'🎀',double:'⑂',glow:'✦',bolt:'⚡'};
function shopPane(){
  const S=K.app.save,list=K.SKINS[shopCat];
  const sel=shopSel&&list.find(i=>i.id===shopSel)||list.find(i=>i.id===S.skin[shopCat]);
  let html=`<div class="cats">${[['color','Окрас'],['hat','Шапки'],['tail','Хвосты']].map(([k,n])=>`<button class="${k===shopCat?'on':''}" data-act="shopcat" data-cat="${k}">${n}</button>`).join('')}</div><div class="grid">`;
  list.forEach(it=>{
    const own=S.owned.includes(shopCat+':'+it.id)||(!it.price&&!it.unlock),eq=S.skin[shopCat]===it.id;
    const sw=shopCat==='color'?`<span class="sw" style="background:linear-gradient(90deg,${hex(it.body)} 60%,${hex(it.dark)} 60%)"></span>`:`<span class="sw" style="background:#2c2366">${shopCat==='hat'?HAT_ICON[it.id]:TAIL_ICON[it.id]}</span>`;
    const p=eq?'<span class="p own">Надето</span>':own?'<span class="p own">Есть</span>':it.unlock?`<span class="p">🔒 особый</span>`:`<span class="p">★ ${it.price}</span>`;
    html+=`<button class="item ${sel&&sel.id===it.id?'sel':''}" data-act="shopsel" data-id="${it.id}">${sw}<span class="n">${esc(it.name)}</span>${p}</button>`;
  });
  html+='</div>';
  if(sel){
    const own=S.owned.includes(shopCat+':'+sel.id)||(!sel.price&&!sel.unlock),eq=S.skin[shopCat]===sel.id;
    let btn;
    if(eq)btn='<button class="btn sm" disabled>Надето</button>';
    else if(own)btn=`<button class="btn sm" data-act="equip" data-id="${sel.id}">Надеть</button>`;
    else if(sel.unlock)btn=`<button class="btn sm" disabled>${esc(K.UNLOCK_TEXT[sel.unlock])}</button>`;
    else btn=`<button class="btn sm" data-act="buy" data-id="${sel.id}" ${S.wallet<sel.price?'disabled':''}>Купить за ★ ${sel.price}</button>`;
    html+=`<div class="buybar"><span><b>${esc(sel.name)}</b><br><span class="sub">${own?'Можно надеть':sel.unlock?'Откроется само':'Посмотрите на кота слева'}</span></span>${btn}</div>`;
  }
  return html;
}
function friendsPane(){
  const S=K.app.save;
  let html='<p class="sub">Спасённые друзья живут у вас на крыше и учат новому.</p>';
  K.FRIENDS.forEach(f=>{
    const has=S.friends.includes(f.id);const lv=K.LEVELS.find(l=>l.friend===f.id);
    html+=has?`<div class="friend"><span class="av">${f.icon}</span><div><b>${esc(f.name)}</b><span class="s">${esc(f.abilName)}</span><div class="q">${esc(f.how)}</div><div class="q">«${esc(f.home)}»</div></div></div>`
      :`<div class="friend locked"><span class="av">?</span><div><b>???</b><div class="q">Заперт в клетке на уровне ${lv.id} «${esc(lv.name)}»</div></div></div>`;
  });
  return html;
}
function chPane(){
  const S=K.app.save,key=K.dailyKey(),d=S.daily[key];
  const open=S.friends.length>=3;
  return `<div class="ch"><h3>Испытание дня · ${key.split('-').reverse().slice(0,2).join('.')}</h3>
    <p class="sub">Каждый день новый уровень, один на всех. Все умения открыты. За первое прохождение дня — ★ 100.</p>
    ${d?`<div class="kv"><span>Ваш лучший результат</span><b>${d.score} · ${fmtT(d.time)}</b></div>`:''}
    <div class="row">${open?`<button class="btn sm" data-act="daily">Играть</button>`:'<button class="btn sm" disabled>Откроется после 1-3</button>'}
    ${d?'<button class="btn sm ghost" data-act="share" data-what="daily">Поделиться</button>':''}</div></div>
  <div class="ch"><h3>Бесконечная ночь</h3><p class="sub">Крыши не кончаются, сложность растёт. Как далеко убежит кот?</p>
    <div class="kv"><span>Рекорд дистанции</span><b>${S.endless.dist||0} м</b></div><div class="kv"><span>Рекорд очков</span><b>${S.endless.score||0}</b></div>
    <div class="row">${open?'<button class="btn sm" data-act="endless">Бежать</button>':'<button class="btn sm" disabled>Откроется после 1-3</button>'}
    ${S.endless.score?'<button class="btn sm ghost" data-act="share" data-what="endless">Поделиться</button>':''}</div></div>
  <div class="ch"><h3>На время</h3><p class="sub">Выберите пройденный уровень на карте и нажмите «На время». Рядом побежит призрак вашего лучшего забега.</p></div>`;
}
function setPane(){
  const A=K.audio;
  return `<div class="toggle" data-act="music" role="switch" aria-checked="${A.music}"><span>Музыка</span><span class="sw2 ${A.music?'on':''}"></span></div>
  <div class="toggle" data-act="sfx" role="switch" aria-checked="${A.sfx}"><span>Звуки</span><span class="sw2 ${A.sfx?'on':''}"></span></div>
  <h3 style="margin-top:16px">Управление</h3>
  <div class="kv"><span>Бег</span><span><kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd></span></div>
  <div class="kv"><span>Прыжок, планирование</span><span><kbd>Пробел</kbd> / <kbd>W</kbd></span></div>
  <div class="kv"><span>Перекат</span><span><kbd>Shift</kbd> / <kbd>J</kbd></span></div>
  <div class="kv"><span>Удар лапой</span><span><kbd>X</kbd> / <kbd>K</kbd></span></div>
  <div class="kv"><span>Пауза · заново</span><span><kbd>P</kbd> · <kbd>R</kbd></span></div>
  <div class="kv"><span>Геймпад</span><span>поддерживается</span></div>
  <div class="row" style="margin-top:14px;justify-content:flex-start">
    ${K.app.canInstall()?'<button class="btn sm" data-act="install">Установить игру</button>':''}
    <button class="btn sm ghost" data-act="share" data-what="game">Позвать друга</button>
    <button class="btn sm ghost" data-act="title">На титул</button>
    <button class="btn sm ghost" data-act="reset">Сбросить прогресс</button></div>`;
}
U.refreshPane=function(){const p=$('pane');if(!p){U.hub();return}U.hub()};
U.setTab=t=>{tab=t;U.hub()};
U.setShop=(c,s)=>{if(c)shopCat=c;shopSel=s;U.hub()};
U.shopState=()=>({cat:shopCat,sel:shopSel});

/* ---------- карточка уровня ---------- */
U.levelIntro=function(id){
  const l=K.LEVEL[id],S=K.app.save,st=S.levels[id];
  const fr=l.friend&&K.FRIEND[l.friend];
  const rescued=fr&&S.friends.includes(fr.id);
  show(`<div class="card">
    <p class="sub">Мир ${l.world+1} · ${esc(K.WORLDS[l.world].name)}</p>
    <h2>${esc(l.name)}</h2>
    <p>${esc(l.news)}</p>
    ${fr?`<p class="sub">${rescued?`${esc(fr.name)} уже дома`:`В клетке ждёт: <b>${esc(fr.name)}</b> → ${esc(fr.abilName)}`}</p>`:''}
    ${st?`<div class="goals" style="width:100%"><div class="kv"><span>Оценка</span><b style="color:var(--star)">${stars3(st.stars)}</b></div>
      <div class="kv"><span>Лучшее время</span><b>${st.time?fmtT(st.time):'—'}</b></div><div class="kv"><span>Норматив</span><b>${fmtT(K.app.parOf(id))}</b></div>
      ${l.boss?'':`<div class="kv"><span>Золотая рыбка</span><b>${st.fish?'найдена 🐟':'ищите…'}</b></div>`}</div>`:''}
    <div class="row"><button class="btn" data-act="play" data-id="${id}" autofocus>Играть</button>
    ${st?`<button class="btn ghost" data-act="time" data-id="${id}">На время${S.ghosts[id]?' 👻':''}</button>`:''}
    <button class="btn ghost" data-act="hub">Назад</button></div></div>`);
};

/* ---------- в игре ---------- */
U.pause=function(){
  show(`<div class="card"><h2>Пауза</h2>
    <div class="row"><button class="btn" data-act="resume" autofocus>Продолжить</button><button class="btn ghost" data-act="restart">Заново</button><button class="btn ghost" data-act="hub">Домой</button></div>
    <div class="row"><button class="btn sm ghost" data-act="music">${K.audio.music?'Музыка: вкл':'Музыка: выкл'}</button><button class="btn sm ghost" data-act="sfx">${K.audio.sfx?'Звуки: вкл':'Звуки: выкл'}</button></div></div>`);
};
U.gameOver=function(mode){
  const G=K.G;
  if(mode==='daily'||mode==='endless'){
    show(`<div class="card"><h2>Забег окончен</h2>
      ${mode==='endless'?`<p>Дистанция: <b>${G.distance} м</b></p>`:''}<p>Очки: <b>${G.score}</b></p><p class="sub">${esc(K.app.lastRunNote||'')}</p>
      <div class="row"><button class="btn" data-act="restart" autofocus>Ещё раз</button><button class="btn ghost" data-act="share" data-what="${mode}">Поделиться</button><button class="btn ghost" data-act="hub">Домой</button></div></div>`);
    return;
  }
  show(`<div class="card"><h2>Ой, сердечки кончились</h2><p class="sub">Звёзды остаются с вами. Можно продолжить от последнего фонаря.</p>
    <div class="row"><button class="btn" data-act="cont" autofocus>С фонаря</button><button class="btn ghost" data-act="restart">Заново</button><button class="btn ghost" data-act="hub">Домой</button></div></div>`);
};
U.rescue=function(id){
  const f=K.FRIEND[id];
  show(`<div class="card"><span class="portrait">${f.icon}</span><p class="sub">Друг спасён!</p><h2>${esc(f.name)}</h2>
    <p>«${esc(f.line)}»</p><p><b style="color:var(--star)">Новое умение: ${esc(f.abilName)}</b></p><p class="sub">${esc(f.how)}</p>
    <button class="btn" data-act="resume" autofocus>Ура!</button></div>`);
};
U.results=function(r){
  const extra=[];
  if(r.newBest)extra.push('Новый рекорд времени!');
  if(r.fishNew)extra.push('Найдена золотая рыбка! +★ 50');
  if(r.friend)extra.push(`${K.FRIEND[r.friend].name} теперь живёт у вас дома`);
  const goals=r.boss?[['Победа',true],['Без урона',r.rate[1]],[`Быстрее ${fmtT(r.par)}`,r.rate[2]]]:[['Друг спасён и дверь найдена',true],[`Все звёзды (${r.got}/${r.all})`,r.rate[1]],[`Быстрее ${fmtT(r.par)}`,r.rate[2]]];
  show(`<div class="card"><h2>${esc(r.title)}</h2>
    <div class="rate" id="rate">${[0,1,2].map(()=>'<span>★</span>').join('')}</div>
    <div class="goals">${goals.map(([t,y])=>`<span class="${y?'y':'n'}">${y?'★':'☆'} ${esc(t)}</span>`).join('')}</div>
    <div style="width:100%"><div class="kv"><span>Время</span><b>${fmtT(r.time)}</b></div><div class="kv"><span>Очки</span><b>${r.score}</b></div>
      <div class="kv"><span>Лучшее комбо</span><b>×${r.combo}</b></div><div class="kv"><span>Получено звёзд</span><b style="color:var(--star)">+★ ${r.earned}</b></div></div>
    ${extra.map(t=>`<p class="sub" style="color:var(--mint)">${esc(t)}</p>`).join('')}
    <div class="row">${r.next?`<button class="btn" data-act="play" data-id="${r.next}" autofocus>Дальше</button>`:''}
      <button class="btn ${r.next?'ghost':''}" data-act="restart" ${r.next?'':'autofocus'}>Ещё раз</button>
      <button class="btn ghost" data-act="time" data-id="${r.id}">На время</button><button class="btn ghost" data-act="hub">Домой</button></div></div>`);
  const spans=[...document.querySelectorAll('#rate span')];
  spans.forEach((s,i)=>setTimeout(()=>{s.classList.add('in');if(r.rate[i]){s.classList.add('got');K.audio.sfxPlay('rate',{i})}},300+i*380));
};
U.runResults=function(r){
  show(`<div class="card"><h2>${esc(r.title)}</h2>
    <div style="width:100%">${r.dist!==undefined?`<div class="kv"><span>Дистанция</span><b>${r.dist} м</b></div>`:''}<div class="kv"><span>Время</span><b>${fmtT(r.time)}</b></div><div class="kv"><span>Очки</span><b>${r.score}</b></div>
    <div class="kv"><span>Лучший результат</span><b>${r.best}</b></div><div class="kv"><span>Получено звёзд</span><b style="color:var(--star)">+★ ${r.earned}</b></div></div>
    ${r.newBest?'<p style="color:var(--mint)">Новый рекорд!</p>':''}
    <div class="row"><button class="btn" data-act="share" data-what="${r.mode}" autofocus>Поделиться</button><button class="btn ghost" data-act="restart">Ещё раз</button><button class="btn ghost" data-act="hub">Домой</button></div></div>`);
};
U.ending=function(){
  show(`<div class="card"><h2>Свет вернулся в город</h2>
    <p>Король Теней рассыпался на тысячу звёзд. Кот и все его друзья сидят на крыше и смотрят на луну.</p>
    <p class="sub">Открыты скин «Тень» и корона. Ищите золотых рыбок на старых уровнях, проходите испытание дня и бейте свои рекорды на время.</p>
    <div class="row"><button class="btn" data-act="hub" autofocus>Домой</button></div></div>`);
};
U.confirm=function(text,yes){
  show(`<div class="card"><h2>Точно?</h2><p>${esc(text)}</p><div class="row"><button class="btn" data-act="${yes}">Да</button><button class="btn ghost" data-act="hub" autofocus>Нет</button></div></div>`);
};

/* ---------- HUD ---------- */
let lastHud='';
U.hudShow=function(on){$('hud').hidden=!on;$('pad').classList.toggle('show',on);if(!on){$('bossbar').hidden=true;$('hCombo').className='combo'}};
U.hud=function(){
  const G=K.G;if(!G.P)return;
  const lives=Math.max(0,G.lives),full=Math.max(G.maxLives,lives);
  const t=G.mode==='endless'?`${G.distance} м`:fmtT(G.time/60);
  const key=[lives,full,G.starsGot,G.starsTotal,G.score,t,G.P.shield,G.combo,[...G.abil].join()].join('|');
  if(key===lastHud)return;lastHud=key;
  $('hLives').textContent='♥'.repeat(lives)+'♡'.repeat(Math.max(0,full-lives));
  $('hShield').hidden=!G.P.shield;
  $('hStars').textContent=`${G.starsGot}/${G.starsTotal}`;
  $('hScore').textContent=G.score;
  $('hTime').textContent=t;
  const par=K.app.currentPar();$('hTimeChip').style.color=par&&G.time/60>par?'var(--muted)':'';
  $('hAbil').innerHTML=K.FRIENDS.filter(f=>G.abil.has(f.abil)).map(f=>`<span title="${esc(f.abilName)}">${f.icon}</span>`).join('');
  const c=$('hCombo');if(G.combo>=2){if(c.dataset.n!=G.combo){c.textContent=`КОМБО ×${Math.min(8,G.combo)}`;c.className='combo';void c.offsetWidth;c.className='combo on';c.dataset.n=G.combo}}else if(c.dataset.n!=='0'){c.className='combo';c.dataset.n='0'}
  $('tDash').hidden=!G.abil.has('dash');$('tPaw').hidden=!G.abil.has('paw');
};
U.pop=function(e){
  const p=K.render.toScreen(e.x,e.y);if(p.x<-5||p.x>105||p.y<-5||p.y>105)return;
  const d=document.createElement('div');d.className='pop'+(e.big?' big':'');d.textContent=e.text;d.style.left=p.x+'%';d.style.top=p.y+'%';d.style.color=e.col||'#fff';
  $('fx').appendChild(d);setTimeout(()=>d.remove(),950);
};
let bannerT;
U.banner=function(h,p=''){const b=$('banner');$('bannerH').textContent=h;$('bannerP').textContent=p;b.className='banner';void b.offsetWidth;b.className='banner on';clearTimeout(bannerT);bannerT=setTimeout(()=>b.className='banner',2300)};
let toastT;
U.toast=function(t){const el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2200)};
U.flash=function(white){const f=$('flash');f.className='flash'+(white?' w':'');f.style.transition='none';f.style.opacity=white?.5:.35;requestAnimationFrame(()=>{f.style.transition='opacity .35s';f.style.opacity=0})};
U.bossBar=function(B){const bb=$('bossbar');if(!B){bb.hidden=true;return}bb.hidden=false;$('bossHp').style.width=(Math.max(0,B.hp)/B.maxHp*100)+'%'};
U.onEvent=function(e){
  const G=K.G;
  switch(e.t){
    case 'pop':U.pop(e);break;
    case 'hurt':case 'fall':U.flash();break;
    case 'bossHit':U.flash(true);U.bossBar(G.boss);break;
    case 'bossIntro':U.banner(e.name,G.boss.king?'Король неуязвим в броне — бейте, когда он спустится':'Прыгайте ему на голову');$('bossName').textContent=e.name;U.bossBar(G.boss);break;
    case 'armorOn':U.toast('Броня! Сбейте её лапой или перекатом');break;
    case 'bossDown':U.bossBar(null);U.banner(e.king?'Король Теней повержен!':'Генерал повержен!','Дверь открыта');break;
    case 'checkpoint':U.toast('Фонарь зажжён — отсюда можно продолжить');break;
    case 'fish':U.banner('Золотая рыбка!','+500 очков');break;
    case 'comboEnd':if(e.n>=3)U.banner(`Комбо ×${e.n}!`,e.n>=5?'Невероятно!':'Отлично!');break;
    case 'shieldBreak':U.toast('Щит Колючки спас вас!');break;
  }
};
})(window.KOT=window.KOT||{});
