import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  SquareCheck as CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  History,
  Package,
  Phone,
  RefreshCw,
  Truck,
  Wallet,
} from 'lucide-react';
import { getWarranty, warrantyError } from '../api/warrantyApi';
import {
  displayDate,
  money,
  statusLabels,
  quoteLabels,
  paymentLabels,
  refundLabels,
} from '../data/warrantyContract';
import { actions, fieldOptions } from '../data/warrantyActions';
import {
  actionHints,
  custodyBlocker,
  custodyLabels,
  workflowGuide,
  activeWarrantyTrip,
  warrantyAlternativeKeys,
  warrantyDeviceLabel,
} from '../data/warrantyExperience';
import {
  WarrantyBadge,
  WarrantyFields,
  WarrantyPanel,
  WarrantyTable,
} from '../components/WarrantyShell';
import WarrantyActionForm from '../components/WarrantyActionForm';
import WarrantyHistoryDetail, {
  warrantyHistoryEventName,
} from '../components/WarrantyHistoryDetail';
import { printWarrantyDocument } from '../components/warrantyPrint';
import WarrantySnapshot, { displayValue } from '../components/WarrantySnapshot';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import '../styles/warrantyShell.css';

const tabs = [
  ['Tổng quan', FileText],
  ['Xử lý & giao nhận', Truck],
  ['Báo giá & thanh toán', Wallet],
  ['Đổi bảo hành', Package],
  ['Lịch sử', History],
];

const groups = {
  1: {
    inspection: 'Kiểm tra & kết luận',
    custody: 'Giao nhận thiết bị',
    work: 'Công việc & tiến độ',
    handover: 'Trả khách & hoàn tất',
  },
  2: { quotes: 'Báo giá cho khách', invoice: 'Hóa đơn & nghĩa vụ', money: 'Thu, chi & hoàn tiền' },
  3: { plan: 'Phương án đổi', items: 'Thiết bị thay thế', settlement: 'Đối soát nhà cung cấp' },
};

const sameWarrantyId = (a, b) => a != null && b != null && String(a) === String(b);

