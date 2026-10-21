import assert from 'node:assert/strict';
import { test } from 'node:test';
import projectFontSize, { scaledFontSize } from './projectFontSize.js';
import { normalizeFontSize } from './fontSize.js';

test('scales only fixed text sizes; other dimensions and relative sizes remain intact', () => {
  assert.equal(scaledFontSize('14px'), 'calc(14px * var(--project-font-scale, 1))');
  assert.equal(scaledFontSize('10.5px'), 'calc(10.5px * var(--project-font-scale, 1))');
  for (const value of ['1rem', 'inherit', 'var(--size)', 'calc(14px * 2)']) {
    assert.equal(scaledFontSize(value), value);
  }
  const width = { prop: 'width', value: '14px' };
  projectFontSize().Declaration(width);
  assert.equal(width.value, '14px');
  assert.equal(14 * (20 / 14), 20);
});

test('manual and QA size values stay inside the same readable range', () => {
  assert.equal(normalizeFontSize('18'), 18);
  assert.equal(normalizeFontSize('30'), 20);
  assert.equal(normalizeFontSize('2'), 12);
  assert.equal(normalizeFontSize('16.5'), 17);
  for (const value of ['', null, undefined, 'invalid', Infinity]) assert.equal(normalizeFontSize(value, 18), 18);
});
