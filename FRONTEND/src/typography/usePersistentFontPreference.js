import { useCallback, useContext, useEffect, useState } from 'react';
import { findFontOption } from './fontOptions';
import ProjectFontSizeContext from './ProjectFontSizeContext';
import { MAX_FONT_SIZE, MIN_FONT_SIZE, normalizeFontSize } from './fontSize';

function readOverride(storageKey) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export default function usePersistentFontPreference(storageKey, savedFontFamily = 'Inter') {
  const projectSize = useContext(ProjectFontSizeContext);
  const [override, setOverride] = useState(() => readOverride(storageKey));
  const sizeKey = `${storageKey}_size`;
  const [sizeOverride, setSizeOverride] = useState(() => {
    const stored = Number(readOverride(sizeKey));
    return Number.isInteger(stored) && stored >= MIN_FONT_SIZE && stored <= MAX_FONT_SIZE ? stored : null;
  });

  const selectFont = (name) => {
    const nextFont = findFontOption(name);
    setOverride(nextFont.name);
    try {
      window.localStorage.setItem(storageKey, nextFont.name);
    } catch {
      // localStorage can be unavailable in privacy-restricted browser contexts.
    }
  };
  const selectFontSize = (value) => {
    const size = normalizeFontSize(value, projectSize);
    setSizeOverride(size);
    try { localStorage.setItem(sizeKey, String(size)); } catch { /* Thử trong phiên hiện tại. */ }
  };
  const resetQa = useCallback(() => {
    setOverride(null); setSizeOverride(null);
    try { localStorage.removeItem(storageKey); localStorage.removeItem(sizeKey); } catch { /* Thử trong phiên hiện tại. */ }
  }, [storageKey, sizeKey]);
  useEffect(() => {
    const changed = (event) => {
      if (event.key === storageKey || event.key === null) setOverride(readOverride(storageKey));
      if (event.key === sizeKey || event.key === null) {
        const stored = readOverride(sizeKey);
        setSizeOverride(stored == null ? null : normalizeFontSize(stored, projectSize));
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [storageKey, sizeKey, projectSize]);

  return { font: findFontOption(override || savedFontFamily), selectFont, fontSize: sizeOverride ?? projectSize,
    selectFontSize, resetQa, qaOverride: Boolean(override || sizeOverride != null) };
}
