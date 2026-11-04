// Top-level application switch between admin and storefront experiences.
import { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import '../styles/index.css';
import StorefrontApp from '../storefront/App';
import useMockAuth from '../auth/useMockAuth';
import { canAccessAdmin } from '../auth/accountModel';

const AdminApp = lazy(() => import('./AdminApp'));

export default function App() {
  const { pathname } = useLocation();
  const { currentAccount, roles } = useMockAuth();
  const isAdminRoute =
    pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/kho-hang/');

  if (isAdminRoute && !canAccessAdmin(currentAccount, roles)) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return isAdminRoute
    ? <Suspense fallback={<p role="status">Đang tải trang quản trị…</p>}><AdminApp /></Suspense>
    : <StorefrontApp />;
}
