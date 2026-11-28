import { hasAdminPermission } from '../../../../../auth/roleModel';
import { useAdminPermissions } from '../../../../../shared/components/ui/PermissionGate';
// Admin product screen: ChiTietSanPham.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Boxes, ClipboardList, FileText, Warehouse } from 'lucide-react';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import FormCard from '../../../../../shared/components/ui/FormCard';
import DetailTablePagination from '../../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../../hooks/useDetailTablePagination';
import { getProductDetail } from '../api/productApi';
import { warrantyText } from '../../components/CatalogPolicies';
import { CatalogDetailHeader, CatalogDetailNavigation } from '../../components/CatalogDetailLayout';
import './ChiTietSanPham.css';
import AdminPageAction from '../../../../../shared/components/ui/AdminPageAction';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const total = (items, field) => items.reduce((sum, item) => sum + Number(item[field] || 0), 0);

function warehouses(product) {
  return [
    {
      name: 'Kho mặc định',
      tonKho: product.tonKho ?? 0,
      coTheBan: product.coTheBan ?? 0,
      dangVe: 0,
      location: '—',
    },
  ];
}

function StatusPill({ children }) {
  const tone =
    children === 'Đang kinh doanh' ? 'green' : children === 'Ngừng kinh doanh' ? 'red' : 'neutral';

  return <span data-admin-status={tone}>{children || '—'}</span>;
}

function Badge({ children }) {
  return <span className="detail-badge">{children}</span>;
}

