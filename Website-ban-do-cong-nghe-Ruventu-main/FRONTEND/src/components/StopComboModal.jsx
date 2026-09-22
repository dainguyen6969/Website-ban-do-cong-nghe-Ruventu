import './StopComboModal.css';

export default function StopComboModal({ combo, onCancel, onConfirm }) {
  if (!combo) return null;
  return <div className="stop-combo-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="stop-combo-modal" role="dialog" aria-modal="true" aria-labelledby="stop-combo-title">
      <header><span aria-hidden="true" /><h2 id="stop-combo-title">NGỪNG KINH DOANH COMBO?</h2></header>
      <div className="stop-combo-body">
        <strong>{combo.name}</strong>
        <p>Combo sẽ không còn được áp dụng bán.</p>
        <b>Các sản phẩm / phiên bản thành phần bên trong Combo KHÔNG bị xóa hoặc thay đổi trạng thái.</b>
      </div>
      <footer><button type="button" className="stop-combo-cancel" onClick={onCancel}>HỦY</button><button type="button" className="stop-combo-confirm" onClick={onConfirm}>XÁC NHẬN NGỪNG KINH DOANH</button></footer>
    </section>
  </div>;
}

