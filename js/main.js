/* Кот на крышах — сохранения, ход игры, ввод, цикл, PWA и Telegram. */
(function(K){
'use strict';
const $=id=>document.getElementById(id);
const UI=K.ui,R=K.render,A=K.audio,G=K.G;
const app=K.app={};
const ALL=K.FRIENDS.map(f=>f.abil);

/* ---------- сохранение ---------- */
const SAVE_KEY='kot-save-v2';
function defaults(){return {wallet:0,levels:{},friends:[],owned:[],skin:{color:'ginger',hat:'none',tail:'normal'},daily:{},endless:{dist:0,score:0},ghosts:{},seenIntro:false,king:false}}
let S;
try{S=Object.assign(defaults(),JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){S=defaults()}
app.save=S;
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S))}catch(e){
  // при переполнении хранилища выкидываем призраков
  try{S.ghosts={};localStorage.setItem(SAVE_KEY,JSON.stringify(S))}catch(e2){}}}
app.persist=persist;
app.unlocked=id=>{const i=K.LEVEL[id].index;return i===0||!!S.levels[K.LEVELS[i-1].id]};
const parCache={};app.parOf=id=>parCache[id]||(parCache[id]=K.buildLevel(K.LEVEL[id]).par);
const owned=(cat,id)=>{const it=K.SKINS[cat].find(i=>i.id===id);return it&&(!it.price&&!it.unlock||S.owned.includes(cat+':'+id))};

/* ---------- текущий забег ---------- */
let cur=null,pendingEnding=false;
app.currentPar=()=>cur&&G.L?G.L.par:0;
function abilities(){return S.friends.map(id=>K.FRIEND[id].abil)}
function bestTrap(){const story=K.LEVELS.filter(l=>!l.boss);let t=0;story.forEach((l,i)=>{if(S.levels[l.id])t=i});return t}
function enterLevel(L,theme,music,opts){
  K.startLevel(L,opts);
  R.setTheme(theme);R.clearHub();R.buildLevel(G,{ghost:opts.ghost,followers:L.arena?[]:S.friends.slice(-3)});
  A.play(music);A.setIntensity(0);
  UI.hide();UI.hudShow(true);UI.bossBar(null);
  K.input.left=K.input.right=K.input.jump=false;
  if(L.def&&!L.def.boss)UI.banner(L.def.name,L.def.news);
  app.platformGameplay(true);
}
app.play=function(id,mode='story'){
  const def=K.LEVEL[id];cur={id,mode};
  const L=K.buildLevel(def);
  const skipCage=def.friend&&S.friends.includes(def.friend);
  const ghost=mode==='time'&&S.ghosts[id]?K.ghostDecode(S.ghosts[id]):null;
  const th=K.WORLDS[def.world].theme;
  const story=K.LEVELS.filter(l=>!l.boss),tier=story.indexOf(def);
  const chase=def.boss?null:{tier,look:def.world,speed:1.04+tier*.015,lunge:def.world>=1?Math.max(300,620-tier*35):0};
  enterLevel(L,th,def.boss?(def.boss==='king'?'king':'boss'):th.music,{mode,abil:abilities(),skipCage,ghost,chase,trapTier:def.boss?-1:tier});
  if(mode==='time')UI.toast(ghost?'Обгоните своего призрака!':'Первый забег на время — призрак появится в следующий раз');
};
app.playDaily=function(){
  cur={id:'daily',mode:'daily'};const seed=K.dailySeed();
  const L=K.buildProcedural(seed,18,false);const th=K.WORLDS[seed%3].theme;
  enterLevel(L,th,th.music,{mode:'daily',abil:ALL,chase:{tier:4,look:seed%3,speed:1.1,lunge:520},trapTier:Math.max(0,bestTrap())});UI.banner('Испытание дня',K.dailyKey().split('-').reverse().join('.'));
};
app.playEndless=function(){
  cur={id:'endless',mode:'endless'};const seed=(Math.random()*1e9)|0;
  const L=K.buildProcedural(seed,70,true);const th=K.WORLDS[seed%3].theme;
  enterLevel(L,th,th.music,{mode:'endless',abil:ALL,chase:{tier:3,look:seed%3,speed:1.08,lunge:560},trapTier:Math.max(0,bestTrap())});UI.banner('Бесконечная ночь','Беги, пока есть сердца');
};
app.toHub=function(t){
  cur=null;app.platformGameplay(false);UI.hudShow(false);
  const L=K.buildHub();K.startLevel(L,{mode:'hub',abil:[]});G.state='idle';
  R.setTheme(K.HUB_THEME);R.setSkin(S.skin);R.buildHub(G,S.friends);
  A.play('hub');UI.hub(t||'map');
};
function withStory(id,go){const key={'1-1':'intro','2-1':'world2','3-1':'world3'}[id];S.seen=S.seen||{};if(key&&!S.seen[key]){S.seen[key]=true;persist();UI.story(key,0,go)}else go()}
function restart(){if(!cur)return;if(cur.mode==='daily')app.playDaily();else if(cur.mode==='endless')app.playEndless();else app.play(cur.id,cur.mode)}
function pause(){if(G.state==='play'&&cur){G.state='pause';UI.pause();app.platformGameplay(false)}else if(G.state==='pause')resume()}
function resume(){if(G.state==='pause'||G.state==='rescue'){G.state='play';UI.hide();K.input.taps.jump=0;app.platformGameplay(true)}}

