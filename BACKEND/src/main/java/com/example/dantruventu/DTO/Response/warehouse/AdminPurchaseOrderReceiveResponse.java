package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiNhapHang;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderReceiveResponse {

  @JsonProperty("don_nhap_hang_id")
  private Long donNhapHangId;

  @JsonProperty("trang_thai_nhap")
  private TrangThaiNhapHang trangThaiNhap;

  private List<Item> items;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Item {

    @JsonProperty("chi_tiet_don_nhap_id")
    private Long chiTietDonNhapId;

    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @JsonProperty("so_luong_nhap_kho")
    private Integer soLuongNhapKho;

    @JsonProperty("quan_ly_serial")
    private Boolean quanLySerial;

    @JsonProperty("che_do_serial_da_xac_lap")
    private Boolean cheDoSerialDaXacLap;

    @JsonProperty("ton_thuc_te_sau_nhap")
    private Integer tonThucTeSauNhap;

    private List<SerialData> serials;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class SerialData {

    private Long id;

    @JsonProperty("so_serial")
    private String soSerial;

    @JsonProperty("trang_thai")
    private TrangThaiSerial trangThai;
  }
}
