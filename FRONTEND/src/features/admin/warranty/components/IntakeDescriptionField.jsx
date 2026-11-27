import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { WarrantyDialog } from './WarrantyShell';

function IntakeDescriptionDialog({ options, title, selected, custom, single, allowCustom, disabledOption, onClose, onApply }) {
  const [choices, setChoices] = useState(selected);
  const [entries, setEntries] = useState(custom);
  const [other, setOther] = useState(custom.length > 0);
  const [draft, setDraft] = useState('');
  const [customError, setCustomError] = useState('');
  const inputRef = useRef(null);
  const choiceName = useId();
  const activeEntries = other ? entries : [];

  function addCustom() {
    const value = draft.trim();
    if (!value) return;
    if ([...choices, ...entries].some(item => item.toLocaleLowerCase('vi') === value.toLocaleLowerCase('vi'))) {
      setCustomError('Nội dung này đã được chọn.');
      return;
    }
    setEntries(current => single ? [value] : [...current, value]);
    setDraft('');
    setCustomError('');
    inputRef.current?.focus();
  }

  function apply() {
    if (other && draft.trim()) {
      setCustomError('Bấm Thêm hoặc Enter để ghi nội dung đang nhập.');
      inputRef.current?.focus();
      return;
    }
    onApply(choices, activeEntries);
  }

  return (
    <WarrantyDialog
      title={`Chọn ${title.toLocaleLowerCase('vi')}`}
      onClose={onClose}
      footer={(
        <>
          <span className="w-intake-picker-count" role="status">
            Đã chọn {choices.length + activeEntries.length} mục
          </span>
          <button type="button" className="w-shell-button" onClick={onClose}>Hủy</button>
          <button type="button" className="w-shell-button w-shell-button--black" onClick={apply}>Áp dụng</button>
        </>
      )}
    >
      <div className="w-intake-picker-groups">
        {options.map(([group, groupOptions]) => (
          <fieldset className="w-intake-picker-group" key={group}>
            <legend>{group}</legend>
            <div className="w-intake-picker-checks">
              {groupOptions.map(option => (
                <label key={option}>
                  <input
                    type={single ? 'radio' : 'checkbox'}
                    name={single ? choiceName : undefined}
                    checked={choices.includes(option)}
                    disabled={option === disabledOption}
                    onChange={event => {
                      const checked = event.target.checked;
                      if (single) {
                        setChoices([option]);
                        setOther(false);
                        setDraft('');
                        setCustomError('');
                      } else {
                        setChoices(current => checked ? [...current, option] : current.filter(item => item !== option));
                      }
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {allowCustom && <div className="w-intake-picker-custom">
        <label className="w-intake-picker-other">
          <input
            type={single ? 'radio' : 'checkbox'}
            name={single ? choiceName : undefined}
            checked={other}
            onChange={event => {
              setOther(event.target.checked);
              if (single) setChoices([]);
            }}
          />
          Khác
        </label>
        {other && (
          <>
            <div className="w-intake-picker-entry">
              <input
                ref={inputRef}
                type="text"
                aria-label="Nội dung khác"
                aria-invalid={Boolean(customError)}
                placeholder="Nhập nội dung khác"
                value={draft}
                onChange={event => { setDraft(event.target.value); setCustomError(''); }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  addCustom();
                }}
              />
              <button type="button" className="w-shell-button" disabled={!draft.trim()} onClick={addCustom}>Thêm</button>
            </div>
            {customError && <p className="w-shell-error" role="alert">{customError}</p>}
            {entries.length > 0 && (
              <ul className="w-intake-picker-entries" aria-label="Nội dung khác đã thêm">
                {entries.map(entry => (
                  <li key={entry}>
                    <span>{entry}</span>
                    <button type="button" className="w-shell-button" aria-label={`Xóa ${entry}`} onClick={() => setEntries(current => current.filter(item => item !== entry))}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>}
    </WarrantyDialog>
  );
}

export default function IntakeDescriptionField({ options, title, selected, custom = [], single = false, allowCustom = true, optional = false, disabledOption, error, onChange }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [placement, setPlacement] = useState(null);
  const moreId = useId();
  const triggerRef = useRef(null);
  const items = [...selected, ...custom];
  const visibleCount = 4;
  const hasMore = items.length > visibleCount;

  useLayoutEffect(() => {
    if (!more || !hasMore) return;
    const button = triggerRef.current;
    const summary = button.parentElement;
    const viewport = button.closest('.w-warranty-dialog-body, .w-intake');

    function positionList() {
      const anchor = button.getBoundingClientRect();
      const container = summary.getBoundingClientRect();
      const area = viewport.getBoundingClientRect();
      const width = Math.min(360, viewport.clientWidth - 16);
      const maxHeight = Math.min(180, window.innerHeight * 0.38);
      const minX = area.left + 8;
      const maxX = area.left + viewport.clientWidth - width - 8;
      const left = Math.max(minX, Math.min(anchor.right - width, maxX));
      const spaceAbove = anchor.top - area.top - 8;
      const spaceBelow = area.bottom - anchor.bottom - 8;
      const above = spaceAbove >= maxHeight || spaceAbove >= spaceBelow;
      setPlacement({
        left: left - container.left,
        width,
        maxHeight: Math.max(0, Math.min(maxHeight, above ? spaceAbove : spaceBelow)),
        ...(above ? { bottom: container.bottom - anchor.top } : { top: anchor.bottom - container.top }),
      });
    }

    positionList();
    const observer = new ResizeObserver(positionList);
    observer.observe(summary);
    viewport.addEventListener('scroll', positionList, { passive: true });
    window.addEventListener('resize', positionList);
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', positionList);
      window.removeEventListener('resize', positionList);
    };
  }, [more, hasMore]);

  return (
    <section className="w-intake-picker-field" aria-label={title}>
      <header>
        <h3>{title} {optional ? <small className="w-field-optional">Tùy chọn</small> : <span aria-hidden="true">*</span>}</h3>
        <button type="button" className="w-shell-button" aria-haspopup="dialog" aria-label={`Thêm ${title.toLocaleLowerCase('vi')}`} onClick={() => { setMore(false); setOpen(true); }}>
          <Plus size={14} aria-hidden="true" /> Thêm
        </button>
      </header>
      {items.length > 0 ? (
        <div
          className="w-intake-picker-summary"
          onPointerLeave={event => { if (event.pointerType === 'mouse') setMore(false); }}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMore(false); }}
          onKeyDown={event => {
            if (event.key === 'Escape' && more) {
              triggerRef.current?.focus();
              setMore(false);
            }
          }}
        >
          {items.slice(0, visibleCount).map((item, index) => <span key={`${index}-${item}`} title={item}>{item}</span>)}
          {hasMore && (
            <>
              <button
                ref={triggerRef}
                type="button"
                className="w-intake-picker-more"
                aria-label={`Xem ${items.length} mục đã chọn`}
                aria-expanded={more}
                aria-controls={moreId}
                onPointerEnter={event => { if (event.pointerType === 'mouse') setMore(true); }}
                onFocus={() => setMore(true)}
                onClick={event => { event.currentTarget.focus(); setMore(true); }}
              >
                +{items.length - visibleCount}
              </button>
              <ul className="w-intake-picker-more-list" id={moreId} style={placement} hidden={!more} tabIndex={0} aria-label="Tất cả mục đã chọn">
                {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
              </ul>
            </>
          )}
        </div>
      ) : <p>Chưa chọn</p>}
      {error && <p className="w-shell-error" role="alert">{error}</p>}
      {open && (
        <IntakeDescriptionDialog
          options={options}
          title={title}
          selected={selected}
          custom={custom}
          single={single}
          allowCustom={allowCustom}
          disabledOption={disabledOption}
          onClose={() => setOpen(false)}
          onApply={(choices, entries) => { onChange(choices, entries); setOpen(false); }}
        />
      )}
    </section>
  );
}
