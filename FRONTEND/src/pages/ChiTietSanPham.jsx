import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilAlt, HiOutlineOfficeBuilding } from 'react-icons/hi';
import FormCard from '../components/FormCard';
import DetailTablePagination from '../components/DetailTablePagination';
import useDetailTablePagination, { DETAIL_TABLE_PAGE_SIZE } from '../hooks/useDetailTablePagination';
import { getMockProductById } from '../data/mockProducts';
import './ChiTietSanPham.css';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const total = (items, field) => items.reduce((sum, item) => sum + Number(item[field] || 0), 0);

function warehouses(product) {
  const stock = Number(product.tonKho || 0);
  const sellable = Math.min(stock, Number(product.coTheBan ?? stock));
  const stocks = [Math.ceil(stock * .55), Math.floor(stock * .33), 0];
  stocks[2] = stock - stocks[0] - stocks[1];
  const sellables = [Math.min(stocks[0], Math.ceil(sellable * .5)), Math.min(stocks[1], Math.floor(sellable * .35)), 0];
  sellables[2] = sellable - sellables[0] - sellables[1];
  return [
    ['Kho Tổng Hà Nội', stocks[0], sellables[0], 5, 'Kệ A1-02'],
    ['Kho Chi Nhánh HCM', stocks[1], sellables[1], 0, 'Kệ B3-07'],
    ['Kho Chi Nhánh Đà Nẵng', stocks[2], sellables[2], 3, 'Kệ C2-01'],
  ].map(([name, tonKho, coTheBan, dangVe, location]) => ({ name, tonKho, coTheBan, dangVe, location }));
}

function StatusPill({ children }) { return <span className="detail-status"><i />{children}</span>; }
function Badge({ children }) { return <span className="detail-badge">{children}</span>; }