/* ---------- итоги ---------- */
function finishStory(){
  const id=cur.id,def=K.LEVEL[id],L=G.L,time=G.time/60;
  const rate=[true,def.boss?G.dmg===0:G.starsGot>=G.starsTotal,time<=L.par];
  const prev=S.levels[id]||{stars:[0,0,0],time:0,score:0,fish:false};
  const newRates=rate.filter((r,i)=>r&&!prev.stars[i]).length;
  const fishNew=G.fish.some(f=>f.got)&&!prev.fish;
  const firstClear=!S.levels[id];
  let friend=null;
  if(G.cage&&G.cage.open&&!S.friends.includes(G.cage.friend)){friend=G.cage.friend;S.friends.push(friend)}
  const newBest=!prev.time||time<prev.time;
  if(newBest&&G.rec.length)S.ghosts[id]=K.ghostEncode(G.rec);
  const earned=G.starsGot+newRates*20+(fishNew?50:0)+(def.boss&&firstClear?150:0);
  S.wallet+=earned;
  S.levels[id]={stars:rate.map((r,i)=>r||!!prev.stars[i]),time:newBest?time:prev.time,score:Math.max(prev.score||0,G.score),fish:prev.fish||fishNew};
  if(def.boss==='king'&&!S.king){S.king=true;S.owned.push('color:shadow','hat:crown');pendingEnding=true}
  const fishAll=K.LEVELS.filter(l=>!l.boss).every(l=>S.levels[l.id]&&S.levels[l.id].fish);
  if(fishAll&&!S.owned.includes('color:gold')){S.owned.push('color:gold');UI.toast('Открыт золотой окрас!')}
  persist();
  const nx=K.LEVELS[def.index+1];
  A.play('win');
  UI.results({id,title:def.boss?(def.boss==='king'?'Король повержен!':'Генерал повержен!'):`${def.name}: пройдено`,rate,boss:!!def.boss,par:L.par,time,score:G.score,combo:G.comboBest,earned,got:G.starsGot,all:G.starsTotal,newBest:newBest&&!firstClear,fishNew,friend,next:nx&&cur.mode==='story'?nx.id:null});
}
function finishRun(won){
  const time=G.time/60,mode=cur.mode;let best,newBest=false,earned;
  if(mode==='daily'){
    const key=K.dailyKey(),d=S.daily[key];
    earned=Math.floor(G.starsGot/2)+(won&&!(d&&d.won)?100:0);
    if(!d||G.score>d.score){S.daily[key]={score:G.score,time,won:won||(d&&d.won)};newBest=true}else if(won)d.won=true;
    best=S.daily[key].score;
  }else{
    earned=Math.floor(G.starsGot/2);
    if(G.distance>S.endless.dist){S.endless.dist=G.distance;newBest=true}
    if(G.score>S.endless.score){S.endless.score=G.score;newBest=true}
    best=`${S.endless.dist} м · ${S.endless.score}`;
  }
  S.wallet+=earned;persist();
  UI.hudShow(false);
  UI.runResults({mode,title:won?(mode==='daily'?'Испытание пройдено!':'Вы добежали до конца ночи!'):'Забег окончен',time,score:G.score,dist:mode==='endless'?G.distance:undefined,best,newBest,earned});
}

