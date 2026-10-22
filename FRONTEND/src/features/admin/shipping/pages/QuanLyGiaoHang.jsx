import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HiOutlineRefresh, HiOutlineSearch } from 'react-icons/hi';

import { apiRequest } from '../../../../auth/backendAuth';
import {
  dateTime,
  isWaitingCodSettlement,
  label,
  money,
  orderDisplayStatus,
} from '../../orders/api/orderApi';
import OrderModal from '../../orders/components/OrderModal';
import { OrderStateBadge } from '../../orders/pages/DanhSachDonHang';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import ImageUploader from '../../../../shared/components/ui/ImageUploader';

import {
  requireBasicStatus,
  withIdempotency,
  nowLocalInput,
  toApiDateTime,
} from '../../../../shared/services/mutationUtils';

import './QuanLyGiaoHang.css';

const API = '/api/v1/admin/deliveries';
const LIST = '/admin/don-hang/quan-ly-giao-hang';

const STATUSES = [
  'CHO_GIAO',
  'DA_NHAN_HANG',
  'DANG_GIAO',
  'GIAO_THANH_CONG',
  'GIAO_THAT_BAI',
  'CHO_HOAN_HANG',
  'DA_HOAN_HANG',
  'HUY_GIAO_HANG',
];

export default function QuanLyGiaoHang() {
  const { deliveryId } = useParams();

  return deliveryId ? <ShipmentDetail key={deliveryId} id={deliveryId} /> : <ShipmentList />;
}

