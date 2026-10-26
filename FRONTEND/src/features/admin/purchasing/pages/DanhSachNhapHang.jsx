import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';

import TablePagination from '../../../../shared/components/ui/TablePagination';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';

import {
  getPurchaseOrderPage,
  getSupplierOptions,
  IMPORT_STATUS,
  PAYMENT_STATUS,
} from '../api/purchaseOrderApi';

import { money, PageCrumb, StatusBadge } from './PurchaseShared';

import './NhapHang.css';

// ========================================
// Reusable Filter Dropdown
// ========================================

function PurchaseFilterDropdown({
  label,
  value,
  options,
  onChange,
}) {
  const choices = [
    { value: '', label },
    ...options.map((option) => ({
      value: String(option.value),
      label: String(option.label),
    })),
  ];

  // Phân biệt các lựa chọn có tên giống nhau.
  const labelCounts = new Map();

  choices.forEach((option) => {
    labelCounts.set(
      option.label,
      (labelCounts.get(option.label) || 0) + 1
    );
  });

  const displayChoices = choices.map((option) => ({
    ...option,
    displayLabel:
      labelCounts.get(option.label) > 1
        ? `${option.label} (${option.value || 'Tất cả'})`
        : option.label,
  }));

  const selected =
    displayChoices.find(
      (option) => option.value === String(value ?? '')
    ) || displayChoices[0];

  return (
    <FilterDropdown
      options={displayChoices.map((option) => option.displayLabel)}
      value={selected.displayLabel}
      defaultValue={displayChoices[0].displayLabel}
      selectedDark
      onSelect={(selectedLabel) => {
        const option = displayChoices.find(
          (item) => item.displayLabel === selectedLabel
        );

        onChange({
          target: {
            value: option?.value ?? '',
          },
        });
      }}
    />
  );
}

// ========================================
// Danh sách nhập hàng
// ========================================

