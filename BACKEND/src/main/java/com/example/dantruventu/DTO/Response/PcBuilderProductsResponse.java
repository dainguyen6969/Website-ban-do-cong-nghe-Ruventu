package com.example.dantruventu.DTO.Response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record PcBuilderProductsResponse(
    @JsonProperty("ma_hang_muc") String maHangMuc,
    @JsonProperty("bo_loc_tuong_thich") CompatibilityFilter boLocTuongThich,
    @JsonProperty("thuong_hieu_options") List<Brand> thuongHieuOptions,
    List<Item> items,
    PaginationResponse pagination) {

  public record CompatibilityFilter(
      @JsonProperty("dang_ap_dung") boolean dangApDung,
      @JsonProperty("phien_ban_doi_chieu_id") Long phienBanDoiChieuId,
      @JsonProperty("socket_doi_chieu") String socketDoiChieu) {}

  public record Brand(Long id, @JsonProperty("ten_thuong_hieu") String tenThuongHieu) {}

  public record Item(
      @JsonProperty("san_pham_id") Long sanPhamId,
      @JsonProperty("phien_ban_id") Long phienBanId,
      @JsonProperty("ma_san_pham") String maSanPham,
      @JsonProperty("ma_vach") String maVach,
      @JsonProperty("ten_san_pham") String tenSanPham,
      @JsonProperty("ten_phien_ban") String tenPhienBan,
      @JsonProperty("anh_dai_dien") String anhDaiDien,
      @JsonProperty("thuong_hieu") Brand thuongHieu,
      @JsonProperty("gia_ban_le") BigDecimal giaBanLe,
      @JsonProperty("bao_hanh_thang") Integer baoHanhThang,
      @JsonProperty("ton_co_the_ban") long tonCoTheBan,
      @JsonProperty("tinh_trang_hang") String tinhTrangHang,
      @JsonProperty("thong_so_chinh") Map<String, Object> thongSoChinh,
      @JsonProperty("ket_qua_socket") String ketQuaSocket,
      @JsonProperty("co_the_chon") boolean coTheChon) {}
}
