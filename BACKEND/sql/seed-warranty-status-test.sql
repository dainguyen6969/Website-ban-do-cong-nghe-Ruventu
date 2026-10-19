-- TEST ONLY: six independent fixtures for PATCH /api/v1/admin/warranties/{id}/status.
-- Inserts only; never deletes/resets existing warranties, history or idempotency keys.
-- Six synthetic completed orders WILL appear in order reports.
-- No stock, warehouse, stock-card, cashbook, invoice or schema changes.
-- E04 approvals/customer consent below are SYNTHETIC, not real business evidence.
-- Run the WHOLE file with stop-on-error enabled. On error: ROLLBACK and stop.
-- Reusing this prefix intentionally fails before inserts; do not reset successful API history.
-- For another independent run, choose a NEW prefix (<= 25 characters).
-- Use different Idempotency-Key UUIDs for different operations; reuse only for identical retries.
USE dant_ruventu;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @ws_prefix = 'BH-ST-261019';
SET @ws_marker = CONCAT('[', @ws_prefix, '] SYNTHETIC warranty-status test; no actual sale/payment/stock movement');
SET @ws_actor = (
    SELECT MIN(u.id) FROM nguoi_dung u JOIN vai_tro r ON r.id = u.vai_tro_id
    WHERE r.ten_vai_tro = 'ADMIN' AND u.trang_thai = 1
);
SET @ws_variant = (SELECT id FROM phien_ban_san_pham WHERE ma_vach = 'BH-TEST-261015-RAM-V1' AND co_quan_ly_serial = 1);
SET @ws_price = (SELECT gia_ban_le FROM phien_ban_san_pham WHERE id = @ws_variant);
SET @ws_purchase = '2026-09-15 09:00:00';
-- Retains the E01 timestamp in the supplied specification: 2026-10-12T09:10:00+07:00.
SET @ws_received = '2026-10-12 09:00:00';
SET @ws_expiry = '2028-09-15 09:00:00';
SET @ws_cases = '["E01","E02","E03","E04","E05","E06"]';
SET @ws_guard = IF(
    @ws_actor IS NOT NULL AND @ws_variant IS NOT NULL AND @ws_price > 0
    AND CHAR_LENGTH(@ws_prefix) <= 25
    AND NOT EXISTS (SELECT 1 FROM don_hang WHERE ma_don_hang LIKE CONCAT(@ws_prefix, '-%'))
    AND NOT EXISTS (SELECT 1 FROM phieu_bao_hanh WHERE ma_phieu LIKE CONCAT(@ws_prefix, '-%'))
    AND NOT EXISTS (SELECT 1 FROM thiet_bi_bao_hanh WHERE ma_theo_doi LIKE CONCAT(@ws_prefix, '-%'))
    AND NOT EXISTS (SELECT 1 FROM so_serial_san_pham WHERE so_serial LIKE CONCAT(@ws_prefix, '-%')),
    'SELECT 1 AS seed_prerequisites_ok',
    'SELECT * FROM __ERROR_WARRANTY_STATUS_PREFIX_EXISTS_OR_MISSING_ADMIN_VARIANT__'
);
PREPARE ws_assert FROM @ws_guard;
EXECUTE ws_assert;
DEALLOCATE PREPARE ws_assert;

START TRANSACTION;

INSERT INTO don_hang
    (ma_don_hang, loai_don_hang, khach_hang_id, nhan_vien_id,
     tong_tien_hang, tien_chiet_khau, phi_giao_hang, tong_thanh_toan,
     phuong_thuc_thanh_toan, trang_thai_thanh_toan,
     trang_thai_dong_goi, trang_thai_xuat_kho, trang_thai_don_hang,
     ten_nguoi_nhan, sdt_nguoi_nhan, ghi_chu, ngay_tao)
SELECT CONCAT(@ws_prefix, '-DH-', j.case_code), 'TAI_QUAY', NULL, @ws_actor,
       @ws_price, 0, 0, @ws_price, 'TIEN_MAT', 'DA_THANH_TOAN',
       'DA_DONG_GOI', 'DA_XUAT_KHO', 'HOAN_THANH',
       CONCAT('TEST Warranty Status ', j.case_code), '0912345678', @ws_marker, @ws_purchase
