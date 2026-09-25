// Admin product-combo screen: ComboSanPham.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import TablePagination from '../../../../../shared/components/ui/TablePagination';
import StopComboModal from '../components/StopComboModal';
import fallbackImage from '../../../../../assets/hero.png';
import { deactivateCombo, getComboPage, getComboStats } from '../api/comboApi';
import './ComboSanPham.css';

const PAGE_SIZE = 10;
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const isStopped = (combo) => String(combo.status || '').trim().startsWith('Ng');

export default function ComboSanPham() {
  const navigate = useNavigate();
  const [combos, setCombos] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [comboToStop, setComboToStop] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const statusValue = status === 'Đang kinh doanh' ? 1 : status === 'Ngưng kinh doanh' ? 0 : '';
    Promise.all([
      getComboPage({ page, limit: PAGE_SIZE, keyword: search, status: statusValue }, controller.signal),
      getComboStats(controller.signal),
    ]).then(([result, totals]) => {
      setCombos(result.items); setTotalItems(result.totalItems); setStats(totals);
      if (result.totalPages && page > result.totalPages) setPage(result.totalPages);
    }).catch((requestError) => {
      if (requestError.name !== 'AbortError') setError(requestError.message || 'Không thể tải danh sách combo.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, reloadKey, search, status]);

  const stopSelling = async () => {
    try { await deactivateCombo(comboToStop.id); setComboToStop(null); setReloadKey((value) => value + 1); }
    catch (requestError) { setComboToStop(null); setError(requestError.message || 'Không thể ngưng kinh doanh combo.'); }
  };

  return <main className="combo-list-page">
    <div className="combo-page-heading">
      <div><div className="combo-secondary-breadcrumb"><span>Sản phẩm</span><b>›</b><span>Quản lý kho</span><b>›</b><strong>Combo sản phẩm</strong></div><h1>COMBO SẢN PHẨM</h1></div>
      <button className="combo-primary-btn" onClick={() => navigate('/kho-hang/combo-san-pham/them-moi')}><HiOutlinePlus /> THÊM COMBO SẢN PHẨM</button>
    </div>
    <section className="combo-stats" aria-label="Thống kê combo">
      <div><strong>{stats.total}</strong><span>TỔNG COMBO</span></div>
      <div><strong className="is-green">{stats.active}</strong><span>ĐANG KINH DOANH</span></div>
      <div><strong className="is-red">{stats.inactive}</strong><span>NGƯNG KINH DOANH</span></div>
    </section>
    <div className="combo-toolbar">
      <label className="combo-search"><HiOutlineSearch /><input id="combo-search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên Combo hoặc mã Combo..." /></label>
      <select id="combo-status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option>Tất cả trạng thái</option><option>Đang kinh doanh</option><option>Ngưng kinh doanh</option></select>
    </div>
    <div className="combo-table-wrap"><table className="combo-table"><thead><tr><th>ẢNH</th><th>MÃ COMBO</th><th>TÊN COMBO</th><th>THÀNH PHẦN</th><th>CÓ THỂ BÁN</th><th>TỒN THỰC TẾ</th><th>GIÁ BÁN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
      {!loading && !error && combos.length ? combos.map((combo) => <tr key={combo.id}>
        <td><img className="combo-thumb" src={combo.image || fallbackImage} alt={combo.name} /></td><td><code>{combo.code}</code></td><td><strong>{combo.name}</strong></td>
        <td><div className="component-preview">{combo.components.slice(0, 2).map((item) => <div key={`${item.sku}-${item.name}`}><b>{item.name} <em>×{item.qty}</em></b><small>{item.variant} · {item.sku}</small></div>)}{combo.components.length > 2 && <span>+{combo.components.length - 2} thành phần khác</span>}</div></td>
        <td className={combo.sellable === 0 ? 'number-red' : 'number-strong'}>{combo.sellable}</td><td>{combo.stock}</td><td className="number-strong">{money(combo.price)}</td>
        <td><span className={`combo-status ${isStopped(combo) ? 'inactive' : 'active'}`}>{combo.status.toUpperCase()}</span></td>
        <td><div className="combo-actions"><button onClick={() => navigate(`/kho-hang/combo-san-pham/chi-tiet/${combo.id}`)}>XEM CHI TIẾT</button><button onClick={() => navigate(`/kho-hang/combo-san-pham/them-moi?id=${combo.id}`)}>SỬA</button>{!isStopped(combo) && <button className="danger" onClick={() => setComboToStop(combo)}>NGƯNG KD</button>}</div></td>
      </tr>) : <tr><td colSpan="9" className="combo-empty" role={error ? 'button' : undefined} onClick={error ? () => setReloadKey((value) => value + 1) : undefined}>{loading ? 'Đang tải dữ liệu combo...' : error ? `${error} Nhấn để thử lại.` : 'Không tìm thấy combo phù hợp.'}</td></tr>}
    </tbody></table></div>
    <TablePagination totalItems={totalItems} pageSize={PAGE_SIZE} currentPage={page} onPageChange={setPage} idPrefix="combo" />
    <StopComboModal combo={comboToStop} onCancel={() => setComboToStop(null)} onConfirm={stopSelling} />
  </main>;
}
