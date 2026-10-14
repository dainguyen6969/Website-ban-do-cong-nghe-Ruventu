package com.example.dantruventu.DTO.Request.order;

import com.example.dantruventu.Enum.TrangThaiSerial;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminReturnReceiveRequest {

  @NotEmpty(message = "Danh sách hàng nhận không được rỗng")
  @Size(max = 1000, message = "Tối đa 1000 dòng hàng nhận")
  @Valid
  @JsonProperty("hang_nhan")
  private List<@NotNull Item> hangNhan;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  @Getter
  @Setter
  public static class Item {

    @NotNull(message = "Chi tiết đơn hàng không được để trống")
    @Positive(message = "Chi tiết đơn hàng không hợp lệ")
    @JsonProperty("chi_tiet_don_hang_id")
    private Long chiTietDonHangId;

    @NotNull(message = "Phiên bản sản phẩm không được để trống")
    @Positive(message = "Phiên bản sản phẩm không hợp lệ")
    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @NotNull(message = "Kho hàng không được để trống")
    @Positive(message = "Kho hàng không hợp lệ")
    @JsonProperty("kho_hang_id")
    private Long khoHangId;

    @NotNull(message = "Số lượng nguyên vẹn không được để trống")
    @Min(value = 0, message = "Số lượng nguyên vẹn không được âm")
    @JsonProperty("so_luong_nguyen_ven")
    private Integer soLuongNguyenVen;

    @NotNull(message = "Số lượng lỗi không được để trống")
    @Min(value = 0, message = "Số lượng lỗi không được âm")
    @JsonProperty("so_luong_loi")
    private Integer soLuongLoi;

    @NotNull(message = "Danh sách serial không được để trống")
    @Size(max = 1000, message = "Tối đa 1000 serial mỗi dòng")
    @Valid
    private List<@NotNull SerialItem> serials = new ArrayList<>();

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }

  @Getter
  @Setter
  public static class SerialItem {

    @NotNull(message = "Serial không được để trống")
    @Positive(message = "Serial không hợp lệ")
    @JsonProperty("so_serial_id")
    private Long soSerialId;

    @NotNull(message = "Trạng thái serial sau nhận không được để trống")
    @JsonProperty("trang_thai_sau_nhan")
    private TrangThaiSerial trangThaiSauNhan;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }
}
