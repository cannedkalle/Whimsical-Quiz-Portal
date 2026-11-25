'use client';

import { useEffect, useRef, useState } from 'react';
import { buildReveal, clearProgress, generateComparison, loadProgress, saveProgress } from '../../lib/wild-guess/client-game.mjs';
import { PLAY_MODES, isGameOver, nextLives } from '../../lib/quiz-play.mjs';
import { resumeHasProgress } from '../../lib/resume.mjs';
import { WILD_GUESS_IMAGES } from '../../lib/wild-guess/images.mjs';
import { subjects } from '../../lib/wild-guess/subjects.mjs';
import { preloadImages } from '../../lib/preload-images.mjs';
import { GameFooter, GameResults, MinimalTopBar, ResumeNotice } from '../components/QuizShell';
import ResultReveal from '../components/ResultReveal';

/* Balls in the Ballpark, played entirely in the browser: matchups are dealt
 * from the catalog that lives in the repo, and progress is kept in the
 * player's own browser storage. No server database is involved, so the game
 * works on the live site — and offline once installed — like the portal's
 * other games. Frame is the shared minimal frame (Kombai, 2026-11-19,
 * unified across all five quizzes 2026-11-23): one top row — exit, the
 * settings dropdown, the score — then the matchup. The dropdown is the
 * shell's own `<details>` menu; the category/play-mode pills live
 * inside it, never rows on the page. The photo's alt is empty on
 * purpose: the button's own text already names the choice, and an
 * alt repeating it doubled the button's accessible name. */

/* Photo credits, in the game's own order: one line per subject that can
 * appear, from the same images data the cards use. */
const CREDITS = subjects
  .filter((subject) => WILD_GUESS_IMAGES[subject.id])
  .map((subject) => ({ id: subject.id, name: subject.label, ...WILD_GUESS_IMAGES[subject.id] }));
