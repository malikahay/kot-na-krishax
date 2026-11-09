/* Кот на крышах — 3D-отрисовка (three.js r128). Читает состояние K.G, реагирует на события. */
(function(K){
'use strict';
const T=K.T,ROWS=K.ROWS;
const R=K.render={};
let renderer,scene,camera,stage,moonLight,hemi,sky,skyBg;
const FOV=36;let CAM_DIST=21;
let camX=0,camY=6.3,shake=0,flashT=0,lowPower=false;
const tmpV=new THREE.Vector3(),tmpC=new THREE.Color();

function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);return t}
function rng(seed){let s=(Math.abs(seed*99991|0)%2147483646)+1;return()=>{s=s*16807%2147483647;return(s-1)/2147483646}}

/* ---------- текстуры и материалы ---------- */
let brickTex,crackTex,glowTex,winTexes,stoneTex;
function makeTextures(theme){
  brickTex=canvasTex(64,64,g=>{
    g.fillStyle='#b8b8c8';g.fillRect(0,0,64,64);
    const r=rng(5);for(let i=0;i<220;i++){g.fillStyle=r()<.5?'rgba(255,255,255,.08)':'rgba(0,0,0,.14)';g.fillRect(r()*64|0,r()*64|0,2,2)}
    g.fillStyle='#6a6a80';for(let row=0;row<4;row++){g.fillRect(0,row*16,64,2);const off=row%2?0:16;for(let c=0;c<3;c++)g.fillRect((off+c*32)%64,row*16,2,16)}
  });brickTex.magFilter=THREE.NearestFilter;
  crackTex=canvasTex(64,64,g=>{
    g.fillStyle='#c8b8a8';g.fillRect(0,0,64,64);g.fillStyle='#6a5a50';
    for(let row=0;row<4;row++){g.fillRect(0,row*16,64,2);const off=row%2?0:16;for(let c=0;c<3;c++)g.fillRect((off+c*32)%64,row*16,2,16)}
    g.strokeStyle='#2a1a14';g.lineWidth=3;g.beginPath();g.moveTo(10,4);g.lineTo(26,22);g.lineTo(20,34);g.lineTo(38,50);g.lineTo(34,62);g.moveTo(26,22);g.lineTo(48,18);g.lineTo(58,30);g.moveTo(38,50);g.lineTo(54,46);g.stroke();
  });crackTex.magFilter=THREE.NearestFilter;
  stoneTex=canvasTex(64,64,g=>{g.fillStyle='#9a92a8';g.fillRect(0,0,64,64);const r=rng(9);
    for(let i=0;i<14;i++){g.fillStyle=r()<.5?'#7a7288':'#b0a8bc';const x=r()*64,y=r()*64,w=10+r()*18,h=8+r()*12;g.beginPath();g.ellipse(x,y,w/2,h/2,r()*3,0,7);g.fill()}
    g.strokeStyle='#4a4258';g.lineWidth=2;for(let i=0;i<6;i++){g.beginPath();g.moveTo(r()*64,r()*64);g.lineTo(r()*64,r()*64);g.stroke()}});stoneTex.magFilter=THREE.NearestFilter;
  glowTex=canvasTex(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)});
}
function makeWinTexes(theme){
  const [wr,wg,wb]=theme.win;
  return [1,2,3].map(seed=>{const t=canvasTex(32,64,g=>{const r=rng(seed*91);g.fillStyle='#000';g.fillRect(0,0,32,64);
    for(let y=0;y<8;y++)for(let x=0;x<4;x++){const v=r();g.fillStyle=v<.3?`rgb(${wr-(r()*30|0)},${wg-(r()*40|0)},${wb-(r()*30|0)})`:v<.36?'#7d9bff':'#0b0820';g.fillRect(x*8+2,y*8+2,4,5)}});
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;return t});
}
const std=o=>new THREE.MeshStandardMaterial(o);
const basic=o=>new THREE.MeshBasicMaterial(o);
const M={};
const glowMat=(color,op=.55)=>new THREE.SpriteMaterial({map:glowTex,color,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:op});
function makeMaterials(){
  Object.assign(M,{
    brick:std({map:brickTex,roughness:.95,color:0x43358a}),
    crack:std({map:crackTex,roughness:.95,color:0xd8b8a0,emissive:0x2a1408}),
    roof:std({color:0x8f80e0,roughness:.6}),
    winOn:basic({color:0xffcf6b}),
    winOff:std({color:0x2a2060,roughness:.4,metalness:.3}),
    plank:std({color:0x9a6fd0,roughness:.8}),
    ghost:std({color:0x7ff7ff,emissive:0x3ad8ff,emissiveIntensity:.9,transparent:true,opacity:.75,roughness:.3,depthWrite:false}),
    spike:std({color:0xe4ddff,roughness:.25,metalness:.7}),
    star:std({color:0xffd85a,emissive:0xb38600,roughness:.3,metalness:.3}),
    fish:std({color:0xffcf4a,emissive:0xc08000,roughness:.2,metalness:.8}),
    heart:std({color:0xff5d8f,emissive:0x9c1a45,roughness:.35}),
    blob:std({color:0x0b071f,emissive:0x1d1145,roughness:.35,metalness:.1}),
    blobHop:std({color:0x1a0b2f,emissive:0x34125a,roughness:.35}),
    blobShoot:std({color:0x1f0a14,emissive:0x4a1022,roughness:.35}),
    steel:std({color:0x9aa0c0,roughness:.25,metalness:.9,emissive:0x111428}),
    gold:std({color:0xffc93a,roughness:.25,metalness:.85,emissive:0x5a3a00}),
    eye:basic({color:0xff5d8f}),eyeY:basic({color:0xb6ff5a}),eyeO:basic({color:0xffa23a}),eyeP:basic({color:0xd88aff}),
    white:basic({color:0xffffff}),black:basic({color:0x0a0812}),
    door:basic({color:0xffe9a8}),frame:std({color:0x5a4aa8,roughness:.7}),
    shot:basic({color:0xff6ad5}),wave:std({color:0x2a0f45,emissive:0x8a2cff,emissiveIntensity:.8,transparent:true,opacity:.85}),
    mover:std({color:0x5ad1c8,roughness:.5,emissive:0x0e3a38}),moverEdge:basic({color:0x9ffff2}),
    tileFall:std({color:0xc0573a,roughness:.8,emissive:0x2a0a04}),
    springBase:std({color:0x2b2440,roughness:.6}),coil:std({color:0xc8c8d8,metalness:.8,roughness:.3}),pad:std({color:0xff5d8f,roughness:.5,emissive:0x4a0a20}),
    pole:std({color:0x2a2448,roughness:.6,metalness:.4}),lampOff:basic({color:0x5a6aa8}),lampOn:basic({color:0xffe08a}),
    bar:std({color:0x8a86a8,metalness:.8,roughness:.3}),
    deco:std({color:0x2c2366,roughness:.9}),decoLight:std({color:0x3a2f7a,roughness:.8}),
    tank:std({color:0x5a4a8a,roughness:.7,metalness:.2}),
    glowStar:glowMat(0xffd85a),glowHeart:glowMat(0xff5d8f,.6),glowDoor:glowMat(0xffd890,.5),glowFish:glowMat(0xffd060,.7),
    glowShot:glowMat(0xff5dd5,.8),glowLampOn:glowMat(0xffd88a,.7),glowLampOff:glowMat(0x6a7aff,.25),glowGhost:glowMat(0x5af0ff,.5),
    glowFire:glowMat(0xfff27a,.9),glowUp:glowMat(0x9ad8ff,.12),
    slime:std({color:0x5aff7a,emissive:0x1aa040,emissiveIntensity:.8,roughness:.2,transparent:true,opacity:.85}),
    rock:std({map:null,color:0x2a2238,roughness:1}),drip:std({color:0x8a80a0,roughness:.7}),
    crystal:std({color:0x9a6aff,emissive:0x6a2aff,emissiveIntensity:.9,roughness:.1,metalness:.3,transparent:true,opacity:.9}),
    crystal2:std({color:0x5affd0,emissive:0x1aa080,emissiveIntensity:.9,roughness:.1,transparent:true,opacity:.9}),
    fire:new THREE.MeshBasicMaterial({color:0xb04aff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false}),
    fireCore:new THREE.MeshBasicMaterial({color:0xffb0ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}),
    glowFireP:glowMat(0xb04aff,.8),glowSlime:glowMat(0x5aff7a,.35),glowGreen:glowMat(0x7ff7c8,.7),glowItem:glowMat(0xffe08a,.75),
    rope:std({color:0xc89058,roughness:.9}),chain:std({color:0x8a8aa0,metalness:.85,roughness:.3})
  });
}
function starShape(r1,r2){const s=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?r2:r1;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i)s.lineTo(x,y);else s.moveTo(x,y)}s.closePath();return s}
const heartShape=()=>{const s=new THREE.Shape();s.moveTo(0,-.28);s.bezierCurveTo(-.06,-.2,-.32,-.05,-.3,.1);s.bezierCurveTo(-.28,.28,-.05,.3,0,.13);s.bezierCurveTo(.05,.3,.28,.28,.3,.1);s.bezierCurveTo(.32,-.05,.06,-.2,0,-.28);return s};
const fishShape=()=>{const s=new THREE.Shape();s.moveTo(.32,0);s.bezierCurveTo(.25,.18,-.05,.2,-.15,.04);s.lineTo(-.32,.17);s.lineTo(-.28,0);s.lineTo(-.32,-.17);s.lineTo(-.15,-.04);s.bezierCurveTo(-.05,-.2,.25,-.18,.32,0);return s};
const ext={depth:.08,bevelEnabled:true,bevelThickness:.04,bevelSize:.03,bevelSegments:2};
const Geo={};
function makeGeos(){
  Object.assign(Geo,{
    brick:new THREE.BoxGeometry(1,1,3),roof:new THREE.BoxGeometry(1.02,.2,3.16),win:new THREE.PlaneGeometry(.42,.46),
    plank:new THREE.BoxGeometry(1,.375,2.2),spike:new THREE.ConeGeometry(.1,.5,6),
    star:new THREE.ExtrudeGeometry(starShape(.3,.13),ext),heart:new THREE.ExtrudeGeometry(heartShape(),ext),fish:new THREE.ExtrudeGeometry(fishShape(),ext),
    blob:new THREE.SphereGeometry(.42,20,14),eye:new THREE.SphereGeometry(.075,10,8),wisp:new THREE.ConeGeometry(.1,.3,6),
    shot:new THREE.SphereGeometry(.15,12,10),spikeS:new THREE.ConeGeometry(.07,.22,6),
    unit:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(.5,.5,1,14),cone:new THREE.ConeGeometry(.5,1,10)
  });
  Geo.star.center();Geo.heart.center();Geo.fish.center();
}

