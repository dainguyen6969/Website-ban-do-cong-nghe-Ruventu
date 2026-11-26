// Admin organization screen: VaiTro.
import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineExclamationCircle,
  HiOutlineSave,
  HiOutlinePlus,
  HiOutlineTrash,
} from 'react-icons/hi';
import {
  PERMISSION_GROUPS,
  PERMISSION_MODULES,
  ROLE_ACTIONS,
  emptyPermissions,
} from '../../../../auth/roleModel';
import {
  getAllRoles,
  getRoleDetail,
  createRole,
  updateRole,
  deleteRole,
  readRolePermissions,
  ADMIN_ONLY_MODULES,
} from '../api/roleApi';
import './VaiTro.css';

const ACTION_LABELS = { xem: 'XEM', them: 'THÊM', sua: 'SỬA', xoa: 'XÓA' };

const EDITABLE_GROUPS = PERMISSION_GROUPS.map((group) => ({
  ...group,
  modules: group.modules.filter(({ id }) => !ADMIN_ONLY_MODULES.includes(id)),
})).filter((group) => group.modules.length > 0);
const EDITABLE_MODULES = EDITABLE_GROUPS.flatMap((group) => group.modules);

const copyPermissions = (perms) => {
  const p = typeof perms === 'function' ? perms() : perms || {};
  return Object.fromEntries(
    PERMISSION_MODULES.map((module) => [module.id, [...(p[module.id] || [])]])
  );
};

