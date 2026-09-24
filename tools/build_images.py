"""
Regenerate every site image from the Canva PDF exports.

Usage (from the repo root):
    python3 -m venv .venv && .venv/bin/pip install pymupdf pillow
    .venv/bin/python tools/build_images.py "path/to/Free Guide.pdf" "path/to/Journal.pdf"

Writes WebP covers and page previews, the Open Graph share image, and the
favicon PNGs into assets/img/, and copies the guide PDF into
assets/downloads/ (the free guide is public; the paid journal PDF is never
copied into the site).

If a page moves in a future Canva export, update the page numbers below
(1-based, same as the page numbers in your PDF viewer).
"""

import shutil
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
DL = ROOT / "assets" / "downloads"

NAVY = (15, 26, 51)
GOLD = (201, 162, 77)
CREAM = (246, 240, 228)

# name -> (page number, output width in px)
GUIDE_PAGES = {
    "guide-cover": (1, 800),
    "guide-big-three": (5, 640),
    "guide-signs": (6, 640),
    "guide-planets": (12, 640),
    "guide-moon": (13, 640),
}
JOURNAL_PAGES = {
    "journal-cover": (1, 800),
    "journal-how-to": (2, 640),
    "journal-my-cycle": (3, 640),
    "journal-moon-signs": (4, 640),
    "journal-day-1": (6, 1100),
}


def render(doc, page_no, width):
    page = doc[page_no - 1]
    zoom = width / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def save_webp(img, name):
    out = IMG / f"{name}.webp"
    img.save(out, "WEBP", quality=82, method=6)
    print(f"  {out.relative_to(ROOT)}  {img.width}x{img.height}  {out.stat().st_size // 1024} KB")


def star_points(cx, cy, r_outer, r_inner, n=5):
    import math
    pts = []
    for i in range(n * 2):
        r = r_outer if i % 2 == 0 else r_inner
        a = -math.pi / 2 + i * math.pi / n
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def build_icons():
    for size, name in [(180, "apple-touch-icon.png"), (512, "icon-512.png"), (32, "favicon-32.png")]:
        s = size * 4
        im = Image.new("RGB", (s, s), NAVY)
        ImageDraw.Draw(im).polygon(star_points(s / 2, s / 2 + s * 0.03, s * 0.36, s * 0.15), fill=GOLD)
        im = im.resize((size, size), Image.LANCZOS)
        im.save(IMG / name)
        print(f"  assets/img/{name}")


def build_og(cover):
    w, h = 1200, 630
    og = Image.new("RGB", (w, h), NAVY)
    draw = ImageDraw.Draw(og)
    import random
    rnd = random.Random(7)
    for _ in range(160):
        x, y, r = rnd.randint(0, w), rnd.randint(0, h), rnd.choice([1, 1, 1, 1.5, 2])
        if x < 660 and 180 < y < 500:  # keep the headline area clean
            continue
        c = CREAM if rnd.random() > 0.3 else GOLD
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
    ch = 540
    cw = int(cover.width * ch / cover.height)
    c = cover.resize((cw, ch), Image.LANCZOS)
    # thin gold keyline around the cover so it separates from the navy background
    frame = Image.new("RGB", (cw + 4, ch + 4), GOLD)
    frame.paste(c, (2, 2))
    og.paste(frame, (w - cw - 90, (h - ch) // 2))
    font_paths = ["/System/Library/Fonts/Supplemental/Georgia.ttf", "/Library/Fonts/Georgia.ttf"]
    font_path = next((p for p in font_paths if Path(p).exists()), None)
    big = ImageFont.truetype(font_path, 58) if font_path else ImageFont.load_default()
    small = ImageFont.truetype(font_path, 28) if font_path else ImageFont.load_default()
    tiny = ImageFont.truetype(font_path, 22) if font_path else ImageFont.load_default()
    draw.text((80, 200), "FREE GUIDE", font=tiny, fill=GOLD)
    draw.text((80, 240), "Faith & the Stars", font=big, fill=CREAM)
    draw.text((80, 330), "Your Big Three, all 12 signs, and", font=small, fill=CREAM)
    draw.text((80, 370), "every moon phase, paired with Scripture.", font=small, fill=CREAM)
    draw.text((80, 450), "@faithunderthestars", font=tiny, fill=GOLD)
    out = IMG / "og-guide.jpg"
    og.save(out, "JPEG", quality=86, optimize=True)
    print(f"  {out.relative_to(ROOT)}")


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    guide_pdf, journal_pdf = Path(sys.argv[1]), Path(sys.argv[2])
    IMG.mkdir(parents=True, exist_ok=True)
    DL.mkdir(parents=True, exist_ok=True)

    guide = pymupdf.open(guide_pdf)
    journal = pymupdf.open(journal_pdf)
    print("Page images:")
    for name, (page_no, width) in GUIDE_PAGES.items():
        save_webp(render(guide, page_no, width), name)
    for name, (page_no, width) in JOURNAL_PAGES.items():
        save_webp(render(journal, page_no, width), name)

    print("Share image and icons:")
    build_og(render(guide, 1, 800))
    build_icons()

    dest = DL / "faith-and-the-stars-guide.pdf"
    shutil.copyfile(guide_pdf, dest)
    print(f"Guide PDF copied to {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
