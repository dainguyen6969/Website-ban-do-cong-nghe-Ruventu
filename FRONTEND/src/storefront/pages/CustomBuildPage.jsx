import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ComponentSelectionModal from '../components/ComponentSelectionModal';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../../shared/services/cartService';
import './CustomBuildPage.css';

const buildSlots = [
  // LInh kiện máy tính
  { id: 1, section: 'LINH KIỆN MÁY TÍNH', sectionDesc: 'Cấu hình lõi, lưu trữ và hệ thống tản nhiệt', key: 'cpu', title: 'CPU', subtitle: 'BỘ VI XỬ LÝ', filterCategory: 'CPU' },
  { id: 2, section: 'LINH KIỆN MÁY TÍNH', key: 'mainboard', title: 'MAIN', subtitle: 'BO MẠCH CHỦ', filterCategory: 'Mainboard' },
  { id: 3, section: 'LINH KIỆN MÁY TÍNH', key: 'ram', title: 'RAM', subtitle: 'BỘ NHỚ TRONG', filterCategory: 'RAM' },
  { id: 4, section: 'LINH KIỆN MÁY TÍNH', key: 'ssd1', title: 'Ổ CỨNG SSD 1', subtitle: 'LƯU TRỮ TỐC ĐỘ CAO', filterCategory: 'SSD' },
  { id: 5, section: 'LINH KIỆN MÁY TÍNH', key: 'ssd2', title: 'Ổ CỨNG SSD 2', subtitle: 'LƯU TRỮ MỞ RỘNG', filterCategory: 'SSD' },
  { id: 6, section: 'LINH KIỆN MÁY TÍNH', key: 'hdd', title: 'Ổ CỨNG HDD', subtitle: 'LƯU TRỮ DUNG LƯỢNG LỚN', filterCategory: 'HDD' },
  { id: 7, section: 'LINH KIỆN MÁY TÍNH', key: 'vga', title: 'VGA', subtitle: 'CARD MÀN HÌNH', filterCategory: 'VGA' },
  { id: 8, section: 'LINH KIỆN MÁY TÍNH', key: 'psu', title: 'PSU', subtitle: 'NGUỒN MÁY TÍNH', filterCategory: 'Nguồn' },
  { id: 9, section: 'LINH KIỆN MÁY TÍNH', key: 'case', title: 'CASE', subtitle: 'VỎ MÁY TÍNH', filterCategory: 'Case' },
  { id: 10, section: 'LINH KIỆN MÁY TÍNH', key: 'cooler_air', title: 'TẢN NHIỆT KHÍ', subtitle: 'TẢN NHIỆT CPU', filterCategory: 'Tản nhiệt' },
  { id: 11, section: 'LINH KIỆN MÁY TÍNH', key: 'cooler_aio', title: 'TẢN NHIỆT NƯỚC AIO', subtitle: 'HỆ THỐNG TẢN NHIỆT LIỀN KHỐI', filterCategory: 'Tản nhiệt' },
  { id: 12, section: 'LINH KIỆN MÁY TÍNH', key: 'fan', title: 'FAN TẢN NHIỆT', subtitle: 'QUẠT THÙNG MÁY', filterCategory: 'Tản nhiệt' },
  
  // Màn hình & Gaming Gear
  { id: 13, section: 'MÀN HÌNH & GAMING GEAR', sectionDesc: 'Thiết bị hiển thị và điều khiển', key: 'monitor1', title: 'MONITOR', subtitle: 'MÀN HÌNH 1', filterCategory: 'Màn hình' },
  { id: 14, section: 'MÀN HÌNH & GAMING GEAR', key: 'monitor2', title: 'MONITOR', subtitle: 'MÀN HÌNH 2', filterCategory: 'Màn hình' },
  { id: 15, section: 'MÀN HÌNH & GAMING GEAR', key: 'keyboard', title: 'BÀN PHÍM', subtitle: 'BÀN PHÍM CƠ / GAMING', filterCategory: 'Bàn phím' },
  { id: 16, section: 'MÀN HÌNH & GAMING GEAR', key: 'mouse', title: 'MOUSE', subtitle: 'CHUỘT', filterCategory: 'Chuột' },
  { id: 17, section: 'MÀN HÌNH & GAMING GEAR', key: 'pad', title: 'PAD', subtitle: 'BÀN DI CHUỘT', filterCategory: 'Bàn di chuột' },
  { id: 18, section: 'MÀN HÌNH & GAMING GEAR', key: 'headset', title: 'TAI NGHE', subtitle: 'ÂM THANH CÁ NHÂN', filterCategory: 'Tai nghe' },
  { id: 19, section: 'MÀN HÌNH & GAMING GEAR', key: 'speaker', title: 'LOA', subtitle: 'HỆ THỐNG ÂM THANH', filterCategory: 'Loa' },

  // Setup / Stream / Phụ kiện
  { id: 20, section: 'SETUP / STREAM / PHỤ KIỆN', sectionDesc: 'Hoàn thiện góc máy và hệ thống phát sóng', key: 'chair', title: 'GHẾ GAMING', subtitle: 'GHẾ CÔNG THÁI HỌC', filterCategory: 'Ghế Gaming' },
  { id: 21, section: 'SETUP / STREAM / PHỤ KIỆN', key: 'desk', title: 'BÀN GAMING', subtitle: 'BÀN SETUP', filterCategory: 'Bàn Gaming' },
  { id: 22, section: 'SETUP / STREAM / PHỤ KIỆN', key: 'webcam', title: 'WEBCAM', subtitle: 'CAMERA TRỰC TUYẾN', filterCategory: 'Webcam' },
  { id: 23, section: 'SETUP / STREAM / PHỤ KIỆN', key: 'mic', title: 'MICROPHONES', subtitle: 'THU ÂM', filterCategory: 'Microphone' },
  { id: 24, section: 'SETUP / STREAM / PHỤ KIỆN', key: 'studio', title: 'THIẾT BỊ STUDIO & STREAM', subtitle: 'BỘ ĐIỀU KHIỂN NỘI DUNG', filterCategory: 'Phụ kiện Stream' },
  { id: 25, section: 'SETUP / STREAM / PHỤ KIỆN', key: 'network', title: 'THIẾT BỊ MẠNG', subtitle: 'KẾT NỐI', filterCategory: 'Thiết bị mạng' },
  { id: 26, section: 'SETUP / STREAM / PHỤ KIỆN', key: 'arm', title: 'GIÁ TREO MÀN HÌNH', subtitle: 'PHỤ KIỆN SETUP', filterCategory: 'Phụ kiện Setup' },
];

