package com.example.dantruventu.DTO.Request.warehouse;

import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Error.CatalogException;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import tools.jackson.databind.JsonNode;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComboComponentRequest extends CatalogFields.WarrantyInput {

  @JsonProperty("phien_ban_thanh_phan_id")
  @NotNull
  @Positive
  private Long phienBanThanhPhanId;

  @Setter(AccessLevel.NONE)
  @JsonProperty("so_luong")
  @NotNull
  @Positive
  private Integer soLuong;

  @JsonSetter("so_luong")
  public void readQuantity(JsonNode value) {
    if (value == null
        || !value.isIntegralNumber()
        || !value.canConvertToInt()
        || value.intValue() <= 0) {
      throw CatalogException.bad(
          "thanh_phan", "INVALID_COMPONENT_QUANTITY", "Số lượng linh kiện phải là số nguyên dương");
    }
    soLuong = value.intValue();
  }
}
