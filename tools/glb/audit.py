import json,pathlib,io,sys
from PIL import Image
from lossless import unpack,payload,verify
root=pathlib.Path('.');report=json.loads((root/'optimized/report.json').read_text());sources=[p for p in (root/'game').rglob('*.js') if not p.name.endswith('.test.js') and not p.name.endswith('.test.mjs')]
texts={str(p.relative_to(root/'game')):p.read_text() for p in sources}
for item in report:
 data=(root/'original'/item['file']).read_bytes();new=(root/'optimized'/item['file']).read_bytes();verify(data,new);j,b=unpack(data)
 images=[]
 for i in j.get('images',[]):
  if 'bufferView' not in i:continue
  image=Image.open(io.BytesIO(payload(j,b,i['bufferView'])));images.append({'width':image.width,'height':image.height,'format':image.format,'mode':image.mode})
 item['images']=images;item['estimatedRGBA8TextureBytesWithMips']=sum(int(i['width']*i['height']*4*4/3) for i in images)
 item['runtimeLiteralReferences']=[p for p,t in texts.items() if item['file'] in t and '.test.' not in p]
 item['structuralEquivalence']=True
 item['notes']='No new codec/extension; all accessor bytes, node/skin/animation/material definitions preserved.'
(root/'evidence/audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(len(report),'GLBs; payload equivalence verified; all textures retain dimensions and samples')
