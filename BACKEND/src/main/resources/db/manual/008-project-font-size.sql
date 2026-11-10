-- Chạy sau 007-system-settings.sql trên đúng database BE. Không tạo bảng mới.
-- Cỡ chữ chung bắt đầu ở 14 px; không lấy tùy chọn của một tài khoản làm mặc định cho mọi người.
SET @settings_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cai_dat_he_thong' AND COLUMN_NAME = 'font_size'),
    'SELECT 1', 'ALTER TABLE cai_dat_he_thong ADD COLUMN font_size SMALLINT NOT NULL DEFAULT 14');
PREPARE settings_stmt FROM @settings_sql;
EXECUTE settings_stmt;
DEALLOCATE PREPARE settings_stmt;

SET @settings_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cai_dat_he_thong'
             AND CONSTRAINT_NAME = 'chk_cai_dat_he_thong_font_size'),
    'SELECT 1', 'ALTER TABLE cai_dat_he_thong ADD CONSTRAINT chk_cai_dat_he_thong_font_size CHECK (font_size BETWEEN 12 AND 20)');
PREPARE settings_stmt FROM @settings_sql;
EXECUTE settings_stmt;
DEALLOCATE PREPARE settings_stmt;

-- nguoi_dung.font_size từ bản 007 không còn được dùng; giữ dữ liệu, không DROP cột.
SELECT id, bao_tri, font_size FROM cai_dat_he_thong;
SHOW CREATE TABLE cai_dat_he_thong;
