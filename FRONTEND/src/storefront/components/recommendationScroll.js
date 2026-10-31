export function createRecommendationScroll(element) {
  const view = element.ownerDocument.defaultView;
  let frame = 0;
  let position = element.scrollLeft;
  let target = position;
  let lastTime = 0;
  let direction = 0;

  const stop = () => {
    view.cancelAnimationFrame(frame);
    frame = 0;
  };

  const animate = time => {
    position += (target - position) * (1 - Math.exp(-(time - lastTime) / 45));
    if (Math.abs(target - position) < 0.5) position = target;
    element.scrollLeft = position;
    lastTime = time;
    frame = position === target ? 0 : view.requestAnimationFrame(animate);
  };

  const onWheel = event => {
    if (event.ctrlKey) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const delta = (horizontal ? event.deltaX : event.deltaY * 2) * unit;
    if (!delta) return;
    if (!frame || Math.sign(delta) !== direction) target = position = element.scrollLeft;
    direction = Math.sign(delta);
    target = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, target + delta));
    if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stop();
      element.scrollLeft = position = target;
    } else if (!frame && target !== position) {
      lastTime = view.performance.now();
      frame = view.requestAnimationFrame(animate);
    }
  };

  return { onWheel, stop };
}