/* ---------- события ядра ---------- */
function onEvent(e){
  switch(e.t){
    case 'rescue':setTimeout(()=>UI.rescue(e.friend),350);haptic('success');break;
    case 'win':UI.hudShow(false);if(cur.mode==='daily'||cur.mode==='endless')finishRun(true);else finishStory();haptic('success');break;
    case 'dead':setTimeout(()=>{if(G.state!=='dead')return;if(cur.mode==='daily'||cur.mode==='endless'){finishRun(false)}else UI.gameOver(cur.mode)},700);haptic('error');break;
    case 'stomp':case 'smash':haptic('light');break;
    case 'hurt':haptic('heavy');break;
    case 'bossHit':haptic('heavy');A.setIntensity(G.boss.hp<=G.boss.maxHp/2?1:0);break;
    case 'bossDown':A.play('win');break;
  }
}
function drain(){
  const ev=K.events;
  for(let i=0;i<ev.length;i++){const e=ev[i];A.onEvent(e);R.onEvent(e);UI.onEvent(e);onEvent(e)}
  ev.length=0;
}

/* ---------- действия интерфейса ---------- */
app.act=function(a,d){
  switch(a){
    case 'enter':S.seenIntro=true;persist();UI.fadeTo(()=>app.toHub('map'));break;
    case 'title':UI.title();break;
    case 'tab':R.setSkin(S.skin);UI.setTab(d.tab);break;
    case 'level':UI.zoomNode(d.id,()=>UI.levelIntro(d.id));break;
    case 'play':withStory(d.id,()=>UI.fadeTo(()=>app.play(d.id,'story')));break;
    case 'storyNext':UI.storyNext(false);break;
    case 'storySkip':UI.storyNext(true);break;
    case 'time':UI.fadeTo(()=>app.play(d.id,'time'));break;
    case 'hub':if(pendingEnding){pendingEnding=false;UI.fadeTo(()=>{app.toHub();UI.ending()});break}UI.fadeTo(()=>app.toHub());break;
    case 'resume':resume();break;
    case 'restart':UI.fadeTo(restart);break;
    case 'cont':K.continueRun();UI.hide();break;
    case 'shopcat':UI.setShop(d.cat,null);break;
    case 'shopsel':{const c=UI.shopState().cat;R.setSkin({...S.skin,[c]:d.id});UI.setShop(c,d.id);break}
    case 'equip':{const c=UI.shopState().cat;if(owned(c,d.id)){S.skin[c]=d.id;persist();R.setSkin(S.skin);UI.setShop(c,d.id)}break}
    case 'buy':{const c=UI.shopState().cat,it=K.SKINS[c].find(i=>i.id===d.id);
      if(it&&it.price&&S.wallet>=it.price&&!owned(c,it.id)){S.wallet-=it.price;S.owned.push(c+':'+it.id);S.skin[c]=it.id;persist();A.sfxPlay('buy');R.setSkin(S.skin);UI.setShop(c,it.id);UI.toast(`Куплено: ${it.name}`)}
      else A.sfxPlay('deny');break}
    case 'music':A.toggleMusic();if(G.state==='pause')UI.pause();else UI.hub();break;
    case 'sfx':A.toggleSfx();if(G.state==='pause')UI.pause();else UI.hub();break;
    case 'daily':UI.fadeTo(()=>app.playDaily());break;
    case 'endless':UI.fadeTo(()=>app.playEndless());break;
    case 'share':share(d.what);break;
    case 'install':install();break;
    case 'reset':UI.confirm('Весь прогресс, звёзды и скины будут удалены.','doReset');break;
    case 'doReset':Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,defaults());persist();app.toHub('map');break;
  }
};

