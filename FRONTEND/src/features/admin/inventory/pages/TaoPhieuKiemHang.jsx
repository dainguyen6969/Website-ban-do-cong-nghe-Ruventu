// Admin inventory screen: TaoPhieuKiemHang.
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import { createInventoryCheck, updateInventoryCheck, searchInventoryCheckProducts, getInventoryCheckDetail } from '../api/inventoryCheckApi';
import './StockCheckFlow.css';

const reasons = ['Hư hỏng', 'Thất lạc', 'Lệch mã', 'Kiểm đếm lại', 'Khác', 'Nhập tay...'];

export default function TaoPhieuKiemHang() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const editing = Boolean(editId);
  
  const [existing, setExisting] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adjustedStock, setAdjustedStock] = useState(0);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (editing) {
      getInventoryCheckDetail(editId).then(data => {
        setExisting(data);
        setReason(data.ly_do || '');
        if (!reasons.includes(data.ly_do) && data.ly_do) {
          setReason('Nhập tay...');
          setCustomReason(data.ly_do);
        }
        setAdjustedStock(data.ton_thuc_te ?? 0);
        setSelected({
          id: data.phien_ban?.id,
          sku: data.phien_ban?.ma_san_pham,
          barcode: data.phien_ban?.ma_vach,
          displayName: data.phien_ban?.ten_san_pham,
          versionName: data.phien_ban?.ten_phien_ban,
          actual: data.ton_he_thong
        });
      }).catch(err => {
        setErrorMsg(err.message || 'Không thể tải chi tiết phiếu kiểm hàng');
      });
    }
  }, [editing, editId]);

  useEffect(() => {
    if (editing || !query.trim()) {
      setResults([]);
      return;
    }
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchInventoryCheckProducts(query, 1, 6).then(res => {
        setResults(res.items.filter(item => item.phien_ban_id !== selected?.id).map(item => ({
          id: item.phien_ban_id,
          sku: item.ma_san_pham,
          displayName: item.ten_san_pham,
          versionName: item.ten_phien_ban,
          barcode: item.ma_vach,
          actual: item.ton_he_thong
        })));
      }).catch(err => console.error(err));
    }, 400);
  }, [query, editing, selected?.id]);

  const selectProduct = (item) => {
    setSelected(item);
    setAdjustedStock(item.actual);
    setReason('');
    setCustomReason('');
    setQuery('');
    setResults([]);
    setErrorMsg(null);
  };

  const systemStock = editing && existing ? existing.ton_he_thong : (selected?.actual ?? 0);
  const difference = selected ? Number(adjustedStock) - Number(systemStock) : 0;
  const effectiveReason = reason === 'Nhập tay...' ? customReason.trim() : reason;

  const submit = async () => {
    if (!selected) return;
    if (!effectiveReason) {
      setErrorMsg('Vui lòng nhập lý do kiểm hàng.');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        versionId: selected.id,
        actualStock: Math.max(0, Number(adjustedStock) || 0),
        reason: effectiveReason
      };
      
      if (editing) {
        await updateInventoryCheck(editId, payload);
      } else {
        await createInventoryCheck(payload);
      }
      setSuccess(true);
      window.setTimeout(() => navigate('/kho-hang/kiem-hang'), 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu phiếu kiểm hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (editing && errorMsg && !existing) return <main className="stock-flow-page"><div className="stock-flow-not-found">{errorMsg}</div></main>;

  return <main className="stock-flow-page">
    <header className="stock-flow-heading">
      <nav>KIỂM HÀNG <b>›</b> DANH SÁCH PHIẾU KIỂM HÀNG <b>›</b> <strong>{editing ? (existing?.ma_phieu || editId) : 'TẠO MỚI'}</strong></nav>
      <h1>{editing ? 'CHỈNH SỬA PHIẾU KIỂM HÀNG' : 'TẠO PHIẾU KIỂM HÀNG'}</h1>
    </header>

    <div className="stock-create-grid">
      <section className="stock-flow-card">
        <h2>SẢN PHẨM CẦN KIỂM</h2>
        <div className="stock-product-search">
          <HiOutlineSearch aria-hidden="true" />
          <input value={query} disabled={editing || success} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã sản phẩm/tên/phiên bản/mã vạch..." />
          {results.length > 0 && <div className="stock-search-results">{results.map((item) => <button type="button" key={item.id} onClick={() => selectProduct(item)}><span><strong>{item.displayName}</strong><small>{item.versionName} &nbsp; MV: {item.barcode}</small></span><em>TỒN: {item.actual}</em></button>)}</div>}
        </div>

        <div className="stock-form-table-wrap"><table className="stock-form-table">
          <thead><tr><th>MÃ HÀNG</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>TỒN HỆ THỐNG</th><th>SAU ĐIỀU CHỈNH</th><th>CHÊNH LỆCH</th><th>LÝ DO <span style={{color:'red'}}>*</span></th></tr></thead>
          <tbody>{selected ? <tr>
            <td>{selected.sku}<small>MV: {selected.barcode}</small></td>
            <td><strong>{selected.displayName}</strong><small>{selected.versionName}</small></td>
            <td className="stock-number">{systemStock}</td>
            <td><input className="stock-adjust-input" type="number" min="0" value={adjustedStock} disabled={success} onChange={(event) => setAdjustedStock(event.target.value)} /></td>
            <td><span className={`stock-difference ${difference !== 0 ? 'has-difference' : ''}`}>{difference > 0 ? `+${difference}` : difference}</span></td>
            <td>
              <select disabled={success} value={reason} onChange={(event) => { setReason(event.target.value); if (event.target.value !== 'Nhập tay...') setCustomReason(''); }}><option value="">— chọn lý do —</option>{reasons.map((item) => <option key={item}>{item}</option>)}</select>
              {reason === 'Nhập tay...' && <input disabled={success} className="stock-custom-reason" value={customReason} onChange={(event) => setCustomReason(event.target.value)} placeholder="Nhập lý do..." />}
              {!effectiveReason && <small className="stock-reason-error">Bắt buộc nhập lý do kiểm hàng.</small>}
            </td>
          </tr> : <tr><td colSpan="6" className="stock-form-empty">“TÌM VÀ CHỌN PHIÊN BẢN Ở TRÊN”</td></tr>}</tbody>
        </table></div>

        {selected && <div className="stock-form-summary"><div><span>SỐ LƯỢNG SAU ĐIỀU CHỈNH</span><strong>{Number(adjustedStock) || 0}</strong></div><div><span>CHÊNH LỆCH TỒN KHO</span><strong className={difference !== 0 ? 'is-red' : ''}>{difference > 0 ? `+${difference}` : difference}</strong></div></div>}
      </section>

      <aside className="stock-create-side">
        <section className="stock-warehouse-box"><span>KHO KIỂM HÀNG</span><strong>KHO CỬA HÀNG</strong></section>
      </aside>
    </div>

    <footer className="stock-flow-footer">
      <button type="button" className="stock-action outline" onClick={() => navigate(editing ? `/kho-hang/kiem-hang/${editId}` : '/kho-hang/kiem-hang')}>‹ &nbsp; QUAY LẠI</button>
      <div className="stock-submit-area">
        {errorMsg && <p className="stock-duplicate-warning">{errorMsg}</p>}
        {success ? <p className="stock-create-success">{editing ? 'Đã cập nhật phiếu kiểm.' : 'Tạo phiếu kiểm thành công.'}</p> : <button type="button" className="stock-action black" disabled={!selected || isSubmitting || !effectiveReason} onClick={submit}>{editing ? 'LƯU THAY ĐỔI' : 'TẠO PHIẾU KIỂM HÀNG'}</button>}
      </div>
    </footer>
  </main>;
}
