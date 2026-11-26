'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PLAY_MODES, isGameOver, nextLives } from "../../lib/quiz-play.mjs";
import nameBank from "../../lib/name-quest/name-bank.json";
import pokemonAnimalPairs from "../../lib/name-quest/pokemon-animal-pairs.json";
import { NAME_QUEST_IMAGES } from "../../lib/name-quest/images.mjs";
import { preloadImages } from "../../lib/preload-images.mjs";
import { GameFooter, GameResults, MinimalTopBar, ResumeNotice } from "../components/QuizShell";
import { clearResume, loadResume, resumeHasProgress, resumeNumber, saveResume } from "../../lib/resume.mjs";
import ResultReveal from "../components/ResultReveal";

const entries = nameBank;
const animalPairs = pokemonAnimalPairs;

/* Photo credits, in the game's own order: one line per entry with a
 * credited photo. Link-only image records have no author/license, so
 * they are excluded. */
const CREDITS = entries
  .filter((entry) => NAME_QUEST_IMAGES[entry.id]?.thumb && NAME_QUEST_IMAGES[entry.id].author)
  .map((entry) => ({ id: entry.id, name: entry.name, ...NAME_QUEST_IMAGES[entry.id] }));

const categories = [
  "Pokemon",
  "Place",
  "Space",
  "Element",
  "Dinosaur",
  "Rock or Gem",
  "Science Term",
  "Compound",
  "Art Term",
  "Animal",
  "Plant",
  "Dish",
  "Brand or Store",
  "App or Website",
  "Movie, Show, or Book",
  "Character",
  "Myth or Legend",
  "Famous Person",
  "Game",
  "Language",
  "Dog Breed",
  "Cheese",
  "Board Game",
  "Cloud Type",
  "Dance Style",
  "Musical Instrument",
];

const categoryFamilies = {
  Pokemon: "fictional-entity",
  Character: "fictional-entity",
  "Myth or Legend": "fictional-entity",
  "Movie, Show, or Book": "fictional-work",
  Game: "fictional-work",
  Place: "place",
  Space: "space",
  Element: "science-object",
  "Rock or Gem": "science-object",
  "Science Term": "concept",
  Compound: "science-object",
  "Art Term": "culture",
  "Math or Tech Term": "concept",
  "Social Studies Term": "concept",
  Dinosaur: "living-thing",
  Animal: "living-thing",
  Plant: "living-thing",
  Dish: "food-culture",
  "Brand or Store": "modern-thing",
  "App or Website": "modern-thing",
  "Famous Person": "person",
  Language: "culture",
  "Dog Breed": "living-thing",
  Cheese: "food-culture",
  "Board Game": "fictional-work",
  "Cloud Type": "concept",
  "Dance Style": "culture",
  "Musical Instrument": "culture",
};

const confusingCategoryPairs = new Set(
  [
    ["Dinosaur", "Animal"],
    ["Plant", "Dish"],
    ["Plant", "Cheese"],
    ["Dish", "Brand or Store"],
    ["Dog Breed", "Place"],
    ["Cheese", "Place"],
    ["Board Game", "Place"],
    ["Dance Style", "Place"],
    ["Dance Style", "Dish"],
    ["Dance Style", "Brand or Store"],
    ["Cloud Type", "Plant"],
    ["Brand or Store", "App or Website"],
    ["Movie, Show, or Book", "Character"],
    ["Movie, Show, or Book", "Game"],
    ["Character", "Pokemon"],
    ["Character", "Myth or Legend"],
    ["Place", "Space"],
    ["Element", "Rock or Gem"],
    ["Element", "Science Term"],
    ["Element", "Compound"],
    ["Rock or Gem", "Science Term"],
    ["Rock or Gem", "Compound"],
    ["Space", "Science Term"],
    ["Science Term", "Compound"],
    ["Language", "Social Studies Term"],
    ["Language", "Art Term"],
    ["App or Website", "Math or Tech Term"],
  ].map(([first, second]) => [first, second].sort().join("|")),
);

