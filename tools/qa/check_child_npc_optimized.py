#!/usr/bin/env python3
"""Check GLB asset size + semantic integrity before deployment."""
import json, os, struct, sys
def read(path):
    with open(path,'rb') as f:
        header=f.read(20)
        if len(header)<20 or header[:4]!=b'glTF': raise RuntimeError('Not GLB: '+path)
        _,version,total,json_length,json_type=struct.unpack('<4sIIII',header)
        if version!=2 or json_type!=0x4e4f534a:raise RuntimeError('Invalid GLB header')
        data=json.loads(f.read(json_length))
    return {'file':path,'bytes':os.stat(path).st_size,'animations':[(a.get('name'),len(a.get('channels',[])),len(a.get('samplers',[]))) for a in data.get('animations',[])],'nodes':len(data.get('nodes',[])),'meshes':len(data.get('meshes',[])),'skins':len(data.get('skins',[])),'textures':len(data.get('textures',[]))}
a,b=map(read,sys.argv[1:3])
print(json.dumps({'original':a,'optimized':b,'ratio':round(b['bytes']/a['bytes'],3)},indent=2))
assert a['animations']==b['animations'],'Animations or channels changed'
assert a['skins']==b['skins'],'Skin count changed'
assert a['meshes']==b['meshes'],'Mesh count changed'
assert b['bytes']<a['bytes']*.9,'No worthwhile compression'
with open('child-npc-optimization-report.json','w') as f:json.dump({'original':a,'optimized':b,'ratio':b['bytes']/a['bytes']},f,indent=2)
