-- Chạy sau 007 và 008. Phông chữ mặc định nay dùng chung cho cả khách và tài khoản.
SET @settings_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cai_dat_he_thong' AND COLUMN_NAME = 'font_family'),
    'SELECT 1', 'ALTER TABLE cai_dat_he_thong ADD COLUMN font_family VARCHAR(40) NOT NULL DEFAULT ''Inter''');
PREPARE settings_stmt FROM @settings_sql;
EXECUTE settings_stmt;
DEALLOCATE PREPARE settings_stmt;

-- Không DROP cột nguoi_dung.font_family/font_size cũ; ứng dụng không còn dùng chúng.
-- Khi nâng cấp từ bản theo tài khoản, chọn lại font mong muốn trong Cài đặt hệ thống
-- một lần để công bố thành mặc định chung. Chạy lại script không reset lựa chọn chung.
SELECT id, bao_tri, font_family, font_size FROM cai_dat_he_thong;
