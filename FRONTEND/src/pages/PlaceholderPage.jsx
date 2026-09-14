export default function PlaceholderPage({ title }) {
  return (
    <main className="main-content" role="main">
      <nav className="content__breadcrumb" aria-label="Breadcrumb">
        <span className="content__breadcrumb-item">Admin</span>
        <span className="content__breadcrumb-sep" aria-hidden="true">›</span>
        <span className="content__breadcrumb-item content__breadcrumb-item--current">
          {title}
        </span>
      </nav>

      <div className="content__title-row">
        <h1 className="content__title">{title.toUpperCase()}</h1>
      </div>

      <div className="order-placeholder" style={{ marginTop: '20px' }}>
        <div className="order-placeholder__card">
          <h2 className="order-placeholder__title">Nội dung trang {title} đang được hoàn thiện sau</h2>
          <p className="order-placeholder__desc">Chức năng này sẽ sớm xuất hiện trong các phiên bản cập nhật tiếp theo.</p>
        </div>
      </div>
    </main>
  );
}
