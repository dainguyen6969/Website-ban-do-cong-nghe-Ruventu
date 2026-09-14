import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search, ArrowLeft, Check, HelpCircle } from 'lucide-react';
import './WarrantyLookupPage.css';

const WarrantyLookupPage = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [searchStatus, setSearchStatus] = useState('idle'); // 'idle', 'not-found', 'found'

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    // Simulate API search
    if (searchValue.toLowerCase() === 'error' || searchValue === '123') {
      setSearchStatus('not-found');
    } else {
      setSearchStatus('found');
    }
  };

  const handleReset = () => {
    setSearchStatus('idle');
    setSearchValue('');
  };

  const renderIdleState = () => (
    <div className="warranty-content idle">
      <div className="info-columns">
        <div className="info-col">
          <h3>Số Serial</h3>
          <p>In trên nhãn sản phẩm hoặc trong hộp. Dạng: G4090S-VN4521.</p>
        </div>
        <div className="info-col">
          <h3>Mã phiếu bảo hành</h3>
          <p>Trong email xác nhận bảo hành. Dạng: WR-2024-0012.</p>
        </div>
        <div className="info-col">
          <h3>Mã đơn hàng</h3>
          <p>Trong lịch sử đơn hàng. Dạng: RUV-98237.</p>
        </div>
      </div>
    </div>
  );

  const renderNotFoundState = () => (
    <div className="warranty-content not-found">
      <div className="not-found-box">
        <div className="search-icon-large">
          <Search size={32} color="#aaa" />
        </div>
        <h2>KHÔNG TÌM THẤY KẾT QUẢ</h2>
        <p>Không tìm thấy phiếu bảo hành với thông tin đã nhập. Vui lòng kiểm tra lại số Serial hoặc Mã phiếu bảo hành và thử lại.</p>
        <button className="btn-outline" onClick={handleReset}>
          TÌM KIẾM LẠI
        </button>
      </div>
    </div>
  );

  const renderFoundState = () => (
    <div className="warranty-content found">
      <div className="found-grid">
        
        {/* Left Column - Product Info */}
        <div className="product-info-panel">
          <div className="panel-header">
            <div className="red-line"></div>
            <h3>THÔNG TIN SẢN PHẨM</h3>
          </div>
          
          <div className="product-details">
            <h2 className="product-title">ASUS ROG STRIX RTX 4090 OC 24GB</h2>
            <p className="product-category">VGA — Card Đồ Họa</p>
            
            <div className="codes-table">
              <div className="code-col border-right">
                <span className="code-label">SỐ SERIAL</span>
                <span className="code-value">G4090S-VN4521</span>
              </div>
              <div className="code-col">
                <span className="code-label">MÃ PHIẾU BẢO HÀNH</span>
                <span className="code-value">WR-2024-0012</span>
              </div>
            </div>
          </div>

          <div className="panel-divider"></div>

          <div className="panel-header">
            <div className="red-line"></div>
            <h3>THÔNG TIN BẢO HÀNH</h3>
          </div>

          <div className="warranty-details">
            <div className="detail-row">
              <span className="detail-label">Ngày tiếp nhận</span>
              <span className="detail-value">05/08/2026</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Ngày hẹn trả</span>
              <span className="detail-value">02/09/2026</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Lý do bảo hành</span>
              <span className="detail-value reason">Lỗi quạt tản nhiệt — tiếng ồn bất thường khi chịu tải cao</span>
            </div>
          </div>

          <div className="panel-footer">
            Mọi thắc mắc vui lòng liên hệ hotline <strong>1800 6018</strong> hoặc email <strong>warranty@reventu.com</strong>.
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="timeline-panel">
          <div className="panel-header">
            <div className="red-line"></div>
            <h3>TRẠNG THÁI XỬ LÝ</h3>
          </div>

          <div className="timeline">
            
            {/* Step 1: Done */}
            <div className="timeline-item done">
              <div className="timeline-icon">
                <Check size={14} color="#fff" />
              </div>
              <div className="timeline-content">
                <h4 className="step-title">Tiếp nhận</h4>
                <span className="step-date">05/08/2026</span>
                <p className="step-desc">Phiếu bảo hành đã được tạo và xác nhận</p>
              </div>
            </div>

            {/* Step 2: Done */}
            <div className="timeline-item done">
              <div className="timeline-icon">
                <Check size={14} color="#fff" />
              </div>
              <div className="timeline-content">
                <h4 className="step-title">Đang kiểm tra</h4>
                <span className="step-date">06/08/2026</span>
                <p className="step-desc">Kỹ thuật viên kiểm tra tình trạng linh kiện</p>
              </div>
            </div>

            {/* Step 3: Done */}
            <div className="timeline-item done">
              <div className="timeline-icon">
                <Check size={14} color="#fff" />
              </div>
              <div className="timeline-content">
                <h4 className="step-title">Đã gửi trung tâm</h4>
                <span className="step-date">09/08/2026</span>
                <p className="step-desc">Sản phẩm được chuyển đến trung tâm ASUS VN</p>
              </div>
            </div>

            {/* Step 4: Active */}
            <div className="timeline-item active">
              <div className="timeline-icon"></div>
              <div className="timeline-content">
                <h4 className="step-title highlight">Đang bảo hành</h4>
                <span className="step-date">14/08/2026</span>
                <p className="step-desc">Đang xử lý tại trung tâm bảo hành chính hãng</p>
                <div className="tag-processing">ĐANG XỬ LÝ</div>
              </div>
            </div>

            {/* Step 5: Pending */}
            <div className="timeline-item pending">
              <div className="timeline-icon"></div>
              <div className="timeline-content">
                <h4 className="step-title">Đã nhận lại</h4>
              </div>
            </div>

            {/* Step 6: Pending */}
            <div className="timeline-item pending last">
              <div className="timeline-icon"></div>
              <div className="timeline-content">
                <h4 className="step-title">Hoàn tất</h4>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="warranty-lookup-page">
      <Header />
      
      {/* Top Black Banner */}
      <div className="warranty-banner">
        <div className="container">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> QUAY LẠI
          </button>

          <div className="banner-title-container">
            <div className="red-vertical-line"></div>
            <h1 className="banner-title">TRA CỨU BẢO HÀNH</h1>
          </div>
          
          <p className="banner-subtitle">
            Nhập số Serial hoặc Mã phiếu bảo hành để kiểm tra trạng thái xử lý sản phẩm của bạn.
          </p>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <input 
                type="text" 
                placeholder="Nhập số Serial hoặc Mã đơn hàng để tra cứu..." 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <button type="submit" className="search-submit-btn">TRA CỨU</button>
          </form>

          <p className="search-hint">Thử: G4090S-VN4521 • WR-2024-0012</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container warranty-main-container">
        {searchStatus === 'idle' && renderIdleState()}
        {searchStatus === 'not-found' && renderNotFoundState()}
        {searchStatus === 'found' && renderFoundState()}
      </div>

      <Footer />
      
      <div className="floating-help">
        <HelpCircle size={24} color="#fff" />
      </div>
    </div>
  );
};

export default WarrantyLookupPage;
