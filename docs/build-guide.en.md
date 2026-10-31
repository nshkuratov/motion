# Building a layered cinematic website

**Complete practical guide · English · 30 October 2026**  
[Русская версия](build-guide.ru.md) · [Documentation index](README.md) · [Project README](../README.md)

This guide explains how to reproduce MOTION, then how to build a similar website with different artwork. It covers the image pipeline, composition, DOM structure, CSS choreography, input controller, ambient background camera, cursor response, mobile layout, accessibility, testing, and delivery. Basic HTML, CSS, JavaScript, and React knowledge is assumed; the motion architecture is explained from first principles.

**31 October update:** the CSS foundation below now has an optional PixiJS enhancement. Read the [bilingual implementation supplement](pixi-effects.md) for water/heat shaders, deferred loading, the new camera wrappers, performance limits and cleanup. The existing CSS/image path remains the fallback.

The source files linked throughout are the **complete runnable implementation**. Code blocks are focused excerpts or explicitly labelled examples, not an alternative application to paste into one file. For an exact reproduction, follow section 2 and retain the complete source files. For a new design, work through the sections in order and change one system at a time.

## Contents

1. [Understand the result and its three clocks](#s01)
2. [Run or reproduce the project](#s02)
3. [Plan the visual story](#s03)
4. [Design the layer stack](#s04)
5. [Create and separate the artwork](#s05)
6. [Write useful image-generation prompts](#s06)
7. [Export, validate, and optimize assets](#s07)
8. [Build a static composition first](#s08)
9. [Create the sticky stage and scroll coordinate](#s09)
10. [Connect CSS to scroll, including the fallback](#s10)
11. [Choreograph the scene transitions](#s11)
12. [Make scrolling and buttons share one controller](#s12)
13. [Reject repeated input and trackpad momentum](#s13)
14. [Add cursor parallax](#s14)
15. [Add the independent background camera](#s15)
16. [Compose for mobile and short screens](#s16)
17. [Use modern CSS where it helps](#s17)
18. [Accessibility and motion controls](#s18)
19. [Performance and loading](#s19)
20. [Test and diagnose problems](#s20)
21. [Replace imagery or add a fourth scene](#s21)
22. [Build and publish](#s22)
23. [Implementation order and acceptance checklist](#s23)
24. [Parameter reference, glossary, and source map](#s24)

<a id="s01"></a>
## 1. Understand the result and its three clocks

The page is a stack of ordinary HTML elements containing raster images. Transparent cutouts, independent transforms, carefully timed overlap, and perspective cues create the impression of depth. It does not require a 3D engine, video background, or animation library.

There are three independent clocks:

| Clock | Input | What it controls | Owner |
| --- | --- | --- | --- |
| Story progress, 0–1 | Page scroll position | Scene entrance/exit, background fades, foregrounds, text | `.motion-layer` wrappers |
| Elapsed time | CSS animation | Slow zoom and lateral drift while a scene rests | `.world-camera` images |
| Pointer position, −1–1 | Mouse coordinates within the stage | Small object translation and rotation | Images inside `.world-object` |

The navigation controller changes the page's scroll position over 1.8 seconds. CSS reads that position and paints the scene. The background keeps its own clock. The pointer affects a separate nested element.

```text
Wheel / swipe / keyboard / scene button
                  ↓
       shared navigation controller
                  ↓
         animated scroll position
                  ↓
     normalized story progress 0…1
                  ↓
     outer layers: movement + fades

Elapsed time → inner background image: camera movement
Mouse        → inner object image: cursor response
```

**The central rule: give different transform systems different DOM elements.** Two animations writing `transform` on the same element normally replace one another. Nest an image inside its scroll-animated wrapper so the transforms compose naturally.

<a id="s02"></a>
## 2. Run or reproduce the project

### 2.1 Prerequisites

Use Node.js and npm. The installed Vite 7.3.7 package declares Node `^20.19.0 || >=22.12.0`; use a maintained Node version satisfying that range. The project's manifest declares React 19, Vite 7, and Sharp for asset preparation. Use the lockfile to reproduce installed versions rather than replacing dependencies with whatever is latest. A newly scaffolded Vite project can have different requirements; see the [Vite setup guide](https://vite.dev/guide/).

Check your environment:

```sh
node --version
npm --version
```

In the existing project:

```powershell
Set-Location D:\program\motion
npm ci
npm run dev
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173/`. If the port is occupied, Vite may choose another one. To require the intended port, use `npm run dev -- --port 5173 --strictPort`. Do not open `index.html` directly through the filesystem: the app uses ES modules and a build server.

Use `npm install` if starting without a lockfile; retain the resulting lockfile afterward. `npm ci` requires a lockfile matching `package.json`.

### 2.2 Exact reproduction in another folder

Copy the following from this project into a new project directory:

```text
package.json + package-lock.json   dependency graph
index.html                        page metadata and entry point
src/                              complete application
public/                           images, fonts, favicon
scripts/                          image preparation and navigation tests
artwork/                          editable PNG sources; needed to re-export assets
docs/, PRODUCT.md, DESIGN.md       implementation and design knowledge
```

Do not copy `node_modules`, `dist`, or server logs. Run `npm ci`, `npm run dev`, and later `npm run build` in the new directory. Artwork sources are not required merely to run an already exported site; the WebPs in `public/images` are.

### 2.3 File responsibilities

| File | Responsibility |
| --- | --- |
| [main.jsx](../src/main.jsx) | Mounts React and imports global CSS |
| [App.jsx](../src/App.jsx) | Active scene, reduced-motion preference, navigation lifecycle, progress fallback, shell and form |
| [Worlds.jsx](../src/Worlds.jsx) | Three scene definitions, layer markup, cursor response, camera visibility |
| [motion.css](../src/motion.css) | Sticky stage, keyframes, camera paths, responsive scene layout, reduced motion |
| [sceneNavigation.js](../src/sceneNavigation.js) | Scroll destinations, easing, input filtering, throttle, cleanup |
| [style.css](../src/style.css) | Fonts, tokens, header, studio, form, footer |
| [prepare-assets.mjs](../scripts/prepare-assets.mjs) | Converts the eight PNG layers to WebP |

`style.css` also retains older `.scene-*` rules. The current cinematic component uses `.world-*` rules in `motion.css`; edit that system when changing the scenes.

<a id="s03"></a>
## 3. Plan the visual story

Before generating images, make a three-row storyboard. Specify the idea, environment, main object, foreground, light direction, dominant color, copy, and direction of movement for every scene.

| Scene | Narrative | Environment | Main object | Secondary foreground |
| --- | --- | --- | --- | --- |
| Cloud nine | An unexpected idea | Lavender sky, peach clouds, distant sea | Reflective chrome ring | Separate cloud mass |
| Otherworld | A different perspective | Orange dunes and terracotta sky | Large moon | None in this implementation |
| Afterglow | A lasting impression | Lavender sea and sunset | Opalescent glass knot | Separate ocean wave |

The desert's dunes belong to its background plate; they are not independently animated cutouts. Add layers when they need independent motion or occlusion, not simply to increase the count.

Keep a common material language: peach highlights, purple shadows, large sculptural forms, light from the upper right, and photographic texture. Give every scene its own color identity while retaining those anchors. A cold blue object lit from the opposite direction will look pasted onto the orange desert even if its mask is perfect.

Reserve roughly the left 40% of a desktop composition for text. Put the focal object toward the center-right. Decide the horizon and the object scale before animation. Use a mockup with actual heading lengths; an empty image often looks usable until a three-line heading covers its focal point.

Write a motion brief, for example: “The floating object rises out of the scene; the next object rises from below. Foregrounds move on a different path. Backgrounds overlap and dissolve. Headlines separate by line. While resting, the camera drifts slowly.” This is a production specification, not just a mood board.

<a id="s04"></a>
## 4. Design the layer stack

Think in depth planes, back to front:

1. **Background plate:** complete sky, landscape, and distant atmosphere without the main subject.
2. **Main object:** a full transparent cutout with an independently controllable silhouette.
3. **Secondary foreground:** clouds, foam, vegetation, mist, or another element that overlaps the object and strengthens depth.
4. **Readability scrim:** a controlled dark gradient behind text; it is CSS, not painted into the artwork.
5. **Text:** separate heading lines, description, and caption.
6. **Controls:** navigation and links above the animated scenery.

```text
.worlds-scroll                       tall scroll container
└── .worlds-stage                     sticky, clipped viewport
    ├── .world-backdrops              behind the worlds
    │   └── .world-backdrop.motion-layer   scroll transform + fade
    │       └── img.world-camera           time-based transform
    ├── section.world
    │   ├── .world-object.motion-layer     scroll transform
    │   │   └── img                        cursor transform
    │   ├── .cloud-foreground.motion-layer / .ocean-foreground
    │   ├── .world-scrim.motion-layer
    │   ├── .world-copy → heading → .story-line.motion-layer
    │   ├── .world-description.motion-layer
    │   └── .world-caption.motion-layer
    └── .world-navigation
```

An object partly hidden by clouds in the original image still needs a complete lower edge in its exported cutout. Otherwise the animation exposes a flat missing section. Likewise, a ring needs transparency in its central hole, not only around its outer boundary.

<a id="s05"></a>
## 5. Create and separate the artwork

### 5.1 Two production approaches

**Start from one approved composite.** Create the finished scene first, then derive a clean background, isolated object, and foreground from it. This gives consistent lighting and reflections. It requires reconstructing pixels hidden behind the subject.

**Create separate layers with a shared brief.** Generate or render the environment and object independently using the same light, palette, perspective, and material references. This gives more freedom, but demands careful compositing to avoid mismatched shadows or scale. MOTION uses both approaches; the original cloud/desert composites are also preserved in `artwork`.

### 5.2 Manual separation in an image editor

The procedure works in Photoshop, Affinity Photo, GIMP, or another editor with layer masks and alpha export; exact menu names differ.

1. Preserve the original and create a layered working file. Use an sRGB output workflow and a consistent canvas.
2. Duplicate the composite into background, object, and foreground working layers.
3. Select the main object. Use a precise path for a hard manufactured edge and a refined soft mask for atmospheric detail. Apply a layer mask, keeping the source pixels editable.
4. Subtract all holes and open spaces from the object mask. Inspect at 100% and 200% on white, dark purple, orange, and a contrasting color.
5. Reconstruct any object portion originally hidden behind clouds or landscape. Repaint, render, or generate that missing portion; a mask alone cannot recover unavailable pixels.
6. On the background copy, remove the object and any foreground that will become a separate layer. Fill the entire removed area with plausible sky or terrain. Extend horizon lines and lighting continuously. Check that no “ghost” of the object remains.
7. Isolate the foreground. Preserve soft partial transparency at cloud/foam edges. Avoid a rectangular alpha edge or abrupt bottom edge that will become visible when translated.
8. Reassemble the exported candidates over the clean plate and compare with the approved composite. Match hue, exposure, sharpness, grain, and local contrast.
9. Simulate the planned movement in the editor: move the subject up and sideways, scale it down, and move the foreground away. Inspect every newly exposed area.
10. Export each layer separately and keep the editable master, masks, and generation prompts.

### 5.3 Glass, reflections, and soft edges

A PNG of glass is still a flat rendered image. It does not dynamically refract a new background like a physical 3D object. Use glass whose tint/reflections already agree with the intended scene. Alpha makes the outside and open holes transparent; it does not automatically create accurate refraction through the material.

Watch for pale fringes caused by a cutout made against white. Refine the edge color instead of shrinking the mask until fine detail disappears. Do not apply a large generic feather to a sharp metal edge. Cloud edges may need soft alpha; chrome usually needs a crisp edge with natural antialiasing.

An AI-generated checkerboard is an opaque image of a checkerboard. Verify the actual alpha channel. A clean rectangular image with a gray background is not a usable transparent cutout.

### 5.4 Canvas and crop strategy

Two valid strategies are full-scene aligned canvases and tightly framed independent objects. MOTION uses wide backgrounds, square main objects, and separate foreground canvases; CSS provides their positioning. Do not assume all files align merely by putting them at `left: 0; top: 0`.

Leave approximately 5–10% transparent margin around a square object so its silhouette is not clipped. Record that padding: excessive transparent space makes a CSS-sized object appear unexpectedly small. Backgrounds must have useful content beyond the intended visible frame so camera movement can crop into it.

**Checkpoint:** the scene must look convincing as a static composite on both a wide and a portrait frame before animation begins.

<a id="s06"></a>
## 6. Write useful image-generation prompts

Describe output type, composition, material, lighting, palette, empty text area, and transparency separately. Supply the approved scene as an image reference for extraction; asking only by text can produce a different ring or viewpoint.

Example background brief for a new scene:

```text
Create a wide photographic background plate for a layered website.
Lavender sky, peach sunset light from the upper right, distant calm sea.
Keep the left 40% quiet for a large heading. Rich detail toward the right.
No main object, no ring, no lettering, no logo, no interface.
Continue the atmosphere to every edge; leave room for a slow camera crop.
```

Example extraction brief:

```text
Extract only the chrome ring from the supplied scene.
Preserve its exact viewpoint, shape, peach reflections and purple shadows.
Reconstruct the part hidden by clouds so the entire object is complete.
Center it on a square canvas with clear margin on all sides.
Use real alpha transparency around the silhouette and through its hole.
No cloud, floor, cast shadow, background, checkerboard, text, or watermark.
```

Example foreground brief:

```text
Create a separate foreground ocean wave for the supplied sunset scene.
Match its lavender water, peach highlights, camera angle and grain.
Keep foam detail and soft transparent edges. Real alpha above the wave.
No sky, horizon, sculpture, text or rectangular background.
The lower area should extend beyond the visible viewport when composited.
```

The exact project prompts are available for [cloud background](cloud-background-prompt.txt), [chrome ring](chrome-orbit-prompt.txt), [cloud foreground](cloud-foreground-prompt.txt), [desert background](desert-background-prompt.txt), [moon](moon-prompt.txt), [ocean background](ocean-background-prompt.txt), [glass sculpture](glass-knot-prompt.txt), and [ocean foreground](ocean-foreground-prompt.txt).

Generate, inspect, correct, and recomposite. Prompts are specifications, not guarantees. Keep assets original or appropriately licensed; do not extract the reference site's artwork as a substitute for producing your own.

<a id="s07"></a>
## 7. Export, validate, and optimize assets

### 7.1 Actual shipping assets

Sizes below were read from the current files; KiB means 1,024 bytes. They are examples, not mandatory dimensions for every site.

| File in `public/images` | Pixels | Alpha | Approx. KiB |
| --- | --- | --- | --- |
| `cloud-background.webp` | 1672 × 941 | No | 169 |
| `chrome-orbit.webp` | 1254 × 1254 | Yes | 324 |
| `cloud-foreground.webp` | 1774 × 887 | Yes | 301 |
| `desert-background.webp` | 1672 × 941 | No | 86 |
| `moon.webp` | 1254 × 1254 | Yes | 345 |
| `ocean-background.webp` | 1672 × 941 | No | 152 |
| `glass-knot.webp` | 1254 × 1254 | Yes | 320 |
| `ocean-foreground.webp` | 1672 × 941 | Yes | 222 |

The eight assets total about 1.96 MB in decimal units, or 1.87 MiB. Decoded memory is much larger than compressed transfer size.

### 7.2 Export procedure

1. Save the eight corresponding `.png` files in `artwork/` using the exact base names above.
2. Preserve alpha for the objects and foregrounds; do not flatten against white.
3. Run from the project root:

```sh
node scripts/prepare-assets.mjs
```

The script overwrites the corresponding WebPs in `public/images`. Its conversion is:

```js
await sharp(`artwork/${name}.png`)
  .webp({ quality: 88, alphaQuality: 100, effort: 6 })
  .toFile(`public/images/${name}.webp`);
```

These are the project's settings, not a universal optimum. Inspect edges and gradients after export. `quality: 88` is lossy color compression; it does not mean pixel-identical RGB. See [Sharp WebP output options](https://sharp.pixelplumbing.com/api-output/#webp) when changing the encoder settings.

The current script does not resize, color-correct, remove backgrounds, create masks, or update provenance JSON. Perform those steps explicitly. Keep each `.webp.json` sidecar's prompt and source information consistent with the exported asset.

### 7.3 Check real transparency

Optional diagnostic: save this as `scripts/check-alpha.mjs` and run `node scripts/check-alpha.mjs`. It reads the existing files without changing them:

```js
import sharp from 'sharp';

for (const name of ['chrome-orbit', 'moon', 'glass-knot',
                    'cloud-foreground', 'ocean-foreground']) {
  const file = `public/images/${name}.webp`;
  const metadata = await sharp(file).metadata();
  if (!metadata.hasAlpha) throw new Error(`${name}: no alpha channel`);
  const { data } = await sharp(file)
    .extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
  let min = 255, max = 0, partial = 0;
  for (const value of data) {
    min = Math.min(min, value);
    max = Math.max(max, value);
    if (value > 0 && value < 255) partial++;
  }
  console.log(name, { min, max, partial });
  if (min === 255) throw new Error(`${name}: alpha is completely opaque`);
}
```

Alpha values prove transparency exists somewhere, not that the mask is correct. Still inspect the ring hole, edges, and reconstructed portions visually.

### 7.4 Select resolution deliberately

Estimate the maximum displayed object size in CSS pixels, multiply by the target device pixel ratio and largest scale used while visibly prominent, then compare with source resolution. A 1,254-pixel object displayed at 900 CSS pixels will not provide full 2× sharpness. Decide whether that tradeoff is acceptable on the actual image.

For larger deployments, generate multiple resolutions and use `srcSet`/`sizes`. Keep aspect ratios and transparent padding consistent across variants. Mobile art direction may need a different background crop, not merely a smaller copy. The current project ships one resolution per layer; responsive image variants are an extension.

<a id="s08"></a>
## 8. Build a static composition first

Use this DOM pattern inside the existing component; omitted text and controls remain in the complete [Worlds.jsx](../src/Worlds.jsx):

```jsx
<div className="world-backdrop cloud-backdrop motion-layer">
  <img className="world-camera" src="/images/cloud-background.webp" alt="" />
</div>

<section className="world world-cloud" aria-labelledby="hero-title">
  <div className="world-object orbit-object motion-layer" aria-hidden="true">
    <img src="/images/chrome-orbit.webp" alt="" />
  </div>
  <div className="cloud-foreground motion-layer" aria-hidden="true">
    <img src="/images/cloud-foreground.webp" alt="" />
  </div>
  <div className="world-scrim cloud-scrim motion-layer" />
  <div className="world-copy">
    <h1 id="hero-title">Ideas beyond ordinary.</h1>
  </div>
</section>
```

Initially position a single scene without its animation classes. Establish the following:

```css
.world, .world-backdrops, .world-scrim { position: absolute; inset: 0; }
.world-backdrops { z-index: -3; }
.world-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; }
.world-camera { display: block; width: 100%; height: 100%; object-fit: cover; }
.world-object { position: absolute; pointer-events: none; }
.world-object img { width: 100%; height: 100%; object-fit: contain; }
.orbit-object {
  width: min(60vw, 88svh);
  height: min(60vw, 88svh);
  right: 3vw;
  top: 5svh;
}
```

`cover` fills the background frame, cropping when its aspect ratio differs. `contain` preserves the entire object canvas within its box. A cloud/wave is a separately positioned foreground. The current wave uses `object-fit: fill`; this deliberate stretch is acceptable for its composition but should not be copied to a recognizable face or manufactured object.

Keep text as HTML, not baked pixels. Use real headings and links. The project uses Manrope, warm paper `#fffaf5`, peach `#f3bbae`, plum `#282331`, and a gutter of `clamp(24px, 5.5vw, 96px)`. Respect the included font license in `public/fonts/OFL.txt`.

The scrim combines a left-side darkening gradient and a stronger lower gradient. It protects text contrast as the artwork moves. Check readability at both extremes of the camera path, not only at the initial frame.

<a id="s09"></a>
## 9. Create the sticky stage and scroll coordinate

```css
.worlds-scroll {
  height: 580svh;
  position: relative;
  view-timeline-name: --worlds;
  view-timeline-axis: block;
  view-timeline-inset: 0;
}
.worlds-stage {
  height: 100svh;
  position: sticky;
  top: 0;
  overflow: clip;
  isolation: isolate;
}
```

The tall outer container creates travel distance. The inner stage remains pinned while that distance is consumed. All scenes occupy the same viewport; they do not push one another down the page.

Let `H` be the story height and `V` the actual stage height. The travel distance is `D = H − V`. If the story starts at document position `S`, normalized progress is:

```text
p = clamp((scrollY − S) / D, 0, 1)
targetY = S + D × sceneProgress
```

In the project, `getBoundingClientRect().top` provides `S − scrollY`, so the fallback uses `clamp(-rect.top / travel, 0, 1)`.

For an illustrative stage height of 900 pixels, a 580svh story has 4,320 pixels of travel. Stops at 0, .44, and .94 are 0, 1,900.8, and 4,060.8 pixels relative to the story start. Use DOM measurements rather than hardcoding those pixel values.

`svh` gives a stable small-viewport basis useful around mobile browser chrome. The code reads the actual stage height to keep the scroll calculations aligned with CSS. Mobile changes the story to `520svh`.

`view-timeline-inset: 0` matters: the page also has header scroll padding, and implicit timeline insets can shift the expected progress. Avoid introducing an unintended scroll container on an ancestor; it can change what `position: sticky` sticks to.

<a id="s10"></a>
## 10. Connect CSS to scroll, including the fallback

Define the fallback first. A paused one-second animation with a negative delay displays a selected position in its keyframes:

```css
.motion-layer {
  animation-name: var(--motion);
  animation-duration: 1s;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-play-state: paused;
  animation-delay: calc(var(--scroll-p, 0) * -1s);
}
@supports (animation-timeline: view()) and
          (animation-range: contain 0% contain 100%) {
  .motion-layer {
    animation-duration: auto;
    animation-delay: 0s;
    animation-play-state: running;
    animation-timeline: --worlds;
    animation-range: contain 0% contain 100%;
  }
}
```

For the oversized story container, the `contain` range describes the interval while it covers the viewport. The timeline maps that interval to the keyframes. Keep `animation-timeline` after any `animation` shorthand that could reset it. Consult the [animation-timeline reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline) for semantics and current compatibility.

In [App.jsx](../src/App.jsx), test the same two capabilities with `CSS.supports`. If unsupported, update `--scroll-p` on scroll/resize, batching writes through a single `requestAnimationFrame`. The same keyframes then render the same scene positions.

```js
const travel = Math.max(1, story.offsetHeight - stage.offsetHeight);
const p = Math.max(0, Math.min(1, -story.getBoundingClientRect().top / travel));
story.style.setProperty('--scroll-p', p.toFixed(5));
```

This excerpt belongs in the fallback branch, not alongside a native timeline driving the same property. Do not update React state for every pixel; use DOM custom properties for continuous values and React state only when the active scene changes.

The CSS timeline is linear in scroll position. The navigation controller already eases scroll over time. Adding another general easing to every keyframe would change that combined timing and can make transitions sluggish.

<a id="s11"></a>
## 11. Choreograph the scene transitions

Design the complete timeline on paper before adding keyframes. The first transition occupies the first half; the second repeats its rhythm 50 percentage points later. Resting destinations are 0, .44, and .94. These stops lie in settled portions of the choreography, not exactly at the mathematical half-boundaries.

| Track | First transition | Second transition |
| --- | --- | --- |
| Outgoing background | Holds to 6%; gone by 34% | Holds to 56%; gone by 84% |
| Incoming background | Hidden through 10.5%; settled by 35% | Hidden through 60.5%; settled by 85% |
| Incoming object | Hidden through 9%; positioned by 38.5% | Hidden through 59%; positioned by 88.5% |
| Incoming heading | Hidden through 19.5%; settled by 34% | Hidden through 69.5%; settled by 84% |
| Incoming details | Hidden through 26%; settled by 40% | Hidden through 76%; settled by 90% |
| Active scene switch | 25% | 75% |

These percentages are progress coordinates, not elapsed seconds. Each navigation action still lasts 1.8 seconds; the first and second scene stops are not equally spaced in pixels.

Example outgoing object track from the implementation:

```css
.orbit-object { --motion: orbit-out; }
@keyframes orbit-out {
  0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); opacity: 1; }
  7.5% { transform: translate3d(-1vw, -3svh, 0) rotate(-3deg) scale(1.02); opacity: 1; }
  24% { transform: translate3d(9vw, -47svh, 0) rotate(-24deg) scale(.9); opacity: 1; }
  34%, 100% { transform: translate3d(16vw, -110svh, 0) rotate(-40deg) scale(.72); opacity: 0; }
}
```

The early movement establishes depth, the middle movement carries the object out, and the final invisible hold prevents it reappearing. The incoming object rises from below with its own rotation and scale. Foregrounds move by different amounts, so the scene feels spatial rather than like one flat card sliding upward.

Use separate tracks for backgrounds, objects, foregrounds, heading lines, descriptions, captions, and progress. Start with translation and opacity. Add bounded rotation/scale and small transition blur only after the crossing frames are clean. A fast full-screen blur can be expensive and can hide poor choreography rather than fix it.

Heading lines use `--line` to vary travel:

```jsx
<span className="story-line motion-layer"
      data-line={index} style={{ '--line': index }}>{word}</span>
```

```css
transform: translate3d(0, calc(-42svh - var(--line) * 9svh), 0);
```

This changes line distance, creating separation without introducing unrelated timers. Keep a complete accessible heading label when visually splitting its text.

Verify the middle of the transition, not just the endpoints. The incoming sky should already cover enough of the stage before the outgoing one disappears. Scrims should maintain readability. Move backward through the same timeline: reverse scrolling should not need a second set of entrance animations.

<a id="s12"></a>
## 12. Make scrolling and buttons share one controller

Use the complete [sceneNavigation.js](../src/sceneNavigation.js), not independent `scrollIntoView` calls with guessed delays.

The controller receives the window, document, scene definitions, reduced-motion flag, and a function reading the current menu state. It exposes `navigate(id, instant)` and `destroy()`.

```js
export const SCENE_MOTION = {
  duration: 1800,
  pause: 0,
  gestureGap: 180,
  threshold: 32,
};
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
```

`ease` is a quintic smoothstep: speed ramps up and slows down at the endpoints. In each animation frame:

```text
t = min(1, elapsed / 1800)
scrollY = startY + (targetY − startY) × ease(t)
```

Use `scrollTo({ top, behavior: 'instant' })` for each frame: the controller owns timing, so browser smooth scrolling should not start a competing animation on every update. Destination coordinates are derived from the story geometry. Resizing during a transition resolves immediately to the intended destination.

All inputs call this controller. A link retains a meaningful `href`, prevents the default click in React, then calls `goTo(id)`. Numbered buttons and the next arrow call the same function. The controller writes the fragment with `history.replaceState`, so each step does not add a history entry.

React mounts after the browser's initial fragment lookup. The mount effect in `App.jsx` restores a valid initial hash once elements exist, using the same destination calculation. Test a direct visit to `/#afterglow`, not only clicks from the first scene.

Create the controller in an effect and destroy it on cleanup. This prevents duplicate wheel listeners under React Strict Mode and when the reduced-motion preference changes. Use a ref to read changing menu state without recreating the controller on every render.

<a id="s13"></a>
## 13. Reject repeated input and trackpad momentum

A debounce waits for input to stop before doing something. This experience needs an immediate first response and rejection of extra input during a transition: a leading-edge throttle with gesture recognition.

The current logic is:

1. Normalize wheel deltas to approximate pixels: pixel mode ×1, line mode ×16, page mode ×viewport height.
2. Ignore zoom modifiers, predominantly horizontal input, and editable fields.
3. Intercept only when the scene sequence owns the direction of travel; scrolling below the story remains native.
4. Accumulate small vertical deltas until their magnitude reaches 32.
5. Start one transition and mark the current wheel gesture as consumed.
6. Drop further events while transitioning. Do not queue a later slide.
7. Require a gap of at least 180 ms between wheel events to recognize a new gesture.

**There is no fixed pause after the animation.** `pause: 0` releases the transition lock immediately. The 180 ms quiet interval is a different safeguard: it stops the tail of one trackpad gesture from triggering another slide. A fresh button action can run immediately after completion; the tail of the old wheel gesture cannot.

Changing `pause` to zero does not mean all continuous wheel events should advance scenes. Removing gesture blocking would make a long trackpad fling skip through the story.

Touch uses a single-finger vertical displacement threshold and consumes each gesture once. Pinch and horizontal gestures remain native. Keyboard navigation ignores held-key repeats, editable controls, and Space on interactive elements that need their own activation. Arrow keys and Page Up/Down use the same scene controller.

Wheel/touchmove listeners must be registered with `{ passive: false }` where `preventDefault()` is required. Do not set `touch-action: none` on the whole page or prevent all wheel events globally. The controller releases input outside its story boundary and supports stepping back from the studio into the last scene.

<a id="s14"></a>
## 14. Add cursor parallax

Normalize pointer coordinates relative to the stage:

```text
x = clamp(2 × (clientX − stageLeft) / stageWidth − 1, −1, 1)
y = clamp(2 × (clientY − stageTop) / stageHeight − 1, −1, 1)
```

The center gives `(0, 0)`; the right edge gives `x = 1`. Store the latest mouse position, schedule at most one `requestAnimationFrame`, and write `--pointer-x` and `--pointer-y` on the stage. Do not trigger a React render for every pointer event.

The complete listener and cleanup live in `Worlds.jsx`. They restrict input to a mouse with a fine pointer and hover support; the effect is disabled for reduced motion, an open menu, and sections after the story. Pointer leave, window blur, resize, and hidden-document events reset the offset.

```css
.world-object img {
  transform:
    translate3d(
      calc(var(--pointer-x, 0) * var(--pointer-travel-x)),
      calc(var(--pointer-y, 0) * var(--pointer-travel-y)), 0)
    rotate(calc(var(--pointer-x, 0) * var(--pointer-turn)));
  transition: transform 700ms cubic-bezier(.16, 1, .3, 1);
}
.orbit-object {
  --pointer-travel-x: 16px;
  --pointer-travel-y: 11px;
  --pointer-turn: .8deg;
}
```

The planet uses 10px/8px/.25deg; the glass sculpture uses 18px/12px/1deg. Different amplitudes suggest different mass. The 700 ms transition softens the response as each target changes; it is not a 700 ms delay before movement starts.

Keep the scroll transform on `.world-object` and the pointer transform on its child `img`. To reverse the perceived depth direction, negate the pointer travel values; test all scenes before doing so. Avoid large movement that lets an object cover the heading or leave its intended crop.

<a id="s15"></a>
## 15. Add the independent background camera

The outer backdrop owns scroll translation and opacity. Its child image owns a slow ordinary CSS animation, so time continues to move the image when scroll progress is stationary.

```css
.world-camera {
  display: block;
  width: 100%; height: 100%; object-fit: cover;
  animation: var(--camera-path) var(--camera-duration)
             ease-in-out infinite alternate both;
  animation-play-state: paused;
}
.worlds-stage[data-camera-enabled="true"][data-camera-visible="true"]
.world-camera { animation-play-state: running; }

.cloud-backdrop { --camera-path: cloud-camera; --camera-duration: 18s; }
@keyframes cloud-camera {
  from { transform: translate3d(-1%, .6%, 0) scale(1.16); }
  to   { transform: translate3d(1%, -.6%, 0) scale(1.06); }
}
```

| Scene | Start | End | One direction |
| --- | --- | --- | --- |
| Clouds | x −1%, y +.6%, scale 1.16 | x +1%, y −.6%, scale 1.06 | 18 s |
| Desert | x +1.4%, y −.4%, scale 1.07 | x −1.4%, y +.6%, scale 1.15 | 22 s |
| Ocean | x −1.2%, y +.7%, scale 1.08 | x +1.2%, y −.7%, scale 1.14 | 20 s |

`alternate` travels back instead of jumping to the first frame. A full out-and-back cycle therefore takes 36, 44, or 40 seconds. `ease-in-out` slows the reversals. These durations are unrelated to the 1.8-second slide transition.

Do not remount camera images when the active scene changes, and do not change their animation names on each navigation. The three backgrounds remain mounted; their phases continue while the story is enabled, including when an individual layer is faded out. This avoids resets when moving backward or during a crossfade. For many scenes, use explicit per-layer visibility management while preserving animation phase.

`Worlds.jsx` uses an `IntersectionObserver` and `visibilitychange` listener to set `data-camera-visible`. React sets `data-camera-enabled` from the existing scene/menu/reduced-motion gate. Together these pause the animations outside the story, behind the menu, or when the document is hidden. Reduced-motion CSS removes the animations entirely. Every listener and observer is cleaned up.

### Cover the frame throughout the motion

For an image initially filling its parent and scaling around the center, scale `s` provides approximately `(s − 1) / 2` extra width on each side, measured relative to the original width. At `s = 1.06`, that is 3% per side. A 1.4% lateral shift fits within that margin. Check the vertical axis separately.

This reasoning applies to the shown `translate3d(...) scale(...)` order, with no rotation. Reordering transforms, adding rotation, changing transform origin, or using an image smaller than its parent changes the geometry. The outer scroll animation also transforms the backdrop, so inspect transition frames as well as camera endpoints. Clip at the stage boundary and never rely on the page background color to conceal a gap.

<a id="s16"></a>
## 16. Compose for mobile and short screens

A portrait viewport needs a new composition, not just scaled-down desktop measurements.

1. Retain the text gutter and readable heading size.
2. Let the main object crop deliberately beyond the right edge; keep its recognizable center visible.
3. Shift background `object-position` toward the meaningful area. The project uses `62% center` below 680px.
4. Move the description to the lower left and leave space for navigation/caption.
5. Hide long pagination names while retaining numbered buttons and accessible names.
6. Inspect foreground edges after changing their size and position.

Example current mobile ring composition:

```css
@media (max-width: 680px) {
  .worlds-scroll { height: 520svh; }
  .orbit-object { width: 115vw; height: 115vw; right: -32vw; top: 12svh; }
  .world-camera { object-position: 62% center; }
  .pagination-name { display: none; }
}
```

The project also has a 1000px breakpoint for intermediate sizes, plus short-height rules below 650px. Test landscape phones and desktop windows with little vertical space. Large fixed text can collide with controls even when the width looks correct.

Check 320, 390, 768, 1024, and 1440 CSS pixels as a useful test set, plus actual devices. Verify that document width does not exceed viewport width. Deliberately oversized artwork should be clipped inside the stage, not create horizontal page scrolling. Cursor parallax is absent on touch; ambient background movement can remain if reduced motion is not requested.

<a id="s17"></a>
## 17. Use modern CSS where it helps

| Feature | Role here | Fallback |
| --- | --- | --- |
| `animation-timeline` + `animation-range` | Map story position to keyframes | Paused animation with negative delay |
| Typed `attr()` | Read a heading line index from `data-line` | Inline `--line` |
| `interpolate-size: allow-keywords` | Enhance native service disclosure height transitions | Native opening/closing |
| `calc-size()` | Not needed by the implemented effects | Do not add it without a sizing calculation |

`allow-keywords` is a value of `interpolate-size`, not a property. The current disclosure enhancement is scoped to `.services`, checks both property and `details::details-content` support, and transitions from zero height to `auto`. It is not responsible for the cinematic scene motion. See [interpolate-size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size).

Typed `attr()` is guarded like this:

```css
@supports (z-index: attr(data-line type(<number>), 0)) {
  .story-line { --line: attr(data-line type(<number>), 0); }
}
```

The current component also sets `--line` inline. That inline declaration wins in the cascade, so the project retains a working numeric value regardless of typed `attr()` support. If you want the attribute to become the actual source of truth, remove the inline value only after providing and testing another fallback. See [typed attr()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/attr).

`calc-size()` supports calculations involving intrinsic dimensions; it does not improve a transform or make an animation smoother simply by appearing in the stylesheet. Consider it only for a design requiring intrinsic-size arithmetic. See [calc-size()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/calc-size).

Avoid hardcoding browser-version claims into your architecture. Test capabilities and actual behavior in target browsers; feature detection alone does not prove the complete scene renders correctly.

<a id="s18"></a>
## 18. Accessibility and motion controls

The implemented reduced-motion path is a different readable layout:

- Remove the sticky story height and show three normal-flow sections.
- Remove scene transforms and ambient camera animation.
- Give each section its own static background.
- Keep all scene content accessible; do not mark the static worlds inert.
- Disable scene input interception and use direct navigation to the static sections.
- Hide timeline-specific scene controls while retaining useful page navigation.

In animated mode, inactive worlds receive `inert`, preventing invisible links from entering the tab order. Decorative images use empty `alt` and their containers are hidden from assistive technology. Meaningful copy remains HTML. Use one main H1, section H2s, button labels, focus-visible styles, and `aria-current` for navigation.

Monitor preference changes with `matchMedia(...).addEventListener('change', ...)`, not just once at page load. The controller must be recreated with the new mode, and effects must clean up correctly.

For a public production version with indefinite ambient motion, add a visible Pause motion / Resume motion control and include that state in `data-camera-enabled`. The current concept has automatic pausing and OS reduced-motion support but **no explicit on-page pause control**. Do not claim full accessibility conformance on that basis. The [W3C explanation of Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) describes user control for qualifying automatic movement lasting more than five seconds alongside other content.

Also verify keyboard access through the whole page, text at zoomed sizes, contrast over moving imagery, and touch targets. If artwork communicates essential information rather than atmosphere, provide an appropriate text alternative instead of treating it as decoration.

<a id="s19"></a>
## 19. Performance and loading

Optimize in this order: image dimensions and compression, number of decoded layers, animation paint cost, then JavaScript overhead.

1. Load the first background promptly. `index.html` preloads it, and the first background/object use high fetch priority. Avoid preloading every asset indiscriminately.
2. Have the incoming scene decoded before it is needed. The current three-scene app mounts all images without lazy loading. For a larger story, preload/decode the next scene and provide a usable loading state rather than a blank transition.
3. Prefer transform and opacity for large layers. Profile blur: a large moving blurred backdrop can require expensive rendering.
4. Keep continuous pointer/progress values outside React state. Batch reads/writes per frame and clean up listeners.
5. Pause ambient movement when hidden or outside the experience. Do not start an unconditional JavaScript animation loop merely to drive a CSS camera.
6. Use `will-change` only when justified by measurement. Permanently promoting every large image can increase memory pressure.

A rough uncompressed RGBA estimate is `width × height × 4` bytes. A 1672×941 image is about 6 MiB by that estimate; a 1254×1254 image is also about 6 MiB. Eight compressed files totaling under 2 MB can therefore occupy tens of megabytes after decoding, with additional compositor surfaces beyond that estimate.

Use the browser Performance and Network panels on an actual target device. Inspect dropped frames, long tasks, decoding delays, paint activity, and memory. A successful production build proves bundling, not smooth 60 fps. This project has no published cross-device frame-rate guarantee.

<a id="s20"></a>
## 20. Test and diagnose problems

### 20.1 Automated checks already supplied

```sh
npm run build
node scripts/scene-navigation.test.mjs
```

The eight tests cover oversized wheel bursts, identical click/wheel trajectories, input during locking, trackpad inertia, small deltas, studio boundaries, reduced motion/modifier/editable cases, and touch/cleanup. They use a controlled environment for navigation logic; they do not render CSS, validate cutout quality, or measure real-device performance.

### 20.2 Manual test sequence

1. Open the first scene and keep the pointer still: the background should move slowly by itself.
2. Move the pointer to each corner: the object should respond slightly; text should remain stable.
3. Use one wheel gesture, then a long rapid burst: each gesture should advance only once.
4. Use the arrow and numbered buttons: duration and destination should match wheel navigation.
5. Reverse through all scenes. Observe the middle of each crossing for empty sky, double silhouettes, or sudden resets.
6. Remain on each scene for a complete camera cycle to inspect its reversal and edges.
7. Enter the studio: background animation should pause and ordinary downward scrolling should work.
8. Test mobile swipe, pinch, horizontal gesture, keyboard, open menu, and form typing.
9. Reload directly on each scene fragment; resize while a transition is running.
10. Test reduced motion and a browser/fallback mode without native scroll timelines. Inspect static section navigation as well.
11. Test slow loading, failed image requests, narrow screens, and short landscape screens.

Useful read-only browser-console inspection:

```js
[...document.querySelectorAll('.world-camera')].map(image => ({
  loaded: image.complete && image.naturalWidth > 0,
  transform: getComputedStyle(image).transform,
  playState: getComputedStyle(image).animationPlayState,
  opacity: getComputedStyle(image.parentElement).opacity,
}));
document.documentElement.scrollWidth > window.innerWidth;
```

Compare camera transforms a few seconds apart without scrolling. Inspect parent transforms separately to confirm the clocks remain independent. For fallback testing, use a controlled development fixture or a target browser lacking support; changing only the JavaScript feature flag while leaving the native CSS `@supports` branch active is not a valid fallback test.

### 20.3 Troubleshooting table

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Object is surrounded by a rectangle | No actual alpha, or a flattened export | Inspect metadata and composite over contrasting colors |
| Ring hole shows old sky | Inner opening was not masked | Correct inner alpha and re-export |
| White fringe | Background color contaminated the edge | Refine edge color/mask, inspect at actual display size |
| A second object remains behind | Object not removed from the clean plate | Reconstruct the background fully |
| Flat cut edge appears during exit | Hidden object portion was never reconstructed | Complete the cutout before animation |
| Background jumps at loop end | Repeating `from → to` without reversal | Use continuous matching endpoints or `alternate` |
| Camera disappears during scroll | Both systems write the same transform | Use outer scroll wrapper and inner camera image |
| First scene unexpectedly fades early | Wrong timeline range/inset or scroll-padding interaction | Verify measured travel and explicit inset |
| Multiple slides skip on a trackpad | Input is queued or momentum treated as a new gesture | Restore lock, consumed gesture, and quiet-gap logic |
| Background edge becomes visible | Too little scale margin or wrong transform origin | Recalculate overscan and inspect every extreme |
| Invisible links receive focus | Opacity alone used to hide a scene | Apply `inert` to inactive animated content |
| Static mode loses scenes | Inert flags/sticky positioning remain enabled | Implement the entire reduced-motion layout branch |
| Navigation feels delayed | Debounce used before the first action | Use a leading-edge response and discard extras |
| Direct fragment opens wrong place | React target did not exist at initial lookup | Restore the hash after mount using controller geometry |
| Scene feels pasted together | Light, grain, viewpoint, or material mismatch | Fix artwork before tuning animation |
| Portrait layout overflows | Desktop object/text dimensions escaped the clip | Recompose mobile and inspect document width |

<a id="s21"></a>
## 21. Replace imagery or add a fourth scene

### Replace one scene without changing the architecture

Keep its roles and filenames initially. Prepare a complete background, main object, and optional foreground. Match transparent padding and aspect ratios or retune CSS sizing. Export, reload, verify the static composition, then inspect every scroll and camera extreme. Update copy, alt semantics, generation prompts, and provenance. Do not assume a new silhouette fits the old path.

### Add a fourth scene

The present component is explicitly authored for three scenes; adding an array entry alone is insufficient.

1. Add the asset sources, WebPs, prompts, and export-script names.
2. Add the scene definition, anchor, markup, camera path, static reduced-motion background, and copy tracks.
3. Redesign timeline allocation. For four scenes, three transition windows can occupy thirds. For transition index `i = 0, 1, 2`, map local progress `q` using `p = (i + q) / 3`.
4. Convert existing keyframe milestones to the new windows. If using the existing 0–50% first transition as a template, recover its local coordinate first (`q = oldPercent / 50`). Do not merely append keyframes beyond 100%.
5. Choose new stops inside each settled interval, recalculate anchor positions, and adjust story height to preserve useful travel distances.
6. Replace the hardcoded `.25/.75` active-scene thresholds in `App.jsx` with the new boundaries or a data-driven mapping. Also update the current fixed studio/project active indices `3` and `4`; these must move to `scenes.length` and `scenes.length + 1` in a generalized version.
7. Update reduced-motion anchor fractions, next/previous behavior, progress UI, and tests. The controller builds its stop list from `scenes`, but the CSS and active-state calculations are not fully generic.
8. Recheck memory/loading. A longer story benefits from loading adjacent scenes and pausing fully hidden layers without resetting their phase.

Treat every intermediate scene as both incoming and outgoing. A middle scene needs a through-track; an entrance-only track will never leave correctly.

<a id="s22"></a>
## 22. Build and publish

```sh
npm run build
npm run preview
```

Open the address printed by preview and repeat the essential navigation/image checks. Deploy the generated `dist/` contents to a static host. The development server is not the production deployment.

The current paths begin with `/images` and `/fonts`, assuming deployment at the origin root. Hosting under `/portfolio/` requires a deliberate Vite base-path and asset-path strategy; setting only one of them may still leave hardcoded CSS/JS image paths pointing at the wrong location.

Update title, description, favicon, social sharing metadata/image, and the provisional identity. Source fonts should keep their license notice. Hashed built JS/CSS can receive long-lived immutable caching; stable filenames in `public/images` need versioning or suitable cache invalidation when replaced.

The brief form currently validates and **downloads a local text file**. It does not send a message. For a real contact workflow, separately implement a backend/form service, server-side validation, abuse protection, delivery/error states, and appropriate user-facing privacy information. Never put private service credentials in client-side code.

Understand Anything and design-authoring tools are development aids, not runtime dependencies of this site. A visitor needs only the built static site. [Installation notes](understand-anything.md) describe the author's local tooling separately.

<a id="s23"></a>
## 23. Implementation order and acceptance checklist

Work in this sequence; each checkpoint isolates a class of errors:

| Step | Work | Pass condition before continuing |
| --- | --- | --- |
| 1 | Storyboard, copy, palette, lighting | Scenes belong to the same visual world |
| 2 | Background, cutout, foreground | No duplicate object, missing pixels, or false transparency |
| 3 | Static wide and mobile compositions | Text readable; object shape and foreground overlap work |
| 4 | Sticky stage and progress math | Progress reaches 0 and 1 at the intended positions |
| 5 | First two-scene choreography | Forward/reverse crossing works without gaps |
| 6 | Third scene and through-tracks | Second transition repeats the intended rhythm |
| 7 | Shared input controller | Wheel and button use identical duration/destination |
| 8 | Throttle, touch, keyboard | No queued skips; native input remains available outside story |
| 9 | Cursor response | Small, smooth movement; no transform conflict |
| 10 | Ambient camera | Continuous subtle drift, safe edges, clean reversal |
| 11 | Reduced motion and controls | Static content complete; hidden controls cannot be focused |
| 12 | Compression and production test | Assets load, tests pass, device performance acceptable |

Do not tune all motion parameters at once. First timing, then travel, then scale/rotation, then text separation, then camera amplitude. Keep a known-good version of the artwork and choreography so a visual regression is easy to isolate.

<a id="s24"></a>
## 24. Parameter reference, glossary, and source map

### Current parameters

| Parameter | Value | Edit location |
| --- | --- | --- |
| Scene transition | 1800 ms | `SCENE_MOTION.duration` |
| Fixed post-transition pause | 0 ms | `SCENE_MOTION.pause` |
| Wheel gesture quiet gap | 180 ms | `SCENE_MOTION.gestureGap` |
| Gesture threshold | 32 normalized pixels | `SCENE_MOTION.threshold` |
| Story height | 580svh / mobile 520svh | `motion.css` |
| Scene stops | 0 / .44 / .94 | `scenes` in `Worlds.jsx` |
| Active boundaries | .25 / .75 | `App.jsx` |
| Cursor smoothing | 700 ms | `.world-object img` |
| Camera one-way durations | 18 / 22 / 20 s | Backdrop custom properties |
| Camera scales | 1.06–1.16 across paths | Camera keyframes |
| WebP settings | quality 88, alphaQuality 100, effort 6 | `prepare-assets.mjs` |

### Glossary

**Clean plate:** scenery with the subject removed and hidden pixels reconstructed. **Alpha:** per-pixel transparency. **Mask:** editable visibility information used to isolate a layer. **Scrim:** a subtle overlay supporting text contrast. **Overscan:** extra image coverage beyond the visible frame. **Parallax:** different apparent movement at different depths. **Timeline:** mapping from progress to animation states. **Throttle:** limiting accepted actions while rejecting excessive input. **Debounce:** postponing an action until input has quieted. **Inert:** making a subtree unavailable for interaction/focus. **Fallback:** an alternative implementation used when a capability is unavailable.

### Where to continue

- [motion.css](../src/motion.css): full authoritative keyframes, camera paths, mobile and reduced-motion rules.
- [Worlds.jsx](../src/Worlds.jsx): complete markup, pointer lifecycle, camera visibility lifecycle.
- [App.jsx](../src/App.jsx): mounting, feature detection, scene state, deep links, shell.
- [sceneNavigation.js](../src/sceneNavigation.js): complete navigation algorithm.
- [Navigation tests](../scripts/scene-navigation.test.mjs): executable behavior examples.
- [Motion notes](motion.md), [third-scene assets](afterglow-assets.md), [design system](../DESIGN.md), [prior verification scope](verification.md).

The code is the reference for exact values. When changing a stop, asset, keyframe, or timing, update both language versions of this guide and the focused motion notes so the documentation remains reproducible.
