# macOS Tahoe (26) Emoji Picker — Visual & Behavior Spec

Target: the small floating Character Viewer panel invoked with **Control+Command+Space** / **Fn+E**
(the collapsed "Emoji & Symbols" popover), NOT the full Character Viewer window.

## 0. Sources & confidence

- Primary visual reference: `ref-light-panel.jpg` — screenshot of the mini panel, May 2026
  (macOS Tahoe era), light mode. All pixel measurements below are taken from this
  439×499 screenshot; the panel content measures **356×404 px** in it.
- **Scale assumption:** the screenshot is at CSS-pixel scale, so **1 image px = 1 pt**.
  Scale every value below linearly to your target size (e.g. ×1.25).
- Tahoe did **not** visually redesign this panel vs. Sequoia/Sonoma: no Tahoe coverage
  documents any emoji-picker redesign, and the Tahoe-era screenshot matches the
  long-standing design. "Liquid Glass" did not change this panel's layout; it uses the
  standard popover material.
- Behavior facts are from Apple's current support doc "Use emoji and symbols on Mac"
  (which references macOS 27) plus a third-party spec that documents the built-in
  picker's exact dismiss behavior.
- **Dark-mode mini-panel colors are ESTIMATED** (from the dark full Character Viewer,
  `ref-dark-full-viewer.png`, Big Sur+ era). No Tahoe-era dark mini-panel screenshot was
  obtainable. Verify against a real Tahoe dark screenshot before finalizing dark mode.

## 1. Window / panel

| Property | Value |
|---|---|
| Type | Borderless popover-style floating panel (NSPopover-like), non-activating |
| Content size | **356 × 404 pt** |
| Corner radius | **~12 px**, all four corners |
| Border | None (hairline implied only by the shadow) |
| Shadow | Soft drop shadow, ~10–14 px blur, black ~25–30% opacity |
| Nub (popover arrow) | Small triangle on the **top** edge, centered: **23 px wide × 10 px tall**, same material as panel (panel usually opens below the caret, arrow points up at the anchor) |
| Title bar / close button | **None.** (The ✕ top-left + keyboard icon top-right belong to the pre-Big Sur design — do NOT copy.) |

Background material (light mode): translucent warm light gray. Sampled flat (composited over
white): **`#E0DCD8`**. For CSS, use this as the opaque approximation, or
`rgba(224,220,216,0.92)` with a `backdrop-filter: blur(20px) saturate(1.4)` to fake vibrancy.

Background (dark mode, ESTIMATED): dark popover material ≈ **`#333337`** opaque
approximation (verify on real Tahoe).

## 2. Search field

- Position: top of panel, **11 px** below the panel top edge (below the nub), **8 px** side margins.
- Size: **~340 × 40 px** outer, including focus ring.
- Shape: rounded rect, corner radius **~10 px**.
- Fill (unfocused): slightly darker inset than panel — sampled **`#D4D0CD`**.
- Focus ring: **3 px**, color = **system accent color**. (Reference screenshot's user has a
  purple accent — sampled `#AE88B1`. macOS default accent is blue `#0A84FF`; support the
  accent color as a variable.)
- Magnifier icon: SF Symbol `magnifyingglass`, left inside the field, dark gray.
- Placeholder text: **"Search"**, gray `#8E8E93` (standard), SF Pro ~13 pt.
- Typed text: SF Pro ~13–14 pt, near-black `#1A1A1A`.
- Clear (×) button appears at the right end of the field whenever text is present.
- Behavior: live-filters the grid by emoji name/keywords as you type; **↓** moves focus
  into the grid; **Esc** clears the text first, then dismisses the panel.

## 3. Category bar (bottom)

- Position: bottom of panel; icon glyphs vertically centered **~20 px** above the panel
  bottom edge (glyph band ≈ y 424–442 in panel coords).
- **No separator line, no distinct bar background** — icons sit directly on the panel bg.
- **10 items**, ~**35 px** pitch, laid out left→right (see `ref-category-bar.png`):

| # | Icon (SF Symbol style, outline) | Category |
|---|---|---|
| 1 | Clock (`clock`) | Frequently Used |
| 2 | Smiley face (`face.smiling`) | Smileys & People |
| 3 | Bear/panda (`pawprint` style animal face) | Animals & Nature |
| 4 | Apple (`applelogo`-like fruit) | Food & Drink |
| 5 | Soccer ball (`soccerball`) | Activity |
| 6 | Car (`car`) | Travel & Places |
| 7 | Lightbulb (`lightbulb`) | Objects |
| 8 | Heart (`heart`) | Symbols |
| 9 | Flag (`flag`) | Flags |
| 10 | `»` double chevron | Expand → full Character Viewer window |

- Icon glyph size: **~14–16 px wide × ~18 px tall**, stroke ~1.5 px, SF Symbols outline style.
- Unselected: medium gray — sampled **`#6E6A67`** (range `#5B5754`–`#797572`).
- Selected: **system accent color** (sampled purple on reference machine; default blue).
- Behavior: click switches the grid category. The clock (Frequently Used) is the default view.

## 4. Emoji grid

- **6 columns**, pitch **~54 px**. Column centers (panel coords, panel left edge = x 41):
  80, 135, 187, 240, 294, 350.
- Grid area: x ≈ 53→377, y ≈ 104→418 (above the category icons; below the search field).
- Emoji glyph: **~30×30 px**, Apple Color Emoji rendering.
- Scroll: single continuous vertical scroll region; thin **overlay scrollbar** on the right
  (~x 388, **~5 px** wide, dark gray `#8E8E8E` @ ~60%, appears only while scrolling).
