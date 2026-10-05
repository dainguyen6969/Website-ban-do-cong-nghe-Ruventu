SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO kho_hang (ma_kho, ten_kho, dia_chi, trang_thai, quan_ly_id)
SELECT 'KHO-COMBO-SEED', 'Kho linh kiện combo', 'Kho dữ liệu mẫu RUVENTU', 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM kho_hang WHERE ma_kho = 'KHO-COMBO-SEED');

SET @combo_warehouse = (SELECT id FROM kho_hang WHERE ma_kho = 'KHO-COMBO-SEED' LIMIT 1);

INSERT INTO ton_kho
  (hang_loi, muc_ton_toi_thieu, ton_co_the_ban, ton_thuc_te, vi_tri_luu_kho, kho_hang_id, phien_ban_id)
SELECT 0, 5, 50, 50, CONCAT('COMBO-', v.id), @combo_warehouse, v.id
FROM phien_ban_san_pham v
JOIN san_pham p ON p.id = v.san_pham_id
WHERE p.loai_san_pham = 'DON'
  AND p.trang_thai = 1
  AND v.trang_thai = 1
  AND NOT EXISTS (
    SELECT 1 FROM ton_kho t
    WHERE t.kho_hang_id = @combo_warehouse AND t.phien_ban_id = v.id
  );

DROP PROCEDURE IF EXISTS seed_combo;
DELIMITER //
CREATE PROCEDURE seed_combo(
  IN p_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_category_slug VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_specs JSON, IN p_price DECIMAL(15,2), IN p_weight DECIMAL(10,2),
  IN p_image_1 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_image_2 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN p_components JSON
)
BEGIN
  DECLARE combo_id BIGINT;
  DECLARE category_id BIGINT;
  DECLARE brand_id BIGINT;
  DECLARE component_cost DECIMAL(15,2);

  SELECT id INTO category_id FROM danh_muc WHERE duong_dan_url = p_category_slug LIMIT 1;
  SELECT id INTO brand_id FROM thuong_hieu WHERE ten_thuong_hieu = 'ASUS' LIMIT 1;
  SELECT SUM(component.gia_nhap * source.so_luong) INTO component_cost
  FROM JSON_TABLE(p_components, '$[*]' COLUMNS (
    phien_ban_id BIGINT PATH '$.id', so_luong INT PATH '$.qty'
  )) source
  JOIN phien_ban_san_pham component ON component.id = source.phien_ban_id;

  INSERT INTO san_pham
    (loai_san_pham, ma_san_pham, mo_ta, ten_san_pham, thong_so_ky_thuat,
     thue_vat, trang_thai, danh_muc_id, thuong_hieu_id)
  SELECT 'BO_PC', p_code, p_description, p_name, p_specs, 10, 1, category_id, brand_id
  WHERE category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM san_pham WHERE ma_san_pham = p_code
  );

  SELECT id INTO combo_id FROM san_pham
  WHERE ma_san_pham = p_code AND loai_san_pham = 'BO_PC' LIMIT 1;

  UPDATE san_pham
  SET mo_ta = p_description,
      ten_san_pham = p_name,
      thong_so_ky_thuat = p_specs,
      thue_vat = 10,
      trang_thai = 1,
      danh_muc_id = category_id,
      thuong_hieu_id = brand_id
  WHERE id = combo_id;

  INSERT INTO phien_ban_san_pham
    (gia_ban_le, gia_nhap, khoi_luong, ma_vach, ten_phien_ban, trang_thai, san_pham_id)
  SELECT p_price, component_cost, p_weight, CONCAT(p_code, '-DEFAULT'), 'Mặc định', 1, combo_id
  WHERE combo_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM phien_ban_san_pham WHERE san_pham_id = combo_id);

  UPDATE phien_ban_san_pham
  SET gia_ban_le = p_price,
      gia_nhap = component_cost,
      khoi_luong = p_weight,
      ten_phien_ban = 'Mặc định',
      trang_thai = 1
  WHERE san_pham_id = combo_id;

  INSERT INTO anh_san_pham (duong_dan_anh, la_anh_chinh, thu_tu_hien_thi, san_pham_id)
  SELECT p_image_1, 1, 0, combo_id
  WHERE combo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM anh_san_pham WHERE san_pham_id = combo_id AND duong_dan_anh = p_image_1
  );
  INSERT INTO anh_san_pham (duong_dan_anh, la_anh_chinh, thu_tu_hien_thi, san_pham_id)
  SELECT p_image_2, 0, 1, combo_id
  WHERE combo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM anh_san_pham WHERE san_pham_id = combo_id AND duong_dan_anh = p_image_2
  );

  INSERT INTO thanh_phan_combo (so_luong, phien_ban_thanh_phan_id, san_pham_combo_id)
  SELECT source.so_luong, source.phien_ban_id, combo_id
  FROM JSON_TABLE(p_components, '$[*]' COLUMNS (
    phien_ban_id BIGINT PATH '$.id', so_luong INT PATH '$.qty'
  )) source
  JOIN phien_ban_san_pham component ON component.id = source.phien_ban_id
  WHERE combo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM thanh_phan_combo current_component
    WHERE current_component.san_pham_combo_id = combo_id
      AND current_component.phien_ban_thanh_phan_id = source.phien_ban_id
  );
