import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { receiptService } from '../../../../shared/services/receiptService';
import { disbursementService } from '../../../../shared/services/disbursementService';
import { useCashbook } from '../context/CashbookContext';
import './TaoPhieuThuChi.css';

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

export default function TaoPhieuThuChi({ initialTab = 'thu' }) {
  const navigate = useNavigate();
  const { addCashbookItem } = useCashbook() || {};
  const [activeTab, setActiveTab] = useState(initialTab); // 'thu' | 'chi'

  const todayStr = new Date().toISOString().split('T')[0];
  const dateFormatted = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Form state for Thu
  const [groupThu, setGroupThu] = useState('KHACH_HANG');
  const [personThu, setPersonThu] = useState('');
  const [personThuId, setPersonThuId] = useState(null);
  const [showDropdownThu, setShowDropdownThu] = useState(false);
  const [suggestionsThu, setSuggestionsThu] = useState([]);
  const [codeThu, setCodeThu] = useState(
    `PT-${dateFormatted}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [typesThu, setTypesThu] = useState([]);
  const [selectedTypeThuId, setSelectedTypeThuId] = useState('');
  const [showAddTypeThu, setShowAddTypeThu] = useState(false);
  const [newTypeThuText, setNewTypeThuText] = useState('');

  // Form state for Chi
  const [groupChi, setGroupChi] = useState('KHACH_HANG');
  const [personChi, setPersonChi] = useState('');
  const [personChiId, setPersonChiId] = useState(null);
  const [showDropdownChi, setShowDropdownChi] = useState(false);
  const [suggestionsChi, setSuggestionsChi] = useState([]);
  const [codeChi, setCodeChi] = useState(
    `PC-${dateFormatted}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [typesChi, setTypesChi] = useState([]);
  const [selectedTypeChiId, setSelectedTypeChiId] = useState('');
  const [showAddTypeChi, setShowAddTypeChi] = useState(false);
  const [newTypeChiText, setNewTypeChiText] = useState('');

  // Shared values
  const [amount, setAmount] = useState('0');
  const [recordDate, setRecordDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({});

  // Load available types from backend
  useEffect(() => {
    receiptService
      .getReceiptTypes({ dung_cho: 'THU_CONG', trang_thai: 1, limit: 100 })
      .then((res) => {
        if (res.data?.data?.items?.length) {
          setTypesThu(res.data.data.items);
          setSelectedTypeThuId(String(res.data.data.items[0].id));
        }
      })
      .catch((err) => console.error('Lỗi tải loại phiếu thu:', err));

    disbursementService
      .getDisbursementTypes({ dung_cho: 'THU_CONG', trang_thai: 1, limit: 100 })
      .then((res) => {
        if (res.data?.data?.items?.length) {
          setTypesChi(res.data.data.items);
          setSelectedTypeChiId(String(res.data.data.items[0].id));
        }
      })
      .catch((err) => console.error('Lỗi tải loại phiếu chi:', err));
  }, []);

  // Fetch payer suggestions for Thu
  const fetchSuggestionsThu = useCallback(
    async (keyword = '', group = groupThu) => {
      try {
        const params = { nhom_nguoi_nop_nhan: group };
        if (keyword.trim()) params.keyword = keyword.trim();
        const res = await receiptService.getPayerSuggestions(params);
        if (res.data?.data?.items?.length > 0) {
          setSuggestionsThu(res.data.data.items);
          return;
        }
      } catch (e) {
        console.error(e);
      }
      const fallback = fallbackPersonData[group] || [];
      setSuggestionsThu(
        keyword.trim()
          ? fallback.filter((p) =>
              p.ten_nguoi_nop_nhan.toLowerCase().includes(keyword.toLowerCase().trim())
            )
          : fallback
      );
    },
    [groupThu]
  );

  // Fetch payee suggestions for Chi
  const fetchSuggestionsChi = useCallback(
    async (keyword = '', group = groupChi) => {
      try {
        const params = { nhom_nguoi_nop_nhan: group };
        if (keyword.trim()) params.keyword = keyword.trim();
        const res = await disbursementService.getPayeeSuggestions(params);
        if (res.data?.data?.items?.length > 0) {
          setSuggestionsChi(res.data.data.items);
          return;
        }
      } catch (e) {
        console.error(e);
      }
      const fallback = fallbackPersonData[group] || [];
      setSuggestionsChi(
        keyword.trim()
          ? fallback.filter((p) =>
              p.ten_nguoi_nop_nhan.toLowerCase().includes(keyword.toLowerCase().trim())
            )
          : fallback
      );
    },
    [groupChi]
  );

  useEffect(() => {
    fetchSuggestionsThu('', groupThu);
  }, [groupThu, fetchSuggestionsThu]);

  useEffect(() => {
    fetchSuggestionsChi('', groupChi);
  }, [groupChi, fetchSuggestionsChi]);

  const handleAddTypeThu = async () => {
    if (!newTypeThuText.trim()) return;
    const name = newTypeThuText.trim();
    const code = `LT-${Date.now().toString().slice(-4)}`;
    try {
      const res = await receiptService.createReceiptType({
        ma_loai: code,
        ten_loai: name,
        dung_cho: 'THU_CONG',
        trang_thai: 1,
      });
      const created = res.data?.data;
      if (created) {
        setTypesThu((prev) => [...prev, created]);
        setSelectedTypeThuId(String(created.id));
      }
      setNewTypeThuText('');
      setShowAddTypeThu(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tạo loại phiếu thu');
    }
  };

  const handleAddTypeChi = async () => {
    if (!newTypeChiText.trim()) return;
    const name = newTypeChiText.trim();
    const code = `LC-${Date.now().toString().slice(-4)}`;
    try {
      const res = await disbursementService.createDisbursementType({
        ma_loai: code,
        ten_loai: name,
        dung_cho: 'THU_CONG',
        trang_thai: 1,
      });
      const created = res.data?.data;
      if (created) {
        setTypesChi((prev) => [...prev, created]);
        setSelectedTypeChiId(String(created.id));
      }
      setNewTypeChiText('');
      setShowAddTypeChi(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tạo loại phiếu chi');
    }
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

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRegenerateCode = () => {
    const rand = Math.floor(100 + Math.random() * 900);
    if (activeTab === 'thu') {
      setCodeThu(`PT-${dateFormatted}-${rand}`);
    } else {
      setCodeChi(`PC-${dateFormatted}-${rand}`);
    }
  };

  const handleSubmit = async () => {
    const currentPerson = activeTab === 'thu' ? personThu : personChi;
    const currentTypeId = activeTab === 'thu' ? selectedTypeThuId : selectedTypeChiId;
    let newErrors = {};

    if (!currentPerson.trim()) {
      newErrors.person =
        activeTab === 'thu' ? 'Vui lòng nhập tên người nộp' : 'Vui lòng nhập tên người nhận';
    }
    if (!currentTypeId) {
      newErrors.type = activeTab === 'thu' ? 'Vui lòng chọn loại thu' : 'Vui lòng chọn loại chi';
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Vui lòng nhập số tiền lớn hơn 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const currentCode = activeTab === 'thu' ? codeThu : codeChi;
      const currentGroup = activeTab === 'thu' ? groupThu : groupChi;
      const currentPersonId = activeTab === 'thu' ? personThuId : personChiId;

      const payload = {
        nhom_nguoi_nop_nhan: currentGroup,
        ten_nguoi_nop_nhan: currentPerson.trim(),
        ma_phieu: currentCode.trim() || undefined,
        loai_thu_chi_id: parseInt(currentTypeId),
        so_tien: numAmount,
        phuong_thuc_thanh_toan: paymentMethod,
        ngay_ghi_nhan: new Date(recordDate).toISOString(),
        mo_ta: description.trim() || undefined,
        tags: tags.length > 0 ? tags.join(',') : undefined,
      };

      if (currentPersonId) {
        if (currentGroup === 'KHACH_HANG' || currentGroup === 'NHAN_VIEN') {
          payload.nguoi_nop_nhan_id = currentPersonId;
        } else if (currentGroup === 'NHA_CUNG_CAP') {
          payload.nha_cung_cap_id = currentPersonId;
        } else if (currentGroup === 'DOI_TAC_GIAO_HANG') {
          payload.doi_tac_van_chuyen_id = currentPersonId;
        }
      }

      const requestKey = crypto.randomUUID();

      if (activeTab === 'thu') {
        await receiptService.createReceipt(payload, requestKey);
      } else {
        await disbursementService.createDisbursement(payload, requestKey);
      }

      // Đồng bộ thêm vào state cục bộ nếu có
      if (addCashbookItem) {
        addCashbookItem({
          id: Date.now(),
          type: activeTab === 'thu' ? 'PHIẾU THU' : 'PHIẾU CHI',
          date: recordDate,
          code: currentCode,
          person: currentPerson,
          method: paymentMethod,
          amountIn: activeTab === 'thu' ? numAmount : 0,
          amountOut: activeTab === 'chi' ? numAmount : 0,
          desc: description || '-',
          staff: 'Administrator',
        });
      }

      navigate('/admin/so-quy-tien-mat/so-quy');
    } catch (error) {
      console.error('Lỗi khi tạo phiếu thu/chi:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo phiếu thu/chi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCode = activeTab === 'thu' ? codeThu : codeChi;
  const currentSelectedTypeObj = (activeTab === 'thu' ? typesThu : typesChi).find(
    (t) => String(t.id) === String(activeTab === 'thu' ? selectedTypeThuId : selectedTypeChiId)
  );
  const currentType = currentSelectedTypeObj ? currentSelectedTypeObj.ten_loai : '-';
  const currentPerson = activeTab === 'thu' ? personThu : personChi;

  const formattedAmount = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return '-';
    return num.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="tpc-page">
      {/* Header / Breadcrumb */}
      <div className="tpc-header">
        <div className="tpc-breadcrumb">
          ADMIN <span>&rsaquo;</span> SỔ QUỸ <span>&rsaquo;</span> TẠO PHIẾU THU / CHI
        </div>
        <div className="tpc-title-bar">
          <button className="tpc-btn-back" onClick={() => navigate(-1)}>
            &larr; QUAY LẠI
          </button>
          <div className="tpc-title">
            <span className="tpc-title-accent">|</span> TẠO PHIẾU THU / CHI
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tpc-tabs-container">
        <button
          className={`tpc-tab-btn tab-thu ${activeTab === 'thu' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('thu');
            setErrors({});
          }}
        >
          &#9650; PHIẾU THU
        </button>
        <button
          className={`tpc-tab-btn tab-chi ${activeTab === 'chi' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('chi');
            setErrors({});
          }}
        >
          &#9660; PHIẾU CHI
        </button>
      </div>

      {/* Form Main Box */}
      <div className="tpc-form-card">
        <div className="tpc-form-grid">
          {/* Left Column: Thông tin chung */}
          <div className="tpc-col">
            <div className="tpc-section-title">
              <span className="tpc-accent">|</span> THÔNG TIN CHUNG
            </div>

            {activeTab === 'thu' ? (
              <>
                <div className="tpc-form-group">
                  <label>NHÓM NGƯỜI NỘP</label>
                  <select
                    value={groupThu}
                    onChange={(e) => {
                      setGroupThu(e.target.value);
                      setPersonThu('');
                      setPersonThuId(null);
                    }}
                  >
                    <option value="KHACH_HANG">Khách hàng</option>
                    <option value="NHAN_VIEN">Nhân viên</option>
                    <option value="DOI_TAC_GIAO_HANG">Đối tác giao hàng</option>
                  </select>
                </div>

                <div className="tpc-form-group">
                  <label>TÊN NGƯỜI NỘP *</label>
                  <div
                    className={`tpc-input-search-wrapper ${showDropdownThu ? 'is-focused' : ''}`}
                  >
                    <input
                      type="text"
                      placeholder="Tìm khách hàng / nhân viên / đối tác..."
                      value={personThu}
                      className={errors.person ? 'input-error' : ''}
                      onFocus={() => setShowDropdownThu(true)}
                      onBlur={() => setTimeout(() => setShowDropdownThu(false), 200)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPersonThu(val);
                        setPersonThuId(null);
                        setShowDropdownThu(true);
                        fetchSuggestionsThu(val, groupThu);
                        setErrors((prev) => ({ ...prev, person: null }));
                      }}
                    />
                    <svg
                      className="tpc-search-icon-right"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    {showDropdownThu && suggestionsThu.length > 0 && (
                      <div className="tpc-search-dropdown">
                        {suggestionsThu.map((item, idx) => {
                          const displayName = item.ten_nguoi_nop_nhan || item.ten || '';
                          const phone = item.so_dien_thoai ? ` (${item.so_dien_thoai})` : '';
                          return (
                            <div
                              key={item.id || idx}
                              className="tpc-search-dropdown-item"
                              onMouseDown={() => {
                                setPersonThu(displayName);
                                setPersonThuId(
                                  item.nguoi_nop_nhan_id ||
                                    item.doi_tac_van_chuyen_id ||
                                    item.id ||
                                    null
                                );
                                setShowDropdownThu(false);
                                setErrors((prev) => ({ ...prev, person: null }));
                              }}
                            >
                              <span>{displayName}</span>
                              {phone && <span className="tpc-sub-phone">{phone}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {errors.person && <span className="error-text">{errors.person}</span>}
                </div>

                <div className="tpc-form-group">
                  <label>MÃ PHIẾU (TỰ ĐỘNG)</label>
                  <div className="tpc-code-input-group">
                    <input type="text" readOnly value={codeThu} className="input-code-thu" />
                    <button type="button" className="btn-auto-code" onClick={handleRegenerateCode}>
                      TỰ ĐỘNG
                    </button>
                  </div>
                </div>

                <div className="tpc-form-group">
                  <label>LOẠI PHIẾU THU</label>
                  <div className="tpc-select-add-wrapper">
                    <select
                      value={selectedTypeThuId}
                      onChange={(e) => {
                        setSelectedTypeThuId(e.target.value);
                        setErrors((prev) => ({ ...prev, type: null }));
                      }}
                      className={errors.type ? 'input-error' : ''}
                    >
                      {typesThu.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.ten_loai}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-add-type-icon"
                      onClick={() => setShowAddTypeThu(!showAddTypeThu)}
                      title="Thêm loại phiếu thu mới"
                    >
                      +
                    </button>
                  </div>
                  {errors.type && <span className="error-text">{errors.type}</span>}
                  {showAddTypeThu && (
                    <div className="tpc-inline-add-row">
                      <input
                        type="text"
                        placeholder="Tên loại phiếu mới..."
                        value={newTypeThuText}
                        onChange={(e) => setNewTypeThuText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTypeThu()}
                      />
                      <button type="button" className="btn-inline-add" onClick={handleAddTypeThu}>
                        THÊM
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="tpc-form-group">
                  <label>NHÓM NGƯỜI NHẬN</label>
                  <select
                    value={groupChi}
                    onChange={(e) => {
                      setGroupChi(e.target.value);
                      setPersonChi('');
                      setPersonChiId(null);
                    }}
                  >
                    <option value="KHACH_HANG">Khách hàng</option>
                    <option value="NHAN_VIEN">Nhân viên</option>
                    <option value="NHA_CUNG_CAP">Nhà cung cấp</option>
                    <option value="DOI_TAC_GIAO_HANG">Đối tác giao hàng</option>
                  </select>
                </div>

                <div className="tpc-form-group">
                  <label>TÊN NGƯỜI NHẬN *</label>
                  <div
                    className={`tpc-input-search-wrapper ${showDropdownChi ? 'is-focused' : ''}`}
                  >
                    <input
                      type="text"
                      placeholder="Tìm khách hàng / nhân viên / nhà cung cấp..."
                      value={personChi}
                      className={errors.person ? 'input-error' : ''}
                      onFocus={() => setShowDropdownChi(true)}
                      onBlur={() => setTimeout(() => setShowDropdownChi(false), 200)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPersonChi(val);
                        setPersonChiId(null);
                        setShowDropdownChi(true);
                        fetchSuggestionsChi(val, groupChi);
                        setErrors((prev) => ({ ...prev, person: null }));
                      }}
                    />
                    <svg
                      className="tpc-search-icon-right"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    {showDropdownChi && suggestionsChi.length > 0 && (
                      <div className="tpc-search-dropdown">
                        {suggestionsChi.map((item, idx) => {
                          const displayName = item.ten_nguoi_nop_nhan || item.ten || '';
                          const phone = item.so_dien_thoai ? ` (${item.so_dien_thoai})` : '';
                          return (
                            <div
                              key={item.id || idx}
                              className="tpc-search-dropdown-item"
                              onMouseDown={() => {
                                setPersonChi(displayName);
                                setPersonChiId(
                                  item.nguoi_nop_nhan_id ||
                                    item.nha_cung_cap_id ||
                                    item.doi_tac_van_chuyen_id ||
                                    item.id ||
                                    null
                                );
                                setShowDropdownChi(false);
                                setErrors((prev) => ({ ...prev, person: null }));
                              }}
                            >
                              <span>{displayName}</span>
                              {phone && <span className="tpc-sub-phone">{phone}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {errors.person && <span className="error-text">{errors.person}</span>}
                </div>

                <div className="tpc-form-group">
                  <label>MÃ PHIẾU (TỰ ĐỘNG)</label>
                  <div className="tpc-code-input-group">
                    <input type="text" readOnly value={codeChi} className="input-code-chi" />
                    <button type="button" className="btn-auto-code" onClick={handleRegenerateCode}>
                      TỰ ĐỘNG
                    </button>
                  </div>
                </div>

                <div className="tpc-form-group">
                  <label>LOẠI PHIẾU CHI</label>
                  <div className="tpc-select-add-wrapper">
                    <select
                      value={selectedTypeChiId}
                      onChange={(e) => {
                        setSelectedTypeChiId(e.target.value);
                        setErrors((prev) => ({ ...prev, type: null }));
                      }}
                      className={errors.type ? 'input-error' : ''}
                    >
                      {typesChi.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.ten_loai}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-add-type-icon"
                      onClick={() => setShowAddTypeChi(!showAddTypeChi)}
                      title="Thêm loại phiếu chi mới"
                    >
                      +
                    </button>
                  </div>
                  {errors.type && <span className="error-text">{errors.type}</span>}
                  {showAddTypeChi && (
                    <div className="tpc-inline-add-row">
                      <input
                        type="text"
                        placeholder="Tên loại phiếu mới..."
                        value={newTypeChiText}
                        onChange={(e) => setNewTypeChiText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTypeChi()}
                      />
                      <button type="button" className="btn-inline-add" onClick={handleAddTypeChi}>
                        THÊM
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Giá trị ghi nhận */}
          <div className="tpc-col">
            <div className="tpc-section-title">
              <span className="tpc-accent">|</span> GIÁ TRỊ GHI NHẬN
            </div>

            <div className="tpc-form-group">
              <label>SỐ TIỀN (GIÁ TRỊ) *</label>
              <div className="tpc-amount-wrapper">
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  className={`tpc-amount-input ${errors.amount ? 'input-error' : ''}`}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrors((prev) => ({ ...prev, amount: null }));
                  }}
                />
                <span className="currency-unit">đ</span>
              </div>
              {errors.amount && <span className="error-text">{errors.amount}</span>}
            </div>

            <div className="tpc-form-group">
              <label>NGÀY GHI NHẬN *</label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>

            <div className="tpc-form-group">
              <label>PHƯƠNG THỨC THANH TOÁN</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="TIEN_MAT">Tiền mặt</option>
                <option value="CHUYEN_KHOAN">Chuyển khoản</option>
              </select>
            </div>

            <div className="tpc-form-group">
              <label>TAGS</label>
              <div className="tpc-tags-wrapper">
                {tags.map((tag, idx) => (
                  <span key={idx} className="tpc-tag-pill">
                    {tag}
                    <button type="button" onClick={() => removeTag(idx)}>
                      &times;
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Nhập tag, Enter để thêm..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
              </div>
              <span className="tpc-subtext">Nhấn Enter hoặc dấu phẩy để thêm tag.</span>
            </div>

            <div className="tpc-form-group">
              <label>MÔ TẢ</label>
              <textarea
                rows="3"
                placeholder="Ghi chú thêm về khoản thu/chi này..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bottom Live Summary Bar */}
        <div className="tpc-summary-bar">
          <div className="tpc-summary-col col-accent">
            <span className="bar-accent">|</span>
          </div>
          <div className="tpc-summary-col">
            <span className="summary-label">MÃ PHIẾU</span>
            <span className={`summary-value bold ${activeTab === 'thu' ? 'text-red' : ''}`}>
              {currentCode}
            </span>
          </div>
          <div className="tpc-summary-col">
            <span className="summary-label">LOẠI</span>
            <span className="summary-value bold">{currentType}</span>
          </div>
          <div className="tpc-summary-col">
            <span className="summary-label">ĐỐI TƯỢNG</span>
            <span className="summary-value">{currentPerson || '-'}</span>
          </div>
          <div className="tpc-summary-col">
            <span className="summary-label">SỐ TIỀN</span>
            <span className="summary-value">{formattedAmount()}</span>
          </div>
          <div className="tpc-summary-col">
            <span className="summary-label">NGÀY</span>
            <span className="summary-value">{recordDate}</span>
          </div>
          <div className="tpc-summary-col">
            <span className="summary-label">THANH TOÁN</span>
            <span className="summary-value">
              {paymentMethod === 'TIEN_MAT' ? 'Tiền mặt' : 'Chuyển khoản'}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="tpc-action-footer">
        <div className="tpc-footer-note">
          Phiếu sẽ được ghi nhận vào sổ quỹ ngay sau khi tạo. Không thể hoàn tác.
        </div>
        <div className="tpc-footer-buttons">
          <button type="button" className="tpc-btn-cancel" onClick={() => navigate(-1)}>
            HỦY
          </button>
          {activeTab === 'thu' ? (
            <button type="button" className="tpc-btn-submit btn-thu" onClick={handleSubmit}>
              TẠO PHIẾU THU
            </button>
          ) : (
            <button type="button" className="tpc-btn-submit btn-chi" onClick={handleSubmit}>
              TẠO PHIẾU CHI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
