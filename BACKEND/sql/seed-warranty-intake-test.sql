-- Du lieu gia lap rieng cho POST /api/v1/admin/warranties.
-- 10 bo = 10 don + 10 dong mua + 10 thiet bi (5 serial, 5 khong serial).
-- Moi dong khong serial mua 2 chiec, moi lap ho so 1 chiec: con 1 quyen de test tao ho so moi.
-- Khong tao phieu BH san, tranh khoa thiet bi truoc khi ban goi API.
-- Khong tao/sua kho, ton_kho, the_kho, so_quy_thu_chi hay hoa don.
-- Don mo phong HOAN_THANH/DA_XUAT_KHO se xuat hien trong bao cao don hang.
-- San pham/phien ban seed NGUNG HOAT DONG de khong chen vao catalog dang ban;
-- quyen bao hanh cua giao dich lich su van duoc tiep nhan theo code hien tai.
-- Chay fix-warranty-nullable-links.sql truoc neu hai FK phieu_bao_hanh con NOT NULL.
-- Chay ca file, khong chon le cac INSERT. Loi bat ky: ROLLBACK, khong COMMIT thu cong.
-- Co the chay lai: chi INSERT khi chua co ma/email; khong reset serial/ho so da test.
USE dant_ruventu;
SET NAMES utf8mb4;
SET @bh_test_rows = '[1,2,3,4,5,6,7,8,9,10]';
SET @bh_test_mua = '2026-09-15 09:00:00';
SET @bh_test_han = DATE_ADD(@bh_test_mua, INTERVAL 24 MONTH);
SET @bh_test_marker = '[BH-TEST-261015] Du lieu gia lap test bao hanh, khong phat sinh ban/thu tien/xuat kho that';
SET @bh_test_role = (SELECT MIN(id) FROM vai_tro WHERE ten_vai_tro = 'USER');
SET @bh_test_actor = (
    SELECT MIN(u.id) FROM nguoi_dung u JOIN vai_tro v ON v.id = u.vai_tro_id
    WHERE v.ten_vai_tro = 'ADMIN' AND u.trang_thai = 1
);
SET @bh_test_ram_category = (SELECT id FROM danh_muc WHERE duong_dan_url = 'pcb-demo-ram');
SET @bh_test_mouse_category = (SELECT id FROM danh_muc WHERE duong_dan_url = 'pcb-demo-chuot');
SET @bh_test_brand = (SELECT MIN(id) FROM thuong_hieu WHERE trang_thai = 1);

START TRANSACTION;

INSERT INTO nguoi_dung
    (ho_ten, email, so_dien_thoai, mat_khau, trang_thai, vai_tro_id, ngay_tao, ngay_cap_nhat)
SELECT 'Khách test bảo hành 261015', 'bh-test-261015@example.invalid', '0992610150',
       '$2a$10$eBZkjP/uzd9LsTA1k..pLOxMUx5u1RY6x.5bdNvqyiUcbaYXI6ujG',
       1, @bh_test_role, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM nguoi_dung WHERE email = 'bh-test-261015@example.invalid');
-- Mat khau goc da huy, tai khoan nay chi lam FK test, khong dung de dang nhap.
SET @bh_test_customer = (SELECT id FROM nguoi_dung WHERE email = 'bh-test-261015@example.invalid');

INSERT INTO san_pham
    (ma_san_pham, ten_san_pham, mo_ta, thong_so_ky_thuat, loai_san_pham,
     thue_vat, trang_thai, danh_muc_id, thuong_hieu_id, thoi_han_bao_hanh_thang)
SELECT 'BH-TEST-261015-RAM', 'RAM mô phỏng bảo hành có serial', @bh_test_marker,
       JSON_OBJECT('loai_ram', 'DDR5', 'dung_luong', '16GB'), 'DON',
       0, 0, @bh_test_ram_category, @bh_test_brand, 24
WHERE NOT EXISTS (SELECT 1 FROM san_pham WHERE ma_san_pham = 'BH-TEST-261015-RAM');

