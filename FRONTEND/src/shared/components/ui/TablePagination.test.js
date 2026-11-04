import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ configFile:false, cacheDir:'node_modules/.vite-pagination-test', server:{middlewareMode:true,ws:false}, appType:'custom' });
const { default:TablePagination } = await server.ssrLoadModule('/src/shared/components/ui/TablePagination.jsx');
const { default:DetailTablePagination } = await server.ssrLoadModule('/src/shared/components/ui/DetailTablePagination.jsx');
const render = props => renderToStaticMarkup(React.createElement(TablePagination, { totalItems:240, currentPage:1, onPageChange:()=>{}, ...props }));
const pages = markup => [...markup.matchAll(/<button\b[^>]*>(\d+)<\/button>/g)].map(match=>Number(match[1]));
after(() => server.close());

test('all callers use a three-page sliding window without gaps', () => {
  assert.deepEqual(pages(render({})), [1,2,3]);
  assert.deepEqual(pages(render({currentPage:4,totalItems:150})), [3,4,5]);
  assert.deepEqual(pages(render({currentPage:12})), [11,12,13]);
  assert.deepEqual(pages(render({currentPage:24})), [22,23,24]);
  assert.deepEqual(pages(render({currentPage:2500,totalItems:50000})), [2499,2500,2501]);
  for (let totalPages=1;totalPages<=3;totalPages++) {
    assert.deepEqual(pages(render({totalItems:totalPages*10})),Array.from({length:totalPages},(_,index)=>index+1));
  }
});

test('boundary arrows are absent and empty or shrinking results clamp safely', () => {
  const first=render({});
  assert.doesNotMatch(first,/aria-label="Trang (đầu|trước)"/);
  assert.match(first,/aria-label="Trang sau"[^>]*>›<\/button>/);
  assert.match(first,/aria-label="Trang cuối"[^>]*>»<\/button>/);
  const last=render({currentPage:24});
  assert.doesNotMatch(last,/aria-label="Trang (sau|cuối)"/);
  assert.match(last,/aria-label="Trang đầu"[^>]*>«<\/button>/);
  assert.match(last,/aria-label="Trang trước"[^>]*>‹<\/button>/);
  const empty=render({totalItems:0,currentPage:24});
  assert.deepEqual(pages(empty),[1]);
  assert.doesNotMatch(empty,/aria-label="Trang (đầu|trước|sau|cuối)"/);
  assert.match(empty,/trên tổng số 0/);
  assert.deepEqual(pages(render({totalItems:3,currentPage:24})),[1]);
  assert.match(render({totalItems:3,currentPage:24}),/1-3/);
});

test('picker, slash count, summary and independent IDs work for every list', () => {
  const markup=render({currentPage:12,idPrefix:'products'});
  assert.match(markup,/aria-haspopup="listbox" aria-expanded="false" aria-label="Chọn trang"/);
  assert.match(markup,/<strong>12<\/strong>/);
  assert.match(markup,/<span>\/ 24<\/span>/);
  assert.match(markup,/id="products-pagination-select"/);
  assert.match(markup,/111-120/);
  assert.equal((markup.match(/aria-current="page"/g)||[]).length,1);
  assert.doesNotMatch(markup,/<input|<select|product-pagination-ellipsis/);
  assert.doesNotMatch(render({showSummary:false}),/class="product-pagination-range"/);
});

test('detail tables retain their five-row page size and hide pagination when unnecessary', () => {
  const detail = props => renderToStaticMarkup(React.createElement(DetailTablePagination,{currentPage:2,onPageChange:()=>{},idPrefix:'detail',...props}));
  assert.equal(detail({totalItems:5}),'');
  assert.match(detail({totalItems:13}),/6-10/);
  assert.deepEqual(pages(detail({totalItems:13})),[1,2,3]);
  assert.match(detail({totalItems:13,currentPage:3}),/11-13/);
  assert.match(detail({totalItems:13}),/id="detail-pagination-select"/);
});

test('ten-row server lists keep their page count and final range', () => {
  const markup=render({totalItems:38,pageSize:10,currentPage:4,className:'admin-table-footer'});
  assert.deepEqual(pages(markup),[2,3,4]);
  assert.match(markup,/31-38/);
  assert.match(markup,/<span>\/ 4<\/span>/);
  assert.match(markup,/admin-table-footer/);
});
