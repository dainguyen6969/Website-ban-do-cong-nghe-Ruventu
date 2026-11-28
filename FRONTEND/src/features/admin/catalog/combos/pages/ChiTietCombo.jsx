import { hasAdminPermission } from '../../../../../auth/roleModel';
import { useAdminPermissions } from '../../../../../shared/components/ui/PermissionGate';
// Admin product-combo screen: ChiTietCombo.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Boxes, ClipboardList, FileText, Warehouse } from 'lucide-react';
import FormCard from '../../../../../shared/components/ui/FormCard';
import AdminHelp from '../../../../../shared/components/ui/AdminHelp';
import StopComboModal from '../components/StopComboModal';
import { deactivateCombo, getComboDetail } from '../api/comboApi';
import fallbackImage from '../../../../../assets/hero.png';
import { warrantyText } from '../../components/CatalogPolicies';
import { CatalogDetailHeader, CatalogDetailNavigation } from '../../components/CatalogDetailLayout';
import './ChiTietCombo.css';
import AdminPageAction from '../../../../../shared/components/ui/AdminPageAction';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const stopped = (status) =>
  String(status || '')
    .trim()
    .startsWith('Ng');

const detailGroups = [
  ['overview', 'Tổng quan', ClipboardList],
  ['components', 'Linh kiện và bảo hành', Boxes],
  ['stock', 'Tồn combo', Warehouse],
  ['content', 'Mô tả, ảnh và thông số', FileText],
];

function comboDescriptionLines(value) {
  const text = String(value ?? '').trim();
  const splitLines = (source) =>
    source
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

  if (!/<[a-z][^>]*>/i.test(text)) return splitLines(text);

  // Chỉ đọc chữ; không gắn các thẻ HTML vào giao diện.
  const template = document.createElement('template');
  template.innerHTML = text;

  template.content
    .querySelectorAll('script, style, iframe, object, embed, template, noscript, svg')
    .forEach((node) => node.remove());

  template.content.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  template.content
    .querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, div, blockquote, tr')
    .forEach((node) => node.after('\n'));

  return splitLines(template.content.textContent || '');
}

function ComboWarranty({ components }) {
  const rows = components.map((item) => {
    const variant = item.variant?.trim();
    const name = item.name?.trim() || variant || 'Linh kiện';

    return (
      <li key={item.variantId ?? item.id}>
        <div>
          <span className="combo-warranty-name">{name}</span>
          <span className="combo-warranty-qty">×{item.qty}</span>
          {variant && variant !== name && <small>{variant}</small>}
        </div>
        <strong data-warranty-set={Number(item.warrantyMonths) > 0}>
          {warrantyText(item.warrantyMonths)}
        </strong>
      </li>
    );
  });

  return (
    <FormCard
      title="Bảo hành theo linh kiện"
      className="combo-warranty-card"
      headerRight={<span>{rows.length} linh kiện</span>}
    >
      {rows.length ? (
        <>
          <ul className="combo-warranty-list">{rows.slice(0, 4)}</ul>
          {rows.length > 4 && (
            <details className="combo-warranty-more">
              <summary>Xem thêm {rows.length - 4} linh kiện</summary>
              <ul className="combo-warranty-list">{rows.slice(4)}</ul>
            </details>
          )}
        </>
      ) : (
        <p className="combo-detail-muted">Chưa có cấu hình linh kiện.</p>
      )}
    </FormCard>
  );
}

