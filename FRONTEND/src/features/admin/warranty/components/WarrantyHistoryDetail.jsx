import { useEffect, useRef, useState } from 'react';
import { getWarrantyHistoryDetail, warrantyError } from '../api/warrantyApi';
import { actions, fieldLabels } from '../data/warrantyActions';
import { displayDate } from '../data/warrantyContract';
import { eventLabels } from '../data/warrantyExperience';
import { displayValue } from './WarrantySnapshot';
import { WarrantyBadge, WarrantyFields, WarrantyPanel, WarrantyTable } from './WarrantyShell';

const labels = {
  ...fieldLabels,
  id: 'ID bản ghi',
  phieu_bao_hanh_id: 'Phiếu bảo hành',
  lich_su_id: 'ID lịch sử',
  su_kien: 'Thao tác',
  hanh_dong: 'Hành động',
  ngay: 'Thời điểm giao nhận',
  ngay_tao: 'Thời điểm ghi nhận',
  nguoi_thuc_hien_id: 'Người thực hiện',
  nguoi_phe_duyet_id: 'Người phê duyệt',

  thiet_bi: 'Thiết bị',
  thiet_bi_hien_hanh: 'Thiết bị hiện hành',
  thiet_bi_thay_the_id: 'Thiết bị thay thế',
  thiet_bi_thuc_nhan_id: 'Thiết bị thực nhận',
  thiet_bi_cap_doi_id: 'Thiết bị cấp đổi',
  ma_theo_doi: 'Mã theo dõi',
  so_serial: 'Serial',
  ten_san_pham: 'Sản phẩm',
  ten_phien_ban: 'Phiên bản',
  han_bao_hanh: 'Hạn bảo hành',
  can_cu_tinh_han: 'Căn cứ tính hạn',
  la_thiet_bi_hien_hanh: 'Là thiết bị hiện hành',

  tiep_nhan: 'Thông tin tiếp nhận',
  ket_luan: 'Kết luận kiểm tra',
  bao_phi_don_vi: 'Chi phí đơn vị',
  giao_nhan: 'Thông tin giao nhận',
  hang_thuc_nhan: 'Hàng thực nhận',
  vat_thuc_nhan: 'Thông tin vật thực nhận',
  noi_dang_giu: 'Nơi giữ thiết bị sau thao tác',
  noi_dang_giu_thiet_bi_cu: 'Nơi giữ thiết bị cũ',
  noi_luu: 'Nơi lưu',

  da_gui_thuc_te: 'Đã gửi thực tế',
  don_vi_da_xac_nhan_nhan: 'Đơn vị đã xác nhận nhận',
  da_tiep_nhan: 'Đã tiếp nhận',
  da_nhan_dung_thiet_bi: 'Đã nhận đúng thiết bị',
  da_xu_ly: 'Đã xử lý tại thời điểm ghi nhận',

  cong_viec_da_bat_dau: 'Công việc đã bắt đầu',
  tien_do: 'Tiến độ',
  mien_phi: 'Miễn phí cho khách',
  yeu_cau_dung: 'Yêu cầu dừng xử lý',
  phan_chua_thuc_hien_dung: 'Dừng phần chưa thực hiện',
  yeu_cau_thu_hoi: 'Yêu cầu nhận thiết bị về',
  trang_thai: 'Thông tin trạng thái',
  trang_thai_truoc: 'Trạng thái trước',
  trang_thai_sau: 'Trạng thái sau',
  ket_qua_truoc: 'Kết quả trước',
  ket_qua_sau: 'Kết quả sau',
  san_sang_tra: 'Thông tin sẵn sàng trả',

  bao_gia: 'Báo giá',
  phien_ban: 'Phiên bản',
  quyet_dinh: 'Quyết định',
  dieu_kien_dat_coc: 'Điều kiện đặt cọc',
  so_tien_toi_thieu: 'Số tiền tối thiểu',
  tong_tien_khach: 'Tổng tiền khách',
  thanh_tien_khach: 'Thành tiền khách',
  tong_bao_phi: 'Tổng báo phí',
  da_xac_nhan: 'Đã xác nhận',

  dieu_chinh_hoa_don: 'Điều chỉnh hóa đơn',
  hoa_don_truoc: 'Hóa đơn trước điều chỉnh',
  hoa_don_sau: 'Hóa đơn sau điều chỉnh',
  phe_duyet_mien_giam: 'Phê duyệt miễn giảm',
  phe_duyet_cong_no: 'Phê duyệt công nợ',
  duoc_ban_giao_khi_con_no: 'Cho phép bàn giao khi còn nợ',
  giao_dich_tien: 'Giao dịch tiền',
  phieu_thu_chi_id: 'Phiếu thu / chi',

  phuong_an_doi: 'Phương án đổi',
  da_duyet: 'Đã phê duyệt',
  khach_dong_y: 'Khách đã đồng ý',
  da_huy: 'Đã hủy',
  da_ban_giao: 'Đã bàn giao',
  han_bao_hanh_ap_dung: 'Hạn bảo hành áp dụng',
  giu_cho_hang_doi: 'Giữ chỗ hàng đổi',
  xuat_hang_doi: 'Xuất hàng đổi',
  nhan_hang_don_vi: 'Nhận hàng đơn vị cấp',
  nhan_hoan_xuat: 'Nhận hoàn hàng đã xuất',
  tra_hang_cap_rieng: 'Trả hàng cấp riêng',

  doi_soat_nha_cung_cap: 'Đối soát nhà cung cấp',
  nghia_vu: 'Nghĩa vụ',
  da_giai_quyet: 'Đã giải quyết',
  so_luong_da_bu: 'Số lượng đã bù',
  so_luong_con_bu: 'Số lượng còn bù',
  so_tien_con_doi_soat: 'Số tiền còn đối soát',
  don_vi_nhan_thiet_bi_cu: 'Đơn vị nhận thiết bị cũ',
  nhan_thiet_bi_cu: 'Nhận lại thiết bị cũ',
  quyet_dinh_doi_soat: 'Quyết định đối soát',
  du_lieu: 'Nội dung ghi nhận',

  anh_urls: 'Ảnh tiếp nhận',
};

