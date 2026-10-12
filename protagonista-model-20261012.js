/* Protagonista 3D — modelo GLB e seis animações, integrado à dimensão de Valério. */
(function () {
  'use strict';
  let canvas=null,renderer=null,scene=null,camera=null,root=null,pivot=null,mixer=null;
  let actions={},currentAction=null,currentType='',ready=false,failed=false,last=0;
  const MODEL_HEIGHT=2.35;
  const qs=new URLSearchParams(window.location.search);
  const disabled=qs.get('protagonista3D')==='0';

  function note(message,isError){
    window.ProtagonistaDiagnostics=message;
    if(isError) console.warn('Protagonista GLB:',message);
    else console.info('Protagonista GLB:',message);
  }
  function loadModel(){
    if(disabled||ready||failed)return;
    if(!window.THREE||!THREE.GLTFLoader){requestAnimationFrame(loadModel);return;}
    canvas=document.createElement('canvas');
    canvas.id='protagonista-glb';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;display:none;';
    document.body.appendChild(canvas);
    try{
      renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:false,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.1));
      renderer.setSize(window.innerWidth,window.innerHeight,false);
      renderer.setClearColor(0x000000,0);
      renderer.outputEncoding=THREE.sRGBEncoding;
      renderer.toneMapping=THREE.NoToneMapping;
      scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xe9edff,0x343044,1.8));
      const key=new THREE.DirectionalLight(0xffe8d1,2.2);key.position.set(-4,7,5);scene.add(key);
      const fill=new THREE.DirectionalLight(0x9bbdff,.8);fill.position.set(4,3,-4);scene.add(fill);
      camera=new THREE.PerspectiveCamera(58,window.innerWidth/window.innerHeight,.1,90);
      pivot=new THREE.Group();scene.add(pivot);
      note('carregando Protagonista.glb...',false);
      const loader=new THREE.GLTFLoader();
      loader.load('./Protagonista.glb?playerModel=mod1-20261012',function(gltf){
        try{
          root=gltf.scene;
          root.traverse(function(o){
            if(!o.isMesh)return;
            o.frustumCulled=false;
            (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){
              if(m&&m.color&&m.map)m.color.set(0xffffff);
              if(m&&m.roughness!==undefined)m.roughness=Math.max(m.roughness,.55);
              if(m)m.needsUpdate=true;
            });
          });
          pivot.add(root);
          const box=new THREE.Box3().setFromObject(root);
          const size=box.getSize(new THREE.Vector3());
          if(!isFinite(size.y)||size.y<.01)throw new Error('modelo sem altura válida');
          const factor=MODEL_HEIGHT/size.y;
          root.scale.multiplyScalar(factor);
          root.position.x-=((box.min.x+box.max.x)/2)*factor;
          root.position.z-=((box.min.z+box.max.z)/2)*factor;
          root.position.y-=box.min.y*factor;
          mixer=new THREE.AnimationMixer(root);
          const clips=(gltf.animations||[]);
          clips.forEach(function(clip){
            const n=(clip.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
            if(/breath|idle|rest|standstill|parado/.test(n))actions.idle=actions.idle||clip;
            if(/walk|walking|locomotion|andar|caminh/.test(n))actions.walk=actions.walk||clip;
            if(/attack|slash|swing|strike|sword|melee|atacar|ataque/.test(n))actions.attack=actions.attack||clip;
            if(/hurt|damage|hitreaction|takehit|tomardano|dano/.test(n))actions.hurt=actions.hurt||clip;
            if(/get.?up|getup|stand.?up|rise|recover.?floor|levant|levantar/.test(n))actions.getup=actions.getup||clip;
            if(/death|dying|dead|^die$|morrer|morte/.test(n))actions.death=actions.death||clip;
          });
          // Use o clip de repouso como fallback, sem inventar nomes de animação.
          if(!actions.idle&&clips.length)actions.idle=clips[0];
          ready=true;window.ProtagonistaGLBReady=true;
          note('modelo pronto. Clips: '+clips.map(c=>c.name+' ('+(Number(c.duration)||0).toFixed(2)+'s)').join(', ')+
            ' | mapeamento: '+Object.keys(actions).map(k=>k+'='+actions[k].name).join('; '),false);
        }catch(e){failed=true;note('erro preparando modelo: '+e.message,true);}
      },undefined,function(e){failed=true;note('falha ao carregar Protagonista.glb; confira se o arquivo está na raiz do GitHub.',true);});
    }catch(e){failed=true;note('erro no renderizador 3D: '+e.message,true);}
  }
  function play(type,once){
    let clip=actions[type]||actions.idle;
    if(!clip||!mixer)return;
    const next=mixer.clipAction(clip);
    if(currentAction===next&&next.isRunning())return;
    if(currentAction)currentAction.fadeOut(.09);
    next.reset();next.enabled=true;next.setEffectiveWeight(1);
    next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
    next.clampWhenFinished=!!once;next.fadeIn(.09).play();
    currentAction=next;currentType=type;
  }
  function choose(v){
    if(v.dead){if(currentType!=='death')play('death',true);return;}
    if(v.gettingUp){if(currentType!=='getup')play('getup',true);return;}
    if(v.knockedDown){if(currentType!=='hurt')play('hurt',true);return;}
    if(v.attack){if(currentType!=='attack')play('attack',true);return;}
    if(v.hurt){if(currentType!=='hurt')play('hurt',true);return;}
    if(v.moving&&actions.walk){if(currentType!=='walk'||!currentAction||!currentAction.isRunning())play('walk',false);return;}
    if(currentType!=='idle'||!currentAction||!currentAction.isRunning())play('idle',false);
  }
  function frame(now){
    requestAnimationFrame(frame);
    const v=window.PlayerModelView;
    if(!ready||!v||!v.active||v.firstPerson||!renderer||!camera||!root||!pivot){
      if(canvas)canvas.style.display='none';return;
    }
    canvas.style.display='block';
    const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    camera.aspect=v.aspect||w/h;camera.fov=(v.fov||1.02)*180/Math.PI;camera.updateProjectionMatrix();
    camera.position.set(v.eye[0],v.eye[1],v.eye[2]);camera.lookAt(v.target[0],v.target[1],v.target[2]);
    pivot.position.set(v.position[0],v.position[1],v.position[2]);
    pivot.rotation.y=v.yaw||0;
    choose(v);
    const dt=Math.min(Math.max((now-last)/1000,0),.05);last=now;
    if(mixer) mixer.update(dt);
    renderer.render(scene,camera);
  }
  function boot(){
    if(disabled)return;
    loadModel();
    requestAnimationFrame(frame);
  }
  window.ProtagonistaGLBReady=false;
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();