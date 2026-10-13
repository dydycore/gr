from pathlib import Path
import urllib.request,hashlib
from html.parser import HTMLParser

class DeployedHTML(HTMLParser):
    """Ignore attribute quote style and Netlify's observed pretty-URL rewrite only."""
    def __init__(self, value):
        super().__init__(convert_charrefs=False)
        self.parts=[]
        self.feed(value.replace('\r\n','\n').replace('\r','\n'))
        self.close()
    def handle_starttag(self, tag, attrs):
        pretty={'maquette.html':'/maquette','index.html#projet':'/#projet'}
        attrs=[(k, pretty.get(v,v) if k=='href' else v) for k,v in attrs]
        self.parts.append(('start',tag,tuple(sorted(attrs))))
    def handle_endtag(self, tag): self.parts.append(('end',tag))
    def handle_data(self, value): self.parts.append(('data',value))
    def handle_comment(self, value): self.parts.append(('comment',value))
    def handle_decl(self, value): self.parts.append(('decl',value))
    def handle_entityref(self, value): self.parts.append(('entity',value))
    def handle_charref(self, value): self.parts.append(('char',value))
r=Path.cwd()/'site'
files=['index.html','maquette.html','documents/Grand-Remix-Plan-Technique-V18.pdf']
files += [f'previews/plan-{i}.png' for i in range(1,10)]
files += [f'media/backgrounds/{name}.mp4' for name in ['dream','warm','red_alert','pinky']]
files += [p.relative_to(r).as_posix() for p in (r/'media/fonts').glob('*.woff2')]
for f in files:
    remote=urllib.request.urlopen('https://grand-remix-le-ministere.netlify.app/'+f).read()
    local=(r/f).read_bytes()
    if f.endswith('.html'):
        assert DeployedHTML(remote.decode('utf-8')).parts==DeployedHTML(local.decode('utf-8')).parts, f
    else:
        assert hashlib.sha256(remote).digest()==hashlib.sha256(local).digest(), f
    print(f, 'production conforme')
