'use client';

import { useEffect, useId, useRef, useState } from 'react';

/* Shared result reveal: the one shape every quiz game's answer takes.
 * The Kahoot pattern (research 2026-11-19): after answering, the
 * player's screen floods with the verdict colour — the whole page
 * becomes the verdict — and the correct answer is shown. No dialog,
 * no sheet, nothing floating: the feedback lives in the page flow
 * below the choices, so it works at any page height (the sheet
 * failed here because Balls' question does not fit one screen).
 * The game applies the wash itself by putting `is-correct` /
 * `is-wrong` on its page element; this module is the feedback block
 * that scrolls into view. The sheet (ResultSheet) and the dialog
 * (ResultDialog) were both deleted with this change; the slot API is
 * the same shape so a game adopts it by filling the slots.
 *
 * A game fills the slots and the reveal owns the rest — the verdict
 * hero, the staged beats, the scrollable body, the Dive deeper
 * toggle, and the Next button — so all five quizzes read as one
 * portal. No new dependency.
 *
 * Slots (all but verdict/title/nextLabel/onNext optional):
 * - verdict: 'correct' | 'wrong' | 'close' | 'neutral' (give-up).
 *   Drives the hero colour and mark only; the block itself stays
 *   neutral paper in every game.
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
 *   never a dead button.
 * - nextLabel: 'Next round' (Bulb keeps 'Next discovery'), or
 *   'See results' when the game is over.
 *
 * Behaviour (decision D1): the reveal advances only via Next / See
 * results. There is no close, no backdrop, no Esc — the feedback is
 * in the flow and Next is the only way forward. Closing IS
 * advancing: onNext is the game's existing Next handler, which
 * clears the reveal and deals the already-prepared next round.
 * The reveal is user-paced: it never auto-dismisses and never
 * auto-advances. The Dive deeper state resets every round — the
 * block mounts fresh with each reveal, so its state starts
 * collapsed.
 *
 * The block mounts when the game has a reveal and unmounts when the
 * round advances. On mount it waits a beat (400ms, so the player
 * sees the verdict land on the board first), then scrolls itself
 * into view and focuses the hero title. */

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
  const revealRef = useRef(null);
  const titleRef = useRef(null);
  const [deepOpen, setDeepOpen] = useState(false);
  const titleId = useId();
  const detailsId = useId();

  useEffect(() => {
    /* Verdict first, on the board: wait a beat, then bring the
     * feedback into view and focus its title. */
    const timer = window.setTimeout(() => {
      revealRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
      });
      titleRef.current?.focus({ preventScroll: true });
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section
      ref={revealRef}
      className={`rr-reveal is-${verdict}`}
      role="status"
      aria-labelledby={titleId}
    >
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
      <div className="rr-footer">
        <button className="pf-primary rr-next" type="button" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