/* ---------- инициализация ---------- */
R.init=function(canvas){
  stage=canvas.parentElement;
  lowPower=matchMedia('(pointer:coarse)').matches||(navigator.hardwareConcurrency||8)<=4;
  renderer=new THREE.WebGLRenderer({canvas,antialias:!lowPower,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,lowPower?1.5:2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(FOV,16/9,.1,400);
  makeTextures();makeMaterials();makeGeos();
  hemi=new THREE.HemisphereLight(0x8c7dff,0x1a1030,.6);scene.add(hemi);
  scene.add(new THREE.AmbientLight(0x2a2060,.45));
  moonLight=new THREE.DirectionalLight(0xd6d9ff,.95);moonLight.castShadow=true;
  const sm=lowPower?1024:2048;moonLight.shadow.mapSize.set(sm,sm);
  Object.assign(moonLight.shadow.camera,{left:-22,right:22,top:16,bottom:-10,near:1,far:70});
  moonLight.shadow.bias=-.0008;scene.add(moonLight,moonLight.target);
  buildSky();buildParticles();
  R.setTheme(K.WORLDS[0].theme);
  R.resize();
  if(window.ResizeObserver)new ResizeObserver(R.resize).observe(stage);else addEventListener('resize',R.resize);
  return true;
};
R.resize=function(){const w=stage.clientWidth||640,h=stage.clientHeight||360;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};

let moonMesh,biteMesh,halo;
function buildSky(){
  sky=new THREE.Group();scene.add(sky);
  const n=500,pos=new Float32Array(n*3),r=rng(77);
  for(let i=0;i<n;i++){pos[i*3]=(r()-.5)*260;pos[i*3+1]=10+r()*110;pos[i*3+2]=-150}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  sky.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:.7,fog:false,transparent:true,opacity:.85})));
  moonMesh=new THREE.Mesh(new THREE.SphereGeometry(7,32,24),basic({color:0xfff3c4,fog:false}));moonMesh.position.set(48,48,-140);sky.add(moonMesh);
  biteMesh=new THREE.Mesh(new THREE.SphereGeometry(6.4,32,24),basic({color:0x0f0b28,fog:false}));biteMesh.position.set(51.5,50.5,-136);sky.add(biteMesh);
  halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xfff0b0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.35,fog:false}));
  halo.scale.set(60,60,1);halo.position.set(48,48,-141);sky.add(halo);
}
let theme=null;
R.setTheme=function(th){
  if(theme===th)return;theme=th;
  if(skyBg)skyBg.dispose();
  skyBg=canvasTex(4,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,th.sky[0]);gr.addColorStop(.55,th.sky[1]);gr.addColorStop(1,th.sky[2]);g.fillStyle=gr;g.fillRect(0,0,w,h)});
  scene.background=skyBg;scene.fog=new THREE.Fog(th.fog,28,95);
  M.brick.color.setHex(th.brick).multiplyScalar(1.25);
  M.roof.color.setHex(th.roof);M.plank.color.setHex(th.roof).multiplyScalar(.8);
  hemi.color.setHex(th.hemi);moonMesh.material.color.setHex(th.moon);biteMesh.material.color.set(th.sky[0]);
  M.deco.color.setHex(th.near[0]);M.decoLight.color.setHex(th.near[1]);
  winTexes=makeWinTexes(th);
  moonLight.intensity=th.cave?.5:.95;hemi.intensity=th.cave?.45:.6;
  M.brick.map=th.cave?stoneTex:brickTex;M.brick.needsUpdate=true;sky.visible=!th.cave;M.roof.emissive=new THREE.Color(th.cave?0x0a3a28:0x000000);
  scene.fog=new THREE.Fog(th.fog,th.cave?18:28,th.cave?70:95);
  for(const k in skyMats)delete skyMats[k];
};
const skyMats={};
function skyMat(layer,v){const k=layer+'_'+v;if(skyMats[k])return skyMats[k];
  const side=std({color:layer?theme.far[0]:theme.near[0],emissive:0xffffff,emissiveMap:winTexes[v],emissiveIntensity:layer?.45:.8,roughness:.9});
  const top=std({color:layer?theme.far[1]:theme.near[1],roughness:.9});
  return skyMats[k]=[side,side,top,top,side,side]}

/* ---------- частицы ---------- */
const PMAX=700;let pts,pGeo,pPos,pCol,ptsB,pGeoB,pPosB,pColB;const parts=[];
function buildParticles(){
  const mk=(size)=>{const pos=new Float32Array(PMAX*3),col=new Float32Array(PMAX*3);const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
    const p=new THREE.Points(g,new THREE.PointsMaterial({size,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));p.frustumCulled=false;scene.add(p);return [p,g,pos,col]};
  [pts,pGeo,pPos,pCol]=mk(.14);[ptsB,pGeoB,pPosB,pColB]=mk(.32);
}
function part(x,y,o){if(parts.length>=PMAX*2-10)parts.shift();parts.push(Object.assign({x,y,z:(Math.random()-.5)*.8,vx:0,vy:0,vz:0,life:40,max:40,col:0xffffff,big:false,grav:-.004,drag:.96},o))}
function burst(x,y,col,n=10,sp=.12,o={}){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=sp*(.4+Math.random());const l=30+Math.random()*20;part(x,y,Object.assign({vx:Math.cos(a)*s,vy:Math.sin(a)*s+.03,vz:(Math.random()-.5)*s,life:l,max:l,col,big:Math.random()<.3},o))}}
function dust(x,y,n=4,dir=0){for(let i=0;i<n;i++){const l=18+Math.random()*14;part(x+(Math.random()-.5)*.3,y+.05,{vx:(Math.random()-.5)*.04-dir*.03,vy:.01+Math.random()*.025,vz:(Math.random()-.5)*.04,life:l,max:l,col:0x6a5f9a,grav:0,drag:.92,big:Math.random()<.5})}}
function updateParticles(){
  let n=0,nb=0;
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life--;if(p.life<=0){parts.splice(i,1);continue}
    p.vx*=p.drag;p.vy=p.vy*p.drag+p.grav;p.vz*=p.drag;p.x+=p.vx;p.y+=p.vy;p.z+=p.vz;
    const f=Math.min(1,p.life/(p.max*.5));tmpC.setHex(p.col).multiplyScalar(f);
    if(p.big){if(nb<PMAX){pPosB[nb*3]=p.x;pPosB[nb*3+1]=p.y;pPosB[nb*3+2]=p.z;pColB[nb*3]=tmpC.r;pColB[nb*3+1]=tmpC.g;pColB[nb*3+2]=tmpC.b;nb++}}
    else if(n<PMAX){pPos[n*3]=p.x;pPos[n*3+1]=p.y;pPos[n*3+2]=p.z;pCol[n*3]=tmpC.r;pCol[n*3+1]=tmpC.g;pCol[n*3+2]=tmpC.b;n++}
  }
  pGeo.setDrawRange(0,n);pGeo.attributes.position.needsUpdate=pGeo.attributes.color.needsUpdate=true;
  pGeoB.setDrawRange(0,nb);pGeoB.attributes.position.needsUpdate=pGeoB.attributes.color.needsUpdate=true;
}
const wx=px=>px/T, wy=py=>ROWS-py/T;

/* ---------- модели ---------- */
const matCache={};
function cmat(hex,o={}){const k=hex+JSON.stringify(o);return matCache[k]||(matCache[k]=std(Object.assign({color:hex,roughness:.7},o)))}
function box(w,h,d,mat,x,y,z,parent,shadow=true){const m=new THREE.Mesh(Geo.unit,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=shadow;parent.add(m);return m}
function cyl(r,h,mat,x,y,z,parent,rt){const m=new THREE.Mesh(rt!==undefined?new THREE.CylinderGeometry(rt,r,h,14):Geo.cyl,mat);if(rt===undefined)m.scale.set(r*2,h,r*2);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function sph(r,mat,x,y,z,parent){const m=new THREE.Mesh(Geo.blob,mat);m.scale.setScalar(r/.42);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function cone(r,h,mat,x,y,z,parent){const m=new THREE.Mesh(Geo.cone,mat);m.scale.set(r*2,h,r*2);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}

/* Кот со скином: окрас, шапка, хвост */
function buildCat(skin,ghost){
  const S=K.SKINS,col=S.color.find(c=>c.id===skin.color)||S.color[0];
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  let mb,md,me;
  if(ghost){mb=md=me=new THREE.MeshBasicMaterial({color:0x9ad8ff,transparent:true,opacity:.35,depthWrite:false})}
  else{
    mb=std({color:col.body,roughness:.75,metalness:col.metal||0,emissive:new THREE.Color(col.body).multiplyScalar(col.glow||.08)});
    md=std({color:col.dark,roughness:.8,metalness:col.metal||0,emissive:new THREE.Color(col.dark).multiplyScalar(col.glow||.05)});
    me=basic({color:col.eye});
  }
  box(.62,.34,.38,mb,-.04,.4,0,body);
  [-.22,-.08,.06].forEach(x=>box(.06,.345,.385,md,x,.405,0,body));
  const head=new THREE.Group();head.position.set(.3,.64,0);body.add(head);
  box(.42,.38,.4,mb,0,0,0,head);
  const earM=col.id==='siam'?md:mb;
  [.12,-.12].forEach(z=>{const e=new THREE.Mesh(new THREE.ConeGeometry(.08,.17,4),earM);e.position.set(.08,.26,z);e.rotation.y=Math.PI/4;e.castShadow=true;head.add(e)});
  if(!ghost){
    if(col.id==='siam')box(.06,.2,.24,md,.2,-.06,0,head,false);
    if(col.id==='calico'){box(.2,.12,.392,cmat(0x2b2638),-.2,.5,0,body,false);box(.15,.12,.41,md,.05,.1,0,head,false)}
    [.205,-.205].forEach(z=>box(.08,.09,.02,me,.12,.04,z,head,false));
    box(.06,.08,.1,me,.215,.04,.1,head,false);box(.06,.08,.1,me,.215,.04,-.1,head,false);
    box(.04,.05,.07,basic({color:0xff8fb0}),.225,-.06,0,head,false);
    buildHat(skin.hat,head);
  }
  const tail=new THREE.Group();tail.position.set(-.34,.5,0);body.add(tail);
  buildTail(ghost?'normal':skin.tail,tail,md,col);
  tail.rotation.z=.5;
  const legs=[[-.24,.12],[-.24,-.12],[.18,.12],[.18,-.12]].map(([x,z],i)=>{const p=new THREE.Group();p.position.set(x,.24,z);box(.11,.24,.11,md,0,-.12,0,p);body.add(p);p.userData.phase=(i%2?Math.PI:0)+(i>1?Math.PI:0);return p});
  g.userData={body,tail,legs,head};
  return g;
}
function buildHat(id,head){
  const h=new THREE.Group();h.position.set(0,.19,0);head.add(h);
  switch(id){
    case 'bandana':{const m=cmat(0xe83a4a);box(.44,.08,.42,m,0,-.02,0,h);box(.06,.12,.06,m,-.25,-.05,.06,h);box(.06,.1,.06,m,-.27,-.09,-.04,h);break}
    case 'ushanka':{const f=cmat(0x6a4a3a),t=cmat(0x3a2a6a);box(.48,.16,.46,f,0,.06,0,h);box(.4,.12,.4,t,0,.14,0,h);box(.3,.2,.06,f,-.04,-.1,.24,h);box(.3,.2,.06,f,-.04,-.1,-.24,h);break}
    case 'flower':{const p=cmat(0xff8fd0),c=cmat(0xffe14a);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;sph(.05,p,.05+Math.cos(a)*.07,.02,.14+Math.sin(a)*.07,h)}sph(.045,c,.05,.03,.14,h);break}
    case 'party':{const c=cone(.12,.34,cmat(0x5ad1ff,{emissive:0x0a3040}),0,.17,0,h);c.rotation.z=-.15;sph(.05,cmat(0xffe14a),-.03,.36,0,h);box(.25,.03,.25,cmat(0xff5d8f),0,.02,0,h);break}
    case 'tophat':{const b=cmat(0x1a1622),r=cmat(0xe83a4a);cyl(.24,.03,b,0,.01,0,h);cyl(.15,.3,b,0,.17,0,h);cyl(.152,.06,r,0,.06,0,h);break}
    case 'headphones':{const m=cmat(0x2a2a3a),c=cmat(0x5af0ff,{emissive:0x1a6070});const band=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,6,16,Math.PI),m);band.position.set(0,-.08,0);band.rotation.y=Math.PI/2;h.add(band);
      [.23,-.23].forEach(z=>{const cup=cyl(.08,.06,c,0,-.12,z,h);cup.rotation.x=Math.PI/2});break}
    case 'halo':{const t=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,8,24),basic({color:0xfff27a}));t.position.set(0,.18,0);t.rotation.x=Math.PI/2;h.add(t);h.userData.spin=t;break}
    case 'crown':{const gm=M.gold;cyl(.16,.1,gm,0,.04,0,h);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;cone(.035,.12,gm,Math.cos(a)*.13,.14,Math.sin(a)*.13,h)}sph(.035,basic({color:0xff5d8f}),.16,.05,0,h);break}
  }
}
function buildTail(id,tail,md,col){
  switch(id){
    case 'fluffy':box(.15,.44,.15,md,0,.2,0,tail);box(.19,.14,.19,md,0,.42,0,tail);break;
    case 'bow':box(.08,.42,.08,md,0,.2,0,tail);{const p=cmat(0xff6ab0);box(.05,.1,.16,p,0,.24,.08,tail);box(.05,.1,.16,p,0,.24,-.08,tail);box(.07,.06,.06,p,0,.24,0,tail)}break;
    case 'double':{const a=new THREE.Group(),b=new THREE.Group();tail.add(a,b);box(.07,.42,.07,md,0,.2,0,a);box(.07,.42,.07,md,0,.2,0,b);a.rotation.x=.35;b.rotation.x=-.35;break}
    case 'glow':{const m=basic({color:new THREE.Color(col.eye)});box(.08,.42,.08,m,0,.2,0,tail);const s=new THREE.Sprite(glowMat(col.eye,.7));s.scale.set(.6,.6,1);s.position.set(0,.38,0);tail.add(s);break}
    case 'bolt':{const m=basic({color:0xfff27a});const a=box(.07,.2,.07,m,0,.08,0,tail);const b=box(.07,.2,.07,m,.06,.22,0,tail);b.rotation.z=-.9;const c=box(.07,.2,.07,m,.02,.36,0,tail);break}
    default:box(.08,.42,.08,md,0,.2,0,tail);
  }
}

