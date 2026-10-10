/* Valério GLB + foice. Iluminação, orientação e movimento estabilizados para mobile. */
(function () {
  'use strict';
  let started=false,failed=false,renderer=null,scene=null,camera=null,root=null,pivot=null;
  let weaponPivot=null,weaponRoot=null,last=0,canvas=null,mixer=null;
  let animationClips={},currentAction=null,armBone=null,forearmBone=null,handBone=null,legLeft=null,legRight=null,armBase=null,forearmBase=null,legLeftBase=null,legRightBase=null;
  let lastHitSerial=0,hurtUntil=0,previousState='';
  function loadScript(url) {
    return new Promise(function(resolve,reject){
      const s=document.createElement('script');s.src=url;s.onload=resolve;
      s.onerror=function(){reject(new Error('Falha ao carregar '+url));};document.head.appendChild(s);
    });
  }
  function showStatus(message,isError) {
    let el=document.getElementById('valerio-glb-status');
    if(!el){
      el=document.createElement('div');el.id='valerio-glb-status';
      el.style.cssText='position:fixed;left:8px;top:8px;z-index:99999;max-width:90vw;padding:8px 10px;border-radius:8px;font:12px/1.35 monospace;color:#fff;background:#17452b;white-space:pre-wrap;overflow-wrap:anywhere;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.style.background=isError?'#7b1717':'#17452b';
    el.textContent='VALÉRIO GLB: '+message;
    el.style.display='block';
  }
  function hideStatus(){const el=document.getElementById('valerio-glb-status');if(el)el.style.display='none';}
  function errorText(err){
    if(!err)return 'erro sem detalhes';
    return err.message||err.statusText||String(err);
  }
  function fitModel(model,height) {
    // Alguns exportadores entregam personagens no eixo Z-up. Detecta isso
    // antes de dimensionar para evitar altura quase zero e modelo invisível.
    let box=new THREE.Box3().setFromObject(model);
    let size=box.getSize(new THREE.Vector3());
    if(size.z>size.y*1.35 && size.z>size.x*0.72) {
      model.rotation.x=-Math.PI/2;
      box=new THREE.Box3().setFromObject(model);
      size=box.getSize(new THREE.Vector3());
    }
    if(!isFinite(size.y)||size.y<0.01) {
      // Último recurso: tenta a orientação alternativa sem descartar o GLB.
      model.rotation.x=Math.PI/2;
      box=new THREE.Box3().setFromObject(model);
      size=box.getSize(new THREE.Vector3());
    }
    if(!isFinite(size.y)||size.y<0.01)throw new Error('GLB sem dimensões válidas nos eixos X/Y/Z');
    model.scale.setScalar(height/size.y);
    const scaled=new THREE.Box3().setFromObject(model),center=scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-scaled.min.y,-center.z);
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
      // A arma acompanha a mão direita; não fica presa ao torso/costas.
      weaponPivot.position.set(0,-.12,0);
      weaponPivot.rotation.set(0,0,-.12);weaponPivot.add(weaponRoot);
      if(handBone)handBone.add(weaponPivot);else pivot.add(weaponPivot);
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
  function playClip(type,oneShot) {
    const clip=animationClips[type];
    if(!clip||!mixer)return false;
    const next=mixer.clipAction(clip);
    if(currentAction===next&&next.isRunning())return true;
    if(currentAction)currentAction.fadeOut(.1);
    next.reset();next.enabled=true;next.setEffectiveTimeScale(1);next.setEffectiveWeight(1);
    next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);
    next.clampWhenFinished=!!oneShot;next.fadeIn(.1).play();currentAction=next;
    return true;
  }
  function chooseAnimation(v,now) {
    const serial=window.ValerioBossHitSerial||0;
    if(serial!==lastHitSerial){lastHitSerial=serial;hurtUntil=now+430;}
    const hurt=hurtUntil>now;
    if(hurt&&animationClips.hurt){playClip('hurt',true);return 'hurt';}
    if(v.state==='dead'){stopAction();return 'dead';}
    if(v.state==='attack'&&animationClips.attack){playClip('attack',true);return 'attack';}
    if(v.talking&&animationClips.talk){playClip('talk',false);return 'talk';}
    if(v.state==='approach'&&(v.speed||0)>2){
      if((v.speed||0)>84&&animationClips.run){playClip('run',false);return 'run';}
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
    if(started||failed)return;started=true;
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
        new THREE.GLTFLoader().load('./Bispo1.0.glb?v=20261010b',function(gltf){
          try {
            root=gltf.scene;fitModel(root,2.7);improveMaterials(root);
            pivot=new THREE.Group();pivot.add(root);scene.add(pivot);
            // Mapeia os clips que já existem no GLB; ataque/dano têm fallback procedural.
            mixer=new THREE.AnimationMixer(root);
            const clips=gltf.animations||[];
            const pickClip=function(patterns){
              return clips.find(function(c){
                const name=(c.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
                return patterns.some(function(re){return re.test(name);})&&!/wave|hello|greet/.test(name);
              })||null;
            };
            animationClips={
              idle:pickClip([/idle/i,/breath/i,/rest/i,/stand/i]),
              walk:pickClip([/walk/,/walking/,/locomotion/,/walkforward/]),
              run:pickClip([/run/,/running/,/sprint/,/jog/]),
              attack:pickClip([/attack/i,/slash/i,/swing/i,/strike/i,/sword/i]),
              hurt:pickClip([/hurt/i,/damage/i,/stagger/i,/flinch/i,/hit/i]),
              talk:pickClip([/talk/i,/speak/i])
            };
            findAnimationBones(root);
            window.ValerioGLBReady=true;
            const clipInfo=Object.keys(animationClips).map(function(k){return k+':'+(animationClips[k]?animationClips[k].name:'—');}).join(' | ');
            showStatus('clips '+clipInfo+'; braço='+(armBone&&armBone.name||'não encontrado')+'; mão='+(handBone&&handBone.name||'não encontrada'),false);
            loadWeapon();
            console.info('Valério: clips disponíveis',clips.map(function(a){return a.name;}),'mapeamento',Object.keys(animationClips).reduce(function(o,k){o[k]=animationClips[k]&&animationClips[k].name;return o;},{}));
          } catch(err) {
            failed=true;window.ValerioGLBReady=false;showStatus('erro ao preparar modelo: '+errorText(err),true);console.error('Erro ao preparar Bispo1.glb; usando modelo alternativo.',err);
          }
        },undefined,function(err){
          failed=true;window.ValerioGLBReady=false;showStatus('falha ao carregar arquivo: '+errorText(err),true);console.error('Falha ao carregar ./Bispo1.0.glb; usando modelo alternativo.',err);
        });
      })
      .catch(function(err){failed=true;window.ValerioGLBReady=false;showStatus('Three.js/GLTFLoader falhou: '+errorText(err),true);console.error('Three.js/GLTFLoader não carregou; usando modelo alternativo.',err);});
  }
  function frame(now) {
    requestAnimationFrame(frame);const v=window.ValerioModelView;
    if(!v||!v.active||!root||!pivot||!renderer||!camera){if(canvas)canvas.style.display='none';return;}
    canvas.style.display='block';const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    camera.aspect=v.aspect||w/h;camera.fov=(v.fov||1.02)*180/Math.PI;camera.updateProjectionMatrix();
    camera.position.set(v.eye[0],v.eye[1],v.eye[2]);camera.lookAt(v.target[0],v.target[1],v.target[2]);
    pivot.position.set(v.position[0],v.position[1],v.position[2]);
    // Corrige o eixo frontal comum em modelos exportados para GLB.
    pivot.rotation.y=(v.yaw||0)+Math.PI;
    const animType=chooseAnimation(v,now);
    if(mixer)mixer.update(Math.min(Math.max((now-last)/1000,0),.05));
    const attackProgress=v.state==='attack'?Math.sin(Math.max(0,Math.min(1,(v.stateTime||0)/Math.max(.1,v.attackDuration||.3)))*Math.PI):0;
    const windup=v.state==='windup'?Math.max(0,Math.min(1,(v.stateTime||0)/Math.max(.1,v.windupDuration||.6))):0;
    const hurtProgress=hurtUntil>now?Math.sin(Math.max(0,Math.min(1,1-(hurtUntil-now)/430))*Math.PI):0;
    // Fallback corporal para clips de ataque/dano ausentes no arquivo.
    root.rotation.z=(v.state==='windup'?.025+windup*.055:0)+
      (animType==='procedural-hurt'?-hurtProgress*.12:0)+Math.sin((v.time||0)*1.35)*.006;
    const t=v.time||0;
    const walking=animType==='procedural-walk'?Math.sin(t*8.5)*.42:0;
    // Só aplicamos rotações manuais quando falta um clip: não anulamos a animação GLB.
    if(armBone&&armBase&&(animType==='attack'||animType==='procedural-attack'||animType==='procedural-hurt'||animType==='procedural-walk')){
      armBone.rotation.copy(armBase);
      if(animType==='attack'||animType==='procedural-attack'){
        armBone.rotation.x+=-.8*attackProgress-windup*.28;
        armBone.rotation.z+=-.72*attackProgress-windup*.22;
      }
      if(animType==='procedural-hurt')armBone.rotation.z+=.38*hurtProgress;
      if(animType==='procedural-walk')armBone.rotation.x+=walking*.35;
    }
    if(forearmBone&&forearmBase&&(animType==='attack'||animType==='procedural-attack'||animType==='procedural-hurt'||animType==='procedural-walk')){
      forearmBone.rotation.copy(forearmBase);
      if(animType==='attack'||animType==='procedural-attack'){
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
      const swing=(animType==='attack'||animType==='procedural-attack')?attackProgress:0;
      weaponPivot.rotation.z=-.12-windup*.35+swing*.32;
      weaponPivot.rotation.x=swing*.18;
    }
    previousState=v.state||'';
    last=now;renderer.render(scene,camera);
  }
  window.ValerioGLBReady=false;
  window.addEventListener('load',function(){start();requestAnimationFrame(frame);},{once:true});
})();
