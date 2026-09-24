package com.example.dantruventu.DTO.Request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
public class AddCartItemRequest {

  @JsonProperty("phien_ban_id")
  @NotNull(message = "Phiên bản sản phẩm không được để trống")
  private Long phienBanId;

  @JsonProperty("so_luong")
  @NotNull(message = "Số lượng không được để trống")
  @Min(value = 1, message = "Số lượng phải lớn hơn 0")
  @Max(value = 99, message = "Số lượng không được vượt quá 99")
  private Integer soLuong;
}