/* Друзья */
function buildFriend(id){
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);const U=g.userData={body:b,wings:[],kind:id};
  const eyes=(x,y,z,s=.05)=>{box(.02,s,s,M.white,x,y,z,b,false);box(.02,s,s,M.white,x,y,-z,b,false);box(.021,s*.5,s*.5,M.black,x+.005,y,z,b,false);box(.021,s*.5,s*.5,M.black,x+.005,y,-z,b,false)};
  switch(id){
    case 'crow':{const m=cmat(0x1e1b2a),bk=cmat(0xffc23a);box(.36,.28,.28,m,0,.36,0,b);box(.24,.22,.24,m,.2,.56,0,b);const c=cone(.05,.16,bk,.38,.55,0,b);c.rotation.z=-Math.PI/2;eyes(.32,.6,.08,.05);
      [.16,-.16].forEach(z=>{const w=new THREE.Group();w.position.set(0,.42,z);box(.3,.05,.14,m,-.05,0,z>0?.06:-.06,w);b.add(w);U.wings.push(w)});box(.18,.05,.14,m,-.24,.38,0,b);
      box(.03,.14,.03,bk,.05,.15,.06,b);box(.03,.14,.03,bk,.05,.15,-.06,b);break}
    case 'owl':{const m=cmat(0x8a5a3a),l=cmat(0xd8b88a),bk=cmat(0xffa23a);box(.42,.52,.38,m,0,.36,0,b);box(.02,.32,.26,l,.215,.3,0,b,false);
      [.1,-.1].forEach(z=>{const e=cyl(.08,.03,M.white,.22,.52,z,b);e.rotation.z=Math.PI/2;const p=cyl(.04,.035,M.black,.23,.52,z,b);p.rotation.z=Math.PI/2});
      cone(.04,.08,bk,.24,.43,0,b).rotation.z=Math.PI;[.14,-.14].forEach(z=>cone(.04,.14,m,-.02,.68,z,b));
      [.21,-.21].forEach(z=>{const w=new THREE.Group();w.position.set(0,.45,z);box(.26,.32,.04,m,-.02,-.12,0,w);b.add(w);U.wings.push(w)});break}
    case 'squirrel':{const m=cmat(0xd2702e),l=cmat(0xf2c89a);box(.32,.28,.24,m,0,.3,0,b);box(.24,.24,.24,m,.18,.5,0,b);box(.02,.14,.14,l,.16,.28,0,b,false);eyes(.305,.53,.07,.05);
      [.08,-.08].forEach(z=>cone(.04,.1,m,.16,.67,z,b));const t=new THREE.Group();t.position.set(-.18,.3,0);b.add(t);box(.18,.22,.18,m,-.04,.12,0,t);box(.2,.24,.2,m,-.1,.34,0,t);box(.18,.16,.18,m,0,.5,0,t);U.tail=t;break}
    case 'raccoon':{const m=cmat(0x8a8a9a),d=cmat(0x2a2a34),l=cmat(0xd8d8e0);box(.46,.32,.32,m,0,.3,0,b);box(.3,.26,.3,m,.26,.5,0,b);box(.02,.08,.3,d,.415,.54,0,b,false);eyes(.42,.54,.07,.045);box(.06,.06,.08,l,.42,.44,0,b,false);
      [.1,-.1].forEach(z=>cone(.05,.1,m,.24,.68,z,b));const t=new THREE.Group();t.position.set(-.24,.32,0);b.add(t);for(let i=0;i<4;i++)box(.1,.12,.12,i%2?d:m,-.06-i*.09,.04+i*.05,0,t);U.tail=t;break}
    case 'lizard':{const m=cmat(0x5fd16a,{emissive:0x0a3010}),d=cmat(0x3a9a4a);box(.48,.13,.2,m,0,.12,0,b);box(.2,.12,.18,m,.32,.15,0,b);eyes(.36,.2,.07,.04);
      const t=new THREE.Group();t.position.set(-.24,.1,0);b.add(t);box(.3,.07,.08,d,-.15,0,0,t);U.tail=t;[[.14,.12],[.14,-.12],[-.14,.12],[-.14,-.12]].forEach(([x,z])=>box(.06,.1,.06,d,x,.04,z,b));break}
    case 'firefly':{const d=cmat(0x2a2440);b.position.y=.55;box(.16,.12,.12,d,.06,0,0,b);sph(.1,basic({color:0xfff27a}),-.1,0,0,b);const s=new THREE.Sprite(M.glowFire);s.scale.set(1.1,1.1,1);s.position.set(-.1,0,0);b.add(s);U.glow=s;
      [.08,-.08].forEach(z=>{const w=new THREE.Group();w.position.set(0,.06,z);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.18,.1),new THREE.MeshBasicMaterial({color:0xcfe8ff,transparent:true,opacity:.5,side:THREE.DoubleSide}));pl.rotation.x=Math.PI/2;pl.position.z=z>0?.07:-.07;w.add(pl);b.add(w);U.wings.push(w)});break}
    case 'mouse':{const m=cmat(0xb8b4c4),p=cmat(0xff9ac0);box(.3,.2,.22,m,0,.16,0,b);box(.2,.18,.2,m,.2,.24,0,b);eyes(.305,.28,.06,.04);sph(.025,p,.31,.22,0,b);
      [.1,-.1].forEach(z=>{const e=cyl(.08,.02,m,.18,.4,z,b);e.rotation.x=Math.PI/2;const i=cyl(.05,.022,p,.185,.4,z,b);i.rotation.x=Math.PI/2});
      const t=new THREE.Group();t.position.set(-.15,.12,0);b.add(t);box(.3,.025,.025,p,-.15,0,0,t);U.tail=t;break}
    case 'hedgehog':{const m=cmat(0x6a4a3a),l=cmat(0xe8c8a0);sph(.22,m,0,.22,0,b).scale.set(.62,.5,.5);box(.14,.14,.16,l,.2,.2,0,b);sph(.025,M.black,.28,.2,0,b);eyes(.26,.25,.05,.035);
      for(let i=0;i<9;i++){const a=-1.2+i*.3;const s=cone(.04,.16,cmat(0x3a2a20),-.02+Math.sin(a)*.16,.24+Math.cos(a)*.16,((i%3)-1)*.09,b);s.rotation.z=-a}break}
    case 'kitten':{const c=buildCat({color:'white',hat:'none',tail:'normal'});c.scale.setScalar(.62);b.add(c);U.cat=c.userData;break}
  }
  return g;
}
function animFriend(f,t,moving){
  const U=f.userData;const b=U.body;
  b.position.y=(U.kind==='firefly'?.55:0)+Math.abs(Math.sin(t*(moving?9:3)))*(moving?.06:.02);
  U.wings.forEach((w,i)=>w.rotation.x=(i?-1:1)*(U.kind==='crow'||U.kind==='firefly'?Math.sin(t*(U.kind==='firefly'?40:moving?14:3))*.6:Math.sin(t*2)*.1));
  if(U.tail)U.tail.rotation.z=Math.sin(t*3)*.25;
  if(U.glow)U.glow.material.opacity=.6+Math.sin(t*4)*.3;
  if(U.cat){U.cat.tail.rotation.z=.5+Math.sin(t*4)*.3}
}

