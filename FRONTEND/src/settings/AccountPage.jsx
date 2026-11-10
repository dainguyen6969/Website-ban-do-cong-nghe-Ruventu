import { useEffect, useState } from 'react';
import { apiRequest } from '../auth/backendAuth';
import SystemSettings from './SystemSettings';

export default function AccountPage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    apiRequest('/api/v1/users/me').then((value) => { if (active) setProfile(value); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  return <main className="account-page">
    <h1>Trang tài khoản</h1>
    <section className="account-page__profile" aria-labelledby="account-profile-title">
      <h2 id="account-profile-title">Thông tin tài khoản</h2>
      {error && <p role="alert">{error}</p>}
      {!profile && !error && <p role="status">Đang tải thông tin…</p>}
      {profile && <dl><dt>Họ và tên</dt><dd>{profile.hoTen}</dd><dt>Email</dt><dd>{profile.email || 'Chưa cập nhật'}</dd><dt>Số điện thoại</dt><dd>{profile.soDienThoai}</dd></dl>}
    </section>
    <SystemSettings />
  </main>;
}
