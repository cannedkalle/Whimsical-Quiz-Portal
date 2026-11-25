'use client';

import { ArrowRightIcon } from "./Icons";

/* Shared quiz shell: the ONE frame every quiz game shares. There is a
 * single frame — MinimalTopBar + GameResults + GameFooter — and no
 * per-game frame. The older GameBar + StatusLine frame was deleted
 * with the holistic unification (2026-11-23): the three games still
 * on it (Twin Terms, Animal Outsider, Name Quest) moved to this
 * frame in the same change, so no game re-implements the frame.
 *
 * THE CONTRACT — games fill the slots, they do not invent frame
 * wording, order, or layout:
 * - MinimalTopBar: the one-row top bar — exit, the settings
 *   dropdown, the score. The settings a game has (play mode, and
 *   its content selector: category, content pool, difficulty, game
 *   mode, level) live in the dropdown, closed by default, with the
 *   current choices summarized on the toggle. The toggle summary is
 *   always "{primary content} · {play mode}" — the game's content
 *   selector first, play mode second. A game with no content
 *   selector summarizes play mode alone. Picking a setting collapses
 *   the menu again and still resets the score, exactly as a visible
 *   control row did. No kicker, no tagline, no separate picker rows.
 *   Menu groups run content-first, then Play mode, each group a
 *   `.qs-menu-group` with a `.qs-menu-label` naming the group and a
 *   `.pf-pill-group` with the options; the group label and the pill
 *   group's aria-label say the same thing. Start over lives inside
 *   the menu, after the groups. The score shows "✓ N", with lives
 *   appended in 3-lives mode.
 * - The round label is the game's own round counter, always
 *   "Round N" ("Round N of 10" in 10-question mode), rendered by
 *   the game as `.qs-round` — the label is shared chrome, so the
 *   word is the same in every game; the game's own voice lives in
 *   its content, not in the frame. The question is an h1 with
 *   `.qs-question` in every game.
 * - GameResults: the end-of-game screen — kicker, heading, big
 *   score, Play again. One shape for every game; no mode-note
 *   restating the score.
 * - GameFooter: page furniture, same on every game — the tagline,
 *   the pool label (one count + noun, e.g. "212 subjects"), and the
 *   collapsed photo-credits list (the attribution the hotlinked
 *   photos require). The credits list is built from the game's own
 *   images data.
 * - The verdict wash (Kahoot pattern) lives on the game's page
 *   element: the game puts `is-correct` / `is-wrong` on its
 *   `qs-game` main, and the shared rule floods it. The wash clears
 *   on the results screen — it is feedback for the last round, and
 *   the results screen is a different moment.
 * - Every quiz game tracks a streak (consecutive correct rounds); a
 *   wrong answer or give-up resets it. Games keep their own question,
 *   choice, and reveal markup and styling — the shell owns only the
 *   frame. */

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

/* Resume notice: the one line a game shows when it restored an
 * in-progress save with progress (past round 1, or a score on the
 * board — see lib/resume.mjs). The game renders it once, on the
 * question screen after load, when its restore carried progress;
 * the wording is the shell's, the same in every game. It is not
 * dismissible — Start over in the top bar is the way out. */
export function ResumeNotice() {
  return <p className="qs-resume-note">Picked up where you left off</p>;
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
