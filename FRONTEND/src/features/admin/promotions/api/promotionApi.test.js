import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('real routes, saved flag vs computed status, full pagination and server errors', async () => {
    const previous = { fetch: globalThis.fetch, storage: globalThis.localStorage };
    globalThis.localStorage = { getItem: () => 'test-token' };
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        const page = Number(new URL(url, 'http://localhost').searchParams.get('page'));
        return new Response(JSON.stringify({ data: { items: [{ id: page + 1, trang_thai_hien_thi: page ? 'HET_HAN' : 'DANG_AP_DUNG' }], pagination: { page, total_pages: 2, total_elements: 2 } } }));
    };
    const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-promotion-test', server: { middlewareMode: true }, appType: 'custom' });
    try {
        const api = await server.ssrLoadModule('/src/features/admin/promotions/api/promotionApi.js');
        const filters = { keyword: ' SALE ', method: 'CHIET_KHAU', status: 'HET_HAN', page: 0, limit: 10 };
        const signal = new AbortController().signal;
        const result = await api.getPromotions(filters, signal);
        assert.deepEqual(result.items.map(item => item.id), [2]);
        assert.equal(result.pagination.total_elements, 1);
        assert.equal(calls.length, 2);
        for (const call of calls) {
            const params = new URL(call.url, 'http://localhost').searchParams;
            assert.equal(params.get('keyword'), 'SALE');
            assert.equal(params.get('phuong_thuc_khuyen_mai'), 'CHIET_KHAU');
            assert.equal(params.get('trang_thai'), '1');
            assert.equal(call.options.signal, signal);
        }
        calls.length = 0;
        await api.getPromotions({ ...filters, status: 'TAM_DUNG', page: 1 }, signal);
        assert.equal(calls.length, 1);
        assert.equal(new URL(calls[0].url, 'http://localhost').searchParams.get('trang_thai'), '0');
        assert.equal(new URL(calls[0].url, 'http://localhost').searchParams.get('limit'), '10');
        calls.length = 0;
        assert.equal((await api.getPromotionVariants('RAM', signal)).length, 2);
        assert.ok(calls.every(call => call.url.startsWith('/api/v1/admin/promotions/variants?')));
        calls.length = 0;
        await api.getPromotion(7, signal);
        await api.createPromotion({ ma_chuong_trinh: 'SALE' });
        await api.updatePromotion(7, { ten_chuong_trinh: 'Mới' });
        await api.setPromotionStatus(7, 0);
        await api.deletePromotion(7);
        assert.deepEqual(calls.map(call => [call.url, call.options.method || 'GET']), [
            ['/api/v1/admin/promotions/7', 'GET'], ['/api/v1/admin/promotions', 'POST'],
            ['/api/v1/admin/promotions/7', 'PUT'], ['/api/v1/admin/promotions/7/status', 'PATCH'],
            ['/api/v1/admin/promotions/7', 'DELETE'],
        ]);
        assert.deepEqual(JSON.parse(calls[3].options.body), { trang_thai: 0 });
        calls.length = 0;
        globalThis.fetch = async (url, options) => {
            calls.push({ url, options });
            return new Response(JSON.stringify({ data: { phien_ban: { id: 363, san_pham_id: 300 } } }));
        };
        assert.equal(await api.getPromotionProductId(363), 300);
        assert.equal(calls[0].url, '/api/v1/admin/inventory/items/363?loai_doi_tuong=PHIEN_BAN');
        globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Chương trình đã được sử dụng, không thể xóa' }), { status: 409 });
        await assert.rejects(api.deletePromotion(7), error => error.status === 409 && error.message === 'Chương trình đã được sử dụng, không thể xóa');
    } finally {
        await server.close();
        globalThis.fetch = previous.fetch;
        globalThis.localStorage = previous.storage;
    }
});