/* Враги */
function buildEnemy(type){
  const g=new THREE.Group();const U=g.userData={type,wisps:[]};
  if(type==='bat'){
    const b=sph(.22,M.blob,0,0,0,g);b.scale.set(.6,.5,.5);
    [-.06,.06].forEach(x=>{const e=new THREE.Mesh(Geo.eye,M.eye);e.position.set(x,.03,.18);e.scale.setScalar(.7);g.add(e)});
    [.08,-.08].forEach(x=>cone(.04,.1,M.blob,x,.14,0,g));
    U.wings=[1,-1].map(s=>{const w=new THREE.Group();w.position.set(s*.12,0,0);const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(s*.42,.12);sh.lineTo(s*.34,-.05);sh.lineTo(s*.22,.02);sh.lineTo(s*.12,-.1);sh.lineTo(0,-.04);
      const m=new THREE.Mesh(new THREE.ShapeGeometry(sh),new THREE.MeshStandardMaterial({color:0x140c2a,emissive:0x1d1145,side:THREE.DoubleSide}));w.add(m);g.add(w);return w});
    return g;
  }
  const mat=type==='hopper'?M.blobHop:type==='shooter'?M.blobShoot:M.blob;
  const b=new THREE.Mesh(Geo.blob,mat);b.castShadow=true;b.scale.set(1,.95,.9);g.add(b);U.blob=b;
  const eyes=new THREE.Group();g.add(eyes);U.eyes=eyes;
  const em=type==='hopper'?M.eyeY:type==='shooter'?M.eyeO:M.eye;
  if(type==='shooter'){const e=new THREE.Mesh(Geo.eye,em);e.scale.set(1.8,1.8,.8);e.position.set(0,.1,.35);eyes.add(e);U.bigEye=e;
    const mouth=cyl(.09,.24,cmat(0x2a0a14),0,-.06,.36,g);mouth.rotation.x=Math.PI/2;U.mouth=mouth}
  else [-.13,.13].forEach(x=>{const e=new THREE.Mesh(Geo.eye,em);e.position.set(x,.08,.35);e.scale.set(1,1.3,.6);eyes.add(e)});
  for(let i=0;i<5;i++){const w=new THREE.Mesh(Geo.wisp,mat);w.rotation.x=Math.PI;w.position.set(-.28+i*.14,-.36,0);g.add(w);U.wisps.push(w)}
  if(type==='hopper'){[-.18,.18].forEach(x=>{const h=cone(.06,.2,mat,x,.42,0,g);h.rotation.z=-x*1.5})}
  if(type==='armored'){
    const hm=new THREE.Mesh(new THREE.SphereGeometry(.46,18,10,0,Math.PI*2,0,Math.PI/2),M.steel);hm.position.y=.02;hm.castShadow=true;g.add(hm);
    for(let i=0;i<3;i++){const s=new THREE.Mesh(Geo.spikeS,M.steel);s.position.set(-.18+i*.18,.46,0);s.scale.setScalar(1.3);g.add(s)}
    box(.6,.06,.5,M.steel,0,.05,0,g);
  }
  return g;
}
function buildBoss(king){
  const g=new THREE.Group();const U=g.userData={};
  const s=king?2.1:1.8;
  const body=new THREE.Group();body.scale.setScalar(s);g.add(body);U.body=body;
  const mat=king?std({color:0x0c0620,emissive:0x2a0f45,roughness:.3,metalness:.2}):std({color:0x0b071f,emissive:0x21104a,roughness:.35});
  U.mat=mat;
  const b=new THREE.Mesh(Geo.blob,mat);b.castShadow=true;body.add(b);
  const em=king?M.eyeP:M.eye;
  U.eyes=[-.14,.14].map(x=>{const e=new THREE.Mesh(Geo.eye,em);e.position.set(x,.06,.36);e.scale.set(1.3,1.1,.6);body.add(e);return e});
  U.wisps=[];for(let i=0;i<6;i++){const w=new THREE.Mesh(Geo.wisp,mat);w.rotation.x=Math.PI;w.position.set(-.3+i*.12,-.37,0);body.add(w);U.wisps.push(w)}
  if(king){
    const cr=new THREE.Group();cr.position.set(0,.4,0);body.add(cr);cyl(.2,.1,M.gold,0,0,0,cr);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;cone(.04,.16,M.gold,Math.cos(a)*.17,.12,Math.sin(a)*.17,cr)}
    sph(.04,basic({color:0xff5d8f}),0,.02,.2,cr);
    const cape=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1),std({color:0x5a0a2a,emissive:0x2a0010,side:THREE.DoubleSide}));cape.position.set(0,-.1,-.35);body.add(cape);U.cape=cape;
    U.hands=[-1,1].map(sx=>sph(.11,mat,sx*.6,-.05,.1,body));
  }else{
    const cap=new THREE.Group();cap.position.set(0,.36,0);body.add(cap);const cm=cmat(0x2a1a4a);cyl(.3,.12,cm,0,0,0,cap,.26);box(.36,.03,.18,cmat(0x1a1030),0,-.04,.24,cap);
    const st=new THREE.Mesh(Geo.star,M.gold);st.scale.setScalar(.25);st.position.set(0,.02,.28);cap.add(st);
    [-1,1].forEach(sx=>{box(.16,.04,.2,M.gold,sx*.38,.05,0,body);for(let i=0;i<3;i++)box(.02,.06,.02,M.gold,sx*.38+(i-1)*.05,.0,.1,body)});
  }
  const armor=new THREE.Mesh(new THREE.SphereGeometry(.5,20,12,0,Math.PI*2,0,Math.PI*.6),new THREE.MeshStandardMaterial({color:0xb0b8d8,metalness:.9,roughness:.2,transparent:true,opacity:.85}));
  armor.position.y=.02;body.add(armor);U.armor=armor;
  for(let i=0;i<4;i++){const sp=new THREE.Mesh(Geo.spikeS,M.steel);sp.scale.setScalar(1.4);const a=-0.9+i*.6;sp.position.set(Math.sin(a)*.42,Math.cos(a)*.42,0);sp.rotation.z=-a;armor.add(sp)}
  U.dizzy=new THREE.Group();g.add(U.dizzy);for(let i=0;i<3;i++){const st=new THREE.Mesh(Geo.star,M.star);st.scale.setScalar(.45);U.dizzy.add(st)}
  return g;
}


/* Вещи для спасения */
function buildItem(type){
  const g=new THREE.Group(),m=new THREE.Group();g.add(m);g.userData.m=m;
  const gl=new THREE.Sprite(type==='kit'?M.glowGreen:M.glowItem);gl.scale.set(1.8,1.8,1);g.add(gl);
  if(type==='key'){const gm=M.gold;const ring=new THREE.Mesh(new THREE.TorusGeometry(.14,.05,8,16),gm);ring.position.x=-.18;m.add(ring);box(.36,.07,.07,gm,.08,0,0,m);box(.06,.12,.06,gm,.2,-.08,0,m);box(.06,.08,.06,gm,.1,-.06,0,m)}
  else if(type==='rope'){for(let i=0;i<3;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.18-i*.01,.045,6,16),M.rope);t.rotation.y=Math.PI/2;t.position.x=(i-1)*.07;m.add(t)}box(.05,.25,.05,M.rope,.18,-.18,0,m)}
  else if(type==='cutter'){const st=M.steel,hd=cmat(0xe83a4a);const a=box(.07,.42,.07,hd,-.06,-.12,0,m);a.rotation.z=.25;const b=box(.07,.42,.07,hd,.06,-.12,0,m);b.rotation.z=-.25;box(.08,.16,.08,st,-.02,.14,0,m).rotation.z=-.3;box(.08,.16,.08,st,.02,.14,0,m).rotation.z=.3}
  else {box(.46,.3,.3,cmat(0x3ab89a),0,0,0,m);box(.5,.06,.32,cmat(0x2a7a6a),0,.15,0,m);box(.14,.06,.06,M.gold,0,.2,0,m);box(.08,.08,.32,M.gold,0,0,0,m,false)}
  return g;
}
/* Замки, цепи и верёвка на клетке */
function decorateCage(c,G){
  const need=G.need||{};c.locks=[];c.baseY=c.g.position.y;
  for(let i=0;i<(need.key||0);i++){const l=new THREE.Group();box(.16,.14,.08,M.gold,0,0,0,l);const sh=new THREE.Mesh(new THREE.TorusGeometry(.055,.018,6,12,Math.PI),M.steel);sh.position.y=.07;l.add(sh);l.position.set(-.45+i*.3,.55+(i%2)*.2,.5);c.g.add(l);c.locks.push(['key',l])}
  for(let i=0;i<(need.cutter||0);i++){const ch=new THREE.Group();for(let k=0;k<7;k++){const t=new THREE.Mesh(new THREE.TorusGeometry(.07,.02,6,10),M.chain);t.position.set(-.6+k*.2,.95-i*.5+Math.sin(k)*.04,.48);t.rotation.y=k%2?Math.PI/2:0;ch.add(t)}c.g.add(ch);c.locks.push(['cutter',ch])}
  if(need.rope){c.hang=true;c.ropeLine=box(.05,1,.05,M.rope,0,3,0,c.g,false);c.hook=box(.5,.08,.3,M.pole,0,8,0,c.g,false)}
  const rg=new THREE.Sprite(glowMat(0x7ff7c8,.6));rg.scale.set(3.4,3.4,1);rg.position.y=.8;c.g.add(rg);c.readyGlow=rg;
}
/* Ловушки: у каждого уровня своя */
function buildTrap(tier){
  const g=new THREE.Group(),a=new THREE.Group(),b=new THREE.Group();g.add(a,b);g.userData={armed:a,sprung:b};
  const glow=new THREE.Sprite(glowMat(0x7ff7c8,.35));glow.scale.set(1.2,1.2,1);glow.position.y=.1;a.add(glow);
  switch(tier){
    case 0:{const m=cmat(0xe83a6a);sph(.18,m,0,.18,0,a);const t=new THREE.Mesh(new THREE.TorusGeometry(.18,.02,6,16),cmat(0xff8fb0));t.position.y=.18;a.add(t);box(.5,.02,.02,m,.3,.02,0,a);box(1,.03,.6,m,0,.02,0,b);break}
    case 1:{const y=cmat(0xffd84a);for(let i=0;i<3;i++){const p=box(.12,.04,.32,y,0,.03,0,a);p.rotation.y=i*2.1;p.position.x=Math.cos(i*2.1)*.12;p.position.z=Math.sin(i*2.1)*.12}box(.5,.04,.2,y,0,.03,0,b);break}
    case 2:{box(.6,.06,.36,cmat(0xb08050),0,.03,0,a);box(.5,.03,.03,M.steel,0,.08,.12,a);box(.03,.12,.32,M.steel,-.22,.1,0,a);box(.6,.06,.36,cmat(0xb08050),0,.03,0,b);box(.5,.03,.03,M.steel,0,.08,-.12,b);break}
    case 3:{const h=new THREE.Mesh(new THREE.CylinderGeometry(.42,.48,.06,16),std({color:0xffb030,emissive:0x8a4a00,roughness:.1,transparent:true,opacity:.9}));h.position.y=.03;a.add(h);const h2=h.clone();b.add(h2);cyl(.1,.18,cmat(0xc88a3a),.25,.1,.1,a);break}
    case 4:{const n=new THREE.Mesh(new THREE.PlaneGeometry(1,1,6,6),new THREE.MeshBasicMaterial({color:0xdde0ff,wireframe:true}));n.rotation.x=-Math.PI/2;n.position.y=.03;a.add(n);const n2=n.clone();n2.rotation.x=0;n2.position.y=.4;b.add(n2);break}
    case 5:{const r=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,6,18),M.steel);r.rotation.x=Math.PI/2;r.position.y=.05;a.add(r);for(let i=0;i<10;i++){const s=new THREE.Mesh(Geo.spikeS,M.steel);const an=i/10*Math.PI*2;s.position.set(Math.cos(an)*.3,.14,Math.sin(an)*.3);a.add(s)}const r2=r.clone();r2.rotation.x=0;r2.position.y=.3;b.add(r2);break}
    case 6:{cyl(.08,.36,cmat(0xe83a3a),0,.18,0,a);box(.02,.14,.02,cmat(0x2a2a2a),0,.42,0,a);const sp=new THREE.Sprite(M.glowFire);sp.scale.set(.5,.5,1);sp.position.y=.5;a.add(sp);box(.6,.02,.6,cmat(0x2a1a1a),0,.01,0,b);break}
    case 7:{const c=new THREE.Mesh(new THREE.OctahedronGeometry(.28),std({color:0xbfe8ff,emissive:0x3a8aff,emissiveIntensity:.6,transparent:true,opacity:.8,roughness:.05}));c.position.y=.28;a.add(c);const c2=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1),c.material);c2.position.y=.6;b.add(c2);break}
    default:{const st=new THREE.Mesh(Geo.star,M.star);st.scale.setScalar(1.1);st.position.y=.35;a.add(st);for(let i=0;i<6;i++)box(.04,1.2,.04,M.gold,-.5+i*.2,.6,.45,b);box(1.2,.06,1,M.gold,0,1.2,0,b)}
  }
  return g;
}
/* Преследователь: пёс с тремя обликами */
function buildChaser(look){
  const L=K.CHASERS[look],g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const m=std({color:L.color,emissive:L.glow,emissiveIntensity:.6,roughness:.4,metalness:L.armor?.7:.1});const em=basic({color:L.eye});
  box(1,.42,.42,m,0,.6,0,body);box(.3,.32,.44,m,-.38,.66,0,body);
  const heads=[];const hz=L.heads===3?[-.28,0,.28]:[0];
  hz.forEach(z=>{const h=new THREE.Group();h.position.set(.55,.88,z);body.add(h);box(.36,.32,.32,m,0,0,0,h);box(.22,.16,.22,m,.24,-.06,0,h);
    [.1,-.1].forEach(ez=>{const e=box(.05,.06,.04,em,.18,.06,ez,h,false);heads.push(e)});
    [.1,-.1].forEach(ez=>{const ear=cone(.06,.2,m,-.06,.24,ez,h);ear.rotation.z=-.3});box(.2,.03,.18,basic({color:0xff3a6a}),.3,-.13,0,h,false);});
  const legs=[[.34,.13],[.34,-.13],[-.34,.13],[-.34,-.13]].map(([x,z])=>{const p=new THREE.Group();p.position.set(x,.42,z);box(.12,.42,.12,m,0,-.21,0,p);body.add(p);return p});
  const tail=new THREE.Group();tail.position.set(-.5,.75,0);body.add(tail);box(.07,.4,.07,m,0,.18,0,tail);
  if(L.armor){box(.7,.1,.48,M.steel,0,.84,0,body);box(.4,.1,.36,M.steel,.55,1.06,0,body);for(let i=0;i<4;i++){const s=new THREE.Mesh(Geo.spikeS,M.steel);s.position.set(-.3+i*.2,.95,0);body.add(s)}}
  const dz=new THREE.Group();g.add(dz);for(let i=0;i<3;i++){const st=new THREE.Mesh(Geo.star,M.star);st.scale.setScalar(.35);dz.add(st)}
  g.scale.setScalar(.95);
  g.userData={body,legs,tail,eyes:heads,dizzy:dz};
  return g;
}
/* Пещерный фон берлоги */
function buildCaveBg(L,r){
  const rockM=std({map:stoneTex,color:0x3a3050,roughness:1}),rockM2=std({map:stoneTex,color:0x241c34,roughness:1});
  [[-6,rockM,.9],[-16,rockM2,1.4]].forEach(([z,mat,k])=>{
    let x=-30;while(x<L.w+30){const w=2+r()*5,h=(3+r()*9)*k;const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,3),mat);m.position.set(x+w/2,-2+h/2,z-r()*3);m.userData.ownGeo=true;LG.add(m);
      const sh=(2+r()*5)*k;const st=new THREE.Mesh(new THREE.ConeGeometry(w*.45,sh,6),mat);st.rotation.x=Math.PI;st.position.set(x+w/2+(r()-.5),ROWS+2-sh/2+1,z-r()*3);st.userData.ownGeo=true;LG.add(st);
      if(r()<.45){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.3+r()*.6),r()<.5?M.crystal:M.crystal2);c.position.set(x+w/2,-2+h+.2,z+1.6);c.scale.y=1.8;c.userData.ownGeo=true;LG.add(c);const s=new THREE.Sprite(c.material===M.crystal?M.glowFireP:M.glowSlime);s.scale.set(3,3,1);s.position.copy(c.position);LG.add(s)}
      x+=w+r()*1.5}
  });
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(L.w+80,4,40),rockM2);ceil.position.set(L.w/2,ROWS+3.6,-10);ceil.userData.ownGeo=true;LG.add(ceil);
}

