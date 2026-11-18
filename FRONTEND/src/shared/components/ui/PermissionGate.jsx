import { createContext, useContext, useEffect, useState } from 'react';
import { HiOutlineLockClosed } from 'react-icons/hi';
import { Navigate, useLocation } from 'react-router-dom';
import { getMyPermissions } from '../../../auth/backendAuth';
import { canOpenAdminPath } from '../../../auth/roleModel';
import './PermissionGate.css';

const AdminPermissionsContext = createContext(null);

const entryPaths = [
  '/admin/tong-quat',
  '/admin/ban-hang',
  '/admin/san-pham/danh-sach-san-pham',
  '/kho-hang/quan-ly-phien-ban',
  '/kho-hang/combo-san-pham',
  '/kho-hang/nhap-hang',
  '/kho-hang/kiem-hang',
  '/admin/don-hang/danh-sach-don-hang',
  '/admin/don-hang/quan-ly-giao-hang',
  '/admin/don-hang/khach-tra-hang',
  '/admin/khach-hang-doi-tac/khach-hang',
  '/admin/khach-hang-doi-tac/nha-cung-cap',
  '/admin/khach-hang-doi-tac/doi-tac-van-chuyen',
  '/admin/khuyen-mai/danh-sach-khuyen-mai',
  '/admin/bao-hanh/danh-sach',
  '/admin/so-quy-tien-mat/tong-quan',
  '/admin/bao-cao',
  '/admin/danh-muc/danh-muc-san-pham',
  '/admin/nhan-vien/danh-sach',
  '/admin/nhan-vien/vai-tro',
];

export function useAdminPermissions() {
  return useContext(AdminPermissionsContext);
}

export function AdminPermissionsProvider({ account, children }) {
  const { pathname } = useLocation();
  const [snapshot, setSnapshot] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!account?.id) return;

    const controller = new AbortController();

    getMyPermissions(controller.signal)
      .then((access) => {
        if (controller.signal.aborted) return;
        if (
          String(access?.nguoi_dung_id) !== String(account.id) ||
          access?.trang_thai !== 1 ||
          !['QUAN_TRI', 'NHAN_VIEN', 'KHACH_HANG'].includes(access?.loai_tai_khoan) ||
          !access?.quyen ||
          typeof access.quyen !== 'object' ||
          Array.isArray(access.quyen)
        ) {
          throw new Error('Phản hồi quyền tài khoản không hợp lệ.');
        }

        setSnapshot({ account, pathname, access });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setSnapshot({ account, pathname, error });
      });

    return () => controller.abort();
  }, [account, pathname, revision]);

  useEffect(() => {
    const onFocus = () => setRevision((value) => value + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (!account?.id) return <Navigate to="/login" replace />;

  const current = snapshot?.account === account ? snapshot : null;
  if (!current) return <p role="status">Đang kiểm tra quyền quản trị…</p>;

  if (current.error?.status === 401) return <Navigate to="/login" replace />;

  if (current.error) {
    return (
      <main className="permission-denied" role="main">
        <div>
          <HiOutlineLockClosed aria-hidden="true" />
          <h1>Không tải được quyền quản trị</h1>
          <p>{current.error.message || 'Vui lòng thử lại.'}</p>
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  if (current.access.loai_tai_khoan === 'KHACH_HANG') {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminPermissionsContext.Provider
      value={{
        access: current.access,
        pathReady: current.pathname === pathname,
      }}
    >
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export default function PermissionGate({ children }) {
  const { pathname, search } = useLocation();
  const permissions = useAdminPermissions();

  if (!permissions?.pathReady) return <p role="status">Đang kiểm tra quyền trang…</p>;

  const { access } = permissions;
  const path = pathname.replace(/\/+$/, '');

  if (path === '/admin' || path === '/kho-hang') {
    const target =
      entryPaths.find((entry) => canOpenAdminPath(access, entry)) ?? '/admin/tai-khoan';
    return <Navigate to={target} replace />;
  }

  if (canOpenAdminPath(access, pathname, search)) return children;

  return (
    <main className="permission-denied" role="main">
      <div>
        <HiOutlineLockClosed aria-hidden="true" />
        <h1>Bạn không có quyền với trang này</h1>
        <p>Vui lòng liên hệ quản trị viên để được cấp quyền phù hợp.</p>
      </div>
    </main>
  );
}
