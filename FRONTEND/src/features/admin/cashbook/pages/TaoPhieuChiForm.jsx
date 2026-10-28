import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { disbursementService } from '../../../../shared/services/disbursementService';
import './TaoPhieuForm.css';

const fallbackPersonData = {
  NHAN_VIEN: [
    { ten_nguoi_nop_nhan: 'Trần Văn Bình', so_dien_thoai: '0901 111 222', nguoi_nop_nhan_id: 1 },
    { ten_nguoi_nop_nhan: 'Nguyễn Thị Lan', so_dien_thoai: '0902 222 333', nguoi_nop_nhan_id: 2 },
    { ten_nguoi_nop_nhan: 'Lê Đức Tâm', so_dien_thoai: '0903 333 444', nguoi_nop_nhan_id: 3 },
    { ten_nguoi_nop_nhan: 'Trần Thị B', so_dien_thoai: '0904 444 555', nguoi_nop_nhan_id: 4 },
  ],
  KHACH_HANG: [
    { ten_nguoi_nop_nhan: 'Nguyễn Thị Lan', so_dien_thoai: '0901 234 567', nguoi_nop_nhan_id: 5 },
    { ten_nguoi_nop_nhan: 'Hoàng Minh Khoa', so_dien_thoai: '0912 345 678', nguoi_nop_nhan_id: 6 },
    { ten_nguoi_nop_nhan: 'Phạm Quốc Hùng', so_dien_thoai: '0923 456 789', nguoi_nop_nhan_id: 7 },
    { ten_nguoi_nop_nhan: 'Vũ Thị Ngọc', so_dien_thoai: '0934 567 890', nguoi_nop_nhan_id: 8 },
    { ten_nguoi_nop_nhan: 'Nguyễn Văn An', so_dien_thoai: '0945 678 901', nguoi_nop_nhan_id: 9 },
    { ten_nguoi_nop_nhan: 'Trần Thị Bích', so_dien_thoai: '0956 789 012', nguoi_nop_nhan_id: 10 },
  ],
  NHA_CUNG_CAP: [
    { ten_nguoi_nop_nhan: 'ASUS Vietnam Co.', so_dien_thoai: '028 1234 5678', nha_cung_cap_id: 1 },
    { ten_nguoi_nop_nhan: 'Corsair Viet Nam', so_dien_thoai: '028 2345 6789', nha_cung_cap_id: 2 },
    { ten_nguoi_nop_nhan: 'Công ty ABC Tech', so_dien_thoai: '028 3910 9999', nha_cung_cap_id: 3 },
  ],
  DOI_TAC_GIAO_HANG: [
    { ten_nguoi_nop_nhan: 'GHN Express', so_dien_thoai: '1900 636677', doi_tac_van_chuyen_id: 1 },
    {
      ten_nguoi_nop_nhan: 'Giao Hàng Tiết Kiệm',
      so_dien_thoai: '1900 6092',
      doi_tac_van_chuyen_id: 2,
    },
    { ten_nguoi_nop_nhan: 'Viettel Post', so_dien_thoai: '1900 8095', doi_tac_van_chuyen_id: 3 },
  ],
};

