# MOTION

English creative studio concept inspired by the immersive presentation of [wearebrand.io](https://wearebrand.io/). MOTION is a provisional name; artwork and projects are original concepts.

## Detailed build documentation / Подробная инструкция

- [English — complete step-by-step guide](docs/build-guide.en.md)
- [Русский — полное пошаговое руководство](docs/build-guide.ru.md)
- [Documentation index / Оглавление документации](docs/README.md)

Both guides explain artwork generation and layer separation, alpha masks, asset optimization, scroll choreography, input throttling, cursor parallax, ambient camera motion, responsive layout, accessibility, testing, and deployment.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/. Production build: `npm run build`. Preview the build: `npm run preview`.

## Layered scroll transition

All three worlds share a sticky viewport. Scrolling separates the chrome ring, foreground clouds, skies, moon, glass sculpture, ocean wave and headline lines into independent animation tracks. The transition reverses when scrolling upward; scene controls seek to the same timeline.

- `src/Worlds.jsx`: scene markup and individual layers.
- `src/motion.css`: choreography, responsive composition, CSS scroll timeline and reduced-motion presentation.
- `src/App.jsx`: navigation, lightweight fallback progress updates, studio and brief form.
- `public/images`: optimized WebP layers with provenance sidecars.
- `artwork`: original generated PNG assets.
- `docs/motion.md`: implementation choices and CSS references.

Supported browsers use `animation-timeline` / `animation-range`. Other browsers reuse the same paused keyframes, driven by a scroll-event requestAnimationFrame update. Typed `attr()` supplies line offsets with inline custom-property fallbacks. Service disclosures progressively enhance intrinsic height transitions using `interpolate-size: allow-keywords`. `calc-size()` is unnecessary for these transitions.

The site respects reduced motion: all three worlds become normal static sections. Within the story, wheel, swipe, keyboard and button input share a throttled controller: 1800 ms transition, no post-transition pause, and 180 ms quiet interval to reject trackpad momentum. Scrolling below the story stays native. Scene choreography uses CSS; optional PixiJS water/heat effects load separately on eligible devices, with one bounded renderer that pauses during navigation. See the [bilingual PixiJS implementation notes](docs/pixi-effects.md).

## Content and assets

The brief form validates input and downloads a text file locally. It does not send email or submit data to a backend. Replace the provisional identity and connect a destination before using it as a live studio contact form.

`DESIGN.md` and `.impeccable/design.json` document the implemented visual system. Exact image prompts are in `docs/` and image provenance sidecars. To regenerate optimized images after editing source artwork, run `node scripts/prepare-assets.mjs` and preserve/update each asset's prompt provenance.

## Understand Anything

Installed for this user's Codex environment. See `docs/understand-anything.md` for installed locations and commands. Analysis and its knowledge graph are separate from running this website.