const categoryAliases = {
  Pokemon: ["pokemon"],
  Place: ["place", "city", "country", "landmark", "mountain", "island"],
  Space: ["space", "planet", "moon", "star", "galaxy", "constellation"],
  Element: ["element", "chemical element", "gas", "metal"],
  Dinosaur: ["dinosaur", "ancient animal", "prehistoric animal"],
  "Rock or Gem": ["rock", "gem", "mineral"],
  "Science Term": ["science term", "term", "concept"],
  Compound: ["compound", "chemical compound", "medicine"],
  "Art Term": ["art term", "art", "term"],
  "Math or Tech Term": ["math term", "tech term", "math or tech term", "term", "concept"],
  "Social Studies Term": ["social studies term", "social studies", "term", "concept"],
  Animal: ["animal", "creature", "mammal", "bird", "fish", "reptile"],
  Plant: ["plant", "tree", "flower", "fruit", "vegetable"],
  Dish: ["food", "dish", "snack", "dessert", "prepared food"],
  "Brand or Store": ["brand", "store", "shop", "company", "restaurant"],
  "App or Website": ["app", "website", "software", "browser"],
  "Movie, Show, or Book": ["movie", "show", "book", "tv show", "story"],
  Character: ["character", "cartoon", "hero", "villain"],
  "Myth or Legend": ["myth", "legend", "mythology"],
  "Famous Person": ["person", "famous person", "singer", "athlete", "actor"],
  Game: ["game", "video game"],
  Language: ["language"],
  "Dog Breed": ["dog breed", "dog", "animal"],
  Cheese: ["cheese", "food"],
  "Board Game": ["board game", "game"],
  "Cloud Type": ["cloud type", "cloud", "weather"],
  "Dance Style": ["dance style", "dance"],
  "Musical Instrument": ["musical instrument", "instrument"],
};

const levelLabels = {
  easy: "Easy",
  standard: "Balanced",
  challenge: "Challenge",
};

const modeLabels = {
  category: "Name types",
  pokemon: "Pokemon or not",
  realAnimal: "Real or Pokemon",
};

function normalizePairId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const pairPrompts = animalPairs.flatMap((pair) => [
  {
    id: "real-" + normalizePairId(pair.real),
    name: pair.real,
    answer: pair.kind === "Plant" ? "Real Plant" : "Real Animal",
    explanation: pair.real + " is a real " + pair.kind.toLowerCase() + ".",
  },
  {
    id: "pokemon-" + normalizePairId(pair.pokemon),
    name: pair.pokemon,
    answer: "Pokemon",
    explanation: pair.note,
  },
]);

const SAVE_KEY = "name-quest-save-v1";
const entryById = new Map(entries.map((entry) => [entry.id, entry]));
const pairPromptById = new Map(pairPrompts.map((prompt) => [prompt.id, prompt]));

/* Validate a saved game against the live banks (the shared resume
 * pattern, lib/resume.mjs): settings must still exist, counters must
 * be sane, and the saved round — an entry, or a real-or-Pokemon pair
 * rebuilt from its prompt ids — must still be in the banks. Only
 * unanswered rounds are saved (the save is written when a round is
 * dealt), so a reload mid-reveal replays that round with the score
 * as it stood when the round was dealt. Anything off returns null
 * and the game starts fresh. */
