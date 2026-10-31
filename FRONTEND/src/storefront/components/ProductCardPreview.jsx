import { useEffect, useState } from 'react';
import { productService, toProductCard } from '../../shared/services/productService';
import './ProductCardPreview.css';

export default function ProductCardPreview({ product, open, panelId }) {
  const [detail, setDetail] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || detail) return;
    let active = true;
    async function load() {
      setError('');
      try {
        const response = await productService.getProductDetail(product.id);
        if (!response?.data || !Array.isArray(response.data.danhSachPhienBan)) {
          throw new Error('Thông tin phiên bản không hợp lệ.');
        }
        if (active) setDetail(response.data);
      } catch (reason) {
        if (active) setError(reason.response?.data?.message || 'Không tải được phiên bản sản phẩm. Vui lòng thử lại.');
      }
    }
    load();
    return () => { active = false; };
  }, [open, detail, product.id, attempt]);

  const preview = detail ? toProductCard({ ...detail, phienBanMacDinhId: selectedVariantId ?? product.defaultVariantId }) : product;
  const variants = detail?.danhSachPhienBan || [];
  const currentId = selectedVariantId ?? preview.defaultVariantId;
  const specs = (preview.specs || []).slice(0, 4);

  return (
    <div id={panelId} className="product-card-preview" hidden={!open} aria-label={`Thông số và phiên bản của ${product.title}`}>
      <h5 className="product-card-preview__heading">PHIÊN BẢN SẢN PHẨM</h5>
      {error ? <div className="product-card-preview__status" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
      </div> : !detail ? <p className="product-card-preview__status" role="status">Đang tải phiên bản...</p> : variants.length ? (
        <div className="product-card-preview__variants" role="group" aria-label="Chọn phiên bản để xem thông số">
          {variants.map(variant => {
            const stock = detail.loaiSanPham === 'BO_PC' ? variant.soBoCoTheLap : variant.tonCoTheBan;
            const unavailable = variant.coTheBan === false || !(Number(stock) > 0);
            return <button key={variant.id} type="button" aria-pressed={String(currentId) === String(variant.id)} onClick={() => setSelectedVariantId(variant.id)}>
              {variant.tenPhienBan || 'Mặc định'}
              {unavailable && <span className="product-card-preview__stock">Hết hàng</span>}
            </button>;
          })}
        </div>
      ) : <p className="product-card-preview__status">Chưa có phiên bản sản phẩm.</p>}

      <h5 className="product-card-preview__heading">THÔNG SỐ NỔI BẬT</h5>
      {specs.length ? <table className="specs-table" aria-label={`Thông số nổi bật của ${product.title}`}>
        <tbody>{specs.map(spec => <tr key={spec.label}>
          <th scope="row" className="spec-label"><span>{spec.label}</span></th>
          <td className="spec-value"><span>{spec.value}</span></td>
        </tr>)}</tbody>
      </table> : <p className="product-card-preview__status">Chưa có thông số nổi bật cho phiên bản này.</p>}
    </div>
  );
}
