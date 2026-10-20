package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
    name = "chi_tiet_khuyen_mai",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_ctkm_chuong_trinh_phien_ban_loai",
            columnNames = {"khuyen_mai_id", "phien_ban_id", "loai_ap_dung"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiTietKhuyenMai {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // FK bắt buộc theo ERD cột đã xác nhận: mỗi dòng chi tiết phải thuộc một chương trình.
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "khuyen_mai_id", nullable = false)
  private KhuyenMai khuyenMai;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "phien_ban_id", nullable = false)
  private PhienBanSanPham phienBan;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "loai_ap_dung", nullable = false, length = 50)
  private LoaiApDungKhuyenMai loaiApDung;

  @Builder.Default
  @ColumnDefault("1")
  @Column(name = "so_luong", nullable = false)
  private Integer soLuong = 1;
}
