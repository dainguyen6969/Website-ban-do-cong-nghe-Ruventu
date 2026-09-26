import React from 'react';
import './InfoBar.css';
import { MonitorDot, Truck, ShieldCheck, CreditCard } from 'lucide-react';

const InfoBar = () => {
  return (
    <div className="info-bar-section">
      <div className="container">
        <div className="info-bar-container">
          <div className="info-item">
            <MonitorDot className="info-icon" size={40} strokeWidth={1.5} />
            <div className="info-content">
              <h4>Build PC Miễn Phí</h4>
              <p>Tư vấn cấu hình & lắp ráp</p>
            </div>
          </div>
          
          <div className="info-divider"></div>

          <div className="info-item">
            <Truck className="info-icon" size={40} strokeWidth={1.5} />
            <div className="info-content">
              <h4>Giao Hàng Toàn Quốc</h4>
              <p>Miễn phí đơn trên 5 triệu</p>
            </div>
          </div>
          
          <div className="info-divider"></div>

          <div className="info-item">
            <ShieldCheck className="info-icon" size={40} strokeWidth={1.5} />
            <div className="info-content">
              <h4>Bảo Hành 36 Tháng</h4>
              <p>Chính hãng tại cửa hàng</p>
            </div>
          </div>

          <div className="info-divider"></div>

          <div className="info-item">
            <CreditCard className="info-icon" size={40} strokeWidth={1.5} />
            <div className="info-content">
              <h4>Trả Góp 0%</h4>
              <p>Qua thẻ mọi ngân hàng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoBar;
