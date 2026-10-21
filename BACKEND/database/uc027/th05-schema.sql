-- ERD B71.R15/R16/R21 and B84. Run once, with the backend stopped.
USE dant_ruventu;

ALTER TABLE phieu_tra_hang
    ADD COLUMN nguoi_tao_id BIGINT NULL,
    ADD COLUMN ngay_cap_nhap DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN du_lieu_nhan_hang JSON NULL,
    ADD CONSTRAINT fk_th05_phieu_tra_nguoi_tao
        FOREIGN KEY (nguoi_tao_id) REFERENCES nguoi_dung (id);

-- Existing historical creators remain unknown; TH05 sets every new creator from JWT.
CREATE TABLE IF NOT EXISTS sales_idempotency (
    request_key VARCHAR(50) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    actor_id BIGINT NOT NULL,
    request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    response_json LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Widen the response store to the ERD type for long multi-line create responses.
ALTER TABLE sales_idempotency
    MODIFY COLUMN response_json LONGTEXT NULL;
