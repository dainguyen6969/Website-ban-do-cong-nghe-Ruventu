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
  OPEN: 'MỞ HỒ SƠ NHÀ CUNG CẤP',
  GUI: 'GỬI HÀNG CHO NHÀ CUNG CẤP',
  PHUONG_AN: 'CHỐT PHƯƠNG ÁN',
  NHAN: 'NHẬN HÀNG TỪ NHÀ CUNG CẤP',
  GUI_LAI: 'GỬI LẠI HÀNG CÒN LỖI',
  CHOT_TRA: 'NHÀ CUNG CẤP ĐÃ CHẤP NHẬN TRẢ HÀNG',
  CHAP_NHAN_LOI: 'KẾT THÚC ĐỐI SOÁT HÀNG LỖI',
  NHAN_BO_SUNG: 'NHẬN BỔ SUNG ĐÃ THỐNG NHẤT',
  PHI: 'GHI NHẬN ĐIỀU CHỈNH PHÍ',
  THU_TIEN: 'ĐÃ NHẬN TIỀN NHÀ CUNG CẤP HOÀN',
  CHI_TIEN: 'ĐÃ TRẢ TIỀN CHO NHÀ CUNG CẤP',
  THEO_DOI: 'NGƯỜI PHỤ TRÁCH VÀ HẠN XỬ LÝ',
  GHI_CHU: 'GHI NHẬN ĐỐI SOÁT',
  KET_THUC: 'KẾT THÚC HỒ SƠ',
  MO_LAI: 'MỞ LẠI ĐỂ ĐỐI SOÁT',
  MO_HO_SO: 'MỞ HỒ SƠ',
};

