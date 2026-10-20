import React, { useState, useEffect } from 'react';
import { getPromotionVariants } from '../api/promotionApi.js';

export default function InlineProductSelector({ 
    label, 
    selectedIds, 
    onSelectionChange, 
    variantCache,
    setVariantCache,
    showQuantity = false, 
    quantityLabel = 'SL',
    quantities = {},
    onQuantityChange = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        const timer = setTimeout(async () => {
            try {
                const items = await getPromotionVariants(searchQuery, controller.signal);
                if (!controller.signal.aborted) setProducts(items);
            } catch (error) {
                if (!controller.signal.aborted) setError(error.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [isOpen, searchQuery]);

    const handleCheckboxChange = (product) => {
        const isSelected = selectedIds.includes(product.id);
        let newSelection;
        if (isSelected) {
            newSelection = selectedIds.filter(id => id !== product.id);
        } else {
            setVariantCache(prev => ({ ...prev, [product.id]: product }));
            newSelection = [...selectedIds, product.id];
        }
        onSelectionChange(newSelection);
    };

    const handleRemove = (productId) => {
        onSelectionChange(selectedIds.filter(id => id !== productId));
    };

    const selectedProductsList = selectedIds.map(id => variantCache[id]).filter(Boolean);

    const formatMoney = (amount) => {
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    return (
        <div className="inline-product-selector">
            <div className="ips-header">
                <h3>| {label}</h3>
            </div>
            
            <div className="ips-selected-list">
                {selectedProductsList.map(product => (
                    <div key={product.id} className="ips-selected-item">
                        <div className="ips-item-info">
                            <strong>{product.ten_san_pham} — {product.ten_phien_ban}</strong>
                            <span>{product.ma_san_pham} · {product.ma_vach} - {formatMoney(product.gia_ban_le)}</span>
                        </div>
                        <div className="ips-item-actions">
                            {showQuantity && (
                                <div className="ips-quantity">
                                    <label>{quantityLabel}</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        step="1"
                                        value={quantities[product.id] ?? 1}
                                        onChange={(e) => onQuantityChange && onQuantityChange(product.id, e.target.value)}
                                    />
                                </div>
                            )}
                            <button className="ips-remove-btn" aria-label={`Bỏ ${product.ten_san_pham} ${product.ten_phien_ban}`} onClick={() => handleRemove(product.id)}>×</button>
                        </div>
                    </div>
                ))}
            </div>

            <button className="ips-add-btn" onClick={() => setIsOpen(true)}>
                + THÊM PHIÊN BẢN
            </button>

            {isOpen && (
                <div className="ips-picker-container">
                    <div className="ips-search">
                        <input 
                            type="text" 
                            placeholder="TÌM MÃ / TÊN / PHIÊN BẢN / MÃ VẠCH..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="ips-product-list">
                        {loading ? <p>Đang tải...</p> : error ? <p role="alert" className="error-text">{error}</p> : products.length === 0 ? <p>Không tìm thấy phiên bản phù hợp.</p> : products.map(product => (
                            <label key={product.id} className="ips-product-row">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(product.id)}
                                    onChange={() => handleCheckboxChange(product)}
                                />
                                <div className="ips-product-info">
                                    <strong>{product.ten_san_pham} — {product.ten_phien_ban}</strong>
                                    <span>{product.ma_san_pham} · {product.ma_vach}</span>
                                </div>
                                <div className="ips-product-price">
                                    {formatMoney(product.gia_ban_le)}
                                </div>
                            </label>
                        ))}
                    </div>
                    <div className="ips-picker-footer">
                        <button className="ips-done-btn" onClick={() => setIsOpen(false)}>XONG</button>
                    </div>
                </div>
            )}
        </div>
    );
}
