"""Rebuild validation inputs from the PR base; compare the committed GLBs, not regenerated ones."""
import os,pathlib,subprocess,json
from lossless import verify
base=os.environ['GLB_BASE_SHA'];manifest=json.loads(pathlib.Path('docs/auditorias/glb-lossless-2026-11-12/audit.json').read_text());pathlib.Path('original').mkdir(exist_ok=True);pathlib.Path('optimized').mkdir(exist_ok=True)
for item in manifest:
 name=item['file'];before=subprocess.check_output(['git','show',base+':'+name]);after=pathlib.Path(name).read_bytes();verify(before,after)
 # Detect accidental edits or a different baseline, including assets intentionally preserved.
 import hashlib
 assert hashlib.sha256(before).hexdigest()==item['sha256Before'],name+' baseline changed'
 assert hashlib.sha256(after).hexdigest()==item['sha256After'],name+' output changed'
 pathlib.Path('original',name).write_bytes(before);pathlib.Path('optimized',name).write_bytes(after)
pathlib.Path('optimized/report.json').write_text(json.dumps(manifest))
print('Verified',len(manifest),'committed GLBs against pinned original commit',base)
