import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { actions, actionBody } from '../../src/features/admin/warranty/data/warrantyActions.js';

const requests = JSON.parse(await readFile(new URL('./requests.json', import.meta.url), 'utf8'));
let vite, api;
const origin = process.env.WARRANTY_SIMULATION_URL || 'http://127.0.0.1:4900/warranty';
before(async () => {
  globalThis.localStorage = { getItem: () => 'warranty-simulation-token' };
  globalThis.window = { dispatchEvent() {} };
  vite = await createServer({ root: fileURLToPath(new URL('../../', import.meta.url)), configFile: false, envDir: false, cacheDir: 'node_modules/.vite-warranty-api-test', define: { 'import.meta.env.VITE_RUVENTU_API_URL': JSON.stringify(origin) }, server: { middlewareMode: true, ws: false }, appType: 'custom' });
  api = await vite.ssrLoadModule('/src/features/admin/warranty/api/warrantyApi.js');
});
after(async () => { await vite?.close(); delete globalThis.localStorage; delete globalThis.window; });

test('real HTTP client reads list, lookup, detail and combined processing filters', async () => {
  const list = await api.getWarranties({ page: 0, limit: 20 });
  assert.ok(list.items.some(item => item.id === 501));
  assert.ok((await api.lookupWarranties({ so_serial: 'RAM-SN-001' })).items.length);
  assert.equal((await api.getWarranty(501)).id, 501);
  const grouped = await api.getWarrantyList({ search: '', quick: 'ĐANG XỬ LÝ' }, 1, 20);
  assert.ok(grouped.items.every(item => ['DA_GUI_BAO_HANH', 'DANG_BAO_HANH', 'DA_NHAN_LAI', 'CHO_DOI_SAN_PHAM'].includes(item.trang_thai_xu_ly)));
});

test('existing eleven mutation routes use documented bodies and idempotent replay over HTTP', async () => {
  const body = example => example.body || example;
  for (const [code, endpoint, method] of [
    ['BH04', '', 'POST'], ['BH05', 'intake-results', 'POST'], ['BH06', 'status', 'PATCH'], ['BH07', 'events', 'POST'], ['BH08', 'quotes', 'POST'], ['BH09', 'quotes/1/events', 'POST'], ['BH010', 'invoice', 'PATCH'], ['BH011', 'money-transactions', 'POST'], ['BH012', 'replacement-plan', 'POST'], ['BH013', 'replacement-items', 'POST'], ['BH014', 'supplier-settlements', 'POST'],
  ]) {
    const id = ['BH04', 'BH05'].includes(code) ? null : 501;
    const key = crypto.randomUUID(), input = body(requests[code]);
    const result = await api.mutateWarranty(id, endpoint, input, key, method);
    assert.ok(result, code);
    assert.deepEqual(await api.mutateWarranty(id, endpoint, input, key, method), result, `${code}: replay`);
    await assert.rejects(api.mutateWarranty(id, endpoint, { ...input, ghi_chu_test: 'Changed content' }, key, method), error => error.status === 409);
  }
});

test('handover sends the frontend payload, keeps structured errors and cannot repeat completion', async () => {
  const history = await api.getWarrantyHistory(501);
  assert.ok(history.length > 100);
  assert.equal(new Set(history.map(item => item.id)).size, history.length);
  assert.ok(history.some(item => item.noi_dung === 'Duyệt ngoại lệ công nợ'));
  const operation = actions.find(item => item.key === 'HANDOVER');
  const body = actionBody(operation, { thiet_bi_ban_giao_id: 700, ten_nguoi_nhan: 'Khách kiểm thử', sdt_nguoi_nhan: '0901234567', thoi_diem: '2026-10-31T10:00', tinh_trang: 'Hoạt động tốt', phu_kien: [], xac_nhan_khach: true, bang_chung_urls: 'https://example.test/handover.png' });
  await assert.rejects(api.mutateWarranty(501, 'handover', body, crypto.randomUUID()), error => error.status === 409);
  await api.mutateWarranty(501, 'status', { su_kien: 'SAN_SANG_TRA' }, crypto.randomUUID(), 'PATCH');
  await assert.rejects(api.mutateWarranty(501, 'handover', { ...body, xac_nhan_khach: false }, crypto.randomUUID()), error => error.status === 400);
  await assert.rejects(api.mutateWarranty(501, 'handover', { ...body, phe_duyet_cong_no_lich_su_id: 999999 }, crypto.randomUUID()), error => {
    assert.equal(error.status, 409);
    assert.equal(error.data.data.con_phai_thu, 50000);
    assert.match(api.warrantyError(error), /Thu đủ tiền/);
    return true;
  });
  assert.equal((await api.getWarranty(501)).trang_thai_xu_ly, 'CHO_TRA_KHACH');
  const key = crypto.randomUUID(), result = await api.mutateWarranty(501, 'handover', body, key);
  assert.equal(result.trang_thai_xu_ly, 'HOAN_TAT');
  assert.deepEqual(await api.mutateWarranty(501, 'handover', body, key), result);
  await assert.rejects(api.mutateWarranty(501, 'handover', { ...body, ghi_chu: 'Khác' }, key), error => error.status === 409);
  await assert.rejects(api.mutateWarranty(501, 'handover', body, crypto.randomUUID()), error => error.status === 409);
  const completed = await api.getWarranty(501);
  assert.equal(completed.noi_dang_giu.loai, 'KHACH_HANG');
  assert.equal(completed.lich_su.items.filter(item => item.loai_su_kien === 'HANDOVER').length, 1);
});

test('API failures remain failures, not empty successful data', async () => {
  await assert.rejects(api.getWarranties({ keyword: 'TEST_ERROR' }), error => error.status === 503 && error.message === 'Không đọc được dữ liệu bảo hành');
  await assert.rejects(api.getWarranty(999999), error => error.status === 404);
});