/* ---------- уровень ---------- */
let LG=null,chunks=[],ents={},cat=null,ghostCat=null,follower=null,hubFriends=[];
let catYaw=0,runPhase=0,squashT=0,dustT=0;
R.skin={color:'ginger',hat:'none',tail:'normal'};
R.setSkin=function(skin){R.skin={...skin};if(cat){scene.remove(cat)}cat=buildCat(R.skin);scene.add(cat);
  ents.shield=ents.shield||null;};
function inst(geo,mat,list,place,group,cast=true,colorFn){
  if(!list.length)return null;
  const m=new THREE.InstancedMesh(geo,mat,list.length),d=new THREE.Object3D();
  list.forEach((it,i)=>{place(d,it);d.updateMatrix();m.setMatrixAt(i,d.matrix);if(colorFn)m.setColorAt(i,colorFn(it))});
  m.castShadow=cast;m.receiveShadow=true;m.frustumCulled=false;group.add(m);return m;
}
function disposeGroup(g){g.traverse(o=>{if(o.isInstancedMesh&&o.dispose)o.dispose();if(o.userData&&o.userData.ownGeo&&o.geometry)o.geometry.dispose()})}

R.buildLevel=function(G,opts={}){
  const L=G.L;
  if(LG){scene.remove(LG);disposeGroup(LG)}
  LG=new THREE.Group();scene.add(LG);chunks=[];ents={};parts.length=0;
  const tone=new Map();for(const b of L.blds)for(let c=b.x0;c<b.x0+b.w;c++)tone.set(c,b.tone);
  const CW=24;
  for(let cx0=0;cx0<L.w;cx0+=CW){
    const grp=new THREE.Group();LG.add(grp);chunks.push({grp,x0:cx0,x1:cx0+CW});
    const br=[],rf=[],wOn=[],wOff=[],pl=[],sp=[],gh=[],sl=[];
    for(let ty=0;ty<ROWS;ty++)for(let tx=cx0;tx<Math.min(L.w,cx0+CW);tx++){
      const t=L.g[ty][tx];
      if(t===1){br.push([tx,ty]);const up=ty>0?L.g[ty-1][tx]:0;
        if(up!==1&&up!==4)rf.push([tx,ty]);
        else if(!L.cave&&(tx*7+ty*3)%9===0)((tx+ty)%2?wOn:wOff).push([tx,ty])}
      else if(t===6)sl.push([tx,ty])
      else if(t===2)pl.push([tx,ty]);
            else if(t===5)gh.push([tx,ty]);
    }
    inst(Geo.brick,M.brick,br,(d,[x,y])=>{d.position.set(x+.5,ROWS-y-.5,0);d.scale.set(1,1,1)},grp,true,([x])=>{const v=tone.get(x)??.5;return tmpC.setRGB(.82+v*.22,.82+v*.18,.86+(1-v)*.12)});
    inst(Geo.roof,M.roof,rf,(d,[x,y])=>d.position.set(x+.5,ROWS-y-.08,0),grp);
    inst(Geo.win,M.winOn,wOn,(d,[x,y])=>d.position.set(x+.5,ROWS-y-.5,1.502),grp,false);
    inst(Geo.win,M.winOff,wOff,(d,[x,y])=>d.position.set(x+.5,ROWS-y-.5,1.502),grp,false);
    inst(Geo.plank,M.plank,pl,(d,[x,y])=>d.position.set(x+.5,ROWS-y-.1875,0),grp);
    const spk=[];for(let ty=0;ty<ROWS;ty++)for(let tx=cx0;tx<Math.min(L.w,cx0+CW);tx++)if(L.g[ty][tx]===3)for(let i=0;i<4;i++)for(let k=0;k<3;k++)spk.push([tx+.125+i*.25,ROWS-ty-1+.25,-.7+k*.7]);
    inst(Geo.spike,M.spike,spk,(d,[x,y,z])=>d.position.set(x,y,z),grp);
    inst(new THREE.BoxGeometry(1,.14,2.6),M.slime,sl,(d,[x,y])=>d.position.set(x+.5,ROWS-y-1+.07,0),grp,false);
    const gm=inst(Geo.plank,M.ghost,gh,(d,[x,y])=>d.position.set(x+.5,ROWS-y-.1875,0),grp,false);
    if(gm){(ents.ghosts=ents.ghosts||[]).push(gm)}
  }
  // треснувшие стены — по отдельности, чтобы их можно было разбить
  ents.cracks=new Map();
  for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<L.w;tx++)if(L.g[ty][tx]===4){const m=new THREE.Mesh(Geo.brick,M.crack);m.position.set(tx+.5,ROWS-ty-.5,0);m.castShadow=m.receiveShadow=true;LG.add(m);ents.cracks.set(tx+','+ty,m)}
  // декор на крышах
  for(const d of L.decor)buildDecor(d);
  // фон: пещера или город
  const r=rng(11+(L.def?L.def.index||0:0)*7+(L.w|0));
  if(L.cave)buildCaveBg(L,r);
  else [[-9,0,3,10],[-24,1,7,22]].forEach(([z,layer,hmin,hmax])=>{
    let x=-35;
    while(x<L.w+35){
      const w=2+r()*4,h=hmin+r()*(hmax-hmin),dd=2+r()*3;
      const geo=new THREE.BoxGeometry(w,h,dd),uv=geo.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/1.6,uv.getY(i)*h/3.2);
      const m=new THREE.Mesh(geo,skyMat(layer,(r()*3)|0));
      m.position.set(x+w/2,-2+h/2,z-r()*3);m.userData.ownGeo=true;LG.add(m);
      x+=w+.3+r()*1.8;
    }
  });
  // предметы
  ents.stars=G.stars.map(s=>{const g=new THREE.Group(),m=new THREE.Mesh(Geo.star,M.star);m.castShadow=true;g.add(m);const gl=new THREE.Sprite(M.glowStar);gl.scale.set(1.3,1.3,1);g.add(gl);LG.add(g);return {g,m}});
  ents.hearts=G.hearts.map(h=>{const g=new THREE.Group(),m=new THREE.Mesh(Geo.heart,M.heart);m.castShadow=true;g.add(m);const gl=new THREE.Sprite(M.glowHeart);gl.scale.set(1.5,1.5,1);g.add(gl);g.position.set(wx(h.x),wy(h.y),0);LG.add(g);return {g,m}});
  ents.fish=G.fish.map(f=>{const g=new THREE.Group(),m=new THREE.Mesh(Geo.fish,M.fish);m.scale.setScalar(1.4);m.castShadow=true;g.add(m);const gl=new THREE.Sprite(M.glowFish);gl.scale.set(1.9,1.9,1);g.add(gl);LG.add(g);return {g,m}});
  ents.enemies=G.enemies.map(e=>{const o=buildEnemy(e.type);LG.add(o);return o});
  ents.shots=[];
  ents.movers=G.movers.map(m=>{const g=new THREE.Group();const w=m.W/T;box(w,.375,2.2,M.mover,0,-.1875,0,g);box(w+.04,.06,2.24,M.moverEdge,0,-.02,0,g,false);
    for(let i=0;i<w;i++)box(.08,.2,.08,M.moverEdge,-w/2+.5+i,-.45,1.05,g,false);LG.add(g);return g});
  ents.falls=G.falls.map(f=>{const g=new THREE.Group();box(1,.5,2.4,M.tileFall,.5,-.25,0,g);for(let i=0;i<3;i++)box(.3,.08,2.42,cmat(0x8a3a24),.17+i*.33,-.06,0,g,false);LG.add(g);return g});
  ents.springs=G.springs.map(s=>{const g=new THREE.Group();box(.8,.12,.8,M.springBase,0,.06,0,g);const coil=new THREE.Group();g.add(coil);
    for(let i=0;i<4;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.22,.035,6,14),M.coil);t.rotation.x=Math.PI/2;t.position.y=.1+i*.09;coil.add(t)}
    const pad=box(.7,.1,.7,M.pad,0,.48,0,g);g.position.set(wx(s.x)+.375,wy(s.y+8),0);LG.add(g);return {g,coil,pad}});
  ents.checks=G.checks.map(c=>{const g=new THREE.Group();cyl(.05,1.8,M.pole,0,.9,0,g);box(.28,.32,.28,M.pole,0,1.86,0,g);const lamp=box(.2,.24,.2,M.lampOff,0,1.86,0,g,false);
    box(.34,.05,.34,M.pole,0,2.05,0,g);const gl=new THREE.Sprite(M.glowLampOff);gl.scale.set(2,2,1);gl.position.set(0,1.86,.1);g.add(gl);g.position.set(wx(c.x+5),wy(c.y+30),-.6);LG.add(g);return {g,lamp,gl}});
  ents.winds=G.winds.map(w=>({w,ps:Array.from({length:Math.min(60,Math.ceil(w.w*w.h/(T*T)*.5)+8)},()=>({x:w.x+Math.random()*w.w,y:w.y+Math.random()*w.h,z:(Math.random()-.5)*2}))}));
  ents.updrafts=G.winds.filter(w=>w.fy).map(w=>{const s=new THREE.Sprite(M.glowUp);s.scale.set(w.w/T*1.6,w.h/T,1);s.position.set(wx(w.x+w.w/2),wy(w.y+w.h/2),.5);LG.add(s);return s});
  if(G.cage){const c=G.cage,g=new THREE.Group();const fm=buildFriend(c.friend);g.add(fm);
    const bars=new THREE.Group();g.add(bars);for(let i=0;i<5;i++)for(const z of [-.4,.4])box(.05,1.5,.05,M.bar,-.6+i*.3,.75,z,bars);
    box(1.4,.08,.9,M.bar,0,1.5,0,bars);box(1.4,.08,.9,M.bar,0,.02,0,bars);
    g.position.set(wx(c.x+12),wy(L.cage.top*T),0);LG.add(g);ents.cage={g,fm,bars,open:0};}
  if(G.goal)ents.goal=buildGoal(G.goal);
  if(ents.cage)decorateCage(ents.cage,G);
  ents.items=G.items.map(it=>{const g=buildItem(it.type);LG.add(g);return g});
  ents.drips=G.drips.map(d=>{const m=new THREE.Mesh(new THREE.ConeGeometry(.22,.9,7),M.drip);m.rotation.x=Math.PI;m.castShadow=true;m.userData.ownGeo=true;LG.add(m);return m});
  ents.geysers=G.geysers.map(g=>{const o=new THREE.Group();box(.8,.18,.8,M.rock,0,.09,0,o);const col=new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,4,10,1,true),M.fire);col.position.y=2;col.userData.ownGeo=true;o.add(col);
    const core=new THREE.Mesh(new THREE.CylinderGeometry(.1,.18,4,8,1,true),M.fireCore);core.position.y=2;core.userData.ownGeo=true;o.add(core);const gl=new THREE.Sprite(M.glowFireP);gl.scale.set(2.4,5,1);gl.position.y=2;o.add(gl);
    o.position.set(wx(g.x+6),wy(g.y+64),0);LG.add(o);return {o,col,core,gl}});
  ents.traps=[];
  ents.chaser=G.chase?buildChaser(G.chase.look):null;if(ents.chaser)LG.add(ents.chaser);
  if(G.boss){ents.boss=buildBoss(G.boss.king);LG.add(ents.boss)}
  // кот
  if(!cat)R.setSkin(R.skin);
  ents.shield=new THREE.Mesh(new THREE.SphereGeometry(.62,18,12),new THREE.MeshBasicMaterial({color:0x8affc8,transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending}));
  ents.shield.userData.ownGeo=true;LG.add(ents.shield);
  ents.slash=new THREE.Mesh(new THREE.RingGeometry(.35,.6,16,1,-Math.PI/2.2,Math.PI/1.1),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  ents.slash.userData.ownGeo=true;LG.add(ents.slash);
  if(ghostCat){scene.remove(ghostCat);ghostCat=null}
  R.ghost=opts.ghost||null;
  if(R.ghost){ghostCat=buildCat({},true);scene.add(ghostCat)}
  if(follower){scene.remove(follower);follower=null}
  hubFriends.forEach(f=>scene.remove(f));hubFriends=[];
  R.hub=!!L.hub;CAM_DIST=L.hub?11:L.arena?30:18;
  R._snap=true;
  R.applyLight(G);
};
function buildGoal(goal){
  const gx=wx(goal.x)+.5,gy=ROWS-11,g=new THREE.Group();g.position.set(gx,wy(goal.dy!==undefined?goal.dy+32:goal.y+32),0);LG.add(g);
  const fr=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.4,.5),M.frame);fr.position.set(0,1.2,-.6);fr.castShadow=true;fr.userData.ownGeo=true;g.add(fr);
  const dr=new THREE.Mesh(new THREE.PlaneGeometry(1,2),M.door);dr.position.set(0,1.05,-.34);dr.userData.ownGeo=true;g.add(dr);
  const gl=new THREE.Sprite(M.glowDoor);gl.scale.set(5,5,1);gl.position.set(0,1.1,-.2);g.add(gl);
  const pl=new THREE.PointLight(0xffd890,2.2,10,1.6);pl.position.set(0,1.3,1.4);g.add(pl);
  const st=new THREE.Mesh(Geo.star,M.star);st.scale.setScalar(1.4);st.position.set(0,2.85,-.4);g.add(st);
  return {g,star:st,light:pl,glow:gl,appear:0};
}
function buildDecor(d){
  const r=rng(d.seed*1e6|0),g=new THREE.Group(),x=d.col+.5,y=ROWS-d.top,z=-.9+r()*.3;
  if(K.G.L&&K.G.L.cave){
    const k=r();
    if(k<.35){for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.12+r()*.16),r()<.5?M.crystal:M.crystal2);c.position.set((r()-.5)*.6,.2,(r()-.5)*.4);c.scale.y=2;c.rotation.z=(r()-.5)*.6;c.userData.ownGeo=true;g.add(c)}const s=new THREE.Sprite(M.glowFireP);s.scale.set(1.4,1.4,1);s.position.y=.3;g.add(s)}
    else if(k<.65){for(let i=0;i<2+r()*2;i++){const hh=.15+r()*.3;cyl(.03,hh,cmat(0xd8d0c0),(r()-.5)*.6,hh/2,0,g);const cap=sph(.1+r()*.08,std({color:0x5affd0,emissive:0x1aa080,emissiveIntensity:1}),(r()-.5)*.1+g.children[g.children.length-1].position.x,hh,0,g);cap.scale.y=.5}}
    else if(k<.85){cyl(.04,.9,cmat(0x4a3424),0,.45,0,g);const f=new THREE.Sprite(glowMat(0xff8a3a,.9));f.scale.set(.9,1.2,1);f.position.y=1.05;f.userData.torch=r()*6;g.add(f)}
    else{box(.5,.08,.08,cmat(0xe8e0d0),0,.05,0,g);sph(.12,cmat(0xe8e0d0),.3,.1,0,g)}
    g.position.set(x,y,z);LG.add(g);return;
  }
  switch(d.type){
    case 'chimney':{const h=.5+r()*.7;box(.4,h,.4,M.deco,0,h/2,0,g);box(.5,.1,.5,M.decoLight,0,h,0,g);if(r()<.5){for(let i=0;i<3;i++){const s=sph(.08+i*.03,new THREE.MeshBasicMaterial({color:0x8a80b0,transparent:true,opacity:.18,depthWrite:false}),.05*i,h+.25+i*.25,0,g);s.castShadow=false;s.userData.smoke=i}}break}
    case 'antenna':{const h=1.2+r()*.8;cyl(.025,h,M.pole,0,h/2,0,g);for(let i=0;i<3;i++)box(.6-i*.15,.03,.03,M.pole,0,h*.55+i*.18,0,g);if(r()<.6){const l=sph(.05,basic({color:0xff4a5a}),0,h+.03,0,g);l.userData.blink=r()*6}break}
    case 'tank':{[-.25,.25].forEach(xx=>box(.05,.6,.05,M.pole,xx,.3,0,g));cyl(.35,.6,M.tank,0,.9,0,g);cone(.38,.25,M.decoLight,0,1.32,0,g);break}
    case 'vent':box(.5,.25,.35,M.decoLight,0,.12,0,g);box(.4,.04,.36,M.pole,0,.26,0,g);break;
    case 'dish':{cyl(.03,.4,M.pole,0,.2,0,g);const m=new THREE.Mesh(new THREE.SphereGeometry(.3,12,8,0,Math.PI*2,0,Math.PI/3),std({color:0xc0c0d8,side:THREE.DoubleSide,metalness:.6,roughness:.4}));m.position.y=.45;m.rotation.z=.7;m.rotation.y=r()*3;m.userData.ownGeo=true;g.add(m);break}
    case 'laundry':{const w=1.6;[0,w].forEach(xx=>cyl(.025,.9,M.pole,xx-w/2,.45,0,g));box(w,.01,.01,M.pole,0,.88,0,g,false);
      const cols=[0xff8fb0,0x8fd0ff,0xffe08a,0xb48ae0];for(let i=0;i<3;i++){const c=box(.26,.3,.01,cmat(cols[(r()*4)|0],{side:THREE.DoubleSide}),-w/2+.35+i*.45,.72,0,g,false);c.userData.sway=r()*6}break}
    case 'sign':{const words=['КОТ','24','КАФЕ','ОТЕЛЬ','МЯУ','ЛУНА','РЫБА','ЧАЙ','НОЧЬ'];const word=words[(r()*words.length)|0];
      const col=`rgb(${theme.win.join(',')})`;const tex=canvasTex(128,48,(c,w,h)=>{c.fillStyle='rgba(10,6,30,.85)';c.fillRect(0,0,w,h);c.strokeStyle=col;c.lineWidth=3;c.strokeRect(3,3,w-6,h-6);c.fillStyle=col;c.font='bold 26px system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(word,w/2,h/2+1)});
      [-.45,.45].forEach(xx=>cyl(.025,.6,M.pole,xx,.3,0,g));const p=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.45),basic({map:tex,transparent:true}));p.position.y=.82;p.userData.ownGeo=true;p.userData.neon=r()*6;g.add(p);break}
  }
  g.position.set(x,y,z);LG.add(g);
}
R.applyLight=function(G){
  if(!ents.ghosts)return;const on=G.abil&&G.abil.has('light');
  M.ghost.opacity=on?.78:.06;M.ghost.emissiveIntensity=on?.9:.4;
};
R.breakTile=function(tx,ty){const k=tx+','+ty,m=ents.cracks&&ents.cracks.get(k);if(m){LG.remove(m);ents.cracks.delete(k)}
  for(let i=0;i<14;i++)part(tx+.5+(Math.random()-.5)*.8,ROWS-ty-.5+(Math.random()-.5)*.8,{vx:(Math.random()-.5)*.12,vy:Math.random()*.12,vz:(Math.random()-.2)*.1,life:40,max:40,col:0xc8a088,grav:-.008,big:true})};
