import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => vite.close());
const CheckoutPage = (await vite.ssrLoadModule('/src/storefront/pages/CheckoutPage.jsx')).default;
const MockAuthContext = (await vite.ssrLoadModule('/src/auth/mockAuthContext.js')).default;
const FontPreferenceContext = (await vite.ssrLoadModule('/src/typography/FontPreferenceContext.js')).default;
const { DEFAULT_FONT_OPTION } = await vite.ssrLoadModule('/src/typography/fontOptions.js');

test('Checkout renders without accessing an uninitialized handler and disables submit before preview', () => {
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, {
    initialEntries: [{ pathname: '/checkout', state: { cartItemIds: [1] } }],
  }, React.createElement(MockAuthContext.Provider, {
    value: { currentAccount: null, roles: [], logout() {} },
  }, React.createElement(FontPreferenceContext.Provider, {
    value: { font: DEFAULT_FONT_OPTION, selectFont() {} },
  }, React.createElement(CheckoutPage)))));

  assert.match(html, /THÔNG TIN LIÊN HỆ/);
  assert.equal((html.match(/class="btn-confirm-order"/g) || []).length, 1);
  assert.match(html, /<button[^>]*class="btn-confirm-order"[^>]*disabled=""/);
});
