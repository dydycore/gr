from pathlib import Path
import urllib.request,hashlib
r=Path.cwd()/'site'
for f in ['index.html','maquette.html','documents/Grand-Remix-Plan-Technique-V18.pdf','previews/plan-8.png','previews/plan-9.png','previews/plan-10.png']:
    remote=urllib.request.urlopen('https://grand-remix-le-ministere.netlify.app/'+f).read()
    assert hashlib.sha256(remote).digest()==hashlib.sha256((r/f).read_bytes()).digest()
    print(f, 'production conforme')