export default function ChiTietSanPham() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const canEdit = hasAdminPermission(useAdminPermissions()?.access, 'san_pham', 'sua');
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('overview');
  const variantPagination = useDetailTablePagination(product?.variants);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    getProductDetail(decodeURIComponent(productId || ''), controller.signal)
      .then(setProduct)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      });
    return () => controller.abort();
  }, [productId]);

  if (error)
    return (
      <main className="detail-page catalog-detail-page">
        <div className="catalog-detail-content catalog-detail-feedback">
          <p role="alert">{error}</p>
          <AdminPageAction variant="utility" icon="back"
            onClick={() => navigate('/admin/san-pham/danh-sach-san-pham')}
          >
            Quay lại
          </AdminPageAction>
        </div>
      </main>
    );
  if (!product)
    return (
      <main className="detail-page catalog-detail-page">
        <p className="catalog-detail-content" role="status">Đang tải sản phẩm...</p>
      </main>
    );

  if (product.isCombo) {
    return <Navigate to={`/kho-hang/combo-san-pham/chi-tiet/${product.id}`} replace />;
  }

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const profitOnCost =
    hasVariants && product.giaNhap > 0
      ? Math.round(((product.giaBanLe - product.giaNhap) / product.giaNhap) * 100)
      : null;
  const storage = warehouses(product);
  const storageIncoming = total(storage, 'dangVe');
  const edit = () => navigate(`/admin/san-pham/them-san-pham/${encodeURIComponent(product.id)}`);
  const groups = [
    ['overview', 'Tổng quan', ClipboardList],
    ...(hasVariants ? [['variants', 'Phiên bản', Boxes]] : []),
    ['stock', 'Tồn kho', Warehouse],
    ['content', 'Mô tả và thông số', FileText],
  ];
  const activeGroup = groups.some(([name]) => name === selectedGroup) ? selectedGroup : 'overview';

  return (
    <main className="detail-page detail-page--product catalog-detail-page">
      <CatalogDetailHeader
        context="Sản phẩm / Chi tiết"
        title={product.tenSanPham}
        metadata={
          <>
            <span className="detail-code">{product.maSanPham || '—'}</span>
            <StatusPill>{product.trangThaiBan}</StatusPill>
          </>
        }
        actions={
          <>
            <AdminPageAction variant="utility" icon="back" onClick={() => navigate('/admin/san-pham/danh-sach-san-pham')}>
              Quay lại
            </AdminPageAction>
            <AdminPageAction compact variant="operation" icon="edit" disabled={!canEdit} onClick={edit}>
              Sửa sản phẩm
            </AdminPageAction>
          </>
        }
      />
      <CatalogDetailNavigation groups={groups} active={activeGroup} onChange={setSelectedGroup} />
      <div className="catalog-detail-content">
        <section id="catalog-overview" className="catalog-detail-section" hidden={activeGroup !== 'overview'}>
          <section className="detail-stats" aria-label="Giá và tỷ lệ lãi">
            <Stat
              label="GIÁ BÁN LẺ"
              value={hasVariants ? money(product.giaBanLe) : '—'}
              caption={hasVariants ? 'Phiên bản đầu tiên' : 'Chưa có dữ liệu'}
              tone={hasVariants ? 'red' : ''}
            />
            <Stat
              label="GIÁ NHẬP"
              value={hasVariants ? money(product.giaNhap) : '—'}
              caption={hasVariants ? 'Giá vốn bình quân' : 'Chưa có dữ liệu'}
            />
            <Stat
              label="GIÁ BÁN BUÔN"
              value={product.giaBanBuon == null ? '—' : money(product.giaBanBuon)}
              caption={product.giaBanBuon == null ? 'Chưa có dữ liệu' : 'Cho đại lý'}
              tone={product.giaBanBuon == null ? '' : 'blue'}
            />
            <Stat
              label="LÃI TRÊN GIÁ VỐN"
              value={profitOnCost == null ? '—' : `${profitOnCost}%`}
              caption={profitOnCost == null ? 'Chưa có giá vốn' : 'So với giá nhập'}
              tone={profitOnCost > 0 ? 'green' : profitOnCost < 0 ? 'red' : ''}
            />
          </section>

          <div className="detail-grid">
            <FormCard title="Thông tin chính">
              <dl className="detail-info-list">
                <Info label="Ảnh sản phẩm">
                  {product.hinhAnh ? (
                    <img className="detail-image" src={product.hinhAnh} alt={product.tenSanPham} />
                  ) : (
                    <div className="detail-image detail-image--empty">Chưa có ảnh</div>
                  )}
                </Info>
                <Info label="Đơn vị tính">{product.donViTinh || '—'}</Info>
                <Info label="Khối lượng">{product.khoiLuong || '—'}</Info>
              </dl>
            </FormCard>

            <FormCard title="Thuộc tính & phân loại">
              <dl className="detail-info-list">
                <Info label="Loại sản phẩm">
                  <Badge>SẢN PHẨM ĐƠN</Badge>
                </Info>
                <Info label="Thương hiệu">{product.thuongHieu || '—'}</Info>
                <Info label="Danh mục">{product.danhMuc || '—'}</Info>
                <Info label="Thuế">{product.vat ? `VAT ${product.vat}` : '—'}</Info>

                <Info label="Bảo hành">
                  <span className={product.warrantyMonths > 0 ? 'detail-warranty-value' : undefined}>
                    {warrantyText(product.warrantyMonths)}
                  </span>
                </Info>

                <Info label="Tồn kho tổng">
                  <div className="detail-stock-pair">
                    <div>
                      <strong>{product.tonKho ?? '—'}</strong>
                      <small>Tổng tồn</small>
                    </div>
                    <div>
                      <strong className={product.coTheBan > 0 ? 'detail-green' : undefined}>
                        {product.coTheBan ?? '—'}
                      </strong>
                      <small>Có thể bán</small>
                    </div>
                  </div>
                </Info>

                {product.tags?.length > 0 && (
                  <Info label="Tags">
                    <div className="detail-chip-set">
                      {product.tags.map((tag) => (
                        <span className="detail-chip" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Info>
                )}

                {product.attributes?.length > 0 && (
                  <Info label="Thuộc tính">
                    <div className="detail-chip-set">
                      {product.attributes.map((tag) => (
                        <Badge key={typeof tag === 'string' ? tag : tag.name}>
                          {typeof tag === 'string' ? tag : `${tag.name}: ${tag.values.join(', ')}`}
                        </Badge>
                      ))}
                    </div>
                  </Info>
                )}

              </dl>
            </FormCard>
          </div>

        </section>

        {hasVariants && (
          <section id="catalog-variants" className="catalog-detail-section" hidden={activeGroup !== 'variants'}>
            <FormCard title="Thông tin phiên bản" className="detail-card">
              <div
                className="admin-table-scroll admin-table-scroll--embedded"
                tabIndex={0}
                role="region"
                aria-label="Bảng dữ liệu liên quan"
              >
                <table className="detail-table admin-data-table admin-data-table--records">
                  <thead>
                    <tr>
                      <th>PHIÊN BẢN</th>
                      <th>MÃ VẠCH</th>
                      <th>GIÁ BÁN</th>
                      <th>GIÁ NHẬP</th>
                      <th>SERIAL</th>
                      <th>THUỘC TÍNH</th>
                      <th>TỒN THỰC TẾ</th>
                      <th>CÓ THỂ BÁN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantPagination.visibleItems.map((variant) => (
                      <tr key={variant.id}>
                        <td>{variant.name}</td>
                        <td>{variant.sku || '—'}</td>
                        <td>{money(variant.giaBanLe)}</td>
                        <td>{money(variant.giaNhap)}</td>
                        <td>{variant.serialMode === true ? 'Có' : 'Không'}</td>
                        <td>
                          {variant.attributes.length
                            ? variant.attributes.map((attribute) => (
                                <div key={attribute.id}>
                                  {attribute.ten_thuoc_tinh}: {attribute.gia_tri}
                                </div>
                              ))
                            : '—'}
                        </td>
                        <td>{variant.tonKho ?? '—'}</td>
                        <td>{variant.available ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DetailTablePagination
                totalItems={variants.length}
                currentPage={variantPagination.currentPage}
                onPageChange={variantPagination.onPageChange}
                idPrefix="product-variants"
              />
            </FormCard>
          </section>
        )}

        <section id="catalog-stock" className="catalog-detail-section" hidden={activeGroup !== 'stock'}>
          <FormCard
            title="Thông tin tồn kho"
            headerRight={storage.length > 0 ? <Badge>{storage.length} KHO</Badge> : null}
            className="detail-card"
          >
            <div
              className="admin-table-scroll admin-table-scroll--embedded"
              tabIndex={0}
              role="region"
              aria-label="Bảng dữ liệu liên quan"
            >
              <table className="detail-table admin-data-table admin-data-table--records">
                <thead>
                  <tr>
                    <th>KHO HÀNG</th>
                    <th>TỒN KHO</th>
                    <th>CÓ THỂ BÁN</th>
                    <th>HÀNG ĐANG VỀ</th>
                    <th>ĐIỂM LƯU KHO</th>
                  </tr>
                </thead>
                <tbody>
                  {storage.map((row) => (
                    <tr key={row.name}>
                      <td className="detail-name">
                        <HiOutlineOfficeBuilding /> {row.name}
                      </td>
                      <td>{row.tonKho}</td>
                      <td className="detail-green">{row.coTheBan}</td>
                      <td className="detail-incoming">{row.dangVe ? `↑ ${row.dangVe}` : '—'}</td>
                      <td>
                        <Badge>{row.location}</Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="detail-total-row">
                    <td>TỔNG CỘNG</td>
                    <td>{product.tonKho}</td>
                    <td className="detail-green">{product.coTheBan ?? product.tonKho}</td>
                    <td className="detail-incoming">{storageIncoming}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </FormCard>
        </section>
        <section id="catalog-content" className="catalog-detail-section" hidden={activeGroup !== 'content'}>
          <FormCard title="Nội dung sản phẩm" className="detail-card detail-content-card">
            <section className="detail-description">
              <h4>Mô tả sản phẩm</h4>
              <div
                dangerouslySetInnerHTML={{
                  __html: product.moTa || 'Chưa có mô tả.',
                }}
              />
            </section>
            <section>
              <h4>Thông số kỹ thuật</h4>
              <table className="detail-table detail-spec-table">
                <thead>
                  <tr>
                    <th>THÔNG SỐ</th>
                    <th>GIÁ TRỊ</th>
                  </tr>
                </thead>
                <tbody>
                  {!product.specs?.length && (
                    <tr>
                      <td colSpan={2}>Chưa có thông số kỹ thuật cho sản phẩm này.</td>
                    </tr>
                  )}
                  {(product.specs || []).map((spec, index) => (
                    <tr key={spec.id || index}>
                      <td>{spec.name}</td>
                      <td>{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </FormCard>
        </section>
      </div>
    </main>
  );
}
function Stat({ label, value, caption, tone = '' }) {
  return (
    <div className="detail-stat">
      <span>{label}</span>
      <strong className={tone ? `detail-${tone}` : ''}>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}
function Info({ label, children }) {
  return (
    <div className="detail-info">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
