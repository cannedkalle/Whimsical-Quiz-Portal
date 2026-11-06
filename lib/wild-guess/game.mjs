import { randomBytes, randomInt } from 'node:crypto';
import { database } from './database.mjs';
import { subjectCategories } from './subjects.mjs';
import { formatScale, formatRange, formatScaleInUnit, formatEstimateInUnit, pairUnit, scaleName, winningSide } from './format.mjs';

export { formatScale, formatRange, formatScaleInUnit, formatEstimateInUnit, pairUnit, scaleName, winningSide };

const CATEGORY_PROMPTS = {
  count: 'Which has a larger count?',
  duration: 'Which takes more time?',
  weight: 'Which weighs more?',
  frequency: 'Which has the shorter gap between events?',
  length: 'Which has greater length?',
  area: 'Which covers more area?',
  volume: 'Which takes up more space?',
  speed: 'Which moves or grows faster?',
};
const publicComparison = (comparison) => ({
  id: comparison.id,
  prompt: comparison.prompt,
  sides: [comparison.left, comparison.right].map(({ label, emoji }) => ({ label, emoji })),
});

const revealRound = (row) => {
  const comparison = comparisonFromRow(row);
  const unit = pairUnit(comparison.category, comparison.left.magnitude, comparison.right.magnitude);
  const sides = [comparison.left, comparison.right].map((option) => ({
    label: option.label,
    emoji: option.emoji,
    scale: formatScaleInUnit(option, comparison.category, unit),
    scaleLead: 'Around',
    detail: formatRange(option, comparison.category, unit),
  }));
  const correctChoice = winningSide(comparison);
  return { position: Number(row.position), prompt: comparison.prompt, sides, choice: Number(row.choice), correctChoice, correct: Boolean(row.correct) };
};

const subjectFromRow = (row, prefix) => ({
  id: row[`${prefix}_id`],
  label: row[`${prefix}_label`],
  emoji: row[`${prefix}_emoji`],
  magnitude: Number(row[`${prefix}_magnitude`]),
  lowMagnitude: Number(row[`${prefix}_low_magnitude`]),
  highMagnitude: Number(row[`${prefix}_high_magnitude`]),
  scaleLabel: row[`${prefix}_scale_label`] || null,
  note: row[`${prefix}_note`],
});

const comparisonFromRow = (row) => ({
  id: `${row.left_id}--${row.right_id}`,
  category: row.category,
  prompt: CATEGORY_PROMPTS[row.category],
  left: subjectFromRow(row, 'left'),
  right: subjectFromRow(row, 'right'),
});

const ROUND_SELECT = `SELECT r.position,r.choice,r.correct,
  l.category,
  l.id AS left_id,l.label AS left_label,l.emoji AS left_emoji,l.magnitude AS left_magnitude,l.low_magnitude AS left_low_magnitude,l.high_magnitude AS left_high_magnitude,l.scale_label AS left_scale_label,l.note AS left_note,
  rr.id AS right_id,rr.label AS right_label,rr.emoji AS right_emoji,rr.magnitude AS right_magnitude,rr.low_magnitude AS right_low_magnitude,rr.high_magnitude AS right_high_magnitude,rr.scale_label AS right_scale_label,rr.note AS right_note
  FROM wg_matchup_rounds r
  JOIN wg_subjects l ON l.id=r.left_subject_id AND l.version=r.left_subject_version
  JOIN wg_subjects rr ON rr.id=r.right_subject_id AND rr.version=r.right_subject_version`;

async function appendRound(id) {
  const db = database();
  const category = subjectCategories[randomInt(subjectCategories.length)];
  const pairing = `FROM wg_subjects l JOIN wg_subjects r ON l.category=r.category AND l.id<r.id
    AND (l.high_magnitude<r.low_magnitude OR r.high_magnitude<l.low_magnitude)
    WHERE l.active=1 AND r.active=1 AND l.category=$1`;
  const [{ eligible }] = await db.query(`SELECT COUNT(*) AS eligible ${pairing}`, [category]);
  if (Number(eligible) < 1) throw new Error('Not enough compatible subjects are available yet.');
  const [pair] = await db.query(`SELECT l.id AS left_id,l.version AS left_version,r.id AS right_id,r.version AS right_version ${pairing} ORDER BY l.slot,r.slot LIMIT 1 OFFSET $2`, [category, randomInt(Number(eligible))]);
  const [{ next_position }] = await db.query('SELECT COALESCE(MAX(position),-1)+1 AS next_position FROM wg_matchup_rounds WHERE session_id=$1', [id]);
  const flip = randomInt(2);
  const leftId = flip ? pair.right_id : pair.left_id;
  const leftVersion = flip ? pair.right_version : pair.left_version;
  const rightId = flip ? pair.left_id : pair.right_id;
  const rightVersion = flip ? pair.left_version : pair.right_version;
  await db.query('INSERT INTO wg_matchup_rounds(session_id,position,left_subject_id,left_subject_version,right_subject_id,right_subject_version) VALUES($1,$2,$3,$4,$5,$6)', [id, Number(next_position), leftId, leftVersion, rightId, rightVersion]);
}

export async function createGame() {
  const id = randomBytes(32).toString('hex');
  const now = Date.now();
  await database().query('INSERT INTO wg_sessions(id,created_at,expires_at) VALUES($1,$2,$3)', [id, now, now + 7 * 86400000]);
  await appendRound(id);
  return id;
}

export async function readGame(id) {
  if (!/^[a-f0-9]{64}$/.test(id || '')) return null;
  const db = database();
  const rows = await db.query(`${ROUND_SELECT} JOIN wg_sessions s ON s.id=r.session_id WHERE s.id=$1 AND s.expires_at>$2 AND r.choice IS NULL ORDER BY r.position LIMIT 1`, [id, Date.now()]);
  if (!rows.length) return null;
  const [stats] = await db.query('SELECT COUNT(*) AS played, COALESCE(SUM(correct),0) AS correct FROM wg_matchup_rounds WHERE session_id=$1 AND choice IS NOT NULL', [id]);
  const [{ pending }] = await db.query('SELECT COUNT(*) AS pending FROM wg_matchup_rounds WHERE session_id=$1 AND choice IS NULL', [id]);
  const comparison = comparisonFromRow(rows[0]);
  return {
    current: { position: Number(rows[0].position), comparison: publicComparison(comparison) },
    stats: { played: Number(stats.played), correct: Number(stats.correct) },
    pending: Number(pending),
  };
}

export async function submitChoice(id, position, choice) {
  if (!Number.isInteger(position) || position < 0 || ![0, 1].includes(choice)) throw new Error('Choose one of the two answers.');
  const db = database();
  const rows = await db.query(`${ROUND_SELECT} JOIN wg_sessions s ON s.id=r.session_id WHERE r.session_id=$1 AND r.position=$2 AND s.expires_at>$3`, [id, position, Date.now()]);
  if (!rows.length) throw new Error('This game has expired. Start a new game.');
  const comparison = comparisonFromRow(rows[0]);
  const correctChoice = winningSide(comparison);
  const correct = Number(choice === correctChoice);
  const updated = await db.query('UPDATE wg_matchup_rounds SET choice=$1,correct=$2,answered_at=$3 WHERE session_id=$4 AND position=$5 AND choice IS NULL RETURNING position', [choice, correct, Date.now(), id, position]);
  if (!updated.length) return { game: await readGame(id), reveal: null };
  const [answered] = await db.query(`${ROUND_SELECT} WHERE r.session_id=$1 AND r.position=$2`, [id, position]);
  await appendRound(id);
  return { game: await readGame(id), reveal: revealRound(answered) };
}
