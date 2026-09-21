package com.example.dantruventu.Entity;

import jakarta.persistence.*;
import java.util.List;
import lombok.*;

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

  @Column(name = "ten_vai_tro", nullable = false, unique = true)
  private String tenVaiTro;

  @Column(name = "mo_ta")
  private String moTa;

  @OneToMany(mappedBy = "vaiTro", fetch = FetchType.LAZY)
  private List<NguoiDung> danhSachNguoiDung;
}