export default function ChiTietCombo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const access = useAdminPermissions()?.access;
  const canEditCombo = hasAdminPermission(access, 'combo_san_pham', 'sua');
  const canStopCombo = hasAdminPermission(access, 'combo_san_pham', 'xoa');
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState('overview');

  useEffect(() => {
    const refresh = () => setReloadKey((value) => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getComboDetail(id, controller.signal)
      .then(setCombo)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError')
          setError(requestError.message || 'Không thể tải chi tiết combo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, reloadKey]);

  const detail = useMemo(() => {
    if (!combo) return null;

    const components = combo.components.map((item) => ({
      ...item,
      image: item.image || fallbackImage,
    }));

    return {
      components,
      capacity: combo.assemblyCapacity,
      bottleneck: components.find(
        (item) => item.capacity != null && item.capacity === combo.assemblyCapacity
      ),
    };
  }, [combo]);

  const descriptionLines = useMemo(
    () => comboDescriptionLines(combo?.description),
    [combo?.description]
  );

  if (!combo || combo.id !== Number(id))
    return (
      <main className="combo-detail-page catalog-detail-page">
        <div className="catalog-detail-content catalog-detail-feedback">
          <p role={error ? 'alert' : 'status'}>
            {loading ? 'Đang tải chi tiết combo...' : error || 'Không tìm thấy combo.'}
          </p>
          {!loading && (
            <AdminPageAction variant="utility" icon="reload" onClick={() => setReloadKey((value) => value + 1)}>
              Thử lại
            </AdminPageAction>
          )}
        </div>
      </main>
    );
  const images = combo.images?.length ? combo.images : [combo.image || fallbackImage];
  const imageIndex = Math.min(selectedImage, images.length - 1);
  const capacityTone =
    detail.capacity == null ? 'unknown' : detail.capacity > 0 ? 'ready' : 'empty';
  const specs = combo.specs ?? [];
  const confirmStop = async () => {
    if (!canStopCombo) return;
    try {
      await deactivateCombo(combo.id);
      setShowStopModal(false);
      navigate('/kho-hang/combo-san-pham');
    } catch (requestError) {
      setShowStopModal(false);
      setError(requestError.message || 'Không thể ngưng kinh doanh combo.');
    }
  };

  return (
    <main className="combo-detail-page catalog-detail-page">
      <CatalogDetailHeader
        context="Combo sản phẩm / Chi tiết"
        title={combo.name}
        metadata={
          <>
            <code className="combo-detail-code">{combo.code}</code>
            <span data-admin-status={stopped(combo.status) ? 'red' : 'green'}>{combo.status}</span>
          </>
        }
        actions={
          <>
            <AdminPageAction variant="utility" icon="back" onClick={() => navigate('/kho-hang/combo-san-pham')}>
              Quay lại
            </AdminPageAction>
            <AdminPageAction compact variant="operation" icon="edit" disabled={!canEditCombo}
              onClick={() => navigate(`/kho-hang/combo-san-pham/them-moi?id=${combo.id}`)}
            >
              Sửa combo
            </AdminPageAction>
            {canStopCombo && !stopped(combo.status) && (
              <AdminPageAction compact variant="danger" icon="stop" onClick={() => setShowStopModal(true)}>
                Ngưng kinh doanh
              </AdminPageAction>
            )}
          </>
        }
      />
      <CatalogDetailNavigation groups={detailGroups} active={activeGroup} onChange={setActiveGroup} />
      <div className="catalog-detail-content">
        {error && (
          <p className="combo-detail-error" role="alert">
            {error}
          </p>
        )}
        <section id="catalog-overview" className="catalog-detail-section" hidden={activeGroup !== 'overview'}>
          <FormCard title="Thông tin tổng quan">
            <div className="combo-overview">
              <img className="combo-overview-image" src={combo.image || fallbackImage} alt={combo.name} />
              <div className="overview-stats">
                <div>
                  <strong className="combo-capacity-value" data-tone={capacityTone}>
                    {detail.capacity ?? '—'}
                  </strong>
                  <small>SỐ BỘ CÓ THỂ LẮP</small>
                </div>
                <div>
                  <strong className="combo-price-value">{money(combo.price)}</strong>
                  <small>GIÁ BÁN LẺ</small>
                </div>
                <div>
                  <strong>{combo.weight || 0} kg</strong>
                  <small>KHỐI LƯỢNG</small>
                </div>
              </div>
            </div>
          </FormCard>
          <FormCard title="Phân loại & trạng thái">
            <div className="detail-classification">
              <div>
                <small>DANH MỤC</small>
                <strong>{combo.category || 'PC Build'}</strong>
              </div>
              <div>
                <small>THƯƠNG HIỆU</small>
                <strong>{combo.brand || 'Custom Build'}</strong>
              </div>
              <div>
                <small>THUẾ VAT</small>
                <strong>{Number(combo.vat ?? 10)}%</strong>
              </div>
              <div>
                <small>TRẠNG THÁI</small>
                <span data-admin-status={stopped(combo.status) ? 'red' : 'green'}>{combo.status}</span>
              </div>
            </div>
          </FormCard>
        </section>
        <section id="catalog-components" className="catalog-detail-section" hidden={activeGroup !== 'components'}>
          <FormCard
            title="Thành phần combo"
            className="detail-components-card"
            headerRight="Bảo hành theo linh kiện"
          >
            <div className="detail-components">
              <div
                className="admin-table-scroll admin-table-scroll--embedded"
                tabIndex={0}
                role="region"
                aria-label="Thành phần và bảo hành combo"
              >
                <table className="admin-data-table admin-data-table--records">
                  <thead>
                    <tr>
                      <th>ẢNH</th>
                      <th>TÊN SẢN PHẨM</th>
                      <th>TÊN PHIÊN BẢN</th>
                      <th>MÃ SẢN PHẨM</th>
                      <th>SKU / MÃ VẠCH</th>
                      <th>SỐ LƯỢNG / COMBO</th>
                      <th>GIÁ</th>
                      <th>TỒN CÓ THỂ BÁN</th>
                      <th scope="col">BẢO HÀNH</th>
                      <th>QUẢN LÝ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.components.map((item) => {
                      const isBottleneck = item === detail.bottleneck;
                      return (
                        <tr
                          key={`${item.sku}-${item.name}`}
                          className={isBottleneck ? 'bottleneck-row' : ''}
                        >
                          <td>
                            <img src={item.image} alt="" />
                          </td>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td>{item.variant}</td>
                          <td>
                            <code>{item.productCode}</code>
                          </td>
                          <td>
                            <code>{item.sku}</code>
                          </td>
                          <td className="detail-number">{item.qty}</td>
                          <td>
                            <strong>{money(item.price)}</strong>
                          </td>
                          <td className="detail-stock" data-stock-positive={item.stock > 0}>
                            {item.stock}
                          </td>
                          <td
                            className="combo-warranty-cell"
                            data-warranty-active={item.warrantyMonths > 0}
                          >
                            {warrantyText(item.warrantyMonths)}
                          </td>
                          <td>
                            <div className="combo-component-actions">
                              <button
                                type="button"
                                className="admin-table-view-action"
                                onClick={() =>
                                  navigate(`/kho-hang/quan-ly-phien-ban/chi-tiet/${item.variantId}`)
                                }
                              >
                                TỒN KHO
                              </button>
                              <button
                                type="button"
                                className="admin-table-view-action"
                                onClick={() =>
                                  navigate(
                                    `/kho-hang/danh-sach-serial?phien_ban_id=${item.variantId}&combo=${encodeURIComponent(combo.name)}`
                                  )
                                }
                              >
                                SERIAL
                              </button>
                            </div>
                            {isBottleneck && <small className="combo-limit-tag">GIỚI HẠN</small>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </FormCard>
        </section>
        <section id="catalog-stock" className="catalog-detail-section" hidden={activeGroup !== 'stock'}>
          <FormCard title="Tồn combo">
            <div className="combo-inventory-summary">
              <div className="inventory-total">
                <div className="admin-heading-with-help">
                  <small className="combo-capacity-label">SỐ BỘ CÓ THỂ LẮP</small>
                  <AdminHelp>
                    Hệ thống tính số bộ lắp được từ tồn có thể bán và số lượng cần cho một bộ của từng
                    linh kiện. Linh kiện lắp được ít bộ nhất quyết định số bộ combo có thể lắp.
                  </AdminHelp>
                </div>
                <strong className="combo-capacity-value" data-tone={capacityTone}>
                  {detail.capacity ?? '—'}
                </strong>
              </div>
              {detail.bottleneck && (
                <div className="inventory-limit">
                  <small>THÀNH PHẦN GIỚI HẠN</small>
                  <h3>{detail.bottleneck.name}</h3>
                  <p>
                    {detail.bottleneck.variant} · {detail.bottleneck.sku}
                  </p>
                  <div>
                    <span>
                      <small>TỒN CÓ THỂ BÁN</small>
                      <b>{detail.bottleneck.stock}</b>
                    </span>
                    <span>
                      <small>SỐ LƯỢNG / COMBO</small>
                      <b>{detail.bottleneck.qty}</b>
                    </span>
                    <span>
                      <small>KHẢ NĂNG</small>
                      <b>{detail.bottleneck.capacity} Combo</b>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </FormCard>
        </section>

        <section id="catalog-content" className="catalog-detail-section" hidden={activeGroup !== 'content'}>
          <div className="combo-detail-pair">
            <FormCard title="Mô tả sản phẩm">
              <div className="combo-description">
                {descriptionLines.length ? (
                  descriptionLines.map((line, index) => <p key={index}>{line}</p>)
                ) : (
                  <p className="combo-detail-muted">Chưa có mô tả.</p>
                )}
              </div>
            </FormCard>

            <div className="combo-detail-aside">
              <FormCard title="Hình ảnh combo">
                <div className="combo-media-preview">
                  <img
                    src={images[imageIndex]}
                    alt={`${combo.name} – ảnh ${imageIndex + 1} trên ${images.length}`}
                  />
                </div>

                {images.length > 1 && (
                  <div className="combo-media-thumbs" role="group" aria-label="Chọn ảnh combo">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        aria-label={`Ảnh ${index + 1}${image === combo.image ? ' (ảnh chính)' : ''}`}
                        aria-pressed={index === imageIndex}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img src={image} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </FormCard>

              <FormCard title="Thông số kỹ thuật">
                {specs.length ? (
                  <table className="detail-specs">
                    <tbody>
                      {specs.map((spec, index) => (
                        <tr key={spec.id || `${spec.name}-${index}`}>
                          <th scope="row">{spec.name}</th>
                          <td>{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="combo-detail-muted">Chưa khai báo thông số kỹ thuật.</p>
                )}
              </FormCard>
            </div>
          </div>
        </section>
      </div>
      <StopComboModal
        combo={canStopCombo && showStopModal ? combo : null}
        onCancel={() => setShowStopModal(false)}
        onConfirm={confirmStop}
      />
    </main>
  );
}
