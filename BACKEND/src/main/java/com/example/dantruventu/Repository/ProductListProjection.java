package com.example.dantruventu.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface ProductListProjection {

  Long getId();

  String getTenSanPham();

  String getMaSanPham();

  String getLoaiSanPham();

  Long getDanhMucId();

  String getTenDanhMuc();

  Long getThuongHieuId();

  String getTenThuongHieu();

  String getAnhChinh();

  String getThongSoKyThuat();

  Long getPhienBanMacDinhId();

  BigDecimal getGiaThapNhat();

  BigDecimal getGiaCaoNhat();

  Long getTonKhoKhaDung();

  LocalDateTime getNgayTao();

  Long getSoBoCoTheLap();
}