function warrantyProgress(detail) {
  const status = detail.trang_thai_xu_ly;
  const custody = detail.noi_dang_giu;
  const held = custody?.loai;
  const next = detail.xu_ly_tiep?.thao_tac || [];
  const plan = detail.phuong_an_doi;
  const quote = detail.bao_gia?.at(-1);
  const invoice = detail.hoa_don;
  const activePlan = plan && plan.da_huy !== true && plan.quyet_dinh_khach !== 'TU_CHOI';
  const exchangeRoute =
    plan?.nguon === 'DON_VI_BAO_HANH'
      ? 'Đổi từ đơn vị bảo hành'
      : plan?.nguon === 'TON_KHO_CUA_HANG'
        ? 'Đổi từ kho cửa hàng'
        : 'Đổi bảo hành';

  const sent = (detail.giao_nhan || []).findLast(
    (event) =>
      event.su_kien === 'GUI_DON_VI' && sameWarrantyId(event.thiet_bi_id, detail.thiet_bi?.id)
  );
  const trip = activeWarrantyTrip(detail);
  const returned = status === 'DA_NHAN_LAI' || Boolean(sent && !trip);
  const inspected = Boolean(detail.ket_luan?.length);
  const first = inspected ? ['Tiếp nhận', 'Kết luận kiểm tra'] : ['Tiếp nhận'];
  const supplierSteps = sent ? ['Tiếp nhận', 'Gửi đơn vị'] : ['Tiếp nhận'];

  const quoteStep = next.includes('SEND_QUOTE')
    ? 'Gửi báo giá'
    : next.some((key) => ['ACCEPT_QUOTE', 'REJECT_QUOTE'].includes(key))
      ? 'Chờ khách phản hồi báo giá'
      : next.includes('QUOTE') && quote?.trang_thai === 'CHO_PHAN_HOI'
        ? 'Lập lại báo giá'
        : '';
  const paid =
    Number(invoice?.tong_tien) > 0 &&
    (detail.bao_gia || []).some(
      (item) =>
        item.trang_thai === 'DONG_Y' && sameWarrantyId(item.phien_ban, invoice.phien_ban_bao_gia)
    );
  const path = (route, reached, current, future = []) => ({
    route,
    steps: [...reached, current, ...future],
    current: reached.length,
  });

  if (status === 'TIEP_NHAN') return path('Tiếp nhận', [], 'Tiếp nhận', ['Kiểm tra']);

  const finished = status === 'HOAN_TAT';
  if (finished || status === 'CHO_TRA_KHACH') {
    const result = detail.ket_qua_xu_ly;
    const exchanged = finished
      ? plan?.da_ban_giao === true || result === 'DOI_SAN_PHAM'
      : activePlan && sameWarrantyId(custody?.thiet_bi_id, plan.thiet_bi_thay_the_id);
    const unrepaired = ['KHONG_THUC_HIEN_SUA', 'KHONG_SUA_DUOC'].includes(result);
    const route = exchanged
      ? exchangeRoute
      : sent && returned
        ? 'Qua đơn vị bảo hành'
        : unrepaired
          ? 'Trả thiết bị gốc'
          : paid
            ? 'Xử lý có phí'
            : 'Xử lý tại cửa hàng';
    const reached = exchanged
      ? [...first, 'Có thiết bị thay thế']
      : sent && returned
        ? [...supplierSteps, 'Nhận lại']
        : paid
          ? [...first, 'Báo giá đã duyệt']
          : first;
    const device = exchanged
      ? 'hàng đổi'
      : result === 'SUA_THANH_CONG'
        ? 'thiết bị đã sửa'
        : unrepaired
          ? 'thiết bị gốc'
          : 'thiết bị';
    const destination = (finished ? 'Đã bàn giao ' : 'Chờ bàn giao ') + device;

    return !finished && next.includes('THU_KHACH')
      ? path(route, reached, 'Còn phải thu', [destination])
      : path(route, reached, destination);
  }

  if (activePlan) {
    if (plan.da_duyet !== true)
      return path(exchangeRoute, first, 'Phê duyệt phương án', ['Chốt với khách']);
    const approved = [...first, 'Phương án đã duyệt'];
    if (plan.khach_dong_y !== true)
      return path(exchangeRoute, approved, quoteStep || 'Chờ khách xác nhận đổi');
    const agreed = [...approved, 'Khách đồng ý đổi'];
    if (plan.thiet_bi_thay_the_id != null)
      return path(exchangeRoute, [...agreed, 'Có hàng đổi'], 'Kiểm tra hàng đổi', [
        'Chờ giao hàng đổi',
      ]);
    return path(
      exchangeRoute,
      agreed,
      plan.nguon === 'DON_VI_BAO_HANH'
        ? 'Nhận hàng đơn vị cấp'
        : next.includes('ISSUE')
          ? 'Xuất hàng đổi'
          : 'Chuẩn bị hàng trong kho',
      ['Kiểm tra hàng đổi']
    );
  }

  if (trip?.wrong)
    return path('Qua đơn vị bảo hành', supplierSteps, 'Chờ nhận đúng thiết bị', ['Kiểm tra lại']);

  if (['DANG_VAN_CHUYEN', 'DON_VI_BAO_HANH'].includes(held) || status === 'DA_GUI_BAO_HANH') {
    const step = next.includes('YEU_CAU_THU_HOI')
      ? 'Yêu cầu lấy lại'
      : next.includes('NHAN_LAI')
        ? 'Chờ nhận lại'
        : held === 'DON_VI_BAO_HANH'
          ? 'Đơn vị đang xử lý'
          : 'Chờ đơn vị nhận';
    return path(
      'Qua đơn vị bảo hành',
      supplierSteps,
      step,
      step === 'Chờ nhận lại' ? ['Kiểm tra lại'] : ['Nhận lại', 'Kiểm tra lại']
    );
  }

  if (
    status === 'DA_NHAN_LAI' ||
    (returned &&
      status === 'DANG_KIEM_TRA' &&
      !quoteStep &&
      !next.includes('THU_KHACH') &&
      !next.includes('BAT_DAU_CONG_VIEC'))
  )
    return path('Kiểm tra sau nhận lại', [...supplierSteps, 'Nhận lại'], 'Kiểm tra lại', [
      'Chờ trả khách',
    ]);

  if (quoteStep) return path('Báo giá', first, quoteStep);
  if (
    next.includes('THU_KHACH') ||
    next.includes('BAT_DAU_CONG_VIEC') ||
    (paid && status === 'DANG_BAO_HANH')
  ) {
    const step = next.includes('THU_KHACH')
      ? 'Chờ thu tiền'
      : next.includes('BAT_DAU_CONG_VIEC')
        ? 'Bắt đầu xử lý'
        : 'Đang xử lý';
    return path('Xử lý có phí', paid ? [...first, 'Báo giá đã duyệt'] : first, step, [
      'Chờ trả khách',
    ]);
  }

  if (status === 'CHO_DOI_SAN_PHAM') return path('Đổi bảo hành', first, 'Đối chiếu phương án');
  if (status === 'DANG_BAO_HANH')
    return path('Xử lý tại cửa hàng', first, 'Đang xử lý', ['Chờ trả khách']);
  return path('Kiểm tra tại cửa hàng', first, inspected ? 'Chọn hướng xử lý' : 'Kiểm tra');
}

function TrackedWarrantyDevice({ device }) {
  if (!device) return <p className="w-shell-note">Chưa có thông tin thiết bị.</p>;

  const recordLink = (base, id, label) => {
    const key = String(id ?? '');
    return /^[1-9]\d*$/.test(key) ? (
      <Link className="w-device-link" to={base + '/' + key}>
        {label}
      </Link>
    ) : (
      label
    );
  };

  return (
    <div className="w-tracked-device">
      <WarrantyFields
        fields={[
          ['Sản phẩm', device.ten_san_pham],
          [
            'Phiên bản',
            recordLink(
              '/kho-hang/quan-ly-phien-ban/chi-tiet',
              device.phien_ban_id,
              device.ten_phien_ban || (device.phien_ban_id ? 'Xem phiên bản' : '—')
            ),
          ],
          [
            'Serial',
            recordLink(
              '/kho-hang/danh-sach-serial',
              device.so_serial_id,
              device.so_serial || (device.so_serial_id ? 'Xem serial' : 'Không có serial')
            ),
          ],
          ['Hạn bảo hành', displayDate(device.han_bao_hanh)],
          ...(device.ma_theo_doi ? [['Mã theo dõi', device.ma_theo_doi]] : []),
          ...(device.can_cu_tinh_han ? [['Căn cứ tính hạn', device.can_cu_tinh_han]] : []),
        ]}
      />
    </div>
  );
}

