-- Five persisted warranty intake samples. No warranty tickets are created.
-- Clearly marked zero-value sample orders; no cashbook or inventory balances are changed.
-- Re-running adds missing records only and never resets a serial already used for warranty.
SET NAMES utf8mb4;
SET @mau_rows='[1,2,3,4,5]';
SET @mau_ngay=DATE_SUB(NOW(), INTERVAL 1 DAY);
SET @mau_han=DATE_ADD(@mau_ngay, INTERVAL 24 MONTH);
SET @mau_category=(SELECT MIN(id) FROM danh_muc WHERE trang_thai=1);
SET @mau_brand=(SELECT MIN(id) FROM thuong_hieu WHERE trang_thai=1);
SET @mau_actor=(SELECT MIN(u.id) FROM nguoi_dung u JOIN vai_tro r ON r.id=u.vai_tro_id WHERE r.ten_vai_tro='ADMIN' AND u.trang_thai=1);
START TRANSACTION;
INSERT INTO san_pham(ma_san_pham,ten_san_pham,mo_ta,thong_so_ky_thuat,loai_san_pham,thue_vat,trang_thai,danh_muc_id,thuong_hieu_id,thoi_han_bao_hanh_thang)
SELECT 'BH-MAU-261029','Thiết bị mẫu để lập phiếu bảo hành 29/10/2026','[DU LIEU MAU] 5 bộ hồ sơ dùng thử tiếp nhận bảo hành; không phải doanh thu thực.',JSON_OBJECT('muc_dich','Mẫu lập phiếu bảo hành'),'DON',0,0,@mau_category,@mau_brand,24
WHERE NOT EXISTS(SELECT 1 FROM san_pham WHERE ma_san_pham='BH-MAU-261029');
SET @mau_product=(SELECT id FROM san_pham WHERE ma_san_pham='BH-MAU-261029');
INSERT INTO phien_ban_san_pham(san_pham_id,ten_phien_ban,ma_vach,gia_ban_le,gia_nhap,khoi_luong,trang_thai,co_quan_ly_serial)
SELECT @mau_product,'Mẫu có serial, bảo hành 24 tháng','BH-MAU-261029-V1',0,0,0.1,0,TRUE
WHERE NOT EXISTS(SELECT 1 FROM phien_ban_san_pham WHERE ma_vach='BH-MAU-261029-V1');
SET @mau_variant=(SELECT id FROM phien_ban_san_pham WHERE ma_vach='BH-MAU-261029-V1');
INSERT INTO don_hang(ma_don_hang,loai_don_hang,khach_hang_id,nhan_vien_id,tong_tien_hang,tien_chiet_khau,phi_giao_hang,tong_thanh_toan,phuong_thuc_thanh_toan,trang_thai_thanh_toan,trang_thai_dong_goi,trang_thai_xuat_kho,trang_thai_don_hang,ten_nguoi_nhan,sdt_nguoi_nhan,ghi_chu,ngay_tao,ngay_hoan_thanh)
SELECT CONCAT('BH-MAU-261029-',LPAD(j.n,2,'0')),'TAI_QUAY',NULL,@mau_actor,0,0,0,0,'TIEN_MAT','DA_THANH_TOAN','DA_DONG_GOI','DA_XUAT_KHO','HOAN_THANH',CONCAT('Khách mẫu bảo hành ',LPAD(j.n,2,'0')),CONCAT('099102900',j.n),'[DU LIEU MAU] Đơn 0 đồng dùng thử lập phiếu bảo hành, không phát sinh thu tiền.',@mau_ngay,@mau_ngay
FROM JSON_TABLE(@mau_rows,'$[*]' COLUMNS(n INT PATH '$')) j
WHERE NOT EXISTS(SELECT 1 FROM don_hang d WHERE d.ma_don_hang=CONCAT('BH-MAU-261029-',LPAD(j.n,2,'0')));
INSERT INTO chi_tiet_don_hang(don_hang_id,phien_ban_id,don_gia,so_luong,thanh_tien,la_qua_tang,tien_chiet_khau,thanh_toan_dong,cau_hinh_da_ban)
SELECT d.id,@mau_variant,0,1,0,FALSE,0,0,NULL FROM don_hang d WHERE d.ma_don_hang REGEXP '^BH-MAU-261029-0[1-5]$'
AND NOT EXISTS(SELECT 1 FROM chi_tiet_don_hang l WHERE l.don_hang_id=d.id);
INSERT INTO so_serial_san_pham(phien_ban_id,so_serial,trang_thai,tinh_trang_hang,don_hang_id,ngay_kich_hoat,han_bao_hanh)
SELECT @mau_variant,CONCAT('BH-MAU-261029-SN-',LPAD(j.n,2,'0')),'DA_BAN','MOI',d.id,d.ngay_hoan_thanh,DATE_ADD(d.ngay_hoan_thanh,INTERVAL 24 MONTH)
FROM JSON_TABLE(@mau_rows,'$[*]' COLUMNS(n INT PATH '$')) j JOIN don_hang d ON d.ma_don_hang=CONCAT('BH-MAU-261029-',LPAD(j.n,2,'0'))
WHERE NOT EXISTS(SELECT 1 FROM so_serial_san_pham s WHERE s.so_serial=CONCAT('BH-MAU-261029-SN-',LPAD(j.n,2,'0')));
INSERT INTO thiet_bi_bao_hanh(ma_theo_doi,chi_tiet_don_hang_id,phien_ban_id,so_serial_id,ngay_kich_hoat,han_bao_hanh,dau_hieu_nhan_dang,ngay_tao)
SELECT CONCAT('BH-MAU-261029-TB-',RIGHT(s.so_serial,2)),l.id,@mau_variant,s.id,s.ngay_kich_hoat,s.han_bao_hanh,CONCAT('[MAU] Tem thiết bị ',s.so_serial),NOW()
FROM so_serial_san_pham s JOIN chi_tiet_don_hang l ON l.don_hang_id=s.don_hang_id AND l.phien_ban_id=s.phien_ban_id
WHERE s.so_serial REGEXP '^BH-MAU-261029-SN-0[1-5]$'
AND NOT EXISTS(SELECT 1 FROM thiet_bi_bao_hanh t WHERE t.so_serial_id=s.id);
UPDATE chi_tiet_don_hang l JOIN don_hang d ON d.id=l.don_hang_id JOIN thiet_bi_bao_hanh t ON t.chi_tiet_don_hang_id=l.id JOIN so_serial_san_pham s ON s.id=t.so_serial_id
SET l.cau_hinh_da_ban=JSON_OBJECT('phien_ban_snapshot',1,'ma_dong',d.ma_don_hang,'phien_ban_id',l.phien_ban_id,'so_luong',1,'ma_san_pham','BH-MAU-261029','ten_san_pham','Thiết bị mẫu để lập phiếu bảo hành 29/10/2026','ten_phien_ban','Mẫu có serial, bảo hành 24 tháng','loai_san_pham','DON','quan_ly_serial',TRUE,'thoi_han_bao_hanh_thang',24,'ap_dung_vat',FALSE,'che_do_gia','CHUA_VAT','thue_vat',0,'thanh_phan',JSON_ARRAY(),'thiet_bi_da_xuat',JSON_ARRAY(JSON_OBJECT('thiet_bi_id',t.id,'ma_theo_doi',t.ma_theo_doi,'chi_tiet_don_hang_id',l.id,'phien_ban_id',l.phien_ban_id,'ten_san_pham','Thiết bị mẫu để lập phiếu bảo hành 29/10/2026','ten_phien_ban','Mẫu có serial, bảo hành 24 tháng','so_serial_id',s.id,'so_serial',s.so_serial,'thoi_han_bao_hanh_thang',24,'ngay_kich_hoat',DATE_FORMAT(t.ngay_kich_hoat,'%Y-%m-%dT%H:%i:%s+07:00'),'han_bao_hanh',DATE_FORMAT(t.han_bao_hanh,'%Y-%m-%dT%H:%i:%s+07:00'))))
WHERE d.ma_don_hang REGEXP '^BH-MAU-261029-0[1-5]$' AND l.cau_hinh_da_ban IS NULL;
COMMIT;
