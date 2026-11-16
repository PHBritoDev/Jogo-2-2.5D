"""Reproduce pinned CC0 sources and 512px textures (Python + Pillow, explicit invocation).
Run from repo root. Checks upstream MD5 before conversion; never runs in the game/CI.
"""
import concurrent.futures, hashlib, json, pathlib, urllib.request
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[2]/'assets/ui/menu/polyhaven'
manifest=json.loads((root/'sources.json').read_text())
def download(entry):
    request=urllib.request.Request(entry['source'],headers={'User-Agent':'JogoMenuAssetResearch/1.0 (PHBritoDev)'})
    with urllib.request.urlopen(request,timeout=60) as response:data=response.read()
    if hashlib.md5(data).hexdigest()!=entry['md5']:raise ValueError('Upstream asset changed: '+entry['source'])
    target=root/entry['file'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(download,manifest))
for asset in ['rock_face_02','modular_fort_01']:
    folder=root/asset;file=folder/(asset+'.gltf');gltf=json.loads(file.read_text())
    for image in gltf.get('images',[]):
        source=folder/image['uri'];target=source.with_suffix('.webp')
        with Image.open(source) as pixels:pixels.resize((512,512),Image.Resampling.LANCZOS).save(target,quality=88)
        source.unlink();image['uri']=str(target.relative_to(folder))
    file.write_text(json.dumps(gltf,separators=(',',':')))
