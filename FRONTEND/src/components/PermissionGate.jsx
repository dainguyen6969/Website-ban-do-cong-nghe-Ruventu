import { HiOutlineLockClosed } from 'react-icons/hi';
import { useLocation } from 'react-router-dom';
import useMockAuth from '../auth/useMockAuth';
import { roleHasPermission, routePermissionModule } from '../auth/roleModel';
import './PermissionGate.css';

export default function PermissionGate({ children }) {
  const { pathname } = useLocation();
  const { currentAccount, roles } = useMockAuth();
  const moduleId = routePermissionModule(pathname);
  const roleId = currentAccount?.vaiTro ?? (currentAccount?.role === 'admin' ? 'admin_toan_quyen' : currentAccount?.role);
  if (moduleId && !roleHasPermission(roles, roleId, moduleId)) {
    return <main className="permission-denied" role="main"><div><HiOutlineLockClosed /><h1>BẠN KHÔNG CÓ QUYỀN VỚI TRANG NÀY.</h1><p>Vui lòng liên hệ Admin Tổng để được cấp quyền phù hợp.</p></div></main>;
  }
  return children;
}
