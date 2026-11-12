"""The kit palette. Use these names so every model shares one colour family.

Tint parts are painted near white (WHITE / SHADE_*), because the web app multiplies them by a
per-instance colour; everything else uses the named colours below.
"""

# Tint-part greys: the instance colour shows through at this brightness.
WHITE = "#ffffff"
SHADE_1 = "#ececec"  # a soft second tone on a tinted body
SHADE_2 = "#d2d2d2"  # trim and recesses on a tinted body
SHADE_3 = "#a8a8a8"  # dark accents on a tinted body

# Neutrals
CREAM = "#f2e9d8"
PLASTER = "#e9dfcc"
SAND = "#d9c7a3"
STONE = "#a7a39a"
STONE_DARK = "#7f7b74"
CONCRETE = "#b9b7b0"
CONCRETE_DARK = "#8d8f94"
SLATE = "#5b6672"
ASPHALT = "#3f444c"
CHARCOAL = "#33383f"
INK = "#1f242b"
OFF_WHITE = "#f6f4ee"

# Earth and masonry
CLAY = "#b9856a"
TERRACOTTA = "#b9583f"
BRICK = "#9c4a3a"
RUST = "#8a4b32"
ADOBE = "#c9a27a"
THATCH = "#c9a85c"
STRAW = "#e0c36a"

# Wood
BIRCH = "#e9e4d6"
PINE_WOOD = "#c79a66"
OAK_WOOD = "#a9794f"
WALNUT = "#6b4a32"
BARK = "#5d4332"
BARK_DARK = "#43301f"

# Vegetation (also the usual per-instance tints for foliage)
LEAF = "#5fa04a"
LEAF_DEEP = "#2f6b3a"
PINE = "#2a5f36"
MOSS = "#6f8f45"
LIME = "#9ccb5a"
SAGE = "#8fae7a"
OLIVE = "#8a8a4a"

# Water, sky, glass
SEA = "#2f78b5"
NAVY = "#27405e"
TEAL = "#2fa39a"
SKY = "#8fc7e8"
ICE = "#dcecf4"
GLASS = "#9fcbe0"
GLASS_DARK = "#2b3d4f"
GLASS_TINTED = "#4f7f9a"

# Accents
RED = "#d0493a"
ORANGE = "#e08a2e"
AMBER = "#f2b23a"
YELLOW = "#f2c230"
PINK = "#f0a8c8"
MAGENTA = "#d35fc4"
VIOLET = "#8a62e0"
BLUE = "#3d6fb5"
GREEN = "#2e9e6e"

# Metal (use with part "metal" where it should gleam, "base" where it is painted)
STEEL = "#aab2bb"
STEEL_DARK = "#6f7780"
GUNMETAL = "#4a4f58"
BRASS = "#c9a25a"
COPPER = "#b87352"
GOLD = "#e0b84a"
CHROME = "#dfe5ea"

# Light (part "glow" or "lit")
WINDOW = "#ffd98a"
LAMP = "#ffe7b0"
GLOW_RED = "#ff4a3d"
GLOW_ORANGE = "#ffb357"
GLOW_CYAN = "#7df0ff"
GLOW_GREEN = "#8cffb0"
GLOW_MAGENTA = "#ff8ae0"
GLOW_BLUE = "#6fb7ff"
GLOW_WHITE = "#fff6dc"

# Skin and hair
SKINS = ("#f0c8a2", "#c98e5c", "#8a5634", "#e3b089")
HAIRS = ("#2b2018", "#5a3a22", "#1a1a1a", "#b88a4a", "#8a8a8a", "#a8432a")
