import { useId, useState } from 'react';
import { MAX_FONT_SIZE, MIN_FONT_SIZE, normalizeFontSize } from './fontSize';
import './FontSizeControl.css';

export default function FontSizeControl({ value, onChange, disabled = false }) {
  const id = useId();
  const [draft, setDraft] = useState({ value, text: String(value) });
  const text = draft.value === value ? draft.text : String(value);

  const select = (next) => { setDraft({ value: next, text: String(next) }); onChange(next); };
  const type = (raw) => {
    const next = Number(raw);
    const valid = raw !== '' && Number.isInteger(next) && next >= MIN_FONT_SIZE && next <= MAX_FONT_SIZE;
    setDraft({ value: valid ? next : value, text: raw });
    if (valid) onChange(next);
  };
  return <div className="font-size-control">
    <label htmlFor={id}>Cỡ chữ (12–20 px)</label>
    <div className="font-size-control__inputs">
      <input type="range" aria-label="Kéo chọn cỡ chữ" min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step="1" value={value} disabled={disabled} onChange={(e) => select(Number(e.target.value))} />
      <input id={id} type="number" required min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step="1" value={text} disabled={disabled} onChange={(e) => type(e.target.value)} onBlur={() => select(normalizeFontSize(text, value))} />
      <span>px</span>
    </div>
  </div>;
}
