import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineX,
} from "react-icons/hi";

import FilterDropdown from "../../../../shared/components/ui/FilterDropdown";
import TablePagination from "../../../../shared/components/ui/TablePagination";
import { adminRequest } from "../../catalog/products/api/versionApi";
import { label, money } from "../../orders/api/orderApi";

import "./DoiTacVanChuyen.css";

const ROUTE = "/admin/khach-hang-doi-tac/doi-tac-van-chuyen";
const PATH = "/api/v1/admin/shipping-partners";
const PAGE_SIZE = 10;

const TYPE_LABELS = {
  SHIP_CUA_HANG: "Ship cửa hàng",
  SHIP_CA_NHAN: "Ship cá nhân",
};

const TYPE_OPTIONS = ["Tất cả loại", "Ship cửa hàng", "Ship cá nhân"];

const TYPE_CODES = {
  "Ship cửa hàng": "SHIP_CUA_HANG",
  "Ship cá nhân": "SHIP_CA_NHAN",
};

const STATUS_OPTIONS = ["Tất cả trạng thái", "Hoạt động", "Ngừng hoạt động"];

const STATUS_CODES = {
  "Hoạt động": 1,
  "Ngừng hoạt động": 0,
};

const DELIVERY_CODES = [
  "CHO_GIAO",
  "DA_NHAN_HANG",
  "DANG_GIAO",
  "GIAO_THANH_CONG",
  "GIAO_THAT_BAI",
  "CHO_HOAN_HANG",
  "DA_HOAN_HANG",
  "HUY_GIAO_HANG",
];

const DELIVERY_OPTIONS = [
  "Tất cả trạng thái",
  ...DELIVERY_CODES.map((code) => label(code)),
];

const DELIVERY_CODE_BY_LABEL = Object.fromEntries(
  DELIVERY_CODES.map((code) => [label(code), code]),
);

const EMPTY_FORM = {
  ten_doi_tac: "",
  so_dien_thoai: "",
  loai_doi_tac: "",
  email: "",
  dia_chi: "",
  ghi_chu: "",
};

function queryString(values) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value != null) {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

function errorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Không thể thực hiện yêu cầu. Vui lòng thử lại."
  );
}

