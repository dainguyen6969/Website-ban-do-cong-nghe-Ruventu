import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import { createStockCheck, findOpenCheck, getStockCheck, getStockVersions, updateStockCheck } from '../data/mockStockChecks';
import { subscribeToAdminSlice } from '../sync/adminSync';
import './StockCheckFlow.css';

const reasons = ['Hư hỏng', 'Thất lạc', 'Lệch mã', 'Kiểm đếm lại', 'Khác', 'Nhập tay...'];
const localDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function TaoPhieuKiemHang() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const existing = editId ? getStockCheck(editId) : null;
  const editing = Boolean(existing);
  const [versions, setVersions] = useState(getStockVersions);
  const initialVersion = existing ? versions.find((item) => item.id === existing.versionId) || {
    id: existing.versionId, sku: existing.sku, displayCode: existing.sku, displayName: existing.productName,
    barcode: existing.barcode, actual: existing.systemStock,
  } : null;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(initialVersion);
  const [adjustedStock, setAdjustedStock] = useState(existing?.adjustedStock ?? initialVersion?.actual ?? 0);
  const [reason, setReason] = useState(existing?.reason || '');
  const [customReason, setCustomReason] = useState(existing?.customReason || '');
  const [checkedAt, setCheckedAt] = useState(existing?.checkedAt || localDateTime());
  const [duplicate, setDuplicate] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => subscribeToAdminSlice('stock-levels', () => {
    const nextVersions = getStockVersions();
    setVersions(nextVersions);
    setSelected((current) => current ? nextVersions.find((item) => item.id === current.id) || current : current);
  }), []);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    if (!needle || editing) return [];
    return versions.filter((item) => item.id !== selected?.id && [item.sku, item.displayCode, item.displayName, item.barcode]
      .some((value) => String(value).toLocaleLowerCase('vi').includes(needle))).slice(0, 6);
  }, [editing, query, selected?.id, versions]);

  const selectProduct = (item) => {
    setSelected(item);
    setAdjustedStock(item.actual);
    setReason('');
    setCustomReason('');
    setQuery('');
    setDuplicate(null);
  };

  const difference = selected ? Number(adjustedStock) - Number(existing?.systemStock ?? selected.actual) : 0;
  const effectiveReason = reason === 'Nhập tay...' ? customReason.trim() : reason;

  const submit = () => {
    if (!selected) return;
    const openCheck = findOpenCheck(selected.id, editId);
    if (openCheck) { setDuplicate(openCheck); return; }
    const payload = {
      versionId: selected.id,
      productName: existing?.productName || selected.displayName,
      variant: selected.displayName,
      sku: existing?.sku || selected.sku,
      barcode: existing?.barcode || selected.barcode,
      systemStock: existing?.systemStock ?? selected.actual,
      adjustedStock: Math.max(0, Number(adjustedStock) || 0),
      reason,
      customReason,
      warehouse: existing?.warehouse || 'Kho cửa hàng',
      checkedAt,
    };
    if (editing) updateStockCheck(editId, payload); else createStockCheck(payload);
    setSuccess(true);
    window.setTimeout(() => navigate('/kho-hang/kiem-hang'), 650);
  };

  if (editId && !existing) return <main className="stock-flow-page"><div className="stock-flow-not-found">Không tìm thấy phiếu kiểm hàng.</div></main>;

  return <main className="stock-flow-page">
    <header className="stock-flow-heading">
      <nav>KIỂM HÀNG <b>›</b> DANH SÁCH PHIẾU KIỂM HÀNG <b>›</b> <strong>{editing ? editId : 'TẠO MỚI'}</strong></nav>
      <h1>{editing ? 'CHỈNH SỬA PHIẾU KIỂM HÀNG' : 'TẠO PHIẾU KIỂM HÀNG'}</h1>
    </header>

    <div className="stock-create-grid">
      <section className="stock-flow-card">
        <h2>SẢN PHẨM CẦN KIỂM</h2>
        <div className="stock-product-search">
          <HiOutlineSearch aria-hidden="true" />
          <input value={query} disabled={editing} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã sản phẩm/tên/phiên bản/mã vạch..." />
          {results.length > 0 && <div className="stock-search-results">{results.map((item) => <button type="button" key={item.id} onClick={() => selectProduct(item)}><span><strong>{item.displayName}</strong><small>{item.sku} &nbsp; MV: {item.barcode}</small></span><em>TỒN: {item.actual}</em></button>)}</div>}
        </div>

        <div className="stock-form-table-wrap"><table className="stock-form-table">
          <thead><tr><th>MÃ HÀNG</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>TỒN HỆ THỐNG</th><th>SAU ĐIỀU CHỈNH</th><th>CHÊNH LỆCH</th><th>LÝ DO</th></tr></thead>
          <tbody>{selected ? <tr>
            <td>{existing?.sku || selected.sku}<small>MV: {existing?.barcode || selected.barcode}</small></td>
            <td><strong>{existing?.productName || selected.displayName}</strong><small>{selected.displayName}</small></td>
            <td className="stock-number">{existing?.systemStock ?? selected.actual}</td>
            <td><input className="stock-adjust-input" type="number" min="0" value={adjustedStock} onChange={(event) => setAdjustedStock(event.target.value)} /></td>
            <td><span className={`stock-difference ${difference !== 0 ? 'has-difference' : ''}`}>{difference > 0 ? `+${difference}` : difference}</span></td>
            <td>
              <select value={reason} onChange={(event) => { setReason(event.target.value); if (event.target.value !== 'Nhập tay...') setCustomReason(''); }}><option value="">— chọn lý do —</option>{reasons.map((item) => <option key={item}>{item}</option>)}</select>
              {reason === 'Nhập tay...' && <input className="stock-custom-reason" value={customReason} onChange={(event) => setCustomReason(event.target.value)} placeholder="Nhập lý do..." />}
              {difference !== 0 && !effectiveReason && <small className="stock-reason-error">Cần lý do trước khi cân bằng tồn kho.</small>}
            </td>
          </tr> : <tr><td colSpan="6" className="stock-form-empty">“TÌM VÀ CHỌN PHIÊN BẢN Ở TRÊN”</td></tr>}</tbody>
        </table></div>

        {selected && <div className="stock-form-summary"><div><span>SỐ LƯỢNG SAU ĐIỀU CHỈNH</span><strong>{Number(adjustedStock) || 0}</strong></div><div><span>CHÊNH LỆCH TỒN KHO</span><strong className={difference !== 0 ? 'is-red' : ''}>{difference > 0 ? `+${difference}` : difference}</strong></div></div>}
      </section>

      <aside className="stock-create-side">
        <section className="stock-warehouse-box"><span>KHO KIỂM HÀNG</span><strong>{existing?.warehouse || 'KHO CỬA HÀNG'}</strong></section>
        <section className="stock-flow-card stock-date-card"><h2>NGÀY KIỂM HÀNG</h2><div><input type="datetime-local" value={checkedAt} onChange={(event) => setCheckedAt(event.target.value)} /></div></section>
      </aside>
    </div>

    <footer className="stock-flow-footer">
      <button type="button" className="stock-action outline" onClick={() => navigate(editing ? `/kho-hang/kiem-hang/${editId}` : '/kho-hang/kiem-hang')}>‹ &nbsp; QUAY LẠI</button>
      <div className="stock-submit-area">
        {duplicate ? <><p className="stock-duplicate-warning">Đã tồn tại phiếu kiểm đang xử lý cho phiên bản sản phẩm này ({duplicate.id}). Vui lòng hoàn tất hoặc hủy phiếu cũ trước.</p><button type="button" className="stock-action outline stock-list-button" onClick={() => navigate('/kho-hang/kiem-hang')}>VỀ DANH SÁCH</button></> : success ? <p className="stock-create-success">Tạo phiếu kiểm thành công.</p> : <button type="button" className="stock-action black" disabled={!selected || !checkedAt} onClick={submit}>{editing ? 'LƯU THAY ĐỔI' : 'TẠO PHIẾU KIỂM HÀNG'}</button>}
      </div>
    </footer>
  </main>;
}
