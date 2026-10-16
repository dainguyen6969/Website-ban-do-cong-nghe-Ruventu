import PriceInput from "../../../../shared/components/ui/PriceInput";
import "./CatalogPolicies.css";

export function warrantyText(months) {
  if (months == null) return "Chưa có thông tin";
  return Number(months) === 0 ? "Không bảo hành" : `${months} tháng`;
}

export function WarrantySummary({
  isCombo,
  months,
  components = [],
  capacity,
}) {
  return (
    <section className="catalog-policy">
      <strong>BẢO HÀNH</strong>

      {!isCombo ? (
        <p>{warrantyText(months)}</p>
      ) : (
        <>
          <p>Bảo hành theo từng linh kiện.</p>

          {!components.length ? (
            <p className="catalog-muted">Chưa có cấu hình linh kiện.</p>
          ) : (
            <ul>
              {components.map((item) => (
                <li key={item.variantId ?? item.id}>
                  <span>
                    {item.name} · {item.variant} × {item.qty}
                  </span>
                  <strong>{warrantyText(item.warrantyMonths)}</strong>
                </li>
              ))}
            </ul>
          )}

          <p>
            Số bộ có thể lắp: <strong>{capacity ?? "—"}</strong>
          </p>
        </>
      )}
    </section>
  );
}

export function VariantEditor({
  value,
  change,
  combo = false,
  disabled = false,
  remove,
}) {
  const attributes = value.attributes || [];

  const changeAttribute = (index, field, nextValue) => {
    change({
      attributes: attributes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: nextValue } : item,
      ),
    });
  };

  return (
    <section className="catalog-variant">
      <div className="catalog-variant-fields">
        <label>
          Tên phiên bản *
          <input
            value={value.name}
            maxLength={150}
            disabled={disabled}
            onChange={(event) => change({ name: event.target.value })}
          />
        </label>

        <label>
          Mã vạch
          <input
            value={value.sku}
            maxLength={50}
            disabled={disabled}
            onChange={(event) => change({ sku: event.target.value })}
          />
        </label>

        <label>
          Giá bán lẻ (đ) *
          <PriceInput
            value={value.giaBanLe}
            disabled={disabled}
            onChange={(nextValue) => change({ giaBanLe: nextValue })}
          />
        </label>

        <label>
          Giá nhập (đ) *
          <PriceInput
            value={value.giaNhap}
            disabled={disabled}
            onChange={(nextValue) => change({ giaNhap: nextValue })}
          />
        </label>

        <label>
          Khối lượng (kg)
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.khoiLuong}
            disabled={disabled}
            onChange={(event) => change({ khoiLuong: event.target.value })}
          />
        </label>

        <label>
          Quản lý serial *
          <select
            value={
              combo
                ? "false"
                : value.serialMode === true
                  ? "true"
                  : value.serialMode === false
                    ? "false"
                    : ""
            }
            disabled={disabled || combo || value.serialModeLocked}
            onChange={(event) =>
              change({
                serialMode:
                  event.target.value === ""
                    ? undefined
                    : event.target.value === "true",
              })
            }
          >
            <option value="">Chọn chế độ</option>
            <option value="true">Có quản lý serial</option>
            <option value="false">Không quản lý serial</option>
          </select>
        </label>
      </div>

      {value.serialModeLocked && (
        <p className="catalog-muted">
          Chế độ serial đã được khóa do phiên bản có tồn hoặc lịch sử.
        </p>
      )}

      <label className="catalog-checkbox">
        <input
          type="checkbox"
          checked={Number(value.trangThai) === 1}
          disabled={disabled}
          onChange={(event) =>
            change({ trangThai: event.target.checked ? 1 : 0 })
          }
        />
        Đang kinh doanh
      </label>

      {!combo && (
        <>
          <strong>THUỘC TÍNH PHIÊN BẢN</strong>

          {attributes.map((item, index) => (
            <div
              className="catalog-attribute-row"
              key={item.id ?? `new-${index}`}
            >
              <input
                aria-label={`Tên thuộc tính ${index + 1}`}
                placeholder="Tên thuộc tính"
                maxLength={100}
                value={item.ten_thuoc_tinh}
                disabled={disabled}
                onChange={(event) =>
                  changeAttribute(index, "ten_thuoc_tinh", event.target.value)
                }
              />

              <input
                aria-label={`Giá trị thuộc tính ${index + 1}`}
                placeholder="Giá trị"
                maxLength={255}
                value={item.gia_tri}
                disabled={disabled}
                onChange={(event) =>
                  changeAttribute(index, "gia_tri", event.target.value)
                }
              />

              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  change({
                    attributes: attributes.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
              >
                Xóa
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              change({
                attributes: [
                  ...attributes,
                  { ten_thuoc_tinh: "", gia_tri: "" },
                ],
              })
            }
          >
            Thêm thuộc tính
          </button>
        </>
      )}

      {remove && (
        <button type="button" disabled={disabled} onClick={remove}>
          Xóa phiên bản mới
        </button>
      )}
    </section>
  );
}
