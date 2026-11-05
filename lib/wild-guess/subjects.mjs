
const slug = (value) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const WEAK_IDENTITY_WORDS = new Set(['a', 'an', 'the', 'one', 'full', 'grown', 'adult', 'big', 'large', 'giant', 'huge', 'cereal']);

export const canonicalConceptKey = (value) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter((word) => word && !WEAK_IDENTITY_WORDS.has(word))
  .sort()
  .join('-');

const catalog = new Map();
/* Labels kept out of the free-deal pool even though they exist in the
 * sources below. Matching is by exact label, NOT by concept: a reworded
 * revival of a retired concept (for example, waves hitting a shore for
 * the retired waves reaching a beach) slips past this filter, so check a
 * new subject against the retired concepts, not just the retired labels,
 * before adding it. Do not convert this to concept-key matching: one
 * retired entry, weight "All blue whales on Earth", is a wording variant
 * of the live subject "All the blue whales on Earth", and concept
 * matching would wrongly remove the live subject. Un-retiring is done by
 * deleting the entry here; if the label already exists in the sources
 * (waves, Olympic pool), it becomes live with no other change. */
const retiredSubjects = new Set([
  'count::Light-up pixels on an iPhone screen',
  'count::Seats in Wembley Stadium',
  'count::Windows on the Empire State Building',
  'count::Dimples on one golf ball',
  'count::Spots on one ladybug',
  'count::Whiskers on one cat',
  'count::Kernels on one corn cob',
  'count::Books in the world’s largest library',
  'count::Fish in a sardine school',
  'count::Snowflakes in a snowstorm',
  'count::Windows in New York City',
  'count::Scales on one fish',
  'count::Bubbles in a bubble bath',
  'count::Sprinkles on one doughnut',
  'count::Spots on one cheetah',
  'count::Pages on the public web',
  'count::People in New York City',
  'count::Active volcanoes on Earth',
  'count::Seeds in one sunflower head',
  'count::Teeth a shark uses over its lifetime',
  'count::Hairs on one cat',
  'count::Feathers on one eagle',
  'count::Red blood cells in one person',
  'duration::The Moon going around Earth',
  'duration::Earth making one full spin',
  'duration::Pluto going around the Sun',
  'duration::A radio message traveling from Mars to Earth',
  'duration::A paper letter traveling around the world',
  'duration::A chicken egg hatching',
  'duration::One human lifetime',
  'duration::A mountain range rising',
  'duration::The Great Barrier Reef growing to its present size',
  'duration::A redwood growing taller than a house',
  'duration::A sunflower growing taller than a child',
  'duration::A plastic bottle breaking down outdoors',
  'duration::A banana peel breaking down outdoors',
  'duration::A dinosaur bone becoming a fossil',
  'duration::A person-sized stalactite growing in a cave',
  'duration::A person-sized icicle growing',
  'duration::A glacier creeping across a mountain valley',
  'duration::River water flowing through a mountain valley',
  'duration::A steel ship rusting away',
  'duration::A continent drifting across an ocean',
  'duration::The island of Hawaii forming',
  'duration::A snowman melting',
  'weight::All blue whales on Earth',
  'weight::All wild birds',
  'weight::All wild elephants',
  'weight::All termites on Earth',
  'weight::All blue whales',
  'weight::Mount Everest',
  'weight::All printed books in the world',
  'weight::All smartphones currently in use',
  'weight::All plastic ever made',
  'weight::All wild fish in the oceans',
  'weight::All trees on Earth',
  'weight::The Great Wall of China',
  'weight::A cruise ship',
  'frequency::Two quick hand claps',
  'frequency::Two text messages sent around the world',
  'frequency::Two paper letters entering the mail',
  'frequency::Two web searches around the world',
  'frequency::Two library books checked out around the world',
  'frequency::Two photos taken around the world',
  'frequency::Two paintings finished around the world',
  'frequency::Two airplane takeoffs around the world',
  'frequency::Two ticks of a clock',
  'frequency::Two meals eaten by one person',
  'frequency::Two human heartbeats',
  'frequency::Two high tides at one beach',
  'frequency::Two mouse heartbeats',
  'frequency::Two woodpecker pecks',
  'frequency::Two vibrations in a cat’s purr',
  'frequency::Two cricket chirps',
  'frequency::Two lightning flashes somewhere on Earth',
  'frequency::Two volcanic eruptions beginning somewhere on Earth',
  'frequency::Two earthquakes detected anywhere on Earth',
  'frequency::Two total solar eclipses somewhere on Earth',
  'frequency::Two chicken eggs laid around the world',
  'frequency::Two human births around the world',
  'frequency::Two mosquito bites on people worldwide',
  'frequency::Two reported shark bites on people',
  'frequency::Two waves reaching the world’s beaches',
  'frequency::Two sneezes from one person',
  'frequency::Two mosquito wingbeats',
  'frequency::Two butterfly wingbeats',
  'frequency::Two hummingbird wingbeats',
  'frequency::Two hummingbird heartbeats',
  'frequency::Two blue whale heartbeats',
  'frequency::Two shakes of a rattlesnake’s rattle',
  'frequency::Two waves reaching one beach',
  'frequency::Two blinks of a human eye',
  'frequency::Two heartbeats of an elephant',
  'frequency::Two breaths of a resting person',
  'frequency::Two wingbeats of the fastest midge',
  'frequency::Two chirps of a cricket on a warm night',
  'frequency::Two heartbeats of a resting person',
  'frequency::Two wingbeats of a honeybee',
  'frequency::Two flashes of a lighthouse',
  'frequency::Newspapers printed each day',
  'length::All the blood vessels in a human body, laid end to end',
  'length::The height of the Eiffel Tower',
  'length::The Golden Gate Bridge from end to end',
  'area::The playing surface of an international soccer field',
  'area::Central Park in New York City',
  'area::Yellowstone National Park',
  'volume::The volume of the Great Pyramid of Giza',
  'volume::The Moon',
  'volume::Earth',
  'volume::The Sun',
  // Content fix 2026-10-28: dead subjects (never deal: microbes sit 6
  // orders above the next count subject; diamond's range overlaps every
  // near neighbour) and duplicate named water bodies (one per kind
  // kept: Lake Erie, Mediterranean Sea, Atlantic Ocean; the volume
  // Great Lakes entry is retired, its weight entry is a different
  // subject and stays).
  'count::Microbes in Earth’s oceans',
  'duration::A natural diamond forming underground',
  'volume::The water in Lake Mead',
  'volume::The water in Loch Ness',
  'volume::The water in the Black Sea',
  'volume::The water in all five Great Lakes',
  'area::The area of Vatican City',
  'area::The island of Manhattan',
  'area::The state of Rhode Island',
  'area::The area of Hawaii’s largest island',
  'area::The area of Russia',
  'length::The Great Wall of China',
  'length::The Amazon River',
  // Length rebuild 2026-11-04 (Kai): retire old trivia subjects
  'length::The distance from Earth to the Sun',
  'length::The distance from Earth to the Moon',
  'length::The distance from Earth to Mars when they are closest',
  'length::The deepest borehole humans have drilled',
  'length::A blue whale from nose to tail',
  'length::A marathon race',
  'length::The distance around Earth',
  'length::A football field from goal line to goal line',
  'length::A soccer field from goal line to goal line',
  'length::The length of the Grand Canyon',
  'length::The length of the Nile',
  'speed::An earthworm crawling',
  'speed::A tortoise walking',
  'speed::A crab scuttling along the beach',
  'speed::A peregrine falcon diving',
  'duration::A hamster’s life',
  'duration::A banana peel breaking down outdoors',
  'duration::A caterpillar changing into a butterfly',
  'duration::A chicken egg hatching',
  'duration::A continent drifting across an ocean',
  'duration::A dinosaur bone becoming a fossil',
  'duration::A giant tortoise’s life',
  'duration::A glacier creeping across a mountain valley',
  'duration::A house cat’s life',
  'duration::A mayfly’s adult life',
  'duration::A mountain range rising',
  'duration::A natural diamond forming underground',
  'duration::A paper letter traveling around the world',
  'duration::A periodical cicada waiting underground',
  'duration::A person-sized icicle growing',
  'duration::A person-sized stalactite growing in a cave',
  'duration::A plastic bottle breaking down outdoors',
  'duration::A radio message traveling from Mars to Earth',
  'duration::A redwood growing taller than a house',
  'duration::A sandcastle washing away',
  'duration::A snowman melting',
  'duration::A steel ship rusting away',
  'duration::A sunflower growing taller than a child',
  'duration::An acorn growing into a full-sized oak',
  'duration::An adult butterfly’s life',
  'duration::An airplane flying around Earth',
  'duration::An elephant pregnancy',
  'duration::An oak tree’s life',
  'duration::An oyster growing a pearl',
  'duration::Earth making one full spin',
  'duration::One human lifetime',
  'duration::Pluto going around the Sun',
  'duration::River water flowing through a mountain valley',
  'duration::The Great Barrier Reef growing to its present size',
  'duration::The Moon going around Earth',
  'duration::The island of Hawaii forming',
  'duration::A common frog tadpole growing into a frog',
  'duration::A dog’s life',
  'duration::A round-the-world cruise',
  'duration::The age of modern humans',
  'duration::The age of the Great Pyramid',
  'duration::The age of the universe',
  'duration::The time since the dinosaurs disappeared',
  'duration::The age of the Moon',
]);

