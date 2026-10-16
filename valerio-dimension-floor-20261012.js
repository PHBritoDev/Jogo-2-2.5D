'use strict';

/* ============================================================
   VALERIO DIMENSION — arena do Primeiro Bispo da Ganância
   Ajustes mínimos para evitar o vácuo negro da floresta,
   reforçar o piso, ampliar a estrada e preservar a campanha.
   ============================================================ */
const BishopDimension = (function () {
  const S = {
    canvas: null, gl: null, program: null, aPosition: -1, aColor: -1,
     uMvp: null, uTime: null, uWind: null, uStorm: null, uLightning: null, exterior: null, arena: null, energy: null, particles: null,
    playerModel: null, bishopModel: null, failed: false, lost: false, treeColliders: [],
    spriteProgram: null, spritePosition: -1, spriteUv: -1, spriteMvp: null, spriteSampler: null,
    bishopTexture: null, bishopTextureLoaded: false, bishopQuad: null,
    wasInside: false, opacity: 1, lastWidth: 0, lastHeight: 0,
    canvasVisible: false,
    camera: { yaw: 0, pitch: -0.035, distance: 12.5, minDistance: 0.85, maxDistance: 22 },
    impactAt: 0, impactStrength: 0, treeGeometryRanges: [], sunScorches: [], removedTreeIds: new Set(), arenaSourceData: null
  };

  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const color = function (hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha == null ? 1 : alpha];
  };
  const addTri = function (out, a, b, c, col) {
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=normalize(cross(ab,ac)),light=normalize([-.42,.82,.38]);
    const diffuse=Math.abs(dot(n,light)),shade=.62+.38*diffuse;
    const lit=[Math.min(1,col[0]*shade),Math.min(1,col[1]*shade),Math.min(1,col[2]*shade),col[3]];
    out.push(a[0],a[1],a[2],lit[0],lit[1],lit[2],lit[3],
      b[0],b[1],b[2],lit[0],lit[1],lit[2],lit[3],
      c[0],c[1],c[2],lit[0],lit[1],lit[2],lit[3]);
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
  function addSphere(out,x,y,z,r,hex,lat,lon,sx,sy,sz) {
    const c=color(hex),rows=lat||7,cols=lon||10;
    const scaleX=sx==null?1:sx,scaleY=sy==null?1:sy,scaleZ=sz==null?1:sz;
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
      const t0=Math.PI*i/rows,t1=Math.PI*(i+1)/rows,p0=j*2*Math.PI/cols,p1=(j+1)*2*Math.PI/cols;
      const pt=(t,p)=>[x+r*scaleX*Math.sin(t)*Math.cos(p),y+r*scaleY*Math.cos(t),z+r*scaleZ*Math.sin(t)*Math.sin(p)];
      addQuad(out,pt(t0,p0),pt(t1,p0),pt(t1,p1),pt(t0,p1),[c[0]*(.78+.22*Math.sin(p0)),c[1]*(.78+.22*Math.sin(p0)),c[2]*(.78+.22*Math.sin(p0)),c[3]]);
    }
  }
  function addSegment(out,a,b,r0,r1,hex,sides) {
    const axis=normalize([b[0]-a[0],b[1]-a[1],b[2]-a[2]]);
    const ref=Math.abs(axis[1])<.9?[0,1,0]:[0,0,1];
    const u=normalize(cross(axis,ref)),v=cross(axis,u),n=sides||6,c=color(hex);
    for(let i=0;i<n;i++){
      const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;
      const radial=(t)=>[u[0]*Math.cos(t)+v[0]*Math.sin(t),u[1]*Math.cos(t)+v[1]*Math.sin(t),u[2]*Math.cos(t)+v[2]*Math.sin(t)];
      const d0=radial(a0),d1=radial(a1);
      const p0=[a[0]+d0[0]*r0,a[1]+d0[1]*r0,a[2]+d0[2]*r0];
      const p1=[a[0]+d1[0]*r0,a[1]+d1[1]*r0,a[2]+d1[2]*r0];
      const p2=[b[0]+d1[0]*r1,b[1]+d1[1]*r1,b[2]+d1[2]*r1];
      const p3=[b[0]+d0[0]*r1,b[1]+d0[1]*r1,b[2]+d0[2]*r1];
      const shade=i%3===0?.82:(i%3===1?1:.9);
      addQuad(out,p0,p1,p2,p3,[c[0]*shade,c[1]*shade,c[2]*shade,c[3]]);
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

  // ===== Cosmos visual (somente aparência): planetas, nebulosas, halos e auroras =====
  // Tudo é malha estática com cor por vértice; a lógica do jogo não é tocada.
  function hex3(hex){const n=parseInt(hex.slice(1),16);return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];}
  function mix3(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
  function pushV(out,p,c){out.push(p[0],p[1],p[2],c[0],c[1],c[2],c[3]);}
  function addVQuad(out,a,b,c,d,ca,cb,cc,cd){pushV(out,a,ca);pushV(out,b,cb);pushV(out,c,cc);pushV(out,a,ca);pushV(out,c,cc);pushV(out,d,cd);}
  // Planeta com faixas/manchas, luz direcional, terminador quente e brilho de atmosfera.
  function addPlanet(out,x,y,z,r,o){
    const rows=o.rows||18,cols=o.cols||30,seed=o.seed||0;
    const base=hex3(o.base),b1=hex3(o.b1||o.base),b2=hex3(o.b2||o.base),atmo=hex3(o.atmo||'#9ab8ff');
    const L=normalize([-.55,.5,.68]);
    const vert=function(i,j){
      const t=Math.PI*i/rows,p=2*Math.PI*j/cols;
      const n=[Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)];
      const lat=n[1];
      const swirl=Math.sin(p*3+lat*4+seed)*(o.swirl==null?.35:o.swirl);
      const band=.5+.5*Math.sin(lat*(o.freq||9)+swirl+seed);
      const bf=o.blotF||5;
      const blot=clamp(.5+.9*Math.sin(p*bf+lat*7+seed*1.7)*Math.sin(lat*bf*1.6-p*2+seed),0,1);
      let c=mix3(base,b1,band);
      c=mix3(c,b2,clamp(blot*(o.blot||0),0,1));
      const d=dot(n,L);
      const lit=clamp(d*1.1+.14,0,1);
      const shade=.17+.83*Math.pow(lit,.85);
      const term=Math.exp(-Math.pow((d-.04)*5.5,2))*(o.term==null?.30:o.term);
      const rim=Math.pow(1-clamp(n[2]*.55+.45,0,1),2.2)*.22*clamp(d+.6,0,1);
      return {p:[x+r*n[0],y+r*n[1],z+r*n[2]],c:[
        Math.min(1,c[0]*shade+atmo[0]*(term+rim)),
        Math.min(1,c[1]*shade+atmo[1]*(term+rim)),
        Math.min(1,c[2]*shade+atmo[2]*(term+rim)),1]};
    };
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
      const a=vert(i,j),b=vert(i+1,j),c=vert(i+1,j+1),d=vert(i,j+1);
      addVQuad(out,a.p,b.p,c.p,d.p,a.c,b.c,c.c,d.c);
    }
  }
  // Casca translúcida (atmosfera/halo) para ser desenhada de forma aditiva.
  function addShell(out,x,y,z,r,hex,alpha,rows,cols){
    const c=hex3(hex),nr=rows||8,nc=cols||16,col=[c[0],c[1],c[2],alpha];
    const pt=function(t,p){return[x+r*Math.sin(t)*Math.cos(p),y+r*Math.cos(t),z+r*Math.sin(t)*Math.sin(p)];};
    for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){
      const t0=Math.PI*i/nr,t1=Math.PI*(i+1)/nr,p0=j*2*Math.PI/nc,p1=(j+1)*2*Math.PI/nc;
      addVQuad(out,pt(t0,p0),pt(t1,p0),pt(t1,p1),pt(t0,p1),col,col,col,col);
    }
  }
  // Nuvem de nebulosa: disco elíptico com centro opaco e borda transparente.
  function addGlowDisc(out,x,y,z,rx,ry,hex,alpha,rot,seg){
    const c=hex3(hex),n=seg||20,cr=Math.cos(rot||0),sr=Math.sin(rot||0);
    const pt=function(a,k){const px=Math.cos(a)*rx*k,py=Math.sin(a)*ry*k;return[x+px*cr-py*sr,y+px*sr+py*cr,z];};
    const c0=[c[0],c[1],c[2],alpha],c1=[c[0],c[1],c[2],alpha*.42],c2=[c[0],c[1],c[2],0];
    for(let i=0;i<n;i++){
      const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;
      pushV(out,[x,y,z],c0);pushV(out,pt(a0,.5),c1);pushV(out,pt(a1,.5),c1);
      addVQuad(out,pt(a0,.5),pt(a1,.5),pt(a1,1),pt(a0,1),c1,c1,c2,c2);
    }
  }
  // Anel plano inclinado, em faixas concêntricas com pequenos vãos.
  function addPlanetRing(out,x,y,z,rIn,rOut,tiltX,tiltZ,hexes,alpha,seg){
    const n=seg||72,bands=hexes.length,cx=Math.cos(tiltX),sx=Math.sin(tiltX),cz=Math.cos(tiltZ),sz=Math.sin(tiltZ);
    const pt=function(a,r){
      let px=Math.cos(a)*r,py=0,pz=Math.sin(a)*r;
      const y1=py*cx-pz*sx,z1=py*sx+pz*cx;py=y1;pz=z1;
      const x2=px*cz-py*sz,y2=px*sz+py*cz;px=x2;py=y2;
      return[x+px,y+py,z+pz];
    };
    const span=rOut-rIn;
    for(let k=0;k<bands;k++){
      const r0=rIn+span*k/bands,r1=rIn+span*(k+1)/bands-span*.02,c=hex3(hexes[k]),al=alpha*(k%2?.72:1);
      for(let i=0;i<n;i++){
        const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2,sh=.74+.26*Math.sin(a0*3+k*1.3);
        const col=[c[0]*sh,c[1]*sh,c[2]*sh,al];
        addVQuad(out,pt(a0,r0),pt(a1,r0),pt(a1,r1),pt(a0,r1),col,col,col,col);
      }
    }
  }

  // Matriz reutilizada por draw(): evita alocar um Float32Array por chamada (dezenas por quadro) e a coleta de lixo resultante.
  const MVP_SCRATCH = new Float32Array(16);
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
  function rotateX(a){const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];}
  function rotateY(a){const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
  function normalize(v){const n=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/n,v[1]/n,v[2]/n];}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function lookAt(eye,center,up){
    const z=normalize([eye[0]-center[0],eye[1]-center[1],eye[2]-center[2]]),x=normalize(cross(up,z)),y=cross(z,x);
    return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  }
  function buildExterior() {
    const arch=[],glow=[],ruins=[];
    addBox(arch,-30,35,0,10,74,15,'#211d2b'); addBox(arch,30,35,0,10,74,15,'#292236');
    addBox(arch,-30,3,0,19,8,20,'#473b55'); addBox(arch,30,3,0,19,8,20,'#3c334b');
    for(let i=0;i<9;i++){
      const a=Math.PI-(i/8)*Math.PI,x=Math.cos(a)*30,y=52+Math.sin(a)*23;
      addBox(arch,x,y,0,13,10,15,i%2?'#392f49':'#51405f',Math.PI/2-a);
    }
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
    const sky=[],skyGlow=[],skyRings=[];
    const world=[],aurora=[],foliage=[],shadows=[],leaves=[],portal=[],energy=[],mistLayers=[],particles=[],player=[],bishop=[],playerArmL=[],playerArmR=[],playerLegL=[],playerLegR=[],bishopArmL=[],bishopArmR=[],bishopShoulders=[],bishopHead=[],bishopFace=[],bishopCrown=[],bishopHands=[];

    // Piso de suporte discreto: a grama real cobre toda a superfície jogável.
    // Sem estrada, pedras, cascalho, raízes soltas ou moitas sobre o terreno.
    addBox(world,0,-0.42,-2.5,132,0.8,78,'#18251a');
    addBox(world,0,-0.035,-2.5,128,0.12,72,'#20301d');

    // Céu cósmico em 3D: estrelas espalhadas em volta e abaixo da arena.
    // São apenas pequenas malhas estáticas, sem texturas ou shaders pesados.
    for(let i=0;i<145;i++){
      const x=Math.sin(i*127.1+4.2)*88;
      const y=-38+((i*37.7)%112);
      const z=-86+((i*53.3)%132);
      const size=i%13===0?.12:(i%4===0?.075:.045);
      const tint=i%9===0?'#b7a4ff':(i%7===0?'#9bdcff':'#dce7ff');
      addBox(world,x,y,z,size,size,size,tint);
    }
    // Cosmos da dimensão: nebulosas, planetas com faixas/atmosfera e anéis inclinados.
    // Corpos opacos (sky), halos/nebulosas aditivos (skyGlow) e anéis translúcidos (skyRings).
    // Nebulosas de fundo (violeta, azul, magenta, turquesa), grandes e suaves.
    [
      [-34,22,-66,30,13,'#5a2bd6',.20,.35],[-4,30,-70,34,12,'#2a63e0',.16,-.2],[30,24,-67,28,12,'#b034c4',.17,.3],
      [52,18,-62,22,10,'#1ab5b0',.13,-.4],[-56,16,-62,22,9,'#2f6bff',.14,.5],[8,16,-60,36,8,'#7a38e8',.12,0],
      [-20,36,-72,24,9,'#c43ccf',.12,.25],[40,34,-72,22,8,'#4a4ae8',.13,-.3],[-48,32,-70,18,8,'#18b8c8',.10,.2]
    ].forEach(function(n){addGlowDisc(skyGlow,n[0],n[1],n[2],n[3],n[4],n[5],n[6],n[7],22);});
    // Lua grande ao fundo (cratera/manchas) com halo pálido.
    addPlanet(sky,-39,17,-56,8.6,{base:'#cdb7f0',b1:'#9a86d8',b2:'#6b559e',blot:.75,blotF:7,freq:4,swirl:.15,seed:2.1,atmo:'#d8c4ff',term:.22,rows:20,cols:34});
    addShell(skyGlow,-39,17,-56,9.3,'#c8b0ff',.10,10,18);addShell(skyGlow,-39,17,-56,10.6,'#a68cff',.05,10,18);
    // Gigante azul com faixas claras e anel lavanda.
    addPlanet(sky,-34,24,-32,6.5,{base:'#3e5fd0',b1:'#9ec4ff',b2:'#2a3f9c',blot:.35,freq:11,swirl:.45,seed:.7,atmo:'#9cc8ff',rows:20,cols:34});
    addShell(skyGlow,-34,24,-32,7.0,'#6fa0ff',.14,10,18);addShell(skyGlow,-34,24,-32,7.9,'#4f7cff',.07,10,18);addShell(skyGlow,-34,24,-32,9.4,'#4f6cff',.03,10,18);
    addPlanetRing(skyRings,-34,24,-32,8.6,13.2,.30,.34,['#e4d6ff','#9c86e8','#f0e6ff','#7a68d0','#c6b4ff'],.62);
    // Planeta vermelho-alaranjado com tempestades e anel dourado.
    addPlanet(sky,31,27,-36,5.8,{base:'#e0583c',b1:'#ffc070',b2:'#8a2a2a',blot:.6,blotF:4,freq:13,swirl:.55,seed:3.4,atmo:'#ffb07a',rows:20,cols:34});
    addShell(skyGlow,31,27,-36,6.3,'#ff8a5a',.13,10,18);addShell(skyGlow,31,27,-36,7.2,'#ff6a4a',.06,10,18);addShell(skyGlow,31,27,-36,8.6,'#ff5a4a',.025,10,18);
    addPlanetRing(skyRings,31,27,-36,7.7,11.6,.28,-.38,['#ffe2a0','#e8b25a','#fff0c4','#c88a40'],.6);
    // Violeta com nuvens, dourado quente, turquesa anelado, rosa e pálido distante.
    addPlanet(sky,-43,26,-2,4.6,{base:'#8b4fe0',b1:'#d8a0ff',b2:'#4e2a9c',blot:.5,freq:8,swirl:.5,seed:5.2,atmo:'#d0a8ff',rows:16,cols:28});
    addShell(skyGlow,-43,26,-2,5.1,'#b27cff',.13,8,16);addShell(skyGlow,-43,26,-2,6.0,'#9a60ff',.05,8,16);
    addPlanet(sky,42,19,9,3.9,{base:'#e8b040',b1:'#fff0a8',b2:'#b0702a',blot:.4,freq:10,swirl:.3,seed:1.4,atmo:'#ffe090',rows:16,cols:28});
    addShell(skyGlow,42,19,9,4.3,'#ffcf60',.13,8,16);addShell(skyGlow,42,19,9,5.1,'#ffb840',.05,8,16);
    addPlanet(sky,-21,27,17,4.8,{base:'#2fb4a8',b1:'#a8fff0',b2:'#1a6e78',blot:.55,blotF:6,freq:9,swirl:.4,seed:6.1,atmo:'#9affea',rows:16,cols:28});
    addShell(skyGlow,-21,27,17,5.3,'#58e8d4',.13,8,16);addShell(skyGlow,-21,27,17,6.2,'#38d0c0',.05,8,16);
    addPlanetRing(skyRings,-21,27,17,6.4,9.0,.34,.30,['#b6fff2','#58d0c4','#d8fff8'],.58,60);
    addPlanet(sky,19,26,-57,4.0,{base:'#c4509c',b1:'#ffa8d8',b2:'#7a2a78',blot:.5,freq:9,swirl:.45,seed:4.3,atmo:'#ffb0e8',rows:16,cols:28});
    addShell(skyGlow,19,26,-57,4.5,'#ff7acb',.13,8,16);addShell(skyGlow,19,26,-57,5.4,'#e85ab8',.05,8,16);
    addPlanet(sky,3,32,-68,3.0,{base:'#cfe0f8',b1:'#ffffff',b2:'#8aa4d0',blot:.45,freq:7,swirl:.25,seed:7.7,atmo:'#e0f0ff',rows:14,cols:24});
    addShell(skyGlow,3,32,-68,3.4,'#b8d8ff',.12,8,16);addShell(skyGlow,3,32,-68,4.2,'#9ac0ff',.05,8,16);

    // FLORESTA MORTA DENSA: troncos muito próximos, fileiras sobrepostas e galhos retorcidos.
    // As laterais ficam próximas da área jogável para esconder o que existe atrás delas.
    const deadBark=['#392b22','#493528','#302923','#554031','#403027'];
    function deadTree(x,z,seed,scale){
      const treeId=seed;
      if(S.removedTreeIds.has(treeId)) return;
      const range={id:treeId,x:x,z:z,r:0.38*scale,worldStart:world.length,foliageStart:foliage.length,shadowsStart:shadows.length};
      S.treeColliders.push({id:treeId,x:x,z:z,r:0.38*scale});
      const variant=(seed*7)%11, h=(7.2+variant*.58)*scale;
      const lean=((seed%2)?1:-1)*(.22+(variant%4)*.12);
      const bark=deadBark[seed%deadBark.length];
      const mid=[x+lean*.45,h*.53,z+.10],top=[x+lean,h,z+((seed%3)-1)*.18];
      // Sombra falsa e estática no solo: uma elipse + poucos galhos projetados.
      // Um único mesh para toda a floresta evita shadow maps e draw calls por árvore.
      const shadowColor=color('#050807',.46),sy=.043;
      const shadowCx=x-(x<0?-1:1)*(1.02*scale),shadowCz=z+.52*scale;
      const rx=1.48*scale,rz=1.08*scale,segments=14;
      for(let si=0;si<segments;si++){
        const a0=si/segments*Math.PI*2,a1=(si+1)/segments*Math.PI*2;
        addTri(shadows,[shadowCx,sy,shadowCz],
          [shadowCx+Math.cos(a0)*rx,sy,shadowCz+Math.sin(a0)*rz],
          [shadowCx+Math.cos(a1)*rx,sy,shadowCz+Math.sin(a1)*rz],shadowColor);
      }
      // Três silhuetas alongadas sugerem sombras dos galhos sem simular luz em tempo real.
      for(let bi=0;bi<3;bi++){
        const bx=x+lean*(.38+bi*.13),bz=z+(bi-1)*.13*scale;
        const ex=bx-(x<0?-1:1)*(.95+bi*.24)*scale,ez=bz+(.42+bi*.12)*scale;
        const width=(.055-bi*.009)*scale;
        addQuad(shadows,[bx-width,sy,bz],[bx+width,sy,bz],
          [ex+width*.35,sy,ez],[ex-width*.35,sy,ez],color('#050807',.36));
      }
      addSegment(world,[x,.035,z],mid,.34*scale,.20*scale,bark,6);
      addSegment(world,mid,top,.20*scale,.045*scale,deadBark[(seed+2)%deadBark.length],6);
      // Filete frio discreto: sugere luz lunar nas arestas sem luz dinâmica.
      addSegment(foliage,[x-.13*scale,.28*scale,z-.20*scale],[top[0]-.055*scale,top[1]*.94,top[2]-.055*scale],.052*scale,.009*scale,'#a5c4d1',4);
      for(let j=0;j<6;j++){
        const dir=((seed+j)%2===0?-1:1);
        const yy=h*(.34+j*.092),xx=x+lean*(yy/h);
        const length=(1.05+((seed*3+j*5)%6)*.23)*scale;
        const end=[xx+dir*length,yy+(.52+((seed+j)%4)*.16)*scale,z+((j%3)-1)*.2*scale];
        addSegment(world,[xx,yy,z],end,.085*scale,.022*scale,bark,5);
        if(j%2===0){
          addSegment(world,end,[end[0]+dir*.52*scale,end[1]+.43*scale,end[2]+.10],.033*scale,.007*scale,deadBark[(seed+j+1)%deadBark.length],4);
        }
      }
      for(let k=0;k<4;k++){
        const rootDir=k<2?-1:1,rootZ=(k%2?1:-1)*.28*scale;
        addSegment(world,[x,.12,z],[x+rootDir*(.32+(k%2)*.22)*scale,.028,z+rootZ],.15*scale,.012*scale,bark,5);
      }
      range.worldEnd=world.length;range.foliageEnd=foliage.length;range.shadowsEnd=shadows.length;
      S.treeGeometryRanges.push(range);
    }
    // Quatro fileiras laterais em zigue-zague: árvores vizinhas se sobrepõem na visão.
    let treeSeed=1;
    for(let side of [-1,1]){
      for(let row=0;row<4;row++){
        const x=side*(9.3+row*3.0);
        for(let i=0;i<23;i++){
          const z=-30+i*2.65+(row%2)*1.28+(i%3)*.18;
          deadTree(x+((i%4)-1.5)*.34,z,treeSeed++,.88+((i+row)%4)*.075);
        }
      }
    }
    // Parede de fundo em duas fileiras, sem intervalos grandes entre troncos.
    for(let row=0;row<2;row++){
      const z=-31+row*3.0;
      for(let i=0;i<23;i++){
        const x=-28+i*2.55+(row%2)*1.15;
        deadTree(x,z+((i%3)-1)*.22,treeSeed++,.92+((i+row)%3)*.08);
      }
    }
    // Fecha também a borda dianteira, mas preserva uma passagem central para entrar/sair.
    for(let row=0;row<2;row++){
      const z=27-row*2.8;
      for(let i=0;i<24;i++){
        const x=-30+i*2.6+(row%2)*1.1;
        if(Math.abs(x)<6.2)continue;
        deadTree(x,z+((i%3)-1)*.2,treeSeed++,.9+((i+row)%4)*.07);
      }
    }

    // Folhas secas estilizadas: malha única, sem criar partículas novas a cada quadro.
    for(let i=0;i<42;i++){
      const x=-11+((i*37)%197)/197*22, y=.35+((i*23)%100)/100*3.8, z=-27+((i*41)%193)/193*54;
      const ang=(i*1.71)%Math.PI, len=.20+(i%4)*.055, wid=len*.38;
      const dx=Math.cos(ang)*len,dz=Math.sin(ang)*len,px=-Math.sin(ang)*wid,pz=Math.cos(ang)*wid;
      const c=color(i%3===0?'#d59b59':(i%3===1?'#9b6847':'#e0bb70'),.96);
      addTri(leaves,[x-dx*.5,y,z-dz*.5],[x+px,y+.025,z+pz],[x+dx,y+.015,z+dz],c);
      addTri(leaves,[x-dx*.5,y,z-dz*.5],[x+dx,y+.015,z+dz],[x-px,y-.008,z-pz],c);
    }
    // Céu noturno local da dimensão: estrelas geométricas baratas, sem alterar o mundo 2D.
    for(let i=0;i<132;i++){
      const seed=(i*37)%137/137;
      const x=-39+seed*78;
      const y=8+((i*29)%61)/61*17;
      const z=-8-((i*17)%71)/71*38;
      const r=.025+(i%4)*.012;
      const tone=i%9===0?'#b7c8ff':(i%5===0?'#f0d9a5':'#dce7ff');
      addSphere(world,x,y,z,r,tone,3,4);
    }
    // Auroras 3D em cortinas: borda inferior brilhante, raios verticais e gradiente verde→ciano→violeta→magenta.
    // Malha estática com cor por vértice (alfa → 0 no topo); o shader de vento faz as cortinas ondularem.
    // Desenhadas de forma aditiva e atrás da floresta (a profundidade preserva árvores e personagens).
    (function(){
      const palettes=[
        ['#8dffd2','#3cf5a0','#3fd9ff','#7a8cff','#b25cff','#ff5ccf'],
        ['#7dfff0','#3ee8d0','#4aa8ff','#6a7cff','#9a5cff','#e65cff'],
        ['#a8ffb0','#52f58a','#38e0c8','#58a0ff','#8a6cff','#d05cff'],
        ['#9affe8','#46f0b8','#4ac8ff','#7a94ff','#a864ff','#ff6ad8'],
        ['#c0ffb8','#6aff98','#40e8d8','#5a9cff','#9468ff','#ff62c8']
      ];
      const prof=[0,1,.62,.34,.16,.06,0], tt=[0,.1,.25,.45,.65,.85,1];
      const layers=5, cols=60, x0=-64, x1=64;
      for(let layer=0;layer<layers;layer++){
        const pal=palettes[layer].map(hex3);
        const yBase=8.5+layer*2.1, zBase=-40-layer*2.6, layerAlpha=.46-layer*.04;
        const colorAt=function(t){
          const f=clamp(t,0,1)*(pal.length-1),i=Math.min(pal.length-2,Math.floor(f));
          return mix3(pal[i],pal[i+1],f-i);
        };
        for(let i=0;i<cols;i++){
          const xa=x0+(x1-x0)*i/cols, xb=x0+(x1-x0)*(i+1)/cols;
          const info=function(x,idx){
            const ray=clamp(.55+.5*Math.sin(idx*1.9+layer*2.3)*Math.sin(idx*.63+layer)+.15*Math.sin(idx*4.1+layer),.12,1);
            return {
              ray:ray,
              y0:yBase+Math.sin(x*.09+layer*1.7)*2.4+Math.sin(x*.23+layer)*.9,
              h:11+layer*1.4+Math.sin(x*.13+layer*3)*3.5,
              z:zBase+Math.sin(x*.05+layer)*5
            };
          };
          const A=info(xa,i),B=info(xb,i+1);
          for(let r=0;r<tt.length-1;r++){
            const ta=tt[r],tb=tt[r+1];
            const ca=colorAt(ta),cb=colorAt(tb);
            const c00=[ca[0],ca[1],ca[2],prof[r]*A.ray*layerAlpha];
            const c10=[ca[0],ca[1],ca[2],prof[r]*B.ray*layerAlpha];
            const c11=[cb[0],cb[1],cb[2],prof[r+1]*B.ray*layerAlpha];
            const c01=[cb[0],cb[1],cb[2],prof[r+1]*A.ray*layerAlpha];
            addVQuad(aurora,[xa,A.y0+ta*A.h,A.z],[xb,B.y0+ta*B.h,B.z],[xb,B.y0+tb*B.h,B.z],[xa,A.y0+tb*A.h,A.z],c00,c10,c11,c01);
          }
        }
      }
    })();

    // Algumas estrelas maiores e discretas para dar profundidade ao céu.
    [[-13,14,-23],[8,17,-29],[21,12,-19],[-4,18,-34],[15,9,-31]].forEach((p,i)=>{
      addSphere(world,p[0],p[1],p[2],.075,i%2?'#c4d8ff':'#f2e4bd',4,5);
    });

    const mistSpecs=[
      [0,.56,8.5,.62,'#b8c5c7',.045],
      [-.6,.48,0, .72,'#9aadb3',.038],
      [.45,.42,-10.5, .82,'#b0bec1',.032]
    ];
    for(let i=0;i<mistSpecs.length;i++){
      const m=[],s=mistSpecs[i];
      addPlane(m,s[0],s[1],s[2],8.7,s[3],s[4],s[5]);
      addPlane(m,s[0]+(i%2?.9:-.9),s[1]+.08,s[2]-.55,6.2,s[3]*.72,'#82999f',s[5]*.72);
      mistLayers.push(mesh(S.gl,m));
    }

    for(let i=0;i<26;i++){
      const a=(i*2.399)%Math.PI*2,x=Math.cos(a)*(1.1+(i*17%100)/100*2.5);
      const y=.28+(i*13%100)/100*1.65,z=13-(i*19%360)/10;
      const size=.025+(i%3)*.012,c=color(i%5===0?'#d8c69b':'#a8c7bb',i%5===0?.48:.32);
      addQuad(particles,[x-size,y,z],[x,y+size,z],[x+size,y,z],[x,y-size,z],c);
    }

    const portalZ=-21.25,energyZ=-20.72;
    addBox(portal,-2.22,2.45,portalZ,.52,4.8,.82,'#514958');
    addBox(portal, 2.22,2.45,portalZ,.52,4.8,.82,'#5b5265');
    addBox(portal,0,5.0,portalZ,4.95,.62,.88,'#5d5369');
    addBox(portal,0,.12,portalZ,5.35,.34,1.24,'#61556d');
    addBox(portal,-2.22,.2,portalZ,1.18,.42,1.2,'#6a5a71');
    addBox(portal, 2.22,.2,portalZ,1.18,.42,1.2,'#62556d');
    for(let i=0;i<7;i++){
      const a=Math.PI-(i/6)*Math.PI,x=Math.cos(a)*2.22,y=4.62+Math.sin(a)*1.55;
      addBox(portal,x,y,portalZ,.58,.52,.78,i%2?'#5d526b':'#71617b',Math.PI/2-a);
    }
    addPlane(portal,0,2.48,energyZ-.07,3.85,4.65,'#100d1b',.98);
    addRing(portal,0,2.48,energyZ+.14,2.02,2.32,.18,'#71647a',1,40);
    addRing(energy,0,2.48,energyZ,1.78,2.36,.16,'#b63cff',.96,40);
    addRing(energy,0,2.48,energyZ+.045,1.43,2.02,.09,'#ee9bff',.9,36);
    addRing(energy,0,2.48,energyZ+.08,1.08,1.62,.055,'#a875ff',.78,32);
    for(let i=0;i<32;i++){
      const a=(i*2.399)%Math.PI*2,rad=.12+(i*17%100)/100*1.12;
      const x=Math.cos(a)*rad,y=.72+(i*31%350)/100;
      addBox(energy,x,y,energyZ+.12,.04,.05,.018,i%7===0?'#ffe0ff':'#d184ff');
    }

    for(let i=0;i<12;i++){
      const side=i%2?1:-1,z=12-Math.floor(i/2)*3.5;
      addSphere(world,side*(3.95+(i%3)*.24),.42+(i%3)*.12,z,.095,i%3?'#9bc0c2':'#c796e7',5,6);
    }

    addCone(player,0,.64,0,.39,.98,'#5486a1',8);
    addBox(player,0,.94,-.04,.56,.16,.5,'#b29b77');
    addSphere(player,0,1.3,0,.27,'#e6d2b8',6,8);
    // Valério: corpo low-poly 3D; a luta não depende mais de uma imagem plana.
    addCone(bishop,0,.86,0,.64,1.55,'#302239',12);
    addCone(bishop,0,.53,0,.68,.48,'#211728',12);
    addBox(bishop,0,.76,-.49,.13,.98,.055,'#a77b38');
    addBox(bishop,0,.58,-.49,.38,.11,.075,'#d1a654');
    addBox(bishop,-.22,.14,-.025,.23,.24,.34,'#17121d');
    addBox(bishop,.22,.14,-.025,.23,.24,.34,'#17121d');
    addSphere(bishopShoulders,0,0,0,.35,'#46304f',8,10,1.32,.64,.92);
    addSphere(bishopShoulders,-.34,-.02,0,.2,'#34213f',7,8,1,.85,1);
    addSphere(bishopShoulders,.34,-.02,0,.2,'#34213f',7,8,1,.85,1);
    addSphere(bishopHead,0,0,0,.29,'#9b829c',8,10,.86,1.12,.82);
    addBox(bishopFace,0,-.045,-.225,.35,.17,.075,'#17101f');
    addBox(bishopFace,-.095,.035,-.272,.075,.035,.025,'#ff354f');
    addBox(bishopFace,.095,.035,-.272,.075,.035,.025,'#ff354f');
    addCone(bishopCrown,0,.22,0,.31,.5,'#713b91',8);
    addSegment(bishopCrown,[-.18,.06,0],[-.37,.38,-.025],.085,.012,'#b17ad2',5);
    addSegment(bishopCrown,[.18,.06,0],[.37,.38,-.025],.085,.012,'#b17ad2',5);
    addSphere(bishopHands,0,0,0,.105,'#8f748e',7,8);
    // Membros separados para animação procedural leve, sem esqueleto externo.
    addSegment(playerArmL,[0,0,0],[-.18,-.34,-.025],.085,.055,'#171b20',6);
    addSegment(playerArmR,[0,0,0],[.18,-.34,-.025],.085,.055,'#171b20',6);
    addSegment(playerLegL,[0,0,0],[-.045,-.25,-.015],.095,.065,'#29232a',6);
    addSegment(playerLegR,[0,0,0],[.045,-.25,-.015],.095,.065,'#29232a',6);
    addSegment(bishopArmL,[0,0,0],[-.24,-.35,-.03],.095,.065,'#30213a',6);
    addSegment(bishopArmR,[0,0,0],[.24,-.35,-.03],.095,.065,'#30213a',6);
    return {
      world:mesh(S.gl,world),sky:mesh(S.gl,sky),skyGlow:mesh(S.gl,skyGlow),skyRings:mesh(S.gl,skyRings),aurora:mesh(S.gl,aurora),foliage:mesh(S.gl,foliage),shadows:mesh(S.gl,shadows),leaves:mesh(S.gl,leaves),grassAsset:null,mist:mistLayers,portal:mesh(S.gl,portal),
      sourceData:{world:world,foliage:foliage,shadows:shadows},
      energy:mesh(S.gl,energy),particles:mesh(S.gl,particles),
      player:mesh(S.gl,player),bishop:mesh(S.gl,bishop),
      playerArmL:mesh(S.gl,playerArmL),playerArmR:mesh(S.gl,playerArmR),
      playerLegL:mesh(S.gl,playerLegL),playerLegR:mesh(S.gl,playerLegR),
      bishopArmL:mesh(S.gl,bishopArmL),bishopArmR:mesh(S.gl,bishopArmR),
      bishopShoulders:mesh(S.gl,bishopShoulders),bishopHead:mesh(S.gl,bishopHead),
      bishopFace:mesh(S.gl,bishopFace),bishopCrown:mesh(S.gl,bishopCrown),bishopHands:mesh(S.gl,bishopHands)
    };
  }
  function shader(gl,type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'shader inválido');return sh;}
  function initBishopSprite(gl) {
    const vs='attribute vec3 aPosition; attribute vec2 aUv; uniform mat4 uMvp; varying vec2 vUv; void main(){gl_Position=uMvp*vec4(aPosition,1.0);vUv=aUv;}';
    const fs='precision mediump float; varying vec2 vUv; uniform sampler2D uTexture; void main(){vec4 texel=texture2D(uTexture,vUv);if(texel.a<=0.001)discard;gl_FragColor=texel;}';
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vs));
    gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program)||'shader da arte do Bispo inválido');
    S.spriteProgram=program;
    S.spritePosition=gl.getAttribLocation(program,'aPosition');
    S.spriteUv=gl.getAttribLocation(program,'aUv');
    S.spriteMvp=gl.getUniformLocation(program,'uMvp');
    S.spriteSampler=gl.getUniformLocation(program,'uTexture');
    // Quad vertical; as dimensões finais serão ajustadas à proporção real do PNG.
    // Isso evita achatar ou cortar o Bispo quando a arte é substituída por uma versão nova.
    S.bishopQuad=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,S.bishopQuad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
      -.9,.04,0, 0,1,
       .9,.04,0, 1,1,
       .9,3.15,0, 1,0,
      -.9,.04,0, 0,1,
       .9,3.15,0, 1,0,
      -.9,3.15,0, 0,0
    ]),gl.STATIC_DRAW);
    const texture=gl.createTexture();
    S.bishopTexture=texture;
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    // Enquanto a imagem carrega, usa o modelo geométrico existente como fallback.
    // A arte 2D do Bispo é só um recurso reserva (o GLB é o visual atual). Carregá-la no início custava
    // decodificar o PNG e subir uma textura grande à GPU sem nunca ser desenhada; agora é sob demanda.
    S.bishopSpriteRequested=false;S.bishopTextureLoaded=false;
    S.loadBishopSpriteImage=function(){
    const image=new Image();
    image.onload=function(){
      try {
        gl.bindTexture(gl.TEXTURE_2D,S.bishopTexture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        // Mantém a proporção natural da arte e dá mais presença ao Bispo na arena.
        const spriteHeight=1.65;
        const aspect=(image.naturalWidth>0&&image.naturalHeight>0)?image.naturalWidth/image.naturalHeight:0.667;
        const spriteWidth=Math.max(0.65,Math.min(1.25,spriteHeight*aspect));
        gl.bindBuffer(gl.ARRAY_BUFFER,S.bishopQuad);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
          -spriteWidth/2,.04,0, 0,1,
           spriteWidth/2,.04,0, 1,1,
           spriteWidth/2,spriteHeight,0, 1,0,
          -spriteWidth/2,.04,0, 0,1,
           spriteWidth/2,spriteHeight,0, 1,0,
          -spriteWidth/2,spriteHeight,0, 0,0
        ]),gl.STATIC_DRAW);
        S.bishopTextureLoaded=true;
      } catch(err) {
        S.bishopTextureLoaded=false;
        console.warn('Não foi possível carregar a arte de Valério; usando o modelo alternativo.',err);
      }
    };
    image.onerror=function(){S.bishopTextureLoaded=false;};
    image.src='./Bispo1.png?v=20261010-bishop-art-fit';
    };
  }
  function drawBishopSprite(matrix) {
    const gl=S.gl;
    if(!S.bishopTextureLoaded&&!S.bishopSpriteRequested&&S.loadBishopSpriteImage){S.bishopSpriteRequested=true;S.loadBishopSpriteImage();}
    if(!S.bishopTextureLoaded||!S.spriteProgram||!S.bishopQuad)return false;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
    gl.useProgram(S.spriteProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER,S.bishopQuad);
    gl.enableVertexAttribArray(S.spritePosition);
    gl.enableVertexAttribArray(S.spriteUv);
    gl.vertexAttribPointer(S.spritePosition,3,gl.FLOAT,false,20,0);
    gl.vertexAttribPointer(S.spriteUv,2,gl.FLOAT,false,20,12);
    MVP_SCRATCH.set(matrix);
    gl.uniformMatrix4fv(S.spriteMvp,false,MVP_SCRATCH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,S.bishopTexture);
    gl.uniform1i(S.spriteSampler,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.useProgram(S.program);
    return true;
  }
  function loadGrassAsset(){
    // Tapete de grama procedural cobrindo o piso inteiro, sem depender de GLB.
    // Lâminas triangulares leves: alta densidade visual com custo baixo para celular.
    const targetArena=S.arena,grass=[];
    let seed=48731;
    const rnd=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    // O piso mede 128 x 72; a grade cobre exatamente suas bordas.
    const cols=46,rows=27,groundY=.028;
    const palette=['#2f4a24','#3b5a2a','#4a6a30','#5b7a38','#6f8a40','#82924a'];
    let bladeTotal=0;
    function vertex(x,y,z,c){grass.push(x,y,z,c[0],c[1],c[2],c[3]);}
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const cx=-64+(col+.5)*(128/cols)+(rnd()-.5)*.48;
      const cz=-38.5+(row+.5)*(72/rows)+(rnd()-.5)*.42;
      // 2 tufos por célula, cada um com 3 folhas largas em leque: silhueta macia, sem pontas de agulha.
      for(let clump=0;clump<2;clump++){
        const x=cx+(rnd()-.5)*1.5,z=cz+(rnd()-.5)*1.45;
        if(S.sunScorches.some(function(p){return Math.hypot(x-p.x,z-p.z)<p.r;})) continue;
        // Sombra estática discreta sob cada tufo: sem shadow maps ou luz dinâmica.
        const shadowY=groundY+.003, shadowX=.23+rnd()*.08, shadowZ=.15+rnd()*.06;
        const shadow=[.012,.018,.010,.34];
        vertex(x-shadowX,shadowY,z,shadow); vertex(x,shadowY,z-shadowZ,shadow); vertex(x+shadowX,shadowY,z,shadow);
        vertex(x-shadowX,shadowY,z,shadow); vertex(x+shadowX,shadowY,z,shadow); vertex(x,shadowY,z+shadowZ,shadow);
        const clumpH=.42+rnd()*.34,clumpTone=Math.floor(rnd()*palette.length);
        const raw0=color(palette[clumpTone]);
        const windOffset=(rnd()-.5)*.3;
        for(let b=0;b<3;b++){
          const angle=rnd()*Math.PI*2;
          const dx=Math.cos(angle),dz=Math.sin(angle);
          const px=-dz,pz=dx;
          const bx=x+(rnd()-.5)*.34,bz=z+(rnd()-.5)*.34;
          const height=clumpH*(.72+rnd()*.4);
          const halfWidth=.1+rnd()*.07;
          const topHalf=halfWidth*.42;
          const lean=.1+rnd()*.24+windOffset*.2;
          const topX=bx+dx*lean,topZ=bz+dz*lean,topY=groundY+height;
          const shade=.82+rnd()*.34;
          const t=[Math.min(1,raw0[0]*shade),Math.min(1,raw0[1]*shade),Math.min(1,raw0[2]*shade),.98];
          const baseTint=[t[0]*.6,t[1]*.62,t[2]*.58,t[3]];
          const topTint=[Math.min(1,t[0]*1.2),Math.min(1,t[1]*1.2),Math.min(1,t[2]*1.1),t[3]];
          const L=[bx+px*halfWidth,groundY,bz+pz*halfWidth],R=[bx-px*halfWidth,groundY,bz-pz*halfWidth];
          const TL=[topX+px*topHalf,topY,topZ+pz*topHalf],TR=[topX-px*topHalf,topY,topZ-pz*topHalf];
          vertex(L[0],L[1],L[2],baseTint);vertex(R[0],R[1],R[2],baseTint);vertex(TL[0],TL[1],TL[2],topTint);
          vertex(R[0],R[1],R[2],baseTint);vertex(TR[0],TR[1],TR[2],topTint);vertex(TL[0],TL[1],TL[2],topTint);
          bladeTotal++;
        }
      }
    }
    if(grass.length&&S.arena===targetArena&&S.gl){
      if(targetArena.grassAsset&&targetArena.grassAsset.buffer)S.gl.deleteBuffer(targetArena.grassAsset.buffer);
      targetArena.grassAsset=mesh(S.gl,grass);
      window.ValerioGrassStatus={loaded:true,mode:'procedural-full-cover',patches:cols*rows,blades:bladeTotal,triangles:targetArena.grassAsset.count/3};
    }
  }
  function initGL() {
    const powerPreference=window.GraphicsQuality?window.GraphicsQuality.webglPowerPreference():'low-power';
    const gl=S.canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:powerPreference}) || S.canvas.getContext('experimental-webgl');
    if(!gl){S.failed=true;return;}
    const vs='attribute vec3 aPosition; attribute vec4 aColor; uniform mat4 uMvp; uniform float uTime; uniform float uWind; varying vec4 vColor; void main(){vec3 p=aPosition;float tip=clamp((aPosition.y+0.02)*1.25,0.0,1.0);float gust=sin(uTime*1.65+aPosition.z*0.31+aPosition.x*0.13);p.x+=gust*uWind*tip;p.z+=cos(uTime*1.18+aPosition.x*0.22+aPosition.z*0.08)*uWind*0.34*tip;gl_Position=uMvp*vec4(p,1.0);vColor=aColor;gl_PointSize=3.0;}';
    const fs='precision mediump float; varying vec4 vColor; uniform float uStorm; uniform float uLightning; void main(){float s=clamp(uStorm,0.0,1.0);float flash=clamp(uLightning,0.0,1.0);vec3 tint=mix(vec3(1.0),vec3(0.57,0.66,0.84),s);vec3 color=vColor.rgb*tint*(1.0-0.34*s);color=min(vec3(1.0),color+vec3(0.42,0.56,0.86)*flash*0.58);gl_FragColor=vec4(color,vColor.a);}';
    const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'programa WebGL inválido');
    S.gl=gl;S.program=program;gl.useProgram(program);S.aPosition=gl.getAttribLocation(program,'aPosition');S.aColor=gl.getAttribLocation(program,'aColor');S.uMvp=gl.getUniformLocation(program,'uMvp');S.uTime=gl.getUniformLocation(program,'uTime');S.uWind=gl.getUniformLocation(program,'uWind');S.uStorm=gl.getUniformLocation(program,'uStorm');S.uLightning=gl.getUniformLocation(program,'uLightning');
    initBishopSprite(gl);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    S.exterior=buildExterior();S.treeColliders=[];S.treeGeometryRanges=[];S.removedTreeIds=new Set();S.sunScorches=[];S.arena=buildArena();S.arenaSourceData=S.arena.sourceData;S.playerModel=S.arena.player;S.bishopModel=S.arena.bishop;
    loadGrassAsset();
    S.lost=false;S.failed=false;
  }
  function resize() {
    if(!S.canvas||!S.gl)return;
    const w=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1),h=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);
    const dpr=window.GraphicsQuality?window.GraphicsQuality.pixelRatio(3):Math.min(window.devicePixelRatio||1,1.35),bw=Math.max(1,Math.round(w*dpr)),bh=Math.max(1,Math.round(h*dpr));
    if(S.canvas.width!==bw||S.canvas.height!==bh){S.canvas.width=bw;S.canvas.height=bh;S.gl.viewport(0,0,bw,bh);}
    S.lastWidth=bw;S.lastHeight=bh;
  }
  function draw(m, matrix, wind, fraction) {
    const gl=S.gl;if(!m||!m.buffer)return;
    const vertexCount=Number.isFinite(fraction)?Math.floor(m.count*clamp(fraction,0,1)/3)*3:m.count;
    if(vertexCount<=0)return;
    gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.enableVertexAttribArray(S.aPosition);gl.enableVertexAttribArray(S.aColor);
    gl.vertexAttribPointer(S.aPosition,3,gl.FLOAT,false,28,0);gl.vertexAttribPointer(S.aColor,4,gl.FLOAT,false,28,12);
    MVP_SCRATCH.set(matrix);
    gl.uniformMatrix4fv(S.uMvp,false,MVP_SCRATCH);
    if(S.uTime)gl.uniform1f(S.uTime,Game.time||0);
    if(S.uWind)gl.uniform1f(S.uWind,wind||0);
    if(S.uStorm)gl.uniform1f(S.uStorm,clamp(Number(window.CelestialUltimateStormFactor)||0,0,1));
    if(S.uLightning)gl.uniform1f(S.uLightning,clamp(Number(window.CelestialUltimateLightningFactor)||0,0,1));
    gl.drawArrays(gl.TRIANGLES,0,vertexCount);
  }
  function outsideFrame() {
    if(!Casino.discovered&&!Campaign.flags.casinoDiscovered)return;
    const gl=S.gl, w=S.canvas.width, h=S.canvas.height, pxRatio=w/(window.innerWidth||w);
    const gameCanvas=S.gameCanvas||(S.gameCanvas=document.getElementById('game'));
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
  function arenaFloorHeight(x,z) {
    // Mesmas superfícies e prioridades dos boxes de piso criados em buildArena().
    if(Math.abs(x)<=8.1 && Math.abs(z+2.5)<=25) return .10;
    if(Math.abs(x)<=65 && Math.abs(z+2.5)<=32) return -.02;
    if(Math.abs(x)<=60 && Math.abs(z+2.5)<=33) return -.05;
    return -.47;
  }

  function insideFrame() {
    const gl=S.gl,w=S.canvas.width,h=S.canvas.height,room=Casino.room,unit=1/72;
    const px=(Player.x-(room.left+room.right)/2)*unit,pz=(Player.y-(room.top+room.bottom)/2)*unit;
    // MOD 52: câmera de RPG com trava de alvo. Sem arrasto manual, ela vai para trás do jogador olhando
    // para o chefe (o joystick "para cima" sempre avança nele). Arrastar a tela retoma o controle por ~2 s.
    {
      const nowMs=performance.now(),camDt=Math.min(.05,Math.max(0,(nowMs-(S.camT||nowMs))/1000));S.camT=nowMs;
      const c0=S.camera;
      const bossUp=BishopBoss.state!=='inactive'&&BishopBoss.state!=='dead'&&Number.isFinite(BishopBoss.x)&&Number.isFinite(BishopBoss.y);
      const wrapA=function(a){return Math.atan2(Math.sin(a),Math.cos(a));};
      if(bossUp&&!Player.dead&&Campaign.step&&Campaign.step.boss==='greedFirst'){
        // Câmera = seguimento automático (base) + deslocamento do jogador (arrasto). O arrasto nunca é
        // sobrescrito: ele vira deslocamento e só relaxa devagar depois de ~3 s sem tocar na tela.
        if(S.fBase===undefined){S.fBase=c0.yaw;S.fOff=0;S.fLast=c0.yaw;S.pBase=c0.pitch;S.pOff=0;S.pLast=c0.pitch;}
        S.fOff+=wrapA(c0.yaw-S.fLast);S.pOff+=c0.pitch-S.pLast;
        const bdx=(BishopBoss.x-(room.left+room.right)/2)*unit-px,bdz=(BishopBoss.y-(room.top+room.bottom)/2)*unit-pz;
        if(Math.hypot(bdx,bdz)>.4){
          const want=Math.atan2(bdx,-bdz);
          S.fBase=wrapA(S.fBase+wrapA(want-S.fBase)*Math.min(1,camDt*4.2));
          S.pBase+=(-0.14-S.pBase)*Math.min(1,camDt*1.6);
        }
        if(nowMs-(S.lookAt||0)>3000){S.fOff*=Math.max(0,1-camDt*.5);S.pOff*=Math.max(0,1-camDt*.5);}
        S.pOff=Math.max(-.98,Math.min(.98,S.pOff));
        c0.yaw=S.fBase+S.fOff;c0.pitch=Math.max(-1.12,Math.min(.82,S.pBase+S.pOff));
        S.fLast=c0.yaw;S.pLast=c0.pitch;
      }else S.fBase=undefined;
    }
    const cam=S.camera, yaw=cam.yaw, pitch=cam.pitch, dist=cam.distance;
    const cp=Math.cos(pitch), sp=Math.sin(pitch), sy=Math.sin(yaw), cy=Math.cos(yaw);
    const evadeProgress=(Player.evadeT||0)>0?clamp(1-(Player.evadeT/.24),0,1):0;
    const evadeDip=Math.sin(Math.PI*evadeProgress)*.24;
    const eye=[px-sy*cp*dist,1.6-sp*dist-evadeDip,pz+cy*cp*dist];
    const lookAhead=dist<0.95?2.8:5.3;
    const target=[px+sy*cp*lookAhead,1.2+sp*lookAhead,pz-cy*cp*lookAhead];
    // Impacto curto de primeira pessoa: reforça acertos sem esconder o chefe.
    const impactAge=(performance.now()-S.impactAt)/1000;
    const impactFade=S.impactAt>0?clamp(1-impactAge/.15,0,1):0;
    if(impactFade>0){const kick=Math.sin(impactAge*92)*S.impactStrength*impactFade*.035;eye[1]+=kick;target[1]+=kick*.65;eye[0]+=kick*.45;target[0]+=kick*.3;}
    // A câmera cinematográfica deve mover também a arena WebGL, não só os GLBs.
    // Caso contrário os personagens mudam de enquadramento sobre um cenário parado.
    const cinematicCamera=window.CelestialUltimateCamera;
    let renderEye=eye,renderTarget=target,renderFov=dist<0.95?1.22:1.02;
    if(cinematicCamera&&cinematicCamera.active&&Array.isArray(cinematicCamera.eye)&&Array.isArray(cinematicCamera.target)){
      renderEye=cinematicCamera.eye;renderTarget=cinematicCamera.target;
      renderFov=Number(cinematicCamera.fov)||1.02;
    }
    const pv=multiply(perspective(renderFov,w/h,.1,150),lookAt(renderEye,renderTarget,[0,1,0]));
    const playerJump=clamp((Number(Player.z)||0)-(Number(Player.floor)||0),0,60)*unit;
    const playerMoving=Math.hypot(Player.vx||0,Player.vy||0)>18;
    const playerIsAttacking=(Player.attackT||-1)>=0;
    // MOD 52: mesma convenção do Valério (yaw = atan2(dx,dz)). Antes usava atan2(dx,-dz) e negava no fim: o modelo ficava 180° virado.
    let playerYaw=Math.atan2(Number.isFinite(Player.fx)?Player.fx:0,(Number.isFinite(Player.fy)?Player.fy:-1));
    // MOD 51: trava de alvo. Com o chefe vivo a menos de ~4,5 m o corpo sempre o encara (andar, defender,
    // recuar), exceto durante a esquiva. Antes, andar de lado perto dele virava as costas e o golpe saía para trás.
    const bossAliveForLock=BishopBoss.state!=='inactive'&&BishopBoss.state!=='dead'&&Number.isFinite(BishopBoss.x)&&Number.isFinite(BishopBoss.y);
    const bossLockOn=!Player.dead&&(Player.evadeT||0)<=0&&bossAliveForLock&&Math.hypot(BishopBoss.x-Player.x,BishopBoss.y-Player.y)<330;
    // Híbrido: em movimento, respeita a direção escolhida; parado, encara o Bispo;
    // durante o golpe, o corpo acompanha a direção real do ataque.
    if(playerIsAttacking){
      const ax=Number.isFinite(Player.atkDirX)?Player.atkDirX:Player.fx;
      const ay=Number.isFinite(Player.atkDirY)?Player.atkDirY:Player.fy;
      playerYaw=Math.atan2(ax,ay);
    }else if(!playerMoving||bossLockOn){
      const facingBossStep=Campaign.step&&Campaign.step.type==='bishop'&&Campaign.step.boss==='greedFirst';
      const facingBossLive=facingBossStep&&(BishopBoss.state!=='inactive'||(Campaign.st&&Campaign.st.phase==='intro'));
      if(facingBossLive){
        const bossActiveForFacing=BishopBoss.state!=='inactive';
        const bxFacing=bossActiveForFacing&&Number.isFinite(BishopBoss.x)?BishopBoss.x:Casino.bossStart.x;
        const byFacing=bossActiveForFacing&&Number.isFinite(BishopBoss.y)?BishopBoss.y:Casino.bossStart.y;
        const bossXFacing=(bxFacing-(room.left+room.right)/2)*unit;
        const bossZFacing=(byFacing-(room.top+room.bottom)/2)*unit;
        playerYaw=Math.atan2(bossXFacing-px,(bossZFacing-pz));
      }
    }
    window.PlayerModelView={
      active:true,eye:eye.slice(),target:target.slice(),
      position:[px,arenaFloorHeight(px,pz)+playerJump-evadeDip,pz],yaw:playerYaw,deadT:Number(Player.deadT)||0,
      aspect:w/h,fov:dist<0.95?1.22:1.02,firstPerson:dist<0.95,
      moving:playerMoving,speed:Math.hypot(Player.vx||0,Player.vy||0),evading:(Player.evadeT||0)>0,evadeT:Number(Player.evadeT)||0,
      dead:!!Player.dead,knockedDown:(Player.knockdownT||0)>0,
      gettingUp:!!Player.gettingUp,hurt:(Player.hurtT||0)>0,hurtId:Number(Player.damageId)||0,hurtT:Number(Player.hurtT)||0,blocking:!!Player.blocking,
      attack:(Player.attackT||-1)>=0,attackT:Number(Player.attackT),attackId:Number(Player.attackId)||0,
      jumping:((Number(Player.z)||0)-(Number(Player.floor)||0))>.08,time:Game.time||0
    };
    gl.clearColor(.018,.026,.060,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw(S.arena.world,pv);
    // Cosmos 3D: planetas opacos, nebulosas/halos aditivos, anéis translúcidos e auroras em cortina.
    // A profundidade preserva árvores e personagens à frente; tudo sem escrever profundidade (exceto corpos).
    draw(S.arena.sky,pv);
    if((window.GraphicsQuality?window.GraphicsQuality.get('effects'):1)>=.45){
      const skyDrift=multiply(translate(Math.sin(Game.time*.045)*.7,Math.sin(Game.time*.06)*.25,0),rotateZ(Math.sin(Game.time*.03)*.004));
      gl.depthMask(false);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      draw(S.arena.skyGlow,multiply(pv,skyDrift),0);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      draw(S.arena.skyRings,pv,0);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      draw(S.arena.aurora,pv,1.5);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(true);
    }
    // O shader move vértices altos, deixando copas e folhas balançarem sem
    // deslocar o piso; o vento custa apenas uma operação por vértice.
    const graphics=window.GraphicsQuality;
    const shadowQuality=graphics?graphics.get('shadowQuality'):3;
    const effectQuality=graphics?graphics.get('effects'):1;
    const particleQuality=graphics?graphics.get('particles'):1;
    draw(S.arena.foliage,pv,.16)
    if(S.arena.grassAsset)draw(S.arena.grassAsset,pv,.27)
    // Sombras estáticas desenhadas por cima do terreno; sem luzes ou mapas de sombra dinâmicos.
    if(shadowQuality>0)draw(S.arena.shadows,pv)
    // Movimento lento das folhas: uma transformação e uma chamada de desenho por quadro.
    const leafDrift=multiply(translate(Math.sin(Game.time*.34)*.18,Math.sin(Game.time*.7)*.04,Math.cos(Game.time*.25)*.14),rotateZ(Math.sin(Game.time*.8)*.025));
    if(effectQuality>=.45)draw(S.arena.leaves,multiply(pv,leafDrift),.72)
    draw(S.arena.portal,pv);
    const pulse=1+.045*Math.sin(Game.time*2.6), centerY=2.48, centerZ=-20.72;
    const ringModel=multiply(translate(0,centerY,centerZ),multiply(rotateZ(Game.time*.48),multiply(scale(pulse,pulse,1),translate(0,-centerY,-centerZ))));
    gl.depthMask(false);
    if(effectQuality>=.45)draw(S.arena.energy,multiply(pv,ringModel));
    const particleDrift=multiply(translate(Math.sin(Game.time*.38)*.18,Math.sin(Game.time*.72)*.07,Math.cos(Game.time*.27)*.3),rotateZ(Math.sin(Game.time*.2)*.012));
    draw(S.arena.particles,multiply(pv,particleDrift),0,Math.min(1,particleQuality/1.4));
    if(effectQuality>=.55){
      for(let i=0;i<S.arena.mist.length;i++){
        const drift=multiply(translate(Math.sin(Game.time*.24+i*1.8)*.26,Math.sin(Game.time*.52+i)*.045,Math.cos(Game.time*.19+i)*.42),rotateZ(Math.sin(Game.time*.16+i)*.008));
        draw(S.arena.mist[i],multiply(pv,drift));
      }
    }
    gl.depthMask(true);
    const bossStep=Campaign.step&&Campaign.step.type==='bishop'&&Campaign.step.boss==='greedFirst';
    const bossLive=bossStep&&(BishopBoss.state!=='inactive'||(Campaign.st&&Campaign.st.phase==='intro'));
    if(bossLive){
      const bossActive=BishopBoss.state!=='inactive';
      const bx=bossActive&&Number.isFinite(BishopBoss.x)?BishopBoss.x:Casino.bossStart.x,by=bossActive&&Number.isFinite(BishopBoss.y)?BishopBoss.y:Casino.bossStart.y;
      const bpos=[(bx-(room.left+room.right)/2)*unit,0,(by-(room.top+room.bottom)/2)*unit];
      const floorY=arenaFloorHeight(bpos[0],bpos[2]);
      const bossState=BishopBoss.state||'idle';
      const windup=bossState==='windup'?clamp((BishopBoss.stateT||0)/((BishopBoss.attack&&BishopBoss.attack.windup)||.6),0,1):0;
      const strike=bossState==='attack'?Math.sin(clamp((BishopBoss.stateT||0)/((BishopBoss.attack&&BishopBoss.attack.duration)||.3),0,1)*Math.PI):0;
      // O root do GLB fica ancorado ao piso; a animação corporal não eleva o boss inteiro.
      const bossBob=0;
      const bossHeight=bossActive?Math.max(0,(Number(BishopBoss.z)||0)-(Number(BishopBoss.floor)||0))/72:0;
      // Durante o golpe, mantém a orientação usada no início do ataque;
      // nos outros estados, acompanha o jogador sem teletransportar o ângulo.
      const bossSpeed=Math.hypot(BishopBoss.vx||0,BishopBoss.vy||0);
      // Na perseguição, alinha o corpo com o deslocamento para não andar de lado.
      // Ao preparar/atacar, mantém a direção travada do golpe; parado, encara o jogador.
      const faceBoss=(bossState==='windup'||bossState==='attack')
        ? Math.atan2(Number.isFinite(BishopBoss.fx)?BishopBoss.fx:0,-(Number.isFinite(BishopBoss.fy)?BishopBoss.fy:-1))
        : (bossState==='approach'&&bossSpeed>14
          ? Math.atan2(BishopBoss.vx,-BishopBoss.vy)
          : Math.atan2(px-bpos[0],-(pz-bpos[2])));
      const bodySway=Math.sin(Game.time*1.35)*.025-windup*.12+strike*.06;
      const bossBase=multiply(translate(bpos[0],floorY+bossBob+bossHeight,bpos[2]),multiply(rotateY(faceBoss),multiply(rotateZ(bodySway),scale(1.68,1.68,1.68))));
      const modelState=(bossState==='attack'&&BishopBoss.attack?(BishopBoss.attack.id==='vault'?'skill1':BishopBoss.attack.id==='sweep'?'skill2':'attack'):(bossState==='approach'&&bossSpeed>105?'skillapproach':bossState));
      const skillLocked=!!(BishopBoss.attack&&BishopBoss.attack.skill&&['skillapproach','windup','attack','recover'].includes(bossState));
      window.ValerioModelView={active:true,eye:eye.slice(),target:target.slice(),position:[bpos[0],floorY+bossBob+bossHeight,bpos[2]],playerPosition:[px,0,pz],yaw:faceBoss,aspect:w/h,fov:dist<0.95?1.22:1.02,state:modelState,combatState:bossState,skillLocked:skillLocked,attackId:BishopBoss.attack&&BishopBoss.attack.id||null,time:Game.time||0,speed:bossSpeed,moveSpeed:bossSpeed,moving:bossSpeed>8,stateTime:BishopBoss.stateT||0,attackDuration:(BishopBoss.attack&&BishopBoss.attack.duration)||.3,windupDuration:(typeof BishopBoss.windupDurationNow==='function'?BishopBoss.windupDurationNow():((BishopBoss.attack&&BishopBoss.attack.windup)||.6)),hitAt:(BishopBoss.attack&&BishopBoss.attack.hitAt)||.08,secondHitAt:(BishopBoss.attack&&BishopBoss.attack.secondHitAt)||0,talking:!!Game.talking};
      if(!window.ValerioGLBReady && !window.ValerioGLBLoading && !window.ValerioGLBRendering){
      draw(S.bishopModel,multiply(pv,bossBase));
      const shoulderBase=multiply(bossBase,multiply(translate(0,1.37,0),rotateZ(Math.sin(Game.time*2.1)*.035-windup*.08)));
      draw(S.arena.bishopShoulders,multiply(pv,shoulderBase));
      const headTilt=Math.sin(Game.time*1.7)*.045-windup*.16+strike*.12;
      const headBase=multiply(bossBase,multiply(translate(0,1.82,0),multiply(rotateY(Math.sin(Game.time*.8)*.075),rotateZ(headTilt))));
      draw(S.arena.bishopHead,multiply(pv,headBase));
      draw(S.arena.bishopFace,multiply(pv,headBase));
      draw(S.arena.bishopCrown,multiply(pv,headBase));
      const bossArmSwing=Math.sin(Game.time*2.8)*.09+windup*.72-strike*.9;
      const armL=multiply(bossBase,multiply(translate(-.38,1.38,-.015),rotateZ(-bossArmSwing-.08)));
      const armR=multiply(bossBase,multiply(translate(.38,1.38,-.015),rotateZ(bossArmSwing+.22+strike*.28)));
      draw(S.arena.bishopArmL,multiply(pv,armL));
      draw(S.arena.bishopArmR,multiply(pv,armR));
      draw(S.arena.bishopHands,multiply(pv,multiply(armL,translate(-.24,-.35,-.03))));
      draw(S.arena.bishopHands,multiply(pv,multiply(armR,translate(.24,-.35,-.03))));
      }
    } else { window.ValerioModelView={active:false}; }
    if(!Player.dead && dist>=0.95 && !window.ProtagonistaGLBReady){
      const jump=clamp(Player.z||0,0,60)*unit;
      const moving=Math.hypot(Player.vx||0,Player.vy||0)>18;
      const phase=Game.time*9;
      const gait=moving?Math.sin(phase)*.42:Math.sin(Game.time*2)*.025;
      const bob=moving?Math.abs(Math.sin(phase))*.055:Math.sin(Game.time*2)*.018;
      const lean=moving?clamp(-(Player.vy||0)*.0007,-.13,.13):0;
      const facing=Math.atan2(Number.isFinite(Player.fx)?Player.fx:0,-(Number.isFinite(Player.fy)?Player.fy:-1));
      const playerBase=multiply(translate(px,.10+jump+bob,pz),multiply(rotateY(facing),rotateX(lean)));
      draw(S.playerModel,multiply(pv,playerBase));
      draw(S.arena.playerArmL,multiply(pv,multiply(playerBase,multiply(translate(-.29,.98,-.02),rotateX(gait)))));
      draw(S.arena.playerArmR,multiply(pv,multiply(playerBase,multiply(translate(.29,.98,-.02),rotateX(-gait)))));
      draw(S.arena.playerLegL,multiply(pv,multiply(playerBase,multiply(translate(-.13,.27,.01),rotateX(-gait*.82)))));
      draw(S.arena.playerLegR,multiply(pv,multiply(playerBase,multiply(translate(.13,.27,.01),rotateX(gait*.82)))));
    }
  }
  function damageVegetation(x,z,radius){
    if(!isBattleActive()||!S.arena||!S.arenaSourceData||!S.gl)return {trees:0,grass:0};
    const r=Math.max(2.4,Number(radius)||3.8),hits=S.treeGeometryRanges
      .filter(function(t){return !S.removedTreeIds.has(t.id)&&Math.hypot(t.x-x,t.z-z)<r+t.r;})
      .sort(function(a,b){return Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z);}).slice(0,3);
    hits.forEach(function(t){S.removedTreeIds.add(t.id);});
    if(hits.length){
      const ranges=S.treeGeometryRanges.filter(function(t){return S.removedTreeIds.has(t.id);});
      function filtered(key,startKey,endKey){
        const src=S.arenaSourceData[key],out=[];
        for(let i=0;i<src.length;i++){
          let skip=false;
          for(let j=0;j<ranges.length;j++)if(i>=ranges[j][startKey]&&i<ranges[j][endKey]){skip=true;break;}
          if(!skip)out.push(src[i]);
        }
        return out;
      }
      ['world','foliage','shadows'].forEach(function(key){
        const old=S.arena[key];if(old&&old.buffer)S.gl.deleteBuffer(old.buffer);
        S.arena[key]=mesh(S.gl,filtered(key,key+'Start',key+'End'));
      });
      S.treeColliders=S.treeColliders.filter(function(t){return !S.removedTreeIds.has(t.id);});
    }
    const now=performance.now();
    S.sunScorches.push({x:x,z:z,r:Math.max(2.5,r*.78),expires:now+6500});
    loadGrassAsset();
    return {trees:hits.length,grass:1};
  }
  function updateSunScorches(){
    if(!S.sunScorches.length)return;
    const now=performance.now(),left=S.sunScorches.filter(function(p){return p.expires>now;});
    if(left.length!==S.sunScorches.length){S.sunScorches=left;loadGrassAsset();}
  }
  function frame() {
    if(!S.canvas)return;
    const inside=!!(Casino.inside&&isBattleActive());
    const evadeButton=S.btnAim||(S.btnAim=document.getElementById('btn-aim'));
    if(evadeButton){
      const label=inside?'ESQUIVA':'MIRAR';
      if(evadeButton.textContent!==label)evadeButton.textContent=label;
      evadeButton.setAttribute('aria-label',inside?'Esquivar':'Alternar modo de mira direcional');
    }
    if(!inside){window.ValerioModelView={active:false};window.PlayerModelView={active:false};}
    document.body.classList.toggle('bishop-battle',inside);
    const shouldBeVisible=inside||(!Casino.inside&&Casino.discovered&&Campaign.flags.casinoDiscovered);
    if(S.canvasVisible!==shouldBeVisible) S.canvasVisible=shouldBeVisible;
    // Restaura o mundo 2D a cada quadro ao sair da luta. Não condicione isso
    // à visibilidade do portal: ela pode continuar ativa antes e depois da batalha.
    const gameCanvas=S.gameCanvas||(S.gameCanvas=document.getElementById('game'));
    if(gameCanvas){gameCanvas.style.opacity=inside?'0':'1';if(!inside)gameCanvas.style.visibility='visible';}
    if(S.lost||S.failed||!S.gl){S.canvas.style.display='none';return;}
    try {
      resize();
      const exterior=!!(!Casino.inside&&Casino.discovered&&Campaign.flags.casinoDiscovered);
      const active=inside||exterior;
      S.canvas.style.display=active?'block':'none';
      if(!active)return;
      if(inside!==S.wasInside){S.wasInside=inside;S.canvas.style.opacity='1';}
      if(inside)insideFrame();else outsideFrame();
       updateSunScorches();
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
  function addCameraLook(dx,dy){S.lookAt=performance.now();const c=S.camera;c.yaw+=dx*.0045;c.yaw=((c.yaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;c.pitch=clamp(c.pitch-dy*.0035,-1.12,0.82);}
  function addCameraZoom(delta){S.camera.distance=clamp(S.camera.distance+delta,S.camera.minDistance,S.camera.maxDistance);}
  function impact(strength){S.impactAt=performance.now();S.impactStrength=clamp(Number(strength)||.6,.25,1.5);}
  function transformAxis(axis){if(!isBattleActive())return axis;const a=S.camera.yaw,cs=Math.cos(a),sn=Math.sin(a);return {x:axis.x*cs-axis.y*sn,y:axis.x*sn+axis.y*cs};}
  function enter() {
    if(!Casino.inside||!Campaign.step||Campaign.step.type!=='bishop'||Campaign.step.boss!=='greedFirst')return;
    const room=Casino.room;
    // Alinha o jogador ao eixo do chefe para a câmera não mirar ao lado dele.
    Player.x=Casino.bossStart.x;
    Player.aimLocked=false;Player.aimDirX=0;Player.aimDirY=-1;
    if(typeof Player._syncAimButton==='function')Player._syncAimButton();
    // Spawn de primeira pessoa a ~2,8 m do Bispo, perto o bastante para ler o rosto.
    Player.y=Casino.bossStart.y+202;
    Player.z=0;Player.vx=Player.vy=Player.vz=0;Player.kx=Player.ky=0;
    Player.fx=0;Player.fy=-1;Player.floor=0;Player.onGround=true;Player.sy=Player.y;
    S.camera.yaw=0.72;S.camera.pitch=-0.035;S.camera.distance=6.2;
    Camera.snap(Player);
  }
  function blocked(x,y,r) {
    if(!isBattleActive())return false;
    // Coordenadas do jogador são convertidas para unidades 3D dividindo por 72.
    // O piso mede 132 x 78 unidades; deixe margem suficiente para explorar e lutar.
    const room=Casino.room,cx=(room.left+room.right)/2,cy=(room.top+room.bottom)/2;
    const halfWidth=61*72,halfDepth=34*72;
    if(x-r<cx-halfWidth||x+r>cx+halfWidth||y-r<cy-halfDepth||y+r>cy+halfDepth)return true;
    const px=(x-cx)/72,pz=(y-cy)/72,pr=Math.max(0,r/72);
    for(let i=0;i<S.treeColliders.length;i++){
      const tree=S.treeColliders[i],dx=px-tree.x,dz=pz-tree.z,minD=tree.r+pr;
      if(dx*dx+dz*dz<minD*minD)return true;
    }
    if(BishopBoss&&BishopBoss.state!=='inactive'&&BishopBoss.state!=='dead'&&Number.isFinite(BishopBoss.x)&&Number.isFinite(BishopBoss.y)){
      const bx=(BishopBoss.x-cx)/72,bz=(BishopBoss.y-cy)/72,dx=px-bx,dz=pz-bz,minD=1.30+pr;
      if(dx*dx+dz*dz<minD*minD){
        // Se o jogador já entrou na hitbox por um passo rápido, permita somente
        // o movimento que aumenta a distância, para ele conseguir sair sem travar.
        const oldX=(Player.x-cx)/72,oldZ=(Player.y-cy)/72;
        const oldD=Math.hypot(oldX-bx,oldZ-bz),newD=Math.hypot(dx,dz);
        if(oldD>=minD||newD<=oldD+0.001)return true;
      }
    }
    return false;
  }
  function blockedForBoss(x,y,r) {
    if(!isBattleActive())return false;
    const room=Casino.room,cx=(room.left+room.right)/2,cy=(room.top+room.bottom)/2;
    const halfWidth=61*72,halfDepth=34*72;
    if(x-r<cx-halfWidth||x+r>cx+halfWidth||y-r<cy-halfDepth||y+r>cy+halfDepth)return true;
    const px=(x-cx)/72,pz=(y-cy)/72,pr=Math.max(0,r/72);
    for(let i=0;i<S.treeColliders.length;i++){
      const tree=S.treeColliders[i],dx=px-tree.x,dz=pz-tree.z,minD=tree.r+pr;
      if(dx*dx+dz*dz<minD*minD){
        const oldX=(BishopBoss.x-cx)/72,oldZ=(BishopBoss.y-cy)/72;
        const oldD=Math.hypot(oldX-tree.x,oldZ-tree.z),newD=Math.hypot(dx,dz);
        if(oldD>=minD||newD<=oldD+0.001)return true;
      }
    }
    return false;
  }
  function resolveBiblePosition(x,z,r) {
    if(!isBattleActive())return {x:x,z:z};
    const room=Casino.room,cx=(room.left+room.right)/2,cy=(room.top+room.bottom)/2;
    const radius=Math.max(.1,Number(r)||.42);
    for(let pass=0;pass<2;pass++){
      for(let i=0;i<S.treeColliders.length;i++){
        const tree=S.treeColliders[i],dx=x-tree.x,dz=z-tree.z,d=Math.hypot(dx,dz),minD=tree.r+radius;
        if(d<minD){const n=d||.001;x=tree.x+dx/n*minD;z=tree.z+dz/n*minD;}
      }
      if(BishopBoss&&BishopBoss.state!=='inactive'&&BishopBoss.state!=='dead'&&Number.isFinite(BishopBoss.x)&&Number.isFinite(BishopBoss.y)){
        const bx=(BishopBoss.x-cx)/72,bz=(BishopBoss.y-cy)/72,dx=x-bx,dz=z-bz,d=Math.hypot(dx,dz),minD=1.16+radius;
        if(d<minD){const n=d||.001;x=bx+dx/n*minD;z=bz+dz/n*minD;}
      }
    }
    return {x:x,z:z};
  }
  return {init:init,frame:frame,resize:resize,enter:enter,isBattleActive:isBattleActive,blocked:blocked,blockedForBoss:blockedForBoss,resolveBiblePosition:resolveBiblePosition,addCameraLook:addCameraLook,addCameraZoom:addCameraZoom,transformAxis:transformAxis,impact:impact,damageVegetation:damageVegetation};
})();
