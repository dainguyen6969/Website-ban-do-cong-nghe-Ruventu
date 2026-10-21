import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSpecifications, resolveProductContent, toSpecRows } from './productDetailContent.js';

test('technical fields retain zero/false and nested power data while excluding provenance', () => {
  const rows = toSpecRows({
    nguon_du_lieu: [{ url: 'https://example.com' }],
    nguon: 'https://example.com',
    phien_ban: { 1: { mo_ta: 'Content for a different variant' } },
    Ports: 0,
    LED: false,
    'Nguồn': { 'Công suất': '650 W' },
    'Kết nối': { USB: 4, source: 'https://example.com' },
  });
  assert.deepEqual(rows, [
    { label: 'Ports', value: '0' },
    { label: 'LED', value: 'Không' },
    { label: 'Nguồn / Công suất', value: '650 W' },
    { label: 'Kết nối / USB', value: '4' },
  ]);
  assert.deepEqual(parseSpecifications('{broken'), {});
  assert.deepEqual(toSpecRows(null), []);
});

test('selected variant supplies its own complete specs and description without leaking another variant', () => {
  const specifications = { phien_ban: {
    1: { mo_ta: 'Description 1600W', thong_so_ky_thuat: { 'Công suất': '1600 W' } },
    2: { mo_ta: 'Description 1200W', thong_so_ky_thuat: { 'Công suất': '1200 W', 'Đầu nối': 'Full connector list' } },
  } };
  const selected = resolveProductContent(JSON.stringify(specifications), 'Parent description', 'PSU', 2);
  assert.equal(selected.description, 'Description 1200W');
  assert.equal(selected.fullSpecs.length, 2);
  assert(!JSON.stringify(selected).includes('1600'));
  assert.equal(selected.mainSpecs[0].value, '1200 W');
});

test('highlights are limited while the full table is preserved and demo descriptions stay empty', () => {
  const specifications = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`Field ${index}`, `Value ${index}`]));
  const result = resolveProductContent(specifications, 'Bộ PC mẫu kiểm thử theo cấu hình niêm yết', 'PC Build', 1);
  assert.equal(result.fullSpecs.length, 10);
  assert.equal(result.mainSpecs.length, 6);
  assert.equal(result.description, '');
});

test('real description images and text survive a legacy demo introduction', () => {
  const image = '<img src="https://example.com/gpu.jpg" alt="Card màn hình">';
  const intro = 'Dữ liệu kiểm thử local; các phiên bản là model thực tế, nguồn được ghi trong thông số.';
  assert.equal(resolveProductContent({}, intro + image, 'VGA', 1).description, image);
  assert.equal(resolveProductContent({}, intro + '<p>Mô tả đã cập nhật.</p>' + image, 'VGA', 1).description, '<p>Mô tả đã cập nhật.</p>' + image);
  assert.equal(resolveProductContent({}, image, 'VGA', 1).description, image);
  assert.equal(resolveProductContent({}, intro, 'VGA', 1).description, '');
});

test('category priorities select six highlights while all technical rows remain available', () => {
  const rows = { Model: 'GPU-X', 'Khối lượng': '1 kg', 'Màu sắc': 'Đen',
    'Công suất': '130 W', 'Cổng kết nối': 'HDMI, DisplayPort', 'Giao tiếp': 'PCIe 4.0',
    'Xung nhịp': '1800 MHz', VRAM: '8 GB', GPU: 'GPU-X', 'Chiều dài': '250 mm' };
  const specs = { phien_ban: { 1: { thong_so_ky_thuat: rows, thong_so_chinh: rows } } };
  const result = resolveProductContent(specs, '', 'VGA', 1);
  assert.deepEqual(result.mainSpecs.map(row => row.label), ['GPU', 'VRAM', 'Xung nhịp', 'Giao tiếp', 'Cổng kết nối', 'Công suất']);
  assert.equal(result.specsSummary.length, 6);
  assert.equal(result.fullSpecs.length, Object.keys(rows).length);
});
