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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CartItemMutationResponse {

  private int status;
  private String message;
  private CartItemData data;
  private CartSummary cartSummary;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class CartItemData {

    private Long cartItemId;
    private Long phienBanId;
    private Integer soLuong;
    private BigDecimal donGia;
    private BigDecimal thanhTien;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class CartSummary {

    private Integer tongSoLuong;
    private BigDecimal tamTinh;
    private BigDecimal giamGia;
    private BigDecimal tongTien;
  }
}
