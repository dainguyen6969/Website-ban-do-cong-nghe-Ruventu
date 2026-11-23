import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({
  text = 'Đang tải dữ liệu...',
  size = 'md',
  fullPage = false,
  fullscreen = false,
  className = '',
}) {
  const containerClass = [
    'loading-spinner-container',
    fullscreen
      ? 'loading-spinner-container--fullscreen'
      : fullPage
        ? 'loading-spinner-container--full'
        : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className={`loading-spinner loading-spinner--${size}`} aria-hidden="true" />
      {text && <span className="loading-spinner__text">{text}</span>}
    </div>
  );
}
