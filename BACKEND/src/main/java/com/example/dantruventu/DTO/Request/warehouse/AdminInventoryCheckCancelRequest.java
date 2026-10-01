package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminInventoryCheckCancelRequest {

  @JsonProperty("ly_do")
  @NotBlank(message = "Lý do hủy không được để trống")
  @Size(max = 255, message = "Lý do hủy tối đa 255 ký tự")
  private String lyDo;
}
