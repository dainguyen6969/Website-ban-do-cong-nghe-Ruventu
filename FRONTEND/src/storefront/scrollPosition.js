import { Component } from 'react';

const STORAGE_KEY = 'ruventu:storefront-scroll:v1';
const INPUT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

export function manageScrollPosition(url, reload, saved) {
  const previous = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';
  if (reload) {
    try {
      const snapshot = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (snapshot?.url === url) saved = snapshot;
    } catch { /* Browser storage can be disabled or invalid. */ }
  }

  let observer;
  let restoring = false;
  const stopRestoring = () => {
    if (!restoring) return;
    restoring = false;
    observer?.disconnect();
    INPUT_EVENTS.forEach(type => window.removeEventListener(type, stopRestoring));
  };
  const capture = () => restoring
    ? { x: saved.x, y: saved.y }
    : { x: window.scrollX, y: window.scrollY };
  const save = () => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ url, ...capture() })); }
    catch { /* Browser storage can be disabled. */ }
  };
  window.addEventListener('pagehide', save);

  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && saved.x >= 0 && saved.y >= 0) {
    restoring = true;
    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
      if (Math.abs(window.scrollX - saved.x) < 1 && Math.abs(window.scrollY - saved.y) < 1) {
        stopRestoring();
      }
    };
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(restore);
      observer.observe(document.body);
    }
    INPUT_EVENTS.forEach(type => window.addEventListener(type, stopRestoring, { passive: true }));
    restore();
  } else if (!reload) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  const cleanup = () => {
    stopRestoring();
    window.removeEventListener('pagehide', save);
    window.history.scrollRestoration = previous;
  };
  return { capture, cleanup };
}

export class StorefrontScrollPosition extends Component {
  positions = new Map();

  componentDidMount() {
    const reload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
    this.scroll = manageScrollPosition(this.props.url, reload);
  }

  getSnapshotBeforeUpdate(previous) {
    if (previous.entryKey === this.props.entryKey && previous.url === this.props.url) return null;
    // The next page can be shorter, so capture before React changes the DOM.
    return this.scroll.capture();
  }

  componentDidUpdate(previous, _, position) {
    if (!position) return;
    const { entryKey, url, navigationType } = this.props;
    this.positions.set(previous.entryKey, position);
    this.scroll.cleanup();
    this.scroll = manageScrollPosition(url, false, navigationType === 'POP' ? this.positions.get(entryKey) : undefined);
  }

  componentWillUnmount() {
    this.scroll.cleanup();
  }

  render() {
    return null;
  }
}
