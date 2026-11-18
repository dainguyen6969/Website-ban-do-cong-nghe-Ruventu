-- Five persisted intake fixtures linked to existing catalog variants and test customer.
-- Orders carry catalog prices with a 100% test discount: no revenue/cashbook posting.
-- Never reset a fixture already used by a warranty ticket.
SET NAMES utf8mb4;
SET @bh_date=DATE_SUB(NOW(),INTERVAL 1 DAY);
SET @bh_actor=(SELECT MIN(u.id) FROM nguoi_dung u JOIN vai_tro r ON r.id=u.vai_tro_id WHERE r.ten_vai_tro='ADMIN' AND u.trang_thai=1);
SET @bh_customer=(SELECT id FROM nguoi_dung WHERE email='pos-631724e7-5fd9-49c5-8d6b-0aa40592ef10@ruventu.local');
START TRANSACTION;
INSERT INTO don_hang(ma_don_hang,loai_don_hang,khach_hang_id,nhan_vien_id,tong_tien_hang,tien_chiet_khau,phi_giao_hang,tong_thanh_toan,phuong_thuc_thanh_toan,trang_thai_thanh_toan,trang_thai_dong_goi,trang_thai_xuat_kho,trang_thai_don_hang,ten_nguoi_nhan,sdt_nguoi_nhan,ghi_chu,ngay_tao,ngay_hoan_thanh,da_giu_hang)
SELECT CONCAT('BH-LK-261029-',LPAD(j.n,2,'0')),'TAI_QUAY',u.id,@bh_actor,v.gia_ban_le,v.gia_ban_le,0,0,'TIEN_MAT','DA_THANH_TOAN','DA_DONG_GOI','DA_XUAT_KHO','HOAN_THANH',u.ho_ten,u.so_dien_thoai,'[DU LIEU KIEM THU BAO HANH] Liên kết sản phẩm có sẵn, giảm 100%, không thu tiền; không dùng tính doanh thu bán thực.',@bh_date,@bh_date,FALSE
FROM JSON_TABLE('[1,2,3,4,5]','$[*]' COLUMNS(n INT PATH '$')) j
JOIN phien_ban_san_pham v ON v.id=IF(MOD(j.n,2)=1,541,542)
JOIN nguoi_dung u ON u.id=@bh_customer
WHERE NOT EXISTS(SELECT 1 FROM don_hang d WHERE d.ma_don_hang=CONCAT('BH-LK-261029-',LPAD(j.n,2,'0')));
INSERT INTO chi_tiet_don_hang(don_hang_id,phien_ban_id,don_gia,so_luong,thanh_tien,la_qua_tang,tien_chiet_khau,thanh_toan_dong)
SELECT d.id,v.id,v.gia_ban_le,1,v.gia_ban_le,FALSE,v.gia_ban_le,0
FROM don_hang d JOIN phien_ban_san_pham v ON v.id=IF(MOD(CAST(RIGHT(d.ma_don_hang,2) AS UNSIGNED),2)=1,541,542)
WHERE d.ma_don_hang REGEXP '^BH-LK-261029-0[1-5]$' AND NOT EXISTS(SELECT 1 FROM chi_tiet_don_hang l WHERE l.don_hang_id=d.id);
INSERT INTO so_serial_san_pham(phien_ban_id,so_serial,trang_thai,tinh_trang_hang,don_hang_id,ngay_kich_hoat,han_bao_hanh)
SELECT l.phien_ban_id,CONCAT('BH-LK-261029-SN-',RIGHT(d.ma_don_hang,2)),'DA_BAN','MOI',d.id,d.ngay_hoan_thanh,DATE_ADD(d.ngay_hoan_thanh,INTERVAL p.thoi_han_bao_hanh_thang MONTH)
FROM don_hang d JOIN chi_tiet_don_hang l ON l.don_hang_id=d.id JOIN phien_ban_san_pham v ON v.id=l.phien_ban_id JOIN san_pham p ON p.id=v.san_pham_id
WHERE d.ma_don_hang REGEXP '^BH-LK-261029-0[1-5]$' AND NOT EXISTS(SELECT 1 FROM so_serial_san_pham s WHERE s.so_serial=CONCAT('BH-LK-261029-SN-',RIGHT(d.ma_don_hang,2)));
INSERT INTO thiet_bi_bao_hanh(ma_theo_doi,chi_tiet_don_hang_id,phien_ban_id,so_serial_id,ngay_kich_hoat,han_bao_hanh,dau_hieu_nhan_dang,ngay_tao)
SELECT CONCAT('BH-LK-261029-TB-',RIGHT(s.so_serial,2)),l.id,s.phien_ban_id,s.id,s.ngay_kich_hoat,s.han_bao_hanh,CONCAT('[KIEM THU] Tem serial ',s.so_serial),NOW()
FROM so_serial_san_pham s JOIN chi_tiet_don_hang l ON l.don_hang_id=s.don_hang_id AND l.phien_ban_id=s.phien_ban_id
WHERE s.so_serial REGEXP '^BH-LK-261029-SN-0[1-5]$' AND NOT EXISTS(SELECT 1 FROM thiet_bi_bao_hanh t WHERE t.so_serial_id=s.id);
UPDATE chi_tiet_don_hang l JOIN don_hang d ON d.id=l.don_hang_id JOIN phien_ban_san_pham v ON v.id=l.phien_ban_id JOIN san_pham p ON p.id=v.san_pham_id JOIN thiet_bi_bao_hanh t ON t.chi_tiet_don_hang_id=l.id JOIN so_serial_san_pham s ON s.id=t.so_serial_id
SET l.cau_hinh_da_ban=JSON_OBJECT('phien_ban_snapshot',1,'ma_dong',d.ma_don_hang,'phien_ban_id',v.id,'so_luong',1,'ma_san_pham',p.ma_san_pham,'ten_san_pham',p.ten_san_pham,'ten_phien_ban',v.ten_phien_ban,'loai_san_pham',p.loai_san_pham,'quan_ly_serial',TRUE,'thoi_han_bao_hanh_thang',p.thoi_han_bao_hanh_thang,'ap_dung_vat',FALSE,'che_do_gia','CHUA_VAT','thue_vat',0,'thanh_phan',JSON_ARRAY(),'thiet_bi_da_xuat',JSON_ARRAY(JSON_OBJECT('thiet_bi_id',t.id,'ma_theo_doi',t.ma_theo_doi,'chi_tiet_don_hang_id',l.id,'phien_ban_id',v.id,'ten_san_pham',p.ten_san_pham,'ten_phien_ban',v.ten_phien_ban,'so_serial_id',s.id,'so_serial',s.so_serial,'thoi_han_bao_hanh_thang',p.thoi_han_bao_hanh_thang,'ngay_kich_hoat',DATE_FORMAT(t.ngay_kich_hoat,'%Y-%m-%dT%H:%i:%s+07:00'),'han_bao_hanh',DATE_FORMAT(t.han_bao_hanh,'%Y-%m-%dT%H:%i:%s+07:00'))))
WHERE d.ma_don_hang REGEXP '^BH-LK-261029-0[1-5]$' AND l.cau_hinh_da_ban IS NULL;
COMMIT;
