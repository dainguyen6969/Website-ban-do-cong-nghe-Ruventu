import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  errorMessage,
  formatDateTimeVN,
  parseApiTime,
} from '../../../../shared/services/mutationUtils';
import { flag, getSerialTrace, RECALL_ACTIONS, RECALL_STATUS } from './recallApi';
import './Recall.css';

function position(row) {
  const states = {
    DANG_GUI_NCC: 'Đang gửi Nhà Cung Cấp',
    DA_TRA_NCC: 'Đã trả Nhà Cung Cấp',
    DA_DOI_NCC: 'Thiết bị cũ đã đổi với Nhà Cung Cấp',
    DA_THAY_THE_BAO_HANH: 'Thiết bị cũ đã được thay; đối chiếu phiếu đổi',
    DANG_BAO_HANH: 'Đang xử lý bảo hành; đối chiếu vị trí trong phiếu',
    LOI: 'Kho hàng lỗi',
  };

  if (states[row.trang_thai]) return states[row.trang_thai];
  if (row.packing_order_id) return 'Đang phân bổ đóng gói';
  if (row.don_hang_id && row.ngay_hoan_thanh) {
    return 'Khách đã nhận theo chứng từ';
  }
  if (row.don_hang_id && row.order_status === 'DANG_GIAO_HANG') {
    return 'Đang giao hàng';
  }
  if (row.don_hang_id) return 'Đã gắn đơn bán; đối chiếu bàn giao';
  if (row.trang_thai === 'TRONG_KHO') return 'Trong kho cửa hàng';

  return 'Cần đối chiếu theo lịch sử thiết bị';
}

const PURCHASE_PATH = '/kho-hang/nhap-hang';
const ORDER_PATH = '/admin/don-hang/danh-sach-don-hang';

const RECEIPT_LABELS = {
  NHAP_GOC: 'Nhập kho',
  NHAN_XU_LY_NCC: 'Ghi nguồn hàng nhận từ nhà cung cấp',
  DOI_SOAT_CU: 'Bổ sung thông tin nguồn cũ',
  DOI_SOAT_BO_SUNG: 'Đối soát hàng bổ sung',
};

const SUPPLIER_LABELS = {
  GUI: 'Gửi nhà cung cấp',
  GUI_LAI: 'Gửi lại nhà cung cấp',
  NHAN: 'Nhận thiết bị theo hồ sơ NCC',
  NHAN_BO_SUNG: 'Ghi nhận hàng bổ sung',
  CHOT_TRA: 'Chốt trả nhà cung cấp',
  PHUONG_AN: 'Chốt phương án xử lý',
  DIEU_CHINH_PHUONG_AN: 'Điều chỉnh phương án xử lý',
  CHAP_NHAN_LOI: 'Chấp nhận hàng lỗi',
};

function TraceLink({ path, id, code, label = 'Mở chứng từ' }) {
  const key = String(id ?? '');
  if (!/^[1-9]\d*$/.test(key)) return code || '—';
  return <Link to={`${path}/${key}`}>{code || label}</Link>;
}

function purchaseLink(id, current) {
  if (!id) return null;
  const code = String(id) === String(current.don_nhap_hang_id) ? current.ma_don_nhap : null;
  return <TraceLink path={PURCHASE_PATH} id={id} code={code} label="Mở đơn nhập" />;
}

const TRACE_TABS = [
  ['receipts', 'Nguồn nhận'],
  ['devices', 'Đơn bán và nhận lại'],
  ['warranty', 'Đổi thiết bị và bảo hành'],
  ['supplierEvents', 'Lịch sử nhà cung cấp'],
  ['recalls', 'Các đợt thu hồi'],
];

function traceDate(value, label) {
  if (!parseApiTime(value)) return null;
  return label ? `${label}: ${formatDateTimeVN(value)}` : formatDateTimeVN(value);
}

