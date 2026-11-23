// Top-level application switch between admin and storefront experiences.
import { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import '../styles/index.css';
import '../typography/buttonTypography.css';
import useMockAuth from '../auth/useMockAuth';
import { canAccessAdmin } from '../auth/accountModel';
import LoadingSpinner from '../shared/components/ui/LoadingSpinner';

const AdminApp = lazy(() => import('./AdminApp'));
const StorefrontApp = lazy(() => import('../storefront/App'));

export default function App() {
  const { pathname } = useLocation();
  const { currentAccount, roles } = useMockAuth();
  const isAdminRoute =
    pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/kho-hang/');

  if (isAdminRoute && !canAccessAdmin(currentAccount, roles)) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return isAdminRoute
    ? <Suspense fallback={<LoadingSpinner text="Đang tải trang quản trị..." fullscreen size="lg" />}><AdminApp /></Suspense>
    : <StorefrontApp />;
}
