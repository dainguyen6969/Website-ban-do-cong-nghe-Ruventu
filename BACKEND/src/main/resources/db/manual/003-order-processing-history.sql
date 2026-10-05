-- Additive migration only; existing orders, stock and serials are unchanged.
CREATE TABLE IF NOT EXISTS lich_su_xu_ly_don_hang (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  don_hang_id BIGINT NOT NULL,
  nguoi_thuc_hien_id BIGINT NOT NULL,
  hanh_dong VARCHAR(50) NOT NULL,
  mo_ta VARCHAR(255) NOT NULL,
  trang_thai_don_hang VARCHAR(50) NOT NULL,
  trang_thai_dong_goi VARCHAR(50) NOT NULL,
  trang_thai_xuat_kho VARCHAR(50) NOT NULL,
  ngay_thuc_hien DATETIME(6) NOT NULL,
  INDEX idx_lich_su_don_hang (don_hang_id, ngay_thuc_hien, id),
  CONSTRAINT fk_lich_su_don_hang FOREIGN KEY (don_hang_id) REFERENCES don_hang(id),
  CONSTRAINT fk_lich_su_nguoi_thuc_hien FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