export default function DanhSachNhapHang() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    keyword: '',
    supplierId: '',
    importStatus: '',
    paymentStatus: '',
    page: 1,
  });

  const [data, setData] = useState({
    items: [],
    totalItems: 0,
    totalPages: 0,
  });

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ========================================
  // Load nhà cung cấp
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    getSupplierOptions(controller.signal)
      .then(setSuppliers)
      .catch((reason) => {
        if (reason.name !== 'AbortError') {
          setError(reason.message);
        }
      });

    return () => controller.abort();
  }, []);

  // ========================================
  // Load danh sách đơn nhập hàng
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError('');

    const timer = setTimeout(() => {
      getPurchaseOrderPage(filters, controller.signal)
        .then(setData)
        .catch((reason) => {
          if (reason.name !== 'AbortError') {
            setError(reason.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters]);

  // ========================================
  // Bộ lọc
  // ========================================

  const update = (key) => (event) => {
    setFilters((old) => ({
      ...old,
      [key]: event.target.value,
      page: 1,
    }));
  };

  const hasFilters =
    filters.supplierId ||
    filters.importStatus ||
    filters.paymentStatus;

  const clearFilters = () => {
    setFilters((old) => ({
      ...old,
      supplierId: '',
      importStatus: '',
      paymentStatus: '',
      page: 1,
    }));
  };

  // ========================================
  // Dropdown options
  // ========================================

  const supplierOptions = suppliers.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const importStatusOptions = Object.entries(IMPORT_STATUS).map(
    ([code, label]) => ({
      value: code,
      label,
    })
  );

  const paymentStatusOptions = Object.entries(PAYMENT_STATUS).map(
    ([code, label]) => ({
      value: code,
      label,
    })
  );

  // ========================================
  // Render
  // ========================================

  return (
    <main className="purchase-page purchase-list-page">
      {/* Header */}
      <div className="purchase-heading">
        <div>
          <PageCrumb />
          <h1>DANH SÁCH ĐƠN NHẬP HÀNG</h1>
        </div>

        <button
          type="button"
          className="purchase-btn black"
          onClick={() =>
            navigate('/kho-hang/nhap-hang/tao-moi')
          }
        >
          <HiOutlinePlus />
          TẠO ĐƠN NHẬP HÀNG
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="purchase-toolbar">
        {/* Tìm kiếm */}
        <label className="purchase-search">
          <HiOutlineSearch />

          <input
            value={filters.keyword}
            onChange={update('keyword')}
            placeholder="TÌM MÃ ĐƠN NHẬP / NHÀ CUNG CẤP..."
          />
        </label>

        {/* Nhà cung cấp */}
        <PurchaseFilterDropdown
          label="NHÀ CUNG CẤP"
          value={filters.supplierId}
          options={supplierOptions}
          onChange={update('supplierId')}
        />

        {/* Trạng thái nhập */}
        <PurchaseFilterDropdown
          label="TRẠNG THÁI NHẬP"
          value={filters.importStatus}
          options={importStatusOptions}
          onChange={update('importStatus')}
        />

        {/* Thanh toán */}
        <PurchaseFilterDropdown
          label="THANH TOÁN"
          value={filters.paymentStatus}
          options={paymentStatusOptions}
          onChange={update('paymentStatus')}
        />

        {/* Xóa bộ lọc */}
        {hasFilters && (
          <button
            type="button"
            className="clear-filters"
            onClick={clearFilters}
          >
            XÓA BỘ LỌC
          </button>
        )}
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <p className="purchase-message error">
          {error}
        </p>
      )}

      {/* Bảng đơn nhập hàng */}
      <div className="purchase-table-wrap">
        <table className="purchase-table">
          <thead>
            <tr>
              <th>MÃ ĐƠN NHẬP</th>
              <th>NHÀ CUNG CẤP</th>
              <th>TRẠNG THÁI NHẬP</th>
              <th>THANH TOÁN</th>
              <th>TỔNG TIỀN</th>
              <th>NGÀY TẠO</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              data.items.map((order) => (
                <tr
                  key={order.id}
                  className={
                    order.importStatus === 'HUY'
                      ? 'cancelled'
                      : ''
                  }
                >
                  {/* Mã đơn nhập */}
                  <td>
                    <strong>{order.code}</strong>
                  </td>

                  {/* Nhà cung cấp */}
                  <td>
                    <strong>
                      {order.supplier.name}
                    </strong>
                  </td>

                  {/* Trạng thái nhập */}
                  <td>
                    <StatusBadge>
                      {order.importStatusLabel}
                    </StatusBadge>
                  </td>

                  {/* Thanh toán */}
                  <td>
                    <StatusBadge>
                      {order.paymentStatusLabel}
                    </StatusBadge>
                  </td>

                  {/* Tổng tiền */}
                  <td className="purchase-money">
                    {money(order.total)}
                  </td>

                  {/* Ngày tạo */}
                  <td>
                    {order.createdAtLabel}
                  </td>

                  {/* Thao tác */}
                  <td>
                    <button
                      type="button"
                      className="purchase-btn outline small"
                      onClick={() =>
                        navigate(
                          `/kho-hang/nhap-hang/${order.id}`
                        )
                      }
                    >
                      XEM CHI TIẾT
                    </button>
                  </td>
                </tr>
              ))}

            {/* Trạng thái tải dữ liệu / rỗng */}
            {(loading || !data.items.length) && (
              <tr className="purchase-empty">
                <td colSpan="7">
                  {loading
                    ? 'Đang tải dữ liệu...'
                    : 'Không tìm thấy đơn nhập hàng phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Thông tin phân trang */}
        <div className="purchase-pagination-caption">
          {data.totalItems} ĐƠN NHẬP · TRANG {filters.page}/
          {Math.max(1, data.totalPages)}
        </div>

        {/* Phân trang */}
        <TablePagination
          totalItems={data.totalItems}
          pageSize={10}
          currentPage={filters.page}
          onPageChange={(page) =>
            setFilters((old) => ({
              ...old,
              page,
            }))
          }
          idPrefix="purchase"
        />
      </div>
    </main>
  );
}