# anna's alcove — Custom Halloween Artwork & Rebrand Plan

Transform the mobile photobooth beta into **anna's alcove**, featuring randomized and theme-synced full-screen Halloween backgrounds, streamlined welcome copy, custom color-matched strip backgrounds with character scenes anchored at the bottom footer, and larger white-bordered die-cut stickers created from your uploaded Hello Kitty and Charlie Brown artwork.

## User Review & Critical Decisions

> [!IMPORTANT]
> Your visual preferences from our quick check-in are locked into this plan:

- **Confirmed Decision 1 — Theme Lineup**: Keep **Midnight Booth** as a third classic option alongside **Hello Kitty Halloween** and **Charlie Brown Halloween**.
- **Confirmed Decision 2 — App Background Behavior**: Open the app by randomly choosing between the **Hello Kitty** or **Charlie Brown** Halloween background, and automatically sync the app's background whenever the user switches strip themes.
- **Confirmed Decision 3 — Uploaded Sticker Styling**: Automatically remove solid/artifact backgrounds from your uploaded character images and add crisp white die-cut sticker outlines with subtle drop shadows so they pop cleanly over grainy black-and-white photos.

---

## 1. Overview & Core Concept

- **What It Does**: **anna's alcove** is an installable iOS-ready analog photobooth beta that captures four vertical `1.5" × 1.8"` grainy black-and-white frames (kept unseen until chemically developed) and prints them digitally onto rich, illustrated Halloween strips ready to save directly to Apple Photos.
- **Target Audience**: Friends and party guests opening your shared beta link or QR code on their iPhones to shoot, customize, and save nostalgic film strips.
- **Key Value**: Replaces generic vector graphics and dark screens with your exact curated Sanrio and Peanuts Halloween illustrations, cohesive color palettes, and personal **anna's alcove** branding.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **RandomizedThemed Opening**: Every time a user opens **anna's alcove**, the app randomly selects either **Hello Kitty Halloween** or **Charlie Brown Halloween** as the starting theme and displays its matching full-screen illustrated backdrop behind a warm, legible frosted glass workspace.
  2. **Minimalist Welcome**: The Lobby greets visitors cleanly with **"Welcome to anna's alcove"** and **"make memories anywhere"**—removing the old technical metadata tags, long headline, and explanatory paragraph while keeping the theme switcher, Shuffle Stickers button, Step Into Booth CTA, Photo Library upload, sample roll, and iOS install/share tools immediately accessible.
  3. **Theme-Synced Studio**: Switching between **Hello Kitty Halloween**, **Charlie Brown Halloween**, and **Midnight Booth** smoothly cross-fades the app's ambient backdrop and live strip preview to match.
  4. **Blind 4-Pose Capture & Chemical Development**: Users take 4 unseen poses in the vertical `1.5" × 1.8"` booth mirror, watch the strip slide out and chemically develop, shuffle the larger die-cut character stickers if desired, adjust the Date + Year stamp, and save to Apple Photos.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Cozy nostalgic Halloween photobooth combining authentic grainy 35mm silver-gelatin portraits with warm storybook Sanrio and vintage 1966 Peanuts art.
  - *Color Palette & Mood*:
    - **Hello Kitty Halloween Palette**: Warm toasted pumpkin-amber (`#D97228`), roasted cocoa (`#4A2512`), and buttered popcorn cream (`#F7D7A8`) pulled directly from the movie-night couch scene (`--background`, `--surface`, `--accent`).
    - **Charlie Brown Halloween Palette**: Vintage dusty rose-blush (`#DFBEC9`), deep espresso-plum (`#2E1D24`), and autumn streamer orange (`#DF6E2B`) pulled directly from the Peanuts Halloween party scene.
    - **Midnight Booth Palette**: Classic darkroom obsidian (`#0C0B0E`), baryta ivory (`#F6F4EE`), and warm amber safelight (`#D4A359`).
  - *Typography & Hierarchy*: Expressive editorial serif (`Fraunces`) for **"Welcome to anna's alcove"** paired with clean readable sans (`Plus Jakarta Sans`) for **"make memories anywhere"** and controls, plus tabular monospace (`JetBrains Mono`) strictly for timers and the strip's Date + Year stamp.
  - *Component Styling & Layout*: Responsive 2-column desktop studio (`max-w-6xl`) and thumb-friendly iOS mobile layout (`>= 44px` touch targets, `<= 15%` compact top header) using translucent dark/warm glass surfaces with measured contrast scrims so foreground text always meets WCAG AA readability over the illustrated backgrounds.