function ShipmentList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const PAGE_SIZE = 20;

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(() =>
    STATUSES.includes(params.get('trang_thai_giao_hang')) ? params.get('trang_thai_giao_hang') : ''
  );
  const [partnerId, setPartnerId] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);

  const [partners, setPartners] = useState({
    loading: true,
    error: '',
    items: [],
  });

  const [state, setState] = useState({
    loading: true,
    error: '',
    items: [],
    pagination: null,
    counts: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    setPartners((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    async function loadPartners() {
      const items = [];
      let nextPage = 0;
      let totalPages = 1;

      // Lấy cả đối tác ngừng hoạt động để lọc lịch sử giao hàng.
      while (nextPage < totalPages) {
        const data = await apiRequest(
          `/api/v1/admin/shipping-partners?page=${nextPage}&limit=100`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        items.push(...(data?.items || []));

        totalPages = Math.max(1, Number(data?.pagination?.total_pages) || 1);

        nextPage += 1;
      }

      if (controller.signal.aborted) return;

      setPartners({
        loading: false,
        error: '',
        items,
      });
    }

    loadPartners().catch((error) => {
      if (controller.signal.aborted) return;

      setPartners((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Không tải được danh sách đối tác.',
      }));
    });

    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();

    setState((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    const timer = setTimeout(async () => {
      const params = new URLSearchParams({
        page: String(page - 1),
        limit: String(PAGE_SIZE),
      });

      if (keyword.trim()) {
        params.set('keyword', keyword.trim());
      }

      if (status) {
        params.set('trang_thai_giao_hang', status);
      }

      if (partnerId) {
        params.set('doi_tac_van_chuyen_id', partnerId);
      }

      try {
        const data = await apiRequest(`${API}?${params}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const lastPage = Math.max(1, Number(data?.pagination?.total_pages) || 1);

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setState({
          loading: false,
          error: '',
          items: data?.items || [],
          pagination: data?.pagination || null,
          counts: data?.thong_ke_trang_thai || null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          loading: false,
          error: error.message || 'Không tải được phiếu giao hàng.',
          items: [],
          pagination: null,
          counts: null,
        });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword, status, partnerId, page, revision]);

  const total = Number(state.pagination?.total_elements) || 0;

  const reload = () => {
    setRevision((current) => current + 1);
  };

  return (
    <section
      className="delivery-page delivery-list-page"
      aria-label="Quản lý giao hàng"
      aria-busy={state.loading}
    >
      <div className="delivery-toolbar">
        <label className="delivery-search">
          <HiOutlineSearch size={16} aria-hidden="true" />

          <input
            type="search"
            maxLength={100}
            aria-label="Tìm phiếu giao hàng"
            placeholder="Tìm mã phiếu / mã vận đơn / mã đơn / tên hoặc SĐT người nhận..."
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
        </label>

        <select
          className="delivery-list-select"
          aria-label="Trạng thái giao hàng"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>

          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>

        <select
          className="delivery-list-select"
          aria-label="Đối tác vận chuyển"
          value={partnerId}
          disabled={partners.loading}
          onChange={(event) => {
            setPartnerId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{partners.loading ? 'Đang tải đối tác...' : 'Tất cả đối tác'}</option>

          {partners.items.map((partner) => (
            <option key={partner.id} value={String(partner.id)}>
              {partner.ten_doi_tac}
              {Number(partner.trang_thai) === 0 ? ' (Ngừng hoạt động)' : ''}
            </option>
          ))}
        </select>

        <span className="delivery-count" aria-live="polite">
          {state.loading || state.error ? '—' : total} PHIẾU
        </span>

        <button
          type="button"
          className="delivery-list-refresh"
          aria-label="Tải lại danh sách giao hàng"
          title="Tải lại"
          disabled={state.loading || partners.loading}
          onClick={reload}
        >
          <HiOutlineRefresh size={16} aria-hidden="true" />
        </button>
      </div>

      {partners.error && (
        <p className="delivery-list-error" role="alert">
          Không tải được bộ lọc đối tác: {partners.error}
        </p>
      )}

      {state.error && (
        <p className="delivery-list-error" role="alert">
          {state.error}
        </p>
      )}

      <div className="delivery-table-scroll">
        <table className="delivery-table" aria-label="Danh sách phiếu giao hàng">
          <colgroup>
            {Array.from({ length: 13 }, (_, index) => (
              <col key={index} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th>MÃ PHIẾU</th>
              <th>MÃ VẬN ĐƠN</th>
              <th>MÃ ĐƠN HÀNG</th>
              <th>ĐÓNG GÓI</th>
              <th>TRẠNG THÁI GIAO</th>
              <th>ĐỐI TÁC</th>
              <th>COD</th>
              <th>PHÍ ĐỐI TÁC</th>
              <th>NGƯỜI NHẬN</th>
              <th>SĐT</th>
              <th>ĐỊA CHỈ</th>
              <th>CẬP NHẬT</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>

          <tbody>
            {state.loading ? (
              <tr>
                <td colSpan={13} className="delivery-list-empty">
                  Đang tải phiếu giao hàng...
                </td>
              </tr>
            ) : state.error ? (
              <tr>
                <td colSpan={13} className="delivery-list-empty">
                  Không thể tải danh sách. Nhấn nút tải lại để thử lại.
                </td>
              </tr>
            ) : state.items.length === 0 ? (
              <tr>
                <td colSpan={13} className="delivery-list-empty">
                  Không tìm thấy phiếu giao hàng phù hợp.
                </td>
              </tr>
            ) : (
              state.items.map((item) => {
                const partner = item.doi_tac_van_chuyen;
                const cod = Number(item.tien_thu_ho_cod) || 0;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong
                        className="delivery-list-code delivery-list-ellipsis"
                        title={item.ma_phieu_giao_hang}
                      >
                        {item.ma_phieu_giao_hang}
                      </strong>
                    </td>

                    <td>
                      <span
                        className="delivery-list-code delivery-list-ellipsis"
                        title={item.ma_van_don || ''}
                      >
                        {item.ma_van_don || '—'}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="delivery-link delivery-list-ellipsis"
                        title={item.ma_don_hang}
                        onClick={() =>
                          navigate(`/admin/don-hang/danh-sach-don-hang/${item.don_hang_id}`)
                        }
                      >
                        {item.ma_don_hang}
                      </button>
                    </td>

                    <td>
                      <OrderStateBadge value={item.trang_thai_dong_goi} />
                    </td>

                    <td>
                      <ShipmentBadge value={item.trang_thai_giao_hang} />
                    </td>

                    <td>
                      {partner?.id ? (
                        <button
                          type="button"
                          className="delivery-partner-link"
                          title={partner.ten_doi_tac}
                          onClick={() =>
                            navigate('/admin/khach-hang-doi-tac/doi-tac-van-chuyen', {
                              state: {
                                partnerId: Number(partner.id),
                              },
                            })
                          }
                        >
                          <b className="delivery-list-ellipsis">{partner.ten_doi_tac}</b>
                          <small>{partner.ma_doi_tac}</small>
                        </button>
                      ) : (
                        <span className="delivery-muted">—</span>
                      )}
                    </td>

                    <td>
                      {cod > 0 ? (
                        <strong className="delivery-money-red">{money(cod)}</strong>
                      ) : (
                        <span className="delivery-muted">Không thu</span>
                      )}
                    </td>

                    <td>
                      <strong className="delivery-money">{money(item.phi_tra_doi_tac ?? 0)}</strong>
                    </td>

                    <td>
                      <span className="delivery-list-ellipsis" title={item.ten_nguoi_nhan || ''}>
                        {item.ten_nguoi_nhan || '—'}
                      </span>
                    </td>

                    <td className="delivery-list-phone">{item.sdt_nguoi_nhan || '—'}</td>

                    <td>
                      <span
                        className="delivery-list-address delivery-list-ellipsis"
                        title={item.dia_chi_giao_hang || ''}
                      >
                        {item.dia_chi_giao_hang || '—'}
                      </span>
                    </td>

                    <td className="delivery-list-updated">
                      {dateTime(item.ngay_cap_nhat || item.ngay_tao)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="delivery-detail-btn"
                        onClick={() => navigate(`${LIST}/${encodeURIComponent(item.id)}`)}
                      >
                        XEM CHI TIẾT
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="delivery-list-footer">
        <div
          className="delivery-status-counts"
          role="group"
          aria-label="Số lượng phiếu theo trạng thái"
        >
          {STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              className={[
                'delivery-status-count',
                `delivery-status--${value}`,
                status === value ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={status === value}
              disabled={state.loading}
              onClick={() => {
                setStatus((current) => (current === value ? '' : value));
                setPage(1);
              }}
            >
              <span>{label(value)}</span>

              <strong>{state.loading ? '—' : (state.counts?.[value] ?? '—')}</strong>
            </button>
          ))}
        </div>

        <fieldset
          className="delivery-list-pagination"
          aria-label="Phân trang phiếu giao hàng"
          disabled={state.loading || Boolean(state.error)}
        >
          <TablePagination
            currentPage={page}
            pageSize={PAGE_SIZE}
            totalItems={total}
            onPageChange={setPage}
            idPrefix="deliveries"
            showSummary={false}
          />
        </fieldset>
      </footer>
    </section>
  );
}

function ShipmentDetail({ id }) {
  const navigate = useNavigate();
  const operationBusy = useRef(false);
  const mounted = useRef(true);
  const deliveryAttempt = useRef(null);

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState('');
  const [notice, setNotice] = useState('');
  const [returnDocument, setReturnDocument] = useState(null);
  const [revision, setRevision] = useState(0);

  const products = delivery?.san_pham || [];
  const productPages = useDetailTablePagination(products);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setLoadError('');

    apiRequest(`${API}/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;

        if (!data?.id) {
          throw new Error('Không nhận được dữ liệu phiếu giao hàng.');
        }

        setDelivery(data);
        setReturnDocument(data.phieu_tra_hang || null);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(error.message || 'Không tải được phiếu giao hàng.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, revision]);

  const open = (kind) => {
    if (operationBusy.current || loading || deliveryAttempt.current) {
      return;
    }

    setOperationError('');
    setNotice('');
    setModal(kind);
  };

  const close = () => {
    if (!operationBusy.current) {
      setModal('');
      setOperationError('');
    }
  };

  const save = async (method, suffix, body, message) => {
    if (operationBusy.current) return;

    operationBusy.current = true;
    setBusy(true);
    setOperationError('');

    const command = {
      method,
      suffix,
      body,
      message,
    };

    try {
      const send = async (key, payload) => {
        const path =
          `${API}/${encodeURIComponent(id)}` + (payload.suffix ? `/${payload.suffix}` : '');

        return apiRequest(path, {
          method: payload.method,

          ...(key
            ? {
                headers: {
                  'Idempotency-Key': key,
                },
              }
            : {}),

          body: JSON.stringify(payload.body),
        });
      };

      const usesIdempotency = ['status', 'return-receipt'].includes(suffix);

      const result = usesIdempotency
        ? await withIdempotency(deliveryAttempt, `delivery:${id}:${suffix}`, command, send)
        : await send(null, command);

      if (!mounted.current) return;

      setDelivery((current) => ({
        ...current,
        ...result,
      }));

      if (result?.phieu_tra_hang) {
        setReturnDocument(result.phieu_tra_hang);
      }

      setNotice(message);
      setModal('');
      setRevision((value) => value + 1);
    } catch (error) {
      if (mounted.current) {
        setOperationError(error.message || 'Không thực hiện được thao tác.');
      }
    } finally {
      operationBusy.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  };

  const retryDeliveryOperation = () => {
    const pending = deliveryAttempt.current;

    if (!pending || operationBusy.current) {
      return;
    }

    const command = pending.body;

    return save(command.method, command.suffix, command.body, command.message);
  };

  if (!delivery) {
    return (
      <section className="delivery-page delivery-detail-page">
        <div className="delivery-not-found">
          <p role={loadError ? 'alert' : 'status'}>{loadError || 'Đang tải phiếu giao hàng...'}</p>

          {loadError && (
            <button type="button" onClick={() => setRevision((value) => value + 1)}>
              THỬ LẠI
            </button>
          )}

          <button type="button" onClick={() => navigate(LIST)}>
            QUAY LẠI DANH SÁCH
          </button>
        </div>
      </section>
    );
  }

  const order = delivery.don_hang || {};
  const recipient = delivery.nguoi_nhan || {};
  const partner = delivery.doi_tac_van_chuyen || {};
  const totals = delivery.tong_tien || {};
  const status = delivery.trang_thai_giao_hang;
  const locked = busy || loading;
  const waitingCod = isWaitingCodSettlement(order, delivery);

  const openOrder =
    order.loai_don_hang === 'ONLINE' &&
    !['HUY_HANG', 'HOAN_THANH'].includes(order.trang_thai_don_hang) &&
    order.trang_thai_xuat_kho !== 'DA_HOAN_KHO';

  const packedAndExported =
    order.trang_thai_dong_goi === 'DA_DONG_GOI' && order.trang_thai_xuat_kho === 'DA_XUAT_KHO';

  const inTransit =
    openOrder && packedAndExported && order.trang_thai_don_hang === 'DANG_GIAO_HANG';

  const canHandoff =
    status === 'CHO_GIAO' &&
    openOrder &&
    packedAndExported &&
    order.trang_thai_don_hang === 'CHO_LAY_HANG';

  const canCancel =
    status === 'CHO_GIAO' &&
    openOrder &&
    order.trang_thai_don_hang === 'CHO_DONG_GOI' &&
    order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' &&
    ['DANG_DONG_GOI', 'DA_DONG_GOI'].includes(order.trang_thai_dong_goi);

  const stages = [
    ['ĐƠN HÀNG', orderDisplayStatus(order, delivery)],
    ['THANH TOÁN', order.trang_thai_thanh_toan],
    ['ĐÓNG GÓI', order.trang_thai_dong_goi],
    ['XUẤT KHO', order.trang_thai_xuat_kho],
  ];

  return (
    <section className="delivery-page delivery-detail-page">
      <header className="delivery-detail-head">
        <div>
          <nav>
            ADMIN <span>›</span> GIAO HÀNG <span>›</span>
            <strong>CHI TIẾT PHIẾU GIAO HÀNG</strong>
          </nav>
          <p className="delivery-detail-code">{delivery.ma_phieu_giao_hang}</p>
        </div>

        <button
          type="button"
          className="delivery-back"
          disabled={busy}
          onClick={() => navigate(LIST)}
        >
          ← QUAY LẠI
        </button>
      </header>

      <div className="delivery-detail-inner">
        {deliveryAttempt.current && (
          <div className="delivery-feedback is-warning" role="status">
            <span>Chưa xác định được kết quả. Dữ liệu đang được giữ nguyên để thử lại.</span>

            <button type="button" disabled={busy} onClick={retryDeliveryOperation}>
              THỬ LẠI YÊU CẦU CŨ
            </button>
          </div>
        )}

        {loadError && (
          <div className="delivery-feedback is-error" role="alert">
            <span>{loadError}</span>
            <button
              type="button"
              disabled={locked}
              onClick={() => setRevision((value) => value + 1)}
            >
              TẢI LẠI
            </button>
          </div>
        )}

        {notice && (
          <div className="delivery-feedback is-success" role="status">
            {notice}
          </div>
        )}

        {waitingCod && (
          <div className="delivery-feedback is-warning" role="status">
            <span>
              Khách đã nhận hàng và trả đủ COD. Cửa hàng đang chờ đối tác nộp{' '}
              {money(delivery.tien_thu_ho_cod)}. Đơn hàng chưa hoàn thành.
            </span>

            <button
              type="button"
              disabled={locked}
              onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`)}
            >
              MỞ ĐƠN HÀNG
            </button>
          </div>
        )}

        {returnDocument && (
          <div className="delivery-feedback">
            <span>
              Phiếu trả: <strong>{returnDocument.ma_tra_hang}</strong>.
              {returnDocument.can_hoan_tien
                ? ` Khoản cần xử lý hoàn tiền: ${money(returnDocument.tong_tien_hoan)}.`
                : ' Không phát sinh khoản hoàn tiền.'}
            </span>
          </div>
        )}

        <div className="delivery-status-strip">
          {stages.map(([title, value]) => (
            <div key={title}>
              <span>{title}</span>
              <OrderStateBadge value={value} />
            </div>
          ))}

          <div>
            <span>GIAO HÀNG</span>
            <ShipmentBadge value={status} />
          </div>
        </div>

        <div className="delivery-detail-grid">
          <div className="delivery-detail-main">
            <ShipmentPanel
              title="THÔNG TIN GIAO HÀNG"
              tools={
                status === 'CHO_GIAO' && openOrder ? (
                  <button
                    type="button"
                    className="delivery-small-btn"
                    disabled={locked}
                    onClick={() => open('edit')}
                  >
                    CHỈNH SỬA THÔNG TIN VẬN ĐƠN
                  </button>
                ) : (
                  <span className="delivery-lock-note">THÔNG TIN VẬN ĐƠN ĐÃ KHÓA</span>
                )
              }
            >
              <dl className="delivery-info-grid">
                <ShipmentInfo title="MÃ PHIẾU GIAO HÀNG">
                  {delivery.ma_phieu_giao_hang}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ VẬN ĐƠN">{delivery.ma_van_don || '—'}</ShipmentInfo>
                <ShipmentInfo title="TRẠNG THÁI">{label(status)}</ShipmentInfo>
                <ShipmentInfo title="NGÀY TẠO">{dateTime(delivery.ngay_tao)}</ShipmentInfo>
                <ShipmentInfo title="NGƯỜI NHẬN">{recipient.ten_nguoi_nhan || '—'}</ShipmentInfo>
                <ShipmentInfo title="SỐ ĐIỆN THOẠI">{recipient.sdt_nguoi_nhan || '—'}</ShipmentInfo>
                <ShipmentInfo title="ĐỊA CHỈ GIAO HÀNG" wide>
                  {recipient.dia_chi_giao_hang || '—'}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ ĐƠN HÀNG">
                  <button
                    type="button"
                    className="delivery-link"
                    onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${order.id}`)}
                  >
                    {order.ma_don_hang}
                  </button>
                </ShipmentInfo>
                <ShipmentInfo title="CẬP NHẬT CUỐI">
                  {dateTime(delivery.ngay_cap_nhat)}
                </ShipmentInfo>
                {delivery.ghi_chu && (
                  <ShipmentInfo title="GHI CHÚ" wide>
                    {delivery.ghi_chu}
                  </ShipmentInfo>
                )}
              </dl>
            </ShipmentPanel>

            <ShipmentPanel title="CHI TIẾT HÀNG HÓA">
              <div className="delivery-items-wrap">
                <table className="delivery-items">
                  <thead>
                    <tr>
                      <th>SẢN PHẨM</th>
                      <th>PHIÊN BẢN</th>
                      <th>ĐƠN GIÁ</th>
                      <th>SL</th>
                      <th>THÀNH TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPages.visibleItems.map((item) => (
                      <tr key={item.chi_tiet_don_hang_id}>
                        <td>
                          <strong>{item.ten_san_pham}</strong>
                          <small>{item.ma_san_pham}</small>
                        </td>
                        <td>{item.ten_phien_ban || '—'}</td>
                        <td>{money(item.don_gia)}</td>
                        <td>{item.so_luong}</td>
                        <td className="delivery-money-red">{money(item.thanh_tien)}</td>
                      </tr>
                    ))}

                    {!products.length && (
                      <tr>
                        <td colSpan={5} className="delivery-empty">
                          Không có dữ liệu hàng hóa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <DetailTablePagination
                totalItems={products.length}
                currentPage={productPages.currentPage}
                onPageChange={productPages.onPageChange}
                idPrefix={`delivery-${id}-products`}
              />

              <dl className="delivery-summary">
                <ShipmentInfo title="Tổng tiền hàng">{money(totals.tong_tien_hang)}</ShipmentInfo>
                <ShipmentInfo title="Chiết khấu">{money(totals.tien_chiet_khau)}</ShipmentInfo>
                <ShipmentInfo title="VAT">{money(totals.tong_tien_vat)}</ShipmentInfo>
                <ShipmentInfo title="Phí giao hàng">{money(totals.phi_giao_hang)}</ShipmentInfo>
                <div className="delivery-total">
                  <dt>KHÁCH PHẢI TRẢ</dt>
                  <dd>{money(totals.tong_thanh_toan)}</dd>
                </div>
              </dl>
            </ShipmentPanel>
          </div>

          <aside className="delivery-detail-side">
            <ShipmentPanel title="THÔNG TIN VẬN CHUYỂN">
              <dl className="delivery-side-info">
                <ShipmentInfo title="ĐỐI TÁC VẬN CHUYỂN">
                  {partner.id ? (
                    <button
                      type="button"
                      className="delivery-link"
                      onClick={() =>
                        navigate('/admin/khach-hang-doi-tac/doi-tac-van-chuyen', {
                          state: { partnerId: Number(partner.id) },
                        })
                      }
                    >
                      {partner.ten_doi_tac}
                    </button>
                  ) : (
                    '—'
                  )}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ ĐỐI TÁC">{partner.ma_doi_tac || '—'}</ShipmentInfo>
                <ShipmentInfo title="LOẠI ĐỐI TÁC">
                  {partner.loai_doi_tac === 'SHIP_CUA_HANG'
                    ? 'Ship cửa hàng'
                    : partner.loai_doi_tac === 'SHIP_CA_NHAN'
                      ? 'Ship cá nhân'
                      : '—'}
                </ShipmentInfo>
                <ShipmentInfo title="MÃ VẬN ĐƠN">{delivery.ma_van_don || '—'}</ShipmentInfo>
                <ShipmentInfo title="TIỀN THU HỘ COD">
                  {Number(delivery.tien_thu_ho_cod) > 0
                    ? money(delivery.tien_thu_ho_cod)
                    : 'Không thu COD'}
                </ShipmentInfo>
                <ShipmentInfo title="PHÍ TRẢ ĐỐI TÁC">
                  {money(delivery.phi_tra_doi_tac)}
                </ShipmentInfo>
              </dl>
            </ShipmentPanel>

            <section className="delivery-actions-panel">
              <h2>
                <i aria-hidden="true" />
                THAO TÁC
              </h2>

              <div>
                {canHandoff && (
                  <button
                    type="button"
                    className="delivery-action black"
                    disabled={locked}
                    onClick={() => open('handoff')}
                  >
                    XÁC NHẬN ĐỐI TÁC ĐÃ NHẬN HÀNG
                  </button>
                )}

                {status === 'DA_NHAN_HANG' && inTransit && (
                  <button
                    type="button"
                    className="delivery-action black"
                    disabled={locked}
                    onClick={() => open('transit')}
                  >
                    CẬP NHẬT ĐANG GIAO
                  </button>
                )}

                {status === 'DANG_GIAO' && inTransit && (
                  <>
                    <button
                      type="button"
                      className="delivery-action success"
                      disabled={locked}
                      onClick={() => open('success')}
                    >
                      GIAO THÀNH CÔNG
                    </button>

                    <button
                      type="button"
                      className="delivery-action danger"
                      disabled={locked}
                      onClick={() => open('failure')}
                    >
                      GIAO THẤT BẠI
                    </button>
                  </>
                )}

                {status === 'CHO_HOAN_HANG' && (
                  <>
                    <p className="delivery-action waiting">
                      ĐANG CHỜ ĐỐI TÁC HOÀN HÀNG VỀ CỬA HÀNG
                    </p>

                    <button
                      type="button"
                      className="delivery-action return"
                      disabled={locked || !inTransit}
                      onClick={() => open('return')}
                    >
                      XÁC NHẬN ĐÃ NHẬN HÀNG HOÀN
                    </button>
                  </>
                )}

                {canCancel && (
                  <button
                    type="button"
                    className="delivery-action danger"
                    disabled={locked}
                    onClick={() => open('cancel')}
                  >
                    HỦY PHIẾU GIAO HÀNG
                  </button>
                )}

                {status === 'GIAO_THANH_CONG' && (
                  <p className="delivery-terminal">ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG</p>
                )}

                {status === 'DA_HOAN_HANG' && (
                  <p className="delivery-terminal">ĐÃ NHẬN HÀNG HOÀN VÀ NHẬP LẠI KHO</p>
                )}

                {status === 'HUY_GIAO_HANG' && (
                  <p className="delivery-terminal">PHIẾU GIAO HÀNG ĐÃ HỦY</p>
                )}

                {status === 'CHO_GIAO' && !canHandoff && !canCancel && (
                  <p className="delivery-terminal">
                    Hoàn tất đóng gói và xuất kho trước khi bàn giao hàng.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {!deliveryAttempt.current && modal === 'edit' && (
        <ShipmentEditDialog
          delivery={delivery}
          busy={busy}
          error={operationError}
          close={close}
          submit={save}
        />
      )}

      {!deliveryAttempt.current && modal === 'return' && (
        <ShipmentReturnDialog
          delivery={delivery}
          busy={busy}
          error={operationError}
          close={close}
          submit={save}
        />
      )}

      {!deliveryAttempt.current &&
        ['handoff', 'transit', 'success', 'failure', 'cancel'].includes(modal) && (
          <ShipmentStatusDialog
            key={modal}
            kind={modal}
            delivery={delivery}
            busy={busy}
            error={operationError}
            close={close}
            submit={save}
          />
        )}
    </section>
  );
}

function ShipmentEditDialog({ delivery, busy, error, close, submit }) {
  const [partnerId, setPartnerId] = useState(String(delivery.doi_tac_van_chuyen?.id || ''));
  const [tracking, setTracking] = useState(delivery.ma_van_don || '');
  const [fee, setFee] = useState(String(delivery.phi_tra_doi_tac ?? 0));
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const items = [];
        let totalPages = 1;

        for (let page = 0; page < totalPages; page++) {
          const result = await apiRequest(
            `/api/v1/admin/shipping-partners?trang_thai=1&page=${page}&limit=100`,
            { signal: controller.signal }
          );

          if (controller.signal.aborted) return;

          items.push(...(result?.items || []));

          totalPages = Math.max(1, Number(result?.pagination?.total_pages) || 1);
        }

        const activePartners = items.filter((item) => requireBasicStatus(item.trang_thai) === 1);

        setPartners(activePartners);
      } catch (exception) {
        if (!controller.signal.aborted) {
          setLoadError(exception.message || 'Không tải được đối tác.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, [revision]);

  const valid =
    !loading &&
    !loadError &&
    partners.some((item) => String(item.id) === partnerId) &&
    /^\d{1,13}(\.\d{1,2})?$/.test(fee) &&
    tracking.trim().length <= 50;

  return (
    <OrderModal
      title="CHỈNH SỬA THÔNG TIN VẬN ĐƠN"
      className="delivery-operation-dialog"
      showClose
      busy={busy}
      close={close}
      error={error || loadError}
      disabled={!valid}
      confirmLabel="LƯU THÔNG TIN"
      submit={() =>
        submit(
          'PUT',
          '',
          {
            doi_tac_van_chuyen_id: Number(partnerId),
            ma_van_don: tracking.trim() || null,
            phi_tra_doi_tac: Number(fee),
          },
          'Đã cập nhật thông tin vận đơn.'
        )
      }
    >
      <label className="delivery-field">
        <span>ĐỐI TÁC VẬN CHUYỂN *</span>
        <select
          required
          value={partnerId}
          disabled={loading}
          onChange={(event) => setPartnerId(event.target.value)}
        >
          <option value="">{loading ? 'Đang tải đối tác...' : 'Chọn đối tác'}</option>
          {partners.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.ten_doi_tac} — {item.ma_doi_tac}
            </option>
          ))}
        </select>
      </label>

      {loadError && (
        <button
          type="button"
          className="delivery-small-btn"
          onClick={() => setRevision((value) => value + 1)}
        >
          TẢI LẠI ĐỐI TÁC
        </button>
      )}

      <label className="delivery-field">
        <span>MÃ VẬN ĐƠN</span>
        <input
          value={tracking}
          maxLength={50}
          onChange={(event) => setTracking(event.target.value)}
          placeholder="Có thể để trống"
        />
      </label>

      <label className="delivery-field">
        <span>PHÍ TRẢ ĐỐI TÁC (đ) *</span>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={fee}
          onChange={(event) => setFee(event.target.value)}
        />
      </label>
    </OrderModal>
  );
}

function ShipmentStatusDialog({ kind, delivery, busy, error, close, submit }) {
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const cod = Number(delivery.tien_thu_ho_cod || 0);

  const configurations = {
    handoff: {
      title: 'XÁC NHẬN ĐỐI TÁC ĐÃ NHẬN HÀNG',
      target: 'DA_NHAN_HANG',
      confirmLabel: 'XÁC NHẬN BÀN GIAO',
      confirmation: 'Tôi xác nhận đã bàn giao hàng cho đối tác.',
      message: 'Đã xác nhận đối tác nhận hàng.',
      tone: '',
    },
    transit: {
      title: 'CẬP NHẬT ĐANG GIAO HÀNG',
      target: 'DANG_GIAO',
      confirmLabel: 'XÁC NHẬN ĐANG GIAO',
      confirmation: 'Tôi xác nhận đối tác đang vận chuyển đơn hàng.',
      message: 'Đã cập nhật trạng thái đang giao hàng.',
      tone: '',
    },
    success: {
      title: 'XÁC NHẬN GIAO THÀNH CÔNG',
      target: 'GIAO_THANH_CONG',
      confirmLabel: 'XÁC NHẬN ĐÃ GIAO',
      confirmation:
        cod > 0
          ? 'Xác nhận shipper đã thu đủ tiền COD từ khách.'
          : 'Tôi xác nhận khách hàng đã nhận đủ hàng.',
      message: 'Đã xác nhận giao hàng thành công.',
      tone: 'is-success',
    },
    failure: {
      title: 'XÁC NHẬN GIAO HÀNG THẤT BẠI',
      target: 'GIAO_THAT_BAI',
      confirmLabel: 'XÁC NHẬN THẤT BẠI',
      confirmation: 'Tôi xác nhận đơn hàng giao không thành công.',
      message: 'Đã ghi nhận giao thất bại và chuyển sang chờ hoàn hàng.',
      tone: 'is-danger',
    },
    cancel: {
      title: 'HỦY PHIẾU GIAO HÀNG',
      confirmLabel: 'XÁC NHẬN HỦY',
      confirmation: 'Tôi xác nhận hủy phiếu giao hàng.',
      message: 'Đã hủy phiếu giao hàng.',
      tone: 'is-danger',
    },
  };

  const config = configurations[kind];
  const valid = confirmed && (kind !== 'cancel' || (reason.trim() && reason.trim().length <= 255));

  const save = () => {
    if (kind === 'cancel') {
      return submit('POST', 'cancel', { ly_do: reason.trim() }, config.message);
    }

    return submit(
      'PATCH',
      'status',
      {
        trang_thai_giao_hang: config.target,
        ...(kind === 'success' && cod > 0 ? { xac_nhan_da_thu_cod: true } : {}),
      },
      config.message
    );
  };

  return (
    <OrderModal
      title={config.title}
      className={`delivery-operation-dialog ${config.tone}`}
      showClose
      busy={busy}
      close={close}
      submit={save}
      error={error}
      disabled={!valid}
      confirmLabel={config.confirmLabel}
    >
      {kind === 'success' && (
        <div className="delivery-cod">
          <span>TIỀN COD CẦN THU</span>
          <strong>{money(cod)}</strong>
        </div>
      )}

      {kind === 'failure' && (
        <p className="delivery-warning">
          Hàng sẽ chuyển sang trạng thái CHỜ HOÀN VỀ CỬA HÀNG. Xác nhận nhận hàng hoàn khi hàng đã
          về kho.
        </p>
      )}

      {kind === 'cancel' && (
        <label className="delivery-field">
          <span>LÝ DO HỦY *</span>
          <textarea
            required
            maxLength={255}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      )}

      <label className="delivery-checkbox">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>{config.confirmation}</span>
      </label>
    </OrderModal>
  );
}

export function ShipmentReturnDialog({
  delivery,
  busy,
  error,
  close,
  submit,
  requirementsUrl = null,
  beforeHandover = false,
}) {
  const [requirements, setRequirements] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CHUYEN_KHOAN');
  const [confirmed, setConfirmed] = useState(false);
  const [evidence, setEvidence] = useState([]);
  const [receivedAt, setReceivedAt] = useState(receiptInputNow);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setLoadError('');
    setRequirements(null);
    setRows([]);

    apiRequest(requirementsUrl || `${API}/${encodeURIComponent(delivery.id)}/return-requirements`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;

        if (!data?.kho_nhan?.id || !Array.isArray(data.hang_phai_nhan)) {
          throw new Error('Dữ liệu yêu cầu nhận hoàn không hợp lệ.');
        }

        const nextRows = data.hang_phai_nhan.map((item) => {
          const quantity = Number(item.so_luong_da_xuat);

          if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            throw new Error('Số lượng xuất gốc chưa có đủ căn cứ.');
          }

          return {
            ...item,
            so_luong_da_xuat: quantity,
            good: String(quantity),
            bad: '0',
            resale: '',
            inspectionNote: '',
            serials: (item.thiet_bi || [])
              .filter((device) => device.so_serial_id != null)
              .map((device) => ({
                ...device,
                resale: '',
              })),
          };
        });

        setRequirements(data);
        setRows(nextRows);
        setConfirmed(false);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setLoadError(failure.message || 'Không tải được căn cứ nhận hàng hoàn.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [delivery.id, revision, requirementsUrl]);

  const changeRow = (index, values) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...values } : row))
    );
  };

  const changeQuantity = (index, field, rawValue) => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        if (rawValue === '') {
          return {
            ...row,
            [field]: '',
          };
        }

        if (!/^\d+$/.test(rawValue)) return row;

        const limit = row.so_luong_da_xuat;
        const parsed = Number(rawValue);

        if (!Number.isSafeInteger(parsed)) return row;

        const quantity = Math.min(limit, Math.max(0, parsed));

        return {
          ...row,
          good: field === 'good' ? String(quantity) : String(limit - quantity),
          bad: field === 'bad' ? String(quantity) : String(limit - quantity),
        };
      })
    );
  };

  const changeSerial = (rowIndex, serialId, value) => {
    setRows((current) =>
      current.map((row, index) =>
        index !== rowIndex
          ? row
          : {
              ...row,
              serials: row.serials.map((serial) =>
                Number(serial.so_serial_id) === Number(serialId)
                  ? { ...serial, resale: value }
                  : serial
              ),
            }
      )
    );
  };

  let timeError = '';

  try {
    receiptApiTime(receivedAt);
  } catch (failure) {
    timeError = failure.message;
  }

  const evidenceReady =
    evidence.length > 0 &&
    evidence.length <= 50 &&
    evidence.every(
      (image) =>
        !image.uploading &&
        !image.error &&
        typeof image.url === 'string' &&
        (image.url.startsWith('https://') || image.url.startsWith('/uploads/'))
    );

  const reasons = requirements?.ly_do_chan || [];

  const valid =
    !loading &&
    !loadError &&
    requirements?.co_the_nhan_hoan === true &&
    rows.length > 0 &&
    rows.every(validReturnRow) &&
    !timeError &&
    evidenceReady &&
    confirmed &&
    reason.trim().length > 0 &&
    reason.trim().length <= 255;

  const save = () => {
    if (!valid || busy) return;

    const body = {
      xac_nhan_da_nhan_du_hang: true,
      ly_do_tra: reason.trim(),
      hinh_thuc_hoan_tien: refundMethod,
      thoi_diem_nhan: receiptApiTime(receivedAt),

      hang_nhan: rows.map((row) => ({
        chi_tiet_don_hang_id: row.chi_tiet_don_hang_id,
        phien_ban_id: row.phien_ban_id,
        so_luong_nguyen_ven: Number(row.good),
        so_luong_loi: Number(row.bad),

        serials: row.co_quan_ly_serial
          ? row.serials.map((serial) => ({
              so_serial_id: serial.so_serial_id,
              du_dieu_kien_ban_lai: serial.resale === 'true',
            }))
          : [],

        ...(!row.co_quan_ly_serial
          ? {
              du_dieu_kien_ban_lai: row.resale === 'true',
            }
          : {}),

        ghi_chu_kiem_tra: row.inspectionNote.trim() || null,
      })),

      bang_chung_urls: evidence.map((image) => image.url),
    };

    return submit(
      'POST',
      beforeHandover ? 'cancel-before-handover' : 'return-receipt',
      body,
      beforeHandover ? 'Đã hủy đơn và nhận lại đủ hàng.' : 'Đã nhận đủ hàng hoàn và nhập lại kho.'
    );
  };

  const moneyEvidence = requirements?.doi_soat_tien;
  const moneyKnown = moneyEvidence?.co_du_can_cu === true;

  const hasRefund = moneyKnown && Number(moneyEvidence.tong_tien_can_hoan) > 0;

  return (
    <OrderModal
      title={beforeHandover ? 'HỦY ĐƠN VÀ NHẬN LẠI HÀNG' : 'XÁC NHẬN HÀNG HOÀN VỀ KHO'}
      className="delivery-operation-dialog delivery-return-dialog is-return"
      showClose
      busy={busy}
      close={close}
      submit={save}
      disabled={!valid}
      error={error || loadError}
      confirmLabel="XÁC NHẬN ĐÃ NHẬN HÀNG HOÀN"
    >
      <p className="delivery-warning">
        Hàng hoàn được nhập về <strong>{requirements?.kho_nhan?.ten_kho || 'kho cửa hàng'}</strong>.
      </p>

      {loading && <p role="status">Đang tải căn cứ nhận hàng hoàn...</p>}

      {loadError && (
        <button
          type="button"
          className="delivery-small-btn"
          disabled={busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          TẢI LẠI
        </button>
      )}

      {!loading && requirements && (
        <>
          {reasons.length > 0 && (
            <div className="delivery-return-blocked" role="alert">
              <strong>CHƯA THỂ NHẬN HOÀN</strong>

              <ul>
                {reasons.map((code) => (
                  <li key={code}>{returnBlockReason(code)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="delivery-return-finance">
            <span>KHOẢN CẦN HOÀN CHO KHÁCH</span>

            <strong>{moneyKnown ? money(moneyEvidence.tong_tien_can_hoan) : 'Cần xác minh'}</strong>

            <p>
              Khoản này được xác định từ tiền đã thực thu. Nhận hàng về kho chưa thực hiện hoàn
              tiền.
            </p>
          </div>

          <label className="delivery-field">
            <span>THỜI ĐIỂM THỰC NHẬN *</span>

            <input
              type="datetime-local"
              step="1"
              required
              value={receivedAt}
              onChange={(event) => setReceivedAt(event.target.value)}
            />

            {timeError && <small className="delivery-return-error">{timeError}</small>}
          </label>

          <div className="delivery-return-items">
            {rows.map((row, index) => {
              const managed = row.co_quan_ly_serial === true;

              const sellable = managed
                ? row.serials.filter((serial) => serial.resale === 'true').length
                : row.resale === 'true'
                  ? Number(row.good || 0)
                  : 0;

              return (
                <section
                  className="delivery-return-item"
                  key={`${row.chi_tiet_don_hang_id}:` + row.phien_ban_id}
                >
                  <header className="delivery-return-item-head">
                    <div>
                      <strong>{row.ten_san_pham || `Phiên bản #${row.phien_ban_id}`}</strong>

                      <small>{row.ten_phien_ban || '—'}</small>

                      {row.ten_dong_don_hang && row.ten_dong_don_hang !== row.ten_san_pham && (
                        <small>Thuộc: {row.ten_dong_don_hang}</small>
                      )}
                    </div>

                    {row.la_qua_tang && <span className="delivery-return-gift">QUÀ TẶNG</span>}
                  </header>

                  <p className="delivery-return-quantity-note">
                    Đã xuất: <strong>{row.so_luong_da_xuat}</strong>
                    {' · '}Đủ điều kiện bán lại: <strong>{sellable}</strong>
                  </p>

                  <div className="delivery-return-count-grid">
                    <label className="delivery-field">
                      <span>SỐ LƯỢNG NGUYÊN VẸN *</span>

                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max={row.so_luong_da_xuat}
                        step="1"
                        required
                        value={row.good}
                        onChange={(event) => changeQuantity(index, 'good', event.target.value)}
                      />
                    </label>

                    <label className="delivery-field">
                      <span>SỐ LƯỢNG LỖI *</span>

                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max={row.so_luong_da_xuat}
                        step="1"
                        required
                        value={row.bad}
                        onChange={(event) => changeQuantity(index, 'bad', event.target.value)}
                      />
                    </label>
                  </div>

                  {managed ? (
                    <div className="delivery-return-serial-list">
                      {row.serials.map((serial) => (
                        <label className="delivery-return-serial" key={serial.so_serial_id}>
                          <span>
                            <strong>{serial.so_serial || `Serial #${serial.so_serial_id}`}</strong>

                            <small>{serial.ma_theo_doi || ''}</small>
                          </span>

                          <select
                            required
                            value={serial.resale}
                            onChange={(event) =>
                              changeSerial(index, serial.so_serial_id, event.target.value)
                            }
                          >
                            <option value="">Kết luận kiểm tra</option>

                            <option value="true">Đủ điều kiện bán lại</option>

                            <option value="false">Không đủ điều kiện bán lại</option>
                          </select>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <label className="delivery-field">
                      <span>KẾT LUẬN HÀNG NGUYÊN VẸN *</span>

                      <select
                        required
                        value={row.resale}
                        onChange={(event) =>
                          changeRow(index, {
                            resale: event.target.value,
                          })
                        }
                      >
                        <option value="">Chọn kết luận kiểm tra</option>

                        <option value="true">Đủ điều kiện bán lại</option>

                        <option value="false">Không đủ điều kiện bán lại</option>
                      </select>
                    </label>
                  )}

                  <label className="delivery-field">
                    <span>GHI CHÚ KIỂM TRA</span>

                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={row.inspectionNote}
                      onChange={(event) =>
                        changeRow(index, {
                          inspectionNote: event.target.value,
                        })
                      }
                      placeholder="Tem, phụ kiện, bao bì, tình trạng thực tế..."
                    />
                  </label>

                  {!validReturnRow(row) && (
                    <p className="delivery-return-error">
                      Cần nhận đủ số lượng đã xuất và kết luận điều kiện bán lại. Số đủ điều kiện
                      bán lại không được vượt số nguyên vẹn.
                    </p>
                  )}
                </section>
              );
            })}
          </div>

          <label className="delivery-field">
            <span>{beforeHandover ? 'LÝ DO HỦY ĐƠN *' : 'LÝ DO TRẢ *'}</span>

            <textarea
              required
              rows={3}
              maxLength={255}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                beforeHandover
                  ? 'Lý do hủy đơn khi hàng chưa bàn giao...'
                  : 'Ví dụ: Khách không nhận, đối tác đã hoàn đủ hàng...'
              }
            />
          </label>

          <div className="delivery-return-evidence">
            <strong>ẢNH BẰNG CHỨNG *</strong>

            <p>Chụp hàng thực nhận, serial và tình trạng hàng. Tối đa 50 ảnh.</p>

            <div inert={busy}>
              <ImageUploader images={evidence} onImagesChange={setEvidence} folder="general" />
            </div>

            {!evidenceReady && (
              <small className="delivery-return-error">
                Cần ít nhất một ảnh tải lên thành công. Hãy xóa ảnh lỗi hoặc ảnh vượt giới hạn.
              </small>
            )}
          </div>

          {hasRefund && (
            <label className="delivery-field">
              <span>HÌNH THỨC HOÀN TIỀN DỰ KIẾN *</span>

              <select
                required
                value={refundMethod}
                onChange={(event) => setRefundMethod(event.target.value)}
              >
                <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                <option value="TIEN_MAT">Tiền mặt</option>
              </select>
            </label>
          )}

          <label className="delivery-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />

            <span>Tôi xác nhận đã thực nhận đủ hàng và hoàn tất kiểm tra tình trạng.</span>
          </label>
        </>
      )}
    </OrderModal>
  );
}

function validReturnRow(row) {
  const expected = Number(row.so_luong_da_xuat);

  if (!/^\d+$/.test(row.good) || !/^\d+$/.test(row.bad)) {
    return false;
  }

  const good = Number(row.good);
  const bad = Number(row.bad);

  if (
    !Number.isSafeInteger(expected) ||
    expected <= 0 ||
    !Number.isSafeInteger(good) ||
    !Number.isSafeInteger(bad) ||
    good < 0 ||
    bad < 0 ||
    good + bad !== expected
  ) {
    return false;
  }

  if (!row.co_quan_ly_serial) {
    return row.serials.length === 0 && ['true', 'false'].includes(row.resale);
  }

  const serialIds = row.serials.map((serial) => Number(serial.so_serial_id));

  const sellable = row.serials.filter((serial) => serial.resale === 'true').length;

  return (
    serialIds.length === expected &&
    serialIds.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(serialIds).size === expected &&
    row.serials.every((serial) => ['true', 'false'].includes(serial.resale)) &&
    sellable <= good
  );
}

function receiptInputNow() {
  const seconds = String(new Date().getSeconds()).padStart(2, '0');
  return `${nowLocalInput()}:${seconds}`;
}

function receiptApiTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:[0-5]\d)?$/.test(value || '')) {
    throw new Error('Vui lòng nhập thời điểm thực nhận hợp lệ.');
  }

  // Dùng helper chung để kiểm tra phần ngày và giờ.
  toApiDateTime(value.slice(0, 16));

  const full = value.length === 16 ? `${value}:00` : value;

  const result = `${full}+07:00`;
  const parsed = new Date(result);

  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) {
    throw new Error('Thời điểm thực nhận không được nằm trong tương lai.');
  }

  return result;
}

function returnBlockReason(code) {
  const messages = {
    EXPORT_HISTORY_UNVERIFIED: 'Chưa xác minh đủ hàng và nhận dạng của lần xuất gốc.',
    PAYMENT_HISTORY_UNVERIFIED: 'Chưa đủ chứng từ xác định số tiền đã thu và cần hoàn.',
    RETURN_ALREADY_EXISTS: 'Đơn đã có phiếu trả; cần kiểm tra phiếu đã tạo.',
    RECIPIENT_HISTORY_UNVERIFIED: 'Thông tin liên hệ trên đơn chưa đầy đủ.',
  };

  return messages[code] || 'Dữ liệu nguồn cần được kiểm tra lại.';
}

function getReturnCounts(row) {
  if (row.quan_ly_serial) {
    return {
      good: row.serials.filter((serial) => serial.trang_thai_sau_nhan === 'TRONG_KHO').length,
      bad: row.serials.filter((serial) => serial.trang_thai_sau_nhan === 'LOI').length,
    };
  }

  return {
    good: /^\d+$/.test(row.good) ? Number(row.good) : NaN,
    bad: /^\d+$/.test(row.bad) ? Number(row.bad) : NaN,
  };
}

function ShipmentPanel({ title, tools, children }) {
  return (
    <section className="delivery-panel">
      <header>
        <h2>
          <i aria-hidden="true" />
          {title}
        </h2>
        {tools}
      </header>
      {children}
    </section>
  );
}

function ShipmentInfo({ title, wide = false, children }) {
  return (
    <div className={wide ? 'wide' : undefined}>
      <dt>{title}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ShipmentBadge({ value }) {
  return (
    <span className={`delivery-badge delivery-badge--${value}`}>{label(value).toUpperCase()}</span>
  );
}
