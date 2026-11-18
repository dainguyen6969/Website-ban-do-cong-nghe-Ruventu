-- Align legacy partner statuses with TrangThaiCoBanConverter (SMALLINT 1/0).
-- Back up doi_tac_van_chuyen before running. Safe to rerun.
-- Strict conversion rejects unknown statuses instead of silently converting them to 0.
SET @shipping_previous_sql_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';

-- Remove only the legacy textual status constraint, preserving other checks.
SET @shipping_legacy_check = (
    SELECT tc.CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.CHECK_CONSTRAINTS cc
      ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
     AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = 'doi_tac_van_chuyen'
      AND cc.CHECK_CLAUSE LIKE '%trang_thai%'
      AND cc.CHECK_CLAUSE LIKE '%DANG_HOAT_DONG%'
    LIMIT 1
);
SET @shipping_drop_legacy_check = IF(@shipping_legacy_check IS NULL, 'SELECT 1',
    CONCAT('ALTER TABLE doi_tac_van_chuyen DROP CHECK `',
           REPLACE(@shipping_legacy_check, '`', '``'), '`'));
PREPARE shipping_status_statement FROM @shipping_drop_legacy_check;
EXECUTE shipping_status_statement;
DEALLOCATE PREPARE shipping_status_statement;

START TRANSACTION;
UPDATE doi_tac_van_chuyen
SET trang_thai = CASE UPPER(TRIM(CAST(trang_thai AS CHAR)))
    WHEN 'DANG_HOAT_DONG' THEN '1'
    WHEN 'HOAT_DONG' THEN '1'
    WHEN 'NGUNG_HOAT_DONG' THEN '0'
    ELSE trang_thai
END
WHERE UPPER(TRIM(CAST(trang_thai AS CHAR))) IN
    ('DANG_HOAT_DONG', 'HOAT_DONG', 'NGUNG_HOAT_DONG');
COMMIT;

ALTER TABLE doi_tac_van_chuyen
    MODIFY COLUMN trang_thai SMALLINT NOT NULL DEFAULT 1;

SET @shipping_add_status_check = IF(EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doi_tac_van_chuyen'
      AND CONSTRAINT_NAME = 'chk_shipping_partner_status_01'
), 'SELECT 1',
    'ALTER TABLE doi_tac_van_chuyen ADD CONSTRAINT chk_shipping_partner_status_01 CHECK (trang_thai IN (0, 1))');
PREPARE shipping_status_statement FROM @shipping_add_status_check;
EXECUTE shipping_status_statement;
DEALLOCATE PREPARE shipping_status_statement;

SET SESSION sql_mode = @shipping_previous_sql_mode;
