# Diary crop controls review · 28 October 2026

The zoom panel previously clamped into the visible dialog over the selected
photograph. Reset/cancel used a 9px icon caption while done used a larger label.

Framing now reserves space below the lifted photo using the real control height
and preview scale. The editing leaf extends when necessary and returns to its
original dimensions on exit. The three actions share typography and equal touch
targets, with forest ink on done. Entering framing reveals the photo/control
group; scrolling does not move the controls over the photo.

The audit also fixed note/size panels requiring an extra click to switch, stale
expanded states, enlarged-text toolbars blocking photographs, reader selectors
covering icon controls, and enlarged-text header/footer overflow. Two older
navigation/layout fixtures now explicitly select their intended first spread;
remembered login correctly opens on its owner instead.

Current Chromium verification used browser-local accounts/media only:

| Suite | Passed checks |
| --- | ---: |
| Crop UI | 793 |
| Photo editor | 157 |
| Direct page editing | 68 |
| UI refinements | 91 |
| Dark mode | 31 |
| Long-content/responsive layout | 45 |
| Navigation, dragging and touch | 82 |
| Diary interactions | 81 |
| Total | 1,348 |

The crop matrix covers 1–9 photos, first/last frames, a large custom frame among
nine photos, dialog scrolling, button dimensions/fonts, and restored paper
geometry. Viewports: 1440×1050, 737×925, 390×844, 320×568, 844×390 and
390×844 at 200% text. The photo-editor suite also covers the empty page.
Screenshots were inspected at desktop/phone/landscape and enlarged text sizes.
Reports and images are under `/tmp/taxua-diary-*/`; these are local fixtures,
not a live Supabase permission test. Safari/WebKit remains unverified here.
