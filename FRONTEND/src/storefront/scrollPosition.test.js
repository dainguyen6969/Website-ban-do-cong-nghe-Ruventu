import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { manageScrollPosition } from './scrollPosition.js';

let stored, scrolls, resize, disconnected, cleanup;
beforeEach(() => {
  stored = null;
  scrolls = [];
  disconnected = 0;
  globalThis.window = Object.assign(new EventTarget(), {
    history: { scrollRestoration: 'auto' }, scrollX: 0, scrollY: 0,
    scrollTo: value => scrolls.push(value),
  });
  globalThis.document = { body: {} };
  globalThis.sessionStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() { disconnected++; }
  };
});
afterEach(() => {
  cleanup?.(); cleanup = null;
  for (const key of ['window', 'document', 'sessionStorage', 'ResizeObserver']) delete globalThis[key];
});

test('F5 restores the saved URL position again when asynchronous content grows', () => {
  stored = JSON.stringify({ url: '/?q=pc', x: 0, y: 4200 });
  cleanup = manageScrollPosition('/?q=pc', true);
  assert.deepEqual(scrolls, [{ left: 0, top: 4200, behavior: 'instant' }]);
  resize();
  assert.equal(scrolls.length, 2);
  window.dispatchEvent(new Event('wheel'));
  assert.equal(disconnected, 1);
  resize();
  assert.equal(scrolls.length, 2);
});

test('pagehide saves the actual position and cleanup restores browser settings', () => {
  cleanup = manageScrollPosition('/product/123', false);
  window.scrollY = 2700;
  window.dispatchEvent(new Event('pagehide'));
  assert.deepEqual(JSON.parse(stored), { url: '/product/123', x: 0, y: 2700 });
  cleanup(); cleanup = null;
  assert.equal(window.history.scrollRestoration, 'auto');
  window.scrollY = 0;
  window.dispatchEvent(new Event('pagehide'));
  assert.equal(JSON.parse(stored).y, 2700);
});

test('new navigation starts at the top; unrelated or invalid reload snapshots are ignored', () => {
  stored = JSON.stringify({ url: '/', x: 0, y: 4200 });
  cleanup = manageScrollPosition('/product/123', false);
  assert.equal(scrolls[0].top, 0);
  cleanup();
  scrolls.length = 0;
  for (const snapshot of [stored, 'broken JSON', JSON.stringify({ url: '/product/123', x: 0, y: -1 })]) {
    stored = snapshot;
    cleanup = manageScrollPosition('/product/123', true);
    assert.equal(scrolls.length, 0);
    cleanup(); cleanup = null;
  }
});

test('disabled storage does not break navigation or reload', () => {
  sessionStorage.getItem = () => { throw new Error('disabled'); };
  sessionStorage.setItem = () => { throw new Error('disabled'); };
  cleanup = manageScrollPosition('/', true);
  assert.doesNotThrow(() => window.dispatchEvent(new Event('pagehide')));
});
