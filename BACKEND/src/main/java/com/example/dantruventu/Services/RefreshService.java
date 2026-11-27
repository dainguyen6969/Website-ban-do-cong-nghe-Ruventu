package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.RefreshResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshService {

  private final JwtService jwtService;
  private final RefreshTokenSessionService refreshTokenSessionService;
  private final NguoiDungRepository nguoiDungRepository;
  private final SystemSettingsService systemSettingsService;

  public RefreshResponse refresh(String refreshToken) {

    if (refreshToken == null
        || refreshToken.isBlank()
        || !jwtService.isRefreshTokenValid(refreshToken)) {

      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    if (!refreshTokenSessionService.isRefreshTokenActive(refreshToken)) {

      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    Long userId;
    long authVersion;
    try {
      userId = jwtService.getUserIdFromToken(refreshToken);
      authVersion = jwtService.getAuthVersion(refreshToken);
    } catch (JwtException | IllegalArgumentException exception) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    NguoiDung nguoiDung =
        nguoiDungRepository
            .findByIdWithVaiTro(userId)
            .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

    if (nguoiDung.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.ACCOUNT_LOCKED_OR_FORBIDDEN);
    }

    if (nguoiDung.getPhienBanXacThuc() != authVersion) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    systemSettingsService.requireAccess(nguoiDung);

    String accessToken = jwtService.generateAccessToken(nguoiDung, refreshToken);

    return RefreshResponse.builder().accessToken(accessToken).build();
  }
}
