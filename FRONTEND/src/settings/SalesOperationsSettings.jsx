import AdminHelp from '../shared/components/ui/AdminHelp';
import { useEffect, useId, useState } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import { getSalesOperations, saveSalesOperations } from './settingsApi';

const WEEK = [
  ['MONDAY', 'T2'], ['TUESDAY', 'T3'], ['WEDNESDAY', 'T4'], ['THURSDAY', 'T5'],
  ['FRIDAY', 'T6'], ['SATURDAY', 'T7'], ['SUNDAY', 'CN'],
];
const numberFields = ['reviewMinutes', 'prepareMinutes', 'deliveryFee', 'backorderLongWaitHours'];
const sortDates = (dates) => [...new Set(dates)].sort();

export default function SalesOperationsSettings() {
  const title = useId();
  const [values, setValues] = useState(null);
  const [holiday, setHoliday] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    setError('');
    getSalesOperations(request.signal)
      .then((data) => { if (!request.signal.aborted) setValues(data); })
      .catch((reason) => { if (!request.signal.aborted) setError(reason.message); });
    return () => request.abort();
  }, [reload]);

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setNotice('');
    setError('');
  }

  function addHoliday() {
    if (!holiday) return;
    change('closedDates', sortDates([...values.closedDates, holiday]));
    setHoliday('');
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setNotice('');
    setError('');
    if (!values.workingDays.length) {
      setError('Chọn ít nhất một ngày làm việc.');
      return;
    }
    const body = { ...values, closedDates: sortDates([...values.closedDates, ...(holiday ? [holiday] : [])]) };
    for (const key of numberFields) body[key] = Number(body[key]);
    setSaving(true);
    try {
      setValues(await saveSalesOperations(body));
      setHoliday('');
      setNotice('Đã lưu cài đặt vận hành bán hàng.');
    } catch (reason) {
      setError(reason.message || 'Không thể lưu cài đặt vận hành.');
    } finally {
      setSaving(false);
    }
  }

  function numberField(key, label, min, max, step = 1) {
    return (
      <label className="sales-settings__field">
        {label}
        <input type="number" min={min} max={max} step={step} required
          value={values[key]} onChange={(event) => change(key, event.target.value)} />
      </label>
    );
  }

  return (
    <section className="sales-settings" aria-labelledby={title}>
      <h3 id={title}>Vận hành bán hàng</h3>
      {error && <p className="system-settings__error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!values && (error
        ? <button className="system-settings__toggle" type="button" onClick={() => setReload((n) => n + 1)}>Tải lại</button>
        : <p role="status">Đang tải cài đặt vận hành…</p>)}
      {values && (
        <form onSubmit={save}>
          <fieldset className="sales-settings__sections" disabled={saving}>
            <fieldset className="sales-settings__group sales-settings__schedule">
              <legend>
                <span className="admin-heading-with-help">
                  <CalendarDays size={15} aria-hidden="true" /> Lịch tiếp nhận đơn
                  <AdminHelp>Đơn ngoài giờ vẫn được tiếp nhận. Khi tắt lịch, hạn xử lý tính liên tục.</AdminHelp>
                </span>
              </legend>
              <label className="sales-settings__check">
                <input type="checkbox" checked={values.scheduleEnabled}
                  onChange={(event) => change('scheduleEnabled', event.target.checked)} />
                Áp dụng lịch làm việc
              </label>
              <div className="sales-settings__pair">
                {[['opensAt', 'Giờ mở cửa'], ['closesAt', 'Giờ đóng cửa']].map(([key, label]) => (
                  <label className="sales-settings__field" key={key}>
                    {label}
                    <input type="time" step={1} required value={values[key]}
                      onChange={(event) => change(key, event.target.value)} />
                  </label>
                ))}
              </div>
              <fieldset className="sales-settings__week">
                <legend>Ngày làm việc</legend>
                <div>
                  {WEEK.map(([key, label], index) => (
                    <label key={key}>
                      <input type="checkbox" checked={values.workingDays.includes(key)}
                        aria-label={index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`}
                        onChange={(event) => change('workingDays', event.target.checked
                          ? [...values.workingDays, key] : values.workingDays.filter((day) => day !== key))} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sales-settings__date">
                <label className="sales-settings__field">
                  Ngày nghỉ riêng
                  <input type="date" value={holiday} onChange={(event) => setHoliday(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addHoliday(); } }} />
                </label>
                <button type="button" className="system-settings__toggle" disabled={!holiday} onClick={addHoliday}>
                  <Plus size={14} aria-hidden="true" /> Thêm ngày
                </button>
              </div>
              {values.closedDates.length > 0 && (
                <ul className="sales-settings__dates" aria-label="Ngày nghỉ đã chọn">
                  {sortDates(values.closedDates).map((day) => (
                    <li key={day}>
                      <time dateTime={day}>{day.split('-').reverse().join('/')}</time>
                      <button type="button" aria-label={`Xóa ngày nghỉ ${day.split('-').reverse().join('/')}`}
                        onClick={() => change('closedDates', values.closedDates.filter((value) => value !== day))}>
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
            <fieldset className="sales-settings__group">
              <legend>Thời hạn xử lý đơn</legend>
              <div className="sales-settings__pair">
                {numberField('reviewMinutes', 'Duyệt đơn (phút)', 1, 10080)}
                {numberField('prepareMinutes', 'Chuẩn bị đơn (phút)', 1, 10080)}
              </div>
            </fieldset>
            <fieldset className="sales-settings__group">
              <legend>Phí giao hàng website</legend>
              {numberField('deliveryFee', 'Phí giao hàng (₫)', 0, 999999999.99, 0.01)}
            </fieldset>
            <fieldset className="sales-settings__group">
              <legend>Thông báo hàng về</legend>
              <label className="sales-settings__check">
                <input type="checkbox" checked={values.stockNotificationWebsiteEnabled}
                  onChange={(event) => change('stockNotificationWebsiteEnabled', event.target.checked)} />
                Mở đăng ký trên website
              </label>
            </fieldset>
            <fieldset className="sales-settings__group">
              <legend>
                <span className="admin-heading-with-help">
                  Mốc đánh dấu đơn chờ lâu
                  <AdminHelp>Mốc này dùng để đánh dấu trong danh sách chờ.</AdminHelp>
                </span>
              </legend>
              {numberField('backorderLongWaitHours', 'Đánh dấu sau (giờ)', 1, 8760)}
            </fieldset>
          </fieldset>
          <button type="submit" className="system-settings__save" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu cài đặt vận hành'}
          </button>
        </form>
      )}
    </section>
  );
}
