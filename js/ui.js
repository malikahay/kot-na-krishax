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
const pic=(k,id,sz=28,cls='')=>{const u=K.render.pic(k,id,Math.min(256,Math.round(sz*2)));return u?`<img class="pic ${cls}" src="${u}" width="${sz}" height="${sz}" alt="">`:''};
U.pic=pic;
const LOCK='<svg class="lock" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2.5" fill="#c8bfff"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#c8bfff" stroke-width="2.4"/><circle cx="12" cy="15.5" r="1.8" fill="#3a2f78"/></svg>';
const itemPic=(k,sz=20)=>pic('item',k,sz);
function show(html,cls='dim'){const s=scr();s.className='screen '+cls;s.innerHTML=html;s.hidden=false;s._t=performance.now();
  s.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',e=>{if(performance.now()-s._t<250&&!/^(tab|shop|equip|music|sfx)/.test(b.dataset.act))return;click();const a=b.dataset.act;K.app.act(a,b.dataset,e)}));
  const f=s.querySelector('[autofocus]')||s.querySelector('.btn');if(f)try{f.focus({preventScroll:true})}catch(e){}}
U.hide=function(){scr().hidden=true;scr().innerHTML=''};
U.fadeTo=function(fn){const f=$('fade');f.classList.add('on');setTimeout(()=>{try{fn()}finally{requestAnimationFrame(()=>setTimeout(()=>f.classList.remove('on'),60))}},300)};
let rzT;addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(document.querySelector('.mapui'))U.worldMap()},250)});
U.zoomNode=function(id,fn){const i=K.LEVEL[id].index,c=document.querySelector('.mapc');if(!c){fn();return}const [x,y]=NODES[i];c.style.transformOrigin=`${(x+OFF)/VW*100}% ${y/MAPH*100}%`;c.style.transform='scale(1.35)';c.classList.add('zoom');setTimeout(fn,380)};
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
  const fishGot=Object.values(S.levels).reduce((a,l)=>a+(l.fish?1:0),0),fishAll=K.FISH_LEVELS.length;
  const tabs=[['map','Карта'],['shop','Лавка'],['friends','Друзья'],['ch','Испытания'],['set','Настройки']];
  show(`<div class="hubui safe">
    <div class="hubtop"><h1>Кот на <span>крышах</span></h1>
      <div class="row"><span class="chip"><span class="s">★</span><b>${S.wallet}</b></span><span class="chip" title="Золотые рыбки">${pic('fish',0,20)} <b>${fishGot}/${fishAll}</b></span></div></div>
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
      const label=l.boss?(l.boss==='king'?pic('king',0,30):pic('general',0,30)):l.id;
      html+=`<button class="${cls}" ${open?`data-act="level" data-id="${l.id}"`:'disabled'} aria-label="${esc(l.name)}">
        <span class="o">${open?label:LOCK}${st&&st.fish?`<span class="fish">${pic('fish',0,16)}</span>`:''}</span>
        <span class="st">${open?stars3(st&&st.stars):''}</span><span class="nm">${esc(l.name)}</span></button>`;
    });
    html+='</div></div>';
  });
  const total=Object.values(S.levels).reduce((a,l)=>a+(l.stars||[]).filter(Boolean).length,0);
  html+=`<p class="sub">Оценок: ${total} из ${K.LEVELS.length*3}. Пройдите уровень, соберите все звёзды и уложитесь во время, чтобы получить три ★.</p>`;
  return html;
}
function hex(n){return '#'+n.toString(16).padStart(6,'0')}
function shopPane(){
  const S=K.app.save,list=K.SKINS[shopCat];
  const sel=shopSel&&list.find(i=>i.id===shopSel)||list.find(i=>i.id===S.skin[shopCat]);
  let html=`<div class="cats">${[['color','Окрас'],['hat','Шапки'],['tail','Хвосты']].map(([k,n])=>`<button class="${k===shopCat?'on':''}" data-act="shopcat" data-cat="${k}">${n}</button>`).join('')}</div><div class="grid">`;
  list.forEach(it=>{
    const own=S.owned.includes(shopCat+':'+it.id)||(!it.price&&!it.unlock),eq=S.skin[shopCat]===it.id;
    const sk={...S.skin,[shopCat]:it.id};const sw=`<span class="sw pv">${pic('cat',sk,64)}</span>`;
    const p=eq?'<span class="p own">Надето</span>':own?'<span class="p own">Есть</span>':it.unlock?`<span class="p">${LOCK} особый</span>`:`<span class="p">★ ${it.price}</span>`;
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
    html+=has?`<div class="friend"><span class="av">${pic('friend',f.id,44)}</span><div><b>${esc(f.name)}</b><span class="s">${esc(f.abilName)}</span><div class="q">${esc(f.how)}</div><div class="q">«${esc(f.home)}»</div></div></div>`
      :`<div class="friend locked"><span class="av">${pic('friend',f.id,44,'sil')}</span><div><b>???</b><div class="q">Заперт в клетке на уровне ${lv.id} «${esc(lv.name)}»</div></div></div>`;
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
  const O=K.app.save.opts||{};
  return `<h3>Игра</h3>${optRows(O)}<h3 style="margin-top:16px">Звук</h3><div class="toggle" data-act="music" role="switch" aria-checked="${A.music}"><span>Музыка</span><span class="sw2 ${A.music?'on':''}"></span></div>
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
function optRows(O){const dog=O.dog||'normal';
  return `<div class="kv"><span>Пёс-преследователь</span><span class="seg">${[['normal','Обычный'],['easy','Лёгкий'],['off','Выкл']].map(([v,n])=>`<button class="${dog===v?'on':''}" data-act="optdog" data-v="${v}">${n}</button>`).join('')}</span></div>
  <div class="toggle" data-act="optfriends" role="switch" aria-checked="${O.friends!==false}"><span>Друзья бегут рядом с котом</span><span class="sw2 ${O.friends!==false?'on':''}"></span></div>
  <p class="sub">Лёгкий пёс бегает медленнее и не отнимает сердца.</p>`}
U.optRows=optRows;
U.refreshPane=function(){const p=$('pane');if(!p){U.hub();return}U.hub()};
U.setTab=t=>{tab=t;U.hub()};
U.setShop=(c,s)=>{if(c)shopCat=c;shopSel=s;U.hub()};
U.shopState=()=>({cat:shopCat,sel:shopSel});

/* ---------- карта мира: вертикальный путь вниз — от крыш через фабрики в берлогу ---------- */
const MAPW=900,STEP=190,TOPPAD=260;
const MAPH=TOPPAD+(K.LEVELS.length-1)*STEP+220;
const NODES=K.LEVELS.map((l,i)=>[Math.round(450+Math.sin(i*1.05+.4)*250),TOPPAD+i*STEP]);
let mapProgress=0,VW=900,OFF=0;
const zoneY=w=>{const idx=K.LEVELS.map((l,i)=>[l,i]).filter(([l])=>l.world===w).map(([,i])=>i);return [NODES[idx[0]][1]-150,NODES[idx[idx.length-1]][1]+95]};
function roadPath(upto){
  const P=NODES.slice(0,upto+1);let d=`M${P[0][0]} ${P[0][1]}`;
  for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];
    const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+=` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`}
  return d;
}
function mapArt(){
  const [a1,b1]=zoneY(0),[a2,b2]=zoneY(1),[a3,b3]=zoneY(2),H=MAPH;
  const f=y=>(y/H).toFixed(4);
  let r=7;const R=()=>(r=r*16807%2147483647)/2147483647;
  let a=`<defs>
   <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#07051a"/><stop offset="${f(a1+200)}" stop-color="#1a1346"/><stop offset="${f(b1-120)}" stop-color="#3b2868"/>
    <stop offset="${f(b1+60)}" stop-color="#245a62"/><stop offset="${f(a2+260)}" stop-color="#174444"/><stop offset="${f(b2-100)}" stop-color="#0f3030"/>
    <stop offset="${f(b2+70)}" stop-color="#1e0f34"/><stop offset="${f(a3+300)}" stop-color="#120822"/><stop offset="1" stop-color="#040208"/>
   </linearGradient>
   <radialGradient id="moon"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#fff3c4" stop-opacity=".2"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
   <radialGradient id="glowP"><stop offset="0" stop-color="#9a6aff" stop-opacity=".45"/><stop offset="1" stop-color="#9a6aff" stop-opacity="0"/></radialGradient>
   <radialGradient id="glowG"><stop offset="0" stop-color="#5affd0" stop-opacity=".35"/><stop offset="1" stop-color="#5affd0" stop-opacity="0"/></radialGradient>
   <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8ff" stop-opacity="0"/><stop offset=".5" stop-color="#cfe8ff" stop-opacity=".10"/><stop offset="1" stop-color="#cfe8ff" stop-opacity="0"/></linearGradient>
   <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect x="0" width="${VW}" height="${H}" fill="url(#sky)"/>`;
  // звёзды гаснут к низу города
  for(let i=0;i<Math.round(160*VW/900);i++){const y=R()*(b1+80),x=R()*VW;a+=`<circle cx="${x|0}" cy="${y|0}" r="${R()<.15?2:1}" fill="#fff" opacity="${((1-y/(b1+120))*.9).toFixed(2)}"/>`}
  const mx=OFF+720+Math.min(OFF*.5,200);a+=`<circle cx="${mx}" cy="140" r="150" fill="url(#moon)"/><circle cx="${mx}" cy="140" r="56" fill="#fff3c4"/><circle cx="${mx+25}" cy="122" r="48" fill="#0b0820"/>`;
  // силуэты зданий по краям: город → фабрики
  const side=(y0,y1,col,lit,kind)=>{for(const left of [true,false]){let y=y0;while(y<y1){const h=60+R()*90,w=90+R()*150+OFF*(.3+R()*.6),x=left?-10:VW-w+10;
      a+=`<rect x="${x|0}" y="${y|0}" width="${w|0}" height="${(h+6)|0}" fill="${col}" opacity=".9"/><rect x="${x|0}" y="${y|0}" width="${w|0}" height="5" fill="${lit}" opacity=".55"/>`;
      for(let wy=y+16;wy<y+h-8;wy+=18)for(let wx=x+12;wx<x+w-12;wx+=16)if(R()<.28)a+=`<rect x="${wx|0}" y="${wy|0}" width="6" height="8" fill="${kind==='f'?'#8cffd2':'#ffcf6b'}" opacity=".75"/>`;
      if(kind==='f'&&R()<.6){const cx=left?x+w-40:x+24,ch=50+R()*60;a+=`<rect x="${cx|0}" y="${(y-ch)|0}" width="14" height="${ch|0}" fill="${col}"/><rect x="${(cx-2)|0}" y="${(y-ch)|0}" width="18" height="6" fill="#e85a3a" opacity=".7"/>`;for(let k=0;k<3;k++)a+=`<circle cx="${(cx+7+(left?12:-12)*k)|0}" cy="${(y-ch-14-k*18)|0}" r="${9+k*6}" fill="#bfe8e0" opacity="${(.16-k*.04).toFixed(2)}"/>`}
      if(kind==='c'&&R()<.5)a+=`<rect x="${(left?x+w-30:x+14)|0}" y="${(y-24)|0}" width="12" height="24" fill="${col}"/>`;
      y+=h*.75+R()*30}}};
  side(a1+120,b1+40,'#231b55','#8f80e0','c');side(a2-20,b2+30,'#163838','#6fd6c0','f');
  // переходы: туман между зонами
  [b1+10,b2+20].forEach(y=>a+=`<rect x="0" y="${y-110}" width="${VW}" height="220" fill="url(#mist)"/>`);
  // берлога: каменный свод, сталактиты, кристаллы, грибы
  const nT=Math.ceil(VW/50);a+=`<path d="M0 ${a3} ${Array.from({length:nT},(_,i)=>`L${i*50+25} ${a3+40+R()*90|0} L${i*50+50} ${a3+20}`).join(' ')} L${VW} ${a3-60} L${VW} ${a3-140} Q${VW/2} ${a3-30} 0 ${a3-140}Z" fill="#0c0616"/>`;
  for(const left of [true,false]){let y=a3+80;while(y<H){const w=60+R()*120+OFF*.8,h=80+R()*120,x=left?-10:VW-w+10;a+=`<path d="M${x} ${y+h} Q${x+w/2} ${y-h*.2} ${x+w} ${y+h}Z" fill="#170c26"/>`;y+=h*.7}}
  for(let i=0;i<Math.round(40*VW/900);i++){const left=R()<.5,band=170+OFF,x=left?20+R()*band:VW-20-R()*band,y=a3+120+R()*(H-a3-160),sz=8+R()*18,c=R()<.5?'#9a6aff':'#5affd0';
    a+=`<circle cx="${x|0}" cy="${y|0}" r="${sz*3|0}" fill="url(#${c==='#9a6aff'?'glowP':'glowG'})"/><path d="M${x|0} ${(y-sz*1.9)|0} L${(x+sz*.6)|0} ${y|0} L${x|0} ${(y+sz*.5)|0} L${(x-sz*.6)|0} ${y|0}Z" fill="${c}" opacity=".85"/>`}
  for(let i=0;i<Math.round(14*VW/900);i++){const x=40+R()*(VW-80),y=a3+160+R()*(H-a3-200);if(x>OFF+220&&x<OFF+680)continue;a+=`<rect x="${x|0}" y="${y|0}" width="4" height="14" fill="#d8d0c0"/><ellipse cx="${(x+2)|0}" cy="${y|0}" rx="10" ry="6" fill="#5affd0" opacity=".85"/>`}
  // логово Короля внизу
  const ky=NODES[NODES.length-1][1];a+=`<g transform="translate(${OFF},0)">`+`<ellipse cx="450" cy="${ky+30}" rx="250" ry="130" fill="#000" opacity=".55" filter="url(#soft)"/>`;
  // дорога
  const d=roadPath(NODES.length-1),dp=roadPath(Math.max(0,mapProgress));
  a+=`<path d="${d}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="46" stroke-linecap="round" transform="translate(0,9)"/>
    <path d="${d}" fill="none" stroke="#2c2350" stroke-width="40" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#4d4180" stroke-width="30" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#d8ceff" stroke-opacity=".35" stroke-width="4" stroke-dasharray="14 18" stroke-linecap="round"/>
    <path d="${dp}" fill="none" stroke="#ffd85a" stroke-opacity=".25" stroke-width="48" stroke-linecap="round" filter="url(#soft)"/>
    <path d="${dp}" fill="none" stroke="#ffd85a" stroke-width="8" stroke-linecap="round" stroke-dasharray="1 20" class="flow"/>
    <path id="road" d="${d}" fill="none" stroke="none"/></g>`;
  return a;
}
U.worldMap=function(){
  const S=K.app.save;
  {const sw=Math.max(320,(scr().clientWidth||innerWidth)),k=Math.min(980,sw)/900;VW=Math.max(900,Math.round(sw/k));OFF=(VW-900)/2}
  const fishGot=Object.values(S.levels).reduce((a,l)=>a+(l.fish?1:0),0),fishAll=K.FISH_LEVELS.length;
  let cur=K.LEVELS.findIndex(l=>K.app.unlocked(l.id)&&!S.levels[l.id]);if(cur<0)cur=K.LEVELS.length-1;
  mapProgress=cur;const from=Math.min(cur,S.mapPos??cur);
  const nodes=K.LEVELS.map((l,i)=>{
    const [x,y]=NODES[i],st=S.levels[l.id],open=K.app.unlocked(l.id),fr=l.friend&&K.FRIEND[l.friend],saved=fr&&S.friends.includes(fr.id);
    const cls=['mnode',l.boss?'boss':'',l.tutorial?'tut':'',st?'done':'',i===cur?'next':'',open?'':'lock',x>450?'r':'l'].join(' ');
    const label=l.boss?(l.boss==='king'?pic('king',0,50):pic('general',0,50)):l.tutorial?'?':l.id;
    const friend=fr?`<span class="mf ${saved?'saved':open?'caged':'unknown'}" title="${esc(open||saved?fr.name:'???')}">${pic(open||saved?'friend':'cage',fr.id,40,open||saved?'':'sil')}${saved?'':LOCK}</span>`:'';
    const need=l.need&&open&&!saved&&!st?`<span class="mneed">${Object.entries(l.need).map(([k,n])=>`${itemPic(k,18)}<b>${n}</b>`).join('')}</span>`:'';
    return `<button class="${cls}" style="left:${(x+OFF)/VW*100}%;top:${y/MAPH*100}%" ${open?`data-act="level" data-id="${l.id}"`:'disabled'} aria-label="${esc(l.name)}">
      <span class="o">${open?label:LOCK}</span><span class="info"><span class="nm">${esc(l.name)}</span><span class="st">${open?stars3(st&&st.stars):''}</span>${need}</span>${friend}</button>`;
  }).join('');
  const zones=K.WORLDS.map((w,wi)=>{const [y0]=zoneY(wi);return `<div class="zone" style="top:${(y0+20)/MAPH*100}%"><span class="zn">Этап ${wi+1}</span><b>${esc(w.name)}</b><span class="zs">${esc(w.sub)}</span></div>`}).join('');
  const [cx,cy]=NODES[cur];
  show(`<div class="mapui">
    <div class="maptop safe"><button class="btn sm ghost" data-act="tab" data-tab="shop">Дом и лавка</button>
      <h1 class="mapt">Путь к берлоге</h1>
      <div class="row"><span class="chip"><span class="s">★</span><b>${S.wallet}</b></span><span class="chip" title="Золотые рыбки">${pic('fish',0,20)} <b>${fishGot}/${fishAll}</b></span><span class="chip fr" title="Спасённые друзья">${S.friends.length?S.friends.map(id=>pic('friend',id,26)).join(''):'друзей пока нет'}</span></div></div>
    <div class="mapscroll" id="mapscroll"><div class="mapc">
      <svg viewBox="0 0 ${VW} ${MAPH}" preserveAspectRatio="none" aria-hidden="true">${mapArt()}</svg>
      ${zones}${nodes}
      <span class="mcat" id="mcat" style="left:${(cx+OFF)/VW*100}%;top:${cy/MAPH*100}%">${pic('cat',S.skin,64)}</span>
      <span class="mdog" id="mdog" style="left:${(cx+OFF)/VW*100}%;top:${(cy-100)/MAPH*100}%">${pic('dog',K.LEVELS[cur].world,52)}</span>
    </div></div>
  </div>`,'');
  const sc=$('mapscroll'),c=sc.firstElementChild;c.style.aspectRatio=`${VW}/${MAPH}`;const center=y=>Math.max(0,y/MAPH*c.offsetHeight-sc.clientHeight/2);
  sc.scrollTop=center(NODES[from][1]);
  const road=$('road'),len=road.getTotalLength();
  const at=i=>{let lo=0,hi=len;for(let k=0;k<24;k++){const m=(lo+hi)/2;if(road.getPointAtLength(m).y<NODES[i][1])lo=m;else hi=m}return lo};
  const cat=$('mcat'),dog=$('mdog');
  const put=(el,l,dy)=>{const p=road.getPointAtLength(Math.max(0,Math.min(len,l)));el.style.left=(p.x+OFF)/VW*100+'%';el.style.top=(p.y+dy)/MAPH*100+'%'};
  if(from<cur){
    const l0=at(from),l1=at(cur),t0=performance.now(),dur=1000+(cur-from)*600;put(cat,l0,0);put(dog,l0-160,0);
    const step=now=>{if(!cat.isConnected)return;const k=Math.min(1,(now-t0-350)/dur),e=k<0?0:k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const l=l0+(l1-l0)*e;put(cat,l,0);put(dog,l-160,0);
      sc.scrollTop=center(road.getPointAtLength(l).y);if(k<1)requestAnimationFrame(step);else{S.mapPos=cur;K.app.persist();K.audio.sfxPlay('checkpoint')}};
    requestAnimationFrame(step);
  }else{put(dog,at(cur)-160,0);S.mapPos=cur;K.app.persist()}
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
    ${l.need&&!rescued&&!l.boss?`<div class="needs">${Object.entries(l.need).map(([k,n])=>`<span>${itemPic(k,26)} ${esc(K.ITEMS[k].name)} ×${n}</span>`).join('')}</div><p class="sub">Вещи спрятаны на уровне — без них ${fr?'клетку':'дверь'} не открыть.</p>`:''}
    ${l.boss?'':(()=>{const ti=K.trapTierOf(l),tr=K.TRAPS[ti];return `<div class="introw">${pic('dog',l.world,56)}<p class="sub">За вами бежит <b>${esc(K.CHASERS[l.world].name)}</b>.</p>${pic('trap',ti,44)}<p class="sub">Ловушка: <b>${esc(tr.name)}</b> ×${tr.charges}<br>${esc(tr.desc)}</p></div>`})()}
    ${st?`<div class="goals" style="width:100%"><div class="kv"><span>Оценка</span><b style="color:var(--star)">${stars3(st.stars)}</b></div>
      <div class="kv"><span>Лучшее время</span><b>${st.time?fmtT(st.time):'—'}</b></div><div class="kv"><span>Норматив</span><b>${fmtT(K.app.parOf(id))}</b></div>
      ${l.boss||l.tutorial?'':`<div class="kv"><span>Золотая рыбка</span><b>${st.fish?'найдена '+pic('fish',0,18):(()=>{const f=K.buildLevel(l).fish[0];const g=f&&K.ABIL_FRIEND[f.gate];return g&&!K.app.save.friends.includes(g.id)?`нужно умение «${esc(g.abilName)}» `+pic('friend',g.id,22):'ищите…'})()}</b></div>`}</div>`:''}
    <div class="row"><button class="btn" data-act="play" data-id="${id}" autofocus>Играть</button>
    ${st?`<button class="btn ghost" data-act="time" data-id="${id}">На время${S.ghosts[id]?' (с призраком)':''}</button>`:''}
    <button class="btn ghost" data-act="tab" data-tab="map">Назад</button></div></div>`);
};

/* ---------- в игре ---------- */
U.pause=function(){
  show(`<div class="card"><h2>Пауза</h2>
    <div class="row"><button class="btn" data-act="resume" autofocus>Продолжить</button><button class="btn ghost" data-act="restart">Заново</button><button class="btn ghost" data-act="hub">Домой</button></div>
    <div class="row"><button class="btn sm ghost" data-act="music">${K.audio.music?'Музыка: вкл':'Музыка: выкл'}</button><button class="btn sm ghost" data-act="sfx">${K.audio.sfx?'Звуки: вкл':'Звуки: выкл'}</button></div>
    <div style="width:100%;text-align:left">${optRows(K.app.save.opts||{})}</div></div>`);
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
  show(`<div class="card"><span class="portrait">${pic('friend',f.id,96)}</span><p class="sub">Друг спасён!</p><h2>${esc(f.name)}</h2>
    <p>«${esc(f.line)}»</p><p><b style="color:var(--star)">Новое умение: ${esc(f.abilName)}</b></p><p class="sub">${esc(f.how)}</p>
    <button class="btn" data-act="resume" autofocus>Ура!</button></div>`);
};
U.results=function(r){
  const extra=[];
  if(r.newBest)extra.push('Новый рекорд времени!');
  if(r.fishNew)extra.push('Найдена золотая рыбка! +★ 50');
  if(r.friend)extra.push(`${K.FRIEND[r.friend].name} теперь живёт у вас дома`);
  const goals=r.boss?[['Победа',true],['Без урона',r.rate[1]],[`Быстрее ${fmtT(r.par)}`,r.rate[2]]]:[[r.hasFriend?'Друг спасён и дверь найдена':'Уровень пройден',true],[`Все звёзды (${r.got}/${r.all})`,r.rate[1]],[`Быстрее ${fmtT(r.par)}`,r.rate[2]]];
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
  const img=K.render.illustrate(p.scene,960,420);
  show(`<div class="card story"><img class="art" src="${img}" alt=""><p class="t">${esc(p.text)}</p>
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
let tipT;U.tip=function(h,t){const el=$('tip');el.innerHTML=`<b>${esc(h)}</b><span>${esc(t)}</span>`;el.classList.add('on');clearTimeout(tipT);tipT=setTimeout(()=>el.classList.remove('on'),7000)};
U.hudShow=function(on){if(!on){clearTimeout(tipT);$('tip').classList.remove('on')}$('hud').hidden=!on;if(!on&&U.clearFast)U.clearFast();$('pad').classList.toggle('show',on);if(!on){$('bossbar').hidden=true;$('hCombo').className='combo';$('banner').className='banner';$('fx').innerHTML=''}};
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
  $('hAbil').innerHTML=K.FRIENDS.filter(f=>G.abil.has(f.abil)).map(f=>`<span title="${esc(f.abilName)}">${pic('friend',f.id,24)}</span>`).join('');
  const c=$('hCombo');if(G.combo>=2){if(c.dataset.n!=G.combo){c.textContent=`КОМБО ×${Math.min(8,G.combo)}`;c.className='combo';void c.offsetWidth;c.className='combo on';c.dataset.n=G.combo}}else if(c.dataset.n!=='0'){c.className='combo';c.dataset.n='0'}
  $('tDash').hidden=!G.abil.has('dash');$('tPaw').hidden=!G.abil.has('paw');$('tTrap').hidden=!(G.trapDef&&G.chase);
  const needK=Object.keys(G.need||{});const hi=$('hItems');hi.hidden=!needK.length;
  if(needK.length)hi.innerHTML=needK.map(k=>{const h=G.have[k]||0,n=G.need[k];return `<span class="${h>=n?'ok':''}">${itemPic(k,22)} ${h}/${n}</span>`}).join('');
  const ht=$('hTrap');ht.hidden=!(G.trapDef&&G.chase);if(G.trapDef)ht.innerHTML=`${pic('trap',G.trapTier,24)} ×${G.trapsLeft}`;
  const hdi=$('hDogI');if(G.chase&&hdi.dataset.l!=G.chase.look){hdi.innerHTML=pic('dog',G.chase.look,24);hdi.dataset.l=G.chase.look}
};
U.hudFast=function(){
  const G=K.G;if(!G.P)return;
  const C=G.chase,hd=$('hDog');hd.hidden=!(C&&C.on);
  if(C&&C.on){const danger=Math.max(0,Math.min(1,1-C.gap/220));$('hDogM').style.width=(danger*100)+'%';hd.classList.toggle('near',danger>.75&&C.stun===0)}
  const mk=$('marks');let html='';
  if(G.items&&G.state==='play'){for(const it of G.items){if(it.got||Math.abs(it.x-G.P.x)>20*16)continue;
    const p=K.render.toScreen(it.x,it.y);const off=p.x<3||p.x>97||p.y<8||p.y>95;
    const x=Math.max(3,Math.min(97,p.x)),y=Math.max(10,Math.min(92,p.y));
    if(off||K.render.inDark)html+=`<span class="mark ${off?'edge':''}" style="left:${x}%;top:${y}%">${itemPic(it.type,off?24:30)}</span>`}}
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
U.toast=function(t,html){const el=$('toast');if(html)el.innerHTML=html+' '+esc(t);else el.textContent=t;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2200)};
U.flash=function(white){const f=$('flash');f.className='flash'+(white?' w':'');f.style.transition='none';f.style.opacity=white?.5:.35;requestAnimationFrame(()=>{f.style.transition='opacity .35s';f.style.opacity=0})};
U.bossBar=function(B){const bb=$('bossbar');if(!B){bb.hidden=true;return}bb.hidden=false;$('bossHp').style.width=(Math.max(0,B.hp)/B.maxHp*100)+'%'};
U.onEvent=function(e){
  const G=K.G;
  switch(e.t){
    case 'pop':U.pop(e);break;
    case 'hurt':case 'fall':U.flash();break;
    case 'bossHit':U.flash(true);U.bossBar(G.boss);break;
    case 'bossIntro':U.banner(e.name,G.boss.king?'Бейте Короля, когда он спустится на землю':'Уворачивайтесь, а когда он устанет — прыгайте ему на голову');$('bossName').textContent=e.name;U.bossBar(G.boss);break;
    case 'armorOn':U.toast('Броня! Сбейте её лапой или перекатом');break;
    case 'bossDown':U.bossBar(null);U.banner(e.king?'Король Теней повержен!':'Генерал повержен!','Дверь открыта');break;
    case 'checkpoint':U.toast('Фонарь зажжён — отсюда можно продолжить');break;
    case 'fish':U.banner('Золотая рыбка!','+500 очков');break;
    case 'comboEnd':if(e.n>=3)U.banner(`Комбо ×${e.n}!`,e.n>=5?'Невероятно!':'Отлично!');break;
    case 'shieldBreak':U.toast('Щит Колючки спас вас!');break;
    case 'item':U.toast(`${K.ITEMS[e.type].name}: ${e.have}/${e.need}`,itemPic(e.type,26));if(K.cageReady())setTimeout(()=>U.banner('Всё собрано!','Бегите к клетке'),600);break;
    case 'bossTired':U.banner(e.king?'Король спустился!':'Генерал устал!',e.king?(e.armor?'Бейте его перекатом или лапой — сейчас!':'Прыгайте ему на голову — сейчас!'):'Прыгайте ему на голову — сейчас!');break;
    case 'bossNope':U.toast(e.king?'Король в воздухе — ждите, пока он спустится':'Рано! Ждите, пока над ним появится стрелка');break;
    case 'tip':U.tip(e.title,e.text);break;
    case 'doorLocked':U.banner('Дверь заперта','Не хватает: '+Object.entries(e.missing).map(([k,n])=>`${K.ITEMS[k].name.toLowerCase()} ×${n}`).join(', '));break;
    case 'kit':U.toast('+1 ловушка',itemPic('kit',26));break;
    case 'fishLocked':{const g=K.ABIL_FRIEND[e.gate];if(g)U.banner('Золотая рыбка под замком',`Нужно умение «${g.abilName}» (${g.name}). Вернитесь сюда, когда спасёте друга`);break}
    case 'hint':{const h={double:['Двойной прыжок!','Нажмите прыжок ещё раз прямо в воздухе'],wall:['Прыжок от стены!','Прыгните к стене и жмите прыжок, касаясь её'],paw:['Удар лапой!',matchMedia('(pointer:coarse)').matches?'Нажмите «ЛАПА» у треснувшей стены':'Нажмите X у треснувшей стены, чтобы её сломать'],glide:['Планируйте!','Удерживайте прыжок, пока падаете']}[e.k];if(h)U.banner(h[0],h[1]);break}
    case 'chaserWake':U.toast('В будке кто-то проснулся…',pic('dog',K.G.chase?K.G.chase.look:0,26));break;
    case 'cageLocked':U.banner('Клетка заперта','Не хватает: '+Object.entries(e.missing).map(([k,n])=>`${K.ITEMS[k].name.toLowerCase()} ×${n}`).join(', ')+'. Вернитесь и поищите');break;
    case 'chaserStart':U.banner(`${e.name} идёт по следу!`,K.G.trapDef?`Ставьте ловушки: ${matchMedia('(pointer:coarse)').matches?'кнопка «Ловушка»':'клавиша C'}`:'Не останавливайтесь!');break;
    case 'chaserHowl':U.toast('Пёс готовится к рывку!',pic('dog',K.G.chase?K.G.chase.look:0,26));break;
    case 'chaserBite':U.flash();break;
    case 'trapSnap':U.toast('Пёс попался!',pic('trap',e.tier,26));break;
    case 'trapNo':U.toast(e.reason==='empty'?'Ловушки кончились — ищите наборы ловушек':e.reason==='air'?'Ловушку ставят на земле':'Здесь некого ловить');break;
  }
};
})(window.KOT=window.KOT||{});

