import { useSyncExternalStore } from 'react';

const REVISION_KEY = 'ruventu:catalog-revision';
let localRevision = '';

export function getCatalogRevision() {
  if (typeof window === 'undefined') return '';
  try { return localRevision || window.localStorage.getItem(REVISION_KEY) || ''; }
  catch { return localRevision; }
}

export function publishCatalogChange(result) {
  if (typeof window === 'undefined') return result;
  localRevision = `${Date.now()}-${Math.random()}`;
  try {
    window.localStorage.setItem(REVISION_KEY, localRevision);
    localRevision = '';
  } catch { /* The current tab still updates if storage is unavailable. */ }
  window.dispatchEvent(new Event(REVISION_KEY));
  return result;
}

export function subscribeCatalogChanges(listener) {
  const onStorage = event => {
    if (event.key === REVISION_KEY) listener();
  };
  window.addEventListener(REVISION_KEY, listener);
  window.addEventListener('storage', onStorage);
  window.addEventListener('pageshow', listener);
  return () => {
    window.removeEventListener(REVISION_KEY, listener);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('pageshow', listener);
  };
}

const serverRevision = () => '';
export function useCatalogRevision() {
  return useSyncExternalStore(subscribeCatalogChanges, getCatalogRevision, serverRevision);
}
