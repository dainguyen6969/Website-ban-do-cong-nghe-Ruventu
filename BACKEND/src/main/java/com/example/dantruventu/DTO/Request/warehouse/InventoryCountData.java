package com.example.dantruventu.DTO.Request.warehouse;

import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckCreateResponse;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class InventoryCountData {

  private InventoryCountData() {}

  public record SerialRow(
      Long id,
      @JsonProperty("so_serial") String code,
      @JsonProperty("trang_thai") TrangThaiSerial status) {}

  public record Audit(
      @JsonProperty("he_thong") List<SerialRow> system,
      @JsonProperty("da_kiem") List<String> scanned,
      @JsonProperty("thieu") List<String> missing,
      @JsonProperty("ngoai_danh_sach") List<String> unknown) {}

  public record Requirement(
      @JsonProperty("phien_ban_id") Long variantId,
      @JsonProperty("ma_san_pham") String productCode,
      @JsonProperty("ten_san_pham") String productName,
      @JsonProperty("ten_phien_ban") String variantName,
      @JsonProperty("so_luong_trong_bo") int perKit,
      @JsonProperty("ton_he_thong") int stock,
      @JsonProperty("quan_ly_serial") boolean serialManaged,
      List<SerialRow> serials) {}

  public record Requirements(
      @JsonProperty("phien_ban_nguon_id") Long sourceId,
      @JsonProperty("loai_san_pham") LoaiSanPham productType,
      List<Requirement> items) {}

  public record BatchRequest(
      @JsonProperty("phien_ban_nguon_id") @NotNull @Positive Long sourceId,
      @Valid @NotEmpty @Size(max = 100) List<AdminInventoryCheckCreateRequest> items) {}

  public record BatchResult(
      @JsonProperty("phien_ban_nguon_id") Long sourceId,
      List<AdminInventoryCheckCreateResponse> items) {}
}
