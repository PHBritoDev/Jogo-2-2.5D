/**
 * Modo de fidelidade visual: a imagem aprovada é a composição da tela.
 * O HTML fica por cima apenas para hit-testing, acessibilidade e dados reais.
 * Sem o PNG real, a tela vetorial anterior permanece ativa (nunca fingir fidelidade).
 *
 * Este modo evita recriar artes pintadas por CSS/Three.js — um mesh 3D não
 * consegue reproduzir pixel a pixel uma ilustração 2D.
 */
const IMAGE=new URL('./assets/ui/menu-sete-pecados-reference.jpg',import.meta.url).href;
function button(label,x,y,w,h,handler){
 const b=document.createElement('button');b.type='button';b.className='gx-exact-hit';
 b.setAttribute('aria-label',label);b.style.cssText=`left:${x/1536*100}%;top:${y/864*100}%;width:${w/1536*100}%;height:${h/864*100}%`;
 b.addEventListener('click',handler);return b;
}
export function mountPixelReference({root,galaxies,progressPercent,coins,isReady,onEnter,onSettings}){
 const img=new Image();img.decoding='async';img.src=IMAGE;
 img.onload=()=>{
  if(!img.naturalWidth||!root.isConnected)return;
  const stage=document.createElement('div');stage.className='gx-exact-stage';
  const art=document.createElement('img');art.src=IMAGE;art.alt='';art.draggable=false;art.className='gx-exact-art';stage.appendChild(art);
  const live=document.createElement('span');live.className='gx-exact-live';live.setAttribute('aria-live','polite');stage.appendChild(live);
  const detail=document.createElement('section');detail.className='gx-exact-selected';detail.hidden=true;detail.setAttribute('aria-label','Informações da galáxia');stage.appendChild(detail);
  const show=(id)=>{
   if(id===1){detail.hidden=true;return;}
   const g=galaxies[id-1];if(!g)return;
   detail.hidden=false;
   // Texto dinâmico de jogo: nunca alterar a composição principal.
   detail.replaceChildren();
   const title=document.createElement('h2');title.textContent='GALÁXIA '+id+' · '+g.name.toUpperCase();
   const tag=document.createElement('p');tag.textContent=g.tag;
   const access=document.createElement('p');access.textContent='ACESSO: '+g.access.join(' · ');
   const close=document.createElement('button');close.type='button';close.textContent='VOLTAR À GANÂNCIA';close.addEventListener('click',()=>show(1));
   detail.append(title,tag,access,close);
  };
  // Coordenadas medidas da referência exata 1536 × 864.
  const centers=[339,521,696,866,1057,1225,1418];
  centers.forEach((x,i)=>stage.appendChild(button('Selecionar '+galaxies[i].name,x-87,184,174,215,()=>show(i+1))));
  stage.appendChild(button('Entrar na Ganância',644,577,354,80,()=>{
   if(!isReady()){live.textContent='PREPARANDO O MUNDO…';return;}
   root.classList.add('leaving');setTimeout(()=>{root.remove();onEnter?.(1);},650);
  }));
  stage.appendChild(button('Abrir configurações',20,383,192,59,()=>onSettings?.()));
  for(const [text,y] of [['GALÁXIAS',166],['LOJA',228],['INVENTÁRIO',281],['MISSÕES',330]]){
   const b=button(text,14,y,202,52,()=>{if(text==='GALÁXIAS')show(1);});
   if(text!=='GALÁXIAS'){b.disabled=true;b.title='Em breve';}stage.appendChild(b);
  }
  // O contador é uma informação dinâmica; cobre apenas o número antigo, não a arte.
  if(coins!==0){
   const label=document.createElement('span');label.className='gx-exact-coin-value';
   label.textContent=Number(coins).toLocaleString('pt-BR');stage.appendChild(label);
  }
  if(progressPercent!==0){
   const value=document.createElement('span');value.className='gx-exact-progress-value';
   value.textContent=Math.round(progressPercent)+'%';stage.appendChild(value);
  }
  root.appendChild(stage);root.classList.add('gx-exact-mode');
 };
 img.onerror=()=>{root.dataset.referenceMissing='true';console.warn('[Menu exato] PNG aprovado ausente; mantendo menu SVG de reserva:',IMAGE);};
}
