# 混元伞 baseColor 贴图分族 mask：伞面（高明度低彩度米白）=255，竹骨（棕/竹青）=0
# 用法：python scripts/cluster-glb-tex.py
# 输出：public/models/youzhisan-mask.png（1024 灰度软 mask）+ shots/mask-preview.png
import struct, io, sys
from PIL import Image

GLB = 'public/models/youzhisan.glb'
MASK_OUT = 'public/models/youzhisan-mask.png'
PREVIEW = 'shots/mask-preview.png'

# ---- 从 GLB 抽 baseColor 贴图（index 0 的 texture → image） ----
buf = open(GLB, 'rb').read()
json_len = struct.unpack_from('<I', buf, 12)[0]
import json
gltf = json.loads(buf[20:20 + json_len])
off = 20 + json_len
bin_chunk = None
while off < len(buf):
    ln, tp = struct.unpack_from('<II', buf, off)
    if buf[off + 4:off + 8].startswith(b'BIN'):
        bin_chunk = buf[off + 8:off + 8 + ln]
    off += 8 + ln

tex = gltf['textures'][0]
# EXT_texture_webp：source 在扩展里
src_idx = tex.get('source', tex.get('extensions', {}).get('EXT_texture_webp', {}).get('source'))
src = gltf['images'][src_idx]
bv = gltf['bufferViews'][src['bufferView']]
img_bytes = bin_chunk[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
im = Image.open(io.BytesIO(img_bytes)).convert('RGB')
W, H = im.size
print('baseColor:', im.size, src.get('mimeType'))

px = im.load()

def srgb_to_oklab(r, g, b):
    r, g, b = r / 255, g / 255, b / 255
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)

# ---- 直方图：L 分布（低彩度像素）----
from collections import Counter
hist = Counter()
for y in range(0, H, 4):
    for x in range(0, W, 4):
        L, a, bb = srgb_to_oklab(*px[x, y])
        C = (a * a + bb * bb) ** 0.5
        hist[(round(L, 2), round(C, 2))] += 1
tops = sorted(hist.items(), key=lambda kv: -kv[1])[:12]
print('top (L,C):', [(k, v) for k, v in tops])

# ---- 分族：伞面 = L >= L_MIN 且 C <= C_MAX；其余 = 竹骨（含竹青）----
L_MIN, C_MAX = 0.72, 0.06
# 软边界：过渡带做平滑
import math
mask = Image.new('L', (W, H))
mp = mask.load()
n_canopy = 0
for y in range(H):
    for x in range(W):
        L, a, bb = srgb_to_oklab(*px[x, y])
        C = (a * a + bb * bb) ** 0.5
        # 分数：L 越高越像伞面，C 越低越像伞面
        sL = min(1.0, max(0.0, (L - (L_MIN - 0.06)) / 0.12))
        sC = min(1.0, max(0.0, ((C_MAX + 0.04) - C) / 0.08))
        v = int(255 * sL * sC)
        mp[x, y] = v
        n_canopy += v > 127
print(f'canopy 覆盖率: {n_canopy / (W * H) * 100:.1f}%')

mask.save(MASK_OUT)
print('written', MASK_OUT)

# 预览：原图与 mask 各半
prev = Image.new('RGB', (W * 2, H))
prev.paste(im, (0, 0))
prev.paste(Image.merge('RGB', (mask, mask, mask)), (W, 0))
prev.thumbnail((1200, 600))
prev.save(PREVIEW)
print('written', PREVIEW)
