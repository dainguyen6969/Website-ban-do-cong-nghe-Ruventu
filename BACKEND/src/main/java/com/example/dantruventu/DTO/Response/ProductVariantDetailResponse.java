package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
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
public class ProductVariantDetailResponse {

  private Long id;
  private Long sanPhamId;
  private String tenPhienBan;
  private String maVach;
  private BigDecimal giaBanLe;
  private BigDecimal khoiLuong;
  private Short trangThai;

  @JsonInclude(JsonInclude.Include.ALWAYS)
  private Long tonThucTe;

  @JsonInclude(JsonInclude.Include.ALWAYS)
  private Long tonCoTheBan;

  private Boolean conHang;

  @JsonInclude(JsonInclude.Include.ALWAYS)
  private Long soBoCoTheLap;

  private Boolean coTheBan;

  private String lyDoChuaTheBan;
}
