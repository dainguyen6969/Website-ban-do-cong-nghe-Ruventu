import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search, ArrowLeft, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import './OrderLookupPage.css';

const MOCK_ORDERS = [
  { id: 'RUV-98237', status: 'ĐANG GIAO HÀNG', statusClass: 'tag-orange', name: 'RTX 4090 ROG STRIX OC, DDR5 64GB, SAMSUNG 990 PRO 2TB', date: '28/08/2026', price: '38.460.000đ', isCompleted: false },
  { id: 'RV-20240901-003', status: 'CHỜ XÁC NHẬN', statusClass: 'tag-orange', name: 'Màn hình ASUS TUF Gaming 27 inch 165Hz', date: '01/09/2026', price: '6.590.000đ', isCompleted: false },
  { id: 'RV-20240905-004', status: 'ĐANG XỬ LÝ', statusClass: 'tag-orange', name: 'Bàn phím cơ AKKO 3098N, Chuột Logitech G102', date: '05/09/2026', price: '2.150.000đ', isCompleted: false },
  { id: 'RV-20240801-001', status: 'ĐÃ GIAO', statusClass: 'tag-green', name: 'RTX 4080 SUPER, 32GB DDR5', date: '01/08/2024', price: '34.990.000đ', isCompleted: true },
  { id: 'RV-20240715-002', status: 'ĐÃ GIAO', statusClass: 'tag-green', name: 'RYZEN 9 7900X, B650 MAINBOARD', date: '15/07/2024', price: '18.450.000đ', isCompleted: true },
  { id: 'RV-20240610-005', status: 'ĐÃ GIAO', statusClass: 'tag-green', name: 'Nguồn Corsair RM850e 850W 80 Plus Gold', date: '10/06/2024', price: '3.190.000đ', isCompleted: true },
  { id: 'RV-20240520-006', status: 'ĐÃ HỦY', statusClass: 'tag-gray', name: 'Tản nhiệt nước AIO Deepcool LT720', date: '20/05/2024', price: '3.290.000đ', isCompleted: true },
  { id: 'RV-20240411-007', status: 'ĐÃ GIAO', statusClass: 'tag-green', name: 'Vỏ Case NZXT H510 Flow Black', date: '11/04/2024', price: '1.990.000đ', isCompleted: true },
];

const OrderLookupPage = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [searchStatus, setSearchStatus] = useState('idle'); // 'idle', 'not-found', 'found'
  
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    setCurrentPage(1);

    const val = searchValue.trim().toUpperCase();
    
    // Simulate error
    if (val === 'ERROR') {
      setSearchStatus('not-found');
      return;
    }

    let results = [];
    
    // Check if it's an Order ID (contains letters like RUV or RV)
    if (/[A-Z]/i.test(val)) {
      results = MOCK_ORDERS.filter(o => o.id === val);
    } else {
      // It's considered a phone number. Return all mock orders, sorted by incomplete first
      results = [...MOCK_ORDERS].sort((a, b) => {
        if (a.isCompleted === b.isCompleted) return 0;
        return a.isCompleted ? 1 : -1;
      });
    }

    if (results.length > 0) {
      setFilteredOrders(results);
      setSearchStatus('found');
    } else {
      setSearchStatus('not-found');
    }
  };

  const handleReset = () => {
    setSearchStatus('idle');
    setSearchValue('');
    setFilteredOrders([]);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderIdleState = () => (
    <div className="order-content idle">
      <div className="info-columns">
        <div className="info-col">
          <h3>Mã Đơn Hàng</h3>
          <p>Nhập mã đơn hàng của bạn (VD: RUV-98237) được gửi qua email hoặc SMS sau khi đặt hàng.</p>
        </div>
        <div className="info-col">
          <h3>Số Điện Thoại</h3>
          <p>Nhập số điện thoại bạn đã sử dụng khi đặt hàng để xem danh sách các đơn hàng gần đây.</p>
        </div>
      </div>
    </div>
  );

  const renderNotFoundState = () => (
    <div className="order-content not-found">
      <div className="not-found-box">
        <div className="search-icon-large">
          <Search size={32} color="#aaa" />
        </div>
        <h2>KHÔNG TÌM THẤY ĐƠN HÀNG</h2>
        <p>Không tìm thấy đơn hàng với thông tin đã nhập. Vui lòng kiểm tra lại Mã đơn hàng hoặc Số điện thoại và thử lại.</p>
        <button className="btn-outline" onClick={handleReset}>
          TÌM KIẾM LẠI
        </button>
      </div>
    </div>
  );

  const renderFoundState = () => (
    <div className="order-content found">
      <h3 className="card-title" style={{ marginBottom: '20px' }}>LỊCH SỬ ĐƠN HÀNG</h3>
      
      <div className="list-container">
        {currentOrders.map((order) => (
          <div className="list-item" key={order.id}>
            <div className="item-info">
              <div className="item-header">
                <span className="item-id">{order.id}</span>
                <span className={`item-tag ${order.statusClass}`}>{order.status}</span>
              </div>
              <div className="item-title">{order.name}</div>
              <div className="item-meta">Ngày đặt: {order.date}</div>
            </div>
            <div className="item-action">
              <span className="item-price">{order.price}</span>
              <button className="btn-outline" onClick={() => navigate(`/order/${order.id}`)}>XEM CHI TIẾT</button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="list-footer">
        <span className="list-footer-text">
          Hiển thị {currentOrders.length} / {filteredOrders.length} đơn hàng
        </span>
        
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="page-btn" 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i} 
                className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            
            <button 
              className="page-btn" 
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="order-lookup-page">
      <Header />
      
      {/* Top Black Banner */}
      <div className="order-banner">
        <div className="container">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> QUAY LẠI
          </button>

          <div className="banner-title-container">
            <div className="red-vertical-line"></div>
            <h1 className="banner-title">TRA CỨU ĐƠN HÀNG</h1>
          </div>
          
          <p className="banner-subtitle">
            Nhập Mã đơn hàng hoặc Số điện thoại để kiểm tra trạng thái đơn hàng của bạn.
          </p>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <input 
                type="text" 
                placeholder="Nhập Mã đơn hàng hoặc Số điện thoại..." 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <button type="submit" className="search-submit-btn">TRA CỨU</button>
          </form>

          <p className="search-hint">Thử nhập: 0901234567 • RUV-98237</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container order-main-container">
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

export default OrderLookupPage;
