import React from 'react';
import './ConsultationBanner.css';

const ConsultationBanner = () => {
  return (
    <section className="consultation-banner">
      <div className="container consultation-content">
        <div className="consultation-text">
          <p className="consultation-subtitle">DỊCH VỤ MIỄN PHÍ</p>
          <h2 className="consultation-title">
            TƯ VẤN BUILD PC <br />
            <span className="text-red">THEO YÊU CẦU</span>
          </h2>
          <p className="consultation-desc">
            Đội ngũ kỹ thuật viên Ruventu tư vấn cấu hình theo nhu cầu và ngân sách của bạn.
          </p>
        </div>
        <div className="consultation-actions">
          <button className="btn-primary">NHẬN TƯ VẤN MIỄN PHÍ</button>
          <button className="btn-secondary">GỌI 1900 9999</button>
        </div>
      </div>
    </section>
  );
};

export default ConsultationBanner;
