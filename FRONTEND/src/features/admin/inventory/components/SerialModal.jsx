// Modal for viewing and selecting inventory serial numbers.
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineX, HiCheck } from 'react-icons/hi';
import './SerialModal.css';

// Guard for server-side rendering
const isBrowser = typeof document !== 'undefined';

// SVG Barcode Scan Icon matching reference design
function BarcodeScanIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="serial-scan-icon"
      aria-hidden="true"
    >
      {/* Corner brackets */}
      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      {/* Barcode lines */}
      <line x1="7" y1="8" x2="7" y2="16" />
      <line x1="10" y1="8" x2="10" y2="16" />
      <line x1="13" y1="8" x2="13" y2="16" />
      <line x1="17" y1="8" x2="17" y2="16" />
    </svg>
  );
}

function generateInitialSerials(count, initialSerials) {
  if (initialSerials && initialSerials.length === count && initialSerials.every((s) => s && s.trim())) {
    return [...initialSerials];
  }
  return Array.from({ length: count }, (_, i) => {
    if (initialSerials && initialSerials[i]) return initialSerials[i];
    return `SN-BLK-256-${String(i + 1).padStart(3, '0')}`;
  });
}

export default function SerialModal({
  isOpen,
  onClose,
  variantName = 'Mặc định',
  tonDauKy = 1,
  initialSerials = [],
  onConfirm,
}) {
  if (!isOpen) return null;
  if (!isBrowser) return null;

  return createPortal(
    <SerialModalDialog
      onClose={onClose}
      variantName={variantName}
      tonDauKy={tonDauKy}
      initialSerials={initialSerials}
      onConfirm={onConfirm}
    />,
    document.body
  );
}

