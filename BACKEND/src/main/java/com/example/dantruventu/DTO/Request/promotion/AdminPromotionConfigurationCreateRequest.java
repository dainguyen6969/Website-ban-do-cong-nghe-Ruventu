package com.example.dantruventu.DTO.Request.promotion;

import com.example.dantruventu.Enum.LoaiChietKhau;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonDeserialize;

@Getter
@Setter
public class AdminPromotionConfigurationCreateRequest extends AdminPromotionCreateRequest {

  @JsonProperty("loai_chiet_khau")
  private LoaiChietKhau loaiChietKhau;

  @PositiveOrZero(message = "Giá trị hàng tối thiểu không được âm")
  @Digits(integer = 13, fraction = 2, message = "Giá trị hàng tối thiểu không hợp lệ")
  @JsonProperty("gia_tri_hang_toi_thieu")
  private BigDecimal giaTriHangToiThieu;

  @PositiveOrZero(message = "Số lượng mua tối thiểu không được âm")
  @JsonDeserialize(using = StrictInteger.class)
  @JsonProperty("so_luong_mua_toi_thieu")
  private Integer soLuongMuaToiThieu;

  @Positive(message = "Mức giảm tối đa phải lớn hơn 0")
  @Digits(integer = 13, fraction = 2, message = "Mức giảm tối đa không hợp lệ")
  @JsonProperty("muc_giam_toi_da")
  private BigDecimal mucGiamToiDa;

  @Positive(message = "Danh mục được chọn không hợp lệ. Vui lòng chọn lại.")
  @JsonDeserialize(using = StrictLong.class)
  @JsonProperty("danh_muc_id")
  private Long danhMucId;

  @Positive(message = "Thương hiệu được chọn không hợp lệ. Vui lòng chọn lại.")
  @JsonDeserialize(using = StrictLong.class)
  @JsonProperty("thuong_hieu_id")
  private Long thuongHieuId;

  @JsonProperty("trang_thai")
  private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;
}