function formatDateTimeVN(value) {
  if (!value) return "—";

  const text = String(value).trim().replace(" ", "T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const date = new Date(hasZone ? text : `${text}+07:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function partnerStatus(value) {
  if (value == null || value === "") return null;

  const status = Number(value);
  return status === 0 || status === 1 ? status : null;
}

function formatPartnerStatus(value) {
  const status = partnerStatus(value);

  if (status === 1) return "Hoạt động";
  if (status === 0) return "Ngừng hoạt động";

  return "—";
}

function formatPartnerType(value) {
  return TYPE_LABELS[value] || value || "—";
}

function totalPagesOf(data) {
  return Math.max(
    1,
    Number(data?.pagination?.total_pages) ||
      Math.ceil(Number(data?.pagination?.total_elements || 0) / PAGE_SIZE),
  );
}

// Chỉ đọc dữ liệu. Hủy request cũ khi thay bộ lọc hoặc rời trang.
function useBackendData(path, revision, enabled = true, delay = 250) {
  const requestId = enabled ? `${revision}:${path}` : "";

  const [state, setState] = useState({
    requestId: "",
    data: null,
    loading: false,
    error: "",
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    let active = true;

    setState({
      requestId,
      data: null,
      loading: true,
      error: "",
    });

    const timer = setTimeout(async () => {
      try {
        const data = await adminRequest(path, {
          signal: controller.signal,
        });

        if (active) {
          setState({
            requestId,
            data,
            loading: false,
            error: "",
          });
        }
      } catch (reason) {
        if (active && reason?.name !== "AbortError") {
          setState({
            requestId,
            data: null,
            loading: false,
            error: errorMessage(reason),
          });
        }
      }
    }, delay);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, revision, enabled, delay, requestId]);

  if (!enabled) {
    return { data: null, loading: false, error: "" };
  }

  // Không hiển thị kết quả của bộ lọc hoặc đối tác trước đó.
  if (state.requestId !== requestId) {
    return { data: null, loading: true, error: "" };
  }

  return state;
}

function buildPartnerBody(form) {
  const optionalText = (value) => value.trim() || null;

  return {
    ten_doi_tac: form.ten_doi_tac.trim(),
    so_dien_thoai: form.so_dien_thoai.trim().replace(/[\s().-]/g, ""),
    loai_doi_tac: form.loai_doi_tac,
    email: optionalText(form.email),
    dia_chi: optionalText(form.dia_chi),
    ghi_chu: optionalText(form.ghi_chu),
  };
}

function validatePartner(body) {
  const errors = {};

  if (!body.ten_doi_tac || body.ten_doi_tac.length > 100) {
    errors.ten_doi_tac = "Nhập tên đối tác, tối đa 100 ký tự.";
  }

  if (
    !/^\+?\d{8,15}$/.test(body.so_dien_thoai) ||
    body.so_dien_thoai.length > 15
  ) {
    errors.so_dien_thoai = "Số điện thoại không hợp lệ.";
  }

  if (!TYPE_LABELS[body.loai_doi_tac]) {
    errors.loai_doi_tac = "Vui lòng chọn loại đối tác.";
  }

  if (
    body.email &&
    (body.email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
  ) {
    errors.email = "Email không hợp lệ hoặc vượt quá 100 ký tự.";
  }

  if (body.dia_chi && body.dia_chi.length > 255) {
    errors.dia_chi = "Địa chỉ tối đa 255 ký tự.";
  }

  return errors;
}

export default function DoiTacVanChuyen() {
  const location = useLocation();
  const navigate = useNavigate();
  const mutationBusy = useRef(false);

  const [filters, setFilters] = useState({
    keyword: "",
    type: TYPE_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    page: 1,
  });

  const [revision, setRevision] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingAction, setPendingAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const rawSelectedId = location.state?.partnerId;
  const detailMode = rawSelectedId != null && rawSelectedId !== "";
  const selectedId = Number(rawSelectedId);
  const validSelectedId = Number.isSafeInteger(selectedId) && selectedId > 0;

  const listPath = `${PATH}?${queryString({
    keyword: filters.keyword.trim(),
    loai_doi_tac: TYPE_CODES[filters.type],
    trang_thai: STATUS_CODES[filters.status],
    page: filters.page - 1,
    limit: PAGE_SIZE,
  })}`;

  const list = useBackendData(listPath, revision, !detailMode);

  const detail = useBackendData(
    `${PATH}/${encodeURIComponent(selectedId)}`,
    revision,
    detailMode && validSelectedId,
    0,
  );

  const partners = list.data?.items || [];

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!list.data) return;

    const lastPage = totalPagesOf(list.data);

    if (filters.page > lastPage) {
      setFilters((current) => ({
        ...current,
        page: lastPage,
      }));
    }
  }, [list.data, filters.page]);

  function changeFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: 1,
    }));
  }

  function openDetail(partnerId) {
    if (mutationBusy.current) return;

    setSuccessMessage("");
    navigate(ROUTE, {
      state: { partnerId: Number(partnerId) },
    });
  }

  function backToList() {
    if (mutationBusy.current) return;

    setSuccessMessage("");
    navigate(ROUTE, {
      replace: true,
      state: null,
    });
  }

  function openAdd() {
    if (mutationBusy.current) return;

    setForm({ ...EMPTY_FORM });
    setFieldErrors({});
    setMutationError("");
    setSuccessMessage("");
    setShowAdd(true);
  }

  function closeDialog() {
    if (mutationBusy.current) return;

    setShowAdd(false);
    setPendingAction(null);
    setForm({ ...EMPTY_FORM });
    setFieldErrors({});
    setMutationError("");
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setMutationError("");
  }

  function openStatusAction(partner) {
    if (mutationBusy.current) return;

    const currentStatus = partnerStatus(partner.trang_thai);
    if (currentStatus == null) return;

    setMutationError("");
    setSuccessMessage("");
    setPendingAction({
      partner,
      targetStatus: currentStatus === 1 ? 0 : 1,
      action: currentStatus === 1 ? "suspend" : "restore",
    });
  }

  async function runMutation(send, onSuccess) {
    if (mutationBusy.current) return;

    mutationBusy.current = true;
    setBusy(true);
    setMutationError("");

    try {
      const data = await send();
      onSuccess(data);
      setRevision((current) => current + 1);
    } catch (reason) {
      setMutationError(errorMessage(reason));
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }

  function addPartner(event) {
    event.preventDefault();
    if (mutationBusy.current) return;

    const body = buildPartnerBody(form);
    const errors = validatePartner(body);

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    return runMutation(
      () =>
        adminRequest(PATH, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      (created) => {
        setShowAdd(false);
        setForm({ ...EMPTY_FORM });
        setFieldErrors({});

        setFilters({
          keyword: "",
          type: TYPE_OPTIONS[0],
          status: STATUS_OPTIONS[0],
          page: 1,
        });

        setSuccessMessage(
          `Đã thêm đối tác ${
            created?.ma_doi_tac || body.ten_doi_tac
          } thành công.`,
        );
      },
    );
  }

  function confirmStatusAction() {
    if (!pendingAction || mutationBusy.current) return;

    const { partner, targetStatus } = pendingAction;

    return runMutation(
      () =>
        adminRequest(`${PATH}/${encodeURIComponent(partner.id)}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            trang_thai: targetStatus,
          }),
        }),
      () => {
        setPendingAction(null);

        setSuccessMessage(
          targetStatus === 1
            ? "Đã khôi phục hoạt động đối tác."
            : "Đã ngừng hoạt động đối tác.",
        );

        // GET lại dữ liệu vì response đổi trạng thái
        // có thể chỉ chứa một phần thông tin đối tác.
      },
    );
  }

  return (
    <main className="partner-page" aria-busy={busy}>
      {detailMode ? (
        !validSelectedId ? (
          <div className="partner-not-found">
            <h1>ID ĐỐI TÁC KHÔNG HỢP LỆ</h1>
            <button
              type="button"
              className="partner-btn partner-btn--outline"
              onClick={backToList}
            >
              QUAY LẠI DANH SÁCH
            </button>
          </div>
        ) : detail.loading ? (
          <p style={{ padding: 24 }}>Đang tải thông tin đối tác...</p>
        ) : detail.error || !detail.data ? (
          <div className="partner-not-found">
            <p role="alert">{detail.error || "Không tìm thấy đối tác."}</p>

            <button
              type="button"
              className="partner-btn partner-btn--outline"
              onClick={backToList}
            >
              QUAY LẠI DANH SÁCH
            </button>

            <button
              type="button"
              className="partner-btn partner-btn--outline"
              style={{ marginLeft: 8 }}
              onClick={() => setRevision((current) => current + 1)}
            >
              THỬ LẠI
            </button>
          </div>
        ) : (
          <PartnerDetail
            key={selectedId}
            partner={detail.data}
            revision={revision}
            busy={busy}
            successMessage={successMessage}
            onBack={backToList}
            onAction={() => openStatusAction(detail.data)}
          />
        )
      ) : (
        <>
          <section className="partner-hero">
            <div>
              <PartnerBreadcrumb />
              <h1>ĐỐI TÁC VẬN CHUYỂN</h1>
              <p>QUẢN LÝ ĐỐI TÁC GIAO HÀNG VÀ LỊCH SỬ PHIẾU GIAO</p>
            </div>

            <button
              type="button"
              className="partner-btn partner-btn--black"
              disabled={busy}
              onClick={openAdd}
            >
              <HiOutlinePlus />
              THÊM ĐỐI TÁC
            </button>
          </section>

          {successMessage && <SuccessBanner message={successMessage} />}

          <section className="partner-toolbar">
            <label className="partner-search">
              <HiOutlineSearch />
              <input
                value={filters.keyword}
                onChange={(event) =>
                  changeFilter("keyword", event.target.value)
                }
                placeholder="Tìm theo tên hoặc số điện thoại..."
                aria-label="Tìm đối tác"
              />
            </label>

            <FilterDropdown
              className="partner-filter"
              options={TYPE_OPTIONS}
              value={filters.type}
              onSelect={(value) => changeFilter("type", value)}
            />

            <FilterDropdown
              className="partner-filter"
              options={STATUS_OPTIONS}
              value={filters.status}
              onSelect={(value) => changeFilter("status", value)}
            />
          </section>

          <section className="partner-list-content">
            <div className="partner-table-wrap">
              <table className="partner-table">
                <thead>
                  <tr>
                    <th>MÃ ĐỐI TÁC</th>
                    <th>TÊN ĐỐI TÁC</th>
                    <th>SỐ ĐIỆN THOẠI</th>
                    <th>EMAIL</th>
                    <th>LOẠI ĐỐI TÁC</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>

                <tbody>
                  {list.loading ? (
                    <tr className="partner-empty">
                      <td colSpan={7}>Đang tải danh sách đối tác...</td>
                    </tr>
                  ) : list.error ? (
                    <tr className="partner-empty">
                      <td colSpan={7}>
                        <span role="alert">{list.error}</span>{" "}
                        <button
                          type="button"
                          className="partner-row-btn"
                          onClick={() => setRevision((current) => current + 1)}
                        >
                          THỬ LẠI
                        </button>
                      </td>
                    </tr>
                  ) : partners.length === 0 ? (
                    <tr className="partner-empty">
                      <td colSpan={7}>Không tìm thấy đối tác phù hợp.</td>
                    </tr>
                  ) : (
                    partners.map((partner) => {
                      const status = partnerStatus(partner.trang_thai);
                      const active = status === 1;

                      return (
                        <tr
                          key={partner.id}
                          tabIndex={0}
                          onClick={() => openDetail(partner.id)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              event.target === event.currentTarget
                            ) {
                              openDetail(partner.id);
                            }
                          }}
                        >
                          <td className="partner-code">{partner.ma_doi_tac}</td>
                          <td className="partner-name">
                            {partner.ten_doi_tac}
                          </td>
                          <td>{partner.so_dien_thoai}</td>
                          <td>{partner.email || "—"}</td>
                          <td>
                            <PartnerTypeBadge type={partner.loai_doi_tac} />
                          </td>
                          <td>
                            <PartnerStatusBadge status={partner.trang_thai} />
                          </td>
                          <td>
                            <div className="partner-row-actions">
                              <button
                                type="button"
                                className="partner-row-btn"
                                disabled={busy}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDetail(partner.id);
                                }}
                              >
                                XEM CHI TIẾT
                              </button>

                              <button
                                type="button"
                                className={`partner-row-btn partner-row-btn--${
                                  active ? "danger" : "success"
                                }`}
                                disabled={busy || status == null}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openStatusAction(partner);
                                }}
                              >
                                {active ? "NGỪNG" : "KHÔI PHỤC"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!list.loading && !list.error && list.data && (
              <ServerPagination
                data={list.data}
                page={filters.page}
                onPageChange={(page) =>
                  setFilters((current) => ({ ...current, page }))
                }
                noun="ĐỐI TÁC"
                idPrefix="shipping-partner"
              />
            )}
          </section>
        </>
      )}

      {showAdd && (
        <AddPartnerModal
          form={form}
          errors={fieldErrors}
          error={mutationError}
          busy={busy}
          onChange={updateField}
          onClose={closeDialog}
          onSubmit={addPartner}
        />
      )}

      {pendingAction && (
        <ConfirmActionModal
          pendingAction={pendingAction}
          busy={busy}
          error={mutationError}
          onCancel={closeDialog}
          onConfirm={confirmStatusAction}
        />
      )}
    </main>
  );
}

function PartnerBreadcrumb({ code }) {
  return (
    <nav className="partner-crumbs" aria-label="Breadcrumb nội dung">
      <span>KHÁCH HÀNG & ĐỐI TÁC</span>
      <span>/</span>
      <span>ĐỐI TÁC VẬN CHUYỂN</span>

      {code && (
        <>
          <span>/</span>
          <strong>{code}</strong>
        </>
      )}
    </nav>
  );
}

function SuccessBanner({ message }) {
  return (
    <div className="supplier-toast partner-success" role="status">
      {message}
    </div>
  );
}

function PartnerStatusBadge({ status }) {
  const value = partnerStatus(status);
  const variant =
    value === 1 ? "hoat_dong" : value === 0 ? "ngung_hoat_dong" : "";

  return (
    <span className={`partner-status partner-status--${variant}`}>
      {formatPartnerStatus(status).toUpperCase()}
    </span>
  );
}

function PartnerTypeBadge({ type }) {
  return (
    <span className={`partner-type partner-type--${type}`}>
      {formatPartnerType(type)}
    </span>
  );
}

function DeliveryStatusBadge({ status }) {
  const colors = {
    CHO_GIAO: "#737373",
    DA_NHAN_HANG: "#1677d2",
    DANG_GIAO: "#4338ca",
    GIAO_THANH_CONG: "#16812b",
    GIAO_THAT_BAI: "#d71920",
    CHO_HOAN_HANG: "#d66b00",
    DA_HOAN_HANG: "#d66b00",
    HUY_GIAO_HANG: "#d71920",
  };

  const color = colors[status] || "#737373";

  return (
    <span
      className="partner-status"
      style={{
        color,
        borderColor: color,
        backgroundColor: `${color}12`,
      }}
    >
      {label(status)}
    </span>
  );
}

function PartnerPanel({ title, headerTools, children }) {
  return (
    <section className="partner-panel">
      <header>
        <h2>
          <span />
          {title}
        </h2>
        {headerTools}
      </header>
      {children}
    </section>
  );
}

function InfoRow({ title, children }) {
  return (
    <div>
      <dt>{title}</dt>
      <dd>{children ?? "—"}</dd>
    </div>
  );
}

function ServerPagination({ data, page, onPageChange, noun, idPrefix }) {
  const total = Number(data?.pagination?.total_elements || 0);
  const items = data?.items || [];
  const safePage = Math.min(page, totalPagesOf(data));
  const start = items.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const end = items.length ? Math.min(start + items.length - 1, total) : 0;

  return (
    <div className="partner-footer">
      <p>
        HIỂN THỊ {start}-{end} TRÊN TỔNG SỐ {total} {noun}
      </p>

      <TablePagination
        totalItems={total}
        pageSize={PAGE_SIZE}
        currentPage={safePage}
        onPageChange={onPageChange}
        idPrefix={idPrefix}
        showSummary={false}
      />
    </div>
  );
}

function PartnerDetail({
  partner,
  revision,
  busy,
  successMessage,
  onBack,
  onAction,
}) {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState(DELIVERY_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [historyRevision, setHistoryRevision] = useState(0);

  const path = `${PATH}/${encodeURIComponent(partner.id)}/deliveries?${queryString(
    {
      keyword: keyword.trim(),
      trang_thai_giao_hang: DELIVERY_CODE_BY_LABEL[statusFilter],
      page: page - 1,
      limit: PAGE_SIZE,
    },
  )}`;

  const history = useBackendData(path, `${revision}:${historyRevision}`);

  const deliveries = history.data?.items || [];
  const status = partnerStatus(partner.trang_thai);
  const active = status === 1;

  useEffect(() => {
    if (!history.data) return;

    const lastPage = totalPagesOf(history.data);
    if (page > lastPage) setPage(lastPage);
  }, [history.data, page]);

  const historyTools = (
    <div className="partner-history-tools">
      <label className="partner-history-search">
        <HiOutlineSearch />
        <input
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm mã phiếu, mã vận đơn hoặc mã đơn hàng..."
          aria-label="Tìm phiếu giao hàng"
        />
      </label>

      <FilterDropdown
        className="partner-history-filter"
        options={DELIVERY_OPTIONS}
        value={statusFilter}
        onSelect={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
      />
    </div>
  );

  return (
    <>
      <section className="partner-hero partner-detail-hero">
        <div>
          <PartnerBreadcrumb code={partner.ma_doi_tac} />

          <div className="partner-detail-meta">
            <span>{partner.ma_doi_tac}</span>
            <PartnerStatusBadge status={partner.trang_thai} />
          </div>

          <h1>{partner.ten_doi_tac}</h1>
        </div>

        <div className="partner-detail-actions">
          <button
            type="button"
            className="partner-btn partner-btn--outline"
            disabled={busy}
            onClick={onBack}
          >
            <HiOutlineArrowLeft />
            QUAY LẠI
          </button>

          <button
            type="button"
            className={`partner-btn partner-btn--outline-${
              active ? "danger" : "success"
            }`}
            disabled={busy || status == null}
            onClick={onAction}
          >
            {active ? "NGỪNG HOẠT ĐỘNG" : "KHÔI PHỤC HOẠT ĐỘNG"}
          </button>
        </div>
      </section>

      <section className="partner-detail-content">
        {successMessage && <SuccessBanner message={successMessage} />}

        <PartnerPanel title="THÔNG TIN ĐỐI TÁC">
          <dl className="partner-info">
            <InfoRow title="MÃ ĐỐI TÁC">{partner.ma_doi_tac}</InfoRow>
            <InfoRow title="TÊN ĐỐI TÁC">{partner.ten_doi_tac}</InfoRow>
            <InfoRow title="SỐ ĐIỆN THOẠI">{partner.so_dien_thoai}</InfoRow>
            <InfoRow title="LOẠI ĐỐI TÁC">
              {formatPartnerType(partner.loai_doi_tac)}
            </InfoRow>
            <InfoRow title="EMAIL">{partner.email || "—"}</InfoRow>
            <InfoRow title="ĐỊA CHỈ">{partner.dia_chi || "—"}</InfoRow>
            <InfoRow title="GHI CHÚ">{partner.ghi_chu || "—"}</InfoRow>
            <InfoRow title="TRẠNG THÁI">
              {formatPartnerStatus(partner.trang_thai)}
            </InfoRow>
            <InfoRow title="NGÀY TẠO">
              {formatDateTimeVN(partner.ngay_tao)}
            </InfoRow>
            <InfoRow title="CẬP NHẬT CUỐI">
              {formatDateTimeVN(partner.ngay_cap_nhat)}
            </InfoRow>
          </dl>
        </PartnerPanel>

        <PartnerPanel title="LỊCH SỬ GIAO HÀNG" headerTools={historyTools}>
          <div className="partner-history-wrap">
            <table className="partner-history">
              <thead>
                <tr>
                  <th>MÃ PHIẾU</th>
                  <th>MÃ VẬN ĐƠN</th>
                  <th>MÃ ĐƠN HÀNG</th>
                  <th>TRẠNG THÁI GIAO</th>
                  <th>THU HỘ COD</th>
                  <th>PHÍ ĐỐI TÁC</th>
                  <th>GHI CHÚ ĐƠN HÀNG</th>
                  <th>NGÀY TẠO</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {history.loading ? (
                  <tr className="partner-empty">
                    <td colSpan={9}>Đang tải lịch sử giao hàng...</td>
                  </tr>
                ) : history.error ? (
                  <tr className="partner-empty">
                    <td colSpan={9}>
                      <span role="alert">{history.error}</span>{" "}
                      <button
                        type="button"
                        className="partner-row-btn"
                        onClick={() =>
                          setHistoryRevision((current) => current + 1)
                        }
                      >
                        THỬ LẠI
                      </button>
                    </td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr className="partner-empty">
                    <td colSpan={9}>
                      {keyword.trim() || statusFilter !== DELIVERY_OPTIONS[0]
                        ? "Không có phiếu giao hàng phù hợp với bộ lọc."
                        : "Đối tác chưa có phiếu giao hàng."}
                    </td>
                  </tr>
                ) : (
                  deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>
                        <strong>{delivery.ma_phieu_giao_hang}</strong>
                      </td>

                      <td>{delivery.ma_van_don || "—"}</td>

                      <td>
                        <button
                          type="button"
                          className="partner-order-link"
                          disabled={!delivery.don_hang_id}
                          onClick={() =>
                            navigate(
                              `/admin/don-hang/danh-sach-don-hang/${encodeURIComponent(
                                delivery.don_hang_id,
                              )}`,
                            )
                          }
                        >
                          {delivery.ma_don_hang || "—"}
                        </button>
                      </td>

                      <td>
                        <DeliveryStatusBadge
                          status={delivery.trang_thai_giao_hang}
                        />
                      </td>

                      <td className="partner-money">
                        {money(delivery.tien_thu_ho_cod)}
                      </td>

                      <td className="partner-money">
                        {money(delivery.phi_tra_doi_tac)}
                      </td>

                      <td>{delivery.ghi_chu_don_hang || "—"}</td>

                      <td>{formatDateTimeVN(delivery.ngay_tao)}</td>

                      <td>
                        <button
                          type="button"
                          className="partner-view-order"
                          onClick={() =>
                            navigate(
                              `/admin/don-hang/quan-ly-giao-hang/${encodeURIComponent(
                                delivery.id,
                              )}`,
                            )
                          }
                        >
                          XEM PHIẾU
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!history.loading && !history.error && history.data && (
            <div style={{ padding: "0 14px" }}>
              <ServerPagination
                data={history.data}
                page={page}
                onPageChange={setPage}
                noun="PHIẾU"
                idPrefix="partner-deliveries"
              />
            </div>
          )}
        </PartnerPanel>
      </section>
    </>
  );
}

function PartnerDialog({
  title,
  titleId,
  className = "partner-modal",
  showClose = true,
  busy,
  onClose,
  children,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const firstControl = dialogRef.current?.querySelector(
      "input, select, textarea, button",
    );

    (firstControl || dialogRef.current)?.focus();

    return () => {
      if (
        previousFocus instanceof HTMLElement &&
        document.contains(previousFocus)
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const controls = Array.from(
      dialogRef.current?.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), " +
          "select:not([disabled]), textarea:not([disabled]), " +
          'a[href], [tabindex="0"]',
      ) || [],
    ).filter((element) => element.getClientRects().length > 0);

    if (controls.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];

    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="partner-modal-backdrop"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header>
          <h2 id={titleId}>
            <span />
            {title}
          </h2>

          {showClose && (
            <button
              type="button"
              aria-label="Đóng"
              disabled={busy}
              onClick={onClose}
            >
              <HiOutlineX size={20} />
            </button>
          )}
        </header>

        {children}
      </section>
    </div>
  );
}

function PartnerField({ title, error, children }) {
  return (
    <label
      className={`partner-form-field ${
        error ? "partner-form-field--error" : ""
      }`}
    >
      <span>{title}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

function AddPartnerModal({
  form,
  errors,
  error,
  busy,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <PartnerDialog
      title="THÊM ĐỐI TÁC VẬN CHUYỂN"
      titleId="add-partner-title"
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate>
        {error && (
          <p role="alert" style={{ color: "#c91f25" }}>
            {error}
          </p>
        )}

        <fieldset
          disabled={busy}
          style={{
            display: "grid",
            gap: 11,
            margin: 0,
            padding: 0,
            border: 0,
            minWidth: 0,
          }}
        >
          <PartnerField title="TÊN ĐỐI TÁC *" error={errors.ten_doi_tac}>
            <input
              value={form.ten_doi_tac}
              maxLength={100}
              aria-invalid={Boolean(errors.ten_doi_tac)}
              onChange={(event) => onChange("ten_doi_tac", event.target.value)}
            />
          </PartnerField>

          <PartnerField title="SỐ ĐIỆN THOẠI *" error={errors.so_dien_thoai}>
            <input
              type="tel"
              value={form.so_dien_thoai}
              maxLength={25}
              aria-invalid={Boolean(errors.so_dien_thoai)}
              onChange={(event) =>
                onChange("so_dien_thoai", event.target.value)
              }
            />
          </PartnerField>

          <PartnerField title="LOẠI ĐỐI TÁC *" error={errors.loai_doi_tac}>
            <select
              value={form.loai_doi_tac}
              aria-invalid={Boolean(errors.loai_doi_tac)}
              onChange={(event) => onChange("loai_doi_tac", event.target.value)}
            >
              <option value="">CHỌN LOẠI ĐỐI TÁC</option>

              {Object.entries(TYPE_LABELS).map(([code, text]) => (
                <option key={code} value={code}>
                  {text}
                </option>
              ))}
            </select>
          </PartnerField>

          <PartnerField title="EMAIL" error={errors.email}>
            <input
              type="email"
              value={form.email}
              maxLength={100}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => onChange("email", event.target.value)}
            />
          </PartnerField>

          <PartnerField title="ĐỊA CHỈ" error={errors.dia_chi}>
            <input
              value={form.dia_chi}
              maxLength={255}
              aria-invalid={Boolean(errors.dia_chi)}
              onChange={(event) => onChange("dia_chi", event.target.value)}
            />
          </PartnerField>

          <PartnerField title="GHI CHÚ">
            <textarea
              rows={3}
              value={form.ghi_chu}
              onChange={(event) => onChange("ghi_chu", event.target.value)}
            />
          </PartnerField>
        </fieldset>

        <footer>
          <button
            type="button"
            className="partner-btn partner-btn--outline"
            disabled={busy}
            onClick={onClose}
          >
            HỦY BỎ
          </button>

          <button
            type="submit"
            className="partner-btn partner-btn--black"
            disabled={busy}
          >
            {busy ? "ĐANG LƯU..." : "THÊM ĐỐI TÁC"}
          </button>
        </footer>
      </form>
    </PartnerDialog>
  );
}

function ConfirmActionModal({
  pendingAction,
  busy,
  error,
  onCancel,
  onConfirm,
}) {
  const { partner, action } = pendingAction;
  const suspending = action === "suspend";

  return (
    <PartnerDialog
      title={
        suspending ? "NGỪNG HOẠT ĐỘNG ĐỐI TÁC" : "KHÔI PHỤC HOẠT ĐỘNG ĐỐI TÁC"
      }
      titleId="partner-status-title"
      className={`partner-confirm partner-confirm--${action}`}
      showClose={false}
      busy={busy}
      onClose={onCancel}
    >
      <div className="partner-confirm__body">
        <strong>
          {partner.ma_doi_tac} — {partner.ten_doi_tac}
        </strong>

        <p>
          {suspending
            ? "Đối tác sẽ ngừng hoạt động và không được chọn cho phiếu giao mới. Các phiếu giao đã có vẫn được giữ nguyên."
            : "Đối tác sẽ được khôi phục hoạt động để có thể chọn cho phiếu giao mới."}
        </p>

        {error && (
          <p role="alert" style={{ color: "#c91f25", marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>

      <footer>
        <button
          type="button"
          className="partner-btn partner-btn--outline"
          disabled={busy}
          onClick={onCancel}
        >
          HỦY BỎ
        </button>

        <button
          type="button"
          className={`partner-btn partner-btn--${
            suspending ? "danger" : "success"
          }`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "ĐANG XỬ LÝ..." : "XÁC NHẬN"}
        </button>
      </footer>
    </PartnerDialog>
  );
}
