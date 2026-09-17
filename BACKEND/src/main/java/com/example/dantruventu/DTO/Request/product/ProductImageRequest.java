package com.example.dantruventu.DTO.Request.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductImageRequest {

  @JsonProperty("duong_dan_anh")
  @NotBlank(message = "Đường dẫn ảnh không được để trống")
  private String duongDanAnh;

  @Builder.Default
  @JsonProperty("la_anh_chinh")
  private Boolean laAnhChinh = false;

  @Builder.Default
  @JsonProperty("thu_tu_hien_thi")
  @Min(value = 0, message = "Thứ tự hiển thị không hợp lệ")
  private Integer thuTuHienThi = 0;
}
