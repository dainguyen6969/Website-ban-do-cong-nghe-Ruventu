import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const Footer = (await vite.ssrLoadModule('/src/storefront/components/Footer.jsx')).default;
const MockAuthContext = (await vite.ssrLoadModule('/src/auth/mockAuthContext.js')).default;
after(() => vite.close());

const roles = [{ id: 'sales', permissions: { don_hang: ['xem'] } }];
const renderFooter = (currentAccount) => renderToStaticMarkup(
  React.createElement(MemoryRouter, null,
    React.createElement(MockAuthContext.Provider, { value: { currentAccount, roles } }, React.createElement(Footer))),
);

test('Admin link is absent from guest and customer DOM, and present for authorized staff', () => {
  assert.doesNotMatch(renderFooter(null), /class="admin-link"/);
  assert.doesNotMatch(renderFooter({ role: 'user', trangThai: 'hoat_dong' }), /class="admin-link"/);
  assert.match(renderFooter({ employeeId: 'NV #2', vaiTro: 'sales', trangThai: 'hoat_dong' }), /class="admin-link"/);
});
