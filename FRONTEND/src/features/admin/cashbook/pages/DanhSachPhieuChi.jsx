import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, X } from "lucide-react";
import { disbursementService } from "../../../../shared/services/disbursementService";
import TablePagination from "../../../../shared/components/ui/TablePagination";
import FilterDropdown from "../../../../shared/components/ui/FilterDropdown";
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
import "./DanhSachPhieuThu.css"; // Reuse CSS

export default function DanhSachPhieuChi() {
  const navigate = useNavigate();
  const location = useLocation();

  const [disbursements, setDisbursements] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [page, setPage] = useState(1);
  const [sourceFilters, setSourceFilters] = useState(
    createCashbookSourceFilters,
  );
  const pageSize = 10;

  const [toastMessage, setToastMessage] = useState("");
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (location.state?.successMessage) {
      setToastMessage(location.state.successMessage);
      window.history.replaceState({}, document.title);
      setTimeout(() => setToastMessage(""), 3000);
    }
  }, [location]);

  const fetchDisbursements = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        keyword: debouncedSearch.trim() || undefined,
        trang_thai: filterStatus !== "ALL" ? filterStatus : undefined,
        nhom_nguoi_nop_nhan: filterGroup !== "ALL" ? filterGroup : undefined,
        phuong_thuc_thanh_toan:
          filterMethod !== "ALL" ? filterMethod : undefined,
        nguon_tao: filterSource !== "ALL" ? filterSource : undefined,
        tu_ngay: fromDate || undefined,
        den_ngay: toDate || undefined,
        page: Math.max(0, page - 1),
        limit: pageSize,
        ...cashbookSourceParams(sourceFilters),
      };

      const response = await disbursementService.getDisbursements(params);
      if (response.data?.data) {
        setDisbursements(response.data.data.items || []);
        setTotalElements(response.data.data.pagination?.total_elements || 0);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách phiếu chi:", error);
      setDisbursements([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    filterStatus,
    filterGroup,
    filterMethod,
    filterSource,
    fromDate,
    toDate,
    page,
    pageSize,
    sourceFilters,
  ]);

  useEffect(() => {
    fetchDisbursements();
  }, [fetchDisbursements]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const formatMoney = (amount) => {
    return (amount || 0).toLocaleString("vi-VN") + "đ";
  };

  const mapStatusToText = (status) => {
    switch (status) {
      case "DA_GHI_NHAN":
        return "ĐÃ GHI NHẬN";
      case "HUY":
        return "ĐÃ HỦY";
      default:
        return status || "—";
    }
  };

  const mapSourceToText = (source) => {
    switch (source) {
      case "THU_CONG":
        return "THỦ CÔNG";
      case "TU_DONG":
        return "TỰ ĐỘNG";
      default:
        return source || "—";
    }
  };

  const mapGroupToText = (group) => {
    switch (group) {
      case "KHACH_HANG":
        return "KHÁCH HÀNG";
      case "NHAN_VIEN":
        return "NHÂN VIÊN";
      case "NHA_CUNG_CAP":
        return "NHÀ CUNG CẤP";
      case "DOI_TAC_GIAO_HANG":
        return "ĐỐI TÁC GIAO HÀNG";
      case "KHAC":
        return "KHÁC";
      default:
        return group || "—";
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

  return (
    <div className="pt-page admin-list-page">
      {toastMessage && (
        <div className="pt-toast">
          <div className="pt-toast-content">
            <div className="toast-icon">
              <Check size={20} color="#fff" strokeWidth={3} />
            </div>
            <div className="toast-text">{toastMessage}</div>
            <button className="toast-close" onClick={() => setToastMessage("")}>
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      <div className="pt-header-top">
        <div className="pt-breadcrumb">SỔ QUỸ TIỀN MẶT / PHIẾU CHI</div>
        <button
          className="pt-btn-create"
          onClick={() => navigate("/admin/so-quy-tien-mat/tao-phieu-chi")}
        >
          + TẠO PHIẾU CHI
        </button>
      </div>

      <div className="pt-header-main">
        <h1>PHIẾU CHI</h1>
        <p>QUẢN LÝ CÁC KHOẢN TIỀN ĐÃ CHI RA KHỎI QUỸ</p>
      </div>

      <div
        className="pt-filter-bar"
        style={{ borderBottom: showAdvanced ? "none" : undefined }}
      >
        <input
          type="text"
          placeholder="TÌM MÃ PHIẾU / NGƯỜI NHẬN / CHỨNG TỪ..."
          className="pt-search-input"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <FilterDropdown
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          selectedDark
        >
          <option value="ALL">TẤT CẢ TRẠNG THÁI</option>
          <option value="DA_GHI_NHAN">ĐÃ GHI NHẬN</option>
          <option value="HUY">ĐÃ HỦY</option>
        </FilterDropdown>
        <div className="pt-date-filter">
          <label>TỪ NGÀY</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="pt-date-filter">
          <label>ĐẾN NGÀY</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button
          className="pt-btn-dark"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ minHeight: "38px", padding: "0 12px" }}
        >
          BỘ LỌC NÂNG CAO {showAdvanced ? "▲" : "▼"}
        </button>
      </div>

      {showAdvanced && (
        <div
          className="pt-filter-bar"
          style={{ paddingTop: 0, paddingBottom: "16px" }}
        >
          <FilterDropdown
            value={filterGroup}
            onChange={(e) => {
              setFilterGroup(e.target.value);
              setPage(1);
            }}
            selectedDark
          >
            <option value="ALL">TẤT CẢ NHÓM ĐỐI TƯỢNG</option>
            <option value="KHACH_HANG">KHÁCH HÀNG</option>
            <option value="NHAN_VIEN">NHÂN VIÊN</option>
            <option value="NHA_CUNG_CAP">NHÀ CUNG CẤP</option>
            <option value="DOI_TAC_GIAO_HANG">ĐỐI TÁC GIAO HÀNG</option>
            <option value="KHAC">KHÁC</option>
          </FilterDropdown>
          <FilterDropdown
            value={filterMethod}
            onChange={(e) => {
              setFilterMethod(e.target.value);
              setPage(1);
            }}
            selectedDark
          >
            <option value="ALL">TẤT CẢ PHƯƠNG THỨC</option>
            <option value="TIEN_MAT">TIỀN MẶT</option>
            <option value="CHUYEN_KHOAN">CHUYỂN KHOẢN</option>
            <option value="THE">QUẸT THẺ</option>
          </FilterDropdown>
          <FilterDropdown
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(1);
            }}
            selectedDark
          >
            <option value="ALL">TẤT CẢ NGUỒN TẠO</option>
            <option value="THU_CONG">THỦ CÔNG</option>
            <option value="TU_DONG">TỰ ĐỘNG</option>
          </FilterDropdown>
        </div>
      )}

      <CashbookSourceFilters
        value={sourceFilters}
        onChange={(nextFilters) => {
          setSourceFilters(nextFilters);
          setPage(1);
        }}
      />

      <div className="admin-list-body admin-list-body--inset">
<div className="pt-table-container admin-table-scroll" tabIndex={0} role="region" aria-label="Bảng danh sách">
        <table className="promo-table pt-table admin-data-table">
          <thead>
            <tr>
              <th>MÃ PHIẾU</th>
              <th>NGƯỜI NHẬN</th>
              <th>NHÓM ĐỐI TƯỢNG</th>
              <th>LOẠI CHI</th>
              <th>PHƯƠNG THỨC</th>
              <th>NGƯỜI TẠO</th>
              <th>SỐ TIỀN CHI</th>
              <th>NGÀY GHI NHẬN</th>
              <th>NGUỒN TẠO</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan="11"
                  style={{ textAlign: "center", padding: "24px" }}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : disbursements.length > 0 ? (
              disbursements.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.ma_phieu}</strong>
                  </td>
                  <td>
                    <div className="person-col">
                      <strong>{row.ten_nguoi_nop_nhan}</strong>
                      <span>{mapGroupToText(row.nhom_nguoi_nop_nhan)}</span>
                    </div>
                  </td>
                  <td className="text-muted">
                    {mapGroupToText(row.nhom_nguoi_nop_nhan)}
                  </td>
                  <td>
                    <div className="type-col">
                      <span className="type-code">{row.ma_loai}</span>
                      <strong>{row.ten_loai}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="method-text">
                      {mapPaymentMethodToText(row.phuong_thuc_thanh_toan)}
                    </span>
                  </td>
                  <td className="text-muted">
                    {row.ten_nguoi_tao || "HỆ THỐNG"}
                  </td>
                  <td>
                    <strong style={{ color: "#dc2626" }}>
                      {formatMoney(row.so_tien)}
                    </strong>
                  </td>
                  <td className="text-muted">
                    {formatDateDisplay(row.ngay_ghi_nhan)}
                  </td>
                  <td className="text-muted">
                    {mapSourceToText(row.nguon_tao)}
                  </td>
                  <td>
                    <span
                      className={`status-outline ${row.trang_thai === "HUY" ? "status-danger" : "status-success"}`}
                    >
                      {mapStatusToText(row.trang_thai)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="pt-btn-detail"
                      onClick={() =>
                        navigate(`/admin/so-quy-tien-mat/phieu-chi/${row.id}`)
                      }
                    >
                      XEM CHI TIẾT
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11">
                  <div className="pt-empty-state">
                    <p>KHÔNG TÌM THẤY PHIẾU CHI PHÙ HỢP</p>
                    <button
                      className="pt-btn-dark"
                      onClick={() =>
                        navigate("/admin/so-quy-tien-mat/tao-phieu-chi")
                      }
                    >
                      TẠO PHIẾU CHI
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {disbursements.length > 0 && (
        <TablePagination className="admin-table-footer"
          totalItems={totalElements}
          currentPage={page}
          onPageChange={setPage}
          pageSize={pageSize}
          idPrefix="disbursements"
        />
      )}
</div>
    </div>
  );
}
