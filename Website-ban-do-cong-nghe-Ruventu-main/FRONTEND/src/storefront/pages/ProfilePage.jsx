import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { User, Edit, Lock, Check } from 'lucide-react';
import './ProfilePage.css';
import useMockAuth from '../../auth/useMockAuth';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentAccount, updateCurrentAccount } = useMockAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = ['orders', 'warranty', 'profile'].includes(tabParam) ? tabParam : 'profile';
  const setActiveTab = (tab) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.set('tab', tab);
    return next;
  });
  const user = currentAccount;
  const [isEditing, setIsEditing] = useState(false);
  
  // Local form state for edit simulation
  const [formData, setFormData] = useState({
    name: user?.name || '',
    city: 'Hà Nội',
    ward: 'Cầu Giấy',
    address: '12 Đường Xuân Thủy, KĐT Dịch Vọng'
  });

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [navigate, user]);

  if (!user) return null;

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to current user state
    setFormData(prev => ({ ...prev, name: user.name }));
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    // In simulation, update the local user state to persist UI
    updateCurrentAccount({ name: formData.name });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderProfileTab = () => (
    <div className="content-card">
      <div className="card-header-row">
        <h3 className="card-title">THÔNG TIN CÁ NHÂN</h3>
        {!isEditing && (
          <button className="btn-outline" onClick={handleEditClick}>
            <Edit size={14} /> CHỈNH SỬA THÔNG TIN
          </button>
        )}
      </div>

      <div className="form-grid">
        <div className="form-group full-width">
          <label>HỌ VÀ TÊN</label>
          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={!isEditing} 
            className={isEditing ? 'input-editable' : 'input-disabled'} 
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <div className="label-with-tag">
              <label>EMAIL</label>
              <span className="tag">Không thể chỉnh sửa</span>
            </div>
            <div className="input-with-icon">
              <input type="text" value={user.email} disabled className="input-disabled" />
              <Lock size={14} className="lock-icon" />
            </div>
            <p className="helper-text">Liên hệ hỗ trợ để thay đổi email.</p>
          </div>
          
          <div className="form-group">
            <div className="label-with-tag">
              <label>SỐ ĐIỆN THOẠI</label>
              <span className="tag">Không thể chỉnh sửa</span>
            </div>
            <div className="input-with-icon">
              <input type="text" value="0901 234 567" disabled className="input-disabled" />
              <Lock size={14} className="lock-icon" />
            </div>
            <p className="helper-text">Xác minh OTP để thay đổi số điện thoại.</p>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <h3 className="card-title">ĐỊA CHỈ GIAO HÀNG MẶC ĐỊNH</h3>
      <div className="form-grid" style={{ marginBottom: isEditing ? '0' : '20px' }}>
        <div className="form-row">
          <div className="form-group">
            <label>TỈNH / THÀNH PHỐ</label>
            <select 
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!isEditing} 
              className={isEditing ? 'input-editable select-editable' : 'input-disabled select-disabled'}
            >
              <option>Hà Nội</option>
              <option>TP. Hồ Chí Minh</option>
              <option>Đà Nẵng</option>
            </select>
          </div>
          <div className="form-group">
            <label>PHƯỜNG / XÃ</label>
            <select 
              name="ward"
              value={formData.ward}
              onChange={handleChange}
              disabled={!isEditing} 
              className={isEditing ? 'input-editable select-editable' : 'input-disabled select-disabled'}
            >
              <option>Cầu Giấy</option>
              <option>Đống Đa</option>
              <option>Thanh Xuân</option>
            </select>
          </div>
        </div>
        
        <div className="form-group full-width">
          <label>ĐỊA CHỈ CỤ THỂ</label>
          <input 
            type="text" 
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={!isEditing} 
            className={isEditing ? 'input-editable' : 'input-disabled'} 
          />
        </div>
      </div>

      {isEditing ? (
        <div className="edit-actions">
          <button className="btn-primary" onClick={handleSaveEdit}>
            <Check size={16} /> LƯU THAY ĐỔI
          </button>
          <button className="btn-secondary" onClick={handleCancelEdit}>
            HỦY
          </button>
          <span className="edit-hint">Các thay đổi sẽ được lưu vào hồ sơ của bạn.</span>
        </div>
      ) : (
        <button className="btn-outline bottom-btn">
          <Lock size={14} /> ĐỔI MẬT KHẨU
        </button>
      )}
    </div>
  );

  const renderOrdersTab = () => (
    <div className="content-card">
      <div className="card-header-row" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">LỊCH SỬ ĐƠN HÀNG</h3>
      </div>
      <div className="list-container">
        <div className="list-item">
          <div className="item-info">
            <div className="item-header">
              <span className="item-id">RUV-98237</span>
              <span className="item-tag tag-orange">ĐANG GIAO HÀNG</span>
            </div>
            <div className="item-title">RTX 4090 ROG STRIX OC, DDR5 64GB, SAMSUNG 990 PRO 2TB</div>
            <div className="item-meta">Ngày đặt: 28/08/2026</div>
          </div>
          <div className="item-action">
            <span className="item-price">38.460.000đ</span>
            <button className="btn-outline" onClick={() => navigate('/order/RUV-98237')}>XEM CHI TIẾT</button>
          </div>
        </div>
        <div className="list-item">
          <div className="item-info">
            <div className="item-header">
              <span className="item-id">RV-20240801-001</span>
              <span className="item-tag tag-green">ĐÃ GIAO</span>
            </div>
            <div className="item-title">RTX 4080 SUPER, 32GB DDR5</div>
            <div className="item-meta">Ngày đặt: 01/08/2024</div>
          </div>
          <div className="item-action">
            <span className="item-price">34.990.000đ</span>
            <button className="btn-outline" onClick={() => navigate('/order/RV-20240801-001')}>XEM CHI TIẾT</button>
          </div>
        </div>
        <div className="list-item">
          <div className="item-info">
            <div className="item-header">
              <span className="item-id">RV-20240715-002</span>
              <span className="item-tag tag-green">ĐÃ GIAO</span>
            </div>
            <div className="item-title">RYZEN 9 7900X, B650 MAINBOARD</div>
            <div className="item-meta">Ngày đặt: 15/07/2024</div>
          </div>
          <div className="item-action">
            <span className="item-price">18.450.000đ</span>
            <button className="btn-outline" onClick={() => navigate('/order/RV-20240715-002')}>XEM CHI TIẾT</button>
          </div>
        </div>
      </div>
      <div className="list-footer">
        <span className="list-footer-text">Hiển thị 3 đơn hàng</span>
        <button className="btn-outline">XEM TẤT CẢ ĐƠN HÀNG</button>
      </div>
    </div>
  );

  const renderWarrantyTab = () => (
    <div className="content-card">
      <div className="card-header-row" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">THÔNG TIN BẢO HÀNH</h3>
      </div>
      <div className="list-container">
        <div className="list-item">
          <div className="item-info">
            <div className="item-title bold">ASUS ROG STRIX RTX 4080 OC</div>
            <div className="item-meta">
              <span>Mã bảo hành: <strong>WR-2024-0012</strong></span>
              <span>Serial: <strong>G4080S-VN4521</strong></span>
              <span>Hết hạn: <strong>01/08/2026</strong></span>
            </div>
          </div>
          <div className="item-action" style={{flexDirection: 'row', alignItems: 'center', gap: '20px'}}>
            <span className="item-tag tag-light-green">Còn bảo hành</span>
            <button className="btn-outline">YÊU CẦU BẢO HÀNH</button>
          </div>
        </div>
        <div className="list-item">
          <div className="item-info">
            <div className="item-title bold">AMD RYZEN 9 7900X</div>
            <div className="item-meta">
              <span>Mã bảo hành: <strong>WR-2024-0013</strong></span>
              <span>Serial: <strong>RZ00-7900X-VN001</strong></span>
              <span>Hết hạn: <strong>15/07/2025</strong></span>
            </div>
          </div>
          <div className="item-action" style={{flexDirection: 'row', alignItems: 'center', gap: '20px'}}>
            <span className="item-tag tag-light-green">Còn bảo hành</span>
            <button className="btn-outline">YÊU CẦU BẢO HÀNH</button>
          </div>
        </div>
        <div className="list-item">
          <div className="item-info">
            <div className="item-title bold">SAMSUNG 990 PRO NVME 2TB</div>
            <div className="item-meta">
              <span>Mã bảo hành: <strong>WR-2024-0014</strong></span>
              <span>Serial: <strong>MZV9P2T0BAH-000</strong></span>
              <span>Hết hạn: <strong>20/06/2027</strong></span>
            </div>
          </div>
          <div className="item-action" style={{flexDirection: 'row', alignItems: 'center', gap: '20px'}}>
            <span className="item-tag tag-light-green">Còn bảo hành</span>
            <button className="btn-outline">YÊU CẦU BẢO HÀNH</button>
          </div>
        </div>
      </div>
      <div className="list-footer text-only">
        <span className="list-footer-text">Để tra cứu bảo hành hoặc yêu cầu hỗ trợ, vui lòng liên hệ hotline <strong>1800 6018</strong> hoặc email <strong>support@reventu.com</strong>.</span>
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      <Header />
      
      {/* Black User Banner */}
      <div className="profile-banner">
        <div className="container profile-banner-content">
          <div className="profile-banner-avatar">
            <User size={32} />
          </div>
          <div className="profile-banner-info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container profile-container">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="sidebar-header">QUẢN LÝ TÀI KHOẢN</div>
          <ul className="sidebar-menu">
            <li className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Tài khoản của tôi</li>
            <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Đơn hàng</li>
            <li className={activeTab === 'warranty' ? 'active' : ''} onClick={() => setActiveTab('warranty')}>Bảo hành</li>
          </ul>
        </aside>

        {/* Content Area */}
        <main className="profile-content">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'orders' && renderOrdersTab()}
          {activeTab === 'warranty' && renderWarrantyTab()}
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default ProfilePage;
