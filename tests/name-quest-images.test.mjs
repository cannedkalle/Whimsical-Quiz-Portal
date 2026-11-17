import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const { NAME_QUEST_IMAGES } = await import('../lib/name-quest/images.mjs');
const bank = JSON.parse(readFileSync(new URL('../lib/name-quest/name-bank.json', import.meta.url)));

/* Free-license allowlist: CC BY / CC BY-SA (any version), CC0, Public
 * domain, GFDL, FAL / Free Art License, SIL Open Font License and PD-textlogo
 * cover every sourced entry — all confirmed through the Commons API.
 * Anything else (NC, ND, fair use, unknown) must fail this test.
 * Nulls are expected: Pokemon (no free official art), copyrighted
 * characters/brands/games/apps/movies, fictional places, and abstract
 * terms stay imageless by design. */
const LICENSE_ALLOWLIST = /^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain|GFDL( \d\.\d)?|FAL|Free Art License|SIL Open Font License|PD-textlogo)/;

test('every bank entry has an image key and every key is a real entry', () => {
  const ids = new Set(bank.map((entry) => entry.id));
  assert.equal(bank.length, 2243);
  assert.equal(Object.keys(NAME_QUEST_IMAGES).length, 2243);
  for (const entry of bank) {
    assert.ok(Object.prototype.hasOwnProperty.call(NAME_QUEST_IMAGES, entry.id), `missing image key for ${entry.id}`);
  }
  for (const key of Object.keys(NAME_QUEST_IMAGES)) {
    assert.ok(ids.has(key), `orphan image key ${key}`);
  }
});

test('every non-null entry is a valid image, a link, or explicitly null', () => {
  let images = 0;
  let links = 0;
  for (const [id, entry] of Object.entries(NAME_QUEST_IMAGES)) {
    if (entry === null) continue;
    if (entry.thumb) {
      images += 1;
      assert.match(entry.page, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, id);
      assert.match(entry.thumb, /^https:\/\/(commons\.wikimedia\.org\/wiki\/Special:FilePath\/.+\?width=480|(upload|thumb)\.wikimedia\.org\/[^ ]+)$/, id);
      assert.ok(entry.author && entry.author.length > 0, `${id}: author`);
      assert.match(entry.license, LICENSE_ALLOWLIST, `${id}: license ${entry.license}`);
    } else if (entry.link) {
      links += 1;
      assert.match(entry.link, /^https:\/\//, `${id}: link`);
    } else {
      assert.fail(`${id}: entry is neither an image, a link, nor null`);
    }
  }
  assert.ok(images > 1100, `expected 1100+ sourced images, got ${images}`);
  assert.ok(links > 1000, `expected 1000+ official links, got ${links}`);
});
