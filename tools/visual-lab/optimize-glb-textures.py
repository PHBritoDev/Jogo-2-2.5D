#!/usr/bin/env python3
"""Optimize embedded GLB textures without changing mesh, rig or animation buffers."""
import argparse,io,json,struct
from pathlib import Path
from PIL import Image
M,J,B=0x46546c67,0x4e4f534a,0x004e4942
def parse(p):
 raw=Path(p).read_bytes()
 if len(raw)<20 or struct.unpack_from('<III',raw)!=(M,2,len(raw)):raise ValueError('Invalid GLB')
 i=12;parts=[]
 while i<len(raw):
  n,t=struct.unpack_from('<II',raw,i);i+=8;parts.append((t,raw[i:i+n]));i+=n
 if len(parts)!=2 or parts[0][0]!=J or parts[1][0]!=B:raise ValueError('Unsupported GLB layout')
 return json.loads(parts[0][1]),parts[1][1]
def save(p,g,b):
 j=json.dumps(g,ensure_ascii=False,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
 b+=b'\x00'*(-len(b)%4)
 Path(p).write_bytes(struct.pack('<III',M,2,28+len(j)+len(b))+struct.pack('<II',len(j),J)+j+struct.pack('<II',len(b),B)+b)
def optimize(filename,maxedge):
 g,b=parse(filename)
 if len(g.get('buffers',[]))!=1:raise ValueError('Multiple buffers')
 views=g.get('bufferViews',[]);original=[]
 for v in views:
  if v.get('buffer',0)!=0:raise ValueError('External bufferView')
  off=v.get('byteOffset',0);ln=v['byteLength']
  if off+ln>len(b):raise ValueError('Out of bounds')
  original.append(b[off:off+ln])
 protected=set()
 for a in g.get('accessors',[]):
  if 'bufferView' in a:protected.add(a['bufferView'])
  for side in ['indices','values']:
   v=a.get('sparse',{}).get(side,{})
   if 'bufferView' in v:protected.add(v['bufferView'])
 replace={};changed=[]
 for i,img in enumerate(g.get('images',[])):
  vi=img.get('bufferView')
  if vi is None:continue
  if vi in protected:raise ValueError('Texture view shared with geometry')
  if vi in replace:continue
  with Image.open(io.BytesIO(original[vi])) as tex:
   tex.load();w,h=tex.size
   if max(w,h)<=maxedge and len(original[vi])<512000:continue
   alpha='A' in tex.getbands() or 'transparency' in tex.info
   tex=tex.convert('RGBA' if alpha else 'RGB')
   if max(w,h)>maxedge:tex.thumbnail((maxedge,maxedge),Image.Resampling.LANCZOS)
   out=io.BytesIO();tex.save(out,format='WEBP',quality=91,method=6,exact=True)
   compressed=out.getvalue()
   if len(compressed)>=len(original[vi])*.97:continue
   replace[vi]=compressed
   for ix,im in enumerate(g['images']):
    if im.get('bufferView')==vi:
     im['mimeType']='image/webp'
     changed.append({'image':ix,'before':str(w)+'x'+str(h),'after':str(tex.width)+'x'+str(tex.height),'before_bytes':len(original[vi]),'after_bytes':len(compressed)})
 if not changed:return {'file':filename,'status':'unchanged','before_bytes':Path(filename).stat().st_size,'after_bytes':Path(filename).stat().st_size}
 output=bytearray()
 for k,v in enumerate(views):
  output.extend(b'\x00'*(-len(output)%4));v['byteOffset']=len(output)
  raw=replace.get(k,original[k]);v['byteLength']=len(raw);output.extend(raw)
 g['buffers'][0]['byteLength']=len(output)
 temp=Path(filename+'.tmpopt')
 try:
  save(temp,g,bytes(output))
  verified,bin2=parse(temp)
  assert len(verified.get('animations',[]))==len(g.get('animations',[]))
  assert len(verified.get('skins',[]))==len(g.get('skins',[]))
  for k,v in enumerate(verified['bufferViews']):
   data=bin2[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
   if k not in replace:assert data==original[k],f'Changed non-image buffer {k}'
  before=Path(filename).stat().st_size;after=temp.stat().st_size
  if after>=before:raise ValueError('No size reduction')
  temp.replace(filename)
  return {'file':filename,'status':'optimized','before_bytes':before,'after_bytes':after,'reduction_percent':round((before-after)/before*100,1),'images':changed,'animations':len(g.get('animations',[])),'skins':len(g.get('skins',[]))}
 finally:temp.unlink(missing_ok=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--max-edge',type=int,default=2048);p.add_argument('--report',default='visual-lab-results/glb-lote1.json');p.add_argument('files',nargs='+');a=p.parse_args()
 results=[optimize(f,a.max_edge) for f in a.files]
 out=Path(a.report);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(results,ensure_ascii=False,indent=2))
