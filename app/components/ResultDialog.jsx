'use client';

import { useEffect, useId, useRef, useState } from 'react';

/* Shared result dialog: the one shape every quiz game's answer takes.
 *
 * A game fills the slots and the dialog owns the rest — the verdict
 * band, the title, the scrollable body, the Dive deeper toggle, and
 * the sticky Next footer — so all five quizzes read as one portal.
 * Native <dialog> + showModal(), the same pattern as Tango Cards'
 * card preview. No new dependency.
 *
 * Slots (all but open/verdict/kicker/title/nextLabel/onNext optional):
 * - verdict: 'correct' | 'wrong' | 'close' | 'neutral' (give-up).
 *   Only the verdict colour varies; the dialog itself stays neutral
 *   paper in every game.
 * - kicker: the game's own verdict line, kept verbatim.
 * - title: the right answer, as the dialog heading (focus target).
 * - answer: a game-specific answer block (Balls' two sides, Bulb's
 *   date blocks). Rendered between the title and the media/brief.
 * - media: the game's existing reveal image, unchanged.
 * - brief: one short explanation, always visible.
 * - details: long content, shown only behind Dive deeper. When a game
 *   has no long content it passes nothing and no button renders —
 *   never a dead button.
 * - nextLabel: 'Next round' (Bulb keeps 'Next discovery'), or
 *   'See results' when the game is over.
 *
 * Behaviour (decision D1): the dialog closes only via Next / See
 * results. Esc is cancelled and backdrop clicks do nothing, because
 * closing without advancing would strand the player on a revealed
 * board whose only Next button lives inside the dialog. Closing IS
 * advancing: onNext is the game's existing Next handler, which clears
 * the reveal and deals the already-prepared next round. The Dive
 * deeper state resets every time the dialog opens.
 *
 * The dialog stays mounted while the game plays; `open` drives
 * showModal()/close() so focus and the backdrop behave. Callers pass
 * empty content while closed (reveal is null) — the closed dialog is
 * invisible and inert. */

const VERDICT_MARKS = { correct: '✓', wrong: '✗', close: '✓', neutral: null };

export default function ResultDialog({
  open,
  verdict,
  kicker,
  title,
  answer = null,
  media = null,
  brief = null,
  details = null,
  detailsLabel = 'Dive deeper',
  nextLabel,
  onNext,
}) {
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const [deepOpen, setDeepOpen] = useState(false);
  const titleId = useId();
  const detailsId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      setDeepOpen(false);
      dialog.showModal();
      /* Focus the answer title, the way the old inline reveal focused
       * its heading — the result is the next thing on screen. */
      window.requestAnimationFrame(() => titleRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open ]);

  return (
    <dialog
      ref={dialogRef}
      className="rd-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => event.preventDefault()}
      onClick={(event) => {
        /* Backdrop clicks do nothing: Next is the only way forward. */
        if (event.target === dialogRef.current) event.preventDefault();
      }}
    >
      <div className={`rd-verdict is-${verdict}`}>
        {VERDICT_MARKS[verdict] && (
          <span className="rd-mark" aria-hidden="true">{VERDICT_MARKS[verdict]}</span>
        )}
        <p className="rd-kicker">{kicker}</p>
      </div>
      <div className="rd-body">
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="rd-title">{title}</h2>
        {answer}
        {media}
        {brief && <div className="rd-brief">{brief}</div>}
        {details && (
          <button
            className="pf-btn rd-deep-toggle"
            type="button"
            aria-expanded={deepOpen}
            aria-controls={detailsId}
            onClick={() => setDeepOpen((wasOpen) => !wasOpen)}
          >
            {deepOpen ? 'Show less' : detailsLabel}
          </button>
        )}
        {details && deepOpen && (
          <div className="rd-details" id={detailsId}>{details}</div>
        )}
      </div>
      <div className="rd-footer">
        <button className="pf-primary rd-next" type="button" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </dialog>
  );
}