R.showFollower=function(id){if(follower)scene.remove(follower);follower=buildFriend(id);follower.position.copy(ents.cage?ents.cage.g.position:cat.position);scene.add(follower)};

/* Дом на крыше: друзья гуляют вокруг */
R.buildHub=function(G,friends){
  R.buildLevel(G);
  const L=G.L;
  const slots=[-1.3,1.3,-2.5,2.5,-3.6,-.6,.7,-4.6,3.5];hubFriends=friends.map((id,i)=>{const f=buildFriend(id);f.userData.home=18.5+slots[i%slots.length];f.position.set(f.userData.home,ROWS-10,i%2?.75:.3);scene.add(f);return f});
  // гирлянда и чердак
  const g=new THREE.Group();LG.add(g);
  const att=new THREE.Group();att.position.set(18.5,ROWS-10,-1.1);g.add(att);box(3.2,1.6,1.2,M.deco,0,.8,0,att);
  const rf=new THREE.Mesh(new THREE.ConeGeometry(2.4,1.1,4),M.decoLight);rf.rotation.y=Math.PI/4;rf.scale.set(1,1,.5);rf.position.y=2.15;rf.userData.ownGeo=true;att.add(rf);
  box(.7,.6,.02,basic({color:0xffcf6b}),-.7,.85,.61,att,false);box(.7,.6,.02,basic({color:0xffcf6b}),.7,.85,.61,att,false);box(.6,1,.02,cmat(0x5a3a2a),0,.5,.61,att,false);
  const cols=[0xff8fb0,0xffd85a,0x8fd0ff,0x9dff6a,0xd88aff];
  for(let i=0;i<22;i++){const x=7+i*1,y=ROWS-10+2.6-Math.sin(i/21*Math.PI)*.5;const b=sph(.06,basic({color:cols[i%5]}),x,y,.6,g);b.castShadow=false;const s=new THREE.Sprite(glowMat(cols[i%5],.5));s.scale.set(.6,.6,1);s.position.set(x,y,.62);g.add(s)}
  CAM_DIST=11;
};

