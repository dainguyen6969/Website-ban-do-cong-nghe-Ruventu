import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { createRecommendationScroll } from './recommendationScroll.js';

const vite = await createServer({ cacheDir: 'node_modules/.vite-recommendation-rail-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const { RecommendationRail } = await vite.ssrLoadModule('/src/storefront/components/ProductRecommendations.jsx');
after(() => vite.close());

function scrollHarness() {
  let time = 0;
  let nextFrame = 0;
  const frames = new Map();
  const view = {
    performance: { now: () => time },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const element = { scrollLeft: 0, scrollWidth: 5000, clientWidth: 1000, ownerDocument: { defaultView: view } };
  const scroll = createRecommendationScroll(element);
  const wheel = (overrides = {}) => {
    let prevented = false;
    scroll.onWheel({ ctrlKey: false, deltaX: 0, deltaY: 10, deltaMode: 0,
      preventDefault() { prevented = true; }, ...overrides });
    return prevented;
  };
  const advance = (milliseconds = 16) => {
    time += milliseconds;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(time));
  };
  const settle = () => {
    for (let index = 0; frames.size && index < 100; index += 1) advance();
    assert.equal(frames.size, 0, 'animation must finish');
  };
  return { element, view, scroll, wheel, advance, settle, frames };
}

test('wheel scrolling animates every input freely and locks page scrolling at both rail edges', () => {
  const { element, wheel, advance, settle, frames } = scrollHarness();
  for (let index = 0; index < 12; index += 1) assert.equal(wheel(), true);
  assert.equal(element.scrollLeft, 0);
  assert.equal(frames.size, 1);
  advance();
  assert(element.scrollLeft > 0 && element.scrollLeft < 240);
  settle();
  assert.equal(element.scrollLeft, 240);
  wheel({ deltaY: -7.5 });
  settle();
  assert.equal(element.scrollLeft, 225);
  assert.equal(wheel({ deltaX: 50, deltaY: 2 }), true);
  settle();
  assert.equal(wheel({ ctrlKey: true }), false);
  assert.equal(element.scrollLeft, 275);
  wheel({ deltaY: 1, deltaMode: 1 });
  settle();
  assert.equal(element.scrollLeft, 307);
  wheel({ deltaY: 1, deltaMode: 2 });
  settle();
  assert.equal(element.scrollLeft, 2307);
  wheel({ deltaY: 10000 });
  settle();
  assert.equal(element.scrollLeft, 4000);
  assert.equal(wheel(), true);
  settle();
  assert.equal(element.scrollLeft, 4000);
  wheel({ deltaY: -10000 });
  settle();
  assert.equal(element.scrollLeft, 0);
  assert.equal(wheel({ deltaY: -1 }), true);
  settle();
  assert.equal(element.scrollLeft, 0);
  assert.equal(wheel({ deltaX: -50, deltaY: 2 }), true);
  settle();
  assert.equal(element.scrollLeft, 0);
  assert.equal(wheel({ deltaY: 0 }), true);
  element.scrollWidth = element.clientWidth;
  assert.equal(wheel(), true);
  settle();
  assert.equal(element.scrollLeft, 0);
});

test('animation follows frame time, reverses immediately and cancels on cleanup', () => {
  const first = scrollHarness();
  const second = scrollHarness();
  first.wheel({ deltaY: 100 });
  second.wheel({ deltaY: 100 });
  first.advance(16);
  second.advance(8);
  second.advance(8);
  assert(Math.abs(first.element.scrollLeft - second.element.scrollLeft) < 0.001);
  const position = first.element.scrollLeft;
  first.wheel({ deltaY: -10 });
  first.advance();
  assert(first.element.scrollLeft < position);
  first.settle();
  assert.equal(first.element.scrollLeft, position - 20);
  second.scroll.stop();
  const stopped = second.element.scrollLeft;
  second.advance();
  assert.equal(second.frames.size, 0);
  assert.equal(second.element.scrollLeft, stopped);
});

test('reduced motion keeps scrolling responsive without animation', () => {
  const { element, view, wheel, frames } = scrollHarness();
  view.matchMedia = () => ({ matches: true });
  wheel({ deltaY: 100 });
  assert.equal(element.scrollLeft, 200);
  assert.equal(frames.size, 0);
});

test('rail reuses at most 15 original cards in a scrolling row and shows see-more when they fit', () => {
  const products = Array.from({ length: 20 }, (_, id) => ({ id, title: `Sản phẩm ${id}`, category: 'VGA', outOfStock: id === 1 }));
  const render = items => renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(RecommendationRail, { title: 'Sản phẩm liên quan', products: items, moreUrl: '/search?danh_muc_id=5' })));
  const markup = render(products);
  assert.equal((markup.match(/class="product-card /g) || []).length, 15);
  assert.doesNotMatch(markup, /Trang \d/);
  assert.match(markup, /Sản phẩm tiếp theo: Sản phẩm liên quan/);
  assert.match(markup, /recommendation-rail__controls--previous/);
  assert.match(markup, /recommendation-rail__controls--next/);
  assert.match(markup, /XEM CHI TIẾT/);
  assert.match(markup, /THÊM VÀO GIỎ HÀNG/);
  assert.match(markup, /disabled="">HẾT HÀNG/);
  assert.doesNotMatch(markup, /XEM THÊM/);
  const final = render(products.slice(0, 3));
  assert.match(final, /href="\/search\?danh_muc_id=5"/);
  assert.match(final, /XEM THÊM/);
  assert.doesNotMatch(final, /Sản phẩm tiếp theo:/);
  assert.match(render([]), /Chưa có sản phẩm gợi ý/);
});
