package com.example.dantruventu.DTO.Request.warehouse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPurchaseOrderReturnRequest {

  @Valid
  @NotEmpty(message = "Danh sách hàng trả không được trống")
  private List<Item> items;

  @JsonProperty("ly_do")
  @NotBlank(message = "Lý do trả hàng không được để trống")
  private String lyDo;

  @JsonProperty("xac_nhan_da_nhan_tien")
  @NotNull
  private Boolean xacNhanDaNhanTien;

  @JsonProperty("phuong_thuc_hoan")
  private String phuongThucHoan;

  @JsonProperty("ngay_nhan_tien")
  private OffsetDateTime ngayNhanTien;

  @JsonProperty("ma_giao_dich")
  private String maGiaoDich;

  @JsonProperty("ghi_chu")
  private String ghiChu;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class Item {

    @JsonProperty("chi_tiet_don_nhap_id")
    @NotNull
    private Long chiTietDonNhapId;

    @JsonProperty("so_luong_tra")
    @NotNull
    @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
    private Integer soLuongTra;

    @JsonProperty("so_luong_loi")
    @NotNull
    @Min(value = 0, message = "Số lượng lỗi không được âm")
    private Integer soLuongLoi;
  }
}
