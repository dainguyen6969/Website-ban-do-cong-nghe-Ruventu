import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { pcBuilderService, pcBuilderError } from '../../shared/services/pcBuilderService';
import { availableQuantity, money, socketLabels, pcBuilderPriceBands } from '../pages/pcBuilderModel';
import './ComponentSelectionModal.css';

const initialFilters = { keyword: '', thuong_hieu_id: '', gia_tu: '', gia_den: '', tinh_trang_hang: 'TAT_CA', sap_xep: 'MAC_DINH', page: 0 };
const labels = { TAT_CA: 'TẤT CẢ', CON_HANG: 'CÒN HÀNG', HET_HANG: 'HẾT HÀNG', MAC_DINH: 'NỔI BẬT', GIA_TANG: 'GIÁ THẤP → CAO', GIA_GIAM: 'GIÁ CAO → THẤP' };
const specLabels = { socket: 'Socket', loai_ram: 'Loại RAM', dung_luong: 'Dung lượng', toc_do_bus: 'Tốc độ bus', bus_ram: 'Bus RAM', chipset: 'Chipset', so_nhan: 'Số nhân', so_luong_nhan: 'Số nhân', so_luong_luong: 'Số luồng', tan_so: 'Tần số', cong_suat: 'Công suất', kich_thuoc: 'Kích thước', do_phan_giai: 'Độ phân giải', tan_so_quet: 'Tần số quét', vram: 'VRAM', chuan_ket_noi: 'Chuẩn kết nối' };