INSERT INTO san_pham
    (ma_san_pham, ten_san_pham, mo_ta, thong_so_ky_thuat, loai_san_pham,
     thue_vat, trang_thai, danh_muc_id, thuong_hieu_id, thoi_han_bao_hanh_thang)
SELECT 'BH-TEST-261015-MOUSE', 'Chuột mô phỏng bảo hành không serial', @bh_test_marker,
       JSON_OBJECT('ket_noi', 'USB'), 'DON',
       0, 0, @bh_test_mouse_category, @bh_test_brand, 24
WHERE NOT EXISTS (SELECT 1 FROM san_pham WHERE ma_san_pham = 'BH-TEST-261015-MOUSE');

SET @bh_test_ram_product = (SELECT id FROM san_pham WHERE ma_san_pham = 'BH-TEST-261015-RAM');
SET @bh_test_mouse_product = (SELECT id FROM san_pham WHERE ma_san_pham = 'BH-TEST-261015-MOUSE');

INSERT INTO phien_ban_san_pham
    (san_pham_id, ten_phien_ban, ma_vach, gia_ban_le, gia_nhap, khoi_luong, trang_thai, co_quan_ly_serial)
SELECT @bh_test_ram_product, '16GB - lịch sử test', 'BH-TEST-261015-RAM-V1',
       1200000, 800000, 0.10, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM phien_ban_san_pham WHERE ma_vach = 'BH-TEST-261015-RAM-V1');

INSERT INTO phien_ban_san_pham
    (san_pham_id, ten_phien_ban, ma_vach, gia_ban_le, gia_nhap, khoi_luong, trang_thai, co_quan_ly_serial)
SELECT @bh_test_mouse_product, 'USB - lịch sử test', 'BH-TEST-261015-MOUSE-V1',
       350000, 200000, 0.10, 0, FALSE
WHERE NOT EXISTS (SELECT 1 FROM phien_ban_san_pham WHERE ma_vach = 'BH-TEST-261015-MOUSE-V1');

SET @bh_test_ram_variant = (SELECT id FROM phien_ban_san_pham WHERE ma_vach = 'BH-TEST-261015-RAM-V1');
SET @bh_test_mouse_variant = (SELECT id FROM phien_ban_san_pham WHERE ma_vach = 'BH-TEST-261015-MOUSE-V1');

INSERT INTO don_hang
    (ma_don_hang, loai_don_hang, khach_hang_id, nhan_vien_id,
     tong_tien_hang, tien_chiet_khau, phi_giao_hang, tong_thanh_toan,
     phuong_thuc_thanh_toan, trang_thai_thanh_toan,
     trang_thai_dong_goi, trang_thai_xuat_kho, trang_thai_don_hang,
     ten_nguoi_nhan, sdt_nguoi_nhan, ghi_chu, ngay_tao)
SELECT CONCAT('BH-TEST-261015-', LPAD(j.n, 3, '0')), 'TAI_QUAY',
       IF(j.n IN (4,5,8,10), NULL, @bh_test_customer), @bh_test_actor,
       IF(j.n <= 5, 1200000, 700000), 0, 0, IF(j.n <= 5, 1200000, 700000),
       'TIEN_MAT', 'DA_THANH_TOAN', 'DA_DONG_GOI', 'DA_XUAT_KHO', 'HOAN_THANH',
       CONCAT('Khách mô phỏng BH ', LPAD(j.n, 3, '0')), '0992610150',
       @bh_test_marker, @bh_test_mua
FROM JSON_TABLE(@bh_test_rows, '$[*]' COLUMNS(n INT PATH '$')) j
WHERE NOT EXISTS (
    SELECT 1 FROM don_hang d WHERE d.ma_don_hang = CONCAT('BH-TEST-261015-', LPAD(j.n, 3, '0'))
);

INSERT INTO chi_tiet_don_hang
    (don_hang_id, phien_ban_id, don_gia, so_luong, thanh_tien,
     la_qua_tang, tien_chiet_khau, thanh_toan_dong, cau_hinh_da_ban)
