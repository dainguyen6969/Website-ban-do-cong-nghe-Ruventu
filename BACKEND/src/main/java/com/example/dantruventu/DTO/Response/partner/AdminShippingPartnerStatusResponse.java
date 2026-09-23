package com.example.dantruventu.DTO.Response.partner;

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
public class AdminShippingPartnerStatusResponse {

  private Long id;

  @JsonProperty("ma_doi_tac")
  private String maDoiTac;

  @JsonProperty("ten_doi_tac")
  private String tenDoiTac;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("ngay_cap_nhat")
  private OffsetDateTime ngayCapNhat;
}
