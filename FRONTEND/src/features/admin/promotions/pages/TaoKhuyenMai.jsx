import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPromotion } from '../../../../data/mockPromotions';
import mockProducts from '../../../../data/mockProducts';
import InlineProductSelector from '../components/InlineProductSelector';
import '../components/InlineProductSelector.css';
import './TaoKhuyenMai.css';

export default function TaoKhuyenMai() {
    const navigate = useNavigate();
    
    // Form State
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [limit, setLimit] = useState('');
    const [unlimited, setUnlimited] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [description, setDescription] = useState('');
    
    const [method, setMethod] = useState('CHIẾT KHẤU');
    const [discountType, setDiscountType] = useState('TOTAL');
    const [discountValue, setDiscountValue] = useState('');
    
    // Selection state
    const [selectedDiscountProducts, setSelectedDiscountProducts] = useState([]);
    
    const [selectedGiftBuyProducts, setSelectedGiftBuyProducts] = useState([]);
    const [giftBuyQuantities, setGiftBuyQuantities] = useState({});
    
    const [selectedGiftReceiveProducts, setSelectedGiftReceiveProducts] = useState([]);
    const [giftReceiveQuantities, setGiftReceiveQuantities] = useState({});

    // Validation State
    const [errors, setErrors] = useState({});

    const generateCode = () => {
        setCode(`RV${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
        setErrors(prev => ({ ...prev, code: null }));
    };

    const validate = () => {
        const newErrors = {};
        if (!name.trim()) newErrors.name = 'Vui lòng nhập tên chương trình';
        if (!code.trim()) newErrors.code = 'Vui lòng nhập mã chương trình';
        if (!unlimited && (!limit || parseInt(limit) <= 0)) newErrors.limit = 'Vui lòng nhập số lượng hợp lệ';
        if (!fromDate) newErrors.fromDate = 'Vui lòng chọn ngày bắt đầu';
        if (!toDate) newErrors.toDate = 'Vui lòng chọn ngày kết thúc';
        
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
            newErrors.toDate = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
        }

        if (method === 'CHIẾT KHẤU') {
            if (!discountValue || Number(discountValue) <= 0) {
                newErrors.discountValue = 'Vui lòng nhập giá trị giảm hợp lệ';
            }
            if (discountType === 'PRODUCT' && selectedDiscountProducts.length === 0) {
                newErrors.discountProducts = 'Vui lòng chọn ít nhất 1 phiên bản áp dụng';
            }
        } else if (method === 'TẶNG SẢN PHẨM') {
            if (selectedGiftBuyProducts.length === 0) {
                newErrors.giftBuy = 'Vui lòng chọn sản phẩm khách cần mua';
            }
            if (selectedGiftReceiveProducts.length === 0) {
                newErrors.giftReceive = 'Vui lòng chọn sản phẩm tặng';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) {
            const parsedLimit = unlimited ? null : (parseInt(limit) || 0);
            
            const todayStr = new Date().toISOString().split('T')[0];
            let status = 'ĐANG ÁP DỤNG';
            if (fromDate && fromDate > todayStr) {
                status = 'CHƯA BẮT ĐẦU';
            } else if (toDate && toDate < todayStr) {
                status = 'HẾT LƯỢT';
            }

            let appliedProducts = [];
            let buyProducts = [];
            let giftProducts = [];

            if (method === 'CHIẾT KHẤU' && discountType === 'PRODUCT') {
                appliedProducts = selectedDiscountProducts.map(id => {
                    const prod = mockProducts.find(p => p.id === id || p.maSanPham === id);
                    return {
                        role: 'SẢN PHẨM MUA',
                        code: prod ? prod.maSanPham : id,
                        name: prod ? prod.tenSanPham : id,
                        version: prod && prod.soPhienBan ? `${prod.soPhienBan} phiên bản` : 'Mặc định',
                        quantity: 'SL: 1'
                    };
                });
            } else if (method === 'TẶNG SẢN PHẨM') {
                buyProducts = selectedGiftBuyProducts.map(id => {
                    const prod = mockProducts.find(p => p.id === id || p.maSanPham === id);
                    const qty = giftBuyQuantities[id] || 1;
                    return {
                        code: prod ? prod.maSanPham : id,
                        name: prod ? prod.tenSanPham : id,
                        version: prod && prod.soPhienBan ? `${prod.soPhienBan} phiên bản` : 'Mặc định',
                        reqQuantity: `SL: ${qty}`
                    };
                });

                giftProducts = selectedGiftReceiveProducts.map(id => {
                    const prod = mockProducts.find(p => p.id === id || p.maSanPham === id);
                    const qty = giftReceiveQuantities[id] || 1;
                    return {
                        code: prod ? prod.maSanPham : id,
                        name: prod ? prod.tenSanPham : id,
                        version: prod && prod.soPhienBan ? `${prod.soPhienBan} phiên bản` : 'Mặc định',
                        giftQuantity: `SL: ${qty}`
                    };
                });

                appliedProducts = [
                    ...buyProducts.map(b => ({ role: 'SẢN PHẨM MUA', code: b.code, name: b.name, version: b.version, quantity: b.reqQuantity })),
                    ...giftProducts.map(g => ({ role: 'SẢN PHẨM TẶNG', code: g.code, name: g.name, version: g.version, quantity: g.giftQuantity }))
                ];
            }

            const newPromo = {
                id: String(Date.now()),
                code: code.trim().toUpperCase(),
                name: name.trim(),
                method: method,
                target: method === 'CHIẾT KHẤU' 
                    ? (discountType === 'TOTAL' ? 'TỔNG ĐƠN HÀNG' : 'PHIÊN BẢN SẢN PHẨM') 
                    : 'PHIÊN BẢN SẢN PHẨM',
                maxUsage: parsedLimit,
                usedUsage: 0,
                remainingUsage: parsedLimit,
                startDate: fromDate,
                endDate: toDate,
                status: status,
                description: description.trim() || 'Không có mô tả',
                discountType: method === 'CHIẾT KHẤU' 
                    ? (discountType === 'TOTAL' ? 'GIẢM TIỀN TRÊN TỔNG ĐƠN' : 'GIẢM TIỀN THEO PHIÊN BẢN SẢN PHẨM') 
                    : 'MUA PHIÊN BẢN CHỈ ĐỊNH ➔ TẶNG PHIÊN BẢN CHỈ ĐỊNH',
                discountValue: Number(discountValue) || 0,
                appliedProducts: appliedProducts,
                buyProducts: buyProducts,
                giftProducts: giftProducts
            };

            addPromotion(newPromo);

            navigate('/admin/khuyen-mai/danh-sach-khuyen-mai');
        }
    };

    return (
        <div className="promo-create-page">
            <div className="promo-create-header">
                <div className="title-area">
                    <div className="breadcrumb">KHUYẾN MẠI / TẠO KHUYẾN MẠI</div>
                    <h1>TẠO CHƯƠNG TRÌNH KHUYẾN MẠI</h1>
                </div>
                <button className="btn-back" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>
                    &larr; QUAY LẠI
                </button>
            </div>

            <div className="promo-create-content">
                <div className="promo-col-left">
                    <div className="promo-box">
                        <h2>THÔNG TIN CHƯƠNG TRÌNH</h2>
                        
                        <div className="form-group">
                            <label>TÊN CHƯƠNG TRÌNH <span>*</span></label>
                            <input 
                                type="text" 
                                placeholder="VD: Giảm 100k cho đơn từ 2 triệu"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setErrors(prev => ({...prev, name: null})) }}
                                className={errors.name ? 'error-input' : ''}
                            />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label>MÃ CHƯƠNG TRÌNH <span>*</span></label>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    placeholder="VD: SALE100K"
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrors(prev => ({...prev, code: null})) }}
                                    className={errors.code ? 'error-input' : ''}
                                />
                                <button className="btn-secondary" onClick={generateCode}>TỰ SINH</button>
                            </div>
                            {errors.code && <span className="error-text">{errors.code}</span>}
                        </div>

                        <div className="form-group">
                            <label>SỐ LƯỢNG ÁP DỤNG</label>
                            <div className="input-group-limit">
                                <input 
                                    type="number" 
                                    placeholder="VD: 100"
                                    value={limit}
                                    onChange={(e) => { setLimit(e.target.value); setErrors(prev => ({...prev, limit: null})) }}
                                    disabled={unlimited}
                                    className={errors.limit ? 'error-input' : ''}
                                />
                                <label className="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={unlimited}
                                        onChange={(e) => {
                                            setUnlimited(e.target.checked);
                                            if (e.target.checked) {
                                                setLimit('');
                                                setErrors(prev => ({...prev, limit: null}));
                                            }
                                        }}
                                    />
                                    KHÔNG GIỚI HẠN
                                </label>
                            </div>
                            {errors.limit && <span className="error-text">{errors.limit}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-group half">
                                <label>TỪ NGÀY <span>*</span></label>
                                <input 
                                    type="datetime-local" 
                                    value={fromDate}
                                    onChange={(e) => { setFromDate(e.target.value); setErrors(prev => ({...prev, fromDate: null})) }}
                                    className={errors.fromDate ? 'error-input' : ''}
                                />
                                {errors.fromDate && <span className="error-text">{errors.fromDate}</span>}
                            </div>
                            <div className="form-group half">
                                <label>ĐẾN NGÀY <span>*</span></label>
                                <input 
                                    type="datetime-local" 
                                    value={toDate}
                                    onChange={(e) => { setToDate(e.target.value); setErrors(prev => ({...prev, toDate: null})) }}
                                    className={errors.toDate ? 'error-input' : ''}
                                />
                                {errors.toDate && <span className="error-text">{errors.toDate}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>MÔ TẢ</label>
                            <textarea 
                                placeholder="Mô tả ngắn về chương trình..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="promo-col-right">
                    <div className="promo-box">
                        <h2>PHƯƠNG THỨC KHUYẾN MẠI</h2>
                        
                        <div className="method-tabs">
                            <button 
                                className={method === 'CHIẾT KHẤU' ? 'active' : ''} 
                                onClick={() => setMethod('CHIẾT KHẤU')}
                            >CHIẾT KHẤU</button>
                            <button 
                                className={method === 'TẶNG SẢN PHẨM' ? 'active' : ''} 
                                onClick={() => setMethod('TẶNG SẢN PHẨM')}
                            >TẶNG SẢN PHẨM</button>
                        </div>

                        {method === 'CHIẾT KHẤU' && (
                            <>
                                <div className="form-group">
                                    <label>LOẠI CHIẾT KHẤU</label>
                                    <div className="radio-group">
                                        <label className={`radio-card ${discountType === 'TOTAL' ? 'active' : ''}`}>
                                            <input 
                                                type="radio" 
                                                checked={discountType === 'TOTAL'}
                                                onChange={() => setDiscountType('TOTAL')}
                                            />
                                            <div className="radio-info">
                                                <strong>GIẢM TIỀN TRÊN TỔNG ĐƠN</strong>
                                                <span>Giảm cố định trên tổng giá trị đơn hàng</span>
                                            </div>
                                        </label>
                                        <label className={`radio-card ${discountType === 'PRODUCT' ? 'active' : ''}`}>
                                            <input 
                                                type="radio" 
                                                checked={discountType === 'PRODUCT'}
                                                onChange={() => setDiscountType('PRODUCT')}
                                            />
                                            <div className="radio-info">
                                                <strong>GIẢM TIỀN THEO PHIÊN BẢN SẢN PHẨM</strong>
                                                <span>Giảm cố định trên mỗi phiên bản được chọn</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>GIÁ TRỊ GIẢM <span>*</span></label>
                                    <div className="input-with-unit">
                                        <input 
                                            type="number" 
                                            value={discountValue}
                                            onChange={(e) => { setDiscountValue(e.target.value); setErrors(prev => ({...prev, discountValue: null})) }}
                                            className={errors.discountValue ? 'error-input' : ''}
                                        />
                                        <span className="unit">đ</span>
                                    </div>
                                    {errors.discountValue && <span className="error-text">{errors.discountValue}</span>}
                                </div>
                                
                                {discountType === 'PRODUCT' && (
                                    <div className="form-group">
                                        <InlineProductSelector 
                                            label="PHIÊN BẢN ÁP DỤNG *"
                                            selectedIds={selectedDiscountProducts}
                                            onSelectionChange={(ids) => {
                                                setSelectedDiscountProducts(ids);
                                                setErrors(prev => ({...prev, discountProducts: null}));
                                            }}
                                        />
                                        {errors.discountProducts && <span className="error-text">{errors.discountProducts}</span>}
                                    </div>
                                )}
                            </>
                        )}

                        {method === 'TẶNG SẢN PHẨM' && (
                            <>
                                <div className="form-group">
                                    <InlineProductSelector 
                                        label="SẢN PHẨM KHÁCH CẦN MUA *"
                                        selectedIds={selectedGiftBuyProducts}
                                        onSelectionChange={(ids) => {
                                            setSelectedGiftBuyProducts(ids);
                                            setErrors(prev => ({...prev, giftBuy: null}));
                                        }}
                                        showQuantity={true}
                                        quantityLabel="SL CẦN MUA"
                                        quantities={giftBuyQuantities}
                                        onQuantityChange={(id, qty) => setGiftBuyQuantities(prev => ({...prev, [id]: qty}))}
                                    />
                                    {errors.giftBuy && <span className="error-text">{errors.giftBuy}</span>}
                                </div>

                                <div className="form-group">
                                    <InlineProductSelector 
                                        label="SẢN PHẨM TẶNG *"
                                        selectedIds={selectedGiftReceiveProducts}
                                        onSelectionChange={(ids) => {
                                            setSelectedGiftReceiveProducts(ids);
                                            setErrors(prev => ({...prev, giftReceive: null}));
                                        }}
                                        showQuantity={true}
                                        quantityLabel="SL TẶNG"
                                        quantities={giftReceiveQuantities}
                                        onQuantityChange={(id, qty) => setGiftReceiveQuantities(prev => ({...prev, [id]: qty}))}
                                    />
                                    {errors.giftReceive && <span className="error-text">{errors.giftReceive}</span>}
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="promo-actions">
                        <button className="btn-cancel" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>HỦY</button>
                        <button className="btn-save" onClick={handleSave}>LƯU KHUYẾN MẠI</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
