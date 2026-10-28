import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, X } from "lucide-react";
import { cashbookService } from "../../../../shared/services/cashbookService";
import { getEmployeePage } from "../../organization/api/employeeApi";
import WebGL2LineChart from "../components/WebGL2LineChart";
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
import FilterDropdown from "../../../../shared/components/ui/FilterDropdown";
import "./TongQuanQuy.css";

// Default dates: First day of current month to today
const getFirstDayOfMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const getToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatCurrency = (amount) => {
  return (Number(amount) || 0).toLocaleString("vi-VN") + "đ";
};

const formatBucketLabel = (item, mode) => {
  if (!item.tu_ngay) return "";
  const [y1, m1, d1] = item.tu_ngay.split("-");

  if (mode === "THEO NGÀY") {
    return `${d1}/${m1}`;
  }

  if (mode === "THEO TUẦN") {
    if (!item.den_ngay) return `${d1}/${m1}`;
    const [, m2, d2] = item.den_ngay.split("-");
    return `${d1}/${m1}-${d2}/${m2}`;
  }

  if (mode === "THEO THÁNG") {
    return `T${m1}/${y1}`;
  }

  return `${d1}/${m1}`;
};

const modeToGrouping = (mode) => {
  switch (mode) {
    case "THEO TUẦN":
      return "TUAN";
    case "THEO THÁNG":
      return "THANG";
    case "THEO NGÀY":
    default:
      return "NGAY";
  }
};

const buildQueryParams = (filters) => {
  const paymentMethods = {
    "TIỀN MẶT": "TIEN_MAT",
    "CHUYỂN KHOẢN": "CHUYEN_KHOAN",
    THẺ: "THE",
  };

  const groups = {
    "KHÁCH HÀNG": "KHACH_HANG",
    "NHÂN VIÊN": "NHAN_VIEN",
    "NHÀ CUNG CẤP": "NHA_CUNG_CAP",
    "ĐỐI TÁC GIAO HÀNG": "DOI_TAC_GIAO_HANG",
    KHÁC: "KHAC",
  };

  return {
    tu_ngay: filters.fromDate,
    den_ngay: filters.toDate,
    loai_phieu: ["THU", "CHI"].includes(filters.filterType)
      ? filters.filterType
      : undefined,
    phuong_thuc_thanh_toan: paymentMethods[filters.filterMethod],
    nhom_nguoi_nop_nhan: groups[filters.filterGroup],
    ten_nguoi_nop_nhan: filters.searchPerson?.trim() || undefined,
    nguoi_tao_id: String(filters.employeeId ?? "").trim() || undefined,
    ...cashbookSourceParams(filters.sourceFilters),
  };
};

