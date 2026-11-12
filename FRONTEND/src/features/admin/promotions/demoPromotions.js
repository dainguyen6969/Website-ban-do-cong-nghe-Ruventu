import { computePromotionStatus } from './promotionModel.js';

const INITIAL_DEMO_PROMOTIONS = [
    {
        id: 'DEMO-PAUSED-HISTORY',
        code: 'DEMO-PAUSED-HISTORY',
        name: 'Chương trình tạm dừng sau khi có lịch sử',
        method: 'TẶNG SẢN PHẨM',
        target: 'TỔNG ĐƠN HÀNG',
        offer: 'TẶNG BỘ QUÀ',
        startDate: '2026-08-01T00:00:00',
        endDate: '2026-11-09T21:42:00',
        maxUsage: 100,
        usedUsage: 1,
        holdingCount: 0,
        releasedCount: 0,
        remainingUsage: 99,
        status: 'TẠM DỪNG',
        savedStatus: 0,
        configVersion: 1,
        hasHistory: true,
        canEditConfig: false,
        description: 'Chương trình áp dụng ưu đãi theo danh mục cấu hình.',
        giftProducts: [
            { name: 'Chuột máy tính', version: 'Màu đen - #301', sku: 'MS-BLK-01', giftQuantity: 1 }
        ],
        buyProducts: [],
        orders: [
            {
                code: 'ORD-POS-002',
                snapshotText: 'Snapshot: DEMO-PAUSED-HISTORY v1',
                snapshotName: 'Chương trình tạm dừng sau khi có lịch sử',
                snapshotFinalized: 'Chốt: 15:45 05/09/2026',
                channel: 'Tại quầy',
                customer: 'Hoàng Minh Đức',
                phone: '0912 111 222',
                createdAt: '15:45 05/09/2026',
                orderStatus: 'HOÀN THÀNH',
                usageStatus: 'Đã sử dụng',
                discountAmount: '0đ',
                giftName: 'Chuột máy tính / Màu đen × 1',
                giftStatus: 'Chưa có chứng từ giao quà'
            }
        ]
    },
    {
        id: 'DEMO-RELEASED',
        code: 'DEMO-RELEASED',
        name: 'Lịch sử đã giải phóng vẫn khóa cấu hình',
        method: 'TẶNG SẢN PHẨM',
        target: 'TỔNG ĐƠN HÀNG',
        offer: 'TẶNG BỘ QUÀ',
        startDate: '2026-08-01T00:00:00',
        endDate: '2026-11-09T21:42:00',
        maxUsage: 100,
        usedUsage: 0,
        holdingCount: 0,
        releasedCount: 1,
        remainingUsage: 100,
        status: 'ĐANG ÁP DỤNG',
        savedStatus: 1,
        configVersion: 1,
        hasHistory: true,
        canEditConfig: false,
        description: 'Chương trình áp dụng ưu đãi theo danh mục cấu hình.',
        giftProducts: [
            { name: 'Chuột máy tính', version: 'Màu đen - #301', sku: 'MS-BLK-01', giftQuantity: 1 }
        ],
        buyProducts: [],
        orders: [
            {
                code: 'ORD-POS-001',
                snapshotText: 'Snapshot: DEMO-RELEASED v1',
                snapshotName: 'Lịch sử đã giải phóng vẫn khóa cấu hình',
                snapshotFinalized: 'Chốt: 10:20 02/08/2026',
                channel: 'Tại quầy',
                customer: 'Trần Thị Thu',
                phone: '0988 222 333',
                createdAt: '10:20 02/08/2026',
                orderStatus: 'ĐÃ HỦY',
                usageStatus: 'Đã giải phóng',
                discountAmount: '0đ',
                giftName: 'Chuột máy tính / Màu đen × 1',
                giftStatus: 'Đã hoàn trả lượt'
            }
        ]
    },
    {
        id: 'DEMO-REPORT-GIFT',
        code: 'DEMO-REPORT-GIFT',
        name: 'Đơn đủ 2 triệu tặng bộ quà – báo cáo',
        method: 'TẶNG SẢN PHẨM',
        target: 'TỔNG ĐƠN HÀNG',
        offer: 'TẶNG BỘ QUÀ',
        startDate: '2026-08-01T00:00:00',
        endDate: '2026-11-09T21:42:00',
        maxUsage: 7,
        usedUsage: 2,
        holdingCount: 1,
        releasedCount: 0,
        remainingUsage: 5,
        status: 'ĐANG ÁP DỤNG',
        savedStatus: 1,
        configVersion: 1,
        hasHistory: true,
        canEditConfig: false,
        minOrderValue: 2000000,
        description: 'Đơn đủ 2 triệu tặng bộ quà – báo cáo. Chương trình áp dụng ưu đãi theo danh mục cấu hình.',
        giftProducts: [
            { name: 'Chuột máy tính', version: 'Màu đen - #301', sku: 'MS-BLK-01', giftQuantity: 1 }
        ],
        buyProducts: [],
        orders: [
            {
                code: 'ORD-WEB-105',
                snapshotText: 'Snapshot: DEMO-REPORT-GIFT v1',
                snapshotName: 'Đơn đủ 2 triệu tặng bộ quà – báo cáo',
                snapshotFinalized: 'Chốt: 14:15 09/08/2026',
                channel: 'Website',
                customer: 'Lê Hoàng Nam',
                phone: '0903 456 789',
                createdAt: '14:15 09/08/2026',
                orderStatus: 'HOÀN THÀNH',
                usageStatus: 'Đã sử dụng',
                discountAmount: '0đ',
                giftName: 'Chuột máy tính / Màu đen × 1',
                giftStatus: 'Đã xuất kho quà'
            }
        ]
    },
    {
        id: 'DEMO-UNLIMITED',
        code: 'DEMO-UNLIMITED',
        name: 'Giảm RAM không giới hạn lượt',
        method: 'CHIẾT KHẤU',
        target: 'PHIÊN BẢN SẢN PHẨM',
        offer: 'GIẢM 50.000 đ',
        discountValue: 50000,
        startDate: '2026-11-01T21:42:00',
        endDate: '2026-11-09T21:42:00',
        maxUsage: null,
        usedUsage: 23,
        holdingCount: 3,
        releasedCount: 2,
        remainingUsage: null,
        status: 'ĐANG ÁP DỤNG',
        savedStatus: 1,
        configVersion: 1,
        hasHistory: true,
        canEditConfig: false,
        description: 'Khuyến mại giảm RAM không giới hạn lượt. Chương trình áp dụng ưu đãi theo danh mục cấu hình.',
        buyProducts: [
            { name: 'RAM Kingston Fury Beast RGB', version: '16GB DDR5 5600MHz - Black', sku: 'RAM-KF5-16G', reqQuantity: 1 }
        ],
        giftProducts: [],
        orders: [
            {
                code: 'ORD-POS-044',
                snapshotText: 'Snapshot: DEMO-UNLIMITED v1',
                snapshotName: 'Giảm RAM không giới hạn lượt',
                snapshotFinalized: 'Chốt: 22:10 01/11/2026',
                channel: 'Tại quầy',
                customer: 'Hoàng Anh Tuấn',
                phone: '0977 123 456',
                createdAt: '22:10 01/11/2026',
                orderStatus: 'HOÀN THÀNH',
                usageStatus: 'Đã sử dụng',
                discountAmount: '50.000 đ',
                giftName: '-',
                giftStatus: '-'
            }
        ]
    },
    {
        id: 'DEMO-EXHAUSTED',
        code: 'DEMO-EXHAUSTED',
        name: 'Giảm 10% danh mục linh kiện',
        method: 'CHIẾT KHẤU',
        target: 'DANH MỤC',
        offer: 'GIẢM 10%',
        discountValue: 10,
        discountType: 'Giảm theo phần trăm',
        maxDiscount: 100000,
        startDate: '2026-11-01T21:42:00',
        endDate: '2026-11-09T21:42:00',
        maxUsage: 50,
        usedUsage: 50,
        holdingCount: 0,
        releasedCount: 0,
        remainingUsage: 0,
        status: 'HẾT LƯỢT',
        savedStatus: 1,
        configVersion: 1,
        hasHistory: true,
        canEditConfig: false,
        description: 'Chương trình giảm 10% danh mục đã sử dụng hết hạn mức.',
        buyProducts: [],
        giftProducts: [],
        orders: []
    },
    {
        id: 'DEMO-EXPIRED',
        code: 'DEMO-EXPIRED',
        name: 'Flash Sale Tháng 10 - Đã hết hạn',
        method: 'CHIẾT KHẤU',
        target: 'TỔNG ĐƠN HÀNG',
        offer: 'GIẢM 200.000 đ',
        discountValue: 200000,
        startDate: '2026-10-01T00:00:00',
        endDate: '2026-10-25T23:59:00',
        maxUsage: 200,
        usedUsage: 145,
        holdingCount: 0,
        releasedCount: 0,
        remainingUsage: 55,
        status: 'HẾT HẠN',
        savedStatus: 1,
        configVersion: 1,
        hasHistory: true,
        canEditConfig: false,
        description: 'Chương trình Flash Sale tháng 10 đã kết thúc hạn áp dụng.',
        buyProducts: [],
        giftProducts: [],
        orders: []
    },
    {
        id: 'DEMO-UPCOMING',
        code: 'DEMO-UPCOMING',
        name: 'Siêu sale Giáng Sinh 2026 - Chưa bắt đầu',
        method: 'TẶNG SẢN PHẨM',
        target: 'TỔNG ĐƠN HÀNG',
        offer: 'TẶNG BỘ QUÀ',
        startDate: '2026-12-01T00:00:00',
        endDate: '2026-12-25T23:59:00',
        maxUsage: 500,
        usedUsage: 0,
        holdingCount: 0,
        releasedCount: 0,
        remainingUsage: 500,
        status: 'CHƯA BẮT ĐẦU',
        savedStatus: 1,
        configVersion: 1,
        hasHistory: false,
        canEditConfig: true,
        description: 'Chương trình chuẩn bị cho mùa Giáng Sinh, chưa đến ngày bắt đầu.',
        giftProducts: [
            { name: 'Bàn phím cơ', version: 'RGB Blue Switch', sku: 'KB-RGB-01', giftQuantity: 1 }
        ],
        buyProducts: [],
        orders: []
    }
];