/* ---------- поделиться ---------- */
const gameUrl=()=>location.href.split('#')[0].split('?')[0];
function share(what){
  let text;
  if(what==='daily'){const d=S.daily[K.dailyKey()];text=`🐈 Кот на крышах · испытание ${K.dailyKey().split('-').reverse().join('.')}\n★ ${d?d.score:0} очков за ${UI.fmtT(d?d.time:0)}. Сможешь лучше?`}
  else if(what==='endless')text=`🐈 Я убежал на ${S.endless.dist} м в «Бесконечной ночи» и набрал ${S.endless.score} очков. Попробуй обогнать!`;
  else text='🐈 Ночной платформер «Кот на крышах»: спаси друзей кота и победи Короля Теней!';
  const url=gameUrl();
  if(tg&&tg.openTelegramLink){tg.openTelegramLink('https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(text));return}
  if(navigator.share){navigator.share({title:'Кот на крышах',text,url}).catch(()=>{});return}
  const full=text+'\n'+url;
  (navigator.clipboard?navigator.clipboard.writeText(full):Promise.reject()).then(()=>UI.toast('Скопировано — отправьте другу'),()=>UI.toast(full));
}

/* ---------- PWA ---------- */
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
app.canInstall=()=>!!installEvt;
function install(){if(!installEvt)return;installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;if(!cur)UI.hub()})}
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

/* ---------- Telegram Mini App ---------- */
let tg=null;
function setupTelegram(){
  tg=window.Telegram&&window.Telegram.WebApp;if(!tg||!tg.initData&&!/tgWebApp/.test(location.hash))return tg=null;
  try{tg.ready();tg.expand();tg.disableVerticalSwipes&&tg.disableVerticalSwipes();tg.setHeaderColor&&tg.setHeaderColor('#120e2b');tg.setBackgroundColor&&tg.setBackgroundColor('#120e2b')}catch(e){}
}
if(/tgWebApp/.test(location.hash)||/tgWebApp/.test(location.search)){const s=document.createElement('script');s.src='https://telegram.org/js/telegram-web-app.js';s.onload=setupTelegram;document.head.appendChild(s)}
function haptic(kind){
  try{
    if(tg&&tg.HapticFeedback){if(kind==='success'||kind==='error')tg.HapticFeedback.notificationOccurred(kind);else tg.HapticFeedback.impactOccurred(kind)}
    else if(navigator.vibrate&&matchMedia('(pointer:coarse)').matches)navigator.vibrate(kind==='heavy'?40:kind==='light'?12:kind==='error'?[30,40,30]:20);
  }catch(e){}
}

/* ---------- Яндекс Игры: SDK подключается, только когда игра открыта на их площадке ---------- */
let ysdk=null;
app.platformGameplay=function(on){try{const g=ysdk&&ysdk.features&&ysdk.features.GameplayAPI;if(g)on?g.start():g.stop()}catch(e){}};
if(/yandex|playhop/.test(location.hostname)||/[?&]yandex/.test(location.search)){
  const s=document.createElement('script');s.src='/sdk.js';
  s.onload=()=>{window.YaGames&&YaGames.init().then(sdk=>{ysdk=sdk;try{sdk.features.LoadingAPI&&sdk.features.LoadingAPI.ready()}catch(e){}}).catch(()=>{})};
  document.head.appendChild(s);
}

