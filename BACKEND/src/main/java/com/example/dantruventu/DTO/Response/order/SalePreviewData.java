package com.example.dantruventu.DTO.Response.order;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SalePreviewData {

  @JsonProperty("ma_xac_nhan_gia")
  private String maXacNhanGia;

  @JsonProperty("het_han_xac_nhan_gia")
  private OffsetDateTime hetHanXacNhanGia;

  @JsonProperty("dau_van_tay_gia")
  private String dauVanTayGia;

  @JsonProperty("khuyen_mai")
  private Map<String, Object> khuyenMai;

  @JsonProperty("qua_tang")
  private List<AdminSalesResponse.PreviewLine> quaTang = List.of();

  @JsonProperty("trang_thai_khuyen_mai")
  private String trangThaiKhuyenMai;

  @JsonProperty("ly_do_khuyen_mai")
  private String lyDoKhuyenMai;

  @JsonProperty("ly_do_tinh_gia")
  private String lyDoTinhGia;

  @JsonProperty("co_the_thanh_toan")
  private Boolean coTheThanhToan;
}
