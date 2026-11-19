// One reusable set per duelist. All positions are world-space.
export function makeJudgmentSeal(T, scene, radius) {
  const group = new T.Group(), materials = [], geometries = [];
  function mesh(geometry, color) {
    const material = new T.MeshBasicMaterial({color, transparent:true, side:T.DoubleSide, depthWrite:false});
    const m = new T.Mesh(geometry,material);
    geometries.push(geometry);materials.push(material);group.add(m);return m;
  }
  const rim=mesh(new T.RingGeometry(radius-.09,radius,48),0xff9754);
  const wave=mesh(new T.RingGeometry(.93,1,32),0xe44e38);
  const core=mesh(new T.OctahedronGeometry(.36),0xffc387);
  const halo=mesh(new T.TorusGeometry(.73,.046,5,20,Math.PI*1.7),0x852855);
  rim.rotation.x=wave.rotation.x=-Math.PI/2;
  scene.add(group);group.visible=false;
  return {
    update(actor) {
      const act=actor.act, mark=act?.mark;
      group.visible=!!mark && actor.alive;
      if (!group.visible) return;
      group.position.set(mark.x,mark.y+.046,mark.z);
      const landed=act.phase==='land' && !act.fizzle;
      const progress=landed?Math.min(1,(act.t-act.landAt)/.38):0;
      rim.visible=!landed && !act.fizzle;rim.material.opacity=.72+.24*Math.sin(act.t*15);
      wave.visible=core.visible=landed && progress<1;
      wave.scale.setScalar(radius*(.12+.88*progress));wave.material.opacity=1-progress;
      core.scale.set(1-progress,(1-progress)*2.3,1-progress);core.position.y=.22;core.material.opacity=1-progress;
      halo.visible=act.phase!=='land';halo.position.set(actor.x-mark.x,actor.y-mark.y+1.1,actor.z-mark.z);
      halo.rotation.set(.95,act.t*3.7,act.t*2);halo.material.opacity=.54;
    },
    dispose(){scene.remove(group);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  };
}
