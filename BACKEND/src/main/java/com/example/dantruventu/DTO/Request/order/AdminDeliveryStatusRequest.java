package com.example.dantruventu.DTO.Request.order;

import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminDeliveryStatusRequest {

  @NotNull(message = "Vui lòng chọn trạng thái giao hàng")
  @JsonProperty("trang_thai_giao_hang")
  private TrangThaiGiaoHangEnum trangThaiGiaoHang;

  @JsonProperty("xac_nhan_da_thu_cod")
  private Boolean xacNhanDaThuCod;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }
}
