# Quiz UI standard

Two separate sets: a mobile set and a desktop set. The mobile set is
formalized below and governs phone widths. The desktop set is not yet
formalized; its section at the end records current behavior only.

The five quiz games — Balls in the Ballpark, Before the Bulb, Name Quest,
Animal Outsider, Twin Terms — share one frame and one set of play modes.
Tango Cards (collecting) and Marble Battles (a simulation) are not
quizzes: they live in their own home section and keep their own controls.
The sets below govern the five quizzes.

## Mobile UI standard

The shell (`app/components/QuizShell.jsx`) is the single controller for
game chrome on phones. Games own their question content and choice
layout; the reveal is the shared inline module
(`app/components/ResultReveal.jsx`). Balls in the Ballpark pilots the
minimal frame (see the note under the frame list); the other four
games keep the frame below until their rollout.

### Frame, top to bottom

With the settings menu collapsed, the whole quiz — question plus all
choices — is visible without scrolling on a 390×844 phone. That is the
fit rule, and it outranks any single element's size: if a game's content
cannot fit under it, the content shrinks (see the open decision on Bulb
art below); the frame does not grow.

1. **Row 1: PortalNav.** Site title + icon on the left, Back to all
   apps on the right, one row. The row is flush with the game below:
   no side margins stack on the page padding. Bottom padding 12px plus
   border.