- **Interactive Feedback & Motion**:
  - Smooth `<200ms` opacity cross-fades when switching themes and backgrounds.
  - Gentle compositor-only floating motion around the live strip preview using your uploaded character cutouts.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Strip Background Composition & Bottom Character Placement**:
  - *Chosen Approach*: Tiling/stretching a single portrait illustration across an `8.4"` tall strip would distort the characters or hide them behind the 4 photo frames. Instead, we compose each strip in two coordinated zones:
    1. **Upper & Side Strip Canvas**: Textured and tinted with the exact color scheme and upper decorative motifs (pumpkin garlands / party streamers) sampled from each background image.
    2. **Dedicated Tall Bottom Footer Scene**: Expanding the strip's bottom footer window so **My Melody, Hello Kitty, and Kuromi on the couch** (for Hello Kitty) and **the costumed Peanuts gang** (for Charlie Brown) are framed in full, unobstructed view right at the bottom of the strip alongside a high-contrast Date + Year stamp.
  - *Why*: Ensures the iconic characters from both background images are 100% visible at the bottom of the saved strip rather than covered up by the 4 black-and-white portraits.

- **Decision 2 — Smart Die-Cut Processing for Uploaded Reference Stickers**:
  - *Chosen Approach*: Run an offscreen canvas cutout pass (with result caching) on all 9 numbered character images—removing white/grey backdrops, cleaning out the black & blue compression blocks on the Wizard Charlie Brown + Snoopy sticker, isolating Vampire Snoopy cleanly from his maroon backdrop, and framing Linus's pumpkin patch scene as a die-cut contoured sticker—then adding a uniform crisp white sticker halo and soft shadow at **~1.35×–1.5× larger scale** than the previous small vector icons.
  - *Why*: Guarantees every uploaded JPG/PNG/WebP looks like a cohesive, authentic vinyl sticker overlapping the borders and photo corners without harsh rectangular boxes or compression artifacts.

---

## 4. Technical Architecture & Data Strategy

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     anna's alcove Application Shell                     │
│  • Random Initial Theme (Hello Kitty | Charlie Brown) on App Launch     │
│  • Theme-Synced Full-Viewport Backdrop + Measured Contrast Scrim        │
│  • Top Bar ("anna's alcove") + Install / QR Share Modal                 │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│      Lobby & Capture Experience       │ │   Custom Asset & Strip Engine │
│  • "Welcome to anna's alcove"         │ │  • Die-Cut Sticker Processor  │
│  • "make memories anywhere"           │ │    (Matte Removal + White     │
│  • Theme Switcher (3 Themes, Synced)  │ │     Contour + Cached Canvas)  │
│  • 1.5"×1.8" Blind Booth Viewfinder   │ │  • Strip Background Composer  │
│  • 5.6s Chemical Developing Chute     │ │    (Matched Palette + Bottom  │
└───────────────────┬───────────────────┘ │     Character Footer Crop)    │
                    │                     └───────────────┬───────────────┘
                    ▼                                     │
┌─────────────────────────────────────────────────────────▼───────────────┐
│                 Developed Strip Studio & iOS Photos Export              │
│  • Larger Randomized Character Overlays Across Borders & Photo Corners  │
│  • One-Tap "Shuffle Stickers", Live Theme Swap & Date + Year Stamp      │
│  • Native iOS Share Sheet ("Save Image") + Long-Press Save to Photos    │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Active Theme State**: Randomly initialized on mount (`Math.random() < 0.5 ? 'hello-kitty' : 'charlie-brown'`); drives both the ambient viewport theme tokens and the strip renderer.
  - **Cached Cutout Sticker Registry**: Memoized in-memory processed `<canvas>` / data-URL bitmaps for all 4 Hello Kitty stickers and 5 Charlie Brown stickers so shuffling stickers or switching themes re-renders in `<60ms`.
  - **Strip Layout Geometry**: Maintains the `1.5" × 1.8"` (`5:6` vertical portrait) frame proportions while giving the bottom footer chin generous vertical room (`~390px` at print scale) so the three couch characters (Hello Kitty) and dancing Peanuts characters (Charlie Brown) sit cleanly below Frame 4 with the Date + Year stamp.

- **Interactive Component & State Mapping**:
  - **Theme Selection**: Updates `selectedTheme` $\rightarrow$ smoothly transitions the full-page background artwork & surface palette $\rightarrow$ re-renders the active preview or developed strip with that theme's background palette, bottom footer scene, and die-cut sticker set.
  - **Shuffle Stickers**: Generates a new `stickerSeed` $\rightarrow$ re-scatters the larger character cutouts across asymmetric border and photo-corner slots while keeping portrait face centers clear.
  - **Branding & Install**: Updates PWA manifest, iOS home screen title, and QR invite copy to **anna's alcove** so anyone installing or receiving the beta link sees the new name everywhere.