export default function ChiTietSanPham() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = getMockProductById(decodeURIComponent(productId || ''));
  const componentPagination = useDetailTablePagination(product?.comboItems);
  const variantPagination = useDetailTablePagination(product?.variants);
  if (!product) return <Navigate to="/admin/san-pham/danh-sach-san-pham" replace />;

  const isCombo = product.phanLoai === 'Theo bộ (Combo)';
  const variants = product.variants || [];
  const hasVariantTable = !isCombo && variants.length > 1;
  const components = product.comboItems || [];
  const componentTotal = total(components, 'giaNhap') || total(components, 'donGia');
  const margin = product.giaNhap ? Math.round(((product.giaBanLe - product.giaNhap) / product.giaNhap) * 100) : 0;
  const storage = warehouses(product);
  const storageIncoming = total(storage, 'dangVe');
  const edit = () => navigate(`/admin/san-pham/them-san-pham/${encodeURIComponent(product.id)}`);

  return <main className="detail-page">
    <nav className="detail-breadcrumb"><span>SẢN PHẨM</span><b>›</b><span>DANH SÁCH SẢN PHẨM</span><b>›</b><strong>CHI TIẾT SẢN PHẨM</strong></nav>
    <section className="detail-hero">
      <div className="detail-hero__identity"><StatusPill>{product.trangThaiBan}</StatusPill><h1>{product.tenSanPham}</h1><span className="detail-code">{product.maSanPham}</span><span className="detail-separator">·</span><span className="detail-type-text">{isCombo ? 'Sản phẩm theo bộ (Combo)' : 'Sản phẩm đơn'}</span><span className="detail-separator">·</span><strong className="detail-hero-price">{money(product.giaBanLe)}</strong></div>
      <div className="detail-hero__actions"><button className="detail-btn detail-btn--outline" onClick={() => navigate('/admin/san-pham/danh-sach-san-pham')}><HiOutlineArrowLeft />Quay lại</button><button className="detail-btn detail-btn--red" onClick={edit}><HiOutlinePencilAlt />Sửa sản phẩm</button></div>
    </section>
    <section className="detail-stats">
      <Stat label="GIÁ BÁN LẺ" value={money(product.giaBanLe)} caption="Giá niêm yết" tone="red" />
      <Stat label="GIÁ NHẬP" value={money(product.giaNhap)} caption="Giá vốn bình quân" />
      <Stat label="GIÁ BÁN BUÔN" value={money(product.giaBanBuon)} caption="Cho đại lý" tone="blue" />
      <Stat label="BIÊN LỢI NHUẬN" value={`${margin}%`} caption="Trên giá vốn" tone="green" />
    </section>

    <div className="detail-grid">
      <FormCard title="Thông tin chính"><dl className="detail-info-list"><Info label="Tên sản phẩm">{product.tenSanPham}</Info><Info label="Mã sản phẩm"><span className="detail-code">{product.maSanPham}</span></Info><Info label="Đơn vị tính">{product.donViTinh}</Info><Info label="Khối lượng">{product.khoiLuong || '—'}</Info><Info label="Ảnh sản phẩm">{product.hinhAnh ? <img className="detail-image" src={product.hinhAnh} alt={product.tenSanPham} /> : <div className="detail-image detail-image--empty">Chưa có ảnh</div>}</Info></dl></FormCard>
      <FormCard title="Thuộc tính & phân loại"><dl className="detail-info-list"><Info label="Loại sản phẩm"><Badge>{isCombo ? 'SẢN PHẨM THEO BỘ (COMBO)' : 'SẢN PHẨM ĐƠN'}</Badge></Info><Info label="Thương hiệu">{product.thuongHieu || '—'}</Info><Info label="Trạng thái"><StatusPill>{product.trangThaiBan}</StatusPill></Info><Info label="Thuế">VAT {product.vat || '10%'}</Info><Info label="Tags"><div className="detail-chip-set">{(product.tags || []).map(tag => <span className="detail-chip" key={tag}>{tag}</span>)}</div></Info><Info label="Thuộc tính"><div className="detail-chip-set">{(product.attributes || []).length ? (product.attributes || []).map(tag => <Badge key={typeof tag === 'string' ? tag : tag.name}>{typeof tag === 'string' ? tag : `${tag.name}: ${tag.values.join(', ')}`}</Badge>) : '—'}</div></Info>{isCombo && <Info label="Tổng vốn linh kiện"><strong className="detail-red">{money(componentTotal)}</strong><small>Tổng từ {components.length} linh kiện</small></Info>}<Info label="Tồn kho tổng"><div className="detail-stock-pair"><div><strong>{product.tonKho}</strong><small>Tổng tồn</small></div><div><strong className="detail-green">{product.coTheBan ?? product.tonKho}</strong><small>Có thể bán</small></div></div></Info></dl></FormCard>
    </div>

    <FormCard title="Chi tiết sản phẩm" headerRight={<button className="detail-edit-mini" onClick={edit}><HiOutlinePencilAlt /> Sửa</button>} className="detail-card"><section className="detail-description"><h4>Mô tả sản phẩm</h4><div dangerouslySetInnerHTML={{ __html: product.moTa || 'Chưa có mô tả.' }} /></section><section><h4>Thông số kỹ thuật</h4><table className="detail-table detail-spec-table"><thead><tr><th>THÔNG SỐ</th><th>GIÁ TRỊ</th></tr></thead><tbody>{(product.specs || []).map((spec, index) => <tr key={spec.id || index}><td>{spec.name}</td><td>{spec.value}</td></tr>)}</tbody></table></section></FormCard>

    {isCombo && <FormCard title="Thành phần sản phẩm (combo)" headerRight={<><Badge>{components.length} LINH KIỆN</Badge><strong className="detail-header-total">TỔNG: {money(componentTotal)}</strong></>} className="detail-card"><table className="detail-table"><thead><tr><th>#</th><th>TÊN SẢN PHẨM</th><th>MÃ SẢN PHẨM</th><th>ĐƠN GIÁ</th><th>SỐ LƯỢNG</th><th>THÀNH TIỀN</th></tr></thead><tbody>{componentPagination.visibleItems.map((item, index) => { const line = Number(item.giaNhap || item.donGia || 0) * (item.qty || 1); return <tr key={`${item.id}-${index}`}><td>{(componentPagination.currentPage - 1) * DETAIL_TABLE_PAGE_SIZE + index + 1}</td><td className="detail-name">{item.tenSanPham}</td><td><span className="detail-code">{item.maSanPham}</span></td><td>{money(item.giaNhap || item.donGia)}</td><td>{item.qty || 1}</td><td className="detail-red">{money(line)}</td></tr>; })}<tr className="detail-total-row"><td colSpan="5">TỔNG VỐN</td><td className="detail-red">{money(componentTotal)}</td></tr></tbody></table><DetailTablePagination totalItems={components.length} currentPage={componentPagination.currentPage} onPageChange={componentPagination.onPageChange} idPrefix="product-components" /></FormCard>}
    {hasVariantTable && <FormCard title="Thông tin phiên bản" headerRight={<Badge>{variants.length} PHIÊN BẢN</Badge>} className="detail-card"><table className="detail-table"><thead><tr><th>TÊN PHIÊN BẢN</th><th>MÃ SKU</th><th>GIÁ BÁN LẺ</th><th>GIÁ NHẬP</th><th>TỒN ĐẦU KỲ</th><th>TỒN KHO HIỆN TẠI</th></tr></thead><tbody>{variantPagination.visibleItems.map(v => <tr key={v.name}><td className="detail-name">{v.name}</td><td>{v.sku || '—'}</td><td>{money(v.giaBanLe)}</td><td>{money(v.giaNhap)}</td><td>{v.tonDauKy || 0}</td><td>{v.tonKho ?? v.tonDauKy ?? 0}</td></tr>)}</tbody></table><DetailTablePagination totalItems={variants.length} currentPage={variantPagination.currentPage} onPageChange={variantPagination.onPageChange} idPrefix="product-variants" /></FormCard>}

    <FormCard title="Thông tin tồn kho" headerRight={<><Badge>{storage.length} KHO</Badge><span>Tổng tồn: <b>{product.tonKho}</b></span><span>Có thể bán: <b className="detail-green">{product.coTheBan ?? product.tonKho}</b></span></>} className="detail-card"><table className="detail-table"><thead><tr><th>KHO HÀNG</th><th>TỒN KHO</th><th>CÓ THỂ BÁN</th><th>HÀNG ĐANG VỀ</th><th>ĐIỂM LƯU KHO</th></tr></thead><tbody>{storage.map(row => <tr key={row.name}><td className="detail-name"><HiOutlineOfficeBuilding /> {row.name}</td><td>{row.tonKho}</td><td className="detail-green">{row.coTheBan}</td><td className="detail-incoming">{row.dangVe ? `↑ ${row.dangVe}` : '—'}</td><td><Badge>{row.location}</Badge></td></tr>)}<tr className="detail-total-row"><td>TỔNG CỘNG</td><td>{product.tonKho}</td><td className="detail-green">{product.coTheBan ?? product.tonKho}</td><td className="detail-incoming">{storageIncoming}</td><td /></tr></tbody></table></FormCard>
  </main>;
}
function Stat({ label, value, caption, tone = '' }) { return <div className="detail-stat"><span>{label}</span><strong className={tone ? `detail-${tone}` : ''}>{value}</strong><small>{caption}</small></div>; }
function Info({ label, children }) { return <div className="detail-info"><dt>{label}</dt><dd>{children}</dd></div>; }
