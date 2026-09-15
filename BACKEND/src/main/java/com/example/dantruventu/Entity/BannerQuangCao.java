package com.example.dantruventu.Entity;

import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "banner_quang_cao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerQuangCao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tieu_de", nullable = false)
    private String tieuDe;

    @Column(name = "duong_dan_anh", nullable = false)
    private String duongDanAnh;

    @Column(name = "lien_ket_dich")
    private String lienKetDich;

    @Column(name = "vi_tri", nullable = false)
    private String viTri;

    @Builder.Default
    @Column(name = "thu_tu")
    private Integer thuTu = 0;

    @Builder.Default
    @Column(name = "trang_thai", nullable = false)
    private TrangThaiCoBanEnum trangThai = TrangThaiCoBanEnum.HOAT_DONG;
}