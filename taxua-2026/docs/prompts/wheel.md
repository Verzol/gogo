# Vòng quay trên mây artwork

[Documentation index](../README.md) · [Group feature and preparation](../group.md#vòng-quay-trên-mây)

The supplied “Watercolor Landscape Asset Sheet.png” is retained without pixel changes as [wheel_component_sheet.png](../../figures/raw/illustrated_scenery/wheel_component_sheet.png). Actual native size: 1254 × 1254. [Provenance and measured crops](../../data/sources/wheel-art.json) map the three independent components; the generated positions differ from an ideal square grid. Never upscale to the requested generation dimensions.

The rotor's rim, fixed pointer and stationary hub must remain separate. Sector geometry, names and interactive text are rendered in code. Reference the [gogo logo](../../figures/raw/gogo_mountain_sunrise.png) and [painted coffee sticker](../../figures/decor/painted/cloud_coffee_sticker.webp) when generating replacements.

## Generation prompt

```text
Create a production-ready illustration asset sheet for “Vòng quay trên mây,” an interactive member-selection wheel in a Vietnamese mountain travel journal set in Tà Xùa.

OUTPUT
One square PNG with genuine alpha transparency, preferably 3072 × 3072 at native resolution. Arrange exactly THREE isolated components in a 2 × 2 grid. Leave the bottom-right cell completely empty. No visible grid, labels, background, or interface mockup. Keep generous transparent gutters and every component fully inside its cell.

ART DIRECTION
Hand-painted gouache and watercolor with fine colored-pencil contours, subtle paper-grain texture inside the painted shapes, organic pigment variation, crisp readable silhouettes, and restrained travel-journal charm.

Match an illustrated landscape of teal mountains, jade meadows, cream clouds, and warm sunrise accents. Tactile and playful, with enough simplicity to remain clear at small website sizes.

Palette: midnight indigo #101D35, deep teal #173E48, slate blue #386B80, jade #527E64, moss #789566, warm cream #F3E5C7, sunrise orange #EEA15A, soft peach #E8B299.

TOP LEFT — ROTATING WHEEL RIM
A perfectly circular annular frame, viewed straight-on with absolutely no perspective or tilt. Center it precisely in its cell. Its outer diameter occupies approximately 82% of the cell width.

The central hole is fully transparent, approximately 78% of the outer diameter. Paint only the ring. Use a narrow deep-teal outer contour, a warm cream inner edge, delicate uneven watercolor washes, and small abstract mountain-ridge and cloud-curl motifs confined to the ring. Distribute ornament evenly around the circumference so the rim remains visually balanced while rotating.

Keep both circular boundaries geometrically round; express the handmade quality through pigment and line texture. Do not draw a wheel face, sectors, spokes, names, numbers, central hub, pointer, stand, or anything inside the transparent hole.

TOP RIGHT — FIXED POINTER
One compact peach-orange trail pennant shaped as a downward-pointing marker. Its sharp tip points exactly toward six o’clock. Give it an indigo pencil contour, a small cream folded-paper highlight, and subtle gouache texture. Make the tip unmistakable and the silhouette clear at small website sizes. No lettering, pole, wheel, cloud obstruction, or cast shadow.

BOTTOM LEFT — CENTER MEDALLION
One perfectly circular warm-cream medallion viewed straight-on. Use a thin indigo contour and a subtle peach watercolor accent close to its edge. Keep the middle quiet, opaque, pale, and completely blank: a real HTML button label will be placed here later. It must remain clear when displayed at approximately 80 pixels wide. No text, initials, icon, hole, rays, or attached decorations.

PRODUCTION CONSTRAINTS
All three objects are independent, separated, and fully visible. Transparent exterior backgrounds and gutters. The rim’s interior must also be transparent; the medallion’s interior must be opaque.

No baked-in shadows or directional lighting. No checkerboard transparency pattern, white background, rectangular paper sheet, typography, watermark, photography, glossy plastic, metallic casino styling, neon, 3D extrusion, excessive ornament, or blurred edges.
```
