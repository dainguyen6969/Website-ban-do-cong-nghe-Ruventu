import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_FONT_OPTION, findFontOption } from './fontOptions';

function readStoredFont(storageKey) {
  try {
    return findFontOption(window.localStorage.getItem(storageKey));
  } catch {
    return DEFAULT_FONT_OPTION;
  }
}

export default function usePersistentFontPreference(storageKey) {
  const [font, setFont] = useState(() => readStoredFont(storageKey));

  const selectFont = useCallback((name) => {
    const nextFont = findFontOption(name);
    setFont(nextFont);
    try {
      window.localStorage.setItem(storageKey, nextFont.name);
    } catch {
      // localStorage can be unavailable in privacy-restricted browser contexts.
    }
  }, [storageKey]);

  return useMemo(() => ({ font, selectFont }), [font, selectFont]);
}
