-- Dong bo dung hai cot voi Entity/ERD bao hanh da duoc chap thuan.
-- DDL MySQL tu COMMIT: hay sao luu truoc khi chay. Khong xoa du lieu/FK/index.
USE dant_ruventu;

ALTER TABLE phieu_bao_hanh
    MODIFY COLUMN khach_hang_id BIGINT NULL,
    MODIFY COLUMN so_serial_id BIGINT NULL;

SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'phieu_bao_hanh'
  AND column_name IN ('khach_hang_id', 'so_serial_id');
