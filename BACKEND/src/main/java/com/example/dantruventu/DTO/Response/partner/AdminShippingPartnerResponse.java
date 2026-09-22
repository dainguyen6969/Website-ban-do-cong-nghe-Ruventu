package com.example.dantruventu.DTO.Response.partner;

import com.example.dantruventu.Enum.LoaiDoiTacVanChuyenEnum;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class AdminShippingPartnerResponse {

  private Long id;

  @JsonProperty("ma_doi_tac")
  private String maDoiTac;

  @JsonProperty("ten_doi_tac")
  private String tenDoiTac;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  @JsonProperty("loai_doi_tac")
  private LoaiDoiTacVanChuyenEnum loaiDoiTac;

  private String email;

  @JsonProperty("dia_chi")
  private String diaChi;

  @JsonProperty("ghi_chu")
  private String ghiChu;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("ngay_tao")
  private OffsetDateTime ngayTao;

  @JsonProperty("ngay_cap_nhat")
  private OffsetDateTime ngayCapNhat;
}
