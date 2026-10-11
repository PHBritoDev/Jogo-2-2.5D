/* Valério GLB + foice. Iluminação, orientação e movimento estabilizados para mobile. */
(function () {
  'use strict';
  // Calibração validada pelo espaço da arena: o GLB ocupa 2,7 unidades de altura.
  const VALERIO_MODEL_HEIGHT=2.7;
  let started=false,failed=false,renderer=null,scene=null,camera=null,root=null,pivot=null;
  let weaponPivot=null,weaponRoot=null,last=0,canvas=null,mixer=null;
  let animationClips={},attackClips=[],skillClips=[],currentAction=null,currentActionType='',armBone=null,forearmBone=null,handBone=null,legLeft=null,legRight=null,armBase=null,forearmBase=null,handBase=null,legLeftBase=null,legRightBase=null;
  let deathPlayed=false,restoreModelScales=null,rootBasePosition=null,fittedRoot=null;
  let attackCycleActive=false,activeAttackClip=null,nextAttackClipIndex=0;
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
  function measureModelBounds(model) {
    // Atualiza primeiro a hierarquia e as juntas. Em SkinnedMesh, a caixa da
    // geometria bruta NÃO representa a malha deformada pelo esqueleto: usar
    // geometry.boundingBox aqui pode medir só os vértices locais minúsculos e
    // fazer fitModel aplicar uma escala enorme, embora o corpo renderizado seja gigante.
    model.updateMatrixWorld(true);
    model.traverse(function(obj) {
      if (obj.isSkinnedMesh && obj.skeleton) {
        obj.skeleton.update();
        if (typeof obj.computeBoundingBox === 'function') obj.computeBoundingBox();
      }
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    model.traverse(function(obj) {
      if (!obj.isMesh) return;
      if (obj.isSkinnedMesh && obj.boundingBox && !obj.boundingBox.isEmpty()) {
        // SkinnedMesh.boundingBox contém os vértices já avaliados com a pose/juntas.
        box.union(obj.boundingBox.clone().applyMatrix4(obj.matrixWorld));
        return;
      }
      if (obj.geometry) {
        if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
        if (obj.geometry.boundingBox) {
          box.union(obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld));
          return;
        }
      }
      box.union(new THREE.Box3().setFromObject(obj));
    });
    return box;
  }
  function fitModel(model,height,diagnosticName) {
    let box=measureModelBounds(model);
    let size=box.getSize(new THREE.Vector3());
    if(size.z>size.y*1.35 && size.z>size.x*0.72) {
      model.rotation.x=-Math.PI/2;
      box=measureModelBounds(model);
      size=box.getSize(new THREE.Vector3());
    }
    if(!isFinite(size.y)||size.y<0.01) {
      model.rotation.x=Math.PI/2;
      box=measureModelBounds(model);
      size=box.getSize(new THREE.Vector3());
    }
    if(!isFinite(size.y)||size.y<0.01) throw new Error('GLB sem dimensões válidas nos eixos X/Y/Z');
    const measuredHeight=size.y;
    const appliedScale=height/measuredHeight;
    model.scale.setScalar(appliedScale);
    if(diagnosticName){
      window.ValerioScaleDiagnostics='Modelo: '+diagnosticName+' | altura medida antes do ajuste: '+measuredHeight.toFixed(5)+' | escala aplicada: '+appliedScale.toFixed(5)+' | alvo: '+height;
    }
    model.updateMatrixWorld(true);
    const scaled=measureModelBounds(model);
    const center=scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-scaled.min.y,-center.z);
    model.updateMatrixWorld(true);
    return model;
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
      weaponRoot.position.y-=.28; // ajuste inicial do ponto de pegada; calibrar visualmente no jogo
      weaponPivot.add(weaponRoot);
      if(handBone)handBone.add(weaponPivot);else pivot.add(weaponPivot);
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
      stopAction();return 'dead';
    }
    const serial=window.ValerioBossHitSerial||0;
    if(v.skillLocked)hurtUntil=0;
    if(serial!==lastHitSerial){
      lastHitSerial=serial;
      // A reação deve terminar junto com o clip real, não com um timer fixo
      // que cortava animações de dano mais longas no meio do movimento.
      const hurtDuration=animationClips.hurt?Math.max(0.43,Number(animationClips.hurt.duration)||0.43):0.43;
      if(!v.skillLocked)hurtUntil=now+Math.min(1.1,hurtDuration*1000);
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
      if(attackClips.length){
        if(!attackCycleActive){
          activeAttackClip=attackClips[nextAttackClipIndex%attackClips.length];
          nextAttackClipIndex=(nextAttackClipIndex+1)%attackClips.length;
          attackCycleActive=true;
        }
        playClip('attack',true,activeAttackClip);
        return 'attack';
      }
      attackCycleActive=false;activeAttackClip=null;
      stopAction();return 'procedural-attack';
    }
    attackCycleActive=false;activeAttackClip=null;
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
            ?'https://raw.githubusercontent.com/PHBritoDev/Jogo-2-2.5D/main/Bispo1.0.glb?valerioModelTest=20261011g-new-animations'
            :'https://raw.githubusercontent.com/PHBritoDev/Jogo-2-2.5D/e4af770/Bispo1.0.glb');
        const gltfLoader=new THREE.GLTFLoader();
        // O novo Bispo1.0.glb pode usar Draco; habilitamos o decoder
        // oficial da mesma versão do Three.js. GLBs sem Draco continuam funcionando.
        const dracoLoader=new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/libs/draco/');
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load(valerioModelUrl,function(gltf){
          try {
            root=gltf.scene;fitModel(root,VALERIO_MODEL_HEIGHT,'Bispo1.0.glb');rootBasePosition=root.position.clone();improveMaterials(root);
            // Mantém a escala normalizada no próprio GLB, como na versão que tinha
            // proporções corretas; trava mudanças de escala vindas dos clips.
            // fitModel normaliza a geometria para 2,7 unidades; não aplicar uma segunda escala.
            pivot=new THREE.Group();pivot.scale.setScalar(1);pivot.add(root);scene.add(pivot);
            restoreModelScales=lockModelScales(pivot);
            // Mapeia os clips que já existem no GLB; ataque/dano têm fallback procedural.
            mixer=new THREE.AnimationMixer(root);
            const clips=(gltf.animations||[]).map(function(clip){
              // Remove keyframes de escala que podem inflar o modelo.
              clip.tracks=clip.tracks.filter(function(track){
                const path=String(track.name||'').replace(/\[[^\]]*\]$/,'');
                const property=path.split(/[.:/]/).pop().toLowerCase();
                return property!=='scale';
              });
              const clipName=(clip.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
              const isRootMotionClip=clipName==='hitknockbackrootmotion'||clipName==='swordlightcombo';
              if(isRootMotionClip){
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
                    else {values[i]=firstX;values[i+2]=firstZ;}
                  }
                  changed.push(trackName);
                });
                console.info('Valério: root motion neutralizado em "'+clip.name+'"; trilhas ajustadas:',changed.length?changed:'nenhuma trilha de posição de raiz/quadril reconhecida');
              }
              return clip;
            });
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
            const attackExclude=/walk|run|hurt|damage|death|dead|fall|magic|spell|cast|pose|idle|breath|rest|stand|talk|speak/;
            // Este Bispo usa somente dois golpes normais, alternados a cada novo ataque.
            // Prioriza nomes Attack 1 / Attack 2 e, na falta deles, usa a ordem exportada.
            attackClips=pickClips([/attack/,/slash/,/swing/,/strike/,/sword/,/scythe/,/combo/,/melee/])
              .filter(function(c){return !attackExclude.test(normalized(c));})
              .sort(function(a,b){
                const na=normalized(a),nb=normalized(b);
                const ma=na.match(/(\d+)$/),mb=nb.match(/(\d+)$/);
                if(ma&&mb&&Number(ma[1])!==Number(mb[1]))return Number(ma[1])-Number(mb[1]);
                if(ma&&!mb)return -1;
                if(!ma&&mb)return 1;
                return 0;
              }).slice(0,2);
            skillClips=[];
            animationClips={
              idle:pickClip([/idle/,/breath/,/rest/,/stand/]),
              walk:pickClip([/walk/,/walking/,/locomotion/,/walkforward/]),
              run:pickClip([/run/,/running/,/sprint/,/jog/]),
              attack:attackClips[0]||pickClip([/attack/,/slash/,/swing/,/strike/,/sword/,/scythe/,/combo/,/melee/]),
              hurt:pickClip([/hurt/,/damage/,/stagger/,/flinch/,/hitreaction/,/hit/]),
              death:pickClip([/death/,/dead/,/dying/,/die/,/defeat/,/knockout/,/fall/]),
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
            const mapped='idle='+(animationClips.idle&&animationClips.idle.name||'—')+'; walk='+(animationClips.walk&&animationClips.walk.name||'—')+'; run='+(animationClips.run&&animationClips.run.name||'—')+'; ataque normal='+(animationClips.attack&&animationClips.attack.name||'—')+'; habilidades='+skillClips.map(function(c){return c.name||'(sem nome)';}).join(', ')+'; dano='+(animationClips.hurt&&animationClips.hurt.name||'—')+'; morte='+(animationClips.death&&animationClips.death.name||'—')+'; magia='+(animationClips.magic&&animationClips.magic.name||'—');
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
    // Clips com root-motion podem deslocar o personagem para baixo do piso; o combate já controla a posição do boss.
    if(rootBasePosition&&root)root.position.copy(rootBasePosition);
    // Reaplica a escala de importação depois do mixer e antes do render.
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
    previousState=v.state||'';
    last=now;renderer.render(scene,camera);
  }
  window.ValerioGLBReady=false;window.ValerioGLBLoading=false;
  function bootValerioGLB(){start();requestAnimationFrame(frame);}
  if(document.readyState==='complete')bootValerioGLB();
  else window.addEventListener('load',bootValerioGLB,{once:true});
})();
