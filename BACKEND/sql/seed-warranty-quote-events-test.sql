-- TEST ONLY: four independent draft quotes on existing synthetic tickets.
-- No invoice, cash voucher, stock movement, schema change, delete or history reset.
-- Run the entire file with stop-on-error; on any error ROLLBACK, never manually COMMIT.
-- Existing quotes on tickets 28/32/40 are deliberately untouched.
USE dant_ruventu;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @qev_marker = '[BH-QEV-261020]';
SET @qev_actor = (SELECT MIN(u.id) FROM nguoi_dung u JOIN vai_tro r ON r.id=u.vai_tro_id WHERE r.ten_vai_tro='ADMIN' AND u.trang_thai=1);
SET @qev_deadline = '2026-11-20T23:59:59+07:00';
SET @qev_cases = '[
 {"ticket":29,"ma":"BH-EV-261019-E02","code":"HM01","amount":150000,"description":"Sửa chân tiếp xúc"},
 {"ticket":30,"ma":"BH-EV-261019-E03","code":"HM01","amount":150000,"description":"Sửa chân tiếp xúc"},
 {"ticket":34,"ma":"BH-EV-261019-E08SHOP","code":"HM_CHECK","amount":50000,"description":"Phí kiểm tra đã chấp thuận trước"},
 {"ticket":39,"ma":"BH-EV-261019-E13","code":"HM01","amount":150000,"description":"Sửa chân tiếp xúc"}
]';
START TRANSACTION;
SELECT w.id FROM phieu_bao_hanh w WHERE w.id IN(29,30,34,39) ORDER BY w.id FOR UPDATE;
SET @qev_ok = @qev_actor IS NOT NULL AND
 (SELECT COUNT(*) FROM phieu_bao_hanh w
 JOIN JSON_TABLE(@qev_cases,'$[*]' COLUMNS(ticket BIGINT PATH '$.ticket',ma VARCHAR(50) PATH '$.ma')) j ON j.ticket=w.id AND j.ma=w.ma_phieu
 WHERE w.trang_thai_xu_ly='DANG_KIEM_TRA' AND w.trang_thai_bao_gia IS NULL AND w.phien_ban_bao_gia=1)=4
 AND NOT EXISTS(SELECT 1 FROM chi_tiet_phi_bao_hanh WHERE phieu_bao_hanh_id IN(29,30,34,39))
 AND NOT EXISTS(SELECT 1 FROM hoa_don_bao_hanh WHERE phieu_bao_hanh_id IN(29,30,34,39))
 AND NOT EXISTS(SELECT 1 FROM lich_su_bao_hanh WHERE phieu_bao_hanh_id IN(29,30,34,39) AND JSON_CONTAINS_PATH(du_lieu_chi_tiet,'one','$.bao_gia')=1)
 AND NOT EXISTS(SELECT 1 FROM lich_su_bao_hanh WHERE noi_dung LIKE CONCAT(@qev_marker,'%'));
SET @qev_guard = IF(@qev_ok,'SELECT 1 AS quote_event_seed_prerequisites_ok','SELECT * FROM __ERROR_QUOTE_EVENT_TEST_PREREQUISITES_CHANGED__');
PREPARE qev_assert FROM @qev_guard; EXECUTE qev_assert; DEALLOCATE PREPARE qev_assert;

