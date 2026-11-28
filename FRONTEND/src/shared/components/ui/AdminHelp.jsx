import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';

export default function AdminHelp({ children }) {
  const id = useId();
  const trigger = useRef(null);
  const tooltip = useRef(null);
  const [position, setPosition] = useState(null);

  const show = () => {
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(304, window.innerWidth - 24);
    const above = window.innerHeight - rect.bottom < rect.top;
    setPosition({
      width,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: above ? rect.top : rect.bottom,
      maxHeight: Math.max(36, (above ? rect.top : window.innerHeight - rect.bottom) - 12),
      transform: above ? 'translateY(-100%)' : undefined,
    });
  };

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const dismiss = event => {
      if (!trigger.current?.contains(event.target) && !tooltip.current?.contains(event.target)) close();
    };
    const scroll = event => {
      if (!tooltip.current?.contains(event.target)) close();
    };
    const escape = event => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', escape);
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('keydown', escape);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [position]);

  return (
    <>
      <button
        ref={trigger}
        className="admin-help-trigger"
        type="button"
        aria-label="Mô tả chức năng"
        aria-describedby={position ? id : undefined}
        onFocus={show}
        onBlur={() => setPosition(null)}
        onClick={show}
        onPointerEnter={event => { if (event.pointerType === 'mouse') show(); }}
        onPointerLeave={event => {
          if (event.pointerType === 'mouse' && !tooltip.current?.contains(event.relatedTarget)) setPosition(null);
        }}
      >
        <CircleHelp size={16} aria-hidden="true" />
      </button>
      {position && createPortal(
        <span
          ref={tooltip}
          className="admin-help-tooltip"
          id={id}
          role="tooltip"
          style={position}
          onPointerLeave={event => {
            if (event.pointerType === 'mouse' && !trigger.current?.contains(event.relatedTarget)) setPosition(null);
          }}
        >
          {children}
        </span>,
        document.body,
      )}
    </>
  );
}
