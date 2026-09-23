package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderReceiveRequest {

  @JsonProperty("kho_hang_id")
  @NotNull(message = "Kho hàng không được để trống")
  private Long khoHangId;

  @Valid
  @NotEmpty(message = "Danh sách nhập kho không được trống")
  private List<Item> items;

  @JsonProperty("xac_nhan_nhap_thua")
  @Builder.Default
  private Boolean xacNhanNhapThua = false;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Item {

    @JsonProperty("chi_tiet_don_nhap_id")
    @NotNull(message = "Chi tiết đơn nhập không được để trống")
    private Long chiTietDonNhapId;

    @JsonProperty("so_luong_nhap_kho")
    @NotNull
    @Min(value = 1, message = "Số lượng nhập kho phải lớn hơn 0")
    private Integer soLuongNhapKho;

    @JsonProperty("quan_ly_serial")
    @NotNull(message = "Phải xác định chế độ quản lý Serial")
    private Boolean quanLySerial;

    @JsonProperty("so_serials")
    @NotNull(message = "Danh sách Serial không được null")
    private List<String> soSerials;
  }
}
