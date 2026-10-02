package com.example.dantruventu.DTO.Request.customer;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerAddressRequest {

  @JsonProperty("tinh_thanh")
  private String tinhThanh;

  @JsonProperty("phuong_xa")
  private String phuongXa;

  @JsonProperty("dia_chi_chi_tiet")
  private String diaChiChiTiet;
}
