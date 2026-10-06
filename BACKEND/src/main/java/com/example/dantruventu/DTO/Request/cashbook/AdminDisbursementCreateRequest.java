package com.example.dantruventu.DTO.Request.cashbook;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AdminDisbursementCreateRequest {

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("loai_thu_chi_id")
  private Long loaiThuChiId;

  @JsonProperty("nhom_nguoi_nop_nhan")
  private String nhomNguoiNopNhan;

  @JsonProperty("ten_nguoi_nop_nhan")
  private String tenNguoiNopNhan;

  @JsonProperty("nguoi_nop_nhan_id")
  private Long nguoiNopNhanId;

  @JsonProperty("doi_tac_van_chuyen_id")
  private Long doiTacVanChuyenId;

  @JsonProperty("nha_cung_cap_id")
  private Long nhaCungCapId;

  @JsonProperty("ma_chung_tu_tham_chieu")
  private String maChungTuThamChieu;

  @JsonProperty("so_tien")
  private BigDecimal soTien;

  @JsonProperty("phuong_thuc_thanh_toan")
  private String phuongThucThanhToan;

  @JsonProperty("ngay_ghi_nhan")
  private OffsetDateTime ngayGhiNhan;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("tags")
  private String tags;

  @JsonIgnore private boolean backendManagedFieldProvided;

  @JsonProperty("loai_phieu")
  public void captureLoaiPhieu(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonProperty("nguon_tao")
  public void captureNguonTao(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonProperty("trang_thai")
  public void captureTrangThai(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonProperty("nguoi_tao_id")
  public void captureNguoiTaoId(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonProperty("id")
  public void captureId(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonProperty("created_at")
  public void captureCreatedAt(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonProperty("updated_at")
  public void captureUpdatedAt(Object ignored) {
    backendManagedFieldProvided = true;
  }

  @JsonIgnore
  public boolean isBackendManagedFieldProvided() {
    return backendManagedFieldProvided;
  }
}
