import test from 'node:test';
import assert from 'node:assert/strict';
import { createPromotionBody, editPromotionBody, normalizePromotion, paginateDisplayStatus, promotionTime } from './promotionModel.js';

const form = {
    code: ' sale ', name: ' Ưu đãi ', limit: '10', unlimited: false,
    fromDate: '2026-10-12T09:00', toDate: '2026-10-20T10:00', description: '',
    method: 'CHIẾT KHẤU', discountType: 'TOTAL', discountValue: '50000',
    selectedDiscountProducts: [101, 102], selectedGiftBuyProducts: [101],
    selectedGiftReceiveProducts: [301], giftBuyQuantities: { 101: '2' }, giftReceiveQuantities: { 301: '3' },
};

test('three request shapes contain variant IDs, quantities and no client counters', () => {
    const total = createPromotionBody(form);
    assert.equal(total.ma_chuong_trinh, 'SALE');
    assert.equal(total.doi_tuong_khuyen_mai, 'TONG_DON');
    assert.equal(total.gia_tri_khuyen_mai, 50000);
    assert.deepEqual(total.chi_tiet_khuyen_mai, []);
    assert.equal(total.ngay_bat_dau, '2026-10-12T09:00+07:00');
    assert.equal('so_luong_da_dung' in total, false);
    const product = createPromotionBody({ ...form, discountType: 'PRODUCT', unlimited: true });
    assert.equal(product.so_luong_ap_dung, null);
    assert.equal(product.doi_tuong_khuyen_mai, 'TUNG_SAN_PHAM');
    assert.deepEqual(product.chi_tiet_khuyen_mai, [101, 102].map(id => ({ phien_ban_id: id, loai_ap_dung: 'SAN_PHAM_MUA', so_luong: 1 })));
    const gift = createPromotionBody({ ...form, method: 'TẶNG SẢN PHẨM' });
    assert.equal(gift.gia_tri_khuyen_mai, null);
    assert.deepEqual(gift.chi_tiet_khuyen_mai, [
        { phien_ban_id: 101, loai_ap_dung: 'SAN_PHAM_MUA', so_luong: 2 },
        { phien_ban_id: 301, loai_ap_dung: 'SAN_PHAM_TANG', so_luong: 3 },
    ]);
    assert.throws(() => createPromotionBody({ ...form, method: 'TẶNG SẢN PHẨM', giftBuyQuantities: { 101: 0 } }), /Số lượng chi tiết phải là số nguyên dương/);
    assert.throws(() => createPromotionBody({ ...form, limit: '1.5' }), /Số lượng áp dụng phải là số nguyên dương/);
    assert.throws(() => createPromotionBody({ ...form, method: 'TẶNG SẢN PHẨM', giftReceiveQuantities: { 301: '2.5' } }), /Số lượng chi tiết phải là số nguyên dương/);
});

test('edit preserves locked configuration and seconds, only sends accepted fields', () => {
    const item = { ...createPromotionBody(form), ngay_ket_thuc: '2026-10-20T10:00:59+07:00', so_luong_da_dung: 8, trang_thai: 0 };
    const body = editPromotionBody(item, { name: 'Tên mới', description: '', limit: '', endDate: '2026-10-20T10:00' });
    assert.equal(body.ngay_ket_thuc, item.ngay_ket_thuc);
    assert.equal(body.ngay_bat_dau, item.ngay_bat_dau);
    assert.equal(body.ma_chuong_trinh, item.ma_chuong_trinh);
    assert.equal(body.gia_tri_khuyen_mai, item.gia_tri_khuyen_mai);
    assert.equal(body.so_luong_ap_dung, null);
    assert.equal('so_luong_da_dung' in body, false);
    assert.equal('trang_thai' in body, false);
    assert.equal(promotionTime('2026-10-12T09:00:59+07:00'), '2026-10-12T09:00:59+07:00');
    assert.equal(promotionTime(''), null);
    assert.throws(() => editPromotionBody(item, { name: 'Tên', description: '', limit: '2.5', endDate: '2026-10-20T10:00' }), /Số lượng áp dụng phải là số nguyên dương/);
});

test('server status, remaining uses and countdown remain authoritative', () => {
    const result = normalizePromotion({ ...createPromotionBody(form), trang_thai: 1, trang_thai_hien_thi: 'HET_HAN', so_luong_con_lai: 4, thoi_gian_con_lai_giay: 0 });
    assert.equal(result.status, 'HẾT HẠN');
    assert.equal(result.savedStatus, 1);
    assert.equal(result.remainingUsage, 4);
    assert.equal(result.remainingSeconds, 0);
});

test('computed status filter paginates the whole result, including matches beyond page one', () => {
    const items = Array.from({ length: 35 }, (_, id) => ({ id, trang_thai_hien_thi: id % 2 ? 'DANG_AP_DUNG' : 'HET_HAN' }));
    const page = paginateDisplayStatus(items, 'HET_HAN', 1, 10);
    assert.deepEqual(page.items.map(item => item.id), [20, 22, 24, 26, 28, 30, 32, 34]);
    assert.equal(page.pagination.total_elements, 18);
    assert.equal(page.pagination.total_pages, 2);
    assert.equal(paginateDisplayStatus(items, 'TAM_DUNG', 0, 10).pagination.total_elements, 0);
});
