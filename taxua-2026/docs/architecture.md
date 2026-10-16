# Architecture pointer

Current feature ownership and maintenance instructions are indexed in [README.md](README.md). Contributor rules live in [AGENTS.md](../AGENTS.md); recorded checks live in [Recorded review](review.md). This file remains for links in older review galleries.

`data.js`/`assets.js` → `main.js` renders content and native controls → optional `motion.js` enhances scrolling/gestures. `scene-config.js`/`scenery.js` supply the illustrated stage; enhanced and fallback controllers share `JourneyUI.sceneFor()`. Preparation/export scripts are maintenance tools, never a runtime build. The optional classic `games.js` runs after `main.js`, adds the random-game picker and five illustrated chance objects, and shares the integer sampler with the original wheel. See [Games](games.md). The optional `controls.js` follows `games.js` before GSAP; it progressively enhances selects while `controls.css` supplies shared field and checkbox styling. See [Shared controls](controls.md).

Current decisions supersede earlier gallery descriptions: illustrated backgrounds replace photo wallpapers; afternoon sun has no aura; scrolling uses the shorter 15 October spacing; the fund follows crew. Details are in [scenery](scenery.md), [motion](motion.md) and [group features](group.md).

The optional `weather.js` runs after `motion.js` and fetches daily Open-Meteo data. Artwork/libraries stay local; network/storage failure keeps the journal usable. See [Sky and weather](weather.md).
