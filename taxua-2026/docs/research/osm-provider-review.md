# Detailed OSM tile comparison · 16 October 2026

[Map guide](../maps.md) · [Provider sources](../sources.md#tile-provider-comparison)

Keep the current OSM France layer for now. OSM Germany is a credible alternative with similar road detail, but this test does not establish a speed advantage. The current service can still have slow individual tiles. Geoapify's `osm-carto` is a relevant next candidate when testing a service with an account: it offers the OSM Carto style through a documented Leaflet-compatible raster endpoint. Its speed has not been measured here.

## Method and results

Local Chromium rendered a 760×520 Leaflet map at the same two views for each layer: Tà Xùa `[21.28, 104.47]` at zoom 12, then the organizer's Khe Cải point at zoom 15. Each view needed 12 tiles. Each provider received a new browser context; the second view reused its connection. Normal browser caching was enabled, with no request routing, cache-busting, tile prefetch or region download. Each view had an 18-second deadline. Screenshots were inspected to distinguish actual map images from errors or access notices.

These are single-session measurements from this environment, not Vietnamese mobile-network timings, sustained reliability measurements or a repeated statistical benchmark. The detail-view column is not a separate cold connection. Time means the layer's final tile success/error event, rather than time until the first tile appears.

| Layer | First overview tile | Complete overview | Complete detail view | Successful tiles |
| --- | ---: | ---: | ---: | ---: |
| OSM France, current `osmfr` | 0.83 s | 1.03 s | 0.22 s | 24/24 |
| OSM Germany | 0.61 s | 1.00 s | 1.20 s | 24/24 |
| Humanitarian / HOT | 0.64 s | 1.04 s | 5.62 s | 24/24 |
| OpenTopoMap | 1.28 s | 2.33 s | 0.85 s | 24/24 |
| CyclOSM | 1.32 s | 1.72 s | 7.31 s | 24/24 |
| OSM Standard | — | Failed | Failed | 0/24 |

OSM Standard requests returned `net::ERR_CONNECTION_REFUSED` here, so no valid speed or visual conclusion is possible. This does not establish a worldwide outage. HOT and CyclOSM use OSM France infrastructure; they are different styles, not independent hosting alternatives. The current CyclOSM host is `a.tile-cyclosm.openstreetmap.fr`, as published by the project's own site. The older `a.tile.openstreetmap.fr/cyclosm` endpoint encountered during discovery failed browser image loading and is excluded from the table.

Visual findings apply to these two viewports:

- **Germany:** comparable minor-road geometry and road references, with stronger yellow/pink road colors and a different label selection. It is the closest tested replacement for the existing detailed road map. Its operator limits bandwidth and third-party usage; it is not an unlimited production CDN.
- **France:** pale background, numbered roads, Vietnamese administrative labels and minor roads suit the illustrated atlas. Other live views in this review still took about 5.8 seconds to finish, demonstrating that the fast table sample does not rule out the user's slow first loads.
- **HOT:** clear minor roads, but different emphasis and fewer road-reference shields in these views. The detail view had a long trailing delay.
- **OpenTopoMap:** useful contours and hill shading, but visually dense underneath the site's illustrated pins. It is better considered an optional terrain view than a speed fix.
- **CyclOSM:** detailed contours and hill shading with cycling emphasis. The detail viewport was the slowest successful sample, so it does not solve this request.

The earlier Mattech/GHN comparison remains separate: those basic styles did not retain the same label richness, and public third-party usage terms were not established. Geoapify and MapTiler require a project API key for site integration. No account was created, demo credential copied into the site or provider switched during this review. Geoapify's public playground was inspected, but no matching Tà Xùa timing was obtained there.

## First-open request fix

`mountMap()` previously attached the tile layer before fitting the selected day and focusing the chosen place. This started requests for intermediate cameras that the visitor never needed. It now attaches the layer after both camera operations, with the same final center, zoom, markers and bounds.

| Real site entry | Requests before | Requests after | Reduction |
| --- | ---: | ---: | ---: |
| Desktop overview, 1440×1000 browser | 20 | 15 | 25% |
| Phone overview, 390×844 browser | 10 | 4 | 60% |
| Khe Cải inline preview, desktop | 18 | 6 | 67% |

Camera logs match before and after. Phone opening no longer requests zoom-12 tiles before settling on zoom 11; Khe Cải no longer requests zooms 12 and 13 before settling on 14. Some desktop intermediate tiles were previously retained by Leaflet's buffer even though the camera had moved. No tiles load before opening the map. Browser HTTP caching and the on-demand local Leaflet loader remain in place.

This reduces unnecessary traffic; it is not a demonstrated wall-clock speedup. Provider latency varied enough that the post-change desktop view took longer in this session despite fewer requests. The local Leaflet loader is small compared with the observed multi-second tile delays, but these measurements do not isolate DNS, TLS, geographic routing or server-render time.

## Validation and evidence

**365 map assertions passed**, including new checks that opening the overview or a preview requests only tiles belonging to its final viewport, across four responsive sizes. Existing wheel/Ctrl+wheel, Vietnam bounds, keyboard/focus, selection, missing-library/tiles/art, print, file mode and large-text checks also passed. JavaScript syntax and whitespace checks passed. Live desktop, phone and Khe Cải views loaded every final tile without uncaught JavaScript errors; desktop and phone rendering were inspected.

Temporary evidence is under `/tmp/taxua-osm-expanded-review/`: `browser-results.json`, provider screenshots, `comparison.jpg`, `site-before.json`, `site-before-preview.json`, `site-after.json` and `checks/checks.json`. `compare.cjs` reproduces the provider viewport comparison; `site-load.cjs` observes real map cameras and tile lifecycle through browser instrumentation without editing production code. `preliminary_routed/` is exploratory output excluded from the table because Playwright request routing disables browser caching.
