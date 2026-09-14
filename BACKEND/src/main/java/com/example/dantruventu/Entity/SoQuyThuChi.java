package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhan;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "so_quy_thu_chi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SoQuyThuChi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_phieu", nullable = false, unique = true)
    private String maPhieu;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai_phieu", nullable = false)
    private LoaiPhieuThuChi loaiPhieu;

    @Enumerated(EnumType.STRING)
    @Column(name = "nhom_nguoi_nop_nhan", nullable = false)
    private NhomNguoiNopNhan nhomNguoiNopNhan;

    @Column(name = "ten_nguoi_nop_nhan", nullable = false)
    private String tenNguoiNopNhan;

    @Column(name = "ma_chung_tu_tham_chieu")
    private String maChungTuThamChieu;

    @Column(name = "so_tien", nullable = false)
    private BigDecimal soTien;

    @Column(name = "phuong_thuc_thanh_toan", nullable = false)
    private String phuongThucThanhToan;

    @Column(name = "mo_ta", columnDefinition = "TEXT")
    private String moTa;

    @Column(name = "tags")
    private String tags;

    @CreationTimestamp
    @Column(name = "ngay_ghi_nhan", updatable = false)
    private LocalDateTime ngayGhiNhan;
}