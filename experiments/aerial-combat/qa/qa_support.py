"""Use the same pinned Three version locally in CI; retain startup failures as evidence."""
import json,os
from pathlib import Path
from urllib.parse import urlsplit

async def configure(page,report):
 report['requestFailures']=[]
 page.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url,'failure':r.failure}))
 directory=os.environ.get('AERIAL_THREE_DIR')
 if not directory:return
 root=Path(directory).resolve()
 if json.loads((root/'package.json').read_text())['version']!='0.160.0':raise RuntimeError('Wrong Three revision in QA')
 async def serve(route):
  suffix=urlsplit(route.request.url).path.split('/three@0.160.0/',1)[1]
  file=(root/suffix).resolve()
  if not file.is_relative_to(root) or not file.is_file():await route.abort();return
  await route.fulfill(status=200,content_type='application/javascript',body=file.read_bytes())
 await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',serve)
 report['threeSource']='Local npm three@0.160.0; same imports as the deployed game'

async def ready(page,expression,out,report):
 try:await page.wait_for_function(expression,timeout=120000)
 except Exception:
  (out/'startup-error.json').write_text(json.dumps(report,indent=2))
  await page.screenshot(path=str(out/'startup-error.png'),timeout=15000)
  raise
