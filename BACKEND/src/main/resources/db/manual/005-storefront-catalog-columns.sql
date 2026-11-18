-- main-test added these entity fields; older reseeded databases may lack them.
-- Apply to the existing database without recreating tables or reseeding IDs.
SET @catalog_sql = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'phien_ban_san_pham' AND COLUMN_NAME = 'co_quan_ly_serial'),
  'SELECT 1',
  'ALTER TABLE phien_ban_san_pham ADD COLUMN co_quan_ly_serial BOOLEAN NULL'
);
PREPARE catalog_statement FROM @catalog_sql;
EXECUTE catalog_statement;
DEALLOCATE PREPARE catalog_statement;

-- Preserve the previous serial-history rule for legacy variants; a combo has no serial.
UPDATE phien_ban_san_pham v JOIN san_pham p ON p.id = v.san_pham_id
SET v.co_quan_ly_serial = p.loai_san_pham = 'DON' AND EXISTS(
  SELECT 1 FROM so_serial_san_pham s WHERE s.phien_ban_id = v.id
)
WHERE v.co_quan_ly_serial IS NULL;
ALTER TABLE phien_ban_san_pham MODIFY COLUMN co_quan_ly_serial BOOLEAN NOT NULL;

SET @catalog_sql = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'san_pham' AND COLUMN_NAME = 'thoi_han_bao_hanh_thang'),
  'SELECT 1',
  'ALTER TABLE san_pham ADD COLUMN thoi_han_bao_hanh_thang INT NULL'
);
PREPARE catalog_statement FROM @catalog_sql;
EXECUTE catalog_statement;
DEALLOCATE PREPARE catalog_statement;
-- Existing warranty durations stay unknown; do not invent 0 or 36 months.

SET @catalog_sql = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ton_kho' AND COLUMN_NAME = 'muc_ton_toi_thieu'),
  'SELECT 1',
  'ALTER TABLE ton_kho ADD COLUMN muc_ton_toi_thieu INT NOT NULL DEFAULT 0'
);
PREPARE catalog_statement FROM @catalog_sql;
EXECUTE catalog_statement;
DEALLOCATE PREPARE catalog_statement;

SET @catalog_sql = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ton_kho' AND COLUMN_NAME = 'so_luong_giu_cho_bao_hanh'),
  'SELECT 1',
  'ALTER TABLE ton_kho ADD COLUMN so_luong_giu_cho_bao_hanh INT NOT NULL DEFAULT 0'
);
PREPARE catalog_statement FROM @catalog_sql;
EXECUTE catalog_statement;
DEALLOCATE PREPARE catalog_statement;
