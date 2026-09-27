"""Small contact sheets of actual rendered evidence; never substitutes for full frames."""

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
parser.add_argument("images", nargs="+", type=Path)
parser.add_argument("--columns", type=int, default=4)
parser.add_argument("--width", type=int, default=380)
args = parser.parse_args()
font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 13)
height = args.width + 34
sheet = Image.new(
    "RGB",
    (args.width * args.columns, height * math.ceil(len(args.images) / args.columns)),
    "#111e27",
)
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(args.images):
    picture = Image.open(path).convert("RGB")
    picture.thumbnail((args.width, args.width))
    x, y = index % args.columns * args.width, index // args.columns * height
    sheet.paste(
        picture,
        (x + (args.width - picture.width) // 2, y + (args.width - picture.height) // 2),
    )
    label = (
        path.stem.replace("final-", "")
        .replace("desktop-", "")
        .replace("landmark-", "")
        .replace("-front", "")
    )
    draw.text((x + 10, y + args.width + 5), label[:48], fill="#d6decf", font=font)
args.output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(args.output, quality=91)
