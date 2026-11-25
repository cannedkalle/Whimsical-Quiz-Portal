'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameFooter, GameResults, MinimalTopBar } from '../components/QuizShell';
import ResultReveal from '../components/ResultReveal';
import { animals } from '../../lib/animal-outsider/animals.mjs';
import { ANIMAL_OUTSIDER_IMAGES } from '../../lib/animal-outsider/images.mjs';
import { preloadImages } from '../../lib/preload-images.mjs';
import { rootWords, taxonInfo } from '../../lib/animal-outsider/taxa.mjs';
import { getAnimalPool } from '../../lib/animal-outsider/difficulty.mjs';
import { PLAY_MODES, isGameOver, nextLives } from '../../lib/quiz-play.mjs';
import {
  describeTaxon,
  examplesForTaxon,
  findParallelBranch,
  generateRound,
  mostRecentSharedClade,
  roundKey,
  sharedPathFor,
  taxonDetails,
} from '../../lib/animal-outsider/game.mjs';

/* Animal Outsider, played as a portal-native React game. Same rules, same
 * copy, same learning panel as the standalone game: three animals, two
 * closer cousins, one outsider that branched off earlier. No server, no
 * iframe — rounds are dealt from the repo catalog in the browser. */

const byId = new Map(animals.map((animal) => [animal.id, animal]));
const maxRecentRounds = 18;

/* Photo credits, in the game's own order: one line per animal that can
 * appear, from the same images data the cards use. */
const CREDITS = animals
  .filter((animal) => ANIMAL_OUTSIDER_IMAGES[animal.id])
  .map((animal) => ({ id: animal.id, name: animal.commonName, ...ANIMAL_OUTSIDER_IMAGES[animal.id] }));

function addUnique(list, values) {
  const next = [...list];
  for (const value of values) {
    if (!next.includes(value)) next.push(value);
  }
  return next;
}

function TaxonMeta({ name, info }) {
  const details = taxonDetails(name, info);
  return (
    <>
      <span><strong>Rank:</strong> {details.rankLabel}</span>
      <span><strong>Rank status:</strong> {details.rankStatus}</span>
      <span><strong>Scale:</strong> {details.scaleLabel}</span>
    </>
  );
}

function TaxonSummary({ name }) {
  const info = describeTaxon(name);
  return (
    <>
      <strong>{name}</strong>
      <TaxonMeta name={name} info={info} />
      <span><strong>Name origin:</strong> &quot;{info.literalMeaning}&quot;</span>
      <span><strong>Typical traits:</strong> {info.kidExplanation}</span>
      <span><strong>Examples:</strong> {examplesForTaxon(name, info).join(', ')}</span>
    </>
  );
}

function TaxonStep({ name }) {
  const info = describeTaxon(name);
  return (
    <li>
      <strong>{name}</strong>
      <TaxonMeta name={name} info={info} />
      <span><strong>Name origin:</strong> &quot;{info.literalMeaning}&quot;</span>
      <span><strong>Typical traits:</strong> {info.kidExplanation}</span>
      <span><strong>Examples:</strong> {examplesForTaxon(name, info).join(', ')}</span>
    </li>
  );
}

function InlineTaxon({ name }) {
  const info = describeTaxon(name);
  const details = taxonDetails(name, info);
  return (
    <>
      <strong>{name}</strong> ({details.rankLabel.toLowerCase()}, {details.scaleLabel})
    </>
  );
}

function SpeciesStep({ animal }) {
  const info = {
    rank: 'Species',
    rankStatus: 'formal rank',
    scale: 'most specific formal rank in this game',
  };
  return (
    <li>
      <strong>{animal.taxonomy.species}</strong>
      <TaxonMeta name={animal.taxonomy.species} info={info} />
      <span><strong>Name origin:</strong> &quot;scientific species name&quot;</span>
      <span><strong>Typical traits:</strong> The species entry for {animal.commonName} in this game.</span>
      <span><strong>Examples:</strong> {animal.commonName}</span>
    </li>
  );
}

