import { useCallback, useEffect, useRef, useState } from 'react';
import OrderModal from '../../orders/components/OrderModal';
import { PurchaseCard } from '../pages/PurchaseShared';
import { getSupplierCases, openSupplierCase, sendSupplierCaseEvent } from '../api/purchaseOrderApi';
import {
  errorMessage,
  formatDateTimeVN,
  inputFromApiTime,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import './SupplierCasePanel.css';

const ACTIONS = {
  OPEN: 'Tạo hồ sơ',
  MO_HO_SO: 'Tạo hồ sơ',
  GUI: 'Gửi hàng cho Nhà Cung Cấp',
  PHUONG_AN: 'Chốt phương án',
  NHAN: 'Nhận hàng từ Nhà Cung Cấp',
  GUI_LAI: 'Gửi lại hàng còn lỗi',
  CHOT_TRA: 'Xác nhận Nhà Cung Cấp nhận trả',
  CHAP_NHAN_LOI: 'Chấp nhận giữ hàng lỗi',
  NHAN_BO_SUNG: 'Nhận mua bổ sung',
  PHI: 'Điều chỉnh phí',
  THU_TIEN: 'Ghi nhận tiền Nhà Cung Cấp hoàn',
  CHI_TIEN: 'Ghi nhận tiền trả Nhà Cung Cấp',
  THEO_DOI: 'Phụ trách và hạn xử lý',
  GHI_CHU: 'Ghi nhận đối soát',
  KET_THUC: 'Kết thúc hồ sơ',
  MO_LAI: 'Mở lại hồ sơ',
};

const STATES = {
  DANG_O_NCC: 'Đang ở NCC',
  DA_NHAN_LOI: 'Nhận lại còn lỗi',
  DA_NHAN_DAT: 'Đã nhận đạt',
  DA_TRA_NCC: 'Đã trả NCC',
  CHAP_NHAN_LOI: 'Đã đối soát hàng lỗi',
  DANG_XU_LY: 'Đang xử lý',
  HOAN_TAT: 'Hoàn tất',
  KET_THUC_DOI_SOAT: 'Kết thúc có đối soát',
};

const CONDITIONS = {
  CHUA_XAC_DINH: 'Chưa xác định',
  MOI: 'Mới',
  DA_SUA_CHUA: 'Đã sửa chữa',
  DA_QUA_SU_DUNG: 'Đã qua sử dụng',
};

const METHODS = {
  SUA_CHUA: 'Sửa chữa',
  DOI_HANG: 'Đổi hàng',
  TRA_HANG: 'Trả hàng',
};

const NCC_PURPOSES = {
  GUI_HANG_XU_LY: 'Gửi hàng xử lý',
  NHAN_MUA_BO_SUNG: 'Nhận mua bổ sung',
  LEGACY: 'Hồ sơ cũ — tổng hợp',
};

const NCC_DOCUMENT_LABELS = {
  GUI: 'Mã phiếu giao hàng cho Nhà Cung Cấp',
  PHUONG_AN: 'Mã thỏa thuận xử lý',
  NHAN: 'Mã phiếu nhận hàng',
  GUI_LAI: 'Mã phiếu gửi lại hàng',
  CHOT_TRA: 'Mã xác nhận nhận trả hàng',
  NHAN_BO_SUNG: 'Mã thỏa thuận mua bổ sung',
  PHI: 'Mã thỏa thuận điều chỉnh phí',
  THU_TIEN: 'Mã chứng từ nhận tiền',
  CHI_TIEN: 'Mã chứng từ chi tiền',
};

const bool = (value) => value === true || value === 1 || value === '1';

const cash = (value) =>
  value == null
    ? '—'
    : `${Number(value).toLocaleString('vi-VN', {
        maximumFractionDigits: 2,
      })} đ`;

const codes = (value = '') =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const optionalId = (value) => (value ? Number(value) : null);

function deadlineValue(value) {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Hạn xử lý không hợp lệ.');
  }

  return `${value}:00+07:00`;
}

const NCC_HELP = {
  OPEN: {
    title: 'Tạo hồ sơ',
    text: 'Chọn một mục đích cho hồ sơ. Tạo hồ sơ chưa làm thay đổi tồn kho hoặc tiền.',
    confirm: 'TẠO HỒ SƠ',
  },
  GUI: {
    title: 'Gửi hàng cho Nhà Cung Cấp',
    text: 'Chỉ xác nhận khi đã giao hàng thực tế. Hệ thống đưa lượng hàng tương ứng ra khỏi kho.',
    confirm: 'XÁC NHẬN ĐÃ GỬI HÀNG',
  },
  PHUONG_AN: {
    title: 'Chốt phương án',
    text: 'Ghi phương án và giá trị đã thống nhất. Chốt phương án chưa tạo phiếu thu hoặc phiếu chi.',
    confirm: 'LƯU PHƯƠNG ÁN',
  },
  NHAN: {
    title: 'Nhận hàng từ Nhà Cung Cấp',
    text: 'Đối chiếu phiên bản, serial và kết quả kiểm tra thực tế trước khi xác nhận.',
    confirm: 'XÁC NHẬN ĐÃ NHẬN HÀNG',
  },
  GUI_LAI: {
    title: 'Gửi lại hàng còn lỗi',
    text: 'Gửi lại đúng thiết bị vừa nhận nhưng chưa đạt. Hàng được lấy ra khỏi kho lỗi.',
    confirm: 'XÁC NHẬN ĐÃ GỬI LẠI',
  },
  CHOT_TRA: {
    title: 'Xác nhận Nhà Cung Cấp nhận trả',
    text: 'Ghi nhận trả hẳn theo giá trị đã thỏa thuận. Hàng đã được đưa ra khỏi kho ở lần gửi.',
    confirm: 'XÁC NHẬN ĐÃ NHẬN TRẢ',
  },
  CHAP_NHAN_LOI: {
    title: 'Chấp nhận giữ hàng lỗi',
    text: 'Thiết bị vẫn nằm trong hàng lỗi và không tăng tồn có thể bán. Ghi rõ căn cứ chấp nhận.',
    confirm: 'XÁC NHẬN GIỮ HÀNG LỖI',
  },
  NHAN_BO_SUNG: {
    title: 'Nhận mua bổ sung',
    text: 'Dùng cho phần giao thêm đã thống nhất mua. Giá nhập bổ sung là giá gồm thuế cho mỗi sản phẩm.',
    confirm: 'XÁC NHẬN NHẬN BỔ SUNG',
  },
  PHI: {
    title: 'Điều chỉnh phí',
    text: 'Số dương tăng phí, số âm giảm phần phí đã chốt. Tiền thực tế được ghi nhận riêng.',
    confirm: 'LƯU ĐIỀU CHỈNH PHÍ',
  },
  CHI_TIEN: {
    title: 'Ghi nhận tiền trả Nhà Cung Cấp',
    text: 'Chỉ ghi nhận số tiền cửa hàng đã thực sự trả. Khoản tiền thuộc công nợ chung của đơn nhập.',
    confirm: 'XÁC NHẬN ĐÃ CHI TIỀN',
  },
  THU_TIEN: {
    title: 'Ghi nhận tiền Nhà Cung Cấp hoàn',
    text: 'Chỉ ghi nhận số tiền cửa hàng đã thực sự nhận lại trong khoản còn phải hoàn.',
    confirm: 'XÁC NHẬN ĐÃ NHẬN TIỀN',
  },
  THEO_DOI: {
    title: 'Phụ trách và hạn xử lý',
    text: 'Cập nhật người phụ trách và hạn xử lý. Không làm thay đổi hàng hoặc tiền.',
    confirm: 'LƯU PHÂN CÔNG',
  },
  GHI_CHU: {
    title: 'Ghi nhận đối soát',
    text: 'Lưu phản hồi, sai lệch hoặc nội dung trao đổi. Không tự phát sinh giao nhận.',
    confirm: 'LƯU NỘI DUNG',
  },
  KET_THUC: {
    title: 'Kết thúc hồ sơ',
    text: 'Đóng hồ sơ khi đã xử lý xong hàng và đáp ứng điều kiện đối chiếu tiền. Lịch sử được giữ nguyên.',
    confirm: 'KẾT THÚC HỒ SƠ',
  },
  MO_LAI: {
    title: 'Mở lại hồ sơ',
    text: 'Ghi rõ lý do cần xử lý tiếp. Không được mở lại khi đang có hồ sơ xung đột.',
    confirm: 'MỞ LẠI HỒ SƠ',
  },
};