function validateSave(saved) {
  if (!Object.hasOwn(modeLabels, saved.mode)) return null;
  if (!Object.hasOwn(levelLabels, saved.level)) return null;
  if (!PLAY_MODES.some((play) => play.id === saved.playMode)) return null;
  const score = resumeNumber(saved.score);
  const rounds = resumeNumber(saved.rounds);
  const lives = resumeNumber(saved.lives, { max: 3 });
  const streak = resumeNumber(saved.streak);
  if ([score, rounds, lives, streak].some((value) => value === null)) return null;
  if (score > rounds || streak > rounds) return null;
  const current = entryById.get(saved.currentId);
  if (!current) return null;
  let pair = null;
  if (saved.mode === "realAnimal") {
    if (!saved.pair || typeof saved.pair !== "object") return null;
    const answerPrompt = pairPromptById.get(saved.pair.answerId);
    if (!answerPrompt) return null;
    if (!Array.isArray(saved.pair.choiceIds) || saved.pair.choiceIds.length !== 4) return null;
    const choicePrompts = saved.pair.choiceIds.map((id) => pairPromptById.get(id));
    if (choicePrompts.some((prompt) => !prompt)) return null;
    if (!saved.pair.choiceIds.includes(saved.pair.answerId)) return null;
    pair = {
      id: answerPrompt.answer + "-" + answerPrompt.id,
      target: answerPrompt.answer,
      answer: answerPrompt,
      choices: choicePrompts,
    };
  }
  const knownId = (id) => entryById.has(id) || pairPromptById.has(id);
  return {
    mode: saved.mode,
    level: saved.level,
    playMode: saved.playMode,
    score,
    rounds,
    lives,
    streak,
    current,
    pair,
    usedIds: Array.isArray(saved.usedIds) ? saved.usedIds.filter(knownId) : [],
    recentIds: Array.isArray(saved.recentIds) ? saved.recentIds.filter(knownId) : [],
  };
}

const hashText = (text) =>
  Array.from(text).reduce((hash, character) => hash + character.charCodeAt(0), 0);

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isConfusingDistractor = (answer, option) => {
  if (answer === option) return true;
  const pairKey = [answer, option].sort().join("|");
  if (confusingCategoryPairs.has(pairKey)) return true;
  return categoryFamilies[answer] === categoryFamilies[option];
};

const getChoices = (entry) => {
  const distantDistractors = categories
    .filter((category) => !isConfusingDistractor(entry.category, category))
    .sort((first, second) => {
      const firstScore = (hashText(entry.id + ":" + first) * 17) % 97;
      const secondScore = (hashText(entry.id + ":" + second) * 17) % 97;
      return firstScore - secondScore;
    })
    .slice(0, 3);
  const fallbackDistractors = categories
    .filter((category) => category !== entry.category && !distantDistractors.includes(category))
    .sort((first, second) => {
      const firstScore = (hashText(entry.id + ":" + first + ":fallback") * 17) % 97;
      const secondScore = (hashText(entry.id + ":" + second + ":fallback") * 17) % 97;
      return firstScore - secondScore;
    });

  return [entry.category, ...distantDistractors, ...fallbackDistractors]
    .slice(0, 4)
    .sort((first, second) => {
      const firstScore = (hashText(entry.id + ":" + first + ":choice") * 31) % 101;
      const secondScore = (hashText(entry.id + ":" + second + ":choice") * 31) % 101;
      return firstScore - secondScore;
    });
};

const getBasePlayableEntries = () =>
  entries.filter(
    (entry) =>
      entry.playable !== false &&
      entry.classicPlayable !== false &&
      entry.wordForm !== "multiple" &&
      entry.ambiguity !== "high" &&
      !["common", "veryCommon"].includes(entry.commonName),
  );

const getPool = (level, mode) => {
  if (mode === "pokemon") {
    const notPokemon = getBasePlayableEntries().filter((entry) => entry.category !== "Pokemon");
    const pokemon = entries.filter((entry) => entry.playable !== false && entry.category === "Pokemon");
    return [...pokemon, ...notPokemon];
  }

  const playableEntries = getBasePlayableEntries();

  if (level === "easy") {
    return playableEntries.filter(
      (entry) =>
        entry.difficulty <= 2 &&
        ["none", "low"].includes(entry.ambiguity) &&
        ["none", "rare"].includes(entry.commonName),
    );
  }

  if (level === "standard") {
    return playableEntries.filter(
      (entry) => entry.difficulty === 3 && ["none", "low", "medium"].includes(entry.ambiguity),
    );
  }

  return playableEntries.filter((entry) => entry.difficulty >= 4);
};

