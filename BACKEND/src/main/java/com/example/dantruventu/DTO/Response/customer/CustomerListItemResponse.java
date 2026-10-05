package com.example.dantruventu.DTO.Response.customer;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerListItemResponse {

  private Long id;

  @JsonProperty("ho_ten")
  private String hoTen;

  private String email;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  @JsonProperty("trang_thai")
  private Integer trangThai;
}
