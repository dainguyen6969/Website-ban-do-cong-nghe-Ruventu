import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { manageScrollPosition, StorefrontScrollPosition } from './scrollPosition.js';

let stored, scrolls, resize, disconnected, cleanup, maxScrollY;
beforeEach(() => {
  stored = null;
  scrolls = [];
  disconnected = 0;
  maxScrollY = Infinity;
  globalThis.window = Object.assign(new EventTarget(), {
    history: { scrollRestoration: 'auto' }, scrollX: 0, scrollY: 0,
    scrollTo(value) {
      scrolls.push(value);
      this.scrollX = value.left;
      this.scrollY = Math.min(value.top, maxScrollY);
    },
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
  maxScrollY = 800;
  cleanup = manageScrollPosition('/?q=pc', true).cleanup;
  assert.deepEqual(scrolls, [{ left: 0, top: 4200, behavior: 'instant' }]);
  assert.equal(window.scrollY, 800);
  maxScrollY = 5000;
  resize();
  assert.equal(window.scrollY, 4200);
  assert.equal(disconnected, 1);
  resize();
  assert.equal(scrolls.length, 2);
});

test('Back and Forward restore each history entry even when the next page initially clamps the scroll', () => {
  const controller = new StorefrontScrollPosition({ entryKey: 'home-a', url: '/', navigationType: 'POP' });
  controller.componentDidMount();
  cleanup = () => controller.componentWillUnmount();
  const navigate = (entryKey, url, navigationType, limit = Infinity) => {
    const previous = controller.props;
    controller.props = { entryKey, url, navigationType };
    const position = controller.getSnapshotBeforeUpdate(previous);
    maxScrollY = limit;
    window.scrollY = Math.min(window.scrollY, limit);
    controller.componentDidUpdate(previous, null, position);
  };

  window.scrollY = 4200;
  navigate('product', '/product/123', 'PUSH', 600);
  assert.equal(window.scrollY, 0);
  window.scrollY = 550;
  navigate('home-a', '/', 'POP', 800);
  assert.equal(window.scrollY, 800);
  navigate('product', '/product/123', 'POP', 600);
  assert.equal(window.scrollY, 550);
  navigate('home-a', '/', 'POP');
  assert.equal(window.scrollY, 4200);

  navigate('home-b', '/', 'PUSH');
  assert.equal(window.scrollY, 0);
  window.scrollY = 1800;
  navigate('home-a', '/', 'POP');
  assert.equal(window.scrollY, 4200);
  navigate('home-b', '/', 'POP');
  assert.equal(window.scrollY, 1800);
});

test('manual scroll cancels an unfinished restoration', () => {
  maxScrollY = 800;
  const scroll = manageScrollPosition('/', false, { x: 0, y: 4200 });
  cleanup = scroll.cleanup;
  window.dispatchEvent(new Event('wheel'));
  window.scrollY = 300;
  maxScrollY = 5000;
  resize();
  assert.deepEqual(scroll.capture(), { x: 0, y: 300 });
  assert.equal(scrolls.length, 1);
});

test('pagehide saves the actual position and cleanup restores browser settings', () => {
  cleanup = manageScrollPosition('/product/123', false).cleanup;
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
  cleanup = manageScrollPosition('/product/123', false).cleanup;
  assert.equal(scrolls[0].top, 0);
  cleanup();
  scrolls.length = 0;
  for (const snapshot of [stored, 'broken JSON', JSON.stringify({ url: '/product/123', x: 0, y: -1 })]) {
    stored = snapshot;
    cleanup = manageScrollPosition('/product/123', true).cleanup;
    assert.equal(scrolls.length, 0);
    cleanup(); cleanup = null;
  }
});

test('disabled storage does not break navigation or reload', () => {
  sessionStorage.getItem = () => { throw new Error('disabled'); };
  sessionStorage.setItem = () => { throw new Error('disabled'); };
  cleanup = manageScrollPosition('/', true).cleanup;
  assert.doesNotThrow(() => window.dispatchEvent(new Event('pagehide')));
});
