package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.LoginRequest;
import com.example.dantruventu.DTO.Response.LoginResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Repository.NguoiDungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LoginService {

    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenService authTokenService;

    public LoginResult login(LoginRequest request) {

        String taiKhoan = request.getTaiKhoan().trim();

        Optional<NguoiDung> optionalUser =
                nguoiDungRepository.findByEmailOrSoDienThoai(
                        taiKhoan,
                        taiKhoan
                );

        if (optionalUser.isEmpty()) {

            LoginResponse response = LoginResponse.builder()
                    .status(401)
                    .message("Tài khoản hoặc mật khẩu không chính xác")
                    .data(null)
                    .build();

            return new LoginResult(response, null);
        }

        NguoiDung user = optionalUser.get();

        if (!passwordEncoder.matches(
                request.getMatKhau(),
                user.getMatKhau()
        )) {

            LoginResponse response = LoginResponse.builder()
                    .status(401)
                    .message("Tài khoản hoặc mật khẩu không chính xác")
                    .data(null)
                    .build();

            return new LoginResult(response, null);
        }

        if (user.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {

            LoginResponse response = LoginResponse.builder()
                    .status(403)
                    .message("Tài khoản bị khóa/ngừng hoạt động")
                    .data(null)
                    .build();

            return new LoginResult(response, null);
        }

        boolean ghiNhoDangNhap =
                Boolean.TRUE.equals(request.getGhiNhoDangNhap());

        AuthTokenService.TokenPair tokenPair =
                authTokenService.generateTokenPair(
                        user,
                        ghiNhoDangNhap
                );

        LoginResponse.UserData userData =
                LoginResponse.UserData.builder()
                        .id(user.getId())
                        .hoTen(user.getHoTen())
                        .anhDaiDien(user.getAnhDaiDien())
                        .vaiTroId(
                                user.getVaiTro() != null
                                        ? user.getVaiTro().getId()
                                        : null
                        )
                        .build();

        LoginResponse.LoginData loginData =
                LoginResponse.LoginData.builder()
                        .accessToken(tokenPair.accessToken())
                        .user(userData)
                        .build();

        LoginResponse response =
                LoginResponse.builder()
                        .status(200)
                        .message("Đăng nhập thành công")
                        .data(loginData)
                        .build();

        return new LoginResult(
                response,
                tokenPair.refreshToken()
        );
    }

    public record LoginResult(
            LoginResponse response,
            String refreshToken
    ) {
    }
}