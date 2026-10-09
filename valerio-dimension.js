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
    wasInside: false, opacity: 1, lastWidth: 0, lastHeight: 0,
    battleCameraX: 0, battleCameraZ: 0, battleCameraReady: false
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
    const world=[],portal=[],energy=[],mistLayers=[],particles=[],player=[],bishop=[];

    // A estrada fica mais larga sem aumentar o tamanho da arena; o piso
    // continua low-poly e seus destaques são geometria estática e barata.
    addBox(world,0,-.38,-2.5,54,.72,52,'#111814');
    addBox(world,0,-.015,-2.5,9.8,.09,50,'#493f32');
    addBox(world,-4.92,.015,-2.5,.18,.11,49,'#292922');
    addBox(world, 4.92,.015,-2.5,.18,.11,49,'#292922');
    for(let i=0;i<7;i++){
      const z=15-i*5.1;
      addQuad(world,[-2.05,.039,z+1.05],[2.05,.039,z+1.05],[1.55,.039,z-1.05],[-1.55,.039,z-1.05],color('#827962',.11));
    }

    // Cascalho e folhas variam ao longo do caminho sem poluir a área de esquiva.
    for(let i=0;i<38;i++){
      const z=17-(i*.91),x=((i*17)%43)/43*6.2-3.1;
      const w=.12+(i%4)*.075,d=.12+(i%3)*.09;
      addBox(world,x,.045,z,w,.055,d,i%4===0?'#71634d':(i%2?'#51483a':'#5c5140'),(i%5)*.13);
      if(i%3===0)addBox(world,x+(i%2?.42:-.42),.037,z-.28,.48,.035,.06,'#302d26',(i%2?.2:-.2));
    }

    // Luz morna baixa, em faixas largas e suaves, mantém o caminho legível.
    for(let i=0;i<6;i++){
      const z=13-i*5.25,w=3.8+(i%2)*.45;
      addQuad(world,[-w,.042,z+1.8],[w,.042,z+1.8],[w*.72,.042,z-1.8],[-w*.72,.042,z-1.8],color('#c49a72',.075));
    }

    const varied=(seed)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453123;return n-Math.floor(n);};
    const barkPalette=['#302b28','#39312b','#403329','#292d2c','#49382d'];
    const leafPalette=['#14221d','#1d2b22','#222a20','#172824'];

    // Raízes expostas, pedras e moitas formam ombros irregulares, fora do
    // corredor caminhável. Cada lado varia em posição e altura.
    for(let i=0;i<19;i++){
      const seed=200+i,side=i%2?1:-1,z=15-i*1.55+(varied(seed)-.5)*1.25;
      const x=side*(5.45+varied(seed+1)*1.45);
      addBox(world,x,.10,z,.7+varied(seed+2)*.45,.2,.38+varied(seed+3)*.25,barkPalette[i%5],side*.18);
      addBox(world,side*(5.25+varied(seed+4)*.85),.075,z+.22,.88,.15,.19,barkPalette[(i+2)%5],-side*.22);
      if(i%2===0){
        const h=.34+varied(seed+5)*.42;
        addSphere(world,side*(5.8+varied(seed+6)*1.1),h*.48,z-.3,.3+varied(seed+7)*.2,i%4?'#41433b':'#4d493e',5,6);
      }
      if(i%3===0){
        const bushX=side*(5.55+varied(seed+8)*1.65);
        addCone(world,bushX,.38,z+.55,.38+varied(seed+9)*.28,.72+varied(seed+10)*.48,i%2?'#202d23':'#293629',6);
        addCone(world,bushX+side*.3,.3,z+.68,.27,.58,'#30382b',6);
      }
    }

    // Fileiras desalinhadas de árvores: troncos torcidos, raízes em leque,
    // galhos assimétricos e copas escuras misturadas a silhuetas nuas.
    for(let i=0;i<14;i++){
      for(let side=-1;side<=1;side+=2){
        const seed=i*2+(side>0?1:0),z=17-i*2.75+(varied(seed+20)-.5)*2.1;
        const x=side*(5.55+varied(seed+1)*2.35),h=7.1+varied(seed+2)*5.3;
        const lean=side*(.18+varied(seed+3)*.58),radius=.2+varied(seed+4)*.16;
        const bark=barkPalette[Math.floor(varied(seed+5)*barkPalette.length)];
        const leaf=leafPalette[Math.floor(varied(seed+6)*leafPalette.length)];
        const branchSide=varied(seed+7)>.5?1:-1;
        addQuad(world,[x-.2,.026,z-.3],[x+.2,.026,z-.3],[x+side*(.8+lean),.026,z+1.75],[x-side*.72,.026,z+1.75],color('#060908',.34));
        addCylinder(world,x,h*.32,z,radius,h*.64,bark,8,'#514236');
        addCylinder(world,x+lean,h*.81,z+side*varied(seed+8)*.28,radius*.72,h*.38,bark,8,'#5c4937');
        // Raízes ficam presas à base do tronco e se espalham pelo chão.
        for(let root=0;root<3;root++){
          const dir=root===1?-1:1,len=.5+varied(seed+10+root)*.62;
          addBox(world,x+dir*len*.34,.075,z+(root===2?.22:-.08),len,.14,.2,bark,dir*.16);
        }
        // Galhos inclinados em alturas diferentes quebram o contorno repetido.
        for(let branch=0;branch<4;branch++){
          const dir=branch%2===0?branchSide:-branchSide;
          const len=.72+varied(seed+30+branch)*1.15,level=.53+branch*.095;
          const bx=x+lean*(level*.7),by=h*level;
          addBox(world,bx+dir*len*.32,by,z+(branch%2?.18:-.12),len,.12,.16,bark,dir*(.22+varied(seed+40+branch)*.36));
          if(branch%2===0)addBox(world,bx+dir*(len*.72),by+.28,z+(branch%2?.2:-.16),len*.48,.075,.105,bark,dir*.42);
        }
        if(i%3!==1)addCone(world,x+lean*.68,h*.91,z,.7+varied(seed+50)*.48,1.9+varied(seed+51)*.85,leaf,7);
        if(i%4===0)addCone(world,x-branchSide*.55,h*.76,z+.14,.48,1.4,leafPalette[(i+2)%4],6);
      }
    }

    // Um segundo plano, mais largo e escuro, fecha o horizonte e dá profundidade.
    for(let i=0;i<11;i++){
      const side=i%2?1:-1,seed=500+i,x=side*(9+varied(seed)*4.8);
      const z=19-i*3.85+(varied(seed+1)-.5)*2.4,h=8.5+varied(seed+2)*5.4;
      const bark=barkPalette[(i+2)%5],leaf=leafPalette[(i+1)%4];
      addCylinder(world,x,h*.49,z,.16+varied(seed+3)*.16,h*.98,bark,7,'#514236');
      for(let branch=0;branch<3;branch++){
        const dir=branch%2?1:-1,len=1+varied(seed+10+branch)*1.4;
        const by=h*(.6+branch*.12);
        addBox(world,x+dir*len*.3,by,z+branch*.07,len,.11,.13,bark,dir*(.27+varied(seed+20+branch)*.3));
      }
      if(i%3!==0)addCone(world,x,h*.96,z,.8+varied(seed+4)*.5,2.2+varied(seed+5),leaf,7);
    }

    // Três véus translúcidos se movem em velocidades diferentes; sem shader
    // de pós-processamento nem aumento de resolução.
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

    // Motes leves no ar, deslocados com um movimento comum discreto.
    for(let i=0;i<26;i++){
      const a=(i*2.399)%Math.PI*2,x=Math.cos(a)*(1.1+(i*17%100)/100*2.5);
      const y=.28+(i*13%100)/100*1.65,z=13-(i*19%360)/10;
      const size=.025+(i%3)*.012,c=color(i%5===0?'#d8c69b':'#a8c7bb',i%5===0?.48:.32);
      addQuad(particles,[x-size,y,z],[x,y+size,z],[x+size,y,z],[x,y-size,z],c);
    }

    // Portal em pedra: a moldura permanece imóvel; só a energia gira.
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

    // Pontos frios de luz nas bordas dão contraste sem escurecer o chão.
    for(let i=0;i<12;i++){
      const side=i%2?1:-1,z=12-Math.floor(i/2)*3.5;
      addSphere(world,side*(3.95+(i%3)*.24),.42+(i%3)*.12,z,.095,i%3?'#9bc0c2':'#c796e7',5,6);
    }

    // Silhuetas simples, mas maiores e com contraste para continuarem legíveis.
    addCone(player,0,.64,0,.39,.98,'#5486a1',8);
    addBox(player,0,.94,-.04,.56,.16,.5,'#b29b77');
    addSphere(player,0,1.3,0,.27,'#e6d2b8',6,8);
    addCone(bishop,0,.92,0,.62,1.48,'#3d2d49',10);
    addSphere(bishop,0,1.72,0,.29,'#d0b7cb',6,8);
    addBox(bishop,0,1.72,-.25,.52,.13,.09,'#1a1222');
    addCone(bishop,0,2.2,0,.42,.58,'#8a4db4',8);
    addBox(bishop,0,.98,.4,.15,.88,.16,'#e1be70');
    addBox(bishop,0,.57,.02,.68,.09,.54,'#705136');
    return {
      world:mesh(S.gl,world),mist:mistLayers,portal:mesh(S.gl,portal),
      energy:mesh(S.gl,energy),particles:mesh(S.gl,particles),
      player:mesh(S.gl,player),bishop:mesh(S.gl,bishop)
    };
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
  function insideFrame(dt) {
    const gl=S.gl,w=S.canvas.width,h=S.canvas.height,room=Casino.room,unit=1/72;
    const px=(Player.x-(room.left+room.right)/2)*unit,pz=(Player.y-(room.top+room.bottom)/2)*unit;
    if(!S.battleCameraReady){S.battleCameraX=px;S.battleCameraZ=pz;S.battleCameraReady=true;}
    else{
      const follow=1-Math.exp(-8.5*clamp(dt||0,0,.1));
      S.battleCameraX+=(px-S.battleCameraX)*follow;
      S.battleCameraZ+=(pz-S.battleCameraZ)*follow;
    }
    const eye=[S.battleCameraX,4.8,S.battleCameraZ+9.5],target=[S.battleCameraX*.7,1.25,S.battleCameraZ-3.5];
    const pv=multiply(perspective(1.02,w/h,.1,75),lookAt(eye,target,[0,1,0]));
    gl.clearColor(.014,.022,.025,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw(S.arena.world,pv);
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
      draw(S.bishopModel,multiply(pv,translate(bpos[0],.08,bpos[2])));
    }
    if(!Player.dead){
      const jump=clamp(Player.z||0,0,60)*unit;
      const pace=Player.onGround?clamp((Player.speed||0)/(CFG.PLAYER.speed||185),0,1):0;
      const stride=Math.sin(Player.anim||0),stepBob=pace*(.018+Math.abs(stride)*.032);
      const sway=pace*stride*.035,yaw=Math.atan2(Player.fx||0,Player.fy||1);
      const model=multiply(translate(px,.04+jump+stepBob,pz),multiply(rotateY(yaw),multiply(rotateZ(sway),scale(1,1,1))));
      draw(S.playerModel,multiply(pv,model));
    }
  }
  function frame(dt) {
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
      if(inside)insideFrame(dt);else outsideFrame();
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
    S.battleCameraReady=false;
    Camera.snap(Player);
  }
  function blocked(x,y,r) {
    if(!isBattleActive())return false;
    const room=Casino.room,cx=(room.left+room.right)/2,halfWidth=4.85*72;
    return x-r<cx-halfWidth||x+r>cx+halfWidth||y-r<room.top+80||y+r>room.bottom-60;
  }
  return {init:init,frame:frame,resize:resize,enter:enter,isBattleActive:isBattleActive,blocked:blocked};
})();