// Subject data split by category (each file < 20KB for API pushability)
import { countSubjects } from './subjects/count.mjs';
import { durationSubjects } from './subjects/duration.mjs';
import { frequencySubjects } from './subjects/frequency.mjs';
import { lengthSubjects } from './subjects/length.mjs';
import { weightSubjects } from './subjects/weight.mjs';
import { areaSubjects } from './subjects/area.mjs';
import { volumeSubjects } from './subjects/volume.mjs';
import { speedSubjects } from './subjects/speed.mjs';

const standaloneSubjects = [
  ...countSubjects,
  ...durationSubjects,
  ...frequencySubjects,
  ...lengthSubjects,
  ...weightSubjects,
  ...areaSubjects,
  ...volumeSubjects,
  ...speedSubjects,
];

const sources = [
  ...standaloneSubjects.map((option) => ({ category: option.category, option })),
];

const sourceUrlsByLabel = new Map([
  ['Stars in the observable universe', ['https://science.nasa.gov/exoplanets/what-is-the-universe/']],
  ['Microbes in a human body', ['https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002533']],
  ['Cells in one human body', ['https://pubmed.ncbi.nlm.nih.gov/37722043/']],
  ['Wild birds alive on Earth', ['https://pmc.ncbi.nlm.nih.gov/articles/PMC8166167/']],
  ['Trees on Earth', ['https://doi.org/10.1038/nature14967']],
  ['Insects alive on Earth', ['https://www.si.edu/spotlight/buginfo/bugnos']],
  ['Ants alive on Earth', ['https://doi.org/10.1073/pnas.2201550119']],
  ['All the ants on Earth', ['https://doi.org/10.1073/pnas.2201550119']],
  ['Domesticated chickens alive on Earth', ['https://livestock.review.fao.org/']],
]);

