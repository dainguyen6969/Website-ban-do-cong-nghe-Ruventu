package com.example.dantruventu.DTO.Request.cashbook;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertFalse;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AdminReceiptCreateRequest {

  @JsonProperty("ma_phieu")
  @NotBlank(message = "Mã phiếu không được để trống")
  @Size(max = 50, message = "Mã phiếu tối đa 50 ký tự")
  private String maPhieu;

  @JsonProperty("loai_thu_chi_id")
  @NotNull(message = "Loại thu không được để trống")
  private Long loaiThuChiId;

  @JsonProperty("nhom_nguoi_nop_nhan")
  @NotBlank(message = "Nhóm người nộp không được để trống")
  private String nhomNguoiNopNhan;

  @JsonProperty("ten_nguoi_nop_nhan")
  @NotBlank(message = "Tên người nộp không được để trống")
  @Size(max = 150, message = "Tên người nộp tối đa 150 ký tự")
  private String tenNguoiNopNhan;

  @JsonProperty("ma_chung_tu_tham_chieu")
  @Size(max = 100, message = "Mã chứng từ tham chiếu tối đa 100 ký tự")
  private String maChungTuThamChieu;

  @JsonProperty("so_tien")
  @NotNull(message = "Số tiền không được để trống")
  @DecimalMin(value = "0.01", message = "Số tiền phải lớn hơn 0")
  @Digits(integer = 13, fraction = 2, message = "Số tiền không đúng định dạng")
  private BigDecimal soTien;

  @JsonProperty("phuong_thuc_thanh_toan")
  @NotBlank(message = "Phương thức thanh toán không được để trống")
  private String phuongThucThanhToan;

  @JsonProperty("ngay_ghi_nhan")
  @NotNull(message = "Ngày ghi nhận không được để trống")
  private OffsetDateTime ngayGhiNhan;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("tags")
  @Size(max = 255, message = "Tags tối đa 255 ký tự")
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

  @AssertFalse(message = "Không được gửi các trường do backend quản lý")
  @JsonIgnore
  public boolean isBackendManagedFieldProvided() {
    return backendManagedFieldProvided;
  }
}
