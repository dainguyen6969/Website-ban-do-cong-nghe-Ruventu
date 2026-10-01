// Reusable admin UI primitive: PriceInput.
import { useState, useRef, useCallback } from 'react';

/**
 * PriceInput with automatic ".000" suffix behavior for VND prices.
 * - Suffix only appears once user finishes entering (on blur or Enter).
 * - When clicking back in, cursor lands right after user digits, before ".000".
 * - User only ever edits the real digits; ".000" is fixed auto-appended decoration.
 */
export default function PriceInput({
  value,
  onChange,
  className = '',
  placeholder = '0',
  id,
  style,
}) {
  const inputRef = useRef(null);

  // Extract raw digits from value
  const parseRaw = useCallback((val) => {
    if (!val && val !== 0) return '';
    return String(val).replace(/\.000$/, '').replace(/\D/g, '');
  }, []);

  const [raw, setRaw] = useState(() => parseRaw(value));
  const [isConfirmed, setIsConfirmed] = useState(() => Boolean(parseRaw(value)));

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const nextRaw = parseRaw(value);
    setRaw(nextRaw);
    if (nextRaw) {
      setIsConfirmed(true);
    }
  }

  // Display text: if confirmed and has digits -> raw + '.000', else just raw
  const displayText = isConfirmed && raw ? `${raw}.000` : raw;

  // Clamp selection range so cursor cannot enter or select past the raw digits
  const clampCursor = useCallback((targetPos) => {
    if (!inputRef.current) return;
    const max = raw.length;
    if (targetPos !== undefined) {
      const clamped = Math.min(Math.max(0, targetPos), max);
      inputRef.current.setSelectionRange(clamped, clamped);
    } else {
      const s = inputRef.current.selectionStart ?? 0;
      const e = inputRef.current.selectionEnd ?? 0;
      if (s > max || e > max) {
        inputRef.current.setSelectionRange(Math.min(s, max), Math.min(e, max));
      }
    }
  }, [raw]);

  const handleFocus = () => {
    if (isConfirmed && raw) {
      // Land right after the real digits user typed
      requestAnimationFrame(() => {
        clampCursor(raw.length);
      });
    }
  };

  const handleClick = () => {
    if (isConfirmed && raw) {
      clampCursor();
    }
  };

  const handleBlur = () => {
    if (raw) {
      setIsConfirmed(true);
      if (onChange) onChange(raw);
    } else {
      setIsConfirmed(false);
      if (onChange) onChange('');
    }
  };

  const handleKeyDown = (e) => {
    if (!inputRef.current) return;

    if (e.key === 'Enter') {
      inputRef.current.blur();
      return;
    }

    const s = inputRef.current.selectionStart ?? 0;
    const eSel = inputRef.current.selectionEnd ?? 0;
    const max = raw.length;

    // Prevent ArrowRight from moving into ".000"
    if (e.key === 'ArrowRight' && s >= max && eSel >= max) {
      e.preventDefault();
      clampCursor(max);
      return;
    }

    // Handle Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (s !== eSel) {
        // Delete selection within raw
        const start = Math.min(s, max);
        const end = Math.min(eSel, max);
        const nextRaw = raw.slice(0, start) + raw.slice(end);
        setRaw(nextRaw);
        if (!nextRaw) setIsConfirmed(false);
        if (onChange) onChange(nextRaw);
        requestAnimationFrame(() => clampCursor(start));
      } else if (s > 0) {
        const curPos = Math.min(s, max);
        const nextRaw = raw.slice(0, curPos - 1) + raw.slice(curPos);
        setRaw(nextRaw);
        if (!nextRaw) setIsConfirmed(false);
        if (onChange) onChange(nextRaw);
        requestAnimationFrame(() => clampCursor(curPos - 1));
      }
      return;
    }

    // Handle Delete key
    if (e.key === 'Delete') {
      e.preventDefault();
      if (s !== eSel) {
        const start = Math.min(s, max);
        const end = Math.min(eSel, max);
        const nextRaw = raw.slice(0, start) + raw.slice(end);
        setRaw(nextRaw);
        if (!nextRaw) setIsConfirmed(false);
        if (onChange) onChange(nextRaw);
        requestAnimationFrame(() => clampCursor(start));
      } else if (s < max) {
        const nextRaw = raw.slice(0, s) + raw.slice(s + 1);
        setRaw(nextRaw);
        if (!nextRaw) setIsConfirmed(false);
        if (onChange) onChange(nextRaw);
        requestAnimationFrame(() => clampCursor(s));
      }
      return;
    }

    // Handle Digit input (0-9)
    if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const start = Math.min(s, max);
      const end = Math.min(eSel, max);
      const nextRaw = raw.slice(0, start) + e.key + raw.slice(end);
      setRaw(nextRaw);
      if (onChange) onChange(nextRaw);
      const nextPos = start + 1;
      requestAnimationFrame(() => clampCursor(nextPos));
      return;
    }

    // Disallow other typing characters except tab, arrows, copy/paste shortcuts
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!paste) return;
    const s = Math.min(inputRef.current?.selectionStart ?? 0, raw.length);
    const eSel = Math.min(inputRef.current?.selectionEnd ?? 0, raw.length);
    const nextRaw = raw.slice(0, s) + paste + raw.slice(eSel);
    setRaw(nextRaw);
    if (onChange) onChange(nextRaw);
    const nextPos = s + paste.length;
    requestAnimationFrame(() => clampCursor(nextPos));
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={displayText}
      placeholder={placeholder}
      id={id}
      style={style}
      onFocus={handleFocus}
      onClick={handleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onChange={() => {}} // Controlled via onKeyDown/onPaste
    />
  );
}
