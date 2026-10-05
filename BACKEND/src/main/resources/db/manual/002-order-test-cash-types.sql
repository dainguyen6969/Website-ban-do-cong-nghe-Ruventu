-- Explicitly approved local configuration; preserves existing cash types.
INSERT INTO loai_thu_chi (ma_loai, ten_loai, loai_phieu, trang_thai, ghi_chu)
SELECT 'THU_BAN_HANG', 'Thu bán hàng', 'THU', 'HOAT_DONG', 'Cấu hình kiểm thử local'
WHERE NOT EXISTS (SELECT 1 FROM loai_thu_chi WHERE ma_loai = 'THU_BAN_HANG');
INSERT INTO loai_thu_chi (ma_loai, ten_loai, loai_phieu, trang_thai, ghi_chu)
SELECT 'CHI_HOAN_DON_HANG', 'Chi hoàn đơn hàng', 'CHI', 'HOAT_DONG', 'Cấu hình kiểm thử local'
WHERE NOT EXISTS (SELECT 1 FROM loai_thu_chi WHERE ma_loai = 'CHI_HOAN_DON_HANG');
