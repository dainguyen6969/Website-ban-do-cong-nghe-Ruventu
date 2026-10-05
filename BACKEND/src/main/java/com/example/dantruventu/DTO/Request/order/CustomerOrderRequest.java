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
  public static class Cancel extends AdminSalesRequest.StrictRequest {

    @NotBlank(message = "Lý do hủy không được để trống")
    @Size(max = 255, message = "Lý do hủy tối đa 255 ký tự")
    @JsonProperty("ly_do")
    private String lyDo;
  }
}
