# Architecture pointer

Current feature ownership and maintenance instructions are indexed in [README.md](README.md). Contributor rules live in [AGENTS.md](../AGENTS.md); recorded checks live in [Recorded review](review.md). This file remains for links in older review galleries.

`data.js`/`assets.js` → `main.js` renders content and native controls → optional `motion.js` enhances scrolling/gestures. `scene-config.js`/`scenery.js` supply the illustrated stage; enhanced and fallback controllers share `JourneyUI.sceneFor()`. Preparation/export scripts are maintenance tools, never a runtime build.

Current decisions supersede earlier gallery descriptions: illustrated backgrounds replace photo wallpapers; afternoon sun has no aura; scrolling uses the shorter 15 October spacing; the fund follows crew. Details are in [scenery](scenery.md), [motion](motion.md) and [group features](group.md).