export const DEMO_VARIANTS = [
    {
        id: 302,
        ten_san_pham: 'RAM máy tính',
        ten_phien_ban: '32GB',
        ma_san_pham: 'RAM-001',
        ma_vach: 'RAM32-001',
        gia_ban_le: 1800000,
        so_luong_ton: 0,
        serial: true,
        extra: 'Dung lượng: 32 GB'
    },
    {
        id: 301,
        ten_san_pham: 'RAM máy tính',
        ten_phien_ban: '16GB',
        ma_san_pham: 'RAM-001',
        ma_vach: 'RAM16-001',
        gia_ban_le: 1000000,
        so_luong_ton: 12,
        serial: true,
        extra: 'Dung lượng: 16 GB'
    },
    {
        id: 201,
        ten_san_pham: 'Card đồ họa',
        ten_phien_ban: 'RTX4080 / 16GB OC',
        ma_san_pham: 'VGA-001',
        ma_vach: 'VGA4080-01',
        gia_ban_le: 22000000,
        so_luong_ton: 2,
        serial: true,
        extra: 'Bộ nhớ: 16 GB GDDR6X'
    },
    {
        id: 101,
        ten_san_pham: 'Chuột máy tính',
        ten_phien_ban: 'Màu đen - #301',
        ma_san_pham: 'MS-001',
        ma_vach: 'MS-BLK-01',
        gia_ban_le: 450000,
        so_luong_ton: 35,
        serial: false,
        extra: 'Màu sắc: Đen'
    },
    {
        id: 102,
        ten_san_pham: 'Bàn phím cơ',
        ten_phien_ban: 'RGB Blue Switch',
        ma_san_pham: 'KB-001',
        ma_vach: 'KB-RGB-01',
        gia_ban_le: 1200000,
        so_luong_ton: 8,
        serial: false,
        extra: 'Switch: Blue, LED RGB'
    }
];