2. **Row 2: GameBar.** Game name + Start over + one options dropdown,
   in a single row. Every setting a game has (play mode, difficulty,
   content pool) lives in the dropdown, closed by default, with the
   current play mode shown on the toggle (e.g. "Endless"). The
   toggle shows the play mode only, consistently on all five
   quizzes; pool, difficulty, category, and level live inside the
   dropdown, not on the toggle — a toggle that lists every setting
   is a different width on every game and pushes the game name
   around (Bulb showed "Curated · Endless", Outsider "Easy ·
   Endless", Name Quest "Name types · Balanced · Endless").
   Picking a setting collapses the menu again and resets the score,
   exactly as a visible control row did. No kicker, no tagline, no
   separate picker rows.
3. **Status line.** One small plain-text line, never a box or a pill:
   "Round N · X right · Y played · streak Z", plus lives hearts and
   the word "lives" in 3-lives mode. 12px, muted, semibold,
   margin-bottom 10px. Every quiz game tracks a streak (consecutive
   correct rounds); a wrong answer or give-up resets it. Rounds are
   always numbered "Round N" ("Round N of 10" in 10-question mode),
   and the line shows the round being played, including during the
   reveal.
4. **Question line.** One row: the question itself, left-aligned
   ("Which came first?", "Which one is the outsider?", Twin's prompt).
   No flavor eyebrow, no instruction paragraph; the choices carry the
   meaning.

   **Minimal frame (Balls pilot, Kai 2026-11-19, Kombai Hoppo):** a
   photo round summed to ~890px of parts in an 844px viewport, so
   Balls drops rows 1–3 above for one top row: ✕ back to all games,
   the shell's own settings dropdown (mode, category, Start over
   inside it — the pills were already in the dropdown, never rows
   on the page), and a ✓ score with lives hearts in 3-lives mode.
   The status sentence becomes a small-caps ROUND N label above the
   question; the question is centred at 24px; the board card goes
   (no border, no padding), so the question and cards sit straight
   on the paper. Cards drop the "Pick this one" line, labels go
   20px to 18px, photos stay 150px. The other four games keep rows
   1–4 until their rollout.
5. **Choices.** Game-owned layout, under the fit rule. Choice controls
   are at least 44px tall; the game bar's 36px controls are the one
   deliberate exception, bought for the one-row bar.
6. **Reveal.** Two beats. First the verdict lands on the board where
   the player tapped: the picked choice marks itself right or wrong
   in place (winner marked, the other side dims), the score line
   updates, and the whole page floods with the verdict colour —
   the Kahoot pattern (Kai 2026-11-19: the question does not fit one
   screen, so a bottom sheet made no sense). A beat later the
   feedback block (`ResultReveal`) scrolls into view below the
   choices and focuses its hero title; it lives in the page flow,
   so it works at any page height, and the fit rule does not apply
   to it. The reveal carries only the learning — the verdict up
   front, then the right answer, revealed image if any, one brief
   explanation — and a game whose round has no learning content
   shows no reveal at all. One shared module
   (`app/components/ResultReveal.jsx`, styles in `quiz-shell.css`):
   a game adopts it by filling the slots (verdict, title, answer,
   media, brief, details, Next); the reveal owns the hero, the
   beats, and the footer. Trimmed by default (Kai 2026-11-19: the dialog
   showed too much all at once, then ruled the feedback must not
   repeat the board): in Balls the verdict hero is the heading
   itself — one big word, "Correct" / "Incorrect", with the mark —
   and the body shows only the correct choice, its short and scale
   as one flowing line, no photos, no cards, no full sentences.
   Each subject carries a `short` (max 3 words, action kept; the
   board keeps the full labels); the correct side's detail lines
   sit behind a "Show details" button under the line that reveals
   them on demand ("Hide details" to collapse again), reset each
   round. The verdict word is plain (Kai 2026-11-19: the kicker
   lines "You called it!" / "Plot twist!" were lame); the old
   `kicker` slot is gone. Its shape is the same in every game: big
   verdict first, content arriving in beats (hero, then the body,
   then the footer — the whole sequence under a second), and a
   Next footer in the flow. A "Dive deeper" button appears
   only where the game used to show a long explanation (Bulb,
   Outsider); games with no long content show no button. The reveal
   advances only via its Next button. Its Next button reads "Next
   round"; when the game is over it reads "See results" instead.
7. **Results screen.** Kicker "10 rounds done!" (10-question mode) or
   "Out of lives!" (lives mode), score summary, Play again (primary).

### Row 2 sizes (≤600px)

- Game name: 18px, weight 800.
- Start over: icon only, 36px button, aria-label "Start over".
- Dropdown toggle: 12px, weight 700, padding 6px 8px.
- Gaps: 6px. Bar margin-bottom: 8px.
- The row fits one row at 390px width, and at 375px with the 16px page
  padding below. At 601–760px the full row-2 layout applies (text Start
  over, 13px toggle), since width allows it.

### Page padding (phones, ≤600px)

Shell pages: 16px sides, 16px top, uniformly. No per-game padding.

### Row 1 flushness (≤760px)

Row 1's flush rule applies at ≤760px, the widest width where the old
nav margin appears. Above that, the desktop set will decide.

### Play modes (`lib/quiz-play.mjs`, same rules in both sets)

- **Endless** (default): play forever, the way these games always worked.
  No end screen.
- **10 questions**: exactly 10 answered rounds, then the results screen.
- **3 lives**: a wrong answer loses one of three lives; 0 lives ends the
  game with the results screen. A right answer never costs a life. In
  Name Quest a close answer counts as scored, so it costs no life.

Switching mode — or difficulty, where a game has one — always resets the
score, so one mode's results never mix with another's. Games keep their
own round engines; they share the pure rules in `lib/quiz-play.mjs`
(`nextLives`, `isGameOver`, `livesHeartStates`), covered by
`tests/quiz-play.test.mjs`. In Balls in the Ballpark, the no-repeat window
behind a fresh game lives for the whole page session, so Play again never
re-deals a recent matchup, while every deal stays an independent random
draw — no deck, no fixed sequence.

### Shared chrome (both sets)

The same control looks the same in every game. Game content keeps its own
accent (Bulb peach/blue, Animal leaf, Name Quest violet); only the chrome
is uniform.

- **Game title**: `.qs-bar-title` in the shell game bar (24px desktop,
  18px on phones).
- **Primary action**: `.pf-primary` (Next, Play again, See results).
- **Secondary button**: `.pf-btn` (Start over, Restart, difficulty
  choices, panel controls). Pressed rectangular buttons show the shared
  pressed checkmark; pills never do.
- **Mode picker**: `.pf-pill-group` + `.pf-pill`, text only. The green
  pill is the selection. Content mode, then play mode.
- **Icons**: one SVG set in `Icons.jsx` — back, restart, forward, lives
  hearts — used only where the icon carries meaning, and the same icon
  everywhere it appears. Pickers show text only; game content keeps its
  own decorative marks (Bulb's sparkles, Wild-guess winner marks).
- **Radii**: 12px small, 16px control, 24px card. Circles (50%) and
  progress bars keep their own shapes.

### Home sections (`lib/apps.js`)

Each app carries a `section` field. The home page renders Quiz games
first — Balls in the Ballpark, Name Quest, Animal Outsider, Before the
Bulb, Twin Terms — then Non-quiz games — Tango Cards, Marble Battles.

### Open decisions (mobile)

- Bulb's stacked 16/10 card art fits the fit rule at 844px and taller
  (including a Pro Max) but not at 667–740px. Options: cap mobile art
  height (around 150px, still cropped) or accept scrolling on smaller
  phones. Decision open; the card design is unchanged until it is made.

### Adoption (mobile)

All five quiz games use the frame, keeping their own content and
accents. Content boxes — image+text, image-only, and text-only, in
question, option, and answer slots, at every count — are governed by
`docs/quiz-box-standard.md`.

## Desktop UI standard

Not yet formalized. Current behavior, recorded not blessed: the same
shell structure at desktop sizes (24px bar title, text Start over,
13px toggle, 13px status, 24–32px page padding); row 1 currently
centered at 1176px via globals.css. Formalize after mobile.

## Exceptions (not quizzes)

- Marble Battles keeps Restart in its controls and has no play modes;
  it is a simulation, not a quiz.
- Tango Cards has no rounds, so no Start over and no play modes.
