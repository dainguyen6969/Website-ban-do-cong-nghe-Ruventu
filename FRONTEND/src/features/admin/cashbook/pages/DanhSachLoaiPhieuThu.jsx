import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DanhSachLoaiPhieuThu.css';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { getReceiptTypes, createReceiptType, RECEIPT_TYPE_STATUS } from '../api/receiptTypeApi';

export default function DanhSachLoaiPhieuThu() {
    const navigate = useNavigate();
    const location = useLocation();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('TẤT CẢ TRẠNG THÁI');
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    
    // Form state
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newNote, setNewNote] = useState('');
    const [errors, setErrors] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getReceiptTypes({
                    page: pagination.page,
                    limit: pagination.limit,
                    keyword: searchQuery,
                    status: filterStatus !== 'TẤT CẢ TRẠNG THÁI' ? filterStatus : undefined
                }, controller.signal);
                setData(res.items);
                setPagination(prev => ({ ...prev, totalItems: res.totalItems, totalPages: res.totalPages }));
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Không thể tải danh sách loại phiếu thu. Vui lòng thử lại.');
                }
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            loadData();
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [pagination.page, pagination.limit, searchQuery, filterStatus, refreshKey]);


    const handleOpenModal = () => {
        setNewCode('');
        setNewName('');
        setNewNote('');
        setErrors({});
        setShowModal(true);
    };

    const handleCreate = async () => {
        let newErrors = {};
        if (!newCode.trim()) newErrors.code = 'Vui lòng nhập mã loại';
        if (!newName.trim()) newErrors.name = 'Vui lòng nhập tên loại';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setCreating(true);
        try {
            await createReceiptType({
                code: newCode,
                name: newName,
                note: newNote
            });
            setShowModal(false);
            setPagination(prev => ({ ...prev, page: 1 }));
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            if (err.response?.data?.message?.includes('đã tồn tại')) {
                setErrors({ code: err.response.data.message });
            } else {
                setErrors({ submit: err.message || 'Có lỗi xảy ra, vui lòng thử lại' });
            }
        } finally {
            setCreating(false);
        }
    };


    return (
        <div className="lpt-page">
            <div className="pt-header-top">

                <div className="pt-breadcrumb">SỔ QUỸ TIỀN MẶT / LOẠI PHIẾU THU</div>
                <button className="pt-btn-create" onClick={handleOpenModal}>
                    + THÊM LOẠI PHIẾU THU
                </button>
            </div>
            
            <div className="pt-header-main">
                <h1>LOẠI PHIẾU THU</h1>
                <p>QUẢN LÝ CÁC NHÓM MỤC ĐÍCH DÙNG ĐỂ PHÂN LOẠI KHOẢN THU</p>
            </div>

            <div className="pt-filter-bar">
                <input 
                    type="text" 
                    placeholder="TÌM MÃ LOẠI / TÊN LOẠI..." 
                    className="pt-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="TẤT CẢ TRẠNG THÁI">TẤT CẢ TRẠNG THÁI</option>
                    <option value="HOẠT ĐỘNG">HOẠT ĐỘNG</option>
                    <option value="NGỪNG HOẠT ĐỘNG">NGỪNG HOẠT ĐỘNG</option>
                </select>
            </div>

            <div className="pt-table-container">
                <table className="promo-table pt-table">
                    <thead>
                        <tr>
                            <th>MÃ LOẠI</th>
                            <th>TÊN LOẠI</th>
                            <th>LOẠI PHIẾU</th>
                            <th>GHI CHÚ</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="pt-empty-state">
                                        <p>ĐANG TẢI DỮ LIỆU...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="pt-empty-state">
                                        <p className="text-red">{error}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length > 0 ? (
                            data.map(row => (
                                <tr key={row.id}>
                                    <td><strong>{row.code}</strong></td>
                                    <td><strong>{row.name}</strong></td>
                                    <td className="text-muted">{row.type}</td>
                                    <td className="text-muted">{row.note}</td>
                                    <td>
                                        <span className={`status-outline ${row.status === 'NGỪNG HOẠT ĐỘNG' ? 'status-gray' : 'status-success'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="pt-btn-detail" onClick={() => navigate(`/admin/so-quy-tien-mat/loai-phieu-thu/${encodeURIComponent(row.id)}`)}>XEM CHI TIẾT</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6">
                                    <div className="pt-empty-state">
                                        <p>KHÔNG TÌM THẤY LOẠI PHIẾU THU PHÙ HỢP</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {data.length > 0 && !loading && (
                <TablePagination
                    totalItems={pagination.totalItems}
                    pageSize={pagination.limit}
                    currentPage={pagination.page}
                    onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                />
            )}

            {showModal && (
                <div className="lpt-modal-overlay">
                    <div className="lpt-modal">
                        <div className="lpt-modal-header">
                            <h3>THÊM LOẠI PHIẾU THU</h3>
                        </div>
                        <div className="lpt-modal-body">
                            <div className="lpt-form-group">
                                <label>MÃ LOẠI <span>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="VD: LPT007" 
                                    value={newCode}
                                    onChange={e => {setNewCode(e.target.value); setErrors({...errors, code: null})}}
                                    className={errors.code ? 'input-error' : ''}
                                />
                            </div>
                            <div className="lpt-form-group">
                                <label>TÊN LOẠI <span>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="VD: Thu bồi hoàn" 
                                    value={newName}
                                    onChange={e => {setNewName(e.target.value); setErrors({...errors, name: null})}}
                                    className={errors.name ? 'input-error' : ''}
                                />
                            </div>
                            <div className="lpt-form-group">
                                <label>GHI CHÚ</label>
                                <textarea 
                                    placeholder="Mô tả loại phiếu thu này..." 
                                    rows="3"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                ></textarea>
                            </div>
                            
                            <div className="lpt-modal-status-row">
                                <div className="status-col">
                                    <label>LOẠI PHIẾU</label>
                                    <strong>THU</strong>
                                </div>
                                <div className="status-col">
                                    <label>TRẠNG THÁI SAU KHI TẠO</label>
                                    <strong className="text-green">HOẠT ĐỘNG</strong>
                                </div>
                            </div>
                        </div>
                        <div className="lpt-modal-footer">
                            {errors.submit && <div className="component-error" style={{flex: 1, textAlign: 'left', margin: 0}}>{errors.submit}</div>}
                            <button className="lpt-btn-outline" onClick={() => setShowModal(false)} disabled={creating}>HỦY</button>
                            <button className="lpt-btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'ĐANG TẠO...' : 'TẠO LOẠI PHIẾU THU'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
