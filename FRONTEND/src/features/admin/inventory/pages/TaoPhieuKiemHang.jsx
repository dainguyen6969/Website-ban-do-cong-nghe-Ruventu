import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineSearch } from "react-icons/hi";

import {
  createInventoryCheckBatch,
  getInventoryCheckDetail,
  getInventoryCountRequirements,
  searchInventoryCheckProducts,
  updateInventoryCheck,
} from "../api/inventoryCheckApi";

import {
  errorMessage,
  inputFromApiTime,
  nowLocalInput,
  withIdempotency,
} from "../../../../shared/services/mutationUtils";

import "./StockCheckFlow.css";

const REASONS = [
  "Kiểm kê định kỳ",
  "Hư hỏng",
  "Thất lạc",
  "Lệch mã",
  "Kiểm đếm lại",
  "Khác",
];

const CUSTOM_REASON = "__CUSTOM__";

const codesOf = (text = "") =>
  text
    .split(/[\n,]+/)
    .map((code) => code.trim())
    .filter(Boolean);

const canonical = (code) => code.trim().toUpperCase();

const reasonOf = (row) =>
  row.reasonChoice === CUSTOM_REASON
    ? row.customReason.trim()
    : row.reasonChoice;

const quantityOf = (row) =>
  row.quan_ly_serial
    ? codesOf(row.serialText).length
    : row.actual === ""
      ? null
      : Number(row.actual);

function prepareRows(items, metadata = null, detail = null) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Không có phiên bản sản phẩm để kiểm hàng.");
  }

  return items.map((item) => {
    if (typeof item.quan_ly_serial !== "boolean") {
      throw new Error(
        `Phiên bản #${item.phien_ban_id} chưa có cấu hình quản lý serial.`,
      );
    }

    const systemStock = detail?.ton_he_thong ?? item.ton_he_thong;

    if (
      systemStock == null ||
      !Number.isSafeInteger(Number(systemStock)) ||
      Number(systemStock) < 0
    ) {
      throw new Error("Dữ liệu tồn hệ thống không hợp lệ.");
    }

    const savedReason = detail?.ly_do || "";
    const predefined = REASONS.includes(savedReason);

    const metadataId = Number(metadata?.phien_ban_id ?? metadata?.id);

    return {
      ...item,
      phien_ban_id: Number(item.phien_ban_id),
      ton_he_thong: Number(systemStock),

      ma_vach:
        item.ma_vach ||
        (metadataId === Number(item.phien_ban_id) ? metadata?.ma_vach : "") ||
        "",

      actual: detail ? String(detail.ton_thuc_te ?? "") : "",

      serialText: detail?.kiem_serial?.da_kiem?.join("\n") || "",

      expected: detail?.kiem_serial?.he_thong || item.serials || [],

      reasonChoice: savedReason
        ? predefined
          ? savedReason
          : CUSTOM_REASON
        : "",

      customReason: predefined ? "" : savedReason,
    };
  });
}

function rowIsValid(row) {
  const reason = reasonOf(row);

  if (!reason || reason.length > 255) return false;

  if (row.quan_ly_serial) {
    const codes = codesOf(row.serialText);

    return (
      codes.length <= 10000 &&
      codes.every((code) => code.length <= 100) &&
      new Set(codes.map(canonical)).size === codes.length
    );
  }

  const quantity = quantityOf(row);

  return (
    quantity !== null &&
    Number.isSafeInteger(quantity) &&
    quantity >= 0 &&
    quantity <= 2147483647
  );
}

