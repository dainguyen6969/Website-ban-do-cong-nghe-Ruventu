package com.example.dantruventu.DTO.Request.partner;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminShippingPartnerStatusRequest {

  @NotNull(message = "Vui lòng nhập trạng thái")
  @Min(value = 0, message = "Trạng thái chỉ nhận 0 hoặc 1")
  @Max(value = 1, message = "Trạng thái chỉ nhận 0 hoặc 1")
  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
