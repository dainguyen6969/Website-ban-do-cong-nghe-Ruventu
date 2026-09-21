import { useLocation } from 'react-router-dom';
import AdminApp from './AdminApp';
import StorefrontApp from './storefront/App';
import useMockAuth from './auth/useMockAuth';
import { isStaffAccount } from './auth/accountModel';

export default function App() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname.startsWith('/kho-hang/');

  if (isAdminRoute && !isStaffAccount(currentAccount)) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return isAdminRoute ? <AdminApp /> : <StorefrontApp />;
}
