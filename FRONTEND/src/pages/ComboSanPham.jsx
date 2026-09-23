import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import TablePagination from '../components/TablePagination';
import StopComboModal from '../components/StopComboModal';
import { getMockCombos, setMockComboStatus } from '../data/mockCombos';
import './ComboSanPham.css';

const PAGE_SIZE = 5;
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const isStopped = (combo) => String(combo.status || '').trim().startsWith('Ng');

export default function ComboSanPham() {
  const navigate = useNavigate();
  const [combos, setCombos] = useState(getMockCombos);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [page, setPage] = useState(1);
  const [comboToStop, setComboToStop] = useState(null);
  const filtered = useMemo(() => combos.filter((combo) => {
    const query = search.trim().toLocaleLowerCase('vi');
    return (!query || combo.name.toLocaleLowerCase('vi').includes(query) || combo.code.toLocaleLowerCase('vi').includes(query)) &&
      (status === 'Tất cả trạng thái' || combo.status === status);
  }), [combos, search, status]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const active = combos.filter((combo) => !isStopped(combo)).length;

  const stopSelling = () => {
    setMockComboStatus(comboToStop.id, 'Ngưng kinh doanh');
    setCombos(getMockCombos());
    setComboToStop(null);
  };

  return <main className="combo-list-page">
    <div className="combo-page-heading">
      <div><div className="combo-secondary-breadcrumb"><span>Sản phẩm</span><b>›</b><span>Quản lý kho</span><b>›</b><strong>Combo sản phẩm</strong></div><h1>COMBO SẢN PHẨM</h1></div>
      <button className="combo-primary-btn" onClick={() => navigate('/kho-hang/combo-san-pham/them-moi')}><HiOutlinePlus /> THÊM COMBO SẢN PHẨM</button>
    </div>
    <section className="combo-stats" aria-label="Thống kê combo">
      <div><strong>{combos.length}</strong><span>TỔNG COMBO</span></div>
      <div><strong className="is-green">{active}</strong><span>ĐANG KINH DOANH</span></div>
      <div><strong className="is-red">{combos.length - active}</strong><span>NGƯNG KINH DOANH</span></div>
    </section>
    <div className="combo-toolbar">
      <label className="combo-search"><HiOutlineSearch /><input id="combo-search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên Combo hoặc mã Combo..." /></label>
      <select id="combo-status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option>Tất cả trạng thái</option><option>Đang kinh doanh</option><option>Ngưng kinh doanh</option></select>
    </div>
    <div className="combo-table-wrap"><table className="combo-table"><thead><tr><th>ẢNH</th><th>MÃ COMBO</th><th>TÊN COMBO</th><th>THÀNH PHẦN</th><th>CÓ THỂ BÁN</th><th>TỒN THỰC TẾ</th><th>GIÁ BÁN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
      {rows.length ? rows.map((combo) => <tr key={combo.id}>
        <td><img className="combo-thumb" src={combo.image} alt={combo.name} /></td><td><code>{combo.code}</code></td><td><strong>{combo.name}</strong></td>
        <td><div className="component-preview">{combo.components.slice(0, 2).map((item) => <div key={`${item.sku}-${item.name}`}><b>{item.name} <em>×{item.qty}</em></b><small>{item.variant} · {item.sku}</small></div>)}{combo.components.length > 2 && <span>+{combo.components.length - 2} thành phần khác</span>}</div></td>
        <td className={combo.sellable === 0 ? 'number-red' : 'number-strong'}>{combo.sellable}</td><td>{combo.stock}</td><td className="number-strong">{money(combo.price)}</td>
        <td><span className={`combo-status ${isStopped(combo) ? 'inactive' : 'active'}`}>{combo.status.toUpperCase()}</span></td>
        <td><div className="combo-actions"><button onClick={() => navigate(`/kho-hang/combo-san-pham/chi-tiet/${combo.id}`)}>XEM CHI TIẾT</button><button>SỬA</button>{!isStopped(combo) && <button className="danger" onClick={() => setComboToStop(combo)}>NGƯNG KD</button>}</div></td>
      </tr>) : <tr><td colSpan="9" className="combo-empty">Không tìm thấy combo phù hợp.</td></tr>}
    </tbody></table></div>
    <TablePagination totalItems={filtered.length} pageSize={PAGE_SIZE} currentPage={safePage} onPageChange={setPage} idPrefix="combo" />
    <StopComboModal combo={comboToStop} onCancel={() => setComboToStop(null)} onConfirm={stopSelling} />
  </main>;
}