const NCC_UNIT_TONES = {
  DANG_O_NCC: 'blue',
  DA_NHAN_LOI: 'red',
  DA_NHAN_DAT: 'green',
  DA_TRA_NCC: 'green',
  CHAP_NHAN_LOI: 'amber',
};

const NCC_PAYMENT_LABELS = {
  TIEN_MAT: 'Tiền mặt',
  CHUYEN_KHOAN: 'Chuyển khoản',
  THE: 'Thẻ',
};

const nccSignedCash = (value) =>
  value == null ? '—' : `${Number(value) > 0 ? '+' : ''}${cash(value)}`;

function nccPayload(value) {
  try {
    let result = value;

    for (let index = 0; index < 2 && typeof result === 'string'; index += 1) {
      result = JSON.parse(result);
    }

    return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
  } catch {
    return null;
  }
}

function nccCaseState(record) {
  if (record.status === 'HOAN_TAT') {
    return { tone: 'green', label: 'Hoàn tất' };
  }

  if (record.status === 'KET_THUC_DOI_SOAT') {
    return { tone: 'amber', label: 'Kết thúc có đối soát' };
  }

  const units = record.units ?? [];

  if (units.some((item) => item.status === 'DA_NHAN_LOI')) {
    return { tone: 'red', label: 'Còn hàng lỗi cần xử lý' };
  }

  if (units.some((item) => item.status === 'DANG_O_NCC' && !bool(item.planned))) {
    return { tone: 'amber', label: 'Chờ chốt phương án' };
  }

  if (units.some((item) => item.status === 'DANG_O_NCC')) {
    return { tone: 'blue', label: 'Chờ NCC xử lý' };
  }

  if (bool(record.can_close)) {
    return { tone: 'green', label: 'Có thể kết thúc' };
  }

  return { tone: 'blue', label: 'Đang xử lý' };
}

