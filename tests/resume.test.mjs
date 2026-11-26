import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearResume,
  loadResume,
  resumeHasProgress,
  resumeNumber,
  saveResume,
} from '../lib/resume.mjs';

/* A tiny in-memory localStorage stand-in, installed as the global
 * window the helper reads at call time. */
function installStorage(backing = new Map()) {
  globalThis.window = {
    localStorage: {
      getItem: (key) => (backing.has(key) ? backing.get(key) : null),
      setItem: (key, value) => backing.set(key, String(value)),
      removeItem: (key) => backing.delete(key),
    },
  };
  return backing;
}

test('save/load round-trips a state object', () => {
  installStorage();
  const state = { pairId: 'margin-bleed', played: 3, correct: 2 };
  saveResume('game-save', state);
  assert.deepEqual(loadResume('game-save'), state);
});

test('load of a missing key returns null', () => {
  installStorage();
  assert.equal(loadResume('never-saved'), null);
});

test('load rejects garbage: bad JSON, non-objects, arrays', () => {
  const backing = installStorage();
  backing.set('bad-json', '{not json');
  assert.equal(loadResume('bad-json'), null);
  backing.set('a-string', '"just a string"');
  assert.equal(loadResume('a-string'), null);
  backing.set('an-array', '[1,2,3]');
  assert.equal(loadResume('an-array'), null);
  backing.set('a-number', '42');
  assert.equal(loadResume('a-number'), null);
});

test('validate can reject a stale save and sanitize a good one', () => {
  installStorage();
  saveResume('game-save', { pairId: 'gone', played: '4' });
  const validate = (saved) =>
    saved.pairId === 'live' ? { pairId: saved.pairId } : null;
  assert.equal(loadResume('game-save', validate), null);
  saveResume('game-save', { pairId: 'live', played: '4', junk: true });
  assert.deepEqual(loadResume('game-save', validate), { pairId: 'live' });
});

test('clear removes the save', () => {
  installStorage();
  saveResume('game-save', { played: 1 });
  clearResume('game-save');
  assert.equal(loadResume('game-save'), null);
});

test('a throwing storage never breaks save, load, or clear', () => {
  globalThis.window = {
    localStorage: {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    },
  };
  assert.doesNotThrow(() => saveResume('k', { a: 1 }));
  assert.equal(loadResume('k'), null);
  assert.doesNotThrow(() => clearResume('k'));
});

test('resumeNumber accepts whole counters in bounds, rejects the rest', () => {
  assert.equal(resumeNumber(3), 3);
  assert.equal(resumeNumber('4'), 4);
  assert.equal(resumeNumber(0), 0);
  assert.equal(resumeNumber(-1), null);
  assert.equal(resumeNumber(4, { max: 3 }), null);
  assert.equal(resumeNumber(2, { min: 1, max: 3 }), 2);
  assert.equal(resumeNumber('many'), null);
  assert.equal(resumeNumber(undefined), null);
  assert.equal(resumeNumber(null, { min: 1 }), null);
});

test('resumeHasProgress: past round one or any score counts, a fresh save does not', () => {
  assert.equal(resumeHasProgress({ rounds: 0, score: 0 }), false);
  assert.equal(resumeHasProgress({ rounds: 1, score: 0 }), true);
  assert.equal(resumeHasProgress({ rounds: 0, score: 2 }), true);
  assert.equal(resumeHasProgress({}), false);
});
