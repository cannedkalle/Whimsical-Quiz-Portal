import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const directory = mkdtempSync(path.join(tmpdir(), 'wild-guess-'));
process.env.WILD_GUESS_DB_PATH = path.join(directory, 'test.sqlite');
delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; delete process.env.POSTGRES_PRISMA_URL; delete process.env.POSTGRES_URL_NON_POOLING;
const { rangesOverlap } = await import('../lib/wild-guess/subjects.mjs');
const { canonicalConceptKey, isPartWholePair, maxCloseGap, MIN_PAIRS_PER_CATEGORY, subjectCategories, subjects, subjectsOverlap, validSubjectPairs } = await import('../lib/wild-guess/subjects.mjs');

/* A pool or dealt pair is legal if it fits the tuned gate, or if it is
 * the closest matchup of one of its subjects (the floor that keeps
 * every subject dealing). The helper over-allows in theory — a pair
 * that is some subject's closest but was never added — but such a pair
 * can never appear in the pool or a deal, so it never hides a failure. */
function isTunedPair(left, right) {
  const gap = Math.abs(left.magnitude - right.magnitude);
  if (gap <= maxCloseGap(Math.min(left.magnitude, right.magnitude))) return true;
  const available = subjects.filter((subject) => subject.category === left.category);
  const scored = [];
  for (let i = 0; i < available.length; i += 1) {
    for (let j = i + 1; j < available.length; j += 1) {
      const a = available[i];
      const b = available[j];
      if (subjectsOverlap(a, b) || isPartWholePair(a, b)) continue;
      scored.push({ pair: [a, b], gap: Math.abs(a.magnitude - b.magnitude) });
    }
  }
  scored.sort((a, b) => a.gap - b.gap);
  const samePair = (pair) => (pair[0].id === left.id && pair[1].id === right.id) || (pair[0].id === right.id && pair[1].id === left.id);
  const firstFor = (subject) => scored.find((entry) => entry.pair[0].id === subject.id || entry.pair[1].id === subject.id);
  const firstLeft = firstFor(left);
  const firstRight = firstFor(right);
  return (firstLeft && samePair(firstLeft.pair)) || (firstRight && samePair(firstRight.pair));
}
const { createGame, formatRange, formatScale, readGame, submitChoice, scaleName } = await import('../lib/wild-guess/game.mjs');
const { database } = await import('../lib/wild-guess/database.mjs');

test('subject pool deals close, non-overlapping, non-part-whole matchups', () => {
  assert.equal(subjects.length, 212);
  assert.equal(new Set(subjects.map((subject) => subject.id)).size, subjects.length);
  assert.equal(new Set(subjects.map((subject) => `${subject.category}:${canonicalConceptKey(subject.label)}`)).size, subjects.length);
  assert.deepEqual(subjects.filter((subject) => /\b(big|large|huge|long|full-grown|giant)\b/i.test(subject.label) && !/\bgiant tortoise\b/i.test(subject.label)).map((subject) => subject.label), []);
  assert.ok(subjects.filter((subject) => subject.category === 'frequency' && /wingbeats/i.test(subject.label)).length <= 5);
  assert.equal(subjects.some((subject) => subject.label === 'Two meals eaten by one person'), false);
  assert.equal(subjects.some((subject) => subject.label === 'Two ticks of a clock'), false);
  assert.deepEqual(subjectCategories, ['count', 'duration', 'frequency', 'length'], 'only reviewed categories deal');
  assert.deepEqual(Object.fromEntries(subjectCategories.map((category) => [category, validSubjectPairs(category).length])), {
    count: 212,
    duration: 156,
    frequency: 36,
    length: 56,
  });
  for (const category of subjectCategories) {
    const pairs = validSubjectPairs(category);
    assert.ok(pairs.length >= MIN_PAIRS_PER_CATEGORY, category);
    for (const [left, right] of pairs) {
      assert.equal(left.category, right.category);
      assert.equal(subjectsOverlap(left, right), false);
      assert.equal(isPartWholePair(left, right), false, `${left.id} vs ${right.id}`);
      assert.ok(isTunedPair(left, right), `${left.id} vs ${right.id} breaks the tuned gate`);
    }
  }
});

