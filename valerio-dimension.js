'use strict';

/*
 * VALERIO DIMENSION — lightweight WebGL scene for the first Bishop.
 * The campaign, collision, player and boss simulation stay in the existing
 * 2D systems. This module only renders the discovered portal and casino arena.
 * All geometry and shaders are local: no runtime CDN or model downloads.
 */
const BishopDimension = (function () {
  const S = {
    canvas: null, gl: null, program: null, aPosition: -1, aColor: -1,
    uMvp: null, exterior: null, arena: null, energy: null, particles: null,
    playerModel: null, bishopModel: null, failed: false, lost: false,
    wasInside: false, opacity: 1, lastWidth: 0, lastHeight: 0
  };

  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const color = function (hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha == null ? 1 : alpha];
  };
  const addTri = function (out, a, b, c, col) {
    out.push(a[0], a[1], a[2], col[0], col[1], col[2], col[3],
      b[0], b[1], b[2], col[0], col[1], col[2], col[3],
      c[0], c[1], c[2], col[0], col[1], col[2], col[3]);
  };
  function addQuad(out, a, b, c, d, col) {
    addTri(out, a, b, c, col); addTri(out, a, c, d, col);
  }
  function addBox(out, x, y, z, w, h, d, hex, rot) {
    const c = color(hex), co = Math.cos(rot || 0), si = Math.sin(rot || 0);
    const v = [[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,h/2,-d/2],[-w/2,h/2,-d/2],
      [-w/2,-h/2,d/2],[w/2,-h/2,d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]];
    for (let i=0;i<v.length;i++) { const px=v[i][0], py=v[i][1]; v[i]=[x+px*co-py*si,y+px*si+py*co,z+v[i][2]]; }
    const faces=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
    const shades=[.78,.58,.67,.92,1,.5];
    for(let i=0;i<faces.length;i++) { const f=faces[i], shade=shades[i], cc=[c[0]*shade,c[1]*shade,c[2]*shade,c[3]]; addQuad(out,v[f[0]],v[f[1]],v[f[2]],v[f[3]],cc); }
  }
  function addPlane(out, x, y, z, w, h, hex, alpha) {
    const c=color(hex,alpha);
    addQuad(out,[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z],c);
  }
  function addCylinder(out, x, y, z, radius, height, hex, sides, topHex) {
    const c=color(hex), tc=color(topHex || hex), n=sides || 10, base=y-height/2, top=y+height/2;
    for(let i=0;i<n;i++) {
      const a=i/n*Math.PI*2, b=(i+1)/n*Math.PI*2;
      const p0=[x+Math.cos(a)*radius,base,z+Math.sin(a)*radius], p1=[x+Math.cos(b)*radius,base,z+Math.sin(b)*radius];
      const p2=[p1[0],top,p1[2]], p3=[p0[0],top,p0[2]];
      addQuad(out,p0,p1,p2,p3,[c[0]*(i%2?.86:1),c[1]*(i%2?.86:1),c[2]*(i%2?.86:1),c[3]]);
      addTri(out,[x,top,z],p3,p2,tc); addTri(out,[x,base,z],p1,p0,c);
    }
  }
  function addCone(out,x,y,z,r,h,hex,sides) {
    const c=color(hex),n=sides||10,base=y-h/2,tip=[x,y+h/2,z];
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,p=[x+Math.cos(a)*r,base,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,base,z+Math.sin(b)*r];addTri(out,p,q,tip,[c[0]*(.78+(i%3)*.09),c[1]*(.78+(i%3)*.09),c[2]*(.78+(i%3)*.09),c[3]]);addTri(out,[x,base,z],q,p,c);}
  }
  function addSphere(out,x,y,z,r,hex,lat,lon) {
    const c=color(hex),rows=lat||7,cols=lon||10;
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
      const t0=Math.PI*i/rows,t1=Math.PI*(i+1)/rows,p0=j*2*Math.PI/cols,p1=(j+1)*2*Math.PI/cols;
      const pt=(t,p)=>[x+r*Math.sin(t)*Math.cos(p),y+r*Math.cos(t),z+r*Math.sin(t)*Math.sin(p)];
      addQuad(out,pt(t0,p0),pt(t1,p0),pt(t1,p1),pt(t0,p1),[c[0]*(.78+.22*Math.sin(p0)),c[1]*(.78+.22*Math.sin(p0)),c[2]*(.78+.22*Math.sin(p0)),c[3]]);
    }
  }
  function addRing(out,x,y,z,rx,ry,tube,hex,alpha,segments) {
    const n=segments||48, sides=8, c=color(hex,alpha);
    for(let i=0;i<n;i++) for(let j=0;j<sides;j++) {
      const u=i/n*Math.PI*2,v=j/sides*Math.PI*2,u2=(i+1)/n*Math.PI*2,v2=(j+1)/sides*Math.PI*2;
      const pt=(a,b)=>[x+(rx+tube*Math.cos(b))*Math.cos(a),y+(ry+tube*Math.cos(b))*Math.sin(a),z+tube*Math.sin(b)];
      const k=.82+.18*Math.sin(u*5); const cc=[c[0]*k,c[1]*k,c[2]*k,c[3]];
      addQuad(out,pt(u,v),pt(u2,v),pt(u2,v2),pt(u,v2),cc);
    }
  }
  function mesh(gl, data) {
    const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    return {buffer,count:data.length/7};
  }
  function perspective(fov,aspect,near,far) {
    const f=1/Math.tan(fov/2), nf=1/(near-far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0];
  }
  function ortho(l,r,b,t,n,f) {
    return [2/(r-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n),0, -(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1];
  }
  function multiply(a,b) {
    const o=new Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    return o;
  }
  function translate(x,y,z){return [1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];}
  function scale(x,y,z){return [x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];}
  function rotateZ(a){const c=Math.cos(a),s=Math.sin(a);return[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
  function normalize(v){const n=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/n,v[1]/n,v[2]/n];}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function lookAt(eye,center,up){
    const z=normalize([eye[0]-center[0],eye[1]-center[1],eye[2]-center[2]]),x=normalize(cross(up,z)),y=cross(z,x);
    return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  }
  function buildExterior() {
    const arch=[],glow=[],trees=[];
    // Colunas rústicas e lintel em blocos; a energia anima separadamente.
    addBox(arch,-30,35,0,9,73,13,'#342d2d'); addBox(arch,30,35,0,9,73,13,'#382f2c');
    addBox(arch,-30,3,0,18,8,19,'#645044'); addBox(arch,30,3,0,18,8,19,'#5c493e');
    for(let i=0;i<7;i++){const a=Math.PI-(i/6)*Math.PI,x=Math.cos(a)*30,y=52+Math.sin(a)*23;addBox(arch,x,y,0,13,11,14,i%2?'#55453d':'#665348',Math.PI/2-a);}
    addPlane(glow,0,39,-4,43,59,'#180d2a',.94);
    addRing(glow,0,40,-8,21,31,4,'#a92cff',.98,44);
    addRing(glow,0,40,-9,15,24,2.1,'#e28cff',.92,36);
    addRing(glow,0,40,-10,10,18,1.3,'#7022ff',.9,32);
    // Troncos, galhos e copas no primeiro plano, como a trilha escura da referência.
    const treesSpec=[[-71,58,17],[-57,71,11],[-46,50,8],[48,57,10],[64,77,16],[79,53,10],[-82,32,10],[88,35,12]];
    for(let i=0;i<treesSpec.length;i++){const p=treesSpec[i],lean=(i%2?3:-3);addBox(trees,p[0],p[1]/2,5,7,p[1],8,i%2?'#281f20':'#352624',lean*.012);addBox(trees,p[0]+lean,p[1]*.74,5,23,2.2,4,'#2b2223',lean*.028);addBox(trees,p[0]-lean*.65,p[1]*.83,4,17,1.8,3,'#362929',-lean*.026);addCone(trees,p[0],p[1]+5,7,15,24,'#181b1c',6);}
    for(let i=0;i<55;i++){
      const a=(i*2.399)%Math.PI*2,rad=8+(i*19%38),x=Math.cos(a)*rad,y=15+(i*29%63);
      addBox(glow,x,y,-11,1.6,1.6,.5,i%5?'#cf70ff':'#ffe0ff');
    }
    return {arch:mesh(S.gl,arch),glow:mesh(S.gl,glow),trees:mesh(S.gl,trees)};
  }
  function buildArena() {
    const world=[],portal=[],particles=[],player=[],bishop=[];
    // Chão amplo com lajes; espaço aberto mantido para a luta futura.
    addBox(world,0,-.38,0,16,.72,14,'#17151f');
    for(let x=-7.5;x<=7.5;x+=1.15) addBox(world,x,.015,0,.025,.018,13.5,'#393341');
    for(let z=-6.4;z<=6.4;z+=1.1) addBox(world,0,.018,z,15.6,.02,.025,'#393341');
    addBox(world,0,.08,2.1,6.2,.12,7.2,'#28232f');
    // Escadaria central sobe até o arco roxo.
    for(let i=0;i<8;i++){
      const z=1.15-i*.78,h=.22+i*.018,y=.12+i*.18;
      addBox(world,0,y,z,5.5-i*.035,h,.8,'#39313e');
      addBox(world,0,y+h/2+.012,z+.36,5.35-i*.035,.035,.05,i%2?'#8760a5':'#664489');
    }
    // Ruínas laterais e torres quebradas.
    const pillars=[[-7,-4.4,5.1],[-6.6,0,4.3],[7,-4.2,5.7],[6.8,.2,3.8],[-7,4,3.2],[7,4.3,4.5]];
    for(let i=0;i<pillars.length;i++){const p=pillars[i];addBox(world,p[0],p[2]/2,p[1],.85,p[2],.95,i%2?'#272430':'#302b38');addBox(world,p[0],p[2],p[1],1.14,.23,1.2,'#45374d');addBox(world,p[0],.42,p[1],1.35,.62,1.4,'#423647');}
    for(let i=0;i<8;i++){
      const x=(i%2?1:-1)*(3.2+(i%4)*.88),z=-5.8+(i%4)*1.1,h=1.2+(i*7%9)*.25;
      addBox(world,x,h/2,z,.62,h,.8,i%3?'#282532':'#392b43');
      if(i%3===0)addBox(world,x+.22,h+.3,z,.7,.34,.88,'#534063',.15);
    }
    // Pilastras e arco monumental em pedras segmentadas.
    addBox(world,-2.2,1.85,-5.05,.66,3.7,.9,'#393141'); addBox(world,2.2,1.85,-5.05,.66,3.7,.9,'#393141');
    addBox(world,-2.2,.28,-5.05,1.08,.56,1.3,'#64516c'); addBox(world,2.2,.28,-5.05,1.08,.56,1.3,'#64516c');
    for(let i=0;i<9;i++){
      const a=Math.PI-(i/8)*Math.PI, x=Math.cos(a)*2.2, y=3.65+Math.sin(a)*1.55;
      addBox(world,x,y,-5.05,.7,.61,1.05,i%2?'#54415d':'#66506e',Math.PI/2-a);
    }
    addBox(world,0,5.4,-5.05,1.15,.34,1.1,'#43334e');
    // Pórtico, portal profundo e runas luminosas.
    addPlane(portal,0,3.0,-5.55,3.85,5.9,'#120b23',.98);
    addRing(portal,0,3.25,-5.86,1.56,2.48,.19,'#a52cff',.96,56);
    addRing(portal,0,3.25,-5.94,1.28,2.18,.085,'#e77cff',.92,48);
    addRing(portal,0,3.25,-6.02,.91,1.74,.055,'#7629fc',.9,42);
    for(let i=0;i<74;i++){
      const a=(i*2.399)%Math.PI*2,rad=.2+(i*17%100)/100*1.38,x=Math.cos(a)*rad,y=1.05+(i*31%420)/100;
      addBox(portal,x,y,-6.08-(i%3)*.018,.035+(i%3)*.012,.045+(i%4)*.012,.018,i%7===0?'#ffd4ff':'#c65cff');
    }
    // Lajes quebradas e brasas ao redor da praça.
    for(let i=0;i<30;i++){
      const a=i*2.4,rad=4.4+(i%5)*.38,x=Math.cos(a)*rad,z=1.5+Math.sin(a)*rad*.42;
      addBox(world,x,.12,z,.22+(i%3)*.12,.18,.28+(i%4)*.1,i%2?'#51475a':'#403847',a*.15);
    }
    addCone(player,0,.58,0,.34,.86,'#438cbd',10); addSphere(player,0,1.13,0,.23,'#d6bda5',7,10); addBox(player,0,.86,-.02,.48,.12,.52,'#d8cfb7');
    addCone(bishop,0,.83,0,.55,1.26,'#29202f',12); addSphere(bishop,0,1.58,0,.25,'#b89cc4',8,12);
    addBox(bishop,0,1.61,-.24,.47,.11,.08,'#16111d'); addCone(bishop,0,2.02,0,.37,.5,'#6c36a0',10);
    addBox(bishop,0,.96,.38,.13,.78,.14,'#dbb55e');
    return {world:mesh(S.gl,world),portal:mesh(S.gl,portal),player:mesh(S.gl,player),bishop:mesh(S.gl,bishop)};
  }
  function shader(gl,type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'shader inválido');return sh;}
  function initGL() {
    const gl=S.canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'}) || S.canvas.getContext('experimental-webgl');
    if(!gl){S.failed=true;return;}
    const vs='attribute vec3 aPosition; attribute vec4 aColor; uniform mat4 uMvp; varying vec4 vColor; void main(){gl_Position=uMvp*vec4(aPosition,1.0);vColor=aColor;gl_PointSize=3.0;}';
    const fs='precision mediump float; varying vec4 vColor; void main(){gl_FragColor=vColor;}';
    const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'programa WebGL inválido');
    S.gl=gl;S.program=program;S.aPosition=gl.getAttribLocation(program,'aPosition');S.aColor=gl.getAttribLocation(program,'aColor');S.uMvp=gl.getUniformLocation(program,'uMvp');
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    S.exterior=buildExterior();S.arena=buildArena();S.playerModel=S.arena.player;S.bishopModel=S.arena.bishop;
    S.lost=false;S.failed=false;
  }
  function resize() {
    if(!S.canvas||!S.gl)return;
    const w=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1),h=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);
    const dpr=Math.min(window.devicePixelRatio||1,1.35),bw=Math.max(1,Math.round(w*dpr)),bh=Math.max(1,Math.round(h*dpr));
    if(S.canvas.width!==bw||S.canvas.height!==bh){S.canvas.width=bw;S.canvas.height=bh;S.gl.viewport(0,0,bw,bh);}
    S.lastWidth=bw;S.lastHeight=bh;
  }
  function draw(m, matrix) {
    const gl=S.gl;if(!m||!m.buffer)return;
    gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.enableVertexAttribArray(S.aPosition);gl.enableVertexAttribArray(S.aColor);
    gl.vertexAttribPointer(S.aPosition,3,gl.FLOAT,false,28,0);gl.vertexAttribPointer(S.aColor,4,gl.FLOAT,false,28,12);
    gl.uniformMatrix4fv(S.uMvp,false,new Float32Array(matrix));gl.drawArrays(gl.TRIANGLES,0,m.count);
  }
  function outsideFrame() {
    if(!Casino.discovered&&!Campaign.flags.casinoDiscovered)return;
    const gl=S.gl, w=S.canvas.width, h=S.canvas.height, pxRatio=w/(window.innerWidth||w);
    const sx=(Casino.door.x-Camera.x)*Camera.scale+Camera.shakeX, sy=(Casino.door.y-Camera.y)*Camera.scale+Camera.shakeY;
    const screenX=sx*pxRatio, screenY=(window.innerHeight-sy)*h/(window.innerHeight||h), unit=Camera.scale*pxRatio;
    const projection=ortho(0,w,0,h,-120,120), base=multiply(projection,multiply(translate(screenX,h-screenY,0),scale(unit,unit,unit)));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw(S.exterior.trees,base);draw(S.exterior.arch,base);
    const pulse=.92+.08*Math.sin(Game.time*3.2), glow=multiply(base,multiply(translate(0,40+Math.sin(Game.time*1.6)*1.4,-7),multiply(rotateZ(Game.time*.23),scale(pulse,pulse,1))));
    draw(S.exterior.glow,glow);
  }
  function insideFrame() {
    const gl=S.gl,w=S.canvas.width,h=S.canvas.height,room=Casino.room,unit=1/72;
    const px=(Player.x-(room.left+room.right)/2)*unit,pz=(Player.y-(room.top+room.bottom)/2)*unit;
    const eye=[px,5.6,pz+10.5],target=[px*.7,1.65,pz-2.0];
    const pv=multiply(perspective(1.02,w/h,.1,75),lookAt(eye,target,[0,1,0]));
    gl.clearColor(.035,.025,.065,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw(S.arena.world,pv);
    const pulse=1+.035*Math.sin(Game.time*2.6), ringModel=multiply(translate(0,3.25,-5.78),multiply(rotateZ(Game.time*.48),scale(pulse,pulse,1)));
    draw(S.arena.portal,multiply(pv,ringModel));
    const bossStep=Campaign.step&&Campaign.step.type==='bishop'&&Campaign.step.boss==='greedFirst';
    const bossLive=bossStep&&(BishopBoss.state!=='inactive'||(Campaign.st&&Campaign.st.phase==='intro'));
    if(bossLive){
      const bossActive=BishopBoss.state!=='inactive';
      const bx=bossActive&&Number.isFinite(BishopBoss.x)?BishopBoss.x:Casino.bossStart.x,by=bossActive&&Number.isFinite(BishopBoss.y)?BishopBoss.y:Casino.bossStart.y;
      const bpos=[(bx-(room.left+room.right)/2)*unit,0,(by-(room.top+room.bottom)/2)*unit];
      draw(S.bishopModel,multiply(pv,translate(bpos[0],.08,bpos[2])));
    }
    if(!Player.dead){const jump=clamp(Player.z||0,0,60)*unit,model=multiply(translate(px,.04+jump,pz),scale(1,1,1));draw(S.playerModel,multiply(pv,model));}
  }
  function frame() {
    if(!S.canvas)return;
    if(S.lost||S.failed||!S.gl)return;
    try {
      resize();
      const inside=!!Casino.inside;
      const active=inside||(Casino.discovered&&Campaign.flags.casinoDiscovered);
      S.canvas.style.display=active?'block':'none';
      if(!active)return;
      if(inside!==S.wasInside){S.wasInside=inside;S.canvas.style.opacity=inside?'0.18':'1';if(inside)requestAnimationFrame(function(){if(S.canvas&&Casino.inside)S.canvas.style.opacity='1';});}
      if(inside)insideFrame();else outsideFrame();
    } catch(err) { console.warn('Cena 3D de Valério indisponível; mantendo renderização 2D.',err);S.canvas.style.display='none';S.failed=true; }
  }
  function init() {
    if(S.canvas)return;
    S.canvas=document.createElement('canvas');S.canvas.id='valerio-dimension-3d';S.canvas.setAttribute('aria-hidden','true');
    S.canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;display:none;opacity:1;transition:opacity .85s ease;';
    document.body.appendChild(S.canvas);
    S.canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();S.lost=true;S.gl=null;S.canvas.style.display='none';});
    S.canvas.addEventListener('webglcontextrestored',function(){try{initGL();resize();}catch(err){S.failed=true;console.warn('Não foi possível restaurar WebGL:',err);}});
    try{initGL();resize();}catch(err){S.failed=true;console.warn('WebGL indisponível; o cenário 2D continua ativo.',err);}
  }
  return {init:init,frame:frame,resize:resize};
})();
