import React, { useState, useMemo } from 'react';
import mockProducts from '../../../../data/mockProducts';

export default function InlineProductSelector({ 
    label, 
    selectedIds, 
    onSelectionChange, 
    showQuantity = false, 
    quantityLabel = 'SL',
    quantities = {},
    onQuantityChange = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const products = mockProducts || [];
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(p => 
            p.tenSanPham?.toLowerCase().includes(q) || 
            p.maSanPham?.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const handleCheckboxChange = (product) => {
        const isSelected = selectedIds.includes(product.id);
        let newSelection;
        if (isSelected) {
            newSelection = selectedIds.filter(id => id !== product.id);
        } else {
            newSelection = [...selectedIds, product.id];
        }
        onSelectionChange(newSelection);
    };

    const handleRemove = (productId) => {
        onSelectionChange(selectedIds.filter(id => id !== productId));
    };

    const selectedProductsList = useMemo(() => {
        return selectedIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    }, [selectedIds, products]);

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
                            <strong>{product.tenSanPham}</strong>
                            <span>{product.maSanPham} - {product.giaBan ? formatMoney(product.giaBan) : '0đ'}</span>
                        </div>
                        <div className="ips-item-actions">
                            {showQuantity && (
                                <div className="ips-quantity">
                                    <label>{quantityLabel}</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={quantities[product.id] || 1} 
                                        onChange={(e) => onQuantityChange && onQuantityChange(product.id, e.target.value)}
                                    />
                                </div>
                            )}
                            <button className="ips-remove-btn" onClick={() => handleRemove(product.id)}>×</button>
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
                        {filteredProducts.map(product => (
                            <label key={product.id} className="ips-product-row">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(product.id)}
                                    onChange={() => handleCheckboxChange(product)}
                                />
                                <div className="ips-product-info">
                                    <strong>{product.tenSanPham}</strong>
                                    <span>{product.maSanPham}</span>
                                </div>
                                <div className="ips-product-price">
                                    {product.giaBan ? formatMoney(product.giaBan) : '0đ'}
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
