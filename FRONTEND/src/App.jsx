import { Navigate, useLocation } from 'react-router-dom';
import AdminApp from './AdminApp';
import StorefrontApp from './storefront/App';
import useMockAuth from './auth/useMockAuth';

export default function App() {
  const { pathname } = useLocation();
  const { currentAccount } = useMockAuth();
  const isAdminRoute = pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname.startsWith('/kho-hang/');

  if (isAdminRoute && currentAccount?.role !== 'admin') {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return isAdminRoute ? <AdminApp /> : <StorefrontApp />;
}
