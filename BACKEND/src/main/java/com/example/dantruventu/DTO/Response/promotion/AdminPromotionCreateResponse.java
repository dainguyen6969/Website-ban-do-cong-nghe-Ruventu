package com.example.dantruventu.DTO.Response.promotion;

import com.example.dantruventu.Enum.LoaiChietKhau;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor
@SuperBuilder
public class AdminPromotionCreateResponse extends AdminPromotionMutationResponse {

  @JsonProperty("loai_chiet_khau")
  private LoaiChietKhau loaiChietKhau;

  @JsonProperty("gia_tri_hang_toi_thieu")
  private BigDecimal giaTriHangToiThieu;

  @JsonProperty("so_luong_mua_toi_thieu")
  private int soLuongMuaToiThieu;

  @JsonProperty("muc_giam_toi_da")
  private BigDecimal mucGiamToiDa;

  @JsonProperty("danh_muc_id")
  private Long danhMucId;

  @JsonProperty("thuong_hieu_id")
  private Long thuongHieuId;

  @JsonProperty("phien_ban_cau_hinh")
  private int phienBanCauHinh;

  @JsonProperty("so_luong_dang_giu")
  private int soLuongDangGiu;

  @JsonProperty("so_luong_da_giai_phong")
  private int soLuongDaGiaiPhong;

  @JsonProperty("co_the_sua_cau_hinh")
  private boolean coTheSuaCauHinh;

  @JsonProperty("co_the_xoa")
  private boolean coTheXoa;
}