R.clearHub=function(){hubFriends.forEach(f=>scene.remove(f));hubFriends=[]};

/* ---------- камера и кадр ---------- */
function effDist(){return CAM_DIST*Math.max(1,Math.min(1.9,1.45/camera.aspect))}
function clampCam(x){if(!K.G.L)return x;const halfW=effDist()*Math.tan(FOV*Math.PI/360)*camera.aspect;const W=K.G.L.w;if(W<halfW*2-2)return W/2;return Math.max(halfW-1,Math.min(W-halfW+1,x))}
R.toScreen=function(px,py){tmpV.set(wx(px),wy(py),0).project(camera);return {x:(tmpV.x*.5+.5)*100,y:(-tmpV.y*.5+.5)*100}};

R.frame=function(dt,now){
  const G=K.G,t=now/1000;if(!G.L||!LG){renderer.render(scene,camera);return}
  const P=G.P;
  // кот
  const cx=wx(P.x+P.w/2),cy=ROWS-(P.y+P.h)/T;
  cat.position.set(cx,cy,0);
  const U=cat.userData;
  const targetYaw=R.hub&&G.state!=='play'?-Math.PI/2+.0:(P.face>0?0:-Math.PI);
  catYaw+=(targetYaw-catYaw)*Math.min(1,dt*14);cat.rotation.y=catYaw;
  if(P.onGround&&!P._wg)squashT=1;P._wg=P.onGround;squashT*=Math.pow(.02,dt);
  U.body.scale.set(1+.15*squashT,1-.25*squashT,1+.15*squashT);
  const sp=Math.abs(P.vx);
  if(P.dash>0){U.body.rotation.z-=dt*28;U.body.position.y=.35}
  else{U.body.position.y=0;U.body.rotation.z=P.onGround?0:P.gliding?-.15:P.sliding?.3*P.wallDir:Math.max(-.5,Math.min(.5,-P.vy*.06))}
  if(P.onGround){runPhase+=sp*dt*9;U.legs.forEach(l=>l.rotation.z=Math.sin(runPhase+l.userData.phase)*.9*Math.min(1,sp))}
  else if(P.gliding)U.legs.forEach((l,i)=>l.rotation.z=i>1?-1.3:1.3);
  else U.legs.forEach((l,i)=>l.rotation.z=i>1?-.7:.7);
  if(P.paw>6)U.legs[2].rotation.z=-2.2;
  U.tail.rotation.z=.5+Math.sin(t*4)*.25+(sp*.3)+(P.gliding?.8:0);
  const hatSpin=U.head.children.find(c=>c.userData&&c.userData.spin);if(hatSpin)hatSpin.userData.spin.rotation.z=t*2;
  cat.visible=!(P.inv>0&&(G.frame>>2)%2);
  // пыль и следы
  if(G.state==='play'){
    if(P.onGround&&sp>1.3&&(dustT+=dt)>.07){dustT=0;dust(cx-P.face*.2,cy,1,P.face)}
    if(P.gliding&&Math.random()<.5)part(cx-P.face*.3,cy+.4,{vx:-P.face*.02,vy:.005,col:0xcfe8ff,life:24,max:24,grav:0});
    if(P.dash>0)for(let i=0;i<2;i++)part(cx-P.face*.2,cy+.35+(Math.random()-.5)*.4,{vx:-P.face*.05,col:0xffb070,life:18,max:18,grav:0,big:Math.random()<.4});
    if(P.sliding&&Math.random()<.6)part(cx+P.wallDir*.4,cy+.5,{vy:.02,col:0xa89fd8,life:16,max:16,grav:0});
  }
  // щит и удар
  ents.shield.visible=!!P.shield&&G.state!=='idle';ents.shield.position.set(cx,cy+.45,0);ents.shield.scale.setScalar(1+Math.sin(t*5)*.04);
  ents.slash.position.set(cx+P.face*.55,cy+.45,.3);ents.slash.rotation.y=P.face>0?0:Math.PI;ents.slash.material.opacity=P.paw>3?(P.paw-3)/9:0;
  // призрак
  if(ghostCat&&R.ghost){const i=Math.min(R.ghost.length/2-1,Math.floor(G.time/2))*2;if(i>=0){const gx=R.ghost[i],gyR=R.ghost[i+1],face=gyR<0?-1:1,gy=gyR<0?-gyR-1:gyR;
    ghostCat.position.set(wx(gx+6),ROWS-(gy+14)/T,-.3);ghostCat.rotation.y=face>0?0:-Math.PI;ghostCat.visible=true}}
  // друг, который летит следом
  if(follower&&G.friendFollow){const tx=cx-P.face*.9,ty=cy+(follower.userData.kind==='crow'||follower.userData.kind==='firefly'||follower.userData.kind==='owl'?1.1:0);
    follower.position.x+=(tx-follower.position.x)*Math.min(1,dt*4);follower.position.y+=(ty-follower.position.y)*Math.min(1,dt*(ty>cy?4:8));follower.position.z=.5;
    follower.rotation.y=tx>follower.position.x-.05?0:Math.PI;animFriend(follower,t,true)}
  // хаб: друзья гуляют
  hubFriends.forEach((f,i)=>{const h=f.userData.home;f.position.x=h+Math.sin(t*.4+i*1.7)*.4;f.rotation.y=Math.cos(t*.4+i*1.7)>0?0:Math.PI;animFriend(f,t+i,Math.abs(Math.cos(t*.4+i*1.7))>.3)});

  // камера
  let tx,ty;
  if(R.hub){tx=cx+(innerWidth>760&&innerHeight>520?3.4:innerHeight<=520?2.6:0);ty=ROWS-10+(innerWidth>innerHeight?1.4:-2.2)}
  else if(G.boss){tx=clampCam((cx+wx(G.boss.x+G.boss.w/2))/2);ty=7.2}
  else{tx=clampCam(cx+P.face*2.5);ty=6.3+Math.max(0,cy-8)*.55-(Math.max(0,4-cy))*.3}
  if(R._snap){camX=tx;camY=ty;R._snap=false}
  camX+=(tx-camX)*Math.min(1,dt*4);camY+=(ty-camY)*Math.min(1,dt*3);
  const sh=shake>0?shake:0;const sx=(Math.random()-.5)*.05*sh,sy=(Math.random()-.5)*.05*sh;if(shake>0)shake=Math.max(0,shake-dt*30);
  camera.position.set(camX+(R.hub?.8:1.6)+sx,camY+(R.hub?.9:1.4)+sy,effDist());camera.lookAt(camX,camY,0);
  sky.position.x=camX;
  moonLight.position.set(camX+9,24,18);moonLight.target.position.set(camX,3,0);
  // видимость чанков
  const half=effDist()*Math.tan(FOV*Math.PI/360)*camera.aspect+4;
  for(const c of chunks)c.grp.visible=c.x1>camX-half&&c.x0<camX+half;

  // предметы
  G.stars.forEach((s,i)=>{const e=ents.stars[i];e.g.visible=!s.got;if(!s.got){e.m.rotation.y=t*2.2+s.x*.1;e.g.position.set(wx(s.x),wy(s.y)+Math.sin(t*3+s.x)*.08,0)}});
  G.hearts.forEach((h,i)=>{const e=ents.hearts[i];e.g.visible=!h.got;if(!h.got){e.m.rotation.y=t*2;const b=1+Math.sin(t*6)*.08;e.m.scale.set(b,b,b)}});
  G.fish.forEach((f,i)=>{const e=ents.fish[i];e.g.visible=!f.got;if(!f.got){e.m.rotation.y=t*1.6;e.g.position.set(wx(f.x),wy(f.y)+Math.sin(t*2.4)*.12,0);if(Math.random()<.08)part(wx(f.x)+(Math.random()-.5)*.6,wy(f.y)+(Math.random()-.5)*.6,{col:0xffe08a,life:30,max:30,vy:.01,grav:0})}});
  // враги
  G.enemies.forEach((e,i)=>{
    let o=ents.enemies[i];if(!o){o=ents.enemies[i]=buildEnemy(e.type);LG.add(o)}
    const ex=wx(e.x+e.w/2),ey=wy(e.y+e.h/2);const U=o.userData;
    if(!e.alive){if(e.squash<25){o.visible=true;o.position.set(ex,ey-.3,0);o.scale.set(1+e.squash*.04,Math.max(.12,.35-e.squash*.01),1+e.squash*.04)}else o.visible=false;return}
    o.visible=true;
    if(e.type==='bat'){o.position.set(ex,ey,0);o.scale.setScalar(1);const f=e.mode==='hang'?Math.sin(t*2)*.2:Math.sin(t*22+i)*.9;U.wings[0].rotation.y=f;U.wings[1].rotation.y=-f;o.rotation.y=e.vx>0?.3:-.3;return}
    const vys=e.vy<-1?1.18:e.vy>1?.9:1;o.scale.set(1/Math.sqrt(vys),vys,1);
    o.position.set(ex,ey+Math.sin(t*5+e.x)*.05,0);
    const face=e.type==='shooter'?e.face:Math.sign(e.vx)||1;
    if(U.eyes)U.eyes.position.x=face*.08;o.rotation.y=face*.35;
    U.wisps.forEach((w,k)=>w.scale.y=.8+Math.sin(t*10+k*1.7)*.35);
    if(e.type==='shooter'){const ch=e.cd<25?1+(25-e.cd)/12:1;U.bigEye.scale.set(1.8*ch,1.8*ch,.8)}
    if(e.flash>0)o.position.x+=Math.sin(e.flash*3)*.05;
  });
  // шары
  let si=0;
  for(const s of G.shots){if(s.dead)continue;let o=ents.shots[si];
    if(!o){o=new THREE.Group();const m=new THREE.Mesh(Geo.shot,M.shot);o.add(m);const gl=new THREE.Sprite(M.glowShot);gl.scale.set(1.2,1.2,1);o.add(gl);const w=new THREE.Mesh(new THREE.ConeGeometry(.35,.6,10,1,true),M.wave);w.userData.ownGeo=true;o.add(w);o.userData={m,w};LG.add(o);ents.shots[si]=o}
    o.visible=true;o.position.set(wx(s.x),wy(s.y),0);o.userData.m.visible=!s.wave;o.userData.w.visible=!!s.wave;
    if(s.wave){o.userData.w.position.y=.1;o.userData.w.scale.y=1+Math.sin(t*30)*.2}
    else if(Math.random()<.3)part(wx(s.x),wy(s.y),{col:0xff5dd5,life:14,max:14,grav:0});
    si++}
  for(;si<ents.shots.length;si++)ents.shots[si].visible=false;
  // платформы
  G.movers.forEach((m,i)=>ents.movers[i].position.set(wx(m.x)+m.W/T/2,wy(m.yy),0));
  G.falls.forEach((f,i)=>{const o=ents.falls[i];o.visible=f.st!=='gone';o.position.set(wx(f.x)+(f.st==='shake'?(Math.random()-.5)*.08:0),wy(f.y),0)});
  G.springs.forEach((s,i)=>{const e=ents.springs[i];const c=s.t>0?Math.sin(s.t/14*Math.PI)*.5:0;const k=s.t>7?1-c*.6:1+c*.3;e.coil.scale.y=k;e.pad.position.y=.12+.36*k});
  G.checks.forEach((c,i)=>{const e=ents.checks[i];e.lamp.material=c.on?M.lampOn:M.lampOff;e.gl.material=c.on?M.glowLampOn:M.glowLampOff;if(c.on)e.gl.scale.setScalar(2+Math.sin(t*6)*.2)});
  // ветер
  const wp=[];
  ents.winds.forEach(({w,ps})=>{for(const p of ps){if(w.fy){p.y-=1.6;if(p.y<w.y)p.y=w.y+w.h}else{p.x+=w.fx*5;if(p.x<w.x)p.x=w.x+w.w;if(p.x>w.x+w.w)p.x=w.x}
    if(Math.random()<.25)part(wx(p.x),wy(p.y),{z:p.z,vx:w.fx*.15,vy:w.fy?.08:0,col:w.fy?0x9ad8ff:0xcfd8ff,life:8,max:8,grav:0,drag:1})}});
  ents.updrafts.forEach(s=>{s.material.opacity=.1+Math.sin(t*3)*.04});
  // клетка
  if(ents.cage){const c=ents.cage;animFriend(c.fm,t,false);
    if(G.cage&&G.cage.open){c.open=Math.min(1,c.open+dt*2);c.bars.scale.set(1+c.open,1-c.open,1+c.open);c.bars.visible=c.open<1;c.fm.visible=!follower}}
  // дверь
  if(G.goal){if(!ents.goal)ents.goal=buildGoal(G.goal);const gp=ents.goal;gp.appear=Math.min(1,gp.appear+dt*1.5);gp.g.scale.setScalar(G.boss?gp.appear:1);
    gp.star.rotation.y=t*1.5;const f=.85+Math.sin(t*3)*.15;gp.light.intensity=2.2*f;gp.glow.material.opacity=.4+.15*f;
    const locked=G.cage&&!G.cage.open;M.door.color.setHex(locked?0x7a6aa8:0xffe9a8);gp.glow.visible=!locked}
  // вещи
  G.items.forEach((it,i)=>{const o=ents.items[i];o.visible=!it.got;if(!it.got){o.position.set(wx(it.x),wy(it.y)+Math.sin(t*2.6+i)*.1,0);o.userData.m.rotation.y=t*1.8;if(Math.random()<.06)part(wx(it.x)+(Math.random()-.5)*.6,wy(it.y)+(Math.random()-.5)*.6,{col:0xffe08a,life:26,max:26,vy:.012,grav:0})}});
  // клетка: замки и цепи исчезают по мере находок
  if(ents.cage&&ents.cage.locks){const c=ents.cage;const h=G.have||{};
    c.locks.forEach(([type,m],k)=>{const idx=c.locks.filter(([tt],kk)=>tt===type&&kk<k).length;m.visible=idx>=(h[type]||0)&&!(G.cage&&G.cage.open)});
    const ready=K.cageReady&&K.cageReady();if(c.readyGlow){c.readyGlow.visible=ready&&!(G.cage&&G.cage.open);c.readyGlow.material.opacity=.4+Math.sin(t*5)*.25}
    if(c.hang){const down=(h.rope||0)>=(G.need.rope||0);c.hangY=c.hangY===undefined?1.6:c.hangY+((down?0:1.6)-c.hangY)*Math.min(1,dt*2);c.g.position.y=c.baseY+c.hangY;const len=7.5-c.hangY;c.ropeLine.scale.y=len;c.ropeLine.position.y=1.5+len/2;c.hook.position.y=9-c.hangY}}
  // сталактиты
  G.drips.forEach((d,i)=>{const m=ents.drips[i];m.visible=d.st!=='gone';m.position.set(wx(d.x+4)+(d.st==='shake'?(Math.random()-.5)*.06:0),wy(d.y)-.45,0)});
  // гейзеры
  G.geysers.forEach((g,i)=>{const e=ents.geysers[i];const on=g.on;e.col.visible=e.core.visible=e.gl.visible=on;if(on){e.col.scale.set(1+Math.sin(t*30)*.08,1,1+Math.cos(t*27)*.08);if(Math.random()<.6)part(wx(g.x+6)+(Math.random()-.5)*.5,wy(g.y+64)+Math.random()*4,{vy:.06,col:0xc07aff,life:20,max:20,grav:0,big:Math.random()<.4})}
    else if(g.warn&&Math.random()<.5)part(wx(g.x+6)+(Math.random()-.5)*.5,wy(g.y+64)+.2,{vy:.04,col:0x9a5aff,life:16,max:16,grav:0})});
  // ловушки
  if(G.traps)G.traps.forEach((tr,i)=>{let o=ents.traps[i];if(!o){o=ents.traps[i]=buildTrap(tr.tier);o.position.set(wx(tr.x+8),wy(tr.y+8),.3);LG.add(o)}
    o.userData.armed.visible=tr.armed;o.userData.sprung.visible=!tr.armed;if(tr.armed)o.userData.armed.rotation.y=Math.sin(t*2)*.2});
  // пёс
  if(ents.chaser&&G.chase){const C=G.chase,o=ents.chaser,U=o.userData;o.visible=C.on;
    if(C.on){const x=wx(C.x+6),y=ROWS-(C.y+14)/T;const lx=o.position.x;o.position.set(x,y,-.15);
      const ty=C.face>0?0:Math.PI;U.yaw=(U.yaw??ty);U.yaw+=(ty-U.yaw)*Math.min(1,dt*10);o.rotation.y=U.yaw;
      const moving=C.stun===0&&Math.abs(x-lx)>.001;U.run=(U.run||0)+(moving?dt*(C.boost>0?26:16):0);
      U.legs.forEach((l,k)=>l.rotation.z=moving?Math.sin(U.run+(k%2?Math.PI:0)+(k>1?1.2:0))*.8:0);
      U.body.position.y=moving?Math.abs(Math.sin(U.run))*.06:0;U.tail.rotation.z=.6+Math.sin(t*12)*.4;
      U.eyes.forEach(e=>{if(!e.userData.s)e.userData.s=e.scale.clone();e.scale.copy(e.userData.s).multiplyScalar(C.warn>0?1.8+Math.sin(t*40)*.5:1)});
      U.dizzy.visible=C.stun>0;U.dizzy.children.forEach((s,k)=>{const a=t*5+k*2.1;s.position.set(Math.cos(a)*.45,1.05,Math.sin(a)*.45)});
      if(Math.random()<(C.boost>0?.9:.35))part(x-C.face*.5+(Math.random()-.5)*.4,y+.3+Math.random()*.5,{col:K.CHASERS[C.look].glow,life:24,max:24,vy:.01,grav:0,big:true})}}
  // босс
  if(G.boss&&ents.boss){const B=G.boss,o=ents.boss,U=o.userData;
    o.visible=!(B.dead);o.position.set(wx(B.x+B.w/2),wy(B.y+B.h)+B.h/T*.48,0);
    const blink=B.inv>0&&(G.frame>>2)%2;U.mat.emissive.setHex(blink?0xff5d8f:B.king?0x2a0f45:0x21104a);
    o.rotation.y=B.face*.4;U.armor.visible=!!B.armor;
    const st=B.st;let sx=1,sy=1;
    if(st==='tired'||st==='dazed'){sy=.85+Math.sin(t*4)*.03;sx=1.1}
    if(!B.king&&B.vy<-1){sy=1.15;sx=.9}
    if(st==='dying'){const k=1-Math.min(1,B.t/110);sx=sy=.3+k*.7;o.rotation.z=Math.sin(t*30)*.2}
    U.body.scale.set((B.king?2.1:1.8)*sx,(B.king?2.1:1.8)*sy,(B.king?2.1:1.8));
    U.wisps.forEach((w,k)=>w.scale.y=.8+Math.sin(t*10+k*1.7)*.35);
    U.dizzy.visible=st==='tired'||st==='dazed';U.dizzy.position.y=B.h/T*.55;U.dizzy.children.forEach((s,k)=>{const a=t*4+k*2.1;s.position.set(Math.cos(a)*.7,Math.sin(t*6+k)*.1,Math.sin(a)*.7);s.rotation.y=t*3});
    if(U.hands)U.hands.forEach((h,k)=>{h.position.y=-.05+Math.sin(t*3+k*2)*.08});
    if(U.cape)U.cape.rotation.x=Math.sin(t*2)*.1-.1;
    if(Math.random()<.3)part(wx(B.x+Math.random()*B.w),wy(B.y+B.h*Math.random()),{col:B.king?0x8a2cff:0x5a2a9a,life:30,max:30,vy:.02,grav:0,big:true});
  }
  // декор: дым, огоньки, вывески
  updateParticles();
  if(flashT>0){flashT-=dt}
  renderer.render(scene,camera);
};

