import React, { createContext, useContext, useState } from 'react';

const initialMockData = [
    { id: 1, type: 'PHIẾU THU', date: '2026-09-10', code: 'PT-001', person: 'Nguyễn Thị Lan', method: 'TIỀN MẶT', amountIn: 5200000, amountOut: 0, desc: '-', staff: 'Trần Thị B' },
    { id: 2, type: 'PHIẾU THU', date: '2026-09-10', code: 'PT-002', person: 'Hoàng Minh Khoa', method: 'CHUYỂN KHOẢN', amountIn: 12800000, amountOut: 0, desc: '-', staff: 'Trần Thị B' },
    { id: 3, type: 'PHIẾU CHI', date: '2026-09-10', code: 'PC-001', person: 'NCC Corsair VN', method: 'CHUYỂN KHOẢN', amountIn: 0, amountOut: 3500000, desc: '-', staff: 'Trần Thị B' },
    { id: 4, type: 'PHIẾU THU', date: '2026-09-11', code: 'PT-003', person: 'Phạm Quốc Hùng', method: 'QUẸT THẺ', amountIn: 8990000, amountOut: 0, desc: '-', staff: 'Trần Thị B' },
    { id: 5, type: 'PHIẾU CHI', date: '2026-09-11', code: 'PC-002', person: 'Điện lực TP.HCM', method: 'TIỀN MẶT', amountIn: 0, amountOut: 1200000, desc: '-', staff: 'Trần Thị B' },
    { id: 6, type: 'PHIẾU THU', date: '2026-09-12', code: 'PT-004', person: 'Công ty ABC Tech', method: 'CHUYỂN KHOẢN', amountIn: 22500000, amountOut: 0, desc: '-', staff: 'Trần Thị B' },
    { id: 7, type: 'PHIẾU CHI', date: '2026-09-12', code: 'PC-003', person: 'Nhà vận chuyển GHN', method: 'TIỀN MẶT', amountIn: 0, amountOut: 500000, desc: '-', staff: 'Trần Thị B' },
    { id: 8, type: 'PHIẾU THU', date: '2026-09-13', code: 'PT-005', person: 'Vũ Thị Ngọc', method: 'TIỀN MẶT', amountIn: 4490000, amountOut: 0, desc: '-', staff: 'Trần Thị B' },
];

const initialLoaiPhieuThu = [
    { id: 1, code: 'LPT001', name: 'Thu bán hàng', type: 'THU', note: 'Doanh thu từ bán hàng tại quầy và online', status: 'HOẠT ĐỘNG' },
    { id: 2, code: 'LPT002', name: 'Thu nợ khách hàng', type: 'THU', note: 'Thu hồi công nợ từ khách hàng', status: 'HOẠT ĐỘNG' },
    { id: 3, code: 'LPT003', name: 'Thu đặt cọc', type: 'THU', note: 'Khách hàng đặt cọc giữ hàng hoặc dịch vụ', status: 'HOẠT ĐỘNG' },
    { id: 4, code: 'LPT004', name: 'Thu hoàn ứng', type: 'THU', note: 'Nhân viên hoàn lại tiền tạm ứng còn thừa', status: 'HOẠT ĐỘNG' },
    { id: 5, code: 'LPT005', name: 'Thu phí dịch vụ', type: 'THU', note: '-', status: 'HOẠT ĐỘNG' },
    { id: 6, code: 'LPT006', name: 'Thu bồi thường', type: 'THU', note: 'Thu bồi thường từ đối tác, nhà cung cấp', status: 'NGỪNG HOẠT ĐỘNG' }
];

const initialLoaiPhieuChi = [
    { id: 1, code: 'LPC001', name: 'Chi nhập hàng', type: 'CHI', note: 'Thanh toán tiền mua hàng hóa, nguyên vật liệu', status: 'HOẠT ĐỘNG' },
    { id: 2, code: 'LPC002', name: 'Chi hoàn tiền khách hàng', type: 'CHI', note: 'Hoàn tiền cho khách đổi/trả hàng', status: 'HOẠT ĐỘNG' },
    { id: 3, code: 'LPC003', name: 'Chi lương nhân viên', type: 'CHI', note: 'Thanh toán lương, thưởng cho nhân viên', status: 'HOẠT ĐỘNG' },
    { id: 4, code: 'LPC004', name: 'Chi vận chuyển', type: 'CHI', note: 'Chi phí giao hàng cho đối tác vận chuyển', status: 'HOẠT ĐỘNG' },
    { id: 5, code: 'LPC005', name: 'Chi điện nước', type: 'CHI', note: 'Chi phí điện, nước sinh hoạt cửa hàng', status: 'HOẠT ĐỘNG' },
    { id: 6, code: 'LPC020', name: 'Chi phí thuê mặt bằng', type: 'CHI', note: '-', status: 'NGỪNG HOẠT ĐỘNG' }
];