function buildTraceGroups(data, current) {
  const devices = data.devices ?? [];
  const orders = devices.map((row) => {
    const received = traceDate(row.ngay_nhan_hang, 'Nhận hàng');

    return {
      key: row.id,
      title: (
        <TraceLink path={ORDER_PATH} id={row.order_id} code={row.ma_don_hang} label="Mở đơn bán" />
      ),
      hint: row.ma_theo_doi ? `Mã theo dõi: ${row.ma_theo_doi}` : null,
      date: traceDate(row.ngay_hoan_thanh, 'Hoàn tất đơn'),
      related:
        row.return_id || row.ma_tra_hang ? (
          <>
            Phiếu nhận lại:{' '}
            <TraceLink
              path="/admin/don-hang/khach-tra-hang"
              id={row.return_id}
              code={row.ma_tra_hang}
              label="Mở phiếu nhận lại"
            />
            {received && ` · ${received}`}
          </>
        ) : null,
      fields: [
        ['Người nhận', row.ten_nguoi_nhan],
        ['Điện thoại', row.sdt_nguoi_nhan],
      ],
    };
  });

  if (
    current.don_hang_id &&
    !devices.some((row) => String(row.order_id) === String(current.don_hang_id))
  ) {
    orders.push({
      key: 'linked-order',
      title: (
        <TraceLink
          path={ORDER_PATH}
          id={current.don_hang_id}
          code={current.sold_order_code}
          label="Mở đơn bán"
        />
      ),
      date: traceDate(current.ngay_hoan_thanh, 'Hoàn tất đơn'),
    });
  }

  return {
    receipts: (data.receipts ?? []).map((row) => ({
      key: `${row.id}-${row.receipt_line_id}`,
      title: RECEIPT_LABELS[row.source_kind] || 'Ghi nhận nguồn',
      date: traceDate(row.recorded_at, 'Ghi nhận'),
      facts: [
        ['Đơn nhập', purchaseLink(row.purchase_id, current) || 'Chưa xác định'],
        ['Mã lô', row.supplier_lot || 'Chưa ghi mã lô'],
        ['Chứng từ NCC', row.supplier_document || 'Chưa có'],
      ],
      fields: [
        ['Người ghi nhận', row.actor_name],
        ['Mã tham chiếu nguồn', !row.supplier_document && row.id ? `#${row.id}` : null],
        ['Ghi chú', row.note, true],
      ],
    })),
    devices: orders,
    warranty: (data.warranty ?? []).map((row) => ({
      key: row.id,
      title: (
        <TraceLink
          path="/admin/bao-hanh/chi-tiet"
          id={row.id}
          code={row.ma_phieu}
          label="Mở phiếu bảo hành"
        />
      ),
      hint: row.trang_thai_xu_ly === 'HOAN_TAT' ? 'Phiếu đã hoàn tất' : 'Phiếu đang xử lý',
      date: traceDate(row.ngay_tiep_nhan, 'Tiếp nhận'),
      fields: [
        ['Thiết bị gốc', row.old_serial || row.old_device],
        ['Thiết bị thay thế', row.new_serial || row.new_device],
      ],
    })),
    supplierEvents: (data.supplierEvents ?? []).map((row) => {
      const swapped = row.old_serial && row.new_serial && row.old_serial !== row.new_serial;

      return {
        key: row.id,
        title:
          row.action === 'NHAN' && swapped
            ? 'Nhận hàng đổi từ nhà cung cấp'
            : SUPPLIER_LABELS[row.action] || 'Xử lý với nhà cung cấp',
        hint: row.code ? `Hồ sơ NCC: ${row.code}` : null,
        date: traceDate(row.occurred_at),
        related: purchaseLink(row.source_po_id, current),
        fields: [
          ['Chứng từ NCC', row.document],
          ['Ghi chú', row.note],
          ['Đổi serial', swapped ? `${row.old_serial} → ${row.new_serial}` : null],
        ],
      };
    }),
    recalls: (data.recalls ?? []).map((row) => ({
      key: row.id,
      title: (
        <TraceLink
          path="/kho-hang/thu-hoi"
          id={row.recall_id}
          code={row.code}
          label="Mở đợt thu hồi"
        />
      ),
      hint: [RECALL_STATUS[row.status], RECALL_ACTIONS[row.result] || row.result]
        .filter(Boolean)
        .join(' · '),
      fields: [
        ['Lý do', row.reason],
        ['Chứng từ thu hồi', row.notice_document],
        ['Ghi chú liên hệ', row.contact_note],
        ['Hẹn liên hệ', traceDate(row.next_contact_at)],
      ],
    })),
  };
}

