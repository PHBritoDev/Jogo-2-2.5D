/* Valério GLB + foice. Iluminação, orientação e movimento estabilizados para mobile. */
(function () {
  'use strict';
  let started=false,failed=false,renderer=null,scene=null,camera=null,root=null,pivot=null;
  let weaponPivot=null,weaponRoot=null,last=0,canvas=null,mixer=null;
  let animationClips={},attackClips=[],skillClips=[],currentAction=null,armBone=null,forearmBone=null,handBone=null,legLeft=null,legRight=null,armBase=null,forearmBase=null,legLeftBase=null,legRightBase=null;
  let deathPlayed=false,restoreModelScales=null,rootBasePosition=null,fittedRoot=null;
  // Modo diagnóstico: permite comparar o mesmo GLB com os clips pausados.
  const disableValerioClips=new URLSearchParams(window.location.search).get('valerioNoAnimations')==='1';
  let lastHitSerial=0,hurtUntil=0,previousState='',renderedYaw=null;
  function loadScript(url) {
    return new Promise(function(resolve,reject){
      const s=document.createElement('script');s.src=url;s.onload=resolve;
      s.onerror=function(){reject(new Error('Falha ao carregar '+url));};document.head.appendChild(s);
    });
  }
  // Diagnóstico somente no console: nunca cobre a tela do jogador.
  function showStatus(message,isError) {
    const old=document.getElementById('valerio-glb-status');
    if(old)old.remove();
    if(isError)console.warn('Valério GLB:',message);
    else console.info('Valério GLB:',message);
    // Diagnóstico visível somente no link de teste, para identificar por que
    // o GLB real não carregou sem exigir que o jogador abra o console do celular.
    if(new URLSearchParams(window.location.search).get('valerioTest')==='1'){
      const panel=document.createElement('div');
      panel.id='valerio-glb-status';
      panel.textContent='Valério: '+String(message);
      panel.style.cssText='position:fixed;z-index:99999;left:8px;top:8px;max-width:calc(100vw - 24px);padding:7px 10px;border-radius:6px;background:rgba(8,8,18,.88);color:'+(isError?'#ff8b8b':'#e8e8ff')+';font:12px/1.35 monospace;white-space:pre-wrap;overflow-wrap:anywhere;pointer-events:none;';
      document.body.appendChild(panel);
    }
  }
  function hideStatus(){const el=document.getElementById('valerio-glb-status');if(el)el.remove();}
  function errorText(err){
    if(!err)return 'erro sem detalhes';
    return err.message||err.statusText||String(err);
  }
  function fitModel(model,height) {
    // GLBs podem vir com o eixo vertical em Y, Z ou X. Se o eixo vertical
    // for identificado errado, height/size.y pode ampliar o personagem dezenas
    // de vezes. Escolhemos a orientação pelo maior eixo antes de dimensionar.
    let box=new THREE.Box3().setFromObject(model);
    let size=box.getSize(new THREE.Vector3());
    const dims=[size.x,size.y,size.z];
    const largest=Math.max.apply(null,dims);
    if(!isFinite(largest)||largest<0.01)throw new Error('GLB sem dimensões válidas nos eixos X/Y/Z');
    if(size.y<largest*0.72) {
      if(size.z>=size.x) model.rotation.x=-Math.PI/2;
      else model.rotation.z=Math.PI/2;
      box=new THREE.Box3().setFromObject(model);
      size=box.getSize(new THREE.Vector3());
      // Se a primeira rotação não colocou o maior eixo na vertical, tenta a outra.
      if(size.y<Math.max(size.x,size.z)*0.72) {
        model.rotation.x=0;
        model.rotation.z=0;
        box=new THREE.Box3().setFromObject(model);
        size=box.getSize(new THREE.Vector3());
        if(size.z>=size.x) model.rotation.x=-Math.PI/2;
        else model.rotation.z=Math.PI/2;
        box=new THREE.Box3().setFromObject(model);
        size=box.getSize(new THREE.Vector3());
      }
    }
    if(!isFinite(size.y)||size.y<0.01)throw new Error('GLB sem dimensões válidas nos eixos X/Y/Z');
    const fit=new THREE.Group();
    fit.add(model);
    const factor=height/size.y;
    fit.scale.setScalar(factor);
    fit.position.set(-((box.min.x+box.max.x)/2)*factor,-box.min.y*factor,-((box.min.z+box.max.z)/2)*factor);
    const fittedBox=new THREE.Box3().setFromObject(fit);
    const fittedSize=fittedBox.getSize(new THREE.Vector3());
    if(!isFinite(fittedSize.y)||Math.abs(fittedSize.y-height)>0.05) {
      throw new Error('Falha ao normalizar altura do GLB: '+fittedSize.y.toFixed(3)+' unidades');
    }
    return fit;
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
    if(legLeft)legLeftBase=legLeft.rotation.clone();
    if(legRight)legRightBase=legRight.rotation.clone();
  }
  function stopAction() {
    if(currentAction){currentAction.fadeOut(.08);currentAction=null;}
  }
  function playClip(type,oneShot,overrideClip) {
    const clip=overrideClip||animationClips[type];
    if(!clip||!mixer)return false;
    const next=mixer.clipAction(clip);
    if(currentAction===next&&next.isRunning())return true;
    if(currentAction)currentAction.fadeOut(.1);
    next.reset();next.enabled=true;
    // A caminhada do GLB estava ciclando rápido demais para a curta aproximação do boss.
    // Mantemos corrida reservada para habilidade futura e sincronizamos a passada por estado.
    next.setEffectiveTimeScale(type==='walk'?0.50:type==='run'?0.88:1);
    next.setEffectiveWeight(1);
    next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);
    next.clampWhenFinished=!!oneShot;next.fadeIn(.1).play();currentAction=next;
    return true;
  }
  function chooseAnimation(v,now) {
    const serial=window.ValerioBossHitSerial||0;
    if(serial!==lastHitSerial){lastHitSerial=serial;hurtUntil=now+430;}
    const hurt=hurtUntil>now;
    if(hurt&&animationClips.hurt){playClip('hurt',true);return 'hurt';}
    if(v.state==='dead'){
      if(animationClips.death){
        if(!deathPlayed){playClip('death',true);deathPlayed=true;}
        return 'death';
      }
      stopAction();return 'dead';
    }
    deathPlayed=false;
    // Ataque normal usa sempre o primeiro clip; os seguintes ficam reservados às habilidades.
    if(v.state==='attack'&&(animationClips.attack||attackClips.length)){
      playClip('attack',true,animationClips.attack||attackClips[0]);return 'attack';
    }
    const skillMatch=/^(skill|ability|special|heavy|combo)[_-]?(1|2|3)?$/.exec(String(v.state||'').toLowerCase());
    if(skillMatch&&skillClips.length){
      const index=skillMatch[2]?Math.max(0,Math.min(skillClips.length-1,Number(skillMatch[2])-1)):0;
      playClip('skill',true,skillClips[index]);return 'skill';
    }
    if(v.talking&&animationClips.talk){playClip('talk',false);return 'talk';}
    if(v.state==='approach'){
      // O movimento do boss já é controlado pelo combate; não espere um limiar
      // de velocidade alto para animar as pernas, senão ele desliza em idle.
      if((v.speed||0)>38&&animationClips.run){playClip('run',false);return 'run';}
      if(animationClips.walk){playClip('walk',false);return 'walk';}
      if(animationClips.run){playClip('run',false);return 'run';}
      stopAction();return 'procedural-walk';
    }
    if(v.state==='stagger'&&!animationClips.hurt){stopAction();return 'procedural-hurt';}
    if((v.state==='attack'||v.state==='windup')&&!animationClips.attack){stopAction();return 'procedural-attack';}
    if(animationClips.idle){playClip('idle',false);return 'idle';}
    stopAction();return 'none';
  }
  function start() {
    if(started||failed)return;started=true;window.ValerioGLBLoading=true;
    loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js')
      .then(function(){return loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js');})
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
        camera=new THREE.PerspectiveCamera(58.4,window.innerWidth/window.innerHeight,.1,90);
        showStatus('carregando arquivo...',false);
        new THREE.GLTFLoader().load('./Bispo1.0.glb?v=valerio-anim-20261010c',function(gltf){
          try {
            root=gltf.scene;const fittedModel=fitModel(root,1.55);fittedRoot=fittedModel;rootBasePosition=root.position.clone();restoreModelScales=lockModelScales(root);improveMaterials(root);
            // Escala conservadora: evita que um GLB exportado fora da escala invada a arena.
            pivot=new THREE.Group();pivot.scale.setScalar(1);pivot.add(fittedModel);scene.add(pivot);
            // Mapeia os clips que já existem no GLB; ataque/dano têm fallback procedural.
            mixer=new THREE.AnimationMixer(root);
            const clips=(gltf.animations||[]).map(function(clip){
              // Clips exportados trazem keyframes de escala que inflavam o modelo
              // durante idle/ataque. Mantemos posição/rotação para preservar o movimento.
              clip.tracks=clip.tracks.filter(function(track){
                return !/(^|\.)scale(?:$|\[)/i.test(track.name||'');
              });
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
            // A ordem do GLB é preservada: primeiro clip = ataque normal; os dois seguintes = habilidades.
            attackClips=pickClips([/attack/,/slash/,/swing/,/strike/,/sword/,/scythe/,/combo/,/melee/]).filter(function(c){return !attackExclude.test(normalized(c));});
            skillClips=attackClips.slice(1,3);
            animationClips={
              idle:pickClip([/idle/,/breath/,/rest/,/stand/]),
              walk:pickClip([/walk/,/walking/,/locomotion/,/walkforward/]),
              run:pickClip([/run/,/running/,/sprint/,/jog/]),
              attack:attackClips[0]||pickClip([/attack/,/slash/,/swing/,/strike/,/sword/,/scythe/,/combo/,/melee/]),
              hurt:pickClip([/hurt/,/damage/,/stagger/,/flinch/,/hitreaction/,/hit/]),
              death:pickClip([/death/,/dead/,/die/,/fall/,/defeat/,/knockout/]),
              magic:pickClip([/magic/,/cast/,/spell/,/grimoire/,/bible/,/book/,/prayer/,/pose/]),
              talk:pickClip([/talk/,/speak/])
            };
            findAnimationBones(root);
            window.ValerioGLBReady=true;window.ValerioGLBLoading=false;
            const clipInfo=clips.length?clips.map(function(c){return (c.name||'(sem nome)')+' '+Number(c.duration||0).toFixed(2)+'s';}).join(' | '):'NENHUM CLIP NO GLB';
            const mapped='idle='+(animationClips.idle&&animationClips.idle.name||'—')+'; walk='+(animationClips.walk&&animationClips.walk.name||'—')+'; run='+(animationClips.run&&animationClips.run.name||'—')+'; ataque normal='+(animationClips.attack&&animationClips.attack.name||'—')+'; habilidades='+skillClips.map(function(c){return c.name||'(sem nome)';}).join(', ')+'; dano='+(animationClips.hurt&&animationClips.hurt.name||'—')+'; morte='+(animationClips.death&&animationClips.death.name||'—')+'; magia='+(animationClips.magic&&animationClips.magic.name||'—');
            window.ValerioClipDiagnostics='GLB clips ('+clips.length+'): '+clipInfo+'\n'+mapped+'\nbraço='+(armBone&&armBone.name||'não encontrado')+'; mão='+(handBone&&handBone.name||'não encontrada');
            showStatus(window.ValerioClipDiagnostics,false);
            loadWeapon();
            console.info('Valério: clips disponíveis',clips.map(function(a){return {name:a.name,duration:a.duration};}),'mapeamento',mapped);
          } catch(err) {
            failed=true;window.ValerioGLBReady=false;showStatus('erro ao preparar modelo: '+errorText(err),true);console.error('Erro ao preparar Bispo1.glb; usando modelo alternativo.',err);
          }
        },undefined,function(err){
          failed=true;window.ValerioGLBReady=false;window.ValerioGLBLoading=false;showStatus('falha ao carregar arquivo: '+errorText(err),true);console.error('Falha ao carregar ./Bispo1.0.glb; usando modelo alternativo.',err);
        });
      })
      .catch(function(err){failed=true;window.ValerioGLBReady=false;window.ValerioGLBLoading=false;showStatus('Three.js/GLTFLoader falhou: '+errorText(err),true);console.error('Three.js/GLTFLoader não carregou; usando modelo alternativo.',err);});
  }
  function frame(now) {
    requestAnimationFrame(frame);const v=window.ValerioModelView;
    if(!v||!v.active||!root||!pivot||!renderer||!camera){if(canvas)canvas.style.display='none';return;}
    canvas.style.display='block';const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    camera.aspect=v.aspect||w/h;camera.fov=(v.fov||1.02)*180/Math.PI;camera.updateProjectionMatrix();
    camera.position.set(v.eye[0],v.eye[1],v.eye[2]);camera.lookAt(v.target[0],v.target[1],v.target[2]);
    pivot.position.set(v.position[0],v.position[1],v.position[2]);
    // Corrige o eixo frontal comum em modelos exportados para GLB e gira pelo
    // menor arco possível: evita a volta de 360° quando o jogador cruza atrás.
    const targetYaw=(v.yaw||0)+Math.PI;
    const turnDt=Math.min(Math.max((now-last)/1000,0),.05);
    if(renderedYaw===null){renderedYaw=targetYaw;pivot.rotation.y=targetYaw;}
    else {
      const yawDelta=Math.atan2(Math.sin(targetYaw-pivot.rotation.y),Math.cos(targetYaw-pivot.rotation.y));
      pivot.rotation.y+=yawDelta*Math.min(1,turnDt*7.5);
    }
    const animType=chooseAnimation(v,now);
    if(mixer&&!disableValerioClips)mixer.update(turnDt);
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
    const attackProgress=v.state==='attack'?Math.sin(Math.max(0,Math.min(1,(v.stateTime||0)/Math.max(.1,v.attackDuration||.3)))*Math.PI):0;
    const windup=v.state==='windup'?Math.max(0,Math.min(1,(v.stateTime||0)/Math.max(.1,v.windupDuration||.6))):0;
    const hurtProgress=hurtUntil>now?Math.sin(Math.max(0,Math.min(1,1-(hurtUntil-now)/430))*Math.PI):0;
    // Fallback corporal para clips de ataque/dano ausentes no arquivo.
    root.rotation.z=(v.state==='windup'?.025+windup*.055:0)+
      (animType==='procedural-hurt'?-hurtProgress*.12:0)+Math.sin((v.time||0)*1.35)*.006;
    const t=v.time||0;
    const walking=animType==='procedural-walk'?Math.sin(t*8.5)*.42:0;
    // Só aplicamos rotações manuais quando falta um clip: não anulamos a animação GLB.
    if(armBone&&armBase&&(animType==='procedural-attack'||animType==='procedural-hurt'||animType==='procedural-walk')){
      armBone.rotation.copy(armBase);
      if(animType==='procedural-attack'){
        armBone.rotation.x+=-.8*attackProgress-windup*.28;
        armBone.rotation.z+=-.72*attackProgress-windup*.22;
      }
      if(animType==='procedural-hurt')armBone.rotation.z+=.38*hurtProgress;
      if(animType==='procedural-walk')armBone.rotation.x+=walking*.35;
    }
    if(forearmBone&&forearmBase&&(animType==='procedural-attack'||animType==='procedural-hurt'||animType==='procedural-walk')){
      forearmBone.rotation.copy(forearmBase);
      if(animType==='procedural-attack'){
        forearmBone.rotation.x+=-1.05*attackProgress;
        forearmBone.rotation.z+=-.3*attackProgress;
      }
      if(animType==='procedural-hurt')forearmBone.rotation.x+=.22*hurtProgress;
      if(animType==='procedural-walk')forearmBone.rotation.x-=walking*.25;
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
      // O clip real já anima braço/mão e move a foice anexada; não duplicamos o balanço.
      weaponPivot.rotation.z=-.12-windup*.35+swing*.32;
      weaponPivot.rotation.x=swing*.18;
    }
    previousState=v.state||'';
    last=now;renderer.render(scene,camera);
  }
  window.ValerioGLBReady=false;window.ValerioGLBLoading=false;
  window.addEventListener('load',function(){start();requestAnimationFrame(frame);},{once:true});
})();
