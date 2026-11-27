import { Link } from 'react-router-dom';

export default function AdminLink({ className = '', variant = 'text', ...props }) {
  return (
    <Link
      {...props}
      className={`admin-link admin-link--${variant} ${className}`.trim()}
      aria-description="Mở trong tab mới"
      target="_blank"
      rel="noopener noreferrer"
    />
  );
}
