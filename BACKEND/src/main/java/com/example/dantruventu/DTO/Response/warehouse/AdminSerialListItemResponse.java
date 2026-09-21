package com.example.dantruventu.DTO.Response.warehouse;

import com.example.dantruventu.Enum.TrangThaiSerial;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSerialListItemResponse {

  private Long id;

  @JsonProperty("phien_ban_id")
  private Long phienBanId;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("ten_phien_ban")
  private String tenPhienBan;

  @JsonProperty("ma_vach")
  private String maVach;

  @JsonProperty("so_serial")
  private String soSerial;

  @JsonProperty("trang_thai")
  private TrangThaiSerial trangThai;

  @JsonProperty("don_hang_id")
  private Long donHangId;

  @JsonProperty("ngay_kich_hoat")
  private OffsetDateTime ngayKichHoat;

  @JsonProperty("han_bao_hanh")
  private OffsetDateTime hanBaoHanh;
}
