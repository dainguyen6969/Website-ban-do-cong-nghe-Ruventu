package com.example.dantruventu.DTO.Response.cashbook;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonPropertyOrder({
  "id",
  "ten_nguoi_nop_nhan",
  "nguoi_nop_nhan_id",
  "doi_tac_van_chuyen_id",
  "nha_cung_cap_id",
  "so_dien_thoai"
})
public class PayerSuggestionResponse {

  @JsonProperty("nguoi_nop_nhan_id")
  private Long nguoiNopNhanId;

  @JsonProperty("nha_cung_cap_id")
  private Long nhaCungCapId;

  @JsonProperty("doi_tac_van_chuyen_id")
  private Long doiTacVanChuyenId;

  private Long id;

  @JsonProperty("ten_nguoi_nop_nhan")
  private String tenNguoiNopNhan;

  @JsonProperty("so_dien_thoai")
  private String soDienThoai;
}
