# Hero, crew, arrival clock and fund

[Documentation index](README.md) · [Story](story.md)

## Owners

| Feature | Content | Rendering / layout |
| --- | --- | --- |
| Hero mystery | `TRIP_DATA.hero`, `subtitle`, `members` | `index.html`, `main.js:renderCrew`, `style.css` |
| Crew | `TRIP_DATA.members` | `renderCrew`, `#crewGrid`, `.crew-grid` |
| Trip-day forecast | `TRIP_DATA.weather`, arrival day onward | `weather.js`, `weather.css`; [behavior](weather.md) |
| Arrival clock | `TRIP_DATA.countdown` and block `id:"arrival"` | `initArrivalCountdown`, `countdown.css` |
| Fund | `TRIP_DATA.fund` | `renderFund`, `#fund`, `.fund-*`, `motion.js` reveals |

## Seven people, one mystery guest

- Current roster: san, thảo, mi, linh, quanlele, gtm, trường. `members` is authoritative; informal roles are playful copy.
- Hero: “7 +1 đồng bọn, một biển mây.” The real count follows `members.length`; +1 is the shared fund pig, not another traveler.
- Keep “Cuộn xuống để biết” discoverable before the countdown on phones. The circled +1/question mark teases the later reveal.
- Crew shows “Đồng bọn (7 mống)” before the fund introduction. Order is `#itinerary` → `#crew` → `#fund` → `#packing`.
- Optional `members[i].image` enables a portrait; otherwise show initials without missing-image requests. Update hero fallback/footer counts in `index.html` if the roster changes.

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
- Transparent composition: official Lucide piggy-bank, coin doodles, hand-circled amount and pink invitation. Phones stack it; hover/focus tilts only the inner pig, independently of scroll reveal.
- Crew/fund share the morning scene. Do not add a real eighth roster entry, inferred paid status, balance or deadline.
- `itinerary.html` includes the fund text/amount/link, without a crew section. Regenerate after copy changes.

## Verify

Run `verify_countdown.cjs` for timezone/arrival/zero/visibility states; `verify_fund.cjs` for crew → fund → packing order, exact amount/link, layouts, focus and reversible reveals. Fund tests intercept the link locally; they do not submit a contribution. See [verification](verification.md).
