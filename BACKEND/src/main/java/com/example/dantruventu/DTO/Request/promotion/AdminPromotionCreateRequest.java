package com.example.dantruventu.DTO.Request.promotion;

import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminPromotionCreateRequest {

  @NotBlank(message = "Mã chương trình không được để trống")
  @Size(max = 255, message = "Mã chương trình tối đa 255 ký tự")
  @JsonProperty("ma_chuong_trinh")
  private String maChuongTrinh;

  @NotBlank(message = "Tên chương trình không được để trống")
  @Size(max = 255, message = "Tên chương trình tối đa 255 ký tự")
  @JsonProperty("ten_chuong_trinh")
  private String tenChuongTrinh;

  @NotNull(message = "Phương thức khuyến mại không được để trống")
  @JsonProperty("phuong_thuc_khuyen_mai")
  private PhuongThucKhuyenMai phuongThucKhuyenMai;

  @NotNull(message = "Đối tượng khuyến mại không được để trống")
  @JsonProperty("doi_tuong_khuyen_mai")
  private DoiTuongKhuyenMai doiTuongKhuyenMai;

  @Positive(message = "Số lượng áp dụng phải là số nguyên dương")
  @JsonProperty("so_luong_ap_dung")
  private Integer soLuongApDung;

  @DecimalMin(value = "0", inclusive = false, message = "Giá trị khuyến mại phải lớn hơn 0")
  @Digits(integer = 13, fraction = 2, message = "Giá trị khuyến mại không hợp lệ")
  @JsonProperty("gia_tri_khuyen_mai")
  private BigDecimal giaTriKhuyenMai;

  @Size(max = 10000, message = "Mô tả tối đa 10000 ký tự")
  @JsonProperty("mo_ta")
  private String moTa;

  @NotNull(message = "Ngày bắt đầu không được để trống")
  @JsonProperty("ngay_bat_dau")
  private OffsetDateTime ngayBatDau;

  @NotNull(message = "Ngày kết thúc không được để trống")
  @JsonProperty("ngay_ket_thuc")
  private OffsetDateTime ngayKetThuc;

  @NotNull(message = "Chi tiết khuyến mại không được để trống")
  @Size(max = 1000, message = "Tối đa 1000 dòng chi tiết khuyến mại")
  @Valid
  @JsonProperty("chi_tiet_khuyen_mai")
  private List<@NotNull PromotionLine> chiTietKhuyenMai = new ArrayList<>();

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  @Getter
  @Setter
  public static class PromotionLine {

    @NotNull(message = "Phiên bản sản phẩm không được để trống")
    @Positive(message = "Phiên bản sản phẩm không hợp lệ")
    @JsonProperty("phien_ban_id")
    private Long phienBanId;

    @NotNull(message = "Loại áp dụng không được để trống")
    @JsonProperty("loai_ap_dung")
    private LoaiApDungKhuyenMai loaiApDung;

    @NotNull(message = "Số lượng chi tiết không được để trống")
    @Positive(message = "Số lượng chi tiết phải là số nguyên dương")
    @JsonProperty("so_luong")
    private Integer soLuong;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
      throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
    }
  }
}