function ChoicePhoto({ option, className = 'wg-choice-photo' }) {
  const [failed, setFailed] = useState(false);
  const image = WILD_GUESS_IMAGES[option.id];
  if (!image || failed) return null;
  return <img className={className} src={image.thumb} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export default function Game() {
  const [comparison, setComparison] = useState(null);
  const [position, setPosition] = useState(0);
  const [played, setPlayed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [reveal, setReveal] = useState(null);
  const [queued, setQueued] = useState(null);
  const [error, setError] = useState('');
  const [playMode, setPlayMode] = useState('endless');
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  /* True when this page load restored a saved game with progress; the
   * shell's resume notice shows until the player answers or moves on. */
  const [resumed, setResumed] = useState(false);
  /* Category filter: 'mixed' deals from all categories (the default),
   * otherwise only that category. */
  const [category, setCategory] = useState('mixed');
  const CATEGORIES = [
    { id: 'mixed', label: 'Mixed' },
    { id: 'count', label: 'Count' },
    { id: 'duration', label: 'Duration' },
    { id: 'frequency', label: 'Frequency' },
    { id: 'length', label: 'Length' },
  ];
  const heading = useRef(null);
  const historyRef = useRef([]);
  /* Deal through the generator, avoiding the last 12 matchups so the same
   * pairing does not come straight back. The history lives for the whole
   * page session: Play again and mode switches never clear it, so a fresh
   * game never re-deals a recent pairing. Every deal stays an independent
   * random draw — there is no deck, no fixed order, no sequence to learn.
   * A deal never gives up on the first failure: if the draw comes back
   * empty it retries with the recent-pair history cleared, then from any
   * category, so Start over and Next can never leave the player stuck on
   * a stale round. */
  const deal = (categoryOverride) => {
    const cat = categoryOverride ?? category;
    const draw = (c, avoidIds) =>
      generateComparison(c === 'mixed' ? undefined : c, { pairIds: avoidIds });
    let next = draw(cat, historyRef.current);
    if (!next) {
      historyRef.current = [];
      next = draw(cat, []);
    }
    if (!next) {
      historyRef.current = [];
      next = draw(undefined, []);
    }
    if (next) {
      historyRef.current = [...historyRef.current, next.id].slice(-12);
    }
    return next;
  };

  /* Start over resets first and deals second, so a failed deal can never
   * leave the player stuck on a stale round: the score, round and error
   * are cleared unconditionally, and only then is a fresh matchup dealt. */
  const startFresh = (categoryOverride, modeOverride) => {
    clearProgress();
    setResumed(false);
    setComparison(null);
    setPosition(0);
    setPlayed(0);
    setCorrect(0);
    setReveal(null);
    setQueued(null);
    setError('');
    setLives(3);
    setStreak(0);
    setOver(false);
    setShowResults(false);
    const next = deal(categoryOverride);
    if (!next) {
      setError('No matchups are available yet.');
      return;
    }
    setComparison(next);
    saveProgress({ leftId: next.left.id, rightId: next.right.id, category: next.category, position: 0, played: 0, correct: 0, playMode: modeOverride ?? playMode, lives: 3, streak: 0, filter: typeof categoryOverride === 'string' ? categoryOverride : category, recent: historyRef.current });
  };

  /* Switching play mode resets the score, so one mode's results never mix
   * with another's. */
  const switchPlayMode = (nextMode) => {
    if (nextMode === playMode) return;
    setPlayMode(nextMode);
    startFresh(undefined, nextMode);
  };

  /* Switching category resets the score, same as switching play mode. */
  const switchCategory = (nextCategory) => {
    if (nextCategory === category) return;
    setCategory(nextCategory);
    startFresh(nextCategory);
  };

  useEffect(() => {
    const saved = loadProgress();
    if (saved) {
      historyRef.current = saved.recent;
      setComparison(saved.comparison);
      setPosition(saved.position);
      setPlayed(saved.played);
      setCorrect(saved.correct);
      setPlayMode(saved.playMode);
      setLives(saved.lives);
      setStreak(saved.streak);
      setCategory(saved.categoryFilter);
      setResumed(resumeHasProgress({ rounds: saved.played, score: saved.correct }));
    } else {
      startFresh();
    }
  }, []);
  /* Focus the question when a round is dealt. While the reveal is
   * shown it focuses its own title, so the question is not focused
   * then; Next clears the reveal and focus returns here. */
  useEffect(() => { if (comparison && !reveal) heading.current?.focus(); }, [comparison, reveal]);

  const choose = (choice) => {
    if (!comparison || reveal) return;
    setResumed(false);
    const nextReveal = buildReveal(comparison, choice);
    const nextPlayed = played + 1;
    const nextCorrect = correct + (nextReveal.correct ? 1 : 0);
    const nextStreak = nextReveal.correct ? streak + 1 : 0;
    const nextLivesCount = nextLives(playMode, lives, nextReveal.correct);
    const gameOver = isGameOver(playMode, nextPlayed, nextLivesCount);
    setReveal(nextReveal);
    setPlayed(nextPlayed);
    setCorrect(nextCorrect);
    setLives(nextLivesCount);
    setStreak(nextStreak);
    setOver(gameOver);
    if (gameOver) {
      /* Results are ephemeral: a reload after the game ends starts fresh
       * rather than restoring a finished game. */
      setQueued(null);
      clearProgress();
      return;
    }
    /* Deal the next round now, so reloading mid-reveal lands on it — the
     * same resume behavior the server game had. */
    const upNext = deal();
    setQueued(upNext);
    if (upNext) {
      /* The next round is dealt; warm its photos now so advancing is instant. */
      preloadImages([WILD_GUESS_IMAGES[upNext.left.id]?.thumb, WILD_GUESS_IMAGES[upNext.right.id]?.thumb]);
      saveProgress({ leftId: upNext.left.id, rightId: upNext.right.id, category: upNext.category, position: position + 1, played: nextPlayed, correct: nextCorrect, playMode, lives: nextLivesCount, streak: nextStreak, filter: category, recent: historyRef.current });
    } else {
      saveProgress({ leftId: comparison.left.id, rightId: comparison.right.id, category: comparison.category, position, played: nextPlayed, correct: nextCorrect, playMode, lives: nextLivesCount, streak: nextStreak, filter: category, recent: historyRef.current });
    }
  };

  const next = () => {
    if (queued) {
      setComparison(queued);
      setPosition(position + 1);
      setReveal(null);
      setQueued(null);
      setError('');
      return;
    }
    const nextComparison = deal();
    if (!nextComparison) {
      setError('No matchups are available yet.');
      return;
    }
    const nextPosition = position + 1;
    setReveal(null);
    setComparison(nextComparison);
    setPosition(nextPosition);
    setQueued(null);
    setError('');
    saveProgress({ leftId: nextComparison.left.id, rightId: nextComparison.right.id, category: nextComparison.category, position: nextPosition, played, correct, playMode, lives, streak, filter: category, recent: historyRef.current });
  };

  const correctSide = reveal ? reveal.sides[reveal.correctChoice] : null;
  /* The other choice: the visible answer covers both sides, not only
   * the right answer — each block labeled by its short, correct side
   * first. Only the notes stay behind Dive deeper. */
  const otherSide = reveal ? reveal.sides[1 - reveal.correctChoice] : null;
  const hasNotes = Boolean(reveal && (correctSide.note || otherSide.note));

  const round = reveal ? played : played + 1;

  return <main className={reveal && !(over && showResults) ? `wg qs-game is-${reveal.correct ? 'correct' : 'wrong'}` : 'wg qs-game'}><div className="wg-layout"><MinimalTopBar
    settingsSummary={`${(CATEGORIES.find((cat) => cat.id === category) || {}).label} · ${(PLAY_MODES.find((mode) => mode.id === playMode) || {}).label}`}
    onStartOver={startFresh}
    score={correct}
    lives={lives}
    showLives={playMode === 'lives'}
  >
    <div className="qs-menu-group">
      <span className="qs-menu-label">Category</span>
      <div className="pf-pill-group" role="group" aria-label="Category">{CATEGORIES.map((cat) => <button key={cat.id} className="pf-pill" type="button" aria-pressed={category === cat.id} onClick={() => switchCategory(cat.id)}>{cat.label}</button>)}</div>
    </div>
    <div className="qs-menu-group">
      <span className="qs-menu-label">Play mode</span>
      <div className="pf-pill-group" role="group" aria-label="Play mode">{PLAY_MODES.map((mode) => <button key={mode.id} className="pf-pill" type="button" aria-pressed={playMode === mode.id} onClick={() => switchPlayMode(mode.id)}>{mode.label}</button>)}</div>
    </div>
  </MinimalTopBar><section className="wg-board">
    {error && <div className="wg-error" role="alert">{error} <button className="pf-btn" onClick={startFresh}>Start over</button></div>}
    {!comparison ? <div className="wg-loading">Finding a curious matchup…</div> : <>
      {over && showResults ? <GameResults
        kicker={playMode === 'ten' ? '10 rounds done!' : 'Out of lives!'}
        correct={correct}
        played={played}
        onPlayAgain={startFresh}
      /> : <>
        {resumed && <ResumeNotice />}
        <p className="qs-round">Round {round}{playMode === 'ten' ? ' of 10' : ''}</p>
        <h1 className="qs-question" ref={heading} tabIndex={-1}>{comparison.prompt}</h1>
        <div className="wg-choice-grid">{[comparison.left, comparison.right].map((option, index) => <button key={option.label} className={`qs-choice${reveal ? (index === reveal.correctChoice ? ' is-correct' : index === reveal.choice ? ' is-wrong' : ' is-dim') : ''}`} disabled={reveal !== null} onClick={() => choose(index)}><ChoicePhoto option={option} />{reveal && index === reveal.correctChoice && <span className="qs-verdict-mark is-correct" aria-hidden="true">✓</span>}{reveal && index === reveal.choice && !reveal.correct && <span className="qs-verdict-mark is-wrong" aria-hidden="true">✗</span>}<span className="wg-choice-text"><span className="wg-option-emoji" aria-hidden="true">{option.emoji}</span><strong>{option.label}</strong></span></button>)}</div>
        {reveal && <ResultReveal
          verdict={reveal.correct ? 'correct' : 'wrong'}
          title={reveal.correct ? 'Correct' : 'Incorrect'}
          answer={<div className="wg-correct-choice">
            <p className="wg-correct-line"><strong>{correctSide.short}</strong>{' — '}{correctSide.scale}</p>
            <p className="wg-reveal-detail"><strong>{correctSide.short}</strong>{' — '}{correctSide.detail}</p>
            <p className="wg-reveal-detail"><strong>{otherSide.short}</strong>{' — '}{otherSide.scale} · {otherSide.detail}</p>
          </div>}
          details={hasNotes ? <>
            {correctSide.note ? <p className="wg-reveal-note">{correctSide.note}</p> : null}
            {otherSide.note ? <p className="wg-reveal-note">{otherSide.note}</p> : null}
          </> : null}
          nextLabel={over ? 'See results' : 'Next round'}
          onNext={over ? () => setShowResults(true) : () => next()}
        />}
      </>}
    </>}
  </section><GameFooter poolLabel={`${subjects.length} subjects`} credits={CREDITS} /></div></main>;
}
