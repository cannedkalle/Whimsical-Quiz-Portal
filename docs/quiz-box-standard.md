# Quiz box standard

Every quiz content box is one of three types, used in one of three
slots, with one of four counts in parallel. The protocol for a box
depends on all three — type, slot, and count — not on the game it
happens to sit in.

## Box types

### Image+text

An image with a label under or beside it, plus at most one short
secondary line (a value, a status, a "Pick this one"). This is the
default box for options and answers that have a picture.

- Image: 16/10, `object-fit: cover`, centered crop, lazy loading. If
  it fails to load, the figure hides itself and the box works with
  text alone. How the image sits in the card depends on the count
  (see Counts): 2 items use a flush banner — full card width, top
  corners at the card radius, square bottom corners, no padding
  around the image; other counts use an inset box with 12px radius.
- Padding: in a flush card the image carries no padding and the text
  below carries the card's side padding uniformly (Balls 24px
  desktop / 16px phone, Bulb 20px desktop / 16px phone), so label,
  value, and detail share one alignment edge in the option and in
  the reveal alike.
- Label: the subject's name, one or two lines, same size across
  counts. The label never shrinks to make room for more boxes.
- The image never carries text, never carries attribution on the
  card (credits live in the manifest), and never leaks the answer: no
  visible year or date where the answer is chronology, no diagram or
  chart with numbers that state the magnitude, no logo where the
  photo should carry it.

### Image-only

The image is the whole content; there is no label. Use it only when
the picture itself is the choice — pick the odd picture out, or a
picture question with picture answers.

- Same image rules as image+text (16/10, cover, lazy, hide on
  failure); the flush/inset treatment follows the count, as above.
- Because there is no text to name the choice, the box must carry a
  visible identifier: a letter or number badge (Bulb's choice letters,
  Outsider's choice numbers). Players need something to point at.
- Selection state must read without text: border change plus a
  checkmark on the box itself. No game uses this type yet; the rules
  exist so the first one matches the other boxes instead of inventing
  its own.

### Text-only

No image; the text is the whole content. Use it when the choice is
abstract (Twin Terms categories) or the subject has no picture.

- Label plus at most one short secondary line. Selection state comes
  from the box itself: border change plus the shared pressed
  checkmark (see the UI standard's shared chrome).
- No identifier badge needed — the text names the choice.
- Emoji rule (all types): where a photo loads, it replaces the
  emoji; where the image is absent or fails, the emoji shows as the
  fallback, never as decoration alongside the photo.

## Slots

### Question

One box, full width, above the question line, showing the thing being
asked about. Not interactive: no hover lift, no pressed state, no
pointer cursor. Largest image tier. No quiz game uses this slot yet;
the rule exists so the first one matches the other slots.

### Option

Interactive. Hover lift and border change, focus-visible ring, and a
disabled state after answering — dimmed, never removed, image
persisting. Selection shows on the box (border plus checkmark, or the
game's winner/loser treatment at reveal).

### Answer

Informational, not interactive: no hover. Answers render inside the
shared result dialog (`ResultDialog`); the boxes below are the
dialog's answer slots, and the reuse rules still govern them. Two cases:

- The answer is one of the options (Balls, Bulb, Outsider): the
  reveal reuses the option's box — same type, same image, same size
  tier, same position. The only changes are the added answer info
  (value, explanation, winner mark) and the disabled dimming. Nothing
  is redesigned, recropped, or resized between option and answer.
  In a two-sided reveal both sides stay visible; the loser is never
  hidden.
- The answer is a new box (Twin Terms, Name Quest: text options,
  picture answer): it follows the single-answer protocol — full-width
  16/10 band above the answer text. This is not a transition, so the
  minimal-change rule does not apply to it.

## Counts in parallel

### 1 box

Full-width 16/10 band on all sizes. Covers the question image and the
single answer box. A single band plus the question line fits a phone
screen; a single answer box may scroll, since the reveal is exempt
from the fit rule.

### 2 boxes

Flush banner at all widths: two-column grid on desktop, stacked
on phones. The image fills the card's top edge to edge and the text
below carries the card's side padding uniformly. Two is the flush
count: flush banners look better and two fit the screen; at 3+ the
same treatment would push content off-screen, so 3+ uses rows.
Phones cap the banner at 150px tall (cropped): a full 16/10 banner
is ~224px tall at 390px width, and two of them plus question, frame,
and Bulb's definition row pushed the second card off-screen live.
Desktop keeps the full 16/10 banner; the cap is a phone fit rule,
not a new ratio.

### 3 boxes

Desktop: three-column grid, band images (narrower columns, so
shorter bands). Phones: stacked rows, square thumbnails (the row
treatment, as in 4+).

### 4 or more boxes

Desktop: wrapping grid (Outsider: three columns, the fourth wraps to
a second row), height-capped bands (Outsider: 120px) so two rows stay
compact. Phones: stacked rows, square thumbnails. Full 16/10 bands at
this count would push content off-screen on desktop and break the
fit rule on phones.

## Adoption

- Balls in the Ballpark: image+text, option × 2 and answer × 2,
  flush banners at all widths — the first full adopter of this
  standard. Option and reveal share one layout: the value replaces
  "Pick this one" in its slot and the detail appends below, so
  nothing moves on click. Phone banners capped at 150px, as Bulb.
- Before the Bulb: image+text, option × 2, flush banners at all
  widths (the desktop photo box is now a banner like the phone one,
  and photo cards keep their full banner at reveal instead of
  shrinking), phone banners capped at 150px so two cards fit a
  phone screen. Its stylesheet was rewritten from scratch to this
  standard: no bare h1 rule, so the GameBar title is the shared
  18px, not Bulb's old 34px. Answer × 2 is text-only date blocks
  in a two-column grid.
- Animal Outsider: image+text, option × 4 in the 4+ protocol
  (height-capped bands desktop, square-thumbnail rows on phones).
  Its cards persist at reveal with only a status change, so it
  already satisfies the minimal-change rule. Photo radius is 12px
  (micro-fix done 2026-11-25: was 16px).
- Twin Terms: text-only options (categories, and four specific
  answers on give-up); image+text single answer box (band, 12px
  radius, fixed 16/10 ratio — micro-fix done 2026-11-25: was a
  max-height cap).
- Name Quest: text-only options; no image boxes yet — its image
  phase (reveal only) comes after Balls.
