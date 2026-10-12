/* Valério GLB + foice. Iluminação, orientação e movimento estabilizados para mobile. */
(function () {
  'use strict';
  // Escala normalizada para manter o Valério em tamanho de chefe na arena.
  const VALERIO_MODEL_HEIGHT=3.8;
  let started=false,failed=false,renderer=null,scene=null,camera=null,root=null,pivot=null;
  let weaponPivot=null,weaponRoot=null,last=0,canvas=null,mixer=null,weaponScaleCompensation=false;
  let animationClips={},attackClips=[],skillClips=[],currentAction=null,currentActionType='',armBone=null,forearmBone=null,handBone=null,legLeft=null,legRight=null,armBase=null,forearmBase=null,handBase=null,legLeftBase=null,legRightBase=null;
  let deathPlayed=false,restoreModelScales=null,rootBasePosition=null,fittedRoot=null;
  let animationFloorProfiles=[],floorEnvelopeMinY=0;
  let attackCycleActive=false,activeAttackClip=null,nextAttackClipIndex=0,activeAttackStage=0;
  // Modo diagnóstico: permite comparar o mesmo GLB com os clips pausados.
  const disableValerioClips=new URLSearchParams(window.location.search).get('valerioNoAnimations')==='1';
  let lastHitSerial=0,hurtUntil=0,previousState='',renderedYaw=null;
  function loadScript(url) {
    return new Promise(function(resolve,reject){
      const s=document.createElement('script');s.src=url;s.onload=resolve;
      s.onerror=function(){reject(new Error('Falha ao carregar '+url));};document.head.appendChild(s);
    });
  }
  // Diagnóstico visual opcional para testes no celular; desligado no jogo normal.
  const debugParams=new URLSearchParams(window.location.search);
  const showAnimationDebug=false; // diagnóstico fica no console; nunca cobre a tela jogável no celular.
  const useOriginalValerioBaseline=debugParams.get('valerioOriginal')==='1';
  const useUpdatedValerioModel=debugParams.get('valerioStableModel')!=='1';
  function showStatus(message,isError) {
    if(isError)console.warn('Valério GLB:',message);
    else console.info('Valério GLB:',message);
    // Erro curto no celular, sem painel que cubra a arena.
    if(isError){
      let notice=document.getElementById('valerio-glb-error');
      if(!notice){
        notice=document.createElement('div');notice.id='valerio-glb-error';
        notice.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;padding:7px 9px;border-radius:6px;background:rgba(70,0,0,.92);color:#fff;font:12px/1.35 monospace;white-space:normal;pointer-events:none;';
        document.body.appendChild(notice);
      }
      notice.textContent='Skin GLB não carregou: '+String(message).slice(0,180);
    }else if(message==='modelo carregado e pronto'){
      const notice=document.getElementById('valerio-glb-error');if(notice)notice.remove();
    }
    if(showAnimationDebug){
      let panel=document.getElementById('valerio-glb-status');
      if(!panel){
        panel=document.createElement('pre');panel.id='valerio-glb-status';
        panel.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:2147483646;max-height:78vh;overflow-y:auto;margin:0;padding:12px;background:rgba(8,8,15,.97);color:#fff;font:12px/1.45 monospace;white-space:pre-wrap;pointer-events:auto;touch-action:pan-y;border:2px solid #c5a45b;border-radius:8px;';
        document.body.appendChild(panel);
      }
      const entry=String(message);
      // Preserve earlier loader messages: weapon loading can finish before or after the GLB clips.
      if(!panel.textContent.includes(entry))panel.textContent=(panel.textContent?panel.textContent+'\n\n':'')+entry;
      panel.scrollTop=panel.scrollHeight;
      panel.style.borderColor=isError?'#f55':'#c5a45b';
    }
  }
  function hideStatus(){const el=document.getElementById('valerio-glb-status');if(el)el.remove();}
  // Diagnóstico somente no console: a arena nunca deve ficar coberta por texto.
  function errorText(err){
    if(!err)return 'erro sem detalhes';
    return err.message||err.statusText||String(err);
  }
  let runtimeBoundsScratch=null,runtimeSkinnedBoundsScratch=null,runtimeVertexScratch=null;
  function measureModelBounds(model,reuseScratch) {
    // Three.js r147 não tem SkinnedMesh.computeBoundingBox(). A caixa da geometria
    // bruta ignora os pesos dos ossos; aplique a skin a cada vértice antes do fit.
    model.updateMatrixWorld(true);
    model.traverse(function(obj) {
      if (obj.isSkinnedMesh && obj.skeleton) obj.skeleton.update();
    });
    model.updateMatrixWorld(true);
    const box=reuseScratch?(runtimeBoundsScratch||(runtimeBoundsScratch=new THREE.Box3())):new THREE.Box3();
    box.makeEmpty();
    model.traverse(function(obj) {
      if (!obj.isMesh || !obj.geometry) return;
      const position = obj.geometry.attributes && obj.geometry.attributes.position;
      if (obj.isSkinnedMesh && obj.skeleton && position && typeof obj.boneTransform === 'function') {
        const vertex=reuseScratch?(runtimeVertexScratch||(runtimeVertexScratch=new THREE.Vector3())):new THREE.Vector3();
        const skinnedBox=reuseScratch?(runtimeSkinnedBoundsScratch||(runtimeSkinnedBoundsScratch=new THREE.Box3())):new THREE.Box3();
        skinnedBox.makeEmpty();
        for (let i = 0; i < position.count; i++) {
          vertex.fromBufferAttribute(position, i);
          obj.boneTransform(i, vertex);
          vertex.applyMatrix4(obj.matrixWorld);
          skinnedBox.expandByPoint(vertex);
        }
        if (!skinnedBox.isEmpty()) {
          box.union(skinnedBox);
          return;
        }
      }
      if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
      if (obj.geometry.boundingBox) {
        box.union(obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld));
        return;
      }
      box.union(new THREE.Box3().setFromObject(obj));
    });
    return box;
  }
  function measureAnimationEnvelope(model, clips) {
    if (!mixer || !clips || !clips.length) {
      return { box: measureModelBounds(model), samples: 0, floorProfiles: [] };
    }
    const savedTransforms = [];
    model.traverse(function(obj) {
      if (obj.position && obj.quaternion && obj.scale) {
        savedTransforms.push({
          object: obj,
          position: obj.position.clone(),
          quaternion: obj.quaternion.clone(),
          scale: obj.scale.clone()
        });
      }
    });
    const restoreTransforms = function() {
      savedTransforms.forEach(function(state) {
        state.object.position.copy(state.position);
        state.object.quaternion.copy(state.quaternion);
        state.object.scale.copy(state.scale);
      });
    };
    const envelope = new THREE.Box3();
    let referenceBox = null;
    let samples = 0;
    const floorProfiles = [];
    try {
      clips.forEach(function(clip) {
        const duration = Math.max(0, Number(clip.duration) || 0);
        const intervals = Math.max(1, Math.ceil(duration * 12));
        const floorSamples = [];
        for (let i = 0; i <= intervals; i++) {
          mixer.stopAllAction();
          restoreTransforms();
          const action = mixer.clipAction(clip);
          action.reset();
          action.enabled = true;
          action.setEffectiveWeight(1);
          action.setEffectiveTimeScale(1);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          action.paused = true;
          action.time = duration * (i / intervals);
          mixer.update(0);
          const poseBox = measureModelBounds(model);
          if (!poseBox.isEmpty()) {
            floorSamples.push({ time: duration * (i / intervals), minY: poseBox.min.y });
            envelope.union(poseBox);
            const isIdlePose = /idle|breath|rest|stand/i.test(clip.name || '');
            if (i === 0 && (!referenceBox || isIdlePose)) referenceBox = poseBox.clone();
          }
          samples++;
        }
        if (floorSamples.length) floorProfiles.push({ clip: clip, duration: duration, samples: floorSamples });
      });
    } finally {
      mixer.stopAllAction();
      restoreTransforms();
      model.updateMatrixWorld(true);
      model.traverse(function(obj) {
        if (obj.isSkinnedMesh && obj.skeleton) obj.skeleton.update();
      });
      model.updateMatrixWorld(true);
    }
    if (envelope.isEmpty()) throw new Error('Não foi possível medir as poses esqueléticas do GLB');
    return { box: envelope, referenceBox: referenceBox || envelope.clone(), samples: samples, floorProfiles: floorProfiles };
  }
  function fitModel(model,height,diagnosticName,clips) {
    const measureFitBounds = function() {
      return clips && clips.length ? measureAnimationEnvelope(model,clips) : { box: measureModelBounds(model), samples: 0 };
    };
    let measurement = measureFitBounds();
    let box = measurement.box;
    let size=box.getSize(new THREE.Vector3());
    let poseSize=(measurement.referenceBox||box).getSize(new THREE.Vector3());
    if(poseSize.z>poseSize.y*1.35 && poseSize.z>poseSize.x*0.72) {
      model.rotation.x=-Math.PI/2;
      measurement=measureFitBounds();
      box=measurement.box;
      size=box.getSize(new THREE.Vector3());
      poseSize=(measurement.referenceBox||box).getSize(new THREE.Vector3());
    }
    if(!isFinite(size.y)||size.y<0.01) {
      model.rotation.x=Math.PI/2;
      measurement=measureFitBounds();
      box=measurement.box;
      size=box.getSize(new THREE.Vector3());
    }
    if(!isFinite(size.y)||size.y<0.01) throw new Error('GLB sem dimensões válidas nos eixos X/Y/Z');
    const measuredHeight=size.y;
    const appliedScale=height/measuredHeight;
    // Aplica o fator à escala importada, em vez de apagá-la: alguns GLBs têm
    // escala-base diferente de 1. A caixa de referência recebe o mesmo fator.
    const baseScale=model.scale.clone();
    const basePosition=model.position.clone();
    const floorMinY=(measurement.box.min.y-basePosition.y)*appliedScale;
    const floorProfiles=(measurement.floorProfiles||[]).map(function(profile){
      return {clip:profile.clip,duration:profile.duration,samples:profile.samples.map(function(sample){
        return {time:sample.time,minY:(sample.minY-basePosition.y)*appliedScale};
      })};
    });
    model.scale.set(baseScale.x*appliedScale,baseScale.y*appliedScale,baseScale.z*appliedScale);
    if(diagnosticName){
      window.ValerioScaleDiagnostics='Modelo: '+diagnosticName+' | altura medida nas poses do esqueleto: '+measuredHeight.toFixed(5) + ' | fator aplicado à escala-base: '+appliedScale.toFixed(5)+' | alvo: '+height;
      window.ValerioPoseBoundsDiagnostics=(clips&&clips.length?clips.length+' clips / '+measurement.samples+' poses esqueléticas':'pose estática')+' | altura máxima: '+measuredHeight.toFixed(5)+' | fator raiz: '+appliedScale.toFixed(5);
    }
    // O ajuste dos pés usa a mesma pose de referência usada no cálculo de escala,
    // sem fazer uma segunda varredura cara por todos os vértices/animações no celular.
    // Usa o envelope de TODAS as animações para ancorar o ponto mais baixo no piso.
    // A pose idle serve para centralizar X/Z, mas não para calcular o chão: caminhada e
    // morte podem ter pés/armadura mais baixos do que a pose de referência.
    const anchorBox=(measurement.referenceBox||measurement.box).clone();
    anchorBox.min.sub(basePosition).multiplyScalar(appliedScale).add(basePosition);
    anchorBox.max.sub(basePosition).multiplyScalar(appliedScale).add(basePosition);
    const floorBox=measurement.box.clone();
    floorBox.min.sub(basePosition).multiplyScalar(appliedScale).add(basePosition);
    floorBox.max.sub(basePosition).multiplyScalar(appliedScale).add(basePosition);
    if(anchorBox.isEmpty()||floorBox.isEmpty()) throw new Error('Não foi possível determinar a pose de referência para o piso');
    const anchorCenter=anchorBox.getCenter(new THREE.Vector3());
    model.position.set(-anchorCenter.x,-floorBox.min.y,-anchorCenter.z);
    model.updateMatrixWorld(true);
    return {floorMinY:floorMinY,floorProfiles:floorProfiles};
  }
  // Mede a malha esquelética na pose FINAL deste frame (inclui os ossos e rotações manuais) e
  // translada só o pivô verticalmente até o ponto mais baixo tocar o piso real do boss.
  function anchorPoseToFloor(targetY) {
    if(!root||!pivot||!Number.isFinite(targetY))return;
    const bounds=measureModelBounds(root,true);
    if(!bounds.isEmpty()&&Number.isFinite(bounds.min.y)){const v=window.ValerioModelView||{};const state=String(v.state||'').toLowerCase();const idleLike=state==='idle'||state==='approach'&&(Number(v.speed)||0)<8||state==='static-pose';const sink=idleLike?0.12:0.065;pivot.position.y+=targetY-bounds.min.y-sink;} // MOD 8: correção maior em repouso, quando a folga sob as botas fica mais visível.
  }
  function animationFloorCorrection() {
    if (!currentAction || !animationFloorProfiles.length) return 0;
    const clip = currentAction.getClip();
    const profile = animationFloorProfiles.find(function(entry) { return entry.clip === clip; });
    if (!profile || !profile.samples.length) return 0;
    const duration = Math.max(0, Number(profile.duration) || 0);
    let time = Number(currentAction.time) || 0;
    if (currentAction.loop === THREE.LoopRepeat && duration > 0) time = ((time % duration) + duration) % duration;
    time = Math.max(0, Math.min(duration, time));
    const samples = profile.samples;
    if (samples.length === 1 || time <= samples[0].time) return floorEnvelopeMinY - samples[0].minY;
    let low = 0, high = samples.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (samples[middle].time <= time) low = middle; else high = middle;
    }
    const a = samples[low], b = samples[high];
    const span = b.time - a.time;
    const amount = span > 0 ? (time - a.time) / span : 0;
    const poseMinY = a.minY + (b.minY - a.minY) * amount;
    return floorEnvelopeMinY - poseMinY;
  }
  // GLTFs podem conter trilhas de escala em grupos ou no próprio esqueleto.
  // O fit é calculado a partir da escala importada; se um clip trocar, por
  // exemplo, 0.01 por 1, o fator do grupo pai transforma Valério num gigante.
  // A escala não é necessária para caminhar/atacar: preservamos a escala-base
  // de cada nó e deixamos os clips animarem posição/rotação normalmente.
  function lockModelScales(model) {
    const states=[];
    model.traverse(function(obj){
      if(obj.scale)states.push({
        object:obj,
        base:obj.scale.clone(),
        name:obj.name||obj.type||'nó sem nome'
      });
    });
    let warned=false;
    return function(){
      const corrected=[];
      for(let i=0;i<states.length;i++){
        const state=states[i],obj=state.object,base=state.base;
        if(Math.abs(obj.scale.x-base.x)>1e-5||
           Math.abs(obj.scale.y-base.y)>1e-5||
           Math.abs(obj.scale.z-base.z)>1e-5){
          obj.scale.copy(base);
          corrected.push(state.name);
        }
      }
      if(corrected.length&&!warned){
        warned=true;
        console.warn('Valério: escala animada bloqueada para preservar o tamanho normalizado. Nós alterados pelo clip:',corrected);
        window.ValerioScaleDiagnostics='Escala alterada por animação em: '+corrected.join(', ');
      }
    };
  }
  function improveMaterials(model) {
    model.traverse(function(obj){
      if(!obj.isMesh)return;
      obj.frustumCulled=false;
      (Array.isArray(obj.material)?obj.material:[obj.material]).forEach(function(mat){
        if(!mat)return;
        // Mantém os mapas de textura originais, mas remove fatores de cor
        // quase pretos que podem ter sido exportados incorretamente no GLB.
        if(mat.color && mat.map) mat.color.set(0xffffff);
        if(mat.color && !mat.map && mat.color.r<0.08 && mat.color.g<0.08 && mat.color.b<0.08) {
          mat.color.set(0x77717f);
        }
        if(mat.roughness!==undefined) mat.roughness=Math.max(mat.roughness,0.62);
        if(mat.metalness!==undefined) mat.metalness=Math.min(mat.metalness,0.18);
        if(mat.emissive && mat.emissive.r+mat.emissive.g+mat.emissive.b<0.03) {
          mat.emissive.set(0x100d16);
          if(mat.emissiveIntensity!==undefined) mat.emissiveIntensity=0.35;
        }
        if(mat.opacity<1){mat.opacity=1;mat.transparent=false;mat.depthWrite=true;}
        mat.needsUpdate=true;
      });
    });
  }
  function loadWeapon() {
    new THREE.GLTFLoader().load('./Espada1.glb',function(gltf){
      weaponRoot=gltf.scene;fitModel(weaponRoot,1.35);improveMaterials(weaponRoot);
      weaponPivot=new THREE.Group();
      // O pivô fica no punho; deslocamos o modelo para que a mão segure o cabo,
      // em vez de apoiar a arma pela extremidade inferior do modelo.
      weaponPivot.position.set(0,-.02,0);
      weaponPivot.rotation.set(0,0,-.12);
      weaponRoot.position.y-=.61; // ajuste proporcional ao novo tamanho da arma para manter o cabo na mão
      weaponPivot.add(weaponRoot);
      if(handBone){handBone.add(weaponPivot);weaponScaleCompensation=true;}else{pivot.add(weaponPivot);weaponScaleCompensation=false;}
      showStatus((window.ValerioClipDiagnostics||'Clips do modelo carregados')+'\nfoice carregada; presa em '+(handBone&&handBone.name||'pivô do corpo')+'; ajuste de pegada ativo',false);
      console.info('Espada1.glb anexada à mão direita:',handBone&&handBone.name);
    },undefined,function(err){console.warn('Espada1.glb não carregou.',err);});
  }
  function findAnimationBones(model) {
    model.traverse(function(obj){
      if(!obj.isBone)return;
      const n=(obj.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      if(!armBone && !/forearm/.test(n) && (/(right.*(upperarm|arm)$|mixamorigrightarm$)/.test(n)))armBone=obj;
      if(!forearmBone && /(right.*forearm$|mixamorigrightforearm$)/.test(n))forearmBone=obj;
      if(!handBone && /(righthand$|handright$|mixamorigrighthand$|handr$)/.test(n))handBone=obj;
      if(!legLeft && /(leftupleg$|leftthigh$|mixamorigleftupleg$|mixamorigleftthigh$)/.test(n))legLeft=obj;
      if(!legRight && /(rightupleg$|rightthigh$|mixamorigrightupleg$|mixamorigrightthigh$)/.test(n))legRight=obj;
    });
    if(armBone)armBase=armBone.rotation.clone();
    if(forearmBone)forearmBase=forearmBone.rotation.clone();
    if(handBone)handBase=handBone.rotation.clone();
    if(legLeft)legLeftBase=legLeft.rotation.clone();
    if(legRight)legRightBase=legRight.rotation.clone();
  }
  function stopAction() {
    if(currentAction){currentAction.fadeOut(.08);currentAction=null;}
    currentActionType='';
  }
  function playClip(type,oneShot,overrideClip) {
    const clip=overrideClip||animationClips[type];
    if(!clip||!mixer)return false;
    const next=mixer.clipAction(clip);
    // Um clip de uma execução (ataque/morte) deve permanecer no último quadro;
    // isRunning() fica falso após terminar e, sem esta proteção, o clip reinicia a cada frame.
    const requestedState=String(window.ValerioModelView&&window.ValerioModelView.state||'').toLowerCase();
    // Não reinicia a cada frame enquanto o estado continua igual; mas permite um novo golpe
    // quando o combate sai de attack/recover e entra em attack novamente.
    if(currentAction===next&&next.isRunning())return true;
    if(currentAction===next&&oneShot&&next.enabled&&next.paused&&previousState===requestedState)return true;
    if(currentAction)currentAction.fadeOut(.1);
    next.reset();next.enabled=true;
    // A corrida usa o clip de corrida; a caminhada tem cadência corrigida pela velocidade real no frame().
    next.setEffectiveTimeScale(type==='run'?0.92:1);
    next.setEffectiveWeight(1);
    next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);
    next.clampWhenFinished=!!oneShot;next.fadeIn(.1).play();currentAction=next;currentActionType=type;
    return true;
  }
  function chooseAnimation(v,now) {
    const state=String(v.state||'').toLowerCase();
    // Morte tem prioridade absoluta: um último hit não pode substituir a queda por dano.
    if(state==='dead'||state==='death'||state==='dying'){
      if(animationClips.death){
        if(!deathPlayed){playClip('death',true);deathPlayed=true;}
        return 'death';
      }
      stopAction();return 'procedural-death';
    }
    const serial=window.ValerioBossHitSerial||0;
    if(v.skillLocked)hurtUntil=0;
    if(serial!==lastHitSerial){
      lastHitSerial=serial;
      // Um novo golpe recebido precisa reiniciar a reação mesmo se o clip de dano
      // anterior terminou pausado no último quadro e o estado do chefe não mudou.
      if(currentActionType==='hurt'&&currentAction){
        currentAction.stop();
        currentAction=null;
        currentActionType='';
      }
      // A reação deve terminar junto com o clip real, não com um timer fixo
      // que cortava animações de dano mais longas no meio do movimento.
      const hurtDuration=animationClips.hurt?Math.max(0.43,Number(animationClips.hurt.duration)||0.43):0.43;
      if(!v.skillLocked)hurtUntil=now+hurtDuration*1000;
    }
    const hurt=!v.skillLocked&&hurtUntil>now;
    if(hurt){
      attackCycleActive=false;activeAttackClip=null;
      if(animationClips.hurt){playClip('hurt',true);return 'hurt';}
      stopAction();return 'procedural-hurt';
    }
    deathPlayed=false;
    // O clip de ataque pode durar mais que a janela de dano do combate.
    // Durante a recuperação, deixa o movimento visual terminar sem prolongar hitbox/dano.
    if(state==='recover'&&(currentActionType==='attack'||currentActionType==='skill')&&currentAction&&currentAction.isRunning()){
      attackCycleActive=false;activeAttackClip=null;
      return currentActionType;
    }
    // Os ataques normais (incluindo estados internos de golpe) alternam entre os dois clips.
    const isAttackState=state==='attack'||state==='skill1'||state==='skill2'||state==='skill3';
    if(isAttackState){
      // Cobrança possui dois impactos reais; cada janela precisa de um golpe visual
      // separado. Antes, os dois eventos de dano aconteciam durante uma única animação.
      const requestedStage=(state==='attack'&&Number(v.secondHitAt)>0&&
        Number(v.stateTime)>=Number(v.secondHitAt))?2:1;
      if(attackCycleActive&&activeAttackStage!==requestedStage){
        if(currentAction&&currentActionType==='attack'){
          currentAction.stop();
          currentAction=null;
          currentActionType='';
        }
        attackCycleActive=false;
        activeAttackClip=null;
      }
      if(attackClips.length){
        if(!attackCycleActive){
          activeAttackClip=attackClips[nextAttackClipIndex%attackClips.length];
          nextAttackClipIndex=(nextAttackClipIndex+1)%attackClips.length;
          attackCycleActive=true;
          activeAttackStage=requestedStage;
        }
        playClip('attack',true,activeAttackClip);
        return 'attack';
      }
      attackCycleActive=false;activeAttackClip=null;activeAttackStage=0;
      stopAction();return 'procedural-attack';
    }
    attackCycleActive=false;activeAttackClip=null;activeAttackStage=0;
    if(v.talking&&animationClips.talk){playClip('talk',false);return 'talk';}
    // Corrida fica reservada a uma aproximação explícita para habilidade;
    // o deslocamento normal do Bispo sempre usa caminhada lenta e controlada.
    if(state==='skillapproach'||state==='approachskill'||state==='runskill'){
      if(animationClips.run){playClip('run',false);return 'run';}
      if(animationClips.walk){playClip('walk',false);return 'walk';}
    }
    if(state==='approach'){
      // Quando o boss quase parou para atacar, não continue a caminhar no lugar.
      if((Number(v.speed)||0)<8&&animationClips.idle){playClip('idle',false);return 'idle';}
      if(animationClips.walk){playClip('walk',false);return 'walk';}
      stopAction();return 'procedural-walk';
    }
    if(state==='stagger'&&!animationClips.hurt){stopAction();return 'procedural-hurt';}
    if((state==='attack'||state==='windup')&&!animationClips.attack){stopAction();return 'procedural-attack';}
    if(animationClips.idle){playClip('idle',false);return 'idle';}
    stopAction();return 'none';
  }
  function start() {
    if(started||failed)return;started=true;window.ValerioGLBLoading=true;
    loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js')
      .then(function(){return loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js');})
      .then(function(){return loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/DRACOLoader.js');})
      .then(function(){
        if(!window.THREE||!THREE.GLTFLoader)throw new Error('Three.js/GLTFLoader indisponível');
        canvas=document.createElement('canvas');canvas.id='valerio-bishop-glb';
        canvas.setAttribute('aria-hidden','true');
        canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;display:none;';
        document.body.appendChild(canvas);
        renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:false,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.1));renderer.setSize(window.innerWidth,window.innerHeight,false);
        renderer.setClearColor(0x000000,0);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=1.0;
        scene=new THREE.Scene();
        // Materiais PBR do GLB precisam de luzes na cena Three.js.
        scene.add(new THREE.HemisphereLight(0xe4e9ff,0x393044,2.0));
        const key=new THREE.DirectionalLight(0xffe6cf,2.6);key.position.set(-4,7,5);scene.add(key);
        const fill=new THREE.DirectionalLight(0x9b8cff,1.15);fill.position.set(4,3,-4);scene.add(fill);
        const rim=new THREE.PointLight(0xb52dff,1.1,12);rim.position.set(0,2.2,-1.8);scene.add(rim);
        // O jogo e o GLB usam contextos WebGL distintos; o depth buffer do
        // terreno não é compartilhado. Recriamos no canvas transparente as quatro
        // caixas de piso de valerio-dimension.js, somente para escrever profundidade.
        // Assim o GLB é ocluído pelo piso real sem cobrir os pixels do cenário.
        const floorDepthMaterial=new THREE.MeshBasicMaterial({
          color:0x000000,colorWrite:false,depthWrite:true,depthTest:true
        });
        const floorDepthBoxes=[
          [132,.9,78,0,-.92,-2.5],
          [120,.34,66,0,-.22,-2.5],
          [130,.72,64,0,-.38,-2.5],
          [16.2,.09,50,0,-.015,-2.5]
        ];
        floorDepthBoxes.forEach(function(box){
          const occluder=new THREE.Mesh(new THREE.BoxGeometry(box[0],box[1],box[2]),floorDepthMaterial);
          occluder.position.set(box[3],box[4],box[5]);
          occluder.renderOrder=-100;occluder.frustumCulled=false;
          scene.add(occluder);
        });
        camera=new THREE.PerspectiveCamera(58.4,window.innerWidth/window.innerHeight,.1,90);
        showStatus('carregando arquivo...',false);
        const valerioModelUrl=useOriginalValerioBaseline
          ?'https://raw.githubusercontent.com/PHBritoDev/Jogo-2-2.5D/c2ce8ac71b2f81989bc30d8159fa63ec89331b21/Bispo1.0.glb?baseline=20261011a'
          :(useUpdatedValerioModel
            ?'https://raw.githubusercontent.com/PHBritoDev/Jogo-2-2.5D/main/Bispo1.0.glb?valerioModelTest=20261011h-fresh-upload'
            :'https://raw.githubusercontent.com/PHBritoDev/Jogo-2-2.5D/e4af770/Bispo1.0.glb');
        const gltfLoader=new THREE.GLTFLoader();
        // O novo Bispo1.0.glb pode usar Draco; habilitamos o decoder
        // oficial da mesma versão do Three.js. GLBs sem Draco continuam funcionando.
        const dracoLoader=new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/libs/draco/');
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load(valerioModelUrl,function(gltf){
          try {
            root=gltf.scene;improveMaterials(root);
            // Mantém a escala normalizada no próprio GLB, como na versão que tinha
            // proporções corretas; trava mudanças de escala vindas dos clips.
            // fitModel normaliza a geometria para 0,95 unidade; não aplicar uma segunda escala.
            pivot=new THREE.Group();pivot.scale.setScalar(1);pivot.add(root);scene.add(pivot);
            // O mixer mede as poses antes de congelar a escala-base normalizada.
            mixer=new THREE.AnimationMixer(root);
            const clips=(gltf.animations||[]).map(function(clip){
              // Remove keyframes de escala que podem inflar o modelo.
              clip.tracks=clip.tracks.filter(function(track){
                const path=String(track.name||'').replace(/\[[^\]]*\]$/,'');
                const property=path.split(/[.:/]/).pop().toLowerCase();
                return property!=='scale';
              });
              const clipName=(clip.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
              // Qualquer clip pode conter translação do nó raiz. Neutralizamos
              // essa translação em todos os clips para que a animação não tire o
              // modelo do ponto de apoio controlado pela física do jogo.
              const isRootMotionClip=true;
              const isLocomotionClip=/walk|walking|run|running|sprint|jog|locomotion/.test(clipName);
              const isDeathMotionClip=/death|dying|^die$|defeat|knockout|fall|hitknockback/.test(clipName);
              if(isRootMotionClip||isLocomotionClip||isDeathMotionClip){
                const changed=[];
                clip.tracks.forEach(function(track){
                  const trackName=String(track.name||'');
                  const prop=trackName.split(/[.:/]/).pop().replace(/\[[^\]]*\]$/,'').toLowerCase();
                  if(prop!=='position')return;
                  const nodeName=trackName.replace(/\.position.*$/i,'').replace(/\/position.*$/i,'').replace(/\[.*?\]/g,'').toLowerCase();
                  const isRootNode=/(^|[^a-z])(root|armature|scene|rootmotion)([^a-z]|$)/i.test(nodeName);
                  const isHips=/hips|pelvis/.test(nodeName);
                  if(!isRootNode&&!isHips)return;
                  const values=track.values, stride=typeof track.getValueSize==='function'?track.getValueSize():3;
                  if(!values||stride<3||!track.times||!track.times.length)return;
                  const firstX=values[0],firstY=values[1],firstZ=values[2];
                  for(let k=0;k<track.times.length;k++){
                    const i=k*stride;
                    if(isRootNode){values[i]=firstX;values[i+1]=firstY;values[i+2]=firstZ;}
                    else {
                      values[i]=firstX;values[i+2]=firstZ;
                      // Caminhada/corrida não deve animar a altura do quadril:
                      // isso fazia o modelo inteiro parecer flutuar acima do piso.
                      if(isLocomotionClip||isDeathMotionClip)values[i+1]=firstY;
                    }
                  }
                  changed.push(trackName);
                });
                console.info('Valério: root motion neutralizado em "'+clip.name+'"; trilhas ajustadas:',changed.length?changed:'nenhuma trilha de posição de raiz/quadril reconhecida');
              }
              return clip;
            });
            const floorFit=fitModel(root,VALERIO_MODEL_HEIGHT,'Bispo1.0.glb',clips);
            animationFloorProfiles=floorFit.floorProfiles;
            floorEnvelopeMinY=floorFit.floorMinY;
            rootBasePosition=root.position.clone();
            restoreModelScales=lockModelScales(pivot);
            const normalized=function(c){return (c.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');};
            const pickClip=function(patterns){
              return clips.find(function(c){
                const name=normalized(c);
                return patterns.some(function(re){return re.test(name);})&&!/wave|hello|greet/.test(name);
              })||null;
            };
            const pickClips=function(patterns){
              return clips.filter(function(c){
                const name=normalized(c);
                return patterns.some(function(re){return re.test(name);})&&!/wave|hello|greet/.test(name);
              });
            };
            const attackExclude=/walk|run|hurt|damage|death|dead|fall|magic|spell|cast|pose|idle|breath|rest|stand|talk|speak|rootmotion|knockback/;
            const sortAttackClips=function(list){
              return list.slice().sort(function(a,b){
                const na=normalized(a),nb=normalized(b);
                const ma=na.match(/(\\d+)$/),mb=nb.match(/(\\d+)$/);
                if(ma&&mb&&Number(ma[1])!==Number(mb[1]))return Number(ma[1])-Number(mb[1]);
                if(ma&&!mb)return -1;
                if(!ma&&mb)return 1;
                return 0;
              });
            };
            // Primeiro tenta os dois golpes individuais. Um clip de combo longo
            // não deve ocupar uma das vagas e quebrar a alternância entre ataques.
            const individualAttacks=sortAttackClips(pickClips([/attack/,/slash/,/swing/,/strike/,/sword/,/scythe/,/melee/])
              .filter(function(c){
                const name=normalized(c);
                return !attackExclude.test(name)&&!/combo|chain/.test(name);
              }));
            const numberedAttacks=individualAttacks.filter(function(c){return /(?:attack|slash|swing|strike|sword|scythe|melee)\\d+$/.test(normalized(c));});
            attackClips=(numberedAttacks.length>=2?numberedAttacks:individualAttacks).slice(0,2);
            // Só usa combo como último recurso, caso o GLB não tenha dois golpes individuais.
            if(attackClips.length<2){
              const comboAttacks=sortAttackClips(pickClips([/combo/])
                .filter(function(c){return !attackExclude.test(normalized(c));}));
              comboAttacks.forEach(function(c){
                if(attackClips.length<2&&!attackClips.includes(c))attackClips.push(c);
              });
            }
            skillClips=[];
            animationClips={
              idle:pickClip([/idle/,/breath/,/rest/,/stand/]),
              walk:pickClip([/walk/,/walking/,/locomotion/,/walkforward/]),
              run:pickClip([/run/,/running/,/sprint/,/jog/]),
              attack:attackClips[0]||pickClip([/attack/,/slash/,/swing/,/strike/,/sword/,/scythe/,/combo/,/melee/]),
              hurt:pickClip([/hurt/,/damage/,/stagger/,/flinch/,/hitreaction/]),
              // Nunca confundir o clip de knockback/queda com reação de dano ou morte.
              // Evita clips genéricos de queda lateral. Se não houver morte dedicada,
              // usa a animação de knockback para trás do próprio GLB antes do fallback procedural.
              death:pickClip([/^death/,/dying/,/^die$/, /defeat/,/knockout/])||pickClip([/hitknockbackrootmotion/,/fallback/,/fall_backward/,/backfall/]),
              magic:pickClip([/magic/,/cast/,/spell/,/grimoire/,/bible/,/book/,/prayer/,/pose/]),
              talk:pickClip([/talk/,/speak/])
            };
            findAnimationBones(root);
            // Mesmo no modo estático, avaliamos uma única pose do esqueleto.
            // Sem uma pose inicial avaliada pelo AnimationMixer, alguns GLBs com
            // skin/armature podem renderizar o mesh colapsado ou aparentemente invisível.
            if(disableValerioClips&&mixer){
              const staticPoseClip=animationClips.idle||clips[0];
              if(staticPoseClip){
                const staticPoseAction=mixer.clipAction(staticPoseClip);
                staticPoseAction.reset().play();
                mixer.update(0);
                staticPoseAction.paused=true;
                currentAction=staticPoseAction;
                currentActionType='static-pose';
              }else{
                mixer.update(0);
              }
            }
            window.ValerioGLBReady=true;window.ValerioGLBLoading=false;
            showStatus('modelo carregado e pronto',false);
            const clipInfo=clips.length?clips.map(function(c){return (c.name||'(sem nome)')+' '+Number(c.duration||0).toFixed(2)+'s';}).join(' | '):'NENHUM CLIP NO GLB';
            const mapped='idle='+(animationClips.idle&&animationClips.idle.name||'—')+'; walk='+(animationClips.walk&&animationClips.walk.name||'—')+'; run='+(animationClips.run&&animationClips.run.name||'—')+'; ataques alternados='+attackClips.map(function(c){return c.name||'(sem nome)';}).join(' → ')+'; dano='+(animationClips.hurt&&animationClips.hurt.name||'—')+'; morte='+(animationClips.death&&animationClips.death.name||'—');
            window.ValerioClipDiagnostics='GLB clips ('+clips.length+'): '+clipInfo+'\n'+mapped+'\nbraço='+(armBone&&armBone.name||'não encontrado')+'; mão='+(handBone&&handBone.name||'não encontrada')+(window.ValerioScaleDiagnostics?'\n'+window.ValerioScaleDiagnostics:'')+'\nmodelo selecionado: '+(useUpdatedValerioModel?'ATUALIZADO':'ESTÁVEL');
            showStatus(window.ValerioClipDiagnostics,false);
            loadWeapon();
            console.info('Valério: clips disponíveis',clips.map(function(a){return {name:a.name,duration:a.duration};}),'mapeamento',mapped);
          } catch(err) {
            failed=true;window.ValerioGLBReady=false;window.ValerioGLBLoading=false;window.ValerioGLBRendering=false;showStatus('erro ao preparar modelo: '+errorText(err),true);console.error('Erro ao preparar Bispo1.glb; usando modelo alternativo.',err);
          }
        },undefined,function(err){
          failed=true;window.ValerioGLBReady=false;window.ValerioGLBLoading=false;showStatus('falha ao carregar arquivo: '+errorText(err),true);console.error('Falha ao carregar ./Bispo1.0.glb; usando modelo alternativo.',err);
        });
      })
      .catch(function(err){failed=true;window.ValerioGLBReady=false;window.ValerioGLBLoading=false;showStatus('Three.js/GLTFLoader falhou: '+errorText(err),true);console.error('Three.js/GLTFLoader não carregou; usando modelo alternativo.',err);});
  }
  function frame(now) {
    requestAnimationFrame(frame);const v=window.ValerioModelView;
    if(!v||!v.active||!window.ValerioGLBReady||!root||!pivot||!renderer||!camera){window.ValerioGLBRendering=false;if(canvas)canvas.style.display='none';return;}
    canvas.style.display='block';window.ValerioGLBRendering=true;const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    camera.aspect=v.aspect||w/h;camera.fov=(v.fov||1.02)*180/Math.PI;camera.updateProjectionMatrix();
    camera.position.set(v.eye[0],v.eye[1],v.eye[2]);camera.lookAt(v.target[0],v.target[1],v.target[2]);
    // A altura do modelo já foi normalizada usando o envelope completo das animações.
    // Não aplicar offsets por estado: isso separava a morte do piso e criava flutuação.
    pivot.position.set(v.position[0],v.position[1],v.position[2]);
    // Corrige o eixo frontal comum em modelos exportados para GLB e gira pelo
    // menor arco possível: evita a volta de 360° quando o jogador cruza atrás.
    const playerPos=Array.isArray(v.playerPosition)?v.playerPosition:null;
    // O GLB já fica orientado com a frente no +Z: mirar diretamente para o jogador
    // evita a inversão de quadrantes que fazia Valério andar de costas/de lado.
    const targetYaw=playerPos?Math.atan2(playerPos[0]-v.position[0],playerPos[2]-v.position[2]):(v.yaw||0);
    const turnDt=Math.min(Math.max((now-last)/1000,0),.05);
    if(renderedYaw===null){renderedYaw=targetYaw;pivot.rotation.y=targetYaw;}
    else {
      const yawDelta=Math.atan2(Math.sin(targetYaw-pivot.rotation.y),Math.cos(targetYaw-pivot.rotation.y));
      // Limite angular real: o boss acompanha o jogador sem girar como um pião.
      const maxTurn=5.0*turnDt;
      pivot.rotation.y+=Math.max(-maxTurn,Math.min(maxTurn,yawDelta));
    }
    const animType=disableValerioClips?'none':chooseAnimation(v,now);
    // Fallback de morte: Valério cai para trás, não de lado.
    const deadProgress=String(v.state||'').toLowerCase()==='dead'?Math.max(0,Math.min(1,(Number(v.stateTime)||0)/0.72)):0;
    pivot.rotation.x=animType==='procedural-death'?-deadProgress*1.42:0;
    pivot.rotation.z=0;
    if(mixer&&!disableValerioClips){
      // Sincroniza a cadência das pernas com a velocidade REAL do BishopBoss.
      // A 80 px/s chega perto do ritmo normal; ao desacelerar, a passada encurta.
      if(animType==='walk'&&currentAction){
        const movementSpeed=Math.max(0,Number(v.speed)||0);
        const synchronizedRate=Math.max(0.18,Math.min(1.05,movementSpeed/76));
        currentAction.setEffectiveTimeScale(synchronizedRate);
      }
      mixer.update(turnDt);
    }
    // Combate define a posição; o ajuste final do piso ocorre depois de aplicar a pose completa.
    if(rootBasePosition&&root)root.position.copy(rootBasePosition);
    // Preserva o offset de pés calculado no fit inicial. O Box3 por frame usava
    // bounds de bind-pose em meshes esqueléticos e fazia Valério afundar no chão.
    if(restoreModelScales)restoreModelScales();
    // A escala do personagem é definida uma vez por fitModel(). Não recalcular
    // a escala pela bounding box animada: respiração, ataque e poses mudam a caixa
    // delimitadora e isso faz o corpo crescer/encolher a cada frame.
    if(disableValerioClips&&window.ValerioClipDiagnostics&&!window.ValerioClipDiagnostics.includes('CLIPS PAUSADOS PARA TESTE')){
      window.ValerioClipDiagnostics+='\\nCLIPS PAUSADOS PARA TESTE';
      console.info('Valério: clips GLB pausados pelo parâmetro valerioNoAnimations=1.');
    }
    if(!disableValerioClips){
      const attackProgress=(v.state==='attack'||v.state==='skill1'||v.state==='skill2')?Math.sin(Math.max(0,Math.min(1,(v.stateTime||0)/Math.max(.1,v.attackDuration||.3)))*Math.PI):0;
      const windup=v.state==='windup'?Math.max(0,Math.min(1,(v.stateTime||0)/Math.max(.1,v.windupDuration||.6))):0;
      const hurtProgress=hurtUntil>now?Math.sin(Math.max(0,Math.min(1,1-(hurtUntil-now)/430))*Math.PI):0;
      // Fallback corporal para clips de ataque/dano ausentes no arquivo.
      root.rotation.z=(v.state==='windup'?.025+windup*.055:0)+
        (animType==='procedural-hurt'?-hurtProgress*.12:0)+Math.sin((v.time||0)*1.35)*.006;
      const t=v.time||0;
      const walking=animType==='procedural-walk'?Math.sin(t*3.2)*.12:0;
      // Só aplicamos rotações manuais quando falta um clip: não anulamos a animação GLB.
      if(armBone&&armBase&&(animType==='procedural-attack'||animType==='procedural-hurt'||animType==='procedural-walk')){
        armBone.rotation.copy(armBase);
        if(animType==='procedural-attack'){
          armBone.rotation.x+=-1.02*attackProgress-windup*.34;
          armBone.rotation.z+=-.98*attackProgress-windup*.3;
        }
        if(animType==='procedural-hurt')armBone.rotation.z+=.38*hurtProgress;
        if(animType==='procedural-walk')armBone.rotation.x+=walking*.35;
      }
      if(forearmBone&&forearmBase&&(animType==='procedural-attack'||animType==='procedural-hurt'||animType==='procedural-walk')){
        forearmBone.rotation.copy(forearmBase);
        if(animType==='procedural-attack'){
          forearmBone.rotation.x+=-1.22*attackProgress;
          forearmBone.rotation.z+=-.42*attackProgress;
        }
        if(animType==='procedural-hurt')forearmBone.rotation.x+=.22*hurtProgress;
        if(animType==='procedural-walk')forearmBone.rotation.x-=walking*.25;
      }
      // O osso da mão também participa do golpe, evitando que só o ombro se mova enquanto a foice parece presa.
      if(handBone&&handBase&&(animType==='procedural-attack'||animType==='procedural-hurt')){
        handBone.rotation.copy(handBase);
        if(animType==='procedural-attack'){
          handBone.rotation.x+=-.28*attackProgress;
          handBone.rotation.z+=-.24*attackProgress;
        }
        if(animType==='procedural-hurt')handBone.rotation.z+=.12*hurtProgress;
      }
      if(legLeft&&legLeftBase&&(animType==='procedural-walk'||animType==='procedural-attack'||animType==='procedural-hurt')){
        legLeft.rotation.copy(legLeftBase);
        if(animType==='procedural-walk')legLeft.rotation.x+=walking;
      }
      if(legRight&&legRightBase&&(animType==='procedural-walk'||animType==='procedural-attack'||animType==='procedural-hurt')){
        legRight.rotation.copy(legRightBase);
        if(animType==='procedural-walk')legRight.rotation.x-=walking;
      }
      if(weaponPivot){
        // A hierarquia do GLB contém escalas de importação pequenas (por exemplo, Armature 0.01).
        // Compensa a escala mundial da mão para a arma manter o tamanho normalizado de 0,62 unidade.
        // Como a compensação fica no pivô, os offsets locais do cabo continuam acompanhando a mão.
        if(weaponScaleCompensation&&handBone){
          handBone.updateWorldMatrix(true,false);
          const handWorldScale=new THREE.Vector3();
          handBone.getWorldScale(handWorldScale);
          weaponPivot.scale.set(
            Math.abs(handWorldScale.x)>1e-5?1/handWorldScale.x:1,
            Math.abs(handWorldScale.y)>1e-5?1/handWorldScale.y:1,
            Math.abs(handWorldScale.z)>1e-5?1/handWorldScale.z:1
          );
        }else weaponPivot.scale.set(1,1,1);
        // O pivô está na mão; o golpe acompanha o braço em vez de girar nas costas.
        const swing=animType==='procedural-attack'?attackProgress:0;
        // Sem clip de ataque no GLB, ampliamos o arco procedural para a foice acompanhar claramente o ombro.
        // Se o GLB vier a ganhar um ataque real, o movimento manual não duplica esse clip.
        weaponPivot.rotation.z=-.12-windup*.42+swing*.58;
        weaponPivot.rotation.x=swing*.3;
      }
  
    }else{
      // Modo estático: remove também os movimentos procedurais, não apenas os clips GLB.
      root.rotation.z=0;
      if(armBone&&armBase)armBone.rotation.copy(armBase);
      if(forearmBone&&forearmBase)forearmBone.rotation.copy(forearmBase);
      if(handBone&&handBase)handBone.rotation.copy(handBase);
      if(legLeft&&legLeftBase)legLeft.rotation.copy(legLeftBase);
      if(legRight&&legRightBase)legRight.rotation.copy(legRightBase);
      if(weaponPivot){weaponPivot.rotation.set(0,0,-.12);}
    }
    // Corrige a altura após mixer, scale restoration e rotações/procedimentos do frame.
    anchorPoseToFloor(Number(v.position[1])||0);
    previousState=v.state||'';
    last=now;renderer.render(scene,camera);
  }
  window.ValerioGLBReady=false;window.ValerioGLBLoading=false;
  function bootValerioGLB(){start();requestAnimationFrame(frame);}
  if(document.readyState==='complete')bootValerioGLB();
  else window.addEventListener('load',bootValerioGLB,{once:true});
})();
