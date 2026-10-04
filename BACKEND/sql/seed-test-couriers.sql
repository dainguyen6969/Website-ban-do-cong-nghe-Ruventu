-- Manual local test seed. Safe to rerun; does not overwrite existing rows.
SET NAMES utf8mb4;
START TRANSACTION;
INSERT INTO doi_tac_van_chuyen
  (ma_doi_tac, ten_doi_tac, so_dien_thoai, loai_doi_tac, trang_thai, ghi_chu, ngay_tao, ngay_cap_nhat)
SELECT 'TEST-SHIP-01', 'Nguyễn Văn An (test)', '0900000001', 'SHIP_CA_NHAN', 'DANG_HOAT_DONG', 'Dữ liệu test giao hàng theo yêu cầu', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM doi_tac_van_chuyen WHERE ma_doi_tac = 'TEST-SHIP-01');
INSERT INTO doi_tac_van_chuyen
  (ma_doi_tac, ten_doi_tac, so_dien_thoai, loai_doi_tac, trang_thai, ghi_chu, ngay_tao, ngay_cap_nhat)
SELECT 'TEST-SHIP-02', 'Trần Văn Bình (test)', '0900000002', 'SHIP_CA_NHAN', 'DANG_HOAT_DONG', 'Dữ liệu test giao hàng theo yêu cầu', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM doi_tac_van_chuyen WHERE ma_doi_tac = 'TEST-SHIP-02');

-- Seeded order 13 was already packed/exported but had no delivery record.
SELECT id FROM don_hang WHERE id = 13 FOR UPDATE;
INSERT INTO phieu_giao_hang
  (ma_phieu_giao_hang, don_hang_id, doi_tac_van_chuyen_id, trang_thai_giao_hang, phi_tra_doi_tac, tien_thu_ho_cod, ngay_tao, ngay_cap_nhat)
SELECT 'TEST-PGH-0013', d.id, p.id, 'CHO_GIAO', 0,
  CASE WHEN d.trang_thai_thanh_toan = 'DA_THANH_TOAN' THEN 0 ELSE d.tong_thanh_toan END, NOW(), NOW()
FROM don_hang d JOIN doi_tac_van_chuyen p ON p.ma_doi_tac = 'TEST-SHIP-01'
WHERE d.id = 13 AND d.ma_don_hang = 'DH-20261002-0013'
  AND d.dia_chi_giao_hang IS NOT NULL AND TRIM(d.dia_chi_giao_hang) <> ''
  AND d.trang_thai_don_hang = 'CHO_LAY_HANG'
  AND d.trang_thai_dong_goi = 'DA_DONG_GOI' AND d.trang_thai_xuat_kho = 'DA_XUAT_KHO'
  AND NOT EXISTS (SELECT 1 FROM phieu_giao_hang WHERE don_hang_id = d.id);
COMMIT;
