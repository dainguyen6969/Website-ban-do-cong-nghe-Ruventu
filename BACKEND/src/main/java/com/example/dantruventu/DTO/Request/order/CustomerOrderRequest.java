package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

public final class CustomerOrderRequest {

  private CustomerOrderRequest() {}

  @Getter
  @Setter
  public static class Cancel {

    @NotBlank(message = "Lý do hủy không được để trống")
    @Size(max = 500, message = "Lý do hủy không được vượt quá 500 ký tự")
    @JsonProperty("ly_do")
    private String lyDo;
  }
}