-- Add new conclusions, keeping every old conclusion (including ticket 29's old ID 104).
INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT j.ticket,@qev_actor,'GHI_KET_LUAN',CONCAT(@qev_marker,' Kết luận chuẩn bị test sự kiện báo giá'),
 JSON_OBJECT('ket_luan',JSON_OBJECT('noi_dung',CONCAT(@qev_marker,' Kết luận theo hạng mục'),
 'hang_muc',JSON_MERGE_PRESERVE(
 JSON_ARRAY(JSON_OBJECT('ma_hang_muc',j.code,'loi','Lỗi ngoài phạm vi miễn phí','dieu_kien_bao_hanh','KHONG_DU_DIEU_KIEN',
 'noi_dung_xu_ly',j.description,'ben_chiu_phi','KHACH_HANG','ly_do','Dịch vụ có phí',
 'can_cu',CONCAT(@qev_marker,' Biên bản kiểm tra giả lập'),'don_vi_ket_luan','Trung tâm A')),
 IF(j.ticket=34,JSON_ARRAY(JSON_OBJECT('ma_hang_muc','HM01','loi','Hỏng chân tiếp xúc','dieu_kien_bao_hanh','KHONG_DU_DIEU_KIEN',
 'noi_dung_xu_ly','Sửa chân tiếp xúc','ben_chiu_phi','KHACH_HANG','ly_do','Đề nghị sửa bổ sung',
 'can_cu',CONCAT(@qev_marker,' Biên bản kiểm tra giả lập'),'don_vi_ket_luan','Trung tâm A')),JSON_ARRAY())),
 'bang_chung_urls',JSON_ARRAY('/media/bh/test-quote-events/conclusion.jpg'))),NOW()
FROM JSON_TABLE(@qev_cases,'$[*]' COLUMNS(ticket BIGINT PATH '$.ticket',code VARCHAR(100) PATH '$.code',description VARCHAR(255) PATH '$.description')) j;
UPDATE lich_su_bao_hanh SET du_lieu_chi_tiet=JSON_SET(du_lieu_chi_tiet,'$.ket_luan.lich_su_id',id)
WHERE phieu_bao_hanh_id IN(29,30,34,39) AND loai_su_kien='GHI_KET_LUAN' AND noi_dung=CONCAT(@qev_marker,' Kết luận chuẩn bị test sự kiện báo giá');
SET @qev_conclusions = (SELECT JSON_OBJECTAGG(phieu_bao_hanh_id,id) FROM lich_su_bao_hanh
 WHERE phieu_bao_hanh_id IN(29,30,34,39) AND loai_su_kien='GHI_KET_LUAN'
 AND noi_dung=CONCAT(@qev_marker,' Kết luận chuẩn bị test sự kiện báo giá'));

INSERT INTO chi_tiet_phi_bao_hanh(phieu_bao_hanh_id,phien_ban_bao_gia,noi_dung,so_luong,don_gia_khach,thanh_tien_khach,chi_phi_ncc_du_kien,dieu_kien_bao_hanh)
SELECT j.ticket,1,j.description,1,j.amount,j.amount,IF(j.ticket=34,0,100000),'KHONG_DU_DIEU_KIEN'
FROM JSON_TABLE(@qev_cases,'$[*]' COLUMNS(ticket BIGINT PATH '$.ticket',amount DECIMAL(15,2) PATH '$.amount',description VARCHAR(255) PATH '$.description')) j;

INSERT INTO lich_su_bao_hanh(phieu_bao_hanh_id,nguoi_thuc_hien_id,loai_su_kien,noi_dung,du_lieu_chi_tiet,ngay_tao)
SELECT j.ticket,@qev_actor,'LAP_BAO_GIA',CONCAT(@qev_marker,' Báo giá nháp chuẩn bị test'),
 JSON_OBJECT('bao_gia',JSON_OBJECT('phien_ban',1,'trang_thai','NHAP','thay_the_phien_ban',NULL,
 'ket_luan_lich_su_id',CAST(JSON_UNQUOTE(JSON_EXTRACT(@qev_conclusions,CONCAT('$."',j.ticket,'"'))) AS UNSIGNED),
 'hang_muc',JSON_ARRAY(JSON_OBJECT('id',f.id,'ma_hang_muc',j.code,'noi_dung',f.noi_dung,'so_luong',f.so_luong,
 'don_gia_khach',f.don_gia_khach,'thanh_tien_khach',f.thanh_tien_khach,'chi_phi_ncc_du_kien',f.chi_phi_ncc_du_kien,
 'dieu_kien_bao_hanh',f.dieu_kien_bao_hanh,'ben_chiu_phi','KHACH_HANG',
 'van_phat_sinh_khi_khong_sua',JSON_EXTRACT(IF(j.ticket=34,'true','false'),'$'))),
 'tong_tien_khach',f.thanh_tien_khach,'thoi_gian_du_kien','Trong ngày','han_phan_hoi',@qev_deadline,
 'dieu_kien_dat_coc',JSON_OBJECT('so_tien_toi_thieu',0),'dieu_kien_thanh_toan','Đủ tiền trước bàn giao',
 'quyet_dinh',NULL,'ly_do',CONCAT(@qev_marker,' Chuẩn bị test, chưa gửi/chưa chấp thuận/chưa thu'))),NOW()
FROM JSON_TABLE(@qev_cases,'$[*]' COLUMNS(ticket BIGINT PATH '$.ticket',code VARCHAR(100) PATH '$.code')) j
JOIN chi_tiet_phi_bao_hanh f ON f.phieu_bao_hanh_id=j.ticket AND f.phien_ban_bao_gia=1;
UPDATE phieu_bao_hanh SET trang_thai_bao_gia='NHAP',ngay_cap_nhat=NOW() WHERE id IN(29,30,34,39);
COMMIT;

SELECT w.id,w.ma_phieu,w.phien_ban_bao_gia,w.trang_thai_bao_gia,
 (SELECT MAX(h.id) FROM lich_su_bao_hanh h WHERE h.phieu_bao_hanh_id=w.id AND h.loai_su_kien='GHI_KET_LUAN') AS ket_luan_lich_su_id
FROM phieu_bao_hanh w WHERE w.id IN(29,30,34,39) ORDER BY w.id;
SELECT COUNT(*) AS invoice_count FROM hoa_don_bao_hanh;
SELECT COUNT(*) AS cash_count,COALESCE(SUM(so_tien),0) AS cash_sum FROM so_quy_thu_chi;
