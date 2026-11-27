import {
  HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineBan, HiOutlineCash, HiOutlineChartBar,
  HiOutlineCheck, HiOutlineClipboardList, HiOutlineDownload,
  HiOutlineExternalLink, HiOutlineInboxIn, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlinePause,
  HiOutlinePencilAlt, HiOutlinePlay, HiOutlinePlus, HiOutlinePrinter, HiOutlineRefresh,
  HiOutlineReply, HiOutlineSave, HiOutlineTrash, HiOutlineTruck, HiOutlineUpload, HiOutlineX,
} from 'react-icons/hi';
import './AdminPageAction.css';

const icons = {
  add: HiOutlinePlus,
  approve: HiOutlineCheck,
  back: HiOutlineArrowLeft,
  cancel: HiOutlineX,
  delete: HiOutlineTrash,
  download: HiOutlineDownload,
  edit: HiOutlinePencilAlt,
  forward: HiOutlineArrowRight,
  list: HiOutlineClipboardList,
  lock: HiOutlineLockClosed,
  open: HiOutlineExternalLink,
  pause: HiOutlinePause,
  payment: HiOutlineCash,
  print: HiOutlinePrinter,
  receive: HiOutlineInboxIn,
  reload: HiOutlineRefresh,
  report: HiOutlineChartBar,
  restore: HiOutlinePlay,
  return: HiOutlineReply,
  save: HiOutlineSave,
  stop: HiOutlineBan,
  truck: HiOutlineTruck,
  unlock: HiOutlineLockOpen,
  upload: HiOutlineUpload,
};

export default function AdminPageAction({ as: Control = 'button', variant = 'secondary', compact = false, icon, type = 'button', children, ...props }) {
  const Icon = icons[icon];
  return (
    <Control
      {...props}
      className="admin-page-action-btn"
      data-variant={variant}
      data-compact={compact || undefined}
      type={Control === 'button' ? type : undefined}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </Control>
  );
}
