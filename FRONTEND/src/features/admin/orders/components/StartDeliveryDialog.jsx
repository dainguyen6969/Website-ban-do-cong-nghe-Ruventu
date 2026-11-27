import { useEffect, useRef, useState } from 'react';
import { FormDropdown } from '../../../../shared/components/ui/FilterDropdown';
import {
  getDeliveryPackageSuggestion,
  money,
  previewGhnDeliveryFee,
  searchDeliveryPartners,
} from '../api/orderApi';
import OrderModal from './OrderModal';

const PARTNER_LABELS = {
  SHIP_CUA_HANG: 'SHIP CỬA HÀNG',
  SHIP_CA_NHAN: 'SHIP CÁ NHÂN',
  GHN: 'GHN',
};

const validFee = (value) =>
  /^\d{1,13}(?:\.\d{1,2})?$/.test(value.trim()) &&
  Number(value) >= 0 &&
  Number(value) <= 9999999999999.99;

export default function StartDeliveryDialog({
  order,
  delivery = null,
  mode = 'start',
  defaultFee = '',
  busy,
  error,
  close,
  submit,
}) {
  const waiting = order.phieu_giao_hang?.find((item) => item.trang_thai_giao_hang === 'CHO_GIAO');

  const initialPartner = delivery?.doi_tac_van_chuyen || null;

  const editing = mode === 'edit';
  const [method, setMethod] = useState(initialPartner?.loai_doi_tac === 'GHN' ? 'GHN' : 'STAFF');
  const isGhn = !editing && method === 'GHN';

  const [query, setQuery] = useState(
    initialPartner?.ten_doi_tac || waiting?.ten_doi_tac_van_chuyen || ''
  );

  const [selected, setSelected] = useState(initialPartner);

  const [fee, setFee] = useState(
    String(delivery?.phi_tra_doi_tac ?? waiting?.phi_tra_doi_tac ?? defaultFee)
  );
  const [feeFromGhn, setFeeFromGhn] = useState(false);

  const [tracking, setTracking] = useState(delivery?.ma_van_don || waiting?.ma_van_don || '');

  const [confirmed, setConfirmed] = useState(false);
  const [partners, setPartners] = useState([]);
  const [search, setSearch] = useState({
    loading: false,
    error: '',
  });

  useEffect(() => {
    if (selected) return undefined;

    const controller = new AbortController();

    setSearch({ loading: true, error: '' });

    const timer = setTimeout(async () => {
      try {
        const types = editing ? [undefined] : isGhn ? ['GHN'] : ['SHIP_CUA_HANG', 'SHIP_CA_NHAN'];
        const results = await Promise.all(
          types.map((type) => searchDeliveryPartners(query.trim(), controller.signal, type))
        );

        if (controller.signal.aborted) return;

        setPartners(results.flatMap((result) => result?.items ?? []));
        setSearch({ loading: false, error: '' });
      } catch (failure) {
        if (controller.signal.aborted) return;

        setPartners([]);
        setSearch({
          loading: false,
          error: failure.message || 'Không tải được đối tác.',
        });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected, editing, isGhn]);

  function changeMethod(value) {
    if (value === method) return;

    setMethod(value);
    setQuery('');
    setSelected(null);
    setPartners([]);
    setTracking('');
    setFee(value === 'STAFF' ? defaultFee : '');
    setFeeFromGhn(false);
    setConfirmed(false);
  }

  function applyGhnFee(value) {
    setFee(String(value));
    setFeeFromGhn(true);
  }

  function clearAppliedGhnFee() {
    if (feeFromGhn) {
      setFee('');
      setFeeFromGhn(false);
    }
  }

  const valid =
    selected &&
    Number(selected.trang_thai) === 1 &&
    validFee(fee) &&
    (!isGhn || tracking.trim().length > 0) &&
    tracking.trim().length <= 50 &&
    (editing || confirmed);

  return (
    <OrderModal
      title={editing ? 'CHỈNH SỬA THÔNG TIN VẬN ĐƠN' : 'BẮT ĐẦU GIAO HÀNG'}
      className={isGhn ? 'order-start-delivery order-start-delivery--ghn' : 'order-start-delivery'}
      scrollBody={isGhn}
      showClose
      cancelLabel="HỦY"
      confirmLabel={editing ? 'LƯU THÔNG TIN' : 'XÁC NHẬN ĐÃ BÀN GIAO'}
      busy={busy}
      close={close}
      error={error || search.error}
      disabled={!valid}
      submit={() => submit(Number(selected.id), Number(fee), tracking.trim())}
    >
      <p className="order-start-delivery__intro">
        {editing
          ? 'THÔNG TIN VẬN ĐƠN CHỈ SỬA ĐƯỢC KHI PHIẾU CHỜ GIAO'
          : 'CHỌN ĐỐI TÁC VÀ XÁC NHẬN HÀNG ĐÃ ĐƯỢC BÀN GIAO'}
      </p>

      <dl className="order-start-delivery__summary">
        <div>
          <dt>MÃ ĐƠN HÀNG</dt>
          <dd>{order.ma_don_hang}</dd>
        </div>
        <div>
          <dt>NGƯỜI NHẬN</dt>
          <dd>{order.ten_nguoi_nhan || '—'}</dd>
        </div>
        <div>
          <dt>SỐ ĐIỆN THOẠI</dt>
          <dd>{order.sdt_nguoi_nhan || '—'}</dd>
        </div>
        <div>
          <dt>ĐỊA CHỈ GIAO HÀNG</dt>
          <dd>{order.dia_chi_giao_hang || '—'}</dd>
        </div>
      </dl>

      {!editing && (
        <label className="order-operation-field">
          <span>GIAO HÀNG</span>
          <FormDropdown
            aria-label="Cách giao hàng"
            value={method}
            onChange={(event) => changeMethod(event.target.value)}
          >
            <option value="STAFF">Nhân viên cửa hàng</option>
            <option value="GHN">Đơn vị vận chuyển · GHN</option>
          </FormDropdown>
        </label>
      )}

      <div className="order-operation-field">
        <label htmlFor="delivery-person-search">ĐỐI TÁC GIAO HÀNG *</label>

        <input
          id="delivery-person-search"
          maxLength={100}
          autoComplete="off"
          value={query}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setPartners([]);
          }}
        />

        <div className="order-courier-list">
          {(selected ? [selected] : partners).map((partner) => (
            <button
              type="button"
              className="order-courier-card"
              key={partner.id}
              aria-pressed={selected?.id === partner.id}
              onClick={() => {
                setSelected(partner);
                setQuery(partner.ten_doi_tac || '');
              }}
            >
              <span>
                <strong>{partner.ten_doi_tac}</strong>
                <small>
                  {[partner.ma_doi_tac, partner.so_dien_thoai].filter(Boolean).join(' · ')}
                </small>
              </span>

              <span className="order-courier-card__type">
                {PARTNER_LABELS[partner.loai_doi_tac] || partner.loai_doi_tac}
              </span>
            </button>
          ))}
        </div>

        {!selected && search.loading && <small role="status">Đang tìm đối tác...</small>}

        {!selected && !search.loading && !search.error && partners.length === 0 && (
          <small>Không tìm thấy đối tác đang hoạt động.</small>
        )}

        {selected && Number(selected.trang_thai) !== 1 && (
          <small>Đối tác đã ngừng hoạt động. Hãy chọn đối tác khác.</small>
        )}
      </div>

      {isGhn && (
        <GhnQuotePanel
          key={order.id}
          order={order}
          onUseFee={applyGhnFee}
          onChangeQuote={clearAppliedGhnFee}
        />
      )}

      <label className="order-operation-field">
        <span>MÃ VẬN ĐƠN</span>
        <input
          maxLength={50}
          value={tracking}
          onChange={(event) => setTracking(event.target.value)}
          required={isGhn}
          placeholder={isGhn ? 'Mã vận đơn đã có trên GHN' : 'Có thể để trống'}
        />
      </label>

      <label className="order-operation-field">
        <span>PHÍ TRẢ ĐỐI TÁC (đ) *</span>
        <input
          type="number"
          required
          min="0"
          max="9999999999999.99"
          step="0.01"
          value={fee}
          onChange={(event) => {
            setFee(event.target.value);
            setFeeFromGhn(false);
          }}
        />
        <small>Đây là phí trả người giao, khác với phí giao hàng thu từ khách.</small>
      </label>

      {!editing && (
        <label className="order-operation-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Tôi xác nhận đối tác đã nhận hàng từ cửa hàng/kho.
        </label>
      )}
    </OrderModal>
  );
}

const GHN_PACKAGE_FIELDS = [
  ['khoi_luong_g', 'KHỐI LƯỢNG (g)', 19999],
  ['chieu_dai_cm', 'DÀI (cm)', 200],
  ['chieu_rong_cm', 'RỘNG (cm)', 200],
  ['chieu_cao_cm', 'CAO (cm)', 200],
];

const GHN_ADDRESS_FIELDS = [
  ['dia_chi_giao_hang', 'ĐỊA CHỈ ĐẦY ĐỦ THEO GHN', 1024],
  ['phuong_xa', 'PHƯỜNG/XÃ THEO GHN', 120],
  ['tinh_thanh', 'TỈNH/THÀNH THEO GHN', 120],
];

const EMPTY_QUOTE = { loading: false, fee: null, error: '' };

function GhnQuotePanel({ order, onUseFee, onChangeQuote }) {
  const [draft, setDraft] = useState({
    dia_chi_giao_hang: order.dia_chi_giao_hang || '',
    phuong_xa: '',
    tinh_thanh: '',
  });
  const [suggestion, setSuggestion] = useState({ loading: true, message: '' });
  const [quote, setQuote] = useState(EMPTY_QUOTE);
  const activeQuote = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    getDeliveryPackageSuggestion(order.id, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;

        const values = Object.fromEntries(
          GHN_PACKAGE_FIELDS.map(([key]) => [key, String(data?.[key] ?? '')])
        );
        setDraft((current) => ({ ...current, ...values }));
        setSuggestion({ loading: false, message: data?.ly_do || '' });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSuggestion({ loading: false, message: 'Chưa có gợi ý. Nhập thông số kiện thực tế.' });
        }
      });

    return () => {
      controller.abort();
      activeQuote.current?.abort();
    };
  }, [order.id]);

  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setQuote(EMPTY_QUOTE);
    onChangeQuote();
  }

  const canQuote =
    !suggestion.loading &&
    !quote.loading &&
    GHN_ADDRESS_FIELDS.every(([key]) => draft[key].trim()) &&
    GHN_PACKAGE_FIELDS.every(([key, , max]) => {
      const value = String(draft[key] ?? '').trim();
      return /^\d+$/u.test(value) && Number(value) >= 1 && Number(value) <= max;
    });

  async function calculateFee() {
    if (!canQuote || activeQuote.current) return;

    const controller = new AbortController();
    activeQuote.current = controller;
    onChangeQuote();
    setQuote({ ...EMPTY_QUOTE, loading: true });

    const body = Object.fromEntries([
      ...GHN_PACKAGE_FIELDS.map(([key]) => [key, Number(draft[key])]),
      ...GHN_ADDRESS_FIELDS.map(([key]) => [key, draft[key].trim()]),
    ]);

    try {
      const result = await previewGhnDeliveryFee(order.id, body, controller.signal);
      if (controller.signal.aborted) return;

      const fee = result?.phi_tra_doi_tac_du_kien;
      if (!Number.isSafeInteger(fee) || fee < 0) {
        throw new Error('Phản hồi GHN thiếu tổng phí hợp lệ.');
      }
      setQuote({ ...EMPTY_QUOTE, fee });
    } catch (failure) {
      if (!controller.signal.aborted) {
        setQuote({ ...EMPTY_QUOTE, error: failure.message || 'Chưa lấy được phí GHN.' });
      }
    } finally {
      if (activeQuote.current === controller) activeQuote.current = null;
    }
  }

  return (
    <section className="order-ghn-quote" aria-label="Phí GHN dự kiến">
      <small>Một kiện dưới 20 kg, mỗi chiều tối đa 200 cm. Có thể sửa theo số đo thực tế.</small>
      {suggestion.loading && <small role="status">Đang lấy gợi ý kiện...</small>}
      {suggestion.message && <small>{suggestion.message}</small>}

      <div className="order-ghn-quote__grid">
        {GHN_PACKAGE_FIELDS.map(([key, label]) => (
          <label key={key} className="order-operation-field">
            <span>{label}</span>
            <input
              type="text"
              inputMode="numeric"
              disabled={suggestion.loading || quote.loading}
              value={draft[key] ?? ''}
              onChange={(event) => updateField(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      {GHN_ADDRESS_FIELDS.map(([key, label, maxLength]) => (
        <label key={key} className="order-operation-field">
          <span>{label}</span>
          <input
            maxLength={maxLength}
            disabled={quote.loading}
            value={draft[key]}
            onChange={(event) => updateField(key, event.target.value)}
          />
        </label>
      ))}
      <small>Dùng tên phường/xã và tỉnh/thành theo địa chỉ hai cấp của GHN.</small>

      <div className="order-ghn-quote__actions">
        <button
          type="button"
          className="order-action order-action--back"
          disabled={!canQuote}
          onClick={calculateFee}
        >
          {quote.loading ? 'ĐANG TÍNH...' : 'TÍNH PHÍ GHN'}
        </button>
        {quote.fee != null && (
          <>
            <strong aria-live="polite">{money(quote.fee)}</strong>
            <button
              type="button"
              className="order-action order-action--back"
              onClick={() => onUseFee(quote.fee)}
            >
              DÙNG MỨC PHÍ NÀY
            </button>
          </>
        )}
      </div>

      {quote.error && (
        <p className="order-api-message order-api-message--error" role="alert">
          {quote.error}
        </p>
      )}
    </section>
  );
}
