"""Make one shared 2K color atlas and neutral NAR for act-one static models."""
from io import BytesIO
from pathlib import Path
from PIL import Image
import json,struct,hashlib
repo=Path(__file__).resolve().parents[3]
source=repo/'game/art-src/tazeem/tripo-4096-mapping-test.glb'
target=repo/'game/gameplay/content/creatures/tazeem/runtime'
target.mkdir(parents=True,exist_ok=True)
raw=source.read_bytes()
assert raw[:4]==b'glTF' and struct.unpack_from('<I',raw,4)[0]==2
off=12;model=None;binary=None
while off<len(raw):
    n,kind=struct.unpack_from('<II',raw,off)
    data=raw[off+8:off+8+n]
    if kind==0x4e4f534a:model=json.loads(data)
    if kind==0x004e4942:binary=data
    off+=8+n
assert model and binary and len(model['images'])==1
view=model['bufferViews'][model['images'][0]['bufferView']]
image=Image.open(BytesIO(binary[view['byteOffset']:view['byteOffset']+view['byteLength']])).convert('RGB')
assert image.size==(4096,4096)
image.resize((2048,2048),Image.Resampling.LANCZOS).save(target/'shared.jpg',format='JPEG',quality=93,subsampling=0)
# SurfaceBatch decodes NAR channels as normal X/Y plus roughness. The original
# unlit atlas carries the visible geometric color; room probes remain active.
Image.new('RGB',(2048,2048),(128,128,215)).save(target/'shared.nar.jpg',format='JPEG',quality=94,subsampling=0)
print(json.dumps({'albedo':str(target/'shared.jpg'),'nar':str(target/'shared.nar.jpg'),'source_sha256':hashlib.sha256(raw).hexdigest(),'source_side':4096,'runtime_side':2048}))
