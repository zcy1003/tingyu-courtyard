from pathlib import Path
import shutil
import json

workspace=Path(__file__).resolve().parent.parent
project=workspace/'outputs'/'tingyu-courtyard-project'
for folder in ['src','vendor/three','scripts','assets','archive/original-work','archive/original-outputs']:
    (project/folder).mkdir(parents=True,exist_ok=True)
copies={
    'work/courtyard-v2.js':'src/courtyard.js',
    'work/courtyard-v2-detail.js':'src/courtyard-detail.js',
    'work/three.min.js':'vendor/three/three.min.js',
    'work/Reflector.js':'vendor/three/Reflector.js',
    'outputs/tingyu-courtyard-preview.png':'assets/preview.png',
}
for source,target in copies.items():
    shutil.copy2(workspace/source,project/target)
for source in (workspace/'work').iterdir():
    if source.is_file():shutil.copy2(source,project/'archive/original-work'/source.name)
for source in (workspace/'outputs').iterdir():
    if source.is_file():shutil.copy2(source,project/'archive/original-outputs'/source.name)
print('Project files staged at',project)
