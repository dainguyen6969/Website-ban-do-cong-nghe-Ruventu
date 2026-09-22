package com.example.dantruventu.Services;

import com.example.dantruventu.Entity.NguoiDung;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthTokenService {

    private final JwtService jwtService;
    private final RefreshTokenSessionService refreshTokenSessionService;

    public TokenPair generateTokenPair(
            NguoiDung nguoiDung,
            boolean ghiNhoDangNhap
    ) {

        String accessToken =
                jwtService.generateAccessToken(nguoiDung);

        String refreshToken =
                jwtService.generateRefreshToken(
                        nguoiDung,
                        ghiNhoDangNhap
                );

        refreshTokenSessionService
                .saveRefreshToken(refreshToken);

        return new TokenPair(
                accessToken,
                refreshToken
        );
    }

    public String generateAccessToken(NguoiDung nguoiDung) {

        return jwtService.generateAccessToken(nguoiDung);
    }

    public record TokenPair(
            String accessToken,
            String refreshToken
    ) {
    }
}