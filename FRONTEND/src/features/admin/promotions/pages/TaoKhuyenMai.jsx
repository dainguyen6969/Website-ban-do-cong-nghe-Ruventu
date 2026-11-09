import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { createPromotion, getPromotionVariants } from '../api/promotionApi.js';
import { createPromotionBody, computePromotionStatus } from '../promotionModel.js';
import { DEMO_VARIANTS, addStoredPromotion } from '../demoPromotions.js';
import { getAllCategories } from '../../catalog/categories/api/categoryApi.js';
import { getAllBrands } from '../../catalog/brands/api/brandApi.js';
import { seedProductCategories } from '../../../../data/productCategories.js';
import './TaoKhuyenMai.css';

const FALLBACK_BRANDS = [
    { id: 1, name: 'ASUS' },
    { id: 2, name: 'MSI' },
    { id: 3, name: 'Gigabyte' },
    { id: 4, name: 'Corsair' },
    { id: 5, name: 'Logitech' },
    { id: 6, name: 'Razer' },
    { id: 7, name: 'Intel' },
    { id: 8, name: 'AMD' },
    { id: 9, name: 'Kingston' },
    { id: 10, name: 'Samsung' }
];

function buildCategoryHierarchy(rawCategories) {
    if (!rawCategories || rawCategories.length === 0) return [];

    const childrenMap = new Map();

    rawCategories.forEach(cat => {
        const pId = (cat.parentId == null || cat.parentId === 0 || cat.parentId === '') ? 'root' : String(cat.parentId);
        if (!childrenMap.has(pId)) childrenMap.set(pId, []);
        childrenMap.get(pId).push(cat);
    });

    const result = [];
    const visited = new Set();

    function traverse(parentId, level) {
        const children = childrenMap.get(String(parentId)) || [];
        children.forEach(child => {
            const cId = String(child.id);
            if (visited.has(cId)) return;
            visited.add(cId);

            let prefix = '';
            if (level === 0) {
                prefix = '';
            } else if (level === 1) {
                prefix = '\u00A0\u00A0\u00A0— ';
            } else if (level === 2) {
                prefix = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0—— ';
            } else {
                prefix = '\u00A0'.repeat(level * 3) + '—'.repeat(level) + ' ';
            }

            result.push({
                id: child.id,
                name: child.name,
                displayName: `${prefix}${child.name}`,
                level: level,
                isParent: (level === 0),
                parentId: child.parentId
            });

            traverse(child.id, level + 1);
        });
    }

    traverse('root', 0);

    // Xử lý danh mục mồ côi nếu có
    rawCategories.forEach(cat => {
        const cId = String(cat.id);
        if (!visited.has(cId)) {
            visited.add(cId);
            result.push({
                id: cat.id,
                name: cat.name,
                displayName: `\u00A0\u00A0\u00A0— ${cat.name}`,
                level: 1,
                isParent: false,
                parentId: cat.parentId
            });
        }
    });

    return result;
}

