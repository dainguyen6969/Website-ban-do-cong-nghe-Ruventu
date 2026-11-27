-- MySQL 8.0.16+. Chạy trong database đang cấu hình cho BE, trước khi khởi động phiên bản này.
-- Đã được duyệt: 1 bảng bảo trì và 2 cột tùy chọn font. Chạy lại không reset dữ liệu.
CREATE TABLE IF NOT EXISTS cai_dat_he_thong (
    id TINYINT NOT NULL PRIMARY KEY,
    bao_tri BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_cai_dat_he_thong_id CHECK (id = 1),
    CONSTRAINT chk_cai_dat_he_thong_bao_tri CHECK (bao_tri IN (0, 1))
) ENGINE = InnoDB;

INSERT INTO cai_dat_he_thong (id, bao_tri)
SELECT 1, FALSE WHERE NOT EXISTS (SELECT 1 FROM cai_dat_he_thong WHERE id = 1);

SET @settings_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nguoi_dung' AND COLUMN_NAME = 'font_family'),
    'SELECT 1', 'ALTER TABLE nguoi_dung ADD COLUMN font_family VARCHAR(40) NULL');
PREPARE settings_stmt FROM @settings_sql;
EXECUTE settings_stmt;
DEALLOCATE PREPARE settings_stmt;

SET @settings_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nguoi_dung' AND COLUMN_NAME = 'font_size'),
    'SELECT 1', 'ALTER TABLE nguoi_dung ADD COLUMN font_size SMALLINT NULL');
PREPARE settings_stmt FROM @settings_sql;
EXECUTE settings_stmt;
DEALLOCATE PREPARE settings_stmt;

SHOW CREATE TABLE cai_dat_he_thong;
SELECT id, bao_tri FROM cai_dat_he_thong;
SHOW COLUMNS FROM nguoi_dung WHERE Field IN ('font_family', 'font_size');
