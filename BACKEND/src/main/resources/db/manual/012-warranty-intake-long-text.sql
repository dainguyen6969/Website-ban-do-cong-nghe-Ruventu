SET @warranty_intake_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'phieu_bao_hanh'
      AND column_name IN ('ly_do_bao_hanh', 'tinh_trang_tiep_nhan') AND data_type <> 'longtext'
  ),
  'ALTER TABLE phieu_bao_hanh MODIFY COLUMN ly_do_bao_hanh LONGTEXT NOT NULL, MODIFY COLUMN tinh_trang_tiep_nhan LONGTEXT NOT NULL',
  'SELECT 1'
);
PREPARE warranty_intake_upgrade FROM @warranty_intake_ddl;
EXECUTE warranty_intake_upgrade;
DEALLOCATE PREPARE warranty_intake_upgrade;

SET @warranty_intake_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'lich_su_bao_hanh'
      AND column_name = 'noi_dung' AND data_type <> 'longtext'
  ),
  'ALTER TABLE lich_su_bao_hanh MODIFY COLUMN noi_dung LONGTEXT NOT NULL',
  'SELECT 1'
);
PREPARE warranty_intake_upgrade FROM @warranty_intake_ddl;
EXECUTE warranty_intake_upgrade;
DEALLOCATE PREPARE warranty_intake_upgrade;
