/* MOD 181 — ruína secreta acessível ao lado da trilha, recompensa visual de exploração. */
const secretRuin=new THREE.Group();secretRuin.position.set(-18.5,0,-52);scene.add(secretRuin);
const ruinStone=mat(0x6a7168);
for(const [rx,rz,rw,rh,rd] of [[0,0,2.4,1.1,1.6],[1.8,.4,1.2,1.8,.9],[-1.6,-.3,1.4,.9,1.2],[.4,-1.3,1.8,.55,1.0]]){
 const block=new THREE.Mesh(new THREE.BoxGeometry(rw,rh,rd),ruinStone);block.position.set(rx,rh*.5,rz);block.rotation.y=(rx+rz)*.11;block.castShadow=false;block.receiveShadow=true;secretRuin.add(block);
 marketObstacles.push({x:secretRuin.position.x+rx,z:secretRuin.position.z+rz,shape:'box',halfX:rw*.55,halfZ:rd*.55,height:rh});
}
const ruinMarker=new THREE.Mesh(new THREE.TorusGeometry(.22,.03,6,16),new THREE.MeshBasicMaterial({color:0xc9a55a}));
ruinMarker.rotation.x=Math.PI/2;ruinMarker.position.set(0,.05,1.8);secretRuin.add(ruinMarker);
let secretRuinFound=false;try{secretRuinFound=localStorage.getItem('seven-sins-3d-secret-ruin')==='1';}catch(e){}
function checkSecretRuin(){
 if(secretRuinFound)return;
 if(Math.hypot(player.position.x-secretRuin.position.x,player.position.z-secretRuin.position.z)<3.2){
  secretRuinFound=true;
  try{localStorage.setItem('seven-sins-3d-secret-ruin','1');const n=Number(localStorage.getItem('seven-sins-3d-coins')||0);localStorage.setItem('seven-sins-3d-coins',String(n+3));}catch(e){}
  const coinEl=document.getElementById('coin-count');if(coinEl){const cur=Number(coinEl.textContent||0);coinEl.textContent=String(cur+3);}
  const toast=document.getElementById('quest-toast');if(toast){toast.textContent='RUÍNA DESCOBERTA · +3 MOEDAS';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2800);}
  status.textContent='Você encontrou uma ruína antiga escondida entre as árvores.';
 }
}
