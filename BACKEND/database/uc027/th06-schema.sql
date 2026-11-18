-- TH06: ERD B71.R17-R20 and B116.R25. Run once with the backend stopped.
-- This migration adds nullable history fields; it does not invent past receipt dates.
USE dant_ruventu;

ALTER TABLE phieu_tra_hang
    ADD COLUMN ngay_tiep_nhan_thuc_te DATETIME NULL,
    ADD COLUMN ngay_nhan_hang DATETIME NULL,
    ADD COLUMN ngay_ket_thuc DATETIME NULL,
    ADD COLUMN ly_do_ket_thuc TEXT NULL;

ALTER TABLE so_quy_thu_chi
    ADD COLUMN phieu_tra_hang_id BIGINT NULL,
    ADD CONSTRAINT uk_th06_cash_return UNIQUE (phieu_tra_hang_id),
    ADD CONSTRAINT fk_th06_cash_return
        FOREIGN KEY (phieu_tra_hang_id) REFERENCES phieu_tra_hang (id);

-- Legacy vouchers remain unlinked unless their relationship has been verified.
-- Do not reconstruct a relationship from a voucher code or transaction reference.
