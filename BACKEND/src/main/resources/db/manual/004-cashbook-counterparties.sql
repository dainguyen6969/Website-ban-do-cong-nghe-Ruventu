-- Required by SoQuyThuChi; apply once to databases missing these columns.
-- Existing vouchers keep NULL counterparty references.
ALTER TABLE so_quy_thu_chi
  ADD COLUMN nguoi_nop_nhan_id BIGINT NULL,
  ADD COLUMN nha_cung_cap_id BIGINT NULL,
  ADD COLUMN doi_tac_van_chuyen_id BIGINT NULL,
  ADD CONSTRAINT fk_so_quy_nguoi_nop_nhan
    FOREIGN KEY (nguoi_nop_nhan_id) REFERENCES nguoi_dung(id),
  ADD CONSTRAINT fk_so_quy_nha_cung_cap
    FOREIGN KEY (nha_cung_cap_id) REFERENCES nha_cung_cap(id),
  ADD CONSTRAINT fk_so_quy_doi_tac_van_chuyen
    FOREIGN KEY (doi_tac_van_chuyen_id) REFERENCES doi_tac_van_chuyen(id);