export default function ChiTietBaoHanh() {
  const { id } = useParams();
  return <WarrantyDetail key={id} id={id} />;
}

function WarrantyDetail({ id }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [locked, setLocked] = useState(false);
  const [page, setPage] = useState(1),
    [reload, setReload] = useState(0);
  const [quoteVersion, setQuoteVersion] = useState(null),
    [form, setForm] = useState(null),
    [drafts, setDrafts] = useState({});
  const [recordGroupKey, setRecordGroupKey] = useState(null);
  const [message, setMessage] = useState(''),
    [lastResult, setLastResult] = useState(null);

  const [historyEventId, setHistoryEventId] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    getWarranty(id, page - 1, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(warrantyError(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, page, reload]);

  const handlePrint = async (type, invoiceId) => {
    if (printing || locked || loading || error) return;
    setPrinting(true);
    setPrintError('');

    try {
      await printWarrantyDocument(id, type, invoiceId);
    } catch (cause) {
      setPrintError(warrantyError(cause));
    } finally {
      setPrinting(false);
    }
  };

  const changeTab = (value) => {
    setTab(value);
    setRecordGroupKey(null);
    setHistoryEventId(null);
  };

  if (!data)
    return (
      <div className="w-shell">
        <div className="w-shell-content">
          <div className="w-empty-state">
            <ClipboardCheck size={36} />
            <h1>{error ? 'Chưa tải được phiếu bảo hành' : 'Đang tải hồ sơ…'}</h1>
            <p role={error ? 'alert' : 'status'}>{error || 'Vui lòng chờ trong giây lát.'}</p>
            <div className="w-shell-actions">
              <button className="w-shell-button" onClick={() => setReload((value) => value + 1)}>
                Thử lại
              </button>
              <button
                className="w-shell-button"
                disabled={locked}
                onClick={() => navigate('/admin/bao-hanh/danh-sach')}
              >
                Về danh sách
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  const latestQuote = data.bao_gia.at(-1);
  const quote = data.bao_gia.find((item) => item.phien_ban === Number(quoteVersion)) || latestQuote;
  const invoice = data.hoa_don;
  const plan = data.phuong_an_doi;
  const custody = data.noi_dang_giu;
  const guide = workflowGuide(data);
  const progress = warrantyProgress(data);
  const trackedDevice = data.thiet_bi_hien_hanh ?? data.thiet_bi;
  const invoices = [invoice, ...(data.hoa_don_da_huy || [])].filter(Boolean);
  const refundTotal = invoices.reduce((total, item) => total + Number(item.con_phai_hoan ?? 0), 0);

  const formEntry = (operation, selectedQuote) => {
    const version = selectedQuote?.phien_ban;
    return {
      operation,
      version,
      key: [operation.key, version, plan?.phien_ban, invoice?.id].join(':'),
    };
  };

  const open = (operation, selectedQuote = quote) => {
    if (locked || unavailable(operation, selectedQuote)) return;
    setHistoryEventId(null);
    setForm(formEntry(operation, selectedQuote));
    setMessage('');
  };

  const unavailable = (operation, selectedQuote = quote) => {
    if (loading || error) return 'Tải lại dữ liệu trước khi ghi nhận.';
    if (data.trang_thai_xu_ly === 'HOAN_TAT' && !operation.afterComplete)
      return 'Phiếu đã hoàn tất, không mở lại xử lý thiết bị.';
    if (operation.endpoint === 'quote-events' && !selectedQuote) return 'Cần lập báo giá trước.';
    if (operation.key === 'SEND_QUOTE' && selectedQuote?.trang_thai !== 'NHAP')
      return 'Chỉ gửi báo giá đang là bản nháp.';
    if (
      ['ACCEPT_QUOTE', 'REJECT_QUOTE', 'WITHDRAW_QUOTE'].includes(operation.key) &&
      selectedQuote?.trang_thai !== 'CHO_PHAN_HOI'
    )
      return 'Dùng cho báo giá đang chờ khách phản hồi.';
    if (operation.key === 'BAT_DAU_KIEM_TRA' && data.trang_thai_xu_ly !== 'TIEP_NHAN')
      return 'Chỉ bắt đầu từ phiếu mới tiếp nhận.';
    if (
      operation.key === 'KIEM_TRA_TIEP' &&
      !['DA_NHAN_LAI', 'CHO_TRA_KHACH'].includes(data.trang_thai_xu_ly)
    )
      return 'Dùng sau khi nhận lại hoặc cần kiểm tra lại trước khi trả.';
    if (operation.endpoint === 'invoice' && !invoice)
      return 'Chưa có hóa đơn hiệu lực. Hóa đơn được lập khi khách đồng ý báo giá.';
    if (['THU_KHACH', 'HOAN_KHACH'].includes(operation.key) && !invoices.length)
      return 'Cần có hóa đơn để ghi giao dịch.';
    if (operation.group === 'plan' && operation.key !== 'PLAN_CREATE' && !plan?.phien_ban)
      return 'Cần lập phương án đổi trước.';
    return custodyBlocker(operation.key, data);
  };

  const showRecords = (name) => {
    const target = Object.keys(groups).find((index) => groups[index][name]);
    if (locked || !target) return;
    changeTab(Number(target));
    setRecordGroupKey(name);
  };

  const saved = (entry, result) => {
    setLoading(true);
    setLocked(false);
    setLastResult(result);
    setMessage(
      entry.operation.key === 'HANDOVER' && result?.trang_thai_xu_ly === 'HOAN_TAT'
        ? 'Đã bàn giao cho khách và hoàn tất phiếu. Các khoản hoàn tiền, đối soát còn lại vẫn được theo dõi.'
        : 'Đã lưu thành công. Đang cập nhật tình trạng và việc cần làm tiếp theo.'
    );
    setDrafts((current) => {
      const next = { ...current };
      delete next[entry.key];
      return next;
    });
    setForm(null);
    setPage(1);
    setReload((value) => value + 1);
    if (result?.canh_bao) {
      const warning = []
        .concat(result.canh_bao)
        .map((item) => (typeof item === 'string' ? item : item.message || item.noi_dung || ''))
        .join(' ');
      setMessage(`Đã ghi nhận. ${warning}`);
    }
  };

  const workDisabled = locked || loading || Boolean(error);
  const finished = data.trang_thai_xu_ly === 'HOAN_TAT';
  const supplierOpen = data.doi_soat_nha_cung_cap?.da_giai_quyet === false;
  const due = Number(invoice?.con_phai_thu ?? 0);
  const wrongReturn = activeWarrantyTrip(data)?.wrong === true;
  const activePlan = plan && plan.da_huy !== true && plan.quyet_dinh_khach !== 'TU_CHOI';

  const toOperations = (keys) =>
    [...new Set(keys)]
      .map((key) => actions.find((item) => item.key === key))
      .filter((item) => item && !unavailable(item, latestQuote));
  const suggested = toOperations(
    wrongReturn && !activePlan && !finished ? ['NHAN_LAI'] : data.xu_ly_tiep?.thao_tac || []
  );
  const alternatives = toOperations(warrantyAlternativeKeys(data)).filter(
    (item) => !suggested.includes(item)
  );
  const primary = suggested.length === 1 ? suggested[0] : null;
  const quoteReply = suggested.some((item) => ['ACCEPT_QUOTE', 'REJECT_QUOTE'].includes(item.key));
  const planReply = suggested.some((item) => ['PLAN_ACCEPT', 'PLAN_REJECT'].includes(item.key));

  const workLabels = {
    ACCEPT_QUOTE: 'Khách đồng ý',
    REJECT_QUOTE: 'Khách từ chối',
    PLAN_ACCEPT: 'Khách đồng ý đổi',
    PLAN_REJECT: 'Khách từ chối đổi',
    HOLD_SERIAL: 'Giữ hàng có serial',
    HOLD_UNIT: 'Giữ hàng không serial',
    PLAN_CREATE: 'Lập phương án đổi',
    GUI_DON_VI: 'Gửi đơn vị bảo hành',
    DON_VI_TIEP_NHAN: 'Xác nhận đơn vị nhận đúng',
    YEU_CAU_THU_HOI: 'Yêu cầu lấy lại thiết bị',
    NHAN_LAI: wrongReturn ? 'Ghi nhận lần nhận mới' : 'Ghi nhận thiết bị đã về',
  };
  const workTitle = finished
    ? 'Đã bàn giao thiết bị'
    : wrongReturn && !activePlan
      ? 'Chưa nhận lại đúng thiết bị'
      : quoteReply
        ? 'Chờ khách phản hồi báo giá'
        : planReply
          ? 'Chờ khách phản hồi phương án đổi'
          : suggested.length > 1
            ? 'Chọn hướng xử lý'
            : primary?.key === 'SAN_SANG_TRA'
              ? 'Chuẩn bị trả khách'
              : primary?.key === 'DON_VI_TIEP_NHAN'
                ? 'Chờ đơn vị xác nhận'
                : primary?.key === 'NHAN_LAI'
                  ? 'Chờ thiết bị về cửa hàng'
                  : primary?.label || guide.title;
  const workNote = finished
    ? 'Xem hồ sơ và các nghĩa vụ còn lại.'
    : wrongReturn && !activePlan
      ? 'Đã lưu lần nhận sai. Liên hệ đơn vị và ghi lần nhận mới khi thiết bị thực sự về.'
      : quoteReply || planReply
        ? 'Chỉ ghi khi đã có phản hồi thực tế của khách.'
        : actionHints[primary?.key] || guide.text;

  const actionButton = (item, selectedQuote = quote, main = false) => (
    <button
      key={item.key}
      type="button"
      disabled={workDisabled}
      className={`w-shell-button${main ? ' w-shell-button--black' : ''}`}
      onClick={() => open(item, selectedQuote)}
    >
      {workLabels[item.key] || item.label}
    </button>
  );

  const formQuote = form
    ? data.bao_gia.find((item) => item.phien_ban === Number(form.version))
    : null;
  const formBlocker = form ? unavailable(form.operation, formQuote) : '';
  const tabGroups = groups[tab] || {};
  const group = tabGroups[recordGroupKey] ? recordGroupKey : Object.keys(tabGroups)[0];

  const recordGroup = (name, children) => {
    if (group !== name) return null;
    const operations = actions.filter((item) => item.group === name);
    const ready = operations.filter((item) => !unavailable(item));
    const blocked = operations.filter((item) => unavailable(item));
    return (
      <WarrantyPanel title={tabGroups[name]}>
        {ready.length > 0 && (
          <div className="w-work-buttons w-record-actions">
            {ready.map((item) => actionButton(item))}
          </div>
        )}
        <div className="w-record-content">{children}</div>
        {blocked.length > 0 && (
          <details className="w-reference-details">
            <summary>Điều kiện của các thao tác khác</summary>
            {blocked.map((item) => (
              <p className="w-shell-note" key={item.key}>
                <strong>{workLabels[item.key] || item.label}:</strong> {unavailable(item)}
              </p>
            ))}
          </details>
        )}
      </WarrantyPanel>
    );
  };

  const changeHistoryPage = (value) => {
    if (locked || loading || value === page) return;
    setLoading(true);
    setHistoryEventId(null);
    setPage(value);
  };

  const historyTable = (
    <>
      <WarrantyTable
        columns={['Thời điểm', 'Hoạt động', 'Nội dung', 'Người ghi nhận', 'Chi tiết']}
        rows={(data.lich_su?.items || []).map((event) => [
          displayDate(event.ngay_tao),
          warrantyHistoryEventName(event.loai_su_kien),
          event.noi_dung,
          event.ten_nguoi_thuc_hien || 'Chưa có tên người ghi nhận',
          <button
            key={`history-${event.id}`}
            type="button"
            className="w-shell-button"
            disabled={loading || Boolean(error)}
            aria-haspopup="dialog"
            onClick={() => setHistoryEventId(event.id)}
          >
            Xem chi tiết
          </button>,
        ])}
        empty="Chưa có hoạt động được lưu."
      />

      <TablePagination
        totalItems={data.lich_su?.pagination?.total_elements || 0}
        pageSize={20}
        currentPage={page}
        onPageChange={changeHistoryPage}
        idPrefix="warranty-history"
      />
    </>
  );

  const invoiceTable = (
    <WarrantyTable
      columns={[
        'Hóa đơn',
        'Hiệu lực',
        'Báo giá',
        'Tổng tiền',
        'Phải thu hiệu lực',
        'Đã thu',
        'Đã hoàn',
        'Còn thu',
        'Còn hoàn',
        'Bản in',
      ]}
      rows={invoices.map((item) => [
        `${item.ma_hoa_don} / #${item.id}`,
        item.trang_thai === 'HUY' ? 'Đã hủy' : displayValue(item.trang_thai),
        item.phien_ban_bao_gia,
        money(item.tong_tien),
        money(item.khoan_phai_thu_hieu_luc),
        money(item.da_thu),
        money(item.da_hoan),
        money(item.con_phai_thu),
        money(item.con_phai_hoan),
        <button
          key={`print-invoice-${item.id}`}
          type="button"
          className="w-shell-button"
          disabled={printing || locked || loading || Boolean(error)}
          onClick={() => handlePrint('invoice', item.id)}
        >
          In hóa đơn
        </button>,
      ])}
      empty="Chưa có hóa đơn. Hóa đơn được tạo khi khách đồng ý báo giá."
    />
  );

  const conclusions = (
    <>
      {data.ket_luan?.length ? (
        [...data.ket_luan].reverse().map((item) => (
          <article key={item.lich_su_id} className="w-conclusion">
            <div className="w-shell-title-row">
              <strong>{item.noi_dung}</strong>
              <button
                type="button"
                className="w-shell-button"
                disabled={loading || Boolean(error)}
                aria-haspopup="dialog"
                onClick={() => setHistoryEventId(item.lich_su_id)}
              >
                Xem chi tiết
              </button>
            </div>
            <WarrantyTable
              columns={['Hạng mục', 'Điều kiện', 'Bên chịu phí', 'Căn cứ / hướng xử lý']}
              rows={(item.hang_muc || []).map((row) => [
                row.ma_hang_muc,
                <WarrantyBadge
                  key={row.ma_hang_muc}
                  tone={row.dieu_kien_bao_hanh === 'DU_DIEU_KIEN' ? 'green' : 'amber'}
                >
                  {fieldOptions.dieu_kien_bao_hanh[row.dieu_kien_bao_hanh] ||
                    row.dieu_kien_bao_hanh}
                </WarrantyBadge>,
                fieldOptions.ben_chiu_phi[row.ben_chiu_phi] || row.ben_chiu_phi,
                [row.noi_dung_xu_ly, row.can_cu, row.ly_do].filter(Boolean).join(' · '),
              ])}
              empty="Chưa có hạng mục."
            />
          </article>
        ))
      ) : (
        <div className="w-empty-inline">
          <ClipboardCheck size={24} />
          <p>Chưa có kết luận. Ghi nhận kết quả kiểm tra để làm căn cứ xử lý.</p>
        </div>
      )}
    </>
  );

  const custodyText = custodyLabels[custody?.loai] || 'Chưa xác định nơi giữ';
  const delivery = (
    <>
      {custody && (
        <div className="w-custody-banner">
          <Truck size={19} />
          <div>
            <strong>{custodyText}</strong>
            {custody.ten && custody.ten !== custodyText && <p>{custody.ten}</p>}
          </div>
        </div>
      )}
      <ol className="w-delivery-timeline">
        {(data.giao_nhan || []).map((item) => {
          const matched = item.da_nhan_dung_thiet_bi ?? item.da_cap_cho_phuong_an;
          return (
            <li key={item.lich_su_id}>
              <span className="w-timeline-dot" aria-hidden="true" />
              <div className="w-delivery-row">
                <div>
                  <strong>{warrantyHistoryEventName(item.su_kien)}</strong>
                  <p>
                    {displayDate(item.ngay)}
                    {item.ten_don_vi && ` · ${item.ten_don_vi}`}
                  </p>
                  {item.thiet_bi_id != null && <p>{warrantyDeviceLabel(data, item.thiet_bi_id)}</p>}
                  {matched === false && (
                    <WarrantyBadge tone="red">
                      {item.da_cap_cho_phuong_an === false
                        ? 'Chưa cấp cho phương án đổi'
                        : 'Chưa nhận đúng thiết bị'}
                    </WarrantyBadge>
                  )}
                  {item.so_serial_thuc_nhan && <p>Serial thực nhận: {item.so_serial_thuc_nhan}</p>}
                </div>
                <button
                  type="button"
                  className="w-shell-button"
                  disabled={workDisabled}
                  aria-haspopup="dialog"
                  onClick={() => setHistoryEventId(item.lich_su_id)}
                >
                  Xem chi tiết
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );

  return (
    <div className="w-shell w-warranty-detail">
      <header className="w-shell-hero">
        <div>
          <p className="w-shell-breadcrumb">
            BẢO HÀNH <ChevronRight size={12} /> CHI TIẾT PHIẾU
          </p>

          <div className="w-shell-title-row">
            <h1>{data.ma_phieu}</h1>
            <WarrantyBadge>
              {statusLabels[data.trang_thai_xu_ly] || data.trang_thai_xu_ly}
            </WarrantyBadge>
          </div>

          <p>
            {data.nguoi_lien_he?.ten || 'Chưa có tên liên hệ'}
            <span className="w-text-divider">/</span>
            {data.thiet_bi?.so_serial || data.thiet_bi?.ma_theo_doi || 'Thiết bị không có serial'}
          </p>
        </div>

        <div className="w-shell-actions">
          <button
            type="button"
            className="w-shell-button"
            disabled={printing || locked || loading || Boolean(error)}
            onClick={() => handlePrint('receipt')}
          >
            In phiếu bảo hành
          </button>

          <button
            type="button"
            className="w-shell-button"
            disabled={!invoice || printing || locked || loading || Boolean(error)}
            onClick={() => handlePrint('invoice', invoice.id)}
            title={!invoice ? 'Chưa có hóa đơn bảo hành hiệu lực' : undefined}
          >
            In hóa đơn
          </button>

          <button
            type="button"
            className="w-shell-button"
            disabled={locked}
            onClick={() => {
              setForm(null);
              setHistoryEventId(null);
              setLoading(true);
              setReload((value) => value + 1);
            }}
          >
            <RefreshCw size={15} /> Tải lại
          </button>

          <button
            type="button"
            className="w-shell-button"
            disabled={locked}
            onClick={() => navigate('/admin/bao-hanh/danh-sach')}
          >
            <ArrowLeft size={15} /> Danh sách phiếu
          </button>
        </div>
      </header>

      {printing && (
        <p className="w-loading" role="status">
          Đang chuẩn bị bản in…
        </p>
      )}

      {printError && (
        <p className="w-shell-error" role="alert">
          {printError}
        </p>
      )}

      {message && (
        <div className="w-ticket-notice">
          <p className="w-intake-message" role="status">
            <CheckCircle2 size={18} />
            {message}
          </p>
          {lastResult && (
            <button
              type="button"
              className="w-shell-button"
              disabled={workDisabled}
              onClick={() => {
                const event = lastResult.lich_su_id ?? lastResult.lich_su_nhan_id;
                if (event != null) setHistoryEventId(event);
                else changeTab(4);
              }}
            >
              Xem thao tác vừa ghi
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="w-shell-error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="w-loading" role="status">
          Đang cập nhật hồ sơ…
        </p>
      )}
      <div className="w-detail-overview">
        <div className="w-ticket-route">
          <p className="w-ticket-route-label">
            Hiện tại: <strong>{progress.route}</strong>
          </p>
          <ol className="w-ticket-steps" aria-label={progress.route} tabIndex={0}>
            {progress.steps.map((label, index) => (
              <li
                key={label}
                aria-current={index === progress.current ? 'step' : undefined}
                data-reached={index < progress.current ? '' : undefined}
              >
                <span aria-hidden="true">{index + 1}</span>
                <strong>{label}</strong>
              </li>
            ))}
          </ol>
        </div>

        <section
          className="w-next-step w-guided-workspace w-unified-work"
          aria-labelledby="w-next-work-title"
        >
          <div className="w-guided-heading">
            <div>
              <span className="w-eyebrow">{finished ? 'Kết quả xử lý' : 'Việc tiếp theo'}</span>
              <h2 id="w-next-work-title">{workTitle}</h2>
              <p>{loading ? 'Đang cập nhật hồ sơ…' : workNote}</p>
              {quoteReply && latestQuote && (
                <p>
                  Báo giá phiên bản {latestQuote.phien_ban} · {money(latestQuote.tong_tien_khach)}
                </p>
              )}
            </div>
            {primary && actionButton(primary, latestQuote, true)}
          </div>

          {suggested.length > 1 && (
            <div className="w-work-buttons">
              {suggested.map((item) => actionButton(item, latestQuote))}
            </div>
          )}
          {alternatives.length > 0 && (
            <div className="w-work-alternatives">
              <strong>Hướng xử lý khác</strong>
              <div className="w-work-buttons">
                {alternatives.map((item) => actionButton(item, latestQuote))}
              </div>
            </div>
          )}
          {finished && (due > 0 || refundTotal > 0 || supplierOpen) && (
            <div className="w-work-buttons">
              {(due > 0 || refundTotal > 0) && (
                <button
                  type="button"
                  className="w-shell-button"
                  onClick={() => showRecords('money')}
                >
                  Xem khoản còn thu hoặc hoàn
                </button>
              )}
              {supplierOpen && (
                <button
                  type="button"
                  className="w-shell-button"
                  onClick={() => showRecords('settlement')}
                >
                  Xem đối soát nhà cung cấp
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <nav className="w-shell-tabs" aria-label="Các nhóm thông tin phiếu bảo hành">
        {tabs.map(([label, Icon], index) => (
          <button
            type="button"
            key={label}
            aria-current={tab === index ? 'page' : undefined}
            disabled={locked}
            onClick={() => changeTab(index)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      <div className="w-shell-content">
        <div className="w-shell-detail-grid">
          <main>
            {group && (
              <nav className="w-group-nav" aria-label="Nhóm hồ sơ">
                {Object.entries(tabGroups).map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={group === key}
                    onClick={() => setRecordGroupKey(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            )}
            {tab === 0 && (
              <>
                <WarrantyPanel
                  title="Thông tin tiếp nhận"
                  note="Đối chiếu tình trạng ban đầu trước khi bắt đầu xử lý."
                >
                  <WarrantyFields
                    fields={[
                      ['Lý do tiếp nhận', data.tiep_nhan?.ly_do],
                      ['Tình trạng khi nhận', data.tiep_nhan?.tinh_trang],
                      [
                        'Phụ kiện đi kèm',
                        (data.tiep_nhan?.phu_kien || [])
                          .map((item) => `${item.ten} × ${item.so_luong}`)
                          .join(', ') || 'Không ghi nhận phụ kiện',
                      ],
                      ['Kết quả hiện tại', displayValue(data.ket_qua_xu_ly)],
                    ]}
                  />
                  <div className="w-intake-photos">
                    {(data.tiep_nhan?.anh_urls || []).map(
                      (url) =>
                        /^(https?:\/\/|\/(?!\/))/.test(url) && (
                          <figure key={url}>
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="Ảnh tiếp nhận đã lưu" />
                            </a>
                          </figure>
                        )
                    )}
                  </div>
                </WarrantyPanel>
                <WarrantyPanel title="Kết luận kiểm tra">{conclusions}</WarrantyPanel>
                <WarrantyPanel title="Giao nhận thiết bị">{delivery}</WarrantyPanel>
              </>
            )}
            {tab === 1 && (
              <>
                {recordGroup(
                  'inspection',
                  <>
                    {conclusions}
                    <section className="w-shell-subsection">
                      <h3>Chi phí đơn vị đã xác nhận</h3>
                      <WarrantySnapshot value={data.chi_phi_don_vi} />
                    </section>
                  </>
                )}
                {recordGroup('custody', delivery)}
                {recordGroup('work', historyTable)}
                {recordGroup(
                  'handover',
                  <p className="w-shell-note">
                    Sẵn sàng trả là bước chuẩn bị. Chỉ bàn giao khi khách thực tế đã nhận thiết bị
                    và đủ điều kiện thanh toán hoặc có duyệt công nợ hợp lệ.
                  </p>
                )}
              </>
            )}
            {tab === 2 && (
              <>
                {recordGroup(
                  'quotes',
                  <>
                    <p className="w-shell-note">
                      Đang xem: {quoteLabels[quote?.trang_thai] || 'Chưa có báo giá'}
                    </p>
                    <div className="w-work-buttons">
                      {data.bao_gia.map((item) => (
                        <button
                          type="button"
                          key={item.phien_ban}
                          disabled={locked}
                          className="w-shell-button"
                          aria-pressed={quote?.phien_ban === item.phien_ban}
                          onClick={() => setQuoteVersion(item.phien_ban)}
                        >
                          Phiên bản {item.phien_ban}
                        </button>
                      ))}
                    </div>
                    <WarrantySnapshot value={quote} />
                  </>
                )}
                {recordGroup(
                  'invoice',
                  <>
                    {invoiceTable}
                    <p className="w-shell-note">
                      Hóa đơn hủy vẫn giữ lịch sử tiền và khoản cần hoàn.
                    </p>
                    {invoice && (
                      <p className="w-shell-note">
                        {paymentLabels[invoice.trang_thai_thanh_toan]} ·{' '}
                        {refundLabels[invoice.trang_thai_hoan_tien]}
                      </p>
                    )}
                  </>
                )}
                {recordGroup(
                  'money',
                  <>
                    <WarrantyTable
                      columns={['Tham chiếu', 'Giao dịch', 'Số tiền', 'Phiếu thu / chi']}
                      rows={(data.giao_dich_tien || []).map((item) => [
                        '#' + item.id,
                        actions.find((operation) => operation.key === item.loai)?.label ||
                          item.loai,
                        money(item.so_tien),
                        item.phieu_thu_chi_id,
                      ])}
                      empty="Chưa có giao dịch tiền được ghi nhận."
                    />
                    <section className="w-shell-subsection">
                      <h3>Chi phí đơn vị</h3>
                      <WarrantySnapshot value={data.chi_phi_don_vi} />
                    </section>
                  </>
                )}
              </>
            )}
            {tab === 3 && (
              <>
                {recordGroup('plan', <WarrantySnapshot value={plan} />)}
                {recordGroup(
                  'items',
                  <>
                    <WarrantySnapshot value={plan} />
                    {delivery}
                  </>
                )}
                {recordGroup('settlement', <WarrantySnapshot value={data.doi_soat_nha_cung_cap} />)}
              </>
            )}
            {tab === 4 && (
              <WarrantyPanel
                title="Lịch sử hoạt động"
                note="Các hoạt động đã được ghi nhận trên phiếu, mới nhất ở đầu danh sách."
              >
                {historyTable}
              </WarrantyPanel>
            )}
          </main>
          <aside>
            <WarrantyPanel title="Tóm tắt phiếu">
              <dl className="w-ticket-summary">
                <div
                  className={
                    ['DANG_VAN_CHUYEN', 'DON_VI_BAO_HANH'].includes(custody?.loai)
                      ? 'w-summary-outside'
                      : undefined
                  }
                >
                  <dt>Nơi giữ thiết bị</dt>
                  <dd>
                    <strong>{custodyText}</strong>
                    {custody?.ten && custody.ten !== custodyText && <small>{custody.ten}</small>}
                  </dd>
                </div>
                <div>
                  <dt>Thời điểm tiếp nhận</dt>
                  <dd>
                    <strong>{displayDate(data.ngay_tiep_nhan)}</strong>
                  </dd>
                </div>
                <div className={due > 0 ? 'w-summary-due' : undefined}>
                  <dt>{invoice ? 'Còn phải thu' : 'Thanh toán'}</dt>
                  <dd>
                    <strong>{invoice ? money(due) : 'Chưa có hóa đơn'}</strong>
                  </dd>
                </div>
                {refundTotal > 0 && (
                  <div className="w-summary-refund">
                    <dt>Cần hoàn cho khách</dt>
                    <dd>
                      <strong>{money(refundTotal)}</strong>
                    </dd>
                  </div>
                )}
              </dl>
            </WarrantyPanel>
            <WarrantyPanel title="Khách hàng & đơn gốc">
              <div className="w-contact-card">
                <div>
                  <strong>{data.nguoi_lien_he?.ten || 'Chưa có tên'}</strong>
                  <p>
                    <Phone size={14} />
                    {data.nguoi_lien_he?.sdt || 'Chưa có số điện thoại'}
                  </p>
                </div>
              </div>
              <WarrantyFields fields={[['Đơn mua hàng', data.don_hang?.ma_don_hang]]} />
              {data.don_hang?.id && (
                <button
                  type="button"
                  className="w-shell-button w-full-width"
                  disabled={locked}
                  onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${data.don_hang.id}`)}
                >
                  Xem đơn mua hàng
                  <ChevronRight size={15} />
                </button>
              )}
            </WarrantyPanel>
            <WarrantyPanel title="Thiết bị đang theo dõi">
              <TrackedWarrantyDevice device={trackedDevice} />
              {data.thiet_bi &&
                trackedDevice &&
                !sameWarrantyId(data.thiet_bi.id, trackedDevice.id) && (
                  <details className="w-reference-details">
                    <summary>Thiết bị gốc</summary>
                    <TrackedWarrantyDevice device={data.thiet_bi} />
                  </details>
                )}
            </WarrantyPanel>
          </aside>
        </div>
      </div>

      {form && (
        <WarrantyActionForm
          key={form.key}
          operation={form.operation}
          detail={data}
          quoteVersion={form.version}
          values={drafts[form.key]}
          disabled={Boolean(formBlocker)}
          blockReason={formBlocker}
          setValues={(values) => setDrafts((current) => ({ ...current, [form.key]: values }))}
          close={() => setForm(null)}
          saved={(result) => saved(form, result)}
          onLockChange={setLocked}
        />
      )}
      {historyEventId != null && (
        <WarrantyHistoryDetail
          key={`${id}:${historyEventId}:${reload}`}
          ticketId={id}
          eventId={historyEventId}
          ticket={data}
          onClose={() => setHistoryEventId(null)}
        />
      )}
    </div>
  );
}
