import './CatalogDetailLayout.css';

export function CatalogDetailHeader({ context, title, metadata, actions }) {
  return (
    <header className="catalog-detail-heading admin-page-heading">
      <div className="catalog-detail-identity">
        <p className="catalog-detail-context">{context}</p>
        <h1>{title}</h1>
        <div className="catalog-detail-meta">{metadata}</div>
      </div>
      <div className="catalog-detail-actions admin-page-actions">{actions}</div>
    </header>
  );
}

export function CatalogDetailNavigation({ groups, active, onChange }) {
  return (
    <nav className="catalog-detail-tabs" aria-label="Các nhóm thông tin sản phẩm">
      {groups.map(([name, label, Icon]) => (
        <button
          key={name}
          type="button"
          aria-controls={`catalog-${name}`}
          aria-current={name === active ? 'page' : undefined}
          onClick={() => onChange(name)}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
