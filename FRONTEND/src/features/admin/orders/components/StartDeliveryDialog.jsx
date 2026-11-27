import { useEffect, useRef, useState } from 'react';
import { VIETNAM_LOCATIONS } from '../../../../data/vietnamLocations';
import { FormDropdown } from '../../../../shared/components/ui/FilterDropdown';
import {
  getDeliveryPackageSuggestion,
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

  const [feeInput, setFeeInput] = useState(() =>
    isGhn ? null : String(delivery?.phi_tra_doi_tac ?? waiting?.phi_tra_doi_tac ?? defaultFee)
  );
  const [ghnFee, setGhnFee] = useState(null);
  const fee = feeInput ?? String(ghnFee ?? '');

  const [tracking, setTracking] = useState(delivery?.ma_van_don || waiting?.ma_van_don || '');

  const [confirmed, setConfirmed] = useState(false);
  const [partners, setPartners] = useState([]);
  const [search, setSearch] = useState({
    loading: false,
    error: '',
  });

  useEffect(() => {
    if (selected || isGhn) return undefined;

    const controller = new AbortController();

    setSearch({ loading: true, error: '' });

    const timer = setTimeout(async () => {
      try {
        const types = editing ? [undefined] : ['SHIP_CUA_HANG', 'SHIP_CA_NHAN'];
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
    setFeeInput(value === 'GHN' ? null : defaultFee);
    setGhnFee(null);
    setConfirmed(false);
  }

  const valid =
    (isGhn || (selected && Number(selected.trang_thai) === 1)) &&
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
      error={error || (!isGhn ? search.error : '')}
      disabled={!valid}
      submit={() => submit(isGhn ? 'GHN' : Number(selected.id), Number(fee), tracking.trim())}
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
        {!isGhn && (
          <div>
            <dt>ĐỊA CHỈ GIAO HÀNG</dt>
            <dd>{order.dia_chi_giao_hang || '—'}</dd>
          </div>
        )}
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

      {!isGhn && (
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
      )}

      {isGhn && <GhnQuotePanel key={order.id} order={order} onFeeChange={setGhnFee} />}

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
          onChange={(event) => setFeeInput(event.target.value)}
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

const GHN_WARD_PREFIX = /^(?:(?:phuong|xa|thi tran|dac khu)\s+|(?:p|x|tt)\.\s*)/u;
const GHN_DISTRICT_PREFIX = /^(?:(?:quan|huyen|thi xa|thanh pho)\s+|(?:q|h|tx|tp)\.\s*)/u;
const GHN_PROVINCE_PREFIX = /^(?:tinh\s+|thanh pho\s+|tp(?:\s+|\.\s*))/u;
const EMPTY_QUOTE = { loading: false, error: '' };

function ghnAddressKey(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/đ/gu, 'd')
    .replace(/\s+/gu, ' ')
    .trim();
}

function ghnProvinceKey(value) {
  const key = ghnAddressKey(value).replace(GHN_PROVINCE_PREFIX, '');
  return key === 'hcm' ? 'ho chi minh' : key;
}

function ghnDestination(address) {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (['viet nam', 'vietnam'].includes(ghnAddressKey(parts.at(-1) ?? ''))) parts.pop();

  const provinceText = parts.pop() ?? '';
  const provinceKey = ghnProvinceKey(provinceText);
  if (!provinceKey) return null;

  const knownProvince = Object.keys(VIETNAM_LOCATIONS).find(
    (province) => ghnProvinceKey(province) === provinceKey
  );
  const province = (knownProvince ?? provinceText).replace(
    /^(?:tỉnh\s+|thành phố\s+|tp(?:\s+|\.\s*))/iu,
    ''
  );
  while (parts.length > 1 && ghnProvinceKey(parts.at(-1)) === provinceKey) parts.pop();

  const area = parts.at(-1) ?? '';
  const areaKey = ghnAddressKey(area);
  const knownDistrict =
    (VIETNAM_LOCATIONS[knownProvince] ?? []).find(
      (name) =>
        ghnAddressKey(name).replace(GHN_DISTRICT_PREFIX, '') ===
        areaKey.replace(GHN_DISTRICT_PREFIX, '')
    ) ?? '';
  const district = GHN_WARD_PREFIX.test(areaKey)
    ? ''
    : knownDistrict || (GHN_DISTRICT_PREFIX.test(areaKey) ? area : '');

  if (district) {
    parts.pop();
    const districtKey = ghnAddressKey(district).replace(GHN_DISTRICT_PREFIX, '');
    while (parts.length > 1) {
      const last = parts.at(-1);
      const lastKey = ghnAddressKey(last);
      const repeatsDistrict =
        !GHN_WARD_PREFIX.test(lastKey) && lastKey.replace(GHN_DISTRICT_PREFIX, '') === districtKey;
      if (ghnProvinceKey(last) !== provinceKey && !repeatsDistrict) break;
      parts.pop();
    }
  }

  const wardText = parts.pop() ?? '';
  const wardKey = ghnAddressKey(wardText);
  if (
    parts.length === 0 ||
    !wardText ||
    GHN_DISTRICT_PREFIX.test(wardKey) ||
    (!district && !GHN_WARD_PREFIX.test(wardKey))
  ) {
    return null;
  }

  const ward =
    district && /^(?:quan\s+|q\.)/u.test(ghnAddressKey(district)) && !GHN_WARD_PREFIX.test(wardKey)
      ? 'Phường ' + wardText
      : wardText;

  return {
    dia_chi_giao_hang: [...parts, ward, district, province].filter(Boolean).join(', '),
    phuong_xa: ward,
    tinh_thanh: province,
    ...(district ? { quan_huyen: district } : {}),
  };
}

function GhnQuotePanel({ order, onFeeChange }) {
  const [draft, setDraft] = useState(() => {
    const address = order.dia_chi_giao_hang || '';
    return { address: ghnDestination(address)?.dia_chi_giao_hang ?? address };
  });
  const [loadingSuggestion, setLoadingSuggestion] = useState(true);
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
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSuggestion(false);
      });

    return () => controller.abort();
  }, [order.id]);

  useEffect(() => {
    if (
      loadingSuggestion ||
      !GHN_PACKAGE_FIELDS.every(([key, , max]) => {
        const value = draft[key]?.trim() ?? '';
        return /^\d+$/u.test(value) && Number(value) >= 1 && Number(value) <= max;
      })
    ) {
      return undefined;
    }

    const destination = ghnDestination(draft.address);
    if (!destination) {
      setQuote({
        loading: false,
        error: 'Kiểm tra phường/xã và tỉnh/thành trong địa chỉ tính phí.',
      });
      return undefined;
    }

    const controller = new AbortController();
    activeQuote.current = controller;
    setQuote({ loading: true, error: '' });

    const timer = setTimeout(async () => {
      try {
        const size = Object.fromEntries(
          GHN_PACKAGE_FIELDS.map(([key]) => [key, Number(draft[key])])
        );
        const data = await previewGhnDeliveryFee(
          order.id,
          { ...size, ...destination },
          controller.signal
        );
        if (controller.signal.aborted) return;

        const amount = data?.phi_tra_doi_tac_du_kien;
        if (!Number.isSafeInteger(amount) || amount < 0) {
          throw new Error('GHN trả về mức phí không hợp lệ.');
        }
        onFeeChange(amount);
        setQuote(EMPTY_QUOTE);
      } catch (error) {
        if (!controller.signal.aborted) {
          setQuote({ loading: false, error: error.message || 'Chưa lấy được phí GHN.' });
        }
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [order.id, draft, loadingSuggestion, onFeeChange]);

  function updateField(key, value) {
    activeQuote.current?.abort();
    onFeeChange(null);
    setQuote(EMPTY_QUOTE);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="order-ghn-quote" aria-label="Phí GHN dự kiến">
      <small>Một kiện dưới 20 kg, mỗi chiều tối đa 200 cm.</small>
      {loadingSuggestion && <small role="status">Đang lấy gợi ý kiện...</small>}

      <div className="order-ghn-quote__grid">
        {GHN_PACKAGE_FIELDS.map(([key, label]) => (
          <label key={key} className="order-operation-field">
            <span>{label}</span>
            <input
              inputMode="numeric"
              disabled={loadingSuggestion}
              value={draft[key] ?? ''}
              onChange={(event) => updateField(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      <label className="order-operation-field">
        <span>ĐỊA CHỈ TÍNH PHÍ GHN</span>
        <input
          maxLength={1024}
          value={draft.address}
          onChange={(event) => updateField('address', event.target.value)}
        />
      </label>

      {quote.loading && <small role="status">Đang tính phí GHN...</small>}
      {quote.error && (
        <p className="order-api-message order-api-message--error" role="alert">
          {quote.error}
        </p>
      )}
    </section>
  );
}
