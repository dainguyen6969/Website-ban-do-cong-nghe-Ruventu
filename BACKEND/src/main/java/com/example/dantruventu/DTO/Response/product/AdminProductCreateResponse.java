package com.example.dantruventu.DTO.Response.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductCreateResponse {

  private Long id;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("danh_sach_phien_ban")
  private List<Long> danhSachPhienBan;
}
