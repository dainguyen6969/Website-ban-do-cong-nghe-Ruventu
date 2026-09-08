import { useLocation } from 'react-router-dom';
import AdminApp from './AdminApp';
import StorefrontApp from './storefront/App';

export default function App() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  return isAdminRoute ? <AdminApp /> : <StorefrontApp />;
}
