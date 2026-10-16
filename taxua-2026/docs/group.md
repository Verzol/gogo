# Hero, crew, arrival clock and fund

[Documentation index](README.md) · [Story](story.md)

## Owners

| Feature | Content | Rendering / layout |
| --- | --- | --- |
| Hero mystery | `TRIP_DATA.hero`, `subtitle`, `members` | `index.html`, `main.js:renderCrew`, `style.css` |
| Crew | `TRIP_DATA.members`, `TRIP_DATA.crewOrder` | `renderCrew`, `#crewGrid`, `.crew-grid` |
| Random-game collection | `TRIP_DATA.games` | `games.js`, `games.css`, `#tripGames`; [rules and lifecycle](games.md) |
| Member wheel | `TRIP_DATA.members`, `TRIP_DATA.wheel` | `initCloudWheel`, `#cloudWheel`, `.wheel-*`; `motion.js` outer reveals |
| Trip-day forecast | `TRIP_DATA.weather`, arrival day onward | `weather.js`, `weather.css`; [behavior](weather.md) |
| Arrival clock | `TRIP_DATA.countdown` and block `id:"arrival"` | `initArrivalCountdown`, `countdown.css` |
| Fund | `TRIP_DATA.fund` | `renderFund`, `#fund`, `.fund-*`, `motion.js` reveals |

## Seven people, one mystery guest

- Current roster: san, thảo, mi, linh, quanlele, gtm, trường. `members` is authoritative and contains names and portrait paths; member roles are removed.
- `crewOrder` controls only the displayed crew: mi, san, thảo, quanlele, gtm, trường, linh. Mi and linh sit at opposite ends to separate their pink scarves. The wheel retains `members` order; any members omitted from `crewOrder` appear afterward in roster order.
- Hero: “7 +1 đồng bọn, một biển mây.” The real count follows `members.length`; +1 is the shared fund pig, not another traveler.
- Keep “Cuộn xuống để biết” discoverable before the countdown on phones. The circled +1/question mark teases the later reveal.
- Crew shows “Đồng bọn (7 mống)” before the fund introduction. Order is `#itinerary` → `#crew` → `#fund` → `#packing`.
- Each `members[i].image` now points to its supplied scarf portrait; omitted or failed images show initials. Update hero fallback/footer counts in `index.html` if the roster changes.

## Supplied scarf portraits

Seven supplied PNGs are retained byte-for-byte under `figures/raw/people/`: `san`, `thao`, `mi`, `linh`, `quanlele`, `gtm` and `truong`. Explicit member mapping preserves the existing Vietnamese names, roster order and symbolic pig.

`python3 scripts/prepare_people_artwork.py` (Pillow) trims transparent margins, clears very low-alpha dust and downsizes each complete cutout into a transparent 512×512 canvas with at least 20px padding. It does not upscale, recolor or retouch faces. WebPs under `figures/people/` total **418,302 bytes**. [Provenance](../data/sources/people-artwork.json) records uploaded names, original hashes, trims, painted dimensions, member mapping and derivative hashes; the importer refuses original replacement.

Crew portraits use `object-fit:contain` at 128px on desktop and 104px on phones. Each transparent composition centers the complete scarf sticker above its handwritten HTML name, with no role text or empty subtitle space. The grid uses four columns on desktop, three below 1200px and two below 1024px, retaining the alternating journal offsets. Wheel sectors reuse the same files at 44px desktop and 34px phone with upright names. Missing images remove the portrait styling and reveal initials. Crew artwork is decorative because the adjacent heading supplies the name. Portraits add no animation, duplicate roster entries or new announcements. [Generation brief](prompts/people.md).

The import passed **99 existing wheel checks**, including all seven sector/result matches, repeat rules, animated/reduced-motion behavior, responsive layouts and celebration cleanup. Additional browser inspection covered crew/wheel portraits at 1440px, 820px, 390px and 320px, every map-art request, and forced portrait-load failure restoring all seven crew/wheel initials. All 15 new master hashes matched the supplied files; both artwork importers reproduce identical manifests and derivatives. Existing trip data differs only in the seven member image fields; the generated reading copy is unchanged. Evidence: `/tmp/taxua-new-stickers-review/`.

## Vòng quay trên mây

