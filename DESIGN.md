---
name: MOTION — provisional concept
description: Immersive visual worlds with restrained controls and layered scroll transitions.
colors:
  peach: "#f3bbae"
  ink: "#282331"
  paper: "#fffaf5"
  muted: "#c9bfcc"
  line: "#5c5263"
  project-surface: "#342b3b"
  field-line: "#827189"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(74px, 7.6vw, 120px)"
    fontWeight: 800
    lineHeight: 0.99
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(36px, 4vw, 64px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(24px, 3vw, 40px)"
    fontWeight: 400
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  pill: "99px"
  circle: "50%"
  field: "0"
spacing:
  gutter: "clamp(24px, 5.5vw, 96px)"
  mobile-gutter: "24px"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "13px 23px"
  button-primary-hover:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "13px 23px"
  button-circle:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.circle}"
    width: "42px"
    height: "42px"
  chip-selected:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 15px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "11px 0 14px"
---

# Design System: MOTION

## Overview

**Creative North Star: "Impossible worlds"**

An immersive, cinematic visual world pairs oversized warm lettering with surreal imagery and quiet interface controls. Depth comes from independently moving background, object, foreground, and text layers. Content surfaces use spacious plum fields and simple ruled rows.

This document captures the implemented local React + Vite concept. MOTION is a provisional working identity; the North Star and descriptive color names summarize the existing direction, not permanent user brand preferences. The user-pinned reference is [wearebrand.io](https://wearebrand.io/), with English content and layered scroll transitions. Page composition and scene-specific imagery remain in the surface brief.

**Key Characteristics:**

- Full-bleed imagery with independently moving layers.
- Heavy Manrope display text and small, restrained navigation.
- Warm white and peach against deep plum interface surfaces.
- Outline pills, circular arrows, and thin ruled rows.
- Stepped scene navigation with an explicit reduced-motion presentation.

## Colors

Warm accents soften the deep plum interface and connect it to the photographic worlds. Frontmatter values are the normative extracted tokens.

### Primary

- **Soft Peach** (`peach`): emphasized headline words, selected service chips, focus outlines, selection, and form status.

### Neutral

- **Deep Plum Ink** (`ink`): page, fixed header on content sections, and dark text on light buttons.
- **Warm Paper** (`paper`): primary text, solid buttons, and active scene navigation.
- **Muted Lavender** (`muted`): supporting copy, footer metadata, and service descriptions.
- **Plum Rule** (`line`): service dividers and mobile navigation rules.
- **Raised Plum Field** (`project-surface`): the project brief section and select options.
- **Lavender Field Stroke** (`field-line`): inputs and unselected service chips.

## Typography

**Display Font:** Manrope, with sans-serif fallback.

**Body Font:** Manrope, with sans-serif fallback.

**Character:** A single geometric family creates continuity between expressive headlines and quiet practical controls. Two local font files supply regular and extra-bold weights.

### Hierarchy

- **Display:** extra-bold, tightly tracked, near-solid line spacing; world headlines use the frontmatter display role. Project headings use a separate fluid size (`clamp(58px, 6vw, 96px)`) with line height (1.03).
- **Headline:** the studio introduction uses the headline role.
- **Title:** service disclosure labels use the title role.
- **Body:** studio copy uses the body role with a maximum measure (48ch). Service descriptions use a smaller size (14px) and a maximum measure (60ch).
- **Label:** form labels and navigation use small regular text; scene numbers use tabular numerals. Case follows natural English.

## Layout

The shared fluid gutter aligns header, story copy, section content, and footer. Desktop content uses two-column studio and brief layouts, with wide gaps (10vw). The studio introduction weights its left column (1.2fr) against the copy column (1fr); the brief uses equal columns.

At widths up to (1000px), headings and object positions tighten. At (680px), navigation becomes a menu, content sections stack, and the gutter becomes fixed. At (370px), the form's two fields stack. Story layouts additionally adapt below viewport height (650px).

The visual story occupies a scroll range (580svh desktop, 520svh mobile) containing a sticky viewport stage (100svh). Backgrounds, isolated objects, foreground clouds, and individual heading lines follow separate progress tracks. The story uses native CSS scroll timelines where supported and a requestAnimationFrame progress fallback elsewhere. Normal document flow resumes for the studio and brief.

## Elevation & Depth

The interface is mostly flat. Tonal surface changes, thin borders, image overlays, and composited objects establish hierarchy. The mobile navigation alone uses an ambient shadow (`0 18px 24px #1b152530`) to separate its temporary panel. Image depth is intentionally stronger than control elevation.

## Shapes

Pill silhouettes belong to text buttons and service choices; circular outlines belong to directional controls. Inputs remain square and underline-only. Full-bleed story art clips at viewport boundaries. Content sections are open compositions, with no implemented card system.

## Components

### Buttons

Restrained controls leave room for the artwork. Solid buttons use warm paper and dark text; outline buttons use a translucent warm border. Both share pill geometry and horizontal icon spacing (22px). Hover changes color and lifts the pill (2px). Global keyboard focus uses a peach outline (2px) with offset (7px). Circular controls use a translucent hover fill and a downward translation (3px).

### Chips

Service choices are native radios wrapped in outlined pill labels. Selection fills the chip with peach and switches the label to dark ink. The focused radio exposes a peach ring around its label, offset (4px). Keep the radio semantics and selected visual state synchronized.

### Inputs / Fields

Fields use a transparent fill and a single lavender bottom border. Labels sit above the control with a gap (12px). Placeholder text is muted, textarea height is resizable within the implemented bounds, and selects use a dark native color scheme. Required and email constraints use native validation; submission feedback occupies a persistent status region. No custom disabled or error-color system is established.

### Navigation

Desktop links gain a thin underline on hover and active state. The mobile menu uses large ruled rows on deep plum; its button animates from two strokes into a close icon. Escape closes the open navigation and restores focus to its toggle. Scene navigation uses numbered buttons, an expanding active name, a circular next action, and a fine bottom progress rule. Active state is expressed through `aria-current` as well as color.

### Service Disclosures

Native disclosure rows use thin dividers and an inline plus that becomes a minus when expanded. Supporting copy remains muted. Intrinsic-height transitions are a progressive enhancement; the disclosure stays functional when that enhancement is unsupported.

### Layered Worlds

Each world separates scenery, a floating object, contrast scrims, headline lines, supporting copy, and a caption. Scroll animation uses a linear progress clock; control transitions use the shared easing curve (`cubic-bezier(.16, 1, .3, 1)`). Reduced motion removes the sticky transition and presents all three worlds sequentially, suppressing timeline navigation and animated transforms. Inactive animated worlds are inert to prevent hidden controls from receiving focus.

Background images carry an independent, slow camera movement inside their scroll-animated wrappers: 18 seconds for clouds, 22 for desert, and 20 for ocean, alternating with ease-in-out. Each path combines a small lateral drift with a gradual scale change and enough overscan to cover the viewport. Pause ambient movement outside the story, behind the menu, and in hidden tabs; remove it for reduced motion. Foreground objects retain their separate cursor response.

Optional PixiJS atmosphere adds small masked heat distortion in the desert and water ripples below the ocean horizon. Keep the sky, text and main objects crisp. Use one lazily loaded canvas inside the active camera wrapper, with bounded pixel density and render rate; pause rendering during transitions and fall back to the existing images on constrained devices or rendering failures. Full policy: `docs/pixi-effects.md`.

## Do's and Don'ts

### Do:

- **Do** align content and navigation to the shared gutter.
- **Do** preserve distinct scene layers when extending scroll transitions.
- **Do** keep readable scrims between image detail and foreground text.
- **Do** retain visible keyboard focus, native controls, and the reduced-motion layout.
- **Do** identify authored visual projects as concepts until real work is supplied.

### Don't:

- **Don't** turn the provisional MOTION identity into an asserted permanent brand commitment.
- **Don't** intercept scrolling outside the scene sequence or when reduced motion is enabled.
- **Don't** leave visually hidden scene controls keyboard-focusable.
- **Don't** imply the local brief download sends a message.


