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
    <p class="tag">Король Теней запер друзей кота в клетках и спрятал ключи. По следу бежит его пёс. Найдите ключи, ставьте ловушки и доберитесь до берлоги Короля.</p>
    <div class="row"><button class="btn" data-act="enter" autofocus>${started?'Продолжить':'Играть'}</button>
    ${K.app.canInstall()?'<button class="btn ghost" data-act="install">Установить</button>':''}</div>
    <p class="desk">Бег <kbd>←</kbd><kbd>→</kbd> · прыжок <kbd>Пробел</kbd> · перекат <kbd>Shift</kbd> · лапа <kbd>X</kbd> · ловушка <kbd>C</kbd> · пауза <kbd>P</kbd> · звук <kbd>M</kbd></p>
    <p class="sub rotate show">Поверните телефон горизонтально — так удобнее.</p>
  </div>`,'dim');
};

/* ---------- дом ---------- */
let tab='map',shopCat='color',shopSel=null;
U.hub=function(t){
  if(t)tab=t;
  if(tab==='map'){U.worldMap();return}
  const S=K.app.save;
  const fishGot=Object.values(S.levels).reduce((a,l)=>a+(l.fish?1:0),0),fishAll=K.LEVELS.filter(l=>!l.boss).length;
  const tabs=[['map','🗺 Карта'],['shop','Лавка'],['friends','Друзья'],['ch','Испытания'],['set','Настройки']];
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
  <div class="kv"><span>Ловушка для пса</span><span><kbd>C</kbd> / <kbd>E</kbd></span></div>
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

/* ---------- карта мира: дорога через город к берлоге ---------- */
const MAPW=2600,MAPH=640;
const NODES=[[150,470],[340,330],[560,450],[790,300],[1010,420],[1210,270],[1420,400],[1640,250],[1860,380],[2070,470],[2280,330],[2470,230]];
function mapArt(){
  let a=`<defs>
    <linearGradient id="z1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0a26"/><stop offset="1" stop-color="#3b2868"/></linearGradient>
    <linearGradient id="z2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05141a"/><stop offset="1" stop-color="#1f4a48"/></linearGradient>
    <linearGradient id="z3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030108"/><stop offset="1" stop-color="#1e0c30"/></linearGradient>
    <linearGradient id="fadeA" x1="0" x2="1"><stop offset="0" stop-color="#3b2868" stop-opacity="0"/><stop offset="1" stop-color="#1f4a48"/></linearGradient>
    <radialGradient id="moon"><stop offset="0" stop-color="#fff3c4"/><stop offset=".6" stop-color="#fff3c4" stop-opacity=".25"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="0" y="0" width="900" height="${MAPH}" fill="url(#z1)"/><rect x="900" y="0" width="900" height="${MAPH}" fill="url(#z2)"/><rect x="1800" y="0" width="800" height="${MAPH}" fill="url(#z3)"/>
  <rect x="780" y="0" width="240" height="${MAPH}" fill="url(#fadeA)" opacity=".55"/>
  <circle cx="230" cy="110" r="110" fill="url(#moon)"/><circle cx="230" cy="110" r="44" fill="#fff3c4"/><circle cx="250" cy="96" r="38" fill="#0d0a26"/>`;
  let r=7;const R=()=>(r=r*16807%2147483647)/2147483647;
  for(let i=0;i<120;i++){const x=R()*1800,y=R()*260;a+=`<circle cx="${x|0}" cy="${y|0}" r="${R()<.2?2:1}" fill="#fff" opacity="${.4+R()*.6}"/>`}
  // крыши старого города
  for(let x=-10;x<900;){const w=50+R()*90,h=120+R()*170,y=MAPH-h;a+=`<rect x="${x|0}" y="${y|0}" width="${w|0}" height="${h|0}" fill="${R()<.5?'#2b2260':'#231b55'}"/><rect x="${x|0}" y="${y|0}" width="${w|0}" height="6" fill="#8f80e0" opacity=".8"/>`;
    for(let wy=y+18;wy<MAPH-14;wy+=22)for(let wx=x+10;wx<x+w-12;wx+=18)if(R()<.3)a+=`<rect x="${wx|0}" y="${wy|0}" width="7" height="9" fill="#ffcf6b" opacity=".8"/>`;
    if(R()<.4)a+=`<rect x="${(x+w*.6)|0}" y="${(y-26)|0}" width="12" height="26" fill="#2b2260"/>`;x+=w+4}
  // фабрики: трубы и дым
  for(let x=900;x<1800;){const w=70+R()*110,h=110+R()*150,y=MAPH-h;a+=`<rect x="${x|0}" y="${y|0}" width="${w|0}" height="${h|0}" fill="${R()<.5?'#163838':'#1d4444'}"/><path d="M${x|0} ${y|0} l${(w/4)|0} -24 l0 24 l${(w/4)|0} -24 l0 24 l${(w/4)|0} -24 l0 24" fill="#1d4444"/>`;
    const cx=x+w*.7,ch=90+R()*80;a+=`<rect x="${cx|0}" y="${(y-ch)|0}" width="16" height="${ch|0}" fill="#2a5a58"/><rect x="${(cx-2)|0}" y="${(y-ch)|0}" width="20" height="8" fill="#e85a3a" opacity=".7"/>`;
    for(let k=0;k<3;k++)a+=`<circle cx="${(cx+8+k*14)|0}" cy="${(y-ch-14-k*20)|0}" r="${10+k*6}" fill="#9ad8d0" opacity="${.18-k*.04}"/>`;
    for(let wy=y+16;wy<MAPH-14;wy+=24)for(let wx=x+10;wx<x+w-12;wx+=20)if(R()<.35)a+=`<rect x="${wx|0}" y="${wy|0}" width="8" height="8" fill="#8cffd2" opacity=".7"/>`;x+=w+10}
  // берлога: вход-пасть, сталактиты, кристаллы
  a+=`<path d="M1800 0 L2600 0 L2600 70 ${Array.from({length:16},(_,i)=>`L${1800+i*50+25} ${90+R()*90|0} L${1850+i*50} 70`).join(' ')} L1800 70Z" fill="#0b0614"/>`;
  a+=`<path d="M1800 ${MAPH} L1800 520 Q1900 470 2000 540 Q2150 600 2300 500 Q2450 420 2600 520 L2600 ${MAPH}Z" fill="#14091f"/>`;
  for(let i=0;i<22;i++){const x=1820+R()*760,y=180+R()*400,s=8+R()*20,c=R()<.5?'#9a6aff':'#5affd0';a+=`<path d="M${x|0} ${(y-s*1.8)|0} L${(x+s*.6)|0} ${y|0} L${x|0} ${(y+s*.5)|0} L${(x-s*.6)|0} ${y|0}Z" fill="${c}" opacity=".75"/><circle cx="${x|0}" cy="${y|0}" r="${(s*1.6)|0}" fill="${c}" opacity=".08"/>`}
  a+=`<ellipse cx="2470" cy="270" rx="120" ry="150" fill="#000" opacity=".55"/><text x="2470" y="120" text-anchor="middle" font-size="22" fill="#d88aff" font-family="Rubik Mono One, sans-serif">ЛОГОВО</text>`;
  // дорога
  const d=NODES.map((p,i)=>i?`S${(NODES[i-1][0]+p[0])/2} ${p[1]+(i%2?-70:70)} ${p[0]} ${p[1]}`:`M${p[0]} ${p[1]}`).join(' ');
  a+=`<path d="${d}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="30" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#e8dcc0" stroke-opacity=".85" stroke-width="16" stroke-linecap="round" stroke-dasharray="2 22"/>`;
  [['СТАРЫЕ КРЫШИ',450],['ФАБРИЧНЫЕ ТРУБЫ',1350],['БЕРЛОГА КОРОЛЯ',2150]].forEach(([t,x])=>a+=`<text x="${x}" y="${MAPH-24}" text-anchor="middle" font-size="26" fill="#ffd85a" opacity=".85" font-family="Rubik Mono One, sans-serif">${t}</text>`);
  return a;
}
U.worldMap=function(){
  const S=K.app.save;
  const fishGot=Object.values(S.levels).reduce((a,l)=>a+(l.fish?1:0),0),fishAll=K.LEVELS.filter(l=>!l.boss).length;
  let cur=K.LEVELS.findIndex(l=>K.app.unlocked(l.id)&&!S.levels[l.id]);if(cur<0)cur=K.LEVELS.length-1;
  const nodes=K.LEVELS.map((l,i)=>{
    const [x,y]=NODES[i],st=S.levels[l.id],open=K.app.unlocked(l.id),fr=l.friend&&K.FRIEND[l.friend],saved=fr&&S.friends.includes(fr.id);
    const cls=['mnode',l.boss?'boss':'',st?'done':'',i===cur?'next':'',open?'':'lock'].join(' ');
    const label=l.boss?(l.boss==='king'?'👑':'☠️'):l.id;
    const friend=fr?`<span class="mf ${saved?'saved':''}" title="${esc(fr.name)}">${saved?fr.emoji:(open?'🔒'+fr.emoji:'❔')}</span>`:'';
    const need=l.need&&open&&!saved?`<span class="mneed">${Object.entries(l.need).map(([k,n])=>K.ITEMS[k].icon+n).join(' ')}</span>`:'';
    return `<button class="${cls}" style="left:${x/MAPW*100}%;top:${y/MAPH*100}%" ${open?`data-act="level" data-id="${l.id}"`:'disabled'} aria-label="${esc(l.name)}">
      ${friend}<span class="o">${open?label:'🔒'}</span><span class="st">${open?stars3(st&&st.stars):''}</span><span class="nm">${esc(l.name)}</span>${need}</button>`;
  }).join('');
  const [cx,cy]=NODES[cur];
  show(`<div class="mapui">
    <div class="maptop safe"><button class="btn sm ghost" data-act="tab" data-tab="shop">🏠 Дом</button>
      <h1 class="mapt">Путь к берлоге</h1>
      <div class="row"><span class="chip"><span class="s">★</span><b>${S.wallet}</b></span><span class="chip" title="Золотые рыбки">🐟 <b>${fishGot}/${fishAll}</b></span><span class="chip" title="Спасённые друзья">${S.friends.length?S.friends.map(id=>K.FRIEND[id].emoji).join(''):'друзей пока нет'}</span></div></div>
    <div class="mapscroll" id="mapscroll"><div class="mapc">
      <svg viewBox="0 0 ${MAPW} ${MAPH}" preserveAspectRatio="none" aria-hidden="true">${mapArt()}</svg>
      ${nodes}
      <span class="mcat" style="left:${cx/MAPW*100}%;top:${cy/MAPH*100}%">🐈</span>
      <span class="mdog" style="left:${Math.max(2,cx-90)/MAPW*100}%;top:${(cy+30)/MAPH*100}%">🐕</span>
    </div></div>
    <p class="maphint">Нажмите на уровень, чтобы начать. В клетках ждут друзья — для каждой клетки нужны ключи 🔑, верёвки 🪢 и кусачки ✂️.</p>
  </div>`,'');
  const sc=$('mapscroll');if(sc){requestAnimationFrame(()=>{const c=sc.firstElementChild;sc.scrollLeft=Math.max(0,cx/MAPW*c.offsetWidth-sc.clientWidth/2)})}
};

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
    ${l.need&&!rescued?`<div class="needs">${Object.entries(l.need).map(([k,n])=>`<span>${K.ITEMS[k].icon} ${esc(K.ITEMS[k].name)} ×${n}</span>`).join('')}</div><p class="sub">Вещи спрятаны на уровне — без них клетку не открыть.</p>`:''}
    ${l.boss?'':(()=>{const story=K.LEVELS.filter(x=>!x.boss),ti=story.indexOf(l),tr=K.TRAPS[ti];return `<p class="sub">🐕 За вами бежит <b>${esc(K.CHASERS[l.world].name)}</b>. Ловушка уровня: ${tr.icon} <b>${esc(tr.name)}</b> ×${tr.charges} — ${esc(tr.desc.toLowerCase())}.</p>`})()}
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
    <p>Король Теней рассыпался на тысячу звёзд, а его берлога обрушилась. Цербер снова стал маленьким щенком и тоже пришёл домой. Кот и все друзья сидят на крыше и смотрят на луну.</p>
    <p class="sub">Открыты скин «Тень» и корона. Ищите золотых рыбок на старых уровнях, проходите испытание дня и бейте свои рекорды на время.</p>
    <div class="row"><button class="btn" data-act="hub" autofocus>Домой</button></div></div>`);
};
U.story=function(key,i,done){
  const P=K.STORY[key],p=P[i],last=i===P.length-1;
  show(`<div class="card story"><div class="art">${p.art}</div><p class="t">${esc(p.text)}</p>
    <div class="dots">${P.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div>
    <div class="row"><button class="btn" data-act="storyNext" autofocus>${last?'В путь!':'Дальше'}</button>${last?'':'<button class="btn ghost" data-act="storySkip">Пропустить</button>'}</div></div>`);
  U._story={key,i,done};
};
U.storyNext=function(skip){const st=U._story;if(!st)return;const P=K.STORY[st.key];if(skip||st.i>=P.length-1){U._story=null;st.done()}else U.story(st.key,st.i+1,st.done)};
U.confirm=function(text,yes){
  show(`<div class="card"><h2>Точно?</h2><p>${esc(text)}</p><div class="row"><button class="btn" data-act="${yes}">Да</button><button class="btn ghost" data-act="hub" autofocus>Нет</button></div></div>`);
};

