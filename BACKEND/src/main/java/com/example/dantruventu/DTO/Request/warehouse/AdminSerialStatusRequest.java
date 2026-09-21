package com.example.dantruventu.DTO.Request.warehouse;

import com.example.dantruventu.Enum.TrangThaiSerial;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import tools.jackson.databind.JsonNode;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSerialStatusRequest {

  @JsonProperty("trang_thai")
  @NotNull(message = "Trạng thái không được để trống")
  private TrangThaiSerial trangThai;

  @JsonProperty("ly_do")
  @NotBlank(message = "Lý do không được để trống")
  @Size(max = 150, message = "Lý do tối đa 150 ký tự")
  private String lyDo;

  @JsonAnySetter
  public void rejectUnknownField(String name, JsonNode value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