SELECT d.id, IF(j.n <= 5, @bh_test_ram_variant, @bh_test_mouse_variant),
       IF(j.n <= 5, 1200000, 350000), IF(j.n <= 5, 1, 2),
       IF(j.n <= 5, 1200000, 700000), FALSE, 0, IF(j.n <= 5, 1200000, 700000), NULL
FROM JSON_TABLE(@bh_test_rows, '$[*]' COLUMNS(n INT PATH '$')) j
JOIN don_hang d ON d.ma_don_hang = CONCAT('BH-TEST-261015-', LPAD(j.n, 3, '0'))
WHERE NOT EXISTS (SELECT 1 FROM chi_tiet_don_hang c WHERE c.don_hang_id = d.id);

INSERT INTO so_serial_san_pham
    (phien_ban_id, so_serial, trang_thai, don_hang_id, ngay_kich_hoat, han_bao_hanh)
SELECT @bh_test_ram_variant, CONCAT('BH-TEST-261015-SN-', LPAD(j.n, 3, '0')),
       'DA_BAN', d.id, @bh_test_mua, @bh_test_han
FROM JSON_TABLE(@bh_test_rows, '$[*]' COLUMNS(n INT PATH '$')) j
JOIN don_hang d ON d.ma_don_hang = CONCAT('BH-TEST-261015-', LPAD(j.n, 3, '0'))
WHERE j.n <= 5 AND NOT EXISTS (
    SELECT 1 FROM so_serial_san_pham s
    WHERE s.so_serial = CONCAT('BH-TEST-261015-SN-', LPAD(j.n, 3, '0'))
);

INSERT INTO thiet_bi_bao_hanh
    (ma_theo_doi, chi_tiet_don_hang_id, phien_ban_id, so_serial_id,
     han_bao_hanh, dau_hieu_nhan_dang, ngay_tao, ngay_kich_hoat)
SELECT CONCAT('BH-TEST-261015-TB-', LPAD(j.n, 3, '0')), c.id, c.phien_ban_id,
       s.id, @bh_test_han, CONCAT('[TEST] Tem BH-TEST-261015-', LPAD(j.n, 3, '0'), '-A'),
       NOW(), @bh_test_mua
FROM JSON_TABLE(@bh_test_rows, '$[*]' COLUMNS(n INT PATH '$')) j
JOIN don_hang d ON d.ma_don_hang = CONCAT('BH-TEST-261015-', LPAD(j.n, 3, '0'))
JOIN chi_tiet_don_hang c ON c.don_hang_id = d.id
LEFT JOIN so_serial_san_pham s
    ON j.n <= 5 AND s.so_serial = CONCAT('BH-TEST-261015-SN-', LPAD(j.n, 3, '0'))
WHERE NOT EXISTS (
    SELECT 1 FROM thiet_bi_bao_hanh t
    WHERE t.ma_theo_doi = CONCAT('BH-TEST-261015-TB-', LPAD(j.n, 3, '0'))
);

COMMIT;

-- Dung ID THAT o ket qua nay cho Postman, khong gia dinh ID = 1/5/101.
SELECT d.ma_don_hang, d.id AS don_hang_id, c.id AS chi_tiet_don_hang_id,
       t.id AS thiet_bi_id, t.ma_theo_doi, s.so_serial,
       d.khach_hang_id, c.so_luong AS so_luong_da_mua,
       v.co_quan_ly_serial, t.han_bao_hanh
FROM don_hang d
JOIN chi_tiet_don_hang c ON c.don_hang_id = d.id
JOIN phien_ban_san_pham v ON v.id = c.phien_ban_id
JOIN thiet_bi_bao_hanh t ON t.chi_tiet_don_hang_id = c.id
LEFT JOIN so_serial_san_pham s ON s.id = t.so_serial_id
WHERE d.ma_don_hang LIKE 'BH-TEST-261015-%'
ORDER BY d.ma_don_hang, t.id;