for (const { category, option } of sources) {
    const key = `${category}::${canonicalConceptKey(option.label)}`;
    const existing = catalog.get(key);
    if (existing) {
      if (existing.label !== option.label) throw new Error(`Possible duplicate subject: "${existing.label}" and "${option.label}". Use one canonical label.`);
      existing.lowMagnitude = Math.min(existing.lowMagnitude, option.lowMagnitude);
      existing.highMagnitude = Math.max(existing.highMagnitude, option.highMagnitude);
      continue;
    }
    catalog.set(key, {
      id: `${category}-${slug(option.label)}`,
      category,
      label: option.label,
      emoji: option.emoji,
      magnitude: option.magnitude,
      lowMagnitude: option.lowMagnitude,
      highMagnitude: option.highMagnitude,
      note: option.note,
      scaleLabel: option.scaleLabel,
      sourceUrls: option.sourceUrls || sourceUrlsByLabel.get(option.label) || [],
    });
}

export const subjects = [...catalog.values()].filter((subject) => !retiredSubjects.has(`${subject.category}::${subject.label}`));
/* Parked categories (2026-11-01, Kai): only count and duration have been
 * reviewed and rebuilt. The other categories' data stays in the repo, but
 * the game never deals them until they're rebuilt. Un-park by deleting the
 * entry here. */
const PARKED_CATEGORIES = new Set(['weight', 'area', 'volume', 'speed']);
export const subjectCategories = ['count', 'duration', 'weight', 'frequency', 'length', 'area', 'volume', 'speed'].filter(
  (category) => !PARKED_CATEGORIES.has(category)
);

export function subjectsOverlap(left, right) {
  return !(left.highMagnitude < right.lowMagnitude || right.highMagnitude < left.lowMagnitude);
}

