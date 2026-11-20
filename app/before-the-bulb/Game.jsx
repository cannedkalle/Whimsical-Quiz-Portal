'use client';

import { useEffect, useRef, useState } from 'react';
import ResultReveal from '../components/ResultReveal';
import { createGame } from '../../lib/before-the-bulb/game.mjs';
import { PLAY_MODES, isGameOver, nextLives } from '../../lib/quiz-play.mjs';
import { ArrowRightIcon } from "../components/Icons";
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
 * game. The game keeps no saved progress (the standalone did not either):
 * reloading starts a fresh score, by design. */
const MODES = {
  curated: {
    pairs,
    title: 'Curated mode',
    description: 'Hand-picked matchups with a bright little fact.',
    roundLabel: 'Discovery',
    poolLabel: `${objects.length} inventions · ${pairs.length} curated discoveries`,
  },
  wild: {
    pairs: wildPairs,
    title: 'Wild mode',
    description: 'Fun date pairings, from close cousins to wild contrasts.',
    roundLabel: 'Wild card',
    poolLabel: `${objects.length} inventions · ${wildPairs.length} wild possibilities`,
  },
};

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
  const focusRequest = useRef(null);
  const questionRef = useRef(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setSnap(dealNext(game));
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
    startedRef.current = true;
    focusRequest.current = 'question';
    setQueuedSnap(null);
    setSnap(dealNext(nextGame));
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
    startedRef.current = true;
    focusRequest.current = 'question';
    setQueuedSnap(null);
    setSnap(dealNext(nextGame));
  };

  const handleAnswer = (id) => {
    const result = game.answer(id);
    if (!result) return;
    setDefOpen({});
    setSnap(result);
    const wasCorrect = result.selected === result.pair.earlierObjectId;
    const nextLivesCount = nextLives(playMode, lives, wasCorrect);
    setLives(nextLivesCount);
    setStreak(wasCorrect ? streak + 1 : 0);
    const gameOver = isGameOver(playMode, result.answered, nextLivesCount);
    setOver(gameOver);
    if (!gameOver) {
      /* Deal the next round now and warm its photos, so advancing is instant. */
      const upNext = dealNext(game);
      setQueuedSnap(upNext);
      preloadImages([BULB_IMAGES[upNext.pair.objectAId]?.thumb, BULB_IMAGES[upNext.pair.objectBId]?.thumb]);
    }
  };

  const handleNext = () => {
    if (over) {
      setShowResults(true);
      return;
    }
    focusRequest.current = 'question';
    setDefOpen({});
    setSnap(queuedSnap ?? dealNext(game));
    setQueuedSnap(null);
  };

  const handleRestart = () => {
    focusRequest.current = 'question';
    setDefOpen({});
    setLives(3);
    setStreak(0);
    setOver(false);
    setShowResults(false);
    setQueuedSnap(null);
    setSnap(track(game.reset(recentRef.current)));
  };

  /* The settings dropdown is the shell's own `<details>` menu
   * (QuizShell), reused without the GameBar: picking a setting
   * collapses the menu. */
  const closeOnPick = (event) => {
    if (event.target.closest && event.target.closest('button')) event.currentTarget.open = false;
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
      <main className={answered && !(over && showResults) ? `shell is-${isCorrect ? 'correct' : 'wrong'}` : 'shell'}>
        <div className="bb-top">
          <a className="bb-top-x" href="/" aria-label="Back to all games">✕</a>
          <details className="qs-menu" onClick={closeOnPick}>
            <summary className="qs-menu-toggle">{`${mode === 'curated' ? 'Curated' : 'Wild'} · ${(PLAY_MODES.find((play) => play.id === playMode) || {}).label}`}<span aria-hidden="true"> ▾</span></summary>
            <div className="qs-menu-body">
              <div className="qs-menu-group">
                <span className="qs-menu-label">Pool</span>
                <div className="pf-pill-group" role="group" aria-label="Game modes">
                  <button className="pf-pill" type="button" aria-pressed={mode === 'curated'} onClick={() => switchMode('curated')}>Curated</button>
                  <button className="pf-pill" type="button" aria-pressed={mode === 'wild'} onClick={() => switchMode('wild')}>Wild</button>
                </div>
              </div>
              <div className="qs-menu-group">
                <span className="qs-menu-label">Play</span>
                <div className="pf-pill-group" role="group" aria-label="Play mode">
                  {PLAY_MODES.map((play) => (
                    <button className="pf-pill" key={play.id} type="button" aria-pressed={playMode === play.id} onClick={() => switchPlayMode(play.id)}>{play.label}</button>
                  ))}
                </div>
              </div>
              <button className="pf-btn bb-settings-restart" type="button" onClick={handleRestart}>Start over</button>
            </div>
          </details>
          <span className="bb-top-score">✓ {snap ? snap.correct : 0}{playMode === 'lives' ? <span className="bb-top-lives"> · ♥ {lives}</span> : null}</span>
        </div>
        <section className="game" aria-labelledby="question">
          {snap && (
            <p className="bb-round">{activeMode.roundLabel} {answered ? snap.answered : snap.answered + 1}{playMode === 'ten' ? ' of 10' : ''}</p>
          )}
          <h1 id="question" className="question" tabIndex={-1} ref={questionRef}>Which came first?</h1>
          {over && showResults ? (
            <section className="reveal" aria-labelledby="results-title">
              <div className="result-top">
                <div>
                  <p className="eyebrow">
                    {playMode === 'ten' ? '10 QUESTIONS DONE!' : 'OUT OF LIVES!'}
                  </p>
                  <h2 id="results-title">Here is how you did.</h2>
                </div>
                <span className="result-spark" aria-hidden="true">
                  ✦
                </span>
              </div>
              <p className="score">
                {snap.correct} / {snap.answered} correct
              </p>
              <div className="reveal-bottom">
                <p className="mode-note">
                  {playMode === 'ten'
                    ? 'Ten discoveries, one score.'
                    : `You got ${snap.correct} right in ${snap.answered} discoveries.`}
                </p>
                <button
                  className="pf-primary"
                  type="button"
                  onClick={handleRestart}
                >
                  Play again <ArrowRightIcon />
                </button>
              </div>
            </section>
          ) : (
            <>
          <div
            className="choices"
            id="choices"
            aria-label="Choose the earlier invention"
          >
            {snap &&
              snap.choices.map((id, index) => {
                const object = objectMap.get(id);
                const image = BULB_IMAGES[object.id];
                const isEarlier = answered && id === earlier.id;
                const isChosen = answered && id === snap.selected;
                const status = !answered
                  ? 'Tap to choose'
                  : isEarlier
                    ? isChosen
                      ? '✓ You got it! Came first'
                      : '✓ This one came first'
                    : isChosen
                      ? 'Your guess · came later'
                      : 'Came later';
                return (
                  <article
                    key={id}
                    className={`choice-card${
                      isEarlier ? ' is-earlier' : ''
                    }${isChosen ? ' is-chosen' : ''}`}
                  >
                    <button
                      className="pick"
                      type="button"
                      disabled={answered}
                      aria-label={`Choose ${object.name}`}
                      onClick={() => handleAnswer(id)}
                    >
                      <span className="choice-letter" aria-hidden="true">
                        {index === 0 ? 'A' : 'B'}
                      </span>
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
                      {answered && <span className="choice-status">{status}</span>}
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
              detailsLabel="Dates & sources"
              nextLabel={over ? 'See results' : 'Next discovery'}
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
        <footer>
          <span>
            Made for curious minds <span aria-hidden="true">✦</span>
          </span>
          <span id="pool">{snap ? activeMode.poolLabel : ''}</span>
        </footer>
        <details className="image-credits">
          <summary>Photo credits</summary>
          <ul>
            {objects
              .filter((object) => BULB_IMAGES[object.id])
              .map((object) => {
                const image = BULB_IMAGES[object.id];
                return (
                  <li key={object.id}>
                    {object.name}: Photo: {image.author}, {image.license},{' '}
                    <a href={image.page}>via Wikimedia Commons</a>
                  </li>
                );
              })}
          </ul>
        </details>
        <noscript>
          <p>
            This game needs JavaScript enabled to show its invention cards.
          </p>
        </noscript>
      </main>
    </div>
  );
}
