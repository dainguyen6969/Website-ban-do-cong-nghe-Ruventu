package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "vai_tro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VaiTro {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Setter(AccessLevel.NONE)
  @Column(name = "ma_vai_tro", nullable = false, unique = true, length = 50, updatable = false)
  private String maVaiTro;

  @Column(name = "ten_vai_tro", nullable = false, unique = true)
  private String tenVaiTro;

  @Column(name = "mo_ta", length = 500)
  private String moTa;

  @Builder.Default
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "quyen", nullable = false, columnDefinition = "JSON")
  private Map<String, List<String>> quyen = new LinkedHashMap<>();

  @Version
  @ColumnDefault("0")
  @Column(name = "phien_ban", nullable = false)
  private long phienBan;

  @OneToMany(mappedBy = "vaiTro", fetch = FetchType.LAZY)
  private List<NguoiDung> danhSachNguoiDung;

  @PrePersist
  void ganMaVaiTroKhiTao() {
    if (maVaiTro == null) {
      maVaiTro = "VT_" + UUID.randomUUID().toString().replace("-", "");
    }
  }
}