test('frequency rebuild: 35 new subjects live, 21 old labels retired', () => {
  const frequencyPairs = validSubjectPairs('frequency');
  const frequencySubjects = subjects.filter((s) => s.category === 'frequency');
  assert.equal(frequencySubjects.length, 35);
  // All 21 old "Two X" labels are retired (none live).
  const oldLabels = ['Two mosquito wingbeats', 'Two butterfly wingbeats', 'Two hummingbird wingbeats', 'Two hummingbird heartbeats', 'Two blue whale heartbeats', 'Two shakes of a rattlesnake’s rattle', 'Two waves reaching one beach', 'Two blinks of a human eye', 'Two heartbeats of an elephant', 'Two breaths of a resting person', 'Two wingbeats of the fastest midge', 'Two chirps of a cricket on a warm night', 'Two heartbeats of a resting person', 'Two wingbeats of a honeybee', 'Two flashes of a lighthouse', 'Newspapers printed each day'];
  for (const label of oldLabels) {
    assert.equal(frequencySubjects.some((s) => s.label === label), false, `old label still live: ${label}`);
  }
  // Spot-check new labels are live.
  for (const label of ['Hummingbird hearts beat', 'Neutron stars spin', 'New stars form in the observable universe', 'Raindrops fall around the world']) {
    assert.equal(frequencySubjects.some((s) => s.label === label), true, `new label missing: ${label}`);
  }
  assert.ok(frequencyPairs.length > 0, 'frequency deals pairs');
  for (const label of ['Two human heartbeats', 'Two ticks of a clock', 'Two meals eaten by one person', 'Fish in a sardine school', 'A banana peel breaking down outdoors', 'A plastic bottle breaking down outdoors']) {
    assert.equal(subjects.some((subject) => subject.label === label), false, label);
  }
  // Un-retired by Kai's feedback: waves and the Olympic pool are live again.
  for (const label of ['The water in an Olympic competition pool', 'Sardines in a bait ball', 'A slime mold eating a banana peel', 'A plastic bottle breaking down in the ocean']) {
    assert.equal(subjects.some((subject) => subject.label === label), true, label);
  }
  // Retired 2026-11-01 (Kai): the Moon's age is trivia, not estimation.
});

test('generator deals quality matchups, spaces repeats, and never runs dry', async () => {
  const { generateComparison } = await import('../lib/wild-guess/client-game.mjs');
  const frequency = generateComparison('frequency');
  assert.equal(frequency.category, 'frequency');
  assert.equal(subjectsOverlap(frequency.left, frequency.right), false);
  assert.equal(isPartWholePair(frequency.left, frequency.right), false);
  const history = [];
  for (let round = 0; round < 200; round += 1) {
    const dealt = generateComparison(undefined, { pairIds: history });
    assert.ok(dealt, `round ${round} dealt`);
    assert.equal(subjectsOverlap(dealt.left, dealt.right), false);
    assert.equal(isPartWholePair(dealt.left, dealt.right), false);
    assert.ok(isTunedPair(dealt.left, dealt.right), `${dealt.id} breaks the tuned gate`);
    assert.ok(!history.includes(dealt.id) && !history.includes(`${dealt.right.id}--${dealt.left.id}`), `${dealt.id} repeated within window`);
    history.push(dealt.id);
    if (history.length > 12) history.shift();
  }
  const volumePairs = validSubjectPairs('volume');
  const avoided = volumePairs.flatMap(([a, b]) => [`${a.id}--${b.id}`, `${b.id}--${a.id}`]);
  const fallback = generateComparison('volume', { pairIds: avoided });
  assert.ok(fallback);
  assert.equal(fallback.category, 'volume');
});

test('magnitude labels stay readable at very large scales', () => {
  assert.equal(scaleName(3), 'thousands');
  assert.equal(scaleName(12), 'trillions');
  assert.equal(scaleName(23), 'hundreds of sextillions');
  assert.equal(formatScale({ magnitude: 19 }, 'weight'), 'tens of quintillions of kilograms');
  assert.equal(formatScale({ magnitude: 9 }, 'duration'), 'decades');
  assert.equal(formatScale({ magnitude: 6, scaleLabel: 'about 6,400 kilometers' }, 'length'), 'thousands of kilometers');
  assert.equal(formatScale({ magnitude: 11, scaleLabel: 'about 150 million kilometers' }, 'length'), 'hundreds of millions of kilometers');
  assert.equal(formatScale({ magnitude: 11, scaleLabel: 'about 344,000 square kilometers' }, 'area'), 'hundreds of thousands of square kilometers');
  assert.equal(formatScale({ magnitude: 1, scaleLabel: 'about 30 square meters' }, 'area'), 'tens of square meters');
  assert.equal(formatScale({ magnitude: 6, scaleLabel: 'about 2.6 million cubic meters' }, 'volume'), 'billions of liters');
  assert.equal(formatScale({ magnitude: 0, scaleLabel: 'about 7,500 liters' }, 'volume'), 'thousands of liters');
  assert.equal(formatScale({ magnitude: -5, scaleLabel: 'up to 90 centimeters per day' }, 'speed'), 'tens of centimeters per day');
  assert.equal(formatScale({ magnitude: 2, scaleLabel: 'about 200 per second' }, 'frequency'), 'hundreds per second');
  assert.equal(formatScale({ magnitude: -6, scaleLabel: 'about 0.000003 per second' }, 'frequency'), 'one every few days');
  assert.equal(formatScale({ magnitude: -1, scaleLabel: 'about 0.05 to 0.2 heartbeats per second' }, 'frequency'), 'one every few seconds');
  assert.equal(formatRange({ lowMagnitude: 18, highMagnitude: 20 }, 'weight'), 'Estimates range from 1 quintillion to 100 quintillion kilograms.');
  assert.equal(formatRange({ magnitude: 2, scaleLabel: 'about 100 to 200 wingbeats per second' }, 'frequency'), 'A useful estimate is about 100 to 200 wingbeats per second.');
  assert.equal(formatRange({ magnitude: -1, scaleLabel: 'about 0.05 to 0.2 heartbeats per second' }, 'frequency'), 'It takes about 5 to 20 seconds for one to happen.');
  assert.equal(formatRange({ magnitude: 6, scaleLabel: 'about 6,400 to 6,800 kilometers' }, 'length'), 'A useful estimate is about 6,400 to 6,800 kilometers.');
  assert.equal(formatRange({ magnitude: 6, scaleLabel: 'about 2.6 million cubic meters' }, 'volume'), 'A useful estimate is about 2.6 million cubic meters.');
  assert.equal(formatRange({ magnitude: -9, scaleLabel: 'about 1 to 15 centimeters per year' }, 'speed'), 'A useful estimate is about 1 to 15 centimeters per year.');
  assert.equal(formatRange({ magnitude: 30, lowMagnitude: 30, highMagnitude: 31 }, 'weight'), 'Estimates range from 1 nonillion to 10 nonillion kilograms.');
});

