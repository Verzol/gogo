# Member scarf stickers: direction and reusable prompt

[Documentation index](../README.md) · [Group features](../group.md) · [Identity](../identity.md) · [Scarf research](../sources.md#member-scarf-sticker-research)

Status: all seven generated portraits supplied and integrated, 16 October 2026. Original generation directions are retained below. Import details are in [Group features](../group.md#supplied-scarf-portraits).

## Direction

Create the portraits in Tà Xùa's own watercolor mountain-journal style: semi-realistic hand-painted faces, matte gouache fabric, fine colored-pencil contours and warm ivory cutout outlines. The only image input is the target person's photo. Generate the scarf and illustration treatment from the written brief; no Huế portrait, scarf photo or other style image is needed.

Interpret “scarf instead of the hat” as a **headscarf**. Reference images of H’Mông market visitors in Tà Xùa show woven plaid headscarves with visible folds and short fringes. Use that silhouette as a contemporary travel-sticker adaptation. Thái khăn piêu is a distinct tradition; do not label the proposed mixed-member set as authentic piêu or combine unrelated ceremonial headwear. Research links and access limits are in [Sources](../sources.md#member-scarf-sticker-research).

Keep the face dominant and the scarf compact: head, hair, scarf and a little neckline only. No landscape behind the person, circular badge, hat, body or floating decoration. Keep genuine hair color, age, facial proportions, glasses and identifying features. Fabric can be painterly; faces must remain individually recognizable rather than becoming generic cartoon characters.

## Suggested colors

Use soft golden yellow for thảo, deeper mountain tones for san, quanlele, gtm and trường, and closely coordinated pink plaid for mi and linh. Mi's vivid fuchsia matches the user's supplied scarf photograph; linh's raspberry pink is slightly deeper and redder, with different plaid accents. Keep one main fabric color and one secondary woven stripe per person, except mi and linh's multicolored plaid, plus thin warm-cream `#F3E5C7` stripes throughout. Use the same plaid scale and warm-ivory sticker border across the set. Mi and linh's brighter fabrics are intentional; retain the same watercolor texture as the other portraits.

| Member | Main fabric | Secondary stripe | Runtime filename |
| --- | --- | --- | --- |
| san | Deep indigo `#344866` | Muted ochre `#C99A54` | `san_scarf.webp` |
| thảo | Soft golden yellow `#E4BF68` | Warm ochre `#B88A45` | `thao_scarf.webp` |
| mi | Vivid fuchsia pink `#D92397` | Plum `#743B80`, turquoise blue `#35AFC4`, leaf green `#60814B`, fine golden-cream `#D8AE61` lines | `mi_scarf.webp` |
| linh | Raspberry pink `#C82B80` | Deep violet `#68447E`, soft teal `#479DAB`, fine warm-cream `#F3E5C7` lines | `linh_scarf.webp` |
| quanlele | Forest green `#496B58` | Muted terracotta `#BD8066` | `quanlele_scarf.webp` |
| gtm | Rust brown `#A86F55` | Deep teal `#365F64` | `gtm_scarf.webp` |
| trường | Slate blue `#65859B` | Midnight navy `#303F57` | `truong_scarf.webp` |

## Inputs and generation workflow

1. Attach exactly one clear photo of the target person. A near-frontal face with visible hair and even lighting works best. This is the only image input.
2. Replace `[MAIN COLOR]` and `[SECONDARY COLOR]` below with the member's color names and hex values from the table. For mi or linh, also append the corresponding member-specific direction below to preserve her bright multicolored plaid and pink fringe. The generator creates the scarf and illustration style from text alone. Generate one person per image, not a sheet of seven faces.
3. Check the first sticker's likeness, fabric, framing and outline before generating the rest. Reuse the same written prompt for everyone, changing only the person's photo and scarf colors. Keep the same composition and rendering instructions; no additional style image is required.

### Mi's scarf color direction

These approximate palette values describe the supplied photograph in words, so generation still needs only the person's photo. Append this direction when generating mi:

```text
MI'S SCARF PALETTE
Use vivid fuchsia/hot pink (#D92397) as the dominant fabric, with broad plum-purple (#743B80) bands, narrower turquoise-blue (#35AFC4) and leaf-green (#60814B) crossing stripes, and fine golden-cream (#D8AE61) lines. Form a woven multicolored tartan/plaid with short fuchsia fringe. Keep pink dominant and the colored bands distinct. Preserve this fabric's bright saturation within the watercolor-and-gouache treatment; do not mute it to dusty rose or pastel pink. This scarf palette overrides the general muted accent colors. Keep the face, headscarf framing and warm-ivory sticker border as specified in the main prompt.
```

### Linh's scarf color direction

Append this direction when generating linh; no scarf reference image is needed:

```text
LINH'S SCARF PALETTE
Use rich raspberry pink (#C82B80) as the dominant fabric, with deep violet (#68447E) bands, narrower soft teal (#479DAB) crossing stripes and fine warm-cream (#F3E5C7) lines. Form a woven multicolored tartan/plaid with short raspberry-pink fringe. Keep it close to vivid fuchsia in overall mood, but slightly deeper and redder. Use violet, teal and cream accents rather than leaf-green and golden bands, so the scarf has its own recognizable palette. Preserve the rich pink color within the watercolor-and-gouache treatment; do not mute it to dusty rose or pastel pink. This scarf palette overrides the general muted accent colors. Keep the face, headscarf framing and warm-ivory sticker border as specified in the main prompt.
```

## Copyable generation prompt

```text
Create ONE transparent cutout portrait sticker of the exact person in the uploaded photo, wearing a woven Tây Bắc-inspired headscarf for a Tà Xùa mountain travel journal.

IDENTITY — highest priority
The single uploaded photo is the sole image input and identity reference. Preserve this person's recognizable face: face shape, eyes, eyebrows, nose, lips, skin tone, apparent age, hair color, visible hairstyle, glasses and distinctive features. Keep their natural expression and a near-frontal view consistent with the photo. Do not beautify, change ethnicity, slim the face, enlarge the eyes or replace their features with a generic illustrated face. Generate the headscarf and art treatment from the written directions below.

HEADSCARF
Replace any hat with a soft woven headscarf inspired by plaid scarves seen in H'Mông markets in Tà Xùa, Sơn La, northwestern Vietnam. Fold the fabric over the crown and wrap it loosely around the head, with a compact folded edge above the forehead and short fringed ends resting toward the back or beside the lower hair. Keep the entire face unobstructed and recognizable hair visible beneath the scarf. Use believable fabric folds and a restrained woven plaid: [MAIN COLOR] as the dominant fabric, [SECONDARY COLOR] and warm cream as crossing stripes. Make the weave readable without dense tiny ornament. This is a contemporary travel-sticker interpretation. No conical hat, rigid hat brim, oversized bow, tall turban, elaborate headdress or added ceremonial accessories.

STYLE
A cohesive semi-realistic watercolor-and-gouache illustration in the style of a playful Vietnamese mountain travel journal. Paint both face and fabric in the same medium while preserving accurate facial structure and clear identifying details. Use soft translucent skin washes, matte opaque fabric folds, fine indigo colored-pencil contours, organic brush edges and restrained paper-grain texture inside painted areas only. Give the scarf more visible texture than the face. Soft diffuse daylight, natural skin color and warm cream/peach highlights, with muted indigo, teal and jade accents. Keep the face crisp enough to recognize as a small website sticker. No photographic face pasted onto a painted body, heavy makeup, glossy skin, 3D toy rendering, anime or chibi proportions.

COMPOSITION AND OUTPUT
One centered head-and-scarf cutout on a square 1:1 canvas, preferably 1024 × 1024 or higher native resolution. Include hair and just enough neckline to finish the silhouette; no torso or hands. Keep the eyes approximately level across the set. Let the complete cutout occupy about 84% of the canvas height, with at least 7% transparent padding on every side. Keep the face large enough to recognize at small website sizes. Show every scarf edge and hair tip without clipping.

Add one smooth warm-ivory die-cut border around the entire silhouette, about 12 pixels wide on a 1024-pixel canvas. Outside that border, use genuine alpha transparency. No baked-in cast shadow, rectangular background, checkerboard pattern, circular frame, scenery, clouds, text, name label, logo, watermark, extra person or alternate views. Return a single PNG sticker.
```

If the generator cannot export alpha, request a solid flat background in a color absent from the subject and fabric, then remove it during preparation. Do not accept a visible checkerboard as transparency. Generate the border after extraction if it would otherwise merge into the temporary background. Native dimensions and likeness matter more than a nominal resolution label.

For a neck-scarf alternative, replace the entire HEADSCARF paragraph with: “Keep the person's complete original hairstyle visible. Wrap a soft woven plaid scarf once around the neck below the chin, with two short ends, using [MAIN COLOR], [SECONDARY COLOR] and warm cream. Keep it compact and leave the entire face unobstructed. No hat or head covering.” Keep all other directions unchanged.

## Integration guidance

- Preserve supplied masters under `figures/raw/people/`; retain original bytes and record any rename. Keep the PNG masters there and prepare optimized transparent WebP derivatives under `figures/people/`, using the names above. Never upscale; normalize cutout size and padding without clipping hair or fabric or retouching the face. Record source-to-member mapping and preparation in per-image provenance.
- Set each existing member's optional `image` field in `data.js` to the corresponding WebP. Use explicit member mapping, not the Huế roster's numeric order. Keep the seven-person roster and symbolic pig unchanged.
- In `renderCrew` and `.avatar`, use transparent stickers with `object-fit: contain`, centered above their HTML names. Current sizes are 128px desktop and 104px phone. Member roles are removed; do not add subtitle space below the names.
- Review `.wheel-initial img` as well: the current wheel consumes the same member image field. Fit the complete sticker inside the sector's available space, retain upright labels and keep the name readable. Reuse a larger winner sticker in the existing result area if it fits, without adding a second announcement or covering controls.
- Keep initials as the missing-image fallback. Add only subtle CSS tilt/shadow where useful; preserve reduced-motion and paused states. Do not scatter faces across the background or obscure itinerary text.
- After integration, inspect likeness and consistent scale at desktop/phone widths, alpha edges against morning/night scenes, all image requests, missing-image fallback, wheel alignment and celebration cleanup. Run the existing wheel checks for affected behavior. The integration has been reviewed on desktop, tablet and phones; fresh code changes still need the relevant checks.
