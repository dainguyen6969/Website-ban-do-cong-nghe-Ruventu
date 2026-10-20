import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ComponentSelectionModal from "../components/ComponentSelectionModal";
import {
  pcBuilderService,
  pcBuilderError,
} from "../../shared/services/pcBuilderService";
import { cartService } from "../../shared/services/cartService";
import { withIdempotency } from "../../shared/services/mutationUtils";
import { getAccessToken, readCurrentUser } from "../../auth/backendAuth";
import {
  availableQuantity,
  buildItems,
  confirmedBuild,
  confirmedExport,
  money,
  socketLabels,
} from "./pcBuilderModel";
import "./CustomBuildPage.css";

const cartIdentity = () =>
  getAccessToken()
    ? `user:${readCurrentUser()?.id || getAccessToken()}`
    : "guest";

const CustomBuildPage = () => {
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState("");
  const [optionsRetry, setOptionsRetry] = useState(0);
  const [selections, setSelections] = useState({});
  const [activeSlot, setActiveSlot] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [adding, setAdding] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const addingRef = useRef(false);
  const exportBusy = useRef(false);
  const [exporting, setExporting] = useState(false);
  const attempt = useRef(null);
  const signature = JSON.stringify({ items: buildItems(selections) });
  const previewKey = JSON.stringify([signature, previewRevision]);
  const preview = previewResult?.key === previewKey ? previewResult.data : null;
  const previewError =
    previewResult?.key === previewKey ? previewResult.error : "";
  const locked = adding || uncertain || exporting;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    pcBuilderService
      .options(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOptions(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setOptionsError(pcBuilderError(error));
      });
    return () => controller.abort();
  }, [optionsRetry]);

  useEffect(() => {
    if (!options) return;
    const controller = new AbortController();
    pcBuilderService
      .preview(JSON.parse(signature), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setPreviewResult({ key: previewKey, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setPreviewResult({ key: previewKey, error: pcBuilderError(error) });
      });
    return () => controller.abort();
  }, [signature, options, previewKey]);

  function changeSelections(next) {
    if (addingRef.current || attempt.current || exportBusy.current) {
      return;
    }
    setSelections(next);
    setMessage("");
    setSuccess(null);
  }
  function select(product, quantity) {
    const maximum = availableQuantity(
      product,
      activeSlot.ma_hang_muc,
      selections,
    );
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > maximum ||
      !product.co_the_chon
    ) {
      setMessage("Số lượng lựa chọn vượt quá số lượng có thể bán.");
      return;
    }
    changeSelections({
      ...selections,
      [activeSlot.ma_hang_muc]: { ...product, so_luong: quantity },
    });
    setActiveSlot(null);
  }

  function remove(code) {
    const next = { ...selections };
    delete next[code];
    changeSelections(next);
  }

  function quantity(code, value) {
    const item = selections[code];
    const stock =
      preview?.items.find((line) => line.ma_hang_muc === code)
        ?.ton_co_the_ban ?? item.ton_co_the_ban;
    const maximum = availableQuantity(item, code, selections, stock);
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
      setMessage(
        value < 1 || !Number.isInteger(value)
          ? "Số lượng phải là số nguyên từ 1."
          : "Số lượng lựa chọn vượt quá số lượng có thể bán.",
      );
      return;
    }
    changeSelections({ ...selections, [code]: { ...item, so_luong: value } });
  }
  async function addToCart() {
    if (
      exportBusy.current ||
      addingRef.current ||
      (!attempt.current && !preview?.co_the_gui_yeu_cau_them_gio)
    ) {
      return;
    }
    addingRef.current = true;
    setAdding(true);
    setMessage("");
    setSuccess(null);
    try {
      const identity = cartIdentity();
      if (attempt.current && attempt.current.scope !== identity)
        throw new Error(
          "Phiên giỏ hàng đã thay đổi. Vui lòng trở lại phiên trước để kiểm tra hoặc thử lại yêu cầu.",
        );
      const body = attempt.current?.body || confirmedBuild(preview);
      // GET tạo cookie giỏ khách trước POST; không tạo lại giỏ khi đang thử lại yêu cầu chưa rõ kết quả.
      if (!attempt.current && identity === "guest")
        await cartService.getCurrentCart();
      const result = await withIdempotency(
        attempt,
        identity,
        body,
        pcBuilderService.addToCart,
      );
      setUncertain(false);
      setSuccess(result);
      try {
        const cart = await cartService.getCurrentCart();
        window.dispatchEvent(
          new CustomEvent("cartCountUpdated", {
            detail: { count: cart.data.data.tongSoLuong },
          }),
        );
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      } catch (error) {
        setMessage(
          `Đã thêm cấu hình nhưng chưa tải lại được giỏ hàng: ${pcBuilderError(error)}`,
        );
      }
    } catch (error) {
      setUncertain(Boolean(attempt.current));
      setMessage(pcBuilderError(error));
      if (Number(error.status || error.response?.status) === 409) {
        setPreviewResult(null);
        setPreviewRevision((value) => value + 1);
      }
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  async function exportExcel() {
    if (exportBusy.current || addingRef.current || attempt.current) {
      return;
    }

    exportBusy.current = true;
    setExporting(true);
    setMessage("");

    try {
      const body = confirmedExport(preview);

      const result = await pcBuilderService.export(body);

      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = result.filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      const status = Number(error.status || error.response?.status);

      if (status === 409) {
        setPreviewResult(null);
        setPreviewRevision((value) => value + 1);

        setMessage(
          "Giá cấu hình đã thay đổi. " +
            "Vui lòng xem lại giá mới trước khi xuất Excel.",
        );
      } else {
        setMessage(pcBuilderError(error));
      }
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  }

  const slots = options?.nhom_hang_muc.flatMap((group) => group.hang_muc) || [];
  const selectedCount = Object.keys(selections).length;
  return (
    <div className="custom-build-page">
      <Header />
      <div className="build-header-banner">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">TRANG CHỦ</Link>
            <span>/</span>
            <span className="current">BUILD PC TỰ CHỌN</span>
          </div>
          <h1 className="build-page-title">BUILD PC TỰ CHỌN</h1>
          <p className="build-page-subtitle">
            TỰ CHỌN LINH KIỆN VÀ PHỤ KIỆN
            <br />
            CHO CẤU HÌNH MÁY TÍNH CỦA BẠN
          </p>
          <div className="build-banner-right-text">
            CHỌN TỪNG LINH KIỆN, KIỂM TRA SOCKET CPU / MAIN
            <br />
            VÀ HOÀN THIỆN CẤU HÌNH CỦA BẠN
          </div>
        </div>
      </div>
      <main className="build-main-content">
        <div className="container">
          {!options ? (
            <div
              className="build-progress-box"
              role={optionsError ? "alert" : "status"}
            >
              {optionsError || "Đang tải các hạng mục Build PC..."}
              {optionsError && (
                <button
                  onClick={() => {
                    setOptionsError("");
                    setOptionsRetry((value) => value + 1);
                  }}
                >
                  Thử lại
                </button>
              )}
            </div>
          ) : (
            <div className="build-layout">
              <div className="build-left-column">
                <div className="build-progress-box">
                  <div className="progress-header">
                    <strong>TIẾN ĐỘ CẤU HÌNH</strong>
                    <span>
                      {selectedCount}/{options.tong_hang_muc} HẠNG MỤC ĐÃ CHỌN
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${(selectedCount / options.tong_hang_muc) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="progress-footer">
                    Bạn có thể chọn một phần cấu hình, không cần chọn đủ tất cả
                    hạng mục.
                  </div>
                </div>
                {options.nhom_hang_muc.map((group) => (
                  <section className="build-section" key={group.ma_nhom}>
                    <div className="build-section-header">
                      <h2 className="build-section-title">{group.ten_nhom}</h2>
                      <span className="build-section-progress">
                        {
                          group.hang_muc.filter(
                            (slot) => selections[slot.ma_hang_muc],
                          ).length
                        }
                        /{group.hang_muc.length}
                      </span>
                    </div>
                    <div className="build-slot-list">
                      {group.hang_muc.map((slot) => {
                        const code = slot.ma_hang_muc;
                        const item = selections[code];
                        const line = preview?.items.find(
                          (row) => row.ma_hang_muc === code,
                        );
                        const [title, subtitle] =
                          slot.ten_hang_muc.split(" - ");
                        const maximum =
                          item &&
                          availableQuantity(
                            item,
                            code,
                            selections,
                            line?.ton_co_the_ban ?? item.ton_co_the_ban,
                          );
                        return (
                          <div className="build-slot-item" key={code}>
                            <div className="slot-id">
                              {String(slots.indexOf(slot) + 1).padStart(2, "0")}
                            </div>
                            <div className="slot-info">
                              <div className="slot-title">{title}</div>
                              <div className="slot-subtitle">{subtitle}</div>
                            </div>
                            <div className="slot-content">
                              {item ? (
                                <div className="selected-product-detailed">
                                  {item.anh_dai_dien && (
                                    <img
                                      className="selected-img-large"
                                      src={item.anh_dai_dien}
                                      alt={item.ten_san_pham}
                                    />
                                  )}
                                  <div className="selected-details-large">
                                    <div className="selected-name-large">
                                      {item.ten_san_pham}
                                    </div>
                                    <div className="selected-specs-large">
                                      {item.ten_phien_ban}
                                    </div>
                                    <div className="selected-meta-large">
                                      <span>MÃ SP: {item.ma_san_pham}</span>
                                      <span>
                                        BẢO HÀNH:{" "}
                                        {item.bao_hanh_thang == null
                                          ? "Chưa cung cấp"
                                          : `${item.bao_hanh_thang} tháng`}
                                      </span>
                                      <span>
                                        KHO:{" "}
                                        {line?.ton_co_the_ban ??
                                          "Đang kiểm tra"}
                                      </span>
                                    </div>
                                    <div className="selected-price-row">
                                      <span className="price-label">
                                        ĐƠN GIÁ:
                                      </span>
                                      <span className="price-value">
                                        {money(line?.don_gia)}
                                      </span>
                                    </div>
                                    <div className="selected-qty-row">
                                      <span className="qty-label">
                                        SỐ LƯỢNG
                                      </span>
                                      <div className="qty-controls">
                                        <button
                                          disabled={
                                            locked || item.so_luong <= 1
                                          }
                                          aria-label={`Giảm số lượng ${title}`}
                                          onClick={() =>
                                            quantity(code, item.so_luong - 1)
                                          }
                                        >
                                          −
                                        </button>
                                        <input
                                          aria-label={`Số lượng ${title}`}
                                          type="number"
                                          min="1"
                                          max={maximum}
                                          disabled={locked}
                                          value={item.so_luong}
                                          onChange={(e) =>
                                            quantity(
                                              code,
                                              Number(e.target.value),
                                            )
                                          }
                                        />
                                        <button
                                          disabled={
                                            locked || item.so_luong >= maximum
                                          }
                                          aria-label={`Tăng số lượng ${title}`}
                                          onClick={() =>
                                            quantity(code, item.so_luong + 1)
                                          }
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    <div className="selected-total-row">
                                      <span className="price-label">
                                        THÀNH TIỀN:
                                      </span>
                                      <span className="price-value">
                                        {money(line?.thanh_tien)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="empty-slot-text">
                                  CHƯA CHỌN SẢN PHẨM
                                </div>
                              )}
                            </div>
                            <div className="slot-action">
                              {item ? (
                                <div className="action-buttons-stacked">
                                  <button
                                    className="btn-change-slot"
                                    disabled={locked}
                                    onClick={() => setActiveSlot(slot)}
                                  >
                                    THAY ĐỔI
                                  </button>
                                  <button
                                    className="btn-remove-slot-text"
                                    disabled={locked}
                                    onClick={() => remove(code)}
                                  >
                                    XÓA
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn-choose-product"
                                  aria-label={`Chọn ${slot.ten_hang_muc}`}
                                  disabled={locked}
                                  onClick={() => setActiveSlot(slot)}
                                >
                                  CHỌN SẢN PHẨM
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              <aside className="build-right-column">
                <div className="build-summary-box">
                  <div className="summary-header">
                    <h3>CẤU HÌNH CỦA BẠN</h3>
                    <p>
                      {preview
                        ? `${preview.so_hang_muc_da_chon}/${preview.tong_hang_muc} HẠNG MỤC · ${preview.tong_so_luong} SẢN PHẨM`
                        : "Đang kiểm tra cấu hình"}
                    </p>
                  </div>
                  <div className="summary-body" aria-live="polite">
                    {previewError ? (
                      <div role="alert" className="build-error">
                        {previewError}
                        <button
                          disabled={locked}
                          onClick={() =>
                            setPreviewRevision((value) => value + 1)
                          }
                        >
                          Tính lại cấu hình
                        </button>
                      </div>
                    ) : !preview ? (
                      <div className="empty-summary">
                        Đang cập nhật giá và tồn kho...
                      </div>
                    ) : !preview.items.length ? (
                      <div className="empty-summary">
                        Chưa có sản phẩm trong cấu hình.
                      </div>
                    ) : (
                      preview.items.map((line) => (
                        <div
                          className="summary-item-detailed"
                          key={line.ma_hang_muc}
                        >
                          <div className="summary-item-name">
                            {
                              slots.find(
                                (slot) => slot.ma_hang_muc === line.ma_hang_muc,
                              )?.ten_hang_muc
                            }
                            <br />
                            {line.ten_san_pham}
                          </div>
                          <div className="summary-item-price-calc">
                            <div className="calc-line">
                              {line.so_luong} × {money(line.don_gia)}
                            </div>
                            <div className="total-line">
                              {money(line.thanh_tien)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="compatibility-check">
                    <div className="compat-title">
                      KIỂM TRA SOCKET CPU / MAIN
                    </div>
                    <div
                      className={
                        preview?.kiem_tra_cpu_main.trang_thai === "KHOP_SOCKET"
                          ? "status-ok"
                          : "build-warning"
                      }
                    >
                      {preview
                        ? socketLabels[preview.kiem_tra_cpu_main.trang_thai]
                        : "Đang kiểm tra"}
                    </div>
                    <p className="total-note">
                      Chỉ kiểm tra socket CPU và Mainboard.
                    </p>
                    {preview?.loi.map((error, index) => (
                      <p className="build-error" key={index}>
                        {error}
                      </p>
                    ))}
                  </div>
                  <div className="build-summary-footer">
                    <div className="total-label">TỔNG TẠM TÍNH</div>
                    <div className="total-price">
                      {money(preview?.tong_tam_tinh)}
                    </div>
                    <p className="total-note">
                      Giá và tồn kho được kiểm tra lại khi thêm vào giỏ hàng.
                    </p>
                    <button
                      className="btn-add-all-cart"
                      disabled={
                        exporting ||
                        adding ||
                        (!uncertain && !preview?.co_the_gui_yeu_cau_them_gio)
                      }
                      onClick={addToCart}
                    >
                      {adding
                        ? "ĐANG THÊM..."
                        : uncertain
                          ? "THỬ LẠI YÊU CẦU THÊM GIỎ"
                          : "THÊM CẤU HÌNH VÀO GIỎ HÀNG"}
                    </button>

                    <button
                      type="button"
                      className="btn-export-build"
                      disabled={locked || !preview?.co_the_xuat_excel}
                      onClick={exportExcel}
                    >
                      {exporting ? "ĐANG XUẤT EXCEL..." : "XUẤT CẤU HÌNH EXCEL"}
                    </button>

                    <button
                      className="btn-clear-build"
                      disabled={locked || !selectedCount}
                      onClick={() => setConfirmClear(true)}
                    >
                      XÓA CẤU HÌNH
                    </button>
                    {message && (
                      <p role="alert" className="build-error">
                        {message}
                      </p>
                    )}
                    {uncertain && (
                      <p className="build-warning">
                        Yêu cầu chưa xác định kết quả. Giữ nguyên cấu hình và
                        thử lại cùng yêu cầu để tránh thêm trùng.
                      </p>
                    )}
                    {success && (
                      <div className="added-success-box" role="status">
                        <div className="success-count-text">
                          ĐÃ THÊM {success.so_hang_muc_da_them} HẠNG MỤC ·{" "}
                          {success.tong_so_luong_da_them} SẢN PHẨM
                        </div>
                        <div className="success-actions-row">
                          <Link className="btn-success-view-cart" to="/cart">
                            XEM GIỎ HÀNG
                          </Link>
                          <button
                            className="btn-success-continue"
                            onClick={() => setSuccess(null)}
                          >
                            TIẾP TỤC CHỌN LINH KIỆN
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      {activeSlot && (
        <ComponentSelectionModal
          key={activeSlot.ma_hang_muc}
          slot={activeSlot}
          options={options}
          selections={selections}
          onClose={() => setActiveSlot(null)}
          onSelect={select}
        />
      )}
      {confirmClear && (
        <ClearConfirmation
          onClose={() => setConfirmClear(false)}
          onConfirm={() => {
            changeSelections({});
            setConfirmClear(false);
          }}
        />
      )}
      <Footer />
    </div>
  );
};

function ClearConfirmation({ onClose, onConfirm }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="build-clear-confirmation"
      aria-labelledby="clear-build-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h3 id="clear-build-title">Xóa toàn bộ cấu hình đã chọn?</h3>
      <p>Các sản phẩm đã chọn sẽ được bỏ khỏi cấu hình.</p>
      <div>
        <button autoFocus onClick={onClose}>
          GIỮ CẤU HÌNH
        </button>
        <button onClick={onConfirm}>XÁC NHẬN XÓA</button>
      </div>
    </dialog>
  );
}

export default CustomBuildPage;
