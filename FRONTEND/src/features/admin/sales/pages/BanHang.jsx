// Admin point-of-sale screen.
import { useEffect, useRef, useState } from "react";
import {
  HiOutlineCheck,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineShoppingCart,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import { getAvailableSerials } from "../../inventory/api/serialApi";
import {
  buildPosCheckoutBody,
  buildPosPreviewBody,
  checkoutPosOrder,
  createSalesCustomer,
  getSalesOptions,
  previewOnlineOrder,
  previewPosOrder,
  searchSalesCustomers,
  searchSalesProducts,
  posSerialGroups,
} from "../../orders/api/onlineOrderApi";
import {
  addProduct,
  applyOrderPreview,
  closeOrderTab,
  createOrder,
  findStockIssue,
  nextOrderNumber,
  orderTotals,
  resetOrder,
  setProductQuantity,
  updateOrder,
} from "../state/salesState";
import PaymentSuccessModal from "../components/PaymentSuccessModal";
import { sameQuotedPrice } from "../../../../shared/services/saleQuote";

import { createRequestKey } from "../../../../shared/services/mutationUtils";
import "./BanHang.css";

const money = (value) =>
  value == null ? "—" : `${Number(value).toLocaleString("vi-VN")}đ`;
const productName = (product) => product.name || product.tenSanPham;
const productCode = (product) =>
  [product.code || product.maSanPham, product.variant]
    .filter(Boolean)
    .join(" · ");
const productPrice = (product, priceList) =>
  Number(product.unitPrice ?? product.prices?.[priceList] ?? 0);
const pendingCheckoutKey = "ruventu_pos_pending_checkout";

function Heading({ children }) {
  return <h2 className="pos-heading">{children}</h2>;
}

function PosDialog({ children, className, labelledBy, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export default function BanHang() {
  const [orders, setOrders] = useState(() => [createOrder(1)]);
  const [activeId, setActiveId] = useState(1);
  const [salesOptions, setSalesOptions] = useState(null);
  const [optionsError, setOptionsError] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [productStatus, setProductStatus] = useState("idle");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerStatus, setCustomerStatus] = useState("idle");
  const [productFocused, setProductFocused] = useState(false);
  const [customerFocused, setCustomerFocused] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);
  const [customerCreateError, setCustomerCreateError] = useState("");
  const [serialModal, setSerialModal] = useState(null);
  const [serialSearch, setSerialSearch] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(pendingCheckoutKey));
    } catch {
      return null;
    }
  });
  const checkoutLock = useRef(false);
  const order = orders.find((item) => item.id === activeId);
  const [previewState, setPreviewState] = useState({});
  const [previewRevision, setPreviewRevision] = useState(0);
  const previewSignature =
    salesOptions && order.cart.length
      ? JSON.stringify(buildPosPreviewBody(order, salesOptions))
      : "";
  const previewKey = `${activeId}|${previewSignature}`;
  const previewReady =
    Boolean(previewSignature) &&
    order.preview?.signature === previewSignature &&
    previewState.key === previewKey &&
    !previewState.loading &&
    !previewState.error;
  const previewData = previewReady ? order.preview.data : null;
  const totals = orderTotals({
    ...order,
    preview: previewReady ? order.preview : null,
  });

  const serialGroups = posSerialGroups(previewData);
  const giftRequirements = serialGroups.filter((group) => group.gift);
  useEffect(() => {
    if (!previewSignature) return;
    const controller = new AbortController();
    setPreviewState({ key: previewKey, loading: true });
    const timer = setTimeout(async () => {
      try {
        const data = await previewOnlineOrder(
          JSON.parse(previewSignature),
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setOrders((current) =>
          current.map((item) =>
            item.id === activeId
              ? applyOrderPreview(item, previewSignature, data)
              : item,
          ),
        );
        setPreviewState({ key: previewKey });
      } catch (error) {
        if (!controller.signal.aborted) {
          setOrders((current) =>
            current.map((item) =>
              item.id === activeId
                ? { ...item, preview: null, paymentReceived: false }
                : item,
            ),
          );
          setPreviewState({ key: previewKey, error: error.message });
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeId, previewSignature, previewKey, previewRevision]);
  useEffect(() => {
    const controller = new AbortController();
    getSalesOptions(controller.signal)
      .then((data) => {
        setSalesOptions(data);
        setOrders((current) =>
          current.map((item) =>
            item.employee
              ? item
              : { ...item, employee: data.nhan_vien_mac_dinh },
          ),
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setOptionsError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const keyword = customerSearch.trim();
    if (!keyword) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setCustomerResults(
          await searchSalesCustomers(keyword, controller.signal),
        );
        setCustomerStatus("done");
      } catch (error) {
        if (error.name !== "AbortError") {
          setCustomerResults([]);
          setCustomerStatus("error");
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [customerSearch]);
  useEffect(() => {
    const keyword = productSearch.trim();
    if (!keyword || !salesOptions) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await searchSalesProducts(
          keyword,
          salesOptions,
          controller.signal,
        );
        setProductResults(results);
        setOrders((current) =>
          current.map((entry) => ({
            ...entry,
            cart: entry.cart.map((line) => ({
              ...line,
              product:
                results.find((product) => product.id === line.product.id) ||
                line.product,
            })),
          })),
        );
        setProductStatus("done");
      } catch (error) {
        if (error.name !== "AbortError") {
          setProductResults([]);
          setProductStatus("error");
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [productSearch, salesOptions]);
  const patch = (change) =>
    setOrders((current) =>
      current.map((item) =>
        item.id === activeId
          ? updateOrder(
              item,
              typeof change === "function" ? change(item) : change,
            )
          : item,
      ),
    );
  const clearSearch = () => {
    setProductSearch("");
    setCustomerSearch("");
    setProductFocused(false);
    setCustomerFocused(false);
  };
  const newOrder = () => {
    const next = createOrder(
      nextOrderNumber(orders),
      salesOptions?.nhan_vien_mac_dinh || order.employee,
    );
    setOrders((current) => [...current, next]);
    setActiveId(next.id);
    clearSearch();
  };
  const closeTab = (id) => {
    const next = closeOrderTab(orders, activeId, id);
    setOrders(next.orders);
    setActiveId(next.activeId);
    if (id === activeId) clearSearch();
  };
  const dismissPayment = (print = false) => {
    if (!receipt) return;
    if (print) console.log("printing invoice", receipt);
    setOrders((current) =>
      current.map((item) =>
        item.id === receipt.tabId ? resetOrder(item) : item,
      ),
    );
    setReceipt(null);
    clearSearch();
  };
  const selectProduct = (product) => {
    patch((current) => ({ cart: addProduct(current.cart, product) }));
    setProductSearch("");
    setProductFocused(false);
  };
  const selectCustomer = (customer) => {
    patch({ customer });
    setCustomerSearch("");
    setCustomerFocused(false);
  };
  const openCustomerModal = () => {
    const value = customerSearch.trim();
    const phone = /^[\d\s.+-]+$/.test(value)
      ? value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "")
      : "";
    setCustomerModal({ name: phone ? "" : value, phone });
    setCustomerCreateError("");
    setCustomerFocused(false);
  };
  const submitCustomer = async (event) => {
    event.preventDefault();
    setCustomerCreateError("");
    setCustomerModal((current) => ({ ...current, saving: true }));
    try {
      const customer = await createSalesCustomer(customerModal);
      selectCustomer(customer);
      setCustomerModal(null);
    } catch (error) {
      setCustomerCreateError(error.message || "Không thể tạo khách hàng.");
      setCustomerModal((current) => current && { ...current, saving: false });
    }
  };

  const changeQuantity = (id, quantity) =>
    patch((current) => ({
      cart: setProductQuantity(current.cart, id, quantity),
    }));

  const openSerialModal = (group) => {
    setSerialSearch("");

    setSerialModal({
      ...group,
      productId: group.variantId,
      total: 0,
      loading: true,
      candidates: [],
      error: "",
    });
  };

  const closeSerialModal = () => {
    setSerialModal(null);
  };

  useEffect(() => {
    if (!serialModal) return undefined;

    const controller = new AbortController();
    const key = serialModal.key;
    const productId = serialModal.productId;

    const updateModal = (patchValue) => {
      setSerialModal((current) =>
        current?.key === key
          ? { ...current, ...patchValue }
          : current,
      );
    };

    updateModal({
      loading: true,
      candidates: [],
      error: "",
    });

    const timer = setTimeout(async () => {
      try {
        const data = await getAvailableSerials(productId, serialSearch, controller.signal);

        if (controller.signal.aborted) return;

        updateModal({
          loading: false,
          candidates: data.items,
          total: data.totalItems,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        updateModal({
          loading: false,
          candidates: [],
          error: error.message || "Không thể tải serial khả dụng.",
        });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    serialModal?.key,
    serialModal?.productId,
    serialSearch,
  ]);

  const serialIssue = serialGroups.find(
    (group) =>
      (order.serialSelections?.[group.key]?.length || 0) !== group.quantity,
  );

  const stockIssue = findStockIssue(order.cart);

  const transactionMissing =
    order.paymentMethod !== "cash" && !(order.transactionCode || "").trim();

  const paymentIssue =
    previewReady &&
    (order.paymentMethod === "cash"
      ? order.paid < totals.total
      : order.paid !== totals.total);

  const serialLine = serialModal
    ? {
        product: {
          id: serialModal.productId,
          name: serialModal.label,
        },
        quantity: serialModal.quantity,
        serials: order.serialSelections?.[serialModal.key] || [],
      }
    : null;

  const shownSerials = serialModal?.candidates || [];

  const toggleSerial = (candidate) => {
    if (!serialModal) return;

    const usedElsewhere = Object.entries(order.serialSelections || {}).some(
      ([key, selected]) =>
        key !== serialModal.key &&
        selected.some((serial) => serial.id === candidate.id),
    );

    if (usedElsewhere) {
      setSerialModal((current) => ({
        ...current,
        error: "Serial này đã được chọn cho dòng hoặc linh kiện khác.",
      }));
      return;
    }

    setSerialModal((current) => ({
      ...current,
      error: "",
    }));

    patch((current) => {
      const selected = current.serialSelections?.[serialModal.key] || [];

      const exists = selected.some((serial) => serial.id === candidate.id);

      const next = exists
        ? selected.filter((serial) => serial.id !== candidate.id)
        : selected.length < serialModal.quantity
          ? [...selected, candidate]
          : selected;

      return {
        serialSelections: {
          ...current.serialSelections,
          [serialModal.key]: next,
        },
      };
    });
  };

  const checkout = async () => {
    if (
      checkoutLock.current ||
      receipt ||
      (!checkoutPending && !salesOptions)
    ) {
      return;
    }

    if (
      !checkoutPending &&
      (!previewReady ||
        !order.cart.length ||
        serialIssue ||
        stockIssue ||
        transactionMissing ||
        paymentIssue ||
        !order.paymentReceived)
    ) {
      return;
    }

    checkoutLock.current = true;
    setCheckoutBusy(true);
    setCheckoutError("");

    try {
      let attempt = checkoutPending;

      if (!attempt) {
        if (order.discount) {
          throw new Error(
            "Chiết khấu thủ công chưa được hỗ trợ. " +
              "Vui lòng đặt về 0 và chọn chương trình khuyến mại.",
          );
        }

        const freshPreview = await previewPosOrder(order, salesOptions);

        if (!sameQuotedPrice(previewData, freshPreview)) {
          setOrders((current) =>
            current.map((item) =>
              item.id === activeId
                ? {
                    ...applyOrderPreview(item, previewSignature, freshPreview),
                    paymentReceived: false,
                  }
                : item,
            ),
          );

          throw new Error(
            "Giá hoặc cấu hình khuyến mại đã thay đổi. " +
              "Vui lòng kiểm tra lại và xác nhận thanh toán.",
          );
        }

        attempt = {
          tabId: order.id,
          key: createRequestKey(),
          body: buildPosCheckoutBody(order, salesOptions, freshPreview),
        };

        sessionStorage.setItem(pendingCheckoutKey, JSON.stringify(attempt));

        setCheckoutPending(attempt);
      }

      const result = await checkoutPosOrder(attempt.body, attempt.key);

      setReceipt({
        ...result,
        tabId: attempt.tabId,
      });

      sessionStorage.removeItem(pendingCheckoutKey);
      setCheckoutPending(null);
    } catch (error) {
      setCheckoutError(error.message || "Không thể thanh toán.");

      const status = Number(error.status || error.response?.status);

      if ([400, 401, 403, 404, 409, 422].includes(status)) {
        sessionStorage.removeItem(pendingCheckoutKey);
        setCheckoutPending(null);

        setOrders((current) =>
          current.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  preview: null,
                  paymentReceived: false,
                }
              : item,
          ),
        );

        setPreviewRevision((value) => value + 1);
      }
    } finally {
      checkoutLock.current = false;
      setCheckoutBusy(false);
    }
  };

  return (
    <main className="pos-page">
      {checkoutPending && !checkoutBusy && (
        <div className="pos-block" role="alert">
          <p className="pos-error">
            {checkoutError} Chưa xác định được kết quả thanh toán. Giữ nguyên
            đơn để thử lại với cùng mã chống lặp.
          </p>
          <button type="button" className="pos-red-button" onClick={checkout}>
            THỬ LẠI THANH TOÁN
          </button>
        </div>
      )}
      <fieldset
        className="pos-controls"
        disabled={checkoutBusy || Boolean(checkoutPending)}
      >
        <div className="pos-toolbar">
          <button type="button" className="pos-red-button" onClick={newOrder}>
            <HiOutlinePlus /> TẠO HOÁ ĐƠN
          </button>
        </div>
        <div className="pos-tabs" aria-label="Đơn hàng">
          {orders.map((item) => (
            <div
              key={item.id}
              className={`pos-order-tab ${item.id === activeId ? "is-active" : ""}`}
            >
              <button
                type="button"
                aria-pressed={item.id === activeId}
                onClick={() => {
                  setActiveId(item.id);
                  clearSearch();
                }}
              >
                {item.code}
              </button>
              <button
                type="button"
                className="pos-close-tab"
                aria-label={`Đóng đơn ${item.code}`}
                onClick={() => closeTab(item.id)}
              >
                <HiOutlineX />
              </button>
            </div>
          ))}
          <button type="button" className="pos-new-tab" onClick={newOrder}>
            <HiOutlinePlus /> ĐƠN MỚI
          </button>
        </div>
        <div className="pos-columns">
          <aside className="pos-left">
            <section className="pos-block pos-customer">
              <Heading>Khách hàng</Heading>
              {order.customer ? (
                <div className="pos-customer-card">
                  <strong>{order.customer.name}</strong>
                  {order.customer.phone && (
                    <a href={`tel:${order.customer.phone.replace(/\s/g, "")}`}>
                      {order.customer.phone}
                    </a>
                  )}
                  {order.customer.email && <span>{order.customer.email}</span>}
                  <button
                    type="button"
                    aria-label="Chọn Khách lẻ"
                    onClick={() => patch({ customer: null })}
                  >
                    <HiOutlineX />
                  </button>
                </div>
              ) : (
                <div
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      setCustomerFocused(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setCustomerFocused(false);
                  }}
                >
                  <em className="pos-customer-guest">KHÁCH LẺ</em>
                  <input
                    aria-label="Tìm khách hàng"
                    placeholder="TÌM TÊN / SĐT / EMAIL..."
                    value={customerSearch}
                    onFocus={() => setCustomerFocused(true)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        customerStatus === "done" &&
                        !customerResults.length
                      ) {
                        event.preventDefault();
                        openCustomerModal();
                      }
                    }}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCustomerSearch(value);
                      setCustomerResults([]);
                      setCustomerStatus(value.trim() ? "loading" : "idle");
                      setCustomerFocused(true);
                    }}
                  />
                  {customerFocused && customerSearch.trim() && (
                    <div className="pos-customer-results">
                      {customerStatus === "loading" && (
                        <p>Đang tìm khách hàng...</p>
                      )}
                      {customerStatus === "error" && (
                        <p>Không thể tải khách hàng. Vui lòng thử lại.</p>
                      )}
                      {customerStatus === "done" &&
                        customerResults.map((customer) => (
                          <button
                            type="button"
                            key={customer.id}
                            onClick={() => selectCustomer(customer)}
                          >
                            <strong>{customer.name}</strong>
                            <small>
                              {[customer.phone, customer.email]
                                .filter(Boolean)
                                .join(" · ") || "Không có thông tin liên hệ"}
                            </small>
                          </button>
                        ))}
                      {customerStatus === "done" && !customerResults.length && (
                        <p>Không tìm thấy khách hàng.</p>
                      )}
                      <button
                        type="button"
                        className="pos-customer-new-result"
                        onClick={openCustomerModal}
                      >
                        + TẠO KHÁCH HÀNG MỚI
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!order.customer && (
                <button
                  type="button"
                  className="pos-customer-create"
                  onClick={openCustomerModal}
                >
                  + TẠO KHÁCH HÀNG MỚI
                </button>
              )}
            </section>
            <section className="pos-block pos-tax">
              <div>
                <span>Áp dụng VAT</span>
                {order.tax && (
                  <label className="pos-vat-mode">
                    <span>Chế độ giá</span>
                    <select
                      value={order.taxMode || "CHUA_BAO_GOM"}
                      onChange={(event) =>
                        patch({ taxMode: event.target.value })
                      }
                    >
                      <option value="CHUA_BAO_GOM">CHƯA BAO GỒM THUẾ</option>
                      <option value="DA_BAO_GOM">ĐÃ BAO GỒM THUẾ</option>
                    </select>
                  </label>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Áp dụng VAT"
                aria-checked={order.tax}
                className={`pos-switch ${order.tax ? "is-on" : ""}`}
                onClick={() => patch({ tax: !order.tax })}
              >
                <span />
              </button>
            </section>
            <div className="pos-block pos-readonly">
              <span>Bảng giá</span>
              <strong>Giá lẻ</strong>
            </div>
            <div className="pos-block pos-readonly">
              <span>Nhân viên thanh toán</span>
              <strong>
                {order.employee?.ho_ten || "Đang tải phiên đăng nhập..."}
              </strong>
            </div>
            <label className="pos-block pos-field">
              <span>Ghi chú</span>
              <textarea
                value={order.note || ""}
                onChange={(event) => patch({ note: event.target.value })}
              />
            </label>
          </aside>
          <section className="pos-middle" aria-label="Sản phẩm trong đơn">
            <div
              className="pos-search-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setProductFocused(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setProductFocused(false);
              }}
            >
              <div
                className={`pos-search ${productFocused && productSearch.trim() ? "is-active" : ""}`}
              >
                <HiOutlineSearch />
                <input
                  aria-label="Tìm sản phẩm"
                  placeholder="TÌM MÃ / TÊN / PHIÊN BẢN / MÃ VẠCH..."
                  value={productSearch}
                  onFocus={() => setProductFocused(true)}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setProductResults([]);
                    setProductStatus(
                      event.target.value.trim() ? "loading" : "idle",
                    );
                    setProductFocused(true);
                  }}
                />
                {productSearch && (
                  <button
                    type="button"
                    aria-label="Xóa tìm kiếm sản phẩm"
                    onClick={() => setProductSearch("")}
                  >
                    <HiOutlineX />
                  </button>
                )}
              </div>
              {productFocused && productSearch.trim() && (
                <div className="pos-product-results">
                  {productStatus === "loading" && !optionsError && (
                    <p>Đang tìm sản phẩm...</p>
                  )}
                  {(productStatus === "error" || optionsError) && (
                    <p>Không thể tải sản phẩm. Vui lòng thử lại.</p>
                  )}
                  {productStatus === "done" &&
                    productResults.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        disabled={product.stock < 1}
                        onClick={() => selectProduct(product)}
                      >
                        <span>
                          <strong>{productName(product)}</strong>
                          <small>{productCode(product)}</small>
                          <small>
                            CÒN BÁN: {product.stock}
                            {product.serialManaged && (
                              <b className="pos-serial-required">
                                YÊU CẦU SERIAL
                              </b>
                            )}
                          </small>
                        </span>
                        <span className="pos-result-price">
                          <strong>
                            {money(productPrice(product, order.priceList))}
                          </strong>
                        </span>
                      </button>
                    ))}
                  {productStatus === "done" && !productResults.length && (
                    <p>Không tìm thấy sản phẩm.</p>
                  )}
                </div>
              )}
            </div>
            <div className="pos-cart-scroll">
              <table className="pos-cart">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>VAT</th>
                    <th>Chiết khấu</th>
                    <th>Thành tiền</th>
                    <th>Serial</th>
                    <th>
                      <span className="pos-sr-only">Xóa</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.cart.map(({ product, quantity }, index) => {
                    const previewLine = previewData?.san_pham.find(
                      (line) => line.ma_dong === `d${product.id}`,
                    );
                    const price = previewLine
                      ? Number(previewLine.don_gia)
                      : productPrice(product, order.priceList);
                    const subtotal = price * quantity;
                    const lineTotal = previewLine
                      ? Number(previewLine.thanh_toan_dong)
                      : null;
                    return (
                      <tr key={product.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{productName(product)}</strong>
                          <small>{productCode(product)}</small>
                          {quantity > product.stock && (
                            <small className="pos-inline-error">
                              Số lượng vượt tồn có thể bán ({product.stock}).
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="pos-stepper">
                            <button
                              type="button"
                              aria-label={`Giảm số lượng ${productName(product)}`}
                              disabled={quantity === 1}
                              onClick={() =>
                                changeQuantity(product.id, quantity - 1)
                              }
                            >
                              −
                            </button>
                            <input
                              aria-label={`Số lượng ${productName(product)}`}
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max={product.stock}
                              value={quantity}
                              onChange={(event) =>
                                changeQuantity(product.id, event.target.value)
                              }
                            />
                            <button
                              type="button"
                              aria-label={`Tăng số lượng ${productName(product)}`}
                              disabled={quantity >= product.stock}
                              onClick={() =>
                                changeQuantity(product.id, quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="pos-price">{money(price)}</td>
                        <td>
                          {order.tax && (
                            <span className="pos-vat-badge">
                              {product.vatRate}%
                            </span>
                          )}
                        </td>
                        <td>
                          {previewLine?.tien_chiet_khau > 0
                            ? `−${money(previewLine.tien_chiet_khau)}`
                            : "—"}
                        </td>
                        <td className="pos-line-total">{money(lineTotal)}</td>
                        <td>
                          {serialGroups
                            .filter(
                              (group) => group.lineKey === `d${product.id}`,
                            )
                            .map((group) => {
                              const selected =
                                order.serialSelections?.[group.key] || [];

                              return (
                                <div
                                  className="pos-serial-group"
                                  key={group.key}
                                >
                                  <button
                                    type="button"
                                    className={
                                      "pos-serial-badge " +
                                      (selected.length === group.quantity
                                        ? "is-complete"
                                        : "")
                                    }
                                    onClick={() => openSerialModal(group)}
                                  >
                                    {selected.length}/{group.quantity} SERIAL
                                  </button>
                                </div>
                              );
                            })}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pos-remove"
                            aria-label={`Xóa ${productName(product)}`}
                            onClick={() =>
                              patch((current) => ({
                                cart: current.cart.filter(
                                  (item) => item.product.id !== product.id,
                                ),
                              }))
                            }
                          >
                            <HiOutlineTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(previewData?.san_pham || [])
                    .filter((line) => line.la_qua_tang)
                    .map((line) => (
                      <tr key={line.ma_dong} className="pos-gift-row">
                        <td>🎁</td>
                        <td>
                          <strong>Quà tặng khuyến mại</strong>
                          <small>Phiên bản #{line.phien_ban_id}</small>
                        </td>
                        <td>{line.so_luong}</td>
                        <td>{money(line.don_gia)}</td>
                        <td>—</td>
                        <td>—</td>
                        <td className="pos-line-total">
                          {money(line.thanh_toan_dong)}
                        </td>
                        <td>
                          {giftRequirements
                            .filter((group) => group.lineKey === line.ma_dong)
                            .map((group) => {
                              const selected =
                                order.serialSelections?.[group.key] || [];

                              return (
                                <div
                                  className="pos-serial-group"
                                  key={group.key}
                                >
                                  <button
                                    type="button"
                                    title={group.label}
                                    aria-label={`Chọn serial cho quà tặng ${group.label}`}
                                    className={
                                      "pos-serial-badge " +
                                      (selected.length === group.quantity
                                        ? "is-complete"
                                        : "")
                                    }
                                    onClick={() => openSerialModal(group)}
                                  >
                                    {selected.length}/{group.quantity} SERIAL
                                  </button>
                                </div>
                              );
                            })}
                        </td>
                        <td />
                      </tr>
                    ))}
                </tbody>
              </table>
              {!order.cart.length && (
                <div className="pos-empty">
                  <HiOutlineShoppingCart />
                  <strong>CHƯA CÓ SẢN PHẨM</strong>
                  <p>Tìm và thêm sản phẩm ở thanh tìm kiếm phía trên</p>
                </div>
              )}
            </div>
          </section>
          <aside className="pos-right">
            <section className="pos-block pos-summary">
              <Heading>Tổng đơn hàng</Heading>

              <div>
                <span>Tiền hàng</span>
                <strong>{money(totals.subtotal)}</strong>
              </div>

              <div>
                <span>
                  {!order.tax
                    ? "VAT · không áp dụng trong đơn"
                    : order.taxMode === "DA_BAO_GOM"
                      ? "VAT · đã nằm trong giá"
                      : "VAT · cộng thêm"}
                </span>
                <strong>{money(totals.vat)}</strong>
              </div>

              <div>
                <span>Giảm giá từ chương trình</span>
                <strong>{money(totals.discountAmount)}</strong>
              </div>

              {order.cart.length > 0 && !previewReady && (
                <p className="pos-promotion-note" role="status">
                  {previewState.key === previewKey && previewState.error
                    ? "Chưa lấy được tổng thanh toán."
                    : "Đang lấy tổng thanh toán từ hệ thống..."}
                </p>
              )}

              {previewState.key === previewKey && previewState.error && (
                <button
                  type="button"
                  onClick={() => setPreviewRevision((value) => value + 1)}
                >
                  TÍNH LẠI
                </button>
              )}

              <div className="pos-total">
                <strong>KHÁCH PHẢI TRẢ</strong>
                <strong>{money(totals.total)}</strong>
              </div>
            </section>
            {order.cart.length > 0 && (
              <section
                className="pos-block pos-promotions"
                aria-label="Khuyến mại"
              >
                <div className="pos-promotion-header">
                  <Heading>Khuyến mại</Heading>
                  {order.promotion && (
                    <button
                      type="button"
                      onClick={() => {
                        patch({ promotion: "" });
                        setCheckoutError("");
                      }}
                    >
                      ✕ BỎ KHUYẾN MẠI
                    </button>
                  )}
                </div>
                {!previewReady && !previewState.error && (
                  <p className="pos-promotion-note" role="status">
                    Đang tính lại...
                  </p>
                )}
                {previewState.key === previewKey && previewState.error && (
                  <p className="pos-error" role="alert">
                    {previewState.error}
                  </p>
                )}
                {(order.promotions || []).map((promotion) => (
                  <button
                    key={promotion.ma_chuong_trinh}
                    type="button"
                    aria-pressed={order.promotion === promotion.ma_chuong_trinh}
                    className={`pos-promotion-card ${order.promotion === promotion.ma_chuong_trinh ? "is-selected" : ""}`}
                    onClick={() => {
                      patch({
                        promotion: promotion.ma_chuong_trinh,
                        discount: 0,
                      });
                      setCheckoutError("");
                    }}
                  >
                    <strong>{promotion.ma_chuong_trinh}</strong>
                    <small>{promotion.ten_chuong_trinh}</small>
                  </button>
                ))}
                {previewReady && !order.promotions?.length && (
                  <p className="pos-promotion-note">
                    Không có chương trình khả dụng cho giỏ hàng.
                  </p>
                )}
              </section>
            )}
            <section className="pos-block pos-field">
              <span>Phương thức thanh toán</span>
              <div className="pos-payment-method">
                {[
                  ["cash", "TIỀN MẶT"],
                  ["transfer", "CHUYỂN KHOẢN"],
                  ["card", "THẺ"],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={order.paymentMethod === id}
                    className={order.paymentMethod === id ? "is-selected" : ""}
                    onClick={() => patch({ paymentMethod: id })}
                  >
                    ○ {label}
                  </button>
                ))}
              </div>
            </section>
            <label className="pos-block pos-field">
              <span>
                {order.paymentMethod === "cash"
                  ? "Tiền khách đưa"
                  : "Số tiền đã nhận"}
              </span>
              <div className="pos-paid">
                <input
                  aria-label={
                    order.paymentMethod === "cash"
                      ? "Tiền khách đưa"
                      : "Số tiền đã nhận"
                  }
                  inputMode="numeric"
                  value={Number(order.paid).toLocaleString("vi-VN")}
                  onChange={(event) =>
                    patch({
                      paid: Number(event.target.value.replace(/\D/g, "")) || 0,
                    })
                  }
                />
                <span>đ</span>
              </div>
              {order.paymentMethod === "cash" && (
                <small className="pos-change">
                  TIỀN THỪA TRẢ KHÁCH{" "}
                  <strong>
                    {money(
                      previewReady
                        ? Math.max(0, order.paid - totals.total)
                        : null,
                    )}
                  </strong>
                </small>
              )}
            </label>
            {order.paymentMethod !== "cash" && (
              <label className="pos-block pos-field">
                <span>Mã giao dịch *</span>
                <input
                  aria-label="Mã giao dịch"
                  placeholder="Nhập mã giao dịch..."
                  value={order.transactionCode || ""}
                  onChange={(event) =>
                    patch({ transactionCode: event.target.value })
                  }
                />
              </label>
            )}
            <label className="pos-block pos-confirm-payment">
              <input
                type="checkbox"
                checked={Boolean(order.paymentReceived)}
                onChange={(event) =>
                  patch({ paymentReceived: event.target.checked })
                }
              />
              Xác nhận đã nhận tiền từ khách
            </label>
            <div className="pos-checkout">
              {order.discount > 0 && (
                <p className="pos-error" role="alert">
                  Chiết khấu thủ công chưa được hỗ trợ khi thanh toán. Vui lòng
                  đặt về 0 và chọn chương trình khuyến mại.
                </p>
              )}
              {stockIssue && (
                <p className="pos-error">
                  Số lượng {productName(stockIssue.product)} vượt tồn có thể bán
                  ({stockIssue.product.stock}).
                </p>
              )}
              {serialIssue && (
                <p className="pos-error">
                  Cần chọn đủ {serialIssue.quantity} serial cho{" "}
                  {serialIssue.label}.
                </p>
              )}
              {transactionMissing && (
                <p className="pos-error">Vui lòng nhập mã giao dịch</p>
              )}
              {paymentIssue && (
                <p className="pos-error">
                  {order.paymentMethod === "cash"
                    ? "Tiền khách đưa chưa đủ."
                    : "Số tiền đã nhận phải bằng đúng tổng thanh toán."}
                </p>
              )}
              {checkoutError && checkoutError !== previewState.error && (
                <p className="pos-error" role="alert">
                  {checkoutError}
                </p>
              )}
              <button
                type="button"
                className="pos-red-button"
                disabled={
                  checkoutBusy ||
                  !previewReady ||
                  order.discount > 0 ||
                  !salesOptions ||
                  !order.cart.length ||
                  Boolean(serialIssue) ||
                  Boolean(stockIssue) ||
                  transactionMissing ||
                  paymentIssue ||
                  !order.paymentReceived
                }
                onClick={checkout}
              >
                <HiOutlineCheck />{" "}
                {checkoutBusy ? "ĐANG THANH TOÁN..." : "THANH TOÁN"}
              </button>
              <small>Đơn hoàn thành ngay sau khi thanh toán.</small>
            </div>
          </aside>
        </div>
      </fieldset>
      {customerModal && (
        <PosDialog
          className="pos-form-modal"
          labelledBy="pos-create-customer-title"
          onClose={() => setCustomerModal(null)}
        >
          <header>
            <h2 id="pos-create-customer-title">TẠO KHÁCH HÀNG MỚI</h2>
          </header>
          <form onSubmit={submitCustomer}>
            <label>
              HỌ TÊN *
              <input
                required
                autoFocus
                disabled={customerModal.saving}
                placeholder="Nhập họ tên..."
                value={customerModal.name}
                onChange={(event) =>
                  setCustomerModal({
                    ...customerModal,
                    name: event.target.value,
                  })
                }
              />
            </label>
            <label>
              SỐ ĐIỆN THOẠI *
              <input
                required
                type="tel"
                disabled={customerModal.saving}
                placeholder="Nhập số điện thoại..."
                value={customerModal.phone}
                onChange={(event) =>
                  setCustomerModal({
                    ...customerModal,
                    phone: event.target.value
                      .replace(/[^\d+]/g, "")
                      .replace(/(?!^)\+/g, ""),
                  })
                }
              />
            </label>
            {customerCreateError && (
              <p className="pos-error">{customerCreateError}</p>
            )}
            <footer>
              <button
                type="button"
                disabled={customerModal.saving}
                onClick={() => setCustomerModal(null)}
              >
                HỦY
              </button>
              <button type="submit" disabled={customerModal.saving}>
                {customerModal.saving ? "ĐANG LƯU..." : "TẠO KHÁCH HÀNG"}
              </button>
            </footer>
          </form>
        </PosDialog>
      )}
      {serialModal && serialLine && (
        <PosDialog
          className="pos-form-modal pos-serial-modal"
          labelledBy="pos-serial-title"
          onClose={closeSerialModal}
        >
          <header>
            <div>
              <h2 id="pos-serial-title">CHỌN SERIAL</h2>
              <small>
                {productName(serialLine.product)} — CẦN {serialLine.quantity}{" "}
                SERIAL, ĐÃ CHỌN {serialLine.serials?.length || 0}
              </small>
            </div>
            <button type="button" aria-label="Đóng" onClick={closeSerialModal}>
              <HiOutlineX />
            </button>
          </header>
          <div className="pos-serial-body">
            <input
              autoFocus
              placeholder="QUÉT / NHẬP SERIAL..."
              value={serialSearch}
              onChange={(event) => {
                setSerialSearch(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const exact = shownSerials.find(
                    (item) =>
                      item.serial.toLowerCase() ===
                      serialSearch.trim().toLowerCase(),
                  );
                  if (exact) {
                    toggleSerial(exact);
                    setSerialSearch("");
                  }
                }
              }}
            />
            {serialModal.loading && <p>Đang tải serial...</p>}
            {serialModal.error && (
              <p className="pos-error">{serialModal.error}</p>
            )}
            {!serialModal.loading &&
              serialLine.quantity > serialModal.total && (
                <p className="pos-error">
                  Chỉ có {serialModal.total} serial khả dụng, cần{" "}
                  {serialLine.quantity}
                </p>
              )}
            <div className="pos-serial-list">
              {shownSerials.map((candidate) => {
                const selected = serialLine.serials?.some(
                  (item) => item.id === candidate.id,
                );
                return (
                  <button
                    type="button"
                    key={candidate.id}
                    className={selected ? "is-selected" : ""}
                    onClick={() => toggleSerial(candidate)}
                  >
                    <strong>{candidate.serial}</strong>
                    {selected && <span>✓ ĐÃ CHỌN</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <footer>
            <button
              type="button"
              disabled={
                (serialLine.serials?.length || 0) !== serialLine.quantity ||
                serialLine.quantity > serialModal.total
              }
              onClick={closeSerialModal}
            >
              XONG ({serialLine.serials?.length || 0}/{serialLine.quantity})
            </button>
          </footer>

        </PosDialog>
      )}
      {receipt && (
        <PaymentSuccessModal receipt={receipt} onDismiss={dismissPayment} />
      )}
    </main>
  );
}
