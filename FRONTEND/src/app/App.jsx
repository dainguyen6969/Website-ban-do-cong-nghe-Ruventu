// Top-level application switch between admin and storefront experiences.
import { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import '../styles/index.css';
import '../typography/buttonTypography.css';
import StorefrontApp from '../storefront/App';
import useMockAuth from '../auth/useMockAuth';
import { canAccessAdmin } from '../auth/accountModel';
import LoadingSpinner from '../shared/components/ui/LoadingSpinner';
import PosPaymentQRPage from '../features/admin/sales/pages/PosPaymentQRPage';

const AdminApp = lazy(() => import('./AdminApp'));

export default function App() {
  const { pathname } = useLocation();
  const { currentAccount, roles } = useMockAuth();

  // Cửa sổ popup riêng cho mã QR POS - mở trực tiếp tức thì không qua loading trang quản trị hay redirect
  if (pathname === '/admin/pos-qr' || pathname === '/pos-qr') {
    return <PosPaymentQRPage />;
  }

  const isAdminRoute =
    pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/kho-hang/');

  if (isAdminRoute && !canAccessAdmin(currentAccount, roles)) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return isAdminRoute
    ? <Suspense fallback={<LoadingSpinner text="Đang tải trang quản trị..." fullscreen size="lg" />}><AdminApp /></Suspense>
    : <StorefrontApp />;
}
