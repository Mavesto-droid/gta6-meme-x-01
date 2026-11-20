# Build-time composer for the gta6-meme-x-01 entry.
# Renders the meme's caption layers (transparent PNGs) from the caption text
# and composites the final meme from the scene, the captions and the real
# make.fun ghost. The graded program (main.ts) re-does this same composite
# in Node, from the same assets and layout, so the entry is a program that
# produces the meme deterministically -- this script is the build-time half.
#
#   python3 compose.py            -> writes assets/caption-top.png,
#                                    assets/caption-bottom.png and assets/meme.png
#
# Layout (scene is 1920x1280; the judge sees it shrunk to fit 768x480):
TOP_TEXT = "WAITED 13 YEARS FOR GTA 6"
BOTTOM_LINES = ["MY AI AGENT'S ALREADY", "EARNING ON MAKE.FUN"]
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TOP_FONT_SIZE = 112
BOTTOM_FONT_SIZE = 96
TOP_Y = 48
BOTTOM_LINE_HEIGHT = 118
BOTTOM_FIRST_Y = 1032
GHOST_SIZE = 250
GHOST_POS = (1515, 635)

from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")


def meme_text(draw, cx, y, text, font):
    # White bold text with a thick black outline: readable at a glance,
    # and still legible when the judge shrinks the picture to 480 px.
    draw.text((cx, y), text, font=font, fill="white",
              anchor="ma", stroke_width=9, stroke_fill="black")


def render_caption_layer(lines, font_size, first_y, line_height):
    layer = Image.new("RGBA", (1920, 1280), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT_PATH, font_size)
    for i, line in enumerate(lines):
        meme_text(draw, 960, first_y + i * line_height, line, font)
    return layer


def main():
    top = render_caption_layer([TOP_TEXT], TOP_FONT_SIZE, TOP_Y, 0)
    top.save(os.path.join(ASSETS, "caption-top.png"))
    bottom = render_caption_layer(BOTTOM_LINES, BOTTOM_FONT_SIZE,
                                  BOTTOM_FIRST_Y, BOTTOM_LINE_HEIGHT)
    bottom.save(os.path.join(ASSETS, "caption-bottom.png"))

    scene = Image.open(os.path.join(ASSETS, "scene.png")).convert("RGBA")
    ghost = Image.open(os.path.join(ASSETS, "ghost.png")).convert("RGBA")
    ghost = ghost.resize((GHOST_SIZE, GHOST_SIZE), Image.LANCZOS)
    meme = scene.copy()
    meme.alpha_composite(top, (0, 0))
    meme.alpha_composite(bottom, (0, 0))
    meme.alpha_composite(ghost, GHOST_POS)
    meme.convert("RGB").save(os.path.join(ASSETS, "meme.png"),
                             optimize=True)
    print("wrote assets/caption-top.png, assets/caption-bottom.png, "
          "assets/meme.png")


if __name__ == "__main__":
    main()
