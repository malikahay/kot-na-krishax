/* Кот на крышах — звук. Всё синтезируется WebAudio прямо в коде: эффекты и ночная музыка. */
(function(K){
'use strict';
const A=K.audio={ready:false,music:true,sfx:true,track:null};
let ctx,master,sfxG,musG,comp,noiseBuf,delay,delayG;
try{const s=JSON.parse(localStorage.getItem('kot-audio')||'{}');if(s.music===false)A.music=false;if(s.sfx===false)A.sfx=false}catch(e){}
function save(){try{localStorage.setItem('kot-audio',JSON.stringify({music:A.music,sfx:A.sfx}))}catch(e){}}

A.unlock=function(){
  if(ctx){if(ctx.state==='suspended')ctx.resume();return}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ctx=new AC();
  comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(ctx.destination);
  master=ctx.createGain();master.gain.value=.9;master.connect(comp);
  sfxG=ctx.createGain();sfxG.gain.value=A.sfx?.55:0;sfxG.connect(master);
  musG=ctx.createGain();musG.gain.value=A.music?.32:0;musG.connect(master);
  delay=ctx.createDelay(1);delay.delayTime.value=.33;delayG=ctx.createGain();delayG.gain.value=.32;
  const dl=ctx.createBiquadFilter();dl.type='lowpass';dl.frequency.value=2400;
  delay.connect(dl);dl.connect(delayG);delayG.connect(delay);delayG.connect(musG);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  A.ready=true;
  setInterval(schedule,25);
  if(A.track)A.play(A.track,true);
};
A.toggleMusic=function(){A.music=!A.music;if(musG)musG.gain.setTargetAtTime(A.music?.32:0,ctx.currentTime,.1);save();return A.music};
A.toggleSfx=function(){A.sfx=!A.sfx;if(sfxG)sfxG.gain.setTargetAtTime(A.sfx?.55:0,ctx.currentTime,.05);save();return A.sfx};

/* ---------- примитивы ---------- */
const now=()=>ctx.currentTime;
function tone(o){
  const t=o.when??now(),dur=o.dur||.15,out=o.out||sfxG;
  const osc=ctx.createOscillator(),g=ctx.createGain();
  osc.type=o.type||'square';osc.frequency.setValueAtTime(o.f,t);
  if(o.f2)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+(o.slide||dur));
  if(o.detune)osc.detune.value=o.detune;
  const v=o.vol??.2,a=o.attack??.004;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  let node=osc;
  if(o.lp){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;f.Q.value=o.q||.7;osc.connect(f);node=f}
  node.connect(g);g.connect(out);if(o.send)g.connect(delay);
  if(o.vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=o.vib;lg.gain.value=o.vibAmt||8;l.connect(lg);lg.connect(osc.frequency);l.start(t);l.stop(t+dur+.05)}
  osc.start(t);osc.stop(t+dur+.05);
}
function noise(o){
  const t=o.when??now(),dur=o.dur||.1,out=o.out||sfxG;
  const s=ctx.createBufferSource();s.buffer=noiseBuf;
  const f=ctx.createBiquadFilter();f.type=o.ft||'lowpass';f.frequency.setValueAtTime(o.f||1200,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+dur);f.Q.value=o.q||.8;
  const g=ctx.createGain();const v=o.vol??.2;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+(o.attack||.003));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(out);s.start(t,Math.random()*.5);s.stop(t+dur+.05);
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
const PENTA=[0,2,4,7,9,12,14,16,19,21,24,26,28];

/* ---------- эффекты ---------- */
const S={
  jump(){tone({type:'square',f:320,f2:620,dur:.11,vol:.09,lp:2600})},
  djump(){tone({type:'square',f:520,f2:1040,dur:.12,vol:.08,lp:3200});tone({type:'sine',f:1560,f2:2100,dur:.18,vol:.06,when:now()+.03})},
  walljump(){tone({type:'square',f:420,f2:760,dur:.09,vol:.08,lp:2400});noise({f:3000,ft:'bandpass',dur:.05,vol:.08})},
  land(e){const v=Math.min(1,(e.v||3)/7);noise({f:500,f2:120,dur:.08+v*.06,vol:.08+v*.14})},
  star(e){const n=PENTA[Math.min(PENTA.length-1,e.chain||0)];tone({type:'triangle',f:mtof(84+n),dur:.16,vol:.13});tone({type:'sine',f:mtof(96+n),dur:.2,vol:.05,when:now()+.03})},
  stomp(e){const c=Math.min(8,e.combo||1);noise({f:900,f2:200,dur:.12,vol:.25});tone({type:'square',f:180+c*40,f2:60,dur:.16,vol:.14,lp:1800});if(c>1)tone({type:'triangle',f:mtof(72+PENTA[c]),dur:.22,vol:.12,when:now()+.04})},
  smash(e){noise({f:1800,f2:300,dur:.14,vol:.25,ft:'bandpass',q:1.5});tone({type:'sawtooth',f:220,f2:70,dur:.15,vol:.12,lp:1500})},
  hurt(){tone({type:'sawtooth',f:440,f2:110,dur:.3,vol:.16,lp:1800});noise({f:600,dur:.15,vol:.12})},
  fall(){tone({type:'triangle',f:700,f2:90,dur:.5,vol:.15,slide:.5})},
  dead(){[67,63,60,55].forEach((m,i)=>tone({type:'triangle',f:mtof(m),dur:.32,vol:.14,when:now()+i*.17}))},
  heart(){[72,76,79,84].forEach((m,i)=>tone({type:'triangle',f:mtof(m),dur:.15,vol:.1,when:now()+i*.06}))},
  fish(){[79,83,86,91,95].forEach((m,i)=>tone({type:'triangle',f:mtof(m),dur:.22,vol:.11,when:now()+i*.07,send:true}))},
  spring(){tone({type:'sine',f:180,f2:880,dur:.32,vol:.2,slide:.25,vib:28,vibAmt:40})},
  dash(){noise({f:400,f2:3000,dur:.22,vol:.2,ft:'bandpass',q:2})},
  paw(){noise({f:2400,f2:500,dur:.09,vol:.16,ft:'bandpass',q:1.2})},
  break(){noise({f:1400,f2:200,dur:.25,vol:.3});tone({type:'square',f:110,f2:50,dur:.18,vol:.1,lp:600})},
  crack(){noise({f:2600,ft:'highpass',dur:.06,vol:.08})},
  clank(){tone({type:'square',f:1300,f2:900,dur:.12,vol:.09});tone({type:'square',f:1950,dur:.08,vol:.05})},
  shoot(e){tone({type:'sawtooth',f:e.big?500:800,f2:e.big?120:200,dur:.18,vol:.07,lp:2200})},
  parry(){tone({type:'triangle',f:1600,f2:2400,dur:.1,vol:.1})},
  poof(){noise({f:800,dur:.06,vol:.04})},
  hop(){tone({type:'sine',f:200,f2:340,dur:.08,vol:.05})},
  batWake(){tone({type:'square',f:1900,f2:2600,dur:.05,vol:.04});tone({type:'square',f:2100,f2:2800,dur:.05,vol:.04,when:now()+.07})},
  checkpoint(){[76,83,88].forEach((m,i)=>tone({type:'sine',f:mtof(m),dur:.35,vol:.1,when:now()+i*.08,send:true}))},
  shieldBreak(){noise({f:4000,ft:'highpass',dur:.2,vol:.15});tone({type:'triangle',f:900,f2:300,dur:.2,vol:.1})},
  rescue(){[60,64,67,72,76,79,84].forEach((m,i)=>tone({type:'square',f:mtof(m),dur:.18,vol:.07,lp:3000,when:now()+i*.08}));tone({type:'triangle',f:mtof(48),dur:.9,vol:.12,when:now()+.56})},
  win(){[72,76,79,84,79,84,88].forEach((m,i)=>tone({type:'triangle',f:mtof(m),dur:.2,vol:.12,when:now()+i*.09,send:true}))},
  rate(e){tone({type:'triangle',f:mtof(76+(e.i||0)*5),dur:.25,vol:.14,send:true});noise({f:5000,ft:'highpass',dur:.08,vol:.05})},
  bossIntro(){tone({type:'sawtooth',f:55,dur:1.2,vol:.18,lp:400,attack:.2});tone({type:'sawtooth',f:58,dur:1.2,vol:.12,lp:400,attack:.2})},
  bossHit(){noise({f:1200,f2:100,dur:.45,vol:.35});tone({type:'square',f:160,f2:40,dur:.4,vol:.18,lp:1000})},
  bossBoom(){noise({f:700,f2:80,dur:.35,vol:.18})},
  bossDown(){[48,55,60,64,67,72].forEach((m,i)=>tone({type:'square',f:mtof(m),dur:.3,vol:.08,lp:2000,when:now()+i*.12}))},
  quake(){noise({f:220,f2:60,dur:.4,vol:.3})},
  bossJump(){tone({type:'sine',f:90,f2:240,dur:.25,vol:.12})},
  swoop(){noise({f:300,f2:2400,dur:.6,vol:.12,ft:'bandpass',q:3})},
  armorOn(){tone({type:'square',f:300,f2:900,dur:.3,vol:.08,lp:2000})},
  armorBreak(){noise({f:3000,f2:500,dur:.3,vol:.25,ft:'bandpass'});tone({type:'square',f:1500,f2:300,dur:.25,vol:.08})},
  summon(){tone({type:'sawtooth',f:200,f2:600,dur:.3,vol:.06,lp:1200})},
  goalAppear(){[84,88,91,96].forEach((m,i)=>tone({type:'sine',f:mtof(m),dur:.4,vol:.1,when:now()+i*.1,send:true}))},
  click(){tone({type:'triangle',f:900,f2:1200,dur:.05,vol:.08})},
  buy(){[84,88,91].forEach((m,i)=>tone({type:'square',f:mtof(m),dur:.1,vol:.07,lp:3000,when:now()+i*.06}));noise({f:6000,ft:'highpass',dur:.15,vol:.05,when:now()+.15})},
  deny(){tone({type:'square',f:200,f2:150,dur:.15,vol:.08,lp:900})},
  item(e){[76,83,88,95].forEach((m,i)=>tone({type:'square',f:mtof(m),dur:.12,vol:.07,lp:3500,when:now()+i*.06}));tone({type:'triangle',f:mtof(100),dur:.4,vol:.06,when:now()+.24,send:true})},
  kit(){[72,79,84].forEach((m,i)=>tone({type:'triangle',f:mtof(m),dur:.12,vol:.1,when:now()+i*.05}))},
  trapSet(){noise({f:1800,ft:'bandpass',dur:.06,vol:.12});tone({type:'square',f:300,f2:180,dur:.08,vol:.08,lp:1500})},
  trapNo(){tone({type:'square',f:180,f2:140,dur:.12,vol:.06,lp:800})},
  trapSnap(){noise({f:3000,f2:400,dur:.18,vol:.3,ft:'bandpass',q:1.5});tone({type:'square',f:900,f2:200,dur:.15,vol:.12});[60,67,72].forEach((m,i)=>tone({type:'triangle',f:mtof(m),dur:.15,vol:.08,when:now()+.1+i*.06}))},
  chaserStart(){bark();bark(.16);howl(.9);A.setIntensity(1);setTimeout(()=>A.setIntensity(0),6000);if(musG)musG.gain.setTargetAtTime(A.music?.32:0,now(),1.5)},
  chaserWake(){growl(1.5);A.setIntensity(1);if(musG&&A.music)musG.gain.setTargetAtTime(.48,now(),.4)},
  chaserHowl(){howl(.6)},
  chaserBite(){bark();bark(.12)},
  chaserBonk(){tone({type:'square',f:500,f2:200,dur:.15,vol:.1});bark()},
  chaserFree(){bark()},
  dripShake(){noise({f:600,dur:.25,vol:.06,ft:'bandpass'})},
  dripBreak(){noise({f:2200,f2:400,dur:.2,vol:.18,ft:'bandpass'});tone({type:'triangle',f:1500,f2:900,dur:.1,vol:.05})},
  geyser(){noise({f:300,f2:1800,dur:.5,vol:.14,ft:'bandpass',q:1.2});tone({type:'sawtooth',f:90,f2:60,dur:.5,vol:.06,lp:500})},
  cageLocked(){tone({type:'square',f:220,dur:.08,vol:.08,lp:900});tone({type:'square',f:200,dur:.12,vol:.08,lp:900,when:now()+.1})},
  comboEnd(e){if(e.n>=3)[0,4,7].forEach((d,i)=>tone({type:'triangle',f:mtof(79+d),dur:.15,vol:.08,when:now()+i*.05}))}
};
A.sfxPlay=function(name,e={}){if(!A.ready||!A.sfx||!S[name])return;try{S[name](e)}catch(err){}};

function howl(len){tone({type:'sawtooth',f:300,f2:520,dur:len,vol:.09,lp:1400,vib:6,vibAmt:18,attack:.08,slide:len*.5,send:true});tone({type:'sawtooth',f:305,f2:510,dur:len,vol:.05,lp:1200,vib:5,vibAmt:14,attack:.1,slide:len*.5})}
function growl(len){const t=now();const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter(),l=ctx.createOscillator(),lg=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(70,t);o.frequency.linearRampToValueAtTime(95,t+len);f.type='lowpass';f.frequency.value=420;l.frequency.value=23;lg.gain.value=18;l.connect(lg);lg.connect(o.frequency);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.3);g.gain.setValueAtTime(.22,t+len-.2);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(f);f.connect(g);g.connect(sfxG);o.start(t);l.start(t);o.stop(t+len+.05);l.stop(t+len+.05);noise({f:300,dur:len,vol:.05,ft:'lowpass',attack:.3})}
function bark(d=0){noise({f:900,f2:300,dur:.09,vol:.2,ft:'bandpass',q:2,when:now()+d});tone({type:'sawtooth',f:260,f2:140,dur:.09,vol:.1,lp:1200,when:now()+d})}

