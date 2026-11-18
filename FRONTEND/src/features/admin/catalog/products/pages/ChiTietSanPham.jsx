// Admin product screen: ChiTietSanPham.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilAlt, HiOutlineOfficeBuilding } from 'react-icons/hi';
import FormCard from '../../../../../shared/components/ui/FormCard';
import DetailTablePagination from '../../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination, {
  DETAIL_TABLE_PAGE_SIZE,
} from '../../../../../hooks/useDetailTablePagination';
import { getProductDetail } from '../api/productApi';
import { WarrantySummary, warrantyText } from '../../components/CatalogPolicies';
import './ChiTietSanPham.css';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const total = (items, field) => items.reduce((sum, item) => sum + Number(item[field] || 0), 0);

function warehouses(product) {
  if (product.isCombo) return [];

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
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const componentPagination = useDetailTablePagination(product?.comboItems);
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
      <main className="detail-page">
        <p>{error}</p>
        <button
          className="detail-btn detail-btn--outline"
          onClick={() => navigate('/admin/san-pham/danh-sach-san-pham')}
        >
          Quay lại
        </button>
      </main>
    );
  if (!product)
    return (
      <main className="detail-page">
        <p>Đang tải sản phẩm...</p>
      </main>
    );

  const isCombo = product.phanLoai === 'Theo bộ (Combo)';
  const variants = product.variants || [];
  const hasVariantTable = !isCombo && variants.length > 0;
  const components = product.comboItems || [];
  const componentTotal = total(components, 'giaNhap') || total(components, 'donGia');
  const hasVariantPrice = !isCombo && variants.length > 0;
  const profitOnCost =
    hasVariantPrice && product.giaNhap > 0
      ? Math.round(((product.giaBanLe - product.giaNhap) / product.giaNhap) * 100)
      : null;
  const storage = warehouses(product);
  const storageIncoming = total(storage, 'dangVe');
  const edit = () => navigate(`/admin/san-pham/them-san-pham/${encodeURIComponent(product.id)}`);

  return (
    <main className="detail-page detail-page--product">
      <nav className="detail-breadcrumb">
        <span>SẢN PHẨM</span>
        <b>›</b>
        <span>DANH SÁCH SẢN PHẨM</span>
        <b>›</b>
        <strong>CHI TIẾT SẢN PHẨM</strong>
      </nav>
      <section className="detail-hero">
        <div className="detail-hero__identity">
          <h1>{product.tenSanPham}</h1>
          <div className="detail-hero__meta">
            <span className="detail-code">{product.maSanPham || '—'}</span>
            <StatusPill>{product.trangThaiBan}</StatusPill>
          </div>
        </div>
        <div className="detail-hero__actions">
          <button
            className="detail-btn detail-btn--outline"
            onClick={() => navigate('/admin/san-pham/danh-sach-san-pham')}
          >
            <HiOutlineArrowLeft />
            Quay lại
          </button>
          <button className="detail-btn detail-btn--red" onClick={edit}>
            <HiOutlinePencilAlt />
            Sửa sản phẩm
          </button>
        </div>
      </section>

      <section className="detail-stats" aria-label="Giá và tỷ lệ lãi">
        <Stat
          label="GIÁ BÁN LẺ"
          value={hasVariantPrice ? money(product.giaBanLe) : '—'}
          caption={hasVariantPrice ? 'Phiên bản đầu tiên' : 'Chưa có dữ liệu'}
          tone={hasVariantPrice ? 'red' : ''}
        />
        <Stat
          label="GIÁ NHẬP"
          value={hasVariantPrice ? money(product.giaNhap) : '—'}
          caption={hasVariantPrice ? 'Giá vốn bình quân' : 'Chưa có dữ liệu'}
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

      {isCombo && (
        <WarrantySummary
          isCombo
          months={product.warrantyMonths}
          components={product.components}
          capacity={product.assemblyCapacity}
        />
      )}

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
              <Badge>{isCombo ? 'SẢN PHẨM THEO BỘ (COMBO)' : 'SẢN PHẨM ĐƠN'}</Badge>
            </Info>
            <Info label="Thương hiệu">{product.thuongHieu || '—'}</Info>
            <Info label="Danh mục">{product.danhMuc || '—'}</Info>
            <Info label="Thuế">{product.vat ? `VAT ${product.vat}` : '—'}</Info>

            {!isCombo && (
              <Info label="Bảo hành">
                <span className={product.warrantyMonths > 0 ? 'detail-warranty-value' : undefined}>
                  {warrantyText(product.warrantyMonths)}
                </span>
              </Info>
            )}

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

            {isCombo && (
              <Info label="Tổng vốn linh kiện">
                <strong className="detail-red">{money(componentTotal)}</strong>
                <small>Tổng từ {components.length} linh kiện</small>
              </Info>
            )}
          </dl>
        </FormCard>
      </div>

      <FormCard
        title="Chi tiết sản phẩm"
        headerRight={
          <button className="detail-edit-mini" onClick={edit}>
            <HiOutlinePencilAlt /> Sửa
          </button>
        }
        className="detail-card detail-content-card"
      >
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

      {isCombo && (
        <FormCard
          title="Thành phần sản phẩm (combo)"
          headerRight={
            <>
              <Badge>{components.length} LINH KIỆN</Badge>
              <strong className="detail-header-total">TỔNG: {money(componentTotal)}</strong>
            </>
          }
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
                  <th>#</th>
                  <th>TÊN SẢN PHẨM</th>
                  <th>MÃ SẢN PHẨM</th>
                  <th>ĐƠN GIÁ</th>
                  <th>SỐ LƯỢNG</th>
                  <th>THÀNH TIỀN</th>
                </tr>
              </thead>
              <tbody>
                {componentPagination.visibleItems.map((item, index) => {
                  const line = Number(item.giaNhap || item.donGia || 0) * (item.qty || 1);
                  return (
                    <tr key={`${item.id}-${index}`}>
                      <td>
                        {(componentPagination.currentPage - 1) * DETAIL_TABLE_PAGE_SIZE + index + 1}
                      </td>
                      <td className="detail-name">{item.tenSanPham}</td>
                      <td>
                        <span className="detail-code">{item.maSanPham}</span>
                      </td>
                      <td>{money(item.giaNhap || item.donGia)}</td>
                      <td>{item.qty || 1}</td>
                      <td className="detail-red">{money(line)}</td>
                    </tr>
                  );
                })}
                <tr className="detail-total-row">
                  <td colSpan="5">TỔNG VỐN</td>
                  <td className="detail-red">{money(componentTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <DetailTablePagination
            totalItems={components.length}
            currentPage={componentPagination.currentPage}
            onPageChange={componentPagination.onPageChange}
            idPrefix="product-components"
          />
        </FormCard>
      )}
      {hasVariantTable && (
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
      )}

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
