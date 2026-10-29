import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  errorMessage,
  toApiDateTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import './CashbookEnhancements.css';

const sourceKeys = [
  'nguon_tao',
  'nghiep_vu_nguon',
  'hoa_don_bao_hanh_id',
  'phieu_bao_hanh_id',
  'phieu_tra_hang_id',
];

const businessLabels = {
  THU_KHACH_BAO_HANH: 'Thu khách bảo hành',
  HOAN_KHACH_BAO_HANH: 'Hoàn khách bảo hành',
  CHI_DON_VI_BAO_HANH: 'Chi đơn vị bảo hành',
  THU_HOAN_DON_VI_BAO_HANH: 'Nhận hoàn từ đơn vị bảo hành',
  HOAN_TIEN_TRA_HANG: 'Hoàn tiền trả hàng',
};

const reservedTypes = new Set([
  'THU_BAN_HANG',
  'THU_HOAN_NCC',
  'CHI_NHAP_HANG',
  'CHI_HOAN_DON_HANG',
  'BH-THU',
  'BH-CHI',
  'THU_KHACH_BAO_HANH',
  'HOAN_KHACH_BAO_HANH',
  'CHI_DON_VI_BAO_HANH',
  'THU_HOAN_DON_VI_BAO_HANH',
  'HOAN_TIEN_TRA_HANG',
]);

export const isManualCashType = (item) =>
  !reservedTypes.has(String(item.ma_loai || '').toUpperCase());

export const canCancelCash = (item) =>
  item?.trang_thai === 'DA_GHI_NHAN' &&
  item?.nguon_tao === 'THU_CONG' &&
  !item?.hoa_don_bao_hanh_id &&
  !item?.phieu_bao_hanh_id &&
  !item?.phieu_tra_hang_id;

export function useCashSourceFilters(onApply) {
  const [search, setSearch] = useSearchParams();
  const key = sourceKeys.map((name) => `${name}=${search.get(name) || ''}`).join('&');

  const params = useMemo(
    () => Object.fromEntries(sourceKeys.map((name) => [name, search.get(name) || undefined])),
    [key]
  );

  const [draft, setDraft] = useState(() =>
    Object.fromEntries(sourceKeys.map((name) => [name, search.get(name) || '']))
  );

  const apply = (values = draft) => {
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous);

        sourceKeys.forEach((name) => {
          const value = String(values[name] || '').trim();
          if (value) next.set(name, value);
          else next.delete(name);
        });

        return next;
      },
      { replace: true }
    );

    onApply?.();
  };

  const clear = () => {
    const empty = Object.fromEntries(sourceKeys.map((name) => [name, '']));
    setDraft(empty);
    apply(empty);
  };

  return { params, key, draft, setDraft, apply, clear };
}

