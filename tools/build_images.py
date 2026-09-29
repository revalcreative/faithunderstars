"""
Regenerate every site image from the Canva PDF exports.

Usage (from the repo root):
    python3 -m venv .venv && .venv/bin/pip install pymupdf pillow
    .venv/bin/python tools/build_images.py "path/to/Free Guide.pdf" "path/to/Journal.pdf"

Writes WebP covers, the journal's Day 1 sample page, the Open Graph share image, and the
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
# Only covers (plus one journal sample page) are shown on the site; the
# guide's inside pages stay private so the guide itself isn't given away.
GUIDE_PAGES = {
    "guide-cover": (1, 800),
}
JOURNAL_PAGES = {
    "journal-cover": (1, 800),
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


def build_og(journal_cover, guide_cover):
    w, h = 1200, 630
    og = Image.new("RGB", (w, h), NAVY)
    draw = ImageDraw.Draw(og)
    import random
    rnd = random.Random(7)
    for _ in range(160):
        x, y, r = rnd.randint(0, w), rnd.randint(0, h), rnd.choice([1, 1, 1, 1.5, 2])
        if x < 660 and 150 < y < 520:  # keep the headline area clean
            continue
        c = CREAM if rnd.random() > 0.3 else GOLD
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)

    def framed(cover, ch):
        cw = int(cover.width * ch / cover.height)
        frame = Image.new("RGB", (cw + 4, ch + 4), GOLD)
        frame.paste(cover.resize((cw, ch), Image.LANCZOS), (2, 2))
        return frame

    back = framed(guide_cover, 430).rotate(-6, expand=True, fillcolor=NAVY, resample=Image.BICUBIC)
    og.paste(back, (w - back.width - 50, 40))
    front = framed(journal_cover, 480).rotate(3, expand=True, fillcolor=NAVY, resample=Image.BICUBIC)
    og.paste(front, (w - front.width - 230, h - front.height - 20))

    font_paths = ["/System/Library/Fonts/Supplemental/Georgia.ttf", "/Library/Fonts/Georgia.ttf"]
    font_path = next((p for p in font_paths if Path(p).exists()), None)
    big = ImageFont.truetype(font_path, 52) if font_path else ImageFont.load_default()
    small = ImageFont.truetype(font_path, 27) if font_path else ImageFont.load_default()
    tiny = ImageFont.truetype(font_path, 22) if font_path else ImageFont.load_default()
    draw.text((70, 170), "30-DAY JOURNAL + FREE GUIDE", font=tiny, fill=GOLD)
    draw.text((70, 210), "Daily Scripture for", font=big, fill=CREAM)
    draw.text((70, 272), "what's happening", font=big, fill=CREAM)
    draw.text((70, 334), "in the stars", font=big, fill=CREAM)
    draw.text((70, 420), "Every moon phase and zodiac season,", font=small, fill=CREAM)
    draw.text((70, 456), "paired with God's Word.", font=small, fill=CREAM)
    draw.text((70, 520), "@faithunderthestars", font=tiny, fill=GOLD)
    out = IMG / "og-share.jpg"
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
    build_og(render(journal, 1, 800), render(guide, 1, 800))
    build_icons()

    dest = DL / "faith-and-the-stars-guide.pdf"
    shutil.copyfile(guide_pdf, dest)
    print(f"Guide PDF copied to {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
