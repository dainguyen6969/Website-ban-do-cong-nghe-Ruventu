import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { dateRange, validateDates, cashbookQuery, businessChartData, CASH_FILTERS } from './dashboardModel.js';

test('kỳ Việt Nam, bộ lọc quỹ, dữ liệu biểu đồ và tải Excel không che lỗi', async () => {
  const now = new Date('2026-10-07T18:00:00Z');
  assert.deepEqual(dateRange('HOM_NAY', now), { tu_ngay: '2026-10-08', den_ngay: '2026-10-08' });
  assert.deepEqual(dateRange('HOM_QUA', now), { tu_ngay: '2026-10-07', den_ngay: '2026-10-07' });
  assert.deepEqual(dateRange('TUAN_NAY', now), { tu_ngay: '2026-10-05', den_ngay: '2026-10-11' });
  assert.deepEqual(dateRange('THANG_NAY', new Date('2024-02-29T01:00Z')), { tu_ngay: '2024-02-01', den_ngay: '2024-02-29' });
  assert.deepEqual(dateRange('NAM_NAY', now), { tu_ngay: '2026-01-01', den_ngay: '2026-12-31' });
  assert.deepEqual(dateRange('TUAN_NAY', new Date('2026-01-01T01:00Z')), { tu_ngay: '2025-12-29', den_ngay: '2026-01-04' });
  assert.throws(() => validateDates('2026-10-08', '2026-10-07'));
  assert.throws(() => validateDates('2026-02-30', '2026-03-01'));
  validateDates('2026-10-08', '2026-10-08');
  const values = Object.fromEntries(CASH_FILTERS.map(key => [key, key.endsWith('_id') ? '9007199254740993' : 'x & y']));
  const query = new URLSearchParams(cashbookQuery({ ...values, trang_thai: 'HUY', page: 1, kenh_ban: 'ONLINE' }));
  assert.deepEqual(Object.fromEntries(query), values);
  assert.equal(cashbookQuery({ keyword: '', nguon_tao: null }), '');
  const chart = businessChartData({ ky_hien_tai: [{ tu_ngay: '2026-10-08', so_don: 0 }], ky_truoc: [{ so_don: 3 }, { so_don: 4 }] }, 'so_don');
  assert.deepEqual(chart.datasets[0].data, [0, null]);
  assert.deepEqual(chart.datasets[1].data, [3, 4]);

  // Nạp cùng hàm xác thực, thay cấu hình Vite để chạy bằng Node.
  const source = (await readFile(new URL('../../../auth/backendAuth.js', import.meta.url), 'utf8')).replace('import.meta.env.VITE_RUVENTU_API_URL', "''");
  const { apiRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const tokens = new Map([['accessToken', 'test-token']]);
  globalThis.localStorage = { getItem: key => tokens.get(key), setItem: (key, value) => tokens.set(key, value) };
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers.get('Authorization'), `Bearer ${tokens.get('accessToken')}`);
      assert.equal(options.headers.get('Accept'), 'application/test-xlsx');
      return new Response('xlsx bytes', { status: 200 });
    };
    const options = { responseType: 'blob', headers: { Accept: 'application/test-xlsx' } };
    assert.equal(await (await apiRequest('/export', options)).text(), 'xlsx bytes');
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Lỗi tổng hợp thật' }), { status: 500 });
    await assert.rejects(apiRequest('/overview'), /Lỗi tổng hợp thật/);
    await assert.rejects(apiRequest('/export', options), /Lỗi tổng hợp thật/);
    const statuses = [401, 200, 200];
    globalThis.fetch = async (url, request) => {
      const status = statuses.shift();
      if (url.endsWith('/refresh')) return new Response(JSON.stringify({ data: { access_token: 'refreshed-token' } }));
      if (status === 401) return new Response('', { status });
      assert.equal(request.headers.get('Authorization'), 'Bearer refreshed-token');
      return new Response('refreshed xlsx');
    };
    assert.equal(await (await apiRequest('/export', options)).text(), 'refreshed xlsx');
  } finally { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; }

  const returnsSource = (await readFile(new URL('../../../data/customerReturns.js', import.meta.url), 'utf8')).replace(/^import[^;]+;/gm, '');
  const { matchesReturnStatus } = await import(`data:text/javascript;base64,${Buffer.from(returnsSource).toString('base64')}`);
  const pending = { trangThai: 'DA_NHAN_HANG', lineItems: [{ thanhTienHoan: 500 }] };
  assert.equal(matchesReturnStatus(pending, 'CHO_HOAN_TIEN'), true);
  assert.equal(matchesReturnStatus({ ...pending, lineItems: [] }, 'CHO_HOAN_TIEN'), false);
  assert.equal(matchesReturnStatus({ trangThai: 'CHO_TIEP_NHAN' }, 'CAN_XU_LY'), true);
  assert.equal(matchesReturnStatus({ ...pending, trangThai: 'DA_HOAN_TIEN' }, 'CAN_XU_LY'), false);

  const orderSource = (await readFile(new URL('../orders/api/orderApi.js', import.meta.url), 'utf8')).replace(/^import[\s\S]*?from[^;]+;/gm, '');
  const requests = [];
  globalThis.uc035Request = async path => {
    const params = new URL(path, 'http://localhost').searchParams;
    requests.push(params);
    const row = (status, age) => ({ trang_thai_don_hang: status, ngay_tao: new Date(Date.now() - age * 60000).toISOString() });
    return { items: params.get('page') === '0' ? [row('CHO_DUYET', 150), row('CHO_DONG_GOI', 5)] : [row('HOAN_THANH', 300), row('CHO_LAY_HANG', 200)], pagination: { total_pages: 2 } };
  };
  try {
    const { getOrders } = await import(`data:text/javascript;base64,${Buffer.from('const adminRequest = globalThis.uc035Request; const formatDateTimeVN = x => x;\n' + orderSource).toString('base64')}`);
    const data = await getOrders({ cho_lau_phut: '120', loai_don_hang: 'ONLINE', page: 1, limit: 1 });
    assert.equal(data.pagination.total_elements, 2);
    assert.equal(data.items[0].trang_thai_don_hang, 'CHO_LAY_HANG');
    assert.equal(requests.length, 2);
    assert.ok(requests.every(params => !params.has('cho_lau_phut') && params.get('loai_don_hang') === 'ONLINE' && params.get('limit') === '100'));
  } finally { delete globalThis.uc035Request; }

  const inventorySource = (await readFile(new URL('../catalog/products/api/versionApi.js', import.meta.url), 'utf8')).replace(/^import[^;]+;/gm, '');
  globalThis.uc035InventoryRequest = async path => {
    if (path.includes('/warehouses?')) return { items: [{ id: 3, ten_kho: 'Kho' }], pagination: { total_pages: 1 } };
    if (path.includes('/products/')) return { trang_thai: 1 };
    if (path.includes('/inventory/items?')) return { items: [2, 0, 1, 5].map((stock, i) => ({ doi_tuong_id: i + 1, loai_doi_tuong: 'PHIEN_BAN', ton_co_the_ban: stock, canh_bao: true })), pagination: { total_pages: 1 } };
    const id = Number(path.match(/items\/(\d+)/)[1]);
    return { phien_ban: { san_pham_id: id, trang_thai: id === 3 ? 0 : 1 }, ton_kho_theo_kho: [{ kho_hang_id: 3, ton_co_the_ban: [2, 0, 1, 5][id - 1], muc_ton_toi_thieu: 5 }] };
  };
  try {
    const { getAllVersions } = await import(`data:text/javascript;base64,${Buffer.from('const request = globalThis.uc035InventoryRequest;\n' + inventorySource).toString('base64')}`);
    assert.deepEqual((await getAllVersions('3', undefined, true, 'HET_HANG')).versions.map(item => item.id), [2]);
    assert.deepEqual((await getAllVersions('3', undefined, true, 'DUOI_TOI_THIEU')).versions.map(item => item.id), [1, 2]);
  } finally { delete globalThis.uc035InventoryRequest; }
});
