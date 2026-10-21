import { useEffect, useState } from 'react';
import useMockAuth from '../auth/useMockAuth';
import { ADMIN_FONT_STORAGE_KEY } from './fontOptions';
import { getTypography, TYPOGRAPHY_CHANGED } from '../settings/settingsApi';
import usePersistentFontPreference from './usePersistentFontPreference';

export default function useAccountTypography() {
  const { currentAccount } = useMockAuth();
  const [saved, setSaved] = useState({ fontFamily: 'Inter' });
  const qa = usePersistentFontPreference(ADMIN_FONT_STORAGE_KEY, saved.fontFamily);
  const { resetQa } = qa;
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let updatedDuringLoad = false;
    getTypography().then((value) => { if (active && !updatedDuringLoad) { setSaved(value); setError(''); } })
      .catch(() => { if (active) setError('Không thể tải tùy chọn phông chữ đã lưu.'); });
    const updated = (event) => { updatedDuringLoad = true; setSaved(event.detail); resetQa(); setError(''); };
    window.addEventListener(TYPOGRAPHY_CHANGED, updated);
    return () => { active = false; window.removeEventListener(TYPOGRAPHY_CHANGED, updated); };
  }, [currentAccount?.id, resetQa]);

  return { ...qa, error };
}