export default function TongQuanQuy() {
  const navigate = useNavigate();

  const defaultFrom = getFirstDayOfMonth();
  const defaultTo = getToday();

  // Top Filter States
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [filterType, setFilterType] = useState("TẤT CẢ");
  const [filterMethod, setFilterMethod] = useState("TẤT CẢ");
  const [searchPerson, setSearchPerson] = useState("");
  const [filterGroup, setFilterGroup] = useState("TẤT CẢ NHÓM");
  const [employeeId, setEmployeeId] = useState("");
  const [sourceFilters, setSourceFilters] = useState(
    createCashbookSourceFilters,
  );

  // Employee Options List
  const [employees, setEmployees] = useState([]);

  // Applied Filters State
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    filterType: "TẤT CẢ",
    filterMethod: "TẤT CẢ",
    searchPerson: "",
    filterGroup: "TẤT CẢ NHÓM",
    employeeId: "",
    sourceFilters: createCashbookSourceFilters(),
  });

  // Time Mode State: 'THEO NGÀY' | 'THEO TUẦN' | 'THEO THÁNG'
  const [timeMode, setTimeMode] = useState("THEO NGÀY");

  // Overview Stats State
  const [overviewData, setOverviewData] = useState({
    soDuDauKy: 0,
    tongThu: 0,
    tongChi: 0,
    tonQuy: 0,
  });

  // Chart Data State
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
    hasData: false,
  });

  // Status States
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch employee list for filter
  useEffect(() => {
    let isMounted = true;
    getEmployeePage({ limit: 100 })
      .then((res) => {
        if (isMounted && res?.items) {
          setEmployees(res.items);
        }
      })
      .catch((err) => {
        console.warn("Không thể tải danh sách nhân viên:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Main Data Fetcher
  const fetchAllData = useCallback(async (filters, mode) => {
    if (!filters.fromDate || !filters.toDate) {
      setDateError("Vui lòng chọn ngày bắt đầu và ngày kết thúc");
      return;
    }
    if (filters.fromDate > filters.toDate) {
      setDateError(
        "Khoảng thời gian không hợp lệ (ngày bắt đầu lớn hơn ngày kết thúc)",
      );
      return;
    }

    setDateError("");
    setErrorMessage("");
    setIsLoading(true);

    const baseParams = buildQueryParams(filters);
    const chartParams = {
      ...baseParams,
      nhom_theo: modeToGrouping(mode),
    };

    try {
      const [overviewRes, flowRes] = await Promise.allSettled([
        cashbookService.getOverview(baseParams),
        cashbookService.getCashFlow(chartParams),
      ]);

      // Process Overview Response
      if (overviewRes.status === "fulfilled" && overviewRes.value.data?.data) {
        const data = overviewRes.value.data.data;
        setOverviewData({
          soDuDauKy: Number(data.so_du_dau_ky || 0),
          tongThu: Number(data.tong_thu || 0),
          tongChi: Number(data.tong_chi || 0),
          tonQuy: Number(data.ton_quy || 0),
        });
      } else if (overviewRes.status === "rejected") {
        const error = overviewRes.reason;
        console.error("Lỗi khi lấy dữ liệu tổng quan quỹ:", error);
        if (error.response?.status === 403) {
          setErrorMessage("Bạn không có quyền truy cập dữ liệu Tổng Quan Quỹ");
        } else {
          setErrorMessage(
            error.response?.data?.message ||
              "Có lỗi khi lấy số liệu tổng quan quỹ",
          );
        }
      }

      // Process Cash Flow Chart Response (Luồng ngoại lệ 4: vẫn hiển thị overview nếu chart thất bại)
      if (flowRes.status === "fulfilled" && flowRes.value.data?.data) {
        const flowData = flowRes.value.data.data;
        const items = flowData.items || [];
        const labels = items.map((item) => formatBucketLabel(item, mode));
        const thuValues = items.map((item) => Number(item.tong_thu || 0));
        const chiValues = items.map((item) => Number(item.tong_chi || 0));

        const datasets = [];
        if (filters.filterType !== "CHI") {
          datasets.push({
            label: "TỔNG THU",
            data: thuValues.map((v) => Number((v / 1000000).toFixed(4))),
            rawAmounts: thuValues,
            color: [0.07, 0.07, 0.07, 1.0],
            dashed: false,
          });
        }
        if (filters.filterType !== "THU") {
          datasets.push({
            label: "TỔNG CHI",
            data: chiValues.map((v) => Number((v / 1000000).toFixed(4))),
            rawAmounts: chiValues,
            color: [0.86, 0.15, 0.15, 1.0],
            dashed: true,
          });
        }

        setChartData({
          labels,
          datasets,
          hasData: Boolean(flowData.co_du_lieu && items.length > 0),
        });
      } else if (flowRes.status === "rejected") {
        console.error("Lỗi khi lấy dữ liệu biểu đồ dòng tiền:", flowRes.reason);
        setChartData({
          labels: [],
          datasets: [],
          hasData: false,
        });
      }
    } catch (err) {
      console.error("Lỗi tổng hợp dữ liệu:", err);
      setErrorMessage("Không thể tải dữ liệu tổng quan quỹ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData(appliedFilters, timeMode);
  }, [fetchAllData]);

  // Handle Time Mode Switching (Day / Week / Month)
  const handleTimeModeChange = async (newMode) => {
    setTimeMode(newMode);
    if (
      !appliedFilters.fromDate ||
      !appliedFilters.toDate ||
      appliedFilters.fromDate > appliedFilters.toDate
    ) {
      return;
    }

    setIsChartLoading(true);
    const chartParams = {
      ...buildQueryParams(appliedFilters),
      nhom_theo: modeToGrouping(newMode),
    };

    try {
      const res = await cashbookService.getCashFlow(chartParams);
      if (res.data?.data) {
        const flowData = res.data.data;
        const items = flowData.items || [];
        const labels = items.map((item) => formatBucketLabel(item, newMode));
        const thuValues = items.map((item) => Number(item.tong_thu || 0));
        const chiValues = items.map((item) => Number(item.tong_chi || 0));

        const datasets = [];
        if (appliedFilters.filterType !== "CHI") {
          datasets.push({
            label: "TỔNG THU",
            data: thuValues.map((v) => Number((v / 1000000).toFixed(4))),
            rawAmounts: thuValues,
            color: [0.07, 0.07, 0.07, 1.0],
            dashed: false,
          });
        }
        if (appliedFilters.filterType !== "THU") {
          datasets.push({
            label: "TỔNG CHI",
            data: chiValues.map((v) => Number((v / 1000000).toFixed(4))),
            rawAmounts: chiValues,
            color: [0.86, 0.15, 0.15, 1.0],
            dashed: true,
          });
        }

        setChartData({
          labels,
          datasets,
          hasData: Boolean(flowData.co_du_lieu && items.length > 0),
        });
      }
    } catch (err) {
      console.error("Lỗi khi đổi mốc thời gian biểu đồ:", err);
    } finally {
      setIsChartLoading(false);
    }
  };

  // Apply Filters Click Handler
  const handleApplyFilters = () => {
    if (!fromDate || !toDate) {
      setDateError("Vui lòng chọn ngày bắt đầu và ngày kết thúc");
      return;
    }
    if (fromDate > toDate) {
      setDateError(
        "Khoảng thời gian không hợp lệ (ngày bắt đầu lớn hơn ngày kết thúc)",
      );
      return;
    }

    const newFilters = {
      fromDate,
      toDate,
      filterType,
      filterMethod,
      searchPerson,
      filterGroup,
      employeeId,
      sourceFilters: { ...sourceFilters },
    };

    setAppliedFilters(newFilters);
    fetchAllData(newFilters, timeMode);
  };

  // Clear Filters Click Handler
  const handleClearFilters = () => {
    const defaultStart = getFirstDayOfMonth();
    const defaultEnd = getToday();
    const resetSources = createCashbookSourceFilters();

    setFromDate(defaultStart);
    setToDate(defaultEnd);
    setFilterType("TẤT CẢ");
    setFilterMethod("TẤT CẢ");
    setSearchPerson("");
    setFilterGroup("TẤT CẢ NHÓM");
    setEmployeeId("");
    setSourceFilters(resetSources);
    setTimeMode("THEO NGÀY");
    setDateError("");
    setErrorMessage("");

    const resetFilters = {
      fromDate: defaultStart,
      toDate: defaultEnd,
      filterType: "TẤT CẢ",
      filterMethod: "TẤT CẢ",
      searchPerson: "",
      filterGroup: "TẤT CẢ NHÓM",
      employeeId: "",
      sourceFilters: resetSources,
    };

    setAppliedFilters(resetFilters);
    fetchAllData(resetFilters, "THEO NGÀY");
  };

  const handleOpenCashbook = () => {
    const values = buildQueryParams(appliedFilters);

    const query = new URLSearchParams(
      Object.entries(values)
        .filter(([, value]) => value != null && String(value).trim() !== "")
        .map(([key, value]) => [key, String(value).trim()]),
    );

    navigate({
      pathname: "/admin/so-quy-tien-mat/so-quy",
      search: `?${query.toString()}`,
    });
  };

  const isNegative = overviewData.tonQuy < 0;

  return (
    <div className="cashbook-page">
      <div className="cb-header">
        <div className="cb-title-area">
          <div className="cb-breadcrumb">SỔ QUỸ TIỀN MẶT / TỔNG QUAN</div>
          <h1>TỔNG QUAN QUỸ</h1>
          <p>THEO DÕI NHANH TÌNH HÌNH THU CHI VÀ TỒN QUỸ CỦA CỬA HÀNG</p>
        </div>
        <button
          type="button"
          className="cb-btn-secondary"
          onClick={handleOpenCashbook}
        >
          XEM SỔ QUỸ &rarr;
        </button>
      </div>

      {/* Error Banners */}
      {(dateError || errorMessage) && (
        <div className="cb-error-banner">
          <span>{dateError || errorMessage}</span>
          <button
            className="cb-error-dismiss"
            onClick={() => {
              setDateError("");
              setErrorMessage("");
            }}
            aria-label="Đóng thông báo"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="cb-filter-bar">
        <div className="cb-filter-item">
          <label>TỪ NGÀY</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="cb-filter-item">
          <label>ĐẾN NGÀY</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="cb-filter-item">
          <label>LOẠI PHIẾU</label>
          <FilterDropdown
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            selectedDark
          >
            <option value="TẤT CẢ">TẤT CẢ</option>
            <option value="THU">PHIẾU THU</option>
            <option value="CHI">PHIẾU CHI</option>
          </FilterDropdown>
        </div>
        <div className="cb-filter-item">
          <label>PHƯƠNG THỨC</label>
          <FilterDropdown
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            selectedDark
          >
            <option value="TẤT CẢ">TẤT CẢ</option>
            <option value="TIỀN MẶT">TIỀN MẶT</option>
            <option value="CHUYỂN KHOẢN">CHUYỂN KHOẢN</option>
            <option value="THẺ">THẺ</option>
          </FilterDropdown>
        </div>
        <div className="cb-filter-item">
          <label>NGƯỜI NỘP / NHẬN</label>
          <input
            type="text"
            placeholder="TÌM TÊN..."
            value={searchPerson}
            onChange={(e) => setSearchPerson(e.target.value)}
          />
        </div>
        <div className="cb-filter-item">
          <label>NHÓM ĐỐI TƯỢNG</label>
          <FilterDropdown
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            selectedDark
          >
            <option value="TẤT CẢ NHÓM">TẤT CẢ NHÓM</option>
            <option value="KHÁCH HÀNG">KHÁCH HÀNG</option>
            <option value="NHÂN VIÊN">NHÂN VIÊN</option>
            <option value="NHÀ CUNG CẤP">NHÀ CUNG CẤP</option>
            <option value="ĐỐI TÁC GIAO HÀNG">ĐỐI TÁC GIAO HÀNG</option>
          </FilterDropdown>
        </div>
        <div className="cb-filter-item">
          <label>NHÂN VIÊN (TẠO PHIẾU)</label>
          <FilterDropdown
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            selectedDark
          >
            <option value="">TẤT CẢ NHÂN VIÊN</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.hoTen || emp.ho_ten || emp.tenNhanVien || emp.username}
              </option>
            ))}
          </FilterDropdown>
        </div>
        <div className="cb-filter-actions">
          <button className="cb-btn-outline" onClick={handleClearFilters}>
            XÓA BỘ LỌC
          </button>
          <button className="cb-btn-primary" onClick={handleApplyFilters}>
            ÁP DỤNG
          </button>
        </div>
      </div>

      <CashbookSourceFilters
        value={sourceFilters}
        onChange={setSourceFilters}
        applyRequired
      />

      {/* Summary Stat Boxes */}
      <div className="cb-stats-row">
        <div className="cb-stat-box">
          <label>SỐ DƯ ĐẦU KỲ</label>
          <div className="val">
            {isLoading ? "..." : formatCurrency(overviewData.soDuDauKy)}
          </div>
        </div>
        <div className="cb-stat-box">
          <label>TỔNG THU</label>
          <div className="val text-green">
            {isLoading ? "..." : formatCurrency(overviewData.tongThu)}
          </div>
        </div>
        <div className="cb-stat-box">
          <label>TỔNG CHI</label>
          <div className="val text-red">
            {isLoading ? "..." : formatCurrency(overviewData.tongChi)}
          </div>
        </div>
        <div className="cb-stat-box bg-dark">
          <label>TỒN QUỸ</label>
          <div className={`val ${isNegative ? "text-red" : "text-green"}`}>
            {isLoading ? "..." : formatCurrency(overviewData.tonQuy)}
          </div>
          {isNegative && <span className="sub">TỒN QUỸ ÂM</span>}
        </div>
      </div>

      {/* Calculation Formula Row */}
      <div className="cb-calculation-row">
        {formatCurrency(overviewData.soDuDauKy)} <span>+</span>{" "}
        {formatCurrency(overviewData.tongThu)} <span>-</span>{" "}
        {formatCurrency(overviewData.tongChi)} <span>=</span>{" "}
        <strong className={isNegative ? "text-red" : "text-green"}>
          {formatCurrency(overviewData.tonQuy)}
        </strong>
      </div>

      {/* Cash Flow Line Chart Container */}
      <div className="cb-chart-container">
        <div className="cb-chart-header">
          <div className="cb-chart-title">
            <h2>DÒNG TIỀN THEO THỜI GIAN</h2>
            <p>
              SO SÁNH TIỀN THU VÀ TIỀN CHI TRONG PHẠM VI ĐANG XEM ({timeMode})
            </p>
          </div>
          <div className="cb-chart-tabs">
            <button
              className={timeMode === "THEO NGÀY" ? "active" : ""}
              onClick={() => handleTimeModeChange("THEO NGÀY")}
              disabled={isChartLoading}
            >
              THEO NGÀY
            </button>
            <button
              className={timeMode === "THEO TUẦN" ? "active" : ""}
              onClick={() => handleTimeModeChange("THEO TUẦN")}
              disabled={isChartLoading}
            >
              THEO TUẦN
            </button>
            <button
              className={timeMode === "THEO THÁNG" ? "active" : ""}
              onClick={() => handleTimeModeChange("THEO THÁNG")}
              disabled={isChartLoading}
            >
              THEO THÁNG
            </button>
          </div>
        </div>
        <div className="cb-chart-body">
          {isLoading || isChartLoading ? (
            <div className="cb-loading-state">
              <div className="cb-spinner" />
              <span>Đang tổng hợp dữ liệu dòng tiền...</span>
            </div>
          ) : chartData.hasData ? (
            <WebGL2LineChart
              labels={chartData.labels}
              datasets={chartData.datasets}
              title="DÒNG TIỀN THEO THỜI GIAN"
            />
          ) : (
            <div className="cb-empty-chart">
              <div className="cb-empty-chart-icon-box">
                <LineChart size={28} strokeWidth={1.8} />
              </div>
              <p className="cb-empty-chart-text">
                KHÔNG CÓ DỮ LIỆU DÒNG TIỀN TRONG KHOẢNG THỜI GIAN ĐÃ CHỌN
              </p>
              <span className="cb-empty-chart-sub">
                Thử chọn khoảng thời gian khác hoặc điều chỉnh lại bộ lọc
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
