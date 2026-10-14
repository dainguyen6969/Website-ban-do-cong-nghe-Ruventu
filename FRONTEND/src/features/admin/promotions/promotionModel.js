export const PROMOTION_STATUS = {
    DANG_AP_DUNG: 'ĐANG ÁP DỤNG', TAM_DUNG: 'TẠM DỪNG',
    CHUA_BAT_DAU: 'CHƯA BẮT ĐẦU', HET_HAN: 'HẾT HẠN', HET_LUOT: 'HẾT LƯỢT',
};

export function normalizePromotion(item) {
    return {
        id: item.id, code: item.ma_chuong_trinh, name: item.ten_chuong_trinh,
        method: item.phuong_thuc_khuyen_mai === 'TANG_SAN_PHAM' ? 'TẶNG SẢN PHẨM' : 'CHIẾT KHẤU',
        target: item.doi_tuong_khuyen_mai === 'TONG_DON' ? 'TỔNG ĐƠN HÀNG' : 'PHIÊN BẢN SẢN PHẨM',
        maxUsage: item.so_luong_ap_dung, usedUsage: item.so_luong_da_dung,
        remainingUsage: item.so_luong_con_lai,
        startDate: item.ngay_bat_dau, endDate: item.ngay_ket_thuc,
        status: PROMOTION_STATUS[item.trang_thai_hien_thi] || 'CHƯA XÁC ĐỊNH',
        savedStatus: item.trang_thai, description: item.mo_ta,
        remainingSeconds: item.thoi_gian_con_lai_giay,
        discountValue: item.gia_tri_khuyen_mai,
        discountType: item.doi_tuong_khuyen_mai === 'TONG_DON'
            ? 'GIẢM TIỀN TRÊN TỔNG ĐƠN' : 'GIẢM TIỀN THEO PHIÊN BẢN SẢN PHẨM',
        appliedProducts: (item.chi_tiet_khuyen_mai || []).map(line => ({
            variantId: line.phien_ban_id,
            role: line.loai_ap_dung === 'SAN_PHAM_TANG' ? 'SẢN PHẨM TẶNG' : 'SẢN PHẨM MUA',
            code: line.ma_san_pham, name: line.ten_san_pham,
            version: line.ten_phien_ban, quantity: `SL: ${line.so_luong}`,
        })),
        raw: item,
    };
}

// Các ô datetime-local của luồng này nhập giờ Việt Nam như BE.
export const promotionTime = value => !value ? null : /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}+07:00`;

function positiveInteger(value, message) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) throw new Error(message);
    return number;
}

export function createPromotionBody(form) {
    const gift = form.method === 'TẶNG SẢN PHẨM';
    const product = gift || form.discountType === 'PRODUCT';
    const lines = (ids, type, quantities = {}) => ids.map(id => ({
        phien_ban_id: id, loai_ap_dung: type,
        so_luong: positiveInteger(quantities[id] ?? 1, 'Số lượng chi tiết phải là số nguyên dương'),
    }));
    return {
        ma_chuong_trinh: form.code.trim().toUpperCase(), ten_chuong_trinh: form.name.trim(),
        phuong_thuc_khuyen_mai: gift ? 'TANG_SAN_PHAM' : 'CHIET_KHAU',
        doi_tuong_khuyen_mai: product ? 'TUNG_SAN_PHAM' : 'TONG_DON',
        so_luong_ap_dung: form.unlimited ? null : positiveInteger(form.limit, 'Số lượng áp dụng phải là số nguyên dương'),
        gia_tri_khuyen_mai: gift ? null : Number(form.discountValue),
        mo_ta: form.description.trim(), ngay_bat_dau: promotionTime(form.fromDate),
        ngay_ket_thuc: promotionTime(form.toDate),
        chi_tiet_khuyen_mai: gift ? [
            ...lines(form.selectedGiftBuyProducts, 'SAN_PHAM_MUA', form.giftBuyQuantities),
            ...lines(form.selectedGiftReceiveProducts, 'SAN_PHAM_TANG', form.giftReceiveQuantities),
        ] : product ? lines(form.selectedDiscountProducts, 'SAN_PHAM_MUA') : [],
    };
}

export function editPromotionBody(item, form) {
    return {
        ma_chuong_trinh: item.ma_chuong_trinh, ten_chuong_trinh: form.name.trim(),
        phuong_thuc_khuyen_mai: item.phuong_thuc_khuyen_mai,
        doi_tuong_khuyen_mai: item.doi_tuong_khuyen_mai,
        so_luong_ap_dung: form.limit === '' ? null : positiveInteger(form.limit, 'Số lượng áp dụng phải là số nguyên dương'),
        gia_tri_khuyen_mai: item.gia_tri_khuyen_mai, mo_ta: form.description.trim(),
        ngay_bat_dau: item.ngay_bat_dau,
        ngay_ket_thuc: form.endDate === item.ngay_ket_thuc.slice(0, 16)
            ? item.ngay_ket_thuc : promotionTime(form.endDate),
        chi_tiet_khuyen_mai: item.chi_tiet_khuyen_mai.map(line => ({
            phien_ban_id: line.phien_ban_id, loai_ap_dung: line.loai_ap_dung, so_luong: line.so_luong,
        })),
    };
}

export function paginateDisplayStatus(items, status, page, limit) {
    const filtered = items.filter(item => item.trang_thai_hien_thi === status);
    return {
        items: filtered.slice(page * limit, (page + 1) * limit),
        pagination: { page, limit, total_elements: filtered.length, total_pages: Math.ceil(filtered.length / limit) },
    };
}
