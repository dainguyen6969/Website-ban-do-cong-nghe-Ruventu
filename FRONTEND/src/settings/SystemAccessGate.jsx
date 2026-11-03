import { useEffect, useInsertionEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import useMockAuth from '../auth/useMockAuth';
import { getCachedSystemStatus, getSystemStatus, SETTINGS_CHANGED, SYSTEM_STATUS_TTL_MS } from './settingsApi';
import { isMaintenanceResponse } from './maintenanceState';
import ProjectTypographyContext from '../typography/ProjectTypographyContext';
import { findFontOption } from '../typography/fontOptions';
import './SystemSettings.css';

export default function SystemAccessGate({ children }) {
  const { currentAccount } = useMockAuth();
  const { pathname, search } = useLocation();
  const identity = JSON.stringify([currentAccount?.id, currentAccount?.role, currentAccount?.vaiTro]);
  const [snapshot, setSnapshot] = useState(() => ({ identity, status: getCachedSystemStatus() }));
  const status = snapshot.identity === identity ? snapshot.status : null;
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useInsertionEffect(() => {
    document.documentElement.style.setProperty('--project-font-scale', String((status?.fontSize || 14) / 14));
    document.documentElement.style.setProperty('--project-font-family', findFontOption(status?.fontFamily).family);
    return () => {
      document.documentElement.style.removeProperty('--project-font-scale');
      document.documentElement.style.removeProperty('--project-font-family');
    };
  }, [status?.fontSize, status?.fontFamily]);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    const check = async (force = false) => {
      const request = ++sequence;

      try {
        const next = await getSystemStatus({ force });
        if (active && request === sequence) { setSnapshot({ identity, status: next }); setError(''); }
      } catch (e) {
        if (!active || request !== sequence) return;
        if (isMaintenanceResponse(e.status, e.data)) { setSnapshot({ identity, status: { maintenance: true, canManage: false } }); setError(''); }
        else setError('Không thể kiểm tra trạng thái hệ thống. Vui lòng thử lại.');
      }
    };
    const refreshVisible = () => { if (document.visibilityState === 'visible') check(); };
    const refreshSettings = () => check(true);
    check(true);
    const timer = window.setInterval(refreshVisible, SYSTEM_STATUS_TTL_MS);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener(SETTINGS_CHANGED, refreshSettings);
    return () => {
      active = false;

      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.removeEventListener(SETTINGS_CHANGED, refreshSettings);
    };
  }, [identity, retry]);

  const adminLogin = pathname === '/login' && new URLSearchParams(search).get('quan-tri') === '1';
  if (status && (!status.maintenance || status.canManage || adminLogin)) {
    return <ProjectTypographyContext.Provider value={{ fontSize: status.fontSize || 14, fontFamily: status.fontFamily || 'Inter' }}>{children}</ProjectTypographyContext.Provider>;
  }

  return (
    <main className="maintenance-page">
      <div className="maintenance-page__card">
        <div className="maintenance-page__brand">RUVENTU</div>
        <Wrench size={42} aria-hidden="true" />
        <h1>
          {error
            ? 'Chưa thể kết nối hệ thống'
            : status
              ? 'Hệ thống đang bảo trì'
              : 'Đang kiểm tra hệ thống'}
        </h1>
        <p role="status">
          {error ||
            (status
              ? 'Chúng tôi đang nâng cấp hệ thống. Vui lòng quay lại sau.'
              : 'Vui lòng chờ trong giây lát.')}
        </p>
        {(status || error) && (
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Kiểm tra lại
          </button>
        )}
        {status?.maintenance && <Link to="/login?quan-tri=1">Đăng nhập quản trị</Link>}
      </div>
    </main>
  );
}
