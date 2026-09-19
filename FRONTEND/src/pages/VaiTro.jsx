import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineExclamationCircle,
  HiOutlineSave,
} from 'react-icons/hi';
import useMockAuth from '../auth/useMockAuth';
import {
  PERMISSION_GROUPS,
  PERMISSION_MODULES,
  ROLE_ACTIONS,
  ROLE_PRESETS,
  emptyPermissions,
} from '../auth/roleModel';
import './VaiTro.css';

const ACTION_LABELS = { xem: 'XEM', them: 'THÊM', sua: 'SỬA', xoa: 'XÓA' };

const copyPermissions = (permissions) => Object.fromEntries(
  PERMISSION_MODULES.map((module) => [module.id, [...(permissions[module.id] ?? [])]]),
);

function MatrixCheckbox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  const state = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked';
  return <label className="role-check" data-state={state} title={label}><input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} aria-checked={indeterminate ? 'mixed' : checked} /><span className="role-check__box" aria-hidden="true" /></label>;
}

export default function VaiTro() {
  const navigate = useNavigate();
  const { roles, saveRole } = useMockAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState(emptyPermissions);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [editingRoleId, setEditingRoleId] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const permissionCount = useMemo(() => Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0), [permissions]);
  const errors = submitted ? [
    !name.trim() ? 'Tên vai trò không được để trống.' : '',
    !permissionCount ? 'Vui lòng cấp ít nhất một quyền cho vai trò này.' : '',
  ].filter(Boolean) : [];

  const actionCounts = useMemo(() => Object.fromEntries(ROLE_ACTIONS.map((action) => {
    const applicable = PERMISSION_MODULES.filter((module) => module.actions.includes(action));
    const checked = applicable.filter((module) => permissions[module.id]?.includes(action)).length;
    return [action, { checked, total: applicable.length }];
  })), [permissions]);

  const togglePermission = (moduleId, action) => {
    setSaved(false);
    setPermissions((current) => ({ ...current, [moduleId]: current[moduleId].includes(action) ? current[moduleId].filter((item) => item !== action) : [...current[moduleId], action] }));
  };

  const toggleRow = (module) => {
    setSaved(false);
    setPermissions((current) => ({ ...current, [module.id]: current[module.id].length ? [] : ['xem'] }));
  };

  const toggleColumn = (action) => {
    setSaved(false);
    const applicable = PERMISSION_MODULES.filter((module) => module.actions.includes(action));
    const allChecked = applicable.every((module) => permissions[module.id].includes(action));
    setPermissions((current) => {
      const next = copyPermissions(current);
      applicable.forEach((module) => { next[module.id] = allChecked ? next[module.id].filter((item) => item !== action) : [...new Set([...next[module.id], action])]; });
      return next;
    });
  };

  const toggleGroup = (group) => {
    setSaved(false);
    const allChecked = group.modules.every((module) => module.actions.every((action) => permissions[module.id].includes(action)));
    setPermissions((current) => {
      const next = copyPermissions(current);
      group.modules.forEach((module) => { next[module.id] = allChecked ? [] : [...module.actions]; });
      return next;
    });
  };

  const applyPreset = (preset) => {
    if (!name.trim()) setName(preset.label);
    setPermissions(copyPermissions(preset.permissions));
    setSelectedPreset(preset.id);
    setEditingRoleId(preset.id);
    setSaved(false);
  };

  const submit = () => {
    setSubmitted(true);
    if (!name.trim() || !permissionCount) return;
    const existingRole = roles.find((role) => role.id === editingRoleId);
    const savedRole = saveRole({ id: existingRole?.id, label: name, description, abbreviation: existingRole?.abbreviation, permissions: copyPermissions(permissions) });
    setEditingRoleId(savedRole.id);
    setSaved(true);
  };

  return <main className="role-page" role="main">
    <section className="role-topbar"><button className="role-back" onClick={() => navigate('/admin/nhan-vien/danh-sach')}><HiOutlineArrowLeft /> QUAY LẠI</button><h1>THÊM VAI TRÒ &amp; PHÂN QUYỀN</h1><button className="role-save" onClick={submit}><HiOutlineSave /> LƯU VAI TRÒ</button></section>
    {errors.length > 0 && <div className="role-error-banner" role="alert">{errors.map((error) => <p key={error}><HiOutlineExclamationCircle />{error}</p>)}</div>}
    {saved && <div className="role-saved" role="status">ĐÃ LƯU VAI TRÒ VÀ MA TRẬN PHÂN QUYỀN</div>}
    <div className="role-workspace">
      <aside className="role-sidebar-panel">
        <section className="role-info"><h2><span />THÔNG TIN VAI TRÒ</h2><label><span>TÊN VAI TRÒ <b>*</b></span><input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} placeholder="VD: Nhân viên bán hàng" /></label><label>MÔ TẢ<textarea value={description} onChange={(event) => { setDescription(event.target.value); setSaved(false); }} placeholder="Mô tả ngắn về vai trò và phạm vi công việc..." /></label></section>
        <section className="role-presets"><h2><span />MẪU VAI TRÒ CÓ SẴN</h2>{ROLE_PRESETS.map((preset) => <button key={preset.id} className={selectedPreset === preset.id ? 'role-preset role-preset--active' : 'role-preset'} onClick={() => applyPreset(preset)}><strong>{preset.label}</strong><HiOutlineChevronRight /></button>)}<p>Chọn mẫu để điền nhanh ma trận quyền. Bạn có thể chỉnh sửa sau.</p></section>
        <section className="role-summary"><h2>TỔNG QUYỀN ĐÃ CẤP</h2>{ROLE_ACTIONS.map((action) => { const count = actionCounts[action]; return <div className="role-progress" key={action}><div><span>{ACTION_LABELS[action][0] + ACTION_LABELS[action].slice(1).toLowerCase()}</span><b>{count.checked}/{count.total}</b></div><div className="role-progress-track"><span style={{ width: `${count.total ? count.checked / count.total * 100 : 0}%` }} /></div></div>; })}</section>
      </aside>
      <section className="role-matrix-panel"><div className="role-matrix-title"><h2><span />MA TRẬN PHÂN QUYỀN</h2><p>— Nhấn tiêu đề cột hoặc tên module để chọn nhanh toàn bộ</p></div>
        <div className="role-matrix-scroll"><table className="role-matrix"><thead><tr><th>MODULE / CHỨC NĂNG</th>{ROLE_ACTIONS.map((action) => { const count = actionCounts[action]; return <th key={action}><MatrixCheckbox checked={count.checked === count.total} indeterminate={count.checked > 0 && count.checked < count.total} onChange={() => toggleColumn(action)} label={`Chọn toàn bộ quyền ${ACTION_LABELS[action].toLowerCase()}`} /><span>{ACTION_LABELS[action]}</span></th>; })}</tr></thead><tbody>
          {PERMISSION_GROUPS.map((group) => {
            const groupValues = group.modules.flatMap((module) => module.actions.map((action) => permissions[module.id].includes(action)));
            const groupAll = groupValues.every(Boolean); const groupSome = groupValues.some(Boolean); const collapsed = collapsedGroups.includes(group.id);
            return [<tr className="role-group" key={`${group.id}-header`}><td colSpan="5"><div className="role-group-content"><MatrixCheckbox checked={groupAll} indeterminate={groupSome && !groupAll} onChange={() => toggleGroup(group)} label={`Chọn toàn bộ nhóm ${group.label}`} /><button onClick={() => setCollapsedGroups((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}>{collapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronDown />}{group.label}</button></div></td></tr>, ...(!collapsed ? group.modules.map((module) => {
              const selectedActions = permissions[module.id].length;
              const rowChecked = selectedActions === module.actions.length;
              const rowIndeterminate = selectedActions > 0 && !rowChecked;
              return <tr className={`role-module ${selectedActions ? 'role-module--selected' : ''}`} key={module.id}><td><div className="role-module-main"><MatrixCheckbox checked={rowChecked} indeterminate={rowIndeterminate} onChange={() => toggleRow(module)} label={`Chọn module ${module.label}`} /><div className="role-module-copy"><strong>{module.label}</strong><span>{module.description}</span></div></div></td>{ROLE_ACTIONS.map((action) => <td key={action}>{module.actions.includes(action) ? <MatrixCheckbox checked={permissions[module.id].includes(action)} onChange={() => togglePermission(module.id, action)} label={`${ACTION_LABELS[action]} ${module.label}`} /> : <span className="role-unavailable">—</span>}</td>)}</tr>;
            }) : [])];
          })}
        </tbody></table></div>
      </section>
    </div>
  </main>;
}