export default function TaoPhieuChiForm() {
  const navigate = useNavigate();

  // Form states
  const [group, setGroup] = useState('NHAN_VIEN');
  const [person, setPerson] = useState('');
  const [personId, setPersonId] = useState(null);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionTimeout, setSuggestionTimeout] = useState(null);

  const [code, setCode] = useState('');

  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');

  const [refCode, setRefCode] = useState('');
  const [amount, setAmount] = useState('500000');

  const formatDateTimeLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [recordDate, setRecordDate] = useState(formatDateTimeLocal(new Date()));

  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [description, setDescription] = useState('');

  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active disbursement types for "CHI"
  const fetchDisbursementTypes = useCallback(async () => {
    try {
      const res = await disbursementService.getDisbursementTypes({
        dung_cho: 'THU_CONG',
        trang_thai: 1,
        limit: 100,
      });
      if (res.data?.data?.items) {
        setAvailableTypes(res.data.data.items);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách loại phiếu chi', error);
    }
  }, []);

  useEffect(() => {
    fetchDisbursementTypes();
  }, [fetchDisbursementTypes]);

  // Handle fetching payee suggestions
  const fetchSuggestions = useCallback(
    async (keyword = '', currentGroup = group) => {
      try {
        const params = { nhom_nguoi_nop_nhan: currentGroup };
        if (keyword && keyword.trim()) {
          params.keyword = keyword.trim();
        }
        const res = await disbursementService.getPayeeSuggestions(params);
        if (res.data?.data?.items && res.data.data.items.length > 0) {
          setSuggestions(res.data.data.items);
          return;
        }
      } catch (error) {
        console.error('Lỗi lấy gợi ý người nhận', error);
      }

      // Fallback to local catalog if API returns empty
      const fallbackList = fallbackPersonData[currentGroup] || [];
      const filtered = keyword.trim()
        ? fallbackList.filter((p) =>
            p.ten_nguoi_nop_nhan.toLowerCase().includes(keyword.toLowerCase().trim())
          )
        : fallbackList;
      setSuggestions(filtered);
    },
    [group]
  );

  useEffect(() => {
    fetchSuggestions('', group);
  }, [group, fetchSuggestions]);

  const handlePersonChange = (e) => {
    const value = e.target.value;
    setPerson(value);
    setPersonId(null);
    setShowPersonDropdown(true);
    setErrors((prev) => ({ ...prev, person: null }));

    if (suggestionTimeout) clearTimeout(suggestionTimeout);
    setSuggestionTimeout(setTimeout(() => fetchSuggestions(value, group), 250));
  };

  const handleSelectSuggestion = (item) => {
    setPerson(item.ten_nguoi_nop_nhan);
    if (group === 'KHACH_HANG' || group === 'NHAN_VIEN') {
      setPersonId(item.nguoi_nop_nhan_id);
    } else if (group === 'NHA_CUNG_CAP') {
      setPersonId(item.nha_cung_cap_id);
    } else if (group === 'DOI_TAC_GIAO_HANG') {
      setPersonId(item.doi_tac_van_chuyen_id);
    }
    setShowPersonDropdown(false);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const handleAddTagClick = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setTagInput('');
    }
  };

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;

    // Auto-generate code if user leaves it blank
    const generatedCode = newTypeCode.trim() || `LPC${Date.now().toString().slice(-6)}`;

    try {
      const res = await disbursementService.createDisbursementType({
        ma_loai: generatedCode,
        ten_loai: newTypeName.trim(),
        ghi_chu: '',
      });
      if (res.data?.data) {
        await fetchDisbursementTypes();
        setSelectedTypeId(res.data.data.id.toString());
        setShowAddTypeModal(false);
        setNewTypeName('');
        setNewTypeCode('');
        setErrors((prev) => ({ ...prev, type: null }));
      }
    } catch (error) {
      console.error('Lỗi thêm loại phiếu chi', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo loại phiếu chi');
    }
  };

  const handleSubmit = async () => {
    let newErrors = {};

    if (!person.trim()) {
      newErrors.person = 'Vui lòng chọn hoặc nhập tên người nhận';
    }

    if (!selectedTypeId) {
      newErrors.type = 'Vui lòng chọn loại chi';
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Vui lòng nhập số tiền chi hợp lệ (> 0)';
    }

    if (!recordDate) {
      newErrors.date = 'Vui lòng chọn ngày ghi nhận';
    } else if (new Date(recordDate).getTime() > Date.now()) {
      newErrors.date = 'Ngày ghi nhận không được ở tương lai';
    }

    if (code.trim() && code.trim().toUpperCase().startsWith('CHI-')) {
      newErrors.code = 'Mã phiếu bắt đầu bằng CHI- được dành riêng cho hệ thống tự động';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nhom_nguoi_nop_nhan: group,
        ten_nguoi_nop_nhan: person.trim(),
        ma_phieu: code.trim() || undefined,
        loai_thu_chi_id: parseInt(selectedTypeId),
        ma_chung_tu_tham_chieu: refCode.trim() || undefined,
        so_tien: numAmount,
        phuong_thuc_thanh_toan: paymentMethod,
        ngay_ghi_nhan: new Date(recordDate).toISOString(),
        mo_ta: description.trim() || undefined,
        tags: tags.length > 0 ? tags.join(',') : undefined,
      };

      if (personId) {
        if (group === 'KHACH_HANG' || group === 'NHAN_VIEN') payload.nguoi_nop_nhan_id = personId;
        else if (group === 'NHA_CUNG_CAP') payload.nha_cung_cap_id = personId;
        else if (group === 'DOI_TAC_GIAO_HANG') payload.doi_tac_van_chuyen_id = personId;
      }

      const requestKey = crypto.randomUUID();
      await disbursementService.createDisbursement(payload, requestKey);
      navigate('/admin/so-quy-tien-mat/phieu-chi', {
        state: { successMessage: 'TẠO PHIẾU CHI THÀNH CÔNG' },
      });
    } catch (error) {
      console.error('Lỗi khi tạo phiếu chi', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo phiếu chi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedAmount = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return '0đ';
    return num.toLocaleString('vi-VN') + 'đ';
  };

  const getSelectedTypeName = () => {
    const typeObj = availableTypes.find((t) => t.id.toString() === selectedTypeId);
    return typeObj ? typeObj.ten_loai : '-';
  };

  const getPersonPlaceholder = (grp) => {
    switch (grp) {
      case 'NHAN_VIEN':
        return 'TÌM NHÂN VIÊN...';
      case 'KHACH_HANG':
        return 'TÌM KHÁCH HÀNG...';
      case 'NHA_CUNG_CAP':
        return 'TÌM NHÀ CUNG CẤP...';
      case 'DOI_TAC_GIAO_HANG':
        return 'TÌM ĐỐI TÁC GIAO HÀNG...';
      case 'KHAC':
        return 'TÌM HOẶC NHẬP TÊN...';
      default:
        return 'TÌM KIẾM...';
    }
  };

  return (
    <div className="tpf-page">
      {/* Top Page Header Bar */}
      <div className="tpf-top-bar">
        <div className="tpf-breadcrumb-top">
          ADMIN &nbsp;&rsaquo;&nbsp; PHIẾU CHI &nbsp;&rsaquo;&nbsp; TẠO PHIẾU CHI
        </div>
        <button
          type="button"
          className="tpf-btn-top-create"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'ĐANG TẠO...' : 'TẠO PHIẾU CHI'}
        </button>
      </div>

      {/* Sub Header Section */}
      <div className="tpf-header">
        <div className="tpf-header-sub-row">
          <div className="tpf-badge-box">PHIẾU CHI</div>
          <div className="tpf-breadcrumb-sub">SỔ QUỸ TIỀN MẶT / PHIẾU CHI / TẠO PHIẾU CHI</div>
        </div>
        <div className="tpf-header-main-row">
          <h1>TẠO PHIẾU CHI</h1>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="tpf-form-card">
        <div className="tpf-form-grid">
          {/* Left Column: Thông tin người nhận */}
          <div className="tpf-col">
            <div className="tpf-col-header">THÔNG TIN NGƯỜI NHẬN</div>

            <div className="tpf-form-group">
              <label>NHÓM NGƯỜI NHẬN *</label>
              <select
                value={group}
                onChange={(e) => {
                  const newGroup = e.target.value;
                  setGroup(newGroup);
                  setPerson('');
                  setPersonId(null);
                  fetchSuggestions('', newGroup);
                }}
              >
                <option value="NHAN_VIEN">NHÂN VIÊN</option>
                <option value="KHACH_HANG">KHÁCH HÀNG</option>
                <option value="NHA_CUNG_CAP">NHÀ CUNG CẤP</option>
                <option value="DOI_TAC_GIAO_HANG">ĐỐI TÁC GIAO HÀNG</option>
                <option value="KHAC">KHÁC</option>
              </select>
            </div>

            <div className="tpf-form-group">
              <label>TÊN NGƯỜI NHẬN *</label>
              <div className={`tpf-input-search-wrapper ${showPersonDropdown ? 'is-focused' : ''}`}>
                <input
                  type="text"
                  placeholder={getPersonPlaceholder(group)}
                  value={person}
                  className={errors.person ? 'input-error' : ''}
                  onFocus={() => {
                    setShowPersonDropdown(true);
                    fetchSuggestions(person, group);
                  }}
                  onBlur={() => setTimeout(() => setShowPersonDropdown(false), 250)}
                  onChange={handlePersonChange}
                />
                {showPersonDropdown && suggestions.length > 0 && (
                  <div className="tpf-search-dropdown">
                    {suggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="tpf-search-dropdown-item"
                        onMouseDown={() => handleSelectSuggestion(item)}
                      >
                        <div className="dropdown-name">{item.ten_nguoi_nop_nhan}</div>
                        <div className="dropdown-phone">
                          {item.so_dien_thoai || item.thong_tin_bo_sung || ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.person && <span className="error-text">{errors.person}</span>}
            </div>

            <div className="tpf-form-group">
              <label>MÃ PHIẾU (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Để trống để tự động tạo (PC...)"
                value={code}
                className={errors.code ? 'input-error' : ''}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrors((prev) => ({ ...prev, code: null }));
                }}
              />
              {errors.code && <span className="error-text">{errors.code}</span>}
            </div>

            <div className="tpf-form-group">
              <label>LOẠI CHI *</label>
              <div className="tpf-select-add-group">
                <select
                  value={selectedTypeId}
                  onChange={(e) => {
                    setSelectedTypeId(e.target.value);
                    setErrors((prev) => ({ ...prev, type: null }));
                  }}
                  className={errors.type ? 'input-error' : ''}
                >
                  <option value="">— CHỌN LOẠI CHI —</option>
                  {availableTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ten_loai}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-add-type-label"
                  onClick={() => setShowAddTypeModal(true)}
                >
                  + THÊM LOẠI
                </button>
              </div>
              {errors.type && <span className="error-text">{errors.type}</span>}
            </div>

            <div className="tpf-form-group">
              <label>MÃ CHỨNG TỪ THAM CHIẾU</label>
              <input
                type="text"
                placeholder="VD: DN-001, PO-005, REF-01..."
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: Giá trị ghi nhận */}
          <div className="tpf-col">
            <div className="tpf-col-header">GIÁ TRỊ GHI NHẬN</div>

            <div className="tpf-form-group">
              <label>SỐ TIỀN CHI *</label>
              <input
                type="number"
                placeholder="500000"
                value={amount}
                className={errors.amount ? 'input-error' : ''}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((prev) => ({ ...prev, amount: null }));
                }}
              />
              {errors.amount && <span className="error-text">{errors.amount}</span>}
            </div>

            <div className="tpf-form-group">
              <label>NGÀY GHI NHẬN *</label>
              <input
                type="datetime-local"
                value={recordDate}
                className={errors.date ? 'input-error' : ''}
                onChange={(e) => {
                  setRecordDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: null }));
                }}
              />
              {errors.date && <span className="error-text">{errors.date}</span>}
            </div>

            <div className="tpf-form-group">
              <label>PHƯƠNG THỨC THANH TOÁN *</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="TIEN_MAT">TIỀN MẶT</option>
                <option value="CHUYEN_KHOAN">CHUYỂN KHOẢN</option>
                <option value="THE">QUẸT THẺ</option>
              </select>
            </div>

            <div className="tpf-form-group">
              <label>TAGS</label>
              <div className="tpf-tags-input-row">
                <input
                  type="text"
                  placeholder="Nhập tag rồi Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
                <button type="button" className="btn-add-tag" onClick={handleAddTagClick}>
                  +
                </button>
              </div>
              {tags.length > 0 && (
                <div className="tpf-tags-list">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="tpf-tag-chip">
                      {tag}
                      <button type="button" onClick={() => removeTag(idx)}>
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="tpf-form-group">
              <label>MÔ TẢ</label>
              <textarea
                rows="3"
                placeholder="Ghi chú thêm về khoản chi này..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bottom Live Summary Bar */}
        <div className="tpf-summary-box">
          <div className="summary-item">
            <span className="summary-lbl">MÃ PHIẾU</span>
            <span className="summary-val bold">{code.trim() || '(tự động)'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-lbl">NGƯỜI NHẬN</span>
            <span className="summary-val">{person.trim() || '-'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-lbl">LOẠI CHI</span>
            <span className="summary-val">{getSelectedTypeName()}</span>
          </div>
          <div className="summary-item">
            <span className="summary-lbl">SỐ TIỀN CHI</span>
            <span className="summary-val red-text bold">{formattedAmount()}</span>
          </div>
        </div>
      </div>

      {/* Bottom Right Submit Action Button */}
      <div className="tpf-bottom-action-bar">
        <button
          type="button"
          className="tpf-btn-bottom-submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'ĐANG TẠO...' : 'TẠO PHIẾU CHI'}
        </button>
      </div>

      {/* Inline Add Type Modal */}
      {showAddTypeModal && (
        <div className="lpt-modal-overlay">
          <div className="lpt-modal">
            <div className="lpt-modal-header">
              <h3>THÊM LOẠI PHIẾU CHI</h3>
            </div>
            <div className="lpt-modal-body">
              <div className="lpt-form-group">
                <label>MÃ LOẠI</label>
                <input
                  type="text"
                  placeholder="Tự động tạo nếu để trống (LPC...)"
                  value={newTypeCode}
                  onChange={(e) => setNewTypeCode(e.target.value)}
                />
              </div>
              <div className="lpt-form-group">
                <label>TÊN LOẠI *</label>
                <input
                  type="text"
                  placeholder="VD: Chi bồi thường, Chi công tác..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
              </div>
            </div>
            <div className="lpt-modal-footer">
              <button
                type="button"
                className="lpt-btn-outline"
                onClick={() => setShowAddTypeModal(false)}
              >
                HỦY
              </button>
              <button type="button" className="lpt-btn-primary" onClick={handleCreateType}>
                THÊM LOẠI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