function NccEvidence({ event, data }) {
  const payload = nccPayload(event.payload);
  const rows = [];

  const add = (label, value) => {
    if (value !== null && value !== undefined && value !== '') {
      rows.push([label, String(value)]);
    }
  };

  const variantName = (id) => {
    const item = data?.variants?.find((variant) => Number(variant.id) === Number(id));

    return item?.ten_phien_ban || item?.ten_san_pham || (id ? `Phiên bản #${id}` : null);
  };

  const employeeName = (id) =>
    data?.employees?.find((employee) => Number(employee.id) === Number(id))?.name ||
    (id ? `Nhân viên #${id}` : event.actor_name);

  if (payload) {
    if (['MO_HO_SO', 'THEO_DOI'].includes(event.action)) {
      add('Người phụ trách đã chọn', employeeName(payload.employeeId));
      add(
        'Hạn xử lý đã chọn',
        payload.deadline ? formatDateTimeVN(payload.deadline) : 'Không đặt hạn'
      );
    }

    if (['GUI', 'PHUONG_AN'].includes(event.action)) {
      add('Mục đích / phương án', METHODS[payload.method]);
    }

    if (event.action === 'GUI') {
      add('Số lượng trong lần gửi', payload.quantity);

      if (payload.previousUnitId) {
        add('Tiếp nối lượt xử lý', `Thiết bị #${payload.previousUnitId}`);
      }
    }

    if (event.action === 'PHUONG_AN') {
      if (payload.method === 'DOI_HANG') {
        add('Phiên bản đã thống nhất nhận', variantName(payload.variantId));
        add('Giá trị Nhà Cung Cấp chấp nhận cho hàng gửi', cash(payload.credit));
        add('Giá trị hàng đổi sẽ nhận', cash(payload.value));
      }

      if (payload.method === 'TRA_HANG') {
        add('Giá trị Nhà Cung Cấp chấp nhận nhận trả', cash(payload.credit));
      }
    }

    if (event.action === 'NHAN') {
      add('Phiên bản thực nhận', variantName(payload.variantId));
      add('Hình thức hàng nhận', CONDITIONS[payload.condition]);
      add(
        'Kết quả kiểm tra',
        bool(payload.passed) ? 'Đạt — đưa vào tồn có thể bán' : 'Chưa đạt — đưa vào hàng lỗi'
      );
    }

    if (event.action === 'NHAN_BO_SUNG') {
      add(
        'Cách ghi nhận',
        bool(payload.alreadyInStock)
          ? 'Chốt mua hàng thừa đã có trong kho'
          : 'Nhận bổ sung mới vào kho'
      );

      add('Số lượng trong lần bổ sung', payload.quantity);

      if (!bool(payload.alreadyInStock)) {
        add('Hình thức hàng nhận', CONDITIONS[payload.condition]);
        add(
          'Kết quả kiểm tra',
          bool(payload.passed) ? 'Đạt — đưa vào tồn có thể bán' : 'Chưa đạt — đưa vào hàng lỗi'
        );
      }
    }

    if (['THU_TIEN', 'CHI_TIEN'].includes(event.action)) {
      add('Số tiền thực tế', cash(event.cash_amount ?? payload.amount));
      add('Phương thức', NCC_PAYMENT_LABELS[event.cash_method ?? payload.paymentMethod]);
      add('Mã giao dịch', payload.transactionId);
    }
  }

  if (event.adjustment_kind === 'SWAP') {
    add('Giá trị tham chiếu hàng gửi', cash(event.old_value));
    add('Giá trị NCC chấp nhận cho hàng gửi', cash(event.settled_credit));
    add('Giá trị hàng đổi đã nhận', cash(event.new_value));
  }

  if (event.adjustment_kind === 'RETURN') {
    add('Giá trị NCC chấp nhận nhận trả', cash(event.settled_credit));
  }

  if (event.adjustment_kind === 'EXTRA') {
    add('Giá trị sản phẩm bổ sung trong sự kiện này', cash(event.new_value));
  }

  if (event.adjustment_kind === 'FEE') {
    add('Phí tăng / giảm đã ghi nhận', nccSignedCash(event.service_fee));
  }

  if (event.adjustment_kind) {
    add('Tăng / giảm nghĩa vụ thanh toán', nccSignedCash(event.delta));
  }

  if (!rows.length) {
    return (
      <p className="ncc-muted">
        Nội dung xác nhận được thể hiện bằng chứng từ và ghi chú của sự kiện.
      </p>
    );
  }

  return (
    <dl className="ncc-evidence">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function NccHistory({ record, data }) {
  const [limit, setLimit] = useState(6);
  const events = [...(record.events ?? [])].reverse();

  return (
    <details className="ncc-history">
      <summary>
        Chứng từ và lịch sử
        <span className="ncc-count">{events.length}</span>
      </summary>

      {!events.length && <p className="ncc-muted">Chưa có sự kiện được ghi nhận.</p>}

      <ol className="ncc-timeline">
        {events.slice(0, limit).map((event) => (
          <li key={event.id}>
            <article className="ncc-event">
              <header>
                <div>
                  <strong>{ACTIONS[event.action] || 'CẬP NHẬT HỒ SƠ'}</strong>
                  <small>
                    {formatDateTimeVN(event.occurred_at)}
                    {' · '}
                    {event.actor_name}
                    {event.unit_id ? ` · Thiết bị #${event.unit_id}` : ''}
                  </small>
                </div>
              </header>

              <div className="ncc-document">
                <span>
                  {String(event.document || '').startsWith('NB-HS-')
                    ? 'Mã ghi nhận nội bộ'
                    : 'Mã tham chiếu'}
                </span>
                <strong>{event.document || 'Không có mã'}</strong>
              </div>

              {(event.old_serial || event.new_serial) && (
                <div className="ncc-serial-chain">
                  {event.old_serial && event.new_serial && event.old_serial !== event.new_serial ? (
                    <>
                      <code>{event.old_serial}</code>
                      <span aria-label="đổi sang">→</span>
                      <code>{event.new_serial}</code>
                    </>
                  ) : (
                    <>
                      <span>Serial</span>
                      <code>{event.new_serial || event.old_serial}</code>
                    </>
                  )}
                </div>
              )}

              {event.note && <p className="ncc-event__note">{event.note}</p>}

              {(event.voucher_code || event.voucher_id) && (
                <p className="ncc-voucher">
                  Phiếu tiền: <strong>{event.voucher_code || `#${event.voucher_id}`}</strong>
                </p>
              )}

              <details className="ncc-proof">
                <summary>Nội dung đã xác nhận</summary>
                <NccEvidence event={event} data={data} />
              </details>
            </article>
          </li>
        ))}
      </ol>

      {events.length > limit && (
        <button type="button" className="ncc-btn" onClick={() => setLimit((value) => value + 6)}>
          XEM THÊM {Math.min(6, events.length - limit)} SỰ KIỆN
        </button>
      )}
    </details>
  );
}

function NccUnitCard({ item, record, renderButton, onOpen }) {
  const historical = bool(item.has_child);
  const active = record.status === 'DANG_XU_LY' && !historical;
  const outside = item.status === 'DANG_O_NCC';
  const planned = bool(item.planned);
  const tone = historical ? 'neutral' : NCC_UNIT_TONES[item.status] || 'neutral';

  return (
    <article className={`ncc-unit ncc-unit--${tone}`}>
      <header className="ncc-unit__header">
        <div>
          <small>
            Thiết bị #{item.id}
            {item.parent_id ? ` · Tiếp nối #${item.parent_id}` : ''}
          </small>

          <h4>{item.variant_name}</h4>

          <div className="ncc-unit__serial">
            {item.so_serial ? <code>{item.so_serial}</code> : <span>Không quản lý serial</span>}
          </div>
        </div>

        <span className={`ncc-badge ncc-badge--${tone}`}>
          {historical ? 'Đã chuyển sang lượt tiếp theo' : STATES[item.status]}
        </span>
      </header>

      <dl className="ncc-unit__facts">
        <div>
          <dt>Phương án</dt>
          <dd>{METHODS[item.method]}</dd>
        </div>
        <div>
          <dt>Tình trạng hàng</dt>
          <dd>{CONDITIONS[item.condition_code] || 'Chưa xác định'}</dd>
        </div>
        <div>
          <dt>Nguồn hàng</dt>
          <dd>{item.origin === 'ORIGINAL' ? 'Đơn nhập gốc' : 'Mua bổ sung'}</dd>
        </div>
      </dl>

      {outside && planned && (
        <div className="ncc-agreement">
          <strong>Phương án đã chốt</strong>
          <p>
            {item.method === 'DOI_HANG'
              ? `Nhận đổi: ${item.expected_variant_name}`
              : item.method === 'TRA_HANG'
                ? 'Trả hẳn cho Nhà Cung Cấp'
                : 'Sửa chữa và nhận lại thiết bị đã gửi'}
          </p>

          {item.method !== 'SUA_CHUA' && (
            <div>
              <span>
                Giá trị hàng gửi được chấp nhận: <b>{cash(item.credit)}</b>
              </span>

              {item.method === 'DOI_HANG' && (
                <span>
                  Giá trị hàng đổi: <b>{cash(item.receive_value)}</b>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {active && (
        <div className="ncc-unit__actions">
          {outside &&
            !planned &&
            renderButton(
              'Chốt phương án',
              () => onOpen('PHUONG_AN', record, item),
              false,
              'primary'
            )}

          {outside &&
            planned &&
            item.method !== 'TRA_HANG' &&
            renderButton(
              item.method === 'DOI_HANG' ? 'Nhận hàng đổi' : 'Nhận lại hàng sửa',
              () => onOpen('NHAN', record, item),
              false,
              'primary'
            )}

          {outside && planned && item.method === 'TRA_HANG' && (
            <>
              {renderButton(
                'Xác nhận Nhà Cung Cấp nhận trả',
                () => onOpen('CHOT_TRA', record, item),
                false,
                'primary'
              )}
              {renderButton('Nhận lại hàng bị từ chối', () => onOpen('NHAN', record, item))}
            </>
          )}

          {outside &&
            planned &&
            renderButton('Sửa phương án', () => onOpen('PHUONG_AN', record, item))}

          {item.status === 'DA_NHAN_LOI' && (
            <>
              {renderButton(
                'Gửi Nhà Cung Cấp xử lý lại',
                () => onOpen('GUI_LAI', record, item),
                false,
                'primary'
              )}
              {renderButton(
                'Chấp nhận giữ hàng lỗi',
                () => onOpen('CHAP_NHAN_LOI', record, item),
                false,
                'warning'
              )}
            </>
          )}

          {['DA_NHAN_DAT', 'CHAP_NHAN_LOI'].includes(item.status) &&
            renderButton('Gửi xử lý tiếp thiết bị này', () => onOpen('GUI', record, item, true))}
        </div>
      )}
    </article>
  );
}

function NccCaseView({ record, data, renderButton, onOpen }) {
  const [tab, setTab] = useState('units');

  const active = record.status === 'DANG_XU_LY';
  const units = record.units ?? [];
  const current = units.filter((item) => !bool(item.has_child));
  const previous = units.filter((item) => bool(item.has_child));
  const state = nccCaseState(record);

  const canSend = record.purpose !== 'NHAN_MUA_BO_SUNG';
  const canReceiveExtra = record.purpose !== 'GUI_HANG_XU_LY';

  const overdue = active && record.deadline && new Date(record.deadline).getTime() < Date.now();

  return (
    <article className="ncc-case" id={`ncc-case-${record.id}`}>
      <header className="ncc-case__header">
        <div className="ncc-case__identity">
          <small>
            Hồ sơ #{record.id}
            {' · '}
            {NCC_PURPOSES[record.purpose] || 'Hồ sơ cũ'}
          </small>
          <h4>{record.reason}</h4>
          <p className="ncc-case__code">{record.code}</p>
        </div>

        <div className="ncc-case__header-actions">
          <span className={`ncc-badge ncc-badge--${state.tone}`}>{state.label}</span>

          {active
            ? renderButton(
                'KẾT THÚC HỒ SƠ',
                () => onOpen('KET_THUC', record),
                !bool(record.can_close),
                'dark',
                record.close_blocker
              )
            : renderButton(
                'MỞ LẠI HỒ SƠ',
                () => onOpen('MO_LAI', record),
                !bool(record.can_reopen),
                'dark',
                record.reopen_blocker
              )}
        </div>
      </header>

      <div className="ncc-case__meta">
        <span>
          Phụ trách: <strong>{record.employee_name}</strong>
        </span>
        <span>
          Hạn xử lý:{' '}
          <strong>{record.deadline ? formatDateTimeVN(record.deadline) : 'Không đặt hạn'}</strong>
        </span>
        <span>
          Điều chỉnh: <strong>{nccSignedCash(record.adjustment)}</strong>
        </span>
        {overdue && <span className="ncc-badge ncc-badge--red">Quá hạn</span>}
      </div>

      {active && record.close_blocker && (
        <p className="ncc-blocker" role="status">
          Chưa thể kết thúc: {record.close_blocker}
        </p>
      )}

      {!active && record.reopen_blocker && (
        <p className="ncc-blocker" role="status">
          Chưa thể mở lại: {record.reopen_blocker}
        </p>
      )}

      <div className="ncc-tabs" role="group" aria-label="Nội dung hồ sơ">
        {[
          ['units', `Thiết bị (${current.length})`],
          ['history', 'Chứng từ và lịch sử'],
          ['manage', 'Tiền và quản lý hồ sơ'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? 'is-active' : ''}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'units' && (
        <div className="ncc-tab-body">
          {active && (
            <div className="ncc-section-actions">
              {canSend &&
                renderButton('Gửi hàng đang có', () => onOpen('GUI', record), false, 'primary')}

              {canReceiveExtra &&
                renderButton(
                  'Nhận mua bổ sung',
                  () => onOpen('NHAN_BO_SUNG', record),
                  false,
                  'primary'
                )}
            </div>
          )}

          <div className="ncc-unit-list">
            {current.map((item) => (
              <NccUnitCard
                key={item.id}
                item={item}
                record={record}
                renderButton={renderButton}
                onOpen={onOpen}
              />
            ))}

            {!units.length && <p className="ncc-empty">Chưa có thiết bị.</p>}

            {previous.length > 0 && (
              <details className="ncc-previous">
                <summary>Các lượt xử lý trước ({previous.length})</summary>

                {previous.map((item) => (
                  <NccUnitCard
                    key={item.id}
                    item={item}
                    record={record}
                    renderButton={renderButton}
                    onOpen={onOpen}
                  />
                ))}
              </details>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="ncc-tab-body">
          <NccHistory record={record} data={data} />
        </div>
      )}

      {tab === 'manage' && (
        <div className="ncc-tab-body">
          {active && (
            <>
              <section className="ncc-management-section">
                <h5>Tiền theo đơn nhập</h5>
                <p className="ncc-muted">
                  Các khoản tiền được đối chiếu chung theo đơn nhập, không tách công nợ riêng cho hồ
                  sơ.
                </p>

                <div className="ncc-section-actions">
                  {bool(data.balance.canPay) &&
                    renderButton(
                      'Đã trả tiền cho Nhà Cung Cấp',
                      () => onOpen('CHI_TIEN', record),
                      false,
                      'dark'
                    )}

                  {bool(data.balance.canRefund) &&
                    renderButton(
                      'Đã nhận tiền Nhà Cung Cấp hoàn',
                      () => onOpen('THU_TIEN', record),
                      false,
                      'dark'
                    )}

                  {renderButton('Điều chỉnh phí', () => onOpen('PHI', record))}
                </div>
              </section>

              <section className="ncc-management-section">
                <h5>Phụ trách hồ sơ</h5>
                {renderButton('Phụ trách và hạn xử lý', () => onOpen('THEO_DOI', record))}
              </section>
            </>
          )}

          <section className="ncc-management-section">
            <h5>Nội dung đối soát</h5>
            {renderButton('Ghi nhận đối soát', () => onOpen('GHI_CHU', record))}
          </section>
        </div>
      )}
    </article>
  );
}

function NccWorkspace({
  order,
  data,
  loading,
  readError,
  operationError,
  notice,
  hasDialog,
  onRetry,
  onOpen,
  renderButton,
  selectedCaseId,
  onSelectCase,
}) {
  const cases = data?.cases ?? [];
  const selected = cases.find((record) => Number(record.id) === Number(selectedCaseId));

  const canCreate = (data?.case_types ?? []).some((item) => bool(item.can_create));

  return (
    <>
      <div className="ncc-workspace-toolbar">
        <span>Đơn nhập {order.code}</span>

        {renderButton('TẠO HỒ SƠ', () => onOpen('OPEN'), !data || !canCreate, 'primary')}
      </div>

      {loading && !data && (
        <p className="ncc-message" role="status">
          Đang tải hồ sơ Nhà Cung Cấp...
        </p>
      )}

      {readError && (
        <div className="ncc-message ncc-message--error" role="alert">
          <p>{readError}</p>
          {renderButton('Thử tải lại', onRetry)}
        </div>
      )}

      {notice && (
        <p className="ncc-message ncc-message--success" role="status">
          {notice}
        </p>
      )}

      {operationError && !hasDialog && (
        <p className="ncc-message ncc-message--error" role="alert">
          {operationError}
        </p>
      )}

      {data && (
        <>
          <div className="ncc-summary">
            <div>
              <span>Giá trị sau điều chỉnh</span>
              <b>{cash(data.balance.effective)}</b>
            </div>
            <div>
              <span>Điều chỉnh qua hồ sơ</span>
              <b>{nccSignedCash(data.balance.adjustment)}</b>
            </div>
            <div className={bool(data.balance.canPay) ? 'ncc-kpi--debt' : ''}>
              <span>Còn trả Nhà Cung Cấp</span>
              <b>{cash(data.balance.debt)}</b>
            </div>
            <div className={bool(data.balance.canRefund) ? 'ncc-kpi--refund' : ''}>
              <span>Nhà Cung Cấp còn hoàn</span>
              <b>{cash(data.balance.refundDue)}</b>
            </div>
          </div>

          {!canCreate && (
            <p className="ncc-muted">
              Chưa thể tạo hồ sơ mới: đơn nhập chưa đủ điều kiện hoặc đã có hồ sơ đang xử lý.
            </p>
          )}

          <div className="ncc-case-picker">
            {cases.map((record) => {
              const state = nccCaseState(record);
              const isSelected = Number(record.id) === Number(selectedCaseId);

              return (
                <div key={record.id} className={`ncc-case-row${isSelected ? ' is-selected' : ''}`}>
                  <div>
                    <small>
                      #{record.id}
                      {' · '}
                      {NCC_PURPOSES[record.purpose] || 'Hồ sơ cũ'}
                    </small>
                    <strong>{record.reason}</strong>
                  </div>

                  <span className={`ncc-badge ncc-badge--${state.tone}`}>{state.label}</span>

                  <button
                    type="button"
                    className="ncc-btn"
                    aria-controls={`ncc-case-${record.id}`}
                    aria-expanded={isSelected}
                    onClick={() => onSelectCase(record.id)}
                  >
                    XEM HỒ SƠ
                  </button>
                </div>
              );
            })}

            {!cases.length && <p className="ncc-empty">Chưa có hồ sơ.</p>}
          </div>

          {selected && (
            <NccCaseView
              key={selected.id}
              record={selected}
              data={data}
              renderButton={renderButton}
              onOpen={onOpen}
            />
          )}
        </>
      )}
    </>
  );
}

function NccActionHelp({ action, unit, form }) {
  const help = NCC_HELP[action];

  const hasCredit =
    form.credit !== '' && form.credit != null && Number.isFinite(Number(form.credit));

  const hasValue = form.value !== '' && form.value != null && Number.isFinite(Number(form.value));

  const canPreview =
    action === 'PHUONG_AN' &&
    hasCredit &&
    (form.method === 'TRA_HANG' || (form.method === 'DOI_HANG' && hasValue));

  const delta =
    form.method === 'TRA_HANG' ? -Number(form.credit) : Number(form.value) - Number(form.credit);

  const receiving = action === 'NHAN' || (action === 'NHAN_BO_SUNG' && !form.alreadyInStock);

  return (
    <div className="ncc-dialog-notes">
      {help && (
        <details className="ncc-mini-help">
          <summary>Ghi chú thao tác</summary>
          <p>{help.text}</p>

          {action === 'NHAN' && unit?.method === 'TRA_HANG' && (
            <p>Đây là nhận lại hàng Nhà Cung Cấp từ chối nhận trả.</p>
          )}
        </details>
      )}

      {canPreview && (
        <p className="ncc-impact">
          Điều chỉnh giá trị dự kiến: <strong>{nccSignedCash(delta)}</strong>
        </p>
      )}

      {receiving && (
        <p className={`ncc-impact${form.passed ? ' is-passed' : ''}`}>
          Hàng nhận vào: <strong>{form.passed ? 'Tồn có thể bán' : 'Kho hàng lỗi'}</strong>
        </p>
      )}
    </div>
  );
}

export default function SupplierCasePanel({ order, locked = false, onRefresh, onLockChange }) {
  const [data, setData] = useState(null);
  const [readError, setReadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const attempt = useRef(null);
  const writing = useRef(false);
  const readSequence = useRef(0);
  const controller = useRef(null);

  const refresh = useCallback(async () => {
    const sequence = ++readSequence.current;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;

    setLoading(true);

    try {
      const result = await getSupplierCases(order.id, nextController.signal);

      if (sequence === readSequence.current && !nextController.signal.aborted) {
        setData(result);
        setReadError('');
      }
    } catch (error) {
      if (error.name !== 'AbortError' && sequence === readSequence.current) {
        setReadError(errorMessage(error));
      }
    } finally {
      if (sequence === readSequence.current && !nextController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [order.id]);

  useEffect(() => {
    refresh();
    return () => controller.current?.abort();
  }, [refresh, order.debt, order.refundDue, order.nccAdjustment]);

  useEffect(() => {
    onLockChange?.(busy || Boolean(attempt.current) || Boolean(dialog));
  }, [busy, dialog, operationError, onLockChange]);

  useEffect(() => () => onLockChange?.(false), [onLockChange]);

  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const open = (action, supplierCase = null, unit = null, followUp = false) => {
    if (locked || busy || attempt.current) return;

    setOperationError('');
    setNotice('');

    setDialog({
      action,
      caseId: supplierCase?.id ?? null,
      revision: supplierCase?.revision ?? null,
      unit,
      followUp,
    });

    const first = data?.sources?.[0];
    const firstPurpose = data?.case_types?.find((item) => bool(item.can_create));

    setForm({
      purpose: firstPurpose?.code ?? '',
      detailId: String(first?.id ?? ''),
      previousUnitId: followUp ? unit.id : null,
      quantity: 1,
      damagedQuantity:
        unit?.live_serial_status === 'LOI' ||
        ['DA_NHAN_LOI', 'CHAP_NHAN_LOI'].includes(unit?.status)
          ? 1
          : 0,
      serialIds: [],
      serialCodes: '',
      method: action === 'PHUONG_AN' ? unit?.method || 'SUA_CHUA' : 'SUA_CHUA',
      variantId: String(unit?.expected_variant_id ?? first?.phien_ban_id ?? ''),
      credit:
        action === 'PHUONG_AN' && unit?.method !== 'SUA_CHUA' && !bool(unit?.planned)
          ? ''
          : (unit?.credit ?? 0),

      value:
        action === 'PHUONG_AN' && unit?.method === 'DOI_HANG' && !bool(unit?.planned)
          ? ''
          : (unit?.receive_value ?? ''),
      condition: action === 'NHAN_BO_SUNG' ? 'MOI' : 'CHUA_XAC_DINH',
      passed: false,
      alreadyInStock: false,
      amount:
        action === 'THU_TIEN'
          ? (data?.balance?.refundDue ?? '')
          : action === 'CHI_TIEN'
            ? (data?.balance?.debt ?? '')
            : '',
      paymentMethod: 'CHUYEN_KHOAN',
      transactionId: '',
      employeeId: supplierCase?.employee_id ? String(supplierCase.employee_id) : '',
      deadline: supplierCase?.deadline ? inputFromApiTime(supplierCase.deadline) : '',
      document: '',
      note: '',
      at: nowLocalInput(),
      confirmed: false,
    });
  };

  const source = data?.sources?.find((item) => Number(item.id) === Number(form.detailId));

  const unit = dialog?.unit;
  const action = dialog?.action;

  const isSourceAction = action === 'NHAN_BO_SUNG' || (action === 'GUI' && !dialog?.followUp);

  const sourceManaged = dialog?.followUp
    ? bool(unit?.serial_managed)
    : bool(source?.co_quan_ly_serial);

  const receiveManaged = action === 'NHAN' && bool(unit?.expected_serial_managed);

  const frozen = busy || Boolean(attempt.current);

  const close = () => {
    if (busy || attempt.current) return;
    setDialog(null);
    setOperationError('');
  };

  const send = (scope, body) =>
    withIdempotency(attempt, scope, body, (key, payload) => {
      if (scope === 'open') return openSupplierCase(order.id, key, payload);

      return sendSupplierCaseEvent(order.id, Number(scope.split(':')[1]), key, payload);
    });

  const execute = async (scope, body) => {
    if (writing.current) return;

    writing.current = true;
    setBusy(true);
    setOperationError('');

    try {
      const result = await send(scope, body);

      if (Number.isSafeInteger(Number(result?.id)) && Number(result.id) > 0) {
        setSelectedCaseId(Number(result.id));
      }

      setDialog(null);
      setNotice(scope === 'open' ? 'Đã tạo hồ sơ.' : 'Đã cập nhật hồ sơ.');
      await Promise.all([refresh(), onRefresh?.()]);
    } catch (error) {
      setOperationError(errorMessage(error));

      const status = Number(error.status || error.response?.status);

      if (status === 409 && !attempt.current) {
        setDialog(null);
        await refresh();
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  const submit = () => {
    if (attempt.current) {
      return execute(attempt.current.scope, attempt.current.body);
    }

    if (!dialog || locked || busy) return;

    try {
      if (!form.confirmed) {
        throw new Error('Chỉ xác nhận khi sự việc thực tế đã xảy ra hoặc đã được chốt.');
      }

      if (!form.note.trim()) {
        throw new Error(
          action === 'OPEN' ? 'Nhập lý do tạo hồ sơ.' : 'Nhập nội dung hoặc căn cứ xác nhận.'
        );
      }

      if (NCC_DOCUMENT_LABELS[action] && !form.document.trim()) {
        throw new Error(`Nhập ${NCC_DOCUMENT_LABELS[action].toLowerCase()}.`);
      }

      if (action === 'OPEN') {
        const selectedType = data?.case_types?.find((item) => item.code === form.purpose);

        if (!selectedType || !bool(selectedType.can_create)) {
          throw new Error('Loại hồ sơ chưa được chọn hoặc đang có hồ sơ cùng loại chưa kết thúc.');
        }
      }

      if (action === 'PHUONG_AN' && ['DOI_HANG', 'TRA_HANG'].includes(form.method)) {
        if (
          form.credit === '' ||
          form.credit == null ||
          !Number.isFinite(Number(form.credit)) ||
          Number(form.credit) < 0
        ) {
          throw new Error(
            'Nhập giá trị hàng gửi được Nhà Cung Cấp chấp nhận. ' +
              'Chỉ nhập 0 khi hai bên đã thống nhất giá trị bằng 0.'
          );
        }

        if (
          form.method === 'DOI_HANG' &&
          (!form.variantId ||
            form.value === '' ||
            form.value == null ||
            !Number.isFinite(Number(form.value)) ||
            Number(form.value) < 0)
        ) {
          throw new Error('Chọn phiên bản và nhập giá trị hàng đổi nhận về đã thống nhất.');
        }
      }

      const at = toApiDateTime(form.at);

      if (action === 'OPEN') {
        return execute('open', {
          purpose: form.purpose,
          reason: form.note.trim(),
          employeeId: optionalId(form.employeeId),
          deadline: deadlineValue(form.deadline),
          document: form.document.trim() || null,
          at,
          confirmed: true,
        });
      }

      let quantity = Number(form.quantity);
      let damagedQuantity = Number(form.damagedQuantity);
      let serialIds = form.serialIds.map(Number);
      let serialCodes = codes(form.serialCodes);

      if (action === 'GUI' && !dialog.followUp && sourceManaged) {
        quantity = serialIds.length;
        damagedQuantity = (source?.serials ?? []).filter(
          (item) => serialIds.includes(Number(item.id)) && item.trang_thai === 'LOI'
        ).length;
      }

      if (action === 'NHAN_BO_SUNG' && sourceManaged) {
        quantity = form.alreadyInStock ? serialIds.length : serialCodes.length;
      }

      if (action === 'GUI' && dialog.followUp) {
        quantity = 1;
        serialIds = [];
      }

      const body = {
        revision: Number(dialog.revision),
        action,
        unitId: action === 'GUI' ? null : (unit?.id ?? null),
        detailId: optionalId(form.detailId),
        previousUnitId: form.previousUnitId,
        quantity,
        damagedQuantity,
        serialIds,
        serialCodes,
        method: form.method,
        variantId: optionalId(form.variantId),
        credit: form.credit === '' ? null : String(form.credit),
        value: form.value === '' ? null : String(form.value),
        condition: form.condition,
        passed: form.passed,
        alreadyInStock: form.alreadyInStock,
        amount: form.amount === '' ? null : String(form.amount),
        paymentMethod: form.paymentMethod,
        transactionId: form.transactionId.trim(),
        employeeId: optionalId(form.employeeId),
        deadline: deadlineValue(form.deadline),
        document: form.document.trim() || null,
        note: form.note.trim(),
        at,
        confirmed: true,
      };

      if (action === 'NHAN') {
        body.variantId = Number(unit.expected_variant_id);
      }

      if (['GUI', 'NHAN_BO_SUNG'].includes(action)) {
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
          throw new Error('Mỗi lần cần từ 1 đến 100 thiết bị.');
        }
      }

      return execute(`case:${dialog.caseId}`, body);
    } catch (error) {
      setOperationError(errorMessage(error));
    }
  };

  const button = (label, callback, disabled = false, tone = 'default', hint = '') => (
    <button
      type="button"
      className={`ncc-btn ncc-btn--${tone}`}
      disabled={locked || busy || Boolean(attempt.current) || disabled}
      title={hint || undefined}
      onClick={callback}
    >
      {label}
    </button>
  );

  const selectSerials = () => (
    <section className="ncc-serials">
      <header>
        <div>
          <strong>
            {action === 'NHAN_BO_SUNG'
              ? 'CHỌN SERIAL HÀNG THỪA ĐÃ CÓ'
              : 'CHỌN SERIAL ĐÃ GIAO CHO NCC'}
          </strong>
          <small>Đối chiếu đúng thiết bị thực tế trước khi xác nhận.</small>
        </div>
        <span className="ncc-count">Đã chọn {form.serialIds.length}</span>
      </header>

      <div className="ncc-serials__list">
        {(source?.serials ?? []).map((serial) => {
          const selected = form.serialIds.includes(String(serial.id));
          const faulty = serial.trang_thai === 'LOI';

          return (
            <label key={serial.id} className={selected ? 'is-selected' : ''}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  change(
                    'serialIds',
                    selected
                      ? form.serialIds.filter((id) => id !== String(serial.id))
                      : [...form.serialIds, String(serial.id)]
                  )
                }
              />

              <code>{serial.so_serial}</code>

              <span className={`ncc-badge ncc-badge--${faulty ? 'red' : 'green'}`}>
                {faulty ? 'Hàng lỗi' : 'Trong kho'}
              </span>
            </label>
          );
        })}

        {!source?.serials?.length && (
          <p className="ncc-message">Không có serial nguồn đang có thể chọn.</p>
        )}
      </div>
    </section>
  );

  return (
    <PurchaseCard title="XỬ LÝ VÀ ĐỐI SOÁT NHÀ CUNG CẤP" className="ncc-workspace">
      <section className="ncc-panel" aria-busy={loading || busy}>
        <NccWorkspace
          order={order}
          data={data}
          loading={loading}
          readError={readError}
          operationError={operationError}
          notice={notice}
          hasDialog={Boolean(dialog)}
          onRetry={refresh}
          onOpen={open}
          renderButton={button}
          selectedCaseId={selectedCaseId}
          onSelectCase={setSelectedCaseId}
        />

        {dialog && (
          <OrderModal
            title={NCC_HELP[action]?.title || ACTIONS[action]}
            subtitle={
              unit ? `Thiết bị #${unit.id} · ${unit.so_serial || unit.variant_name}` : order.code
            }
            className="ncc-modal"
            showClose
            busy={busy}
            error={operationError}
            disabled={!form.confirmed && !attempt.current}
            confirmLabel={
              attempt.current ? 'THỬ LẠI YÊU CẦU CŨ' : NCC_HELP[action]?.confirm || 'XÁC NHẬN'
            }
            close={close}
            submit={submit}
          >
            {attempt.current && (
              <p className="ncc-error">
                Chưa xác định được kết quả. Giữ nguyên yêu cầu và thử lại.
              </p>
            )}

            <NccActionHelp action={action} unit={unit} form={form} />

            <fieldset className="ncc-fields" disabled={frozen}>
              {action === 'OPEN' && (
                <label className="ncc-field-wide">
                  <span>Loại hồ sơ</span>

                  <select
                    required
                    value={form.purpose}
                    onChange={(event) => {
                      change('purpose', event.target.value);
                      change('confirmed', false);
                    }}
                  >
                    <option value="">Chọn loại hồ sơ</option>

                    {(data?.case_types ?? []).map((item) => (
                      <option key={item.code} value={item.code} disabled={!bool(item.can_create)}>
                        {item.label}
                        {!bool(item.can_create) ? ' — chưa thể tạo' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {isSourceAction && (
                <label className="ncc-field-wide">
                  <span>DÒNG ĐƠN NHẬP</span>
                  <select
                    value={form.detailId}
                    onChange={(event) => {
                      change('detailId', event.target.value);
                      change('serialIds', []);
                      change('serialCodes', '');
                      change('alreadyInStock', false);
                    }}
                  >
                    {(data?.sources ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ten_phien_ban}
                        {action === 'GUI' ? ` · Chưa đưa vào hồ sơ: ${item.capacity}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {action === 'GUI' && dialog.followUp && (
                <p>Gửi tiếp đúng thiết bị đang có, giữ toàn bộ chuỗi lịch sử trước đó.</p>
              )}

              {action === 'GUI' && (
                <label>
                  <span>MỤC ĐÍCH GỬI</span>
                  <select
                    value={form.method}
                    onChange={(event) => change('method', event.target.value)}
                  >
                    {Object.entries(METHODS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {action === 'GUI' && !dialog.followUp && sourceManaged && selectSerials()}

              {action === 'GUI' && !sourceManaged && (
                <>
                  {!dialog.followUp && (
                    <label>
                      <span>SỐ LƯỢNG GỬI</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={form.quantity}
                        onChange={(event) => change('quantity', event.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    <span>SỐ LƯỢNG ĐANG THUỘC HÀNG LỖI</span>
                    <input
                      type="number"
                      min="0"
                      max={dialog.followUp ? 1 : form.quantity}
                      step="1"
                      value={form.damagedQuantity}
                      onChange={(event) => change('damagedQuantity', event.target.value)}
                    />
                  </label>
                </>
              )}

              {action === 'PHUONG_AN' && (
                <>
                  <label>
                    <span>PHƯƠNG ÁN ĐÃ THỐNG NHẤT</span>
                    <select
                      value={form.method}
                      onChange={(event) => {
                        const method = event.target.value;

                        setForm((current) => ({
                          ...current,
                          method,
                          credit: method === 'SUA_CHUA' ? 0 : '',
                          value: method === 'DOI_HANG' ? '' : current.value,
                          confirmed: false,
                        }));
                      }}
                    >
                      {Object.entries(METHODS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.method === 'DOI_HANG' && (
                    <label>
                      <span>PHIÊN BẢN HÀNG ĐỔI</span>
                      <select
                        value={form.variantId}
                        onChange={(event) => change('variantId', event.target.value)}
                      >
                        {(data?.variants ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ten_san_pham} · {item.ten_phien_ban}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {form.method !== 'SUA_CHUA' && (
                    <label>
                      <span>GIÁ TRỊ HÀNG GỬI ĐƯỢC Nhà Cung Cấp CHẤP NHẬN, GỒM THUẾ</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.credit}
                        onChange={(event) => change('credit', event.target.value)}
                      />
                    </label>
                  )}

                  {form.method === 'DOI_HANG' && (
                    <label>
                      <span>GIÁ TRỊ HÀNG NHẬN THAY THẾ, GỒM THUẾ</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.value}
                        onChange={(event) => change('value', event.target.value)}
                      />
                    </label>
                  )}

                  <p className="ncc-muted">
                    Chốt phương án chưa phát sinh thu/chi tiền. Chênh lệch được ghi khi nhận hàng
                    đổi hoặc khi NCC chấp nhận trả hàng.
                  </p>
                </>
              )}

              {action === 'NHAN_BO_SUNG' && (
                <>
                  <p>
                    Chỉ dùng khi cửa hàng đã đồng ý nhận mua phần bổ sung và chốt giá với NCC. Đơn
                    đặt ban đầu được giữ nguyên.
                  </p>

                  {Number(source?.legacy_extra_capacity) > 0 && (
                    <label className="ncc-check">
                      <input
                        type="checkbox"
                        checked={form.alreadyInStock}
                        onChange={(event) => {
                          change('alreadyInStock', event.target.checked);
                          change('serialIds', []);
                          change('serialCodes', '');
                        }}
                      />
                      <span>
                        Đối chiếu hàng đã nhập thừa trong dữ liệu cũ ({source.legacy_extra_capacity}{' '}
                        sản phẩm); không nhập kho lần nữa.
                      </span>
                    </label>
                  )}

                  {sourceManaged && form.alreadyInStock && selectSerials()}

                  {sourceManaged && !form.alreadyInStock && (
                    <label>
                      <span>SERIAL HÀNG BỔ SUNG — MỖI DÒNG MỘT MÃ</span>
                      <textarea
                        rows="4"
                        value={form.serialCodes}
                        onChange={(event) => change('serialCodes', event.target.value)}
                      />
                    </label>
                  )}

                  {!sourceManaged && (
                    <>
                      <label>
                        <span>SỐ LƯỢNG</span>

                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={form.quantity}
                          onChange={(event) => change('quantity', event.target.value)}
                        />
                      </label>

                      {form.alreadyInStock && (
                        <label>
                          <span>TRONG ĐÓ, SỐ LƯỢNG ĐANG THUỘC HÀNG LỖI</span>

                          <input
                            type="number"
                            min="0"
                            max={form.quantity}
                            step="1"
                            value={form.damagedQuantity}
                            onChange={(event) => change('damagedQuantity', event.target.value)}
                          />
                        </label>
                      )}
                    </>
                  )}

                  <label>
                    <span>GIÁ ĐÃ CHỐT CHO MỖI SẢN PHẨM, GỒM THUẾ</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(event) => change('value', event.target.value)}
                    />
                  </label>
                </>
              )}

              {action === 'NHAN' && (
                <>
                  <p>
                    Nhận: <b>{unit.expected_variant_name}</b>.
                    {unit.method !== 'DOI_HANG'
                      ? ' Phải nhận lại đúng thiết bị đã gửi.'
                      : ' Serial hàng đổi phải chưa tồn tại trong hệ thống.'}
                  </p>
                  {receiveManaged && (
                    <label>
                      <span>SERIAL THỰC NHẬN</span>
                      <input
                        value={form.serialCodes}
                        maxLength={100}
                        onChange={(event) => change('serialCodes', event.target.value)}
                      />
                    </label>
                  )}
                </>
              )}

              {(action === 'NHAN' || (action === 'NHAN_BO_SUNG' && !form.alreadyInStock)) && (
                <>
                  <label>
                    <span>TÌNH TRẠNG HÀNG THỰC NHẬN</span>
                    <select
                      value={form.condition}
                      onChange={(event) => change('condition', event.target.value)}
                    >
                      {Object.entries(CONDITIONS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ncc-check">
                    <input
                      type="checkbox"
                      checked={form.passed}
                      onChange={(event) => change('passed', event.target.checked)}
                    />
                    <span>Đã kiểm tra đạt, đủ điều kiện đưa vào tồn có thể bán.</span>
                  </label>
                  <p className="ncc-muted">
                    Không đánh dấu đạt: hàng nhận vào tồn thực tế và hàng lỗi, không tăng tồn có thể
                    bán.
                  </p>
                </>
              )}

              {['PHI', 'THU_TIEN', 'CHI_TIEN'].includes(action) && (
                <label>
                  <span>
                    {action === 'PHI' ? 'PHÍ ĐIỀU CHỈNH (+ TĂNG / − GIẢM)' : 'SỐ TIỀN THỰC TẾ'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => change('amount', event.target.value)}
                  />
                </label>
              )}

              {['THU_TIEN', 'CHI_TIEN'].includes(action) && (
                <>
                  <p>Khoản này được đối chiếu vào công nợ chung của đơn nhập {order.code}.</p>
                  <label>
                    <span>PHƯƠNG THỨC</span>
                    <select
                      value={form.paymentMethod}
                      onChange={(event) => change('paymentMethod', event.target.value)}
                    >
                      <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                      <option value="TIEN_MAT">Tiền mặt</option>
                      <option value="THE">Thẻ</option>
                    </select>
                  </label>
                  {form.paymentMethod !== 'TIEN_MAT' && (
                    <label>
                      <span>MÃ GIAO DỊCH</span>
                      <input
                        maxLength="255"
                        value={form.transactionId}
                        onChange={(event) => change('transactionId', event.target.value)}
                      />
                    </label>
                  )}
                </>
              )}

              {['OPEN', 'THEO_DOI'].includes(action) && (
                <>
                  <label>
                    <span>NGƯỜI PHỤ TRÁCH</span>
                    <select
                      value={form.employeeId}
                      onChange={(event) => change('employeeId', event.target.value)}
                    >
                      <option value="">Tôi phụ trách</option>
                      {(data?.employees ?? []).map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>HẠN XỬ LÝ</span>
                    <input
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(event) => change('deadline', event.target.value)}
                    />
                  </label>
                </>
              )}

              {action === 'CHOT_TRA' && (
                <p>NCC đã chấp nhận nhận lại hàng và giá trị đã chốt. Không trừ tồn lần nữa.</p>
              )}

              {action === 'CHAP_NHAN_LOI' && (
                <p>Hàng vẫn thuộc hàng lỗi trong kho; thao tác này không làm hàng có thể bán.</p>
              )}

              {NCC_DOCUMENT_LABELS[action] && (
                <label className="ncc-field-wide">
                  <span>{NCC_DOCUMENT_LABELS[action]}</span>

                  <input
                    required
                    maxLength="100"
                    value={form.document}
                    onChange={(event) => change('document', event.target.value)}
                  />
                </label>
              )}

              <label className="ncc-field-wide">
                <span>{action === 'OPEN' ? 'Lý do tạo hồ sơ' : 'Nội dung và căn cứ xác nhận'}</span>
                <textarea
                  rows="3"
                  maxLength={action === 'OPEN' ? 500 : 1000}
                  value={form.note}
                  onChange={(event) => change('note', event.target.value)}
                />
              </label>

              <label>
                <span>THỜI ĐIỂM THỰC HIỆN</span>
                <input
                  type="datetime-local"
                  value={form.at}
                  onChange={(event) => change('at', event.target.value)}
                />
              </label>

              <label className="ncc-check">
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={(event) => change('confirmed', event.target.checked)}
                />
                <span>
                  Tôi xác nhận nội dung, chứng từ và sự việc thực tế phù hợp với thao tác này.
                </span>
              </label>
            </fieldset>
          </OrderModal>
        )}
      </section>
    </PurchaseCard>
  );
}
