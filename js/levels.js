/* Кот на крышах — генератор уровней.
   Уровни собираются из «кусков» (chunks) с параметрами от зерна: каждый запуск одного уровня одинаков,
   но разные уровни, ежедневное испытание и бесконечный режим получаются разными. */
(function(K){
'use strict';
const T=16, ROWS=13;
K.T=T; K.ROWS=ROWS;
function rng(seed){let s=(Math.abs(seed|0)%2147483646)+1;return()=>{s=s*16807%2147483647;return(s-1)/2147483646}}
K.rng=rng;

/* Тайлы: 0 пусто, 1 кирпич, 2 доска (сквозная снизу), 3 шипы, 4 треснувшая стена, 5 призрачный мосток */
function Builder(seed,maxw){
  const g=[];for(let r=0;r<ROWS;r++)g.push(new Uint8Array(maxw));
  const L={w:0,rows:ROWS,g,stars:[],hearts:[],fish:[],enemies:[],springs:[],movers:[],falls:[],winds:[],checks:[],decor:[],blds:[],items:[],drips:[],geysers:[],darks:[],cage:null,goal:null,start:{col:2,top:11},boss:null};
  const r=rng(seed);
  const b={L,x:0,top:11,pool:['walker'],foeRate:.5,
    R:r, ri:(a,c)=>a+Math.floor(r()*(c-a+1)), pick:a=>a[Math.floor(r()*a.length)], chance:p=>r()<p,
    mark(c){if(c+1>L.w)L.w=c+1},
    set(c,row,t){if(c<0||c>=maxw||row<0||row>=ROWS)return;g[row][c]=t;b.mark(c)},
    fill(c0,w,top,t=1){for(let c=c0;c<c0+w;c++)for(let row=Math.max(0,top);row<ROWS;row++)b.set(c,row,t)},
    rect(c0,row0,w,h,t=1){for(let c=c0;c<c0+w;c++)for(let row=row0;row<row0+h;row++)b.set(c,row,t)},
    roof(len,top=b.top){top=Math.max(2,Math.min(11,top));const x0=b.x;b.fill(x0,len,top);L.blds.push({x0,w:len,top,tone:r()});b.x+=len;b.top=top;b.deco(x0,len,top);return x0},
    gap(n){b.x+=n},
    deco(x0,len,top){for(let c=x0+1;c<x0+len-1;c+=b.ri(3,7)){if(b.chance(.55))L.decor.push({type:b.pick(['chimney','chimney','antenna','tank','vent','sign','laundry','dish']),col:c,top,seed:r()})}},
    star(c,row){L.stars.push({x:c*T+8,y:row*T+8})},
    starLine(c,n,row,step=1){for(let i=0;i<n;i++)b.star(c+i*step,row)},
    starArc(ca,ra,cb,rb,lift=2.2){const n=cb-ca;if(n<1)return;for(let i=1;i<n;i++){const t=i/n;b.star(ca+i,Math.round(ra+(rb-ra)*t-lift*Math.sin(Math.PI*t)))}},
    heart(c,row){L.hearts.push({x:c*T+8,y:row*T+8})},
    fish(c,row,gate){L.fish.push({x:c*T+8,y:row*T+8,gate})},
    foe(type,c,top){L.enemies.push({type,col:c,top})},
    foeAuto(c,top){if(b.chance(b.foeRate))b.foe(b.pick(b.pool),c,top)},
    bat(c,row){L.enemies.push({type:'bat',col:c,row})},
    spike(c,top){b.set(c,top-1,3)},
    plank(c,row,w,t=2){for(let i=0;i<w;i++)b.set(c+i,row,t)},
    spring(c,top,power=9.6){L.springs.push({col:c,top,power});b.mark(c)},
    mover(cx,y,w,axis,amp,speed,phase=0){L.movers.push({cx,y,w,axis,amp,speed,phase})},
    fall(c,top){L.falls.push({col:c,top});b.mark(c)},
    wind(c0,c1,r0,r1,fx,fy){L.winds.push({x:c0*T,y:r0*T,w:(c1-c0)*T,h:(r1-r0)*T,fx,fy})},
    check(c,top){L.checks.push({col:c,top})},
    drip(c,row){L.drips.push({col:c,row})},
    geyser(c,top,phase){L.geysers.push({col:c,top,phase})},
    dark(c0,c1){L.darks.push({x0:c0*T,x1:c1*T})},
    slime(c,top,w){for(let i=0;i<w;i++)b.set(c+i,top-1,6)}
  };
  return b;
}

/* ---------- куски уровня ---------- */
const CH={
  start(b){b.roof(10,11);b.starLine(5,3,9,2)},
  check(b){const x0=b.roof(b.ri(6,8));b.check(x0+2,b.top);if(b.chance(.35))b.heart(x0+4,b.top-3)},
  flat(b){
    const len=b.ri(11,16),x0=b.roof(len),t=b.top;
    if(b.chance(.6)){const v=x0+b.ri(3,len-5);b.set(v,t-1,1);if(b.chance(.5))b.set(v+1,t-1,1);b.star(v,t-2)}
    b.starLine(x0+2,b.ri(3,5),t-2-(b.chance(.5)?1:0),2);
    b.foeAuto(x0+b.ri(5,len-3),t);if(len>13)b.foeAuto(x0+len-3,t);
  },
  hops(b){
    const n=b.ri(3,5);
    for(let i=0;i<n;i++){
      const t=b.top;let dh=b.pick([-2,-1,0,0,1,1,2]);let nt=Math.max(5,Math.min(11,t-dh));
      const g=(t-nt)>=2?2:b.ri(2,3);
      const ca=b.x-1;b.gap(g);
      const len=b.ri(3,6);b.starArc(ca,t-1,b.x,nt-1);b.roof(len,nt);
      if(len>=5)b.foeAuto(b.x-2,nt);
    }
  },
  planks(b){
    const len=b.ri(13,18),x0=b.roof(len),t=b.top;
    const w1=b.ri(3,4);b.plank(x0+2,t-3,w1);b.starLine(x0+2,w1,t-4);
    if(t-6>=1){b.plank(x0+7,t-6,3);b.starLine(x0+7,3,t-7)}
    b.plank(x0+len-5,t-3,3);
    b.foeAuto(x0+5,t);b.foeAuto(x0+len-3,t);
  },
  spikes(b){
    const len=b.ri(14,18),x0=b.roof(len),t=b.top;
    const a=x0+4,c=x0+b.ri(9,11);
    b.spike(a,t);b.spike(a+1,t);b.starArc(a-1,t-1,a+2,t-1,2);
    const w=b.ri(2,3);for(let i=0;i<w;i++)b.spike(c+i,t);
    b.plank(c-1,t-3,w+2);b.starLine(c-1,w+2,t-4);
    b.foeAuto(x0+len-3,t);
  },
  steps(b){
    const len=b.ri(13,16),x0=b.roof(len),t=b.top;
    const hs=[1,2,3,2,1];let c=x0+3;
    for(const h of hs){if(t-h<2)break;b.rect(c,t-h,2,h);b.star(c,t-h-1);c+=2}
    b.foeAuto(x0+len-2,t);
  },
  spring(b){
    const len=b.ri(5,7),x0=b.roof(len),t=b.top;
    b.spring(x0+len-2,t,10);
    const g=b.ri(3,4),nt=Math.max(4,t-b.ri(1,2));
    b.starArc(x0+len-2,t-3,x0+len+g,nt-2,3.5);
    b.gap(g);const x1=b.roof(b.ri(7,10),nt);b.foeAuto(x1+5,nt);
  },
  springTower(b){
    const x0=b.roof(b.ri(6,8)),t=b.top;
    b.spring(x0+3,t);b.starLine(x0+3,1,t-4);b.star(x0+3,t-6);
    const nt=Math.max(3,t-b.ri(5,6));b.roof(b.ri(6,9),nt);b.starLine(b.x-6,3,nt-2,2);
  },
  fallBridge(b){
    const x0=b.roof(b.ri(4,6)),t=b.top,g=b.ri(5,8);
    for(let i=0;i<g;i++)b.fall(b.x+i,t);
    b.starLine(b.x,g,t-2);b.gap(g);b.roof(b.ri(5,8),t);
  },
  moverGap(b){
    const x0=b.roof(b.ri(5,7)),t=b.top,g=b.ri(7,10),w=3;
    const cx=(b.x+g/2)*T;b.mover(cx,t*T,w,'x',(g*T-w*T)/2-2,b.R()*.01+.018,b.R()*6);
    b.starLine(b.x+2,g-4,t-2);b.gap(g);const x1=b.roof(b.ri(6,9),t);b.foeAuto(x1+4,t);
  },
  elevator(b){
    const x0=b.roof(b.ri(4,6)),t=b.top,nt=Math.max(3,t-b.ri(5,6)),w=3;
    b.mover((b.x+w/2)*T,((t+nt)/2)*T,w,'y',(t-nt)/2*T,.02,b.R()*6);
    b.starLine(b.x+1,1,nt-3);b.star(b.x+1,nt-1);b.gap(w);const x1=b.roof(b.ri(6,8),nt);b.foeAuto(x1+4,nt);
  },
  wind(b){
    const len=b.ri(18,24),x0=b.roof(len),t=b.top,dir=b.chance(.6)?-1:1;
    b.wind(x0+1,x0+len-1,0,t,dir*.55,0);
    b.spike(x0+7,t);b.spike(x0+8,t);b.spike(x0+15,t);b.spike(x0+16,t);
    b.starArc(x0+6,t-1,x0+9,t-1,2.5);b.starArc(x0+14,t-1,x0+17,t-1,2.5);
    b.foeAuto(x0+12,t);
  },
  bats(b){
    const len=b.ri(16,20),x0=b.roof(len),t=b.top;
    b.bat(x0+8,Math.max(1,t-5));b.bat(x0+len-4,Math.max(1,t-4));
    b.plank(x0+5,t-3,4);b.starLine(x0+5,4,t-4);b.starLine(x0+12,3,t-2,2);
  },
  shooters(b){
    const len=b.ri(17,21),x0=b.roof(len),t=b.top;
    b.set(x0+5,t-1,1);b.set(x0+5,t-2,1);b.set(x0+10,t-1,1);
    b.foe('shooter',x0+len-4,t);b.star(x0+5,t-3);b.starLine(x0+7,3,t-2);b.starLine(x0+12,3,t-3);
    b.plank(x0+12,t-4,4);
  },
  armor(b){
    const len=b.ri(16,19),x0=b.roof(len),t=b.top;
    b.foe('armored',x0+9,t);b.plank(x0+5,t-3,8);b.starLine(x0+5,8,t-4);b.foeAuto(x0+len-2,t);
  },
  /* требуют умений */
  dblWall(b){
    b.roof(b.ri(5,7));const t=b.top,nt=Math.max(3,t-3);
    for(let r=t-1;r>nt;r-=2)b.star(b.x-1,r);b.roof(b.ri(6,9),nt);b.foeAuto(b.x-3,nt);
  },
  dblGap(b){
    b.roof(b.ri(5,7));const t=b.top,g=b.ri(5,6),nt=Math.min(11,t+b.ri(0,1));
    b.starArc(b.x-1,t-1,b.x+g,nt-1,4);b.gap(g);b.roof(b.ri(6,8),nt);
  },
  glideGap(b){
    const t0=Math.max(5,b.top-b.ri(0,1));b.roof(b.ri(5,7),t0);const g=b.ri(8,11),nt=Math.min(11,t0+b.ri(1,2));
    b.starArc(b.x-1,t0-1,b.x+g,nt-1,3);b.gap(g);b.roof(b.ri(6,9),nt);
  },
  updraft(b){
    b.roof(b.ri(6,8));const t=b.top,nt=Math.max(2,t-b.ri(5,6)),w=3;
    b.wind(b.x,b.x+w,0,ROWS,0,-1);for(let r=t-2;r>nt-1;r-=2)b.star(b.x+1,r);
    b.gap(w);b.roof(b.ri(7,9),nt);b.foeAuto(b.x-3,nt);
  },
  dashGap(b){
    b.roof(b.ri(5,7));const t=b.top,g=b.ri(6,7);
    b.starLine(b.x,g,t-3);b.gap(g);b.roof(b.ri(6,8),t);
  },
  dashArmor(b){
    const len=18,x0=b.roof(len),t=b.top;
    b.rect(x0+4,t-3,11,1);
    b.foe('armored',x0+8,t);b.foe('armored',x0+12,t);b.starLine(x0+5,9,t-2);
  },
  crackGate(b){
    const len=b.ri(11,14),x0=b.roof(len),t=b.top,c=x0+5;
    for(let r=0;r<t;r++)b.set(c,r,4);
    b.starLine(c+2,3,t-2);b.foeAuto(x0+len-2,t);
  },
  chimney(b){
    b.roof(b.ri(4,6));const t=b.top,top2=Math.max(2,t-8);
    const s=b.x;b.roof(3,t);
    for(let r=top2;r<=t-3;r++)b.set(s,r,1);
    for(let r=t-3;r>top2;r-=2)b.star(s+1,r);
    b.roof(b.ri(5,7),top2);b.starLine(b.x-4,3,top2-1);
    b.gap(2);b.roof(b.ri(3,4),Math.min(11,top2+3));b.roof(b.ri(4,6),Math.min(11,top2+6));
  },
  ghostBridge(b){
    b.roof(b.ri(5,6));const t=b.top,g=b.ri(9,12);
    let c=b.x+1,row=t-1;
    while(c<b.x+g-1){b.plank(c,row,2,5);b.star(c,row-1);c+=3;row=Math.max(2,Math.min(t,row+b.pick([-1,0,1])))}
    b.gap(g);b.roof(b.ri(5,8),t);
  },
  ghostStairs(b){
    const x0=b.roof(b.ri(8,10)),t=b.top,nt=Math.max(2,t-7);
    b.plank(x0+3,t-3,2,5);b.plank(x0+6,t-6,2,5);b.starLine(x0+3,2,t-4);b.starLine(x0+6,2,t-7);
    b.roof(b.ri(6,8),nt);b.gap(2);b.roof(b.ri(5,7),Math.min(11,nt+4));
  },
  /* берлога: пещерные испытания */
  cave_drips(b){
    const len=b.ri(16,20),x0=b.roof(len),t=b.top;
    for(let c=x0+3;c<x0+len-2;c+=b.ri(2,4))b.drip(c,1);
    b.starLine(x0+2,5,t-2,3);b.foeAuto(x0+len-3,t);
  },
  cave_slime(b){
    const len=b.ri(16,19),x0=b.roof(len),t=b.top;
    b.slime(x0+3,t,4);b.plank(x0+3,t-3,4);b.starLine(x0+3,4,t-4);
    b.slime(x0+11,t,b.ri(3,4));b.starArc(x0+10,t-1,x0+15,t-1,3);b.foeAuto(x0+8,t);
  },
  cave_dark(b){
    const c0=b.x;b.roof(b.ri(4,6));
    for(let i=0;i<3;i++){const t=b.top,nt=Math.max(5,Math.min(11,t-b.pick([-1,0,1,1])));const ca=b.x-1;b.gap(b.ri(2,3));b.starArc(ca,t-1,b.x,nt-1);b.roof(b.ri(4,6),nt)}
    b.foeAuto(b.x-2,b.top);b.dark(c0,b.x);
  },
  cave_geysers(b){
    const len=b.ri(17,20),x0=b.roof(len),t=b.top;
    [4,9,14].forEach((d,i)=>{if(d<len-2){b.geyser(x0+d,t,i*70);b.star(x0+d,t-5)}});
    b.starLine(x0+2,3,t-2,5);
  },
  /* секреты: золотые рыбки за умениями, которых у игрока ещё нет */
  secret_double(b){const x0=b.roof(10),t=b.top;b.plank(x0+4,t-5,2);b.fish(x0+4,t-6,'double');b.starLine(x0+1,2,t-2)},
  secret_glide(b){const x0=b.roof(11,11),t=b.top;b.wind(x0+1,x0+4,0,t,0,-1);b.rect(x0+5,Math.max(0,t-9),3,1);b.fish(x0+6,Math.max(0,t-10),'glide');b.starLine(x0+1,3,t-2)},
  secret_dash(b){const x0=b.roof(14,11),t=b.top;b.plank(x0+1,t-3,2);b.fish(x0+11,t-7,'dash');b.starLine(x0+4,2,t-2)},
  secret_paw(b){const x0=b.roof(10),t=b.top,c=x0+5;[[c-1,t-1],[c+1,t-1],[c-1,t-2],[c,t-2],[c+1,t-2]].forEach(([x,y])=>b.set(x,y,4));b.fish(c,t-1,'paw')},
  secret_wall(b){const x0=b.roof(10,11),t=b.top,c=x0+3;for(let r=Math.max(1,t-10);r<=t-4;r++){b.set(c,r,1);b.set(c+3,r,1)}b.fish(c+1,Math.max(0,t-10),'wall')},
  secret_light(b){const x0=b.roof(11,11),t=b.top;b.plank(x0+3,t-3,2,5);b.plank(x0+6,t-6,2,5);b.plank(x0+3,t-9,2,5);b.fish(x0+3,t-10,'light')},
  secret_magnet(b){const x0=b.roof(10),t=b.top,c=x0+5;b.rect(c-1,t-3,3,3);b.set(c,t-2,0);b.fish(c,t-2,'magnet')},
  finish(b,friend){
    const x0=b.roof(18,b.top),t=b.top;b.starLine(x0+2,4,t-2,1);
    if(friend)b.L.cage={col:x0+8,top:t,friend};
    b.L.goal={col:x0+13,top:t};b.x+=1;
  }
};

/* ---------- кампания ---------- */
const C=(name,...more)=>[name,...more];
K.LEVELS=[
  {id:'1-1',world:0,name:'Первая ночь',friend:'crow',need:{key:1},kits:0,seed:101,pool:['walker'],foe:.45,news:'Пружины и тени',
   plan:['start','flat','hops','planks','check','spring','spikes','steps','check','hops','secret_double','spring','flat']},
  {id:'1-2',world:0,name:'Черепичный квартал',friend:'owl',need:{key:2},kits:1,seed:202,pool:['walker','hopper'],foe:.55,news:'Падающая черепица и прыгающие тени',
   plan:['start','hops','fallBridge','dblWall','check','flat','dblGap','planks','fallBridge','check','steps','secret_glide','dblWall','springTower','hops']},
  {id:'1-3',world:0,name:'Ветреные антенны',friend:'squirrel',need:{key:2,rope:1},kits:1,seed:303,pool:['walker','hopper','walker'],foe:.6,news:'Ветер, летучие мыши и восходящие потоки',
   plan:['start','wind','glideGap','bats','check','updraft','hops','wind','check','glideGap','secret_dash','bats','planks','updraft']},
  {id:'1-B',world:0,name:'Генерал теней',boss:'general1',news:'Босс! Прыгайте ему на голову, когда он устанет'},
  {id:'2-1',world:1,name:'Трубы и пар',friend:'raccoon',need:{key:2,rope:1},kits:1,seed:404,pool:['walker','shooter','hopper'],foe:.55,news:'Подвижные платформы, стрелки и броня',
   plan:['start','moverGap','shooters','dashGap','check','armor','dashArmor','elevator','check','moverGap','secret_wall','hops','spring','flat']},
  {id:'2-2',world:1,name:'Колодец дворов',friend:'lizard',need:{key:3,rope:1},kits:1,seed:505,pool:['walker','shooter','hopper','armored'],foe:.6,news:'Треснувшие стены',
   plan:['start','crackGate','moverGap','fallBridge','check','dashArmor','crackGate','bats','check','secret_light','elevator','shooters','glideGap','hops']},
  {id:'2-3',world:1,name:'Неоновые вывески',friend:'firefly',need:{key:3,rope:1,cutter:1},kits:2,seed:606,pool:['hopper','shooter','armored','walker'],foe:.65,news:'Колодцы для прыжков от стен',
   plan:['start','chimney','wind','shooters','check','chimney','fallBridge','armor','check','dblWall','secret_magnet','crackGate','moverGap','updraft']},
  {id:'2-B',world:1,name:'Генерал теней II',boss:'general2',news:'Генерал надел броню: сбейте её лапой или перекатом'},
  {id:'3-1',world:2,name:'Вход в берлогу',friend:'mouse',need:{key:3,rope:1,cutter:1},kits:2,seed:707,pool:['walker','hopper','bat'],foe:.6,news:'Тьма, сталактиты и призрачные мостки',
   plan:['start','cave_drips','ghostBridge','cave_dark','check','cave_slime','ghostStairs','bats','check','cave_drips','secret_magnet','ghostBridge','cave_dark','hops']},
  {id:'3-2',world:2,name:'Кристальные пещеры',friend:'hedgehog',need:{key:3,rope:2,cutter:1},kits:2,seed:808,pool:['hopper','shooter','armored','walker'],foe:.7,news:'Огненные гейзеры и липкая слизь',
   plan:['start','cave_geysers','cave_slime','updraft','check','shooters','cave_drips','glideGap','elevator','check','cave_geysers','secret_paw','cave_dark','ghostStairs','cave_slime']},
  {id:'3-3',world:2,name:'Тронный зал',friend:'kitten',need:{key:4,rope:2,cutter:2},kits:2,seed:909,pool:['hopper','shooter','armored','walker'],foe:.75,news:'Последний путь: всё, чему вы научились',
   plan:['start','chimney','cave_geysers','crackGate','check','cave_dark','dashArmor','updraft','check','cave_drips','shooters','chimney','check','cave_slime','glideGap','secret_light','cave_geysers','dblGap']},
  {id:'3-B',world:2,name:'Король Теней',boss:'king',news:'Финал. Король неуязвим в броне, пока не спустится'}
];
K.LEVEL=Object.fromEntries(K.LEVELS.map((l,i)=>[l.id,Object.assign(l,{index:i})]));

function descend(b){if(b.top<6){b.gap(2);b.roof(b.ri(3,5),Math.min(11,b.top+b.ri(3,4)))}}
function lowerStars(L){
  const surf=new Map();
  for(const f of L.falls)surf.set(f.col,Math.min(surf.get(f.col)??99,f.top));
  for(const m of L.movers){if(m.axis!=='x')continue;const c0=Math.floor((m.cx-(m.amp+m.w*T/2))/T),c1=Math.ceil((m.cx+m.amp+m.w*T/2)/T);for(let c=c0;c<=c1;c++)surf.set(c,Math.min(surf.get(c)??99,Math.round(m.y/T)))}
  for(const s of L.stars){const c=Math.floor(s.x/T),r=Math.floor(s.y/T);let sb=surfaceBelow(L,c,r);const fs=surf.get(c);if(fs!==undefined&&fs>r&&fs<sb)sb=fs;
    if(sb<ROWS&&sb-r>=2&&sb-r<=3){const nr=sb-1;if(!L.g[nr][c])s.y=nr*T+8}}
}
function finalize(b,parPerTile){
  const L=b.L;
  if(!L.goal){CH.finish(b,null)}
  L.w=Math.max(L.w,b.x+1);
  L.par=Math.round(L.w/parPerTile+10);
  return L;
}

/* Потолок пещеры: каменный свод над всей берлогой */
function cave(L){L.cave=true;for(let c=0;c<L.w;c++)if(!L.g[0][c]&&!L.g[1][c])L.g[0][c]=1}
/* Прячем ключи, верёвки и кусачки: на высоких местах, ровно по длине уровня */
function surfaceBelow(L,col,row){for(let r=row+1;r<ROWS;r++){const t=L.g[r][col];if(t===1||t===2||t===4||t===5)return r}return ROWS+3}
function placeItems(L,def,r){
  const list=[];for(const k in (def.need||{}))for(let i=0;i<def.need[k];i++)list.push(k);
  for(let i=0;i<(def.kits||0);i++)list.push('kit');
  if(!list.length)return;
  for(let i=list.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
  const limit=(L.cage?L.cage.col-2:L.w-20)*T, start=14*T;
  const n=list.length,span=(limit-start)/n;
  const used=new Set();
  for(let i=0;i<n;i++){
    const a=start+span*i,z=a+span;let best=-1,bh=-1;
    L.stars.forEach((s,k)=>{if(used.has(k)||s.x<a||s.x>z)return;const col=Math.floor(s.x/T),row=Math.floor(s.y/T);const sb=surfaceBelow(L,col,row),h=sb-row;const score=(sb>=ROWS?0:Math.min(h,6))+r()*.5;if(score>bh){bh=score;best=k}});
    if(best<0)continue;
    used.add(best);const s=L.stars[best];L.items.push({type:list[i],x:s.x,y:s.y});
  }
  L.stars=L.stars.filter((s,k)=>!used.has(k));
}

/* Арены для боссов */
function arena(kind){
  const W=kind==='king'?48:44;const b=Builder(kind==='king'?99:88,W+2);
  b.rect(0,0,2,ROWS);b.rect(W-2,0,2,ROWS);b.fill(2,W-4,11);
  b.plank(7,7,5);b.plank(W-12,7,5);b.plank(Math.floor(W/2)-3,4,6);
  if(kind==='king'){b.plank(3,9,3);b.plank(W-6,9,3)}
  b.starLine(8,4,6);b.starLine(W-11,4,6);b.starLine(Math.floor(W/2)-2,4,3);
  b.heart(4,9);b.heart(W-5,9);
  const L=b.L;L.w=W;L.start={col:5,top:11};L.boss={type:kind,col:W-10};L.arena=true;
  L.blds.push({x0:2,w:W-4,top:11,tone:.5});
  L.par=kind==='king'?150:kind==='general2'?110:80;
  if(kind==='king')cave(L);
  return L;
}

K.buildLevel=function(def){
  if(def.boss)return Object.assign(arena(def.boss),{def});
  const b=Builder(def.seed,900);b.pool=def.pool;b.foeRate=def.foe;
  for(const step of def.plan){descend(b);CH[step](b)}
  CH.finish(b,def.friend);
  const L=Object.assign(finalize(b,5.4),{def});
  if(def.world===2)cave(L);
  placeItems(L,def,b.R);
  lowerStars(L);
  return L;
};

/* Процедурный уровень для испытаний: всё смешано, сложность растёт к концу. */
const POOL_EASY=['flat','hops','planks','spikes','steps','spring','fallBridge','moverGap','bats'];
const POOL_ALL=POOL_EASY.concat(['wind','shooters','armor','elevator','springTower','dblWall','dblGap','glideGap','updraft','dashGap','dashArmor','crackGate','chimney','ghostBridge','ghostStairs','cave_slime','cave_geysers']);
K.buildProcedural=function(seed,chunks,endless){
  const b=Builder(seed,endless?2400:900);const r=b.R;
  CH.start(b);
  let last='';
  for(let i=0;i<chunks;i++){
    const k=i/chunks;
    b.foeRate=.35+k*.5;
    b.pool=k<.25?['walker','hopper']:k<.5?['walker','hopper','bat','shooter']:['walker','hopper','shooter','armored'];
    const pool=k<.15?POOL_EASY:POOL_ALL;
    let name;do{name=pool[Math.floor(r()*pool.length)]}while(name===last);
    last=name;descend(b);CH[name](b);
    if(i%4===3)CH.check(b);
  }
  CH.finish(b,null);
  const L=finalize(b,4.4);L.procedural=true;lowerStars(L);return L;
};
K.dailySeed=function(d=new Date()){return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
K.dailyKey=function(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

/* Дом: крыша, где живут спасённые друзья */
K.buildHub=function(){const b=Builder(7,40);b.roof(36,10);b.L.w=36;b.L.start={col:18,top:10};b.L.hub=true;b.L.decor=b.L.decor.filter(d=>d.col<8||d.col>28);return b.L};
})(window.KOT=window.KOT||{});
