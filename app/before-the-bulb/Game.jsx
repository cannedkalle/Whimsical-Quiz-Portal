'use client';

import { useEffect, useRef, useState } from 'react';
import ResultReveal from '../components/ResultReveal';
import { GameFooter, GameResults, MinimalTopBar, ResumeNotice } from '../components/QuizShell';
import { clearResume, loadResume, resumeHasProgress, resumeNumber, saveResume } from '../../lib/resume.mjs';
import { createGame } from '../../lib/before-the-bulb/game.mjs';
import { PLAY_MODES, isGameOver, nextLives } from '../../lib/quiz-play.mjs';
import {
  objectMap,
  objects,
  pairs,
  sourceMap,
  wildPairs,
} from '../../lib/before-the-bulb/content.mjs';
import { BULB_IMAGES } from '../../lib/before-the-bulb/images.mjs';
import { preloadImages } from '../../lib/preload-images.mjs';

/* Same modes, titles, descriptions, labels, and pool copy as the standalone
 * game. Progress now follows the shared resume pattern (lib/resume.mjs):
 * the in-progress game is saved on every deal, so a reload picks it up
 * where it left off; a finished game is cleared, never restored. */
const MODES = {
  curated: {
    pairs,
    title: 'Curated mode',
    description: 'Hand-picked matchups with a bright little fact.',
    poolLabel: `${objects.length} inventions`,
  },
  wild: {
    pairs: wildPairs,
    title: 'Wild mode',
    description: 'Fun date pairings, from close cousins to wild contrasts.',
    poolLabel: `${objects.length} inventions`,
  },
};

const SAVE_KEY = 'before-the-bulb-save-v1';

/* Validate a saved game against the live pools: the pool and play mode
 * must still exist, the pair must be in the pool, and the counters
 * must be sane. The engine re-validates the pair and its choices on
 * restore; anything off returns null and the game starts fresh. Only
 * unanswered rounds are ever saved — an answered round saves the next
 * round it dealt, so a reload mid-reveal lands on that next round. */
function validateSave(saved) {
  if (!MODES[saved.mode]) return null;
  if (!PLAY_MODES.some((play) => play.id === saved.playMode)) return null;
  if (!MODES[saved.mode].pairs.some((pair) => pair.id === saved.pairId)) return null;
  const correct = resumeNumber(saved.correct);
  const answered = resumeNumber(saved.answered);
  const lives = resumeNumber(saved.lives, { max: 3 });
  const streak = resumeNumber(saved.streak);
  if (correct === null || answered === null || lives === null || streak === null) return null;
  if (correct > answered) return null;
  const poolIds = new Set(MODES[saved.mode].pairs.map((pair) => pair.id));
  const recent = Array.isArray(saved.recent)
    ? saved.recent.filter((id) => poolIds.has(id))
    : [];
  return {
    mode: saved.mode,
    playMode: saved.playMode,
    lives,
    streak,
    pairId: saved.pairId,
    choices: saved.choices,
    correct,
    answered,
    recent,
  };
}

/* Photo credits, in the game's own order: one line per invention that can
 * appear, from the same images data the cards use. */
const CREDITS = objects
  .filter((object) => BULB_IMAGES[object.id])
  .map((object) => ({ id: object.id, name: object.name, ...BULB_IMAGES[object.id] }));

function sourceLinks(ids) {
  return ids.map((id) => {
    const source = sourceMap.get(id);
    return (
      <p key={id}>
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          {`${source.publisher} · ${source.title} ↗`}
        </a>
      </p>
    );
  });
}

