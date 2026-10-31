import { useEffect, useRef, useState } from 'react';
import { FONT_OPTIONS } from '../typography/fontOptions';
import FontSizeControl from '../typography/FontSizeControl';
import { getSystemStatus, getTypography, saveMaintenance, saveTypography, SETTINGS_CHANGED } from './settingsApi';
import './SystemSettings.css';

export default function SystemSettings() {
  const [status, setStatus] = useState(null);
  const [font, setFont] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const dirty = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([getSystemStatus(), getTypography()]).then(([system, typography]) => {
      if (active) { setStatus(system); setFont(typography); setError(''); }
    }).catch((e) => { if (active) setError(e.message || 'Không thể tải cài đặt.'); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    let active = true;
    const refresh = () => getSystemStatus().then((next) => {
      if (!active) return;
      setStatus(next);
      if (!dirty.current && next.fontSize && next.fontFamily) setFont((current) => current && (current.fontSize !== next.fontSize || current.fontFamily !== next.fontFamily) ? { fontFamily: next.fontFamily, fontSize: next.fontSize } : current);
    }).catch(() => {});
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener(SETTINGS_CHANGED, refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener(SETTINGS_CHANGED, refresh); };
  }, []);

  const toggleMaintenance = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const next = await saveMaintenance(!status.maintenance);
      setStatus(next);
      setNotice(next.maintenance ? 'Đã bật bảo trì. Đăng nhập và mua hàng đã được giới hạn.' : 'Đã tắt bảo trì. Hệ thống hoạt động bình thường.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const saveFont = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const saved = await saveTypography({ ...font, fontSize: Number(font.fontSize) });
      setFont(saved);
      dirty.current = false;
      setNotice('Đã lưu phông chữ và cỡ chữ chung cho toàn bộ hệ thống.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="system-settings" aria-labelledby="system-settings-title">
      <header><h2 id="system-settings-title">Cài đặt hệ thống</h2></header>
      <div className="system-settings__body">
        {error && <p role="alert" className="system-settings__error">{error} <button type="button" onClick={() => setReload((n) => n + 1)}>Tải lại</button></p>}
        <span role="status" className="sr-only">{notice}</span>
        {!font && !error && <p role="status">Đang tải cài đặt…</p>}
        {status?.canManage && <div className="system-settings__maintenance">
          <div><h3>Chế độ bảo trì</h3><p>Khi bật, chỉ quản trị viên được đăng nhập. Tất cả thao tác tạo đơn và thanh toán đều bị chặn.</p></div>
          <button type="button" role="switch" aria-checked={status.maintenance} aria-label="Chế độ bảo trì"
            className={`system-settings__toggle ${status.maintenance ? 'is-active' : ''}`} disabled={busy} onClick={toggleMaintenance}>{status.maintenance ? 'Đang bật' : 'Đang tắt'}</button>
        </div>}
        {font && <form onSubmit={saveFont} className="system-settings__typography">
          <h3>Phông chữ và cỡ chữ</h3>
          <p>Phông chữ và cỡ chữ áp dụng chung cho mọi người trên cả trang quản trị và trang bán hàng, kể cả khách chưa đăng nhập.</p>
          <FontSizeControl value={font.fontSize} onChange={(fontSize) => { dirty.current = true; setFont({ ...font, fontSize }); }} disabled={!status?.canManage || busy} />
          {!status?.canManage && <p>Chỉ quản trị viên được thay đổi phông chữ và cỡ chữ chung.</p>}
          <fieldset disabled={busy || !status?.canManage}><legend>Phông chữ</legend>
            <div className="system-settings__fonts" tabIndex="0" aria-label="Danh sách phông chữ, cuộn để xem thêm">
              {FONT_OPTIONS.map((option) => <label key={option.name} style={{ fontFamily: option.family }}>
                <input type="radio" name="font-family" value={option.name} checked={font.fontFamily === option.name} onChange={() => { dirty.current = true; setFont({ ...font, fontFamily: option.name }); }} />
                <span>{option.name}</span><span>Tiếng Việt: Đường phố, bảo trì hệ thống</span>
              </label>)}
            </div>
          </fieldset>
          <p className="system-settings__preview" style={{ fontFamily: FONT_OPTIONS.find((option) => option.name === font.fontFamily)?.family, fontSize: `${font.fontSize || 14}px` }}>Xem trước: Cài đặt hệ thống — Tiếng Việt rõ ràng, dễ đọc.</p>
          <div className="system-settings__actions"><button className="system-settings__save" type="submit" disabled={busy || !status?.canManage}>{busy ? 'Đang lưu…' : 'Lưu phông chữ và cỡ chữ'}</button></div>
        </form>}
      </div>
    </section>
  );
}
