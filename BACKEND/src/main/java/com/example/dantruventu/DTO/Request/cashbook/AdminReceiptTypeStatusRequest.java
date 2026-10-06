package com.example.dantruventu.DTO.Request.cashbook;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AdminReceiptTypeStatusRequest {

  @JsonProperty("trang_thai")
  private Object trangThai;
}
