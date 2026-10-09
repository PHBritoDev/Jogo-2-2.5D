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
    const arch=[],glow=[],ruins=[];
    // Arco monumental de pedra, com blocos talhados e luz violeta no vão.
    addBox(arch,-30,35,0,10,74,15,'#211d2b'); addBox(arch,30,35,0,10,74,15,'#292236');
    addBox(arch,-30,3,0,19,8,20,'#473b55'); addBox(arch,30,3,0,19,8,20,'#3c334b');
    for(let i=0;i<9;i++){
      const a=Math.PI-(i/8)*Math.PI,x=Math.cos(a)*30,y=52+Math.sin(a)*23;
      addBox(arch,x,y,0,13,10,15,i%2?'#392f49':'#51405f',Math.PI/2-a);
    }
    // Colunas frontais com bases, capitéis e frisos de pedra.
    for(const side of [-1,1]){
      addCylinder(arch,side*27,36,1.5,4.2,68,'#51465c',10,'#796984');
      addCylinder(arch,side*27,36,1.8,1.35,62,'#302a38',8,'#65556f');
      addBox(arch,side*27,4,1.5,17,7,19,'#62546c');
      addBox(arch,side*27,70,1.5,17,7,19,'#71617a');
      for(let i=0;i<5;i++) addBox(arch,side*27,13+i*10,2,12,.9,17,i%2?'#786884':'#3d3448');
    }
    addBox(arch,0,79,0,25,8,18,'#40374d');
    addBox(arch,0,84,-.5,15,3,16,'#74627d');
    addRing(arch,0,89,-1,8.5,8.5,1.7,'#8c7199',.78,24);
    // Ruínas laterais de pedra quebrada substituem as antigas silhuetas de árvores.
    for(const side of [-1,1]){
      addBox(ruins,side*49,28,5,15,56,18,side<0?'#17141f':'#201a27');
      addBox(ruins,side*49,59,5,22,7,22,'#332a3a',side*.025);
      addBox(ruins,side*56,48,7,13,27,17,'#211b29',side*-.08);
      addBox(ruins,side*60,70,7,20,8,18,'#2d2535',side*.04);
      addBox(ruins,side*44,7,5,25,12,24,'#30283a');
      addBox(ruins,side*67,25,8,12,31,13,'#18151f',side*.07);
    }
    const rubble=[[-66,10,8,17,9,13,-.1],[-58,16,9,13,7,12,.08],[-72,35,8,12,19,12,-.12],[63,13,9,19,11,15,.1],[70,39,9,13,17,14,-.08]];
    for(const r of rubble) addBox(ruins,r[0],r[1],r[2],r[3],r[4],r[5],'#292331',r[6]);
    // Degraus em primeiro plano; semitransparentes para não esconder o jogador 2D.
    for(let i=0;i<6;i++){
      const y=-2-i*2.5,z=1+i*2.1,half=31+i*7.5,depth=2.7;
      addQuad(arch,[-half,y,z],[half,y,z],[half,y,z+depth],[-half,y,z+depth],color(i%2?'#51475b':'#413849',.38));
      addQuad(arch,[-half,y-2,z+depth],[half,y-2,z+depth],[half,y,z+depth],[-half,y,z+depth],color('#292431',.46));
    }
    addPlane(glow,0,39,-14,43,59,'#180d2a',.94);
    addRing(glow,0,40,-8,21,31,4,'#a92cff',.98,44);
    addRing(glow,0,40,-9,15,24,2.1,'#e28cff',.92,36);
    addRing(glow,0,40,-10,10,18,1.3,'#7022ff',.9,32);
    for(let i=0;i<55;i++){
      const a=(i*2.399)%Math.PI*2,rad=8+(i*19%38),x=Math.cos(a)*rad,y=15+(i*29%63);
      addBox(glow,x,y,-11,1.6,1.6,.5,i%5?'#cf70ff':'#ffe0ff');
    }
    return {arch:mesh(S.gl,arch),glow:mesh(S.gl,glow),ruins:mesh(S.gl,ruins)};
  }
  function buildArena() {
    const world=[],portal=[],mist=[],player=[],bishop=[];

    // Uma estrada de terra atravessa a dimensão; bosque fechado e raízes
    // substituem a praça aberta. Geometria deliberadamente low-poly para mobile.
    addBox(world,0,-.38,-1.5,48,.72,42,'#08100f');
    addBox(world,0,-.015,-1.5,5.55,.09,37,'#302b25');
    addBox(world,-2.91,.015,-1.5,.24,.11,36,'#171b17');
    addBox(world, 2.91,.015,-1.5,.24,.11,36,'#171b17');

    // Cascalho, folhas e sulcos baixos mantêm a estrada legível durante o combate.
    for(let i=0;i<32;i++){
      const z=14-(i*.91),x=((i*17)%31)/31*3.9-1.95;
      const w=.12+(i%4)*.075,d=.12+(i%3)*.09;
      addBox(world,x,.045,z,w,.055,d,i%4===0?'#555044':(i%2?'#403b31':'#39372f'),(i%5)*.13);
      if(i%3===0)addBox(world,x+(i%2?.42:-.42),.037,z-.28,.48,.035,.06,'#24251f',(i%2?.2:-.2));
    }
    // Raízes expostas e pedras formam ombros naturais; as colisões usam esse
    // mesmo corredor em vez de prender o jogador à antiga sala retangular.
    for(let i=0;i<16;i++){
      const z=12-i*1.7,side=i%2?1:-1;
      addBox(world,side*(3.05+(i%3)*.17),.075,z,.62+(i%3)*.18,.18,.38+(i%2)*.22, i%3?'#292b26':'#37352f',side*.18);
      addBox(world,side*(2.72+(i%2)*.12),.12,z+.18,1.08,.22,.19,'#343129',-side*.22);
    }

    // Fileiras alternadas de árvores altas, troncos torcidos, galhos e copas
    // escuras fecham a vista lateral sem cobrir o centro da estrada.
    for(let i=0;i<11;i++){
      const z=13.7-i*3.05+(i%2?.78:-.42);
      for(let side=-1;side<=1;side+=2){
        const x=side*(4.05+(i*7%5)*.54+((i+side+2)%2)*.24);
        const h=8.2+(i*7%5)*.72,lean=side*(.2+(i%3)*.08);
        const bark=i%3===0?'#292b2c':'#202626';
        addCylinder(world,x,h*.34,z,.28+(i%2)*.05,h*.68,bark,8,'#343536');
        addCylinder(world,x+lean,h*.79,z,.2+(i%2)*.035,h*.38,bark,8,'#343536');
        addBox(world,x+side*.38,h*.67,z,1.72,.12,.16,'#272b2d',side*.48);
        addBox(world,x-side*.16,h*.85,z+.06,1.22,.1,.14,'#292b2e',-side*.54);
        if(i%3===0)addBox(world,x+side*.2,h*.93,z-.08,.9,.09,.12,'#24282b',side*.62);
        if(i%3===1)addCone(world,x+lean*.4,h*.91,z,.72,2.05,'#151d1e',6);
        addBox(world,x-side*.38,.12,z+.3,1.2,.2,.65,'#272925',side*.2);
      }
    }
    // Uma segunda fileira mais distante interrompe as linhas regulares e
    // fecha o horizonte com silhuetas de árvores de alturas variadas.
    for(let i=0;i<8;i++){
      const side=i%2?1:-1,x=side*(7.1+(i%3)*.75),z=12.1-i*3.9+(i%2)*1.25,h=9+(i*5%4)*.9;
      addCylinder(world,x,h*.48,z,.3,h*.96,i%2?'#151d20':'#1c2023',7,'#2b2d31');
      addBox(world,x+side*.35,h*.76,z,1.7,.12,.16,'#1d2326',side*.42);
      addBox(world,x-side*.18,h*.89,z+.08,1.18,.1,.13,'#202528',-side*.5);
      if(i%2===0)addCone(world,x,h*.92,z,.85,2.2,'#11191b',6);
    }

    // Névoa baixa e rarefeita em três planos curtos; sem pós-processamento caro.
    addPlane(mist,0,1.0,-10,8.4,1.15,'#9cabb7',.055);
    addPlane(mist,0,.82,-3.5,7.5,.75,'#8297a5',.038);
    addPlane(mist,0,.72,4.5,7.2,.6,'#83919b',.028);

    // O arco violeta ao fim da estrada liga visualmente a dimensão ao portal
    // da campanha e oferece uma silhueta distante, sem bloquear o chefe.
    addBox(portal,-2.05,2.15,-18.35,.48,4.25,.72,'#34303e');
    addBox(portal, 2.05,2.15,-18.35,.48,4.25,.72,'#34303e');
    addBox(portal,0,4.45,-18.35,4.5,.54,.72,'#393247');
    addBox(portal,0,.12,-18.35,4.8,.32,1.05,'#473d50');
    addBox(portal,-2.05,.18,-18.35,1.05,.36,1.05,'#4c4252');
    addBox(portal, 2.05,.18,-18.35,1.05,.36,1.05,'#4c4252');
    for(let i=0;i<7;i++){
      const a=Math.PI-(i/6)*Math.PI,x=Math.cos(a)*2.05,y=4.15+Math.sin(a)*1.35;
      addBox(portal,x,y,-18.35,.55,.48,.68,i%2?'#493e56':'#5a4a66',Math.PI/2-a);
    }
    addPlane(portal,0,2.2,-17.97,3.45,4.25,'#0d0b1a',.97);
    addRing(portal,0,2.2,-17.92,1.63,2.28,.14,'#a52cff',.9,40);
    addRing(portal,0,2.2,-17.88,1.3,1.95,.07,'#e77cff',.82,32);
    for(let i=0;i<36;i++){
      const a=(i*2.399)%Math.PI*2,rad=.12+(i*17%100)/100*1.15;
      const x=Math.cos(a)*rad,y=.55+(i*31%330)/100;
      addBox(portal,x,y,-17.84-(i%2)*.02,.035,.04,.016,i%7===0?'#ffd4ff':'#c65cff');
    }

    // Pontos frios de luz só nas bordas, deixando a silhueta do chefe visível.
    for(let i=0;i<12;i++){
      const side=i%2?1:-1,z=11-Math.floor(i/2)*3.5;
      addSphere(world,side*(3.25+(i%3)*.22),.38+(i%3)*.12,z,.075,i%3?'#7594a0':'#aa74c7',5,6);
    }

    // Marcadores provisórios: pontos de substituição para personagem e Bispo 3D.
    addCone(player,0,.58,0,.34,.86,'#438cbd',8); addSphere(player,0,1.13,0,.23,'#d6bda5',6,8); addBox(player,0,.86,-.02,.48,.12,.52,'#d8cfb7');
    addCone(bishop,0,.83,0,.55,1.26,'#29202f',10); addSphere(bishop,0,1.58,0,.25,'#b89cc4',6,8);
    addBox(bishop,0,1.61,-.24,.47,.11,.08,'#16111d'); addCone(bishop,0,2.02,0,.37,.5,'#6c36a0',8);
    addBox(bishop,0,.96,.38,.13,.78,.14,'#dbb55e');
    return {world:mesh(S.gl,world),mist:mesh(S.gl,mist),portal:mesh(S.gl,portal),player:mesh(S.gl,player),bishop:mesh(S.gl,bishop)};
  }
  function shader(gl,type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'shader inválido');return sh;}
  function initGL() {
    const gl=S.canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'}) || S.canvas.getContext('experimental-webgl');
    if(!gl){S.failed=true;return;}
    const vs='attribute vec3 aPosition; attribute vec4 aColor; uniform mat4 uMvp; varying vec4 vColor; void main(){gl_Position=uMvp*vec4(aPosition,1.0);vColor=aColor;gl_PointSize=3.0;}';
    const fs='precision mediump float; varying vec4 vColor; void main(){gl_FragColor=vColor;}';
    const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'programa WebGL inválido');
    S.gl=gl;S.program=program;gl.useProgram(program);S.aPosition=gl.getAttribLocation(program,'aPosition');S.aColor=gl.getAttribLocation(program,'aColor');S.uMvp=gl.getUniformLocation(program,'uMvp');
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
    const gameCanvas=document.getElementById('game');
    const gameRatio=gameCanvas?gameCanvas.width/(window.innerWidth||w):pxRatio;
    const unit=Camera.scale*pxRatio/gameRatio;
    const camX=Math.round((Camera.x+Camera.shakeX)*Camera.scale)/Camera.scale;
    const camY=Math.round((Camera.y+Camera.shakeY)*Camera.scale)/Camera.scale;
    const screenX=(Casino.door.x-camX)*unit, screenY=(Casino.door.y-camY)*unit;
    const monumentScale=1.85;
    const projection=ortho(0,w,0,h,-120,120), base=multiply(projection,multiply(translate(screenX,h-screenY,0),scale(unit*monumentScale,unit*monumentScale,unit*monumentScale)));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw(S.exterior.ruins,base);draw(S.exterior.arch,base);
    const pulse=.92+.08*Math.sin(Game.time*3.2), centerY=40+Math.sin(Game.time*1.6)*1.4, centerZ=-8;
    const glowModel=multiply(translate(0,centerY,centerZ),multiply(rotateZ(Game.time*.23),multiply(scale(pulse,pulse,1),translate(0,-40,8))));
    draw(S.exterior.glow,multiply(base,glowModel));
  }
  function insideFrame() {
    const gl=S.gl,w=S.canvas.width,h=S.canvas.height,room=Casino.room,unit=1/72;
    const px=(Player.x-(room.left+room.right)/2)*unit,pz=(Player.y-(room.top+room.bottom)/2)*unit;
    const eye=[px,4.8,pz+9.5],target=[px*.7,1.25,pz-3.5];
    const pv=multiply(perspective(1.02,w/h,.1,75),lookAt(eye,target,[0,1,0]));
    gl.clearColor(.008,.014,.021,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw(S.arena.world,pv);
    draw(S.arena.mist,pv);
    const pulse=1+.035*Math.sin(Game.time*2.6), centerY=2.2, centerZ=-18.84;
    const ringModel=multiply(translate(0,centerY,centerZ),multiply(rotateZ(Game.time*.48),multiply(scale(pulse,pulse,1),translate(0,-centerY,-centerZ))));
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
    const inside=!!(Casino.inside&&isBattleActive());
    document.body.classList.toggle('bishop-battle',inside);
    if(S.lost||S.failed||!S.gl){S.canvas.style.display='none';return;}
    try {
      resize();
      const exterior=!!(!Casino.inside&&Casino.discovered&&Campaign.flags.casinoDiscovered);
      const active=inside||exterior;
      S.canvas.style.display=active?'block':'none';
      if(!active)return;
      if(inside!==S.wasInside){S.wasInside=inside;S.canvas.style.opacity='1';}
      if(inside)insideFrame();else outsideFrame();
    } catch(err) { console.warn('Cena 3D de Valério indisponível; mantendo renderização 2D.',err);S.canvas.style.display='none';S.failed=true; }
  }
  function init() {
    if(S.canvas)return;
    S.canvas=document.createElement('canvas');S.canvas.id='valerio-dimension-3d';S.canvas.setAttribute('aria-hidden','true');
    S.canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;display:none;opacity:1;';
    document.body.appendChild(S.canvas);
    S.canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();S.lost=true;S.gl=null;S.canvas.style.display='none';});
    S.canvas.addEventListener('webglcontextrestored',function(){try{initGL();resize();}catch(err){S.failed=true;console.warn('Não foi possível restaurar WebGL:',err);}});
    try{initGL();resize();}catch(err){S.failed=true;console.warn('WebGL indisponível; o cenário 2D continua ativo.',err);}
  }
  function isBattleActive() {
    return !!(Casino&&Casino.inside&&Campaign&&Campaign.step&&Campaign.step.type==='bishop'&&Campaign.step.boss==='greedFirst'&&Campaign.st);
  }
  function enter() {
    if(!Casino.inside||!Campaign.step||Campaign.step.type!=='bishop'||Campaign.step.boss!=='greedFirst')return;
    const room=Casino.room;
    Player.x=(room.left+room.right)/2;
    Player.y=room.bottom-180;
    Player.z=0;Player.vx=Player.vy=Player.vz=0;Player.kx=Player.ky=0;
    Player.fx=0;Player.fy=-1;Player.floor=0;Player.onGround=true;Player.sy=Player.y;
    Camera.snap(Player);
  }
  function blocked(x,y,r) {
    if(!isBattleActive())return false;
    const room=Casino.room,cx=(room.left+room.right)/2,halfWidth=3.25*72;
    return x-r<cx-halfWidth||x+r>cx+halfWidth||y-r<room.top+125||y+r>room.bottom-95;
  }
  return {init:init,frame:frame,resize:resize,enter:enter,isBattleActive:isBattleActive,blocked:blocked};
})();
