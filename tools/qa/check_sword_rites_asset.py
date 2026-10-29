"""Run from repo root: python tools/qa/check_sword_rites_asset.py (numpy, scipy)."""
import json,struct,numpy as np
from scipy.spatial.transform import Rotation

def load(path):
 b=open(path,'rb').read();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);return g,b[28+n:]
def read(g,b,i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];n={'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']];return np.array([struct.unpack_from('<'+'f'*n,b,v.get('byteOffset',0)+a.get('byteOffset',0)+k*v.get('byteStride',n*4)) for k in range(a['count'])])
g,b=load('Protagonista-ritos-231.glb');idx={n.get('name'):i for i,n in enumerate(g['nodes'])};parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
out=[]
for clip in g['animations']:
 tracks={(c['target']['node'],c['target']['path']):read(g,b,clip['samplers'][c['sampler']]['output']) for c in clip['channels']};N=len(next(iter(tracks.values())));feet={n:[] for n in ['mixamorigRightFoot','mixamorigLeftFoot']};hips=[]
 for k in range(N):
  w={}
  for i,n in enumerate(g['nodes']):
   t=tracks[(i,'translation')][k] if (i,'translation') in tracks else n.get('translation',[0,0,0]);q=tracks[(i,'rotation')][k] if (i,'rotation') in tracks else n.get('rotation',[0,0,0,1]);s=n.get('scale',[1,1,1]);m=np.eye(4);m[:3,:3]=Rotation.from_quat(q).as_matrix()@np.diag(s);m[:3,3]=t;w[i]=w[parents[i]]@m if i in parents else m
  for n in feet:feet[n].append(w[idx[n]][:3,3])
  hips.append(w[idx['mixamorigHips']][:3,3])
 r={'clip':clip['name'],'samples':N,'foot_drift_m':{n:float(np.max(np.linalg.norm(np.array(p)-p[0],axis=1))) for n,p in feet.items()},'hip_vertical_m':float(np.ptp(np.array(hips)[:,1])),'root_motion_xz_m':float(np.max(np.linalg.norm(np.array(hips)[:,[0,2]]-np.array(hips)[0,[0,2]],axis=1)))}
 out.append(r)
for r in out:
 assert max(r['foot_drift_m'].values())<.005,r
 assert r['root_motion_xz_m']<.001,r
print(json.dumps(out,indent=2))
