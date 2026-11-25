/** Painel ADM da Mod 350: apenas para ?adm=1. Não é sistema de autenticação.
 * UI responsiva, isolada do HUD, e um único painel também no laboratório de dimensões. */
export function createAdmPanel({onTeleport,onDimension,onUltimate,onPhase,onKill,getState}){
 if(document.getElementById('adm-panel'))return null;
 const style=document.createElement('style');style.id='adm-panel-styles';style.textContent=`
 #adm-panel{position:fixed;right:max(8px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 105px);z-index:82;display:flex;flex-direction:column;align-items:flex-end;gap:6px;width:min(420px,calc(100vw - 16px));max-width:calc(100vw - 16px);font:500 12px/1.4 system-ui,sans-serif;pointer-events:none}
 body.usura-cine #adm-panel{visibility:hidden}
 #adm-panel *{box-sizing:border-box}
 #adm-panel button{font:inherit;color:inherit;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}
 #adm-panel button:focus-visible{outline:2px solid #ffd08d;outline-offset:2px}
 #adm-toggle{pointer-events:auto;min-height:39px;padding:7px 12px;border:1px solid #dab16e;border-radius:12px;background:linear-gradient(145deg,#342116,#140f16);color:#ffe5ad!important;font-weight:800!important;box-shadow:0 4px 20px #0009}
 #adm-content{box-sizing:border-box;pointer-events:auto;display:flex;flex-direction:column;width:min(350px,calc(100vw - 20px));max-height:min(70dvh,520px);overflow:hidden;border:1px solid #a97b52;border-radius:14px;background:linear-gradient(160deg,#20151e,#100f18 70%);box-shadow:0 14px 48px #000b;color:#f7eaf2}
 #adm-content[hidden]{display:none!important}
 .adm-heading{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;gap:10px}
 .adm-heading strong{font-size:15px;color:#ffda99;letter-spacing:.02em}
 .adm-heading small{display:block;font-size:10px;color:#d5bbab;font-weight:500}
 .adm-close{border:1px solid #66515b;border-radius:8px;background:#2a202c;min-width:33px;min-height:33px}
 .adm-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:6px 12px 10px}
 .adm-tab{min-height:36px;border:1px solid #554358;border-radius:9px;background:#2b2230;text-align:center;font-weight:750!important}
 .adm-tab[aria-selected="true"]{background:#734a36;border-color:#e1b474;color:white}
 .adm-scroll{padding:4px 12px 12px;overflow-y:auto;overscroll-behavior:contain;min-height:0}
 .adm-page[hidden]{display:none!important}
 .adm-caption{font-size:11px;font-weight:650;color:#e9ba7b;margin:4px 0 9px}
 .adm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 .adm-action{padding:10px 9px;min-height:45px;border:1px solid #795d64;border-radius:10px;background:#342431;text-align:left;font-weight:700!important;line-height:1.25!important;overflow-wrap:anywhere}
 .adm-action:active{background:#67404a}
 .adm-action.primary{background:linear-gradient(135deg,#8b3d36,#613044);border-color:#e09b78;color:white}
 .adm-action.wide{grid-column:1/-1}
 .adm-status{border-top:1px solid #493541;padding:9px 12px 11px;color:#f0d3bd;min-height:36px;font-size:11px;line-height:1.4}
 #adm-panel [data-adm-hidden="true"]{display:none}
 @media(max-width:680px){#adm-panel{top:calc(env(safe-area-inset-top) + 60px);left:7px;right:7px;width:auto;max-width:none;align-items:stretch}#adm-toggle{align-self:flex-end;min-width:104px;min-height:44px}#adm-content{width:100%;max-height:min(66dvh,560px);border-radius:16px}.adm-heading{padding:10px 12px 7px}.adm-tabs{padding:5px 10px 8px;gap:6px}.adm-tab{min-height:43px;padding:6px 3px;font-size:11px}.adm-scroll{padding:4px 10px 10px}.adm-grid{gap:7px}.adm-action{min-height:48px;padding:10px}.adm-status{padding-bottom:calc(10px + env(safe-area-inset-bottom))}}
 @media(max-height:510px){#adm-panel{top:calc(env(safe-area-inset-top) + 64px);left:7px;right:7px;width:auto;align-items:stretch}#adm-toggle{align-self:flex-end}#adm-content{width:100%;max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 144px)}.adm-scroll{padding-bottom:8px}}
 @media(max-width:355px){.adm-grid{grid-template-columns:1fr}.adm-action.wide{grid-column:auto}.adm-heading strong{font-size:13px}}
 `;document.head.append(style);
 const panel=document.createElement('div');panel.id='adm-panel';panel.setAttribute('aria-label','Ferramentas ADM de teste');
 const toggle=document.createElement('button');toggle.id='adm-toggle';toggle.type='button';toggle.textContent='⚙ ADM';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','adm-content');
 const box=document.createElement('section');box.id='adm-content';box.hidden=true;box.setAttribute('aria-label','Painel de testes');
 const header=document.createElement('div');header.className='adm-heading';header.innerHTML='<div><strong>⚔ Painel ADM</strong><small>Ferramentas de teste · celular e PC</small></div>';
 const close=document.createElement('button');close.className='adm-close';close.type='button';close.textContent='✕';close.setAttribute('aria-label','Fechar painel');header.append(close);
 const tabs=document.createElement('nav');tabs.className='adm-tabs';tabs.setAttribute('aria-label','Categorias ADM');
 const scroll=document.createElement('div');scroll.className='adm-scroll';
 const status=document.createElement('div');status.className='adm-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Escolha uma ferramenta. Os testes de dimensão não alteram o progresso salvo.';
 const defs=[['ganancia','⚔ Ganância'],['dimensoes','Dimensões'],['viagem','Viagem']];
 const pages=new Map(),tabButtons=new Map();let current='ganancia',pauseButton=null;
 const message=text=>{status.textContent=String(text||'Ação enviada ao jogo.');};
 function open(yes){box.hidden=!yes;toggle.setAttribute('aria-expanded',String(yes));toggle.textContent=yes?'⚙ ADM ▴':'⚙ ADM';if(yes)refresh();}
 function select(id){current=id;for(const [key,p] of pages)p.hidden=key!==id;for(const [key,b] of tabButtons)b.setAttribute('aria-selected',String(id===key));scroll.scrollTop=0;refresh();}
 function action(page,title,callback,{primary=false,wide=false}={}){
  const b=document.createElement('button');b.className='adm-action'+(primary?' primary':'')+(wide?' wide':'');b.type='button';b.textContent=title;
  b.addEventListener('click',e=>{e.stopPropagation();try{const result=callback();message(typeof result==='string'?result:result===false?'Ação indisponível neste momento.':'Ação executada.');refresh();}catch(err){message('Erro ao executar ação: '+err.message);}});
  pages.get(page).querySelector('.adm-grid').append(b);return b;
 }
 for(const [id,label] of defs){
  const b=document.createElement('button');b.className='adm-tab';b.textContent=label;b.type='button';b.setAttribute('aria-selected',String(id===current));b.addEventListener('click',()=>select(id));tabs.append(b);tabButtons.set(id,b);
  const page=document.createElement('div');page.className='adm-page';page.hidden=id!==current;const caption=document.createElement('div');caption.className='adm-caption';caption.textContent=id==='ganancia'?'Ultimate e fases — combate real':id==='dimensoes'?'Testes isolados · não salvam o progresso':'Teleportes seguros fora de combate';const grid=document.createElement('div');grid.className='adm-grid';page.append(caption,grid);scroll.append(page);pages.set(id,page);
 }
 const ultimateButton=action('ganancia','💥 ATIVAR ULTIMATE · JUÍZO DA USURA',onUltimate,{primary:true,wide:true});
 action('ganancia','⏭ Próxima fase da Ganância',onPhase,{wide:true});
 action('ganancia','🎮 Abrir teste da Ganância',()=>onDimension('greed'),{wide:true});
 pauseButton=action('ganancia','⏸ PAUSAR INIMIGOS',()=>onPause?.(),{wide:true});
 action('ganancia','☠ Eliminar inimigos próximos',onKill,{wide:true});
 action('dimensoes','I · VHAZRAEL',()=>onDimension('bishop1'));
 action('dimensoes','II · VORGAZHEK',()=>onDimension('bishop2'));
 action('dimensoes',"III · ZAR’KHAEL",()=>onDimension('bishop3'));
 action('dimensoes','IV · VÉRAXION',()=>onDimension('bishop4'));
 action('dimensoes','V · GANÂNCIA',()=>onDimension('greed'),{primary:true});
 // Eliminar inimigos foi agrupado com os controles de combate na aba Ganância.
 action('viagem','🏘 Cidade 1 · Eldória',()=>onTeleport('eldoria'));
 action('viagem','🌄 Vale do Entardecer',()=>onTeleport('vale'));
 action('viagem','🌋 Cidade 2 · Cinzária',()=>onTeleport('cinzaria'));
 action('viagem','🌿 Começar jornada',()=>{location.href='mundo-3d-prototype.html?adm=1&debug3d=1&jornadaInicio=1';return 'Abrindo jornada.'},{wide:true});
 action('viagem','↩ Laboratório de inimigos',()=>{location.href='laboratorio-inimigos.html';return 'Abrindo laboratório.'},{wide:true});
 function refresh(){const s=getState?.()||{};ultimateButton.title=s.phase===3?'Ativar o Juízo da Usura agora':s.inGreed?'Disponível depois da transformação para a fase III':'Entre na Dimensão da Ganância para usar';if(pauseButton){pauseButton.textContent=s.paused?'▶ RETOMAR INIMIGOS':'⏸ PAUSAR INIMIGOS';pauseButton.setAttribute('aria-pressed',String(!!s.paused));pauseButton.title=s.paused?'Retomar movimento dos inimigos e chefes':'Congelar inimigos e chefes do encontro';}}
 toggle.addEventListener('click',e=>{e.stopPropagation();open(box.hidden);});close.addEventListener('click',()=>open(false));
 panel.append(toggle,box);box.append(header,tabs,scroll,status);document.body.append(panel);
 panel.addEventListener('pointerdown',e=>e.stopPropagation());
 panel.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!box.hidden)open(false);});
 return {message,refresh,open,select,destroy(){panel.remove();style.remove();}};
}
