-- JDBC supplier processing is outside Hibernate ddl-auto. Preserve existing data.
CREATE TABLE IF NOT EXISTS ncc_case (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 source_po_id BIGINT NOT NULL, warehouse_id BIGINT NOT NULL,
 code VARCHAR(50) NOT NULL, status VARCHAR(50) NOT NULL, purpose VARCHAR(50) NOT NULL,
 reason TEXT NOT NULL, employee_id BIGINT NOT NULL, deadline DATETIME(6) NULL,
 revision BIGINT NOT NULL DEFAULT 0, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uk_ncc_case_code(code), KEY ix_ncc_case_source_status(source_po_id,status,purpose),
 FOREIGN KEY(source_po_id) REFERENCES don_nhap_hang(id),
 FOREIGN KEY(warehouse_id) REFERENCES kho_hang(id),
 FOREIGN KEY(employee_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ncc_unit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 case_id BIGINT NOT NULL, source_line_id BIGINT NOT NULL,
 parent_id BIGINT NULL, root_id BIGINT NULL, origin VARCHAR(50) NOT NULL,
 variant_id BIGINT NOT NULL, expected_variant_id BIGINT NOT NULL,
 initial_serial_id BIGINT NULL, serial_id BIGINT NULL,
 method VARCHAR(50) NOT NULL, status VARCHAR(50) NOT NULL, planned BOOLEAN NOT NULL DEFAULT FALSE,
 book_value DECIMAL(15,2) NOT NULL DEFAULT 0, credit DECIMAL(15,2) NOT NULL DEFAULT 0,
 receive_value DECIMAL(15,2) NOT NULL DEFAULT 0, condition_code VARCHAR(50) NOT NULL,
 last_moved_at DATETIME(6) NOT NULL,
 KEY ix_ncc_unit_initial_serial(initial_serial_id), KEY ix_ncc_unit_serial_status(serial_id,status),
 FOREIGN KEY(case_id) REFERENCES ncc_case(id),
 FOREIGN KEY(source_line_id) REFERENCES chi_tiet_don_nhap(id),
 FOREIGN KEY(parent_id) REFERENCES ncc_unit(id), FOREIGN KEY(root_id) REFERENCES ncc_unit(id),
 FOREIGN KEY(variant_id) REFERENCES phien_ban_san_pham(id),
 FOREIGN KEY(expected_variant_id) REFERENCES phien_ban_san_pham(id),
 FOREIGN KEY(initial_serial_id) REFERENCES so_serial_san_pham(id),
 FOREIGN KEY(serial_id) REFERENCES so_serial_san_pham(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ncc_event (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 case_id BIGINT NOT NULL, unit_id BIGINT NULL, action VARCHAR(50) NOT NULL,
 old_serial_id BIGINT NULL, new_serial_id BIGINT NULL, voucher_id BIGINT NULL,
 document VARCHAR(100) NOT NULL, note TEXT NULL, payload JSON NOT NULL,
 actor_id BIGINT NOT NULL, occurred_at DATETIME(6) NOT NULL, created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(case_id) REFERENCES ncc_case(id), FOREIGN KEY(unit_id) REFERENCES ncc_unit(id),
 FOREIGN KEY(old_serial_id) REFERENCES so_serial_san_pham(id),
 FOREIGN KEY(new_serial_id) REFERENCES so_serial_san_pham(id),
 FOREIGN KEY(voucher_id) REFERENCES so_quy_thu_chi(id), FOREIGN KEY(actor_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ncc_adjustment (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 event_id BIGINT NOT NULL, source_po_id BIGINT NOT NULL, unit_id BIGINT NULL,
 kind VARCHAR(50) NOT NULL, old_value DECIMAL(15,2) NOT NULL DEFAULT 0,
 credit DECIMAL(15,2) NOT NULL DEFAULT 0, new_value DECIMAL(15,2) NOT NULL DEFAULT 0,
 fee DECIMAL(15,2) NOT NULL DEFAULT 0,
 delta DECIMAL(15,2) GENERATED ALWAYS AS (new_value-credit+fee) STORED,
 UNIQUE KEY uk_ncc_adjustment_event(event_id),
 FOREIGN KEY(event_id) REFERENCES ncc_event(id),
 FOREIGN KEY(source_po_id) REFERENCES don_nhap_hang(id), FOREIGN KEY(unit_id) REFERENCES ncc_unit(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