FROM JSON_TABLE(@ws_cases, '$[*]' COLUMNS(case_code VARCHAR(3) PATH '$')) j;

INSERT INTO chi_tiet_don_hang
    (don_hang_id, phien_ban_id, don_gia, so_luong, thanh_tien,
     la_qua_tang, tien_chiet_khau, thanh_toan_dong, cau_hinh_da_ban)
SELECT o.id, @ws_variant, @ws_price, 1, @ws_price, FALSE, 0, @ws_price, NULL
FROM don_hang o WHERE o.ma_don_hang LIKE CONCAT(@ws_prefix, '-DH-E0_');

INSERT INTO so_serial_san_pham
    (phien_ban_id, so_serial, trang_thai, don_hang_id, ngay_kich_hoat, han_bao_hanh)
SELECT @ws_variant, CONCAT(@ws_prefix, '-SN-', j.case_code), 'DANG_BAO_HANH',
       o.id, @ws_purchase, @ws_expiry
FROM JSON_TABLE(@ws_cases, '$[*]' COLUMNS(case_code VARCHAR(3) PATH '$')) j
JOIN don_hang o ON o.ma_don_hang = CONCAT(@ws_prefix, '-DH-', j.case_code);

INSERT INTO thiet_bi_bao_hanh
    (ma_theo_doi, chi_tiet_don_hang_id, phien_ban_id, so_serial_id,
     han_bao_hanh, dau_hieu_nhan_dang, ngay_tao, ngay_kich_hoat)
SELECT CONCAT(@ws_prefix, '-TB-', j.case_code), l.id, @ws_variant, s.id,
       @ws_expiry, CONCAT(@ws_marker, '; ', j.case_code), @ws_received, @ws_purchase
FROM JSON_TABLE(@ws_cases, '$[*]' COLUMNS(case_code VARCHAR(3) PATH '$')) j
JOIN don_hang o ON o.ma_don_hang = CONCAT(@ws_prefix, '-DH-', j.case_code)
JOIN chi_tiet_don_hang l ON l.don_hang_id = o.id
JOIN so_serial_san_pham s ON s.so_serial = CONCAT(@ws_prefix, '-SN-', j.case_code);

-- Supplier-supplied replacement, not shop inventory. Not activated/handed over yet.
INSERT INTO so_serial_san_pham
    (phien_ban_id, so_serial, trang_thai, don_hang_id, ngay_kich_hoat, han_bao_hanh)
VALUES (@ws_variant, CONCAT(@ws_prefix, '-SN-E04-NEW'), 'DANG_BAO_HANH', NULL, NULL, NULL);

INSERT INTO thiet_bi_bao_hanh
    (ma_theo_doi, chi_tiet_don_hang_id, phien_ban_id, so_serial_id,
     han_bao_hanh, dau_hieu_nhan_dang, ngay_tao, ngay_kich_hoat)
SELECT CONCAT(@ws_prefix, '-TB-E04-NEW'), original.chi_tiet_don_hang_id, @ws_variant,
       s.id, NULL, CONCAT(@ws_marker, '; E04 supplier replacement, not handed over'),
       '2026-10-12 09:35:00', NULL
FROM thiet_bi_bao_hanh original
JOIN so_serial_san_pham s ON s.so_serial = CONCAT(@ws_prefix, '-SN-E04-NEW')
WHERE original.ma_theo_doi = CONCAT(@ws_prefix, '-TB-E04');
SET @ws_replacement = (SELECT id FROM thiet_bi_bao_hanh WHERE ma_theo_doi = CONCAT(@ws_prefix, '-TB-E04-NEW'));

INSERT INTO phieu_bao_hanh
    (ma_phieu, don_hang_id, khach_hang_id, so_serial_id, nhan_vien_id,
     ly_do_bao_hanh, tinh_trang_tiep_nhan, don_vi_bao_hanh, trang_thai_xu_ly,
     ghi_chu, ngay_tiep_nhan, ngay_cap_nhat, thiet_bi_id, thiet_bi_thay_the_id,
     ket_luan_kiem_tra, ket_qua_xu_ly, trang_thai_bao_gia, phien_ban_bao_gia,
     nguon_san_pham_thay_the, ten_nguoi_lien_he, sdt_nguoi_lien_he, chi_phi_ncc_xac_nhan)