/* ---------- реакция на события ---------- */
R.onEvent=function(e){
  const x=e.x!==undefined?wx(e.x):0,y=e.y!==undefined?wy(e.y):0;
  switch(e.t){
    case 'jump':dust(x,y,5);break;
    case 'djump':burst(x,y,0x9ad8ff,14,.1,{grav:0});for(let i=0;i<10;i++){const a=i/10*Math.PI*2;part(x,y,{vx:Math.cos(a)*.08,vy:Math.sin(a)*.04,col:0xffffff,life:18,max:18,grav:0,big:true})}break;
    case 'walljump':burst(x,y,0xa8ff9a,8,.08);break;
    case 'land':if(e.v>3)dust(x,y,Math.min(12,(e.v*1.6)|0));if(e.v>5.5)shake=Math.max(shake,3);break;
    case 'star':burst(x,y,0xffd85a,8,.1);break;
    case 'stomp':burst(x,y,0xff5d8f,14+e.combo*3,.14);shake=Math.max(shake,4+Math.min(6,e.combo));break;
    case 'smash':burst(x,y,0xffa86a,16,.16);shake=Math.max(shake,5);break;
    case 'hurt':burst(x,y,0xff5d8f,18,.15);shake=10;break;
    case 'fall':shake=8;break;
    case 'heart':burst(x,y,0xff8fb0,14);break;
    case 'fish':burst(x,y,0xffe08a,30,.18,{big:true});shake=3;break;
    case 'spring':burst(x,y,0xff8fd0,8,.08);break;
    case 'dash':dust(x,y-.4,6,e.dir);break;
    case 'break':R.breakTile(e.tx,e.ty);shake=Math.max(shake,4);break;
    case 'clank':burst(x,y,0xffffff,10,.12);shake=3;break;
    case 'shoot':burst(x,y,0xff6ad5,6,.06);break;
    case 'parry':case 'poof':burst(x,y,0xff9ae0,8,.08);break;
    case 'checkpoint':burst(x,y,0xffe08a,20,.12,{big:true});break;
    case 'shieldBreak':burst(x,y,0x8affc8,24,.18);shake=6;break;
    case 'rescue':burst(x,y,0xffd85a,40,.2,{big:true});R.showFollower(e.friend);break;
    case 'bossHit':burst(x,y,0xffffff,30,.25,{big:true});shake=14;break;
    case 'bossBoom':burst(x,y,0xff5d8f,10,.2,{big:true});shake=Math.max(shake,6);break;
    case 'bossDown':burst(x,y,0xffd85a,60,.3,{big:true});shake=20;break;
    case 'quake':dust(x,y,16);shake=Math.max(shake,8);break;
    case 'armorBreak':burst(x,y,0xc8d0ff,30,.22,{big:true});shake=10;break;
    case 'goalAppear':burst(x,y+1,0xffe9a8,40,.2,{big:true});break;
    case 'summon':burst(x,y,0x8a2cff,16,.12);break;
  }
};
R.lowPower=()=>lowPower;
R.info=()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles,geo:renderer.info.memory.geometries,tex:renderer.info.memory.textures});
})(window.KOT=window.KOT||{});
