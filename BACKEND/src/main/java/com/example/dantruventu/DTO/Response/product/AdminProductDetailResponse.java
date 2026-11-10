package com.example.dantruventu.DTO.Response.product;

import com.example.dantruventu.DTO.Response.warehouse.ComboComponentResponse;
import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import lombok.*;
import tools.jackson.databind.JsonNode;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProductDetailResponse extends CatalogFields.Metadata {

  private Long id;

  @JsonProperty("ma_san_pham")
  private String maSanPham;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("danh_muc")
  private DanhMucData danhMuc;

  @JsonProperty("thuong_hieu")
  private ThuongHieuData thuongHieu;

  @JsonProperty("loai_san_pham")
  private LoaiSanPham loaiSanPham;

  @JsonProperty("mo_ta")
  private String moTa;

  @JsonProperty("thong_so_ky_thuat")
  private JsonNode thongSoKyThuat;

  @JsonProperty("trang_thai")
  private Short trangThai;

  @JsonProperty("thue_vat")
  private BigDecimal thueVat;

  @JsonProperty("anh_san_pham")
  private List<AnhSanPhamData> anhSanPham;

  @JsonProperty("danh_sach_phien_ban")
  private List<PhienBanData> danhSachPhienBan;

  @JsonProperty("ton_thuc_te")
  private Long tonThucTe;

  @JsonProperty("ton_co_the_ban")
  private Long tonCoTheBan;

  @JsonProperty("thanh_phan")
  private List<ComboComponentResponse> thanhPhan;

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class DanhMucData {

    private Long id;

    @JsonProperty("ten_danh_muc")
    private String tenDanhMuc;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ThuongHieuData {

    private Long id;

    @JsonProperty("ten_thuong_hieu")
    private String tenThuongHieu;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class AnhSanPhamData {

    private Long id;

    @JsonProperty("duong_dan_anh")
    private String duongDanAnh;

    @JsonProperty("la_anh_chinh")
    private Boolean laAnhChinh;

    @JsonProperty("thu_tu_hien_thi")
    private Integer thuTuHienThi;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class PhienBanData {

    private Long id;

    @JsonProperty("ten_phien_ban")
    private String tenPhienBan;

    @JsonProperty("ma_vach")
    private String maVach;

    @JsonProperty("gia_ban_le")
    private BigDecimal giaBanLe;

    @JsonProperty("gia_nhap")
    private BigDecimal giaNhap;

    @JsonProperty("khoi_luong")
    private BigDecimal khoiLuong;

    @JsonProperty("trang_thai")
    private Short trangThai;

    @JsonProperty("ton_co_the_ban")
    private Long tonCoTheBan;

    @JsonProperty("ton_thuc_te")
    private Long tonThucTe;

    @JsonProperty("hang_loi")
    private Long hangLoi;

    @JsonProperty("so_luong_giu_cho_bao_hanh")
    private Long soLuongGiuChoBaoHanh;

    @JsonProperty("co_quan_ly_serial")
    private Boolean coQuanLySerial;

    @JsonProperty("che_do_serial_bi_khoa")
    private Boolean cheDoSerialBiKhoa;

    @JsonProperty("con_hang")
    private Boolean conHang;

    @JsonProperty("thuoc_tinh_phien_ban")
    private List<CatalogFields.AttributeData> thuocTinhPhienBan;
  }
}
