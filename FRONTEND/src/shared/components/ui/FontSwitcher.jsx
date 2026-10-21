// Reusable admin UI primitive: FontSwitcher.
import { useEffect, useId, useRef, useState } from 'react';
import { Type } from 'lucide-react';
import { FONT_OPTIONS } from '../../../typography/fontOptions';
import useFontPreference from '../../../typography/useFontPreference';
import FontSizeControl from '../../../typography/FontSizeControl';
import './FontSwitcher.css';

export default function FontSwitcher({ variant = 'admin' }) {
  const [open, setOpen] = useState(false);
  const { font, selectFont, fontSize, selectFontSize, resetQa, qaOverride } = useFontPreference();
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

  return (
    <div className={`font-switcher font-switcher--${variant}`} ref={rootRef}>
      <button
        type="button"
        className="font-switcher__trigger"
        aria-label={`Đổi font chữ. Đang dùng ${font.name}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={menuId}
        title={`Font: ${font.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Type size={variant === 'admin' ? 20 : 22} aria-hidden="true" />
      </button>
      {open && (
        <div className="font-switcher__menu" id={menuId} role="dialog" aria-label="Thử phông chữ và cỡ chữ">
          <div className="font-switcher__title"><strong>FONT QA</strong><span>Thử giao diện</span></div>
          <div className="font-switcher__body">
          <p className="font-switcher__hint">Chỉ thử trên trình duyệt này, không thay đổi cài đặt chung.</p>
          <FontSizeControl value={fontSize} onChange={selectFontSize} />
          <fieldset className="font-switcher__families"><legend>Phông chữ</legend>
          <div className="font-switcher__list" tabIndex="0" aria-label="Danh sách phông chữ thử nghiệm">
          {FONT_OPTIONS.map((option) => (
            <label
              className={`font-switcher__option ${font.name === option.name ? 'is-active' : ''}`}
              key={option.name}
            >
              <input type="radio" name={menuId} checked={font.name === option.name} onChange={() => selectFont(option.name)} />
              <span style={{ fontFamily: option.family }}>{option.name}</span>
            </label>
          ))}
          </div></fieldset>
          <button type="button" className="font-switcher__reset" onClick={resetQa} disabled={!qaOverride}>Dùng cài đặt đã lưu</button>
          </div>
        </div>
      )}
    </div>
  );
}
