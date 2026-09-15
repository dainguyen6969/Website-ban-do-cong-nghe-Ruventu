package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "loai_thu_chi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoaiThuChi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_loai", nullable = false, unique = true, length = 50)
    private String maLoai;

    @Column(name = "ten_loai", nullable = false, length = 150)
    private String tenLoai;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "loai_phieu", nullable = false, length = 20)
    private LoaiPhieuThuChi loaiPhieu;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "trang_thai", nullable = false, length = 30)
    private TrangThaiCoBanEnum trangThai;
}