# Travel story and supporting content

[Documentation index](README.md) · [External sources](sources.md)

## Owners

| File | Responsibility |
| --- | --- |
| `data.js` | `TRIP_DATA`: dates, days/blocks, place guides, crew, packing, food, destinations and costs |
| `main.js` | `renderDays`, `renderEvent`, `renderPlaceGuide`, `renderPhotoDeck`, `renderSupportingContent`, `renderPacking` |
| `index.html` | Section order, hero fallback copy, navigation and empty render targets |
| `style.css` | Story spacing, alternating layouts, notes, collages and responsive rules |
| `scripts/export_itinerary.cjs` | Generates the standalone `itinerary.html` reading copy |

## Schedule contract

- Trip: 22–25 October 2026, three days/two nights, Mùa Trứ Homestay; 24 chronological events across four date groups.
- Authority: group Sheet `Lịch trình!A1:J33`, snapshotted in `data/sources/schedule.json` on 14 October. See [source links](sources.md).
- Each block keeps its stable `id`, `sourceRow`, original `activity`, `description`, `note`, exact or null `time` (including approved corrections below), `optional`, and costs where present.
- Display-only `storyTitle`, `storyCue`, `storyNote` remove repetition without deleting original details. `phase` controls editorial lighting/icons, never a scheduled time or device-clock theme.
- `stopId` joins place guides/photo mappings; `photoIds` selects assets. Keep IDs aligned with `assets.js`, anchors and verification fixtures.

## Place introductions and layouts

- Phones show a four-day overview derived from `TRIP_DATA.days` before the continuous journal. Each native disclosure lists its original event times/periods and links to stable event IDs; no duplicate schedule source or inferred time is added. All events/guides remain expanded in the journal. Disclosure changes refresh optional motion measurements.

- `placeGuides[stopId]` contains `name`, `paragraphs` and `source` (`label`, `url`) for 18 stops. Each guide appears once with a reading link.
- Research identities/caveats: [Place research](research/places.md). Add sourced Vietnamese summaries; omit unsupported histories, prices, opening hours and weather guarantees.
- Mùa Trứ's introduction appears at check-in, not at early luggage drop (`showPlaceGuide:false`).
- Cây Cô Đơn, Lán Cô Đơn and Mỏm Cá Heo have separate layouts/anchors inside `afternoon-cluster`; do not invent separate visit times.
- Làng Văn Hóa Café is one stop including Núi Đôi and Đồi Công viên Mây.
- The existing date rail opens a day-specific stop index with real times and native event links. Its highlighted stop follows the reading location without saving progress. The Maps sign controls have been removed; existing `mapQuery` fields are retained for a future replacement. See [Illustrated journal controls](ui-artwork.md).
- Secondary photos switch through a clickable, keyboard-accessible preview of the other real photograph, with no visible counter or arrow row; main story photographs turn when clicked or tapped, revealing their scheduled date, editorial cue and real image credit. There is no visible turn label or hint; the photograph is a native keyboard-accessible button. The small arrival photo and homestay room collage stay unchanged. Accessible note buttons unfold logistics; essential road warnings, times, optional flags and costs remain outside folded notes.
- See [Photo backs](journal-objects.md) for click/keyboard behavior and print.
- Keep F01/F02/F03 captions “Ảnh minh họa.” immediately below the matching image, including on phones. [Photo pipeline](assets.md).

## Details easy to lose

- Pickup 21:00, departure 22:00 on 22 October at 68 Mạc Thái Tông, Hà Nội (user correction on 22 October 2026). The 22/10 map centers the matching published address record; see [sources](sources.md). The original Sheet snapshot is retained as historical source data.
- Arrival 03:00 on 23 October is luggage drop/vehicle pickup; check-in is 14:00. Keep exterior/Best view 2/Best view 4 labels (P16/P17/P18).
- Room change is 12:00 on 24 October. Preserve the dinner/stargazing conflict and unconfirmed live music; unrelated Mộc Châu fireworks text stays out of the interactive story.
- Khe Cải starts at 04:30; its later dawn scenery does not add a visit time. Return departs 12:30 on 25 October; arrival in Hanoi is unconfirmed.

## Supporting sections

- Order: crew → fund → packing → destinations → food → practical. [Crew/fund/countdown](group.md).
- Packing pairs seven native checkboxes with illustrated objects; phones use two columns. Checked objects stay in place for review/undo. It persists checked item indices under `taxua-2026-packing`, validates saved data and tolerates denied storage. Reordering items changes the meaning of existing indices.
- Destination links have an explicit target list in `renderSupportingContent`; update it with the corresponding data/order.
- Practical facts include hardcoded transport/room reminders in `main.js`; synchronize those when the schedule changes. Costs come from `itinerary.costs` and remain estimates for seven people.

## After editing

From `taxua-2026/`: `node scripts/export_itinerary.cjs`. The reading copy includes original schedule details, fund, guides and packing; it has no crew section or live countdown.

Run `verify_story.cjs` for guides/pacing, `verify_journey.cjs` for schedule/controls, and relevant [motion checks](verification.md) when layout changes. Update fixed source/count fixtures only when the source actually changes.
