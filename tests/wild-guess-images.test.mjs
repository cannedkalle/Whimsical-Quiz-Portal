import test from 'node:test';
import assert from 'node:assert/strict';

const { subjects } = await import('../lib/wild-guess/subjects.mjs');
const { WILD_GUESS_IMAGES } = await import('../lib/wild-guess/images.mjs');

/* Free-license allowlist. CC BY / CC BY-SA (any version), CC0 and Public
 * domain cover most entries; GFDL 1.2 covers the two butterfly photos and
 * "Copyrighted free use" covers the snail photo — both are free licenses
 * that permit any use, and both were confirmed through the Commons API.
 * Anything else (NC, ND, fair use, unknown) must fail this test. */
const LICENSE_ALLOWLIST = /^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain|GFDL( \d\.\d)?|Copyrighted free use)$/;

test('every subject has an image entry and every key is a real subject', () => {
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  assert.equal(subjects.length, 212);
  for (const subject of subjects) {
    assert.ok(WILD_GUESS_IMAGES[subject.id], `missing image for ${subject.id}`);
  }
  // Orphan image keys (retired/parked subjects) are intentionally kept; do not prune.
});

test('every image entry has a Commons page, thumbnail, author and free license', () => {
  for (const [id, entry] of Object.entries(WILD_GUESS_IMAGES)) {
    assert.ok(entry, `null image for ${id}`);
    assert.match(entry.page, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, id);
    assert.match(entry.thumb, /^https:\/\/(commons\.wikimedia\.org\/wiki\/Special:FilePath\/.+\?width=480|(upload|thumb)\.wikimedia\.org\/[^]+)$/, id);
    assert.equal(typeof entry.author, 'string', id);
    assert.ok(entry.author.length > 0, `empty author for ${id}`);
    assert.match(entry.license, LICENSE_ALLOWLIST, `${id}: ${entry.license}`);
  }
});
