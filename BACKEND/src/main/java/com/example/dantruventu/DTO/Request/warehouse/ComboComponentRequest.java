package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComboComponentRequest {

  @JsonProperty("phien_ban_thanh_phan_id")
  @NotNull(message = "Thiếu phiên bản thành phần")
  @Positive(message = "ID phiên bản phải lớn hơn 0")
  private Long phienBanThanhPhanId;

  @JsonProperty("so_luong")
  @NotNull(message = "Thiếu số lượng thành phần")
  @Positive(message = "Số lượng thành phần phải lớn hơn 0")
  private Integer soLuong;
}
