package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminDeliveryUpdateRequest {

  @Size(max = 50, message = "Mã vận đơn tối đa 50 ký tự")
  @JsonProperty("ma_van_don")
  private String maVanDon;

  @NotNull(message = "Vui lòng chọn đối tác vận chuyển")
  @Positive(message = "ID đối tác phải lớn hơn 0")
  @JsonProperty("doi_tac_van_chuyen_id")
  private Long doiTacVanChuyenId;

  @NotNull(message = "Vui lòng nhập phí trả đối tác")
  @DecimalMin(value = "0", message = "Phí trả đối tác không được âm")
  @Digits(integer = 13, fraction = 2, message = "Phí trả đối tác vượt giới hạn DECIMAL(15,2)")
  @JsonProperty("phi_tra_doi_tac")
  private BigDecimal phiTraDoiTac;

  public void setMaVanDon(String value) {
    this.maVanDon = value == null || value.isBlank() ? null : value.strip();
  }

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
