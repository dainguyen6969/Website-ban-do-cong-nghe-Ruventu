import React from 'react';
import './HeroBanner.css';

const HeroBanner = () => {
  return (
    <section className="hero-section">
      <div className="hero-grid">
        {/* Main Banner */}
        <div className="main-banner">
          <img src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&q=80&w=1200&h=600" alt="PC Gaming" className="banner-img" />
          <div className="banner-overlay"></div>
          <div className="banner-content">
            <div className="badge-container">
              <span className="badge new-badge"><span className="play-icon">▶</span> NEW SEASON</span>
              <span className="badge date-badge">THU - ĐÔNG 2025</span>
            </div>
            <h1 className="hero-title">
              DOMINATE<br />
              <span className="text-red">EVERY</span><br />
              BATTLEFIELD
            </h1>
            <p className="hero-desc">PC Gaming chuyên dụng, linh kiện cao cấp chính hãng. Bảo hành 36 tháng. Giao hàng toàn quốc.</p>
            <div className="hero-actions">
              <button className="btn-primary">XEM PC BUILD SẴN</button>
              <button className="btn-outline">MUA LINH KIỆN</button>
            </div>
          </div>
        </div>

        {/* Side Banners */}
        <div className="side-banners">
          <div className="side-banner">
            <img src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=600&h=300" alt="RTX 4090" className="banner-img" />
            <div className="banner-overlay"></div>
            <div className="banner-content small-content">
              <span className="small-label">VGA - FLAGSHIP</span>
              <h3 className="side-title">RTX 4090<br/>ROG STRIX OC</h3>
              <p className="side-price">24.900.000đ</p>
              <span className="arrow-link">XEM &rarr;</span>
            </div>
          </div>
          <div className="side-banner">
            <div className="banner-red-stripe">KHUYẾN MÃI THÁNG NÀY</div>
            <img src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&q=80&w=600&h=300" alt="PC Build Sẵn" className="banner-img" />
            <div className="banner-overlay"></div>
            <div className="banner-content small-content">
              <span className="small-label">PC BUILD SẴN</span>
              <h3 className="side-title">RUVENTU<br/>WARLORD PRO</h3>
              <p className="side-price">54.900.000đ</p>
              <span className="arrow-link">XEM &rarr;</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
