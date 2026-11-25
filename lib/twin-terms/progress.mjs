/* Twin Terms progress in the player's own browser storage, on the
 * shared resume helper (lib/resume.mjs): the current puzzle and score
 * survive a reload, a finished game does not (results are ephemeral).
 * Every load is validated — a stale save from an older pool, or any
 * bad value, returns null and starts fresh. Two states save: searching
 * (just the pair) and the give-up reveal (the pair plus the dealt
 * choices, and the pick once made). */

import { PLAY_MODES } from "../quiz-play.mjs";
import { clearResume, loadResume, saveResume } from "../resume.mjs";
import { pairById } from "./questions.mjs";

const SAVE_KEY = "twin-terms-save-v1";

export function saveProgress(state) {
  saveResume(SAVE_KEY, state);
}

export function clearProgress() {
  clearResume(SAVE_KEY);
}

function validOptions(pair, options) {
  if (!Array.isArray(options) || options.length !== 4) return false;
  if (new Set(options).size !== 4) return false;
  return options.includes(pair.answer);
}

export function loadProgress() {
  return loadResume(SAVE_KEY, (saved) => {
    const pair = pairById(saved.pairId);
    if (!pair) return null;
    if (!PLAY_MODES.some((mode) => mode.id === saved.playMode)) return null;
    const played = Number(saved.played);
    const correct = Number(saved.correct);
    const lives = Number(saved.lives);
    const streak = Number(saved.streak ?? 0);
    if (![played, correct, lives, streak].every(Number.isFinite)) return null;
    if (played < 0 || correct < 0 || correct > played || lives < 0 || lives > 3) return null;
    if (streak < 0 || streak > played) return null;
    const history = Array.isArray(saved.history)
      ? saved.history.filter((id) => pairById(id))
      : [];
    if (saved.gaveUp) {
      if (!validOptions(pair, saved.options)) return null;
      const picked = saved.picked ?? null;
      if (picked !== null && !saved.options.includes(picked)) return null;
      return { pair, options: saved.options, gaveUp: true, picked, playMode: saved.playMode, played, correct, lives, streak, history };
    }
    if (saved.options !== undefined && saved.options !== null) return null;
    return { pair, options: null, gaveUp: false, picked: null, playMode: saved.playMode, played, correct, lives, streak, history };
  });
}
