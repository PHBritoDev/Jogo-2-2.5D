'use strict';

/* ============================================================
   VALERIO DIMENSION — arena do Primeiro Bispo da Ganância
   Ajustes mínimos para evitar o vácuo negro da floresta,
   reforçar o piso, ampliar a estrada e preservar a campanha.
   ============================================================ */
const BishopDimension = (function () {
  const S = {
    canvas: null, gl: null, program: null, aPosition: -1, aColor: -1,
    uMvp: null, uTime: null, uWind: null, exterior: null, arena: null, energy: null, particles: null,
    playerModel: null, bishopModel: null, failed: false, lost: false,
    spriteProgram: null, spritePosition: -1, spriteUv: -1, spriteMvp: null, spriteSampler: null,
    bishopTexture: null, bishopTextureLoaded: false, bishopQuad: null,
    wasInside: false, opacity: 1, lastWidth: 0, lastHeight: 0,
    canvasVisible: false,
    camera: { yaw: 0, pitch: -0.035, distance: 12.5, minDistance: 0.85, maxDistance: 22 }
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
    const world=[],foliage=[],portal=[],energy=[],mistLayers=[],particles=[],player=[],bishop=[],playerArmL=[],playerArmR=[],playerLegL=[],playerLegR=[],bishopArmL=[],bishopArmR=[],bishopShoulders=[],bishopHead=[],bishopFace=[],bishopCrown=[],bishopHands=[];

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
    // Mini sistema planetário espalhado em volta da arena, em profundidades diferentes.
    addSphere(world,-34,24,-32,6.1,'#526fd0',10,16,1,.96,.9);
    addRing(world,-34,24,-32,8.6,2.7,.18,'#b8a5ff',.76,40);
    addSphere(world,31,27,-36,5.3,'#df6b50',10,16,1,1,.92);
    addRing(world,31,27,-36,7.4,2.0,.16,'#f1bd78',.72,36);
    addSphere(world,-43,30,-2,4.3,'#8b62d6',9,14,1,1,.95);
    addSphere(world,42,19,9,3.6,'#e1b45e',8,12,1,1,.9);
    addSphere(world,-21,36,17,4.5,'#3caaa1',9,14,1,1,.9);
    addRing(world,-21,36,17,6.2,1.5,.12,'#83d9d1',.72,32);
    addSphere(world,19,33,-57,3.7,'#b56a9d',8,12,1,1,.9);
    addSphere(world,3,45,-68,2.7,'#c7d7ed',7,10,1,1,.9);

    // FLORESTA MORTA DENSA: troncos muito próximos, fileiras sobrepostas e galhos retorcidos.
    // As laterais ficam próximas da área jogável para esconder o que existe atrás delas.
    const deadBark=['#392b22','#493528','#302923','#554031','#403027'];
    function deadTree(x,z,seed,scale){
      const variant=(seed*7)%11, h=(7.2+variant*.58)*scale;
      const lean=((seed%2)?1:-1)*(.22+(variant%4)*.12);
      const bark=deadBark[seed%deadBark.length];
      const mid=[x+lean*.45,h*.53,z+.10],top=[x+lean,h,z+((seed%3)-1)*.18];
      addSegment(world,[x,.035,z],mid,.34*scale,.20*scale,bark,6);
      addSegment(world,mid,top,.20*scale,.045*scale,deadBark[(seed+2)%deadBark.length],6);
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
      world:mesh(S.gl,world),foliage:mesh(S.gl,foliage),grassAsset:null,mist:mistLayers,portal:mesh(S.gl,portal),
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
  }
  function drawBishopSprite(matrix) {
    const gl=S.gl;
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
    gl.uniformMatrix4fv(S.spriteMvp,false,new Float32Array(matrix));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,S.bishopTexture);
    gl.uniform1i(S.spriteSampler,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.useProgram(S.program);
    return true;
  }
  function loadGrassAsset(){
    // Grama procedural em geometria real: não depende do parser do Grama.glb,
    // que deixava o chão verde sem desenhar as lâminas no aparelho do jogador.
    // Cada tufo tem lâminas cruzadas, pontas afiladas e cores naturais; o shader
    // existente anima os vértices altos para simular rajadas de vento.
    const targetArena=S.arena,grass=[];
    let seed=47291;
    const rnd=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const cols=44,rows=36,groundY=.028;
    const baseColors=['#354a25','#40572a','#4a612e','#5b6b35','#737c42'];
    function vertex(x,y,z,c){grass.push(x,y,z,c[0],c[1],c[2],c[3]);}
    function quad(a,b,c,d,col){
      // Mesma estrutura de vértices usada pelo renderer WebGL (posição + cor).
      vertex(a[0],a[1],a[2],col);vertex(b[0],b[1],b[2],col);vertex(c[0],c[1],c[2],col);
      vertex(a[0],a[1],a[2],col);vertex(c[0],c[1],c[2],col);vertex(d[0],d[1],d[2],col);
    }
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      // Distribuição em grade com variação aleatória para não formar linhas visíveis.
      const x=-61+(col+.5)*(122/cols)+(rnd()-.5)*1.0;
      const z=-35+(row+.5)*(65/rows)+(rnd()-.5)*.8;
      const bladeCount=5+(rnd()>.58?1:0);
      for(let b=0;b<bladeCount;b++){
        const angle=rnd()*Math.PI*2;
        const wx=Math.cos(angle),wz=Math.sin(angle);
        const px=-wz,pz=wx;
        const bx=x+(rnd()-.5)*.48,bz=z+(rnd()-.5)*.42;
        const height=.46+rnd()*.26;
        const halfWidth=.055+rnd()*.045;
        const lean=.10+rnd()*.20;
        const leanX=wx*lean,leanZ=wz*lean;
        let prevLeft=null,prevRight=null;
        for(let seg=0;seg<3;seg++){
          const t0=seg/3,t1=(seg+1)/3;
          const w0=halfWidth*Math.pow(1-t0,.78),w1=Math.max(.002,halfWidth*Math.pow(1-t1,.78));
          const cx0=bx+leanX*t0*t0,cz0=bz+leanZ*t0*t0;
          const cx1=bx+leanX*t1*t1,cz1=bz+leanZ*t1*t1;
          const left0=[cx0+px*w0,groundY+height*t0,cz0+pz*w0];
          const right0=[cx0-px*w0,groundY+height*t0,cz0-pz*w0];
          const left1=[cx1+px*w1,groundY+height*t1,cz1+pz*w1];
          const right1=[cx1-px*w1,groundY+height*t1,cz1-pz*w1];
          const colorIndex=Math.min(baseColors.length-1,Math.floor(t1*(baseColors.length-1)));
          const shade=.82+rnd()*.30,raw=color(baseColors[colorIndex]);
          const tint=[Math.min(1,raw[0]*shade),Math.min(1,raw[1]*shade),Math.min(1,raw[2]*shade),.98];
          quad(left0,right0,right1,left1,tint);
        }
      }
    }
    if(grass.length&&S.arena===targetArena&&S.gl){
      targetArena.grassAsset=mesh(S.gl,grass);
      window.ValerioGrassStatus={loaded:true,mode:'procedural',patches:cols*rows,triangles:targetArena.grassAsset.count/3};
    }
  }
  function initGL() {
    const gl=S.canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'}) || S.canvas.getContext('experimental-webgl');
    if(!gl){S.failed=true;return;}
    const vs='attribute vec3 aPosition; attribute vec4 aColor; uniform mat4 uMvp; uniform float uTime; uniform float uWind; varying vec4 vColor; void main(){vec3 p=aPosition;float tip=clamp((aPosition.y+0.02)*1.25,0.0,1.0);float gust=sin(uTime*1.65+aPosition.z*0.31+aPosition.x*0.13);p.x+=gust*uWind*tip;p.z+=cos(uTime*1.18+aPosition.x*0.22+aPosition.z*0.08)*uWind*0.34*tip;gl_Position=uMvp*vec4(p,1.0);vColor=aColor;gl_PointSize=3.0;}';
    const fs='precision mediump float; varying vec4 vColor; void main(){gl_FragColor=vColor;}';
    const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'programa WebGL inválido');
    S.gl=gl;S.program=program;gl.useProgram(program);S.aPosition=gl.getAttribLocation(program,'aPosition');S.aColor=gl.getAttribLocation(program,'aColor');S.uMvp=gl.getUniformLocation(program,'uMvp');S.uTime=gl.getUniformLocation(program,'uTime');S.uWind=gl.getUniformLocation(program,'uWind');
    initBishopSprite(gl);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    S.exterior=buildExterior();S.arena=buildArena();S.playerModel=S.arena.player;S.bishopModel=S.arena.bishop;
    loadGrassAsset();
    S.lost=false;S.failed=false;
  }
  function resize() {
    if(!S.canvas||!S.gl)return;
    const w=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1),h=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);
    const dpr=Math.min(window.devicePixelRatio||1,1.35),bw=Math.max(1,Math.round(w*dpr)),bh=Math.max(1,Math.round(h*dpr));
    if(S.canvas.width!==bw||S.canvas.height!==bh){S.canvas.width=bw;S.canvas.height=bh;S.gl.viewport(0,0,bw,bh);}
    S.lastWidth=bw;S.lastHeight=bh;
  }
  function draw(m, matrix, wind) {
    const gl=S.gl;if(!m||!m.buffer)return;
    gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.enableVertexAttribArray(S.aPosition);gl.enableVertexAttribArray(S.aColor);
    gl.vertexAttribPointer(S.aPosition,3,gl.FLOAT,false,28,0);gl.vertexAttribPointer(S.aColor,4,gl.FLOAT,false,28,12);
    gl.uniformMatrix4fv(S.uMvp,false,new Float32Array(matrix));
    if(S.uTime)gl.uniform1f(S.uTime,Game.time||0);
    if(S.uWind)gl.uniform1f(S.uWind,wind||0);
    gl.drawArrays(gl.TRIANGLES,0,m.count);
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
    const cam=S.camera, yaw=cam.yaw, pitch=cam.pitch, dist=cam.distance;
    const cp=Math.cos(pitch), sp=Math.sin(pitch), sy=Math.sin(yaw), cy=Math.cos(yaw);
    const evadeProgress=(Player.evadeT||0)>0?clamp(1-(Player.evadeT/.24),0,1):0;
    const evadeDip=Math.sin(Math.PI*evadeProgress)*.24;
    const eye=[px-sy*cp*dist,1.6-sp*dist-evadeDip,pz+cy*cp*dist];
    const lookAhead=dist<0.95?2.8:5.3;
    const target=[px+sy*cp*lookAhead,1.2+sp*lookAhead,pz-cy*cp*lookAhead];
    const pv=multiply(perspective(dist<0.95?1.22:1.02,w/h,.1,90),lookAt(eye,target,[0,1,0]));
    const playerJump=clamp((Number(Player.z)||0)-(Number(Player.floor)||0),0,60)*unit;
    const playerMoving=Math.hypot(Player.vx||0,Player.vy||0)>18;
    const playerIsAttacking=(Player.attackT||-1)>=0;
    let playerYaw=Math.atan2(Number.isFinite(Player.fx)?Player.fx:0,-(Number.isFinite(Player.fy)?Player.fy:-1));
    // Híbrido: em movimento, respeita a direção escolhida; parado, encara o Bispo;
    // durante o golpe, o corpo acompanha a direção real do ataque.
    if(playerIsAttacking){
      const ax=Number.isFinite(Player.atkDirX)?Player.atkDirX:Player.fx;
      const ay=Number.isFinite(Player.atkDirY)?Player.atkDirY:Player.fy;
      playerYaw=Math.atan2(ax,-ay);
    }else if(!playerMoving){
      const facingBossStep=Campaign.step&&Campaign.step.type==='bishop'&&Campaign.step.boss==='greedFirst';
      const facingBossLive=facingBossStep&&(BishopBoss.state!=='inactive'||(Campaign.st&&Campaign.st.phase==='intro'));
      if(facingBossLive){
        const bossActiveForFacing=BishopBoss.state!=='inactive';
        const bxFacing=bossActiveForFacing&&Number.isFinite(BishopBoss.x)?BishopBoss.x:Casino.bossStart.x;
        const byFacing=bossActiveForFacing&&Number.isFinite(BishopBoss.y)?BishopBoss.y:Casino.bossStart.y;
        const bossXFacing=(bxFacing-(room.left+room.right)/2)*unit;
        const bossZFacing=(byFacing-(room.top+room.bottom)/2)*unit;
        playerYaw=Math.atan2(bossXFacing-px,bossZFacing-pz);
      }
    }
    window.PlayerModelView={
      active:true,eye:eye.slice(),target:target.slice(),
      position:[px,arenaFloorHeight(px,pz)+playerJump-evadeDip,pz],yaw:-playerYaw,
      aspect:w/h,fov:dist<0.95?1.22:1.02,firstPerson:dist<0.95,
      moving:playerMoving,speed:Math.hypot(Player.vx||0,Player.vy||0),evading:(Player.evadeT||0)>0,evadeT:Number(Player.evadeT)||0,
      dead:!!Player.dead,knockedDown:(Player.knockdownT||0)>0,
      gettingUp:!!Player.gettingUp,hurt:(Player.hurtT||0)>0,hurtId:Number(Player.damageId)||0,hurtT:Number(Player.hurtT)||0,blocking:!!Player.blocking,
      attack:(Player.attackT||-1)>=0,attackT:Number(Player.attackT),attackId:Number(Player.attackId)||0,
      jumping:((Number(Player.z)||0)-(Number(Player.floor)||0))>.08,time:Game.time||0
    };
    gl.clearColor(.018,.026,.060,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw(S.arena.world,pv);
    // O shader move vértices altos, deixando copas e folhas balançarem sem
    // deslocar o piso; o vento custa apenas uma operação por vértice.
    draw(S.arena.foliage,pv,.16)
    if(S.arena.grassAsset)draw(S.arena.grassAsset,pv,.48)
    draw(S.arena.portal,pv);
    const pulse=1+.045*Math.sin(Game.time*2.6), centerY=2.48, centerZ=-20.72;
    const ringModel=multiply(translate(0,centerY,centerZ),multiply(rotateZ(Game.time*.48),multiply(scale(pulse,pulse,1),translate(0,-centerY,-centerZ))));
    gl.depthMask(false);
    draw(S.arena.energy,multiply(pv,ringModel));
    const particleDrift=multiply(translate(Math.sin(Game.time*.38)*.18,Math.sin(Game.time*.72)*.07,Math.cos(Game.time*.27)*.3),rotateZ(Math.sin(Game.time*.2)*.012));
    draw(S.arena.particles,multiply(pv,particleDrift));
    for(let i=0;i<S.arena.mist.length;i++){
      const drift=multiply(translate(Math.sin(Game.time*.24+i*1.8)*.26,Math.sin(Game.time*.52+i)*.045,Math.cos(Game.time*.19+i)*.42),rotateZ(Math.sin(Game.time*.16+i)*.008));
      draw(S.arena.mist[i],multiply(pv,drift));
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
      window.ValerioModelView={active:true,eye:eye.slice(),target:target.slice(),position:[bpos[0],floorY+bossBob+bossHeight,bpos[2]],playerPosition:[px,0,pz],yaw:faceBoss,aspect:w/h,fov:dist<0.95?1.22:1.02,state:modelState,combatState:bossState,skillLocked:skillLocked,attackId:BishopBoss.attack&&BishopBoss.attack.id||null,time:Game.time||0,speed:bossSpeed,moveSpeed:bossSpeed,moving:bossSpeed>8,stateTime:BishopBoss.stateT||0,attackDuration:(BishopBoss.attack&&BishopBoss.attack.duration)||.3,windupDuration:(BishopBoss.attack&&BishopBoss.attack.windup)||.6,secondHitAt:(BishopBoss.attack&&BishopBoss.attack.secondHitAt)||0,talking:!!Game.talking};
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
  function frame() {
    if(!S.canvas)return;
    const inside=!!(Casino.inside&&isBattleActive());
    const evadeButton=document.getElementById('btn-aim');
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
    const gameCanvas=document.getElementById('game');
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
  function addCameraLook(dx,dy){const c=S.camera;c.yaw+=dx*.006;c.pitch=clamp(c.pitch-dy*.005,-0.9,0.85);}
  function addCameraZoom(delta){S.camera.distance=clamp(S.camera.distance+delta,S.camera.minDistance,S.camera.maxDistance);}
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
    return x-r<cx-halfWidth||x+r>cx+halfWidth||
      y-r<cy-halfDepth||y+r>cy+halfDepth;
  }
  return {init:init,frame:frame,resize:resize,enter:enter,isBattleActive:isBattleActive,blocked:blocked,addCameraLook:addCameraLook,addCameraZoom:addCameraZoom,transformAxis:transformAxis};
})();