/* A matchup is weak when one side is part of the other: the whole always
 * wins, so there is nothing to guess. These pairs never deal, even when
 * their sizes are close. Keys are canonicalized at construction, so the
 * listing order here does not matter. Some of these were already
 * impossible because their ranges overlap; the ban also protects them if
 * estimates ever change. */
export const PART_WHOLE_PAIRS = new Set([
  ['count-ants-alive-on-earth', 'count-insects-alive-on-earth'],
  ['count-stars-your-eyes-can-see-in-a-dark-sky', 'count-stars-in-the-observable-universe'],
  ['weight-a-blue-whale', 'weight-all-the-blue-whales-on-earth'],
  ['weight-a-blue-whale', 'weight-all-whales-alive-today'],
  ['weight-all-the-blue-whales-on-earth', 'weight-all-whales-alive-today'],
  ['weight-earth', 'weight-all-eight-planets-together'],
  ['volume-the-water-in-lake-erie', 'volume-the-water-in-all-five-great-lakes'],
  ['area-the-great-barrier-reef-marine-park', 'area-the-pacific-ocean'],
  ['area-a-city-block', 'area-the-island-of-manhattan'],
  ['weight-a-blue-whale', 'weight-a-blue-whales-tongue'],
  /* The Atlantic is part of all the oceans, so the whole always wins. */
  ['volume-the-water-in-the-atlantic-ocean', 'volume-the-water-in-all-of-earths-oceans'],
  /* The Mediterranean is likewise part of all the oceans. */
  ['volume-the-water-in-the-mediterranean-sea', 'volume-the-water-in-all-of-earths-oceans'],
].map(([a, b]) => [a, b].sort().join('|')));

function pairKey(left, right) {
  return [left.id, right.id].sort().join('|');
}

export function isPartWholePair(left, right) {
  return PART_WHOLE_PAIRS.has(pairKey(left, right));
}

/* How close a matchup must be depends on the pair's scale: a 1000x gap at
 * small numbers is obvious (millions vs billions), while the same gap at
 * huge numbers is obscure (both sides are unimaginable). So the allowed
 * gap grows with the smaller side's magnitude: within 100x below 10^10,
 * within 1000x up to 10^20, within 10000x above that. One exception
 * keeps the pool honest: every subject keeps at least its single
 * closest matchup, so tuning the gate can never orphan a subject. (That
 * exception also revives the volume oceans subject, which the
 * part-whole bans had left with no partner at all.) A category with
 * fewer close pairs than the floor still deals, from its closest pairs
 * first, so no category runs dry. */
export function maxCloseGap(baselineMagnitude) {
  // Kai 2026-10-31: relative gate — the allowed gap is one-third of the
  // smaller magnitude. Tight at low mags (precise counts), opens up at
  // high mags (rough estimates).
  return baselineMagnitude / 3;
}
export const MIN_PAIRS_PER_CATEGORY = 3;

export function validSubjectPairs(category) {
  const available = subjects.filter((subject) => subject.category === category);
  const scored = [];
  for (let left = 0; left < available.length; left += 1) {
    for (let right = left + 1; right < available.length; right += 1) {
      const a = available[left];
      const b = available[right];
      if (subjectsOverlap(a, b) || isPartWholePair(a, b)) continue;
      scored.push({
        pair: [a, b],
        gap: Math.abs(a.magnitude - b.magnitude),
        base: Math.min(a.magnitude, b.magnitude),
      });
    }
  }
  scored.sort((x, y) => x.gap - y.gap);
  const close = scored.filter((entry) => entry.gap <= maxCloseGap(entry.base));
  const covered = new Set(close.flatMap((entry) => [entry.pair[0].id, entry.pair[1].id]));
  for (const subject of available) {
    if (covered.has(subject.id)) continue;
    const nearest = scored.find((entry) => entry.pair[0].id === subject.id || entry.pair[1].id === subject.id);
    if (!nearest) continue;
    close.push(nearest);
    covered.add(nearest.pair[0].id);
    covered.add(nearest.pair[1].id);
  }
  const pool = close.length >= MIN_PAIRS_PER_CATEGORY
    ? close
    : scored.slice(0, MIN_PAIRS_PER_CATEGORY);
  return pool.map((entry) => entry.pair);
}

export function winningSide(comparison) {
  return comparison.left.magnitude > comparison.right.magnitude ? 0 : 1;
}

export function rangesOverlap(comparison) {
  const { left, right } = comparison;
  return !(left.highMagnitude < right.lowMagnitude || right.highMagnitude < left.lowMagnitude);
}
