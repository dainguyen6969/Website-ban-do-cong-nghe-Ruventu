import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { savePromotion, getPromotionById } from '../utils/promoStore';
import './TaoKhuyenMai.css';

const MOCK_PRODUCTS = [
  { id: 'RAM16', name: 'RAM máy tính / 16GB', code: 'RAM-001 • RAM16-001', price: '1.000.000đ' },
  { id: 'RAM32', name: 'RAM máy tính / 32GB', code: 'RAM-001 • RAM32-001', price: '1.800.000đ' },
  { id: 'RTX4080', name: 'Card đồ họa RTX4080 / 16GB OC', code: 'VGA-001 • VGA4080-01', price: '22.000.000đ' },
  { id: 'MICE-BLK', name: 'Chuột máy tính / Màu đen', code: 'MS-001 • MS-BLK-01', price: '450.000đ' },
  { id: 'MICE-WHT', name: 'Chuột máy tính / Màu trắng', code: 'MS-001 • MS-WHT-01', price: '450.000đ' },
];

export default function TaoKhuyenMai() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [limit, setLimit] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [description, setDescription] = useState('');
  
  const [method, setMethod] = useState('CHIẾT KHẤU'); 
  const [discountType, setDiscountType] = useState('GIẢM TIỀN TRÊN TỔNG ĐƠN'); 
  const [discountValue, setDiscountValue] = useState('100000');
  
  const [showError, setShowError] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(null); // 'discount', 'buy', 'gift'
  const [selectedDiscountProducts, setSelectedDiscountProducts] = useState([]);
  const [selectedBuyProducts, setSelectedBuyProducts] = useState([]);
  const [selectedGiftProducts, setSelectedGiftProducts] = useState([]);

  const getSelectedState = (type) => {
    if (type === 'discount') return [selectedDiscountProducts, setSelectedDiscountProducts];
    if (type === 'buy') return [selectedBuyProducts, setSelectedBuyProducts];
    if (type === 'gift') return [selectedGiftProducts, setSelectedGiftProducts];
    return [[], () => {}];
  };

  const handleToggleProduct = (type, product) => {
    const [selectedList, setSelectedList] = getSelectedState(type);
    const existingIndex = selectedList.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      setSelectedList(selectedList.filter(p => p.id !== product.id));
    } else {
      setSelectedList([...selectedList, { ...product, quantity: 1 }]);
    }
  };

  const handleChangeQty = (type, id, value) => {
    const [selectedList, setSelectedList] = getSelectedState(type);
    const qty = value === '' ? '' : Number(value);
    setSelectedList(selectedList.map(p => p.id === id ? { ...p, quantity: qty } : p));
  };

  const handleRemoveProduct = (type, id) => {
    const [selectedList, setSelectedList] = getSelectedState(type);
    setSelectedList(selectedList.filter(p => p.id !== id));
  };

  const renderSelectedList = (type, label) => {
    const [selectedList] = getSelectedState(type);
    if (selectedList.length === 0) return null;
    
    return (
      <div className="promo-selected-list">
        {selectedList.map(p => {
          const displayQty = (p.quantity === undefined || Number.isNaN(p.quantity)) ? 1 : p.quantity;
          return (
            <div key={p.id} className="promo-selected-item">
              <div className="promo-selected-info">
                <strong>{p.name}</strong>
                <span>{p.code} • {p.price}</span>
              </div>
              <div className="promo-selected-actions">
                <span className="promo-qty-label">{label}</span>
                <input 
                  type="number" 
                  value={displayQty} 
                  min={1} 
                  onChange={(e) => handleChangeQty(type, p.id, e.target.value)} 
                  className="promo-qty-input" 
                />
                <button className="promo-remove-btn" onClick={() => handleRemoveProduct(type, p.id)}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProductPicker = (type) => {
    if (showProductPicker !== type) {
      return <button className="promo-btn-add-version" onClick={() => setShowProductPicker(type)}>+ THÊM PHIÊN BẢN</button>;
    }
    const [selectedList] = getSelectedState(type);
    
    return (
      <div className="promo-product-picker">
        <input type="text" placeholder="TÌM MÃ / TÊN / PHIÊN BẢN / MÃ VẠCH..." className="promo-product-search" />
        <div className="promo-product-list">
          {MOCK_PRODUCTS.map(p => (
            <label key={p.id} className="promo-product-item">
              <input 
                type="checkbox" 
                className="promo-product-item-checkbox" 
                checked={selectedList.some(s => s.id === p.id)}
                onChange={() => handleToggleProduct(type, p)}
              />
              <div className="promo-product-item-info">
                <strong>{p.name}</strong>
                <span>{p.code}</span>
              </div>
              <div className="promo-product-item-price">{p.price}</div>
            </label>
          ))}
        </div>
        <div className="promo-product-picker-footer">
          <button className="promo-btn-done" onClick={() => setShowProductPicker(null)}>XONG</button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (id) {
      const promo = getPromotionById(id);
      if (promo) {
        setName(promo.name || '');
        setCode(promo.id || '');
        setLimit(promo.usageMax || '');
        setUnlimited(promo.usageMax === 9999 || promo.remaining === 'KHÔNG GIỚI HẠN');
        setFromDate(promo.startDate || '');
        setToDate(promo.endDate || '');
        setDescription(promo.description || '');
        setMethod(promo.method || 'CHIẾT KHẤU');
        setDiscountType(promo.configType || 'GIẢM TIỀN TRÊN TỔNG ĐƠN');
        setDiscountValue(promo.discountValue?.replace(/[^0-9]/g, '') || '0');
      }
    }
  }, [id]);

  const handleAutoCode = () => {
    setCode(`SALE${Math.floor(Math.random() * 10000)}`);
  };

  const handleSave = () => {
    if (!code) {
      setShowError(true);
      return;
    }
    // Perform save logic here
    const promoData = {
      id: code,
      name,
      method,
      target: discountType === 'GIẢM TIỀN TRÊN TỔNG ĐƠN' ? 'TỔNG ĐƠN HÀNG' : 'PHIÊN BẢN SẢN PHẨM',
      status: 'ĐANG ÁP DỤNG',
      description,
      configType: discountType,
      discountValue: `${discountValue}đ`,
      usageMax: unlimited ? 9999 : Number(limit),
      usageUsed: 0,
      usageRemaining: unlimited ? 'KHÔNG GIỚI HẠN' : Number(limit),
      startDate: fromDate,
      endDate: toDate,
      timeRemaining: 'MỚI TẠO',
      remaining: unlimited ? 'KHÔNG GIỚI HẠN' : `${limit} LƯỢT`,
      start: fromDate.split('T')[0],
      end: toDate.split('T')[0]
    };
    savePromotion(promoData);
    navigate('/admin/khuyen-mai/danh-sach-khuyen-mai');
  };

  return (
    <main className="create-promo-page">
      <div className="create-promo-header">
        <div className="create-promo-header-left">
          <div className="promo-breadcrumb">KHUYẾN MẠI / {id ? 'SỬA KHUYẾN MẠI' : 'TẠO KHUYẾN MẠI'}</div>
          <h1>{id ? 'SỬA CHƯƠNG TRÌNH KHUYẾN MẠI' : 'TẠO CHƯƠNG TRÌNH KHUYẾN MẠI'}</h1>
        </div>
        <div className="create-promo-header-right">
          <button className="promo-back-btn" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>
            <HiOutlineArrowLeft size={14} /> QUAY LẠI
          </button>
        </div>
      </div>

      <div className="create-promo-scroll-area">
        <div className="create-promo-content">
        <div className="create-promo-left">
          <div className="create-promo-section">
            <h2 className="promo-section-title">THÔNG TIN CHƯƠNG TRÌNH</h2>
            
            {showError && !code && (
              <div className="promo-error-box">
                VUI LÒNG NHẬP MÃ CHƯƠNG TRÌNH
              </div>
            )}
            
            <div className="promo-form-group">
              <label>TÊN CHƯƠNG TRÌNH *</label>
              <input type="text" placeholder="VD: Giảm 100k cho đơn từ 2 triệu" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="promo-form-group">
              <label>MÃ CHƯƠNG TRÌNH *</label>
              <div className="promo-input-with-btn">
                <input type="text" placeholder="VD: SALE100K" value={code} onChange={e => setCode(e.target.value)} />
                <button type="button" onClick={handleAutoCode}>TỰ SINH</button>
              </div>
            </div>

            <div className="promo-form-group">
              <label>SỐ LƯỢNG ÁP DỤNG</label>
              <div className="promo-limit-row">
                <input type="number" placeholder="VD: 100" value={limit} onChange={e => setLimit(e.target.value)} disabled={unlimited} />
                <label className="promo-checkbox">
                  <input type="checkbox" checked={unlimited} onChange={e => setUnlimited(e.target.checked)} />
                  KHÔNG GIỚI HẠN
                </label>
              </div>
            </div>

            <div className="promo-form-row">
              <div className="promo-form-group">
                <label>TỪ NGÀY *</label>
                <input type="datetime-local" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div className="promo-form-group">
                <label>ĐẾN NGÀY *</label>
                <input type="datetime-local" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>

            <div className="promo-form-group">
              <label>MÔ TẢ</label>
              <textarea placeholder="Mô tả ngắn về chương trình..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
            </div>
          </div>
        </div>

        <div className="create-promo-right">
          <div className="create-promo-section">
            <h2 className="promo-section-title">PHƯƠNG THỨC KHUYẾN MẠI</h2>
            
            <div className="promo-method-toggle">
              <button 
                className={method === 'CHIẾT KHẤU' ? 'active' : ''} 
                onClick={() => setMethod('CHIẾT KHẤU')}
              >
                CHIẾT KHẤU
              </button>
              <button 
                className={method === 'TẶNG SẢN PHẨM' ? 'active' : ''} 
                onClick={() => setMethod('TẶNG SẢN PHẨM')}
              >
                TẶNG SẢN PHẨM
              </button>
            </div>

            {method === 'CHIẾT KHẤU' && (
              <>
                <h2 className="promo-section-title mt-4">LOẠI CHIẾT KHẤU</h2>
                <div className="promo-discount-types">
                  <label className={`promo-discount-card ${discountType === 'GIẢM TIỀN TRÊN TỔNG ĐƠN' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="discountType" 
                      checked={discountType === 'GIẢM TIỀN TRÊN TỔNG ĐƠN'} 
                      onChange={() => setDiscountType('GIẢM TIỀN TRÊN TỔNG ĐƠN')}
                    />
                    <div className="promo-discount-card-content">
                      <strong>GIẢM TIỀN TRÊN TỔNG ĐƠN</strong>
                      <p>Giảm cố định trên tổng giá trị đơn hàng</p>
                    </div>
                  </label>
                  
                  <label className={`promo-discount-card ${discountType === 'GIẢM TIỀN SẢN PHẨM' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="discountType" 
                      checked={discountType === 'GIẢM TIỀN SẢN PHẨM'} 
                      onChange={() => setDiscountType('GIẢM TIỀN SẢN PHẨM')}
                    />
                    <div className="promo-discount-card-content">
                      <strong>GIẢM TIỀN THEO PHIÊN BẢN SẢN PHẨM</strong>
                      <p>Giảm cố định trên mỗi phiên bản được chọn</p>
                    </div>
                  </label>
                </div>

                <div className="promo-form-group mt-4">
                  <label>GIÁ TRỊ GIẢM MỖI SẢN PHẨM *</label>
                  <div className="promo-input-with-unit">
                    <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                    <span>đ</span>
                  </div>
                </div>

                {discountType === 'GIẢM TIỀN SẢN PHẨM' && (
                  <div className="promo-form-group mt-4">
                    <label>PHIÊN BẢN ÁP DỤNG *</label>
                    {renderSelectedList('discount', 'SL ÁP DỤNG')}
                    {renderProductPicker('discount')}
                  </div>
                )}
              </>
            )}

            {method === 'TẶNG SẢN PHẨM' && (
              <div className="promo-gift-section mt-4">
                <div className="promo-gift-box">
                  <div className="promo-gift-label"><span></span> SẢN PHẨM KHÁCH CẦN MUA</div>
                  {renderSelectedList('buy', 'SL CẦN MUA')}
                  {renderProductPicker('buy')}
                </div>
                
                <div className="promo-gift-arrow">↓</div>
                
                <div className="promo-gift-box promo-gift-box--green">
                  <div className="promo-gift-label promo-gift-label--green"><span></span> SẢN PHẨM TẶNG</div>
                  {renderSelectedList('gift', 'SL TẶNG')}
                  {renderProductPicker('gift')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="create-promo-footer">
        <button className="promo-btn-cancel" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>HỦY</button>
        <button className="promo-btn-save" onClick={handleSave}>LƯU KHUYẾN MẠI</button>
      </div>
    </main>
  );
}