const initialPhieuThu = [
    { id: 1, code: 'PT0001006', person: 'ASUS Vietnam Co.', role: 'NHÀ CUNG CẤP', group: 'NHÀ CUNG CẤP', typeCode: 'LPT005', typeName: 'Thu phí dịch vụ', method: 'CHUYỂN KHOẢN', creator: 'Nguyễn Thị Lan', amount: 3500000, date: '15/09/2026 10:00', source: 'THỦ CÔNG', status: 'ĐÃ GHI NHẬN' },
    { id: 2, code: 'PT0001005', person: 'Vũ Thị Ngọc', role: 'KHÁCH HÀNG', group: 'KHÁCH HÀNG', typeCode: 'LPT003', typeName: 'Thu đặt cọc', method: 'TIỀN MẶT', creator: 'Trần Minh Quân', amount: 2000000, date: '14/09/2026 15:00', source: 'THỦ CÔNG', status: 'ĐÃ HỦY' },
    { id: 3, code: 'PT0001004', person: 'Phạm Quốc Hùng', role: 'KHÁCH HÀNG', group: 'KHÁCH HÀNG', typeCode: 'LPT002', typeName: 'Thu nợ khách hàng', method: 'CHUYỂN KHOẢN', creator: 'Nguyễn Thị Lan', amount: 8990000, date: '13/09/2026 11:00', source: 'THỦ CÔNG', status: 'ĐÃ GHI NHẬN' },
    { id: 4, code: 'PT0001003', person: 'Trần Văn Bình', role: 'NHÂN VIÊN', group: 'NHÂN VIÊN', typeCode: 'LPT004', typeName: 'Thu hoàn ứng', method: 'TIỀN MẶT', creator: 'Trần Minh Quân', amount: 500000, date: '12/09/2026 09:00', source: 'THỦ CÔNG', status: 'ĐÃ GHI NHẬN' },
    { id: 5, code: 'PT0001002', person: 'Hoàng Minh Khoa', role: 'KHÁCH HÀNG', group: 'KHÁCH HÀNG', typeCode: 'LPT001', typeName: 'Thu bán hàng', method: 'CHUYỂN KHOẢN', creator: 'HỆ THỐNG', amount: 12800000, date: '10/09/2026 14:30', source: 'TỰ ĐỘNG', status: 'ĐÃ GHI NHẬN' },
    { id: 6, code: 'PT0001001', person: 'Nguyễn Thị Lan', role: 'KHÁCH HÀNG', group: 'KHÁCH HÀNG', typeCode: 'LPT001', typeName: 'Thu bán hàng', method: 'TIỀN MẶT', creator: 'Trần Minh Quân', amount: 5200000, date: '10/09/2026 09:00', source: 'TỰ ĐỘNG', status: 'ĐÃ GHI NHẬN' }
];