END//
DELIMITER ;

CALL seed_combo('CB-GAMING-ULTIMATE', 'Bộ máy Gaming Ultimate 4K', 'linh-kien-pc',
  'Cấu hình gaming cao cấp dành cho trò chơi 4K và thực tế ảo, được kiểm tra tương thích và tối ưu hiệu năng trước khi bàn giao.',
  JSON_OBJECT('Nhu cầu','Gaming 4K','CPU','ASUS CPU hiệu năng cao','GPU','RTX 4090','RAM','32 GB DDR5','Lưu trữ','SSD NVMe','Giá gốc',65980000,'Giảm giá',3990000),
  61990000,16.5,'https://res.cloudinary.com/demo/image/upload/sample.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample.jpg',
  JSON_ARRAY(JSON_OBJECT('id',1,'qty',1),JSON_OBJECT('id',2,'qty',1),JSON_OBJECT('id',3,'qty',1),JSON_OBJECT('id',4,'qty',2),JSON_OBJECT('id',5,'qty',1)));

CALL seed_combo('CB-GAMING-BALANCED', 'Bộ máy Gaming Cân Bằng QHD', 'linh-kien-pc',
  'Bộ máy cân bằng cho game QHD tốc độ khung hình cao, phù hợp chơi game lâu dài và nâng cấp linh hoạt.',
  JSON_OBJECT('Nhu cầu','Gaming QHD','CPU','ASUS CPU Series 012','GPU','ASUS VGA Series 010','RAM','32 GB DDR5','Lưu trữ','SSD NVMe','Giá gốc',90125000,'Giảm giá',5225000),
  84900000,14.8,'https://res.cloudinary.com/demo/image/upload/cld-sample.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg',
  JSON_ARRAY(JSON_OBJECT('id',10,'qty',1),JSON_OBJECT('id',11,'qty',1),JSON_OBJECT('id',12,'qty',1),JSON_OBJECT('id',13,'qty',2),JSON_OBJECT('id',14,'qty',1)));

CALL seed_combo('CB-OFFICE-ESSENTIAL', 'Combo Văn Phòng Thiết Yếu', 'gaming-gear',
  'Bộ bàn phím và chuột đồng bộ cho công việc văn phòng hằng ngày, thao tác ổn định và dễ triển khai.',
  JSON_OBJECT('Nhu cầu','Văn phòng','Kết nối','USB','Màu sắc','Đen','Bảo hành','Theo từng linh kiện','Giá gốc',28625000,'Giảm giá',2725000),
  25900000,2.2,'https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-3.jpg',
  JSON_ARRAY(JSON_OBJECT('id',6,'qty',1),JSON_OBJECT('id',7,'qty',1)));

CALL seed_combo('CB-STREAM-STARTER', 'Combo Livestream Khởi Đầu', 'gaming-gear',
  'Giải pháp khởi đầu cho livestream, họp trực tuyến và sáng tạo nội dung với thiết bị hình ảnh, âm thanh và điều khiển đồng bộ.',
  JSON_OBJECT('Nhu cầu','Livestream','Hình ảnh','Full HD','Âm thanh','Tai nghe chuyên dụng','Kết nối','USB','Giá gốc',43375000,'Giảm giá',3475000),
  39900000,5.4,'https://res.cloudinary.com/demo/image/upload/cld-sample-3.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-4.jpg',
  JSON_ARRAY(JSON_OBJECT('id',8,'qty',1),JSON_OBJECT('id',9,'qty',1),JSON_OBJECT('id',6,'qty',1)));

CALL seed_combo('CB-WORKSTATION-PRO', 'Bộ máy Workstation Chuyên Nghiệp', 'linh-kien-pc',
  'Máy trạm chuyên nghiệp cho dựng hình 3D, biên tập video và mô phỏng, ưu tiên hiệu năng bền vững khi tải nặng.',
  JSON_OBJECT('Nhu cầu','Workstation','CPU','ASUS CPU Series 012','GPU','RTX 4090','RAM','ASUS RAM Series 013','Lưu trữ','ASUS SSD Series 014','Giá gốc',113240000,'Giảm giá',7340000),
  105900000,18.3,'https://res.cloudinary.com/demo/image/upload/cld-sample-4.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-5.jpg',
  JSON_ARRAY(JSON_OBJECT('id',1,'qty',1),JSON_OBJECT('id',11,'qty',1),JSON_OBJECT('id',12,'qty',1),JSON_OBJECT('id',13,'qty',1),JSON_OBJECT('id',14,'qty',1)));

