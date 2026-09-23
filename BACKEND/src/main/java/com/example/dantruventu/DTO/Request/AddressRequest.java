package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressRequest {
  @JsonProperty("ten_nguoi_nhan")
  @NotBlank(message = "Tên người nhận không được để trống")
  private String tenNguoiNhan;

  @JsonProperty("so_dien_thoai")
  @NotBlank(message = "Số điện thoại không được để trống")
  @Pattern(
      regexp = "^(0|\\+84)(3|5|7|8|9)[0-9]{8}$",
      message = "Số điện thoại không đúng định dạng Việt Nam")
  private String soDienThoai;

  @JsonProperty("dia_chi_chi_tiet")
  @NotBlank(message = "Địa chỉ chi tiết không được để trống")
  private String diaChiChiTiet;

  @JsonProperty("phuong_xa")
  @NotBlank(message = "Phường xã không được để trống")
  private String phuongXa;

  @JsonProperty("tinh_thanh")
  @NotBlank(message = "Tỉnh thành không được để trống")
  private String tinhThanh;

  @JsonProperty("la_mac_dinh")
  private Boolean laMacDinh;
}
