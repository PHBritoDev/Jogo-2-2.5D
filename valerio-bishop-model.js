/* Valério GLB + foice. Compatível com o loader clássico do Three.js. */
(function () {
  'use strict';
  let started=false,failed=false,renderer=null,scene=null,camera=null,root=null,pivot=null;
  let weaponPivot=null,weaponRoot=null,mixer=null,last=0,canvas=null;

  function loadScript(url) {
    return new Promise(function(resolve,reject){
      const s=document.createElement('script');
      s.src=url;
      s.onload=resolve;
      s.onerror=function(){reject(new Error('Falha ao carregar '+url));};
      document.head.appendChild(s);
    });
  }
  function fitModel(model,height) {
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3());
    if(!isFinite(size.y)||size.y<0.01)throw new Error('GLB sem dimensões válidas');
    model.scale.setScalar(height/size.y);
    const scaled=new THREE.Box3().setFromObject(model);
    const center=scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-scaled.min.y,-center.z);
  }
  function loadWeapon() {
    new THREE.GLTFLoader().load('./Espada1.glb',function(gltf){
      weaponRoot=gltf.scene;
      fitModel(weaponRoot,1.75);
      weaponPivot=new THREE.Group();
      weaponPivot.position.set(.52,1.05,.08);
      weaponPivot.rotation.set(0,0,-.28);
      weaponPivot.add(weaponRoot);
      pivot.add(weaponPivot);
      console.info('Foice de Valério carregada.');
    },undefined,function(err){
      console.warn('Espada1.glb não carregou; Valério continuará sem a foice.',err);
    });
  }
  function start() {
    if(started||failed)return;
    started=true;
    // r124 mantém o GLTFLoader clássico usado como script global (THREE.GLTFLoader).
    loadScript('https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.min.js')
      .then(function(){return loadScript('https://cdn.jsdelivr.net/npm/three@0.124.0/examples/js/loaders/GLTFLoader.js');})
      .then(function(){
        if(!window.THREE||!THREE.GLTFLoader)throw new Error('Three.js/GLTFLoader indisponível');
        canvas=document.createElement('canvas');
        canvas.id='valerio-bishop-glb';
        canvas.setAttribute('aria-hidden','true');
        canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;display:none;';
        document.body.appendChild(canvas);
        renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:false,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.1));
        renderer.setSize(window.innerWidth,window.innerHeight,false);
        renderer.setClearColor(0x000000,0);
        renderer.outputEncoding=THREE.sRGBEncoding;
        scene=new THREE.Scene();
        camera=new THREE.PerspectiveCamera(58.4,window.innerWidth/window.innerHeight,.1,90);
        new THREE.GLTFLoader().load('./Bispo1.glb',function(gltf){
          try {
            root=gltf.scene;
            fitModel(root,2.7);
            pivot=new THREE.Group();
            pivot.add(root);
            scene.add(pivot);
            if(gltf.animations&&gltf.animations.length){
              mixer=new THREE.AnimationMixer(root);
              mixer.clipAction(gltf.animations[0]).play();
            }
            window.ValerioGLBReady=true;
            loadWeapon();
            console.info('Valério GLB carregado; clips de animação:',gltf.animations?gltf.animations.length:0);
          } catch(err) {
            failed=true;window.ValerioGLBReady=false;
            console.error('Erro ao preparar Bispo1.glb; usando modelo alternativo.',err);
          }
        },undefined,function(err){
          failed=true;window.ValerioGLBReady=false;
          console.error('Falha ao carregar ./Bispo1.glb; usando modelo alternativo.',err);
        });
      })
      .catch(function(err){
        failed=true;window.ValerioGLBReady=false;
        console.error('Three.js/GLTFLoader não carregou; usando modelo alternativo.',err);
      });
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const v=window.ValerioModelView;
    if(!v||!v.active||!root||!pivot||!renderer||!camera){
      if(canvas)canvas.style.display='none';
      return;
    }
    canvas.style.display='block';
    const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    camera.aspect=v.aspect||w/h;
    camera.fov=(v.fov||1.02)*180/Math.PI;
    camera.updateProjectionMatrix();
    camera.position.set(v.eye[0],v.eye[1],v.eye[2]);
    camera.lookAt(v.target[0],v.target[1],v.target[2]);
    pivot.position.set(v.position[0],v.position[1],v.position[2]);
    pivot.rotation.y=v.yaw||0;
    if(mixer)mixer.update(Math.min(.05,Math.max(0,(now-last)/1000||0)));
    else root.rotation.z=(v.state==='windup'?.09:0)+Math.sin((v.time||0)*1.35)*.018;
    if(weaponPivot){
      const t=v.time||0;
      const windup=v.state==='windup'?-.75:0;
      const strike=v.state==='attack'?Math.sin(t*15)*.65:0;
      weaponPivot.rotation.z=-.28+windup+strike+Math.sin(t*1.8)*.035;
      weaponPivot.rotation.x=Math.sin(t*1.3)*.04;
    }
    last=now;
    renderer.render(scene,camera);
  }
  window.ValerioGLBReady=false;
  window.addEventListener('load',function(){start();requestAnimationFrame(frame);},{once:true});
})();
