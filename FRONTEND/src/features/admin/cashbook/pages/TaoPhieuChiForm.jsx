import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './TaoPhieuForm.css';

const personDataChi = {
    'NHÂN VIÊN': [
        { name: 'Trần Văn Bình', phone: '0901 111 222' },
        { name: 'Nguyễn Thị Lan', phone: '0902 222 333' },
        { name: 'Lê Đức Tâm', phone: '0903 333 444' },
        { name: 'Trần Thị B', phone: '0904 444 555' }
    ],
    'KHÁCH HÀNG': [
        { name: 'Nguyễn Thị Lan', phone: '0901 234 567' },
        { name: 'Hoàng Minh Khoa', phone: '0912 345 678' },
        { name: 'Phạm Quốc Hùng', phone: '0923 456 789' },
        { name: 'Vũ Thị Ngọc', phone: '0934 567 890' },
        { name: 'Nguyễn Văn An', phone: '0945 678 901' },
        { name: 'Trần Thị Bích', phone: '0956 789 012' }
    ],
    'NHÀ CUNG CẤP': [
        { name: 'ASUS Vietnam Co.', phone: '028 3910 1234' },
        { name: 'NCC Corsair VN', phone: '028 3910 5678' },
        { name: 'Công ty ABC Tech', phone: '028 3910 9999' }
    ],
    'ĐỐI TÁC': [
        { name: 'GHN Express', phone: '1900 636677' },
        { name: 'Nhà vận chuyển GHN', phone: '1900 636677' },
        { name: 'Điện lực TP.HCM', phone: '1900 1122' }
    ]
};

