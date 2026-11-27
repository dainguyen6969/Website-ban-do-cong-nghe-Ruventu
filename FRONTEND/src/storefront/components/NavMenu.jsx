import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink } from "react-router-dom";

export default function NavMenu({ label, to, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const toggle = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  return (
    <li ref={root} className={`has-mega-menu ${className}${open ? ' is-open' : ''}`}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') setOpen(false); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onClick={event => { if (event.target.closest('a')) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          toggle.current?.focus();
        }
      }}>
      <NavLink to={to} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>
      <button ref={toggle} type="button" className="nav-menu-toggle" aria-label={`Danh mục ${label}`}
        aria-controls={panelId} aria-expanded={open} onClick={() => setOpen(current => !current)}>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <div id={panelId} className="mega-menu" hidden={!open}>
        {children}
      </div>
    </li>
  );
}
