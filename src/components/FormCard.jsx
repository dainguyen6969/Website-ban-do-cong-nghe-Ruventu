import './FormCard.css';

/**
 * Reusable form-card container with black header bar + red accent.
 * Matches the table-container style from the Đơn hàng page.
 *
 * @param {string} title       — Card title text (rendered in the black header bar)
 * @param {ReactNode} headerRight — Optional content rendered on the right side of the header bar
 * @param {ReactNode} children   — Card body content
 * @param {string} id           — Optional HTML id
 * @param {string} className    — Optional extra className
 */
export default function FormCard({ title, headerRight, children, id, className = '' }) {
  return (
    <div className={`form-card ${className}`} id={id}>
      <div className="form-card__header">
        <div className="form-card__header-left">
          <span className="form-card__accent" aria-hidden="true" />
          <h3 className="form-card__title">{title}</h3>
        </div>
        {headerRight && (
          <div className="form-card__header-right">{headerRight}</div>
        )}
      </div>
      <div className="form-card__body">{children}</div>
    </div>
  );
}
