package com.example.dantruventu.DTO.Request.partner;

import com.example.dantruventu.Enum.LoaiDoiTacVanChuyenEnum;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminShippingPartnerCreateRequest {

  @NotBlank(message = "Tên đối tác không được để trống")
  @Size(max = 100, message = "Tên đối tác tối đa 100 ký tự")
  @JsonProperty("ten_doi_tac")
  private String tenDoiTac;

  @NotBlank(message = "Số điện thoại không được để trống")
  @Size(max = 15, message = "Số điện thoại tối đa 15 ký tự sau chuẩn hóa")
  @Pattern(
      regexp = "\\+?[0-9]{9,15}",
      message = "Số điện thoại gồm 9–15 chữ số, có thể bắt đầu bằng dấu +")
  @JsonProperty("so_dien_thoai")
  private String soDienThoai;

  @NotNull(message = "Vui lòng chọn loại đối tác")
  @JsonProperty("loai_doi_tac")
  private LoaiDoiTacVanChuyenEnum loaiDoiTac;

  @Email(message = "Email không đúng định dạng")
  @Size(max = 100, message = "Email tối đa 100 ký tự")
  private String email;

  @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
  @JsonProperty("dia_chi")
  private String diaChi;

  @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự")
  @JsonProperty("ghi_chu")
  private String ghiChu;

  public void setTenDoiTac(String value) {
    this.tenDoiTac = normalizeOptional(value);
  }

  public void setSoDienThoai(String value) {
    String phone = normalizeOptional(value);

    if (phone != null) {
      phone = phone.replaceAll("[\\s().-]", "");

      if (phone.startsWith("+84")) {
        phone = "0" + phone.substring(3);
      }
    }

    this.soDienThoai = phone;
  }

  public void setEmail(String value) {
    this.email = normalizeOptional(value);
  }

  public void setDiaChi(String value) {
    this.diaChi = normalizeOptional(value);
  }

  public void setGhiChu(String value) {
    this.ghiChu = normalizeOptional(value);
  }

  @JsonAnySetter
  public void rejectUnknownField(String name, Object value) {
    throw new IllegalArgumentException("Trường không được hỗ trợ: " + name);
  }

  private static String normalizeOptional(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }
}