test('one matchup, one unit: both answers in a comparison share a unit', async () => {
  const { pairUnit, formatScaleInUnit, formatEstimateInUnit } = await import('../lib/wild-guess/game.mjs');
  const { buildReveal } = await import('../lib/wild-guess/client-game.mjs');

  // Erie vs Mediterranean renders in cubic kilometers
  // on one side and cubic meters on the other.
  assert.equal(pairUnit('volume', 13, 15).unit, 'cubic kilometers');
  assert.equal(formatScaleInUnit({ magnitude: 13 }, 'volume', pairUnit('volume', 13, 15)), 'tens of thousands of cubic kilometers');
  assert.equal(formatScaleInUnit({ magnitude: 15 }, 'volume', pairUnit('volume', 13, 15)), 'millions of cubic kilometers');
  assert.equal(pairUnit('volume', -1, 0).unit, 'liters');
  assert.equal(pairUnit('volume', 0, 3).unit, 'cubic meters');
  assert.equal(pairUnit('length', 3, 4).unit, 'kilometers');
  assert.equal(pairUnit('area', 6, 9).unit, 'square kilometers');
  assert.equal(pairUnit('count', 3, 5), null);
  assert.equal(pairUnit('duration', 6, 9), null);

  assert.equal(formatEstimateInUnit('roughly 5,000 to 10,000 liters', pairUnit('volume', 0, 3)), 'roughly 5 to 10 cubic meters');
  assert.equal(formatEstimateInUnit('roughly 8.5 to 10.5 million square kilometers', { unit: 'square meters', singular: 'square meter', shift: 0 }), 'roughly 8.5 trillion to 10.5 trillion square meters');
  assert.equal(formatEstimateInUnit('about 3.75 million cubic kilometers', pairUnit('volume', 13, 15)), 'about 3.75 million cubic kilometers');
  assert.equal(formatEstimateInUnit('a few liters', pairUnit('volume', 0, 3)), 'a few liters');

  const byLabel = new Map(subjects.map((subject) => [subject.label, subject]));
  const lakes = byLabel.get('The water in Lake Erie');
  const med = byLabel.get('The water in the Mediterranean Sea');
  const reveal = buildReveal({ category: 'volume', prompt: 'Which takes up more space?', left: lakes, right: med }, 0);
  assert.ok(reveal.sides.every((side) => side.scale.includes('cubic kilometers')));
  assert.ok(reveal.sides.every((side) => side.detail.includes('cubic kilometers')));

  // Catalog-wide: every dealable volume/length/area matchup renders both
  // answers in one unit, in the scale line and in the estimate line.
  const unitPattern = /\b(cubic kilometers?|cubic meters?|square kilometers?|square meters?|kilometers?|meters?|liters?)\b/g;
  const base = (word) => (word.endsWith('s') ? word.slice(0, -1) : word);
  for (const category of ['volume', 'length', 'area']) {
    for (const [left, right] of validSubjectPairs(category)) {
      const unit = pairUnit(category, left.magnitude, right.magnitude);
      const shown = buildReveal({ category, prompt: '', left, right }, 0);
      for (const side of shown.sides) {
        const scaleUnits = [...new Set([...side.scale.matchAll(unitPattern)].map((m) => base(m[1])))];
        assert.deepEqual(scaleUnits, [base(unit.unit)], `${left.id} vs ${right.id}: ${side.scale}`);
        const detailUnits = [...side.detail.matchAll(unitPattern)].map((m) => base(m[1]));
        assert.ok(detailUnits.every((word) => word === base(unit.unit)), `${left.id} vs ${right.id}: ${side.detail}`);
      }
    }
  }
});

process.on('exit', () => rmSync(directory, { recursive: true, force: true }));