const STORAGE_KEY = 'RUVENTU_DEMO_PROMOTIONS_CACHE';

export function getDemoPromotions() {
    let list = INITIAL_DEMO_PROMOTIONS;
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                list = parsed;
            }
        }
    } catch {
        // Fallback to initial
    }
    return list.map(item => ({
        ...item,
        status: computePromotionStatus(item)
    }));
}

export function saveDemoPromotions(items) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Ignore
    }
}

export function findDemoPromotion(idOrCode) {
    if (!idOrCode) return null;
    const key = String(idOrCode).trim().toUpperCase();
    const list = getDemoPromotions();
    const found = list.find(p => p.id?.toUpperCase() === key || p.code?.toUpperCase() === key) || null;
    if (found) {
        return {
            ...found,
            status: computePromotionStatus(found)
        };
    }
    return null;
}

export function updateStoredPromotion(idOrCode, updater) {
    const list = getDemoPromotions();
    const key = String(idOrCode).trim().toUpperCase();
    const index = list.findIndex(p => p.id?.toUpperCase() === key || p.code?.toUpperCase() === key);
    if (index !== -1) {
        const current = list[index];
        const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
        list[index] = {
            ...updated,
            status: computePromotionStatus(updated)
        };
        saveDemoPromotions(list);
        return list[index];
    }
    return null;
}

export function addStoredPromotion(newPromo) {
    const list = getDemoPromotions();
    const promoWithStatus = {
        ...newPromo,
        status: computePromotionStatus(newPromo)
    };
    const existingIndex = list.findIndex(p => p.code?.toUpperCase() === newPromo.code?.toUpperCase());
    if (existingIndex !== -1) {
        list[existingIndex] = { ...list[existingIndex], ...promoWithStatus };
    } else {
        list.unshift(promoWithStatus);
    }
    saveDemoPromotions(list);
    return promoWithStatus;
}

export const DEMO_PROMOTIONS = getDemoPromotions();