function TraceFacts({ items }) {
  return (
    <dl className="serial-trace-facts">
      {items.map(([label, value, fullWidth]) => (
        <div key={label} className={fullWidth ? 'serial-trace-fact--wide' : undefined}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TraceRows({ rows }) {
  if (!rows.length) {
    return <p className="serial-trace-empty recall-muted">Chưa có hồ sơ trong nhóm này.</p>;
  }

  return (
    <ul className="serial-trace-rows">
      {rows.map((row) => {
        const fields = (row.fields ?? []).filter(
          ([, value]) => value != null && value !== '' && value !== false
        );

        return (
          <li className="serial-trace-row" key={row.key}>
            <div className="serial-trace-row-head">
              <div>
                <strong>{row.title}</strong>
                {row.hint && <small>{row.hint}</small>}
                {row.related && <small>{row.related}</small>}
              </div>
              {row.date && <small>{row.date}</small>}
            </div>

            {row.facts?.length > 0 && <TraceFacts items={row.facts} />}

            {fields.length > 0 && (
              <details className="serial-trace-record-details">
                <summary>Thông tin bổ sung</summary>
                <TraceFacts items={fields} />
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TraceContent({ data }) {
  const [tab, setTab] = useState('receipts');
  const current = data.current ?? {};
  const groups = buildTraceGroups(data, current);
  const blocked = flag(current.bi_thu_hoi);
  const original = (data.receipts ?? []).find(
    (row) =>
      row.source_kind === 'NHAP_GOC' &&
      current.don_nhap_hang_id &&
      String(row.purchase_id) === String(current.don_nhap_hang_id) &&
      parseApiTime(row.recorded_at)
  );

  return (
    <>
      <dl className="serial-trace-summary">
        <div>
          <dt>Đơn nhập</dt>
          <dd>
            {purchaseLink(current.don_nhap_hang_id, current) ||
              current.ma_don_nhap ||
              'Chưa có đơn nhập'}

            {flag(data.sourceNeedsVerification) && (
              <span className="serial-trace-source-status">
                <strong>Cần đối chiếu nguồn</strong>
                <small>Chưa đủ thông tin lần nhận hoặc chứng từ giao của nhà cung cấp.</small>
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Nhà cung cấp</dt>
          <dd>{current.ten_nha_cung_cap || 'Chưa xác định'}</dd>
        </div>
        <div>
          <dt>Lần nhập gốc</dt>
          <dd>{traceDate(original?.recorded_at) || 'Chưa có mốc nhập gốc'}</dd>
        </div>
        <div>
          <dt>Vị trí theo hồ sơ</dt>
          <dd>
            {position(current)}
            {current.packing_order_id && (
              <small>
                Đóng gói:{' '}
                <TraceLink
                  path={ORDER_PATH}
                  id={current.packing_order_id}
                  code={current.packing_order_code}
                  label="Mở đơn đóng gói"
                />
              </small>
            )}
            {current.export_status === 'DA_XUAT_KHO' && <small>Đơn bán đã xuất kho</small>}
            <small>
              {blocked ? (
                <span data-admin-status="red">Chặn bán và bàn giao</span>
              ) : (
                'Không chặn bán do thu hồi'
              )}
            </small>
          </dd>
        </div>
      </dl>

      <div className="serial-trace-tabs" role="group" aria-label="Nhóm truy vết">
        {TRACE_TABS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
            {label} <span className="serial-trace-count">{groups[key].length}</span>
          </button>
        ))}
      </div>

      <TraceRows key={tab} rows={groups[tab]} />
    </>
  );
}

export default function SerialTracePanel({ serialId, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getSerialTrace(serialId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(cause));
        }
      });

    return () => controller.abort();
  }, [serialId, refreshKey, retry]);

  return (
    <section className="recall-trace serial-trace-panel">
      <h2>NGUỒN NHẬP VÀ TRUY VẾT</h2>

      <div className="recall-body">
        {error && (
          <p className="recall-error" role="alert">
            {error}{' '}
            <button
              type="button"
              className="recall-link-button"
              onClick={() => setRetry((current) => current + 1)}
            >
              Thử lại
            </button>
          </p>
        )}

        {!data && !error && <p role="status">Đang tải truy vết...</p>}

        {data && <TraceContent data={data} />}
      </div>
    </section>
  );
}