/* ---------- музыка: шаговый секвенсор с упреждающим планированием ---------- */
const TRACKS={
  hub:{bpm:78,chords:[[57,60,64,67],[53,57,60,64],[48,52,55,59],[55,59,62,65]],drums:0,arp:[0,2,1,3,2,1,3,2],lead:.25,swing:.06},
  w1:{bpm:92,chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],drums:1,arp:[0,1,2,1,0,2,1,2],lead:.45,swing:.05,bass:[0,0,-1,0,-1,-1,0,-1]},
  w2:{bpm:100,chords:[[50,53,57],[46,50,53],[53,57,60],[48,52,55]],drums:1,arp:[0,2,1,2,0,2,1,0],lead:.4,swing:.03,bass:[0,-1,0,0,-1,0,-1,0]},
  w3:{bpm:96,chords:[[52,55,59],[48,52,55],[55,59,62],[50,54,57]],drums:1,arp:[2,1,0,1,2,1,0,2],lead:.5,swing:.06,bass:[0,-1,-1,0,-1,-1,0,0]},
  lair:{bpm:84,chords:[[45,48,51],[44,47,51],[42,45,49],[44,47,50]],drums:1,arp:[0,2,1,2,0,1,2,1],lead:.3,swing:.02,bass:[0,-1,-1,0,-1,0,-1,-1]},
  boss:{bpm:132,chords:[[45,48,52],[45,48,52],[41,45,48],[43,47,50]],drums:2,arp:[0,1,2,1,0,1,2,1],lead:.15,swing:0,bass:[0,0,0,-1,0,0,0,0]},
  king:{bpm:140,chords:[[40,43,47],[41,44,48],[38,41,45],[39,43,46]],drums:2,arp:[0,1,2,3,2,1,0,2],lead:.2,swing:0,bass:[0,0,-1,0,0,0,-1,0]},
  win:{bpm:110,chords:[[60,64,67],[65,69,72],[67,71,74],[60,64,67]],drums:1,arp:[0,1,2,1,0,1,2,1],lead:.6,swing:.04,bass:[0,-1,0,-1,0,-1,0,-1]}
};
let step=0,nextT=0,cur=null,lrng=1,intensity=0;
function rnd(){lrng=(lrng*16807)%2147483647;return lrng/2147483647}
A.play=function(name,force){
  if(A.track===name&&!force&&cur)return;A.track=name;
  if(!A.ready)return;
  cur=TRACKS[name]||null;step=0;nextT=now()+.08;lrng=name.length*977+13;
};
A.stopMusic=function(){cur=null;A.track=null};
A.setIntensity=v=>{intensity=v};
function schedule(){
  if(!cur||!ctx)return;
  const s16=60/cur.bpm/4;
  while(nextT<now()+.15){playStep(step,nextT,s16);step++;nextT+=s16}
}
function playStep(s,t,s16){
  const tr=cur,bar=Math.floor(s/16)%tr.chords.length,i=s%16,ch=tr.chords[bar];
  const sw=(i%2===1)?tr.swing:0,tt=t+sw;
  // пэд
  if(i===0)ch.forEach((m,k)=>{
    tone({type:'sawtooth',f:mtof(m),dur:s16*16,vol:.022,attack:.5,lp:900+(tr.drums?400:0),detune:-7,out:musG});
    tone({type:'sawtooth',f:mtof(m),dur:s16*16,vol:.022,attack:.5,lp:900,detune:7,out:musG});
  });
  // бас
  if(tr.bass&&i%2===0){const b=tr.bass[i/2];if(b===0)tone({type:'triangle',f:mtof(ch[0]-12),dur:s16*1.8,vol:.16,lp:500,out:musG})}
  if(!tr.bass&&i===0)tone({type:'sine',f:mtof(ch[0]-12),dur:s16*15,vol:.12,attack:.2,out:musG});
  // арпеджио
  if(i%2===0&&rnd()>.08){const k=tr.arp[(i/2)%tr.arp.length];const m=ch[k%ch.length]+12*(k>=ch.length?2:1);
    tone({type:'triangle',f:mtof(m),dur:s16*1.6,vol:tr.drums===2?.05:.045,out:musG,send:true})}
  // мелодия: редкие ноты пентатоники
  if(i%4===0&&rnd()<tr.lead){const root=ch[0]+24,steps=[0,3,5,7,10,12];const m=root+steps[Math.floor(rnd()*steps.length)];
    tone({type:'sine',f:mtof(m),dur:s16*(rnd()<.5?3:6),vol:.05,attack:.02,vib:5,vibAmt:4,out:musG,send:true,when:tt})}
  // ударные
  if(tr.drums){
    const hard=tr.drums===2||intensity>0;
    if(i===0||i===8||(hard&&(i===6||i===14))||(i===10&&rnd()<.4))kick(t);
    if(i===4||i===12)noise({f:1800,ft:'bandpass',q:.9,dur:.12,vol:hard?.11:.07,when:tt,out:musG});
    if(i%2===0||hard)noise({f:7000,ft:'highpass',dur:i%4===2?.06:.03,vol:hard?.04:.03,when:tt,out:musG});
  }else if(i===0&&bar%2===0){noise({f:5000,ft:'highpass',dur:.5,vol:.012,attack:.2,when:t,out:musG})}
}
function kick(t){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
  g.gain.setValueAtTime(.32,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(musG);o.start(t);o.stop(t+.25)}

/* связь с событиями ядра */
A.onEvent=function(e){
  switch(e.t){
    case 'pop':case 'start':case 'continue':case 'rescue':break;
    default:A.sfxPlay(e.t,e);
  }
  if(e.t==='rescue')A.sfxPlay('rescue');
};
})(window.KOT=window.KOT||{});
