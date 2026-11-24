# usage: python sheet.py <dir> <out.jpg> [cols=5] [thumb_w=270]
import sys, os
from PIL import Image, ImageDraw

d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 270
files = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".png")))
th = int(tw * 16 / 9)
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), "#111")
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(os.path.join(d, f)).convert("RGB").resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * th
    sheet.paste(im, (x, y))
    dr.rectangle([x, y, x + 46, y + 16], fill="#000")
    dr.text((x + 3, y + 2), f[1:5], fill="#ff0")
sheet.save(out, quality=88)
print(out, sheet.size)
