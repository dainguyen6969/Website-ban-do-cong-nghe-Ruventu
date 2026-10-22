import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import {
  approveOrder,
  cancelOrder,
  canEditOnlineOrder,
  confirmOrderPayment,
  confirmPickup,
  dateTime,
  exportOrder,
  getOrder,
  getOrderHistory,
  getOrderOptions,
  getSerialRequirements,
  label,
  money,
  refundOrder,
  setPackingStatus,
  startFulfillment,
  startOrderDelivery,
  setDeliveryStatus,
  paymentSource,
  isWaitingCodSettlement,
  orderDisplayStatus,
  getPackingSerials,
  savePackingSerials,
  cancelBeforeHandover,
  counterExchangeOrder,
  completeCounterInspection,
} from '../api/orderApi';

import OrderRefundPanel from '../components/OrderRefundPanel';
import { OrderStateBadge } from './DanhSachDonHang';
import './ChiTietDonHang.css';
import OrderModal from '../components/OrderModal';
import ExportOrderDialog from '../components/ExportOrderDialog';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  errorMessage,
  inputFromApiTime,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import {
  OrderLineAmount,
  OrderLineNotice,
  OrderPromotionSummary,
} from '../../../../shared/components/ui/OrderSaleDetails';
import { canExport, exportPayload } from '../components/exportSelection';
import SoldDevices from '../../../../shared/components/ui/SoldDevices';
import ComboContents from '../../../../shared/components/ui/ComboContents';
import { ShipmentReturnDialog } from '../../shipping/pages/QuanLyGiaoHang';

function OrderProductImage({ item }) {
  const [failedUrl, setFailedUrl] = useState(null);
  return item.anh_dai_dien && failedUrl !== item.anh_dai_dien ? (
    <img
      src={item.anh_dai_dien}
      alt={item.ten_phien_ban || item.ten_san_pham}
      loading="lazy"
      onError={() => setFailedUrl(item.anh_dai_dien)}
    />
  ) : (
    <span className="order-product-no-image">Chưa có ảnh</span>
  );
}