export default function Game() {
  const [game, setGame] = useState(() => createGame(MODES.curated.pairs));
  const [mode, setMode] = useState('curated');
  const [playMode, setPlayMode] = useState('endless');
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [snap, setSnap] = useState(null);
  const [queuedSnap, setQueuedSnap] = useState(null);
  const [defOpen, setDefOpen] = useState({});
  /* True when this page load restored a saved game with progress; the
   * shell's resume notice shows until the player answers or moves on. */
  const [resumed, setResumed] = useState(false);
  const startedRef = useRef(false);
  /* Session no-repeat window, shared by both pools: the last 12 dealt
   * pair ids, kept for the whole page session across mode switches,
   * play-mode switches, and restarts (a reload starts fresh, like the
   * score). Deals avoid it; the game itself holds no deck. */
  const recentRef = useRef([]);
  const track = (snap) => {
    if (snap.pair && recentRef.current[recentRef.current.length - 1] !== snap.pair.id) {
      recentRef.current = [...recentRef.current, snap.pair.id].slice(-12);
    }
    return snap;
  };
  const dealNext = (gameObj) => track(gameObj.next(recentRef.current));
  /* Save the round now on screen (always unanswered) with the game
   * state around it, so a reload restores exactly this round. */
  const saveSnap = (snapToSave, settings) => {
    if (!snapToSave || !snapToSave.pair) return;
    saveResume(SAVE_KEY, {
      mode: settings.mode,
      playMode: settings.playMode,
      lives: settings.lives,
      streak: settings.streak,
      pairId: snapToSave.pair.id,
      choices: snapToSave.choices,
      correct: snapToSave.correct,
      answered: snapToSave.answered,
      recent: recentRef.current,
    });
  };
  const focusRequest = useRef(null);
  const questionRef = useRef(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const saved = loadResume(SAVE_KEY, validateSave);
    if (saved) {
      const restoredGame = createGame(MODES[saved.mode].pairs);
      const restoredSnap = restoredGame.restore(saved);
      if (restoredSnap) {
        recentRef.current = saved.recent;
        setGame(restoredGame);
        setMode(saved.mode);
        setPlayMode(saved.playMode);
        setLives(saved.lives);
        setStreak(saved.streak);
        setSnap(track(restoredSnap));
        setResumed(resumeHasProgress({ rounds: saved.answered, score: saved.correct }));
        return;
      }
    }
    const first = dealNext(game);
    setSnap(first);
    saveSnap(first, { mode, playMode, lives, streak });
  }, []);

  useEffect(() => {
    if (!snap) return;
    if (focusRequest.current === 'question') {
      questionRef.current?.focus({ preventScroll: true });
    }
    focusRequest.current = null;
  }, [snap]);

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;
    const nextGame = createGame(MODES[nextMode].pairs);
    setGame(nextGame);
    setMode(nextMode);
    setDefOpen({});
    setLives(3);
    setStreak(0);
    setOver(false);
    setShowResults(false);
    setResumed(false);
    startedRef.current = true;
    focusRequest.current = 'question';
    setQueuedSnap(null);
    const first = dealNext(nextGame);
    setSnap(first);
    saveSnap(first, { mode: nextMode, playMode, lives: 3, streak: 0 });
  };

  /* Switching play mode starts a fresh game in the same pool, so one
   * mode's results never mix with another's. */
  const switchPlayMode = (nextPlayMode) => {
    if (nextPlayMode === playMode) return;
    const nextGame = createGame(MODES[mode].pairs);
    setGame(nextGame);
    setPlayMode(nextPlayMode);
    setDefOpen({});
    setLives(3);
    setStreak(0);
    setOver(false);
    setShowResults(false);
    setResumed(false);
    startedRef.current = true;
    focusRequest.current = 'question';
    setQueuedSnap(null);
    const first = dealNext(nextGame);
    setSnap(first);
    saveSnap(first, { mode, playMode: nextPlayMode, lives: 3, streak: 0 });
  };

  const handleAnswer = (id) => {
    const result = game.answer(id);
    if (!result) return;
    setResumed(false);
    setDefOpen({});
    setSnap(result);
    const wasCorrect = result.selected === result.pair.earlierObjectId;
    const nextLivesCount = nextLives(playMode, lives, wasCorrect);
    const nextStreak = wasCorrect ? streak + 1 : 0;
    setLives(nextLivesCount);
    setStreak(nextStreak);
    const gameOver = isGameOver(playMode, result.answered, nextLivesCount);
    setOver(gameOver);
    if (!gameOver) {
      /* Deal the next round now and warm its photos, so advancing is instant.
       * The save moves to that next round: a reload mid-reveal lands on
       * it, unanswered, with this round's score already counted. */
      const upNext = dealNext(game);
      setQueuedSnap(upNext);
      preloadImages([BULB_IMAGES[upNext.pair.objectAId]?.thumb, BULB_IMAGES[upNext.pair.objectBId]?.thumb]);
      saveSnap(upNext, { mode, playMode, lives: nextLivesCount, streak: nextStreak });
    } else {
      /* A finished game is cleared, never restored. */
      clearResume(SAVE_KEY);
    }
  };

  const handleNext = () => {
    if (over) {
      setShowResults(true);
      return;
    }
    focusRequest.current = 'question';
    setDefOpen({});
    const nextSnap = queuedSnap ?? dealNext(game);
    setSnap(nextSnap);
    setQueuedSnap(null);
    saveSnap(nextSnap, { mode, playMode, lives, streak });
  };

  const handleRestart = () => {
    focusRequest.current = 'question';
    setDefOpen({});
    setLives(3);
    setStreak(0);
    setOver(false);
    setShowResults(false);
    setResumed(false);
    setQueuedSnap(null);
    const freshSnap = track(game.reset(recentRef.current));
    setSnap(freshSnap);
    clearResume(SAVE_KEY);
    saveSnap(freshSnap, { mode, playMode, lives: 3, streak: 0 });
  };

  const activeMode = MODES[mode];
  const answered = snap !== null && snap.selected !== null;
  const pair = snap?.pair ?? null;
  const earlier = pair ? objectMap.get(pair.earlierObjectId) : null;
  const later =
    pair && snap
      ? objectMap.get(snap.choices.find((id) => id !== earlier.id))
      : null;
  const isCorrect = answered && snap.selected === earlier.id;
  const announcement = answered
    ? `${isCorrect ? 'Correct!' : 'Good guess!'} ${earlier.name} came first. ${
        earlier.dateDisplay
      }; ${later.name}, ${later.dateDisplay}. ${pair.funFact}`
    : '';

  return (
    <div className="before-the-bulb">
      <main className={answered && !(over && showResults) ? `shell qs-game is-${isCorrect ? 'correct' : 'wrong'}` : 'shell qs-game'}>
        <MinimalTopBar
          settingsSummary={`${mode === 'curated' ? 'Curated' : 'Wild'} · ${(PLAY_MODES.find((play) => play.id === playMode) || {}).label}`}
          onStartOver={handleRestart}
          score={snap ? snap.correct : 0}
          lives={lives}
          showLives={playMode === 'lives'}
        >
          <div className="qs-menu-group">
            <span className="qs-menu-label">Pool</span>
            <div className="pf-pill-group" role="group" aria-label="Pool">
              <button className="pf-pill" type="button" aria-pressed={mode === 'curated'} onClick={() => switchMode('curated')}>Curated</button>
              <button className="pf-pill" type="button" aria-pressed={mode === 'wild'} onClick={() => switchMode('wild')}>Wild</button>
            </div>
          </div>
          <div className="qs-menu-group">
            <span className="qs-menu-label">Play mode</span>
            <div className="pf-pill-group" role="group" aria-label="Play mode">
              {PLAY_MODES.map((play) => (
                <button className="pf-pill" key={play.id} type="button" aria-pressed={playMode === play.id} onClick={() => switchPlayMode(play.id)}>{play.label}</button>
              ))}
            </div>
          </div>
        </MinimalTopBar>
        {resumed && <ResumeNotice />}
        <section className="game" aria-labelledby="question">
          {over && showResults ? (
            <GameResults
              kicker={playMode === 'ten' ? '10 rounds done!' : 'Out of lives!'}
              correct={snap.correct}
              played={snap.answered}
              onPlayAgain={handleRestart}
            />
          ) : (
            <>
          {snap && (
            <p className="qs-round">Round {answered ? snap.answered : snap.answered + 1}{playMode === 'ten' ? ' of 10' : ''}</p>
          )}
          <h1 id="question" className="qs-question" tabIndex={-1} ref={questionRef}>Which came first?</h1>
          <div
            className="choices"
            id="choices"
            aria-label="Choose the earlier invention"
          >
            {snap &&
              snap.choices.map((id) => {
                const object = objectMap.get(id);
                const image = BULB_IMAGES[object.id];
                const isEarlier = answered && id === earlier.id;
                const isChosen = answered && id === snap.selected;
                return (
                  <article
                    key={id}
                    className={`choice-card${
                      isEarlier ? ' is-earlier' : ''
                    }${isChosen ? ' is-chosen' : ''}`}
                  >
                    <button
                      className="pick qs-choice"
                      type="button"
                      disabled={answered}
                      aria-label={`Choose ${object.name}`}
                      onClick={() => handleAnswer(id)}
                    >
                      {answered && isEarlier && <span className="qs-verdict-mark is-correct" aria-hidden="true">✓</span>}
                      {answered && isChosen && !isEarlier && <span className="qs-verdict-mark is-wrong" aria-hidden="true">✗</span>}
                      <span className="object-art" aria-hidden="true">
                        {image && (
                          <img
                            src={image.thumb}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </span>
                      <strong className="object-name">{object.name}</strong>
                    </button>
                    <button
                      className="definition-toggle"
                      type="button"
                      aria-label={`What's this: ${object.name}?`}
                      aria-expanded={!!defOpen[id]}
                      aria-controls={`definition-${id}`}
                      onClick={() =>
                        setDefOpen((open) => ({ ...open, [id]: !open[id] }))
                      }
                    >
                      {defOpen[id]
                        ? 'Got it! Close definition'
                        : 'What’s this?'}
                    </button>
                    {defOpen[id] && (
                      <p className="definition" id={`definition-${id}`}>
                        {object.kidDefinition}
                      </p>
                    )}
                  </article>
                );
              })}
          </div>
          {answered && (
            <ResultReveal
              verdict={isCorrect ? 'correct' : 'wrong'}
              title={isCorrect ? 'Correct' : 'Incorrect'}
              answer={
                <>
                  <h3 className="bb-answer-line">{`${earlier.name} came first!`}</h3>
                  <div className="dates" id="dates">
                    {snap.choices.map((id) => {
                      const object = objectMap.get(id);
                      const isEarlier = object.id === earlier.id;
                      return (
                        <div
                          key={id}
                          className={`date ${
                            isEarlier ? 'is-earlier' : 'is-later'
                          }`}
                        >
                          <span className="label">
                            {isEarlier ? 'Came first' : 'Came later'}
                          </span>
                          <strong>{object.dateDisplay}</strong>
                          <h3>{object.name}</h3>
                          <p>{object.dateBasis}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              }
              brief={
                <div className="fact">
                  <span aria-hidden="true">💡</span>
                  <div>
                    <h3 id="fact-heading">
                      {pair.funFact
                        ? 'A bright little fact'
                        : 'A wild little thought'}
                    </h3>
                    <p id="fact">
                      {pair.funFact ||
                        'A wild time-travel matchup! Check the dates to see how far apart these ideas are.'}
                    </p>
                  </div>
                </div>
              }
              details={
                <>
                  <p className="source-note">
                    Inventions take shape over time. These dates mark the
                    specific milestones shown above.
                  </p>
                  <div id="sources">
                    {[earlier, later].map((object) => (
                      <div className="source-item" key={object.id}>
                        <strong>{`${object.name}: ${object.dateDisplay}`}</strong>
                        <p>{object.ambiguityNotes}</p>
                        {sourceLinks(object.dateSourceIds)}
                      </div>
                    ))}
                    {pair.factSourceIds?.length ? (
                      <div className="source-item">
                        <strong>Fun fact source</strong>
                        {sourceLinks(pair.factSourceIds)}
                      </div>
                    ) : null}
                  </div>
                </>
              }
              nextLabel={over ? 'See results' : 'Next round'}
              onNext={handleNext}
            />
          )}
          <p
            className="sr-only"
            id="announcement"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcement}
          </p>
            </>
          )}
        </section>
        <GameFooter poolLabel={snap ? activeMode.poolLabel : ''} credits={CREDITS} />
        <noscript>
          <p>
            This game needs JavaScript enabled to show its invention cards.
          </p>
        </noscript>
      </main>
    </div>
  );
}
