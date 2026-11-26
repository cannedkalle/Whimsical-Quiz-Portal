/* Browser game engine for Balls in the Ballpark. Plays entirely from the
 * catalog that lives in the repo (subjects.mjs + comparisons.mjs), with the
 * player's progress kept in their own browser. No server database is needed:
 * this module is what lets the game run on the live site, and offline once
 * installed, exactly like the portal's other games. */

import { subjects, subjectCategories, validSubjectPairs } from './subjects.mjs';
import { winningSide } from './subjects.mjs';
import { formatScaleInUnit, formatRange, pairUnit } from './format.mjs';
import { PLAY_MODES } from '../quiz-play.mjs';
import { clearResume, loadResume, resumeNumber, saveResume } from '../resume.mjs';

const CATEGORY_PROMPTS = {
  count: 'Which has a larger count?',
  duration: 'Which takes more time?',
  weight: 'Which weighs more?',
  frequency: 'Which happens more times per second?',
  length: 'Which has greater length?',
  area: 'Which covers more area?',
  volume: 'Which takes up more space?',
  speed: 'Which moves or grows faster?',
};

const byId = new Map(subjects.map((subject) => [subject.id, subject]));
const SAVE_KEY = 'wild-guess-save-v1';

/* Generate a matchup instead of picking from a fixed list: take the
 * quality pool for a category (non-overlapping ranges, gaps tuned to
 * the pair's scale, never part-vs-whole), drop anything the player has just seen, and deal
 * from what is left. The quality gates never relax; only the no-repeat
 * preference does, so this never returns null while a pool exists. Pass
 * the pair ids from recent rounds as avoid.pairIds to keep the same
 * matchup from coming straight back. */
export function generateComparison(category, avoid = {}) {
  const chosen =
    category ||
    subjectCategories[Math.floor(Math.random() * subjectCategories.length)];
  const pool = validSubjectPairs(chosen);
  if (!pool.length) return null;
  const avoidIds = new Set(avoid.pairIds || []);
  const pairId = ([a, b]) => `${a.id}--${b.id}`;
  const fresh = pool.filter(
    (pair) =>
      !avoidIds.has(pairId(pair)) && !avoidIds.has(pairId([pair[1], pair[0]])),
  );
  const candidates = fresh.length ? fresh : pool;
  const [first, second] =
    candidates[Math.floor(Math.random() * candidates.length)];
  const [left, right] = Math.random() < 0.5 ? [first, second] : [second, first];
  return {
    id: `${left.id}--${right.id}`,
    category: chosen,
    prompt: CATEGORY_PROMPTS[chosen],
    left,
    right,
  };
}

/* Backwards-compatible deal with no history: the same generator, with
 * nothing avoided. */
export function createComparison(avoid) {
  return generateComparison(undefined, avoid);
}


/* Headline verbs must agree with the winner's label: 45 subjects are
 * plural-headed ("Stars …", "All the ants …", "Two wingbeats …").
 * Mass nouns after All ("All the water …", "All the air …", "All the
 * gold …") still take a singular verb. The scan looks at the first
 * three words so adjective-led labels ("Tiny scales …", "Sand dunes
 * …") still find their head noun; possessives ("whale's") do not
 * count as plurals. */
const PLURAL_HEADS = new Set(['people', 'fish']);
const SINGULAR_S = new Set(['bus', 'glass', 'class', 'gas', 'chaos', 'bass', 'atlas', 'jesus']);
export function isPluralLabel(label) {
  const words = label.split(/\s+/);
  const first = (words[0] || '').toLowerCase();
  if (first === 'all') {
    const head = words[1] === 'the' ? words[2] : words[1];
    return !['water', 'air', 'gold'].includes((head || '').toLowerCase());
  }
  if (['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'].includes(first)) return true;
  for (const raw of words.slice(0, 3)) {
    const word = raw.toLowerCase().replace(/['’]s$/, '').replace(/[^a-z]/g, '');
    if (!word) continue;
    if (PLURAL_HEADS.has(word)) return true;
    if (word.endsWith('s') && !SINGULAR_S.has(word)) return true;
  }
  return false;
}

/* Score one answer and build the reveal, in the shape the board renders.
 * Both sides render in the matchup's shared unit, so one comparison never
 * shows cubic kilometers on one side and cubic meters on the other. */
export function buildReveal(comparison, choice) {
  const correctChoice = winningSide(comparison);
  const unit = pairUnit(comparison.category, comparison.left.magnitude, comparison.right.magnitude);
  const sides = [comparison.left, comparison.right].map((option) => ({
    id: option.id,
    label: option.label,
    short: option.short,
    emoji: option.emoji,
    scale: formatScaleInUnit(option, comparison.category, unit),
    scaleLead: 'Around',
    detail: formatRange(option, comparison.category, unit),
    plural: isPluralLabel(option.label),
    note: option.note || null,
  }));
  return {
    prompt: comparison.prompt,
    sides,
    choice,
    correctChoice,
    correct: choice === correctChoice,
  };
}

/* Progress storage rides the shared resume helper (lib/resume.mjs):
 * this game supplies the key and the validation. The save carries the
 * current matchup plus the whole game state — settings, round, score,
 * lives, streak, and the recent-pair window — so a reload picks the
 * game up exactly where it left off. */
export function saveProgress(state) {
  saveResume(SAVE_KEY, state);
}

/* A save is only trusted when both subjects still exist and still
 * belong to the saved category. Fields an older save does not carry
 * (play mode, lives, streak, the category filter, the recent window)
 * fall back to the defaults the game opened with, so a save from
 * before those fields existed still restores. */
export function loadProgress() {
  return loadResume(SAVE_KEY, (saved) => {
    const left = byId.get(saved.leftId);
    const right = byId.get(saved.rightId);
    if (
      !left ||
      !right ||
      left.category !== saved.category ||
      right.category !== saved.category
    ) {
      return null;
    }
    return {
      comparison: {
        id: `${left.id}--${right.id}`,
        category: saved.category,
        prompt: CATEGORY_PROMPTS[saved.category],
        left,
        right,
      },
      position: resumeNumber(saved.position) ?? 0,
      played: resumeNumber(saved.played) ?? 0,
      correct: resumeNumber(saved.correct) ?? 0,
      playMode: PLAY_MODES.some((mode) => mode.id === saved.playMode)
        ? saved.playMode
        : 'endless',
      lives: resumeNumber(saved.lives, { max: 3 }) ?? 3,
      streak: resumeNumber(saved.streak) ?? 0,
      categoryFilter:
        saved.filter === 'mixed' || subjectCategories.includes(saved.filter)
          ? saved.filter
          : 'mixed',
      recent: Array.isArray(saved.recent)
        ? saved.recent.filter((id) => typeof id === 'string')
        : [],
    };
  });
}

export function clearProgress() {
  clearResume(SAVE_KEY);
}
