import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBell, HiOutlineX } from 'react-icons/hi';
import { subscribeAdminRealtime } from '../../../features/admin/orders/api/orderRealtime';
import { addNotification, expireReadNotifications, markNotificationsRead, NOTIFICATION_CATEGORIES, notificationStatus, notificationTarget, READ_NOTIFICATION_TTL_MS } from './notificationState';
import './NotificationBell.css';

const timestamp = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

export default function NotificationBell() {
  // shortcut: notifications/read state live only in this mounted admin session; add server persistence when required.
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState([]);
  const root = useRef(null);
  const trigger = useRef(null);
  const navigate = useNavigate();
  const unread = items.filter(item => item.unread).length;
  const panelOpen = open && items.length > 0;

  useEffect(() => subscribeAdminRealtime(event => {
    if (event.type === 'admin-notification') setItems(current => addNotification(current, event.notification));
  }), []);

  useEffect(() => {
    const expiresAt = Math.min(...items.filter(item => !item.unread && item.readAt != null)
      .map(item => item.readAt + READ_NOTIFICATION_TTL_MS));
    if (!Number.isFinite(expiresAt)) return undefined;
    const timer = setTimeout(() => setItems(current => expireReadNotifications(current)), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [items]);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = event => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [panelOpen]);

  function toggleCategory(category) {
    if (!expanded.includes(category)) setItems(current => markNotificationsRead(current, category));
    setExpanded(current => current.includes(category) ? current.filter(key => key !== category) : [...current, category]);
  }

  function visit(item) {
    const target = notificationTarget(item);
    if (!target) return;
    setItems(current => markNotificationsRead(current, item.category, item.itemId));
    setOpen(false);
    navigate(target.pathname, { state: target.state });
  }

  return <div className="admin-notifications" ref={root}>
    <button type="button" className="header__icon-btn" id="notification-bell" ref={trigger}
      aria-label={`Thông báo${unread ? `, ${unread} mục chưa đọc` : ''}`} aria-expanded={panelOpen} aria-controls="admin-notification-panel"
      onClick={() => setOpen(current => items.length > 0 && !current)}>
      <HiOutlineBell size={20} />
      {unread > 0 && <span className="header__notification-badge">{unread}</span>}
    </button>
    {panelOpen && <section className="admin-notifications__panel" id="admin-notification-panel" aria-label="Trung tâm thông báo">
      <header className="admin-notifications__header"><h2>THÔNG BÁO</h2><button type="button" aria-label="Đóng thông báo" onClick={() => { setOpen(false); trigger.current?.focus(); }}><HiOutlineX size={18} /></button></header>
      <div className="admin-notifications__scroll">
        {NOTIFICATION_CATEGORIES.map(([category, label]) => {
          const entries = items.filter(item => item.category === category);
          if (entries.length === 0) return null;
          const count = entries.filter(item => item.unread).length;
          const isExpanded = expanded.includes(category);
          return <div className="admin-notifications__category" key={category}>
            <button type="button" className="admin-notifications__toggle" aria-expanded={isExpanded} aria-controls={`notification-${category}`} onClick={() => toggleCategory(category)}>
              <span>{label}</span>{count > 0 && <span className="admin-notifications__count">{count}</span>}
            </button>
            {isExpanded && <div className="admin-notifications__items" id={`notification-${category}`}>
              {entries.map(item => <button type="button" className={`admin-notifications__item${item.unread ? ' is-unread' : ''}`} key={item.itemId} onClick={() => visit(item)}>
                <strong>{item.title}</strong><span>{item.description}</span>
                {item.changes.map((change, index) => <span className="admin-notifications__change" key={index}>{change.field}: {notificationStatus(change.before)} → {notificationStatus(change.after)}<time dateTime={change.occurredAt}>{timestamp(change.occurredAt)}</time></span>)}
                <time dateTime={item.occurredAt}>{timestamp(item.occurredAt)}</time>
              </button>)}
            </div>}
          </div>;
        })}
      </div>
    </section>}
  </div>;
}
