package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class AdminInventoryCheckCreateRequest {

  @JsonProperty("phien_ban_id")
  @NotNull(message = "Phiên bản sản phẩm không được để trống")
  @Positive(message = "Phiên bản sản phẩm không hợp lệ")
  private Long phienBanId;

  @JsonProperty("ton_thuc_te")
  @NotNull(message = "Tồn thực tế không được để trống")
  @Min(value = 0, message = "Tồn thực tế không được âm")
  private Integer tonThucTe;

  @JsonProperty("ly_do")
  @NotBlank(message = "Lý do kiểm hàng không được để trống")
  @Size(max = 255, message = "Lý do kiểm hàng tối đa 255 ký tự")
  private String lyDo;
}
