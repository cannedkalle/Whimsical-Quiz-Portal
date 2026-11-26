export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const RELATED_CATEGORIES = new Set([
  'Books & Stories|Shows',
  'Books & Stories|Stories & Characters',
  'Communication|Internet',
  'Communication|Technology',
  'Drinks|Food',
  'Entertainment|Music',
  'Everyday|Home',
  'Everyday|Kitchen',
  'Games|Stories & Characters',
  'Games|Stories & Games',
  'Games|Toys',
  'Home|Kitchen',
  'Medicine|Science',
  'Navigation|Transport',
  'Places|Travel',
  'Play|Sports',
  'Play|Toys',
  'School|Crafts',
  'Space|Science',
  'Stories & Characters|Shows',
  'Stories & Characters|Stories & Games',
  'Technology|Internet',
  'Technology|Transport'
]);

const RECENT_CROSS_CATEGORY_WINDOW = 75;

function crossCategoryWindow(a, b) {
  const latestYear = Math.max(a.yearStart, b.yearStart);
  // Historical dates are fuzzier and interesting contrasts remain useful across
  // longer spans. The newer object controls the expansion, so an ancient object
  // still cannot pair arbitrarily with a modern laptop or smartphone.
  const ancientBonus = Math.max(0, 1950 - latestYear) * 0.3;
  return RECENT_CROSS_CATEGORY_WINDOW + ancientBonus;
}

function categoryPair(a, b) {
  return [a, b].sort().join('|');
}

/** Score a future comparison: higher means more naturally connected. */
export function comparisonScore(a, b) {
  if (!a || !b || a.id === b.id) return 0;
  const tagsA = new Set(a.comparisonTags || []);
  if ((b.comparisonTags || []).some(tag => tagsA.has(tag))) return 4;
  if (a.category === b.category) return 3;
  if (RELATED_CATEGORIES.has(categoryPair(a.category, b.category))) return 2;
  // A close-in-time contrast can be fun even when the objects live in different domains.
  // This catches pairs such as a rocket and a Rubik’s Cube without opening the door to
  // arbitrary ancient-versus-modern pairings such as paper and a laptop.
  const distance = Math.abs(a.yearStart - b.yearStart);
  return distance <= crossCategoryWindow(a, b) ? 1 : 0;
}

/** Return whether two objects are a sensible candidate for a future comparison. */
export function isFunComparison(a, b) {
  return comparisonScore(a, b) > 0;
}

/** Build chronologically valid candidate pairs before an editor adds facts and sources. */
export function buildFunComparisonCandidates(objects) {
  const candidates = [];
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i], b = objects[j];
      if (!isFunComparison(a, b)) continue;
      const earlierObjectId = a.yearEnd < b.yearStart ? a.id : b.yearEnd < a.yearStart ? b.id : null;
      if (earlierObjectId) candidates.push({ objectAId: a.id, objectBId: b.id, earlierObjectId });
    }
  }
  return candidates;
}

/** Build every clearly ordered pair for Wild mode, including oddball contrasts. */
export function buildWildComparisonPairs(objects) {
  const pairs = [];
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i], b = objects[j];
      const earlierObjectId = a.yearEnd < b.yearStart ? a.id : b.yearEnd < a.yearStart ? b.id : null;
      if (earlierObjectId) {
        pairs.push({
          id: `wild-${a.id}--${b.id}`,
          objectAId: a.id,
          objectBId: b.id,
          earlierObjectId
        });
      }
    }
  }
  return pairs;
}

/** Build the pairs Wild mode actually deals: the clearly ordered pairs
 * that are also fun comparisons (shared tag, same category, related
 * categories, or close in time). Disconnected pairs — paper versus
 * laptop, umbrella versus laptop — are real chronology but no fun,
 * so they never deal. The unfiltered builder stays for editors and
 * audits; this is the dealing set. */
export function buildFunWildPairs(objects) {
  const byId = new Map(objects.map((object) => [object.id, object]));
  return buildWildComparisonPairs(objects).filter((pair) =>
    isFunComparison(byId.get(pair.objectAId), byId.get(pair.objectBId)));
}

