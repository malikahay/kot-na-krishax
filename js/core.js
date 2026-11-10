/* Кот на крышах — симуляция игры (без DOM). 60 шагов в секунду, координаты в пикселях (тайл = 16).
   Всё, что должно быть услышано или показано, уходит событиями в K.events. */
(function(K){
'use strict';
const T=K.T, ROWS=K.ROWS;
const G=K.G={state:'idle'};
const ev=K.events=[];
const emit=(t,o={})=>{o.t=t;ev.push(o);return o};
K.input={left:false,right:false,jump:false,dash:false,paw:false,trap:false,taps:{jump:0,dash:0,paw:0,trap:0}};

const EN={walker:{w:12,h:12,sp:.5},hopper:{w:12,h:13,sp:.6},bat:{w:12,h:9,sp:0},shooter:{w:14,h:14,sp:0},armored:{w:14,h:13,sp:.35}};

K.startLevel=function(L,opts){
  Object.assign(G,{L,mode:opts.mode||'story',abil:new Set(opts.abil||[]),frame:0,time:0,score:0,stomps:0,
    hitstop:0,combo:0,comboBest:0,dmg:0,deaths:0,state:'play',rec:[],starChain:0,lastStar:-99,friendFollow:null,
    lives:0,maxLives:0,distance:0});
  G.maxLives=G.lives=G.abil.has('heart')?4:3;
  G.g=L.g;
  const sc=L.start;
  G.P={x:sc.col*T+2,y:sc.top*T-14,w:12,h:14,vx:0,vy:0,face:1,onGround:false,wasGround:true,inv:0,coyote:0,buffer:0,
    airJumps:1,dash:0,dashCd:0,canDash:true,paw:0,pawCd:0,lock:0,wallDir:0,sliding:false,gliding:false,springT:0,ride:null,
    shield:G.abil.has('shield'),fallV:0,roll:0};
  G.P.safe={x:G.P.x,y:G.P.y};G.P.check={x:G.P.x,y:G.P.y};
  G.stars=L.stars.map(s=>({x:s.x,y:s.y,got:false}));
  G.starsTotal=G.stars.length;G.starsGot=0;
  G.hearts=L.hearts.map(h=>({x:h.x,y:h.y,got:false}));
  G.fish=L.fish.map(f=>({x:f.x,y:f.y,gate:f.gate,got:false}));
  G.enemies=L.enemies.map(spawnEnemy);
  G.shots=[];
  G.movers=L.movers.map(m=>({...m,x:0,y0:m.y,yy:m.y,dx:0,dy:0,W:m.w*T,H:6}));
  updateMovers(true);
  G.falls=L.falls.map(f=>({x:f.col*T,y:f.top*T,y0:f.top*T,w:T,h:8,st:'idle',t:0,vy:0}));
  G.springs=L.springs.map(s=>({x:s.col*T+2,y:s.top*T-8,w:12,h:8,power:s.power,t:0}));
  G.winds=L.winds.map(w=>({...w}));
  G.checks=L.checks.map(c=>({x:c.col*T+4,y:c.top*T-30,w:10,h:30,on:false}));
  G.cage=L.cage?{x:L.cage.col*T-4,y:0,w:24,h:L.cage.top*T,friend:L.cage.friend,open:false,skip:opts.skipCage}:null;
  if(G.cage&&G.cage.skip)G.cage=null;
  G.goal=L.goal?{x:L.goal.col*T,y:0,w:T,h:L.goal.top*T,dy:L.goal.top*T-32}:null;
  G.boss=L.boss?makeBoss(L.boss):null;
  G.broken=[];
  // вещи для спасения
  G.items=(L.items||[]).map(i=>({...i,got:false}));
  G.need=Object.assign({},(L.def&&L.def.need)||{});G.have={key:0,rope:0,cutter:0};
  if(!G.cage&&!(L.def&&L.def.need&&!L.def.boss&&!opts.skipCage))G.need={};
  G.tips=(L.tips||[]).map(t=>({...t,shown:false}));G.doorMsgT=-999;
  // ловушки
  const tier=opts.trapTier??-1;G.trapDef=tier>=0?K.TRAPS[Math.min(K.TRAPS.length-1,tier)]:null;
  G.trapTier=tier;G.trapsLeft=G.trapDef?G.trapDef.charges:0;G.traps=[];G.trapCd=0;
  // преследователь
  G.chase=opts.chase?{easy:!!opts.chase.easy,tier:opts.chase.tier,look:opts.chase.look,speed:opts.chase.speed,lunge:opts.chase.lunge,trail:[],idx:0,on:false,stun:0,boost:0,lungeT:opts.chase.lunge||0,warn:0,x:G.P.x-40,y:G.P.y,face:1,gap:999,bites:0,trapped:0}:null;
  if(G.chase){const C=G.chase;C.kennel={x:G.P.x-30,y:G.P.y};C.x=C.kennel.x;C.y=C.kennel.y;C.trail.push([C.kennel.x,C.kennel.y]);C.wake=false}
  G.hinted={};G.wallPush=0;
  // берлога
  G.drips=(L.drips||[]).map(d=>({x:d.col*T+4,y:d.row*T,y0:d.row*T,w:8,h:14,st:'hang',t:0,vy:0}));
  G.geysers=(L.geysers||[]).map(g=>({x:g.col*T+2,y:g.top*T-64,w:12,h:64,phase:g.phase,on:false,warn:false}));
  G.darks=L.darks||[];
  emit('start');
};

function spawnEnemy(e){
  const d=EN[e.type];
  const o={type:e.type,w:d.w,h:d.h,vx:-d.sp,vy:0,alive:true,squash:0,onGround:false,t:Math.random()*100|0,cd:90+(Math.random()*60|0),hp:1,flash:0};
  o.x=e.col*T+(T-d.w)/2;
  if(e.type==='bat'){o.y=e.row*T+2;o.hx=o.x;o.hy=o.y;o.mode='hang'}
  else o.y=e.top*T-d.h;
  if(e.type==='shooter')o.vx=0;
  return o;
}

/* ---------- тайлы ---------- */
function tile(tx,ty){
  const L=G.L;
  if(tx<0||tx>=L.w)return 1;
  if(ty<0)return 0;
  if(ty>=ROWS)return 0;
  return G.g[ty][tx];
}
K.tile=tile;
const light=()=>G.abil.has('light');
const solidWall=(tx,ty)=>{const t=tile(tx,ty);return t===1||t===4};
const oneWay=t=>t===2||(t===5&&light());
const standable=(tx,ty)=>{const t=tile(tx,ty);return t===1||t===4||oneWay(t)};

function moveX(e){
  e.x+=e.vx;let hit=0;
  const top=Math.floor(e.y/T),bot=Math.floor((e.y+e.h-0.01)/T);
  if(e.vx>0){const tx=Math.floor((e.x+e.w)/T);for(let ty=top;ty<=bot;ty++)if(solidWall(tx,ty)){e.x=tx*T-e.w;hit=1;break}}
  else if(e.vx<0){const tx=Math.floor(e.x/T);for(let ty=top;ty<=bot;ty++)if(solidWall(tx,ty)){e.x=(tx+1)*T;hit=-1;break}}
  if(hit)e.vx=0;
  return hit;
}
function moveY(e){
  const prevBot=e.y+e.h;
  e.y+=e.vy;e.onGround=false;
  const l=Math.floor(e.x/T),r=Math.floor((e.x+e.w-0.01)/T);
  if(e.vy>0){
    const ty=Math.floor((e.y+e.h)/T);
    for(let tx=l;tx<=r;tx++){const t=tile(tx,ty);
      if(t===1||t===4||(oneWay(t)&&prevBot<=ty*T+0.5)){e.y=ty*T-e.h;e.vy=0;e.onGround=true;break}}
  }else if(e.vy<0){
    const ty=Math.floor(e.y/T);
    for(let tx=l;tx<=r;tx++)if(solidWall(tx,ty)){e.y=(ty+1)*T;e.vy=0;e.bonk=true;break}
  }
}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
K.overlap=overlap;

/* ---------- платформы ---------- */
function updateMovers(init){
  const f=G.frame;
  for(const m of G.movers){
    const s=Math.sin(m.phase+f*m.speed);
    const nx=(m.axis==='x'?m.cx+s*m.amp:m.cx)-m.W/2;
    const ny=m.axis==='y'?m.y0+s*m.amp:m.y0;
    if(init){m.dx=m.dy=0}else{m.dx=nx-m.x;m.dy=ny-m.yy}
    m.x=nx;m.yy=ny;
  }
}
function platforms(){
  const list=[];
  for(const m of G.movers)list.push({x:m.x,y:m.yy,w:m.W,ref:m,dy:m.dy});
  for(const f of G.falls)if(f.st!=='gone')list.push({x:f.x,y:f.y,w:f.w,ref:f,dy:f.st==='fall'?f.vy:0});
  return list;
}
function landOnPlatforms(P){
  if(P.vy<0)return;
  for(const p of platforms()){
    if(P.x+P.w<=p.x+1||P.x>=p.x+p.w-1)continue;
    const bot=P.y+P.h, prev=bot-P.vy-Math.max(0,p.dy);
    if(bot>=p.y-0.5&&prev<=p.y+3.5){P.y=p.y-P.h;P.vy=0;P.onGround=true;P.ride=p.ref;return}
  }
}

/* ---------- урон ---------- */
function hurt(src){
  const P=G.P;
  if(P.inv>0||P.dash>0||G.state!=='play')return;
  if(P.shield){P.shield=false;P.inv=90;P.vy=-3.5;P.vx=-P.face*2;emit('shieldBreak',{x:P.x+6,y:P.y+7});return}
  G.lives--;G.dmg++;emit('hurt',{x:P.x+6,y:P.y+7});
  if(G.lives<=0){die();return}
  P.inv=100;P.vy=-3.8;P.vx=-P.face*2.2;P.dash=0;
}
function fell(){
  const P=G.P;
  G.lives--;G.dmg++;emit('fall',{x:P.x+6,y:P.y});
  if(G.lives<=0){die();return}
  P.x=P.safe.x;P.y=P.safe.y;P.vx=P.vy=0;P.inv=100;P.dash=0;P.ride=null;
  if(G.chase){G.chase.trail.push([P.x,P.y]);G.chase.idx=Math.max(G.chase.idx-60,0)}
}
function die(){G.state='dead';G.deaths++;emit('dead')}
K.continueRun=function(){
  const P=G.P;G.lives=G.maxLives;G.state='play';
  P.x=P.check.x;P.y=P.check.y;P.vx=P.vy=0;P.inv=120;P.dash=0;P.ride=null;P.safe={...P.check};
  if(G.abil.has('shield'))P.shield=true;
  if(G.boss){G.boss.hp=Math.min(G.boss.maxHp,G.boss.hp+1);G.shots.length=0}
  if(G.chase){const C=G.chase;C.trail.push([P.x,P.y]);C.idx=Math.max(0,C.trail.length-1-260);C.stun=90}
  emit('continue');
};

function addScore(n,x,y,col){G.score+=n;emit('pop',{x,y,text:'+'+n,col})}
function stompBounce(P){P.vy=K.input.jump?-6.4:-4.6;P.airJumps=1;P.canDash=true;P.springT=0}
function killEnemy(e,how){
  e.alive=false;e.squash=0;
  const P=G.P;
  if(!P.onGround)G.combo++;else G.combo=Math.max(G.combo,1);
  G.comboBest=Math.max(G.comboBest,G.combo);G.stomps++;
  const mult=Math.min(G.combo,8),pts=100*mult;
  G.score+=pts;
  G.hitstop=how==='stomp'?5:4;
  emit(how,{x:e.x+e.w/2,y:e.y+e.h/2,combo:G.combo,type:e.type});
  emit('pop',{x:e.x+e.w/2,y:e.y-4,text:mult>1?`+${pts} ×${mult}`:`+${pts}`,col:mult>1?'#ff8fd0':'#ffd85a',big:mult>1});
}

/* ---------- основной шаг ---------- */
K.step=function(){
  if(G.state!=='play')return;
  if(G.hitstop>0){G.hitstop--;return}
  G.frame++;G.time++;
  const P=G.P,inp=K.input,taps=inp.taps,A=G.abil;
  updateMovers(false);
  if(P.ride){if(G.movers.includes(P.ride)){P.x+=P.ride.dx;P.y+=P.ride.dy}else if(P.ride.st==='fall')P.y+=P.ride.vy}

  const dir=(inp.right?1:0)-(inp.left?1:0);
  if(P.lock>0)P.lock--;
  if(P.dashCd>0)P.dashCd--;
  if(P.pawCd>0)P.pawCd--;
  if(P.springT>0)P.springT--;

  // перекат
  if(taps.dash&&A.has('dash')&&P.dashCd===0&&P.canDash&&P.dash===0){
    if(dir)P.face=dir;
    P.dash=13;P.dashCd=34;P.canDash=P.onGround;P.vy=Math.min(P.vy,0);emit('dash',{x:P.x+6,y:P.y+7,dir:P.face});
  }
  // удар лапой
  if(taps.paw&&A.has('paw')&&P.pawCd===0){if(dir)P.face=dir;P.paw=12;P.pawCd=22;emit('paw',{x:P.x+6+P.face*10,y:P.y+7,dir:P.face})}

  if(P.dash>0){
    P.dash--;P.vx=P.face*4.8;P.vy=P.onGround?P.vy:Math.min(P.vy,.3);
    if(P.dash===0)P.vx=P.face*2;
  }else{
    const maxV=P.gliding?2.2:1.95;
    if(dir&&P.lock===0){P.vx+=dir*(P.onGround?.3:.24);P.face=dir}
    else if(!dir){P.vx*=P.onGround?.74:.93;if(Math.abs(P.vx)<.05)P.vx=0}
    if(Math.abs(P.vx)>maxV)P.vx=Math.sign(P.vx)*Math.max(maxV,Math.abs(P.vx)*.9);
    if(P.slimed){P.vx=Math.max(-.8,Math.min(.8,P.vx))}
  }

  // прыжки
  if(taps.jump)P.buffer=8;
  P.coyote=P.onGround?6:Math.max(0,P.coyote-1);
  if(P.buffer>0){
    P.buffer--;
    if(P.coyote>0){P.vy=P.slimed?-4.4:-6.2;P.coyote=0;P.buffer=0;P.onGround=false;P.ride=null;emit('jump',{x:P.x+6,y:P.y+P.h})}
    else if(A.has('wall')&&P.wallDir&&!P.onGround){
      P.vy=-5.9;P.vx=-P.wallDir*2.7;P.face=-P.wallDir;P.lock=10;P.buffer=0;P.airJumps=1;P.canDash=true;
      emit('walljump',{x:P.x+6+P.wallDir*6,y:P.y+7,dir:P.wallDir});
    }
    else if(taps.jump&&A.has('double')&&P.airJumps>0&&P.dash===0){P.vy=-5.7;P.airJumps=0;P.buffer=0;emit('djump',{x:P.x+6,y:P.y+P.h})}
  }
  taps.jump=taps.dash=taps.paw=0;
  if(!inp.jump&&P.vy<-2.5&&P.springT===0)P.vy=-2.5;

  // гравитация, планирование, скольжение по стене
  if(P.dash===0||P.onGround)P.vy+=.35;
  P.gliding=false;P.sliding=false;
  if(A.has('glide')&&inp.jump&&!P.onGround&&P.dash===0&&(P.vy>0||P.glideHold)){P.vy=Math.min(P.vy,.85);P.gliding=true;P.glideHold=true}
  else if(!inp.jump||P.onGround)P.glideHold=false;
  if(A.has('wall')&&!P.onGround&&P.wallDir&&dir===P.wallDir&&P.vy>1.1){P.vy=1.1;P.sliding=true}
  // ветер
  let push=0;
  const cx=P.x+6,cy=P.y+7;
  for(const w of G.winds){
    if(cx<w.x||cx>w.x+w.w||cy<w.y||cy>w.y+w.h)continue;
    push+=w.fx*(P.onGround?.8:1.2);
    if(w.fy){if(P.gliding)P.vy=Math.max(-3.2,P.vy+w.fy*.7);else P.vy+=w.fy*.12}
    w.active=G.frame;
  }
  P.vy=Math.min(P.vy,7);

  const vx0=P.vx;P.vx+=push;
  const hit=moveX(P);
  if(!hit)P.vx-=push;else P.vx=0;
  if(hit&&P.dash>0){P.dash=0}
  P.wasGround=P.onGround;
  const fallV=P.vy;
  P.bonk=false;
  moveY(P);
  if(P.y<0){P.y=0;if(P.vy<0)P.vy=0}
  if(!P.onGround){P.ride=null;landOnPlatforms(P)}else P.ride=null;
    // стены рядом (для прыжков от стен)
  P.wallDir=0;
  if(!P.onGround){
    const top=Math.floor((P.y+2)/T),bot=Math.floor((P.y+P.h-3)/T);
    for(let ty=top;ty<=bot;ty++){if(solidWall(Math.floor((P.x+P.w+1.5)/T),ty))P.wallDir=1;if(solidWall(Math.floor((P.x-1.5)/T),ty))P.wallDir=-1}
  }
  if(P.onGround){
    P.airJumps=1;P.canDash=true;
    if(!P.wasGround){emit('land',{x:P.x+6,y:P.y+P.h,v:fallV});if(G.combo>=2)emit('comboEnd',{n:G.combo});G.combo=0}
  }
  if(P.inv>0)P.inv--;
  // подсказки к умениям: показываются один раз, когда упираешься в препятствие
  if(P.onGround&&dir){const ft=Math.floor((dir>0?P.x+P.w+2:P.x-2)/T),r0=Math.floor((P.y+P.h-1)/T);let h=0;while(h<7&&solidWall(ft,r0-h))h++;
    if(h>=3){G.wallPush++;if(G.wallPush>12){const crack=tile(ft,r0)===4||tile(ft,r0-1)===4;const k=crack&&A.has('paw')?'paw':crack?null:A.has('wall')&&h>=6?'wall':A.has('double')&&h>=3?'double':null;if(k&&!G.hinted[k]){G.hinted[k]=1;emit('hint',{k})}}}else G.wallPush=0}
  if(P.onGround&&A.has('double')&&!G.hinted.double&&dir>0){const c0=Math.floor((P.x+P.w+4)/T),r0=Math.floor((P.y+P.h+2)/T);let pit=0;for(let k=0;k<5;k++){let any=false;for(let r=r0-2;r<ROWS;r++)if(standable(c0+k,r)){any=true;break}if(!any)pit++;else break}if(pit>=4){G.hinted.double=1;emit('hint',{k:'double'})}}
  if(!P.onGround&&P.vy>2&&A.has('glide')&&!G.hinted.glide&&!standable(Math.floor(cx/T),Math.floor((P.y+P.h+40)/T))&&P.y>4*T){let pit=true;for(let r=Math.floor((P.y+P.h)/T);r<ROWS;r++)if(standable(Math.floor(cx/T),r))pit=false;if(pit){G.hinted.glide=1;emit('hint',{k:'glide'})}}
  if(P.onGround&&!P.ride&&P.inv===0&&G.frame%15===0&&!nearHazard())P.safe={x:P.x,y:P.y};
  if(G.mode==='endless')G.distance=Math.max(G.distance,Math.floor(P.x/T));

  // ловушка
  if(G.trapCd>0)G.trapCd--;
  if(taps.trap&&G.trapDef){
    if(G.trapsLeft>0&&P.onGround&&G.trapCd===0&&G.chase){G.trapsLeft--;G.trapCd=30;G.traps.push({x:P.x-2,y:P.y+P.h-8,w:16,h:8,armed:true,t:0,tier:G.trapTier});emit('trapSet',{x:P.x+6,y:P.y+P.h})}
    else emit('trapNo',{reason:!G.chase?'none':G.trapsLeft<=0?'empty':'air'});
  }
  taps.trap=0;
  if(G.chase)updateChaser(G.chase,P);
  if(G.state!=='play')return;
  // запись для «призрака»
  if(G.frame%2===0&&G.rec.length<40000){const yy=Math.max(0,Math.round(P.y));G.rec.push(Math.round(P.x),P.face>0?yy:-yy-1)}

  // шипы и пропасти
  const l=Math.floor((P.x+2)/T),r=Math.floor((P.x+P.w-2)/T),t=Math.floor((P.y+4)/T),b=Math.floor((P.y+P.h-1)/T);
  for(let ty=t;ty<=b;ty++)for(let tx=l;tx<=r;tx++)if(tile(tx,ty)===3&&P.y+P.h>ty*T+7)hurt('spike');
  if(G.state!=='play')return;
  if(P.y>ROWS*T+24){fell();if(G.state!=='play')return}

  // удар лапой: ломает стены, врагов, шары
  if(P.paw>0){
    P.paw--;
    if(P.paw>=4&&P.paw<=10){
      const hb={x:P.face>0?P.x+P.w-2:P.x-16,y:P.y-2,w:18,h:P.h+4};
      breakTiles(hb);
      for(const e of G.enemies)if(e.alive&&overlap(hb,e))killEnemy(e,'smash');
      for(const s of G.shots)if(!s.dead&&overlap(hb,{x:s.x-4,y:s.y-4,w:8,h:8})){s.dead=true;emit('parry',{x:s.x,y:s.y});addScore(20,s.x,s.y,'#9ff')}
      if(G.boss)bossStrike(hb,'paw');
    }
  }
  if(P.dash>0){
    const hb={x:P.x-2,y:P.y,w:P.w+4,h:P.h};
    for(const e of G.enemies)if(e.alive&&overlap(hb,e))killEnemy(e,'smash');
    if(G.boss)bossStrike(hb,'dash');
  }

  // платформы-черепица
  for(const f of G.falls){
    if(f.st==='idle'&&P.ride===f){f.st='shake';f.t=0;emit('crack',{x:f.x+8,y:f.y})}
    if(f.st==='shake'&&++f.t>28){f.st='fall';f.vy=0}
    if(f.st==='fall'){f.vy=Math.min(6,f.vy+.3);f.y+=f.vy;if(f.y>ROWS*T+40){f.st='gone';f.t=0}}
    if(f.st==='gone'&&++f.t>200){if(!(P.x+P.w>f.x&&P.x<f.x+f.w&&Math.abs(P.y+P.h-f.y0)<20)){f.st='idle';f.y=f.y0;f.vy=0}}
  }
  // пружины
  for(const s of G.springs){
    if(s.t>0)s.t--;
    if(P.vy>=0&&overlap(P,s)&&P.y+P.h-P.vy<=s.y+8){P.vy=-s.power;P.y=s.y-P.h;P.springT=26;P.airJumps=1;P.canDash=true;P.onGround=false;s.t=14;G.combo=Math.max(G.combo,0);emit('spring',{x:s.x+6,y:s.y})}
  }
  // фонари-чекпоинты
  for(const c of G.checks){
    if(!c.on&&overlap(P,c)){c.on=true;P.check={x:c.x-1,y:c.y+30-P.h};P.safe={...P.check};if(A.has('shield'))P.shield=true;emit('checkpoint',{x:c.x+5,y:c.y})}
  }

  // враги
  for(const e of G.enemies){
    if(!e.alive){e.squash++;continue}
    e.t++;if(e.flash>0)e.flash--;
    updateEnemy(e,P);
    if(G.state!=='play')return;
  }
  // вражеские шары
  for(const s of G.shots){
    if(s.dead)continue;
    s.x+=s.vx;s.y+=s.vy;s.life--;
    if(s.wave){s.y=s.gy}
    if(s.life<=0||(!s.wave&&solidWall(Math.floor(s.x/T),Math.floor(s.y/T)))){s.dead=true;emit('poof',{x:s.x,y:s.y});continue}
    if(s.x<0||s.x>G.L.w*T){s.dead=true;continue}
    if(overlap(P,{x:s.x-3,y:s.y-(s.wave?6:3),w:6,h:s.wave?8:6})){
      if(P.dash>0&&!s.wave){s.dead=true;emit('parry',{x:s.x,y:s.y})}
      else{hurt('shot');s.dead=!s.wave}
      if(G.state!=='play')return;
    }
  }
  if(G.frame%60===0)G.shots=G.shots.filter(s=>!s.dead);
  // сталактиты
  for(const d of G.drips){
    if(d.st==='hang'){if(Math.abs(cx-(d.x+4))<22&&P.y>d.y){d.st='shake';d.t=0;emit('dripShake',{x:d.x+4,y:d.y})}}
    else if(d.st==='shake'){if(++d.t>22){d.st='fall';d.vy=0}}
    else if(d.st==='fall'){d.vy=Math.min(7,d.vy+.4);d.y+=d.vy;
      if(overlap(P,d)){hurt('drip');d.st='gone';d.t=0;emit('dripBreak',{x:d.x+4,y:d.y+12});if(G.state!=='play')return}
      else if(solidWall(Math.floor((d.x+4)/T),Math.floor((d.y+d.h)/T))||standable(Math.floor((d.x+4)/T),Math.floor((d.y+d.h)/T))||d.y>ROWS*T){d.st='gone';d.t=0;emit('dripBreak',{x:d.x+4,y:d.y+d.h})}}
    else if(d.st==='gone'&&++d.t>360&&Math.abs(cx-(d.x+4))>60){d.st='hang';d.y=d.y0}
  }
  // гейзеры огня теней
  for(const g of G.geysers){
    const ph=(G.frame+g.phase)%210;g.warn=ph>=120&&ph<150;const was=g.on;g.on=ph>=150;
    if(g.on&&!was)emit('geyser',{x:g.x+6,y:g.y+64});
    if(g.on&&overlap(P,{x:g.x,y:g.y,w:g.w,h:g.h})){hurt('fire');if(G.state!=='play')return}
  }
  // слизь
  {const tx=Math.floor(cx/T),ty=Math.floor((P.y+P.h-2)/T);P.slimed=P.onGround&&tile(tx,ty)===6;}
  if(G.boss){updateBoss(G.boss,P);if(G.state!=='play')return}

  // звёзды, сердца, рыбки
  const mag=A.has('magnet');
  for(const s of G.stars){
    if(s.got)continue;
    const dx=cx-s.x,dy=cy-s.y;
    if(mag&&dx*dx+dy*dy<52*52){s.x+=dx*.18;s.y+=dy*.18}
    if(Math.abs(dx)<10&&Math.abs(dy)<11){
      s.got=true;G.starsGot++;
      G.starChain=G.frame-G.lastStar<45?G.starChain+1:0;G.lastStar=G.frame;
      G.score+=10;emit('star',{x:s.x,y:s.y,chain:G.starChain});
    }
  }
  for(const h of G.hearts){if(!h.got&&Math.abs(cx-h.x)<10&&Math.abs(cy-h.y)<11){h.got=true;G.lives=Math.min(G.maxLives+1,G.lives+1);addScore(25,h.x,h.y-8,'#ff8fb0');emit('heart',{x:h.x,y:h.y})}}
  for(const f of G.fish){
    if(f.got)continue;
    const dx=cx-f.x,dy=cy-f.y;
    if(!f.told&&f.gate&&!A.has(f.gate)&&Math.abs(dx)<6*T){f.told=true;emit('fishLocked',{gate:f.gate})}
    if(mag&&dx*dx+dy*dy<52*52){f.x+=dx*.12;f.y+=dy*.12}
    if(Math.abs(dx)<11&&Math.abs(dy)<12){f.got=true;addScore(500,f.x,f.y-8,'#ffe58a');emit('fish',{x:f.x,y:f.y})}
  }
  // вещи для спасения
  for(const it of G.items){
    if(it.got)continue;const dx=cx-it.x,dy=cy-it.y;
    if(mag&&dx*dx+dy*dy<52*52){it.x+=dx*.12;it.y+=dy*.12}
    if(Math.abs(dx)<11&&Math.abs(dy)<12){it.got=true;
      if(it.type==='kit'){G.trapsLeft++;emit('kit',{x:it.x,y:it.y})}
      else{G.have[it.type]++;emit('item',{x:it.x,y:it.y,type:it.type,have:G.have[it.type],need:G.need[it.type]||0})}
      addScore(150,it.x,it.y-8,'#ffe08a')}
  }
  // клетка с другом: открывается, только когда собраны все вещи
  if(G.cage&&!G.cage.open&&overlap(P,G.cage)&&!K.cageReady()){
    if(!G.cage.msgT||G.frame-G.cage.msgT>150){G.cage.msgT=G.frame;emit('cageLocked',{missing:K.cageMissing()})}
  }
  else if(G.cage&&!G.cage.open&&overlap(P,G.cage)){
    G.cage.open=true;const fr=K.FRIEND[G.cage.friend];G.abil.add(fr.abil);
    if(fr.abil==='heart'){G.maxLives++;G.lives++}
    if(fr.abil==='shield')P.shield=true;
    G.friendFollow=fr.id;addScore(300,G.cage.x+12,G.cage.y,'#ffd85a');
    emit('rescue',{friend:fr.id,x:G.cage.x+12,y:G.cage.y+10});
    G.state='rescue';return;
  }
  // дверь
  for(const t of G.tips)if(!t.shown&&cx>=t.x){t.shown=true;emit('tip',{title:t.title,text:t.text})}
  if(G.goal&&overlap(P,G.goal)&&!(G.cage&&!G.cage.open)){
    if(!G.cage&&!K.cageReady()){if(G.frame-G.doorMsgT>150){G.doorMsgT=G.frame;emit('doorLocked',{missing:K.cageMissing()})}}
    else{G.state='won';emit('win');return}
  }
};
function nearHazard(){
  const P=G.P,tx=Math.floor((P.x+6)/T),ty=Math.floor((P.y+P.h+1)/T);
  for(let d=-1;d<=1;d++){if(!standable(tx+d,ty)||tile(tx+d,ty-1)===3)return true}
  return false;
}
function breakTiles(hb){
  const x0=Math.floor(hb.x/T),x1=Math.floor((hb.x+hb.w)/T),y0=Math.floor(hb.y/T),y1=Math.floor((hb.y+hb.h)/T);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(ty>=0&&ty<ROWS&&tx>=0&&tx<G.L.w&&G.g[ty][tx]===4){G.g[ty][tx]=0;G.broken.push([tx,ty]);emit('break',{tx,ty,x:tx*T+8,y:ty*T+8});G.score+=5}
  }
}

/* ---------- вещи и клетка ---------- */
K.cageMissing=function(){const m={};for(const k in G.need){const d=G.need[k]-(G.have[k]||0);if(d>0)m[k]=d}return m};
K.cageReady=function(){return Object.keys(K.cageMissing()).length===0};

/* ---------- преследователь: бежит точно по следу кота ---------- */
function updateChaser(C,P){
  const tr=C.trail,last=tr[tr.length-1];
  if(Math.abs(P.x-last[0])+Math.abs(P.y-last[1])>.8)tr.push([P.x,P.y]);
  if(!C.on){
    const trig=G.L.dogAt!==undefined?P.x>=G.L.dogAt:G.frame>=48;
    if(!C.wake&&trig){C.wake=true;C.wakeF=G.frame;emit('chaserWake',{x:C.kennel.x+6,y:C.kennel.y})}
    if(C.wake&&G.frame>=C.wakeF+90){C.on=true;C.idx=0;C.stun=30;emit('chaserStart',{name:K.CHASERS[C.look].name,x:C.kennel.x+6,y:C.kennel.y})}else return}
  if(C.stun>0){C.stun--;if(C.stun===0)emit('chaserFree',{x:C.x,y:C.y})}
  else{
    let sp=C.speed;
    if(C.lunge){if(--C.lungeT<=0){if(C.warn===0){C.warn=45;emit('chaserHowl',{x:C.x,y:C.y})}}
      if(C.warn>0&&--C.warn===0){C.boost=34;C.lungeT=C.lunge}}
    if(C.boost>0){C.boost--;sp*=2.3}
    // пёс не отстаёт: если след слишком длинный, он мчится вдогонку и держится рядом
    const gap=tr.length-1-C.idx,far=C.easy?120:75;if(gap>far)sp=Math.max(sp,(C.easy?1.1:1.25)+Math.min(1.4,(gap-far)/60));
    C.idx=Math.min(tr.length-1,C.idx+sp);
  }
  const i=Math.floor(C.idx),p=tr[i],q=tr[Math.min(tr.length-1,i+1)],f=C.idx-i;
  const nx=p[0]+(q[0]-p[0])*f,ny=p[1]+(q[1]-p[1])*f;
  if(Math.abs(nx-C.x)>.05)C.face=nx>C.x?1:-1;C.x=nx;C.y=ny;
  C.gap=tr.length-1-C.idx;
  // ловушки
  for(const t of G.traps){
    if(!t.armed)continue;
    if(C.stun===0&&Math.abs((C.x+6)-(t.x+8))<12&&Math.abs((C.y+P.h)-(t.y+8))<14){
      t.armed=false;const d=K.TRAPS[t.tier];C.stun=d.stun;C.idx=Math.max(0,C.idx-d.back);C.boost=0;C.warn=0;C.trapped++;
      G.score+=150;emit('trapSnap',{x:t.x+8,y:t.y,tier:t.tier});emit('pop',{x:t.x+8,y:t.y-10,text:'Попался! +150',col:'#7ff7c8',big:true});
    }
    for(const e of G.enemies)if(e.alive&&t.armed&&e.type!=='bat'&&overlap(e,t)){t.armed=false;killEnemy(e,'smash')}
  }
  // укус
  if(C.stun===0&&C.on&&Math.abs(C.x-P.x)<12&&Math.abs(C.y-P.y)<14){
    if(P.dash>0){C.stun=60;C.idx=Math.max(0,C.idx-60);emit('chaserBonk',{x:C.x+6,y:C.y})}
    else if(P.inv===0&&!(G.state!=='play')){C.bites++;emit('chaserBite',{x:P.x+6,y:P.y+7});if(C.easy){P.inv=90;P.vy=-4;P.vx=P.face*2.5;C.idx=Math.max(0,C.idx-150);C.stun=200}else{hurt('chaser');C.idx=Math.max(0,C.idx-90);C.stun=45}}
  }
}

/* ---------- враги ---------- */
function updateEnemy(e,P){
  const dxp=(P.x+6)-(e.x+e.w/2),dyp=(P.y+7)-(e.y+e.h/2);
  if(e.type==='bat'){
    if(e.mode==='hang'){if(Math.abs(dxp)<7*T&&Math.abs(dyp)<7*T){e.mode='fly';emit('batWake',{x:e.x,y:e.y})}}
    else{
      e.vx+=Math.sign(dxp)*.035;e.vx=Math.max(-1.3,Math.min(1.3,e.vx));
      const ty=P.y-6+Math.sin(e.t/14)*18;e.vy+=(ty-e.y)*.004;e.vy=Math.max(-1,Math.min(1,e.vy))*.98;
      e.x+=e.vx;e.y+=e.vy;
    }
  }else{
    e.vy=Math.min(7,e.vy+.35);
    if(e.type==='shooter'){
      e.face=dxp>0?1:-1;
      if(Math.abs(dxp)<11*T&&Math.abs(dyp)<6*T){
        if(--e.cd<=0){
          const d=Math.hypot(dxp,dyp)||1,sp=1.7;
          G.shots.push({x:e.x+e.w/2,y:e.y+4,vx:dxp/d*sp,vy:dyp/d*sp,life:260});
          e.cd=130;emit('shoot',{x:e.x+e.w/2,y:e.y+4});
        }
      }else e.cd=Math.max(e.cd,40);
      e.vx=0;moveY(e);
    }else{
      if(e.type==='hopper'&&e.onGround&&--e.cd<=0){e.vy=-5.2;e.cd=70+(Math.random()*50|0);if(Math.abs(dxp)<6*T)e.vx=Math.sign(dxp)*Math.abs(EN.hopper.sp)*1.6;emit('hop',{x:e.x+6,y:e.y+e.h})}
      const v=e.vx;if(moveX(e))e.vx=-v;
      moveY(e);
      if(e.onGround){
        if(e.type==='hopper')e.vx=Math.sign(e.vx||-1)*EN.hopper.sp;
        const ahead=e.vx>0?Math.floor((e.x+e.w+1)/T):Math.floor((e.x-1)/T);
        if(!standable(ahead,Math.floor((e.y+e.h+1)/T))||tile(ahead,Math.floor((e.y+6)/T))===3)e.vx=-e.vx;
      }
      if(e.vx===0)e.vx=EN[e.type].sp;
    }
    if(e.y>ROWS*T+40)e.alive=false;
  }
  if(overlap(P,e)){
    if(P.dash>0)return killEnemy(e,'smash');
    const stomp=P.vy>0&&P.y+P.h-P.vy<=e.y+6;
    if(stomp&&e.type!=='armored'){killEnemy(e,'stomp');stompBounce(P)}
    else if(stomp&&e.type==='armored'){P.vy=-5;P.y=e.y-P.h;e.flash=10;emit('clank',{x:e.x+e.w/2,y:e.y});if(P.inv===0)hurt('armor')}
    else hurt('enemy');
  }
}

/* ---------- боссы ---------- */
function makeBoss(B){
  const king=B.type==='king';
  const hp=king?6:B.type==='general2'?5:3;
  const w=king?34:28,h=king?34:30;
  return {type:B.type,king,x:B.col*T,y:king?3*T:11*T-h,w,h,vx:0,vy:0,hp,maxHp:hp,st:'intro',t:0,face:-1,inv:0,armor:false,onGround:false,
    minions:0,fired:0,tx:0,ty:0,phase:1,dead:false};
}
function bossVulnerable(B,how){
  if(B.inv>0||B.st==='intro'||B.st==='dying')return false;
  if(B.king)return (B.st==='dazed'||B.st==='swoop')&&(how!=='stomp'||!B.armor);
  if(B.armor)return how!=='stomp';
  return B.st==='tired';
}
function hitBoss(B,how){
  if(B.armor&&how!=='stomp'&&!B.king){B.armor=false;B.inv=20;B.st=B.king?B.st:'tired';B.t=0;G.hitstop=8;emit('armorBreak',{x:B.x+B.w/2,y:B.y});return}
  B.hp--;B.inv=70;G.hitstop=10;G.score+=1000;
  emit('bossHit',{x:B.x+B.w/2,y:B.y,hp:B.hp,max:B.maxHp});
  emit('pop',{x:B.x+B.w/2,y:B.y-6,text:'+1000',col:'#ffd85a',big:true});
  if(B.hp<=0){B.st='dying';B.t=0;G.shots.length=0;G.enemies.forEach(e=>{if(e.alive){e.alive=false}});emit('bossDying',{x:B.x+B.w/2,y:B.y+B.h/2});return}
  if(B.type==='general2'&&B.hp%2===1){B.st='armor';B.t=0}
  else if(B.king){B.st='rise';B.t=0}
  else{B.st='hurt';B.t=0;B.vx=-B.face*2.5;B.vy=-4}
  if(B.king)B.phase=B.hp<=2?3:B.hp<=4?2:1;
}
function bossStrike(hb,how){
  const B=G.boss;if(!B||B.dead||!overlap(hb,B))return;
  if(bossVulnerable(B,how))hitBoss(B,how);
}
function bossShoot(B,P,n,spread,sp){
  const cx=B.x+B.w/2,cy=B.y+B.h*.35,a0=Math.atan2(P.y+7-cy,P.x+6-cx);
  for(let i=0;i<n;i++){const a=a0+(i-(n-1)/2)*spread;G.shots.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:300})}
  emit('shoot',{x:cx,y:cy,big:true});
}
function wave(B,dir){G.shots.push({x:B.x+B.w/2+dir*14,y:11*T-5,gy:11*T-5,vx:dir*2.3,vy:0,life:150,wave:true})}
function summon(type){
  const alive=G.enemies.filter(e=>e.alive).length;if(alive>=3)return;
  const W=G.L.w;const col=Math.random()<.5?4:W-5;
  const e=spawnEnemy(type==='bat'?{type,col,row:3}:{type,col,top:11});G.enemies.push(e);emit('summon',{x:e.x,y:e.y});
}
function updateBoss(B,P){
  B.t++;if(B.inv>0)B.inv--;
  const cx=B.x+B.w/2,pcx=P.x+6,W=G.L.w*T;
  B.face=pcx<cx?-1:1;
  if(B.st==='dying'){B.vy=B.king?-.2:0;B.y+=B.vy;if(B.t%8===0)emit('bossBoom',{x:B.x+Math.random()*B.w,y:B.y+Math.random()*B.h});
    if(B.t>110&&!B.dead){B.dead=true;emit('bossDown',{x:cx,y:B.y,king:B.king});G.goal={x:Math.floor(G.L.w/2)*T,y:11*T-32,w:T,h:32};emit('goalAppear',{x:G.goal.x+8,y:G.goal.y})}
    return}
  if(B.dead)return;
  if(B.king)kingAI(B,P,W);else generalAI(B,P,W);
  if(B.st!==B._ps){if(B.st==='tired'||B.st==='dazed')emit('bossTired',{king:B.king,armor:B.armor});B._ps=B.st}
  // контакт с котом
  if(overlap(P,B)&&B.st!=='intro'){
    const stomp=P.vy>0&&P.y+P.h-P.vy<=B.y+10;
    if(P.dash>0){if(bossVulnerable(B,'dash'))hitBoss(B,'dash');P.vx=-P.face*3;P.dash=0;P.vy=-4}
    else if(stomp){
      if(bossVulnerable(B,'stomp')){hitBoss(B,'stomp');P.vy=-7.5;P.springT=20;P.airJumps=1;P.canDash=true}
      else if(B.armor){P.vy=-6;emit('clank',{x:cx,y:B.y});hurt('armor')}
      else{P.vy=-6;if(!B.nopeT||G.frame-B.nopeT>120){B.nopeT=G.frame;emit('bossNope',{king:B.king})}}
    }else if(B.inv<50&&B.st!=='dazed'&&B.st!=='tired')hurt('boss');
  }
}
function generalAI(B,P,W){
  const g2=B.type==='general2',rage=B.hp<=Math.ceil(B.maxHp/2);
  const sp=(g2?1:.8)*(rage?1.35:1);
  const ground=()=>{B.vy=Math.min(8,B.vy+.38);B.y+=B.vy;B.x+=B.vx;
    if(B.y+B.h>=11*T){if(!B.onGround&&B.vy>3){emit('quake',{x:B.x+B.w/2,y:11*T});if(B.st==='leap'){wave(B,-1);wave(B,1)}}B.y=11*T-B.h;B.vy=0;B.onGround=true}else B.onGround=false;
    B.x=Math.max(2*T,Math.min(W-2*T-B.w,B.x))};
  switch(B.st){
    case 'intro':ground();if(B.t===1)emit('bossIntro',{name:g2?'Генерал теней II':'Генерал теней'});if(B.t>90){B.st='walk';B.t=0}break;
    case 'walk':B.vx=B.face*sp;ground();if(B.t>(rage?60:90)){B.st=Math.random()<.5?'leap':'shoot';B.t=0;B.fired=0;if(g2&&Math.random()<.35)B.st='summon'}break;
    case 'leap':if(B.t===1){B.vy=-7.6;B.vx=Math.max(-3.2,Math.min(3.2,((P.x+6)-(B.x+B.w/2))/42));B.onGround=false;emit('bossJump',{x:B.x+B.w/2,y:B.y+B.h})}
      ground();if(B.onGround&&B.t>5){B.vx=0;B.st=B.fired++>=(rage?1:0)?'tired':'leap';B.t=0}break;
    case 'shoot':B.vx=0;ground();if(B.t%24===12&&B.fired<(rage?3:2)){bossShoot(B,P,g2?5:3,.32,1.9);B.fired++}if(B.t>90){B.st='tired';B.t=0}break;
    case 'summon':B.vx=0;ground();if(B.t===30){summon('hopper');summon(g2?'bat':'walker')}if(B.t>70){B.st='walk';B.t=0}break;
    case 'tired':B.vx*=.8;ground();if(B.t>(rage?110:160)){B.st='walk';B.t=0}break;
    case 'hurt':ground();B.vx*=.95;if(B.t>50){B.st='walk';B.t=0}break;
    case 'armor':B.vx=0;ground();if(B.t===20){B.armor=true;emit('armorOn',{x:B.x+B.w/2,y:B.y})}if(B.t>50){B.st='walk';B.t=0}break;
  }
}
function kingAI(B,P,W){
  const ph=B.phase,sp=ph===3?1.5:ph===2?1.2:1;
  B.armor=ph===2;
  const hoverY=2.5*T+Math.sin(G.frame/30)*10;
  const floatTo=(tx,ty,k)=>{B.x+=(tx-B.x)*k;B.y+=(ty-B.y)*k};
  switch(B.st){
    case 'intro':if(B.t===1)emit('bossIntro',{name:'Король Теней'});floatTo(W/2-B.w/2,hoverY,.03);if(B.t>110){B.st='hover';B.t=0}break;
    case 'hover':{
      const tx=W/2-B.w/2+Math.sin(G.frame/(70/sp))*(W/2-5*T);floatTo(tx,hoverY,.05);
      if(B.t>(ph===3?85:130)){B.t=0;const r=Math.random();B.st=r<.38?'rain':r<.62&&ph<3?'bats':r<.8&&ph===3?'quake':'swoop';if(B.st==='swoop'){B.tx=P.x+6-B.w/2;B.ty=11*T-B.h}}
      break}
    case 'rain':floatTo(B.x,hoverY,.05);if(B.t%(ph===3?10:16)===0&&B.t<90){const x=3*T+Math.random()*(W-6*T);G.shots.push({x,y:-4,vx:0,vy:1.6+ph*.3,life:240,rain:true});if(B.t%32===0)emit('shoot',{x,y:0})}if(B.t>110){B.st=Math.random()<.5?'swoop':'hover';B.t=0;B.tx=P.x+6-B.w/2;B.ty=11*T-B.h}break;
    case 'bats':floatTo(B.x,hoverY,.05);if(B.t===20){summon('bat');summon(ph===2?'armored':'hopper')}if(B.t>60){B.st='swoop';B.t=0;B.tx=P.x+6-B.w/2;B.ty=11*T-B.h}break;
    case 'quake':floatTo(B.x,hoverY,.05);if(B.t===30||B.t===70){wave(B,-1);wave(B,1);emit('quake',{x:B.x+B.w/2,y:11*T})}if(B.t===50)bossShoot(B,P,5,.35,2);if(B.t>100){B.st='swoop';B.t=0;B.tx=P.x+6-B.w/2;B.ty=11*T-B.h}break;
    case 'swoop':if(B.t===1)emit('swoop',{x:B.x+B.w/2,y:B.y});floatTo(Math.max(2*T,Math.min(W-2*T-B.w,B.tx)),B.ty,.06*sp);if(B.t>50){B.st='dazed';B.t=0;emit('quake',{x:B.x+B.w/2,y:11*T})}break;
    case 'dazed':if(B.t>(ph===3?70:100)){B.st='rise';B.t=0}break;
    case 'rise':floatTo(B.x,hoverY,.04);if(B.t>50){B.st='hover';B.t=0}break;
  }
}

K.ghostEncode=function(rec){const a=new Int16Array(rec);let s='';const u=new Uint8Array(a.buffer);for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)};
K.ghostDecode=function(b64){try{const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Int16Array(u.buffer)}catch(e){return null}};
})(window.KOT=window.KOT||{});
