"""Extract the supplied Omra GLB's color, normal XY and roughness to 2K maps."""
from io import BytesIO
from pathlib import Path
from PIL import Image
import hashlib
import json
import struct
import sys

repo = Path(__file__).resolve().parents[3]
variant = sys.argv[1] if len(sys.argv) > 1 else 'normal'
sources = {'normal': 'fantasy-character-3d-model.glb',
           'corrupted': 'undead-female-warrior-3d-model.glb'}
if variant not in sources:
    raise ValueError(f'Unknown Omra variant: {variant}')
source = repo / 'game/art-src/merchant' / sources[variant]
target = repo / 'game/gameplay/content/creatures/omra'
target.mkdir(parents=True, exist_ok=True)
raw = source.read_bytes()
assert raw[:4] == b'glTF' and struct.unpack_from('<I', raw, 4)[0] == 2
offset = 12
model = binary = None
while offset < len(raw):
    length, kind = struct.unpack_from('<II', raw, offset)
    data = raw[offset + 8:offset + 8 + length]
    if kind == 0x4e4f534a:
        model = json.loads(data)
    elif kind == 0x004e4942:
        binary = data
    offset += length + 8
assert model and binary and len(model['meshes']) == 1 and len(model['images']) == 3

def image(index):
    item = model['images'][index]
    view = model['bufferViews'][item['bufferView']]
    start = view.get('byteOffset', 0)
    return Image.open(BytesIO(binary[start:start + view['byteLength']])).convert('RGB')

color = image(0)
normal = image(2)
rough_metal = image(1)
assert color.size == (8192, 8192) and normal.size == rough_metal.size == (4096, 4096)
resample = Image.Resampling.LANCZOS
base = 'body' if variant == 'normal' else 'corrupted'
color.resize((2048, 2048), resample).save(target / f'{base}.jpg', quality=94, subsampling=0)
normal = normal.resize((2048, 2048), resample)
rough_metal = rough_metal.resize((2048, 2048), resample)
nar = Image.merge('RGB', (normal.getchannel('R'), normal.getchannel('G'), rough_metal.getchannel('G')))
nar.save(target / f'{base}.nar.jpg', quality=94, subsampling=0)
print(json.dumps({'source_sha256': hashlib.sha256(raw).hexdigest(), 'color_size': color.size,
                  'runtime_size': [2048, 2048], 'outputs': [f'{base}.jpg', f'{base}.nar.jpg']}))