export default function TaoPhieuKiemHang() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const editing = Boolean(editId);

  const saveLock = useRef(false);
  const attempt = useRef(null);
  const selectionSequence = useRef(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");

  const [source, setSource] = useState(null);
  const [rows, setRows] = useState([]);
  const [expandedSerialId, setExpandedSerialId] = useState(null);

  const [checkedAt, setCheckedAt] = useState(nowLocalInput);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const blocked = busy || Boolean(attempt.current) || created !== null;

  useEffect(() => {
    if (!editing) return undefined;

    const controller = new AbortController();

    setLoading(true);
    setError("");

    (async () => {
      try {
        const detail = await getInventoryCheckDetail(editId, controller.signal);

        const data = await getInventoryCountRequirements(
          detail.phien_ban.id,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setSource({
          id: Number(detail.phien_ban.id),
          name: detail.phien_ban.ten_san_pham,
          type: "DON",
          code: detail.ma_phieu,
        });

        setRows(prepareRows(data.items, detail.phien_ban, detail));

        setCheckedAt(inputFromApiTime(detail.ngay_tao));
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(errorMessage(reason));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [editing, editId]);

  useEffect(() => {
    if (editing || !query.trim() || blocked) {
      setResults([]);
      setSearchStatus("idle");
      return undefined;
    }

    const controller = new AbortController();

    setSearchStatus("loading");
    setResults([]);

    const timer = setTimeout(async () => {
      try {
        const data = await searchInventoryCheckProducts(
          query.trim(),
          1,
          20,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setResults(data.items || []);
        setSearchStatus("success");
      } catch (reason) {
        if (controller.signal.aborted) return;

        setResults([]);
        setSearchStatus("error");
        setError(errorMessage(reason));
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, editing, blocked]);

  const selectProduct = async (item) => {
    if (blocked || loading) return;

    const sequence = ++selectionSequence.current;

    setLoading(true);
    setError("");
    setResults([]);
    setSource(null);
    setRows([]);
    setExpandedSerialId(null);

    try {
      const data = await getInventoryCountRequirements(item.phien_ban_id);

      if (sequence !== selectionSequence.current) return;

      setRows(prepareRows(data.items, item));

      setSource({
        id: Number(item.phien_ban_id),
        name: item.ten_san_pham,
        type: data.loai_san_pham,
      });

      setQuery("");
      setSearchStatus("idle");
    } catch (reason) {
      if (sequence === selectionSequence.current) {
        setError(errorMessage(reason));
      }
    } finally {
      if (sequence === selectionSequence.current) {
        setLoading(false);
      }
    }
  };

  const changeRow = (id, field, value) => {
    if (blocked || loading) return;

    setRows((current) =>
      current.map((row) =>
        row.phien_ban_id === id ? { ...row, [field]: value } : row,
      ),
    );
  };

  const valid = Boolean(source) && rows.length > 0 && rows.every(rowIsValid);

  const quantitiesComplete =
    rows.length > 0 &&
    rows.every((row) => {
      const quantity = quantityOf(row);

      return (
        quantity !== null && Number.isSafeInteger(quantity) && quantity >= 0
      );
    });

  const totalActual = quantitiesComplete
    ? rows.reduce((sum, row) => sum + quantityOf(row), 0)
    : null;

  const totalDifference = quantitiesComplete
    ? rows.reduce((sum, row) => sum + quantityOf(row) - row.ton_he_thong, 0)
    : null;

  const save = async (event) => {
    event.preventDefault();

    if (saveLock.current || !valid || !source) return;

    saveLock.current = true;
    setBusy(true);
    setError("");

    try {
      const items = rows.map((row) => ({
        phien_ban_id: row.phien_ban_id,
        ton_he_thong_xac_nhan: row.ton_he_thong,
        ton_thuc_te: quantityOf(row),

        serials_da_kiem: row.quan_ly_serial ? codesOf(row.serialText) : [],

        ly_do: reasonOf(row),
      }));

      if (editing) {
        await updateInventoryCheck(editId, {
          actualStock: items[0].ton_thuc_te,
          serialCodes: items[0].serials_da_kiem,
          reason: items[0].ly_do,
        });

        navigate(`/kho-hang/kiem-hang/${editId}`);
        return;
      }

      const body = attempt.current?.body || {
        phien_ban_nguon_id: source.id,
        items,
      };

      const result = await withIdempotency(
        attempt,
        `inventory:create:${source.id}`,
        body,
        async (key, payload) => {
          const data = await createInventoryCheckBatch(payload, key);

          if (!Array.isArray(data?.items) || data.items.length === 0) {
            throw new Error(
              "Chưa nhận được kết quả tạo phiếu. Hãy thử lại với cùng yêu cầu.",
            );
          }

          return data;
        },
      );

      setCreated(result.items);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  };

  return (
    <main id="stock-check-create-v2" className="stock-flow-page">
      <header className="stock-flow-heading">
        <nav>
          KIỂM HÀNG <b>›</b> DANH SÁCH PHIẾU KIỂM HÀNG <b>›</b>{" "}
          <strong>{editing ? source?.code || `#${editId}` : "TẠO MỚI"}</strong>
        </nav>

        <h1>{editing ? "CHỈNH SỬA PHIẾU KIỂM HÀNG" : "TẠO PHIẾU KIỂM HÀNG"}</h1>
      </header>

      <form onSubmit={save}>
        <div className="stock-create-grid">
          <div className="stock-check-main">
            {error && (
              <p className="stock-check-message error" role="alert">
                {error}
              </p>
            )}

            {loading && (
              <p className="stock-check-message" role="status">
                Đang tải sản phẩm cần kiểm...
              </p>
            )}

            {attempt.current && !busy && (
              <p className="stock-check-message">
                Chưa xác định kết quả lần gửi trước. Bấm THỬ LẠI để gửi cùng dữ
                liệu và cùng khóa.
              </p>
            )}

            <section className="stock-flow-card">
              <h2>SẢN PHẨM CẦN KIỂM</h2>

              <fieldset
                className="stock-check-fields"
                disabled={blocked || loading}
              >
                <div className="stock-product-search">
                  <HiOutlineSearch aria-hidden="true" />

                  <input
                    aria-label="Tìm sản phẩm kiểm hàng"
                    disabled={editing}
                    maxLength={200}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setResults([]);
                      setError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                      }
                    }}
                    placeholder="TÌM MÃ SẢN PHẨM / TÊN / PHIÊN BẢN / MÃ VẠCH..."
                  />

                  {results.length > 0 && query.trim() && (
                    <div className="stock-search-results">
                      {results.map((item) => (
                        <button
                          key={item.phien_ban_id}
                          type="button"
                          onClick={() => selectProduct(item)}
                        >
                          <span>
                            <strong>{item.ten_san_pham}</strong>
                            <small>
                              {item.ten_phien_ban}
                              {" · "}
                              {item.ma_san_pham}
                            </small>
                          </span>

                          <em>
                            {item.loai_san_pham === "BO_PC"
                              ? "BỘ PC"
                              : `TỒN: ${item.ton_he_thong ?? "—"}`}
                          </em>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {searchStatus === "loading" && (
                  <p className="stock-check-search-note" role="status">
                    Đang tìm sản phẩm...
                  </p>
                )}

                {searchStatus === "success" &&
                  results.length === 0 &&
                  query.trim() && (
                    <p className="stock-check-search-note">
                      Không tìm thấy sản phẩm phù hợp.
                    </p>
                  )}

                {source?.type === "BO_PC" && (
                  <p className="stock-check-source">
                    <strong>BỘ PC: {source.name}</strong>
                    <span>
                      Kiểm {rows.length} phiên bản linh kiện trong cấu hình.
                    </span>
                  </p>
                )}

                <div className="stock-form-table-wrap">
                  <table className="stock-form-table stock-check-items">
                    <thead>
                      <tr>
                        <th>MÃ HÀNG</th>
                        <th>SẢN PHẨM / PHIÊN BẢN</th>
                        <th>TỒN HỆ THỐNG</th>
                        <th>SAU ĐIỀU CHỈNH</th>
                        <th>CHÊNH LỆCH</th>
                        <th>LÝ DO</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="stock-form-empty">
                            TÌM VÀ CHỌN PHIÊN BẢN Ở TRÊN
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => {
                          const quantity = quantityOf(row);
                          const difference =
                            quantity === null
                              ? null
                              : quantity - row.ton_he_thong;

                          const codes = codesOf(row.serialText);
                          const observed = new Set(codes.map(canonical));

                          const expected = new Set(
                            row.expected.map((serial) =>
                              canonical(serial.so_serial),
                            ),
                          );

                          const missing = row.expected.filter(
                            (serial) =>
                              !observed.has(canonical(serial.so_serial)),
                          );

                          const unknown = codes.filter(
                            (code) => !expected.has(canonical(code)),
                          );

                          const duplicate = observed.size !== codes.length;

                          return (
                            <Fragment key={row.phien_ban_id}>
                              <tr>
                                <td className="stock-check-code">
                                  {row.ma_san_pham || "—"}
                                  <small>MV: {row.ma_vach || "—"}</small>
                                </td>

                                <td>
                                  <strong>{row.ten_san_pham}</strong>
                                  <small>{row.ten_phien_ban || "—"}</small>

                                  {row.quan_ly_serial && (
                                    <button
                                      type="button"
                                      className="stock-check-serial-button"
                                      onClick={() =>
                                        setExpandedSerialId((current) =>
                                          current === row.phien_ban_id
                                            ? null
                                            : row.phien_ban_id,
                                        )
                                      }
                                    >
                                      {expandedSerialId === row.phien_ban_id
                                        ? "ĐÓNG KIỂM SERIAL"
                                        : `KIỂM SERIAL (${codes.length})`}
                                    </button>
                                  )}
                                </td>

                                <td className="stock-number">
                                  {row.ton_he_thong}
                                </td>

                                <td className="stock-check-actual">
                                  <input
                                    aria-label={`Số lượng thực tế ${row.ten_phien_ban}`}
                                    className="stock-adjust-input"
                                    type="number"
                                    min="0"
                                    max="2147483647"
                                    step="1"
                                    readOnly={row.quan_ly_serial}
                                    required={!row.quan_ly_serial}
                                    value={
                                      row.quan_ly_serial
                                        ? codes.length
                                        : row.actual
                                    }
                                    onChange={(event) =>
                                      changeRow(
                                        row.phien_ban_id,
                                        "actual",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="—"
                                  />

                                  {row.quan_ly_serial && (
                                    <small>Theo serial đã kiểm</small>
                                  )}
                                </td>

                                <td className="stock-check-difference">
                                  <span
                                    className={`stock-difference ${
                                      difference != null && difference !== 0
                                        ? "has-difference"
                                        : ""
                                    }`}
                                  >
                                    {difference == null
                                      ? "—"
                                      : difference > 0
                                        ? `+${difference}`
                                        : difference}
                                  </span>
                                </td>

                                <td>
                                  <select
                                    required
                                    aria-label={`Lý do kiểm ${row.ten_phien_ban}`}
                                    value={row.reasonChoice}
                                    onChange={(event) =>
                                      changeRow(
                                        row.phien_ban_id,
                                        "reasonChoice",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value="">— chọn lý do —</option>

                                    {REASONS.map((reason) => (
                                      <option key={reason} value={reason}>
                                        {reason}
                                      </option>
                                    ))}

                                    <option value={CUSTOM_REASON}>
                                      Nhập lý do khác...
                                    </option>
                                  </select>

                                  {row.reasonChoice === CUSTOM_REASON && (
                                    <input
                                      required
                                      maxLength={255}
                                      className="stock-custom-reason"
                                      value={row.customReason}
                                      onChange={(event) =>
                                        changeRow(
                                          row.phien_ban_id,
                                          "customReason",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Nhập lý do kiểm hàng..."
                                    />
                                  )}
                                </td>
                              </tr>

                              {row.quan_ly_serial &&
                                expandedSerialId === row.phien_ban_id && (
                                  <tr className="stock-check-serial-row">
                                    <td colSpan={6}>
                                      <div className="stock-check-serial-panel">
                                        <label>
                                          <span>SERIAL ĐÃ KIỂM THỰC TẾ</span>
                                          <textarea
                                            value={row.serialText}
                                            onChange={(event) =>
                                              changeRow(
                                                row.phien_ban_id,
                                                "serialText",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="Quét hoặc nhập mỗi serial một dòng..."
                                          />
                                        </label>

                                        <div className="stock-check-serial-summary">
                                          <span>Đã kiểm: {codes.length}</span>
                                          <span>
                                            Chưa thấy: {missing.length}
                                          </span>
                                          <span>
                                            Ngoài danh sách: {unknown.length}
                                          </span>
                                        </div>

                                        {duplicate && (
                                          <p className="stock-check-error">
                                            Có serial bị nhập trùng.
                                          </p>
                                        )}

                                        {missing.length > 0 && (
                                          <details>
                                            <summary>
                                              Xem serial chưa kiểm thấy
                                            </summary>
                                            <p>
                                              {missing
                                                .map(
                                                  (serial) => serial.so_serial,
                                                )
                                                .join(", ")}
                                            </p>
                                          </details>
                                        )}

                                        {unknown.length > 0 && (
                                          <p className="stock-check-error">
                                            Ngoài danh sách:{" "}
                                            {unknown.join(", ")}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </fieldset>

              <div className="stock-form-summary">
                <div>
                  <span>SỐ LƯỢNG SAU ĐIỀU CHỈNH</span>
                  <strong>{totalActual ?? "—"}</strong>
                </div>

                <div>
                  <span>CHÊNH LỆCH TỒN KHO</span>
                  <strong
                    className={
                      totalDifference != null && totalDifference !== 0
                        ? "is-red"
                        : ""
                    }
                  >
                    {totalDifference == null
                      ? "—"
                      : totalDifference > 0
                        ? `+${totalDifference}`
                        : totalDifference}
                  </strong>
                </div>
              </div>
            </section>

            {created && (
              <section className="stock-flow-card">
                <h2>ĐÃ TẠO PHIẾU KIỂM</h2>

                <div className="stock-check-created">
                  {created.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="stock-action outline"
                      onClick={() => navigate(`/kho-hang/kiem-hang/${item.id}`)}
                    >
                      {item.ma_phieu} · {item.ten_phien_ban}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="stock-create-side">
            <section className="stock-warehouse-box">
              <span>KHO KIỂM HÀNG</span>
              <strong>KHO CỬA HÀNG</strong>
            </section>

            <section className="stock-flow-card stock-date-card">
              <h2>NGÀY KIỂM HÀNG</h2>

              <div>
                <input
                  aria-label="Ngày kiểm hàng"
                  type="datetime-local"
                  value={checkedAt}
                  readOnly
                />

                <small className="stock-check-date-note">
                  Thời gian chính thức được ghi nhận khi lưu phiếu.
                </small>
              </div>
            </section>
          </aside>
        </div>

        <footer className="stock-flow-footer">
          <button
            type="button"
            className="stock-action outline"
            disabled={busy || Boolean(attempt.current)}
            onClick={() =>
              navigate(
                editing
                  ? `/kho-hang/kiem-hang/${editId}`
                  : "/kho-hang/kiem-hang",
              )
            }
          >
            ‹ QUAY LẠI
          </button>

          <div className="stock-submit-area">
            {!created && !valid && (
              <small className="stock-check-footer-note">
                {!source
                  ? "Chọn sản phẩm cần kiểm."
                  : "Nhập đủ số lượng/serial và lý do trên từng dòng."}
              </small>
            )}

            {created ? (
              <button
                type="button"
                className="stock-action black"
                onClick={() => navigate("/kho-hang/kiem-hang")}
              >
                DANH SÁCH PHIẾU KIỂM
              </button>
            ) : (
              <button
                type="submit"
                className="stock-action black"
                disabled={!valid || busy || loading}
              >
                {busy
                  ? "ĐANG LƯU..."
                  : attempt.current
                    ? "THỬ LẠI"
                    : editing
                      ? "LƯU THAY ĐỔI"
                      : "TẠO PHIẾU KIỂM HÀNG"}
              </button>
            )}
          </div>
        </footer>
      </form>
    </main>
  );
}
