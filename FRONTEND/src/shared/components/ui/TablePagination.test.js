import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ configFile:false, cacheDir:'node_modules/.vite-pagination-test', server:{middlewareMode:true,ws:false}, appType:'custom' });
const { default:TablePagination } = await server.ssrLoadModule('/src/shared/components/ui/TablePagination.jsx');
const getPageNumbers = (currentPage, totalPages) => {
  const markup=renderToStaticMarkup(React.createElement(TablePagination,{totalItems:totalPages*10,currentPage,onPageChange:()=>{}}));
  return [...markup.matchAll(/<button\b[^>]*>(\d+)<\/button>|<span\b[^>]*>\.\.\.<\/span>/g)].map(match=>match[1]?Number(match[1]):'...');
};
after(() => server.close());

test('edges, sliding window and gaps stay compact even with a million pages', () => {
  assert.deepEqual(getPageNumbers(6,20), [1,'...',5,6,7,'...',20]);
  assert.deepEqual(getPageNumbers(1,20), [1,2,'...',20]);
  assert.deepEqual(getPageNumbers(20,20), [1,'...',19,20]);
  assert.deepEqual(getPageNumbers(4,8), [1,'...',3,4,5,'...',8]);
  assert.deepEqual(getPageNumbers(3,6), [1,2,3,4,'...',6]);
  for (let pages=1;pages<=5;pages++) assert.deepEqual(getPageNumbers(1,pages),Array.from({length:pages},(_,i)=>i+1));
  const large=getPageNumbers(500000,1000000);
  assert.equal(large.length,7);
  assert.equal(large[0],1); assert.equal(large.at(-1),1000000);
});

test('current page, hidden edge arrows, five-row tables and jump input render correctly', () => {
  const render = props => renderToStaticMarkup(React.createElement(TablePagination,{totalItems:200,currentPage:6,onPageChange:()=>{},...props}));
  const middle=render({});
  assert.equal((middle.match(/aria-current="page"/g)||[]).length,1);
  assert.match(middle,/id="table-pagination-page-6"/);
  assert.match(middle,/aria-label="Đi đến trang"/);
  assert.match(middle,/<label class="product-pagination-jump-label"><span>Đến trang<\/span><input/);
  assert.match(middle,/value="6"/);
  assert.doesNotMatch(render({currentPage:1}),/aria-label="Trang trước"/);
  assert.doesNotMatch(render({currentPage:20}),/aria-label="Trang sau"/);
  assert.match(render({totalItems:38,pageSize:5,currentPage:6}),/26-30/);
  const filtered=render({totalItems:3,currentPage:1});
  assert.match(filtered,/1-3/); assert.doesNotMatch(filtered,/ellipsis|pagination-jump|Trang trước|Trang sau/);
  assert.match(render({totalItems:0,currentPage:20}),/trên tổng số 0/);
});