const STATES = {
  DANG_O_NCC: 'Đang ở NHÀ CUNG CẤP',
  DA_NHAN_LOI: 'Nhận lại nhưng còn lỗi',
  DA_NHAN_DAT: 'Đã nhận đạt',
  DA_TRA_NCC: 'Đã trả NHÀ CUNG CẤP',
  CHAP_NHAN_LOI: 'Đã đối soát, giữ ở hàng lỗi',
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
    title: 'MỞ HỒ SƠ XỬ LÝ',
    text: 'Ghi lý do, người phụ trách và hạn xử lý. Sau khi mở hồ sơ, chọn gửi hàng hoặc nhận bổ sung bên trong hồ sơ.',
    confirm: 'TẠO HỒ SƠ',
  },
  GUI: {
    title: 'GỬI HÀNG CHO NHÀ CUNG CẤP',
    text: 'Chọn đúng hàng cửa hàng đã giao cho nhà cung cấp để sửa, đổi hoặc trả. Xác nhận bước này sẽ đưa hàng ra khỏi tồn kho.',
    confirm: 'XÁC NHẬN ĐÃ GỬI HÀNG',
  },
  PHUONG_AN: {
    title: 'CHỐT PHƯƠNG ÁN ĐÃ THỐNG NHẤT',
    text: 'Ghi đúng thỏa thuận với nhà cung cấp: sửa thiết bị cũ, đổi hàng khác hoặc trả hẳn. Với đổi/trả, cần nhập giá trị hai bên đã chấp nhận.',
    confirm: 'LƯU PHƯƠNG ÁN',
  },
  NHAN: {
    title: 'NHẬN HÀNG TỪ NHÀ CUNG CẤP',
    text: 'Kiểm tra đúng hàng, serial và chất lượng thực nhận. Chỉ đánh dấu kiểm tra đạt khi hàng đủ điều kiện đưa vào tồn có thể bán.',
    confirm: 'XÁC NHẬN ĐÃ NHẬN HÀNG',
  },
  GUI_LAI: {
    title: 'GỬI LẠI HÀNG CÒN LỖI',
    text: 'Dùng khi hàng vừa nhận về vẫn lỗi và cửa hàng đã giao lại cho nhà cung cấp. Hàng được lấy ra khỏi tồn thực tế và hàng lỗi.',
    confirm: 'XÁC NHẬN ĐÃ GỬI LẠI',
  },
  CHOT_TRA: {
    title: 'NHÀ CUNG CẤP ĐÃ CHẤP NHẬN TRẢ HÀNG',
    text: 'Dùng khi nhà cung cấp đã nhận trả hẳn và chấp nhận giá trị đã chốt. Bước này ghi giảm nghĩa vụ thanh toán theo thỏa thuận.',
    confirm: 'XÁC NHẬN NCC ĐÃ NHẬN TRẢ',
  },
  CHAP_NHAN_LOI: {
    title: 'CHẤP NHẬN GIỮ HÀNG Ở KHO LỖI',
    text: 'Ghi rõ căn cứ kết thúc đối soát. Thiết bị vẫn nằm trong hàng lỗi và chưa được đưa vào tồn có thể bán.',
    confirm: 'XÁC NHẬN GIỮ Ở HÀNG LỖI',
  },
  NHAN_BO_SUNG: {
    title: 'NHẬN BỔ SUNG ĐÃ THỐNG NHẤT MUA',
    text: 'Dùng khi nhà cung cấp giao thêm và cửa hàng đã đồng ý nhận mua với giá cụ thể. Mỗi sản phẩm nhận thêm có giá trị gồm thuế đã chốt.',
    confirm: 'XÁC NHẬN NHẬN BỔ SUNG',
  },
  PHI: {
    title: 'ĐIỀU CHỈNH PHÍ ĐÃ THỐNG NHẤT',
    text: 'Nhập số dương để tăng phí, số âm để giảm phần phí đã chốt. Đây là điều chỉnh nghĩa vụ thanh toán; tiền thực tế được ghi nhận riêng.',
    confirm: 'GHI NHẬN ĐIỀU CHỈNH PHÍ',
  },
  CHI_TIEN: {
    title: 'GHI NHẬN ĐÃ TRẢ TIỀN CHO NCC',
    text: 'Nhập đúng số tiền cửa hàng đã thực sự trả. Có thể ghi nhiều lần; mỗi lần tạo một phiếu chi theo đơn nhập.',
    confirm: 'XÁC NHẬN ĐÃ CHI TIỀN',
  },
  THU_TIEN: {
    title: 'GHI NHẬN ĐÃ NHẬN TIỀN NCC HOÀN',
    text: 'Nhập đúng số tiền cửa hàng đã thực sự nhận lại. Có thể nhận nhiều lần trong phạm vi nhà cung cấp còn phải hoàn.',
    confirm: 'XÁC NHẬN ĐÃ NHẬN TIỀN',
  },
  THEO_DOI: {
    title: 'PHỤ TRÁCH VÀ HẠN XỬ LÝ',
    text: 'Chọn người chịu trách nhiệm theo dõi và thời hạn liên hệ, nhận hàng hoặc đối soát với nhà cung cấp.',
    confirm: 'LƯU PHÂN CÔNG',
  },
  GHI_CHU: {
    title: 'GHI NHẬN KẾT QUẢ ĐỐI SOÁT',
    text: 'Lưu phản hồi của nhà cung cấp, sai lệch hoặc căn cứ xử lý. Thao tác ghi chú không tự phát sinh giao nhận hàng hay tiền.',
    confirm: 'LƯU NỘI DUNG ĐỐI SOÁT',
  },
  KET_THUC: {
    title: 'KẾT THÚC HỒ SƠ',
    text: 'Kết thúc khi các thiết bị đã được xử lý và các khoản cần đối chiếu đã đủ điều kiện. Toàn bộ chứng từ, serial và lịch sử vẫn được lưu.',
    confirm: 'KẾT THÚC HỒ SƠ',
  },
  MO_LAI: {
    title: 'MỞ LẠI HỒ SƠ ĐỂ XỬ LÝ TIẾP',
    text: 'Ghi rõ lý do cần mở lại. Các sự kiện đã ghi nhận trước đó được giữ để tiếp tục đối chiếu.',
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

function nccCaseState(record, balance = {}) {
  if (record.status === 'HOAN_TAT') {
    return {
      tone: 'green',
      label: 'ĐÃ HOÀN TẤT',
      hint: 'Hồ sơ đã kết thúc. Bạn có thể xem lại toàn bộ chứng từ bên dưới.',
    };
  }

  if (record.status === 'KET_THUC_DOI_SOAT') {
    return {
      tone: 'amber',
      label: 'ĐÃ KẾT THÚC ĐỐI SOÁT',
      hint: 'Hồ sơ đã kết thúc và có thiết bị được chấp nhận giữ ở hàng lỗi.',
    };
  }

  const units = record.units ?? [];

  if (units.some((item) => item.status === 'DA_NHAN_LOI')) {
    return {
      tone: 'red',
      label: 'CẦN XỬ LÝ HÀNG LỖI',
      hint: 'Chọn “Gửi NCC xử lý lại” hoặc “Chấp nhận giữ hàng lỗi” tại thiết bị tương ứng.',
    };
  }

  if (units.some((item) => item.status === 'DANG_O_NCC' && !bool(item.planned))) {
    return {
      tone: 'amber',
      label: 'CHỜ CHỐT PHƯƠNG ÁN',
      hint: 'Nhà cung cấp đang giữ hàng. Chốt phương án đổi hoặc trả tại từng thiết bị.',
    };
  }

  if (units.some((item) => item.status === 'DANG_O_NCC')) {
    return {
      tone: 'blue',
      label: 'CHỜ NCC XỬ LÝ / TRẢ HÀNG',
      hint: 'Khi hàng về, dùng nút nhận hàng tại thiết bị. Với trả hẳn, xác nhận khi NCC đã chấp nhận nhận trả.',
    };
  }

  if (
    Number(record.adjustment) !== 0 &&
    (Number(balance.debt) > 0 || Number(balance.refundDue) > 0)
  ) {
    return {
      tone: 'amber',
      label: 'CHỜ ĐỐI CHIẾU TIỀN',
      hint: 'Mở nhóm “Tiền, phí và quản lý hồ sơ” để ghi nhận tiền thực tế theo đơn nhập.',
    };
  }

  if (!units.length) {
    return {
      tone: 'amber',
      label: 'ĐANG XỬ LÝ',
      hint: 'Hồ sơ đã mở. Chọn gửi hàng đang có hoặc nhận bổ sung đã thống nhất mua.',
    };
  }

  return {
    tone: 'green',
    label: 'CÓ THỂ KẾT THÚC',
    hint: 'Các thiết bị đã được xử lý. Bạn có thể kết thúc hồ sơ trong nhóm quản lý bên dưới.',
  };
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
        add('Giá trị NCC chấp nhận cho hàng gửi', cash(payload.credit));
        add('Giá trị hàng đổi sẽ nhận', cash(payload.value));
      }

      if (payload.method === 'TRA_HANG') {
        add('Giá trị NCC chấp nhận nhận trả', cash(payload.credit));
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
        CHỨNG TỪ VÀ LỊCH SỬ
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
                <span>CHỨNG TỪ / THỎA THUẬN</span>
                <strong>{event.document || 'Chưa có mã'}</strong>
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
                <summary>NỘI DUNG ĐÃ XÁC NHẬN</summary>
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

  let guidance = '';

  if (active && outside && !planned) {
    guidance = 'Bước tiếp theo: chốt phương án với nhà cung cấp.';
  } else if (active && outside && item.method === 'TRA_HANG') {
    guidance =
      'Khi NCC đồng ý nhận trả, chọn xác nhận nhận trả. Nếu NCC gửi hàng về do từ chối, chọn nhận lại hàng.';
  } else if (active && outside) {
    guidance = 'Khi hàng về cửa hàng, chọn nhận hàng và kiểm tra chất lượng.';
  } else if (active && item.status === 'DA_NHAN_LOI') {
    guidance =
      'Hàng đang nằm ở kho lỗi. Chọn gửi lại NCC hoặc ghi rõ căn cứ chấp nhận giữ hàng lỗi.';
  }

  return (
    <article className={`ncc-unit ncc-unit--${tone}`}>
      <header className="ncc-unit__header">
        <div>
          <small>
            THIẾT BỊ #{item.id}
            {item.parent_id ? ` · TIẾP NỐI #${item.parent_id}` : ''}
          </small>

          <h4>{item.variant_name}</h4>

          <div className="ncc-unit__serial">
            {item.so_serial ? (
              <code>{item.so_serial}</code>
            ) : (
              <span>Hàng không quản lý serial</span>
            )}
          </div>
        </div>

        <span className={`ncc-badge ncc-badge--${tone}`}>
          {historical ? 'LƯỢT TRƯỚC — ĐÃ CHUYỂN TIẾP' : STATES[item.status] || 'Đang theo dõi'}
        </span>
      </header>

      <dl className="ncc-unit__facts">
        <div>
          <dt>Mục đích xử lý</dt>
          <dd>{METHODS[item.method]}</dd>
        </div>
        <div>
          <dt>Hình thức thiết bị</dt>
          <dd>{CONDITIONS[item.condition_code] || 'Chưa xác định'}</dd>
        </div>
        <div>
          <dt>Nguồn hàng</dt>
          <dd>{item.origin === 'ORIGINAL' ? 'Theo đơn nhập gốc' : 'Hàng nhận bổ sung'}</dd>
        </div>
      </dl>

      {outside && planned && (
        <div className="ncc-agreement">
          <strong>PHƯƠNG ÁN ĐÃ CHỐT</strong>
          <p>
            {item.method === 'DOI_HANG'
              ? `Nhận đổi: ${item.expected_variant_name}`
              : item.method === 'TRA_HANG'
                ? 'Trả hẳn hàng cho nhà cung cấp'
                : 'Sửa chữa và nhận lại đúng thiết bị đã gửi'}
          </p>

          {item.method !== 'SUA_CHUA' && (
            <div>
              <span>
                NCC chấp nhận hàng gửi: <b>{cash(item.credit)}</b>
              </span>

              {item.method === 'DOI_HANG' && (
                <span>
                  Hàng đổi nhận về: <b>{cash(item.receive_value)}</b>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {guidance && <p className="ncc-unit__next">{guidance}</p>}

      {active && (
        <div className="ncc-unit__actions">
          {outside &&
            !planned &&
            renderButton(
              'CHỐT PHƯƠNG ÁN',
              () => onOpen('PHUONG_AN', record, item),
              false,
              'primary'
            )}

          {outside &&
            planned &&
            item.method !== 'TRA_HANG' &&
            renderButton(
              item.method === 'DOI_HANG' ? 'NHẬN HÀNG ĐỔI' : 'NHẬN LẠI HÀNG SỬA',
              () => onOpen('NHAN', record, item),
              false,
              'primary'
            )}

          {outside && planned && item.method === 'TRA_HANG' && (
            <>
              {renderButton(
                'NCC ĐÃ CHẤP NHẬN NHẬN TRẢ',
                () => onOpen('CHOT_TRA', record, item),
                false,
                'primary'
              )}
              {renderButton('NHẬN LẠI HÀNG NCC TỪ CHỐI', () => onOpen('NHAN', record, item))}
            </>
          )}

          {outside &&
            planned &&
            renderButton('SỬA PHƯƠNG ÁN', () => onOpen('PHUONG_AN', record, item))}

          {item.status === 'DA_NHAN_LOI' && (
            <>
              {renderButton(
                'GỬI NCC XỬ LÝ LẠI',
                () => onOpen('GUI_LAI', record, item),
                false,
                'primary'
              )}
              {renderButton(
                'CHẤP NHẬN GIỮ HÀNG LỖI',
                () => onOpen('CHAP_NHAN_LOI', record, item),
                false,
                'warning'
              )}
            </>
          )}

          {['DA_NHAN_DAT', 'CHAP_NHAN_LOI'].includes(item.status) &&
            renderButton('PHÁT SINH CẦN GỬI TIẾP', () => onOpen('GUI', record, item, true))}
        </div>
      )}
    </article>
  );
}

function NccCaseView({ record, data, renderButton, onOpen }) {
  const active = record.status === 'DANG_XU_LY';
  const units = record.units ?? [];
  const current = units.filter((item) => !bool(item.has_child));
  const previous = units.filter((item) => bool(item.has_child));
  const state = nccCaseState(record, data.balance);

  const pending = units.some((item) => ['DANG_O_NCC', 'DA_NHAN_LOI'].includes(item.status));

  const moneyPending =
    Number(record.adjustment) !== 0 &&
    (Number(data.balance.debt) > 0 || Number(data.balance.refundDue) > 0);

  const overdue = active && record.deadline && new Date(record.deadline).getTime() < Date.now();

  const closeHint = pending
    ? 'Còn thiết bị đang ở NCC hoặc chưa xử lý xong hàng lỗi.'
    : moneyPending
      ? 'Đơn nhập còn khoản tiền cần đối chiếu trước khi kết thúc hồ sơ.'
      : 'Hồ sơ đủ điều kiện để gửi yêu cầu kết thúc.';

  return (
    <article className="ncc-case" id={`ncc-case-${record.id}`}>
      <header className="ncc-case__header">
        <div>
          <span className="ncc-eyebrow">HỒ SƠ #{record.id}</span>
          <h4>{record.reason}</h4>
          <p className="ncc-case__code">{record.code}</p>
          <p className="ncc-case__owner">
            Phụ trách: <strong>{record.employee_name}</strong>
            {' · '}Hạn xử lý:{' '}
            <strong>{record.deadline ? formatDateTimeVN(record.deadline) : 'Chưa đặt hạn'}</strong>
          </p>
        </div>

        <div className="ncc-case__badges">
          <span className={`ncc-badge ncc-badge--${state.tone}`}>{state.label}</span>

          {overdue && <span className="ncc-badge ncc-badge--red">QUÁ HẠN XỬ LÝ</span>}
        </div>
      </header>

      <div className={`ncc-next ncc-next--${state.tone}`}>
        <strong>VIỆC CẦN LÀM</strong>
        <p>{state.hint}</p>
      </div>

      <div className="ncc-case__stats">
        <div>
          <span>Đang ở NCC</span>
          <b>{current.filter((u) => u.status === 'DANG_O_NCC').length}</b>
        </div>
        <div>
          <span>Nhận chưa đạt</span>
          <b>{current.filter((u) => u.status === 'DA_NHAN_LOI').length}</b>
        </div>
        <div>
          <span>Đã nhận đạt</span>
          <b>{current.filter((u) => u.status === 'DA_NHAN_DAT').length}</b>
        </div>
        <div>
          <span>Điều chỉnh qua hồ sơ</span>
          <b>{nccSignedCash(record.adjustment)}</b>
        </div>
      </div>

      {active && (
        <div className="ncc-action-group">
          <div>
            <strong>GIAO NHẬN HÀNG</strong>
            <p>Chọn đúng tình huống phát sinh trong hồ sơ này.</p>
          </div>

          <div className="ncc-action-group__buttons">
            {renderButton('GỬI HÀNG ĐANG CÓ', () => onOpen('GUI', record), false, 'dark')}
            {renderButton('MUA THÊM / NHẬN BỔ SUNG', () => onOpen('NHAN_BO_SUNG', record))}
          </div>
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

        {!units.length && (
          <div className="ncc-empty">
            <strong>Hồ sơ chưa có thiết bị.</strong>
            <p>
              Chọn “Gửi hàng đang có” để gửi sửa, đổi hoặc trả. Chọn “Mua thêm / nhận bổ sung” khi
              đã thống nhất mua phần giao thêm.
            </p>
          </div>
        )}

        {previous.length > 0 && (
          <details className="ncc-previous">
            <summary>THIẾT BỊ CỦA CÁC LƯỢT TRƯỚC ({previous.length})</summary>
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

      <details className="ncc-case-tools">
        <summary>TIỀN, PHÍ VÀ QUẢN LÝ HỒ SƠ</summary>

        {active && (
          <>
            <div className="ncc-tool-group">
              <div>
                <strong>ĐỐI CHIẾU TIỀN THEO ĐƠN NHẬP</strong>
                <p>Chỉ ghi nhận khi đã thực sự giao nhận tiền.</p>
              </div>

              <div className="ncc-action-group__buttons">
                {renderButton(
                  'ĐÃ TRẢ TIỀN CHO NCC',
                  () => onOpen('CHI_TIEN', record),
                  Number(data.balance.debt) <= 0,
                  'dark',
                  'Ghi nhận số tiền thực tế đã trả trong khoản còn nợ.'
                )}
                {renderButton(
                  'ĐÃ NHẬN TIỀN NCC HOÀN',
                  () => onOpen('THU_TIEN', record),
                  Number(data.balance.refundDue) <= 0,
                  'dark',
                  'Ghi nhận số tiền thực tế đã nhận lại trong khoản NCC phải hoàn.'
                )}
                {renderButton('ĐIỀU CHỈNH PHÍ', () => onOpen('PHI', record))}
              </div>
            </div>

            <div className="ncc-tool-group">
              <div>
                <strong>THEO DÕI VÀ KẾT THÚC</strong>
                <p>{closeHint}</p>
              </div>

              <div className="ncc-action-group__buttons">
                {renderButton('PHỤ TRÁCH / HẠN XỬ LÝ', () => onOpen('THEO_DOI', record))}
                {renderButton(
                  'KẾT THÚC HỒ SƠ',
                  () => onOpen('KET_THUC', record),
                  pending || moneyPending,
                  'dark',
                  closeHint
                )}
              </div>
            </div>
          </>
        )}

        <div className="ncc-tool-group">
          <div>
            <strong>GHI NHẬN PHẢN HỒI</strong>
            <p>Lưu căn cứ, sai lệch hoặc nội dung trao đổi với NCC.</p>
          </div>

          <div className="ncc-action-group__buttons">
            {renderButton('GHI NHẬN ĐỐI SOÁT', () => onOpen('GHI_CHU', record))}
            {!active && renderButton('MỞ LẠI HỒ SƠ', () => onOpen('MO_LAI', record))}
          </div>
        </div>
      </details>

      <NccHistory record={record} data={data} />
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
}) {
  return (
    <>
      <div className="ncc-hero">
        <div>
          <span className="ncc-eyebrow">GỬI HÀNG · NHẬN HÀNG · ĐỐI CHIẾU TIỀN</span>
          <h4>Chọn hồ sơ và xử lý theo từng thiết bị</h4>
          <p>Mỗi lần gửi, nhận hoặc chốt giá trị đều có chứng từ và lịch sử riêng.</p>
        </div>

        {renderButton(
          '+ MỞ HỒ SƠ XỬ LÝ',
          () => onOpen('OPEN'),
          ['DAT_HANG', 'HUY'].includes(order.importStatus) || !data,
          'primary'
        )}
      </div>

      <details className="ncc-guide">
        <summary>BẮT ĐẦU TỪ ĐÂU?</summary>
        <div className="ncc-guide__steps">
          <div>
            <b>01</b>
            <strong>MỞ HỒ SƠ</strong>
            <p>Ghi lý do, người phụ trách và thời hạn cần theo dõi.</p>
          </div>
          <div>
            <b>02</b>
            <strong>CHỌN VIỆC PHÁT SINH</strong>
            <p>Gửi hàng đang có để sửa/đổi/trả, hoặc nhận phần hàng đã đồng ý mua thêm.</p>
          </div>
          <div>
            <b>03</b>
            <strong>LÀM THEO TỪNG THIẾT BỊ</strong>
            <p>Chốt phương án, nhận hàng, xử lý hàng lỗi và đối chiếu tiền theo hướng dẫn.</p>
          </div>
        </div>
      </details>

      {loading && !data && (
        <p className="ncc-message" role="status">
          Đang tải hồ sơ NCC...
        </p>
      )}

      {readError && (
        <div className="ncc-message ncc-message--error" role="alert">
          <p>{readError}</p>
          {renderButton('THỬ TẢI LẠI', onRetry)}
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
          <div className="ncc-balance-heading">ĐỐI CHIẾU CHUNG CỦA ĐƠN NHẬP {order.code}</div>

          <div className="ncc-summary">
            <div>
              <span>Giá trị sau điều chỉnh</span>
              <b>{cash(data.balance.effective)}</b>
            </div>
            <div>
              <span>Chênh lệch qua hồ sơ NCC</span>
              <b>{nccSignedCash(data.balance.adjustment)}</b>
            </div>
            <div className={Number(data.balance.debt) > 0 ? 'ncc-kpi--debt' : ''}>
              <span>Cửa hàng cần trả NCC</span>
              <b>{cash(data.balance.debt)}</b>
            </div>
            <div className={Number(data.balance.refundDue) > 0 ? 'ncc-kpi--refund' : ''}>
              <span>NCC cần hoàn cửa hàng</span>
              <b>{cash(data.balance.refundDue)}</b>
            </div>
          </div>

          {data.cases?.length === 0 && (
            <div className="ncc-empty">
              <strong>Đơn nhập chưa có hồ sơ xử lý.</strong>
              <p>Bấm “Mở hồ sơ xử lý” để bắt đầu.</p>
            </div>
          )}

          {(data.cases ?? []).map((record) => (
            <NccCaseView
              key={record.id}
              record={record}
              data={data}
              renderButton={renderButton}
              onOpen={onOpen}
            />
          ))}
        </>
      )}
    </>
  );
}

function NccActionHelp({ action, unit, form }) {
  const help = NCC_HELP[action];
  const receiving = action === 'NHAN' || (action === 'NHAN_BO_SUNG' && !form.alreadyInStock);

  const hasCredit =
    form.credit !== '' &&
    form.credit !== null &&
    form.credit !== undefined &&
    Number.isFinite(Number(form.credit));

  const hasValue =
    form.value !== '' &&
    form.value !== null &&
    form.value !== undefined &&
    Number.isFinite(Number(form.value));

  const canPreview =
    action === 'PHUONG_AN' &&
    hasCredit &&
    (form.method === 'TRA_HANG' || (form.method === 'DOI_HANG' && hasValue));

  const delta =
    form.method === 'TRA_HANG' ? -Number(form.credit) : Number(form.value) - Number(form.credit);

  return (
    <div className="ncc-dialog-help">
      {help && (
        <div className="ncc-callout ncc-callout--blue">
          <strong>Ý NGHĨA THAO TÁC</strong>
          <p>{help.text}</p>

          {action === 'NHAN' && unit?.method === 'TRA_HANG' && (
            <p>
              Bạn đang nhận lại thiết bị NCC không chấp nhận nhận trả. Cần kiểm tra đúng thiết bị
              thực tế được gửi về.
            </p>
          )}
        </div>
      )}

      {canPreview && (
        <div className="ncc-callout ncc-callout--amber">
          <strong>CHÊNH LỆCH DỰ KIẾN KHI CHỐT GIAO NHẬN</strong>
          <p className="ncc-preview-value">{nccSignedCash(delta)}</p>
          <p>
            {delta > 0
              ? 'Giá trị đơn nhập sẽ tăng theo phần chênh lệch này.'
              : delta < 0
                ? 'Giá trị đơn nhập sẽ giảm theo phần chênh lệch này.'
                : 'Hai giá trị bằng nhau, phần đổi hàng không làm tăng hoặc giảm nghĩa vụ thanh toán.'}
          </p>
          <p>Tiền thực tế được ghi nhận bằng thao tác thu/chi riêng.</p>
        </div>
      )}

      {receiving && (
        <div className={`ncc-callout ncc-callout--${form.passed ? 'green' : 'amber'}`}>
          <strong>{form.passed ? 'ĐÃ CHỌN: HÀNG ĐẠT KIỂM TRA' : 'CHƯA CHỌN KIỂM TRA ĐẠT'}</strong>
          <p>
            {form.passed
              ? 'Hàng nhận sẽ tăng tồn thực tế và tồn có thể bán.'
              : 'Với lựa chọn hiện tại, hàng nhận sẽ tăng tồn thực tế và hàng lỗi. Nếu hàng đã kiểm tra đạt, đánh dấu xác nhận đạt ở phần bên dưới.'}
          </p>
        </div>
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

    setForm({
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
      await send(scope, body);
      setDialog(null);
      setNotice('Đã ghi nhận thao tác và đồng bộ dữ liệu.');
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

      if (!form.document.trim() || !form.note.trim()) {
        throw new Error('Cần mã chứng từ/thỏa thuận và nội dung đối soát.');
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
          reason: form.note.trim(),
          employeeId: optionalId(form.employeeId),
          deadline: deadlineValue(form.deadline),
          document: form.document.trim(),
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
        document: form.document.trim(),
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

              <label>
                <span>CHỨNG TỪ / MÃ THỎA THUẬN / MÃ ĐỐI SOÁT</span>
                <input
                  maxLength="100"
                  value={form.document}
                  onChange={(event) => change('document', event.target.value)}
                />
              </label>

              <label>
                <span>NỘI DUNG VÀ CĂN CỨ XÁC NHẬN</span>
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
