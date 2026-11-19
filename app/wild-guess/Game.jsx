'use client';

import { useEffect, useRef, useState } from 'react';
import { buildReveal, clearProgress, generateComparison, loadProgress, saveProgress } from '../../lib/wild-guess/client-game.mjs';
import { PLAY_MODES, isGameOver, nextLives } from '../../lib/quiz-play.mjs';
import { WILD_GUESS_IMAGES } from '../../lib/wild-guess/images.mjs';
import { preloadImages } from '../../lib/preload-images.mjs';
import { ArrowRightIcon } from "../components/Icons";
import ResultReveal from '../components/ResultReveal';

/* Balls in the Ballpark, played entirely in the browser: matchups are dealt
 * from the catalog that lives in the repo, and progress is kept in the
 * player's own browser storage. No server database is involved, so the game
 * works on the live site — and offline once installed — like the portal's
 * other games. Frame is minimal (Kombai, 2026-11-19): one top row — exit,
 * the settings dropdown, the score — then the matchup. The dropdown is
 * the shell's own `<details>` menu, reused without the GameBar title and
 * status line; the mode/category pills were already inside it, never
 * rows on the page. */

/* Option-card photo: looked up by subject id, hidden if it fails to load
 * so the card always works with text alone. */
function ChoicePhoto({ option, className = 'wg-choice-photo' }) {
  const [failed, setFailed] = useState(false);
  const image = WILD_GUESS_IMAGES[option.id];
  if (!image || failed) return null;
  return <img className={className} src={image.thumb} alt={option.label} loading="lazy" onError={() => setFailed(true)} />;
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
  /* The sheet shows the correct choice only — one flowing line,
   * short + scale — after the big verdict. The detail and note
   * lines for that side sit behind "Show details". */
  const [showDetails, setShowDetails] = useState(false);
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
   * random draw — there is no deck, no fixed order, no sequence to learn. */
  const deal = (categoryOverride) => {
    const cat = categoryOverride ?? category;
    const next = generateComparison(cat === 'mixed' ? undefined : cat, { pairIds: historyRef.current });
    if (next) {
      historyRef.current = [...historyRef.current, next.id].slice(-12);
    }
    return next;
  };

  const startFresh = (categoryOverride) => {
    const next = deal(categoryOverride);
    if (!next) {
      setError('No matchups are available yet.');
      return;
    }
    clearProgress();
    setComparison(next);
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
    setShowDetails(false);
    saveProgress({ leftId: next.left.id, rightId: next.right.id, category: next.category, position: 0, played: 0, correct: 0 });
  };

  /* Switching play mode resets the score, so one mode's results never mix
   * with another's. */
  const switchPlayMode = (nextMode) => {
    if (nextMode === playMode) return;
    setPlayMode(nextMode);
    startFresh();
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
      setComparison(saved.comparison);
      setPosition(saved.position);
      setPlayed(saved.played);
      setCorrect(saved.correct);
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
    const nextReveal = buildReveal(comparison, choice);
    const nextPlayed = played + 1;
    const nextCorrect = correct + (nextReveal.correct ? 1 : 0);
    const nextLivesCount = nextLives(playMode, lives, nextReveal.correct);
    const gameOver = isGameOver(playMode, nextPlayed, nextLivesCount);
    setReveal(nextReveal);
    setPlayed(nextPlayed);
    setCorrect(nextCorrect);
    setLives(nextLivesCount);
    setStreak(nextReveal.correct ? streak + 1 : 0);
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
      saveProgress({ leftId: upNext.left.id, rightId: upNext.right.id, category: upNext.category, position: position + 1, played: nextPlayed, correct: nextCorrect });
    } else {
      saveProgress({ leftId: comparison.left.id, rightId: comparison.right.id, category: comparison.category, position, played: nextPlayed, correct: nextCorrect });
    }
  };

  const next = () => {
    setShowDetails(false);
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
    saveProgress({ leftId: nextComparison.left.id, rightId: nextComparison.right.id, category: nextComparison.category, position: nextPosition, played, correct });
  };

  const correctSide = reveal ? reveal.sides[reveal.correctChoice] : null;

  /* The settings menu is the shell's own `<details>` dropdown
   * (QuizShell): a pick inside collapses it again, so the question is
   * the next thing on screen. The toggle itself is not a button, so
   * opening and closing the menu by tapping it is unaffected. */
  const closeOnPick = (event) => {
    if (event.target.closest && event.target.closest('button')) event.currentTarget.open = false;
  };

  const round = reveal ? played : played + 1;

  return <main className={reveal ? `wg is-${reveal.correct ? 'correct' : 'wrong'}` : 'wg'}><div className="wg-layout"><div className="wg-top">
    <a className="wg-top-x" href="/" aria-label="Back to all games">✕</a>
    <details className="qs-menu" onClick={closeOnPick}>
      <summary className="qs-menu-toggle">{`${(PLAY_MODES.find((mode) => mode.id === playMode) || {}).label} · ${(CATEGORIES.find((cat) => cat.id === category) || {}).label}`}<span aria-hidden="true"> ▾</span></summary>
      <div className="qs-menu-body"><div className="pf-pill-group" role="group" aria-label="Play mode">{PLAY_MODES.map((mode) => <button key={mode.id} className="pf-pill" type="button" aria-pressed={playMode === mode.id} onClick={() => switchPlayMode(mode.id)}>{mode.label}</button>)}</div><div className="pf-pill-group" role="group" aria-label="Category">{CATEGORIES.map((cat) => <button key={cat.id} className="pf-pill" type="button" aria-pressed={category === cat.id} onClick={() => switchCategory(cat.id)}>{cat.label}</button>)}</div><button className="pf-btn wg-settings-restart" type="button" onClick={startFresh}>Start over</button></div>
    </details>
    <span className="wg-top-score">✓ {correct}{playMode === 'lives' ? <span className="wg-top-lives"> · ♥ {lives}</span> : null}</span>
  </div><section className="wg-board">
    {error && <div className="wg-error" role="alert">{error} <button className="pf-btn" onClick={startFresh}>Start over</button></div>}
    {!comparison ? <div className="wg-loading">Finding a curious matchup…</div> : <>
      {over && showResults ? <div className="wg-finish" role="status">
        <p className="wg-result-kicker">{playMode === 'ten' ? '10 rounds done!' : 'Out of lives!'}</p>
        <h2 ref={heading} tabIndex={-1}>{playMode === 'ten' ? 'Here is how you did.' : 'Good run. Here is how you did.'}</h2>
        <p className="wg-final-score">{correct}<span> / {played} right</span></p>
        <button className="pf-primary" onClick={startFresh}>Play again <ArrowRightIcon /></button>
      </div> : <>
        <p className="wg-round">Round {round}{playMode === 'ten' ? ' of 10' : ''}</p>
        <h2 className="wg-question" ref={heading} tabIndex={-1}>{comparison.prompt}</h2>
        <div className="wg-choice-grid">{[comparison.left, comparison.right].map((option, index) => <button key={option.label} className={reveal ? (index === reveal.correctChoice ? 'is-correct' : index === reveal.choice ? 'is-wrong' : 'is-dim') : ''} disabled={reveal !== null} onClick={() => choose(index)}><ChoicePhoto option={option} />{reveal && index === reveal.correctChoice && <span className="wg-verdict-mark" aria-hidden="true">✓</span>}{reveal && index === reveal.choice && !reveal.correct && <span className="wg-verdict-mark" aria-hidden="true">✗</span>}<span className="wg-choice-text"><span className="wg-option-emoji" aria-hidden="true">{option.emoji}</span><strong>{option.label}</strong></span></button>)}</div>
        {reveal && <ResultReveal
          verdict={reveal.correct ? 'correct' : 'wrong'}
          title={reveal.correct ? 'Correct' : 'Incorrect'}
          answer={<><div className="wg-correct-choice"><p className="wg-correct-line"><strong>{correctSide.short}</strong>{' \u2014 '}{correctSide.scale}</p>{showDetails ? <p className="wg-reveal-detail">{correctSide.detail}</p> : null}{showDetails && correctSide.note ? <p className="wg-reveal-note">{correctSide.note}</p> : null}</div><button type="button" className="wg-details-toggle" onClick={() => setShowDetails((v) => !v)}>{showDetails ? 'Hide details' : 'Show details'}</button></>}
          nextLabel={over ? <>See results <ArrowRightIcon /></> : <>Next round <ArrowRightIcon /></>}
          onNext={over ? () => setShowResults(true) : () => next()}
        />}
      </>}
    </>}
  </section></div></main>;
}