const CustomBuildPage = () => {
  const [selections, setSelections] = useState({});
  const [activeSlot, setActiveSlot] = useState(null);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSelectProduct = (product, quantity) => {
    if (activeSlot) {
      setSelections(prev => ({
        ...prev,
        [activeSlot.key]: { ...product, quantity }
      }));
    }
    setActiveSlot(null); // Close modal
  };

  const handleRemoveProduct = (key) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      delete newSelections[key];
      return newSelections;
    });
  };

  const handleUpdateQuantity = (key, delta) => {
    setSelections(prev => {
      const current = prev[key];
      if (!current) return prev;
      const newQty = Math.max(1, current.quantity + delta);
      return {
        ...prev,
        [key]: { ...current, quantity: newQty }
      };
    });
  };

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      const items = Object.values(selections);
      for (const item of items) {
        if (item.phienBanId) {
          try {
            await cartService.addItem(item.phienBanId, item.quantity);
          } catch (e) {
            console.error('Failed to add item', item.phienBanId, e);
          }
        }
      }
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      setIsAddedSuccess(true);
      
      const toastEl = document.createElement('div');
      toastEl.className = 'build-toast';
      toastEl.innerHTML = `
        <div class="toast-icon">✓</div>
        <div class="toast-content">
          <div class="toast-title">ĐÃ THÊM CẤU HÌNH VÀO GIỎ HÀNG</div>
          <div class="toast-desc">${items.length} SẢN PHẨM ĐÃ ĐƯỢC THÊM</div>
        </div>
        <div class="toast-close">?</div>
      `;
      document.body.appendChild(toastEl);
      setTimeout(() => {
        toastEl.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(toastEl)) {
            document.body.removeChild(toastEl);
          }
        }, 500);
      }, 3000);
      
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi thêm vào giỏ hàng.');
    } finally {
      setIsAdding(false);
    }
  };

  const selectedCount = Object.keys(selections).length;
  
  const totalPrice = Object.values(selections).reduce((sum, item) => {
    return sum + (item.currentPrice || item.price || 0) * (item.quantity || 1);
  }, 0);

  const renderSection = (sectionName) => {
    const slotsInSection = buildSlots.filter(s => s.section === sectionName);
    if (slotsInSection.length === 0) return null;
    
    const sectionDesc = slotsInSection[0].sectionDesc;
    const selectedInSection = slotsInSection.filter(s => selections[s.key]).length;

    return (
      <div className="build-section" key={sectionName}>
        <div className="build-section-header">
          <div className="build-section-title-wrapper">
            <h2 className="build-section-title">{sectionName}</h2>
            {sectionDesc && <p className="build-section-desc">{sectionDesc}</p>}
          </div>
          <div className="build-section-progress">
            {selectedInSection}/{slotsInSection.length}
          </div>
        </div>
        <div className="build-slot-list">
          {slotsInSection.map(slot => {
            const selectedItem = selections[slot.key];
            return (
              <div className="build-slot-item" key={slot.id}>
                <div className="slot-id">{slot.id.toString().padStart(2, '0')}</div>
                <div className="slot-info">
                  <div className="slot-title">{slot.title}</div>
                  <div className="slot-subtitle">{slot.subtitle}</div>
                </div>
                
                <div className="slot-content">
                  {selectedItem ? (
                    <div className="selected-product-detailed">
                      <img src={selectedItem.image || selectedItem.anhChinh} alt={selectedItem.title} className="selected-img-large" />
                      <div className="selected-details-large">
                        <div className="selected-name-large">{selectedItem.title || selectedItem.tenSanPham}</div>
                        <div className="selected-specs-large">
                          {selectedItem.specs && Object.values(selectedItem.specs).join(' / ')}
                        </div>
                        <div className="selected-meta-large">
                          <span>MÃ SP: {selectedItem.code || selectedItem.id}</span>
                          <span>BẢO HÀNH: 36 THÁNG</span>
                          <span>KHO: CÒN {selectedItem.stock || 2}</span>
                        </div>
                        <div className="selected-price-row">
                          <span className="price-label">ĐƠN GIÁ:</span>
                          <span className="price-value">{(selectedItem.currentPrice || selectedItem.price).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="selected-qty-row">
                          <span className="qty-label">SỐ LƯỢNG</span>
                          <div className="qty-controls">
                            <button onClick={() => handleUpdateQuantity(slot.key, -1)}>-</button>
                            <input type="text" value={selectedItem.quantity} readOnly />
                            <button onClick={() => handleUpdateQuantity(slot.key, 1)}>+</button>
                          </div>
                        </div>
                        <div className="selected-total-row">
                          <span className="price-label">THÀNH TIỀN:</span>
                          <span className="price-value">{((selectedItem.currentPrice || selectedItem.price) * selectedItem.quantity).toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-slot-text">CHƯA CHỌN SẢN PHẨM</div>
                  )}
                </div>
                
                <div className="slot-action">
                  {selectedItem ? (
                    <div className="action-buttons-stacked">
                      <button className="btn-change-slot" onClick={() => setActiveSlot(slot)}>THAY ĐỔI</button>
                      <button className="btn-remove-slot-text" onClick={() => handleRemoveProduct(slot.key)}>XÓA</button>
                    </div>
                  ) : (
                    <button className="btn-choose-product" onClick={() => setActiveSlot(slot)}>CHỌN SẢN PHẨM</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="custom-build-page">
      <Header />
      
      <div className="build-header-banner">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">TRANG CHỦ</Link>
            <span className="separator">/</span>
            <span className="current">BUILD PC TỰ CHỌN</span>
          </div>
          <h1 className="build-page-title">BUILD PC TỰ CHỌN</h1>
          <p className="build-page-subtitle">TỰ CHỌN LINH KIỆN VÀ PHỤ KIỆN<br/>CHO CẤU HÌNH MÁY TÍNH CỦA BẠN</p>
          <div className="build-banner-right-text">
            CHỌN TỪNG LINH KIỆN, KIỂM TRA TƯƠNG THÍCH CPU / MAINBOARD, SAU ĐÓ THÊM TOÀN<br/>BỘ CẤU HÌNH VÀO GIỎ HÀNG.
          </div>
        </div>
      </div>

      <div className="build-main-content">
        <div className="container build-layout">
          <div className="build-left-column">
            
            <div className="build-progress-box">
              <div className="progress-header">
                <strong>TIẾN ĐỘ CẤU HÌNH</strong>
                <span>{selectedCount} / 26 HẠNG MỤC ĐÃ CHỌN</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${(selectedCount / 26) * 100}%` }}></div>
              </div>
              <div className="progress-footer">
                KHÔNG BẮT BUỘC CHỌN ĐỦ 26 HẠNG MỤC
              </div>
            </div>

            {renderSection('LINH KIỆN MÁY TÍNH')}
            {renderSection('MÀN HÌNH & GAMING GEAR')}
            {renderSection('SETUP / STREAM / PHỤ KIỆN')}
            
          </div>

          <div className="build-right-column">
            <div className="build-summary-box">
              <div className="summary-header">
                <h3>CẤU HÌNH CỦA BẠN</h3>
                <p>ĐÃ CHỌN {selectedCount}/26 HẠNG MỤC</p>
                <p>TỔNG SỐ LƯỢNG: {Object.values(selections).reduce((a, b) => a + b.quantity, 0)} SẢN PHẨM</p>
              </div>
              
              <div className="summary-body">
                {selectedCount === 0 ? (
                  <div className="empty-summary">CHƯA CÓ LINH KIỆN ĐƯỢC CHỌN</div>
                ) : (
                  <div className="selected-items-list">
                    {Object.keys(selections).map((key) => {
                      const item = selections[key];
                      const slotInfo = buildSlots.find(s => s.key === key);
                      const unitPrice = item.currentPrice || item.price;
                      return (
                        <div key={key} className="summary-item-detailed">
                          <div className="summary-item-name">{slotInfo ? slotInfo.title : key}</div>
                          <div className="summary-item-price-calc">
                            <div className="calc-line">{item.quantity} x {unitPrice.toLocaleString('vi-VN')}đ</div>
                            <div className="total-line">{(unitPrice * item.quantity).toLocaleString('vi-VN')}đ</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="compatibility-check">
                <div className="compat-title">KIỂM TRA TƯƠNG THÍCH</div>
                <div className="compat-row">
                  <span>CPU ➔ MAINBOARD</span>
                  <span className={selections.cpu && selections.mainboard ? "status-ok" : "status-none"}>
                    {selections.cpu && selections.mainboard ? "TƯƠNG THÍCH" : "CHƯA CHỌN ĐỦ"}
                  </span>
                </div>
              </div>

              <div className="build-summary-footer">
                <div className="total-label">TỔNG TẠM TÍNH</div>
                <div className="total-price">{totalPrice.toLocaleString('vi-VN')}đ</div>
                <div className="total-note">CHƯA BAO GỒM VẬN CHUYỂN, KHUYẾN MÃI</div>
                
                <button className="btn-add-all-cart" disabled={selectedCount === 0 || isAdding} onClick={handleAddToCart}>
                  {isAdding ? 'ĐANG THÊM...' : 'THÊM CẤU HÌNH VÀO GIỎ HÀNG'}
                </button>
                <button className="btn-export-excel" disabled={selectedCount === 0}>
                  TẢI FILE EXCEL
                </button>
                <button className="btn-clear-build" disabled={selectedCount === 0} onClick={() => { setSelections({}); setIsAddedSuccess(false); }}>
                  XÓA CẤU HÌNH
                </button>

                {isAddedSuccess && (
                  <div className="added-success-box">
                    <div className="success-count-text">{Object.values(selections).reduce((a, b) => a + b.quantity, 0)} SẢN PHẨM ĐÃ ĐƯỢC THÊM</div>
                    <div className="success-actions-row">
                      <button className="btn-success-view-cart" onClick={() => navigate('/cart')}>XEM GIỎ HÀNG</button>
                      <button className="btn-success-continue" onClick={() => setIsAddedSuccess(false)}>TIẾP TỤC CHỌN LINH KIỆN</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeSlot && (
        <ComponentSelectionModal 
          slot={activeSlot} 
          onClose={() => setActiveSlot(null)} 
          onSelect={handleSelectProduct} 
        />
      )}

      <Footer />
    </div>
  );
};

export default CustomBuildPage;
