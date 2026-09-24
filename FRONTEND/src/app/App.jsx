// Top-level application switch between admin and storefront experiences.
import { Navigate, useLocation } from 'react-router-dom';
import AdminApp from './AdminApp';
import StorefrontApp from '../storefront/App';
import useMockAuth from '../auth/useMockAuth';
import { canAccessAdmin } from '../auth/accountModel';

export default function App() {
  const { pathname } = useLocation();
  const { currentAccount, roles } = useMockAuth();
  const isAdminRoute = pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname.startsWith('/kho-hang/');

  if (isAdminRoute && !canAccessAdmin(currentAccount, roles)) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return isAdminRoute ? <AdminApp /> : <StorefrontApp />;
}
