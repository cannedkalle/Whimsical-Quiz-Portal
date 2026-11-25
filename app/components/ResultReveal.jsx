'use client';

import { useEffect, useId, useRef, useState } from 'react';

/* Shared result reveal: the one shape every quiz game's answer takes.
 * The Kahoot pattern as Kai picked it (research 2026-11-19): after
 * answering, the player's screen floods with the verdict colour —
 * the whole page becomes the verdict — and the answers overlay the
 * options, not beneath them. The feedback is a fixed overlay
 * covering the whole screen, verdict colour flooding it, with Next
 * pinned to the bottom of the viewport so it is never buried. The
 * inline block below the choices put Next below the fold on a phone
 * (the player had to scroll past the cards and the whole reveal to
 * find it); the overlay does not. The game still applies the wash
 * itself by putting `is-correct` / `is-wrong` on its page element —
 * that is the 400ms beat: the page floods and the choice marks
 * itself before the overlay appears, in the same tint, so the
 * overlay arriving is seamless. The sheet (ResultSheet) and the
 * dialog (ResultDialog) were both deleted earlier; the slot API is
 * the same shape so a game adopts it by filling the slots. The
 * games render this module inline in their JSX and it positions
 * itself fixed — no game code changes when the presentation
 * changes.
 *
 * A game fills the slots and the reveal owns the rest — the verdict
 * hero, the staged beats, the scrollable body, the Dive deeper
 * toggle, and the Next button — so all five quizzes read as one
 * portal. No new dependency.
 *
 * Slots (all but verdict/title/nextLabel/onNext optional):
 * - verdict: 'correct' | 'wrong' | 'close' | 'neutral' (give-up).
 *   Drives the hero colour and mark only; the overlay tint follows
 *   it too.
 * - title: the heading, shown big in the verdict hero with the mark
 *   (focus target). Balls passes the verdict word itself,
 *   "Correct" / "Incorrect". A later game may pass its answer
 *   headline instead; the mark and colour still say right/wrong.
 * - answer: a game-specific answer block (Balls' correct choice,
 *   Bulb's date blocks). Rendered in the body, after the hero.
 * - media: the game's existing reveal image, unchanged.
 * - brief: one short explanation, always visible.
 * - details: long content, shown only behind Dive deeper. When a game
 *   has no long content it passes nothing and no button renders —
 *   never a dead button. The toggle label is 'Dive deeper' in every
 *   game (the default); no game passes its own label.
 * - nextLabel: 'Next round' in every game, or 'See results' when the
 *   game is over. The label is shared frame wording, so no game keeps
 *   its own variant (Bulb's 'Next discovery' was unified to this in
 *   the 2026-11-23 holistic fix).
 *
 * Behaviour (decision D1): the reveal advances only via Next / See
 * results. There is no close, no backdrop, no Esc — Next is the
 * only way forward, and it is pinned to the bottom of the viewport
 * so it is always visible. Closing IS advancing: onNext is the
 * game's existing Next handler, which clears the reveal and deals
 * the already-prepared next round. The reveal is user-paced: it
 * never auto-dismisses and never auto-advances. The Dive deeper
 * state resets every round — the block mounts fresh with each
 * reveal, so its state starts collapsed. While the overlay is up
 * the page behind does not scroll, so the next round opens where
 * the player left it.
 *
 * The block mounts when the game has a reveal and unmounts when the
 * round advances. On mount it waits a beat (400ms, so the player
 * sees the verdict land on the board first), then focuses the hero
 * title. */

const VERDICT_MARKS = { correct: '✓', wrong: '✗', close: '✓', neutral: null };

export default function ResultReveal({
  verdict,
  title,
  answer = null,
  media = null,
  brief = null,
  details = null,
  detailsLabel = 'Dive deeper',
  nextLabel,
  onNext,
}) {
  const titleRef = useRef(null);
  const [deepOpen, setDeepOpen] = useState(false);
  const titleId = useId();
  const detailsId = useId();

  useEffect(() => {
    /* Verdict first, on the board: wait a beat, then focus the
     * overlay's title. The page behind does not scroll while the
     * overlay is up, so the next round opens where the player
     * left it. */
    const timer = window.setTimeout(() => {
      titleRef.current?.focus({ preventScroll: true });
    }, 400);
    const root = document.documentElement;
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      root.style.overflow = prevRootOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div
      className={`rr-overlay is-${verdict}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="rr-scroll">
        <div className="rr-inner">
          <div className={`rr-verdict is-${verdict}`}>
            {VERDICT_MARKS[verdict] && (
              <span className="rr-mark" aria-hidden="true">{VERDICT_MARKS[verdict]}</span>
            )}
            <h2 id={titleId} ref={titleRef} tabIndex={-1} className="rr-title">{title}</h2>
          </div>
          <div className="rr-body">
            {answer}
            {media}
            {brief && <div className="rr-brief">{brief}</div>}
            {details && (
              <button
                className="pf-btn rr-deep-toggle"
                type="button"
                aria-expanded={deepOpen}
                aria-controls={detailsId}
                onClick={() => setDeepOpen((wasOpen) => !wasOpen)}
              >
                {deepOpen ? 'Show less' : detailsLabel}
              </button>
            )}
            {details && deepOpen && (
              <div className="rr-details" id={detailsId}>{details}</div>
            )}
          </div>
        </div>
      </div>
      <div className="rr-footer">
        <button className="pf-primary rr-next" type="button" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
