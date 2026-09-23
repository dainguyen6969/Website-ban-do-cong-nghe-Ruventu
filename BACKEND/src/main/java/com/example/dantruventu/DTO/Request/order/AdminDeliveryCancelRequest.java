package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminDeliveryCancelRequest {

  @NotBlank(message = "Vui lòng nhập lý do hủy")
  @Size(max = 255, message = "Lý do hủy tối đa 255 ký tự")
  @JsonProperty("ly_do")
  private String lyDo;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
