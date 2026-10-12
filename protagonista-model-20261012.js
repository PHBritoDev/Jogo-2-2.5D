/* Protagonista 3D — usa a mesma cena/câmera do Valério para depth correto. */
(function () {
  'use strict';
  let api=null,root=null,pivot=null,mixer=null,rootBasePosition=null,restoreModelScales=null,actions={},currentAction=null,currentType='',ready=false,failed=false,last=0,renderedYaw=null,yawLast=0,swordRoot=null,swordHand=null,swordEffects=[],swordLight=null,swordPhase=0,swordFallbackParent=null;
  const MODEL_HEIGHT=2.15;
  const disabled=new URLSearchParams(window.location.search).get('protagonista3D')==='0';
  function note(message,isError){
    window.ProtagonistaDiagnostics=message;
    if(isError)console.warn('Protagonista GLB:',message);else console.info('Protagonista GLB:',message);
  }
  // Proteção do PR #49: clips exportados podem alterar a escala de ossos/nós e multiplicar o fit do GLB.
  // Guardamos a escala já normalizada e restauramos após cada mixer.update(), sem bloquear posição/rotação.
  function lockModelScales(model){
    const states=[];
    model.traverse(function(obj){
      if(obj.scale)states.push({object:obj,base:obj.scale.clone(),name:obj.name||obj.type||'nó sem nome'});
    });
    let warned=false;
    return function(){
      const corrected=[];
      for(let i=0;i<states.length;i++){
        const state=states[i],obj=state.object,base=state.base;
        if(Math.abs(obj.scale.x-base.x)>1e-5||Math.abs(obj.scale.y-base.y)>1e-5||Math.abs(obj.scale.z-base.z)>1e-5){
          obj.scale.copy(base);
          corrected.push(state.name);
        }
      }
      if(corrected.length&&!warned){
        warned=true;
        window.ProtagonistaScaleDiagnostics='Escala animada bloqueada em: '+corrected.join(', ');
        console.warn('Protagonista: escala animada restaurada para preservar o tamanho normalizado. Nós alterados:',corrected);
      }
    };
  }
  function findAPI(){
    if(disabled||ready||failed)return;
    api=window.ValerioThreeAPI;
    if(!api||!api.THREE||!api.scene||!api.camera||!api.renderer||!api.THREE.GLTFLoader){requestAnimationFrame(findAPI);return;}
    loadModel();
  }
  // Mede a malha já deformada pelo esqueleto. Box3.setFromObject sozinho usa limites brutos
  // em versões antigas do Three.js e pode normalizar o GLB com uma altura incorreta.
  function measureModelBounds(model){
    model.updateMatrixWorld(true);
    model.traverse(function(obj){if(obj.isSkinnedMesh&&obj.skeleton)obj.skeleton.update();});
    model.updateMatrixWorld(true);
    const box=new api.THREE.Box3();
    box.makeEmpty();
    model.traverse(function(obj){
      if(!obj.isMesh||!obj.geometry||obj.visible===false)return;
      let parent=obj.parent;
      while(parent&&parent!==model){if(parent.visible===false)return;parent=parent.parent;}
      const pos=obj.geometry.attributes&&obj.geometry.attributes.position;
      if(obj.isSkinnedMesh&&obj.skeleton&&pos&&typeof obj.boneTransform==='function'){
        const v=new api.THREE.Vector3(),skinnedBox=new api.THREE.Box3();skinnedBox.makeEmpty();
        for(let i=0;i<pos.count;i++){
          v.fromBufferAttribute(pos,i);obj.boneTransform(i,v);v.applyMatrix4(obj.matrixWorld);skinnedBox.expandByPoint(v);
        }
        if(!skinnedBox.isEmpty()){box.union(skinnedBox);return;}
      }
      if(!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();
      if(obj.geometry.boundingBox)box.union(obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld));
      else box.union(new api.THREE.Box3().setFromObject(obj));
    });
    return box;
  }
  function findSwordHand(model){
    const bones=[];
    model.traverse(function(o){if(o.isBone)bones.push(o);});
    const rightHand=/(right.*(hand|wrist)|(hand|wrist).*right|(^|[_ .-])r(hand|wrist)([_ .-]|$)|mixamorig:rightHand)/i;
    return bones.find(function(b){return rightHand.test(b.name||'');})||
      bones.find(function(b){return /hand|wrist|ma[oã]o/i.test(b.name||'');})||null;
  }
  function addSwordEffects(sword){
    const THREE=api.THREE;
    swordLight=new THREE.PointLight(0xffc44d,.72,1.45,2);
    swordLight.position.set(0,.18,.08);
    sword.add(swordLight);
    const glowMaterial=new THREE.MeshBasicMaterial({color:0xffd56a,transparent:true,opacity:.58,blending:THREE.AdditiveBlending,depthWrite:false});
    // Pequenos pontos dourados orbitam a lâmina; não substituem nem alteram o modelo criado pelo usuário.
    for(let i=0;i<7;i++){
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(.012+(i%3)*.003,6,5),glowMaterial);
      mesh.userData.phase=i*Math.PI*2/7;
      mesh.userData.height=-.18+(i%4)*.13;
      mesh.userData.radius=.045+(i%3)*.018;
      sword.add(mesh);swordEffects.push(mesh);
    }
  }
  function loadSword(model){
    const loader=new api.THREE.GLTFLoader();
    loader.load('./EspadaProta.glb?v=espada-prota-mod31',function(gltf){
      try{
        swordRoot=gltf.scene;
        swordRoot.name='EspadaProta_Runtime';
        swordRoot.traverse(function(o){
          if(!o.isMesh)return;
          o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
          const materials=Array.isArray(o.material)?o.material:[o.material];
          materials.forEach(function(m){if(m){m.needsUpdate=true;}});
        });
        // O GLB enviado pelo usuário tem cerca de 1,9 unidade de comprimento; ajustamos para caber na mão.
        swordRoot.scale.setScalar(.43);
        swordRoot.rotation.set(0,0,0);
        swordHand=findSwordHand(model);
        swordFallbackParent=swordHand||model;
        // O osso da mão já fornece a posição no corpo: não somar 1,05 unidade local nele.
        swordRoot.position.set(0,swordHand?-0.36:1.05,swordHand?0.10:0);
        swordFallbackParent.add(swordRoot);
        addSwordEffects(swordRoot);
        if(window.PlayerModelView&&window.PlayerModelView.firstPerson)setSwordFirstPerson(true);
        window.EspadaProtaDiagnostics='EspadaProta.glb carregada; encaixe: '+(swordHand?'osso '+swordHand.name:'modelo do protagonista (nenhum osso de mão reconhecido)')+'; tamanho '+swordRoot.scale.x.toFixed(2)+'; deslocamento '+swordRoot.position.x.toFixed(2)+','+swordRoot.position.y.toFixed(2)+','+swordRoot.position.z.toFixed(2);
      }catch(e){window.EspadaProtaDiagnostics='Erro preparando EspadaProta.glb: '+e.message;console.warn(window.EspadaProtaDiagnostics);}
    },undefined,function(){
      window.EspadaProtaDiagnostics='Falha ao carregar ./EspadaProta.glb. Confira se o arquivo está na raiz do repositório.';
      console.warn(window.EspadaProtaDiagnostics);
    });
  }
  function setSwordFirstPerson(firstPerson){
    if(!swordRoot||!api||!api.camera)return;
    if(firstPerson){
      api.camera.add(swordRoot);
      swordRoot.position.set(.34,-.32,-.72);
      swordRoot.rotation.set(0,0,-.2);
      swordRoot.scale.setScalar(.36);
      swordRoot.traverse(function(o){if(o.isMesh)o.visible=true;});
      swordRoot.visible=true;
    }else{
      if(swordFallbackParent)swordFallbackParent.add(swordRoot);
      swordRoot.position.set(0,swordHand?-0.36:1.05,swordHand?0.10:0);
      swordRoot.rotation.set(0,0,0);
      swordRoot.scale.setScalar(.43);
    }
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
        let box=measureModelBounds(root),size=box.getSize(new THREE.Vector3());
        if(size.z>size.y*1.35&&size.z>size.x*.72){root.rotation.x=-Math.PI/2;box=measureModelBounds(root);size=box.getSize(new THREE.Vector3());}
        if(!isFinite(size.y)||size.y<.01)throw new Error('modelo sem altura válida');
        const factor=MODEL_HEIGHT/size.y;
        window.ProtagonistaScaleDiagnostics='Altura esquelética medida: '+size.y.toFixed(5)+' | fator de ajuste: '+factor.toFixed(5)+' | altura-alvo: '+MODEL_HEIGHT;
        root.scale.multiplyScalar(factor);
        root.position.x-=((box.min.x+box.max.x)/2)*factor;
        root.position.z-=((box.min.z+box.max.z)/2)*factor;
        root.position.y-=box.min.y*factor;
        rootBasePosition=root.position.clone();
        restoreModelScales=lockModelScales(root);
        pivot=new THREE.Group();pivot.visible=false;pivot.add(root);api.scene.add(pivot);
        loadSword(root);
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
  let lastFirstPerson=null,lastSwordStatus=0;
  function updateSwordStatus(now){
    if(now-lastSwordStatus<250)return;lastSwordStatus=now;
    let el=document.getElementById('sword-debug-status');
    if(!el){el=document.createElement('div');el.id='sword-debug-status';el.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;max-width:calc(100vw - 16px);padding:6px 9px;border-radius:6px;background:rgba(0,0,0,.78);color:#ffe08a;font:12px/1.35 monospace;pointer-events:none;';document.body.appendChild(el);}
    el.textContent='ESPADA: '+(window.EspadaProtaDiagnostics||'aguardando carregamento do GLB...');
  }
  function frame(now){
    requestAnimationFrame(frame);
    updateSwordStatus(now);
    const v=window.PlayerModelView;
    if(!ready||!v||!v.active||!pivot||!api){if(pivot)pivot.visible=false;return;}
    if(lastFirstPerson!==!!v.firstPerson){
      if(root)root.traverse(function(o){if(o.isMesh)o.visible=!v.firstPerson;});
      setSwordFirstPerson(!!v.firstPerson);
      lastFirstPerson=!!v.firstPerson;
    }
    pivot.visible=true;
    pivot.position.set(v.position[0],v.position[1],v.position[2]);
    const targetYaw=Number.isFinite(v.yaw)?v.yaw:0;
    const turnDt=Math.min(Math.max((now-yawLast)/1000,0),.05);yawLast=now;
    if(renderedYaw===null)renderedYaw=targetYaw;
    else {const delta=Math.atan2(Math.sin(targetYaw-renderedYaw),Math.cos(targetYaw-renderedYaw));const maxTurn=7*turnDt;renderedYaw+=Math.max(-maxTurn,Math.min(maxTurn,delta));}
    pivot.rotation.y=renderedYaw;
    choose(v);
    if(currentType==='walk'&&currentAction){
      const speed=Math.max(0,Number(v.speed)||0);
      currentAction.setEffectiveTimeScale(Math.max(.35,Math.min(1.35,speed/130)));
    }
    const dt=Math.min(Math.max((now-last)/1000,0),.05);last=now;
    if(mixer)mixer.update(dt);
    if(swordRoot){
      swordPhase+=dt;
      swordEffects.forEach(function(p,i){
        const phase=p.userData.phase+swordPhase*(1.15+(i%3)*.18);
        p.position.set(Math.cos(phase)*p.userData.radius,p.userData.height+Math.sin(swordPhase*1.8+i)*.025,Math.sin(phase)*p.userData.radius+.025);
        p.visible=Math.sin(swordPhase*2+i*.9)>.05;
      });
      if(swordLight)swordLight.intensity=.55+.22*(.5+.5*Math.sin(swordPhase*2.4));
    }
    if(restoreModelScales)restoreModelScales();
    if(root&&rootBasePosition){root.position.copy(rootBasePosition);root.updateMatrixWorld(true);}
    // A renderização fica com o loop do Valério: os dois modelos compartilham depth buffer.
  }
  window.ProtagonistaGLBReady=false;
  window.EspadaProtaDiagnostics='aguardando carregamento do modelo do protagonista...';
  if(!disabled){if(document.readyState==='complete')findAPI();else window.addEventListener('load',findAPI,{once:true});requestAnimationFrame(frame);}
})();