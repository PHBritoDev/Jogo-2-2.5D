/** Height-aware point query over existing world collision metadata. No renderer/raycast dependency.
 * Sweeps supply horizontal radius samples and the bottom of a fire volume. */
export function sceneryPoint(p,{ground=()=>0,trees=[],rocks=[],structures=[]}={}){
 for(const o of trees){const dx=p.x-o.x,dz=p.z-o.z;if(dx*dx+dz*dz<o.radius*o.radius&&p.y<=ground(o.x,o.z)+(o.height||8))return true;}
 for(const o of structures){if(o.height!==undefined&&o.height<=.68)continue;const dx=p.x-o.x,dz=p.z-o.z;if((o.shape==='box'?Math.abs(dx)<o.halfX&&Math.abs(dz)<o.halfZ:dx*dx+dz*dz<o.radius*o.radius)&&p.y<=ground(o.x,o.z)+(o.height||3))return true;}
 for(const o of rocks){if(o.height<=.68)continue;const dx=p.x-o.x,dz=p.z-o.z,r=o.radius*.74;if(dx*dx+dz*dz<r*r&&p.y<=(o.base??ground(o.x,o.z))+o.height)return true;}
 return false;
}