function AnimalPhoto({ animal }) {
  const [failed, setFailed] = useState(false);
  const image = ANIMAL_OUTSIDER_IMAGES[animal.id];
  if (!image || failed) return null;
  return (
    <img
      className="animal-photo"
      src={image.thumb}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

export default function Game() {
  const [difficulty, setDifficulty] = useState('easy');
  const [playMode, setPlayMode] = useState('endless');
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roundNo, setRoundNo] = useState(1);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [current, setCurrent] = useState(null);
  const [queuedRound, setQueuedRound] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [discoveredAnimals, setDiscoveredAnimals] = useState([]);
  const [discoveredTaxa, setDiscoveredTaxa] = useState([]);
  const [explorerId, setExplorerId] = useState(null);
  const recentKeys = useRef([]);
  const gridRef = useRef(null);
  const focusFirstCard = useRef(false);

  const pool = getAnimalPool(animals, difficulty);
  const revealed = Boolean(selectedId);
  const wasCorrect = Boolean(revealed && current && selectedId === current.outsider.id);
  const explorerAnimal = explorerId ? byId.get(explorerId) : null;
  const explorerOptions = [...pool].sort((a, b) => a.commonName.localeCompare(b.commonName));
  const knownTaxa = discoveredTaxa.filter((name) => taxonInfo[name]).slice(-8).reverse();

  useEffect(() => {
    const round = generateRound(getAnimalPool(animals, 'easy'), []);
    recentKeys.current = [roundKey(round)];
    setCurrent(round);
    setRoundNo(1);
  }, []);

  useEffect(() => {
    if (focusFirstCard.current && current && !selectedId) {
      focusFirstCard.current = false;
      gridRef.current?.querySelector('button')?.focus({ preventScroll: true });
    }
  }, [current, selectedId]);

  const dealRound = (poolForDeal, keys) => {
    const round = generateRound(poolForDeal, keys);
    recentKeys.current = [...keys, roundKey(round)].slice(-maxRecentRounds);
    return round;
  };

  const startNextRound = () => {
    if (over) return;
    const round = queuedRound ?? dealRound(getAnimalPool(animals, difficulty), recentKeys.current);
    setQueuedRound(null);
    setCurrent(round);
    setSelectedId(null);
    setRoundNo((n) => n + 1);
    focusFirstCard.current = true;
  };

  /* Fresh game in the current difficulty. Start over and play-mode switches
   * share it, so one mode's results never mix with another's. */
  const freshGame = (nextPlayMode) => {
    const round = generateRound(getAnimalPool(animals, difficulty), []);
    recentKeys.current = [roundKey(round)];
    setPlayMode(nextPlayMode);
    setRoundNo(1);
    setAnswered(0);
    setCorrect(0);
    setStreak(0);
    setDiscoveredAnimals([]);
    setDiscoveredTaxa([]);
    setExplorerId(null);
    setCurrent(round);
    setSelectedId(null);
    setQueuedRound(null);
    setLives(3);
    setOver(false);
    setShowResults(false);
  };

  const switchPlayMode = (next) => {
    if (next !== playMode) freshGame(next);
  };

  const startOver = () => freshGame(playMode);

  const switchDifficulty = (next) => {
    if (next === difficulty) return;
    const round = generateRound(getAnimalPool(animals, next), []);
    recentKeys.current = [roundKey(round)];
    setDifficulty(next);
    setRoundNo(1);
    setAnswered(0);
    setCorrect(0);
    setStreak(0);
    setDiscoveredAnimals([]);
    setDiscoveredTaxa([]);
    setExplorerId(null);
    setCurrent(round);
    setSelectedId(null);
    setQueuedRound(null);
    setLives(3);
    setOver(false);
    setShowResults(false);
  };

  const answer = (animalId) => {
    if (!current || selectedId) return;
    const correctChoice = animalId === current.outsider.id;
    setSelectedId(animalId);
    setAnswered((n) => n + 1);
    setCorrect((n) => n + (correctChoice ? 1 : 0));
    setStreak((n) => (correctChoice ? n + 1 : 0));
    setLives(nextLives(playMode, lives, correctChoice));
    const gameOver = isGameOver(playMode, answered + 1, nextLives(playMode, lives, correctChoice));
    setOver(gameOver);
    setDiscoveredAnimals((prev) => addUnique(prev, current.choices.map((animal) => animal.id)));
    setDiscoveredTaxa((prev) => addUnique(prev, current.choices.flatMap((animal) => animal.clades)));
    setExplorerId(current.outsider.id);
    if (!gameOver) {
      /* Deal the next round now and warm its photos, so advancing is instant. */
      const upNext = dealRound(getAnimalPool(animals, difficulty), recentKeys.current);
      setQueuedRound(upNext);
      preloadImages(upNext.choices.map((animal) => ANIMAL_OUTSIDER_IMAGES[animal.id]?.thumb));
    }
  };

  const explore = (id) => {
    const animal = byId.get(id);
    if (!animal) return;
    setExplorerId(id);
    setDiscoveredAnimals((prev) => addUnique(prev, [id]));
    setDiscoveredTaxa((prev) => addUnique(prev, animal.clades));
  };

  /* Memoized so the sampled example lists do not reshuffle on unrelated
   * re-renders; the standalone game rendered each explanation once.
   * Split for the shared reveal: `answer` is the short core learning,
   * `brief` the rejoin sentence, `details` the full relationship card
   * and family-tree explorer behind Dive deeper. */
  const revealContent = useMemo(() => {
    if (!current || !selectedId) return null;
    const pair = current.pair;
    const outsider = current.outsider;
    const sharedInfo = describeTaxon(current.sharedClade);
    const outsiderJoin = mostRecentSharedClade(pair[0], outsider).clade;
    const outsiderParallel = findParallelBranch(outsider, outsiderJoin, current.sharedClade);
    const comparisonPath = sharedPathFor(pair[0], pair[1]);
    return {
      answer: (
        <>
          <p><strong>{outsider.commonName} is the outsider.</strong></p>
          <p className="latin-reveal"><strong>{outsider.scientificName}</strong> branched away earlier than the closest pair.</p>
          <p><strong>{pair[0].commonName} + {pair[1].commonName}</strong> are closer relatives. Their most specific shared group is <InlineTaxon name={current.sharedClade} />: {sharedInfo.kidExplanation.toLowerCase()}</p>
        </>
      ),
      brief: (
        <p>{outsider.commonName} is not on <InlineTaxon name={current.sharedClade} />. It rejoins the closest pair farther back, at <InlineTaxon name={outsiderJoin} />.</p>
      ),
      details: (
        <>
          <div className="relationship-card">
            <div className="relationship-row closest-pair">
              <span className="row-label">Closest pair</span>
              <strong>{pair[0].commonName}</strong>
              <span className="plus">+</span>
              <strong>{pair[1].commonName}</strong>
            </div>
            <div className="relationship-row branch-comparison">
              <span className="row-label">Branch comparison</span>
              <div className="branch-columns">
                <section className="branch-card closest-branch">
                  <span className="branch-label">Closest pair branch</span>
                  <p>{pair[0].commonName} and {pair[1].commonName} meet at this newer, more specific group.</p>
                  <TaxonSummary name={current.sharedClade} />
                </section>
                <section className="branch-card outsider-branch-card">
                  <span className="branch-label">Outsider branch</span>
                  <p>{outsider.commonName} is on this different branch instead.</p>
                  {outsiderParallel ? (
                    <TaxonSummary name={outsiderParallel.name} />
                  ) : (
                    <>
                      <strong>{outsider.commonName}</strong>
                      <span>This animal branches away before the closest pair&apos;s newer branch.</span>
                    </>
                  )}
                </section>
              </div>
            </div>
            <div className="relationship-row outsider-branch">
              <span className="row-label">Where both paths rejoin</span>
              <div className="relationship-value">
                <span>{outsider.commonName} is not on <InlineTaxon name={current.sharedClade} />. It rejoins the closest pair farther back, at <InlineTaxon name={outsiderJoin} />.</span>
                <div className="parallel-branch">
                  <TaxonSummary name={outsiderJoin} />
                </div>
              </div>
            </div>
          </div>
          <details>
            <summary>Explore the family tree</summary>
            <ol className="tree-list">
              {comparisonPath.map((clade) => (
                <TaxonStep key={clade} name={clade} />
              ))}
            </ol>
            <p className="tree-note">{outsider.commonName} only rejoins them around <strong>{outsiderJoin}</strong>, so the closest pair has the more recent shared group.</p>
          </details>
        </>
      ),
    };
  }, [current, selectedId]);

  const explorerTrail = useMemo(() => {
    if (!explorerId) return null;
    const animal = byId.get(explorerId);
    if (!animal) return null;
    return (
      <>
        <div className="explorer-title">
          <div>
            <h3>{animal.commonName}</h3>
            <p>{animal.scientificName}</p>
          </div>
        </div>
        <ol className="tree-list">
          {animal.clades.map((clade) => (
            <TaxonStep key={clade} name={clade} />
          ))}
          <SpeciesStep animal={animal} />
        </ol>
      </>
    );
  }, [explorerId]);

  return (
    <main className={revealed && !(over && showResults) ? `ao-game qs-game is-${wasCorrect ? 'correct' : 'wrong'}` : 'ao-game qs-game'}>
      <section className="play-area" aria-label="Animal Outsider quiz">
        <MinimalTopBar
          settingsSummary={`${difficulty === 'easy' ? 'Easy' : 'Standard'} · ${(PLAY_MODES.find((mode) => mode.id === playMode) || {}).label}`}
          onStartOver={startOver}
          score={correct}
          lives={lives}
          showLives={playMode === 'lives'}
        >
          <div className="qs-menu-group">
            <span className="qs-menu-label">Difficulty</span>
            <div className="pf-pill-group" role="group" aria-label="Difficulty">
              <button className="pf-pill" type="button" aria-pressed={difficulty === 'easy'} onClick={() => switchDifficulty('easy')}>Easy</button>
              <button className="pf-pill" type="button" aria-pressed={difficulty === 'standard'} onClick={() => switchDifficulty('standard')}>Standard</button>
            </div>
          </div>
          <div className="qs-menu-group">
            <span className="qs-menu-label">Play mode</span>
            <div className="pf-pill-group" role="group" aria-label="Play mode">
              {PLAY_MODES.map((play) => (
                <button key={play.id} className="pf-pill" type="button" aria-pressed={playMode === play.id} onClick={() => switchPlayMode(play.id)}>{play.label}</button>
              ))}
            </div>
          </div>
        </MinimalTopBar>

        {over && showResults ? (
          <GameResults
            kicker={playMode === 'ten' ? '10 rounds done!' : 'Out of lives!'}
            correct={correct}
            played={answered}
            onPlayAgain={startOver}
          />
        ) : (
          <>
        <p className="qs-round">Round {roundNo}{playMode === 'ten' ? ' of 10' : ''}</p>
        <h1 className="qs-question outsider-question">Which one is the outsider?</h1>

        <section className="animal-grid" ref={gridRef} aria-label="Answer choices">
          {current?.choices.map((animal, index) => (
            <button
              key={animal.id}
              className={`animal-card qs-choice${ANIMAL_OUTSIDER_IMAGES[animal.id] ? ' has-photo' : ''}${revealed && animal.id === current.outsider.id ? ' is-correct' : ''}${revealed && animal.id === selectedId && !wasCorrect ? ' is-wrong' : ''}`}
              type="button"
              disabled={revealed}
              onClick={() => answer(animal.id)}
            >
              <span className="choice-number" aria-hidden="true">{index + 1}</span>
              <AnimalPhoto animal={animal} />
              <strong>{animal.commonName}</strong>
              <span className="choice-status">
                {!revealed ? 'Tap to choose' : animal.id === current.outsider.id ? '✓ Outsider' : animal.id === selectedId ? 'Your choice' : 'Closer cousin'}
              </span>
            </button>
          ))}
        </section>

        {revealed && revealContent && (
          <ResultReveal
            verdict={wasCorrect ? 'correct' : 'wrong'}
            title={wasCorrect ? 'Correct' : 'Incorrect'}
            answer={revealContent.answer}
            brief={revealContent.brief}
            details={revealContent.details}
            nextLabel={over ? 'See results' : 'Next round'}
            onNext={over ? () => setShowResults(true) : startNextRound}
          />
        )}
          </>
        )}
        <GameFooter poolLabel={`${animals.length} animals`} credits={CREDITS} />
      </section>

      <aside className={`learning-panel${revealed ? '' : ' is-locked'}`} aria-label="Taxonomy explorer">
        <div className="panel-section">
          <div className="panel-heading">
            <p className="eyebrow">Explore</p>
            <h2>Family Tree</h2>
          </div>
          <select
            aria-label="Choose an animal to explore"
            value={explorerId ?? ''}
            disabled={!revealed}
            hidden={!revealed}
            onChange={(event) => explore(event.target.value)}
          >
            {explorerOptions.map((animal) => (
              <option key={animal.id} value={animal.id}>{animal.commonName}</option>
            ))}
          </select>
          <div className="taxonomy-trail">
            {revealed && explorerAnimal ? explorerTrail : (
              <div className="locked-note">
                <h3>Pick an outsider first</h3>
                <p>Scientific names, classification groups, taxonomy paths, and root-word clues unlock after your answer.</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-heading">
            <p className="eyebrow">Discoveries</p>
            <h2>New Branches</h2>
          </div>
          <div className="discovery-list">
            {revealed ? (
              <>
                <div className="discovery-stats">
                  <span><strong>{discoveredAnimals.length}</strong> animals</span>
                  <span><strong>{discoveredTaxa.length}</strong> branches</span>
                </div>
                {knownTaxa.length ? (
                  knownTaxa.map((name) => (
                    <p key={name}><strong>{name}</strong><span>{taxonInfo[name].literalMeaning}</span></p>
                  ))
                ) : (
                  <p>Answer a round or explore an animal to discover branches.</p>
                )}
              </>
            ) : (
              <p>Discoveries update after each round.</p>
            )}
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-heading">
            <p className="eyebrow">Root Words</p>
            <h2>Decode Names</h2>
          </div>
          <div className="root-list">
            {revealed ? (
              rootWords.map((root) => (
                <article key={root.root} className="root-card">
                  <strong>{root.root}</strong>
                  <span>{root.meaning}</span>
                  <p>{root.examples.join(' · ')}</p>
                </article>
              ))
            ) : (
              <p>Root words unlock with the explanation.</p>
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
