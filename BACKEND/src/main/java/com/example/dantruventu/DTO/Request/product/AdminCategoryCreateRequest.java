package com.example.dantruventu.DTO.Request.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCategoryCreateRequest {

  @JsonProperty("ten_danh_muc")
  @NotBlank(message = "Tên danh mục không được để trống")
  private String tenDanhMuc;

  @JsonProperty("danh_muc_cha_id")
  private Long danhMucChaId;

  @JsonProperty("trang_thai")
  @Min(value = 0, message = "Trạng thái không hợp lệ")
  @Max(value = 1, message = "Trạng thái không hợp lệ")
  private Short trangThai;

  @JsonProperty("anh_dai_dien")
  private String anhDaiDien;
}
