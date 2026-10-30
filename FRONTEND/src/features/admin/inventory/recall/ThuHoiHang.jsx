import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import OrderModal from '../../orders/components/OrderModal';
import {
  errorMessage,
  formatDateTimeVN,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import {
  createRecall,
  flag,
  getPurchaseSources,
  getRecall,
  getRecallSources,
  listRecalls,
  RECALL_ACTIONS,
  RECALL_STATUS,
  recordRecallEvent,
  splitCodes,
} from './recallApi';
import '../pages/SerialPages.css';
import './Recall.css';

const localTime = (value) => (value ? `${value}:00+07:00` : null);

const positiveId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Chưa chọn dữ liệu tham chiếu hợp lệ.');
  }
  return id;
};

const needsDocument = (action) =>
  ['GAN_THIET_BI', 'TRA_NCC', 'DOI_NCC', 'DOI_BAO_HANH', 'LOAI_TRU'].includes(action);

const resolving = (action) => ['TRA_NCC', 'DOI_NCC', 'DOI_BAO_HANH', 'LOAI_TRU'].includes(action);

function Field({ label, children, wide = false }) {
  return (
    <label className={wide ? 'recall-wide' : undefined}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Check({ children, checked, onChange }) {
  return (
    <label className="recall-check recall-wide">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

function Location({ item }) {
  if (!item.serial_id && !flag(item.source_verified)) return 'Cần đối soát nguồn và thiết bị';

  const labels = {
    DANG_GUI_NCC: 'Đang gửi Nhà Cung Cấp',
    DA_TRA_NCC: 'Đã trả Nhà Cung Cấp',
    DA_DOI_NCC: 'Đã đổi với Nhà Cung Cấp',
    DA_THAY_THE_BAO_HANH: 'Thiết bị cũ đã được thay',
    DANG_BAO_HANH: 'Đang xử lý bảo hành',
  };

  if (labels[item.serial_status]) return labels[item.serial_status];
  if (item.chi_tiet_dong_goi_id) return 'Đang đóng gói';
  if (item.chi_tiet_tra_hang_id) return 'Có liên kết nhận lại hàng';
  if (item.ngay_hoan_thanh) return 'Khách đã nhận theo chứng từ';
  if (item.trang_thai_don_hang === 'DANG_GIAO_HANG') return 'Đang giao hàng';
  if (item.order_id) return 'Đã gắn đơn bán / chờ bàn giao';
  if (item.serial_status === 'LOI') return 'Kho hàng lỗi';
  if (item.serial_status === 'TRONG_KHO') return 'Hàng cửa hàng đang bị chặn';
  return 'Cần đối chiếu vị trí thực tế';
}

const EVENT_META = {
  LIEN_HE: {
    noteLabel: 'Kết quả liên hệ',
    placeholder: 'Ví dụ: Đã gọi khách, khách đồng ý mang sản phẩm tới cửa hàng...',
    confirmation: 'Tôi đã thực hiện liên hệ và ghi đúng kết quả trao đổi.',
    submit: 'Lưu kết quả liên hệ',
  },
  CHO_NHAN_LAI: {
    noteLabel: 'Thỏa thuận nhận lại hàng',
    placeholder: 'Ví dụ: Khách hẹn giao lại sản phẩm và phụ kiện vào...',
    confirmation: 'Lịch hẹn này đã được thống nhất với khách.',
    submit: 'Lưu lịch nhận lại',
  },
  GAN_THIET_BI: {
    noteLabel: 'Thông tin đối chiếu thiết bị',
    placeholder: 'Ghi cách xác định thiết bị này thuộc đúng lần nhận/lô hàng.',
    confirmation: 'Tôi đã đối chiếu đúng thiết bị bán và nguồn nhận thực tế.',
    submit: 'Gắn thiết bị',
  },
  TRA_NCC: {
    noteLabel: 'Nội dung liên kết',
    placeholder: 'Có thể bổ sung thông tin về lần trả hàng.',
    confirmation: 'Hàng đã được Nhà Cung Cấp nhận trả theo phiếu đang chọn.',
    submit: 'Liên kết phiếu trả',
  },
  DOI_NCC: {
    noteLabel: 'Nội dung liên kết',
    placeholder: 'Có thể bổ sung thông tin về hàng đã đổi.',
    confirmation: 'Hàng đổi đã được nhận đạt theo phiếu đang chọn.',
    submit: 'Liên kết phiếu đổi',
  },
  DOI_BAO_HANH: {
    noteLabel: 'Nội dung liên kết',
    placeholder: 'Có thể bổ sung thông tin bàn giao thiết bị thay thế.',
    confirmation: 'Thiết bị thay thế đã được bàn giao theo phiếu đang chọn.',
    submit: 'Liên kết phiếu đổi',
  },
  LOAI_TRU: {
    noteLabel: 'Lý do được phép gỡ phạm vi thu hồi',
    placeholder: 'Ví dụ: Nhà Cung Cấp xác nhận serial này không thuộc lô bị ảnh hưởng...',
    confirmation: 'Tôi đã có căn cứ hợp lệ cho phép gỡ phạm vi thu hồi của đợt này.',
    submit: 'Xác nhận gỡ phạm vi',
  },
  KET_THUC: {
    noteLabel: 'Nội dung kết thúc',
    placeholder: '',
    confirmation: 'Tôi đã kiểm tra kết quả các thiết bị và nghĩa vụ liên quan của đợt này.',
    submit: 'Kết thúc đợt thu hồi',
  },
  MO_LAI: {
    noteLabel: 'Lý do mở lại',
    placeholder: 'Ghi thông tin phát sinh cần tiếp tục theo dõi.',
    confirmation: 'Cần mở lại đợt thu hồi để tiếp tục theo dõi.',
    submit: 'Mở lại đợt thu hồi',
  },
};

const recallNccOptions = (item, action) =>
  action === 'TRA_NCC' ? item?.ncc_return_options || [] : item?.ncc_exchange_options || [];

const recallSourceCheck = (item, action) =>
  Boolean(item && !item.serial_id && (resolving(action) || action === 'GAN_THIET_BI'));

function recallReferenceFields(item, action, rawId) {
  const selectedId = Number(rawId);

  if (['TRA_NCC', 'DOI_NCC'].includes(action)) {
    const proof = recallNccOptions(item, action).find((option) => Number(option.id) === selectedId);

    if (!proof) return { document: '', note: '' };

    return {
      document: proof.document || `${proof.code}/SK-${proof.event_id}`,
      note:
        `Liên kết ${action === 'TRA_NCC' ? 'phiếu trả' : 'phiếu đổi'} ` +
        `${proof.code}, sự kiện #${proof.event_id}, ` +
        `cho ${item.so_serial || item.ma_theo_doi || `thiết bị #${item.id}`}.`,
    };
  }

  if (action === 'DOI_BAO_HANH') {
    const proof = (item?.warranty_options || []).find((option) => Number(option.id) === selectedId);

    if (!proof) return { document: '', note: '' };

    return {
      document: proof.ma_phieu,
      note:
        `Liên kết phiếu đổi ${proof.ma_phieu} cho ` +
        `${item.so_serial || item.ma_theo_doi || `thiết bị #${item.id}`}.`,
    };
  }

  return {};
}

function recallEventForm(action, item, campaign) {
  const form = {
    action,
    document: '',
    note: '',
    nextContactAt: '',
    deviceId: '',
    nccUnitId: '',
    warrantyId: '',
    sourceVerified: false,
    qualityConfirmed: false,
    confirmed: false,
  };

  if (['TRA_NCC', 'DOI_NCC'].includes(action)) {
    form.nccUnitId = String(recallNccOptions(item, action)[0]?.id || '');

    Object.assign(form, recallReferenceFields(item, action, form.nccUnitId));
  }

  if (action === 'DOI_BAO_HANH') {
    form.warrantyId = String(item?.warranty_options?.[0]?.id || '');

    Object.assign(form, recallReferenceFields(item, action, form.warrantyId));
  }

  if (action === 'KET_THUC') {
    const total = campaign?.items?.length || 0;

    form.note =
      `Kết thúc đợt thu hồi ${campaign.code}: ` +
      `đã có kết quả cho ${total}/${total} thiết bị ` +
      'và đã kiểm tra các nghĩa vụ liên quan.';
  }

  return form;
}

function recallDefaultAction(item) {
  if (!item) return 'TRA_NCC';

  if (item.ncc_return_options?.length) {
    return 'TRA_NCC';
  }

  if (item.ncc_exchange_options?.length) {
    return 'DOI_NCC';
  }

  if (item.warranty_options?.length) {
    return 'DOI_BAO_HANH';
  }

  if (!item.serial_id && !flag(item.source_verified)) {
    return 'GAN_THIET_BI';
  }

  if (item.order_id && !item.chi_tiet_tra_hang_id) {
    return 'LIEN_HE';
  }

  return 'TRA_NCC';
}

function recallItemActions(item) {
  if (!item) return [];

  const actions = [];

  if (item.order_id && !item.chi_tiet_tra_hang_id) {
    actions.push('LIEN_HE', 'CHO_NHAN_LAI');
  }

  if (!item.serial_id) {
    actions.push('GAN_THIET_BI');
  }

  actions.push('TRA_NCC', 'DOI_NCC');

  if (item.order_id || item.warranty_options?.length) {
    actions.push('DOI_BAO_HANH');
  }

  actions.push('LOAI_TRU');

  return actions;
}

export default function ThuHoiHang() {
  const { recallId } = useParams();
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], totalItems: 0 });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceOptions, setSourceOptions] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [sourceError, setSourceError] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const attempt = useRef(null);
  const writing = useRef(false);
  const sequence = useRef(0);

  const currentItem = dialog?.item
    ? detail?.items?.find((item) => Number(item.id) === Number(dialog.item.id)) || dialog.item
    : null;

  const actions = currentItem ? recallItemActions(currentItem) : [form.action];

  const eventMeta = EVENT_META[form.action] || EVENT_META.LIEN_HE;

  const vendorAction = ['TRA_NCC', 'DOI_NCC'].includes(form.action);

  const nccOptions = vendorAction && currentItem ? recallNccOptions(currentItem, form.action) : [];

  const warrantyOptions = currentItem?.warranty_options || [];

  const referenceReady =
    dialog?.kind !== 'event'
      ? true
      : vendorAction
        ? nccOptions.some((option) => Number(option.id) === Number(form.nccUnitId))
        : form.action === 'DOI_BAO_HANH'
          ? warrantyOptions.some((option) => Number(option.id) === Number(form.warrantyId))
          : true;

  const confirmationText =
    dialog?.kind === 'create'
      ? 'Tôi xác nhận đúng thông báo và phạm vi cần thu hồi.'
      : eventMeta.confirmation +
        (recallSourceCheck(currentItem, form.action) && form.action !== 'GAN_THIET_BI'
          ? ' Tôi đã đối chiếu đúng từng thiết bị và nguồn nhận thực tế.'
          : '');

  useEffect(() => {
    if (recallId) return undefined;
    const controller = new AbortController();
    setLoading(true);

    listRecalls({ keyword, status, page }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setList(data);
          setError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [keyword, status, page, recallId, refresh]);

  const loadDetail = useCallback(
    async (signal) => {
      if (!recallId) return;
      const version = ++sequence.current;
      setLoading(true);

      try {
        const data = await getRecall(recallId, signal);
        if (!signal?.aborted && version === sequence.current) {
          setDetail(data);
          setError('');
        }
      } catch (cause) {
        if (!signal?.aborted && version === sequence.current) {
          setError(errorMessage(cause));
        }
      } finally {
        if (!signal?.aborted && version === sequence.current) setLoading(false);
      }
    },
    [recallId]
  );

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    loadDetail(controller.signal);
    return () => controller.abort();
  }, [loadDetail]);

  useEffect(() => {
    if (!recallId || dialog?.kind !== 'event') return undefined;

    const refreshReferences = () => {
      if (!writing.current && !attempt.current) {
        loadDetail();
      }
    };

    window.addEventListener('focus', refreshReferences);

    return () => {
      window.removeEventListener('focus', refreshReferences);
    };
  }, [recallId, dialog?.kind, loadDetail]);

  useEffect(() => {
    if (dialog?.kind !== 'create') return undefined;
    const controller = new AbortController();

    getRecallSources(sourceQuery, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setSourceOptions(rows);
          setSourceError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setSourceError(errorMessage(cause));
      });

    return () => controller.abort();
  }, [dialog?.kind, sourceQuery]);

  useEffect(() => {
    if (dialog?.kind !== 'create' || !form.purchaseId) {
      setReceipts([]);
      return undefined;
    }

    const controller = new AbortController();
    setSourceLoading(true);

    getPurchaseSources(form.purchaseId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setReceipts(rows);
          setSourceError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setSourceError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSourceLoading(false);
      });

    return () => controller.abort();
  }, [dialog?.kind, form.purchaseId]);

  const frozen = busy || Boolean(attempt.current);

  const change = (name, value) =>
    setForm((current) => {
      const item =
        detail?.items?.find((entry) => Number(entry.id) === Number(dialog?.item?.id)) ||
        dialog?.item;

      if (dialog?.kind === 'event' && name === 'action') {
        return recallEventForm(value, item, detail);
      }

      const next = {
        ...current,
        [name]: value,
        confirmed: name === 'confirmed' ? value : false,
        sourceVerified: false,
        qualityConfirmed: false,
      };

      if (dialog?.kind === 'event' && ['nccUnitId', 'warrantyId'].includes(name)) {
        Object.assign(next, recallReferenceFields(item, next.action, value));
      }

      if (dialog?.kind === 'event' && name === 'confirmed') {
        next.sourceVerified = Boolean(value) && recallSourceCheck(item, next.action);

        next.qualityConfirmed = Boolean(value) && next.action === 'LOAI_TRU';
      }

      return next;
    });

  const sourceLines = receipts.flatMap((receipt) =>
    receipt.items.map((item) => ({ ...item, receiptId: receipt.id }))
  );

  const selectedLine = sourceLines.find((line) => Number(line.id) === Number(form.receiptLineId));

  const openCreate = () => {
    if (frozen || (recallId && !detail)) return;

    const source = recallId ? detail : null;

    setError('');
    setNotice('');
    setSourceError('');
    setSourceQuery(source?.ma_don_nhap || '');
    setReceipts([]);

    setSourceOptions(
      source
        ? [
            {
              id: source.purchase_id,
              ma_don_nhap: source.ma_don_nhap,
              ten_nha_cung_cap: source.ten_nha_cung_cap,
            },
          ]
        : []
    );

    setForm({
      purchaseId: source ? String(source.purchase_id) : '',
      mode: 'serials',
      serials: '',
      receiptLineId: '',
      quantity: '1',
      acceptVariantBlock: false,
      document: '',
      note: '',
      deadline: '',
      confirmed: false,
    });

    setDialog({ kind: 'create' });
  };

  const openAction = (action, item = null) => {
    if (frozen || !detail) return;

    setError('');
    setNotice('');
    setForm(recallEventForm(action, item, detail));

    setDialog({
      kind: 'event',
      item,
      revision: detail.revision,
      recallId: detail.id,
    });
  };

  const perform = async (scope, body) => {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError('');

    try {
      const result = await withIdempotency(attempt, scope, body, (key, saved) =>
        scope === 'recall:create'
          ? createRecall(key, saved)
          : recordRecallEvent(positiveId(scope.split(':')[1]), key, saved)
      );

      setDialog(null);
      setNotice('Đã ghi nhận thao tác thu hồi.');

      if (scope === 'recall:create') {
        navigate(`/kho-hang/thu-hoi/${result.id}`);
      } else {
        await loadDetail();
      }

      setRefresh((current) => current + 1);
    } catch (cause) {
      setError(errorMessage(cause));

      if (Number(cause.status || cause.response?.status) === 409 && !attempt.current) {
        setDialog(null);
        await loadDetail();
        setError(errorMessage(cause));
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  const submit = () => {
    if (attempt.current) return perform(attempt.current.scope, attempt.current.body);
    if (!dialog || busy) return;

    try {
      if (!form.confirmed || !form.note.trim()) {
        throw new Error('Nhập nội dung và xác nhận đã đối chiếu.');
      }

      if (dialog.kind === 'create') {
        if (!form.document.trim()) throw new Error('Nhập mã thông báo thu hồi.');

        const serialCodes = form.mode === 'serials' ? splitCodes(form.serials) : [];

        if (form.mode === 'serials' && (!serialCodes.length || serialCodes.length > 500)) {
          throw new Error('Nhập từ 1 đến 500 serial.');
        }

        if (form.mode === 'receipt' && !selectedLine) {
          throw new Error('Chọn dòng nguồn nhận hàng.');
        }

        const nonSerial = form.mode === 'receipt' && !flag(selectedLine.serial_managed);

        if (nonSerial && !form.acceptVariantBlock) {
          throw new Error('Xác nhận phạm vi chặn phiên bản khi đối soát nguồn lô.');
        }

        if (
          nonSerial &&
          (!Number.isSafeInteger(Number(form.quantity)) ||
            Number(form.quantity) < 1 ||
            Number(form.quantity) > Math.min(500, Number(selectedLine.quantity)))
        ) {
          throw new Error('Số thiết bị phải nằm trong số lượng dòng nguồn.');
        }

        return perform('recall:create', {
          purchaseId: positiveId(form.purchaseId),
          serialCodes,
          receiptLineId: form.mode === 'receipt' ? positiveId(form.receiptLineId) : null,
          quantity: nonSerial ? Number(form.quantity) : null,
          acceptVariantBlock: nonSerial && Boolean(form.acceptVariantBlock),
          document: form.document.trim(),
          reason: form.note.trim(),
          deadline: localTime(form.deadline),
          confirmed: true,
        });
      }

      if (!referenceReady) {
        throw new Error('Chưa có phiếu hoàn tất phù hợp. Hãy thực hiện nghiệp vụ liên quan trước.');
      }

      if (needsDocument(form.action) && !form.document.trim()) {
        throw new Error('Nhập mã chứng từ hoặc căn cứ đối soát.');
      }

      return perform(`event:${dialog.recallId}`, {
        revision: Number(dialog.revision),
        action: form.action,
        itemId: dialog.item?.id ?? null,
        deviceId: form.action === 'GAN_THIET_BI' ? positiveId(form.deviceId) : null,
        nccUnitId: ['TRA_NCC', 'DOI_NCC'].includes(form.action) ? positiveId(form.nccUnitId) : null,
        warrantyId: form.action === 'DOI_BAO_HANH' ? positiveId(form.warrantyId) : null,
        document: form.document.trim() || null,
        note: form.note.trim(),
        nextContactAt: localTime(form.nextContactAt),
        sourceVerified: Boolean(form.sourceVerified),
        qualityConfirmed: Boolean(form.qualityConfirmed),
        confirmed: true,
      });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <main className="serial-page recall-page">
      <div className="serial-page__inner">
        <div className="serial-heading-row recall-heading">
          <h1>{recallId ? 'CHI TIẾT THU HỒI' : 'THU HỒI HÀNG'}</h1>

          <div className="recall-actions">
            {recallId && (
              <button
                type="button"
                className="recall-button"
                disabled={frozen}
                onClick={() => navigate('/kho-hang/thu-hoi')}
              >
                Danh sách
              </button>
            )}

            <button
              type="button"
              className="recall-button is-dark"
              disabled={frozen || Boolean(recallId && !detail)}
              onClick={openCreate}
            >
              {recallId ? 'Tạo đợt thu hồi mới' : 'Tạo đợt thu hồi'}
            </button>
          </div>
        </div>

        {error && !dialog && (
          <p className="recall-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="recall-success" role="status">
            {notice}
          </p>
        )}

        {!recallId && (
          <>
            <section className="serial-toolbar">
              <label className="serial-search">
                <input
                  type="search"
                  value={keyword}
                  placeholder="Mã thu hồi / đơn nhập / Nhà Cung Cấp..."
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <FilterDropdown
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="DANG_XU_LY">Đang xử lý</option>
                <option value="HOAN_TAT">Hoàn tất</option>
              </FilterDropdown>
            </section>

            <div className="serial-table-shell">
              <div className="recall-table-scroll">
                <table className="recall-table">
                  <thead>
                    <tr>
                      <th>Đợt thu hồi</th>
                      <th>Nguồn nhập</th>
                      <th>Tiến độ</th>
                      <th>Hạn xử lý</th>
                      <th>Trạng thái</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6}>Đang tải...</td>
                      </tr>
                    ) : !list.items.length ? (
                      <tr>
                        <td colSpan={6}>Chưa có đợt thu hồi phù hợp.</td>
                      </tr>
                    ) : (
                      list.items.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <strong>{record.code}</strong>
                            <small>{record.reason}</small>
                          </td>
                          <td>
                            <Link to={`/kho-hang/nhap-hang/${record.purchase_id}`}>
                              {record.ma_don_nhap}
                            </Link>
                            <small>{record.ten_nha_cung_cap}</small>
                          </td>
                          <td>
                            {record.resolved_items}/{record.total_items}
                          </td>
                          <td>
                            {record.deadline ? formatDateTimeVN(record.deadline) : 'Không đặt hạn'}
                          </td>
                          <td>
                            <span
                              className={`recall-badge ${record.status === 'HOAN_TAT' ? 'is-done' : 'is-active'}`}
                            >
                              {RECALL_STATUS[record.status]}
                            </span>
                          </td>
                          <td>
                            <Link to={`/kho-hang/thu-hoi/${record.id}`}>Xem chi tiết</Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                totalItems={Number(list.totalItems)}
                pageSize={20}
                currentPage={page}
                onPageChange={setPage}
                idPrefix="recalls"
              />
            </div>
          </>
        )}

        {recallId && !detail && loading && <p role="status">Đang tải chi tiết...</p>}

        {recallId && detail && (
          <>
            <section className="serial-info-card recall-case">
              <h2>THÔNG TIN ĐỢT THU HỒI</h2>
              <div className="recall-body">
                <div className="recall-toolbar">
                  <div>
                    <strong>{detail.code}</strong>
                    <p>{detail.reason}</p>
                  </div>
                  <div className="recall-actions">
                    <span
                      className={`recall-badge ${detail.status === 'HOAN_TAT' ? 'is-done' : 'is-active'}`}
                    >
                      {RECALL_STATUS[detail.status]}
                    </span>
                    {detail.status === 'DANG_XU_LY' ? (
                      <button
                        type="button"
                        className="recall-button is-dark"
                        disabled={frozen || !flag(detail.can_close)}
                        onClick={() => openAction('KET_THUC')}
                      >
                        Kết thúc đợt thu hồi
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="recall-button"
                        disabled={frozen}
                        onClick={() => openAction('MO_LAI')}
                      >
                        Mở lại đợt thu hồi
                      </button>
                    )}
                  </div>
                </div>

                <dl className="recall-facts">
                  <div>
                    <dt>Nguồn nhập</dt>
                    <dd>
                      <Link to={`/kho-hang/nhap-hang/${detail.purchase_id}`}>
                        {detail.ma_don_nhap}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Nhà Cung Cấp</dt>
                    <dd>{detail.ten_nha_cung_cap}</dd>
                  </div>
                  <div>
                    <dt>Thông báo thu hồi</dt>
                    <dd>{detail.notice_document}</dd>
                  </div>
                  <div>
                    <dt>Người phụ trách</dt>
                    <dd>{detail.employee_name}</dd>
                  </div>
                  <div>
                    <dt>Hạn xử lý</dt>
                    <dd>{detail.deadline ? formatDateTimeVN(detail.deadline) : 'Không đặt hạn'}</dd>
                  </div>
                  <div>
                    <dt>Đã giải quyết</dt>
                    <dd>
                      {detail.items.filter((item) => item.status === 'DA_GIAI_QUYET').length}/
                      {detail.items.length}
                    </dd>
                  </div>
                </dl>

                {detail.status === 'DANG_XU_LY' && !flag(detail.can_close) && (
                  <p className="recall-muted">Chưa thể kết thúc: {detail.close_blocker}</p>
                )}
              </div>
            </section>

            <section className="serial-info-card recall-case">
              <h2>THIẾT BỊ TRONG PHẠM VI</h2>
              <div className="recall-table-scroll">
                <table className="recall-table">
                  <thead>
                    <tr>
                      <th>Thiết bị / nguồn</th>
                      <th>Vị trí theo sự kiện</th>
                      <th>Đơn bán / liên hệ</th>
                      <th>Kết quả</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.ten_phien_ban}</strong>
                          <small>
                            {item.serial_id ? (
                              <Link to={`/kho-hang/danh-sach-serial/${item.serial_id}`}>
                                {item.so_serial}
                              </Link>
                            ) : (
                              `Theo dõi nội bộ #${item.id} ${item.ma_theo_doi || ''}`
                            )}
                          </small>
                          <small>
                            {item.supplier_lot ? `Lô: ${item.supplier_lot}` : 'Chưa có mã lô'}
                          </small>
                        </td>
                        <td>
                          <Location item={item} />
                        </td>
                        <td>
                          {item.order_id ? (
                            <>
                              <Link to={`/admin/don-hang/danh-sach-don-hang/${item.order_id}`}>
                                {item.ma_don_hang}
                              </Link>
                              <small>
                                {item.ten_nguoi_nhan} · {item.sdt_nguoi_nhan}
                              </small>
                            </>
                          ) : (
                            'Chưa có đơn hiện tại; xem lịch sử serial nếu có'
                          )}
                          {item.next_contact_at && (
                            <small>Hẹn: {formatDateTimeVN(item.next_contact_at)}</small>
                          )}
                        </td>
                        <td>
                          <span
                            className={`recall-badge ${item.status === 'DA_GIAI_QUYET' ? 'is-done' : 'is-pending'}`}
                          >
                            {RECALL_STATUS[item.status]}
                          </span>
                          {item.result && <small>{RECALL_ACTIONS[item.result]}</small>}
                          {item.contact_note && <small>{item.contact_note}</small>}
                        </td>
                        <td>
                          {detail.status === 'DANG_XU_LY' && item.status !== 'DA_GIAI_QUYET' && (
                            <button
                              type="button"
                              className="recall-button"
                              disabled={frozen}
                              onClick={() => openAction(recallDefaultAction(item), item)}
                            >
                              Cập nhật thiết bị
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="serial-info-card recall-case">
              <h2>CHỨNG TỪ VÀ LỊCH SỬ</h2>
              <div className="recall-body">
                {detail.events.map((event) => (
                  <article className="recall-history-line" key={event.id}>
                    <strong>
                      {RECALL_ACTIONS[event.action] || event.action}
                      {event.item_id ? ` · Thiết bị #${event.item_id}` : ''}
                    </strong>
                    <small>
                      {formatDateTimeVN(event.occurred_at)} · {event.actor_name}
                      {event.document ? ` · ${event.document}` : ''}
                    </small>
                    <p>{event.note}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {dialog && (
          <OrderModal
            title={dialog.kind === 'create' ? 'TẠO ĐỢT THU HỒI' : RECALL_ACTIONS[form.action]}
            subtitle={
              currentItem
                ? currentItem.so_serial || currentItem.ma_theo_doi || `Thiết bị #${currentItem.id}`
                : detail?.code
            }
            className="recall-modal"
            showClose
            busy={busy}
            error={error}
            disabled={!attempt.current && (!form.confirmed || !referenceReady)}
            confirmLabel={
              attempt.current
                ? 'Thử lại yêu cầu cũ'
                : dialog.kind === 'create'
                  ? 'Tạo đợt thu hồi'
                  : eventMeta.submit
            }
            close={() => {
              if (!frozen) {
                setDialog(null);
                setError('');
              }
            }}
            submit={submit}
          >
            {attempt.current && (
              <p className="recall-notice">
                Chưa xác định được kết quả. Thử lại cùng yêu cầu đang giữ.
              </p>
            )}

            <fieldset className="recall-fields" disabled={frozen}>
              {dialog.kind === 'create' ? (
                <>
                  <Field label="Tìm đơn nhập hoặc Nhà Cung Cấp" wide>
                    <input
                      value={sourceQuery}
                      onChange={(event) => setSourceQuery(event.target.value)}
                    />
                  </Field>

                  <Field label="Đơn nhập nguồn" wide>
                    <select
                      required
                      value={form.purchaseId}
                      onChange={(event) => {
                        change('purchaseId', event.target.value);
                        change('receiptLineId', '');
                      }}
                    >
                      <option value="">Chọn đơn nhập</option>
                      {sourceOptions.map((purchase) => (
                        <option key={purchase.id} value={purchase.id}>
                          {purchase.ma_don_nhap}
                          {' · '}
                          {purchase.ten_nha_cung_cap}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Phạm vi thu hồi" wide>
                    <select
                      value={form.mode}
                      onChange={(event) => change('mode', event.target.value)}
                    >
                      <option value="serials">Theo danh sách serial</option>
                      <option value="receipt">Theo dòng/lô của nguồn nhận</option>
                    </select>
                  </Field>

                  {form.mode === 'serials' ? (
                    <Field label="Serial thuộc phạm vi, mỗi dòng một mã" wide>
                      <textarea
                        rows={5}
                        required
                        value={form.serials}
                        onChange={(event) => change('serials', event.target.value)}
                      />
                    </Field>
                  ) : (
                    <>
                      <Field label="Dòng nguồn nhận" wide>
                        <select
                          required
                          disabled={sourceLoading || !form.purchaseId || !sourceLines.length}
                          value={form.receiptLineId}
                          onChange={(event) => change('receiptLineId', event.target.value)}
                        >
                          <option value="">
                            {sourceLoading
                              ? 'Đang tải nguồn nhận...'
                              : !form.purchaseId
                                ? 'Chọn đơn nhập nguồn trước'
                                : !sourceLines.length
                                  ? 'Chưa có dữ liệu nguồn nhận để chọn'
                                  : 'Chọn nguồn và phiên bản'}
                          </option>
                          {sourceLines.map((line) => (
                            <option key={line.id} value={line.id}>
                              Nguồn #{line.receiptId}
                              {' · '}
                              {line.ten_phien_ban}
                              {' · '}
                              {line.supplier_lot || 'Chưa có mã lô'}
                              {' · '}
                              {line.quantity} sản phẩm
                            </option>
                          ))}
                        </select>
                      </Field>

                      {selectedLine && !flag(selectedLine.serial_managed) && (
                        <>
                          <Field label="Số thiết bị trong phạm vi">
                            <input
                              type="number"
                              min="1"
                              max={Math.min(500, Number(selectedLine.quantity))}
                              value={form.quantity}
                              onChange={(event) => change('quantity', event.target.value)}
                            />
                          </Field>

                          <Check
                            checked={form.acceptVariantBlock}
                            onChange={(value) => change('acceptVariantBlock', value)}
                          >
                            Tôi xác nhận tạm chặn toàn bộ phiên bản trong lúc đối chiếu nguồn từng
                            thiết bị không serial.
                          </Check>
                        </>
                      )}
                    </>
                  )}

                  {sourceError && <p className="recall-error recall-wide">{sourceError}</p>}

                  <Field label="Mã thông báo thu hồi của Nhà Cung Cấp" wide>
                    <input
                      required
                      maxLength={100}
                      value={form.document}
                      onChange={(event) => change('document', event.target.value)}
                    />
                  </Field>

                  <Field label="Hạn xử lý">
                    <input
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(event) => change('deadline', event.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  {currentItem && (
                    <div className="recall-dialog-summary recall-wide">
                      <strong>{currentItem.ten_phien_ban}</strong>
                      <span>
                        {currentItem.so_serial ||
                          currentItem.ma_theo_doi ||
                          `Thiết bị #${currentItem.id}`}
                      </span>
                    </div>
                  )}

                  {currentItem && (
                    <Field label="Việc cần ghi nhận" wide>
                      <select
                        value={form.action}
                        onChange={(event) => change('action', event.target.value)}
                      >
                        {[
                          {
                            title: 'Theo dõi trao đổi',
                            values: ['LIEN_HE', 'CHO_NHAN_LAI'],
                          },
                          {
                            title: 'Xác định thiết bị',
                            values: ['GAN_THIET_BI'],
                          },
                          {
                            title: 'Liên kết kết quả đã thực hiện',
                            values: ['TRA_NCC', 'DOI_NCC', 'DOI_BAO_HANH'],
                          },
                          {
                            title: 'Xác nhận phạm vi',
                            values: ['LOAI_TRU'],
                          },
                        ].map((group) => {
                          const available = group.values.filter((action) =>
                            actions.includes(action)
                          );

                          return available.length ? (
                            <optgroup key={group.title} label={group.title}>
                              {available.map((action) => (
                                <option key={action} value={action}>
                                  {RECALL_ACTIONS[action]}
                                </option>
                              ))}
                            </optgroup>
                          ) : null;
                        })}
                      </select>
                    </Field>
                  )}

                  {form.action === 'GAN_THIET_BI' && (
                    <Field label="Thiết bị bán đã xác định đúng nguồn" wide>
                      <select
                        required
                        value={form.deviceId}
                        onChange={(event) => change('deviceId', event.target.value)}
                      >
                        <option value="">Chọn mã theo dõi và đơn bán</option>
                        {(detail.device_options || [])
                          .filter(
                            (device) =>
                              Number(device.phien_ban_id) === Number(currentItem.variant_id)
                          )
                          .map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.ma_theo_doi}
                              {' · '}
                              {device.ma_don_hang}
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}

                  {vendorAction && (
                    <div className="recall-wide">
                      {nccOptions.length ? (
                        <Field
                          label={
                            form.action === 'TRA_NCC'
                              ? 'Phiếu trả đã hoàn tất, đúng thiết bị'
                              : 'Phiếu đổi đã hoàn tất, đúng thiết bị'
                          }
                        >
                          <select
                            required
                            value={form.nccUnitId}
                            onChange={(event) => change('nccUnitId', event.target.value)}
                          >
                            <option value="">Chọn phiếu</option>
                            {nccOptions.map((proof) => (
                              <option key={proof.id} value={proof.id}>
                                {proof.code}
                                {' · Sự kiện #'}
                                {proof.event_id}
                                {proof.old_serial ? ` · ${proof.old_serial}` : ''}
                                {proof.new_serial ? ` → ${proof.new_serial}` : ''}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <div className="recall-empty-reference">
                          <strong>
                            Chưa có phiếu {form.action === 'TRA_NCC' ? 'trả' : 'đổi'} hoàn tất khớp
                            thiết bị này.
                          </strong>
                          <p>
                            Thực hiện gửi hàng và chốt kết quả trong hồ sơ Nhà Cung Cấp. Sau khi kết
                            thúc hồ sơ, quay lại đây để liên kết.
                          </p>
                        </div>
                      )}

                      <a
                        className="recall-route-link"
                        href={`/kho-hang/nhap-hang/${detail.purchase_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Mở đơn nhập {detail.ma_don_nhap}
                      </a>
                    </div>
                  )}

                  {form.action === 'DOI_BAO_HANH' && (
                    <div className="recall-wide">
                      {warrantyOptions.length ? (
                        <Field label="Phiếu đổi đã có bằng chứng bàn giao">
                          <select
                            required
                            value={form.warrantyId}
                            onChange={(event) => change('warrantyId', event.target.value)}
                          >
                            <option value="">Chọn phiếu đổi</option>
                            {warrantyOptions.map((ticket) => (
                              <option key={ticket.id} value={ticket.id}>
                                {ticket.ma_phieu}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <div className="recall-empty-reference">
                          Chưa có phiếu đổi hoàn tất và có bằng chứng bàn giao khớp thiết bị này.
                        </div>
                      )}

                      {currentItem?.order_id && (
                        <a
                          className="recall-route-link"
                          href={`/admin/don-hang/danh-sach-don-hang/${currentItem.order_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mở đơn bán {currentItem.ma_don_hang}
                        </a>
                      )}
                    </div>
                  )}

                  {['LIEN_HE', 'CHO_NHAN_LAI'].includes(form.action) && (
                    <Field label="Hẹn liên hệ hoặc nhận lại">
                      <input
                        type="datetime-local"
                        value={form.nextContactAt}
                        onChange={(event) => change('nextContactAt', event.target.value)}
                      />
                    </Field>
                  )}

                  {needsDocument(form.action) &&
                    (!(vendorAction || form.action === 'DOI_BAO_HANH') || referenceReady) && (
                      <Field
                        label={
                          vendorAction || form.action === 'DOI_BAO_HANH'
                            ? 'Chứng từ được liên kết'
                            : form.action === 'LOAI_TRU'
                              ? 'Mã xác nhận cho phép gỡ phạm vi thu hồi'
                              : 'Mã phiếu hoặc biên bản xác định nguồn'
                        }
                        wide
                      >
                        <input
                          required
                          maxLength={100}
                          readOnly={vendorAction || form.action === 'DOI_BAO_HANH'}
                          placeholder={
                            form.action === 'LOAI_TRU'
                              ? 'Mã văn bản, email hoặc biên bản xác nhận thực tế'
                              : ''
                          }
                          value={form.document}
                          onChange={(event) => change('document', event.target.value)}
                        />
                      </Field>
                    )}

                  {form.action === 'KET_THUC' && (
                    <div className="recall-dialog-summary recall-wide">
                      <strong>
                        Đã có kết quả cho {detail.items.length}/{detail.items.length} thiết bị
                      </strong>
                      <p>{form.note}</p>
                    </div>
                  )}
                </>
              )}

              {form.action !== 'KET_THUC' && (
                <Field
                  label={
                    dialog.kind === 'create' ? 'Lý do thu hồi theo thông báo' : eventMeta.noteLabel
                  }
                  wide
                >
                  <textarea
                    required
                    rows={3}
                    maxLength={1000}
                    placeholder={
                      dialog.kind === 'create'
                        ? 'Ghi nội dung ảnh hưởng của sản phẩm hoặc lô hàng.'
                        : eventMeta.placeholder
                    }
                    value={form.note}
                    onChange={(event) => change('note', event.target.value)}
                  />
                </Field>
              )}

              <Check checked={form.confirmed} onChange={(value) => change('confirmed', value)}>
                {confirmationText}
              </Check>
            </fieldset>
          </OrderModal>
        )}
      </div>
    </main>
  );
}