export function validateContent({ objects, pairs, sources }) {
  function index(items, label) {
    if (!Array.isArray(items) || !items.length) throw new Error(`Missing ${label}`);
    const map = new Map();
    for (const item of items) {
      if (!item.id || map.has(item.id)) throw new Error(`Invalid or duplicate ${label} ID`);
      map.set(item.id, item);
    }
    return map;
  }
  const objectMap = index(objects, 'objects');
  const sourceMap = index(sources, 'sources');
  index(pairs, 'pairs');
  const hasSources = ids => Array.isArray(ids) && ids.length && ids.every(id => sourceMap.has(id));
  for (const source of sources) {
    if (!/^https:\/\//.test(source.url) || !source.title || !source.publisher || !source.claimSupported || !source.accessedOn) throw new Error(`Invalid source: ${source.id}`);
  }
  for (const object of objects) {
    if (!object.name || !object.icon || !object.kidDefinition || !object.dateDisplay || !object.dateBasis ||
        !Number.isInteger(object.yearStart) || !Number.isInteger(object.yearEnd) || object.yearStart > object.yearEnd || !hasSources(object.dateSourceIds)) {
      throw new Error(`Invalid object: ${object.id}`);
    }
  }
  const combinations = new Set();
  for (const pair of pairs) {
    const a = objectMap.get(pair.objectAId), b = objectMap.get(pair.objectBId);
    const key = [pair.objectAId, pair.objectBId].sort().join('|');
    if (!a || !b || a === b || combinations.has(key)) throw new Error(`Invalid pair: ${pair.id}`);
    combinations.add(key);
    const earlier = a.yearEnd < b.yearStart ? a.id : b.yearEnd < a.yearStart ? b.id : null;
    if (!earlier || pair.earlierObjectId !== earlier || !pair.funFact || !hasSources(pair.factSourceIds)) throw new Error(`Unclear chronology or missing fact: ${pair.id}`);
  }
  return { objectMap, sourceMap };
}

/* Every deal is an independent random draw, not a shuffled deck: pick a
 * random pair outside the caller's recent-ids window, falling back to
 * the full pool when the window covers it (tiny pools). The window
 * lives in the component, not here, so it survives mode switches and
 * restarts for the whole page session; the same pair can return once
 * it leaves the window. No deck, no fixed sequence, no cycles. */
export function createGame(pairs, random = Math.random) {
  if (!pairs.length) throw new Error('At least one pair is required');
  let current = null, selected = null, correct = 0, answered = 0;
  let choices = [];
  function snapshot() {
    return { pair: current, choices: [...choices], selected, correct, answered, total: pairs.length };
  }
  function deal(avoidIds = []) {
    const avoid = new Set(avoidIds);
    const fresh = pairs.filter((pair) => !avoid.has(pair.id));
    const pool = fresh.length ? fresh : pairs;
    return pool[Math.floor(random() * pool.length)];
  }
  function next(avoidIds = []) {
    if (current && selected === null) return snapshot();
    current = deal(avoidIds);
    selected = null;
    choices = shuffle([current.objectAId, current.objectBId], random);
    return snapshot();
  }
  return {
    snapshot,
    next,
    /* Restore a saved in-progress round (the shared resume pattern):
     * the saved pair, its dealt choice order, and the counters, with
     * nothing answered yet. Returns the snapshot, or null when the
     * saved pair is not in this game's pool or the choices are not
     * exactly the pair's two objects — the caller starts fresh then. */
    restore(saved) {
      if (!saved || typeof saved !== 'object') return null;
      const pair = pairs.find((candidate) => candidate.id === saved.pairId);
      if (!pair) return null;
      const pairIds = [pair.objectAId, pair.objectBId];
      if (
        !Array.isArray(saved.choices) ||
        saved.choices.length !== 2 ||
        !saved.choices.every((id) => pairIds.includes(id))
      ) {
        return null;
      }
      const restoredCorrect = Number(saved.correct);
      const restoredAnswered = Number(saved.answered);
      if (
        !Number.isFinite(restoredCorrect) ||
        !Number.isFinite(restoredAnswered) ||
        restoredCorrect < 0 ||
        restoredAnswered < restoredCorrect
      ) {
        return null;
      }
      current = pair;
      selected = null;
      choices = [...saved.choices];
      correct = restoredCorrect;
      answered = restoredAnswered;
      return snapshot();
    },
    answer(id) {
      if (!current || selected !== null || !choices.includes(id)) return null;
      selected = id; answered++;
      if (id === current.earlierObjectId) correct++;
      return snapshot();
    },
    reset(avoidIds = []) {
      current = null; selected = null; correct = 0; answered = 0;
      return next(avoidIds);
    }
  };
}
