package com.example.dantruventu.DTO.catalog;

import com.example.dantruventu.Error.CatalogException;
import com.fasterxml.jackson.annotation.*;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.JsonNode;

public final class CatalogFields {

  private CatalogFields() {}

  /**
   * Giữ riêng trạng thái "không gửi" và "có gửi null". BO_PC cấm cả hai trường hợp gửi 0 hoặc gửi
   * null.
   */
  public static class WarrantyInput {

    private JsonNode warrantyValue;
    private boolean warrantyProvided;

    @JsonSetter("thoi_han_bao_hanh_thang")
    public void readWarranty(JsonNode value) {
      warrantyProvided = true;
      warrantyValue = value;
    }

    @JsonIgnore
    public JsonNode getWarrantyValue() {
      return warrantyValue;
    }

    @JsonIgnore
    public boolean isWarrantyProvided() {
      return warrantyProvided;
    }

    @JsonAnySetter
    public void rejectUnknownField(String name, JsonNode value) {
      throw CatalogException.bad(name, "UNSUPPORTED_FIELD", "Trường không được hỗ trợ: " + name);
    }
  }

  /** Các trường phản hồi được service điền sau khi đọc cấu hình và tồn kho. */
  @Getter
  @Setter
  public static class Metadata {

    @JsonProperty("thoi_han_bao_hanh_thang")
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Integer thoiHanBaoHanhThang;

    @JsonProperty("bao_hanh_theo_linh_kien")
    private Boolean baoHanhTheoLinhKien;

    @JsonProperty("co_quan_ly_serial")
    private Boolean coQuanLySerial;

    @JsonProperty("so_bo_co_the_lap")
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Long soBoCoTheLap;

    @JsonProperty("da_co_cau_hinh_combo")
    private Boolean daCoCauHinhCombo;

    @JsonProperty("so_thanh_phan")
    private Integer soThanhPhan;

    @JsonProperty("con_hang")
    private Boolean conHang;

    @JsonProperty("co_the_ban")
    private Boolean coTheBan;

    @JsonProperty("ly_do_chua_the_ban")
    private String lyDoChuaTheBan;
  }

  public record AttributeInput(
      @JsonProperty("ten_thuoc_tinh") JsonNode tenThuocTinh,
      @JsonProperty("gia_tri") JsonNode giaTri) {

    @JsonAnySetter
    public void rejectUnknownField(String name, JsonNode value) {
      throw CatalogException.bad(
          "thuoc_tinh_phien_ban",
          "ATTRIBUTE_FIELD_UNSUPPORTED",
          "Thuộc tính chỉ nhận ten_thuoc_tinh và gia_tri; không nhận " + name);
    }
  }

  public record AttributeData(
      Long id,
      @JsonProperty("ten_thuoc_tinh") String tenThuocTinh,
      @JsonProperty("gia_tri") String giaTri) {}

  public record AttributesRequest(
      @JsonProperty("thuoc_tinh_phien_ban") List<AttributeInput> thuocTinhPhienBan) {}

  public record AttributesResponse(
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("san_pham_id") Long sanPhamId,
      @JsonProperty("thuoc_tinh_phien_ban") List<AttributeData> thuocTinhPhienBan) {}
}
