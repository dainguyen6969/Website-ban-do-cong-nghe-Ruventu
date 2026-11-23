package com.example.dantruventu.Initializer;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

  private static final String DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
  private static final String DEFAULT_ADMIN_PASSWORD = "Admin@123";

  private final VaiTroRepository vaiTroRepository;
  private final NguoiDungRepository nguoiDungRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${RUVENTU_BOOTSTRAP_ADMIN_PASSWORD:}")
  private String bootstrapAdminPassword = "";

  @Override
  public void run(String... args) {
    boolean customAdminPassword = !bootstrapAdminPassword.isEmpty();
    if (customAdminPassword
        && (bootstrapAdminPassword.isBlank() || bootstrapAdminPassword.length() < 8)) {
      throw new IllegalStateException(
          "RUVENTU_BOOTSTRAP_ADMIN_PASSWORD must contain at least 8 characters");
    }
    String initialAdminPassword =
        customAdminPassword ? bootstrapAdminPassword : DEFAULT_ADMIN_PASSWORD;

    VaiTro adminRole =
        vaiTroRepository
            .findByTenVaiTro("ADMIN")
            .orElseGet(
                () -> {
                  VaiTro vaiTro =
                      VaiTro.builder()
                          .maVaiTro("ADMIN")
                          .tenVaiTro("ADMIN")
                          .moTa("Quản trị viên")
                          .build();

                  return vaiTroRepository.save(vaiTro);
                });

    vaiTroRepository
        .findByTenVaiTro("USER")
        .orElseGet(
            () -> {
              VaiTro vaiTro =
                  VaiTro.builder().maVaiTro("USER").tenVaiTro("USER").moTa("Khách hàng").build();

              return vaiTroRepository.save(vaiTro);
            });

    NguoiDung admin =
        nguoiDungRepository
            .findByEmail(DEFAULT_ADMIN_EMAIL)
            .orElseGet(
                () -> {
                  NguoiDung newAdmin =
                      NguoiDung.builder()
                          .vaiTro(adminRole)
                          .hoTen("Administrator")
                          .email(DEFAULT_ADMIN_EMAIL)
                          .soDienThoai("0900000000")
                          .matKhau(passwordEncoder.encode(initialAdminPassword))
                          .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                          .build();

                  return nguoiDungRepository.save(newAdmin);
                });

    if (customAdminPassword
        && passwordEncoder.matches(DEFAULT_ADMIN_PASSWORD, admin.getMatKhau())) {
      throw new IllegalStateException(
          "Change the existing administrator's default password before deployment");
    }
  }
}
