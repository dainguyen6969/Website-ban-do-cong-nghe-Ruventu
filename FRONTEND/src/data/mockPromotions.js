const STORAGE_KEY = 'ruventu_mock_promotions';

const defaultPromotions = [
    {
        id: '1',
        code: 'SALE100K',
        name: 'Giảm 100 nghìn cho đơn hàng',
        method: 'CHIẾT KHẤU',
        target: 'TỔNG ĐƠN HÀNG',
        maxUsage: 100,
        usedUsage: 23,
        remainingUsage: 77,
        startDate: '2026-09-12',
        endDate: '2026-09-30',
        status: 'ĐANG ÁP DỤNG',
        description: 'Giảm 100k trên tổng tiền hàng',
        discountType: 'GIẢM TIỀN TRÊN TỔNG ĐƠN',
        discountValue: 100000,
        appliedProducts: []
    },
    {
        id: '2',
        code: 'GIAMRAM50K',
        name: 'Giảm 50 nghìn mỗi RAM',
        method: 'CHIẾT KHẤU',
        target: 'PHIÊN BẢN SẢN PHẨM',
        maxUsage: null,
        usedUsage: 0,
        remainingUsage: null,
        startDate: '2026-09-12',
        endDate: '2026-09-30',
        status: 'ĐANG ÁP DỤNG',
        description: 'Giảm 50k cho mỗi thanh RAM mua kèm',
        discountType: 'GIẢM TIỀN THEO PHIÊN BẢN SẢN PHẨM',
        discountValue: 50000,
        appliedProducts: [
            { role: 'SẢN PHẨM MUA', code: 'RAM-001', name: 'RAM máy tính', version: '16GB', quantity: 'SL: 1' }
        ]
    },
    {
        id: '3',
        code: 'MUARAMTANGCHUOT',
        name: 'Mua RAM tặng chuột',
        method: 'TẶNG SẢN PHẨM',
        target: 'PHIÊN BẢN SẢN PHẨM',
        maxUsage: 50,
        usedUsage: 8,
        remainingUsage: 42,
        startDate: '2026-09-12',
        endDate: '2026-09-30',
        status: 'ĐANG ÁP DỤNG',
        description: 'Mua một RAM chỉ định tặng chuột',
        discountType: 'MUA PHIÊN BẢN CHỈ ĐỊNH ➔ TẶNG PHIÊN BẢN CHỈ ĐỊNH',
        discountValue: 0,
        buyProducts: [
            { code: 'RAM-001', name: 'RAM máy tính', version: '16GB', reqQuantity: 'SL: 1' }
        ],
        giftProducts: [
            { code: 'MS-001', name: 'Chuột máy tính', version: 'Mau den', giftQuantity: 'SL: 1' }
        ],
        appliedProducts: [
            { role: 'SẢN PHẨM MUA', code: 'RAM-001', name: 'RAM máy tính', version: '16GB', quantity: 'SL: 1' },
            { role: 'SẢN PHẨM TẶNG', code: 'MS-001', name: 'Chuột máy tính', version: 'Mau den', quantity: 'SL: 1' }
        ]
    },
    {
        id: '4',
        code: 'NEWUSER200K',
        name: 'Ưu đãi khách hàng mới 200k',
        method: 'CHIẾT KHẤU',
        target: 'TỔNG ĐƠN HÀNG',
        maxUsage: 100,
        usedUsage: 100,
        remainingUsage: 0,
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        status: 'HẾT LƯỢT',
        description: 'Giảm 200k cho khách hàng lần đầu mua hàng.',
        discountType: 'GIẢM TIỀN TRÊN TỔNG ĐƠN',
        discountValue: 200000,
        appliedProducts: []
    },
    {
        id: '5',
        code: 'FLASH1010',
        name: 'Flash sale 10/10',
        method: 'CHIẾT KHẤU',
        target: 'TỔNG ĐƠN HÀNG',
        maxUsage: 500,
        usedUsage: 0,
        remainingUsage: 500,
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        status: 'CHƯA BẮT ĐẦU',
        description: 'Flash sale đặc biệt duy nhất ngày 10/10',
        discountType: 'GIẢM TIỀN TRÊN TỔNG ĐƠN',
        discountValue: 150000,
        appliedProducts: []
    },
    {
        id: '6',
        code: 'SSDSALE',
        name: 'Giảm SSD dịp khai trương',
        method: 'CHIẾT KHẤU',
        target: 'PHIÊN BẢN SẢN PHẨM',
        maxUsage: 30,
        usedUsage: 22,
        remainingUsage: 8,
        startDate: '2026-03-01',
        endDate: '2026-07-31',
        status: 'TẠM DỪNG',
        description: 'Giảm giá cực sốc SSD dịp khai trương.',
        discountType: 'GIẢM TIỀN THEO PHIÊN BẢN SẢN PHẨM',
        discountValue: 300000,
        appliedProducts: [
            { role: 'SẢN PHẨM MUA', code: 'SSD-512GB', name: 'SSD NVMe Kingston 512GB', version: 'M.2 PCIe', quantity: 'SL: 1' }
        ]
    }
];

const loadPromotions = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load promotions from localStorage", e);
    }
    return defaultPromotions;
};

export let mockPromotions = loadPromotions();

const savePromotionsToStorage = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPromotions));
    } catch (e) {
        console.error("Failed to save promotion to localStorage", e);
    }
};

export const addPromotion = (newPromo) => {
    mockPromotions.unshift(newPromo);
    savePromotionsToStorage();
    return newPromo;
};

export const updatePromotion = (id, updatedFields) => {
    const index = mockPromotions.findIndex(p => p.id === id);
    if (index !== -1) {
        mockPromotions[index] = { ...mockPromotions[index], ...updatedFields };
        savePromotionsToStorage();
        return mockPromotions[index];
    }
    return null;
};

export const deletePromotion = (id) => {
    mockPromotions = mockPromotions.filter(p => p.id !== id);
    savePromotionsToStorage();
    return true;
};

export const togglePromotionStatus = (id) => {
    const promo = mockPromotions.find(p => p.id === id);
    if (promo) {
        let newStatus = 'ĐANG ÁP DỤNG';
        if (promo.status === 'TẠM DỪNG') {
            const todayStr = new Date().toISOString().split('T')[0];
            if (promo.startDate && promo.startDate > todayStr) {
                newStatus = 'CHƯA BẮT ĐẦU';
            } else if (promo.remainingUsage === 0) {
                newStatus = 'HẾT LƯỢT';
            } else {
                newStatus = 'ĐANG ÁP DỤNG';
            }
        } else {
            newStatus = 'TẠM DỪNG';
        }
        return updatePromotion(id, { status: newStatus });
    }
    return null;
};

export const getPromotions = () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...mockPromotions]);
        }, 300);
    });
};
