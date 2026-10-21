import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import useMockAuth from '../auth/useMockAuth';
import { getSystemStatus, SETTINGS_CHANGED } from './settingsApi';
import { isMaintenanceResponse } from './maintenanceState';
import ProjectFontSizeContext from '../typography/ProjectFontSizeContext';
import './SystemSettings.css';

export default function SystemAccessGate({ children }) {
  const { currentAccount } = useMockAuth();
  const { pathname, search } = useLocation();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    document.documentElement.style.setProperty('--project-font-scale', String((status?.fontSize || 14) / 14));
    return () => document.documentElement.style.removeProperty('--project-font-scale');
  }, [status?.fontSize]);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    const check = async () => {
      const request = ++sequence;
      try {
        const next = await getSystemStatus();
        if (active && request === sequence) { setStatus(next); setError(''); }
      } catch (e) {
        if (!active || request !== sequence) return;
        if (isMaintenanceResponse(e.status, e.data)) { setStatus({ maintenance: true, canManage: false }); setError(''); }
        else setError('Không thể kiểm tra trạng thái hệ thống. Vui lòng thử lại.');
      }
    };
    check();
    const timer = window.setInterval(check, 15000);
    window.addEventListener('focus', check);
    window.addEventListener(SETTINGS_CHANGED, check);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      window.removeEventListener(SETTINGS_CHANGED, check);
    };
  }, [currentAccount?.id, pathname, search, retry]);

  const adminLogin = pathname === '/login' && new URLSearchParams(search).get('quan-tri') === '1';
  if (!error && status && (!status.maintenance || status.canManage || adminLogin)) {
    return <ProjectFontSizeContext.Provider value={status.fontSize || 14}>{children}</ProjectFontSizeContext.Provider>;
  }

  return (
    <main className="maintenance-page">
      <div className="maintenance-page__card">
        <div className="maintenance-page__brand">RUVENTU</div>
        <Wrench size={42} aria-hidden="true" />
        <h1>{error ? 'Chưa thể kết nối hệ thống' : status ? 'Hệ thống đang bảo trì' : 'Đang kiểm tra hệ thống'}</h1>
        <p role="status">{error || (status ? 'Chúng tôi đang nâng cấp hệ thống. Vui lòng quay lại sau.' : 'Vui lòng chờ trong giây lát.')}</p>
        {(status || error) && <button type="button" onClick={() => setRetry((n) => n + 1)}>Kiểm tra lại</button>}
        {status?.maintenance && <Link to="/login?quan-tri=1">Đăng nhập quản trị</Link>}
      </div>
    </main>
  );
}
