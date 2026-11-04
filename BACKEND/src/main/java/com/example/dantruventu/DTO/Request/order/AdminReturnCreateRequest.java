package com.example.dantruventu.DTO.Request.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.deser.std.StdDeserializer;

@Getter
@Setter
public class AdminReturnCreateRequest {

  @NotNull(message = "Đơn hàng không được để trống")
  @Positive(message = "Đơn hàng không hợp lệ")
  @JsonProperty("don_hang_id")
  @JsonDeserialize(using = StrictLong.class)
  private Long donHangId;

  @NotBlank(message = "Tên người liên hệ không được để trống")
  @Size(max = 100, message = "Tên người liên hệ tối đa 100 ký tự")
  @JsonProperty("ten_nguoi_lien_he")
  private String tenNguoiLienHe;

  @NotBlank(message = "Số điện thoại người liên hệ không được để trống")
  @Size(max = 20, message = "Số điện thoại người liên hệ tối đa 20 ký tự")
  @JsonProperty("sdt_nguoi_lien_he")
  private String sdtNguoiLienHe;

  @NotBlank(message = "Lý do trả hàng không được để trống")
  @Size(max = 255, message = "Lý do trả hàng tối đa 255 ký tự")
  @JsonProperty("ly_do_tra")
  private String lyDoTra;

  @NotBlank(message = "Hình thức hoàn tiền không được để trống")
  @Pattern(
      regexp = "TIEN_MAT|CHUYEN_KHOAN",
      message = "Hình thức hoàn tiền chỉ nhận TIEN_MAT hoặc CHUYEN_KHOAN")
  @JsonProperty("hinh_thuc_hoan_tien")
  private String hinhThucHoanTien;

  @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
  @JsonProperty("ghi_chu")
  private String ghiChu;

  @NotEmpty(message = "Phải chọn ít nhất một sản phẩm trả")
  @Size(max = 1000, message = "Tối đa 1000 dòng sản phẩm trả")
  @JsonProperty("chi_tiet_tra")
  private List<@NotNull @Valid ReturnLine> chiTietTra;

  // E167 provides null only; client-supplied approval cannot authorize an exception.
  @JsonProperty("phe_duyet_ngoai_le")
  private Map<String, Object> pheDuyetNgoaiLe;

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  @Getter
  @Setter
  public static class ReturnLine {

    @NotNull(message = "Chi tiết đơn hàng không được để trống")
    @Positive(message = "Chi tiết đơn hàng không hợp lệ")
    @JsonProperty("chi_tiet_don_hang_id")
    @JsonDeserialize(using = StrictLong.class)
    private Long chiTietDonHangId;

    @NotNull(message = "Số lượng trả không được để trống")
    @Positive(message = "Số lượng trả phải là số nguyên dương")
    @JsonProperty("so_luong")
    @JsonDeserialize(using = StrictInteger.class)
    private Integer soLuong;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }

  public static final class StrictLong extends StdDeserializer<Long> {
    public StrictLong() {
      super(Long.class);
    }

    @Override
    public Long deserialize(JsonParser parser, DeserializationContext context) {
      if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT) {
        return context.reportInputMismatch(Long.class, "ID phải là số nguyên");
      }
      return parser.getLongValue();
    }
  }

  public static final class StrictInteger extends StdDeserializer<Integer> {
    public StrictInteger() {
      super(Integer.class);
    }

    @Override
    public Integer deserialize(JsonParser parser, DeserializationContext context) {
      if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT) {
        return context.reportInputMismatch(Integer.class, "Số lượng trả phải là số nguyên dương");
      }
      return parser.getIntValue();
    }
  }
}
