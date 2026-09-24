// Reusable fields for configuring gift promotions.
import ProductSelector from '../../../../shared/components/ui/ProductSelector';

const conditions = [
  ['specific', 'Mua đích danh — Tặng đích danh', 'Khách mua đúng sản phẩm A → nhận sản phẩm B'],
  ['any', 'Mua bất kỳ — Tặng đích danh', 'Khách mua bất kỳ sản phẩm nào → nhận sản phẩm B'],
  ['total', 'Mua theo tổng tiền — Tặng bất kỳ', 'Khách mua đủ tổng tiền X → nhận 1 trong các sản phẩm tặng'],
];

function Heading({ children, className = '' }) {
  return <h2 className={`promo-heading ${className}`}>{children}</h2>;
}

function NumberField({ label, value, onChange, unit, money = false, required = false, placeholder = '' }) {
  return <label className={`promo-field ${money ? 'promo-gift-money' : ''}`}>
    <span>{label}{required && <b> *</b>}</span>
    <div className={money ? 'promo-unit-input' : unit ? 'promo-gift-quantity' : ''}>
      <input type="number" min={money ? '0' : '1'} step="1" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {unit && (money ? <i>{unit}</i> : <span>{unit}</span>)}
    </div>
  </label>;
}

export default function GiftPromotionFields({ condition, setCondition, rules, setRules }) {
  const rule = rules[condition];
  const update = (field, value) => setRules((current) => ({ ...current, [condition]: {
    ...current[condition], [field]: typeof value === 'function' ? value(current[condition][field]) : value,
  } }));

  return <>
    <Heading className="promo-section-heading">Điều kiện tặng sản phẩm</Heading>
    <div className="promo-field">
      <span>Loại điều kiện tặng<b> *</b></span>
      <div className="promo-gift-conditions" role="group" aria-label="Loại điều kiện tặng">
        {conditions.map(([id, title, subtitle]) => <button type="button" key={id} aria-pressed={condition === id} className={`promo-condition promo-gift-condition ${condition === id ? 'is-selected' : ''}`} onClick={() => setCondition(id)}>
          <i aria-hidden="true" /><span><strong>{title}</strong><small>{subtitle}</small></span>
        </button>)}
      </div>
    </div>
    <div className="promo-main-divider" />
    <Heading>Điều kiện mua</Heading>
    {condition === 'total' ? <NumberField label="Tổng tiền mua tối thiểu" required money unit="đ" value={rule.minimumTotal} onChange={(value) => update('minimumTotal', value)} /> : <>
      {condition === 'specific' && <ProductSelector key="purchase" label="Sản phẩm phải mua (đích danh)" selected={rule.purchaseProducts} setSelected={(value) => update('purchaseProducts', value)} />}
      <NumberField label={condition === 'specific' ? 'Số lượng mua tối thiểu' : 'Số lượng mua tối thiểu (bất kỳ sản phẩm)'} required={condition === 'any'} unit={condition === 'any' ? 'sp' : undefined} value={rule.minimumQuantity} onChange={(value) => update('minimumQuantity', value)} />
    </>}
    <div className="promo-main-divider" />
    <Heading>Sản phẩm tặng</Heading>
    <ProductSelector key={`gift-${condition}`} label={condition === 'total' ? 'Khách chọn 1 trong các sản phẩm sau' : 'Sản phẩm tặng đích danh'} selected={rule.giftProducts} setSelected={(value) => update('giftProducts', value)} />
    <NumberField label="Số lượng tặng mỗi đơn" unit="sp" value={rule.giftQuantity} onChange={(value) => update('giftQuantity', value)} />
    {condition === 'total' && <NumberField label="Ngân sách tặng tối đa mỗi đơn (đ)" money unit="đ" value={rule.budget} onChange={(value) => update('budget', value)} placeholder="Không giới hạn" />}
  </>;
}