const ComponentSelectionModal = ({ slot, options, selections, onClose, onSelect }) => {
  const [filters, setFilters] = useState(initialFilters);
  const [onlyMatching, setOnlyMatching] = useState(true);
  const [reply, setReply] = useState(null);
  const [retry, setRetry] = useState(0);
  const panel = useRef(null);
  const search = useRef(null);
  const reference = selections[slot.ma_hang_muc === 'CPU' ? 'MAIN' : slot.ma_hang_muc === 'MAIN' ? 'CPU' : '']?.phien_ban_id;
  const queryKey = JSON.stringify([filters, slot.ma_hang_muc, reference, onlyMatching, retry]);
  const result = reply?.data;
  const loading = reply?.key !== queryKey;
  const error = loading ? '' : reply.error;
  const resultCount = loading ? 'Đang tải sản phẩm...' : error ? 'Không tải được sản phẩm' : `${result?.pagination.total_elements ?? 0} SẢN PHẨM PHÙ HỢP`;
  const priceBand = pcBuilderPriceBands.find(band => band.min === filters.gia_tu && band.max === filters.gia_den)?.value;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    search.current.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (filters.gia_tu !== '' && filters.gia_den !== '' && Number(filters.gia_tu) > Number(filters.gia_den)) {
        setReply(prev => ({ ...prev, key: queryKey, error: 'Giá từ không được lớn hơn giá đến.' }));
        return;
      }
      const params = { ma_hang_muc: slot.ma_hang_muc, limit: 20, ...filters };
      for (const key of ['thuong_hieu_id', 'gia_tu', 'gia_den', 'keyword']) {
        if (params[key] === '') delete params[key];
      }
      if (reference) Object.assign(params, { phien_ban_doi_chieu_id: reference, chi_khop_socket: onlyMatching });
      try {
        const data = await pcBuilderService.products(params, controller.signal);
        if (!controller.signal.aborted) setReply({ key: queryKey, data, error: '' });
      } catch (err) {
        if (!controller.signal.aborted) setReply(prev => ({ ...prev, key: queryKey, error: pcBuilderError(err) }));
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, slot.ma_hang_muc, reference, onlyMatching, retry, queryKey]);

  function change(key, value) {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 0 }));
  }
  function keyboard(event) {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const targets = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')];
    const first = targets[0];
    const last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  return <div className="build-modal-overlay">
    <div className="build-modal-content" role="dialog" aria-modal="true" aria-labelledby="build-modal-title" ref={panel} onKeyDown={keyboard}>
      <div className="build-modal-header">
        <div><h2 id="build-modal-title" className="build-modal-title">CHỌN {slot.ten_hang_muc}</h2><p className="build-modal-caption">{resultCount}</p></div>
        <button className="build-modal-close" aria-label="Đóng chọn sản phẩm" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="build-modal-search-bar">
        <input ref={search} aria-label="Tìm tên sản phẩm hoặc mã sản phẩm" placeholder="TÌM TÊN SẢN PHẨM / MÃ SP..." value={filters.keyword} onChange={e => change('keyword', e.target.value)} />
      </div>
      <div className="build-modal-body">
        <aside className="build-modal-filters" aria-label="Bộ lọc sản phẩm">
          <h3>BỘ LỌC</h3>
          <FilterGroup title="THƯƠNG HIỆU" name="build-brand" value={filters.thuong_hieu_id} onChange={value => change('thuong_hieu_id', value)}
            items={[{ value: '', label: 'TẤT CẢ' }, ...(result?.thuong_hieu_options || []).map(brand => ({ value: String(brand.id), label: brand.ten_thuong_hieu }))]} />
          <FilterGroup title="KHOẢNG GIÁ" name="build-price" value={priceBand} items={pcBuilderPriceBands} onChange={value => {
            const band = pcBuilderPriceBands.find(item => item.value === value);
            setFilters(prev => ({ ...prev, gia_tu: band.min, gia_den: band.max, page: 0 }));
          }} />
          <FilterGroup title="TÌNH TRẠNG KHO" name="build-stock" value={filters.tinh_trang_hang} onChange={value => change('tinh_trang_hang', value)}
            items={options.tinh_trang_hang.map(value => ({ value, label: labels[value] || value }))} />
          <FilterGroup title="SẮP XẾP" name="build-sort" value={filters.sap_xep} onChange={value => change('sap_xep', value)}
            items={options.sap_xep.map(value => ({ value, label: labels[value] || value }))} />
        </aside>
        <div className="build-modal-results">
          <div className="build-modal-main-header">
            <span role="status">{resultCount}</span>
            <button className="build-clear-filter" onClick={() => { setFilters(initialFilters); setOnlyMatching(true); }}><RotateCcw size={14} aria-hidden="true" /> XÓA BỘ LỌC</button>
          </div>
          {reference && <div className="build-socket-filter">
            <label><input type="checkbox" checked={onlyMatching} onChange={e => { setOnlyMatching(e.target.checked); change('page', 0); }} /> Chỉ hiển thị khớp socket</label>
            {result?.bo_loc_tuong_thich.socket_doi_chieu && <span>Socket đối chiếu: {result.bo_loc_tuong_thich.socket_doi_chieu}</span>}
            <span>{onlyMatching ? 'Bỏ chọn để xem tất cả, kể cả sản phẩm thiếu dữ liệu hoặc không khớp socket.' : 'Đang xem tất cả. Cặp CPU/Main thiếu dữ liệu hoặc không khớp socket không thể thêm vào giỏ.'}</span>
          </div>}
          <div className="build-modal-product-list" aria-busy={loading}>
            {error ? <div className="build-error" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>
              : loading ? <div className="loading-msg">Đang tải sản phẩm...</div>
              : !result?.items.length ? <div className="loading-msg">{reference && onlyMatching ? 'Không có sản phẩm khớp socket và bộ lọc hiện tại. Sản phẩm thiếu dữ liệu socket cũng bị ẩn; bỏ chọn “Chỉ hiển thị khớp socket” để xem tất cả.' : 'Không có sản phẩm phù hợp.'}</div>
              : result.items.map(product => <ProductRow key={product.phien_ban_id} product={product}
                maximum={availableQuantity(product, slot.ma_hang_muc, selections)}
                selected={selections[slot.ma_hang_muc]?.phien_ban_id === product.phien_ban_id}
                onSelect={qty => onSelect(product, qty)} />)}
          </div>
        </div>
      </div>
      <div className="build-pagination">
        <button disabled={loading || filters.page === 0} onClick={() => change('page', filters.page - 1)}>Trang trước</button>
        <span>Trang {filters.page + 1} / {Math.max(1, result?.pagination.total_pages || 0)}</span>
        <button disabled={loading || error || filters.page + 1 >= (result?.pagination.total_pages || 0)} onClick={() => change('page', filters.page + 1)}>Trang sau</button>
      </div>
    </div>
  </div>;
};

