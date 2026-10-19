from pathlib import Path
import re
base=Path(__file__).resolve().parent.parent
lib=(base/'work/three.min.js').read_text(encoding='utf-8')
main=(base/'work/courtyard-v2.js').read_text(encoding='utf-8')
detail=(base/'work/courtyard-v2-detail.js').read_text(encoding='utf-8')
reflect=(base/'work/Reflector.js').read_text(encoding='utf-8')
reflect=re.sub(r"import\s*\{(.*?)\}\s*from 'three';",r'const {\1} = THREE;',reflect,flags=re.S)
reflect=reflect.replace('export { Reflector };','')
reflect=reflect.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor = vec4( base.rgb * vec3(0.72,0.85,1.0), 0.27 );')
main=reflect+'\n'+main+'\n'+detail
html='''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>听雨小院 · 雨夜微缩景观</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#172332}#world{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 45%,#304352,#14232f 80%)}canvas{display:block;outline:0;touch-action:none;cursor:grab}canvas:active{cursor:grabbing}</style></head>
<body><main id="world"></main><script>'''+lib+'''</script><script>'''+main+'''</script></body></html>'''
(base/'outputs/tingyu-courtyard.html').write_text(html,encoding='utf-8')
print('Built self-contained courtyard:',len(html),'characters')
