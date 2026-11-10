export default function syncTableHeaderOffset(scrollRegion) {
  const header = scrollRegion?.querySelector('thead');
  if (!header) return;

  // Wrapped column labels can change where the vertical scrollbar should start.
  const update = () => {
    scrollRegion.style.setProperty('--admin-table-header-offset', `${header.getBoundingClientRect().height}px`);
  };
  update();
  const observer = new ResizeObserver(update);
  observer.observe(header);
  return () => observer.disconnect();
}