export default function TaoKhuyenMai() {
    const navigate = useNavigate();

    // 01 / THÔNG TIN CHƯƠNG TRÌNH
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // 02 / HÌNH THỨC ƯU ĐÃI
    const [method, setMethod] = useState('CHIẾT KHẤU'); // 'CHIẾT KHẤU' | 'TẶNG SẢN PHẨM'
    const [discountKind, setDiscountKind] = useState('AMOUNT'); // 'AMOUNT' | 'PERCENT'
    const [discountValue, setDiscountValue] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [maxDiscount, setMaxDiscount] = useState('');

    // 03 / PHẠM VI & ĐIỀU KIỆN
    const [scope, setScope] = useState('TOAN_DON'); // 'TOAN_DON' | 'PHIEN_BAN' | 'DANH_MUC' | 'THUONG_HIEU'
    const [minOrderValue, setMinOrderValue] = useState('0');
    const [minQuantity, setMinQuantity] = useState('0');

    // Variants for BUY (SẢN PHẨM CẦN MUA / PHIÊN BẢN ÁP DỤNG)
    const [selectedBuyVariantIds, setSelectedBuyVariantIds] = useState([]);
    const [buyVariantQuantities, setBuyVariantQuantities] = useState({});
    const [isBuyPickerOpen, setIsBuyPickerOpen] = useState(false);
    const [buySearchQuery, setBuySearchQuery] = useState('');
    const [buyFilterCat, setBuyFilterCat] = useState('');
    const [buyFilterBrand, setBuyFilterBrand] = useState('');

    // Variants for GIFT (SẢN PHẨM ĐƯỢC TẶNG)
    const [selectedGiftVariantIds, setSelectedGiftVariantIds] = useState([]);
    const [giftVariantQuantities, setGiftVariantQuantities] = useState({});
    const [isGiftPickerOpen, setIsGiftPickerOpen] = useState(false);
    const [giftSearchQuery, setGiftSearchQuery] = useState('');
    const [giftFilterCat, setGiftFilterCat] = useState('');
    const [giftFilterBrand, setGiftFilterBrand] = useState('');

    // General variants list and cache
    const [variantsList, setVariantsList] = useState(DEMO_VARIANTS);
    const [variantsCache, setVariantsCache] = useState({});

    // Categories & Brands for 'DANH_MUC' & 'THUONG_HIEU'
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [categoriesList, setCategoriesList] = useState([]);
    const [brandsList, setBrandsList] = useState([]);

    // 04 / THỜI GIAN & HẠN MỨC
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [limit, setLimit] = useState('');
    const [unlimited, setUnlimited] = useState(false);

    // Errors & Saving
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Fetch categories and brands on load
    useEffect(() => {
        let active = true;
        getAllCategories()
            .then(data => {
                if (active && data && data.length > 0) {
                    setCategoriesList(buildCategoryHierarchy(data));
                } else if (active) {
                    setCategoriesList(buildCategoryHierarchy(seedProductCategories));
                }
            })
            .catch(() => {
                if (active) {
                    setCategoriesList(buildCategoryHierarchy(seedProductCategories));
                }
            });

        getAllBrands()
            .then(data => {
                if (active && data && data.length > 0) {
                    setBrandsList(data);
                } else if (active) {
                    setBrandsList(FALLBACK_BRANDS);
                }
            })
            .catch(() => {
                if (active) {
                    setBrandsList(FALLBACK_BRANDS);
                }
            });

        return () => { active = false; };
    }, []);

    // Fetch or supplement variants
    useEffect(() => {
        const fetchVariants = async () => {
            let list = [];
            try {
                const apiItems = await getPromotionVariants('');
                if (apiItems && apiItems.length > 0) {
                    list = apiItems;
                } else {
                    list = DEMO_VARIANTS;
                }
            } catch {
                list = DEMO_VARIANTS;
            }
            setVariantsList(list);
            setVariantsCache(prev => {
                const map = { ...prev };
                list.forEach(item => { map[item.id] = item; });
                DEMO_VARIANTS.forEach(item => { if (!map[item.id]) map[item.id] = item; });
                return map;
            });
        };
        fetchVariants();
    }, []);

    const generateCode = () => {
        const randomCode = `SALE${Math.floor(100 + Math.random() * 900)}K`;
        setCode(randomCode);
        setErrors(prev => ({ ...prev, code: null }));
    };

    const handleMethodChange = (newMethod) => {
        setMethod(newMethod);
        setErrors(prev => ({ ...prev, method: null, gift: null, buy: null }));
        if (newMethod === 'TẶNG SẢN PHẨM') {
            if (scope === 'DANH_MUC' || scope === 'THUONG_HIEU') {
                setScope('TOAN_DON');
            }
        }
    };

    const getVariantById = (vId) => {
        return variantsCache[vId] || variantsList.find(v => String(v.id) === String(vId)) || DEMO_VARIANTS.find(v => String(v.id) === String(vId));
    };

    // Handlers for Buy Variants
    const handleToggleBuyVariant = (variant) => {
        const vId = variant.id;
        setVariantsCache(prev => ({ ...prev, [vId]: variant }));
        const isSelected = selectedBuyVariantIds.some(id => String(id) === String(vId));
        if (isSelected) {
            setSelectedBuyVariantIds(prev => prev.filter(id => String(id) !== String(vId)));
            setBuyVariantQuantities(prev => {
                const next = { ...prev };
                delete next[vId];
                return next;
            });
        } else {
            setSelectedBuyVariantIds(prev => [...prev, vId]);
            setBuyVariantQuantities(prev => ({ ...prev, [vId]: 1 }));
            setErrors(prev => ({ ...prev, buy: null, variant: null }));
        }
    };

    const handleRemoveBuyVariant = (vId) => {
        setSelectedBuyVariantIds(prev => prev.filter(id => String(id) !== String(vId)));
        setBuyVariantQuantities(prev => {
            const next = { ...prev };
            delete next[vId];
            return next;
        });
    };

    const handleBuyQtyChange = (vId, val) => {
        const num = Math.max(1, parseInt(val, 10) || 1);
        setBuyVariantQuantities(prev => ({ ...prev, [vId]: num }));
    };

    // Handlers for Gift Variants
    const handleToggleGiftVariant = (variant) => {
        const vId = variant.id;
        setVariantsCache(prev => ({ ...prev, [vId]: variant }));
        const isSelected = selectedGiftVariantIds.some(id => String(id) === String(vId));
        if (isSelected) {
            setSelectedGiftVariantIds(prev => prev.filter(id => String(id) !== String(vId)));
            setGiftVariantQuantities(prev => {
                const next = { ...prev };
                delete next[vId];
                return next;
            });
        } else {
            setSelectedGiftVariantIds(prev => [...prev, vId]);
            setGiftVariantQuantities(prev => ({ ...prev, [vId]: 1 }));
            setErrors(prev => ({ ...prev, gift: null }));
        }
    };

    const handleRemoveGiftVariant = (vId) => {
        setSelectedGiftVariantIds(prev => prev.filter(id => String(id) !== String(vId)));
        setGiftVariantQuantities(prev => {
            const next = { ...prev };
            delete next[vId];
            return next;
        });
    };

    const handleGiftQtyChange = (vId, val) => {
        const num = Math.max(1, parseInt(val, 10) || 1);
        setGiftVariantQuantities(prev => ({ ...prev, [vId]: num }));
    };

    const getFilteredVariants = (query, catId, brandId) => {
        return variantsList.filter(item => {
            if (query && query.trim()) {
                const q = query.toLowerCase().trim();
                const matchName = item.ten_san_pham?.toLowerCase().includes(q);
                const matchVer = item.ten_phien_ban?.toLowerCase().includes(q);
                const matchCode = item.ma_san_pham?.toLowerCase().includes(q);
                const matchBar = item.ma_vach?.toLowerCase().includes(q);
                if (!matchName && !matchVer && !matchCode && !matchBar) return false;
            }
            if (catId && item.danh_muc_id && String(item.danh_muc_id) !== String(catId)) {
                return false;
            }
            if (brandId && item.thuong_hieu_id && String(item.thuong_hieu_id) !== String(brandId)) {
                return false;
            }
            return true;
        });
    };

    // Summary calculation for 05 / KIỂM TRA TRƯỚC KHI LƯU
    const getSummaryTitle = () => {
        const scopeTarget = scope === 'TOAN_DON'
            ? 'TRÊN TỔNG ĐƠN'
            : scope === 'PHIEN_BAN'
                ? 'TRÊN PHIÊN BẢN'
                : scope === 'DANH_MUC'
                    ? 'TRÊN DANH MỤC'
                    : 'THEO THƯƠNG HIỆU';

        if (method === 'TẶNG SẢN PHẨM') {
            return 'TẶNG BỘ QUÀ CHO ĐƠN ĐỦ ĐIỀU KIỆN';
        }
        if (discountKind === 'AMOUNT') {
            if (!discountValue || Number(discountValue) <= 0) {
                return 'CHƯA NHẬP GIÁ TRỊ GIẢM';
            }
            return `GIẢM ${Number(discountValue).toLocaleString('vi-VN')} đ ${scopeTarget}`;
        }
        if (discountKind === 'PERCENT') {
            if (!discountPercent || Number(discountPercent) <= 0) {
                return 'CHƯA NHẬP GIÁ TRỊ GIẢM';
            }
            const capText = maxDiscount ? ` TỐI ĐA ${Number(maxDiscount).toLocaleString('vi-VN')} đ` : '';
            return `GIẢM ${discountPercent}%${capText} ${scopeTarget}`;
        }
        return 'CHƯA NHẬP GIÁ TRỊ GIẢM';
    };

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '0 đ';
        return Number(amount).toLocaleString('vi-VN') + ' đ';
    };

    const formatDisplayDate = (dString) => {
        if (!dString) return '';
        let [d, t] = dString.includes('T') ? dString.split('T') : [dString, ''];
        const parts = d.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}${t ? ` ${t.slice(0, 5)}` : ''}`;
        }
        return dString;
    };

    const handleSave = async () => {
        const errs = {};
        if (!code.trim()) errs.code = 'Vui lòng nhập mã chương trình';
        if (!name.trim()) errs.name = 'Vui lòng nhập tên chương trình';

        if (method === 'CHIẾT KHẤU') {
            if (discountKind === 'AMOUNT' && (!discountValue || Number(discountValue) <= 0)) {
                errs.discountValue = 'Vui lòng nhập số tiền giảm hợp lệ';
            }
            if (discountKind === 'PERCENT' && (!discountPercent || Number(discountPercent) <= 0)) {
                errs.discountPercent = 'Vui lòng nhập tỷ lệ phần trăm hợp lệ';
            }
            if (scope === 'DANH_MUC' && !selectedCategory) {
                errs.category = 'Vui lòng chọn danh mục áp dụng';
            }
            if (scope === 'THUONG_HIEU' && !selectedBrand) {
                errs.brand = 'Vui lòng chọn thương hiệu áp dụng';
            }
            if (scope === 'PHIEN_BAN' && selectedBuyVariantIds.length === 0) {
                errs.variant = 'Vui lòng chọn ít nhất 1 phiên bản áp dụng';
            }
        } else if (method === 'TẶNG SẢN PHẨM') {
            if (selectedGiftVariantIds.length === 0) {
                errs.gift = 'Vui lòng chọn ít nhất 1 sản phẩm quà tặng';
            }
            if (scope === 'PHIEN_BAN' && selectedBuyVariantIds.length === 0) {
                errs.buy = 'Vui lòng chọn ít nhất 1 sản phẩm cần mua';
            }
        }

        if (!unlimited && (!limit || Number(limit) <= 0)) {
            errs.limit = 'Vui lòng nhập số lượt áp dụng hoặc chọn Không giới hạn';
        }

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSaving(true);
        setErrors({});

        try {
            const finalLimit = unlimited ? null : Number(limit);
            const calculatedOffer = method === 'TẶNG SẢN PHẨM'
                ? 'TẶNG BỘ QUÀ'
                : (discountKind === 'PERCENT' ? `GIẢM ${discountPercent}%` : `GIẢM ${Number(discountValue).toLocaleString('vi-VN')} đ`);

            const selectedBuyVariants = selectedBuyVariantIds.map(vId => getVariantById(vId)).filter(Boolean);
            const selectedGiftVariants = selectedGiftVariantIds.map(vId => getVariantById(vId)).filter(Boolean);

            const catObj = categoriesList.find(c => String(c.id) === String(selectedCategory));
            const brandObj = brandsList.find(b => String(b.id) === String(selectedBrand));
            const targetText = scope === 'TOAN_DON' 
                ? 'TỔNG ĐƠN HÀNG' 
                : scope === 'PHIEN_BAN' 
                    ? 'PHIÊN BẢN SẢN PHẨM' 
                    : scope === 'DANH_MUC' 
                        ? `DANH MỤC (${catObj?.name || selectedCategory})` 
                        : `THƯƠNG HIỆU (${brandObj?.name || selectedBrand})`;

            const newPromotion = {
                id: code.trim().toUpperCase(),
                code: code.trim().toUpperCase(),
                name: name.trim(),
                method: method,
                target: targetText,
                offer: calculatedOffer,
                discountValue: discountKind === 'PERCENT' ? Number(discountPercent) : (discountValue ? Number(discountValue) : 0),
                discountType: discountKind === 'PERCENT' ? 'Giảm theo phần trăm' : 'Giảm tiền trực tiếp',
                maxDiscount: maxDiscount ? Number(maxDiscount) : null,
                minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
                minQuantity: minQuantity ? Number(minQuantity) : 0,
                startDate: fromDate || '2026-11-01T00:00:00',
                endDate: toDate || '2026-11-30T23:59:00',
                maxUsage: finalLimit,
                usedUsage: 0,
                holdingCount: 0,
                releasedCount: 0,
                remainingUsage: finalLimit,
                status: computePromotionStatus({
                    startDate: fromDate || '2026-11-01T00:00:00',
                    endDate: toDate || '2026-11-30T23:59:00',
                    savedStatus: 1,
                    maxUsage: finalLimit,
                    remainingUsage: finalLimit,
                }),
                savedStatus: 1,
                configVersion: 1,
                description: description.trim() || 'Chương trình khuyến mại mới tạo',
                categoryName: catObj?.name || null,
                categoryId: selectedCategory || null,
                brandName: brandObj?.name || null,
                brandId: selectedBrand || null,
                buyProducts: selectedBuyVariants.map(v => ({
                    name: v.ten_san_pham,
                    version: v.ten_phien_ban,
                    sku: v.ma_vach || v.ma_san_pham,
                    reqQuantity: buyVariantQuantities[v.id] || 1,
                })),
                giftProducts: selectedGiftVariants.map(v => ({
                    name: v.ten_san_pham,
                    version: v.ten_phien_ban,
                    sku: v.ma_vach || v.ma_san_pham,
                    giftQuantity: giftVariantQuantities[v.id] || 1,
                })),
                orders: []
            };

            // Store in session storage so list page updates immediately
            addStoredPromotion(newPromotion);

            // Also try POST to backend in background if supported
            try {
                await createPromotion(createPromotionBody({
                    name: name.trim(),
                    code: code.trim().toUpperCase(),
                    limit: finalLimit,
                    unlimited,
                    fromDate,
                    toDate,
                    description: description.trim(),
                    method,
                    discountType: scope === 'TOAN_DON' ? 'TOTAL' : 'PRODUCT',
                    discountValue: discountKind === 'PERCENT' ? Number(discountPercent) : Number(discountValue),
                    selectedDiscountProducts: selectedBuyVariantIds,
                    selectedGiftBuyProducts: selectedBuyVariantIds,
                    giftBuyQuantities: buyVariantQuantities,
                    selectedGiftReceiveProducts: selectedGiftVariantIds,
                    giftReceiveQuantities: giftVariantQuantities,
                }));
            } catch {
                // Ignore BE errors in prototype mode
            }

            navigate('/admin/khuyen-mai/danh-sach-khuyen-mai', {
                state: { successMessage: `Đã tạo thành công chương trình ${newPromotion.code}!` },
            });
        } catch (err) {
            setErrors({ save: err.message || 'Lỗi khi lưu chương trình' });
        } finally {
            setSaving(false);
        }
    };

    // Render Variant Card Component
    const renderVariantCard = (variant, isGift = false) => {
        const qtyLabel = isGift ? 'SL TẶNG' : (method === 'TẶNG SẢN PHẨM' ? 'SL CẦN MUA' : 'SL TỐI THIỂU');
        const qtyValue = isGift ? (giftVariantQuantities[variant.id] || 1) : (buyVariantQuantities[variant.id] || 1);
        const onQtyChange = isGift ? handleGiftQtyChange : handleBuyQtyChange;
        const onRemove = isGift ? handleRemoveGiftVariant : handleRemoveBuyVariant;

        return (
            <div key={variant.id} className="selected-variant-card">
                <div className="variant-info-main">
                    <div className="variant-title-bold">
                        {variant.ten_san_pham} / {variant.ten_phien_ban}
                    </div>
                    <div className="variant-sub-sku">
                        #{variant.id} · {variant.ma_san_pham} · {variant.ma_vach}
                    </div>
                    <div className="variant-price-line">
                        Giá bán lẻ hiện tại: {formatMoney(variant.gia_ban_le)}
                    </div>
                    <div className="variant-stock-line">
                        {variant.so_luong_ton > 0 ? `Tồn có thể bán: ${variant.so_luong_ton}` : 'HẾT HÀNG - CÓ THỂ CẤU HÌNH'}
                    </div>
                    <div className="variant-tags-line">
                        {variant.serial ? 'Quản lý serial' : 'Không quản lý serial'}
                        {variant.extra ? ` · ${variant.extra}` : ''}
                    </div>
                </div>

                <div className="variant-actions-right">
                    <div className="variant-min-qty-box">
                        <label>{qtyLabel}</label>
                        <input
                            type="number"
                            min="1"
                            value={qtyValue}
                            onChange={(e) => onQtyChange(variant.id, e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn-remove-variant"
                        onClick={() => onRemove(variant.id)}
                    >
                        ×
                    </button>
                </div>
            </div>
        );
    };

    // Render Variant Picker Table Component
    const renderInlinePicker = (isGift = false) => {
        const query = isGift ? giftSearchQuery : buySearchQuery;
        const setQuery = isGift ? setGiftSearchQuery : setBuySearchQuery;
        const catFilter = isGift ? giftFilterCat : buyFilterCat;
        const setCatFilter = isGift ? setGiftFilterCat : setBuyFilterCat;
        const brandFilter = isGift ? giftFilterBrand : buyFilterBrand;
        const setBrandFilter = isGift ? setGiftFilterBrand : setBuyFilterBrand;
        const selectedIds = isGift ? selectedGiftVariantIds : selectedBuyVariantIds;
        const onToggle = isGift ? handleToggleGiftVariant : handleToggleBuyVariant;
        const onClose = () => isGift ? setIsGiftPickerOpen(false) : setIsBuyPickerOpen(false);

        const filtered = getFilteredVariants(query, catFilter, brandFilter);

        return (
            <div className="inline-variant-picker-box">
                <div className="picker-search-bar">
                    <input
                        type="text"
                        placeholder="TÌM MÃ / TÊN / PHIÊN BẢN / MÃ VẠCH..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <select
                        value={catFilter}
                        onChange={(e) => setCatFilter(e.target.value)}
                    >
                        <option value="">Tất cả danh mục</option>
                        {categoriesList.map(cat => (
                            <option
                                key={cat.id}
                                value={cat.id}
                                style={{
                                    fontWeight: cat.level === 0 ? '700' : '400',
                                    fontSize: cat.level >= 2 ? '11px' : cat.level === 1 ? '12px' : '13px',
                                    color: cat.level >= 2 ? '#4b5563' : '#111'
                                }}
                            >
                                {cat.displayName}
                            </option>
                        ))}
                    </select>
                    <select
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                    >
                        <option value="">Tất cả thương hiệu</option>
                        {brandsList.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div className="picker-subtext">
                    Chọn phiên bản chỉ cấu hình chương trình, không giữ chỗ tồn kho. Tồn thực tế được kiểm tra khi áp dụng hoặc giao hàng.
                </div>

                <div className="picker-table-container">
                    <table className="picker-table">
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                                        Không tìm thấy phiên bản phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(item => {
                                    const isChecked = selectedIds.some(id => String(id) === String(item.id));
                                    return (
                                        <tr
                                            key={item.id}
                                            className={isChecked ? 'row-selected' : ''}
                                            onClick={() => onToggle(item)}
                                        >
                                            <td style={{ width: '40px', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => onToggle(item)}
                                                />
                                            </td>
                                            <td>
                                                <div className="picker-item-name">
                                                    {item.ten_san_pham} / {item.ten_phien_ban}
                                                </div>
                                                <div className="picker-item-sub">
                                                    {item.ma_san_pham} · {item.ma_vach}
                                                </div>
                                                <div className="picker-item-status">
                                                    {item.so_luong_ton > 0 ? `Tồn có thể bán: ${item.so_luong_ton}` : 'HẾT HÀNG - CÓ THỂ CẤU HÌNH'}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                {formatMoney(item.gia_ban_le)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="picker-footer">
                    <div>{filtered.length} phiên bản · Trang 1/1</div>
                    <div className="picker-footer-btns">
                        <button type="button" disabled>TRƯỚC</button>
                        <button type="button" disabled>SAU</button>
                        <button
                            type="button"
                            className="btn-picker-close"
                            onClick={onClose}
                        >
                            ĐÓNG
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="promo-create-page-v2">
            {/* Header Area */}
            <div className="create-header-bar">
                <div className="create-header-left">
                    <div className="create-breadcrumb">KHUYẾN MẠI / TẠO KHUYẾN MẠI</div>
                    <h1 className="create-main-title">TẠO CHƯƠNG TRÌNH KHUYẾN MẠI</h1>
                    <div className="create-subtitle">Cấu hình ưu đãi, điều kiện mua và hạn mức trước khi lưu.</div>
                </div>
                <div className="create-header-right">
                    <button
                        type="button"
                        className="btn-create-back"
                        onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}
                    >
                        QUAY LẠI DANH SÁCH
                    </button>
                </div>
            </div>

            {/* Top Grid: Card 01 & Card 02 (Image 1) */}
            <div className="create-grid-2-col">
                {/* 01 / THÔNG TIN CHƯƠNG TRÌNH */}
                <div className="create-card">
                    <div className="create-card-header">
                        <span className="create-card-accent" aria-hidden="true" />
                        <h3>01 / THÔNG TIN CHƯƠNG TRÌNH</h3>
                    </div>
                    <div className="create-card-body">
                        <div className="create-form-field">
                            <label>MÃ CHƯƠNG TRÌNH <span>*</span></label>
                            <div className="create-input-with-btn">
                                <input
                                    type="text"
                                    placeholder="VD: SALE100K"
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value.toUpperCase());
                                        setErrors(prev => ({ ...prev, code: null }));
                                    }}
                                    className={errors.code ? 'input-error' : ''}
                                />
                                <button type="button" className="btn-auto-code promo-btn-auto-code" onClick={generateCode} title="Tự động sinh mã ngẫu nhiên">
                                    TỰ SINH
                                </button>
                            </div>
                            <div className="field-hint">
                                Tự sinh chỉ gợi ý mã; tính duy nhất được kiểm tra khi lưu.
                            </div>
                            {errors.code && <div className="error-tip">{errors.code}</div>}
                        </div>

                        <div className="create-form-field">
                            <label>TÊN CHƯƠNG TRÌNH <span>*</span></label>
                            <input
                                type="text"
                                placeholder="VD: Giảm 10% danh mục CPU"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setErrors(prev => ({ ...prev, name: null }));
                                }}
                                className={errors.name ? 'input-error' : ''}
                            />
                            {errors.name && <div className="error-tip">{errors.name}</div>}
                        </div>

                        <div className="create-form-field">
                            <label>MÔ TẢ</label>
                            <textarea
                                rows={3}
                                placeholder="Mô tả ngắn về chương trình..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* 02 / HÌNH THỨC ƯU ĐÃI (Image 1 & 4) */}
                <div className="create-card">
                    <div className="create-card-header">
                        <span className="create-card-accent" aria-hidden="true" />
                        <h3>02 / HÌNH THỨC ƯU ĐÃI</h3>
                    </div>
                    <div className="create-card-body">
                        {/* Selector: Chiết khấu / Tặng sản phẩm */}
                        <div className="toggle-btn-row">
                            <button
                                type="button"
                                className={`btn-toggle-large ${method === 'CHIẾT KHẤU' ? 'active' : ''}`}
                                onClick={() => handleMethodChange('CHIẾT KHẤU')}
                            >
                                CHIẾT KHẤU
                            </button>
                            <button
                                type="button"
                                className={`btn-toggle-large ${method === 'TẶNG SẢN PHẨM' ? 'active' : ''}`}
                                onClick={() => handleMethodChange('TẶNG SẢN PHẨM')}
                            >
                                TẶNG SẢN PHẨM
                            </button>
                        </div>

                        {method === 'CHIẾT KHẤU' ? (
                            <>
                                <div className="create-form-field" style={{ marginTop: '16px' }}>
                                    <label>LOẠI CHIẾT KHẤU <span>*</span></label>
                                    <div className="toggle-btn-row">
                                        <button
                                            type="button"
                                            className={`btn-toggle-large ${discountKind === 'AMOUNT' ? 'active' : ''}`}
                                            onClick={() => setDiscountKind('AMOUNT')}
                                        >
                                            SỐ TIỀN
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-toggle-large ${discountKind === 'PERCENT' ? 'active' : ''}`}
                                            onClick={() => setDiscountKind('PERCENT')}
                                        >
                                            PHẦN TRĂM
                                        </button>
                                    </div>
                                </div>

                                {discountKind === 'AMOUNT' ? (
                                    <div className="create-form-field" style={{ marginTop: '16px' }}>
                                        <label>GIÁ TRỊ GIẢM (đ) <span>*</span></label>
                                        <input
                                            type="number"
                                            placeholder="100000"
                                            value={discountValue}
                                            onChange={(e) => {
                                                setDiscountValue(e.target.value);
                                                setErrors(prev => ({ ...prev, discountValue: null }));
                                            }}
                                            className={errors.discountValue ? 'input-error' : ''}
                                        />
                                        <div className="field-hint">
                                            Giảm số tiền cố định. Với phạm vi phiên bản, mức giảm áp dụng cho mỗi đơn vị đủ điều kiện.
                                        </div>
                                        {errors.discountValue && <div className="error-tip">{errors.discountValue}</div>}
                                    </div>
                                ) : (
                                    <>
                                        <div className="create-form-field" style={{ marginTop: '16px' }}>
                                            <label>TỶ LỆ GIẢM (%) <span>*</span></label>
                                            <input
                                                type="number"
                                                placeholder="10"
                                                value={discountPercent}
                                                onChange={(e) => {
                                                    setDiscountPercent(e.target.value);
                                                    setErrors(prev => ({ ...prev, discountPercent: null }));
                                                }}
                                                className={errors.discountPercent ? 'input-error' : ''}
                                            />
                                            {errors.discountPercent && <div className="error-tip">{errors.discountPercent}</div>}
                                        </div>
                                        <div className="create-form-field" style={{ marginTop: '12px' }}>
                                            <label>MỨC GIẢM TỐI ĐA (đ) - KHÔNG BẮT BUỘC</label>
                                            <input
                                                type="number"
                                                placeholder="VD: 300000"
                                                value={maxDiscount}
                                                onChange={(e) => setMaxDiscount(e.target.value)}
                                            />
                                            <div className="field-hint">
                                                Giảm phần trăm trên giá trị hàng đủ điều kiện, không vượt mức tối đa nếu đã cấu hình.
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            /* Quote matching Image 1 when TẶNG SẢN PHẨM is active */
                            <div className="create-left-quote" style={{ marginTop: '16px' }}>
                                Mỗi đơn đủ điều kiện nhận <strong>một bộ quà cố định</strong>, gồm tất cả dòng quà đã cấu hình. Không cho khách chọn quà và không nhân bộ quà theo bội số mua.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 03 / PHẠM VI & ĐIỀU KIỆN */}
            <div className="create-card full-width">
                <div className="create-card-header">
                    <span className="create-card-accent" aria-hidden="true" />
                    <h3>03 / PHẠM VI & ĐIỀU KIỆN</h3>
                </div>
                <div className="create-card-body">
                    {/* Scope row: When TẶNG SẢN PHẨM, only show TOÀN ĐƠN and PHIÊN BẢN SẢN PHẨM (Image 1) */}
                    <div className="create-form-field">
                        <label>PHẠM VI ÁP DỤNG <span>*</span></label>
                        {method === 'TẶNG SẢN PHẨM' ? (
                            <div className="scope-btn-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <button
                                    type="button"
                                    className={`btn-scope-item ${scope === 'TOAN_DON' ? 'active' : ''}`}
                                    onClick={() => setScope('TOAN_DON')}
                                >
                                    TOÀN ĐƠN
                                </button>
                                <button
                                    type="button"
                                    className={`btn-scope-item ${scope === 'PHIEN_BAN' ? 'active' : ''}`}
                                    onClick={() => setScope('PHIEN_BAN')}
                                >
                                    PHIÊN BẢN SẢN PHẨM
                                </button>
                            </div>
                        ) : (
                            <div className="scope-btn-row">
                                <button
                                    type="button"
                                    className={`btn-scope-item ${scope === 'TOAN_DON' ? 'active' : ''}`}
                                    onClick={() => setScope('TOAN_DON')}
                                >
                                    TOÀN ĐƠN
                                </button>
                                <button
                                    type="button"
                                    className={`btn-scope-item ${scope === 'PHIEN_BAN' ? 'active' : ''}`}
                                    onClick={() => setScope('PHIEN_BAN')}
                                >
                                    PHIÊN BẢN SẢN PHẨM
                                </button>
                                <button
                                    type="button"
                                    className={`btn-scope-item ${scope === 'DANH_MUC' ? 'active' : ''}`}
                                    onClick={() => setScope('DANH_MUC')}
                                >
                                    DANH MỤC
                                </button>
                                <button
                                    type="button"
                                    className={`btn-scope-item ${scope === 'THUONG_HIEU' ? 'active' : ''}`}
                                    onClick={() => setScope('THUONG_HIEU')}
                                >
                                    THƯƠNG HIỆU
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Scope === 'DANH_MUC' (Only when CHIẾT KHẤU) */}
                    {method === 'CHIẾT KHẤU' && scope === 'DANH_MUC' && (
                        <div className="create-form-field" style={{ marginTop: '16px' }}>
                            <label>DANH MỤC ÁP DỤNG <span>*</span></label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setErrors(prev => ({ ...prev, category: null }));
                                }}
                                className={errors.category ? 'input-error' : ''}
                            >
                                <option value="">Chọn danh mục</option>
                                {categoriesList.map(cat => (
                                    <option
                                        key={cat.id}
                                        value={cat.id}
                                        style={{
                                            fontWeight: cat.level === 0 ? '700' : '400',
                                            fontSize: cat.level >= 2 ? '11px' : cat.level === 1 ? '12px' : '13px',
                                            color: cat.level >= 2 ? '#4b5563' : '#111'
                                        }}
                                    >
                                        {cat.displayName}
                                    </option>
                                ))}
                            </select>
                            <div className="field-hint">
                                Áp dụng cho danh mục đã chọn và các danh mục con. Không phải loại sản phẩm.
                            </div>
                            {errors.category && <div className="error-tip">{errors.category}</div>}
                        </div>
                    )}

                    {/* Scope === 'THUONG_HIEU' (Only when CHIẾT KHẤU) */}
                    {method === 'CHIẾT KHẤU' && scope === 'THUONG_HIEU' && (
                        <div className="create-form-field" style={{ marginTop: '16px' }}>
                            <label>THƯƠNG HIỆU ÁP DỤNG <span>*</span></label>
                            <select
                                value={selectedBrand}
                                onChange={(e) => {
                                    setSelectedBrand(e.target.value);
                                    setErrors(prev => ({ ...prev, brand: null }));
                                }}
                                className={errors.brand ? 'input-error' : ''}
                            >
                                <option value="">Chọn thương hiệu</option>
                                {brandsList.map(brand => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </option>
                                ))}
                            </select>
                            <div className="field-hint">
                                Chỉ hàng thuộc thương hiệu đã chọn được tính là hàng đủ điều kiện.
                            </div>
                            {errors.brand && <div className="error-tip">{errors.brand}</div>}
                        </div>
                    )}

                    {/* Thresholds */}
                    <div className="threshold-grid">
                        <div className="create-form-field">
                            <label>GIÁ TRỊ HÀNG TỐI THIỂU (đ)</label>
                            <input
                                type="number"
                                value={minOrderValue}
                                onChange={(e) => setMinOrderValue(e.target.value)}
                            />
                        </div>
                        <div className="create-form-field">
                            <label>SỐ LƯỢNG MUA TỐI THIỂU</label>
                            <input
                                type="number"
                                value={minQuantity}
                                onChange={(e) => setMinQuantity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="create-left-quote">
                        Ngưỡng tính trên hàng mua đủ điều kiện; không gồm phí giao hàng hoặc dòng quà tặng. Để trống tương đương 0.
                    </div>

                    {/* CASE 1: CHIẾT KHẤU + PHIÊN BẢN SẢN PHẨM */}
                    {method === 'CHIẾT KHẤU' && scope === 'PHIEN_BAN' && (
                        <div className="variants-section-block">
                            <div className="variants-section-title">PHIÊN BẢN ÁP DỤNG</div>
                            <label className="variants-select-label">CHỌN PHIÊN BẢN MUA *</label>

                            <div className="selected-variants-list">
                                {selectedBuyVariantIds.map(vId => {
                                    const variant = getVariantById(vId);
                                    if (!variant) return null;
                                    return renderVariantCard(variant, false);
                                })}
                            </div>

                            <button
                                type="button"
                                className="btn-add-variant-toggle"
                                onClick={() => setIsBuyPickerOpen(!isBuyPickerOpen)}
                            >
                                {isBuyPickerOpen ? '− ĐÓNG BỘ CHỌN' : '+ THÊM PHIÊN BẢN'}
                            </button>

                            {isBuyPickerOpen && renderInlinePicker(false)}

                            {errors.variant && <div className="error-tip" style={{ marginTop: '10px' }}>{errors.variant}</div>}

                            <div className="variants-footer-footnote">
                                Mỗi phiên bản giữ số lượng tối thiểu riêng. Không bắt buộc mọi phiên bản được chọn phải xuất hiện trong cùng đơn.
                            </div>
                        </div>
                    )}

                    {/* CASE 2: TẶNG SẢN PHẨM + PHIÊN BẢN SẢN PHẨM (Image 2 & 5: Sections A & B) */}
                    {method === 'TẶNG SẢN PHẨM' && scope === 'PHIEN_BAN' && (
                        <>
                            {/* A. SẢN PHẨM CẦN MUA */}
                            <div className="sub-section-box">
                                <div className="sub-section-title">A. SẢN PHẨM CẦN MUA</div>
                                <div className="sub-section-label">CHỌN PHIÊN BẢN MUA <span>*</span></div>

                                <div className="selected-variants-list">
                                    {selectedBuyVariantIds.map(vId => {
                                        const variant = getVariantById(vId);
                                        if (!variant) return null;
                                        return renderVariantCard(variant, false);
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className="btn-add-variant-toggle"
                                    onClick={() => setIsBuyPickerOpen(!isBuyPickerOpen)}
                                >
                                    {isBuyPickerOpen ? '− ĐÓNG BỘ CHỌN' : '+ THÊM PHIÊN BẢN'}
                                </button>

                                {isBuyPickerOpen && renderInlinePicker(false)}

                                {errors.buy && <div className="error-tip" style={{ marginTop: '10px' }}>{errors.buy}</div>}

                                <div className="sub-section-footnote">
                                    TẤT CẢ dòng mua và số lượng đã cấu hình phải được đáp ứng để nhận bộ quà.
                                </div>
                            </div>

                            {/* B. SẢN PHẨM ĐƯỢC TẶNG */}
                            <div className="sub-section-box">
                                <div className="sub-section-title">B. SẢN PHẨM ĐƯỢC TẶNG</div>
                                <div className="sub-section-label">CHỌN PHIÊN BẢN TẶNG <span>*</span></div>

                                <div className="selected-variants-list">
                                    {selectedGiftVariantIds.map(vId => {
                                        const variant = getVariantById(vId);
                                        if (!variant) return null;
                                        return renderVariantCard(variant, true);
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className="btn-add-variant-toggle"
                                    onClick={() => setIsGiftPickerOpen(!isGiftPickerOpen)}
                                >
                                    {isGiftPickerOpen ? '− ĐÓNG BỘ CHỌN' : '+ THÊM PHIÊN BẢN'}
                                </button>

                                {isGiftPickerOpen && renderInlinePicker(true)}

                                {errors.gift && <div className="error-tip" style={{ marginTop: '10px' }}>{errors.gift}</div>}

                                <div className="sub-section-footnote">
                                    Nhận toàn bộ các dòng quà đã cấu hình.
                                </div>
                            </div>
                        </>
                    )}

                    {/* CASE 3: TẶNG SẢN PHẨM + TOÀN ĐƠN (Only Gift Section) */}
                    {method === 'TẶNG SẢN PHẨM' && scope === 'TOAN_DON' && (
                        <div className="sub-section-box">
                            <div className="sub-section-title">SẢN PHẨM ĐƯỢC TẶNG</div>
                            <div className="sub-section-label">CHỌN PHIÊN BẢN TẶNG <span>*</span></div>

                            <div className="selected-variants-list">
                                {selectedGiftVariantIds.map(vId => {
                                    const variant = getVariantById(vId);
                                    if (!variant) return null;
                                    return renderVariantCard(variant, true);
                                })}
                            </div>

                            <button
                                type="button"
                                className="btn-add-variant-toggle"
                                onClick={() => setIsGiftPickerOpen(!isGiftPickerOpen)}
                            >
                                {isGiftPickerOpen ? '− ĐÓNG BỘ CHỌN' : '+ THÊM PHIÊN BẢN'}
                            </button>

                            {isGiftPickerOpen && renderInlinePicker(true)}

                            {errors.gift && <div className="error-tip" style={{ marginTop: '10px' }}>{errors.gift}</div>}

                            <div className="sub-section-footnote">
                                Nhận toàn bộ các dòng quà đã cấu hình.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 04 / THỜI GIAN & HẠN MỨC (Image 2) */}
            <div className="create-card full-width">
                <div className="create-card-header">
                    <span className="create-card-accent" aria-hidden="true" />
                    <h3>04 / THỜI GIAN & HẠN MỨC</h3>
                </div>
                <div className="create-card-body">

                    <div className="threshold-grid" style={{ marginTop: '14px' }}>
                        <div className="create-form-field">
                            <label>NGÀY BẮT ĐẦU <span>*</span></label>
                            <input
                                type="datetime-local"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="create-form-field">
                            <label>NGÀY KẾT THÚC <span>*</span></label>
                            <input
                                type="datetime-local"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="limit-input-group" style={{ marginTop: '16px' }}>
                        <div className="create-form-field" style={{ maxWidth: '300px' }}>
                            <label>SỐ LƯỢT ÁP DỤNG <span>*</span></label>
                            <input
                                type="number"
                                placeholder="VD: 100"
                                value={limit}
                                disabled={unlimited}
                                onChange={(e) => {
                                    setLimit(e.target.value);
                                    setErrors(prev => ({ ...prev, limit: null }));
                                }}
                                className={errors.limit ? 'input-error' : ''}
                            />
                        </div>
                        <div className="checkbox-unlimited-row">
                            <label className={`unlimited-toggle-pill ${unlimited ? 'is-active' : ''}`} title="Áp dụng không giới hạn số lượt">
                                <input
                                    type="checkbox"
                                    className="unlimited-toggle-checkbox"
                                    checked={unlimited}
                                    onChange={(e) => {
                                        setUnlimited(e.target.checked);
                                        if (e.target.checked) {
                                            setLimit('');
                                            setErrors(prev => ({ ...prev, limit: null }));
                                        }
                                    }}
                                />
                                <span className="unlimited-indicator">
                                    {unlimited ? <Check size={12} strokeWidth={3} /> : null}
                                </span>
                                <span className="unlimited-text">KHÔNG GIỚI HẠN</span>
                            </label>
                        </div>
                    </div>
                    {errors.limit && <div className="error-tip">{errors.limit}</div>}
                </div>
            </div>

            {/* 05 / KIỂM TRA TRƯỚC KHI LƯU (Image 3 & 5) */}
            <div className="create-card full-width">
                <div className="create-card-header">
                    <span className="create-card-accent" aria-hidden="true" />
                    <h3>05 / KIỂM TRA TRƯỚC KHI LƯU</h3>
                </div>
                <div className="create-card-body">
                    {method === 'TẶNG SẢN PHẨM' ? (
                        <>
                            {/* Comparison preview: MUA & NHẬN QUÀ (Image 3/5) */}
                            <div className="promo-buy-gift-preview">
                                <div className="preview-box">
                                    <div className="preview-box-label">MUA</div>
                                    <div className="preview-box-content">
                                        {scope === 'TOAN_DON' ? (
                                            <div className="preview-line-item">Toàn đơn hàng đủ điều kiện</div>
                                        ) : selectedBuyVariantIds.length === 0 ? (
                                            <div className="preview-line-empty">Chưa chọn phiên bản mua</div>
                                        ) : (
                                            selectedBuyVariantIds.map(vId => {
                                                const v = getVariantById(vId);
                                                if (!v) return null;
                                                return (
                                                    <div key={v.id} className="preview-line-item">
                                                        <strong>{buyVariantQuantities[v.id] || 1} ×</strong> {v.ten_san_pham} / {v.ten_phien_ban} · {v.ma_san_pham || v.ma_vach}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="preview-box">
                                    <div className="preview-box-label">NHẬN QUÀ</div>
                                    <div className="preview-box-content">
                                        {selectedGiftVariantIds.length === 0 ? (
                                            <div className="preview-line-empty">Chưa chọn phiên bản quà tặng</div>
                                        ) : (
                                            selectedGiftVariantIds.map(vId => {
                                                const v = getVariantById(vId);
                                                if (!v) return null;
                                                return (
                                                    <div key={v.id} className="preview-line-item">
                                                        <strong>{giftVariantQuantities[v.id] || 1} ×</strong> {v.ten_san_pham} / {v.ten_phien_ban} · {v.ma_san_pham || v.ma_vach}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Heading banner for Gift */}
                            <div className="summary-main-header">
                                <div className="summary-title-bold">MỖI ĐƠN: 1 BỘ QUÀ - NHẬN TẤT CẢ QUÀ ĐÃ CẤU HÌNH</div>
                                <div className="summary-desc-muted">Không nhân theo số lượng mua. Tồn quà và trừ kho được xử lý khi chốt đơn.</div>
                            </div>
                        </>
                    ) : (
                        /* Header tiêu đề tóm tắt động cho Chiết khấu */
                        <div className="summary-main-header">
                            <div className="summary-title-bold">{getSummaryTitle()}</div>
                            <div className="summary-desc-muted">Trên tổng đơn khi chương trình được áp dụng.</div>
                        </div>
                    )}

                    {/* Lưới tóm tắt 2 cột (Image 3) */}
                    <div className="summary-grid-2">
                        <div className="summary-col">
                            <div className="summary-item">
                                <label>CHƯƠNG TRÌNH</label>
                                <div>
                                    {code ? <span className="summary-code-badge">{code}</span> : <span className="summary-placeholder">Chưa nhập mã</span>}
                                    {name ? <strong className="summary-name-bold"> — {name}</strong> : <span className="summary-placeholder"> — Chưa nhập tên</span>}
                                </div>
                            </div>
                            <div className="summary-item">
                                <label>GIÁ TRỊ HÀNG TỐI THIỂU</label>
                                <div>{minOrderValue ? <strong className="summary-val-highlight">{formatMoney(minOrderValue)}</strong> : '0 đ'}</div>
                            </div>
                            <div className="summary-item">
                                <label>GIỚI HẠN</label>
                                <div>
                                    {unlimited ? (
                                        <span className="summary-unlimited-badge">KHÔNG GIỚI HẠN</span>
                                    ) : (
                                        limit ? <strong className="summary-limit-count">{limit} lượt</strong> : <span className="summary-placeholder">Chưa nhập hạn mức</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="summary-col">
                            <div className="summary-item">
                                <label>PHẠM VI</label>
                                <div>
                                    <span className="summary-scope-badge">
                                        {scope === 'TOAN_DON' && 'TỔNG ĐƠN HÀNG'}
                                        {scope === 'PHIEN_BAN' && 'PHIÊN BẢN SẢN PHẨM'}
                                        {scope === 'DANH_MUC' && (
                                            selectedCategory
                                                ? `DANH MỤC: ${(categoriesList.find(c => String(c.id) === String(selectedCategory))?.name || selectedCategory).toUpperCase()}`
                                                : 'DANH MỤC'
                                        )}
                                        {scope === 'THUONG_HIEU' && (
                                            selectedBrand
                                                ? `THƯƠNG HIỆU: ${(brandsList.find(b => String(b.id) === String(selectedBrand))?.name || selectedBrand).toUpperCase()}`
                                                : 'THƯƠNG HIỆU'
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="summary-item">
                                <label>SỐ LƯỢNG MUA TỐI THIỂU</label>
                                <div><strong>{minQuantity || 0}</strong></div>
                            </div>
                            <div className="summary-item">
                                <label>THỜI GIAN</label>
                                <div className="summary-dates-highlight">
                                    {fromDate ? <strong>{formatDisplayDate(fromDate)}</strong> : <span className="summary-placeholder">Chưa chọn bắt đầu</span>}
                                    <span className="summary-date-arrow"> → </span>
                                    {toDate ? <strong>{formatDisplayDate(toDate)}</strong> : <span className="summary-placeholder">Chưa chọn kết thúc</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions Row (Image 3) */}
            {errors.save && <div className="create-error-banner">{errors.save}</div>}
            <div className="create-bottom-actions">
                <button
                    type="button"
                    className="btn-create-cancel"
                    onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}
                >
                    HỦY
                </button>
                <button
                    type="button"
                    className="btn-create-submit"
                    disabled={saving}
                    onClick={handleSave}
                >
                    {saving ? 'ĐANG LƯU...' : 'LƯU KHUYẾN MẠI'}
                </button>
            </div>
        </div>
    );
}
