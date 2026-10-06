-- Local POS test data: assign serials to existing stock, without changing inventory.
-- Adds 20 serial-managed variants. Re-running skips variants that already have serials.
-- Only unused, active standalone variants with no damaged/reserved stock are eligible.
-- TrangThaiCoBanConverter stores 1 = HOAT_DONG, 0 = NGUNG_HOAT_DONG.
INSERT INTO so_serial_san_pham (phien_ban_id, so_serial, trang_thai, don_hang_id)
WITH RECURSIVE serial_numbers(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM serial_numbers WHERE n < 100
)
SELECT v.id, CONCAT('TEST-POS-20261005-', v.id, '-', LPAD(n.n, 3, '0')), 'TRONG_KHO', NULL
FROM phien_ban_san_pham v
JOIN san_pham p ON p.id = v.san_pham_id
JOIN ton_kho t ON t.phien_ban_id = v.id
JOIN serial_numbers n ON n.n <= t.ton_thuc_te
WHERE v.id IN (22, 28, 32, 43, 48, 52, 53, 62, 63, 67, 68, 72, 77, 78, 87, 88, 92, 122, 162, 192)
  AND p.trang_thai = 1 AND v.trang_thai = 1
  AND p.loai_san_pham = 'DON' AND t.kho_hang_id = 1
  AND t.ton_thuc_te BETWEEN 5 AND 100 AND t.ton_co_the_ban = t.ton_thuc_te
  AND COALESCE(t.hang_loi, 0) = 0
  AND (SELECT COUNT(*) FROM ton_kho all_t WHERE all_t.phien_ban_id = v.id) = 1
  AND NOT EXISTS (SELECT 1 FROM so_serial_san_pham s WHERE s.phien_ban_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM thanh_phan_combo c WHERE c.phien_ban_thanh_phan_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM chi_tiet_don_hang d WHERE d.phien_ban_id = v.id)
ORDER BY v.id, n.n;