function FilterGroup({ title, name, items, value, onChange }) {
  return <fieldset className="build-filter-group"><legend>{title}</legend>
    {items.map(item => <label key={item.value} className={`build-filter-option${value === item.value ? ' is-active' : ''}`}>
      <input type="radio" name={name} value={item.value} checked={value === item.value} onChange={() => onChange(item.value)} />
      <span>{item.label}</span>
    </label>)}
  </fieldset>;
}

function ProductRow({ product, maximum, selected, onSelect }) {
  const [qty, setQty] = useState(1);
  const valid = Number.isInteger(qty) && qty >= 1 && qty <= maximum;
  return <div className={`build-product-row${selected ? ' is-selected' : ''}`}>
    <div className="build-product-info">
      {product.anh_dai_dien ? <img src={product.anh_dai_dien} alt={product.ten_san_pham} className="build-product-img" /> : <div className="build-product-img build-product-no-image">Chưa có ảnh</div>}
      <div className="build-product-details">
        <div className="build-product-title">{product.ten_san_pham}</div>
        <p>{product.ten_phien_ban}{selected && ' · Đang chọn'}</p>
        <div className="build-product-specs">
          <span>MÃ SP: {product.ma_san_pham}</span>
          <span>{product.thuong_hieu?.ten_thuong_hieu}</span>
          <span>BẢO HÀNH: {product.bao_hanh_thang == null ? 'Chưa cung cấp' : `${product.bao_hanh_thang} tháng`}</span>
          {Object.entries(product.thong_so_chinh || {}).map(([key, value]) => <span key={key}>{specLabels[key] || key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>)}
          {product.ket_qua_socket && <strong className={product.ket_qua_socket === 'KHOP_SOCKET' ? 'status-ok' : 'build-warning'}>{socketLabels[product.ket_qua_socket]}</strong>}
        </div>
      </div>
    </div>
    <div className="build-product-stock-price">
      <div className="build-product-stock"><span>KHO HÀNG</span><strong>{product.ton_co_the_ban > 0 ? `CÒN ${product.ton_co_the_ban}` : 'HẾT HÀNG'}</strong></div>
      <div className="build-product-price">{money(product.gia_ban_le)}</div>
    </div>
    <div className="build-product-action">
      <label className="build-product-qty">SỐ LƯỢNG
        <div className="qty-controls">
          <button aria-label={`Giảm số lượng ${product.ten_san_pham}`} disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button>
          <input aria-label={`Số lượng ${product.ten_san_pham}`} type="number" min="1" max={maximum} value={qty} onChange={e => setQty(e.target.value === '' ? '' : Number(e.target.value))} />
          <button aria-label={`Tăng số lượng ${product.ten_san_pham}`} disabled={qty >= maximum} onClick={() => setQty(Number(qty) + 1)}>+</button>
        </div>
      </label>
      {!valid && <span className="build-warning">{!Number.isInteger(qty) || qty < 1 ? 'Số lượng phải là số nguyên từ 1.' : 'Số lượng lựa chọn vượt quá số lượng có thể bán.'}</span>}
      <button className="btn-add-config" onClick={() => onSelect(qty)} disabled={!product.co_the_chon || !valid}>THÊM VÀO CẤU HÌNH</button>
    </div>
  </div>;
}

export default ComponentSelectionModal;