const values = {
  THIEU_PHU_KIEN: 'Thiếu phụ kiện',
  THUA_PHU_KIEN: 'Thừa phụ kiện',
  SAI_THIET_BI: 'Sai thiết bị',
  CUA_HANG: 'Cửa hàng',
  DON_VI_BAO_HANH: 'Đơn vị bảo hành',
  KHACH_HANG: 'Khách hàng',
  DANG_VAN_CHUYEN: 'Đang vận chuyển',
};

const extraEvents = {
  YEU_CAU_DUNG: 'Yêu cầu dừng xử lý',
  LAP_BAO_GIA: 'Lập báo giá',
  SU_KIEN_BAO_GIA: 'Ghi nhận sự kiện báo giá',
  BAO_GIA_HET_HAN: 'Báo giá hết hạn',
  DIEU_CHINH_HOA_DON_BAO_HANH: 'Điều chỉnh hóa đơn bảo hành',
};

export function warrantyHistoryEventName(type) {
  return (
    eventLabels[type] ||
    extraEvents[type] ||
    actions.find((item) => item.key === type)?.label ||
    displayValue(type)
  );
}

function fieldName(key) {
  return labels[key] || key.replaceAll('_', ' ');
}

function reference(value) {
  return value == null ? '—' : `#${value}`;
}

