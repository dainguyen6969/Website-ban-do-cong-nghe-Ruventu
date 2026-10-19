package com.example.dantruventu.DTO.Response.warranty;

import com.example.dantruventu.Enum.TrangThaiBaoGiaBaoHanh;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiHoaDonBaoHanh;
import com.example.dantruventu.Enum.TrangThaiHoanTienBaoHanh;
import com.example.dantruventu.Enum.TrangThaiThanhToanBaoHanh;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class AdminWarrantyListItemResponse {
  private Long id;

  @JsonProperty("ma_phieu")
  private String maPhieu;

  @JsonProperty("don_hang_id")
  private Long donHangId;

  @JsonProperty("ma_don_hang")
  private String maDonHang;

  @JsonProperty("khach_hang_id")
  private Long khachHangId;

  @JsonProperty("ten_nguoi_lien_he")
  private String tenNguoiLienHe;

  @JsonProperty("sdt_nguoi_lien_he")
  private String sdtNguoiLienHe;

  @JsonProperty("ten_san_pham")
  private String tenSanPham;

  @JsonProperty("ma_theo_doi")
  private String maTheoDoi;

  @JsonProperty("so_serial")
  private String soSerial;

  @JsonProperty("trang_thai_xu_ly")
  private TrangThaiBaoHanh trangThaiXuLy;

  @JsonProperty("trang_thai_bao_gia")
  private TrangThaiBaoGiaBaoHanh trangThaiBaoGia;

  @JsonProperty("trang_thai_thanh_toan")
  private TrangThaiThanhToanBaoHanh trangThaiThanhToan;

  @JsonProperty("trang_thai_hoan_tien")
  private TrangThaiHoanTienBaoHanh trangThaiHoanTien;

  @JsonProperty("ngay_tiep_nhan")
  private OffsetDateTime ngayTiepNhan;

  @JsonProperty("ngay_cap_nhat")
  private OffsetDateTime ngayCapNhat;

  @JsonProperty("hoa_don_id")
  private Long hoaDonId;

  @JsonProperty("trang_thai_hoa_don")
  private TrangThaiHoaDonBaoHanh trangThaiHoaDon;

  @JsonProperty("tinh_trang_phi")
  private String tinhTrangPhi;

  @JsonProperty("con_phai_hoan")
  private BigDecimal conPhaiHoan;

  // Chưa có nguồn dữ liệu nghĩa vụ bù hàng/đối soát NCC. Null được giữ rõ trong JSON,
  // không suy diễn false từ trạng thái xử lý hoặc từ các giao dịch thu/chi.
  @JsonProperty("doi_soat_ncc_con_mo")
  private Boolean doiSoatNccConMo;
}
