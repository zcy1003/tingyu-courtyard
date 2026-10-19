"""Build the self-contained page using Python 3 standard library only."""
from pathlib import Path
import argparse
import re

ROOT=Path(__file__).resolve().parent.parent

def render():
    library=(ROOT/'vendor/three/three.min.js').read_text(encoding='utf-8')
    reflector=(ROOT/'vendor/three/Reflector.js').read_text(encoding='utf-8')
    reflector,count=re.subn(r"import\s*\{(.*?)\}\s*from 'three';",r'const {\1} = THREE;',reflector,flags=re.S)
    if count!=1:raise ValueError('Expected exactly one Three.js import in Reflector.js')
    reflector=reflector.replace('export { Reflector };','')
    original='gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );'
    if original not in reflector:raise ValueError('Reflector shader source has changed')
    reflector=reflector.replace(original,'gl_FragColor = vec4( base.rgb * vec3(0.72,0.85,1.0), 0.27 );')
    source=reflector+'\n'+(ROOT/'src/courtyard.js').read_text(encoding='utf-8')+'\n'+(ROOT/'src/courtyard-detail.js').read_text(encoding='utf-8')
    template=(ROOT/'src/template.html').read_text(encoding='utf-8')
    for token in ['/*__THREE__*/','/*__SCENE__*/']:
        if template.count(token)!=1:raise ValueError('Missing or repeated template token: '+token)
    return template.replace('/*__THREE__*/',library).replace('/*__SCENE__*/',source)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Check that index.html matches the sources')
    args=parser.parse_args()
    result=render()
    target=ROOT/'index.html'
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8')!=result:
            parser.exit(1,'index.html is out of date. Run python scripts/build.py\n')
        print('OK: index.html matches all current source files')
    else:
        target.write_text(result,encoding='utf-8',newline='\n')
        print('Built index.html:',len(result.encode('utf-8')),'bytes')

if __name__=='__main__':main()