SELECT CONCAT(@ws_prefix, '-', j.case_code), o.id, NULL, d.so_serial_id, @ws_actor,
       CONCAT('TEST ', j.case_code, ': RAM không nhận tín hiệu'), 'Tem nguyên vẹn; nhận kèm một hộp',
       IF(j.case_code = 'E04', 'Đơn vị bảo hành giả lập', NULL),
       CASE j.case_code WHEN 'E01' THEN 'TIEP_NHAN' WHEN 'E02' THEN 'CHO_TRA_KHACH'
            WHEN 'E04' THEN 'CHO_DOI_SAN_PHAM' ELSE 'DANG_KIEM_TRA' END,
       @ws_marker, @ws_received, NOW(), d.id, IF(j.case_code = 'E04', @ws_replacement, NULL),
       IF(j.case_code = 'E02', '[TEST] Đã sửa, cần kiểm tra lại trước bàn giao', NULL),
       IF(j.case_code = 'E02', 'SUA_THANH_CONG', 'CHUA_CO_KET_QUA'), NULL, 1,
       IF(j.case_code = 'E04', 'DON_VI_BAO_HANH', NULL),
       'Nguyễn Văn An', '0912345678', NULL
FROM JSON_TABLE(@ws_cases, '$[*]' COLUMNS(case_code VARCHAR(3) PATH '$')) j
JOIN don_hang o ON o.ma_don_hang = CONCAT(@ws_prefix, '-DH-', j.case_code)
JOIN thiet_bi_bao_hanh d ON d.ma_theo_doi = CONCAT(@ws_prefix, '-TB-', j.case_code);

-- One physical intake event per case, matching the actual intake JSON contract.
INSERT INTO lich_su_bao_hanh
    (phieu_bao_hanh_id, nguoi_thuc_hien_id, loai_su_kien, noi_dung, du_lieu_chi_tiet, ngay_tao)
SELECT w.id, @ws_actor, 'TIEP_NHAN', CONCAT(@ws_marker, '; tiếp nhận ', RIGHT(w.ma_phieu, 3)),
       JSON_OBJECT(
           'seed_test', JSON_OBJECT('prefix', @ws_prefix, 'synthetic', JSON_EXTRACT('true', '$'), 'created_at', NOW()),
           'tiep_nhan', JSON_OBJECT('ngay_tiep_nhan_thuc_te', '2026-10-12T09:00:00+07:00',
               'dieu_kien_bao_hanh', 'CHUA_XAC_MINH', 'can_cu_xac_minh', '[TEST] Giao dịch giả lập đã giao',
               'phu_kien', JSON_ARRAY(JSON_OBJECT('ten', 'Hộp', 'so_luong', 1)), 'anh_urls', JSON_ARRAY(),
               'da_chap_thuan_phi', JSON_EXTRACT('false', '$'), 'ket_qua_tiep_nhan', 'CHAP_NHAN'),
           'thiet_bi', JSON_OBJECT('id', w.thiet_bi_id, 'phien_ban_id', CAST(@ws_variant AS UNSIGNED),
               'so_serial_id', w.so_serial_id, 'han_bao_hanh', '2028-09-15T09:00:00+07:00',
               'can_cu_tinh_han', '[TEST] Hạn đã lưu tại giao dịch gốc'),
           'noi_dang_giu', JSON_OBJECT('loai', 'CUA_HANG', 'ten', 'Cửa hàng', 'thiet_bi_id', w.thiet_bi_id),
           'giao_nhan', JSON_OBJECT('su_kien', 'TIEP_NHAN', 'thiet_bi_id', w.thiet_bi_id,
               'ngay', '2026-10-12T09:00:00+07:00', 'sai_lech', JSON_ARRAY())
       ), @ws_received
FROM phieu_bao_hanh w WHERE w.ma_phieu LIKE CONCAT(@ws_prefix, '-E0_');

-- E02-E06 have already started checking. E01 is left ready to test BAT_DAU_KIEM_TRA.
INSERT INTO lich_su_bao_hanh
    (phieu_bao_hanh_id, nguoi_thuc_hien_id, loai_su_kien, noi_dung, du_lieu_chi_tiet, ngay_tao)
