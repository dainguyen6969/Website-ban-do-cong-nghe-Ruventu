-- TEST ONLY. Inserts independent fixtures; never resets/deletes existing warranty history.
-- User declined financial fixtures: NO invoice, customer deposit, supplier payment or cashbook row.
-- E05/E07/E14/E15 and output F03 therefore remain MOCK-ONLY until real prerequisite money exists.
-- E08SHOP additionally covers stopping work at the shop.
-- Synthetic completed purchase orders appear in order reports. No inventory/card/schema changes.
-- Run the entire file with stop-on-error. On any error ROLLBACK; do not manually COMMIT.
-- Reusing the namespace fails before inserting; use a new prefix for a new independent dataset.
USE dant_ruventu;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @we_prefix = 'BH-EV-261019';
SET @we_marker = CONCAT('[', @we_prefix, '] SYNTHETIC event fixture, no actual sale/payment/stock movement');
SET @we_actor = (SELECT MIN(u.id) FROM nguoi_dung u JOIN vai_tro v ON v.id=u.vai_tro_id WHERE v.ten_vai_tro='ADMIN' AND u.trang_thai=1);
SET @we_variant = (SELECT id FROM phien_ban_san_pham WHERE ma_vach='BH-TEST-261015-RAM-V1' AND co_quan_ly_serial=1);
SET @we_price = (SELECT gia_ban_le FROM phien_ban_san_pham WHERE id=@we_variant);
SET @we_cases = '[
 {"code":"E01","state":"DANG_KIEM_TRA","cost":null},
 {"code":"E02","state":"DANG_KIEM_TRA","cost":null},
 {"code":"E03","state":"DANG_KIEM_TRA","cost":100000},
 {"code":"E04","state":"DA_GUI_BAO_HANH","cost":100000},
 {"code":"E06","state":"DANG_KIEM_TRA","cost":null},
 {"code":"E08","state":"DANG_BAO_HANH","cost":100000},
 {"code":"E08SHOP","state":"DANG_KIEM_TRA","cost":null},
 {"code":"E09","state":"DANG_BAO_HANH","cost":100000},
 {"code":"E10","state":"DANG_BAO_HANH","cost":100000},
 {"code":"E11","state":"DANG_BAO_HANH","cost":100000},
 {"code":"E12","state":"DANG_BAO_HANH","cost":100000},
 {"code":"E13","state":"DANG_KIEM_TRA","cost":null},
 {"code":"E16","state":"DANG_KIEM_TRA","cost":null}
]';
SET @we_guard = IF(@we_actor IS NOT NULL AND @we_variant IS NOT NULL AND @we_price>0
 AND NOT EXISTS(SELECT 1 FROM don_hang WHERE ma_don_hang LIKE CONCAT(@we_prefix,'-%'))
 AND NOT EXISTS(SELECT 1 FROM phieu_bao_hanh WHERE ma_phieu LIKE CONCAT(@we_prefix,'-%'))
 AND NOT EXISTS(SELECT 1 FROM thiet_bi_bao_hanh WHERE ma_theo_doi LIKE CONCAT(@we_prefix,'-%'))
 AND NOT EXISTS(SELECT 1 FROM so_serial_san_pham WHERE so_serial LIKE CONCAT(@we_prefix,'-%'))
 AND NOT EXISTS(SELECT 1 FROM nha_cung_cap WHERE ma_nha_cung_cap=CONCAT(@we_prefix,'-NCC') OR so_dien_thoai='0992610191'),
 'SELECT 1 AS event_fixture_prerequisites_ok',
 'SELECT * FROM __ERROR_WARRANTY_EVENTS_PREFIX_EXISTS_OR_MISSING_PREREQUISITES__');
PREPARE we_assert FROM @we_guard; EXECUTE we_assert; DEALLOCATE PREPARE we_assert;
START TRANSACTION;

INSERT INTO nha_cung_cap(ma_nha_cung_cap,ten_nha_cung_cap,so_dien_thoai,email,dia_chi,trang_thai)
VALUES(CONCAT(@we_prefix,'-NCC'),'Trung tâm A - TEST Warranty Events','0992610191','bh-events-261019@example.invalid','[TEST] Đơn vị xử lý giả lập',1);
SET @we_supplier = (SELECT id FROM nha_cung_cap WHERE ma_nha_cung_cap=CONCAT(@we_prefix,'-NCC'));