function SerialModalDialog({
  onClose,
  variantName = 'Mặc định',
  tonDauKy = 1,
  initialSerials = [],
  onConfirm,
}) {
  const countRequired = Math.max(1, tonDauKy || 1);
  const [serials, setSerials] = useState(() =>
    generateInitialSerials(countRequired, initialSerials)
  );
  const [pasteText, setPasteText] = useState('');

  // Validation computations
  const trimmedSerials = useMemo(() => serials.map((s) => (s || '').trim()), [serials]);

  const filledCount = useMemo(
    () => trimmedSerials.filter((s) => s.length > 0).length,
    [trimmedSerials]
  );

  const remainingCount = Math.max(0, countRequired - filledCount);

  // Check for duplicates
  const duplicateValues = useMemo(() => {
    const seen = new Set();
    const dups = new Set();
    for (const s of trimmedSerials) {
      if (s) {
        const upper = s.toUpperCase();
        if (seen.has(upper)) {
          dups.add(s);
        }
        seen.add(upper);
      }
    }
    return Array.from(dups);
  }, [trimmedSerials]);

  const hasDuplicates = duplicateValues.length > 0;
  const hasBlanks = trimmedSerials.some((s) => s.length === 0);
  const isValid = filledCount === countRequired && !hasDuplicates && !hasBlanks;

  // Warning text
  const warningMessage = useMemo(() => {
    if (hasDuplicates) {
      return `Phát hiện mã serial trùng lặp (${duplicateValues.join(', ')}). Mỗi serial phải là duy nhất.`;
    }
    if (filledCount !== countRequired || hasBlanks) {
      return `Số lượng Serial phải khớp chính xác với số tồn kho ban đầu (${countRequired}).`;
    }
    return null;
  }, [hasDuplicates, duplicateValues, filledCount, countRequired, hasBlanks]);

  // Handle single serial change
  const handleSerialChange = (index, value) => {
    setSerials((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Handle clear single serial
  const handleClearSerial = (index) => {
    handleSerialChange(index, '');
  };

  // Handle apply pasted serials
  const handleApplyPaste = () => {
    const lines = pasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    setSerials((prev) => {
      const next = [...prev];
      lines.forEach((code, idx) => {
        if (idx < countRequired) {
          next[idx] = code;
        }
      });
      return next;
    });
  };

  // Handle confirm
  const handleSave = () => {
    if (!isValid) return;
    if (onConfirm) {
      onConfirm(trimmedSerials);
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Keep the form fixed while this portal is open. Cleanup is tied to the
  // modal lifecycle, so every close path (cancel, close button, overlay,
  // Escape, confirm, and unmount) immediately restores page scrolling.
  useEffect(() => {
    document.body.classList.add('serial-modal-open');
    return () => document.body.classList.remove('serial-modal-open');
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const progressPercent = Math.min(100, Math.round((filledCount / countRequired) * 100));

  return (
    <div
      className="serial-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="serial-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="serial-modal-container">
        {/* Header */}
        <div className="serial-modal-header">
          <div className="serial-modal-header__title-wrap">
            <div className="serial-modal-header__accent" aria-hidden="true" />
            <div>
              <h2 className="serial-modal-header__title" id="serial-modal-title">
                NHẬP MÃ SERIAL KHỞI TẠO KHO
              </h2>
              <p className="serial-modal-header__subtitle">
                Mỗi serial phải là duy nhất và khớp số lượng tồn đầu kỳ
              </p>
            </div>
          </div>
          <button
            type="button"
            className="serial-modal-close"
            onClick={onClose}
            aria-label="Đóng"
            id="btn-close-serial-modal"
          >
            <HiOutlineX size={18} />
          </button>
        </div>

        {/* Status bar */}
        <div className="serial-modal-statusbar">
          <div className="serial-modal-status-item">
            <span className="serial-status-label">PHIÊN BẢN:</span>
            <span className="serial-status-val serial-status-val--bold">{variantName}</span>
          </div>
          <span className="serial-status-sep">|</span>
          <div className="serial-modal-status-item">
            <span className="serial-status-label">TỒN ĐẦU KỲ:</span>
            <span className="serial-status-val serial-status-val--red">{countRequired}</span>
          </div>
          <span className="serial-status-sep">|</span>
          <div className="serial-progress-wrap">
            <div className="serial-progress-bar">
              <div
                className="serial-progress-bar__fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="serial-progress-text">
              Đã nhập: {filledCount}/{countRequired}
            </span>
          </div>
        </div>

        {/* Main Body: 2 Columns */}
        <div className="serial-modal-body">
          {/* Left Column: Manual rows */}
          <div className="serial-modal-left">
            <h3 className="serial-col-title">QUÉT BARCODE / NHẬP TAY TỪNG MÃ:</h3>
            <div className="serial-rows-list">
              {serials.map((val, idx) => {
                const isDup = val && duplicateValues.some((d) => d.toUpperCase() === val.trim().toUpperCase());
                return (
                  <div
                    key={idx}
                    className={`serial-input-row ${isDup ? 'serial-input-row--error' : ''}`}
                  >
                    <div className="serial-input-row__icon-box" title="Quét mã barcode">
                      <BarcodeScanIcon />
                    </div>
                    <input
                      type="text"
                      className="serial-input-row__input"
                      value={val}
                      placeholder={`Nhập serial #${idx + 1}`}
                      onChange={(e) => handleSerialChange(idx, e.target.value)}
                      id={`input-serial-item-${idx}`}
                    />
                    {val ? (
                      <button
                        type="button"
                        className="serial-input-row__clear"
                        onClick={() => handleClearSerial(idx)}
                        title="Xóa mã này"
                        aria-label="Xóa mã"
                      >
                        <HiOutlineX size={14} />
                      </button>
                    ) : (
                      <span className="serial-input-row__empty-spacer" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Bulk paste & validation */}
          <div className="serial-modal-right">
            <h3 className="serial-col-title">HOẶC DÁN DANH SÁCH SERIAL</h3>
            <span className="serial-textarea-helper">Mỗi mã 1 dòng:</span>
            <textarea
              className="serial-textarea"
              rows={4}
              placeholder="SN-BLK-256-003&#10;SN-BLK-256-004&#10;..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              id="textarea-serial-paste"
            />
            <button
              type="button"
              className="btn-serial-apply"
              disabled={!pasteText.trim()}
              onClick={handleApplyPaste}
              id="btn-apply-serial-paste"
            >
              ÁP DỤNG
            </button>

            {/* Warning box if invalid */}
            {warningMessage && (
              <div className="serial-warning-box" role="alert">
                {warningMessage}
              </div>
            )}

            {/* Remaining indicator */}
            <div className="serial-remaining-section">
              <span className="serial-remaining-title">CÒN LẠI</span>
              <div
                className={`serial-remaining-circle ${
                  remainingCount === 0 && !hasDuplicates
                    ? 'serial-remaining-circle--green'
                    : 'serial-remaining-circle--red'
                }`}
              >
                {remainingCount}
              </div>
              <span className="serial-remaining-label">serial</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="serial-modal-footer">
          <div className="serial-footer-status">
            {isValid ? (
              <span className="serial-status-valid">
                <HiCheck size={16} className="serial-check-icon" />
                Đủ {countRequired} serial – sẵn sàng xác nhận.
              </span>
            ) : (
              <span className="serial-status-invalid">
                {hasDuplicates
                  ? 'Phát hiện trùng lặp serial'
                  : `Cần nhập đủ ${countRequired} serial`}
              </span>
            )}
          </div>
          <div className="serial-footer-actions">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              id="btn-cancel-serial-modal"
            >
              HỦY
            </button>
            <button
              type="button"
              className="btn-modal-confirm"
              disabled={!isValid}
              onClick={handleSave}
              id="btn-confirm-serial-save"
            >
              XÁC NHẬN LƯU ({filledCount}/{countRequired})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