export default function TaoPhieuChiForm() {
    const navigate = useNavigate();
    const { loaiPhieuChiList, addLoaiPhieuChi, addPhieuChi, addCashbookItem } = useCashbook() || {};

    const now = new Date();
    const dateFormatted = now.toISOString().slice(0, 10).replace(/-/g, '');
    const defaultCode = ``;

    // Form states
    const [group, setGroup] = useState('NHÂN VIÊN');
    const [person, setPerson] = useState('');
    const [showPersonDropdown, setShowPersonDropdown] = useState(false);
    const [code, setCode] = useState(defaultCode);
    const [selectedType, setSelectedType] = useState('');
    const [refCode, setRefCode] = useState('');
    const [amount, setAmount] = useState('500000');

    const formatDateTimeLocal = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const [recordDate, setRecordDate] = useState(formatDateTimeLocal(now));

    const [paymentMethod, setPaymentMethod] = useState('TIỀN MẶT');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [description, setDescription] = useState('');

    const [showAddTypeModal, setShowAddTypeModal] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeCode, setNewTypeCode] = useState('');

    const [errors, setErrors] = useState({});

    const availableTypes = loaiPhieuChiList?.filter(x => x.status === 'HOẠT ĐỘNG') || [];

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

    const handleCreateType = () => {
        if (!newTypeName.trim()) return;
        const generatedCode = newTypeCode.trim() || `LPC00${Date.now() % 100}`;
        if (addLoaiPhieuChi) {
            addLoaiPhieuChi({ id: Date.now(), code: generatedCode, name: newTypeName.trim(), type: 'CHI', note: '-', status: 'HOẠT ĐỘNG' });
        }
        setSelectedType(newTypeName.trim());
        setNewTypeName('');
        setNewTypeCode('');
        setShowAddTypeModal(false);
        setErrors(prev => ({ ...prev, type: null }));
    };

    const handleSubmit = () => {
        let newErrors = {};

        if (!person.trim()) {
            newErrors.person = 'Vui lòng chọn hoặc nhập tên người nhận';
        }

        if (!selectedType || selectedType === '— CHỌN LOẠI CHI —') {
            newErrors.type = 'Vui lòng chọn loại chi';
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            newErrors.amount = 'Vui lòng nhập số tiền hợp lệ (> 0)';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const typeObj = availableTypes.find(t => t.name === selectedType);
        const typeCodeStr = typeObj ? typeObj.code : 'LPC001';

        const dateFormattedDisplay = new Date(recordDate).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const newItem = {
            id: Date.now(),
            code: code.trim() || `PC${Date.now().toString().slice(-6)}`,
            person: person.trim(),
            role: group,
            group: group,
            typeCode: typeCodeStr,
            typeName: selectedType,
            method: paymentMethod,
            creator: 'Admin Tổng',
            amount: numAmount,
            date: dateFormattedDisplay,
            source: 'THỦ CÔNG',
            status: 'ĐÃ GHI NHẬN'
        };

        if (addPhieuChi) addPhieuChi(newItem);
        if (addCashbookItem) {
            addCashbookItem({
                id: newItem.id,
                type: 'PHIẾU CHI',
                date: recordDate.slice(0, 10),
                code: newItem.code,
                person: newItem.person,
                method: newItem.method,
                amountIn: 0,
                amountOut: numAmount,
                desc: description || '-',
                staff: 'Admin Tổng'
            });
        }
        navigate('/admin/so-quy-tien-mat/phieu-chi');
    };

    const currentPersonList = personDataChi[group] || personDataChi['NHÂN VIÊN'];

    const formattedAmount = () => {
        const num = parseFloat(amount);
        if (isNaN(num) || num <= 0) return '-';
        return num.toLocaleString('vi-VN') + 'đ';
    };

    return (
        <div className="tpf-page">
            {/* Top Page Header Bar */}
            <div className="tpf-top-bar">
                <div className="tpf-breadcrumb-top">
                    ADMIN &nbsp;&rsaquo;&nbsp; PHIẾU CHI &nbsp;&rsaquo;&nbsp; TẠO PHIẾU CHI
                </div>
                <button type="button" className="tpf-btn-top-create" onClick={handleSubmit}>
                    TẠO PHIẾU CHI
                </button>
            </div>

            {/* Sub Header Section */}
            <div className="tpf-header">
                <div className="tpf-header-sub-row">
                    <div className="tpf-badge-box">
                        PHIẾU CHI
                    </div>
                    <div className="tpf-breadcrumb-sub">
                        SỔ QUỸ TIỀN MẶT / PHIẾU CHI / TẠO PHIẾU CHI
                    </div>
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
                        <div className="tpf-col-header">
                            THÔNG TIN NGƯỜI NHẬN
                        </div>

                        <div className="tpf-form-group">
                            <label>NHÓM NGƯỜI NHẬN *</label>
                            <select value={group} onChange={e => { setGroup(e.target.value); setPerson(''); }}>
                                <option value="NHÂN VIÊN">NHÂN VIÊN</option>
                                <option value="KHÁCH HÀNG">KHÁCH HÀNG</option>
                                <option value="NHÀ CUNG CẤP">NHÀ CUNG CẤP</option>
                                <option value="ĐỐI TÁC">ĐỐI TÁC</option>
                            </select>
                        </div>

                        <div className="tpf-form-group">
                            <label>TÊN NGƯỜI NHẬN *</label>
                            <div className={`tpf-input-search-wrapper ${showPersonDropdown ? 'is-focused' : ''}`}>
                                <input
                                    type="text"
                                    placeholder={group === 'NHÂN VIÊN' ? 'TÌM NHÂN VIÊN...' : group === 'NHÀ CUNG CẤP' ? 'TÌM NHÀ CUNG CẤP...' : 'TÌM KHÁCH HÀNG...'}
                                    value={person}
                                    className={errors.person ? 'input-error' : ''}
                                    onFocus={() => setShowPersonDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowPersonDropdown(false), 200)}
                                    onChange={e => {
                                        setPerson(e.target.value);
                                        setShowPersonDropdown(true);
                                        setErrors(prev => ({ ...prev, person: null }));
                                    }}
                                />
                                {showPersonDropdown && (
                                    <div className="tpf-search-dropdown">
                                        {currentPersonList
                                            .filter(p => p.name.toLowerCase().includes(person.toLowerCase().trim()))
                                            .map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="tpf-search-dropdown-item"
                                                    onMouseDown={() => {
                                                        setPerson(item.name);
                                                        setShowPersonDropdown(false);
                                                        setErrors(prev => ({ ...prev, person: null }));
                                                    }}
                                                >
                                                    <div className="dropdown-name">{item.name}</div>
                                                    <div className="dropdown-phone">{item.phone}</div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            {errors.person && <span className="error-text">{errors.person}</span>}
                        </div>

                        <div className="tpf-form-group">
                            <label>MÃ PHIẾU</label>
                            <input
                                type="text"
                                placeholder="De trong de he thong tu tao"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                            />
                        </div>

                        <div className="tpf-form-group">
                            <label>LOẠI CHI *</label>
                            <div className="tpf-select-add-group">
                                <select
                                    value={selectedType}
                                    onChange={e => { setSelectedType(e.target.value); setErrors(prev => ({ ...prev, type: null })); }}
                                    className={errors.type ? 'input-error' : ''}
                                >
                                    <option value="">— CHỌN LOẠI CHI —</option>
                                    {availableTypes.map(t => (
                                        <option key={t.id} value={t.name}>{t.name}</option>
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
                                placeholder="VD: DN-001, TH000300..."
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
                                onChange={e => setRecordDate(e.target.value)}
                            />
                        </div>

                        <div className="tpf-form-group">
                            <label>PHƯƠNG THỨC THANH TOÁN *</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="TIỀN MẶT">TIỀN MẶT</option>
                                <option value="CHUYỂN KHOẢN">CHUYỂN KHOẢN</option>
                                <option value="QUẸT THẺ">QUẸT THẺ</option>
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
                                placeholder="Ghi chú thêm về khoản chi này..."
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
                        <span className="summary-lbl">NGƯỜI NHẬN</span>
                        <span className="summary-val">{person.trim() || '-'}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-lbl">LOẠI CHI</span>
                        <span className="summary-val">{selectedType || '-'}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-lbl">SỐ TIỀN</span>
                        <span className="summary-val red-text bold">{formattedAmount()}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Right Submit Action Button */}
            <div className="tpf-bottom-action-bar">
                <button type="button" className="tpf-btn-bottom-submit" onClick={handleSubmit}>
                    TẠO PHIẾU CHI
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
                                    placeholder="VD: LPC007"
                                    value={newTypeCode}
                                    onChange={e => setNewTypeCode(e.target.value)}
                                />
                            </div>
                            <div className="lpt-form-group">
                                <label>TÊN LOẠI *</label>
                                <input
                                    type="text"
                                    placeholder="VD: Chi bồi thường"
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