const initialPhieuChi = [
    { id: 1, code: 'PC0002005', person: 'Nguyễn Thị Lan', role: 'NHÂN VIÊN', group: 'NHÂN VIÊN', typeCode: 'LPC004', typeName: 'Chi lương nhân viên', method: 'TIỀN MẶT', creator: 'Trần Minh Quân', amount: 12000000, date: '16/09/2026 09:00', source: 'THỦ CÔNG', status: 'ĐÃ GHI NHẬN' },
    { id: 2, code: 'PC0002004', person: 'GHN Express', role: 'ĐỐI TÁC GIAO HÀNG', group: 'ĐỐI TÁC GIAO HÀNG', typeCode: 'LPC003', typeName: 'Chi phí vận chuyển', method: 'CHUYỂN KHOẢN', creator: 'Nguyễn Thị Lan', amount: 1250000, date: '15/09/2026 08:00', source: 'THỦ CÔNG', status: 'ĐÃ HỦY' },
    { id: 3, code: 'PC0002001', person: 'Trần Văn Bình', role: 'NHÂN VIÊN', group: 'NHÂN VIÊN', typeCode: 'LPC015', typeName: 'Chi tạm ứng nhân viên', method: 'TIỀN MẶT', creator: 'Trần Minh Quân', amount: 500000, date: '14/09/2026 09:00', source: 'THỦ CÔNG', status: 'ĐÃ GHI NHẬN' },
    { id: 4, code: 'PC0002003', person: 'Hoàng Minh Khoa', role: 'KHÁCH HÀNG', group: 'KHÁCH HÀNG', typeCode: 'LPC002', typeName: 'Chi hoàn tiền khách hàng', method: 'CHUYỂN KHOẢN', creator: 'HỆ THỐNG', amount: 2800000, date: '13/09/2026 10:30', source: 'TỰ ĐỘNG', status: 'ĐÃ GHI NHẬN' },
    { id: 5, code: 'PC0002002', person: 'ASUS Vietnam Co.', role: 'NHÀ CUNG CẤP', group: 'NHÀ CUNG CẤP', typeCode: 'LPC001', typeName: 'Chi nhập hàng', method: 'CHUYỂN KHOẢN', creator: 'HỆ THỐNG', amount: 48500000, date: '12/09/2026 14:00', source: 'TỰ ĐỘNG', status: 'ĐÃ GHI NHẬN' }
];

const CashbookContext = createContext();

export function CashbookProvider({ children }) {
    const [cashbookList, setCashbookList] = useState(initialMockData);
    const [loaiPhieuThuList, setLoaiPhieuThuList] = useState(initialLoaiPhieuThu);
    const [loaiPhieuChiList, setLoaiPhieuChiList] = useState(initialLoaiPhieuChi);
    const [phieuThuList, setPhieuThuList] = useState(initialPhieuThu);
    const [phieuChiList, setPhieuChiList] = useState(initialPhieuChi);

    const addCashbookItem = (item) => {
        setCashbookList(prev => [item, ...prev]);
    };

    const addPhieuThu = (item) => {
        setPhieuThuList(prev => [item, ...prev]);
    };

    const addPhieuChi = (item) => {
        setPhieuChiList(prev => [item, ...prev]);
    };

    const addLoaiPhieuThu = (item) => {
        setLoaiPhieuThuList(prev => [...prev, item]);
    };

    const addLoaiPhieuChi = (item) => {
        setLoaiPhieuChiList(prev => [...prev, item]);
    };

    const toggleStatusLoaiPhieuThu = (code, newStatus) => {
        setLoaiPhieuThuList(prev => prev.map(item => {
            if (item.code === code) {
                return { ...item, status: newStatus };
            }
            return item;
        }));
    };

    const toggleStatusLoaiPhieuChi = (code, newStatus) => {
        setLoaiPhieuChiList(prev => prev.map(item => {
            if (item.code === code) {
                return { ...item, status: newStatus };
            }
            return item;
        }));
    };

    const cancelPhieuThu = (code) => {
        setPhieuThuList(prev => prev.map(item => {
            if (item.code === code) {
                return { ...item, status: 'ĐÃ HỦY' };
            }
            return item;
        }));
    };

    const cancelPhieuChi = (code) => {
        setPhieuChiList(prev => prev.map(item => {
            if (item.code === code) {
                return { ...item, status: 'ĐÃ HỦY' };
            }
            return item;
        }));
    };

    return (
        <CashbookContext.Provider value={{
            cashbookList,
            addCashbookItem,
            phieuThuList,
            addPhieuThu,
            cancelPhieuThu,
            phieuChiList,
            addPhieuChi,
            cancelPhieuChi,
            loaiPhieuThuList,
            addLoaiPhieuThu,
            toggleStatusLoaiPhieuThu,
            loaiPhieuChiList,
            addLoaiPhieuChi,
            toggleStatusLoaiPhieuChi
        }}>
            {children}
        </CashbookContext.Provider>
    );
}

export function useCashbook() {
    return useContext(CashbookContext);
}

