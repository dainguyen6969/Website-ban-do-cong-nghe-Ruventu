export function WarrantyBadge({ children, tone }) {
  if (!children) return <span className="w-shell-missing" title="Chưa có thông tin">—</span>;
  const variant = tone || ({
    'Tiếp nhận': 'blue', 'Đang kiểm tra': 'amber', 'Đã gửi bảo hành': 'purple',
    'Đang bảo hành': 'amber', 'Đã nhận lại': 'cyan', 'Chờ trả khách': 'cyan',
    'Chờ đổi sản phẩm': 'orange', 'Đã bàn giao thiết bị': 'green',
    'Khách đã đồng ý': 'green', 'Khách đã từ chối': 'red', 'Chờ khách phản hồi': 'amber',
    'Đã thanh toán': 'green', 'Chưa thanh toán': 'red', 'Thanh toán một phần': 'amber',
    'Chờ hoàn tiền': 'amber', 'Hoàn tiền một phần': 'orange', 'Đã hoàn tiền': 'green',
  }[children] || 'neutral');
  return <span className={`w-shell-badge w-shell-badge--${variant}`}>{children}</span>;
}

export function WarrantyPanel({ title, note, action, children }) {
  return <section className="w-shell-panel">
    <header><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</header>
    <div className="w-shell-panel-body">{children}</div>
  </section>;
}

export function WarrantyFields({ fields }) {
  return <dl className="w-shell-fields">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>;
}

export function WarrantyTable({ columns, rows = [], empty }) {
  return <div className="w-shell-table-scroll"><div className="admin-table-scroll admin-table-scroll--embedded" tabIndex={0} role="region" aria-label="Bảng dữ liệu liên quan"><table className="w-shell-detail-table admin-data-table admin-data-table--records"><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell ?? '—'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="w-shell-empty">{empty}</td></tr>}</tbody></table></div></div>;
}