CALL seed_combo('CB-ENTRY-HOME', 'Bộ máy Phổ Thông Gia Đình', 'linh-kien-pc',
  'Cấu hình phổ thông tiết kiệm cho học tập, duyệt web và công việc cơ bản, dễ sử dụng và tiêu thụ điện thấp.',
  JSON_OBJECT('Nhu cầu','Gia đình và học tập','CPU','ASUS CPU Series 003','Đồ họa','Tích hợp','RAM','ASUS RAM Series 004','Lưu trữ','ASUS SSD Series 005','Giá gốc',4500000,'Giảm giá',300000),
  4200000,7.5,'https://res.cloudinary.com/demo/image/upload/cld-sample-5.jpg','https://res.cloudinary.com/demo/image/upload/sample.jpg',
  JSON_ARRAY(JSON_OBJECT('id',3,'qty',1),JSON_OBJECT('id',4,'qty',1),JSON_OBJECT('id',5,'qty',1)));

CALL seed_combo('CB-HIGHEND-EXTREME', 'Bộ máy Cao Cấp Extreme', 'linh-kien-pc',
  'Cấu hình đầu bảng cho gaming, render và đa nhiệm chuyên sâu với linh kiện cao cấp cùng khả năng nâng cấp dài hạn.',
  JSON_OBJECT('Nhu cầu','Cao cấp','CPU','ASUS CPU Series 012','GPU','RTX 4090','RAM','64 GB DDR5','Lưu trữ','ASUS SSD Series 014','Giá gốc',120480000,'Giảm giá',8580000),
  111900000,19.6,'https://res.cloudinary.com/demo/image/upload/sample.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg',
  JSON_ARRAY(JSON_OBJECT('id',1,'qty',1),JSON_OBJECT('id',2,'qty',1),JSON_OBJECT('id',12,'qty',1),JSON_OBJECT('id',13,'qty',2),JSON_OBJECT('id',14,'qty',1)));

CALL seed_combo('CB-CREATOR-STUDIO', 'Bộ máy Creator Studio', 'linh-kien-pc',
  'Máy sáng tạo nội dung dành cho thiết kế đồ họa, hậu kỳ ảnh và video với cấu hình cân bằng giữa xử lý và lưu trữ.',
  JSON_OBJECT('Nhu cầu','Sáng tạo nội dung','GPU','ASUS VGA Series 019','RAM','ASUS RAM Series 013','Lưu trữ','ASUS SSD Series 014','Màn hình','ASUS Series 018','Giá gốc',78000000,'Giảm giá',5100000),
  72900000,15.2,'https://res.cloudinary.com/demo/image/upload/cld-sample.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-3.jpg',
  JSON_ARRAY(JSON_OBJECT('id',18,'qty',1),JSON_OBJECT('id',19,'qty',1),JSON_OBJECT('id',20,'qty',1),JSON_OBJECT('id',13,'qty',1),JSON_OBJECT('id',14,'qty',1)));

CALL seed_combo('CB-HOMEOFFICE-COMPLETE', 'Combo Góc Làm Việc Tại Nhà', 'gaming-gear',
  'Bộ thiết bị hoàn chỉnh cho làm việc tại nhà và học trực tuyến, gồm màn hình cùng bàn phím và chuột đồng bộ.',
  JSON_OBJECT('Nhu cầu','Làm việc tại nhà','Màn hình','ASUS Series 009','Bàn phím','ASUS Series 006','Chuột','ASUS Series 007','Giá gốc',43250000,'Giảm giá',3750000),
  39500000,8.1,'https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-4.jpg',
  JSON_ARRAY(JSON_OBJECT('id',6,'qty',1),JSON_OBJECT('id',7,'qty',1),JSON_OBJECT('id',9,'qty',1)));

CALL seed_combo('CB-ESPORTS-ARENA', 'Combo Esports Arena', 'gaming-gear',
  'Bộ thiết bị thi đấu esports và luyện tập chuyên nghiệp, kết hợp phần cứng hiển thị cùng ngoại vi đồng bộ.',
  JSON_OBJECT('Nhu cầu','Esports','GPU','ASUS VGA Series 010','Bàn phím','ASUS Series 015','Chuột','ASUS Series 016','Tai nghe','ASUS Series 017','Giá gốc',77000000,'Giảm giá',5100000),
  71900000,9.8,'https://res.cloudinary.com/demo/image/upload/cld-sample-3.jpg','https://res.cloudinary.com/demo/image/upload/cld-sample-5.jpg',
  JSON_ARRAY(JSON_OBJECT('id',10,'qty',1),JSON_OBJECT('id',15,'qty',1),JSON_OBJECT('id',16,'qty',1),JSON_OBJECT('id',17,'qty',1),JSON_OBJECT('id',18,'qty',1)));

DROP PROCEDURE seed_combo;
COMMIT;