SELECT w.id, @ws_actor, 'BAT_DAU_KIEM_TRA', CONCAT(@ws_marker, '; bắt đầu kiểm tra giả lập'),
       JSON_OBJECT('trang_thai', JSON_OBJECT('su_kien', 'BAT_DAU_KIEM_TRA',
           'thoi_diem', '2026-10-12T09:10:00+07:00', 'trang_thai_truoc', 'TIEP_NHAN',
           'trang_thai_sau', 'DANG_KIEM_TRA', 'ket_qua_truoc', 'CHUA_CO_KET_QUA',
           'ket_qua_sau', 'CHUA_CO_KET_QUA', 'sai_lech_da_xu_ly', JSON_ARRAY()), 'san_sang_tra', NULL),
       '2026-10-12 09:10:00'
FROM phieu_bao_hanh w WHERE w.ma_phieu LIKE CONCAT(@ws_prefix, '-E0_') AND RIGHT(w.ma_phieu, 3) <> 'E01';

-- E02 may go back to checking from CHO_TRA_KHACH; no handover happened.
INSERT INTO lich_su_bao_hanh
    (phieu_bao_hanh_id, nguoi_thuc_hien_id, loai_su_kien, noi_dung, du_lieu_chi_tiet, ngay_tao)
SELECT w.id, @ws_actor, 'SAN_SANG_TRA', CONCAT(@ws_marker, '; E02 sẵn sàng, chưa bàn giao'),
       JSON_OBJECT('trang_thai', JSON_OBJECT('su_kien', 'SAN_SANG_TRA',
           'thoi_diem', '2026-10-12T09:20:00+07:00', 'trang_thai_truoc', 'DANG_KIEM_TRA',
           'trang_thai_sau', 'CHO_TRA_KHACH', 'ket_qua_truoc', 'CHUA_CO_KET_QUA',
           'ket_qua_sau', 'SUA_THANH_CONG', 'thiet_bi_se_tra_id', w.thiet_bi_id,
           'sai_lech_da_xu_ly', JSON_ARRAY()),
           'san_sang_tra', JSON_OBJECT('su_kien', 'SAN_SANG_TRA', 'thoi_diem', '2026-10-12T09:20:00+07:00',
               'thiet_bi_se_tra_id', w.thiet_bi_id, 'ket_qua_sau', 'SUA_THANH_CONG',
               'tinh_trang', 'Hoạt động đúng', 'phu_kien', JSON_ARRAY(JSON_OBJECT('ten', 'Hộp', 'so_luong', 1)),
               'can_cu_kiem_tra', '[TEST] Đã test đạt', 'sai_lech_da_xu_ly', JSON_ARRAY())),
       '2026-10-12 09:20:00'
FROM phieu_bao_hanh w WHERE w.ma_phieu = CONCAT(@ws_prefix, '-E02');

-- E04: supplier keeps the original; approved replacement is physically at the shop.
-- Consent/approval are marked as test data. No invoice, payment or stock movement is invented.
INSERT INTO lich_su_bao_hanh
    (phieu_bao_hanh_id, nguoi_thuc_hien_id, loai_su_kien, noi_dung, du_lieu_chi_tiet, ngay_tao)
SELECT w.id, @ws_actor, 'PHUONG_AN_DOI', CONCAT(@ws_marker, '; E04 phương án đổi giả lập'),
       JSON_OBJECT('seed_test', JSON_OBJECT('prefix', @ws_prefix, 'synthetic', JSON_EXTRACT('true', '$')),
           'trang_thai', JSON_OBJECT('su_kien', 'PHUONG_AN_DOI', 'thoi_diem', '2026-10-12T09:30:00+07:00',
               'trang_thai_truoc', 'DANG_KIEM_TRA', 'trang_thai_sau', 'CHO_DOI_SAN_PHAM',
               'ket_qua_truoc', 'CHUA_CO_KET_QUA', 'ket_qua_sau', 'CHUA_CO_KET_QUA', 'sai_lech_da_xu_ly', JSON_ARRAY()),
           'phuong_an_doi', JSON_OBJECT('phien_ban', 1, 'thiet_bi_cu_id', w.thiet_bi_id,
               'thiet_bi_thay_the_id', w.thiet_bi_thay_the_id, 'nguon', 'DON_VI_BAO_HANH',
               'da_duyet', JSON_EXTRACT('true', '$'), 'khach_dong_y', JSON_EXTRACT('true', '$'),
               'da_huy', JSON_EXTRACT('false', '$'), 'da_ban_giao', JSON_EXTRACT('false', '$'),
               'han_bao_hanh_ap_dung', '2028-09-15T09:00:00+07:00',
               'can_cu', '[TEST ONLY] Phương án và đồng ý khách giả lập, không dùng nghiệp vụ thật',
               'phu_kien', JSON_ARRAY(JSON_OBJECT('ten', 'Hộp', 'so_luong', 1)))),
       '2026-10-12 09:30:00'
