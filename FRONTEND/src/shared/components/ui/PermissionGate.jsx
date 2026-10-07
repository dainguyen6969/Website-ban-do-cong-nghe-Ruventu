// Reusable admin UI primitive: PermissionGate.
import { HiOutlineLockClosed } from 'react-icons/hi';
import { useLocation } from 'react-router-dom';
import useMockAuth from '../../../auth/useMockAuth';
import { roleHasPermission, routePermissionModule } from '../../../auth/roleModel';
import { getAllRoles } from '../../../features/admin/organization/api/roleApi';
import { useEffect, useState } from 'react';
import './PermissionGate.css';

export default function PermissionGate({ children }) {
  const { pathname } = useLocation();
  const { currentAccount, roles: mockRoles } = useMockAuth();
  const [roles, setRoles] = useState(mockRoles || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRoles()
      .then(fetchedRoles => {
        if (fetchedRoles && fetchedRoles.length > 0) {
          setRoles(fetchedRoles);
        }
      })
      .catch(err => {
        console.warn('Cannot fetch roles from backend, falling back to mock roles', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const moduleId = routePermissionModule(pathname);
  const roleId = currentAccount?.vaiTro ?? (currentAccount?.role === 'admin' ? 'admin_toan_quyen' : currentAccount?.role);
  
  if (moduleId && !roleHasPermission(roles, roleId, moduleId)) {
    return (
      <main className="permission-denied" role="main">
        <div>
          <HiOutlineLockClosed />
          <h1>BẠN KHÔNG CÓ QUYỀN VỚI TRANG NÀY.</h1>
          <p>Vui lòng liên hệ Admin Tổng để được cấp quyền phù hợp.</p>
          <div style={{marginTop: 20, fontSize: 12, color: '#666', background: '#f5f5f5', padding: 10, textAlign: 'left'}}>
            <p><strong>DEBUG INFO:</strong></p>
            <p>Role ID: {String(roleId)}</p>
            <p>Module ID: {String(moduleId)}</p>
            <p>Roles fetched: {roles.length}</p>
            <p>All Roles Names: {roles.map(r => r.ten_vai_tro || r.tenVaiTro || r.label).join(', ')}</p>
          </div>
        </div>
      </main>
    );
  }
  return children;
}
