# Verification — three-world motion update

## PixiJS follow-up — 31 October 2026

- Production build passed. Initial application JS is 246.37 kB raw / 76.52 kB gzip; optional renderer code is split into a deferred chunk (328.09 kB raw / 93.26 kB gzip in this build). Chunk filenames are generated and may change. Build output also contains a 43.90 kB environment chunk; emitted files are not all initial page downloads.
- Eight existing navigation tests and three atmosphere policy tests passed. Policy tests cover bounded dimensions/pixel count, reduced-motion/device opt-outs, and visible settled-scene gating.
- Inspected both development and production pages in the local Chromium browser. Fixed missing filter registration and mismatched shader uniform precision before final verification. The final production tab reported no warnings/errors in the inspected log.
- Desktop ocean and desert effects rendered with one reusable canvas. At a 1422 CSS-pixel-wide production viewport, its buffer was 1189 × 672 pixels (within the 800,000-pixel cap). Repeated scene changes retained one canvas.
- Observed smoothed JavaScript render submission times around 0.21–0.25 ms in this local browser, with the 30 fps cap selected. This is CPU submission timing, not GPU timing or a full-device frame-rate benchmark.
- On entering the studio, the atmosphere state became paused and the rendered-frame counter remained at 570 across later inspections. Both the effect rAF loop and Pixi's system ticker are explicitly stopped by the pause path.
- A fresh narrow-view load created no canvas and had no horizontal document overflow. The embedded viewport tool reported 434 CSS pixels despite requesting 390; this verifies the narrow-mode exclusion, not an exact 390px visual golden. Temporary viewport overrides were reset.
- Error fallback was observed during integration: original images and navigation remained visible while the renderer was unavailable. Final runtime also handles context loss and disposes failed rendering resources; no physical GPU-loss stress test or cross-engine device performance claim is made.
- Bilingual build guides link to `docs/pixi-effects.md`, which records the implementation, performance limits, fallback behavior, and source files.

The earlier review below describes the CSS foundation and its original verification scope.

Verified locally in the Codex Chromium browser. This is an in-thread finish review: independent reviewer attempts failed due to the account usage limit. No independent approval is claimed.

## persistence

Pass. PRODUCT.md, the updated surface brief, DESIGN.md and schema-v2 `.impeccable/design.json` exist. The implementation follows the user-pinned reference and requested third world. All eight shipping raster assets have provenance sidecars.

## fidelity

| Element | Assessment | Evidence |
| --- | --- | --- |
| Type | Match | Manrope, three large left-aligned lines, cream and peach emphasis across all scenes |
| Material | Match | Photographic backgrounds and independently composited chrome, moon, opalescent glass, clouds and wave; native alpha verified |
| Ground | Match | Peach highlights connect purple clouds, orange desert and lavender sea |
| Motion | Match | Two equal-length transitions in one reversible scroll range, independent object and foreground tracks |
| Navigation | Match | Three scene buttons, next-scene control, final studio link, initial fragment restoration |
| Mobile | Adaptation | Objects crop beyond the right edge while type, labels and controls retain the same hierarchy |

Visual evidence is in `.impeccable/review/afterglow-desktop.png`, `afterglow-tablet.png` and `afterglow-mobile.png`. The desktop frame renders at 1440×900 and is captured scaled inside the test host; mobile renders at 390×844. Gray outside iframe captures belongs to the test host, not the site.

## ceiling

The requested layered cinematic transition is implemented with native CSS timelines, alpha-cutout artwork and independent type tracks. This review makes no device FPS or cross-engine performance claim.

## material_fixes

Resolved during QA: the timeline inset inherited scroll padding; hidden links could retain focus briefly; narrow contact typography caused overflow; initial React fragment targets needed restoration after mounting. No open material issue in the inspected scope. Static detector reported no primary findings; advisory token-coverage notices remain because DESIGN.md records reused tokens rather than every scene-specific scrim and breakpoint value.

## keep

Preserve the shared transition rhythm, independent layers, native scrolling, authentic transparent assets and legible text.

## Validation

- `npm run build`: passed after the third scene and fragment restoration changes.
- All eight images loaded; generated sculpture and foreground wave alpha range verified from 0 to 255.
- Wide and mobile frames showed no horizontal page overflow at 1440, 390 and 320 CSS pixels. The final studio link reached the studio with its header navigation active.
- Native forward and reverse scrolling, numbered scene selection and the middle scene's settled state were visually inspected.
- The simulated no-timeline fixture reached Afterglow at progress 0.94 and scrubbed back through the desert/glass transition using the JS fallback.
- The simulated reduced-motion fixture showed three normal-flow sections, no animated glass transform, no inert worlds, and a correctly positioned third-scene deep link. This exercises the application branch and CSS rules, not a separate browser engine or OS preference change.
- Service disclosure interaction and browser error log were checked earlier in this implementation.

Disposition: ship for this local three-scene concept at the tested scope.

