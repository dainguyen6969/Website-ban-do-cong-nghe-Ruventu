import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './TaoPhieuThuChi.css';

const customerList = [
    'Nguyễn Văn An',
    'Trần Thị Bích',
    'Lê Minh Tuấn',
    'Phạm Quốc Hùng',
    'Hoàng Thanh Nga',
    'Bùi Văn Nam',
    'Vũ Đức Long',
    'Nguyễn Thị Lan',
    'Hoàng Minh Khoa',
    'Vũ Thị Ngọc'
];

const staffList = [
    'Trần Thị B',
    'Nguyễn Văn A',
    'Lê Thị C',
    'Phạm Văn D'
];

const partnerList = [
    'NCC Corsair VN',
    'Công ty ABC Tech',
    'Điện lực TP.HCM',
    'Nhà vận chuyển GHN'
];

export default function TaoPhieuThuChi({ initialTab = 'thu' }) {
    const navigate = useNavigate();
    const { addCashbookItem } = useCashbook() || {};
    const [activeTab, setActiveTab] = useState(initialTab); // 'thu' | 'chi'

    const todayStr = new Date().toISOString().split('T')[0];
    const dateFormatted = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Form state for Thu
    const [groupThu, setGroupThu] = useState('Khách hàng');
    const [personThu, setPersonThu] = useState('');
    const [showDropdownThu, setShowDropdownThu] = useState(false);
    const [codeThu, setCodeThu] = useState(`PT-${dateFormatted}-905`);
    const [typeThuOptions, setTypeThuOptions] = useState([
        'Doanh thu bán hàng',
        'Thu nợ khách hàng',
        'Thu đặt cọc',
        'Thu khác'
    ]);
    const [typeThu, setTypeThu] = useState('Doanh thu bán hàng');
    const [showAddTypeThu, setShowAddTypeThu] = useState(false);
    const [newTypeThuText, setNewTypeThuText] = useState('');

    // Form state for Chi
    const [groupChi, setGroupChi] = useState('Khách hàng');
    const [personChi, setPersonChi] = useState('');
    const [showDropdownChi, setShowDropdownChi] = useState(false);
    const [codeChi, setCodeChi] = useState(`PC-${dateFormatted}-699`);
    const [typeChiOptions, setTypeChiOptions] = useState([
        'Chi trả nhà cung cấp',
        'Chi phí vận hành',
        'Chi trả lương nhân viên',
        'Chi khác'
    ]);
    const [typeChi, setTypeChi] = useState('Chi trả nhà cung cấp');
    const [showAddTypeChi, setShowAddTypeChi] = useState(false);
    const [newTypeChiText, setNewTypeChiText] = useState('');

    // Shared values
    const [amount, setAmount] = useState('0');
    const [recordDate, setRecordDate] = useState(todayStr);
    const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [description, setDescription] = useState('');

    const [errors, setErrors] = useState({});

    const getPersonOptions = (group) => {
        if (group === 'Nhân viên') return staffList;
        if (group === 'Đối tác' || group === 'Nhà cung cấp') return partnerList;
        return customerList;
    };

    const handleAddTypeThu = () => {
        if (newTypeThuText.trim()) {
            const trimmed = newTypeThuText.trim();
            if (!typeThuOptions.includes(trimmed)) {
                setTypeThuOptions([...typeThuOptions, trimmed]);
            }
            setTypeThu(trimmed);
            setNewTypeThuText('');
            setShowAddTypeThu(false);
        }
    };

    const handleAddTypeChi = () => {
        if (newTypeChiText.trim()) {
            const trimmed = newTypeChiText.trim();
            if (!typeChiOptions.includes(trimmed)) {
                setTypeChiOptions([...typeChiOptions, trimmed]);
            }
            setTypeChi(trimmed);
            setNewTypeChiText('');
            setShowAddTypeChi(false);
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

    const handleSubmit = () => {
        const currentPerson = activeTab === 'thu' ? personThu : personChi;
        let newErrors = {};

        if (!currentPerson.trim()) {
            newErrors.person = activeTab === 'thu' ? 'Vui lòng nhập tên người nộp' : 'Vui lòng nhập tên người nhận';
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            newErrors.amount = 'Vui lòng nhập số tiền lớn hơn 0';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const currentCode = activeTab === 'thu' ? codeThu : codeChi;

        const newItem = {
            id: Date.now(),
            type: activeTab === 'thu' ? 'PHIẾU THU' : 'PHIẾU CHI',
            date: recordDate,
            code: currentCode,
            person: currentPerson,
            method: paymentMethod.toUpperCase(),
            amountIn: activeTab === 'thu' ? numAmount : 0,
            amountOut: activeTab === 'chi' ? numAmount : 0,
            desc: description || '-',
            staff: 'Admin Tổng'
        };

        if (addCashbookItem) {
            addCashbookItem(newItem);
        }

        navigate('/admin/so-quy-tien-mat/so-quy');
    };

    const currentCode = activeTab === 'thu' ? codeThu : codeChi;
    const currentType = activeTab === 'thu' ? typeThu : typeChi;
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
                    onClick={() => { setActiveTab('thu'); setErrors({}); }}
                >
                    &#9650; PHIẾU THU
                </button>
                <button
                    className={`tpc-tab-btn tab-chi ${activeTab === 'chi' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('chi'); setErrors({}); }}
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
                                    <select value={groupThu} onChange={e => setGroupThu(e.target.value)}>
                                        <option value="Khách hàng">Khách hàng</option>
                                        <option value="Nhân viên">Nhân viên</option>
                                        <option value="Đối tác">Đối tác</option>
                                    </select>
                                </div>

                                <div className="tpc-form-group">
                                    <label>TÊN NGƯỜI NỘP *</label>
                                    <div className={`tpc-input-search-wrapper ${showDropdownThu ? 'is-focused' : ''}`}>
                                        <input
                                            type="text"
                                            placeholder="Tìm khách hàng..."
                                            value={personThu}
                                            className={errors.person ? 'input-error' : ''}
                                            onFocus={() => setShowDropdownThu(true)}
                                            onBlur={() => setTimeout(() => setShowDropdownThu(false), 200)}
                                            onChange={e => {
                                                setPersonThu(e.target.value);
                                                setShowDropdownThu(true);
                                                setErrors(prev => ({ ...prev, person: null }));
                                            }}
                                        />
                                        <svg className="tpc-search-icon-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        {showDropdownThu && (
                                            <div className="tpc-search-dropdown">
                                                {getPersonOptions(groupThu)
                                                    .filter(p => p.toLowerCase().includes(personThu.toLowerCase().trim()))
                                                    .map((name, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="tpc-search-dropdown-item"
                                                            onMouseDown={() => {
                                                                setPersonThu(name);
                                                                setShowDropdownThu(false);
                                                                setErrors(prev => ({ ...prev, person: null }));
                                                            }}
                                                        >
                                                            {name}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    {errors.person && <span className="error-text">{errors.person}</span>}
                                </div>

                                <div className="tpc-form-group">
                                    <label>MÃ PHIẾU (TỰ ĐỘNG)</label>
                                    <div className="tpc-code-input-group">
                                        <input
                                            type="text"
                                            readOnly
                                            value={codeThu}
                                            className="input-code-thu"
                                        />
                                        <button type="button" className="btn-auto-code" onClick={handleRegenerateCode}>TỰ ĐỘNG</button>
                                    </div>
                                </div>

                                <div className="tpc-form-group">
                                    <label>LOẠI PHIẾU THU</label>
                                    <div className="tpc-select-add-wrapper">
                                        <select value={typeThu} onChange={e => setTypeThu(e.target.value)}>
                                            {typeThuOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
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
                                    {showAddTypeThu && (
                                        <div className="tpc-inline-add-row">
                                            <input
                                                type="text"
                                                placeholder="Tên loại phiếu mới..."
                                                value={newTypeThuText}
                                                onChange={e => setNewTypeThuText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddTypeThu()}
                                            />
                                            <button type="button" className="btn-inline-add" onClick={handleAddTypeThu}>THÊM</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="tpc-form-group">
                                    <label>NHÓM NGƯỜI NHẬN</label>
                                    <select value={groupChi} onChange={e => setGroupChi(e.target.value)}>
                                        <option value="Khách hàng">Khách hàng</option>
                                        <option value="Nhân viên">Nhân viên</option>
                                        <option value="Nhà cung cấp">Nhà cung cấp</option>
                                        <option value="Đối tác">Đối tác</option>
                                    </select>
                                </div>

                                <div className="tpc-form-group">
                                    <label>TÊN NGƯỜI NHẬN *</label>
                                    <div className={`tpc-input-search-wrapper ${showDropdownChi ? 'is-focused' : ''}`}>
                                        <input
                                            type="text"
                                            placeholder="Tìm khách hàng..."
                                            value={personChi}
                                            className={errors.person ? 'input-error' : ''}
                                            onFocus={() => setShowDropdownChi(true)}
                                            onBlur={() => setTimeout(() => setShowDropdownChi(false), 200)}
                                            onChange={e => {
                                                setPersonChi(e.target.value);
                                                setShowDropdownChi(true);
                                                setErrors(prev => ({ ...prev, person: null }));
                                            }}
                                        />
                                        <svg className="tpc-search-icon-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        {showDropdownChi && (
                                            <div className="tpc-search-dropdown">
                                                {getPersonOptions(groupChi)
                                                    .filter(p => p.toLowerCase().includes(personChi.toLowerCase().trim()))
                                                    .map((name, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="tpc-search-dropdown-item"
                                                            onMouseDown={() => {
                                                                setPersonChi(name);
                                                                setShowDropdownChi(false);
                                                                setErrors(prev => ({ ...prev, person: null }));
                                                            }}
                                                        >
                                                            {name}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    {errors.person && <span className="error-text">{errors.person}</span>}
                                </div>

                                <div className="tpc-form-group">
                                    <label>MÃ PHIẾU (TỰ ĐỘNG)</label>
                                    <div className="tpc-code-input-group">
                                        <input
                                            type="text"
                                            readOnly
                                            value={codeChi}
                                            className="input-code-chi"
                                        />
                                        <button type="button" className="btn-auto-code" onClick={handleRegenerateCode}>TỰ ĐỘNG</button>
                                    </div>
                                </div>

                                <div className="tpc-form-group">
                                    <label>LOẠI PHIẾU CHI</label>
                                    <div className="tpc-select-add-wrapper">
                                        <select value={typeChi} onChange={e => setTypeChi(e.target.value)}>
                                            {typeChiOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
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
                                    {showAddTypeChi && (
                                        <div className="tpc-inline-add-row">
                                            <input
                                                type="text"
                                                placeholder="Tên loại phiếu mới..."
                                                value={newTypeChiText}
                                                onChange={e => setNewTypeChiText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddTypeChi()}
                                            />
                                            <button type="button" className="btn-inline-add" onClick={handleAddTypeChi}>THÊM</button>
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
                                    onChange={e => { setAmount(e.target.value); setErrors(prev => ({ ...prev, amount: null })); }}
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
                                onChange={e => setRecordDate(e.target.value)}
                            />
                        </div>

                        <div className="tpc-form-group">
                            <label>PHƯƠNG THỨC THANH TOÁN</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="Tiền mặt">Tiền mặt</option>
                                <option value="Chuyển khoản">Chuyển khoản</option>
                                <option value="Quẹt thẻ">Quẹt thẻ</option>
                            </select>
                        </div>

                        <div className="tpc-form-group">
                            <label>TAGS</label>
                            <div className="tpc-tags-wrapper">
                                {tags.map((tag, idx) => (
                                    <span key={idx} className="tpc-tag-pill">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(idx)}>&times;</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    placeholder="Nhập tag, Enter để thêm..."
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
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
                                onChange={e => setDescription(e.target.value)}
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
                        <span className={`summary-value bold ${activeTab === 'thu' ? 'text-red' : ''}`}>{currentCode}</span>
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
                        <span className="summary-value">{paymentMethod}</span>
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
