'use strict';

/* ============================================================
   VALERIO DIMENSION — arena do Primeiro Bispo da Ganância
   Ajustes mínimos para evitar o vácuo negro da floresta,
   reforçar o piso, ampliar a estrada e preservar a campanha.
   ============================================================ */
const BishopDimension = (function () {
  const S = {
    canvas: null, gl: null, program: null, aPosition: -1, aColor: -1,
    uMvp: null, exterior: null, arena: null, energy: null, particles: null,
    playerModel: null, bishopModel: null, failed: false, lost: false,
    spriteProgram: null, spritePosition: -1, spriteUv: -1, spriteMvp: null, spriteSampler: null,
    bishopTexture: null, bishopTextureLoaded: false, bishopQuad: null,
    wasInside: false, opacity: 1, lastWidth: 0, lastHeight: 0,
    canvasVisible: false,
    camera: { yaw: 0, pitch: -0.08, distance: 10, minDistance: 0.35, maxDistance: 18 }
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
    const world=[],portal=[],energy=[],mistLayers=[],particles=[],player=[],bishop=[],playerArmL=[],playerArmR=[],playerLegL=[],playerLegR=[],bishopArmL=[],bishopArmR=[];

    // Chão contínuo e mais largo para a floresta: a área preta foi substituída por piso escuro.
    addBox(world,0,-0.92,-2.5,132,0.9,78,'#151b18');
    addBox(world,0,-0.22,-2.5,120,0.34,66,'#252d29');
    addBox(world,0,-.38,-2.5,130,.72,64,'#111814');
    addBox(world,0,-.015,-2.5,16.2,.09,50,'#493f32');
    addBox(world,-8.44,.015,-2.5,.18,.11,49,'#292922');
    addBox(world, 8.44,.015,-2.5,.18,.11,49,'#292922');
    for(let i=0;i<20;i++){
      const x = -56 + i * 5.8;
      const y = 0.12 + (i % 3) * 0.06;
      addBox(world,x,y,-1.2,2.4,0.16,3,'#2d2d2f');
      addBox(world,x + (i % 2 ? 0.8 : -0.8), y - 0.05, -1.1, 1.4, 0.12, 1.5, '#312b28', 0.5);
    }
    for(let i=0;i<8;i++){
      const z=17-i*4.75,fade=1-i/8,width=6.2-fade*1.3;
      addQuad(world,[-width,.041,z+2.55],[width,.041,z+2.55],[width*.78,.041,z-2.55],[-width*.78,.041,z-2.55],color('#d0a16b',.21*fade+.025));
    }

    // Cascalho e raízes laterais, mantendo a trilha visível e integrada ao terreno.
    for(let i=0;i<42;i++){
      const z=17-(i*.91),x=((i*17)%37)/37*10.6-5.3;
      const w=.12+(i%4)*.075,d=.12+(i%3)*.09;
      addBox(world,x,.045,z,w,.055,d,i%4===0?'#71634d':(i%2?'#51483a':'#5c5140'),(i%5)*.13);
      if(i%3===0)addBox(world,x+(i%2?.42:-.42),.037,z-.28,.48,.035,.06,'#302d26',(i%2?.2:-.2));
    }

    // Rocha, brotos e moitas nos ombros da estrada.
    for(let i=0;i<17;i++){
      const z=14-i*1.72,side=i%2?1:-1;
      const x=side*(5.0+(i%3)*.18),rock=i%3?'#403b32':'#51483c';
      addSphere(world,x,.16,z,.48+(i%3)*.1,rock,4,6,1.35,.52,.92);
      addSegment(world,[x-side*.12,.12,z+.12],[x-side*(.58+(i%3)*.12),.035,z+.52],.13,.025,i%2?'#30271f':'#413226',5);
      addSegment(world,[x+side*.08,.11,z-.12],[x+side*.48,.035,z-.38],.11,.02,'#382c22',5);
      if(i%2===0){
        const bushX=side*(5.48+(i%3)*.22),bushY=.26;
        addSphere(world,bushX,bushY,z-.35,.42,i%4?'#1d2b20':'#293426',4,6,1.35,.72,.9);
        addSphere(world,bushX+side*.3,bushY+.04,z-.54,.31,'#263224',4,6,1.2,.76,.9);
      }
      if(i%4===0)addCone(world,side*(5.62+(i%2)*.3),.55,z+.48,.34,.72,i%2?'#263b2b':'#303b2a',6);
    }

    const barkPalette=['#32291f','#3a2d23','#403126','#302923'];
    for(let i=0;i<12;i++){
      const z=15-i*2.82+(i*7%13)*.2;
      for(let side=-1;side<=1;side+=2) {
        const variant=(i*7+(side>0?3:0))%7;
        const tz=z+(side>0?.62:-.38)+((i*11+(side>0?5:0))%7)*.17;
        const x=side*(5.32+(i*7%5)*.4+((i+side+2)%2)*.2);
        const h=8.6+variant*.58,lean=(((i+(side>0?1:0))%2)?1:-1)*(.18+(variant%4)*.085);
        const bark=barkPalette[(i+(side>0?1:0))%4];
        addQuad(world,[x-.2,.026,tz-.28],[x+.2,.026,tz-.28],[x+side*1.05,.026,tz+1.8],[x-side*.82,.026,tz+1.8],color('#070c09',.3));
        const middle=[x+lean*.38,h*.52,tz+(variant%3-.7)*.12],top=[x+lean,h,tz+(variant%4-1.5)*.16];
        addSegment(world,[x,.08,tz],middle,.34,.23,bark,7);
        addSegment(world,middle,top,.23,.075,barkPalette[(i+2)%4],7);
        for(let j=0;j<5;j++){
          const y=h*(.46+j*.083),f=y/h,rootX=x+lean*f;
          const branchSide=(j+i+(side>0?2:0))%2===0?-1:1;
          const length=.95+((i*3+j*5)%7)*.16,raise=.58+((i+j*2)%4)*.18;
          const start=[rootX,y,tz+(j%2?.16:-.12)];
          const end=[rootX+branchSide*length,y+raise,tz+(j%3-1)*.16];
          addSegment(world,start,end,.082,.025,barkPalette[(i+j)%4],5);
          if(j%2===0){
            const twigSide=branchSide*(j%3===0?-1:1);
            addSegment(world,[end[0],end[1],end[2]],[end[0]+twigSide*.48,end[1]+.46,end[2]+.12],.033,.008,'#51402f',4);
          }
        }
        for(let r=0;r<3;r++){
          const outward=(r-1)*.42+side*.48;
          addSegment(world,[x,.14,tz],[x+outward,.035,tz+(r-1)*.32],.17,.018,'#372a20',5);
        }
      }
    }

    // Aberto e denso: mais árvores no fundo para quebrar a sensação de vazio negro.
    for(let i=0;i<18;i++){
      const side=i%2?1:-1,variant=(i*5)%9;
      const x=side*(7.4+(i*7%5)*.78),z=16-i*1.92+(i*11%17)*.19,h=6.6+variant*.47;
      const bark=barkPalette[(i+1)%4],lean=side*(.22+(variant%3)*.13);
      const mid=[x+lean*.42,h*.55,z],top=[x+lean,h,z+(i%4-1.5)*.12];
      addSegment(world,[x,.06,z],mid,.28,.17,bark,6);
      addSegment(world,mid,top,.17,.045,barkPalette[(i+2)%4],6);
      for(let j=0;j<3;j++){
        const branchSide=((i+j)%2?1:-1);
        const startY=h*(.6+j*.1),startX=x+lean*(startY/h);
        addSegment(world,[startX,startY,z],[startX+branchSide*(.82+(i+j)%4*.22),startY+.5+(j%2)*.2,z+(j-1)*.12],.062,.014,bark,5);
      }
    }

    // Mais 8 árvores para fechar a silhueta da floresta.
    for(let i=0;i<8;i++){
      const side=i%2?1:-1;
      const variant=(i*13)%11;
      const x=side*(9.2+(i%4)*.95),z=-5-i*2.4+(i*7%11)*.25;
      const h=5.2+variant*.8; const bark=barkPalette[(i+3)%4]; const lean=side*(.28+(variant%3)*.16);
      addSegment(world,[x,.04,z],[x+lean*.5,h*.58,z],.26,.14,bark,7);
      addSegment(world,[x+lean*.5,h*.58,z],[x+lean*.8,h,z],.14,.04,barkPalette[(i+1)%4],6);
      for(let j=0;j<4;j++){
        const branchSide=(j%2?1:-1);
        const startH=h*(.45+j*.11),startX=x+lean*(startH/h);
        const bx=startX+branchSide*.95,by=startH+.6,bz=z+(j%2-.5)*.18;
        addSegment(world,[startX,startH,z],[bx,by,bz],.078,.022,bark,5);
        if(j%2===0) addSegment(world,[bx,by,bz],[bx+branchSide*.35,by+.4,bz+.08],.028,.008,'#51402f',4);
      }
      addQuad(world,[x-.22,.022,z-.18],[x+.22,.022,z-.18],[x+.15,.022,z+.22],[x-.15,.022,z+.22],color('#070c09',.25));
    }

    // Camada adicional de árvores retorcidas nas margens e ao fundo, fora da faixa de combate.
    for(let i=0;i<14;i++){
      const side=i%2?1:-1, variant=(i*7)%8;
      const x=side*(11.5+(i%4)*1.15), z=13-i*3.05+(i%3)*.35;
      const h=6.4+variant*.72, lean=side*(.2+(variant%4)*.11), bark=barkPalette[(i+2)%4];
      const mid=[x+lean*.4,h*.54,z],top=[x+lean,h,z+.18];
      addSegment(world,[x,.05,z],mid,.31,.19,bark,6);
      addSegment(world,mid,top,.19,.045,barkPalette[(i+1)%4],6);
      for(let j=0;j<4;j++){
        const dir=(j%2?1:-1), yy=h*(.48+j*.1), xx=x+lean*(yy/h);
        const end=[xx+dir*(.75+(i+j)%4*.25),yy+.45+(j%3)*.12,z+(j%2)*.22];
        addSegment(world,[xx,yy,z],end,.067,.018,bark,5);
        if(j===1||j===3)addSegment(world,end,[end[0]+dir*.34,end[1]+.35,end[2]+.1],.025,.006,'#51402f',4);
      }
      for(let k=0;k<3;k++)addSegment(world,[x,.12,z],[x+side*(.28+k*.22),.035,z+(k-1)*.24],.12,.015,bark,5);
    }

    // Anel florestal denso: árvores adicionais no perímetro do piso.
    // Todas as bases ficam dentro do terreno visível, com polígonos leves para celular.
    for(let i=0;i<42;i++){
      const side=i%2?1:-1, row=Math.floor(i/2);
      const x=side*(17+(row%6)*6.1+((i*7)%5)*.32);
      const z=30-row*3.12+((i*11)%5)*.24;
      const h=7.2+((i*13)%8)*.78, lean=side*(.18+((i*5)%4)*.12);
      const bark=barkPalette[(i+row)%barkPalette.length];
      const base=[x,.035,z], mid=[x+lean*.42,h*.54,z+.12], top=[x+lean,h,z+((i%3)-1)*.16];
      addSegment(world,base,mid,.34,.2,bark,6);
      addSegment(world,mid,top,.2,.045,barkPalette[(i+2)%barkPalette.length],6);
      for(let j=0;j<4;j++){
        const dir=(j%2===0?-1:1)*(i%4<2?1:-1);
        const yy=h*(.43+j*.105), xx=x+lean*(yy/h);
        const end=[xx+dir*(1.05+((i+j*3)%5)*.19),yy+.42+((i+j)%3)*.2,z+(j%3-1)*.17];
        addSegment(world,[xx,yy,z],end,.075,.018,bark,5);
        if(j%2===0)addSegment(world,end,[end[0]+dir*.4,end[1]+.38,end[2]+.12],.03,.007,'#51402f',4);
      }
      for(let k=0;k<3;k++){
        const rootSide=(k-1);
        addSegment(world,[x,.13,z],[x+rootSide*.4+side*.18,.028,z+rootSide*.24],.14,.014,bark,5);
      }
      addQuad(world,[x-.3,.018,z-.2],[x+.3,.018,z-.2],[x+.22,.018,z+.2],[x-.22,.018,z+.2],color('#070c09',.24));
    }

    // Vegetação do chão, raízes e fungos para quebrar a aparência “limbo”.
    for(let i=0;i<14;i++){
      const side=i%2?1:-1;
      const x=side*(6.8+(i%3)*.6),z=12-i*1.6+(i*5%7)*.14;
      const fh=.6+(i%3)*.2;
      for(let k=0;k<3;k++){
        const angle=(k-1)*0.4;
        const ex=Math.sin(angle)*.5,ez=Math.cos(angle)*.5;
        addSegment(world,[x,.05,z],[x+ex,fh,z+ez],.032,.008,'#3a4d2a',3);
      }
      if(i%4===0) addCone(world,x+side*.32,.08,z-.25,.18,.32,i%2?'#6b4423':'#8b5a3c',5);
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
    addCone(bishop,0,.92,0,.62,1.48,'#3d2d49',10);
    addSphere(bishop,0,1.72,0,.29,'#d0b7cb',6,8);
    addBox(bishop,0,1.72,-.25,.52,.13,.09,'#1a1222');
    addCone(bishop,0,2.2,0,.42,.58,'#8a4db4',8);
    addBox(bishop,0,.98,.4,.15,.88,.16,'#e1be70');
    addBox(bishop,0,.57,.02,.68,.09,.54,'#705136');
    // Membros separados para animação procedural leve, sem esqueleto externo.
    addSegment(playerArmL,[0,0,0],[-.18,-.34,-.025],.085,.055,'#171b20',6);
    addSegment(playerArmR,[0,0,0],[.18,-.34,-.025],.085,.055,'#171b20',6);
    addSegment(playerLegL,[0,0,0],[-.045,-.25,-.015],.095,.065,'#29232a',6);
    addSegment(playerLegR,[0,0,0],[.045,-.25,-.015],.095,.065,'#29232a',6);
    addSegment(bishopArmL,[0,0,0],[-.24,-.35,-.03],.095,.065,'#30213a',6);
    addSegment(bishopArmR,[0,0,0],[.24,-.35,-.03],.095,.065,'#30213a',6);
    return {
      world:mesh(S.gl,world),mist:mistLayers,portal:mesh(S.gl,portal),
      energy:mesh(S.gl,energy),particles:mesh(S.gl,particles),
      player:mesh(S.gl,player),bishop:mesh(S.gl,bishop),
      playerArmL:mesh(S.gl,playerArmL),playerArmR:mesh(S.gl,playerArmR),
      playerLegL:mesh(S.gl,playerLegL),playerLegR:mesh(S.gl,playerLegR),
      bishopArmL:mesh(S.gl,bishopArmL),bishopArmR:mesh(S.gl,bishopArmR)
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
        const spriteHeight=3.15;
        const aspect=(image.naturalWidth>0&&image.naturalHeight>0)?image.naturalWidth/image.naturalHeight:0.667;
        const spriteWidth=Math.max(1.25,Math.min(2.35,spriteHeight*aspect));
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
  function initGL() {
    const gl=S.canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'}) || S.canvas.getContext('experimental-webgl');
    if(!gl){S.failed=true;return;}
    const vs='attribute vec3 aPosition; attribute vec4 aColor; uniform mat4 uMvp; varying vec4 vColor; void main(){gl_Position=uMvp*vec4(aPosition,1.0);vColor=aColor;gl_PointSize=3.0;}';
    const fs='precision mediump float; varying vec4 vColor; void main(){gl_FragColor=vColor;}';
    const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'programa WebGL inválido');
    S.gl=gl;S.program=program;gl.useProgram(program);S.aPosition=gl.getAttribLocation(program,'aPosition');S.aColor=gl.getAttribLocation(program,'aColor');S.uMvp=gl.getUniformLocation(program,'uMvp');
    initBishopSprite(gl);
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
    const cam=S.camera, yaw=cam.yaw, pitch=cam.pitch, dist=cam.distance;
    const cp=Math.cos(pitch), sp=Math.sin(pitch), sy=Math.sin(yaw), cy=Math.cos(yaw);
    const eye=[px-sy*cp*dist,1.6-sp*dist,pz+cy*cp*dist];
    const target=[px+sy*cp*12,1.2+sp*12,pz-cy*cp*12];
    const pv=multiply(perspective(dist<0.7?1.22:1.02,w/h,.1,90),lookAt(eye,target,[0,1,0]));
    gl.clearColor(.006,.009,.025,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
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
      const bossState=BishopBoss.state||'idle';
      const windup=bossState==='windup'?clamp((BishopBoss.stateT||0)/((BishopBoss.attack&&BishopBoss.attack.windup)||.6),0,1):0;
      const strike=bossState==='attack'?Math.sin(clamp((BishopBoss.stateT||0)/((BishopBoss.attack&&BishopBoss.attack.duration)||.3),0,1)*Math.PI):0;
      const bossBob=Math.sin(Game.time*2.15)*.055;
      const faceBoss=Math.atan2(px-bpos[0],-(pz-bpos[2]));
      const bossBase=multiply(translate(bpos[0],.08+bossBob,bpos[2]),multiply(rotateY(faceBoss),rotateZ(-windup*.12+strike*.08)));
      const spriteVisible=drawBishopSprite(multiply(pv,bossBase));
      if(!spriteVisible){
        draw(S.bishopModel,multiply(pv,bossBase));
        const bossArmSwing=Math.sin(Game.time*2.8)*.045+windup*.72-strike*.9;
        draw(S.arena.bishopArmL,multiply(pv,multiply(bossBase,multiply(translate(-.31,1.1,-.02),rotateZ(-bossArmSwing)))));
        draw(S.arena.bishopArmR,multiply(pv,multiply(bossBase,multiply(translate(.31,1.1,-.02),rotateZ(bossArmSwing+.22)))));
      }
    }
    if(!Player.dead && dist>=0.7){
      const jump=clamp(Player.z||0,0,60)*unit;
      const moving=Math.hypot(Player.vx||0,Player.vy||0)>18;
      const phase=Game.time*9;
      const gait=moving?Math.sin(phase)*.42:Math.sin(Game.time*2)*.025;
      const bob=moving?Math.abs(Math.sin(phase))*.055:Math.sin(Game.time*2)*.018;
      const lean=moving?clamp(-(Player.vy||0)*.0007,-.13,.13):0;
      const facing=Math.atan2(Number.isFinite(Player.fx)?Player.fx:0,-(Number.isFinite(Player.fy)?Player.fy:-1));
      const playerBase=multiply(translate(px,.04+jump+bob,pz),multiply(rotateY(facing),rotateX(lean)));
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
    Player.x=(room.left+room.right)/2;
    Player.y=room.bottom-180;
    Player.z=0;Player.vx=Player.vy=Player.vz=0;Player.kx=Player.ky=0;
    Player.fx=0;Player.fy=-1;Player.floor=0;Player.onGround=true;Player.sy=Player.y;
    S.camera.yaw=0;S.camera.pitch=-0.08;S.camera.distance=10;
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
