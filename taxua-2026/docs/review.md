# Recorded review evidence

[Documentation index](README.md) · [How to rerun checks](verification.md)

These are **historical artifacts**, not results of the current documentation edit. Use JSON timestamps and the actual code diff to determine relevance; a gallery can predate later changes.

## Evidence map

| Feature | Saved evidence |
| --- | --- |
| Illustrated scenery | [Gallery](../review/illustrated/index.html), [106-check snapshot](../review/illustrated/checks.json) |
| Whole journey/source fidelity | [301-check snapshot](../review/browser-checks.json); [earlier photo-layout gallery](../review/index.html) |
| Transitions/navigation/gestures | [Gallery/recordings](../review/motion/index.html), [83-check snapshot](../review/motion/checks.json) |
| Reversible foreground reveals | [Gallery/recordings](../review/reveals/index.html), [379-check snapshot](../review/reveals/checks.json), [34 artwork checks](../review/reveals/artwork-checks.json) |
| Place guides and chapter pacing | [Gallery](../review/story/index.html), [56-check snapshot](../review/story/checks.json) |
| Arrival countdown | [Desktop](../review/countdown/desktop.png), [phone](../review/countdown/phone.png), [67-check snapshot](../review/countdown/checks.json) |
| Fund invitation | [Gallery](../review/fund/index.html), [155-check snapshot](../review/fund/checks.json); predates move after crew |
| Shorter scroll layout | [Before/after measurements](../review/illustrated/pacing.json), [12 focused checks](../review/illustrated/compact-checks.json) |
| Accessibility/performance | [Accessibility contexts](../review/accessibility.json), [story measurements](../review/story/performance.json), [earlier countdown baseline](../review/performance.json) |

## Limits

- Recorded suites use Playwright/Chromium emulation; they do not establish physical-device, Safari or Firefox coverage.
- Older photo-background galleries, contrast notes and Lighthouse scores describe their capture stage. Current scenery is illustrated; no previous score guarantees current/production performance.
- The fund-order/copy change received targeted desktop/phone checks; the older full fund report predates it. Rerun the focused helper after future changes.
- No production deployment or payment is demonstrated by these files. Source rights remain in [Photo assets](assets.md).