function safeHref(value) {
  const text = String(value || '').trim();

  if (/[\u0000-\u001f\\]/.test(text)) return null;
  if (text.startsWith('/') && !text.startsWith('//')) return text;

  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function scalar(value, field) {
  if (value == null || value === '') return 'Chưa ghi nhận';

  if (field === 'su_kien' || field === 'loai_su_kien') {
    return warrantyHistoryEventName(value);
  }

  if (field === 'da_nhan_dung_thiet_bi') {
    return (
      <WarrantyBadge tone={value ? 'green' : 'red'}>
        {value ? 'Đúng thiết bị' : 'Chưa nhận đúng thiết bị'}
      </WarrantyBadge>
    );
  }

  if (/^id$|_id$/.test(field)) return reference(value);

  const text = values[value] || displayValue(value, field);

  return (
    <span>
      {String(text)
        .split('\n')
        .map((line, index) => (
          <span key={index}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
    </span>
  );
}

function HistoryData({ value, field = '' }) {
  if (value == null) {
    return <p className="w-shell-note">Chưa ghi nhận.</p>;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return (
        <p className="w-shell-note">
          {field === 'phu_kien'
            ? 'Không ghi nhận phụ kiện trong lần này.'
            : field === 'sai_lech'
              ? 'Không ghi nhận sai lệch trong lần này.'
              : 'Không có bản ghi trong mục này.'}
        </p>
      );
    }

    if (field.endsWith('_urls')) {
      return (
        <ul>
          {value.map((item, index) => {
            const href = safeHref(item);

            return (
              <li key={index}>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {String(item)}
                  </a>
                ) : (
                  <span>{String(item)}</span>
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    if (field === 'phu_kien') {
      return (
        <WarrantyTable
          columns={['Phụ kiện', 'Số lượng']}
          rows={value.map((item) => [item.ten || 'Chưa ghi tên', item.so_luong])}
        />
      );
    }

    if (field === 'sai_lech') {
      return (
        <WarrantyTable
          columns={['ID sai lệch', 'Loại sai lệch', 'Nội dung', 'Thiết bị', 'Xử lý lúc ghi nhận']}
          rows={value.map((item) => [
            reference(item.id),
            values[item.loai] || item.loai,
            item.noi_dung,
            reference(item.thiet_bi_id),
            <WarrantyBadge
              key={item.id}
              tone={
                item.da_xu_ly === true ? 'green' : item.da_xu_ly === false ? 'amber' : 'neutral'
              }
            >
              {item.da_xu_ly === true
                ? 'Đã xử lý'
                : item.da_xu_ly === false
                  ? 'Chưa xử lý'
                  : 'Chưa ghi nhận'}
            </WarrantyBadge>,
          ])}
        />
      );
    }

    if (field.endsWith('_ids') || field === 'sai_lech_da_xu_ly') {
      return <p>{value.map(reference).join(', ')}</p>;
    }

    return (
      <>
        {value.map((item, index) => (
          <article className="w-conclusion" key={index}>
            <div className="w-shell-title-row">
              <strong>
                {fieldName(field)} {index + 1}
              </strong>
            </div>
            <HistoryData value={item} />
          </article>
        ))}
      </>
    );
  }

  if (typeof value !== 'object') {
    return <p>{scalar(value, field)}</p>;
  }

  const entries = Object.entries(value);

  if (!entries.length) {
    return <p className="w-shell-note">Bản ghi này chưa có dữ liệu chi tiết.</p>;
  }

  const simple = entries.filter(([, item]) => item == null || typeof item !== 'object');
  const nested = entries.filter(([, item]) => item != null && typeof item === 'object');

  return (
    <>
      {simple.length > 0 && (
        <WarrantyFields fields={simple.map(([key, item]) => [fieldName(key), scalar(item, key)])} />
      )}

      {nested.map(([key, item]) => (
        <section className="w-shell-subsection" key={key}>
          <h3>{fieldName(key)}</h3>
          <HistoryData value={item} field={key} />
        </section>
      ))}
    </>
  );
}

export default function WarrantyHistoryDetail({ ticketId, eventId, onClose }) {
  const panelRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setData(null);
    setLoading(true);
    setError('');

    getWarrantyHistoryDetail(ticketId, eventId, controller.signal)
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
  }, [ticketId, eventId, retry]);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  return (
    <div
      ref={panelRef}
      className="w-shell-panel"
      tabIndex={-1}
      aria-label={`Chi tiết thao tác ${eventId}`}
    >
      <WarrantyPanel
        title={`Chi tiết thao tác #${eventId}`}
        note="Dữ liệu tại thời điểm thao tác được ghi nhận. Các lần xử lý sau được lưu thành sự kiện riêng."
        action={
          <button type="button" className="w-shell-button" onClick={onClose}>
            Đóng chi tiết
          </button>
        }
      >
        {loading && <p role="status">Đang tải chi tiết thao tác…</p>}

        {error && (
          <div className="w-shell-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="w-shell-button"
              onClick={() => setRetry((current) => current + 1)}
            >
              Thử lại
            </button>
          </div>
        )}

        {data && (
          <>
            <WarrantyFields
              fields={[
                ['Thao tác', warrantyHistoryEventName(data.loai_su_kien)],
                ['Thời điểm ghi nhận', displayDate(data.ngay_tao)],
                [
                  'Người thực hiện',
                  data.ten_nguoi_thuc_hien ||
                    (data.nguoi_thuc_hien_id
                      ? `Nhân viên #${data.nguoi_thuc_hien_id}`
                      : 'Chưa ghi nhận'),
                ],
                ['Nội dung', data.noi_dung || 'Chưa ghi nhận'],
              ]}
            />

            <section className="w-shell-subsection">
              <h3>Nội dung chi tiết đã lưu</h3>
              <HistoryData value={data.chi_tiet} />
            </section>
          </>
        )}
      </WarrantyPanel>
    </div>
  );
}
