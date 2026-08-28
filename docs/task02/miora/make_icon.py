# -*- coding: utf-8 -*-
"""Logo 图标版：裁出印章方框区域，圆角化成 app 图标，并生成暗色反相版与 favicon"""
from PIL import Image, ImageDraw, ImageOps
import os

BASE = os.path.dirname(os.path.abspath(__file__))

src = Image.open(os.path.join(BASE, "logo-seal-v2.png")).convert("RGB")
w, h = src.size  # 1024
# 印章方框区域（按 1024 原图坐标，排除下方文字标）
frame = src.crop((250, 208, 778, 740))
fw, fh = frame.size
side = min(fw, fh)
frame = frame.crop(((fw - side) // 2, (fh - side) // 2, (fw + side) // 2, (fh + side) // 2))

def rounded(im, ratio=0.14):
    s = im.size[0]
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * ratio), fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out

icon = rounded(frame)
icon.save(os.path.join(BASE, "logo-icon.png"))
icon.resize((64, 64), Image.LANCZOS).save(os.path.join(BASE, "favicon-64.png"))
icon.resize((32, 32), Image.LANCZOS).save(os.path.join(BASE, "favicon-32.png"))

# 暗色版：玄色底 + 墨色反相为米白，朱砂保留（反相时保护红色通道主导像素）
import numpy as np
arr = np.array(frame).astype(int)
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
is_red = (r > 120) & (r > g + 40) & (r > b + 40)
lum = (0.2126 * r + 0.7152 * g + 0.0722 * b)
inv = 245 - lum * 0.85  # 墨越深越亮白
dark = np.stack([inv, inv * 0.98, inv * 0.94], axis=-1)
dark[is_red] = arr[is_red]  # 朱砂原样保留
dark_img = Image.fromarray(np.clip(dark, 0, 255).astype("uint8"))
rounded(dark_img).save(os.path.join(BASE, "logo-icon-dark.png"))
print("done", icon.size)
