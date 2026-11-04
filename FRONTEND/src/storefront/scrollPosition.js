const STORAGE_KEY = 'ruventu:storefront-scroll:v1';
const INPUT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

export function manageScrollPosition(url, reload) {
  const previous = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';
  let observer;
  let restoring = true;
  const stopRestoring = () => {
    restoring = false;
    observer?.disconnect();
    INPUT_EVENTS.forEach(type => window.removeEventListener(type, stopRestoring));
  };
  const save = () => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ url, x: window.scrollX, y: window.scrollY })); }
    catch { /* Browser storage can be disabled. */ }
  };
  window.addEventListener('pagehide', save);

  if (reload) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved?.url === url && Number.isFinite(saved.x) && Number.isFinite(saved.y) && saved.x >= 0 && saved.y >= 0) {
        const restore = () => { if (restoring) window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' }); };
        observer = new ResizeObserver(restore);
        observer.observe(document.body);
        INPUT_EVENTS.forEach(type => window.addEventListener(type, stopRestoring, { passive: true }));
        restore();
      }
    } catch { /* Let the browser keep its current position without a valid snapshot. */ }
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  return () => {
    stopRestoring();
    window.removeEventListener('pagehide', save);
    window.history.scrollRestoration = previous;
  };
}
