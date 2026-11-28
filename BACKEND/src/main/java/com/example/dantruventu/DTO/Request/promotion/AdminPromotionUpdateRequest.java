package com.example.dantruventu.DTO.Request.promotion;

import com.example.dantruventu.Error.PromotionErrorMessages;
import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.annotation.JsonDeserialize;

public class AdminPromotionUpdateRequest {

  public static final Set<String> EDITABLE_FIELDS =
      Set.of(
          "ma_chuong_trinh",
          "ten_chuong_trinh",
          "phuong_thuc_khuyen_mai",
          "doi_tuong_khuyen_mai",
          "loai_chiet_khau",
          "gia_tri_khuyen_mai",
          "gia_tri_hang_toi_thieu",
          "so_luong_mua_toi_thieu",
          "muc_giam_toi_da",
          "danh_muc_id",
          "thuong_hieu_id",
          "so_luong_ap_dung",
          "ngay_bat_dau",
          "ngay_ket_thuc",
          "mo_ta",
          "chi_tiet_khuyen_mai");

  @Getter
  @Setter
  @NotNull(message = "Vui lòng tải lại chương trình để xác nhận thông tin mới nhất.")
  @Positive(message = "Thông tin xác nhận không hợp lệ. Vui lòng tải lại chương trình.")
  @JsonDeserialize(using = AdminPromotionCreateRequest.StrictInteger.class)
  @JsonProperty("phien_ban_cau_hinh_xac_nhan")
  private Integer confirmedVersion;

  private final Map<String, JsonNode> fields = new TreeMap<>();

  @JsonAnySetter
  public void setField(String name, JsonNode value) {
    if (!EDITABLE_FIELDS.contains(name)) {
      throw new IllegalArgumentException(PromotionErrorMessages.UNSUPPORTED_CONTENT);
    }
    fields.put(name, value);
  }

  @JsonAnyGetter
  public Map<String, JsonNode> getFields() {
    return java.util.Collections.unmodifiableMap(fields);
  }
}