INSERT INTO don_hang(ma_don_hang,loai_don_hang,khach_hang_id,nhan_vien_id,tong_tien_hang,tien_chiet_khau,phi_giao_hang,tong_thanh_toan,
 phuong_thuc_thanh_toan,trang_thai_thanh_toan,trang_thai_dong_goi,trang_thai_xuat_kho,trang_thai_don_hang,ten_nguoi_nhan,sdt_nguoi_nhan,ghi_chu,ngay_tao)
SELECT CONCAT(@we_prefix,'-DH-',j.case_code),'TAI_QUAY',NULL,@we_actor,@we_price,0,0,@we_price,
 'TIEN_MAT','DA_THANH_TOAN','DA_DONG_GOI','DA_XUAT_KHO','HOAN_THANH',CONCAT('TEST Events ',j.case_code),'0912345678',@we_marker,'2026-09-15 09:00:00'
FROM JSON_TABLE(@we_cases,'$[*]' COLUMNS(case_code VARCHAR(12) PATH '$.code')) j;

INSERT INTO chi_tiet_don_hang(don_hang_id,phien_ban_id,don_gia,so_luong,thanh_tien,la_qua_tang,tien_chiet_khau,thanh_toan_dong,cau_hinh_da_ban)
SELECT o.id,@we_variant,@we_price,1,@we_price,FALSE,0,@we_price,NULL FROM don_hang o WHERE o.ma_don_hang LIKE CONCAT(@we_prefix,'-DH-%');

INSERT INTO so_serial_san_pham(phien_ban_id,so_serial,trang_thai,don_hang_id,ngay_kich_hoat,han_bao_hanh)
SELECT @we_variant,CONCAT(@we_prefix,'-SN-',j.case_code),'DANG_BAO_HANH',o.id,'2026-09-15 09:00:00','2028-09-15 09:00:00'
FROM JSON_TABLE(@we_cases,'$[*]' COLUMNS(case_code VARCHAR(12) PATH '$.code')) j JOIN don_hang o ON o.ma_don_hang=CONCAT(@we_prefix,'-DH-',j.case_code);

INSERT INTO thiet_bi_bao_hanh(ma_theo_doi,chi_tiet_don_hang_id,phien_ban_id,so_serial_id,han_bao_hanh,dau_hieu_nhan_dang,ngay_tao,ngay_kich_hoat)
SELECT CONCAT(@we_prefix,'-TB-',j.case_code),l.id,@we_variant,s.id,'2028-09-15 09:00:00',CONCAT(@we_marker,'; ',j.case_code),'2026-10-12 09:00:00','2026-09-15 09:00:00'
FROM JSON_TABLE(@we_cases,'$[*]' COLUMNS(case_code VARCHAR(12) PATH '$.code')) j
JOIN don_hang o ON o.ma_don_hang=CONCAT(@we_prefix,'-DH-',j.case_code) JOIN chi_tiet_don_hang l ON l.don_hang_id=o.id
JOIN so_serial_san_pham s ON s.so_serial=CONCAT(@we_prefix,'-SN-',j.case_code);

INSERT INTO phieu_bao_hanh(ma_phieu,don_hang_id,khach_hang_id,so_serial_id,nhan_vien_id,ly_do_bao_hanh,tinh_trang_tiep_nhan,don_vi_bao_hanh,
 trang_thai_xu_ly,ghi_chu,ngay_tiep_nhan,ngay_cap_nhat,thiet_bi_id,ket_qua_xu_ly,phien_ban_bao_gia,ten_nguoi_lien_he,sdt_nguoi_lien_he,chi_phi_ncc_xac_nhan)
SELECT CONCAT(@we_prefix,'-',j.case_code),o.id,NULL,d.so_serial_id,@we_actor,CONCAT('[TEST] Kiểm tra sự kiện ',j.case_code),'Tem nguyên vẹn, kèm một hộp',
 'Trung tâm A - TEST Warranty Events',j.initial_state,@we_marker,'2026-10-12 09:00:00',NOW(),d.id,'CHUA_CO_KET_QUA',1,'Nguyễn Văn An','0912345678',j.provider_cost
FROM JSON_TABLE(@we_cases,'$[*]' COLUMNS(case_code VARCHAR(12) PATH '$.code',initial_state VARCHAR(50) PATH '$.state',provider_cost DECIMAL(15,2) PATH '$.cost')) j
JOIN don_hang o ON o.ma_don_hang=CONCAT(@we_prefix,'-DH-',j.case_code) JOIN thiet_bi_bao_hanh d ON d.ma_theo_doi=CONCAT(@we_prefix,'-TB-',j.case_code);

INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT w.id,@we_actor,'TIEP_NHAN',CONCAT(@we_marker,'; tiếp nhận'),
 JSON_OBJECT('seed_test',JSON_OBJECT('prefix',@we_prefix,'synthetic',JSON_EXTRACT('true','$')),
 'tiep_nhan',JSON_OBJECT('ngay_tiep_nhan_thuc_te','2026-10-12T09:00:00+07:00','dieu_kien_bao_hanh','CHUA_XAC_MINH','can_cu_xac_minh','[TEST] Giao dịch giả lập',
   'ket_qua_tiep_nhan','CHAP_NHAN','da_chap_thuan_phi',JSON_EXTRACT('false','$'),'phu_kien',JSON_ARRAY(JSON_OBJECT('ten','Hộp','so_luong',1)),'anh_urls',JSON_ARRAY()),
 'thiet_bi',JSON_OBJECT('id',w.thiet_bi_id,'phien_ban_id',CAST(@we_variant AS UNSIGNED),'so_serial_id',w.so_serial_id,'han_bao_hanh','2028-09-15T09:00:00+07:00'),
 'noi_dang_giu',JSON_OBJECT('loai','CUA_HANG','thiet_bi_id',w.thiet_bi_id),
 'giao_nhan',JSON_OBJECT('su_kien','TIEP_NHAN','thiet_bi_id',w.thiet_bi_id,'ngay','2026-10-12T09:00:00+07:00','sai_lech',JSON_ARRAY())),
 '2026-10-12 09:00:00' FROM phieu_bao_hanh w WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%');

INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT w.id,@we_actor,'BAT_DAU_KIEM_TRA',CONCAT(@we_marker,'; kiểm tra'),
 JSON_OBJECT('trang_thai',JSON_OBJECT('su_kien','BAT_DAU_KIEM_TRA','thoi_diem','2026-10-12T09:10:00+07:00','trang_thai_truoc','TIEP_NHAN','trang_thai_sau','DANG_KIEM_TRA',
 'ket_qua_truoc','CHUA_CO_KET_QUA','ket_qua_sau','CHUA_CO_KET_QUA','sai_lech_da_xu_ly',JSON_ARRAY()),'san_sang_tra',NULL),
 '2026-10-12 09:10:00' FROM phieu_bao_hanh w WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%');

-- Obligations are not actual payments; these seven snapshots do not post any cash.
INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT w.id,@we_actor,'GHI_CHI_PHI_DON_VI',CONCAT(@we_marker,'; nghĩa vụ NCC chưa chi'),
 JSON_OBJECT('bao_phi_don_vi',JSON_OBJECT('nha_cung_cap_id',CAST(@we_supplier AS UNSIGNED),'da_xac_nhan',JSON_EXTRACT('true','$'),
 'tong_bao_phi',w.chi_phi_ncc_xac_nhan,'can_cu','[TEST] Chưa có tiền thực chi',
 'hang_muc',JSON_ARRAY(JSON_OBJECT('ma_hang_muc','HM01','chi_phi',w.chi_phi_ncc_xac_nhan,'ben_chiu_phi','KHACH_HANG')))),
 '2026-10-12 09:20:00' FROM phieu_bao_hanh w WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%') AND w.chi_phi_ncc_xac_nhan IS NOT NULL;

INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT w.id,@we_actor,'GHI_KET_LUAN',CONCAT(@we_marker,'; HM_FREE đã xác minh miễn phí'),
 JSON_OBJECT('ket_luan',JSON_OBJECT('noi_dung','[TEST] Hạng mục đủ điều kiện miễn phí','hang_muc',JSON_ARRAY(JSON_OBJECT(
 'ma_hang_muc','HM_FREE','loi','Lỗi thuộc chính sách','dieu_kien_bao_hanh','DU_DIEU_KIEN','noi_dung_xu_ly','Xử lý miễn phí',
 'ben_chiu_phi','DON_VI_BAO_HANH','ly_do','Trong phạm vi bảo hành','can_cu','[TEST] Biên bản xác minh miễn phí','don_vi_ket_luan','Trung tâm A')),'bang_chung_urls',JSON_ARRAY())),
 '2026-10-12 09:20:00' FROM phieu_bao_hanh w WHERE w.ma_phieu=CONCAT(@we_prefix,'-E06');

INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT w.id,@we_actor,'GUI_DON_VI',CONCAT(@we_marker,'; thực gửi giả lập'),
 JSON_OBJECT('thoi_diem','2026-10-12T10:00:00+07:00',
 'giao_nhan',JSON_OBJECT('su_kien','GUI_DON_VI','thiet_bi_id',w.thiet_bi_id,'nha_cung_cap_id',CAST(@we_supplier AS UNSIGNED),'ngay','2026-10-12T10:00:00+07:00',
   'phu_kien',JSON_ARRAY(JSON_OBJECT('ten','Hộp','so_luong',1)),'chung_tu_urls',JSON_ARRAY('/media/bh/test/send.jpg'),'da_gui_thuc_te',JSON_EXTRACT('true','$'),'don_vi_da_xac_nhan_nhan',JSON_EXTRACT('false','$')),
 'noi_dang_giu',JSON_OBJECT('loai','DANG_VAN_CHUYEN','thiet_bi_id',w.thiet_bi_id,'nha_cung_cap_id',CAST(@we_supplier AS UNSIGNED))),
 '2026-10-12 10:00:00' FROM phieu_bao_hanh w WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%') AND w.trang_thai_xu_ly IN ('DA_GUI_BAO_HANH','DANG_BAO_HANH');

INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT w.id,@we_actor,'DON_VI_TIEP_NHAN',CONCAT(@we_marker,'; đơn vị tiếp nhận giả lập'),
 JSON_OBJECT('thoi_diem','2026-10-12T10:30:00+07:00',
 'giao_nhan',JSON_OBJECT('su_kien','DON_VI_TIEP_NHAN','lan_gui_lich_su_id',s.id,'thiet_bi_id',w.thiet_bi_id,'ngay','2026-10-12T10:30:00+07:00','da_tiep_nhan',JSON_EXTRACT('true','$')),
 'noi_dang_giu',JSON_OBJECT('loai','DON_VI_BAO_HANH','thiet_bi_id',w.thiet_bi_id,'nha_cung_cap_id',CAST(@we_supplier AS UNSIGNED))),
 '2026-10-12 10:30:00' FROM phieu_bao_hanh w JOIN lich_su_bao_hanh s ON s.phieu_bao_hanh_id=w.id AND s.loai_su_kien='GUI_DON_VI'
WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%') AND w.trang_thai_xu_ly='DANG_BAO_HANH';

SET @we_guard=IF((SELECT COUNT(*) FROM phieu_bao_hanh WHERE ma_phieu LIKE CONCAT(@we_prefix,'-%'))=13
 AND (SELECT COUNT(*) FROM thiet_bi_bao_hanh WHERE ma_theo_doi LIKE CONCAT(@we_prefix,'-%'))=13
 AND (SELECT COUNT(*) FROM lich_su_bao_hanh h JOIN phieu_bao_hanh w ON w.id=h.phieu_bao_hanh_id WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%'))=45
 AND NOT EXISTS(SELECT 1 FROM hoa_don_bao_hanh i JOIN phieu_bao_hanh w ON w.id=i.phieu_bao_hanh_id WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%'))
 AND NOT EXISTS(SELECT 1 FROM so_quy_thu_chi c JOIN phieu_bao_hanh w ON w.id=c.phieu_bao_hanh_id WHERE w.ma_phieu LIKE CONCAT(@we_prefix,'-%')),
 'SELECT 1 AS thirteen_nonfinancial_fixtures_complete',
 'SELECT * FROM __ERROR_EVENTS_FIXTURE_INCOMPLETE_ROLLBACK_REQUIRED__');
PREPARE we_assert FROM @we_guard; EXECUTE we_assert; DEALLOCATE PREPARE we_assert;
COMMIT;

SELECT j.case_code AS test_case,w.id AS phieu_bao_hanh_id,w.thiet_bi_id,@we_supplier AS nha_cung_cap_id,s.so_serial,
 (SELECT MIN(h.id) FROM lich_su_bao_hanh h WHERE h.phieu_bao_hanh_id=w.id AND h.loai_su_kien='GUI_DON_VI') AS lan_gui_lich_su_id,
 (SELECT MIN(h.id) FROM lich_su_bao_hanh h WHERE h.phieu_bao_hanh_id=w.id AND h.loai_su_kien='GHI_KET_LUAN') AS ket_luan_lich_su_id,
 w.trang_thai_xu_ly,CONCAT('/api/v1/admin/warranties/',w.id,'/events') AS post_url
FROM JSON_TABLE(@we_cases,'$[*]' COLUMNS(case_code VARCHAR(12) PATH '$.code')) j
JOIN phieu_bao_hanh w ON w.ma_phieu=CONCAT(@we_prefix,'-',j.case_code)
JOIN so_serial_san_pham s ON s.id=w.so_serial_id ORDER BY j.case_code;