function MatrixCheckbox({ checked, indeterminate = false, onChange, label, disabled = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const state = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked';
  return (
    <label className="role-check" data-state={state} title={label}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        aria-checked={indeterminate ? 'mixed' : checked}
      />
      <span className="role-check__box" aria-hidden="true" />
    </label>
  );
}

export default function VaiTro() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState(() => emptyPermissions());
  const [selectedPreset, setSelectedPreset] = useState('new');
  const [editingRole, setEditingRole] = useState(null);
  const [busy, setBusy] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const editingRoleId = editingRole?.id;
  const isSystemRole = editingRole?.ma_vai_tro === 'ADMIN';
  const formLocked = busy || isSystemRole;
  const matrixGroups = isSystemRole ? PERMISSION_GROUPS : EDITABLE_GROUPS;
  const matrixModules = isSystemRole ? PERMISSION_MODULES : EDITABLE_MODULES;

  const loadRoles = () => {
    getAllRoles()
      .then((data) => {
        setRoles(data || []);
      })
      .catch((e) => setServerError(e.message || 'Không tải được danh sách vai trò.'));
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const errors = [
    submitted && !name.trim() ? 'Tên vai trò không được để trống.' : '',
    serverError,
  ].filter(Boolean);

  const actionCounts = useMemo(
    () =>
      Object.fromEntries(
        ROLE_ACTIONS.map((action) => {
          const applicable = matrixModules.filter((module) => module.actions.includes(action));
          const checked = applicable.filter((module) =>
            (permissions[module.id] || []).includes(action)
          ).length;
          return [action, { checked, total: applicable.length }];
        })
      ),
    [permissions, matrixModules]
  );

  const togglePermission = (moduleId, action) => {
    setSaved(false);
    setServerError('');
    setSuccessMsg('');
    setPermissions((current) => {
      const currentActions = current[moduleId] || [];
      return {
        ...current,
        [moduleId]: currentActions.includes(action)
          ? currentActions.filter((item) => item !== action)
          : [...currentActions, action],
      };
    });
  };

  const toggleRow = (module) => {
    setSaved(false);
    setServerError('');
    setSuccessMsg('');
    setPermissions((current) => {
      const currentActions = current[module.id] || [];
      return {
        ...current,
        [module.id]: currentActions.length ? [] : ['xem'],
      };
    });
  };

  const toggleColumn = (action) => {
    setSaved(false);
    setServerError('');
    setSuccessMsg('');
    const applicable = matrixModules.filter((module) => module.actions.includes(action));
    const allChecked = applicable.every((module) =>
      (permissions[module.id] || []).includes(action)
    );
    setPermissions((current) => {
      const next = copyPermissions(current);
      applicable.forEach((module) => {
        const currentActions = next[module.id] || [];
        next[module.id] = allChecked
          ? currentActions.filter((item) => item !== action)
          : [...new Set([...currentActions, action])];
      });
      return next;
    });
  };

  const toggleGroup = (group) => {
    setSaved(false);
    setServerError('');
    setSuccessMsg('');
    const allChecked = group.modules.every((module) =>
      module.actions.every((action) => (permissions[module.id] || []).includes(action))
    );
    setPermissions((current) => {
      const next = copyPermissions(current);
      group.modules.forEach((module) => {
        next[module.id] = allChecked ? [] : [...module.actions];
      });
      return next;
    });
  };

  const loadRoleDetail = async (role) => {
    if (busy) return;
    setBusy(true);
    setServerError('');
    setSaved(false);
    setSuccessMsg('');
    try {
      const detail = await getRoleDetail(role.id);
      if (!Number.isSafeInteger(detail?.phien_ban) || detail.phien_ban < 0) {
        throw new Error('API vai trò chưa trả phiên bản hợp lệ.');
      }

      setEditingRole(detail);
      setSelectedPreset(detail.id);
      setName(detail.ten_vai_tro || '');
      setDescription(detail.mo_ta ?? '');
      setPermissions(readRolePermissions(detail));
      setSubmitted(false);
    } catch (e) {
      setServerError(e.message || 'Lỗi tải chi tiết vai trò.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddNew = () => {
    setName('');
    setDescription('');
    setPermissions(emptyPermissions());
    setSelectedPreset('new');
    setEditingRole(null);
    setSaved(false);
    setServerError('');
    setSuccessMsg('');
    setSubmitted(false);
  };

  const submit = async () => {
    if (formLocked) return;
    setSubmitted(true);
    setSaved(false);
    setServerError('');
    setSuccessMsg('');
    if (!name.trim()) return;

    setBusy(true);
    try {
      const form = { tenVaiTro: name, moTa: description, permissions };
      const result = editingRoleId
        ? await updateRole(editingRoleId, { ...form, phienBan: editingRole.phien_ban })
        : await createRole(form);

      setEditingRole(result);
      setSelectedPreset(result.id);
      setName(result.ten_vai_tro || '');
      setDescription(result.mo_ta ?? '');
      setPermissions(readRolePermissions(result));
      setSuccessMsg(editingRoleId ? 'Đã cập nhật vai trò.' : 'Đã tạo vai trò.');
      setSaved(true);
      loadRoles();
    } catch (e) {
      setServerError(e.message || 'Đã có lỗi xảy ra khi lưu vai trò.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRoleId || formLocked) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${name}"?`)) return;

    setBusy(true);
    setSaved(false);
    setServerError('');
    try {
      await deleteRole(editingRoleId);
      handleAddNew();
      loadRoles();
    } catch (e) {
      setServerError(e.message || 'Không thể xóa vai trò này.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="role-page" role="main">
      <section className="role-topbar">
        <button className="role-back" onClick={() => navigate('/admin/nhan-vien/danh-sach')}>
          <HiOutlineArrowLeft /> QUAY LẠI
        </button>
        <h1>QUẢN LÝ VAI TRÒ &amp; PHÂN QUYỀN</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {editingRoleId && !isSystemRole && (
            <button
              className="role-save"
              style={{ background: '#dc2626' }}
              onClick={handleDelete}
              disabled={busy}
            >
              <HiOutlineTrash /> XÓA
            </button>
          )}

          <button className="role-save" onClick={submit} disabled={formLocked}>
            <HiOutlineSave /> LƯU VAI TRÒ
          </button>
        </div>
      </section>
      {errors.length > 0 && (
        <div className="role-error-banner" role="alert">
          {errors.map((error, idx) => (
            <p key={idx}>
              <HiOutlineExclamationCircle />
              {error}
            </p>
          ))}
        </div>
      )}
      {saved && (
        <div className="role-saved" role="status">
          {successMsg || 'ĐÃ LƯU VAI TRÒ VÀ MA TRẬN PHÂN QUYỀN THÀNH CÔNG'}
        </div>
      )}
      <div className="role-workspace">
        <aside className="role-sidebar-panel">
          <section className="role-info">
            <h2>
              <span />
              THÔNG TIN VAI TRÒ
            </h2>
            <label>
              <span>
                TÊN VAI TRÒ <b>*</b>
              </span>
              <input
                value={name}
                disabled={formLocked}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                  setServerError('');
                  setSuccessMsg('');
                }}
                placeholder="VD: Nhân viên bán hàng"
              />
            </label>
            <label>
              MÔ TẢ
              <textarea
                value={description}
                disabled={formLocked}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setSaved(false);
                  setServerError('');
                  setSuccessMsg('');
                }}
                placeholder="Mô tả ngắn về vai trò và phạm vi công việc..."
              />
            </label>
          </section>
          <section className="role-presets">
            <h2>
              <span />
              DANH SÁCH VAI TRÒ
            </h2>
            <button
              className={`role-preset ${selectedPreset === 'new' ? 'role-preset--active' : ''}`}
              onClick={handleAddNew}
              disabled={busy}
              style={{ borderStyle: 'dashed', justifyContent: 'center' }}
            >
              <HiOutlinePlus /> <strong>Thêm vai trò mới</strong>
            </button>
            {roles.map((preset) => (
              <button
                key={preset.id}
                className={
                  selectedPreset === preset.id ? 'role-preset role-preset--active' : 'role-preset'
                }
                onClick={() => loadRoleDetail(preset)}
                disabled={busy}
              >
                <strong>{preset.ten_vai_tro || preset.tenVaiTro}</strong>
                <span>{preset.so_luong_nhan_vien || preset.soLuongNhanVien || 0} NV</span>
                <HiOutlineChevronRight />
              </button>
            ))}
            <p>Nhấn vào để sửa quyền, hoặc nhấn "Thêm vai trò mới".</p>
          </section>
          <section className="role-summary">
            <h2>TỔNG QUYỀN ĐÃ CẤP</h2>
            {ROLE_ACTIONS.map((action) => {
              const count = actionCounts[action];
              return (
                <div className="role-progress" key={action}>
                  <div>
                    <span>
                      {ACTION_LABELS[action][0] + ACTION_LABELS[action].slice(1).toLowerCase()}
                    </span>
                    <b>
                      {count.checked}/{count.total}
                    </b>
                  </div>
                  <div className="role-progress-track">
                    <span
                      style={{ width: `${count.total ? (count.checked / count.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        </aside>
        <section className="role-matrix-panel">
          <div className="role-matrix-title">
            <h2>
              <span />
              MA TRẬN PHÂN QUYỀN
            </h2>
            <p>— Nhấn tiêu đề cột hoặc tên module để chọn nhanh toàn bộ</p>
          </div>
          <div className="role-matrix-scroll">
            <table className="role-matrix">
              <thead>
                <tr>
                  <th>MODULE / CHỨC NĂNG</th>
                  {ROLE_ACTIONS.map((action) => {
                    const count = actionCounts[action];
                    return (
                      <th key={action}>
                        <MatrixCheckbox
                          checked={count.checked === count.total}
                          indeterminate={count.checked > 0 && count.checked < count.total}
                          disabled={formLocked}
                          onChange={() => toggleColumn(action)}
                          label={`Chọn toàn bộ quyền ${ACTION_LABELS[action].toLowerCase()}`}
                        />
                        <span>{ACTION_LABELS[action]}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {matrixGroups.map((group) => {
                  const groupValues = group.modules.flatMap((module) =>
                    module.actions.map((action) => (permissions[module.id] || []).includes(action))
                  );
                  const groupAll = groupValues.length > 0 && groupValues.every(Boolean);
                  const groupSome = groupValues.some(Boolean);
                  const collapsed = collapsedGroups.includes(group.id);
                  return [
                    <tr className="role-group" key={`${group.id}-header`}>
                      <td colSpan="5">
                        <div className="role-group-content">
                          <MatrixCheckbox
                            checked={groupAll}
                            indeterminate={groupSome && !groupAll}
                            disabled={formLocked}
                            onChange={() => toggleGroup(group)}
                            label={`Chọn toàn bộ nhóm ${group.label}`}
                          />
                          <button
                            onClick={() =>
                              setCollapsedGroups((current) =>
                                current.includes(group.id)
                                  ? current.filter((id) => id !== group.id)
                                  : [...current, group.id]
                              )
                            }
                          >
                            {collapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronDown />}
                            {group.label}
                          </button>
                        </div>
                      </td>
                    </tr>,
                    ...(!collapsed
                      ? group.modules.map((module) => {
                          const modActions = permissions[module.id] || [];
                          const selectedActions = modActions.length;
                          const rowChecked = selectedActions === module.actions.length;
                          const rowIndeterminate = selectedActions > 0 && !rowChecked;
                          return (
                            <tr
                              className={`role-module ${selectedActions ? 'role-module--selected' : ''}`}
                              key={module.id}
                            >
                              <td>
                                <div className="role-module-main">
                                  <MatrixCheckbox
                                    checked={rowChecked}
                                    indeterminate={rowIndeterminate}
                                    disabled={formLocked}
                                    onChange={() => toggleRow(module)}
                                    label={`Chọn module ${module.label}`}
                                  />
                                  <div className="role-module-copy">
                                    <strong>{module.label}</strong>
                                    <span>{module.description}</span>
                                  </div>
                                </div>
                              </td>
                              {ROLE_ACTIONS.map((action) => (
                                <td key={action}>
                                  {module.actions.includes(action) ? (
                                    <MatrixCheckbox
                                      checked={modActions.includes(action)}
                                      disabled={formLocked}
                                      onChange={() => togglePermission(module.id, action)}
                                      label={`${ACTION_LABELS[action]} ${module.label}`}
                                    />
                                  ) : (
                                    <span className="role-unavailable">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
