-- These tables are used through JDBC and are outside Hibernate ddl-auto.
CREATE TABLE IF NOT EXISTS so_thu_tu_chung_tu (
 ma_loai VARCHAR(8) NOT NULL, ngay_cap DATE NOT NULL, so_cuoi BIGINT NOT NULL,
 PRIMARY KEY(ma_loai,ngay_cap)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_receipt (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NULL, purchase_id BIGINT NOT NULL, source_kind VARCHAR(50) NOT NULL,
 ncc_event_id BIGINT NULL, supplier_document VARCHAR(100) NULL, recorded_at DATETIME(6) NOT NULL,
 actor_id BIGINT NOT NULL, note TEXT NULL,
 UNIQUE KEY uk_rv_receipt_code(code), UNIQUE KEY uk_rv_receipt_event(ncc_event_id),
 FOREIGN KEY(purchase_id) REFERENCES don_nhap_hang(id),
 FOREIGN KEY(ncc_event_id) REFERENCES ncc_event(id),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_receipt_line (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 receipt_id BIGINT NOT NULL, purchase_line_id BIGINT NOT NULL, variant_id BIGINT NOT NULL,
 quantity INT NOT NULL, supplier_lot VARCHAR(100) NULL, serial_managed BOOLEAN NOT NULL,
 FOREIGN KEY(receipt_id) REFERENCES rv_receipt(id),
 FOREIGN KEY(purchase_line_id) REFERENCES chi_tiet_don_nhap(id),
 FOREIGN KEY(variant_id) REFERENCES phien_ban_san_pham(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_receipt_serial (
 receipt_line_id BIGINT NOT NULL, serial_id BIGINT NOT NULL,
 PRIMARY KEY(receipt_line_id,serial_id),
 FOREIGN KEY(receipt_line_id) REFERENCES rv_receipt_line(id),
 FOREIGN KEY(serial_id) REFERENCES so_serial_san_pham(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_recall (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL, purchase_id BIGINT NOT NULL, notice_document VARCHAR(100) NOT NULL,
 reason TEXT NOT NULL, employee_id BIGINT NOT NULL, deadline DATETIME(6) NULL,
 status VARCHAR(50) NOT NULL DEFAULT 'DANG_XU_LY', revision BIGINT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL, completed_at DATETIME(6) NULL,
 UNIQUE KEY uk_rv_recall_code(code),
 FOREIGN KEY(purchase_id) REFERENCES don_nhap_hang(id),
 FOREIGN KEY(employee_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_recall_item (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 recall_id BIGINT NOT NULL, variant_id BIGINT NOT NULL, serial_id BIGINT NULL,
 receipt_line_id BIGINT NULL, device_id BIGINT NULL, source_verified BOOLEAN NOT NULL,
 status VARCHAR(50) NOT NULL DEFAULT 'CHO_XU_LY', blocked BOOLEAN NOT NULL DEFAULT TRUE,
 result VARCHAR(50) NULL, contact_note TEXT NULL, next_contact_at DATETIME(6) NULL,
 resolved_at DATETIME(6) NULL, ncc_unit_id BIGINT NULL, warranty_id BIGINT NULL,
 KEY ix_rv_recall_item_blocked(variant_id,serial_id,blocked,status),
 FOREIGN KEY(recall_id) REFERENCES rv_recall(id),
 FOREIGN KEY(variant_id) REFERENCES phien_ban_san_pham(id),
 FOREIGN KEY(serial_id) REFERENCES so_serial_san_pham(id),
 FOREIGN KEY(receipt_line_id) REFERENCES rv_receipt_line(id),
 FOREIGN KEY(device_id) REFERENCES thiet_bi_bao_hanh(id),
 FOREIGN KEY(ncc_unit_id) REFERENCES ncc_unit(id),
 FOREIGN KEY(warranty_id) REFERENCES phieu_bao_hanh(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_recall_event (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 recall_id BIGINT NOT NULL, item_id BIGINT NULL, action VARCHAR(50) NOT NULL,
 document VARCHAR(100) NULL, note TEXT NOT NULL, payload JSON NOT NULL,
 actor_id BIGINT NOT NULL, occurred_at DATETIME(6) NOT NULL,
 FOREIGN KEY(recall_id) REFERENCES rv_recall(id),
 FOREIGN KEY(item_id) REFERENCES rv_recall_item(id),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_device_source (
 device_id BIGINT NOT NULL, revision BIGINT NOT NULL, receipt_line_id BIGINT NOT NULL,
 note TEXT NOT NULL, actor_id BIGINT NOT NULL, recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(device_id,revision),
 FOREIGN KEY(device_id) REFERENCES thiet_bi_bao_hanh(id),
 FOREIGN KEY(receipt_line_id) REFERENCES rv_receipt_line(id),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_issue (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL, order_id BIGINT NOT NULL, warehouse_id BIGINT NOT NULL,
 actor_id BIGINT NOT NULL, device_snapshot JSON NOT NULL, recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uk_rv_issue_code(code), UNIQUE KEY uk_rv_issue_order(order_id),
 FOREIGN KEY(order_id) REFERENCES don_hang(id),
 FOREIGN KEY(warehouse_id) REFERENCES kho_hang(id),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_fund_account (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL, name VARCHAR(150) NOT NULL, kind VARCHAR(50) NOT NULL,
 bank_name VARCHAR(150) NULL, account_number VARCHAR(100) NULL, account_holder VARCHAR(150) NULL,
 active BOOLEAN NOT NULL, revision BIGINT NOT NULL, actor_id BIGINT NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uk_rv_fund_account_code(code),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_money_context (
 voucher_id BIGINT NOT NULL, revision BIGINT NOT NULL, fund_id BIGINT NOT NULL,
 cash_employee_id BIGINT NULL, reconciler_id BIGINT NOT NULL,
 transaction_source VARCHAR(100) NOT NULL, transaction_reference VARCHAR(255) NULL,
 note TEXT NOT NULL, recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(voucher_id,revision),
 FOREIGN KEY(voucher_id) REFERENCES so_quy_thu_chi(id),
 FOREIGN KEY(fund_id) REFERENCES rv_fund_account(id),
 FOREIGN KEY(cash_employee_id) REFERENCES nguoi_dung(id),
 FOREIGN KEY(reconciler_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_supplier_document (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 supplier_id BIGINT NOT NULL, kind VARCHAR(50) NOT NULL, external_number VARCHAR(150) NOT NULL,
 number_key VARCHAR(150) NOT NULL, issued_date DATE NOT NULL, total_amount DECIMAL(19,2) NOT NULL,
 revision BIGINT NOT NULL, actor_id BIGINT NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uk_rv_supplier_document(supplier_id,kind,number_key),
 FOREIGN KEY(supplier_id) REFERENCES nha_cung_cap(id),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_supplier_document_line (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 document_id BIGINT NOT NULL, receipt_line_id BIGINT NOT NULL, quantity INT NOT NULL,
 amount DECIMAL(19,2) NOT NULL, actor_id BIGINT NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uk_rv_supplier_document_line(document_id,receipt_line_id),
 FOREIGN KEY(document_id) REFERENCES rv_supplier_document(id),
 FOREIGN KEY(receipt_line_id) REFERENCES rv_receipt_line(id),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_waiting_order (
 order_id BIGINT NOT NULL PRIMARY KEY,
 remaining_method VARCHAR(50) NULL, terms_version VARCHAR(100) NULL, terms_text TEXT NULL,
 terms_accepted_at DATETIME(6) NULL, promised_at DATETIME(6) NULL,
 revision BIGINT NOT NULL DEFAULT 0, employee_id BIGINT NULL,
 contact_result VARCHAR(50) NOT NULL DEFAULT 'CHUA_LIEN_HE', contact_note TEXT NULL,
 customer_contacted BOOLEAN NOT NULL DEFAULT FALSE, last_contact_by BIGINT NULL,
 last_contact_at DATETIME(6) NULL, next_contact_at DATETIME(6) NULL, updated_at DATETIME(6) NULL,
 FOREIGN KEY(order_id) REFERENCES don_hang(id),
 FOREIGN KEY(employee_id) REFERENCES nguoi_dung(id),
 FOREIGN KEY(last_contact_by) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_stock_notice (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 variant_id BIGINT NOT NULL, customer_name VARCHAR(150) NOT NULL, phone VARCHAR(20) NOT NULL,
 status VARCHAR(50) NOT NULL DEFAULT 'CHO_THONG_BAO', revision BIGINT NOT NULL DEFAULT 0,
 employee_id BIGINT NULL, contact_result VARCHAR(50) NOT NULL DEFAULT 'CHUA_LIEN_HE',
 contact_note TEXT NULL, customer_contacted BOOLEAN NOT NULL DEFAULT FALSE,
 last_contact_by BIGINT NULL, last_contact_at DATETIME(6) NULL, next_contact_at DATETIME(6) NULL,
 consented_at DATETIME(6) NOT NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY uk_rv_stock_notice_variant_phone(variant_id,phone),
 FOREIGN KEY(variant_id) REFERENCES phien_ban_san_pham(id),
 FOREIGN KEY(employee_id) REFERENCES nguoi_dung(id),
 FOREIGN KEY(last_contact_by) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rv_waiting_contact (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT NULL, notice_id BIGINT NULL, result VARCHAR(50) NOT NULL,
 note TEXT NOT NULL, actor_id BIGINT NOT NULL, occurred_at DATETIME(6) NOT NULL, payload JSON NOT NULL,
 FOREIGN KEY(order_id) REFERENCES rv_waiting_order(order_id),
 FOREIGN KEY(notice_id) REFERENCES rv_stock_notice(id),
 FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
