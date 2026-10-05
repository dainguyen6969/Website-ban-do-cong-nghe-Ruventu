package com.example.dantruventu.DTO.Request.promotion;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminPromotionStatusRequest {

  @NotNull(message = "Trạng thái khuyến mại không được để trống")
  @JsonProperty("trang_thai")
  private Integer trangThai;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