- Content order (collapsed mode, per Apple docs): **recently used** emoji at the top, then
  **favorites**, then the selected category's emoji. (The reference screenshot shows no
  visible section headers in the mini panel — headers are not rendered; it reads as one
  continuous grid.)
- Cell states:
  - **Hover / keyboard focus:** rounded rect **~50×50 px**, radius **~10 px**, fill = accent
    color at low opacity. Sampled composited value over light bg: **`#DFCFE3`**
    (lavender). Implement as `accent @ ~18% opacity` over the panel bg.
  - **Pressed:** slightly darker (accent @ ~28%).
  - No visible focus ring beyond the hover fill; arrow-key navigation moves the same
    lavender highlight cell by cell (wraps at row ends).

## 5. Skin-tone / variant selector

- **Click-and-hold** (or right-click) an emoji that has variants → a small popover appears
  showing the variants (5 skin tones) in a horizontal row of ~44 px cells, same panel
  material, ~12 px corner radius, positioned just above/beside the held emoji.
- Releasing on a variant inserts it. (Per Apple: "To see variations of an emoji — like
  different skin tones — click and hold the emoji in the viewer.")

## 6. Genmoji entry (Tahoe / Sequoia 18.2+)

- In supported apps (e.g. Messages, Mail), the Character Viewer exposes a **Genmoji**
  entry point ("emoji+" / sparkles symbol) for generating custom emoji with Apple
  Intelligence (confirmed for Tahoe by Tom's Guide: "when Character Viewer appears,
  select the emoji+ symbol").
- Exact position in the mini panel was **not visible** in the reference screenshots —
  flag for verification on a real Tahoe machine before implementing.

## 7. Behavior

| Aspect | Behavior |
|---|---|
| Invocation | `Control+Command+Space`, or `Fn+E` / `Globe+E`. Typing a word then `Fn+E` shows inline emoji suggestions; `Return` accepts the top match. |
| Placement | Appears near the **text caret** (insertion point) of the previously focused app. |
| Focus model | Non-activating panel: the target app keeps its insertion point; typing goes to the panel's search field. |
| Insert (collapsed panel) | **Single click** inserts the character at the caret **and dismisses the panel**. (Double-click is only required in the expanded full-window mode.) |
| Dismiss | `Esc`, click outside the panel, or successful insertion. |
| Multi-insert | Not supported by the built-in panel — it closes after each pick. (Deliberate macOS behavior; keep for fidelity.) |
| Keyboard | `←→↑↓` move the lavender highlight; `Return`/`Enter` inserts the highlighted emoji; typing filters via search. |
| State memory | Remembers the last selected category across invocations (long-standing behavior). |
| Frequently Used | Updates automatically from usage; clearable only via the expanded window's Action menu (⋯ → Clear Frequently Used Characters). |
| Expand (`»`) | Opens the **full Character Viewer window**: sidebar categories, search, large preview pane with emoji name, "Add to Favorites" button, and "Font Variation" section. |

## 8. Typography & iconography

- UI font: **San Francisco (SF Pro Text)** — proprietary Apple font, cannot be redistributed.
- Closest free metric-compatible fallback for Windows: **Inter**
  (open-source, SF-similar metrics and feel). Font stack:
  `"Inter", "Segoe UI", system-ui, sans-serif`.
- Category icons: **SF Symbols** outline style (~1.5 px stroke, rounded). On Windows,
  redraw as inline SVG in the same outline style — do not use filled icons.
- Sizes: search text 13–14 pt; there is almost no other text in the mini panel
  (no section headers, no labels — icons only).

## 9. Color summary

### Light mode (sampled from reference — use as-is)
| Element | Hex |
|---|---|
| Panel background | `#E0DCD8` |
| Search field fill | `#D4D0CD` |
| Search focus ring | accent (`#0A84FF` default; ref machine used purple) |
| Hover/keyboard selection | accent @ ~18% → composites to `#DFCFE3` on light bg |
| Category icon (unselected) | `#6E6A67` |
| Category icon (selected) | accent |
| Placeholder text | `#8E8E93` |
| Typed text | `#1A1A1A` |
| Scrollbar | `#8E8E8E` @ ~60% |
| Shadow | black, ~25–30%, 10–14 px blur |

### Dark mode (ESTIMATED — verify on real Tahoe before shipping)
| Element | Hex (estimate) |
|---|---|
| Panel background | `#333337` |
| Search field fill | `#242426` (darker inset) |
| Search focus ring | accent |
| Hover/keyboard selection | accent @ ~25% over panel |
| Category icon (unselected) | `#9A9AA0` |
| Category icon (selected) | accent |
| Placeholder text | `#6E6E73` |
| Typed text | `#F2F2F2` |

Dark estimates are anchored on the dark full Character Viewer chrome
(title bar `#272727`, content/sidebar `#1E1E1E`, search inset `#2D2D2D`).

## 10. Implementation notes for the Windows clone

1. All px values assume 1 px = 1 pt from the reference; scale linearly to the target size.
2. The single most recognizable traits: the **top nub**, the **inset search field with
   accent focus ring**, the **6-column grid with lavender hover**, and the **10-icon
   bottom bar with no separator**.
3. Render emoji with the system emoji font (after the Apple-font swap, Apple Color Emoji).
   Glyphs ~30 px in a 54 px pitch grid.
4. The panel must be topmost, borderless, with a real drop shadow; dismiss on
   focus loss (`Esc` / outside click / after insert).
5. Global hotkey takes over **Win+.**; insertion via clipboard-paste or SendInput Unicode
   into the previously focused window.
6. Open items needing a real Tahoe machine: dark-mode exact colors, Genmoji button
   position, whether category memory persists across reboots.