/* ---------- ввод ---------- */
const inp=K.input;
const KEYS={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',KeyZ:'jump',
  ShiftLeft:'dash',ShiftRight:'dash',KeyJ:'dash',KeyX:'paw',KeyK:'paw',KeyC:'trap',KeyE:'trap',KeyL:'trap'};
addEventListener('keydown',e=>{
  A.unlock();
  if(e.code==='KeyM'){A.toggleMusic();UI.toast(A.music?'Музыка включена':'Музыка выключена');return}
  if(e.code==='KeyP'||e.code==='Escape'){if(cur&&(G.state==='play'||G.state==='pause')){pause();e.preventDefault()}return}
  if(e.code==='KeyR'&&cur&&G.state==='play'){restart();return}
  const k=KEYS[e.code];if(!k)return;
  if(G.state!=='play'||UI.visible())return;
  e.preventDefault();
  if(!e.repeat&&!inp[k])inp.taps[k]=1;
  inp[k]=true;
});
addEventListener('keyup',e=>{const k=KEYS[e.code];if(k)inp[k]=false});
addEventListener('blur',()=>{inp.left=inp.right=inp.jump=inp.dash=inp.paw=inp.trap=false});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play'&&cur)pause()});
addEventListener('pointerdown',()=>A.unlock(),{capture:true});
[['tL','left'],['tR','right'],['tJ','jump'],['tDash','dash'],['tPaw','paw'],['tTrap','trap']].forEach(([id,k])=>{
  const b=$(id);
  const on=e=>{e.preventDefault();A.unlock();if(!inp[k])inp.taps[k]=1;inp[k]=true;b.classList.add('on');try{b.setPointerCapture(e.pointerId)}catch(_){}};
  const off=()=>{inp[k]=false;b.classList.remove('on')};
  b.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,off));
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
$('bPause').addEventListener('click',()=>{A.sfxPlay('click');pause()});
// геймпад
let padPrev={};
function pollPad(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];const gp=pads&&[...pads].find(p=>p&&p.connected);if(!gp)return;
  const bt=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed);const ax=gp.axes[0]||0;
  const st={left:ax<-.35||bt(14),right:ax>.35||bt(15),jump:bt(0),dash:bt(1)||bt(5)||bt(7),paw:bt(2)||bt(4)||bt(6),trap:bt(3),start:bt(9)};
  if(st.start&&!padPrev.start&&cur)pause();
  if(UI.visible()&&st.jump&&!padPrev.jump){const b=document.querySelector('#screen [autofocus], #screen .btn');if(b)b.click()}
  if(G.state==='play'&&!UI.visible())for(const k of ['left','right','jump','dash','paw','trap']){if(st[k]&&!padPrev[k])inp.taps[k]=1;if(st[k]!==padPrev[k])inp[k]=st[k]}
  padPrev=st;
}

/* ---------- цикл ---------- */
let last=performance.now(),acc=0;
function loop(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;
  pollPad();
  if(G.state==='play'){acc+=dt;while(acc>=1/60){K.step();drain();acc-=1/60;if(G.state!=='play'){acc=0;break}}}else acc=0;
  drain();
  if(cur){UI.hud();UI.hudFast()}
  R.frame(dt,now);
  requestAnimationFrame(loop);
}

/* ---------- старт ---------- */
if(!window.THREE){$('screen').innerHTML='<div class="card"><h2>Не загрузилось</h2><p>Не удалось загрузить 3D-движок. Обновите страницу.</p></div>';return}
try{R.init($('c'))}catch(e){$('screen').innerHTML='<div class="card"><h2>Нет 3D</h2><p>Этот браузер не поддерживает WebGL. Попробуйте Chrome, Edge, Safari или Firefox.</p></div>';return}
R.setSkin(S.skin);
app.toHub();UI.title();
requestAnimationFrame(loop);
})(window.KOT=window.KOT||{});
