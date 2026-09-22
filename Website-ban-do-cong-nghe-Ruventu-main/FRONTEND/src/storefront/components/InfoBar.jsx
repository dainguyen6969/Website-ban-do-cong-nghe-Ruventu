import React from 'react';
import './InfoBar.css';

const InfoBar = () => {
  return (
    <div className="info-bar">
      <div className="container info-container">
        <div className="info-item">
          <h4>Build PC Miễn Phí</h4>
          <p>Tư vấn cấu hình & lắp ráp</p>
        </div>
        <div className="info-item">
          <h4>Giao Hàng Toàn Quốc</h4>
          <p>Miễn phí đơn trên 5 triệu</p>
        </div>
        <div className="info-item">
          <h4>Bảo Hành 36 Tháng</h4>
          <p>Chính hãng tại cửa hàng</p>
        </div>
        <div className="info-item">
          <h4>Trả Góp 0%</h4>
          <p>Qua thẻ tín dụng mọi ngân hàng</p>
        </div>
      </div>
    </div>
  );
};

export default InfoBar;
