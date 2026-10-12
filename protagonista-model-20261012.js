/* Protagonista 3D — usa a mesma cena/câmera do Valério para depth correto. */
(function () {
  'use strict';
  let api=null,root=null,pivot=null,mixer=null,rootBasePosition=null,actions={},currentAction=null,currentType='',ready=false,failed=false,last=0;
  const MODEL_HEIGHT=2.35;
  const disabled=new URLSearchParams(window.location.search).get('protagonista3D')==='0';
  function note(message,isError){
    window.ProtagonistaDiagnostics=message;
    if(isError)console.warn('Protagonista GLB:',message);else console.info('Protagonista GLB:',message);
  }
  function findAPI(){
    if(disabled||ready||failed)return;
    api=window.ValerioThreeAPI;
    if(!api||!api.THREE||!api.scene||!api.camera||!api.renderer||!api.THREE.GLTFLoader){requestAnimationFrame(findAPI);return;}
    loadModel();
  }
  function loadModel(){
    note('carregando Protagonista.glb...',false);
    const THREE=api.THREE,loader=new THREE.GLTFLoader();
    loader.load('./Protagonista.glb?playerModel=mod2-shared-scene-20261012',function(gltf){
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
        let box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
        if(size.z>size.y*1.35&&size.z>size.x*.72){root.rotation.x=-Math.PI/2;box=new THREE.Box3().setFromObject(root);size=box.getSize(new THREE.Vector3());}
        if(!isFinite(size.y)||size.y<.01)throw new Error('modelo sem altura válida');
        const factor=MODEL_HEIGHT/size.y;
        root.scale.multiplyScalar(factor);
        root.position.x-=((box.min.x+box.max.x)/2)*factor;
        root.position.z-=((box.min.z+box.max.z)/2)*factor;
        root.position.y-=box.min.y*factor;
        rootBasePosition=root.position.clone();
        pivot=new THREE.Group();pivot.visible=false;pivot.add(root);api.scene.add(pivot);
        mixer=new THREE.AnimationMixer(root);
        const clips=gltf.animations||[];
        clips.forEach(function(clip){
          const n=(clip.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
          const locomotion=/walk|walking|run|running|sprint|jog|locomotion|andar|caminh/.test(n);
          clip.tracks.forEach(function(track){
            const name=String(track.name||''),prop=name.split(/[.:/]/).pop().replace(/\[[^\]]*\]$/,'').toLowerCase();
            if(prop!=='position'||!track.values||!track.times||!track.times.length)return;
            const node=name.replace(/\.position.*$/i,'').replace(/\/position.*$/i,'').replace(/\[.*?\]/g,'').toLowerCase();
            const rootNode=/(^|[^a-z])(root|armature|scene|rootmotion)([^a-z]|$)/i.test(node);
            const hips=/hips|pelvis/.test(node);
            if(!rootNode&&!hips)return;
            const values=track.values,stride=typeof track.getValueSize==='function'?track.getValueSize():3;
            if(stride<3)return;
            const x=values[0],y=values[1],z=values[2];
            for(let i=0;i<track.times.length;i++){
              const k=i*stride;values[k]=x;values[k+2]=z;
              if(rootNode||locomotion)values[k+1]=y;
            }
          });
          if(/breath|idle|rest|standstill|parado/.test(n))actions.idle=actions.idle||clip;
          if(/walk|walking|locomotion|andar|caminh/.test(n))actions.walk=actions.walk||clip;
          if(/attack|slash|swing|strike|sword|melee|atacar|ataque/.test(n))actions.attack=actions.attack||clip;
          if(/hurt|damage|hitreaction|takehit|tomardano|dano/.test(n))actions.hurt=actions.hurt||clip;
          if(/get.?up|stand.?up|rise|recover.?floor|levant|levantar/.test(n))actions.getup=actions.getup||clip;
          if(/death|dying|dead|^die$|morrer|morte/.test(n)){actions.death=actions.death||clip;actions.fall=actions.fall||clip;}
        });
        if(!actions.idle&&clips.length)actions.idle=clips[0];
        ready=true;window.ProtagonistaGLBReady=true;
        note('modelo pronto. Clips: '+clips.map(c=>c.name+' ('+(Number(c.duration)||0).toFixed(2)+'s)').join(', ')+
          ' | mapeamento: '+Object.keys(actions).map(k=>k+'='+actions[k].name).join('; '),false);
      }catch(e){failed=true;note('erro preparando modelo: '+e.message,true);}
    },undefined,function(){failed=true;note('falha ao carregar Protagonista.glb; confira se o arquivo está na raiz do GitHub.',true);});
  }
  function play(type,once){
    const THREE=api.THREE,clip=actions[type]||actions.idle;
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
    // O clipe de morte do modelo também é a animação de queda; após o timer, toca get-up.
    if(v.knockedDown){if(currentType!=='fall')play('fall',true);return;}
    if(v.attack){if(currentType!=='attack')play('attack',true);return;}
    if(v.hurt){if(currentType!=='hurt')play('hurt',true);return;}
    if(v.moving&&actions.walk){if(currentType!=='walk'||!currentAction||!currentAction.isRunning())play('walk',false);return;}
    if(currentType!=='idle'||!currentAction||!currentAction.isRunning())play('idle',false);
  }
  function frame(now){
    requestAnimationFrame(frame);
    const v=window.PlayerModelView;
    if(!ready||!v||!v.active||v.firstPerson||!pivot||!api){if(pivot)pivot.visible=false;return;}
    pivot.visible=true;
    pivot.position.set(v.position[0],v.position[1],v.position[2]);
    pivot.rotation.y=v.yaw||0;
    choose(v);
    if(currentType==='walk'&&currentAction){
      const speed=Math.max(0,Number(v.speed)||0);
      currentAction.setEffectiveTimeScale(Math.max(.35,Math.min(1.35,speed/130)));
    }
    const dt=Math.min(Math.max((now-last)/1000,0),.05);last=now;
    if(mixer)mixer.update(dt);
    if(root&&rootBasePosition){root.position.copy(rootBasePosition);root.updateMatrixWorld(true);}
    // A renderização fica com o loop do Valério: os dois modelos compartilham depth buffer.
  }
  window.ProtagonistaGLBReady=false;
  if(!disabled){if(document.readyState==='complete')findAPI();else window.addEventListener('load',findAPI,{once:true});requestAnimationFrame(frame);}
})();