const getPokemonModeGroups = () => ({
  pokemon: entries.filter((entry) => entry.playable !== false && entry.category === "Pokemon"),
  notPokemon: getBasePlayableEntries().filter((entry) => entry.category !== "Pokemon"),
});

/* Session no-repeat window, shared by all three content modes for the
 * whole page session: Start over, Play again, and mode or level switches
 * never clear it (a reload does, like the score). The progress set kept
 * in state still resets on a fresh game; this window is only about
 * dealing, so a name just played never comes straight back. */
const RECENT_WINDOW_SIZE = 12;

const applyRecentWindow = (recentIds, id) =>
  [...recentIds.filter((recentId) => recentId !== id), id].slice(-RECENT_WINDOW_SIZE);

const pickNext = (pool, usedIds, currentId) => {
  const fresh = pool.filter((entry) => !usedIds.has(entry.id) && entry.id !== currentId);
  const candidates = fresh.length > 0 ? fresh : pool.filter((entry) => entry.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
};

const pickPokemonModeNext = (usedIds, currentId) => {
  const groups = getPokemonModeGroups();
  const wantsPokemon = Math.random() < 0.5;
  const preferred = wantsPokemon ? groups.pokemon : groups.notPokemon;
  const fallback = wantsPokemon ? groups.notPokemon : groups.pokemon;
  const preferredNext = pickNext(preferred, usedIds, currentId);
  return preferredNext && preferredNext.id !== currentId ? preferredNext : pickNext(fallback, usedIds, currentId);
};

const pickPairNext = (usedIds) => {
  const wantsPokemon = Math.random() < 0.5;
  const answerPool = pairPrompts.filter((prompt) =>
    wantsPokemon ? prompt.answer === "Pokemon" : prompt.answer !== "Pokemon",
  );
  const fresh = answerPool.filter((prompt) => !usedIds.has(prompt.id));
  const candidates = fresh.length > 0 ? fresh : answerPool;
  const answer = candidates[Math.floor(Math.random() * candidates.length)] ?? answerPool[0];
  const distractors = pairPrompts
    .filter((prompt) => prompt.answer !== answer.answer)
    .sort((first, second) => {
      const firstScore = (hashText(answer.id + ":" + first.id) * 19) % 103;
      const secondScore = (hashText(answer.id + ":" + second.id) * 19) % 103;
      return firstScore - secondScore;
    })
    .slice(0, 3);

  return {
    id: answer.answer + "-" + answer.id,
    target: answer.answer,
    answer,
    choices: [answer, ...distractors].sort((first, second) => {
      const firstScore = (hashText(answer.id + ":" + first.id + ":pair-choice") * 29) % 107;
      const secondScore = (hashText(answer.id + ":" + second.id + ":pair-choice") * 29) % 107;
      return firstScore - secondScore;
    }),
  };
};

export default function Game() {
  const [mode, setMode] = useState("category");
  const [level, setLevel] = useState("standard");
  const [playMode, setPlayMode] = useState("endless");
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [current, setCurrent] = useState(() => getPool("standard", "category")[0]);
  const [pairCurrent, setPairCurrent] = useState(() => pickPairNext(new Set()));
  const [usedIds, setUsedIds] = useState(() => new Set([getPool("standard", "category")[0].id]));
  /* Seeded with the two opening rounds so the window covers the session
   * from the first deal on. */
  const recentIdsRef = useRef(null);
  if (recentIdsRef.current === null) {
    recentIdsRef.current = [current.id, pairCurrent.answer.id];
  }
  const [result, setResult] = useState("idle");
  const [feedback, setFeedback] = useState("Pick the kind of name.");
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [streak, setStreak] = useState(0);
  /* True when this page load restored a saved game with progress; the
   * shell's resume notice shows until the player answers or moves on. */
  const [resumed, setResumed] = useState(false);

  const pool = useMemo(() => getPool(level, mode), [level, mode]);
  const choices = useMemo(() => {
    if (mode === "pokemon") return ["Pokemon", "Not Pokemon"];
    if (mode === "realAnimal") return pairCurrent.choices.map((choice) => choice.name);
    return getChoices(current);
  }, [current, mode, pairCurrent.choices]);

  const promptName = mode === "realAnimal" ? "Which is " + pairCurrent.target + "?" : current.name;
  /* Reveal-only photo: the answered entry in category/pokemon modes, the
   * pair's answer in realAnimal mode. Null entries render no figure. */
  const revealEntry = mode === "realAnimal" ? pairCurrent.answer : current;
  /* Reveal media: an embedded photo when one exists, otherwise a discreet
   * link to the official page (image never embedded for these entries). */
  const revealMedia = result !== "idle" && revealEntry ? NAME_QUEST_IMAGES[revealEntry.id] : null;
  const revealImage = revealMedia && revealMedia.thumb ? revealMedia : null;
  const revealLink = revealMedia && !revealMedia.thumb && revealMedia.link ? revealMedia.link : null;

  /* The first question is dealt before anything can preload it; warm its
   * reveal photo on mount so the first reveal is fast too. */
  useEffect(() => {
    const firstId = mode === "realAnimal" ? pairCurrent.answer.id : current.id;
    preloadImages([NAME_QUEST_IMAGES[firstId]?.thumb]);
  }, []);

  /* Save the game around the round now on screen (always unanswered —
   * saves are written when a round is dealt), with any state the
   * caller already computed; the rest falls back to current values.
   * The counters fall back to a ref, not state: the dealing callback
   * is memoized across the answer that changed them, so its closure
   * can hold last round's score — the ref is always current. */
  const countersRef = useRef({ score: 0, streak: 0, lives: 3 });
  useEffect(() => {
    countersRef.current = { score, streak, lives };
  }, [score, streak, lives]);
  const saveGame = (values) => {
    const pairToSave = values.pairCurrent ?? pairCurrent;
    saveResume(SAVE_KEY, {
      mode: values.mode ?? mode,
      level: values.level ?? level,
      playMode: values.playMode ?? playMode,
      lives: values.lives ?? countersRef.current.lives,
      score: values.score ?? countersRef.current.score,
      rounds: values.rounds ?? rounds,
      streak: values.streak ?? countersRef.current.streak,
      currentId: values.current ? values.current.id : current.id,
      pair: pairToSave
        ? { answerId: pairToSave.answer.id, choiceIds: pairToSave.choices.map((choice) => choice.id) }
        : null,
      usedIds: values.usedIds ?? [...usedIds],
      recentIds: recentIdsRef.current,
    });
  };

  /* Restore a saved game on load, or record the opening game so a
   * reload picks it up. Runs once; the opening rounds above are the
   * fresh-game fallback the restore replaces. */
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const saved = loadResume(SAVE_KEY, validateSave);
    if (!saved) {
      saveGame({});
      return;
    }
    setMode(saved.mode);
    setLevel(saved.level);
    setPlayMode(saved.playMode);
    setLives(saved.lives);
    setScore(saved.score);
    setRounds(saved.rounds);
    setStreak(saved.streak);
    setCurrent(saved.current);
    if (saved.pair) setPairCurrent(saved.pair);
    setUsedIds(new Set(saved.usedIds));
    recentIdsRef.current = saved.recentIds.length
      ? saved.recentIds
      : [saved.pair ? saved.pair.answer.id : saved.current.id];
    setResult("idle");
    setFeedback(
      saved.pair
        ? "Pick the " + saved.pair.target + "."
        : saved.mode === "pokemon"
          ? "Pokemon or not?"
          : "Pick the kind of name.",
    );
    setResumed(resumeHasProgress({ rounds: saved.rounds, score: saved.score }));
  }, []);

  const nextRound = useCallback(() => {
    setResumed(false);
    if (mode === "realAnimal") {
      const next = pickPairNext(new Set(recentIdsRef.current));
      setPairCurrent(next);
      recentIdsRef.current = applyRecentWindow(recentIdsRef.current, next.answer.id);
      const nextUsed = new Set(usedIds);
      if (nextUsed.size >= pairPrompts.length) nextUsed.clear();
      nextUsed.add(next.answer.id);
      setUsedIds(nextUsed);
      setResult("idle");
      setFeedback("Pick the " + next.target + ".");
      setRounds((value) => value + 1);
      /* Warm the reveal photo now, so the reveal is instant. */
      preloadImages([NAME_QUEST_IMAGES[next.answer.id]?.thumb]);
      saveGame({ pairCurrent: next, usedIds: [...nextUsed], rounds: rounds + 1 });

      return;
    }

    const next = mode === "pokemon" ? pickPokemonModeNext(new Set(recentIdsRef.current), current.id) : pickNext(pool, new Set(recentIdsRef.current), current.id);
    setCurrent(next);
    recentIdsRef.current = applyRecentWindow(recentIdsRef.current, next.id);
    const nextUsed = new Set(usedIds);
    if (nextUsed.size >= pool.length) nextUsed.clear();
    nextUsed.add(next.id);
    setUsedIds(nextUsed);
    setResult("idle");
    setFeedback(mode === "pokemon" ? "Pokemon or not?" : "Pick the kind of name.");
    setRounds((value) => value + 1);
    /* Warm the reveal photo now, so the reveal is instant. */
    preloadImages([NAME_QUEST_IMAGES[next.id]?.thumb]);
    saveGame({ current: next, usedIds: [...nextUsed], rounds: rounds + 1 });

  }, [current.id, mode, pool, usedIds]);

  const judgeAnswer = useCallback(
    (answer) => {
      if (result !== "idle") {
        return;
      }

      const normalized = normalize(answer);
      if (!normalized) return;

      if (mode === "realAnimal") {
        const selected = pairCurrent.choices.find((choice) => normalize(choice.name) === normalized);
        if (!selected) return;
        const exact = selected.id === pairCurrent.answer.id;
        const answerLine = exact
          ? "Yes. " + pairCurrent.answer.explanation
          : "Good guess. " + pairCurrent.answer.name + " is the " + pairCurrent.target + ". " + pairCurrent.answer.explanation;
        finishRound(exact ? "correct" : "miss", answerLine, exact);
        return;
      }

      if (mode === "pokemon") {
        const guessedPokemon = normalized === "pokemon";
        const guessedNotPokemon = ["not pokemon", "not a pokemon", "no"].includes(normalized);
        if (!guessedPokemon && !guessedNotPokemon) return;
        const isPokemon = current.category === "Pokemon";
        const exact = guessedPokemon === isPokemon;
        const answerLine = exact
          ? isPokemon
            ? "Yes. " + current.explanation
            : "Right. " + current.name + " is not a Pokemon. It is " + current.category.toLowerCase() + "."
          : isPokemon
            ? "Good guess. " + current.name + " is a Pokemon."
            : "Good guess. " + current.name + " is not a Pokemon. It is " + current.category.toLowerCase() + ".";
        finishRound(exact ? "correct" : "miss", answerLine, exact);
        return;
      }

      const accepted = new Set(
        [current.category, current.subcategory, ...current.acceptedAnswers, ...(categoryAliases[current.category] ?? [])].map(normalize),
      );
      const exact = accepted.has(normalized);
      const close =
        !exact &&
        Array.from(accepted).some((acceptedAnswer) => acceptedAnswer.includes(normalized) || normalized.includes(acceptedAnswer));
      const nextResult = exact ? "correct" : close ? "close" : "miss";
      const answerLine = nextResult === "miss" ? "Good guess. It is " + current.category.toLowerCase() + "." : "Yes. " + current.explanation;
      finishRound(nextResult, answerLine, nextResult !== "miss");
    },
    [current, mode, pairCurrent, result],
  );

  const finishRound = (nextResult, answerLine, counted) => {
    setResumed(false);
    setResult(nextResult);
    setFeedback(answerLine);
    setScore((value) => value + (counted ? 1 : 0));
    setStreak((value) => (counted ? value + 1 : 0));
    /* Rounds counts finished rounds; the round just answered is one more.
     * A close answer counts as scored, so it never costs a life. */
    const nextLivesCount = nextLives(playMode, lives, counted);
    setLives(nextLivesCount);
    const gameOver = isGameOver(playMode, rounds + 1, nextLivesCount);
    setOver(gameOver);
    /* A finished game is cleared, never restored. Otherwise the save
     * stays at the round just answered, as it was dealt: a reload
     * mid-reveal replays it with the score from when it was dealt. */
    if (gameOver) clearResume(SAVE_KEY);
  };


  const resetGame = (nextLevel = level, nextMode = mode, nextPlayMode = playMode) => {
    const nextPool = getPool(nextLevel, nextMode);
    const next = nextMode === "realAnimal" ? undefined : nextMode === "pokemon" ? pickPokemonModeNext(new Set(recentIdsRef.current)) : pickNext(nextPool, new Set(recentIdsRef.current));
    const nextPair = nextMode === "realAnimal" ? pickPairNext(new Set(recentIdsRef.current)) : pairCurrent;
    /* The window survives the reset: the fresh game's first round still
     * avoids the names just played. Only the progress set restarts. */
    if (nextMode === "realAnimal") {
      recentIdsRef.current = applyRecentWindow(recentIdsRef.current, nextPair.answer.id);
    } else if (next) {
      recentIdsRef.current = applyRecentWindow(recentIdsRef.current, next.id);
    }
    setMode(nextMode);
    setLevel(nextLevel);
    if (next) setCurrent(next);
    setPairCurrent(nextPair);
    setUsedIds(new Set([nextMode === "realAnimal" ? nextPair.answer.id : next?.id ?? current.id]));
    setResult("idle");
    setFeedback(nextMode === "realAnimal" ? "Pick the " + nextPair.target + "." : nextMode === "pokemon" ? "Pokemon or not?" : "Pick the kind of name.");
    setScore(0);
    setRounds(0);
    setStreak(0);
    setLives(3);
    setOver(false);
    setShowResults(false);
    setResumed(false);
    /* The fresh game replaces the save: cleared, then its opening
     * round is recorded so a reload picks the new game up. */
    clearResume(SAVE_KEY);
    saveGame({
      mode: nextMode,
      level: nextLevel,
      playMode: nextPlayMode,
      lives: 3,
      score: 0,
      rounds: 0,
      streak: 0,
      current: next ?? undefined,
      pairCurrent: nextPair,
      usedIds: [nextMode === "realAnimal" ? nextPair.answer.id : next?.id ?? current.id],
    });
  };

  /* Switching play mode starts a fresh game, so one mode's results never
   * mix with another's. Content mode and level switches already reset
   * through resetGame. */
  const switchPlayMode = (nextPlayMode) => {
    if (nextPlayMode === playMode) return;
    setPlayMode(nextPlayMode);
    resetGame(level, mode, nextPlayMode);
  };

  /* The answer line for the reveal: the entry's true category, reacting
   * to the player's choice — never the question, never a bare label. */
  const revealCategoryLine =
    mode === "realAnimal"
      ? "the " + pairCurrent.target
      : mode === "pokemon"
        ? current.category === "Pokemon"
          ? "a Pokemon"
          : "not a Pokemon — it is " + current.category
        : (/^[aeiou]/i.test(current.category) ? "an " : "a ") + current.category;
  /* Reveal media, moved off the board into the overlay: the same embedded
   * photo when one exists, otherwise the same discreet link. */
  const revealMediaElement = revealImage ? (
    <figure className="nq-reveal-image">
      <img src={revealImage.thumb} alt={revealEntry.name} loading="eager" fetchpriority="high" decoding="async" onError={(event) => { const figure = event.currentTarget.closest("figure"); if (figure) figure.style.display = "none"; }} />
      <figcaption>Photo: {revealImage.author}, {revealImage.license}, via <a href={revealImage.page} target="_blank" rel="noreferrer">Wikimedia Commons</a></figcaption>
    </figure>
  ) : revealLink ? (
    <a className="nq-reveal-link" href={revealLink} target="_blank" rel="noreferrer">See what {revealEntry.name} looks like ↗</a>
  ) : null;
  /* Verdict wash (Kahoot pattern): floods the page on reveal, clears on
   * the results screen. A close answer counts as correct. */
  const wash = result !== "idle" && !(over && showResults) ? (result === "miss" ? "is-wrong" : "is-correct") : "";

  return (
    <main className={"name-quest-page qs-game" + (wash ? " " + wash : "")}>
      <MinimalTopBar
        settingsSummary={modeLabels[mode] + " · " + (PLAY_MODES.find((play) => play.id === playMode) || {}).label}
        onStartOver={() => resetGame()}
        score={score}
        lives={lives}
        showLives={playMode === "lives"}
      >
        <div className="qs-menu-group">
          <span className="qs-menu-label">Game mode</span>
          <div className="pf-pill-group" role="group" aria-label="Game mode">
            {Object.keys(modeLabels).map((nextMode) => (
              <button key={nextMode} type="button" className="pf-pill" aria-label={modeLabels[nextMode]} aria-pressed={nextMode === mode} onClick={() => resetGame(level, nextMode)}>
                {modeLabels[nextMode]}
              </button>
            ))}
          </div>
        </div>
        {mode === "category" && (
          <div className="qs-menu-group">
            <span className="qs-menu-label">Level</span>
            <div className="pf-pill-group" role="group" aria-label="Level">
              {Object.keys(levelLabels).map((nextLevel) => (
                <button key={nextLevel} type="button" className="pf-pill" aria-pressed={nextLevel === level} onClick={() => resetGame(nextLevel, mode)}>{levelLabels[nextLevel]}</button>
              ))}
            </div>
          </div>
        )}
        <div className="qs-menu-group">
          <span className="qs-menu-label">Play mode</span>
          <div className="pf-pill-group" role="group" aria-label="Play mode">
            {PLAY_MODES.map((play) => (
              <button key={play.id} type="button" className="pf-pill" aria-pressed={playMode === play.id} onClick={() => switchPlayMode(play.id)}>{play.label}</button>
            ))}
          </div>
        </div>
      </MinimalTopBar>

      {over && showResults ? (
        <GameResults
          kicker={playMode === "ten" ? "10 rounds done!" : "Out of lives!"}
          correct={score}
          played={rounds + 1}
          onPlayAgain={() => resetGame()}
        />
      ) : (
        <section className="name-quest-board" aria-label="Name Quest round">
          {resumed && <ResumeNotice />}
          <p className="qs-round">Round {rounds + 1}{playMode === "ten" ? " of 10" : ""}</p>
          <h1 className="qs-question">{mode === "pokemon" ? "Pokemon or not?" : mode === "realAnimal" ? "Which one is it?" : "What kind of name is this?"}</h1>
          <div className="name-card-stage">
            <h2 className="quest-name">{promptName}</h2>
            <strong className={"round-feedback " + result} aria-live="polite">{feedback}</strong>
          </div>

          <div className="choice-grid">
            {choices.map((choice) => (
              <button key={choice} type="button" className="qs-choice" disabled={result !== "idle"} onClick={() => judgeAnswer(choice)}>{choice}</button>
            ))}
          </div>
          {result !== "idle" && (
            <ResultReveal
              verdict={result === "correct" ? "correct" : result === "close" ? "close" : "wrong"}
              title={result === "correct" ? "Correct" : result === "close" ? "So close" : "Incorrect"}
              answer={<p><strong>{revealEntry.name}</strong> is {revealCategoryLine}.</p>}
              media={revealMediaElement}
              brief={<p>{feedback}</p>}
              details={null}
              nextLabel={over ? "See results" : "Next round"}
              onNext={over ? () => setShowResults(true) : nextRound}
            />
          )}
        </section>
      )}

      <GameFooter poolLabel={entries.length + " names"} credits={CREDITS} />
    </main>
  );
}