- The default game in **Túi may mắn**, below the roster **inside `#crew`**, keeping crew → fund → packing and the morning/jade world. Seven real travelers participate; the fund pig is not a candidate.
- Existing `#cloudWheel` navigation opens the wheel even after switching to another game. Pending spins settle before hiding, and transient celebrations clear; settings and round state persist. [Collection behavior](games.md).
- `TRIP_DATA.members` supplies names, optional portraits and segment count; `TRIP_DATA.wheel` supplies Vietnamese copy. Initials work without portrait files. HTML participant checkboxes also provide the accessible names; decorative wheel labels are hidden from screen readers.
- Each checked, eligible person has the same chance. `crypto.getRandomValues` with rejection sampling chooses a member, then a landing point safely inside that member's equal SVG sector; `Math.random` is the fallback. No ten-person cap or fixed ten-sector gradient.
- Everyone is included initially; repeat picks are allowed by default. **Không lặp trong lượt** removes each winner from the eligible pool until **Bắt đầu lại**. Changing repeat mode clears the used pool. Participant selections survive a round reset; all state is page-local and resets on reload. Unavailable people remain visible with muted/crossed-out labels.
- A full round keeps its final winner visible and offers restart; selecting nobody explains how to recover. Changes/reset are locked while spinning. `aria-disabled` keeps keyboard focus on the spin button; the event handler prevents additional spins. Results use a polite, atomic live region.
- Confirmed winners show their name beside a complete scarf sticker (128px desktop, 88px phone) in the persistent result. Both come from the same member record. A new spin or reset removes the old sticker; round completion retains it. Missing or failed portraits fall back to the name. The sticker has empty alt text and is decorative, preserving one spoken winner announcement.
- A native 4.6-second transform transition spins only the rotor; matching inverse rotations keep labels upright. `transitionend` completes the result, with a 4.9-second recovery timer. Reduced motion and the decorative-motion pause settle immediately, including when enabled during a spin.
- `createWheelCelebration` runs only after that confirmed landing. A local peach/gold bloom, cream/jade/orange paper pieces and stars, and existing painted clouds animate for roughly three seconds; the winner's handwritten circle also appears. The background layer lives inside `#scenery` but outside `#sceneLayers`, above painted terrain and below foreground content, so it cannot be copied into navigation snapshots or change weather/chapter state.
- Desktop uses 32 paper/star particles and three clouds; phones use 18 particles and two clouds. The particle/cloud transforms and opacity use Web Animations, without GSAP or another library. Timers cancel animations and remove particles after 3.6 seconds. New spins, reset, leaving the wheel, resize, hidden tabs and pagehide clear all transient effects. Turning on pause/reduced motion clears any active decoration.
- Phones place a collapsed participant/settings disclosure before the smaller dial and the persistent result directly after it. Its summary reports the selected count. Desktop opens settings beside the dial; short landscape uses two columns with collapsible settings. Native `details` toggles refresh layout/reveal measurements without altering selections or round state.
- On phones a cream cloud-shaped banner below navigation briefly repeats **Mây gọi tên: [name]!** only when the actual winner name is outside the usable viewport. It is decorative/`aria-hidden` because the existing result live region announces the winner. Reduced motion, pause or unavailable Web Animations retain a static fallback banner when needed, without particles. Print hides both layers. Neither layer intercepts clicks or changes scrolling/focus.
- The phone banner includes the same winner's sticker at 64px, with a text-only fallback if it fails. Cleanup removes its transient image and name; the persistent result remains. Sticker entrance motion uses the existing celebration lifecycle and respects pause/reduced motion.
- `.wheel-settings`, `.wheel-stage` and `.wheel-notes` own scroll reveals, independently of rotor transforms. A circular clipping wrapper contains rotated bounds on phones. Print omits this interactive feature; the standalone itinerary stays unchanged. No backend, storage, GSAP or HTTP dependency.
- Artwork: supplied sheet renamed without changing bytes to `figures/raw/illustrated_scenery/wheel_component_sheet.png`. Runtime rim/pointer/hub WebPs and retained PNGs live in `figures/decor/painted/`. Measured crops, source filename, dimensions and hash are in `data/sources/wheel-art.json`.
- Re-extract using `python3 scripts/prepare_wheel_art.py` (Pillow, NumPy, SciPy). It retains the largest connected alpha component, centers transparent padding, and never upscales. New uploads cannot overwrite an existing original. [Generation brief](prompts/wheel.md).

Run `node scripts/verify_wheel.cjs` for selection/round rules, pointer agreement, keyboard focus, animation/resize, celebration timing/movement/cleanup, phone layouts, print and failure modes. Evidence defaults to `/tmp/taxua-wheel-review`; override with `TRIP_REVIEW_DIR`.

## Arrival countdown

- Derive the target from the `arrival` block's `time` and containing day's `dateISO`, with explicit `+07:00`; currently **2026-10-23T03:00:00+07:00**.
- Departure and editorial `phase` must never drive the clock. Invalid/missing arrival data leaves the clock hidden.
- Recompute from `Date.now()` every second; pause in hidden tabs and refresh on return/pageshow. Clamp at zero and show the scheduled-arrival message, without claiming actual attendance.
- The forecast and smaller clock share the hero summary grid column; phones stack copy, forecast and clock in natural flow. Reserve hero space to prevent layout shift. Number changes respect reduced motion; the timer uses `aria-live="off"` instead of announcing every second.
- Changing arrival also requires updating fixed target fixtures in `scripts/verify_countdown.cjs` and regenerating the reading copy.

## Eighth member: the pig fund

- Title: **“Thành viên thứ 8: Heo đất!”** Intro: **“Heo đất cũng đi Tà Xùa.”** Pig annotation repeats the eighth-member idea.
- Per-person contribution: **2.400.000 ₫** (`amountPerPerson:2400000`), paid by the seven real travelers.
- Exact destination: [MoMo group fund](https://quy.momo.vn/v2/YTavDjFUV4?cover=6749). Keep the query string; the button opens a new tab with `noopener noreferrer`.
- Transparent composition: a watercolor piggy-bank sticker with a teal scarf and one painted coin, handwritten annotation, hand-circled amount and pink invitation. The sticker is 220px on desktop and 180px on phones; phones stack the composition. Hover/focus tilts only the inner pig, independently of scroll reveal, with reduced motion respected.
- The decorative 512px transparent WebP lives at `figures/decor/painted/pig_fund.webp` (76,642 bytes). Failed loading restores the official Lucide piggy-bank in the same reserved space. The original PNG is preserved under `figures/raw/fund/`; see the [generation brief](prompts/pig_fund.md) and [provenance](../data/sources/pig-fund-artwork.json).
- Crew/fund share the morning scene. Do not add a real eighth roster entry, inferred paid status, balance or deadline.
- `itinerary.html` includes the fund text/amount/link, without a crew section. Regenerate after copy changes.

## Verify

Run `verify_countdown.cjs` for timezone/arrival/zero/visibility states; `verify_fund.cjs` for crew → fund → packing order, loaded pig artwork, exact amount/link, layouts, focus and reversible reveals. Fund tests intercept the link locally; they do not submit a contribution. Set `TRIP_REVIEW_DIR` to write fund evidence outside the checkout. See [verification](verification.md).
