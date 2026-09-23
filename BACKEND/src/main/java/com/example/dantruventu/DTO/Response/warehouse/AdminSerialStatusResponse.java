package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiSerial;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSerialStatusResponse {

  private Long id;

  @JsonProperty("so_serial")
  private String soSerial;

  @JsonProperty("trang_thai")
  private TrangThaiSerial trangThai;

  @JsonProperty("don_hang_id")
  private Long donHangId;
}
