// Top-level application switch between admin and storefront experiences.
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import '../styles/index.css';
import '../typography/buttonTypography.css';
import useMockAuth from '../auth/useMockAuth';
import LoadingSpinner from '../shared/components/ui/LoadingSpinner';

const AdminApp = lazy(() => import('./AdminApp'));
const StorefrontApp = lazy(() => import('../storefront/App'));

export default function App() {
  const { pathname } = useLocation();
  const { currentAccount } = useMockAuth();
  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/kho-hang' ||
    pathname.startsWith('/kho-hang/');

  const pageTitle =
    isAdminRoute && currentAccount?.id
      ? 'Ruventu Admin - Quản trị hệ thống'
      : 'Ruventu - PC, LAPTOP & linh kiện công nghệ chính hãng';

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  if (isAdminRoute && !currentAccount?.id) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return (
    <Suspense
      fallback={
        <LoadingSpinner
          text={isAdminRoute ? 'Đang tải trang quản trị…' : 'Đang tải trang…'}
          fullscreen
          size="lg"
        />
      }
    >
      {isAdminRoute ? <AdminApp /> : <StorefrontApp />}
    </Suspense>
  );
}