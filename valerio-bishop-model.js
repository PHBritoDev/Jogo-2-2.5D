/* Carrega o modelo GLB de Valério em uma camada transparente, sem substituir
   a arena WebGL existente. Se o carregamento falhar, o modelo procedural continua. */
(function () {
  'use strict';
  let started=false,failed=false,renderer=null,scene=null,camera=null,root=null,mixer=null,last=0;
  let canvas=null;
  function loadScript(url) {
    return new Promise(function(resolve,reject){
      const s=document.createElement('script');
      s.src=url;s.onload=resolve;s.onerror=reject;
      document.head.appendChild(s);
    });
  }
  function start() {
    if(started||failed)return;
    started=true;
    Promise.resolve()
      .then(function(){return loadScript('https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js');})
      .then(function(){return loadScript('https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/loaders/GLTFLoader.js');})
      .then(function(){
        if(!window.THREE||!THREE.GLTFLoader)throw new Error('Three.js/GLTFLoader indisponível');
        canvas=document.createElement('canvas');
        canvas.id='valerio-bishop-glb';
        canvas.setAttribute('aria-hidden','true');
        canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;display:none;';
        document.body.appendChild(canvas);
        renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:false,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
        renderer.setSize(window.innerWidth,window.innerHeight,false);
        renderer.setClearColor(0x000000,0);
        renderer.outputEncoding=THREE.sRGBEncoding;
        scene=new THREE.Scene();
        camera=new THREE.PerspectiveCamera(58.4,window.innerWidth/window.innerHeight,.1,90);
        new THREE.GLTFLoader().load('./Bispo1.glb',function(gltf){
          root=gltf.scene;
          const box=new THREE.Box3().setFromObject(root);
          const size=box.getSize(new THREE.Vector3());
          if(!isFinite(size.y)||size.y<0.01)throw new Error('O GLB não tem dimensões válidas');
          root.scale.setScalar(2.7/size.y);
          const scaledBox=new THREE.Box3().setFromObject(root);
          const center=scaledBox.getCenter(new THREE.Vector3());
          root.position.set(-center.x,-scaledBox.min.y,-center.z);
          scene.add(root);
          if(gltf.animations&&gltf.animations.length){
            mixer=new THREE.AnimationMixer(root);
            mixer.clipAction(gltf.animations[0]).play();
            console.info('Valério GLB: animações encontradas:',gltf.animations.length);
          } else {
            console.info('Valério GLB: modelo sem clips de animação; mantendo movimento procedural leve.');
          }
          window.ValerioGLBReady=true;
        },undefined,function(err){
          failed=true;window.ValerioGLBReady=false;
          console.warn('Falha ao carregar Bispo1.glb; usando o modelo alternativo.',err);
          if(canvas)canvas.style.display='none';
        });
      })
      .catch(function(err){
        failed=true;window.ValerioGLBReady=false;
        console.warn('Modelo GLB indisponível; usando o modelo alternativo.',err);
      });
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const v=window.ValerioModelView;
    if(!v||!v.active||!root||!renderer||!camera){if(canvas)canvas.style.display='none';return;}
    canvas.style.display='block';
    const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){
      renderer.setSize(w,h,false);
    }
    camera.aspect=v.aspect||w/h;
    camera.fov=(v.fov||1.02)*180/Math.PI;
    camera.updateProjectionMatrix();
    camera.position.set(v.eye[0],v.eye[1],v.eye[2]);
    camera.lookAt(v.target[0],v.target[1],v.target[2]);
    root.position.x=v.position[0];
    root.position.y=v.position[1];
    root.position.z=v.position[2];
    root.rotation.y=v.yaw||0;
    if(mixer)mixer.update(Math.min(.05,Math.max(0,(now-last)/1000||0)));
    else {
      root.rotation.z=(v.state==='windup'?.09:0)+Math.sin((v.time||0)*1.35)*.018;
    }
    last=now;
    renderer.render(scene,camera);
  }
  window.ValerioGLBReady=false;
  window.addEventListener('load',function(){start();requestAnimationFrame(frame);},{once:true});
})();
