package com.example.dantruventu.Initializer;

import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.VaiTro;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.VaiTroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final VaiTroRepository vaiTroRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        VaiTro adminRole = vaiTroRepository
                .findByTenVaiTro("ADMIN")
                .orElseGet(() -> {

                    VaiTro vaiTro = VaiTro.builder()
                            .tenVaiTro("ADMIN")
                            .moTa("Quản trị viên")
                            .build();

                    return vaiTroRepository.save(vaiTro);
                });

        vaiTroRepository
                .findByTenVaiTro("USER")
                .orElseGet(() -> {

                    VaiTro vaiTro = VaiTro.builder()
                            .tenVaiTro("USER")
                            .moTa("Khách hàng")
                            .build();

                    return vaiTroRepository.save(vaiTro);
                });

        nguoiDungRepository
                .findByEmail("admin@gmail.com")
                .orElseGet(() -> {

                    NguoiDung admin = NguoiDung.builder()
                            .vaiTro(adminRole)
                            .hoTen("Administrator")
                            .email("admin@gmail.com")
                            .soDienThoai("0900000000")
                            .matKhau(passwordEncoder.encode("Admin@123"))
                            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                            .build();

                    return nguoiDungRepository.save(admin);
                });
    }
}