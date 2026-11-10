import assert from 'node:assert/strict';
import { test } from 'node:test';
import projectFontSize, { scaledFontSize } from './projectFontSize.js';
import { normalizeFontSize } from './fontSize.js';

test('scales px/rem text sizes once; inherited sizes and other dimensions remain intact', () => {
  assert.equal(scaledFontSize('14px'), 'calc(14px * var(--project-font-scale, 1))');
  assert.equal(scaledFontSize('10.5px'), 'calc(10.5px * var(--project-font-scale, 1))');
  assert.equal(scaledFontSize('1rem'), 'calc(1rem * var(--project-font-scale, 1))');
  assert.equal(scaledFontSize(12), 'calc(12px * var(--project-font-scale, 1))');
  for (const value of ['1em', '90%', 'inherit', 'var(--size)', 'calc(14px * 2)', scaledFontSize('12px')]) {
    assert.equal(scaledFontSize(value), value);
  }
  const width = { prop: 'width', value: '14px' };
  projectFontSize().Declaration(width);
  assert.equal(width.value, '14px');
  assert.equal(14 * (20 / 14), 20);
});

test('font shorthand scales the size without changing weight, line height or family', () => {
  const font = { prop: 'font', value: '700 14px/20px var(--project-font-family)' };
  projectFontSize().Declaration(font);
  assert.equal(font.value, '700 calc(14px * var(--project-font-scale, 1))/20px var(--project-font-family)');
  projectFontSize().Declaration(font);
  assert.equal(font.value, '700 calc(14px * var(--project-font-scale, 1))/20px var(--project-font-family)');
  for (const value of ['inherit', 'caption', 'italic 600 1.2em/1.5 sans-serif']) {
    const inherited = { prop: 'font', value };
    projectFontSize().Declaration(inherited);
    assert.equal(inherited.value, value);
  }
});

test('manual and QA size values stay inside the same readable range', () => {
  assert.equal(normalizeFontSize('18'), 18);
  assert.equal(normalizeFontSize('30'), 20);
  assert.equal(normalizeFontSize('2'), 12);
  assert.equal(normalizeFontSize('16.5'), 17);
  for (const value of ['', null, undefined, 'invalid', Infinity]) assert.equal(normalizeFontSize(value, 18), 18);
});
