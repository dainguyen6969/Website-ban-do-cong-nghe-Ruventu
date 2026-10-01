package com.example.dantruventu.DTO.Response.customer;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDefaultAddressResponse {

  private Long id;

  @JsonProperty("ten_nguoi_nhan")
  private String tenNguoiNhan;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  @JsonProperty("tinh_thanh")
  private String tinhThanh;

  @JsonProperty("phuong_xa")
  private String phuongXa;

  @JsonProperty("dia_chi_chi_tiet")
  private String diaChiChiTiet;

  @JsonProperty("la_mac_dinh")
  private Boolean laMacDinh;
}
