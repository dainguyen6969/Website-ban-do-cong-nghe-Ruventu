import FormCard from '../components/FormCard';

/* oxlint-disable react/only-export-components -- small module-level presentation helpers intentionally share status semantics */

export const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;
export const statusClass = (value) => ({
  'Đặt hàng': 'neutral', 'Đã duyệt': 'blue', 'Đã nhập kho': 'green',
  'Hoàn trả một phần': 'orange', 'Hoàn trả toàn bộ': 'orange', 'Đã hủy': 'red',
  'Chưa trả': 'red', 'Trả một phần': 'orange', 'Đã trả': 'green',
}[value] || 'neutral');

export function StatusBadge({ children }) { return <span className={`purchase-badge ${statusClass(children)}`}>{children}</span>; }
export function PurchaseCard({ title, children, className = '' }) { return <FormCard title={title} className={`purchase-card ${className}`}>{children}</FormCard>; }
export function PageCrumb({ tail }) { return <div className="purchase-crumb"><span>SẢN PHẨM</span><b>›</b><span>NHẬP HÀNG</span>{tail && <><b>›</b><strong>{tail}</strong></>}</div>; }
export function Modal({ children, onClose, className = '' }) { return <div className="purchase-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`purchase-modal ${className}`}>{children}</section></div>; }
