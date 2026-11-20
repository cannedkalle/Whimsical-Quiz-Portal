'use client';

import { ArrowRightIcon, LivesHearts, RestartIcon } from "./Icons";

/* Shared quiz shell v2: the frame every quiz game shares. Two frames
 * live here. GameBar + StatusLine is the older frame (title row,
 * dropdown, slim status line) — the three games not yet on the minimal
 * frame still use it. MinimalTopBar + GameResults + GameFooter is the
 * minimal frame (Kombai, 2026-11-19): one top row — exit, the settings
 * dropdown, the score — then the round label, the centred question,
 * the choices, and the reveal. The other games adopt it in their
 * rollout; the shell owns the frame so no game re-implements it.
 *
 * - MinimalTopBar: the one-row top bar. The settings a game has (play
 *   mode, category, content pool) live in the dropdown, closed by
 *   default, with the current choices summarized on the toggle.
 *   Picking a setting collapses the menu again and still resets the
 *   score, exactly as a visible control row did. No kicker, no
 *   tagline, no separate picker rows. The toggle summary is
 *   "{primary setting} · {play mode}" in every game.
 * - The round label is the game's own round counter, always
 *   "Round N" ("Round N of 10" in 10-question mode) — the label is
 *   shared chrome, so the word is the same in every game; the game's
 *   own voice lives in its content, not in the frame.
 * - GameResults: the end-of-game screen — kicker, heading, big
 *   score, Play again. One shape for every game; no mode-note
 *   restating the score.
 * - GameFooter: page furniture, same on every game — the tagline,
 *   the pool label, and the collapsed photo-credits list (the
 *   attribution the hotlinked photos require). The credits list is
 *   built from the game's own images data.
 * - The verdict wash (Kahoot pattern) lives on the game's page
 *   element: the game puts `is-correct` / `is-wrong` on its
 *   `qs-game` main, and the shared rule floods it. The wash clears
 *   on the results screen — it is feedback for the last round, and
 *   the results screen is a different moment.
 * - Every quiz game tracks a streak (consecutive correct rounds); a
 *   wrong answer or give-up resets it. Games keep their own question,
 *   choice, and reveal markup and styling — the shell owns only the
 *   frame. */

export function GameBar({ title, onStartOver, settingsSummary, children }) {
  /* A pick inside the menu collapses it again, so the question is the
   * next thing on screen. The toggle itself is not a button, so opening
   * and closing the menu by tapping it is unaffected. */
  const closeOnPick = (event) => {
    if (event.target.closest && event.target.closest('button')) event.currentTarget.open = false;
  };
  return <header className="qs-bar">
    <h1 className="qs-bar-title">{title}</h1>
    <div className="qs-bar-actions">
      <button className="pf-btn" type="button" onClick={onStartOver} aria-label="Start over"><RestartIcon /><span className="qs-start-label">Start over</span></button>
      <details className="qs-menu" onClick={closeOnPick}>
        <summary className="qs-menu-toggle">{settingsSummary}<span aria-hidden="true"> ▾</span></summary>
        <div className="qs-menu-body">{children}</div>
      </details>
    </div>
  </header>;
}

export function StatusLine({ round, total, correct, played, streak, lives }) {
  return <p className="qs-status">Round {round}{total ? ` of ${total}` : ''} · {correct} right · {played} played · streak {streak}{lives !== null && lives !== undefined && <> · <LivesHearts lives={lives} /> lives</>}</p>;
}

/* Minimal top bar: exit, the settings dropdown, the score. The menu
 * is the shell's own `<details>` dropdown; a pick inside collapses it
 * again, so the question is the next thing on screen. The toggle
 * itself is not a button, so opening and closing the menu by tapping
 * it is unaffected. The score shows the count, with lives appended in
 * 3-lives mode. */
export function MinimalTopBar({ settingsSummary, children, onStartOver, score, lives, showLives }) {
  const closeOnPick = (event) => {
    if (event.target.closest && event.target.closest('button')) event.currentTarget.open = false;
  };
  return <div className="qs-top">
    <a className="qs-top-x" href="/" aria-label="Back to all games">✕</a>
    <details className="qs-menu" onClick={closeOnPick}>
      <summary className="qs-menu-toggle">{settingsSummary}<span aria-hidden="true"> ▾</span></summary>
      <div className="qs-menu-body">{children}<button className="pf-btn qs-settings-restart" type="button" onClick={onStartOver}>Start over</button></div>
    </details>
    <span className="qs-top-score">✓ {score}{showLives ? <span className="qs-top-lives"> · ♥ {lives}</span> : null}</span>
  </div>;
}

/* End-of-game screen: kicker, heading, big score, Play again. The
 * kicker is shared wording — "10 rounds done!" in 10-question mode,
 * "Out of lives!" in lives mode — and the heading is the same in
 * every game. The score is the hero; nothing restates it. */
export function GameResults({ kicker, correct, played, onPlayAgain }) {
  return <div className="qs-results" role="status">
    <p className="qs-results-kicker">{kicker}</p>
    <h2>Here is how you did.</h2>
    <p className="qs-final-score">{correct}<span> / {played} right</span></p>
    <button className="pf-primary" onClick={onPlayAgain}>Play again <ArrowRightIcon /></button>
  </div>;
}

/* Page footer: tagline, pool label, and the collapsed photo-credits
 * list. `credits` is the game's own images data as
 * [{ id, name, author, license, page }] — one line per photo that can
 * appear, in the game's own order. */
export function GameFooter({ poolLabel, credits }) {
  return <>
    <footer className="qs-footer">
      <span>Made for curious minds <span className="qs-spark" aria-hidden="true">✦</span></span>
      <span>{poolLabel}</span>
    </footer>
    <details className="qs-credits">
      <summary>Photo credits</summary>
      <ul>
        {credits.map((credit) => (
          <li key={credit.id}>
            {credit.name}: Photo: {credit.author}, {credit.license},{' '}
            <a href={credit.page}>via Wikimedia Commons</a>
          </li>
        ))}
      </ul>
    </details>
  </>;
}
