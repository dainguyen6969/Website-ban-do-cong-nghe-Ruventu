package com.example.dantruventu.DTO.Request.customer;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCustomerRequest {

  @JsonProperty("ho_ten")
  private String hoTen;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  @JsonProperty("email")
  private String email;

  @JsonProperty("dia_chi")
  private CustomerAddressRequest diaChi;
}
