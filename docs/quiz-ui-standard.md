# Quiz UI standard

One frame for all five quiz games — Balls in the Ballpark, Before the
Bulb, Name Quest, Animal Outsider, Twin Terms — and one set of play
modes. The frame is the shared module set in
`app/components/QuizShell.jsx` (`MinimalTopBar`, `GameResults`,
`GameFooter`, styles in `quiz-shell.css`) plus the shared reveal
(`app/components/ResultReveal.jsx`). No game re-implements the frame;
a game fills the slots and keeps its own content, accent, photos,
question wording, answer data, and content-selector options.
Tango Cards (collecting), Marble Battles (a simulation), and Spin Draw
(a drawing toy) are not quizzes: they live in their own home section
and keep their own controls. The standard below governs the five
quizzes. The mobile set is formalized; the desktop set is not yet
formalized, and its section at the end records current behavior only.

## The frame, top to bottom

With the settings menu collapsed, the whole quiz — question plus all
choices — is visible without scrolling on a 390×844 phone. That is the
fit rule, and it outranks any single element's size: if a game's content
cannot fit under it, the content shrinks (see the open decision on Bulb
art below); the frame does not grow.

1. **Top row: `MinimalTopBar`.** One row: ✕ back to all games, the
   shell's own settings dropdown, and a ✓ score (lives appended in
   3-lives mode). Every setting a game has (play mode, and its content
   selector: category, content pool, difficulty, game mode, level)
   lives in the dropdown, closed by default, with the current choices
   summarized on the toggle. The summary is always
   "{primary content} · {play mode}" — the content selector first,
   play mode second ("Mixed · Endless", "Curated · Endless",
   "Easy · Endless"); a game with no content selector summarizes
   play mode alone. Menu groups run content-first, then Play mode,
   each group a `.qs-menu-group` with a `.qs-menu-label` naming the
   group and a `.pf-pill-group` with the options; the group label and
   the pill group's aria-label say the same thing. Start over lives
   inside the menu, after the groups. Picking a setting collapses
   the menu again and resets the score, exactly as a visible control
   row did. No kicker, no tagline, no separate picker rows.
2. **Round label.** One small-caps line, `.qs-round`: "ROUND N"
   ("ROUND N of 10" in 10-question mode). 12px, weight 800,
   letter-spacing 2px. The label is shared chrome, so the word is the
   same in every game; a game's own voice lives in its content, not
   in the frame. Every quiz game tracks a streak (consecutive correct
   rounds); a wrong answer or give-up resets it.
3. **Question.** One `h1` with `.qs-question` in every game, centred,
   `clamp(24px, 3vw, 32px)`. No flavor eyebrow, no instruction
   paragraph; the choices carry the meaning. The question is the
   heading; the thing being asked about (a name, a pair of words, a
   set of animals) is the game's content below it.
4. **Choices.** Game-owned layout, under the fit rule. Choice controls
   are at least 44px tall. Every choice button also carries
   `.qs-choice`, the shared hover/active token (lift, border change,
   press, focus-visible ring, 150–300ms); a game's own hover rule may
   set a stronger lift or border, but no choice is without feedback.
5. **Reveal.** Two beats, one shared module (`ResultReveal`). First
   the verdict lands on the board where the player tapped: the
   picked choice marks itself right or wrong in place (winner
   marked, the other side dims) and the whole page floods with the
   verdict colour — the Kahoot pattern (Kai 2026-11-19: the question
   does not fit one screen, so a bottom sheet made no sense). A beat
   later (400ms) the feedback overlays the screen: the answers sit
   on top of the options, not beneath them. `ResultReveal` is a fixed
   overlay covering the whole viewport, the verdict colour flooding
   it, its content scrolling internally when taller than the screen,
   and Next pinned to the bottom of the viewport — always visible,
   never below the fold. The reveal carries only new learning, reacts
   to the player's choice, and does not repeat board photos/labels
   or quote the question. A game adopts it by filling the slots
   (verdict, title, answer, media, brief, details, Next); the reveal
   owns the hero, the beats, and the footer. The verdict hero is the
   heading itself — one big word, "Correct" / "Incorrect", with the
   mark — and the body shows the answer complete without opening
   anything: Balls shows both sides' scale and detail (correct side
   first, each labeled by its short); Bulb shows both dates and
   descriptions. Long content sits behind the module's "Dive deeper"
   button — the one label in every game, shown only where a game has
   long content (Bulb's sources, Outsider's family tree, Balls'
   notes); games with no long content show no button. The module
   owns the toggle state (reset each round). The reveal advances only
   via its Next button, which reads "Next round" in every game; when
   the game is over it reads "See results" instead.
6. **Results screen.** One shared module (`GameResults` in
   QuizShell.jsx): kicker "10 rounds done!" (10-question mode) or
   "Out of lives!" (lives mode), heading "Here is how you did.",
   big 64px score "N / M right", Play again (primary). No mode-note
   restating the score, no spark.
7. **Footer.** One shared module (`GameFooter` in QuizShell.jsx):
   tagline "Made for curious minds", pool label (one count + noun —
   "212 subjects", "336 inventions"), and the collapsed photo-credits
   list built from the game's own images data.

### Sizes (≤600px)

- Top row: 44px exit target, 36px dropdown toggle (12px, weight 700),
  16px score. Gaps: 8px.
- Round label: 12px. Question: `clamp(24px, 3vw, 32px)`, centred.
- The row fits one row at 390px width, and at 375px with the 16px page
  padding below.
- Small text: 12px for labels (round, menu, card status), 13px for the
  results kicker, 14px for detail and body text inside the reveal.
  Frame small text uses #4a5a4f — 7.2:1 on the cream paper, 6.5:1 on
  the leaf verdict tint — so the 12px labels keep a clear margin above
  the 4.5:1 bar instead of sitting just above it.

### Page padding (phones, ≤600px)

Shell pages: 16px sides, 16px top, uniformly. No per-game padding.

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

- **Top row**: `.qs-top` in the shell (44px exit, centred dropdown,
  score).
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
- **Page titles**: "{Game} | Whimsical Quiz Portal" in every game
  (via `pageTitle` in `lib/names.mjs`).

### Home sections (`lib/apps.js`)

Each app carries a `section` field. The home page renders Quiz games
first — Balls in the Ballpark, Name Quest, Animal Outsider, Before the
Bulb, Twin Terms — then Non-quiz games — Tango Cards, Marble Battles,
Spin Draw.

### Open decisions (mobile)

- Bulb's stacked 16/10 card art fits the fit rule at 844px and taller
  (including a Pro Max) but not at 667–740px. Options: cap mobile art
  height (around 150px, still cropped) or accept scrolling on smaller
  phones. Decision open; the card design is unchanged until it is made.

### Adoption

All five quiz games use the frame, keeping their own content and
accents. Content boxes — image+text, image-only, and text-only, in
question, option, and answer slots, at every count — are governed by
`docs/quiz-box-standard.md`.

## Desktop UI standard

Not yet formalized. Current behavior, recorded not blessed: the same
shell structure at desktop sizes (one top row, centred question,
880px column, 2px card borders, 24–32px page padding); row 1 currently
centered at 1176px via globals.css. Formalize after mobile.

## Exceptions (not quizzes)

- Marble Battles keeps Restart in its controls and has no play modes;
  it is a simulation, not a quiz.
- Tango Cards has no rounds, so no Start over and no play modes.
- Spin Draw has no rounds, so no Start over and no play modes.
