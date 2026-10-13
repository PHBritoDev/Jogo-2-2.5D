/* Protagonista 3D — usa a mesma cena/câmera do Valério para depth correto. */
(function () {
  'use strict';
  let api=null,root=null,pivot=null,mixer=null,rootBasePosition=null,restoreModelScales=null,actions={},attackClips=[],fallbackAttackClip=null,currentAction=null,currentType='',diagnosticPreview=false,ready=false,failed=false,last=0,renderedYaw=null,yawLast=0,swordRoot=null,swordHand=null,swordMount=null,swordPivot=null,swordWorldPosition=null,swordWorldQuaternion=null,swordEffects=[],swordLight=null,swordPhase=0,swordMeshes=0,swordLoaded=false,swordLoadError='',swordStatusCheckAt=0;
  const MODEL_HEIGHT=2.15;
  // O GLB mede cerca de 1,90 no eixo Y; o cabo fica entre Y=0,57 e 0,95.
  const SWORD_SCALE=.62,SWORD_GRIP_Y=.75;
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
  const ROLE_LABELS={attack1:'Ataque 1',attack2:'Ataque 2',hurt:'Tomar dano',idle:'Respirar/parado',walk:'Caminhar',fall:'Cair no chão',death:'Morte',getup:'Levantar'};
  function savedRoleConflicts(role,clip){
    const n=String(clip&&clip.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const attack=/attack|slash|swing|strike|sword|melee|atacar|ataque|onehand|twohand/.test(n);
    const hurt=/hurt|damage|hitreaction|takehit|tomardano|dano/.test(n);
    const idle=/breath|idle|rest|standstill|parado/.test(n);
    const walk=/walk|walking|run|running|sprint|jog|locomotion|andar|caminh/.test(n);
    const fall=/fall|falling|knockdown|collapse|stumble|caer|queda/.test(n);
    const death=/death|dying|dead|^die$|morrer|morte/.test(n);
    const getup=/getup|standup|rise|recoverfloor|levant|levantar/.test(n);
    if(role==='attack')return hurt||idle||walk||fall||death||getup;
    if(role==='hurt')return attack||idle||walk||fall||death||getup;
    if(role==='idle')return attack||hurt||walk||fall||death||getup;
    if(role==='walk')return attack||hurt||idle||fall||death||getup;
    if(role==='death')return attack||hurt||idle||walk||getup;
    if(role==='getup')return attack||hurt||idle||walk||fall||death;
    return false;
  }
  function applySavedAnimationRoles(clips){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem('protagonistaAnimationRolesV2')||'{}')||{};}catch(e){}
    // Compatibilidade com configurações antigas: "attack" passa a ser Ataque 1.
    if(saved.attack1===undefined&&saved.attack!==undefined)saved.attack1=saved.attack;
    Object.keys(ROLE_LABELS).forEach(function(role){
      const index=Number(saved[role]);
      if(!Number.isInteger(index)||index<0||index>=clips.length)return;
      const clip=clips[index];
      if(savedRoleConflicts(role==='attack1'||role==='attack2'?'attack':role,clip)){
        console.warn('Protagonista: mapeamento salvo ignorado; o clipe não combina com a função '+ROLE_LABELS[role]+'.',clip.name);
        return;
      }
      actions[role]=clip;
    });
    const mappedAttacks=[];
    if(actions.attack1)mappedAttacks.push(actions.attack1);
    if(actions.attack2&&actions.attack2!==actions.attack1)mappedAttacks.push(actions.attack2);
    if(mappedAttacks.length){
      attackClips=mappedAttacks;
      actions.attack=attackClips[0];
    }
    actions.fall=actions.fall||null;
    actions.death=actions.death||null;
  }
  function showAnimationDiagnostics(clips){
    const params=new URLSearchParams(window.location.search);if(params.get('debugAnimations')!=='1'||params.get('showAnimationMapper')!=='1')return;
    const existing=document.getElementById('protagonista-animation-debug');
    if(existing)existing.remove();
    let saved={};
    try{saved=JSON.parse(localStorage.getItem('protagonistaAnimationRolesV2')||'{}')||{};}catch(e){}
    const panel=document.createElement('div');
    panel.id='protagonista-animation-debug';
    panel.style.cssText='position:fixed;z-index:99999;left:6px;right:6px;top:6px;max-height:48vh;overflow:auto;background:rgba(0,0,0,.94);color:#fff;padding:8px;border:1px solid #d8b45a;border-radius:6px;font:11px/1.35 monospace;pointer-events:auto';
    const heading=document.createElement('div');
    heading.textContent='MAPEAMENTO DAS ANIMAÇÕES — toque em Reproduzir e atribua cada função';
    heading.style.cssText='font-weight:bold;margin-bottom:6px';
    panel.appendChild(heading);
    const roles=document.createElement('div');
    roles.style.cssText='position:sticky;top:0;background:#171717;padding:5px;margin-bottom:6px;color:#f4d17a';
    roles.textContent='Funções: '+Object.keys(ROLE_LABELS).map(function(k){return ROLE_LABELS[k]+': '+(saved[k]!==undefined&&clips[Number(saved[k])]?clips[Number(saved[k])].name:'não definida');}).join(' | ');
    panel.appendChild(roles);
    clips.forEach(function(clip,i){
      const row=document.createElement('div');
      row.style.cssText='display:flex;gap:4px;align-items:center;margin:4px 0;flex-wrap:wrap';
      const playButton=document.createElement('button');
      playButton.type='button';
      playButton.textContent=(i+1)+'. '+(clip.name||'(sem nome)')+' ('+(Number(clip.duration)||0).toFixed(2)+'s) ▶';
      playButton.style.cssText='flex:1;min-width:150px;text-align:left;padding:6px;background:#252525;color:#fff;border:1px solid #777;border-radius:4px;font:11px monospace';
      playButton.addEventListener('click',function(){previewDiagnosticClip(clip);});
      row.appendChild(playButton);
      const select=document.createElement('select');
      select.style.cssText='max-width:140px;padding:5px;background:#111;color:#fff;border:1px solid #777;border-radius:4px;font:11px monospace';
      const empty=document.createElement('option');empty.value='';empty.textContent='Atribuir função…';select.appendChild(empty);
      Object.keys(ROLE_LABELS).forEach(function(role){const option=document.createElement('option');option.value=role;option.textContent=ROLE_LABELS[role];select.appendChild(option);});
      const assign=document.createElement('button');
      assign.type='button';assign.textContent='Salvar';
      assign.style.cssText='padding:6px;background:#6b4c14;color:#fff;border:0;border-radius:4px;font:11px monospace';
      assign.addEventListener('click',function(){
        const role=select.value;if(!role)return;
        saved[role]=i;
        try{localStorage.setItem('protagonistaAnimationRolesV2',JSON.stringify(saved));}catch(e){}
        actions[role]=clip;
        if(role==='attack1'||role==='attack2'){
          const first=role==='attack1'?clip:(actions.attack1||attackClips[0]||null);
          const second=role==='attack2'?clip:(actions.attack2||null);
          attackClips=[];
          if(first)attackClips.push(first);
          if(second&&second!==first)attackClips.push(second);
          actions.attack=attackClips[0]||null;
        }
        window.ProtagonistaAnimationTiming={
          // O combate real usa estes tempos: sincronizar o clip inteiro evita o golpe
          // continuar além da hitbox ou a reação de dano ser cortada no meio.
          attackDuration:.34,
          hurtDuration:.18,
          fallDuration:Number((actions.fall||actions.death||{}).duration)||1.05,
          getupDuration:Number((actions.getup||{}).duration)||1.05
        };
        roles.textContent='Funções: '+Object.keys(ROLE_LABELS).map(function(k){return ROLE_LABELS[k]+': '+(saved[k]!==undefined&&clips[Number(saved[k])]?clips[Number(saved[k])].name:'não definida');}).join(' | ');
      });
      row.appendChild(select);row.appendChild(assign);panel.appendChild(row);
    });
    const stop=document.createElement('button');
    stop.type='button';stop.textContent='FECHAR PAINEL E VOLTAR AO JOGO';
    stop.style.cssText='width:100%;margin-top:7px;padding:8px;background:#6b4c14;color:white;border:0;border-radius:4px;font-weight:bold';
    stop.addEventListener('click',function(){diagnosticPreview=false;currentType='';panel.remove();});
    panel.appendChild(stop);document.body.appendChild(panel);
  }
  function previewDiagnosticClip(clip){
    if(!mixer||!clip)return;
    diagnosticPreview=true;
    if(currentAction)currentAction.fadeOut(.06);
    const action=mixer.clipAction(clip);
    action.reset();action.enabled=true;action.setEffectiveWeight(1);
    action.setLoop(api.THREE.LoopRepeat,Infinity);
    action.clampWhenFinished=false;action.fadeIn(.06).play();
    currentAction=action;currentType='diagnostic-preview';
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
    // Nunca liga à primeira mão encontrada: sem um nome inequivocamente direito, falha explicitamente.
    const rightHand=/(right.*(hand|wrist)|(hand|wrist).*right|(^|[_ .-])r(hand|wrist)([_ .-]|$)|(hand|wrist)[_. -]?r$|mixamorig:rightHand)/i;
    return bones.find(function(b){return rightHand.test(b.name||'');})||null;
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
  function updateSwordMount(){
    if(!swordHand||!swordMount||!api)return false;
    swordHand.updateWorldMatrix(true,false);
    swordHand.getWorldPosition(swordWorldPosition);
    swordHand.getWorldQuaternion(swordWorldQuaternion);
    // O mount é filho da cena, não do Armature (escala importada 0,01).
    swordMount.position.copy(swordWorldPosition);
    swordMount.quaternion.copy(swordWorldQuaternion);
    swordMount.scale.set(1,1,1);
    swordMount.updateMatrixWorld(true);
    return true;
  }
  function loadSword(model){
    const THREE=api.THREE,loader=new THREE.GLTFLoader();
    swordWorldPosition=new THREE.Vector3();
    swordWorldQuaternion=new THREE.Quaternion();
    loader.load('./EspadaProta.glb?v=espada-prota-hand-mount-mod33',function(gltf){
      try{
        swordRoot=gltf.scene;
        swordRoot.name='EspadaProta_Runtime';
        swordRoot.visible=true;
        swordMeshes=0;
        swordRoot.traverse(function(o){
          if(!o.isMesh)return;
          swordMeshes++;
          o.visible=true;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
          const materials=Array.isArray(o.material)?o.material:[o.material];
          materials.forEach(function(m){if(m)m.needsUpdate=true;});
        });
        if(!swordMeshes)throw new Error('GLB carregado sem malhas renderizáveis');
        swordHand=findSwordHand(model);
        swordRoot.scale.setScalar(SWORD_SCALE);
        // O eixo Y da lâmina aponta para fora dos dedos; o cabo (+Y no GLB) fica no centro da mão.
        swordRoot.rotation.set(0,0,Math.PI);
        swordRoot.position.set(0,SWORD_GRIP_Y*SWORD_SCALE,0);
        if(swordHand){
          swordMount=new THREE.Group();
          swordMount.name='EspadaProta_HandMount';
          api.scene.add(swordMount);
          swordMount.add(swordPivot=new THREE.Group());
          swordPivot.name='EspadaProta_AttackPivot';
          swordPivot.add(swordRoot);
          updateSwordMount();
        }
        addSwordEffects(swordRoot);
        swordLoaded=true;swordLoadError='';
        if(window.PlayerModelView&&window.PlayerModelView.active&&window.PlayerModelView.firstPerson)setSwordFirstPerson(true);
        refreshSwordDiagnostics(performance.now());
      }catch(e){
        swordLoadError='Falha ao preparar EspadaProta.glb: '+(e&&e.message||String(e));
        window.EspadaProtaDiagnostics=swordLoadError;
        console.warn('EspadaProta:',swordLoadError);
      }
    },undefined,function(err){
      swordLoadError='Falha ao carregar ./EspadaProta.glb: '+(err&&err.message||'erro HTTP/rede informado pelo GLTFLoader');
      window.EspadaProtaDiagnostics=swordLoadError;
      console.warn('EspadaProta:',swordLoadError,err||'');
    });
  }
  function setSwordFirstPerson(firstPerson){
    if(!swordRoot||!api||!api.camera)return;
    if(firstPerson){
      api.camera.add(swordRoot);
      // O ponto de pegada continua no canto inferior direito, sem herdar escala do rig.
      swordRoot.position.set(.34,0,-.72);
      swordRoot.rotation.set(0,0,Math.PI);
      swordRoot.scale.setScalar(.52);
      swordRoot.visible=true;
      swordRoot.traverse(function(o){if(o.isMesh)o.visible=true;});
      if(swordMount)swordMount.visible=false;
    }else if(swordHand&&swordMount){
      if(swordPivot)swordPivot.add(swordRoot);else swordMount.add(swordRoot);
      swordRoot.position.set(0,SWORD_GRIP_Y*SWORD_SCALE,0);
      swordRoot.rotation.set(0,0,Math.PI);
      swordRoot.scale.setScalar(SWORD_SCALE);
      swordRoot.visible=true;
      swordMount.visible=true;
      swordRoot.traverse(function(o){if(o.isMesh)o.visible=true;});
      updateSwordMount();
    }else{
      if(swordRoot.parent)swordRoot.parent.remove(swordRoot);
      swordRoot.visible=false;
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
              // Root motion vertical em ataques/queda/morte fazia o personagem terminar suspenso. Só a locomoção mantém a altura animada.\n              if(locomotion)values[k+1]=y;
            }
          });
          if(/breath|idle|rest|standstill|parado/.test(n))actions.idle=actions.idle||clip;
          if(/walk|walking|locomotion|andar|caminh/.test(n))actions.walk=actions.walk||clip;
          const namedAttack=/attack|slash|swing|strike|sword|melee|atacar|ataque|onehand|twohand/.test(n);
          const conflictingAction=/hurt|damage|hitreaction|takehit|tomardano|dano|death|dying|dead|^die$|morrer|morte|fall|falling|knockdown|collapse|stumble|caer|queda|idle|breath|rest|standstill|parado|walk|walking|run|running|sprint|locomotion|andar|caminh|get.?up|stand.?up|rise|recover.?floor|levant|levantar/.test(n);
          if(namedAttack&&!conflictingAction){attackClips.push(clip);actions.attack=actions.attack||clip;}
          if(/hurt|damage|hitreaction|takehit|tomardano|dano/.test(n))actions.hurt=actions.hurt||clip;
          if(/get.?up|stand.?up|rise|recover.?floor|levant|levantar/.test(n))actions.getup=actions.getup||clip;
          if(/fall|falling|knockdown|collapse|stumble|caer|queda/.test(n))actions.fall=actions.fall||clip;
          if(/death|dying|dead|^die$|morrer|morte/.test(n))actions.death=actions.death||clip;
        });
        applySavedAnimationRoles(clips);
        // Este GLB tem seis clipes na ordem conhecida: respirar, andar, atacar,
        // tomar dano, levantar e morrer. Se os nomes forem genéricos, usa essa ordem.
        if(clips.length===6){
          if(!actions.idle)actions.idle=clips[0]||null;
          if(!actions.walk)actions.walk=clips[1]||null;
          if(!actions.attack&&attackClips.length===0&&clips[2]){
            actions.attack1=clips[2];actions.attack=clips[2];attackClips=[clips[2]];
          }
          if(!actions.hurt)actions.hurt=clips[3]||null;
          if(!actions.getup)actions.getup=clips[4]||null;
          if(!actions.death)actions.death=clips[5]||null;
        }
        const unsafeRole=/attack|slash|swing|strike|sword|melee|atacar|ataque|onehand|twohand|hurt|damage|hitreaction|takehit|tomardano|dano|death|dying|dead|^die$|morrer|morte|get.?up|stand.?up|rise|recover.?floor|levant|levantar|fall|falling|knockdown|collapse|stumble|caer|queda|idle|breath|rest|standstill|parado|walk|walking|run|running|sprint|locomotion|andar|caminh/i;
        if(!actions.idle){
          actions.idle=clips.find(function(c){return /breath|idle|rest|standstill|parado/i.test(c.name||'');})||null;
        }
        // Não escolhemos um "ataque" por heurística de movimento: clips de dano,
        // queda e ataque podem mover o mesmo braço. Se o nome não for semântico,
        // o painel de diagnóstico permite identificar o clip real sem contaminar o jogo.
        if(!actions.idle){
          // Só usa um clip genérico como repouso se não houver papéis nomeados;
          // a seleção do ataque nunca depende desta escolha.
          actions.idle=clips.find(function(c){return !unsafeRole.test(c.name||'');})||null;
        }
        // Queda e morte são estados distintos: nunca reutilizar a animação de morte para derrubada.
        actions.fall=actions.fall||actions.death||null;
        actions.death=actions.death||null;
        window.ProtagonistaAnimationTiming={
          attackDuration:.34,
          hurtDuration:.18,
          fallDuration:Math.max(1.15,Number((actions.fall||{}).duration)||0),
          getupDuration:Math.max(1.05,Number((actions.getup||{}).duration)||0)
        };
        ready=true;window.ProtagonistaGLBReady=true;
        window.ProtagonistaAnimationDiagnostics={clips:clips.map(c=>({name:c.name,duration:Number(c.duration)||0})),attackCandidates:attackClips.map(c=>c.name),mapped:Object.keys(actions).reduce(function(o,k){o[k]=actions[k]&&actions[k].name||null;return o;},{})};
        // A lista de clips fica disponível em window.ProtagonistaAnimationDiagnostics, sem texto na tela.
        showAnimationDiagnostics(clips);
        note('modelo pronto. Clips: '+clips.map(c=>c.name+' ('+(Number(c.duration)||0).toFixed(2)+'s)').join(', ')+
          ' | ataques encontrados: '+(attackClips.map(c=>c.name).join(', ')||'NENHUM')+' | mapeamento: '+Object.keys(actions).map(k=>k+'='+(actions[k]&&actions[k].name||'NENHUM')).join('; '),false);
      }catch(e){failed=true;note('erro preparando modelo: '+e.message,true);}
    },undefined,function(){failed=true;note('falha ao carregar Protagonista.glb; confira se o arquivo está na raiz do GitHub.',true);});
  }
  function play(type,once){
    const THREE=api.THREE,clip=actions[type]||((type==='idle'||type==='walk')?actions.idle:null);
    const critical=/^(attack|hurt|fall|death|getup)$/.test(type);
    if(!clip||!mixer){
      if(critical&&currentAction){currentAction.stop();currentAction=null;currentType='';}
      return;
    }
    const next=mixer.clipAction(clip);
    if(currentAction===next&&next.isRunning())return;
    const timing=window.ProtagonistaAnimationTiming||{};
    const targetDuration=type==='attack'?Number(timing.attackDuration):type==='hurt'?Number(timing.hurtDuration):type==='fall'?Number(timing.fallDuration):type==='death'?Number(timing.deathDuration)||0:type==='getup'?Number(timing.getupDuration):0;
    const clipDuration=Number(clip.duration)||0;
    const playbackScale=targetDuration>0&&clipDuration>0?clipDuration/targetDuration:1;
    const fade=targetDuration>0?Math.min(.07,targetDuration*.2):.09;
    const previousCritical=/^(attack|hurt|fall|death|getup)$/.test(currentType);
    if(currentAction){if(critical||previousCritical)currentAction.stop();else currentAction.fadeOut(fade);}
    next.reset();next.enabled=true;next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(playbackScale);
    next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
    next.clampWhenFinished=!!once;next.fadeIn(fade).play();
    currentAction=next;currentType=type;
  }
  function choose(v){
    if(v.dead){if(currentType!=='death')play('death',true);return;}
    if(v.gettingUp){if(currentType!=='getup')play('getup',true);return;}
    // O clipe de morte do modelo também é a animação de queda; após o timer, toca get-up.
    if(v.knockedDown){if(currentType!=='fall')play('fall',true);return;}
    if(v.attack){const id=Number(v.attackId)||0;if(id!==lastPlayedAttackId){lastPlayedAttackId=id;const clip=attackClips.length?attackClips[(id-1)%attackClips.length]:null;if(clip){actions.attack=clip;play('attack',true);}else{currentType='';}}return;}
    if(v.hurt){if(currentType!=='hurt')play('hurt',true);return;}
    if(v.moving&&actions.walk){if(currentType!=='walk'||!currentAction||!currentAction.isRunning())play('walk',false);return;}
    if(currentType!=='idle'||!currentAction||!currentAction.isRunning())play('idle',false);
  }
  let lastFirstPerson=null,lastSwordStatus=0,lastSwordAttackId=-1,swordAttackStart=-1,lastPlayedAttackId=-1;
  function refreshSwordDiagnostics(now){
    if(now-swordStatusCheckAt<250)return;swordStatusCheckAt=now;
    let message=swordLoadError||'Aguardando carregamento de EspadaProta.glb...';
    let verified=false;
    if(swordLoaded){
      const view=window.PlayerModelView,firstPerson=!!(view&&view.active&&view.firstPerson);
      if(!swordMeshes)message='FALHA: GLB carregado sem malha renderizável.';
      else if(!swordHand||!swordMount)message='FALHA: GLB tem '+swordMeshes+' malha(s), mas a mão direita do rig não foi encontrada.';
      else if(firstPerson?swordRoot.parent!==api.camera:swordRoot.parent!==swordMount)message='FALHA: GLB carregado, porém não está conectado ao suporte ativo da espada.';
      else{
        try{
          swordRoot.updateWorldMatrix(true,true);
          const box=new api.THREE.Box3().setFromObject(swordRoot),size=box.getSize(new api.THREE.Vector3());
          const length=Math.max(size.x,size.y,size.z);
          let visibleMesh=false;
          swordRoot.traverse(function(o){
            if(!o.isMesh||!o.geometry)return;
            let parent=o,visible=true;
            while(parent){if(parent.visible===false){visible=false;break;}if(parent===swordRoot)break;parent=parent.parent;}
            const mats=Array.isArray(o.material)?o.material:[o.material];
            const materialVisible=mats.some(function(m){return !!m&&m.visible!==false&&(!Number.isFinite(m.opacity)||m.opacity>0);});
            if(visible&&materialVisible)visibleMesh=true;
          });
          if(!visibleMesh)message='FALHA: suporte conectado, mas nenhuma malha da espada está visível.';
          else if(!Number.isFinite(length)||length<.45)message='FALHA: dimensão mundial da espada inválida ('+(Number(length)||0).toFixed(3)+' u).';
          else{verified=true;message='OK: GLB carregado; '+swordMeshes+' malha(s); mão direita '+swordHand.name+'; '+(firstPerson?'1ª pessoa/câmera':'3ª pessoa/mão')+'; comprimento '+length.toFixed(2)+' u.';}
        }catch(e){message='FALHA ao verificar malha/encaixe da espada: '+(e&&e.message||String(e));}
      }
    }
    window.EspadaProtaDiagnostics=message;
    // Status disponível em window.EspadaProtaDiagnostics; sem painel sobre a jogabilidade.
  }
  function frame(now){
    requestAnimationFrame(frame);
    refreshSwordDiagnostics(now);
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
    if(!diagnosticPreview)choose(v);
    if(currentType==='walk'&&currentAction){
      const speed=Math.max(0,Number(v.speed)||0);
      currentAction.setEffectiveTimeScale(Math.max(.35,Math.min(1.35,speed/130)));
    }
    const dt=Math.min(Math.max((now-last)/1000,0),.05);last=now;
    if(mixer)mixer.update(dt);
    if(swordRoot){
      const attackId=Number(v.attackId)||0;
      if(v.attack&&attackId!==lastSwordAttackId){lastSwordAttackId=attackId;swordAttackStart=now;}
      const swingDuration=Math.max(1,Number((window.ProtagonistaAnimationTiming||{}).attackDuration)||.34)*1000;const swingProgress=swordAttackStart<0?1:Math.max(0,Math.min(1,(now-swordAttackStart)/swingDuration));
      const swingAngle=swingProgress<1?Math.sin(swingProgress*Math.PI)*1.35:0;
      if(swordPivot&&swordRoot.parent===swordPivot){swordPivot.rotation.set(0,0,swingAngle);swordRoot.rotation.set(0,0,Math.PI);}else{swordRoot.rotation.set(0,0,Math.PI+swingAngle);}
      swordPhase+=dt;
      swordEffects.forEach(function(p,i){
        const phase=p.userData.phase+swordPhase*(1.15+(i%3)*.18);
        p.position.set(Math.cos(phase)*p.userData.radius,p.userData.height+Math.sin(swordPhase*1.8+i)*.025,Math.sin(phase)*p.userData.radius+.025);
        p.visible=Math.sin(swordPhase*2+i*.9)>.05;
      });
      if(swordLight)swordLight.intensity=.55+.22*(.5+.5*Math.sin(swordPhase*2.4));
    }
    if(currentType==='attack'&&currentAction&&!currentAction.isRunning())currentType='';
    if(restoreModelScales)restoreModelScales();
    if(root&&rootBasePosition){root.position.copy(rootBasePosition);root.updateMatrixWorld(true);}
    if(swordMount&&swordHand)updateSwordMount();
    // A renderização fica com o loop do Valério: os dois modelos compartilham depth buffer.
  }
  window.ProtagonistaGLBReady=false;
  window.EspadaProtaDiagnostics='aguardando carregamento de EspadaProta.glb...';
  if(!disabled){if(document.readyState==='complete')findAPI();else window.addEventListener('load',findAPI,{once:true});requestAnimationFrame(frame);}
})();