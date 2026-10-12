/* Protagonista 3D — usa a mesma cena/câmera do Valério para depth correto. */
(function () {
  'use strict';
  let api=null,root=null,pivot=null,mixer=null,rootBasePosition=null,restoreModelScales=null,actions={},currentAction=null,currentType='',ready=false,failed=false,last=0,renderedYaw=null,yawLast=0,celestialSword=null,swordCore=null,swordTrail=null,swordTrailMaterial=null,swordGlowMaterial=null,swordHand=null,swordPhase=0,lastSwordAttackId=-1,lastSwordHitSerial=0,swordHitFlash=0,swordImpactBits=[],swordImpactAge=99;
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
        mixer=new THREE.AnimationMixer(root);
        // Espada Celestial: geometria 3D real, presa a um osso de mão encontrado em runtime.
        // A busca é tolerante a nomes de rigs diferentes; não presume um nome específico.
                function buildCelestialSword(){
          const group=new THREE.Group();
          group.name='CelestialSword_Runtime';
          const pearl=new THREE.MeshStandardMaterial({color:0xeaf3f6,metalness:.72,roughness:.24,emissive:0x6b9eae,emissiveIntensity:.16});
          const edge=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.9,roughness:.18});
          const gold=new THREE.MeshStandardMaterial({color:0xc99a43,metalness:.82,roughness:.25});
          const dark=new THREE.MeshStandardMaterial({color:0x252a32,metalness:.35,roughness:.48});
          const crystal=new THREE.MeshStandardMaterial({color:0x8de8ff,metalness:.28,roughness:.16,emissive:0x35bfff,emissiveIntensity:.7});
          swordGlowMaterial=new THREE.MeshBasicMaterial({color:0x83dcff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
          swordTrailMaterial=new THREE.MeshBasicMaterial({color:0x9beaff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
          // Eixo longitudinal +Y; lâmina com espessura real via ExtrudeGeometry.
          const bladeShape=new THREE.Shape();
          bladeShape.moveTo(-.035,0); bladeShape.lineTo(-.052,.12); bladeShape.lineTo(-.038,.57);
          bladeShape.lineTo(0,.76); bladeShape.lineTo(.038,.57); bladeShape.lineTo(.052,.12); bladeShape.lineTo(.035,0); bladeShape.closePath();
          const bladeGeo=new THREE.ExtrudeGeometry(bladeShape,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.004});
          const blade=new THREE.Mesh(bladeGeo,pearl); blade.position.z=-.009; blade.castShadow=true; blade.receiveShadow=true; group.add(blade);
          const glow=new THREE.Mesh(new THREE.PlaneGeometry(.15,.68),swordGlowMaterial);glow.position.set(0,.36,-.025);group.add(glow);
          // Rastro geométrico fino, desligado por padrão e ativado apenas durante golpes rápidos.
          const trailShape=new THREE.Shape();trailShape.moveTo(-.025,.02);trailShape.quadraticCurveTo(-.24,.28,-.11,.67);trailShape.lineTo(.02,.75);trailShape.quadraticCurveTo(-.04,.38,.025,.04);trailShape.closePath();
          swordTrail=new THREE.Mesh(new THREE.ShapeGeometry(trailShape),swordTrailMaterial);swordTrail.position.set(0,0,-.04);swordTrail.visible=false;group.add(swordTrail);
          // Fio claro nas duas laterais.
          [-1,1].forEach(function(side){
            const rail=new THREE.Mesh(new THREE.BoxGeometry(.006,.52,.022),edge);
            rail.position.set(side*.044,.31,0); group.add(rail);
          });
          // Guarda curta, curva e legível, feita de segmentos sólidos.
          const guard=new THREE.Group(); guard.position.y=-.015; group.add(guard);
          const center=new THREE.Mesh(new THREE.BoxGeometry(.075,.035,.045),gold); guard.add(center);
          [-1,1].forEach(function(side){
            const arm=new THREE.Mesh(new THREE.BoxGeometry(.026,.15,.035),gold);
            arm.position.set(side*.065,.035,0); arm.rotation.z=side*.48; guard.add(arm);
            const tip=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),gold);
            tip.position.set(side*.105,.09,0); guard.add(tip);
          });
          const grip=new THREE.Mesh(new THREE.CylinderGeometry(.018,.021,.16,8),dark);
          grip.position.y=-.105; group.add(grip);
          const gripBand=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.022,8),gold);
          gripBand.position.y=-.17; group.add(gripBand);
          const pommel=new THREE.Mesh(new THREE.OctahedronGeometry(.03,0),gold); pommel.position.y=-.205; group.add(pommel);
          swordCore=new THREE.Mesh(new THREE.OctahedronGeometry(.027,0),crystal);
          swordCore.position.set(0,.005,.034); swordCore.name='CelestialSword_Core'; group.add(swordCore);
          swordImpactBits=[];swordImpactAge=99;
          for(let i=0;i<5;i++){
            const bit=new THREE.Mesh(new THREE.OctahedronGeometry(.012,0),i%2?gold:crystal);
            bit.visible=false;bit.userData.phase=i*1.256;group.add(bit);swordImpactBits.push(bit);
          }
          // Dimensão inicial compacta e separada; poderá ser refinada após o teste visual no jogo.
          group.scale.setScalar(1.0);
          return group;
        }
        function attachCelestialSword(model){
          const bones=[];
          model.traverse(function(o){if(o.isBone)bones.push(o);});
          const rightHand=/right.*(hand|wrist)|hand.*right|(^|[_ .-])r(hand|wrist)([_ .-]|$)|mixamorig:rightHand/i;
          swordHand=bones.find(function(b){return rightHand.test(b.name||'');})||null;
          if(!swordHand){
            // Não prende a uma bone inventada: expõe diagnóstico e deixa arma desativada.
            window.CelestialSwordDiagnostics='Espada não anexada: nenhum osso de mão direita reconhecido. Ossos encontrados: '+bones.map(function(b){return b.name;}).filter(Boolean).join(', ');
            console.warn(window.CelestialSwordDiagnostics);
            return;
          }
          celestialSword=buildCelestialSword();
          // O grupo é filho do osso; animações do braço e da mão movem a espada junto.
          // Offset conservador no punho, sem tocar na escala do personagem.
          celestialSword.position.set(0,0,0);
          celestialSword.rotation.set(0,0,Math.PI);
          swordHand.add(celestialSword);
          window.CelestialSwordDiagnostics='Espada 3D anexada ao osso: '+swordHand.name;
        }
        attachCelestialSword(root);
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
    if(celestialSword){
      swordPhase+=dt;
      if(swordCore&&swordCore.material){
        swordCore.material.emissiveIntensity=.48+.22*(.5+.5*Math.sin(swordPhase*3.2));
      }
      const attacking=Number.isFinite(v.attackT)?v.attackT>=0:!!v.attack;
      const attackId=Number.isFinite(v.attackId)?v.attackId:-1;
      const attackTime=Number.isFinite(v.attackT)?v.attackT:0;
      const fastSwing=attacking&&attackTime<.34;
      if(attackId>=0&&attackId!==lastSwordAttackId){lastSwordAttackId=attackId;swordHitFlash=0;}
      const hitSerial=Number(window.CelestialSwordHitSerial)||0;
      if(hitSerial!==lastSwordHitSerial){lastSwordHitSerial=hitSerial;swordHitFlash=.16;swordImpactAge=0;}
      swordHitFlash=Math.max(0,swordHitFlash-dt);
      if(swordTrail&&swordTrailMaterial){
        swordTrail.visible=fastSwing;
        swordTrailMaterial.opacity=fastSwing?Math.max(0,.28*(1-Math.min(1,attackTime/.38))):0;
      }
      if(swordGlowMaterial){swordGlowMaterial.opacity=.08+.06*(.5+.5*Math.sin(swordPhase*2.4))+(swordHitFlash>0?.35:0);}
      if(swordCore&&swordCore.material&&swordHitFlash>0){swordCore.material.emissiveIntensity=1.8;}
      swordImpactAge+=dt;
      swordImpactBits.forEach(function(bit,i){
        const age=swordImpactAge,phase=bit.userData.phase;
        bit.visible=age<.16;
        if(bit.visible){const spread=age*1.2;bit.position.set(Math.cos(phase)*spread,.34+Math.sin(phase)*spread,-.035);bit.scale.setScalar(Math.max(.08,1-age/.16));}
      });
    }
    if(restoreModelScales)restoreModelScales();
    if(root&&rootBasePosition){root.position.copy(rootBasePosition);root.updateMatrixWorld(true);}
    // A renderização fica com o loop do Valério: os dois modelos compartilham depth buffer.
  }
  window.ProtagonistaGLBReady=false;
  if(!disabled){if(document.readyState==='complete')findAPI();else window.addEventListener('load',findAPI,{once:true});requestAnimationFrame(frame);}
})();