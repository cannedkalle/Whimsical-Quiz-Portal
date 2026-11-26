/* Shared resume storage for the quiz games. Every quiz keeps its
 * in-progress game in the player's own browser storage, under its own
 * key, in the same shape of pattern (the wild-guess pattern, now shared):
 *
 * - save on every deal, so a reload restores the round that was on
 *   screen, unanswered, with its score, lives, and settings;
 * - load validates before trusting: each game passes a `validate`
 *   function that checks the parsed save against its own live pools
 *   and returns a sanitized state, or null. A corrupt, stale, or
 *   shape-mismatched save is discarded silently and the game starts
 *   fresh — loading can never throw or restore a half-state;
 * - clear on game completion and on Start over, so a finished game
 *   never comes back.
 *
 * Storage itself is best-effort: private mode or a full quota makes
 * save a no-op and load a null, and the game still plays. */

function storage() {
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : null;
  } catch {
    return null;
  }
}

export function saveResume(key, state) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(state));
  } catch {
    /* Storage unavailable: the game still plays. */
  }
}

export function loadResume(key, validate) {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return validate ? validate(parsed) : parsed;
  } catch {
    return null;
  }
}

export function clearResume(key) {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* Nothing to clear. */
  }
}

/* A saved counter (rounds played, score, lives, streak) is only trusted
 * as a whole number inside its bounds; anything else returns null so
 * the caller can reject the save or fall back to a default. */
export function resumeNumber(value, { min = 0, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

/* Whether a restored save carries progress worth announcing with the
 * "Picked up where you left off" notice: past the first round, or a
 * score on the board. A round-1, zero-score save restores silently —
 * it is indistinguishable from a fresh game. */
export function resumeHasProgress({ rounds = 0, score = 0 } = {}) {
  return rounds > 0 || score > 0;
}