export default function ChiTietDonHang() {
  const actionBusy = useRef(false);
  const cashAttempt = useRef(null);
  const orderAttempt = useRef(null);
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [refundRevision, setRefundRevision] = useState(0);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [dialog, setDialog] = useState(null);
  const [options, setOptions] = useState({ warehouses: [], partners: [] });
  const [state, setState] = useState({ loading: true, busy: false, error: '' });
  const load = useCallback(
    async (signal) => {
      try {
        const [detail, events] = await Promise.all([
          getOrder(orderId, signal),
          getOrderHistory(orderId, signal),
        ]);
        if (signal?.aborted) return;
        setOrder(detail);
        setHistory(events);
        setRefundRevision((value) => value + 1);
        setState((s) => ({ ...s, loading: false, error: '' }));
      } catch (error) {
        if (error.name !== 'AbortError')
          setState((s) => ({ ...s, loading: false, error: error.message }));
      }
    },
    [orderId]
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    getOrderOptions(controller.signal)
      .then(setOptions)
      .catch(() => {});
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (
      order?.loai_don_hang !== 'ONLINE' ||
      !['CHO_DUYET', 'CHO_HANG'].includes(order?.trang_thai_don_hang) ||
      state.busy ||
      dialog ||
      isCancelOpen
    ) {
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(
      () => {
        if (!actionBusy.current) {
          void load(controller.signal);
        }
      },
      order.trang_thai_don_hang === 'CHO_HANG' ? 5000 : 10000
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [order, state.busy, dialog, isCancelOpen, load]);

  const products = useDetailTablePagination(order?.san_pham || []);
  const run = async (work) => {
    if (actionBusy.current) return;

    actionBusy.current = true;
    setState((current) => ({
      ...current,
      busy: true,
      error: '',
    }));

    try {
      await work();

      setDialog(null);
      await load();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: errorMessage(error),
      }));
    } finally {
      actionBusy.current = false;

      setState((current) => ({
        ...current,
        busy: false,
      }));
    }
  };
  useEffect(() => {
    if (!isCancelOpen) return undefined;
    const close = (event) => {
      if (event.key === 'Escape') setIsCancelOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isCancelOpen]);

  if (state.loading)
    return (
      <section className="admin-order-detail admin-order-not-found">
        <h1>ĐANG TẢI ĐƠN HÀNG...</h1>
      </section>
    );
  if (!order)
    return (
      <section className="admin-order-detail admin-order-not-found">
        <h1>KHÔNG THỂ TẢI ĐƠN HÀNG</h1>
        <p>{state.error}</p>
        <button type="button" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}>
          QUAY LẠI DANH SÁCH
        </button>
      </section>
    );

  const open = (type, title, fields = {}) => {
    setState((s) => ({ ...s, error: '' }));
    setDialog({ type, title, confirmed: false, ...fields });
  };
  const approve = () => open('approve', 'DUYỆT ĐƠN');
  const fulfillment = () => open('fulfillment', 'BẮT ĐẦU ĐÓNG GÓI');

  const openCounterExchange = (device) => {
    const original = (order.thiet_bi_da_giao || []).find(
      (item) => String(item.thiet_bi_id) === String(device.thiet_bi_goc_id)
    );

    const exchangeCount = Array.isArray(device.chuoi_thay_the) ? device.chuoi_thay_the.length : 0;

    open(
      'counterExchange',
      exchangeCount > 0 ? 'GHI NHẬN LỖI THIẾT BỊ THAY THẾ' : 'ĐỔI 1-1 LỖI TẠI QUẦY',
      {
        deviceId: device.thiet_bi_id,
        deviceLabel: original?.ten_san_pham || 'Phiên bản #' + device.phien_ban_id,
        oldTracking: device.ma_theo_doi,
        oldSerial: device.so_serial,
        serialManaged: device.so_serial_id != null,
        exchangeCount,
        newSerial: '',
        newIdentification: '',
        reason: '',
        contactName: order.ten_khach_hang || '',
        contactPhone: order.so_dien_thoai_khach_hang || order.sdt_nguoi_nhan || '',
      }
    );
  };

  const sendOrderOperation = (kind, body) => {
    const scope = `order:${order.id}:${kind}`;

    return withIdempotency(orderAttempt, scope, body, (key, payload) => {
      switch (kind) {
        case 'counterExchange':
          return counterExchangeOrder(order.id, key, payload);

        case 'fulfillment':
          return startFulfillment(order.id, key, payload);

        case 'packingSerials':
          return savePackingSerials(order.id, key, payload);

        case 'export':
          return exportOrder(order.id, key, payload);

        case 'cancel':
          return cancelOrder(order.id, key, payload);

        case 'pickup':
          return confirmPickup(order.id, key, payload);

        case 'deliveryStatus':
          return setDeliveryStatus(payload.deliveryId, key, payload.request);

        case 'cancelBeforeHandover':
          return cancelBeforeHandover(order.id, key, payload);

        case 'completeCounterInspection':
          return completeCounterInspection(order.id, key, payload);

        default:
          throw new Error('Thao tác không hợp lệ.');
      }
    });
  };

  const retryOrderOperation = () => {
    const pending = orderAttempt.current;

    if (!pending) return;

    const kind = pending.scope.split(':').at(-1);

    return run(() => sendOrderOperation(kind, pending.body));
  };

  const cancel = () =>
    run(async () => {
      if (orderAttempt.current) {
        const pending = orderAttempt.current;

        if (pending.scope !== `order:${order.id}:cancel`) {
          throw new Error('Hãy xử lý yêu cầu đang chờ kết quả trước.');
        }

        await sendOrderOperation('cancel', pending.body);
      } else {
        await sendOrderOperation('cancel', {
          ly_do: cancelReason.trim(),
        });
      }

      setIsCancelOpen(false);
      setCancelReason('');
    });

  const openSerialAllocation = async (type) => {
    try {
      setState((current) => ({
        ...current,
        busy: true,
        error: '',
      }));

      const [requirements, saved] = await Promise.all([
        getSerialRequirements(order.id),
        getPackingSerials(order.id),
      ]);

      const warehouseId = Number(requirements.kho_hang_id);
      const lines = requirements.items || [];

      if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
        throw new Error('Chưa xác định được kho của đơn.');
      }

      if (Number(saved.kho_hang_id) !== warehouseId) {
        throw new Error('Kho của phân bổ đóng gói không khớp kho của đơn.');
      }

      if (!lines.length) {
        throw new Error('Đơn chưa có căn cứ hàng vật lý.');
      }

      const savedGroups = new Map(
        (saved.items || []).flatMap((line) =>
          (line.serials || []).map((group) => [
            `${line.chi_tiet_don_hang_id}:${group.phien_ban_id}`,
            group.serial_ids || [],
          ])
        )
      );

      const groups = lines.flatMap((line) =>
        (line.serial_requirements || [])
          .filter((requirement) => Number(requirement.so_luong_can_serial) > 0)
          .map((requirement) => ({
            ...requirement,
            so_luong_can_serial: Number(requirement.so_luong_can_serial),
            lineId: line.chi_tiet_don_hang_id,
            name:
              [requirement.ten_san_pham, requirement.ten_phien_ban].filter(Boolean).join(' · ') ||
              `Phiên bản #${requirement.phien_ban_id}`,
            selected:
              savedGroups.get(`${line.chi_tiet_don_hang_id}:${requirement.phien_ban_id}`) || [],
          }))
      );

      if (type === 'export') {
        if (!canExport(warehouseId, groups)) {
          throw new Error(
            'Phân bổ serial đóng gói chưa đầy đủ. ' + 'Hãy kiểm tra lại phần đóng gói.'
          );
        }

        open('export', 'XÁC NHẬN XUẤT KHO', {
          exportBody: exportPayload(warehouseId, lines, groups),
          serialCount: groups.reduce((total, group) => total + group.selected.length, 0),
        });

        return;
      }

      if (!groups.length) {
        throw new Error(
          'Đơn không có hàng quản lý serial. ' + 'Bạn có thể chọn HOÀN TẤT ĐÓNG GÓI.'
        );
      }

      open('packingSerials', 'SERIAL ĐÓNG GÓI', {
        warehouseId,
        requirements: lines,
        groups,
        savedSerials: saved.serial_da_giu || [],
        defectIds: [],
        defectReason: '',
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: errorMessage(error),
      }));
    } finally {
      setState((current) => ({
        ...current,
        busy: false,
      }));
    }
  };

  const packingSerials = () => openSerialAllocation('packingSerials');

  const warehouseExport = () => openSerialAllocation('export');

  const orderNeedsSerial = (order.san_pham || []).some((item) => item.quan_ly_serial === true);

  const deliveries = order.phieu_giao_hang || [];

  const activeDeliveries = deliveries.filter(
    (item) => !['HUY_GIAO_HANG', 'DA_HOAN_HANG'].includes(item.trang_thai_giao_hang)
  );

  const activeDelivery = activeDeliveries.length === 1 ? activeDeliveries[0] : null;

  const isShipping = order.hinh_thuc_nhan_hang === 'GIAO_HANG';
  const isPickup = order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG';

  const openOnlineOrder =
    order.loai_don_hang === 'ONLINE' &&
    !['HUY_HANG', 'HOAN_THANH'].includes(order.trang_thai_don_hang);

  const handoverReasons = [
    order.trang_thai_don_hang !== 'CHO_LAY_HANG' && 'Đơn chưa ở trạng thái chờ lấy hàng.',
    order.trang_thai_dong_goi !== 'DA_DONG_GOI' && 'Chưa hoàn tất đóng gói.',
    order.trang_thai_xuat_kho !== 'DA_XUAT_KHO' && 'Chưa xuất kho.',
  ].filter(Boolean);

  const startDeliveryReasons = [
    ...handoverReasons,
    activeDeliveries.length > 1 && 'Có nhiều phiếu giao hiệu lực.',
    activeDelivery &&
      activeDelivery.trang_thai_giao_hang !== 'CHO_GIAO' &&
      'Phiếu giao đã được bàn giao.',
  ].filter(Boolean);

  const pickupReasons = [
    ...handoverReasons,
    Number(order.tong_thanh_toan) > 0 &&
      order.trang_thai_thanh_toan !== 'DA_THANH_TOAN' &&
      'Khách chưa thanh toán đủ.',
    activeDeliveries.length > 0 && 'Đơn đang có phiếu giao hàng hiệu lực.',
  ].filter(Boolean);

  const canStartDelivery = openOnlineOrder && isShipping && startDeliveryReasons.length === 0;

  const canConfirmPickup = openOnlineOrder && isPickup && pickupReasons.length === 0;

  const beginDelivery = () =>
    open('startDelivery', 'BẮT ĐẦU GIAO HÀNG', {
      partner: '',
      fee: '0',
      tracking: '',
    });

  const deliveryStatus = (target) => {
    if (!activeDelivery) return;

    open(
      'deliveryStatus',
      target === 'GIAO_THANH_CONG' ? 'XÁC NHẬN KHÁCH ĐÃ NHẬN HÀNG' : 'XÁC NHẬN ĐANG GIAO',
      {
        deliveryId: activeDelivery.id,
        target,
        cod: Number(activeDelivery.tien_thu_ho_cod || 0),
        codConfirmed: false,
      }
    );
  };

  const paymentContext = paymentSource(order);

  const waitingCod = isWaitingCodSettlement(order);

  const canPay = paymentContext?.nguon_thu === 'KHACH_HANG';

  const canCollectCod = (delivery) =>
    paymentContext?.nguon_thu === 'DOI_TAC_GIAO_HANG' &&
    Number(paymentContext.phieu_giao_hang_id) === Number(delivery.id);

  const payment = (delivery = null) => {
    const scope = delivery ? `order:${order.id}:cod:${delivery.id}` : `order:${order.id}:payment`;

    const pending = cashAttempt.current;

    if (pending && pending.scope !== scope) {
      setState((current) => ({
        ...current,
        error: 'Hãy hoàn tất thao tác tiền đang chờ kết quả trước.',
      }));
      return;
    }

    const previous = pending?.body;

    open('payment', delivery ? 'GHI NHẬN ĐỐI TÁC NỘP COD' : 'XÁC NHẬN NHẬN TIỀN KHÁCH HÀNG', {
      scope,
      source: delivery ? 'DOI_TAC_GIAO_HANG' : 'KHACH_HANG',
      deliveryId: delivery?.id || null,
      amount:
        previous?.so_tien_thanh_toan ??
        (delivery ? delivery.tien_thu_ho_cod : paymentContext?.so_tien_con_phai_thu),

      maxAmount: Number(delivery ? delivery.tien_thu_ho_cod : paymentContext?.so_tien_con_phai_thu),
      method:
        previous?.phuong_thuc_thanh_toan ||
        (delivery
          ? 'CHUYEN_KHOAN'
          : ['TIEN_MAT', 'CHUYEN_KHOAN', 'THE'].includes(order.phuong_thuc_thanh_toan)
            ? order.phuong_thuc_thanh_toan
            : 'CHUYEN_KHOAN'),
      occurredAt: previous ? inputFromApiTime(previous.ngay_thanh_toan) : nowLocalInput(),
      transaction: previous?.ma_giao_dich_thanh_toan || '',
      confirmed: Boolean(previous?.xac_nhan_da_nhan_tien),
    });
  };

  const refund = () => {
    const scope = `order:${order.id}:refund`;
    const pending = cashAttempt.current;

    if (pending && pending.scope !== scope) {
      setState((current) => ({
        ...current,
        error: 'Hãy hoàn tất thao tác tiền đang chờ kết quả trước.',
      }));
      return;
    }

    const previous = pending?.body;

    open('refund', 'GHI NHẬN ĐÃ HOÀN TIỀN', {
      scope,
      method: previous?.phuong_thuc_hoan || 'CHUYEN_KHOAN',
      occurredAt: previous ? inputFromApiTime(previous.ngay_hoan_tien) : nowLocalInput(),
      transaction: previous?.ma_giao_dich || '',
      confirmed: Boolean(previous?.xac_nhan_da_hoan_tien),
    });
  };

  const submitAction = () => {
    if (orderAttempt.current) {
      return retryOrderOperation();
    }

    if (!dialog?.confirmed) return;

    run(() => {
      const { type, method, transaction } = dialog;

      if (type === 'payment') {
        const body = {
          nguon_thu: dialog.source,
          phuong_thuc_thanh_toan: method,
          so_tien_thanh_toan: Number(dialog.amount),
          ngay_thanh_toan: toApiDateTime(dialog.occurredAt),
          ma_giao_dich_thanh_toan: method === 'TIEN_MAT' ? null : transaction.trim(),
          xac_nhan_da_nhan_tien: true,
          ...(dialog.deliveryId
            ? {
                phieu_giao_hang_id: Number(dialog.deliveryId),
              }
            : {}),
        };

        return withIdempotency(cashAttempt, dialog.scope, body, (key, payload) =>
          confirmOrderPayment(order.id, key, payload)
        ).then((updatedOrder) => {
          setOrder((current) => ({
            ...current,
            ...updatedOrder,
          }));

          return updatedOrder;
        });
      }

      if (type === 'refund') {
        const body = {
          xac_nhan_da_hoan_tien: true,
          phuong_thuc_hoan: method,
          ngay_hoan_tien: toApiDateTime(dialog.occurredAt),
          ma_giao_dich: method === 'TIEN_MAT' ? null : transaction.trim(),
        };

        return withIdempotency(cashAttempt, dialog.scope, body, (key, payload) =>
          refundOrder(order.id, key, payload)
        );
      }

      if (type === 'completeCounterInspection') {
        return sendOrderOperation('completeCounterInspection', {
          xac_nhan: true,
        });
      }

      if (type === 'counterExchange') {
        return sendOrderOperation('counterExchange', {
          thiet_bi_id: Number(dialog.deviceId),
          so_serial_moi: dialog.serialManaged ? dialog.newSerial.trim() : null,
          dau_hieu_nhan_dang_moi: dialog.serialManaged ? null : dialog.newIdentification.trim(),
          ly_do: dialog.reason.trim(),
          ten_nguoi_lien_he: dialog.contactName.trim(),
          sdt_nguoi_lien_he: dialog.contactPhone.trim(),
          xac_nhan: true,
        });
      }

      if (type === 'approve') {
        return approveOrder(order.id);
      }

      if (type === 'pickup') {
        return sendOrderOperation('pickup', {
          xac_nhan_da_nhan_hang: true,
        });
      }

      if (type === 'packed' || type === 'cancelPacking') {
        return setPackingStatus(order.id, type === 'packed' ? 'DA_DONG_GOI' : 'HUY_DONG_GOI');
      }

      if (type === 'fulfillment') {
        return sendOrderOperation('fulfillment', {
          xac_nhan: true,
        });
      }

      if (type === 'startDelivery') {
        const partnerId = Number(dialog.partner);
        const fee = Number(dialog.fee);

        if (!Number.isSafeInteger(partnerId) || partnerId <= 0) {
          throw new Error('Vui lòng chọn đối tác giao hàng.');
        }

        if (dialog.fee === '' || !Number.isFinite(fee) || fee < 0) {
          throw new Error('Phí trả đối tác không hợp lệ.');
        }

        return startOrderDelivery(order.id, partnerId, fee, dialog.tracking || '');
      }

      if (type === 'deliveryStatus') {
        const requiresCod = dialog.target === 'GIAO_THANH_CONG' && Number(dialog.cod) > 0;

        if (requiresCod && !dialog.codConfirmed) {
          throw new Error('Phải xác nhận người giao đã thu đủ COD từ khách.');
        }

        return sendOrderOperation('deliveryStatus', {
          deliveryId: dialog.deliveryId,

          request: {
            trang_thai_giao_hang: dialog.target,

            ...(requiresCod
              ? {
                  xac_nhan_da_thu_cod: true,
                }
              : {}),
          },
        });
      }

      throw new Error('Thao tác không hợp lệ.');
    });
  };

  const waitingRows = Array.isArray(order.giu_hang_cho_hang) ? order.giu_hang_cho_hang : [];

  const waitingHasReceivedMoney =
    ['THANH_TOAN_MOT_PHAN', 'DA_THANH_TOAN'].includes(order.trang_thai_thanh_toan) &&
    order.doi_soat_thanh_toan?.co_du_can_cu === true &&
    Number(order.doi_soat_thanh_toan?.so_tien_thuc_thu) > 0 &&
    Number(order.doi_soat_thanh_toan?.so_tien_da_hoan) === 0;

  const waitingFullyReserved =
    waitingRows.length > 0 &&
    waitingRows.every((item) => Number(item.so_luong_da_giu) === Number(item.so_luong_can));

  const counterDevices = Array.isArray(order.thiet_bi_hien_hanh) ? order.thiet_bi_hien_hanh : [];

  const counterInspectionClosed =
    Array.isArray(order.thiet_bi_da_ban) &&
    order.thiet_bi_da_ban.some((device) => device.kiem_tra_tai_quay_da_ket_thuc === true);

  const canCounterExchange =
    !counterInspectionClosed &&
    (order.loai_don_hang === 'TAI_QUAY' ||
      (order.loai_don_hang === 'ONLINE' && order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG')) &&
    order.trang_thai_don_hang === 'HOAN_THANH' &&
    order.trang_thai_thanh_toan === 'DA_THANH_TOAN' &&
    order.trang_thai_dong_goi === 'DA_DONG_GOI' &&
    order.trang_thai_xuat_kho === 'DA_XUAT_KHO' &&
    Boolean(order.ngay_hoan_thanh) &&
    order.can_xac_minh_lich_su !== true;

  const reservationExpired =
    order.da_giu_hang === true &&
    Boolean(order.han_giu_hang) &&
    new Date(order.han_giu_hang).getTime() <= Date.now();

  const paidWaitingApproval =
    order.loai_don_hang === 'ONLINE' &&
    order.trang_thai_don_hang === 'CHO_DUYET' &&
    order.trang_thai_thanh_toan === 'DA_THANH_TOAN';

  const beforeExport =
    order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' && order.trang_thai_don_hang !== 'HUY_HANG';

  const canCancelBeforeHandover =
    order.loai_don_hang === 'ONLINE' &&
    order.trang_thai_don_hang === 'CHO_LAY_HANG' &&
    order.trang_thai_dong_goi === 'DA_DONG_GOI' &&
    order.trang_thai_xuat_kho === 'DA_XUAT_KHO' &&
    !order.ngay_hoan_thanh &&
    deliveries.every((item) => ['CHO_GIAO', 'HUY_GIAO_HANG'].includes(item.trang_thai_giao_hang));

  return (
    <section className="admin-order-detail" aria-busy={state.busy}>
      <header className="order-detail-hero">
        <div>
          <nav aria-label="Breadcrumb nội dung">
            <span>ĐƠN HÀNG</span>
            <span>›</span>
            <span>DANH SÁCH ĐƠN HÀNG</span>
            <span>›</span>
            <strong>{order.ma_don_hang}</strong>
          </nav>

          <div className="order-detail-heading">
            <h1>{order.ma_don_hang}</h1>
            <OrderStateBadge value={order.loai_don_hang} />
          </div>

          <p>{dateTime(order.ngay_tao)}</p>

          <p className="order-receive-method">
            {order.loai_don_hang === 'TAI_QUAY'
              ? 'BÁN TẠI QUẦY'
              : isShipping
                ? 'GIAO ĐẾN ĐỊA CHỈ KHÁCH HÀNG'
                : isPickup
                  ? 'KHÁCH NHẬN TẠI CỬA HÀNG'
                  : 'CHƯA XÁC ĐỊNH HÌNH THỨC NHẬN'}
          </p>

          <div className="order-detail-statuses">
            <OrderStateBadge value={orderDisplayStatus(order)} />
            <OrderStateBadge value={order.trang_thai_thanh_toan} />
            <OrderStateBadge value={order.trang_thai_dong_goi} />
            <OrderStateBadge value={order.trang_thai_xuat_kho} />
          </div>
        </div>
        <div className="order-detail-hero__actions">
          {canEditOnlineOrder(order) && (
            <Action
              disabled={state.busy || reservationExpired}
              click={() => navigate(`/admin/don-hang/dat-hang-online/${order.id}`)}
            >
              SỬA ĐƠN HÀNG
            </Action>
          )}

          {openOnlineOrder &&
            isShipping &&
            (!activeDelivery || activeDelivery.trang_thai_giao_hang === 'CHO_GIAO') && (
              <div className="order-handover-action">
                <Action disabled={state.busy || !canStartDelivery} click={beginDelivery}>
                  BẮT ĐẦU GIAO HÀNG
                </Action>

                {!canStartDelivery && (
                  <small className="order-handover-warning" role="status">
                    {startDeliveryReasons.join(' ')}
                  </small>
                )}
              </div>
            )}

          {order.loai_don_hang === 'ONLINE' &&
            ['CHO_DUYET', 'CHO_HANG'].includes(order.trang_thai_don_hang) &&
            ['CHUA_THANH_TOAN', 'THANH_TOAN_MOT_PHAN', 'DA_THANH_TOAN'].includes(
              order.trang_thai_thanh_toan
            ) && (
              <Action disabled={state.busy || reservationExpired} click={approve}>
                DUYỆT ĐƠN
              </Action>
            )}

          {openOnlineOrder && isPickup && (
            <div className="order-handover-action">
              <Action
                disabled={state.busy || !canConfirmPickup}
                click={() => open('pickup', 'XÁC NHẬN KHÁCH ĐÃ NHẬN TẠI CỬA HÀNG')}
              >
                XÁC NHẬN KHÁCH ĐÃ NHẬN
              </Action>
              {!canConfirmPickup && (
                <small className="order-handover-warning" role="status">
                  {pickupReasons.join(' ')}
                </small>
              )}{' '}
            </div>
          )}

          {openOnlineOrder &&
            isShipping &&
            activeDelivery?.trang_thai_giao_hang === 'DA_NHAN_HANG' && (
              <Action disabled={state.busy} click={() => deliveryStatus('DANG_GIAO')}>
                XÁC NHẬN ĐANG GIAO
              </Action>
            )}

          {openOnlineOrder &&
            isShipping &&
            activeDelivery?.trang_thai_giao_hang === 'DANG_GIAO' && (
              <Action disabled={state.busy} click={() => deliveryStatus('GIAO_THANH_CONG')}>
                KHÁCH ĐÃ NHẬN HÀNG
              </Action>
            )}

          {beforeExport &&
            order.loai_don_hang === 'ONLINE' &&
            ['CHO_DUYET', 'CHO_HANG', 'CHO_THANH_TOAN', 'CHO_DONG_GOI'].includes(
              order.trang_thai_don_hang
            ) && (
              <Action
                danger
                disabled={state.busy}
                click={() => {
                  setState((s) => ({ ...s, error: '' }));
                  setIsCancelOpen(true);
                }}
              >
                HỦY ĐƠN HÀNG
              </Action>
            )}

          {canCancelBeforeHandover ? (
            <Action
              danger
              disabled={state.busy || Boolean(orderAttempt.current)}
              click={() => open('cancelBeforeHandover', 'HỦY ĐƠN VÀ NHẬN LẠI HÀNG')}
            >
              HỦY ĐƠN VÀ NHẬN LẠI HÀNG
            </Action>
          ) : (
            order.loai_don_hang === 'ONLINE' &&
            order.trang_thai_xuat_kho === 'DA_XUAT_KHO' &&
            ['CHO_DONG_GOI', 'CHO_LAY_HANG', 'DANG_GIAO_HANG'].includes(
              order.trang_thai_don_hang
            ) && (
              <button className="order-action order-action--back" type="button" disabled>
                ĐƠN ĐÃ XUẤT KHO - KHÔNG THỂ HỦY TRỰC TIẾP
              </button>
            )
          )}

          <button
            type="button"
            className="order-action order-action--back"
            onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}
          >
            <HiOutlineArrowLeft size={14} /> QUAY LẠI DANH SÁCH
          </button>
        </div>
      </header>

      {order.loai_don_hang === 'ONLINE' &&
        order.trang_thai_don_hang === 'CHO_DUYET' &&
        order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN' &&
        order.da_giu_hang === true &&
        order.han_giu_hang && (
          <div className="order-cod-settlement" role="status">
            <strong>{reservationExpired ? 'ĐÃ HẾT THỜI HẠN GIỮ HÀNG' : 'THỜI HẠN GIỮ HÀNG'}</strong>

            <p>Giữ hàng đến: {dateTime(order.han_giu_hang)}.</p>

            {reservationExpired && (
              <p>Đơn đang chờ hệ thống kiểm tra chứng từ tiền và xử lý phần giữ hàng hết hạn.</p>
            )}
          </div>
        )}

      {paidWaitingApproval && (
        <div className="order-cod-settlement" role="status">
          <strong>ĐÃ GHI NHẬN THANH TOÁN — CHỜ DUYỆT</strong>

          <p>
            Hệ thống sẽ duyệt khi kiểm tra được đầy đủ chứng từ và giữ đủ hàng để thực hiện đơn.
          </p>
        </div>
      )}

      {order.loai_don_hang === 'ONLINE' && order.trang_thai_don_hang === 'CHO_HANG' && (
        <div className="order-cod-settlement" role="status">
          <strong>THEO DÕI HÀNG CỦA ĐƠN CHỜ HÀNG</strong>

          {waitingHasReceivedMoney ? (
            waitingFullyReserved ? (
              <p>
                Đã giữ đủ hàng cho đơn. Nhân viên chọn DUYỆT ĐƠN để xác nhận thực hiện đơn hàng.
              </p>
            ) : (
              <p>
                Đơn đã nhận tiền. Hệ thống tự giữ số hàng đang có và tự giữ bổ sung khi hàng về. Đơn
                tiếp tục ở trạng thái CHỜ HÀNG cho đến khi nhân viên duyệt.
              </p>
            )
          ) : order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN' ? (
            <p>
              Đơn chưa nhận tiền nên chưa tự giữ hàng. Sau khi ghi nhận thực nhận tiền cọc hoặc
              thanh toán, hệ thống sẽ tự kiểm tra và giữ hàng cho đơn.
            </p>
          ) : (
            <p>Chứng từ tiền cần được đối soát trước khi hệ thống tự giữ hàng cho đơn.</p>
          )}

          {waitingRows.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="order-waiting-stock-table">
                <thead>
                  <tr>
                    <th>Sản phẩm / linh kiện</th>
                    <th>Cần</th>
                    <th>Đã giữ</th>
                    <th>Có thể bán</th>
                    <th>Chưa giữ</th>
                    <th>Cần nhập thêm</th>
                  </tr>
                </thead>

                <tbody>
                  {waitingRows.map((item) => (
                    <tr key={item.phien_ban_id}>
                      <td>
                        {item.ten_san_pham} · {item.ten_phien_ban}
                      </td>
                      <td>{item.so_luong_can ?? 0}</td>
                      <td>{item.so_luong_da_giu ?? 0}</td>
                      <td>{item.ton_co_the_ban ?? 0}</td>
                      <td>{item.so_luong_con_can_giu ?? 0}</td>
                      <td>{item.so_luong_thieu ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Chưa tải được thông tin giữ hàng của đơn.</p>
          )}

          <p>Số liệu tự cập nhật định kỳ. Khi đủ hàng, chọn DUYỆT ĐƠN để xác nhận thực hiện đơn.</p>
        </div>
      )}

      <OrderRefundPanel
        order={order}
        busy={state.busy || Boolean(orderAttempt.current) || Boolean(cashAttempt.current)}
        perform={run}
        revision={refundRevision}
      />

      {waitingCod && (
        <div className="order-cod-settlement" role="status">
          <strong>ĐÃ GIAO HÀNG — CHỜ ĐỐI TÁC NỘP COD</strong>

          <p>
            Khách đã nhận hàng và thanh toán COD cho đối tác. Cửa hàng chưa ghi nhận thực nhận khoản
            tiền này nên đơn chưa hoàn thành.
          </p>

          <p>Chỉ bấm “GHI NHẬN ĐỐI TÁC NỘP COD” trong mục GIAO VẬN khi cửa hàng đã nhận đủ tiền.</p>
        </div>
      )}

      {state.error && (
        <p className="order-api-message order-api-message--error" role="alert">
          {state.error}
        </p>
      )}

      {orderAttempt.current && (
        <div className="order-pending-operation" role="status">
          <div>
            <strong>YÊU CẦU ĐANG CHỜ XÁC ĐỊNH KẾT QUẢ</strong>

            <p>Dữ liệu gửi được giữ nguyên. Bấm thử lại để gửi cùng mã yêu cầu.</p>
          </div>

          <button type="button" disabled={state.busy} onClick={retryOrderOperation}>
            THỬ LẠI YÊU CẦU CŨ
          </button>
        </div>
      )}

      <div className="order-detail-content">
        <div className="order-detail-main">
          <Panel title="SẢN PHẨM TRONG ĐƠN">
            <div className="order-products-table-wrap">
              <table className="order-products-table">
                <thead>
                  <tr>
                    <th>ẢNH</th>
                    <th>SẢN PHẨM / PHIÊN BẢN</th>
                    <th>MÃ VẠCH</th>
                    <th>ĐƠN GIÁ</th>
                    <th>SL</th>
                    <th>THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody>
                  {products.visibleItems.map((item) => (
                    <tr key={item.chi_tiet_don_hang_id}>
                      <td>
                        <OrderProductImage item={item} />
                      </td>
                      <td>
                        <strong>{item.ten_san_pham || `Phiên bản #${item.phien_ban_id}`}</strong>

                        <OrderLineNotice item={item} />
                        <span>
                          {item.loai_san_pham === 'BO_PC' ? 'Bộ PC' : item.ten_phien_ban || '—'}
                        </span>

                        {item.loai_san_pham === 'BO_PC' && (
                          <ComboContents items={item.thanh_phan || []} order compact />
                        )}
                      </td>
                      <td>—</td>
                      <td className="align-right">{money(item.don_gia)}</td>
                      <td className="align-center">{item.so_luong}</td>
                      <td className="align-right">
                        <OrderLineAmount item={item} />{' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DetailTablePagination
              totalItems={(order.san_pham || []).length}
              currentPage={products.currentPage}
              onPageChange={products.onPageChange}
              idPrefix="order-products"
            />
          </Panel>

          <Panel title="THIẾT BỊ VÀ BẢO HÀNH">
            <p>Thiết bị của lần xuất gốc:</p>
            <SoldDevices order={order} />

            <DeviceExchangeHistory order={order} />

            {counterInspectionClosed && (
              <p className="order-note">
                Đã kết thúc kiểm tra tại quầy. Lỗi phát sinh tiếp theo xử lý qua bảo hành.
              </p>
            )}

            {canCounterExchange && counterDevices.length > 0 && (
              <div className="order-panel-actions">
                <Action
                  secondary
                  disabled={
                    state.busy || Boolean(orderAttempt.current) || Boolean(cashAttempt.current)
                  }
                  click={() => open('completeCounterInspection', 'KẾT THÚC KIỂM TRA TẠI QUẦY')}
                >
                  KẾT THÚC KIỂM TRA TẠI QUẦY
                </Action>
              </div>
            )}

            {counterDevices.length > 0 && (
              <>
                <h3>THIẾT BỊ HIỆN HÀNH</h3>

                <div className="sold-devices-scroll">
                  <table className="sold-devices-table">
                    <thead>
                      <tr>
                        <th>Mã theo dõi</th>
                        <th>Serial / nhận dạng</th>
                        <th>Số lần đã đổi</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {counterDevices.map((device) => {
                        const count = Array.isArray(device.chuoi_thay_the)
                          ? device.chuoi_thay_the.length
                          : 0;

                        return (
                          <tr key={device.thiet_bi_id}>
                            <td>{device.ma_theo_doi}</td>

                            <td>
                              {device.so_serial ||
                                device.dau_hieu_nhan_dang ||
                                'Không quản lý serial'}
                            </td>

                            <td>{count}</td>

                            <td>
                              {canCounterExchange ? (
                                <Action
                                  disabled={
                                    state.busy ||
                                    Boolean(orderAttempt.current) ||
                                    Boolean(cashAttempt.current)
                                  }
                                  click={() => openCounterExchange(device)}
                                >
                                  {count > 0 ? 'GHI NHẬN LỖI VÀ ĐỔI TIẾP' : 'ĐỔI 1-1 LỖI TẠI QUẦY'}
                                </Action>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>

          <Panel title="THANH TOÁN">
            <dl className="order-detail-kv">
              <Info text="PHƯƠNG THỨC">{label(order.phuong_thuc_thanh_toan)}</Info>

              <Info text="TRẠNG THÁI">
                <OrderStateBadge value={order.trang_thai_thanh_toan} />
              </Info>

              <Info text="MÃ GIAO DỊCH GẦN NHẤT">{order.ma_giao_dich_thanh_toan || '—'}</Info>

              {order.loai_don_hang === 'ONLINE' && (
                <>
                  <Info text="ĐÃ THỰC THU">
                    {money(order.doi_soat_thanh_toan?.so_tien_thuc_thu)}
                  </Info>

                  <Info text={waitingCod ? 'CHỜ ĐỐI TÁC NỘP COD' : 'CÒN PHẢI THU'}>
                    {money(order.doi_soat_thanh_toan?.so_tien_con_phai_thu)}
                  </Info>

                  <Info text="ĐÃ HOÀN THEO ĐƠN HỦY">
                    {money(order.doi_soat_thanh_toan?.so_tien_da_hoan)}
                  </Info>
                </>
              )}
            </dl>

            {order.loai_don_hang === 'ONLINE' &&
              order.doi_soat_thanh_toan?.co_du_can_cu !== true && (
                <p role="status">Chưa đủ căn cứ đối soát các khoản thu của đơn.</p>
              )}

            {order.doi_soat_thanh_toan?.co_du_can_cu === true &&
              order.doi_soat_thanh_toan.phieu_thu?.length > 0 && (
                <details>
                  <summary>Lịch sử thu tiền ({order.doi_soat_thanh_toan.phieu_thu.length})</summary>

                  <ul>
                    {order.doi_soat_thanh_toan.phieu_thu.map((receipt) => (
                      <li key={receipt.id}>
                        <strong>{receipt.ma_phieu}</strong>
                        {' · '}
                        {money(receipt.so_tien)}
                        {' · '}
                        {label(receipt.phuong_thuc_thanh_toan)}
                        {' · '}
                        {dateTime(receipt.ngay_ghi_nhan)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

            {canPay && (
              <div className="order-panel-actions">
                <Action disabled={state.busy} click={() => payment()}>
                  {order.trang_thai_don_hang === 'HUY_HANG'
                    ? 'GHI NHẬN TIỀN ĐẾN MUỘN'
                    : 'GHI NHẬN THU TIỀN'}
                </Action>
              </div>
            )}
          </Panel>

          <Panel title="ĐÓNG GÓI VÀ XUẤT KHO">
            <div className="order-fulfillment-grid">
              <div>
                <span>ĐÓNG GÓI</span>
                <OrderStateBadge value={order.trang_thai_dong_goi} />
              </div>
              <div>
                <span>XUẤT KHO</span>
                <OrderStateBadge value={order.trang_thai_xuat_kho} />
              </div>
            </div>
            {beforeExport &&
              order.loai_don_hang === 'ONLINE' &&
              order.trang_thai_don_hang === 'CHO_DONG_GOI' &&
              ['CHUA_DONG_GOI', 'HUY_DONG_GOI'].includes(order.trang_thai_dong_goi) && (
                <div className="order-panel-actions">
                  <Action disabled={state.busy} click={fulfillment}>
                    BẮT ĐẦU ĐÓNG GÓI
                  </Action>
                </div>
              )}
            {beforeExport && order.trang_thai_dong_goi === 'DANG_DONG_GOI' && (
              <div className="order-panel-actions">
                {orderNeedsSerial && (
                  <Action disabled={state.busy} click={packingSerials}>
                    CHỌN / ĐỔI SERIAL ĐÓNG GÓI
                  </Action>
                )}

                <Action disabled={state.busy} click={() => open('packed', 'HOÀN TẤT ĐÓNG GÓI')}>
                  HOÀN TẤT ĐÓNG GÓI
                </Action>

                <Action
                  secondary
                  disabled={state.busy}
                  click={() => open('cancelPacking', 'HỦY ĐÓNG GÓI')}
                >
                  HỦY ĐÓNG GÓI
                </Action>
              </div>
            )}
            {beforeExport && order.trang_thai_dong_goi === 'DA_DONG_GOI' && (
              <div className="order-panel-actions">
                <Action disabled={state.busy} click={warehouseExport}>
                  CHUẨN BỊ XUẤT KHO
                </Action>

                <Action
                  secondary
                  disabled={state.busy}
                  click={() => open('cancelPacking', 'HỦY ĐÓNG GÓI')}
                >
                  HỦY ĐÓNG GÓI
                </Action>
              </div>
            )}
          </Panel>
          <Panel title="GIAO VẬN">
            {deliveries.length ? (
              deliveries.map((item) => (
                <div key={item.id}>
                  <dl className="order-detail-kv">
                    {deliveries.length > 1 && (
                      <Info text="MÃ PHIẾU">
                        <button
                          type="button"
                          className="order-shipment-link"
                          onClick={() => navigate(`/admin/don-hang/quan-ly-giao-hang/${item.id}`)}
                        >
                          {item.ma_phieu_giao_hang || `Phiếu #${item.id}`}
                        </button>
                      </Info>
                    )}

                    <Info text="ĐƠN VỊ VẬN CHUYỂN">
                      {item.ten_doi_tac_van_chuyen ||
                        options.partners.find(
                          (partner) => partner.id === item.doi_tac_van_chuyen_id
                        )?.ten_doi_tac ||
                        '—'}
                    </Info>

                    <Info text="MÃ VẬN ĐƠN">
                      <span className={item.ma_van_don ? '' : 'order-alert-text'}>
                        {item.ma_van_don || 'CHƯA CÓ MÃ VẬN ĐƠN'}
                      </span>
                    </Info>

                    <Info text="TRẠNG THÁI">{label(item.trang_thai_giao_hang)}</Info>

                    <Info text="PHÍ GIAO HÀNG">{money(order.phi_giao_hang)}</Info>
                  </dl>

                  {canCollectCod(item) && (
                    <div className="order-panel-actions">
                      <Action disabled={state.busy} click={() => payment(item)}>
                        GHI NHẬN ĐỐI TÁC NỘP COD
                      </Action>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <dl className="order-detail-kv">
                <Info text="ĐƠN VỊ VẬN CHUYỂN">—</Info>
                <Info text="MÃ VẬN ĐƠN">—</Info>
                <Info text="PHÍ GIAO HÀNG">{money(order.phi_giao_hang)}</Info>
              </dl>
            )}
          </Panel>
          <Panel title="LỊCH SỬ XỬ LÝ">
            {history.length ? (
              <ol className="order-timeline">
                {history.map((event) => (
                  <li className="order-timeline__item" key={event.id}>
                    <time dateTime={event.ngay_thuc_hien}>
                      {dateTime(event.ngay_thuc_hien, 'medium')}
                    </time>
                    <strong>{event.mo_ta}</strong>
                    <p>{event.nguoi_thuc_hien}</p>

                    <div className="order-detail-statuses">
                      <OrderStateBadge value={event.trang_thai_don_hang} />

                      <OrderStateBadge value={event.trang_thai_dong_goi} />

                      <OrderStateBadge value={event.trang_thai_xuat_kho} />

                      {event.trang_thai_giao_hang && (
                        <span className="order-history-delivery">
                          <span className="order-history-delivery__label">Giao hàng</span>

                          <OrderStateBadge value={event.trang_thai_giao_hang} />
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="order-note">Chưa có lịch sử xử lý được ghi nhận.</p>
            )}
          </Panel>
        </div>
        <aside className="order-detail-sidebar">
          <Panel title="KHÁCH HÀNG">
            <dl className="order-sidebar-kv">
              <Info text="HỌ TÊN">{order.ten_khach_hang || '—'}</Info>
              <Info text="SỐ ĐIỆN THOẠI">{order.so_dien_thoai_khach_hang || '—'}</Info>
            </dl>
          </Panel>
          <Panel title="NGƯỜI NHẬN">
            <dl className="order-sidebar-kv">
              <Info text="TÊN NGƯỜI NHẬN">{order.ten_nguoi_nhan || '—'}</Info>
              <Info text="SỐ ĐIỆN THOẠI">{order.sdt_nguoi_nhan || '—'}</Info>
              <Info text="ĐỊA CHỈ GIAO HÀNG">{order.dia_chi_giao_hang || '—'}</Info>
            </dl>
          </Panel>
          <Panel title="TỔNG KẾT">
            <dl className="order-summary">
              <Info text="TIỀN HÀNG">{money(order.tong_tien_hang)}</Info>
              <Info text="CHIẾT KHẤU">
                {order.tien_chiet_khau == null || Number(order.tien_chiet_khau) === 0
                  ? '—'
                  : money(order.tien_chiet_khau)}
              </Info>

              <Info text="VAT">
                {order.tong_tien_vat == null ? '—' : money(order.tong_tien_vat)}
              </Info>

              <Info text="PHÍ GIAO HÀNG">{money(order.phi_giao_hang)}</Info>
              <div className="order-summary-total">
                <dt>KHÁCH PHẢI TRẢ</dt>
                <dd>{money(order.tong_thanh_toan)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="KHUYẾN MẠI / ƯU ĐÃI">
            <OrderPromotionSummary order={order} showUsage />
          </Panel>
          <Panel title="GHI CHÚ">
            <p className="order-note">{order.ghi_chu || 'Không có ghi chú.'}</p>
          </Panel>
        </aside>
      </div>
      {isCancelOpen && (
        <div
          className="order-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCancelOpen(false);
          }}
        >
          <section
            className="order-cancel-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <header>
              <h2 id="cancel-order-title">HỦY ĐƠN HÀNG</h2>
            </header>
            <div className="order-cancel-modal__body">
              <label htmlFor="cancel-reason">LÝ DO HỦY</label>
              <textarea
                id="cancel-reason"
                required
                maxLength={255}
                disabled={state.busy || Boolean(orderAttempt.current)}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Nhập lý do hủy đơn..."
                autoFocus
              />
            </div>
            {state.error && (
              <p className="order-api-message order-api-message--error" role="alert">
                {state.error}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="order-action order-action--back"
                disabled={state.busy}
                onClick={() => setIsCancelOpen(false)}
              >
                QUAY LẠI
              </button>
              <button
                type="button"
                className="order-action order-action--confirm-cancel"
                disabled={state.busy || !cancelReason.trim()}
                onClick={cancel}
              >
                XÁC NHẬN HỦY ĐƠN
              </button>
            </footer>
          </section>
        </div>
      )}

      {dialog?.type === 'cancelBeforeHandover' ? (
        <ShipmentReturnDialog
          delivery={{ id: order.id }}
          beforeHandover
          requirementsUrl={
            `/api/v1/admin/orders/${encodeURIComponent(order.id)}` +
            '/pre-handover-return-requirements'
          }
          busy={state.busy}
          error={state.error}
          close={() => {
            if (!state.busy && !orderAttempt.current) {
              setDialog(null);
            }
          }}
          submit={(_method, _suffix, body) => {
            if (orderAttempt.current) {
              return retryOrderOperation();
            }

            return run(() => sendOrderOperation('cancelBeforeHandover', body));
          }}
        />
      ) : dialog?.type === 'packingSerials' ? (
        <ExportOrderDialog
          mode="packing"
          order={order}
          dialog={dialog}
          setDialog={setDialog}
          warehouses={options.warehouses}
          busy={state.busy}
          error={state.error}
          submit={(body) => {
            if (orderAttempt.current) {
              return retryOrderOperation();
            }

            return run(() => sendOrderOperation('packingSerials', body));
          }}
        />
      ) : dialog?.type === 'export' ? (
        <OrderModal
          title="XÁC NHẬN XUẤT KHO"
          subtitle="XUẤT THEO PHÂN BỔ ĐÃ CHỐT KHI ĐÓNG GÓI"
          className="order-export-modal"
          showClose
          cancelLabel="HỦY"
          confirmLabel="XÁC NHẬN XUẤT KHO"
          close={() => setDialog(null)}
          busy={state.busy}
          error={state.error}
          disabled={!dialog.confirmed || !dialog.exportBody}
          submit={() => {
            if (orderAttempt.current) {
              return retryOrderOperation();
            }

            return run(() => sendOrderOperation('export', dialog.exportBody));
          }}
        >
          <p>
            Đơn hàng: <strong>{order.ma_don_hang}</strong>
          </p>

          <p>
            Số dòng hàng: <strong>{dialog.exportBody.items.length}</strong>
          </p>

          {dialog.serialCount > 0 && (
            <p>
              Số serial đã chốt: <strong>{dialog.serialCount}</strong>
            </p>
          )}

          <p>Hệ thống sử dụng phân bổ đã lưu khi đóng gói để xuất kho.</p>

          <label className="order-operation-confirm">
            <input
              type="checkbox"
              disabled={state.busy}
              checked={Boolean(dialog.confirmed)}
              onChange={(event) => {
                const checked = event.target.checked;

                setDialog((current) => ({
                  ...current,
                  confirmed: checked,
                }));
              }}
            />

            <span>Xác nhận xuất kho đơn hàng này.</span>
          </label>
        </OrderModal>
      ) : (
        dialog && (
          <OrderActionDialog
            dialog={dialog}
            setDialog={setDialog}
            order={order}
            options={options}
            busy={state.busy}
            error={state.error}
            submit={submitAction}
          />
        )
      )}
    </section>
  );
}

function DeviceExchangeHistory({ order }) {
  const roots = (Array.isArray(order.thiet_bi_da_ban) ? order.thiet_bi_da_ban : []).filter(
    (device) => Array.isArray(device.chuoi_thay_the) && device.chuoi_thay_the.length
  );

  const identity = (device) => (
    <>
      <strong>{device?.so_serial || device?.dau_hieu_nhan_dang || 'Không quản lý serial'}</strong>
      <small>{device?.ma_theo_doi || '—'}</small>
    </>
  );

  return (
    <div>
      {order.can_xac_minh_lich_su === true && (
        <p role="alert" className="order-alert-text">
          Lịch sử thiết bị cần đối soát. Chỉ hiển thị các chuỗi đã xác minh được.
        </p>
      )}

      {roots.map((root) => (
        <div key={root.thiet_bi_id}>
          <h3>LỊCH SỬ ĐỔI — {root.so_serial || root.ma_theo_doi}</h3>

          <div className="sold-devices-scroll">
            <table className="sold-devices-table">
              <thead>
                <tr>
                  <th>Lần</th>
                  <th>Thiết bị được nhận lại</th>
                  <th>Thiết bị thay thế</th>
                  <th>Phiếu xử lý</th>
                  <th>Bàn giao / nhân viên</th>
                  <th>Lý do</th>
                </tr>
              </thead>

              <tbody>
                {root.chuoi_thay_the.map((edge, index) => {
                  const isCurrent =
                    root.thiet_bi_hien_hanh_id != null &&
                    String(edge.thiet_bi_moi_id) === String(root.thiet_bi_hien_hanh_id);

                  const isLast = index === root.chuoi_thay_the.length - 1;

                  const status = isCurrent
                    ? 'Thiết bị hiện hành'
                    : isLast && root.thiet_bi_cuoi_chuoi_da_tra === true
                      ? 'Đã nhận trả'
                      : isLast
                        ? 'Cần xác minh quyền hiện hành'
                        : 'Đã thay thế ở lần tiếp theo';

                  return (
                    <tr key={edge.phieu_bao_hanh_id}>
                      <td>{edge.lan_doi}</td>

                      <td>{identity(edge.thiet_bi_cu)}</td>

                      <td>
                        {identity(edge.thiet_bi_moi)}
                        <small>{status}</small>
                      </td>

                      <td>{edge.ma_phieu_bao_hanh || '#' + edge.phieu_bao_hanh_id}</td>

                      <td>
                        {edge.ngay_ban_giao
                          ? dateTime(edge.ngay_ban_giao)
                          : 'Chưa ghi nhận thời điểm'}

                        <small>{edge.nguoi_thuc_hien || 'Chưa ghi nhận nhân viên'}</small>
                      </td>

                      <td>{edge.ly_do || 'Chưa ghi nhận lý do'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function Action({ children, click, danger = false, secondary = false, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`order-action ${danger ? 'order-action--danger' : secondary ? 'order-action--secondary' : 'order-action--black'}`}
      onClick={click}
    >
      {children}
    </button>
  );
}
function Panel({ title, children }) {
  return (
    <section className="order-detail-panel">
      <h2>
        <span />
        {title}
      </h2>
      {children}
    </section>
  );
}
function Info({ text, children }) {
  return (
    <div>
      <dt>{text}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function OrderActionDialog({ dialog, setDialog, order, options, busy, error, submit }) {
  const change = (key, value) =>
    setDialog((current) => ({
      ...current,
      [key]: value,
    }));

  const receiving = dialog.type === 'payment';
  const refunding = dialog.type === 'refund';
  const monetary = receiving || refunding;

  const field = (caption, key, type = 'text', extra = {}) => (
    <label className="order-operation-field">
      <span>{caption}</span>
      <input
        type={type}
        value={dialog[key] ?? ''}
        onChange={(event) => change(key, event.target.value)}
        {...extra}
      />
    </label>
  );

  return (
    <OrderModal
      title={dialog.title}
      close={() => setDialog(null)}
      busy={busy}
      submit={submit}
      error={error}
      disabled={
        !dialog.confirmed ||
        (receiving &&
          (!Number.isSafeInteger(Number(dialog.amount)) ||
            Number(dialog.amount) <= 0 ||
            Number(dialog.amount) > Number(dialog.maxAmount))) ||
        (dialog.type === 'startDelivery' &&
          (!dialog.partner ||
            dialog.fee === '' ||
            !Number.isFinite(Number(dialog.fee)) ||
            Number(dialog.fee) < 0))
      }
    >
      {dialog.type === 'startDelivery' && (
        <>
          <p className="order-delivery-description">
            Chọn đối tác và xác nhận đã bàn giao hàng. Phí trả đối tác là khoản cửa hàng trả cho
            người giao.
          </p>

          <label className="order-operation-field">
            <span>ĐỐI TÁC GIAO HÀNG *</span>

            <select
              required
              disabled={busy}
              value={dialog.partner}
              onChange={(event) => change('partner', event.target.value)}
            >
              <option value="">— Chọn đối tác —</option>

              {options.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.ten_doi_tac} — {partner.ma_doi_tac}
                </option>
              ))}
            </select>
          </label>

          {field('PHÍ TRẢ ĐỐI TÁC (đ) *', 'fee', 'number', {
            required: true,
            min: 0,
            step: '0.01',
            disabled: busy,
          })}
        </>
      )}

      <p>{order.ma_don_hang}</p>

      {dialog.type === 'counterExchange' && dialog.exchangeCount > 0 && (
        <p className="order-alert-text">
          Thiết bị hiện hành đã qua {dialog.exchangeCount} lần đổi. Chỉ xác nhận khi chính thiết bị
          này vừa được kiểm tra và phát hiện lỗi tại quầy. Nhập lý do của lần lỗi mới; thao tác sẽ
          tạo thêm một phiếu và giữ lịch sử các lần cũ.
        </p>
      )}

      {dialog.type === 'completeCounterInspection' && (
        <p>
          Xác nhận đã kiểm tra và bàn giao các thiết bị hiện hành của đơn cho khách. Sau bước này,
          chức năng đổi lỗi tại quầy của đơn sẽ khóa; lỗi phát sinh tiếp theo xử lý qua bảo hành.
        </p>
      )}

      {dialog.type === 'counterExchange' && (
        <>
          <p>
            Thiết bị: <strong>{dialog.deviceLabel}</strong>
            {' — '}
            {dialog.oldTracking}
            {dialog.oldSerial ? ` — Serial: ${dialog.oldSerial}` : ''}
          </p>

          {dialog.serialManaged
            ? field('SERIAL THIẾT BỊ MỚI', 'newSerial', 'text', {
                required: true,
                maxLength: 100,
              })
            : field('DẤU HIỆU NHẬN DẠNG THIẾT BỊ MỚI', 'newIdentification', 'text', {
                required: true,
                maxLength: 255,
              })}

          {field('MÔ TẢ LỖI PHÁT HIỆN TẠI QUẦY', 'reason', 'text', {
            required: true,
            maxLength: 255,
          })}

          {field('TÊN NGƯỜI LIÊN HỆ', 'contactName', 'text', {
            required: true,
            maxLength: 100,
          })}

          {field('SỐ ĐIỆN THOẠI LIÊN HỆ', 'contactPhone', 'tel', {
            required: true,
            maxLength: 16,
            pattern: '\\+?[0-9]{8,15}',
          })}

          <p>
            Đơn và khoản thanh toán được giữ nguyên. Thiết bị mới tiếp tục mốc bảo hành của đơn gốc.
          </p>
        </>
      )}

      {receiving && order.trang_thai_don_hang === 'HUY_HANG' && (
        <p role="status">
          Khoản tiền được ghi nhận để xử lý hoàn cho khách. Đơn hàng vẫn giữ trạng thái đã hủy.
        </p>
      )}

      {monetary && (
        <>
          {receiving && (
            <>
              <p>
                Nguồn thu: {dialog.source === 'KHACH_HANG' ? 'Khách hàng' : 'Đối tác giao hàng'}
              </p>

              <p>
                {dialog.source === 'DOI_TAC_GIAO_HANG'
                  ? 'COD cần ghi nhận: '
                  : order.trang_thai_don_hang === 'HUY_HANG'
                    ? 'Giới hạn ghi nhận tiền đến muộn: '
                    : 'Còn phải thu: '}
                <strong>{money(dialog.maxAmount)}</strong>
              </p>

              {field('SỐ TIỀN THỰC NHẬN LẦN NÀY (đ)', 'amount', 'number', {
                required: true,
                min: 1,
                max: dialog.maxAmount,
                step: 1,
                disabled: busy || dialog.source === 'DOI_TAC_GIAO_HANG',
              })}
            </>
          )}

          {refunding && <p>Số tiền hoàn do hệ thống xác định từ khoản đã thu.</p>}

          <label className="order-operation-field">
            <span>PHƯƠNG THỨC</span>
            <select
              required
              value={dialog.method}
              onChange={(event) => change('method', event.target.value)}
            >
              {['TIEN_MAT', 'CHUYEN_KHOAN', 'THE'].map((method) => (
                <option key={method} value={method}>
                  {label(method)}
                </option>
              ))}
            </select>
          </label>

          {field(
            refunding ? 'THỜI ĐIỂM HOÀN TIỀN' : 'THỜI ĐIỂM NHẬN TIỀN',
            'occurredAt',
            'datetime-local',
            { required: true }
          )}

          {dialog.method !== 'TIEN_MAT' &&
            field('MÃ GIAO DỊCH', 'transaction', 'text', {
              required: true,
              maxLength: 255,
              pattern: '.*\\S.*',
            })}
        </>
      )}

      {dialog.type === 'deliveryStatus' &&
        dialog.target === 'GIAO_THANH_CONG' &&
        Number(dialog.cod) > 0 && (
          <label className="order-operation-confirm">
            <input
              type="checkbox"
              disabled={busy}
              checked={Boolean(dialog.codConfirmed)}
              onChange={(event) => change('codConfirmed', event.target.checked)}
            />

            <span>
              Xác nhận người giao đã thu đủ <strong>{money(dialog.cod)}</strong> từ khách hàng.
            </span>
          </label>
        )}

      <label className="order-operation-confirm">
        <input
          type="checkbox"
          checked={dialog.confirmed}
          onChange={(event) => change('confirmed', event.target.checked)}
        />
        {dialog.type === 'counterExchange'
          ? 'Xác nhận lỗi phát hiện tại quầy, khách đồng ý đổi, cửa hàng đã nhận thiết bị lỗi và giao thiết bị mới'
          : refunding
            ? 'Xác nhận đã hoàn tiền cho khách'
            : receiving
              ? 'Xác nhận cửa hàng đã thực nhận số tiền trên'
              : 'Xác nhận thực hiện thao tác'}
      </label>
    </OrderModal>
  );
}