export function CashSourceFilters({ value }) {
  const field = (name, label) => (
    <label>
      <span>{label}</span>
      <input
        inputMode="numeric"
        placeholder="Tất cả"
        value={value.draft[name]}
        onChange={(event) =>
          value.setDraft((current) => ({
            ...current,
            [name]: event.target.value,
          }))
        }
      />
    </label>
  );

  return (
    <fieldset className="cash-source-filters">
      <legend>LỌC NGUỒN GIAO DỊCH</legend>

      <label>
        <span>Nguồn tạo</span>
        <select
          value={value.draft.nguon_tao}
          onChange={(event) =>
            value.setDraft((current) => ({
              ...current,
              nguon_tao: event.target.value,
            }))
          }
        >
          <option value="">Tất cả</option>
          <option value="THU_CONG">Thủ công</option>
          <option value="TU_DONG">Tự động</option>
        </select>
      </label>

      <label>
        <span>Nghiệp vụ nguồn</span>
        <select
          value={value.draft.nghiep_vu_nguon}
          onChange={(event) =>
            value.setDraft((current) => ({
              ...current,
              nghiep_vu_nguon: event.target.value,
            }))
          }
        >
          <option value="">Tất cả</option>
          {Object.entries(businessLabels).map(([code, label]) => (
            <option value={code} key={code}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {field('hoa_don_bao_hanh_id', 'Hóa đơn bảo hành ID')}
      {field('phieu_bao_hanh_id', 'Phiếu bảo hành ID')}
      {field('phieu_tra_hang_id', 'Phiếu trả hàng ID')}

      <div className="cash-source-filter-actions">
        <button type="button" onClick={() => value.apply()}>
          ÁP DỤNG NGUỒN
        </button>
        <button type="button" onClick={value.clear}>
          XÓA LỌC NGUỒN
        </button>
      </div>
    </fieldset>
  );
}

export function CashSourceInfo({ item, compact = false }) {
  if (!item) return null;

  const hasLinks = Boolean(
    item.don_hang_id ||
    item.don_nhap_hang_id ||
    item.phieu_giao_hang_id ||
    item.hoa_don_bao_hanh_id ||
    item.phieu_bao_hanh_id ||
    item.phieu_tra_hang_id
  );

  const sourceTitle =
    businessLabels[item.nghiep_vu_nguon] ||
    (item.phieu_giao_hang_id
      ? 'Thu COD từ đối tác giao hàng'
      : item.don_nhap_hang_id
        ? item.loai_phieu === 'THU'
          ? 'Nhận tiền Nhà Cung Cấp hoàn'
          : 'Thanh toán đơn nhập hàng'
        : item.don_hang_id
          ? item.loai_phieu === 'THU'
            ? 'Thu tiền đơn hàng'
            : 'Hoàn tiền đơn hàng'
          : item.nguon_tao === 'TU_DONG'
            ? 'Phiếu từ nghiệp vụ nguồn'
            : 'Phiếu thủ công');

  return (
    <div className={`cash-source-info ${compact ? 'is-compact' : ''}`}>
      <strong>{sourceTitle}</strong>

      {hasLinks && (
        <div className="cash-source-links">
          {item.don_hang_id && (
            <Link to={`/admin/don-hang/danh-sach-don-hang/${item.don_hang_id}`}>
              Đơn hàng {item.ma_don_hang || `#${item.don_hang_id}`}
            </Link>
          )}

          {item.don_nhap_hang_id && (
            <Link to={`/kho-hang/nhap-hang/${item.don_nhap_hang_id}`}>
              Đơn nhập {item.ma_don_nhap || `#${item.don_nhap_hang_id}`}
            </Link>
          )}

          {item.phieu_giao_hang_id && (
            <Link to={`/admin/don-hang/quan-ly-giao-hang/${item.phieu_giao_hang_id}`}>
              Phiếu giao {item.ma_phieu_giao_hang || `#${item.phieu_giao_hang_id}`}
            </Link>
          )}

          {item.hoa_don_bao_hanh_id && <span>Hóa đơn bảo hành #{item.hoa_don_bao_hanh_id}</span>}

          {item.phieu_bao_hanh_id && (
            <Link to={`/admin/bao-hanh/chi-tiet/${item.phieu_bao_hanh_id}`}>
              Phiếu bảo hành #{item.phieu_bao_hanh_id}
            </Link>
          )}

          {item.phieu_tra_hang_id && (
            <Link to={`/admin/don-hang/khach-tra-hang/${item.phieu_tra_hang_id}`}>
              Phiếu trả hàng #{item.phieu_tra_hang_id}
            </Link>
          )}
        </div>
      )}

      {!compact && !hasLinks && (
        <p>Chứng từ tham chiếu: {item.ma_chung_tu_tham_chieu || 'Chưa ghi nhận'}</p>
      )}
    </div>
  );
}

export function useCashMutation(scope, send) {
  const attempt = useRef(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const run = async (buildBody) => {
    if (lock.current) {
      throw new Error('Thao tác đang được xử lý.');
    }

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      const body = attempt.current ? attempt.current.body : buildBody();

      return await withIdempotency(attempt, scope, body, send);
    } catch (failure) {
      setError(errorMessage(failure));
      throw failure;
    } finally {
      lock.current = false;
      setBusy(false);
      setPending(Boolean(attempt.current));
    }
  };

  return { run, busy, pending, error };
}

export function CashMutationFeedback({ mutation }) {
  return (
    <>
      {mutation.error && (
        <p className="cash-operation-error" role="alert">
          {mutation.error}
        </p>
      )}
      {mutation.pending && (
        <p className="cash-operation-warning" role="status">
          Chưa xác định được kết quả. Bấm xác nhận lần nữa để gửi lại đúng yêu cầu và UUID cũ.
        </p>
      )}
    </>
  );
}

export function buildManualVoucher(values) {
  const {
    group,
    person,
    personId,
    code,
    selectedTypeId,
    refCode,
    amount,
    paymentMethod,
    recordDate,
    description,
    tags,
  } = values;

  const allowedGroups = ['KHACH_HANG', 'NHAN_VIEN', 'NHA_CUNG_CAP', 'DOI_TAC_GIAO_HANG', 'KHAC'];

  if (!allowedGroups.includes(group)) {
    throw new Error('Nhóm người nộp/nhận không hợp lệ.');
  }

  if (!person.trim()) {
    throw new Error('Vui lòng nhập hoặc chọn người nộp/nhận.');
  }

  const typeId = Number(selectedTypeId);
  const number = Number(amount);

  if (!Number.isSafeInteger(typeId) || typeId <= 0) {
    throw new Error('Vui lòng chọn loại thu/chi.');
  }

  if (
    !/^\d+(\.\d{1,2})?$/.test(String(amount).trim()) ||
    !Number.isFinite(number) ||
    number <= 0 ||
    number > 9999999999999.99
  ) {
    throw new Error('Số tiền phải lớn hơn 0, tối đa hai chữ số thập phân.');
  }

  const linked = Number(personId);

  if (
    ['NHAN_VIEN', 'NHA_CUNG_CAP', 'DOI_TAC_GIAO_HANG'].includes(group) &&
    (!Number.isSafeInteger(linked) || linked <= 0)
  ) {
    throw new Error('Vui lòng chọn đúng đối tượng từ dữ liệu hệ thống.');
  }

  const body = {
    ma_phieu: code.trim() || null,
    loai_thu_chi_id: typeId,
    nhom_nguoi_nop_nhan: group,
    ten_nguoi_nop_nhan: person.trim(),
    nguoi_nop_nhan_id: null,
    nha_cung_cap_id: null,
    doi_tac_van_chuyen_id: null,
    ma_chung_tu_tham_chieu: refCode.trim() || null,
    so_tien: number,
    phuong_thuc_thanh_toan: paymentMethod,
    ngay_ghi_nhan: toApiDateTime(recordDate),
    mo_ta: description.trim() || null,
    tags: tags.length ? tags.join(',') : null,
  };

  if (Number.isSafeInteger(linked) && linked > 0) {
    if (group === 'KHACH_HANG' || group === 'NHAN_VIEN') {
      body.nguoi_nop_nhan_id = linked;
    } else if (group === 'NHA_CUNG_CAP') {
      body.nha_cung_cap_id = linked;
    } else if (group === 'DOI_TAC_GIAO_HANG') {
      body.doi_tac_van_chuyen_id = linked;
    }
  }

  return body;
}
