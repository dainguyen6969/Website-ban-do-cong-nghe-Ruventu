package com.example.dantruventu.DTO.Response.partner;

import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class AdminShippingDeliveryResponse {

  private Long id;

  @JsonProperty("ma_phieu_giao_hang")
  private String maPhieuGiaoHang;

  @JsonProperty("ma_van_don")
  private String maVanDon;

  @JsonProperty("don_hang_id")
  private Long donHangId;

  @JsonProperty("ma_don_hang")
  private String maDonHang;

  @JsonProperty("trang_thai_giao_hang")
  private TrangThaiGiaoHangEnum trangThaiGiaoHang;

  @JsonProperty("tien_thu_ho_cod")
  private BigDecimal tienThuHoCod;

  @JsonProperty("phi_tra_doi_tac")
  private BigDecimal phiTraDoiTac;

  @JsonProperty("ghi_chu_don_hang")
  private String ghiChuDonHang;

  @JsonProperty("ngay_tao")
  private OffsetDateTime ngayTao;

  @JsonProperty("ngay_cap_nhat")
  private OffsetDateTime ngayCapNhat;
}
