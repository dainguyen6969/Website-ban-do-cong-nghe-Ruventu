import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { receiptService } from '../../../../shared/services/receiptService';
import './TaoPhieuForm.css';

export default function TaoPhieuThuForm() {
    const navigate = useNavigate();

    // Form states
    const [group, setGroup] = useState('KHACH_HANG');
    const [person, setPerson] = useState('');
    const [personId, setPersonId] = useState(null);
    const [showPersonDropdown, setShowPersonDropdown] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionTimeout, setSuggestionTimeout] = useState(null);

    const [code, setCode] = useState('');
    
    const [availableTypes, setAvailableTypes] = useState([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');
    
    const [refCode, setRefCode] = useState('');
    const [amount, setAmount] = useState('0');

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

    // Fetch active receipt types for "THU"
    const fetchReceiptTypes = useCallback(async () => {
        try {
            const res = await receiptService.getReceiptTypes({ dung_cho: 'THU_CONG', trang_thai: 1, limit: 100 });
            if (res.data?.data?.items) {
                setAvailableTypes(res.data.data.items);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách loại phiếu thu', error);
        }
    }, []);

    useEffect(() => {
        fetchReceiptTypes();
    }, [fetchReceiptTypes]);

    // Handle fetching suggestions
    const fetchSuggestions = async (keyword, currentGroup) => {
        if (!keyword.trim()) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await receiptService.getPayerSuggestions({ nhom_nguoi_nop_nhan: currentGroup, keyword: keyword.trim() });
            if (res.data?.data?.items) {
                setSuggestions(res.data.data.items);
            }
        } catch (error) {
            console.error('Lỗi lấy gợi ý người nộp', error);
        }
    };

    const handlePersonChange = (e) => {
        const value = e.target.value;
        setPerson(value);
        setPersonId(null);
        setErrors(prev => ({ ...prev, person: null }));
        
        if (suggestionTimeout) clearTimeout(suggestionTimeout);
        if (value.trim()) {
            setShowPersonDropdown(true);
            setSuggestionTimeout(setTimeout(() => fetchSuggestions(value, group), 300));
        } else {
            setShowPersonDropdown(false);
            setSuggestions([]);
        }
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
        
        // Auto-generate a code if the user leaves it blank, as the backend requires ma_loai
        const generatedCode = newTypeCode.trim() || `LPT${Date.now().toString().slice(-6)}`;
        
        try {
            const res = await receiptService.createReceiptType({
                ma_loai: generatedCode,
                ten_loai: newTypeName.trim(),
                ghi_chu: ''
            });
            if (res.data?.data) {
                await fetchReceiptTypes();
                setSelectedTypeId(res.data.data.id.toString());
                setShowAddTypeModal(false);
                setNewTypeName('');
                setNewTypeCode('');
                setErrors(prev => ({ ...prev, type: null }));
            }
        } catch (error) {
            console.error('Lỗi thêm loại phiếu thu', error);
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo loại phiếu thu');
        }
    };

    const handleSubmit = async () => {
        let newErrors = {};

        if (!person.trim()) {
            newErrors.person = 'Vui lòng chọn hoặc nhập tên người nộp';
        }

        if (!selectedTypeId) {
            newErrors.type = 'Vui lòng chọn loại thu';
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            newErrors.amount = 'Vui lòng nhập số tiền hợp lệ (> 0)';
        }

        if (!recordDate) {
            newErrors.date = 'Vui lòng chọn ngày ghi nhận';
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
                tags: tags.length > 0 ? tags.join(',') : undefined
            };

            if (personId) {
                if (group === 'KHACH_HANG' || group === 'NHAN_VIEN') payload.nguoi_nop_nhan_id = personId;
                else if (group === 'NHA_CUNG_CAP') payload.nha_cung_cap_id = personId;
                else if (group === 'DOI_TAC_GIAO_HANG') payload.doi_tac_van_chuyen_id = personId;
            }

            const requestKey = crypto.randomUUID();
            await receiptService.createReceipt(payload, requestKey);
            navigate('/admin/so-quy-tien-mat/phieu-thu', { state: { successMessage: 'TẠO PHIẾU THU THÀNH CÔNG' } });
        } catch (error) {
            console.error('Lỗi khi tạo phiếu thu', error);
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo phiếu thu');
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
        const typeObj = availableTypes.find(t => t.id.toString() === selectedTypeId);
        return typeObj ? typeObj.ten_loai : '-';
    };

    return (
        <div className="tpf-page">
            {/* Top Page Header Bar */}
            <div className="tpf-top-bar">
                <div className="tpf-breadcrumb-top">
                    ADMIN &nbsp;&rsaquo;&nbsp; PHIẾU THU &nbsp;&rsaquo;&nbsp; TẠO PHIẾU THU
                </div>
                <button type="button" className="tpf-btn-top-create" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'ĐANG TẠO...' : 'TẠO PHIẾU THU'}
                </button>
            </div>

            {/* Sub Header Section */}
            <div className="tpf-header">
                <div className="tpf-header-sub-row">
                    <div className="tpf-badge-box">
                        PHIẾU THU
                    </div>
                    <div className="tpf-breadcrumb-sub">
                        SỔ QUỸ TIỀN MẶT / PHIẾU THU / TẠO PHIẾU THU
                    </div>
                </div>
                <div className="tpf-header-main-row">
                    <h1>TẠO PHIẾU THU</h1>
                </div>
            </div>

            {/* Main Form Box */}
            <div className="tpf-form-card">
                <div className="tpf-form-grid">
                    {/* Left Column: Thông tin người nộp */}
                    <div className="tpf-col">
                        <div className="tpf-col-header">
                            THÔNG TIN NGƯỜI NỘP
                        </div>

                        <div className="tpf-form-group">
                            <label>NHÓM NGƯỜI NỘP *</label>
                            <select value={group} onChange={e => { setGroup(e.target.value); setPerson(''); setPersonId(null); setSuggestions([]); }}>
                                <option value="KHACH_HANG">KHÁCH HÀNG</option>
                                <option value="NHAN_VIEN">NHÂN VIÊN</option>
                                <option value="NHA_CUNG_CAP">NHÀ CUNG CẤP</option>
                                <option value="DOI_TAC_GIAO_HANG">ĐỐI TÁC GIAO HÀNG</option>
                                <option value="KHAC">KHÁC</option>
                            </select>
                        </div>

                        <div className="tpf-form-group">
                            <label>TÊN NGƯỜI NỘP *</label>
                            <div className={`tpf-input-search-wrapper ${showPersonDropdown ? 'is-focused' : ''}`}>
                                <input
                                    type="text"
                                    placeholder="Nhập tên người nộp..."
                                    value={person}
                                    className={errors.person ? 'input-error' : ''}
                                    onFocus={() => { if(person.trim()) setShowPersonDropdown(true); }}
                                    onBlur={() => setTimeout(() => setShowPersonDropdown(false), 200)}
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
                                                <div className="dropdown-phone">{item.thong_tin_bo_sung || ''}</div>
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
                                placeholder="Để trống để tự động tạo"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                            />
                        </div>

                        <div className="tpf-form-group">
                            <label>LOẠI THU *</label>
                            <div className="tpf-select-add-group">
                                <select
                                    value={selectedTypeId}
                                    onChange={e => { setSelectedTypeId(e.target.value); setErrors(prev => ({ ...prev, type: null })); }}
                                    className={errors.type ? 'input-error' : ''}
                                >
                                    <option value="">— CHỌN LOẠI THU —</option>
                                    {availableTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.ten_loai}</option>
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
                                placeholder="VD: ORD-001, DN-005..."
                                value={refCode}
                                onChange={e => setRefCode(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Right Column: Giá trị ghi nhận */}
                    <div className="tpf-col">
                        <div className="tpf-col-header">
                            GIÁ TRỊ GHI NHẬN
                        </div>

                        <div className="tpf-form-group">
                            <label>SỐ TIỀN *</label>
                            <input
                                type="number"
                                placeholder="500000"
                                value={amount}
                                className={errors.amount ? 'input-error' : ''}
                                onChange={e => { setAmount(e.target.value); setErrors(prev => ({ ...prev, amount: null })); }}
                            />
                            {errors.amount && <span className="error-text">{errors.amount}</span>}
                        </div>

                        <div className="tpf-form-group">
                            <label>NGÀY GHI NHẬN *</label>
                            <input
                                type="datetime-local"
                                value={recordDate}
                                className={errors.date ? 'input-error' : ''}
                                onChange={e => { setRecordDate(e.target.value); setErrors(prev => ({ ...prev, date: null })); }}
                            />
                            {errors.date && <span className="error-text">{errors.date}</span>}
                        </div>

                        <div className="tpf-form-group">
                            <label>PHƯƠNG THỨC THANH TOÁN *</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
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
                                    onChange={e => setTagInput(e.target.value)}
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
                                            <button type="button" onClick={() => removeTag(idx)}>&times;</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="tpf-form-group">
                            <label>MÔ TẢ</label>
                            <textarea
                                rows="3"
                                placeholder="Ghi chú thêm về khoản thu này..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
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
                        <span className="summary-lbl">NGƯỜI NỘP</span>
                        <span className="summary-val">{person.trim() || '-'}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-lbl">LOẠI THU</span>
                        <span className="summary-val">{getSelectedTypeName()}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-lbl">SỐ TIỀN</span>
                        <span className="summary-val red-text bold">{formattedAmount()}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Right Submit Action Button */}
            <div className="tpf-bottom-action-bar">
                <button type="button" className="tpf-btn-bottom-submit" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'ĐANG TẠO...' : 'TẠO PHIẾU THU'}
                </button>
            </div>

            {/* Inline Add Type Modal */}
            {showAddTypeModal && (
                <div className="lpt-modal-overlay">
                    <div className="lpt-modal">
                        <div className="lpt-modal-header">
                            <h3>THÊM LOẠI PHIẾU THU</h3>
                        </div>
                        <div className="lpt-modal-body">
                            <div className="lpt-form-group">
                                <label>MÃ LOẠI</label>
                                <input
                                    type="text"
                                    placeholder="Tự động tạo nếu để trống"
                                    value={newTypeCode}
                                    onChange={e => setNewTypeCode(e.target.value)}
                                />
                            </div>
                            <div className="lpt-form-group">
                                <label>TÊN LOẠI *</label>
                                <input
                                    type="text"
                                    placeholder="VD: Thu hoàn trả"
                                    value={newTypeName}
                                    onChange={e => setNewTypeName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="lpt-modal-footer">
                            <button type="button" className="lpt-btn-outline" onClick={() => setShowAddTypeModal(false)}>HỦY</button>
                            <button type="button" className="lpt-btn-primary" onClick={handleCreateType}>THÊM LOẠI</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
