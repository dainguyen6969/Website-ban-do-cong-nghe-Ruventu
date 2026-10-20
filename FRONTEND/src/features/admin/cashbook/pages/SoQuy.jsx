import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { cashbookService } from "../../../../shared/services/cashbookService";

import DetailTablePagination from "../../../../shared/components/ui/DetailTablePagination";

import { DETAIL_TABLE_PAGE_SIZE } from "../../../../hooks/useDetailTablePagination";

import {
  CashSourceFilters,
  CashSourceInfo,
  useCashSourceFilters,
} from "../components/CashbookEnhancements";

import CashbookSourceFilters from "../components/CashbookSourceFilters";

import {
  createCashbookSourceFilters,
  cashbookSourceParams,
} from "../api/cashbookFilterParams";

import "./SoQuy.css";

function getDefaultDateRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type) => parts.find((part) => part.type === type).value;

  const today = [getPart("year"), getPart("month"), getPart("day")].join("-");

  return {
    defaultFromDate: `${today.slice(0, 7)}-01`,
    defaultToDate: today,
  };
}

export default function SoQuy() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { defaultFromDate, defaultToDate } = useMemo(getDefaultDateRange, []);

  const [fromDate, setFromDate] = useState(
    () => params.get("tu_ngay") || defaultFromDate,
  );

  const [toDate, setToDate] = useState(
    () => params.get("den_ngay") || defaultToDate,
  );

  const [filterType, setFilterType] = useState(() => {
    const value = params.get("loai_phieu");

    return ["THU", "CHI"].includes(value) ? value : "ALL";
  });

  const [filterMethod, setFilterMethod] = useState(() => {
    const value = params.get("phuong_thuc_thanh_toan");

    return ["TIEN_MAT", "CHUYEN_KHOAN", "THE"].includes(value) ? value : "ALL";
  });

  const [searchPerson, setSearchPerson] = useState(
    () => params.get("ten_nguoi_nop_nhan") || "",
  );

  const [debouncedPerson, setDebouncedPerson] = useState(searchPerson);

  const [page, setPage] = useState(1);

  const [sourceFilters, setSourceFilters] = useState(() =>
    createCashbookSourceFilters(params),
  );

  // Khớp với component DetailTablePagination đang dùng.
  const pageSize = DETAIL_TABLE_PAGE_SIZE;

  const [transactions, setTransactions] = useState([]);
  const [totalElements, setTotalElements] = useState(0);

  const [summary, setSummary] = useState({
    soDuDauKy: 0,
    tongThu: 0,
    tongChi: 0,
    tonCuoiKy: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [dateError, setDateError] = useState("");

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current !== null) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const hasActiveFilter = Boolean(
    fromDate !== defaultFromDate ||
    toDate !== defaultToDate ||
    filterType !== "ALL" ||
    filterMethod !== "ALL" ||
    searchPerson.trim() !== "" ||
    Object.keys(cashbookSourceParams(sourceFilters)).length > 0,
  );

  const handleClearFilters = () => {
    if (searchTimeoutRef.current !== null) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    setFromDate(defaultFromDate);
    setToDate(defaultToDate);
    setFilterType("ALL");
    setFilterMethod("ALL");
    setSearchPerson("");
    setDebouncedPerson("");
    setSourceFilters(createCashbookSourceFilters());
    setDateError("");
    setPage(1);
  };

  const handlePersonChange = (e) => {
    const value = e.target.value;
    setSearchPerson(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedPerson(value);
      setPage(1);
    }, 400);
  };

  const fetchCashbookData = useCallback(async () => {
    if (!fromDate || !toDate) return;
    if (fromDate > toDate) {
      setDateError("Ngày bắt đầu không được lớn hơn ngày kết thúc");
      return;
    }
    setDateError("");
    setIsLoading(true);

    try {
      const params = {
        tu_ngay: fromDate,
        den_ngay: toDate,
        loai_phieu: filterType !== "ALL" ? filterType : undefined,
        phuong_thuc_thanh_toan:
          filterMethod !== "ALL" ? filterMethod : undefined,
        ten_nguoi_nop_nhan: debouncedPerson.trim() || undefined,
        page: Math.max(0, page - 1),
        limit: pageSize,
        ...cashbookSourceParams(sourceFilters),
      };

      const response = await cashbookService.getCashbook(params);
      if (response.data?.data) {
        const data = response.data.data;
        setTransactions(data.items || []);
        setTotalElements(data.pagination?.total_elements || 0);
        if (data.tong_hop) {
          setSummary({
            soDuDauKy: data.tong_hop.so_du_dau_ky || 0,
            tongThu: data.tong_hop.tong_thu || 0,
            tongChi: data.tong_hop.tong_chi || 0,
            tonCuoiKy: data.tong_hop.ton_cuoi_ky || 0,
          });
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sổ quỹ:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    fromDate,
    toDate,
    filterType,
    filterMethod,
    debouncedPerson,
    page,
    pageSize,
    sourceFilters,
  ]);

  useEffect(() => {
    fetchCashbookData();
  }, [fetchCashbookData]);

  const handleExportExcel = async () => {
    if (!fromDate || !toDate) {
      alert("Vui lòng chọn khoảng thời gian");
      return;
    }
    if (fromDate > toDate) {
      alert(
        "Khoảng thời gian không hợp lệ (ngày bắt đầu lớn hơn ngày kết thúc)",
      );
      return;
    }

    setIsExporting(true);
    try {
      const params = {
        tu_ngay: fromDate,
        den_ngay: toDate,
        loai_phieu: filterType !== "ALL" ? filterType : undefined,
        phuong_thuc_thanh_toan:
          filterMethod !== "ALL" ? filterMethod : undefined,
        ten_nguoi_nop_nhan: debouncedPerson.trim() || undefined,
        ...cashbookSourceParams(sourceFilters),
      };

      const response = await cashbookService.exportCashbook(params);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `So_quy_${fromDate}_${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Lỗi khi xuất file Excel sổ quỹ:", error);
      alert("Xuất file không thành công, vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatMoney = (amount) => {
    if (!amount && amount !== 0) return "0đ";
    return Number(amount).toLocaleString("vi-VN") + "đ";
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getMethodStyle = (method) => {
    switch (method) {
      case "TIEN_MAT":
      case "TIỀN MẶT":
        return "method-badge method-cash";
      case "CHUYEN_KHOAN":
      case "CHUYỂN KHOẢN":
        return "method-badge method-transfer";
      case "THE":
      case "QUẸT THẺ":
        return "method-badge method-card";
      default:
        return "method-badge";
    }
  };

  const mapPaymentMethodToText = (method) => {
    switch (method) {
      case "TIEN_MAT":
        return "TIỀN MẶT";
      case "CHUYEN_KHOAN":
        return "CHUYỂN KHOẢN";
      case "THE":
        return "QUẸT THẺ";
      default:
        return method || "—";
    }
  };

  return (
    <div className="sq-page">
      <div className="sq-header">
        <div className="sq-breadcrumb">
          ADMIN <span>&rsaquo;</span> SỔ QUỸ TIỀN MẶT / SỔ QUỸ
        </div>
        <button
          className="cb-btn-primary bg-red"
          onClick={() => navigate("/admin/so-quy-tien-mat/tao-phieu-thu-chi")}
        >
          + TẠO PHIẾU THU / CHI
        </button>
      </div>

      {/* Filter Bar */}
      <div className="cb-filter-bar">
        <div className="cb-filter-item">
          <label>TỪ NGÀY *</label>
          <input
            type="date"
            value={fromDate}
            className={fromDate !== defaultFromDate ? "active-filter" : ""}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="cb-filter-item">
          <label>ĐẾN NGÀY *</label>
          <input
            type="date"
            value={toDate}
            className={toDate !== defaultToDate ? "active-filter" : ""}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="cb-filter-item">
          <label>LOẠI PHIẾU</label>
          <select
            value={filterType}
            className={filterType !== "ALL" ? "active-filter" : ""}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả</option>
            <option value="THU">Phiếu thu</option>
            <option value="CHI">Phiếu chi</option>
          </select>
        </div>
        <div className="cb-filter-item">
          <label>PHƯƠNG THỨC</label>
          <select
            value={filterMethod}
            className={filterMethod !== "ALL" ? "active-filter" : ""}
            onChange={(e) => {
              setFilterMethod(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả</option>
            <option value="TIEN_MAT">Tiền mặt</option>
            <option value="CHUYEN_KHOAN">Chuyển khoản</option>
            <option value="THE">Quẹt thẻ</option>
          </select>
        </div>
        <div className="cb-filter-item">
          <label>NGƯỜI NỘP / NHẬN</label>
          <input
            type="text"
            placeholder="Tìm tên khách / đối tác..."
            value={searchPerson}
            className={searchPerson.trim() ? "active-filter" : ""}
            onChange={handlePersonChange}
          />
        </div>

        <div className="cb-filter-actions">
          {hasActiveFilter && (
            <button
              className="cb-btn-outline icon-btn btn-clear-filter"
              onClick={handleClearFilters}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: "6px" }}
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              XÓA BỘ LỌC
            </button>
          )}
          <button
            className="cb-btn-outline icon-btn"
            onClick={() => navigate("/admin/so-quy-tien-mat/tong-quan")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "6px" }}
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            XEM BÁO CÁO
          </button>
          <button
            className="cb-btn-dark icon-btn"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "6px" }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {isExporting ? "ĐANG XUẤT..." : "XUẤT FILE EXCEL"}
          </button>
        </div>
      </div>

      {dateError && (
        <div
          style={{
            padding: "8px 28px",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          ⚠ {dateError}
        </div>
      )}

      <CashbookSourceFilters
        extended
        value={sourceFilters}
        onChange={(nextFilters) => {
          setSourceFilters(nextFilters);
          setPage(1);
        }}
      />

      {/* 4 Stats Cards */}
      <div className="sq-stats-row">
        <div className="sq-stat-box">
          <div className="icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="12" rx="1" />
              <line x1="8" y1="20" x2="16" y2="20" />
              <line x1="12" y1="16" x2="12" y2="20" />
            </svg>
          </div>
          <div className="info">
            <label>SỐ DƯ ĐẦU KỲ</label>
            <div className="val">{formatMoney(summary.soDuDauKy)}</div>
          </div>
        </div>
        <div className="sq-stat-box">
          <div className="icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
          <div className="info">
            <label>TỔNG THU</label>
            <div className="val text-green">
              +{formatMoney(summary.tongThu)}
            </div>
          </div>
        </div>
        <div className="sq-stat-box">
          <div className="icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
          <div className="info">
            <label>TỔNG CHI</label>
            <div className="val text-red">-{formatMoney(summary.tongChi)}</div>
          </div>
        </div>
        <div className="sq-stat-box bg-dark">
          <div className="icon icon-red-dollar">$</div>
          <div className="info">
            <label>TỒN CUỐI KỲ</label>
            <div className="val text-red">{formatMoney(summary.tonCuoiKy)}</div>
          </div>
        </div>
      </div>

      {/* Formula Subtext */}
      <div className="sq-subtext-row">
        <span>
          (i) Tồn cuối kỳ = {formatMoney(summary.soDuDauKy)} (Đầu kỳ) +{" "}
          {formatMoney(summary.tongThu)} (Tổng thu) -{" "}
          {formatMoney(summary.tongChi)} (Tổng chi) ={" "}
          {formatMoney(summary.tonCuoiKy)}
        </span>
        <span className="count-badge">Tổng {totalElements} phiếu ghi nhận</span>
      </div>

      {/* Table */}
      <div className="sq-table-container">
        <table className="promo-table sq-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>LOẠI PHIẾU</th>
              <th>NGÀY GHI NHẬN</th>
              <th>MÃ PHIẾU</th>
              <th>NGƯỜI NỘP / NHẬN</th>
              <th>PHƯƠNG THỨC THANH TOÁN</th>
              <th>TIỀN THU</th>
              <th>TIỀN CHI</th>
              <th>MÔ TẢ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan="9"
                  style={{ textAlign: "center", padding: "32px" }}
                >
                  Đang tải dữ liệu sổ quỹ...
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((row) => (
                <tr key={row.id}>
                  <td>{row.stt}</td>
                  <td>
                    <span
                      className={`type-badge ${row.loai_phieu === "THU" ? "type-thu" : "type-chi"}`}
                    >
                      {row.loai_phieu === "THU" ? "PHIẾU THU" : "PHIẾU CHI"}
                    </span>
                  </td>
                  <td>{formatDateDisplay(row.ngay_ghi_nhan)}</td>
                  <td>
                    <strong>{row.ma_phieu}</strong>
                  </td>
                  <td>{row.ten_nguoi_nop_nhan || "—"}</td>
                  <td>
                    <span
                      className={getMethodStyle(row.phuong_thuc_thanh_toan)}
                    >
                      {mapPaymentMethodToText(row.phuong_thuc_thanh_toan)}
                    </span>
                  </td>
                  <td>
                    {row.tien_thu > 0 ? (
                      <strong className="text-green">
                        +{formatMoney(row.tien_thu)}
                      </strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.tien_chi > 0 ? (
                      <strong className="text-red">
                        -{formatMoney(row.tien_chi)}
                      </strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-muted">{row.mo_ta || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: "#858c95",
                    fontWeight: 600,
                  }}
                >
                  Không có giao dịch nào phù hợp với bộ lọc trong khoảng thời
                  gian đã chọn
                </td>
              </tr>
            )}
          </tbody>
          {transactions.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="6" style={{ textAlign: "left" }}>
                  <strong>TỔNG ({totalElements} PHIẾU)</strong>
                </td>
                <td>
                  <strong className="text-green">
                    +{formatMoney(summary.tongThu)}
                  </strong>
                </td>
                <td>
                  <strong className="text-red">
                    -{formatMoney(summary.tongChi)}
                  </strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {totalElements > 0 && (
        <DetailTablePagination
          totalItems={totalElements}
          currentPage={page}
          onPageChange={setPage}
          pageSize={pageSize}
          idPrefix="cashbook"
        />
      )}
    </div>
  );
}
