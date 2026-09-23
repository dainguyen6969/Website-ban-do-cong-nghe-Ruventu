import { useEffect, useId, useRef, useState } from 'react';
import { Type } from 'lucide-react';
import { FONT_OPTIONS } from '../typography/fontOptions';
import useFontPreference from '../typography/useFontPreference';
import './FontSwitcher.css';

export default function FontSwitcher({ variant = 'admin' }) {
  const [open, setOpen] = useState(false);
  const { font, selectFont } = useFontPreference();
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const chooseFont = (name) => {
    selectFont(name);
    setOpen(false);
  };

  return (
    <div className={`font-switcher font-switcher--${variant}`} ref={rootRef}>
      <button
        type="button"
        className="font-switcher__trigger"
        aria-label={`Đổi font chữ. Đang dùng ${font.name}`}
        aria-expanded={open}
        aria-controls={menuId}
        title={`Font: ${font.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Type size={variant === 'admin' ? 20 : 22} aria-hidden="true" />
      </button>
      {open && (
        <div className="font-switcher__menu" id={menuId} role="menu" aria-label="Chọn font chữ">
          <div className="font-switcher__title">FONT QA</div>
          {FONT_OPTIONS.map((option) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={font.name === option.name}
              className={`font-switcher__option ${font.name === option.name ? 'is-active' : ''}`}
              key={option.name}
              onClick={() => chooseFont(option.name)}
            >
              <span style={{ fontFamily: option.family }}>{option.name}</span>
              {font.name === option.name && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