/* ---------- HUD ---------- */
let lastHud='';
U.hudShow=function(on){$('hud').hidden=!on;if(!on&&U.clearFast)U.clearFast();$('pad').classList.toggle('show',on);if(!on){$('bossbar').hidden=true;$('hCombo').className='combo';$('banner').className='banner';$('fx').innerHTML=''}};
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
  $('tDash').hidden=!G.abil.has('dash');$('tPaw').hidden=!G.abil.has('paw');$('tTrap').hidden=!(G.trapDef&&G.chase);
  const needK=Object.keys(G.need||{});const hi=$('hItems');hi.hidden=!needK.length;
  if(needK.length)hi.innerHTML=needK.map(k=>{const h=G.have[k]||0,n=G.need[k];return `<span class="${h>=n?'ok':''}">${K.ITEMS[k].icon} ${h}/${n}</span>`}).join('');
  const ht=$('hTrap');ht.hidden=!(G.trapDef&&G.chase);if(G.trapDef)ht.innerHTML=`${G.trapDef.icon} ×${G.trapsLeft}`;
};
U.hudFast=function(){
  const G=K.G;if(!G.P)return;
  const C=G.chase,hd=$('hDog');hd.hidden=!(C&&C.on);
  if(C&&C.on){const danger=Math.max(0,Math.min(1,1-C.gap/220));$('hDogM').style.width=(danger*100)+'%';hd.classList.toggle('near',danger>.75&&C.stun===0)}
  const mk=$('marks');let html='';
  if(G.items&&G.state==='play'){for(const it of G.items){if(it.got||Math.abs(it.x-G.P.x)>20*16)continue;
    const p=K.render.toScreen(it.x,it.y);const off=p.x<3||p.x>97||p.y<8||p.y>95;
    const x=Math.max(3,Math.min(97,p.x)),y=Math.max(10,Math.min(92,p.y));
    if(off||K.render.inDark)html+=`<span class="mark ${off?'edge':''}" style="left:${x}%;top:${y}%">${K.ITEMS[it.type].icon}</span>`}}
  if(mk._h!==html){mk.innerHTML=html;mk._h=html}
  const dk=$('dark');let inDark=false;const cx=G.P.x+6;
  for(const d of G.darks||[])if(cx>d.x0-8&&cx<d.x1+8)inDark=true;
  K.render.inDark=inDark&&G.state!=='idle';
  if(inDark){const p=K.render.toScreen(G.P.x+6,G.P.y+4);const r=G.abil.has('light')?190:110;
    dk.style.background=`radial-gradient(circle at ${p.x}% ${p.y}%, rgba(2,1,8,0) 0, rgba(2,1,8,0) ${r*.55}px, rgba(2,1,8,.96) ${r*1.35}px)`}
  dk.style.opacity=inDark?1:0;
};
U.clearFast=function(){$('marks').innerHTML='';$('marks')._h='';$('dark').style.opacity=0;$('hDog').hidden=true};
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
    case 'item':U.toast(`${K.ITEMS[e.type].icon} ${K.ITEMS[e.type].name}: ${e.have}/${e.need}`);if(K.cageReady())setTimeout(()=>U.banner('Всё собрано!','Бегите к клетке'),600);break;
    case 'kit':U.toast('🧰 +1 ловушка');break;
    case 'hint':{const h={double:['Двойной прыжок!','Нажмите прыжок ещё раз прямо в воздухе'],wall:['Прыжок от стены!','Прыгните к стене и жмите прыжок, касаясь её'],glide:['Планируйте!','Удерживайте прыжок, пока падаете']}[e.k];if(h)U.banner(h[0],h[1]);break}
    case 'chaserWake':U.toast('🐕 В будке кто-то проснулся…');break;
    case 'cageLocked':U.banner('Клетка заперта',Object.entries(e.missing).map(([k,n])=>`${K.ITEMS[k].icon}×${n}`).join('  ')+' — вернитесь и поищите');break;
    case 'chaserStart':U.banner(`${e.name} идёт по следу!`,K.G.trapDef?`Ставьте ловушки: ${matchMedia('(pointer:coarse)').matches?'кнопка 🪤':'клавиша C'}`:'Не останавливайтесь!');break;
    case 'chaserHowl':U.toast('🐕 Пёс готовится к рывку!');break;
    case 'chaserBite':U.flash();break;
    case 'trapSnap':U.toast(`${K.TRAPS[e.tier].icon} Пёс попался!`);break;
    case 'trapNo':U.toast(e.reason==='empty'?'Ловушки кончились — ищите 🧰':e.reason==='air'?'Ловушку ставят на земле':'Здесь некого ловить');break;
  }
};
})(window.KOT=window.KOT||{});