FROM phieu_bao_hanh w WHERE w.ma_phieu = CONCAT(@ws_prefix, '-E04');

INSERT INTO lich_su_bao_hanh
    (phieu_bao_hanh_id, nguoi_thuc_hien_id, loai_su_kien, noi_dung, du_lieu_chi_tiet, ngay_tao)
SELECT w.id, @ws_actor, 'NHAN_SAN_PHAM_THAY_THE', CONCAT(@ws_marker, '; E04 nhận sản phẩm thay thế giả lập'),
       JSON_OBJECT('noi_dang_giu', JSON_OBJECT('loai', 'CUA_HANG', 'ten', 'Cửa hàng', 'thiet_bi_id', w.thiet_bi_thay_the_id),
           'noi_dang_giu_thiet_bi_cu', JSON_OBJECT('loai', 'DON_VI_BAO_HANH', 'ten', 'Đơn vị bảo hành giả lập', 'thiet_bi_id', w.thiet_bi_id),
           'giao_nhan', JSON_OBJECT('su_kien', 'NHAN_SAN_PHAM_THAY_THE', 'thiet_bi_id', w.thiet_bi_thay_the_id,
               'ngay', '2026-10-12T09:35:00+07:00', 'sai_lech', JSON_ARRAY(),
               'phu_kien', JSON_ARRAY(JSON_OBJECT('ten', 'Hộp', 'so_luong', 1)))),
       '2026-10-12 09:35:00'
FROM phieu_bao_hanh w WHERE w.ma_phieu = CONCAT(@ws_prefix, '-E04');

-- Verify the complete fixture before committing. Any assertion error leaves this TX uncommitted.
SET @ws_guard = IF(
    (SELECT COUNT(*) FROM phieu_bao_hanh WHERE ma_phieu LIKE CONCAT(@ws_prefix, '-E0_')) = 6
    AND (SELECT COUNT(*) FROM thiet_bi_bao_hanh WHERE ma_theo_doi LIKE CONCAT(@ws_prefix, '-TB-%')) = 7
    AND (SELECT COUNT(*) FROM so_serial_san_pham WHERE so_serial LIKE CONCAT(@ws_prefix, '-SN-%')) = 7
    AND (SELECT COUNT(*) FROM lich_su_bao_hanh h JOIN phieu_bao_hanh w ON w.id = h.phieu_bao_hanh_id
         WHERE w.ma_phieu LIKE CONCAT(@ws_prefix, '-E0_')) = 14,
    'SELECT 1 AS all_six_status_fixtures_complete',
    'SELECT * FROM __ERROR_WARRANTY_STATUS_FIXTURE_INCOMPLETE_ROLLBACK_REQUIRED__'
);
PREPARE ws_assert FROM @ws_guard;
EXECUTE ws_assert;
DEALLOCATE PREPARE ws_assert;
COMMIT;

-- Use these actual IDs in Postman; device ID is NOT the warranty ticket ID.
SELECT RIGHT(w.ma_phieu, 3) AS test_case, w.id AS phieu_bao_hanh_id, w.ma_phieu,
       w.thiet_bi_id AS thiet_bi_goc_id,
       IFNULL(w.thiet_bi_thay_the_id, w.thiet_bi_id) AS thiet_bi_se_tra_id,
       w.trang_thai_xu_ly, w.ket_qua_xu_ly,
       CONCAT('/api/v1/admin/warranties/', w.id, '/status') AS patch_url
FROM phieu_bao_hanh w WHERE w.ma_phieu LIKE CONCAT(@ws_prefix, '-E0_') ORDER BY w.ma_phieu;
