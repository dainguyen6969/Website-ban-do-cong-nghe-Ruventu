// Admin product-combo screen: ChiTietCombo.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormCard from '../../../../../shared/components/ui/FormCard';
import StopComboModal from '../components/StopComboModal';
import DetailTablePagination from '../../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../../hooks/useDetailTablePagination';
import { deactivateCombo, getComboDetail } from '../api/comboApi';
import fallbackImage from '../../../../../assets/hero.png';
import './ChiTietCombo.css';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const stopped = (status) => String(status || '').trim().startsWith('Ng');

export default function ChiTietCombo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getComboDetail(id, controller.signal)
      .then(setCombo)
      .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError.message || 'Không thể tải chi tiết combo.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reloadKey]);

  const detail = useMemo(() => {
    if (!combo) return null;
    const enriched = combo.components.map((item) => ({ ...item, image: item.image || fallbackImage }));
    const minCapacity = enriched.length ? Math.min(...enriched.map((item) => item.capacity)) : 0;
    const bottleneck = enriched.find((item) => item.capacity === minCapacity) || null;
    return { components: enriched, bottleneck, sellable: minCapacity };
  }, [combo]);
  const componentPagination = useDetailTablePagination(detail?.components);

  if (loading || error || !combo) return <main className="combo-detail-page"><div className="combo-empty" role={error ? 'button' : undefined} onClick={error ? () => setReloadKey((value) => value + 1) : undefined}>{loading ? 'Đang tải chi tiết combo...' : `${error || 'Không tìm thấy combo.'} Nhấn để thử lại.`}</div></main>;
  const images = combo.images?.length ? combo.images : [combo.image || fallbackImage];
  const specs = combo.specs?.length ? combo.specs : [
    { name: 'CPU', value: combo.components[0]?.name || 'Theo cấu hình combo' },
    { name: 'GPU', value: combo.components[1]?.name || 'Theo cấu hình combo' },
    { name: 'RAM', value: combo.components[2]?.name || 'Theo cấu hình combo' },
    { name: 'SSD', value: combo.components[3]?.name || 'Theo cấu hình combo' },
  ];
  const description = combo.description || `${combo.name} được tối ưu để mang lại hiệu suất ổn định. Các thành phần được lựa chọn và kiểm tra tương thích trước khi đóng gói thành Combo.`;

  const confirmStop = async () => {
    try { await deactivateCombo(combo.id); setShowStopModal(false); navigate('/kho-hang/combo-san-pham'); }
    catch (requestError) { setShowStopModal(false); setError(requestError.message || 'Không thể ngưng kinh doanh combo.'); }
  };

  return <main className="combo-detail-page">
    <div className="combo-page-heading"><div><div className="combo-secondary-breadcrumb"><span>Sản phẩm</span><b>›</b><span>Quản lý kho</span><b>›</b><span>Combo sản phẩm</span><b>›</b><strong>Chi tiết</strong></div><h1>CHI TIẾT COMBO</h1></div><div className="heading-actions"><button className="combo-detail-edit" onClick={() => navigate(`/kho-hang/combo-san-pham/them-moi?id=${combo.id}`)}>SỬA COMBO</button>{!stopped(combo.status) && <button className="combo-detail-stop" onClick={() => setShowStopModal(true)}>NGƯNG KINH DOANH</button>}</div></div>
    <div className="combo-detail-content">
      <FormCard title="Thông tin tổng quan"><div className="combo-overview"><div className="combo-identity"><img src={combo.image || fallbackImage} alt={combo.name} /><div><h2>{combo.name}</h2><div className="overview-badges"><code>{combo.code}</code><span>BỘ PC / COMBO</span><b className={stopped(combo.status) ? 'status-stopped' : 'status-selling'}>{combo.status.toUpperCase()}</b></div></div></div><div className="overview-stats"><div><strong>{detail.sellable}</strong><small>CÓ THỂ BÁN</small></div><div><strong>{money(combo.price)}</strong><small>GIÁ BÁN LẺ</small></div><div><strong>{combo.weight || 0} kg</strong><small>KHỐI LƯỢNG</small></div></div></div></FormCard>
      <FormCard title="Hình ảnh combo"><div className="combo-gallery"><div className="gallery-preview"><img src={images[selectedImage]} alt={`${combo.name} - ảnh ${selectedImage + 1}`} /></div><div className="gallery-order"><label>THỨ TỰ ẢNH</label>{images.map((image, index) => <button key={`${image}-${index}`} className={selectedImage === index ? 'selected' : ''} onClick={() => setSelectedImage(index)}><img src={image} alt="" /><span className={index === 0 ? 'main-image-label' : ''}>{index === 0 ? '★ Ảnh chính' : `Ảnh ${index + 1}`}</span></button>)}</div></div></FormCard>
      <FormCard title="Mô tả sản phẩm"><div className="combo-description">{description.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></FormCard>
      <FormCard title="Thông số kỹ thuật"><table className="detail-specs"><tbody>{specs.map((spec, index) => <tr key={spec.id || `${spec.name}-${index}`}><th>{spec.name}</th><td>{spec.value}</td></tr>)}</tbody></table></FormCard>
      <FormCard title="Thành phần combo" className="detail-components-card"><div className="detail-components"><table><thead><tr><th>ẢNH</th><th>TÊN SẢN PHẨM</th><th>TÊN PHIÊN BẢN</th><th>MÃ SẢN PHẨM</th><th>SKU / MÃ VẠCH</th><th>SỐ LƯỢNG / COMBO</th><th>GIÁ COMPONENT</th><th>TỒN CÓ THỂ BÁN</th><th>QUẢN LÝ</th></tr></thead><tbody>{componentPagination.visibleItems.map((item) => { const isBottleneck = item === detail.bottleneck; return <tr key={`${item.sku}-${item.name}`} className={isBottleneck ? 'bottleneck-row' : ''}><td><img src={item.image} alt="" /></td><td><strong>{item.name}</strong></td><td>{item.variant}</td><td><code>{item.productCode}</code></td><td><code>{item.sku}</code></td><td className="detail-number">{item.qty}</td><td><strong>{money(item.price)}</strong></td><td className="detail-stock">{item.stock}</td><td><button type="button" className="combo-detail-edit" onClick={() => navigate(`/kho-hang/quan-ly-phien-ban/chi-tiet/${item.variantId}`)}>TỒN KHO</button><button type="button" className="combo-detail-edit" onClick={() => navigate(`/kho-hang/danh-sach-serial?phien_ban_id=${item.variantId}&combo=${encodeURIComponent(combo.name)}`)}>SERIAL</button>{isBottleneck && <small>BOTTLENECK</small>}</td></tr>; })}</tbody></table></div><DetailTablePagination totalItems={detail.components.length} currentPage={componentPagination.currentPage} onPageChange={componentPagination.onPageChange} idPrefix="combo-components" /></FormCard>
      <FormCard title="Tồn combo"><div className="combo-inventory-summary"><div className="inventory-total"><small>CÓ THỂ BÁN</small><strong>{detail.sellable}</strong><p>Tính tự động: MIN(tồn khả dụng ÷ số lượng cần) qua tất cả thành phần</p></div>{detail.bottleneck && <div className="inventory-limit"><small>THÀNH PHẦN GIỚI HẠN (BOTTLENECK)</small><h3>{detail.bottleneck.name}</h3><p>{detail.bottleneck.variant} · {detail.bottleneck.sku}</p><div><span><small>TỒN CÓ THỂ BÁN</small><b>{detail.bottleneck.stock}</b></span><span><small>SỐ LƯỢNG / COMBO</small><b>{detail.bottleneck.qty}</b></span><span><small>KHẢ NĂNG</small><b>{detail.bottleneck.capacity} Combo</b></span></div></div>}</div></FormCard>
      <FormCard title="Phân loại & trạng thái"><div className="detail-classification"><div><small>DANH MỤC</small><strong>{combo.category || 'PC Build'}</strong></div><div><small>THƯƠNG HIỆU</small><strong>{combo.brand || 'Custom Build'}</strong></div><div><small>THUẾ VAT</small><strong>{Number(combo.vat ?? 10)}%</strong></div><div><small>TRẠNG THÁI</small><strong className={stopped(combo.status) ? 'text-red' : ''}>{combo.status}</strong></div></div></FormCard>
    </div>
    <StopComboModal combo={showStopModal ? combo : null} onCancel={() => setShowStopModal(false)} onConfirm={confirmStop} />
  </main>;
}
