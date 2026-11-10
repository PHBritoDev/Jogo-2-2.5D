#!/usr/bin/env python3
"""Verify optimization without dropping Meshy character meshes, bones or animation clips."""
import json, os, struct, sys
def info(path):
    with open(path,'rb') as f:
        h=f.read(20)
        if len(h)!=20 or h[:4]!=b'glTF':raise RuntimeError('Not a GLB: '+path)
        _,version,total,jlen,jtype=struct.unpack('<4sIIII',h)
        if version!=2 or jtype!=0x4e4f534a:raise RuntimeError('GLB header invalid: '+path)
        d=json.loads(f.read(jlen))
    return dict(path=path,bytes=os.path.getsize(path),
       animations=[dict(name=a.get('name',''),channels=len(a.get('channels',[])),samplers=len(a.get('samplers',[]))) for a in d.get('animations',[])],
       meshes=len(d.get('meshes',[])),skins=len(d.get('skins',[])),nodes=len(d.get('nodes',[])),
       materials=len(d.get('materials',[])),images=len(d.get('images',[])),
       totalTriangles=sum((d['accessors'][p['indices']]['count'] if 'indices' in p else d['accessors'][p['attributes']['POSITION']]['count'])//3
       for mesh in d.get('meshes',[]) for p in mesh.get('primitives',[]) if p.get('mode',4)==4))
reports=[]
for before,after in zip(sys.argv[1::2],sys.argv[2::2]):
    a,b=info(before),info(after)
    for field in ('animations','meshes','skins','totalTriangles'):
        if a[field]!=b[field]:raise RuntimeError(f'{before}: {field} changed {a[field]} -> {b[field]}')
    if b['bytes']>=a['bytes']:raise RuntimeError(f'{before}: did not reduce file size')
    reports.append(dict(original=a,optimized=b,savedBytes=a['bytes']-b['bytes'],savedPercent=round(100*(1-b['bytes']/a['bytes']),2)))
print(json.dumps(reports,indent=2))
with open('npc-asset-compression-report.json','w') as f:json.dump(reports,f,indent=2)
