import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPromotion } from '../api/promotionApi.js';
import { createPromotionBody } from '../promotionModel.js';
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
    const [variantCache, setVariantCache] = useState({});
    
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

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setErrors({});
        try {
            await createPromotion(createPromotionBody({
                name, code, limit, unlimited, fromDate, toDate, description, method, discountType, discountValue,
                selectedDiscountProducts, selectedGiftBuyProducts, giftBuyQuantities,
                selectedGiftReceiveProducts, giftReceiveQuantities,
            }));
            navigate('/admin/khuyen-mai/danh-sach-khuyen-mai', {
                state: { successMessage: 'Tạo khuyến mại thành công' },
            });
        } catch (error) {
            setErrors({ save: error.message });
        } finally {
            setSaving(false);
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
                                            variantCache={variantCache}
                                            setVariantCache={setVariantCache}
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
                                        variantCache={variantCache}
                                        setVariantCache={setVariantCache}
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
                                        variantCache={variantCache}
                                        setVariantCache={setVariantCache}
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
                    
                    {errors.save && <p className="error-text" role="alert">{errors.save}</p>}
                    <div className="promo-actions">
                        <button className="btn-cancel" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>HỦY</button>
                        <button className="btn-save" disabled={saving} onClick={handleSave}>{saving ? 'ĐANG LƯU...' : 'LƯU KHUYẾN MẠI'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
