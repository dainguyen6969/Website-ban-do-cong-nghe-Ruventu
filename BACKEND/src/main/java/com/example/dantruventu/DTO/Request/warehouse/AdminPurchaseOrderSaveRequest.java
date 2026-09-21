package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderSaveRequest {

  @JsonProperty("nha_cung_cap_id")
  @NotNull(message = "Nhà cung cấp không được để trống")
  private Long nhaCungCapId;

  @JsonProperty("kho_hang_id")
  @NotNull(message = "Kho hàng không được để trống")
  private Long khoHangId;

  @JsonProperty("ap_dung_thue")
  @NotNull(message = "Thông tin áp dụng thuế không được để trống")
  private Boolean apDungThue;

  @Valid
  @NotEmpty(message = "Đơn nhập phải có ít nhất một sản phẩm")
  private List<Item> items;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Item {

    @JsonProperty("phien_ban_id")
    @NotNull(message = "Phiên bản không được để trống")
    private Long phienBanId;

    @JsonProperty("so_luong")
    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    private Integer soLuong;

    @JsonProperty("gia_nhap")
    @NotNull(message = "Giá nhập không được để trống")
    @DecimalMin(value = "0.01", message = "Giá nhập phải lớn hơn 0")
    private BigDecimal giaNhap;
  }
}
