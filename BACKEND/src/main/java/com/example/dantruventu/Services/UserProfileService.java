package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.UpdateUserProfileRequest;
import com.example.dantruventu.DTO.Response.UpdateUserProfileResponse;
import com.example.dantruventu.DTO.Response.UserMeResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoDiaChi;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.SoDiaChiRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

  private final SoDiaChiRepository soDiaChiRepository;
  private final NguoiDungRepository nguoiDungRepository;

  public UserMeResponse getMyProfile(NguoiDung nguoiDung) {

    SoDiaChi diaChiMacDinh =
        soDiaChiRepository.findFirstByNguoiDungIdAndLaMacDinhTrue(nguoiDung.getId()).orElse(null);

    UserMeResponse.DiaChiMacDinhResponse diaChiResponse = null;

    if (diaChiMacDinh != null) {
      diaChiResponse =
          UserMeResponse.DiaChiMacDinhResponse.builder()
              .id(diaChiMacDinh.getId())
              .tenNguoiNhan(diaChiMacDinh.getTenNguoiNhan())
              .soDienThoai(diaChiMacDinh.getSoDienThoai())
              .diaChiChiTiet(diaChiMacDinh.getDiaChiChiTiet())
              .phuongXa(diaChiMacDinh.getPhuongXa())
              .tinhThanh(diaChiMacDinh.getTinhThanh())
              .build();
    }

    return UserMeResponse.builder()
        .id(nguoiDung.getId())
        .hoTen(nguoiDung.getHoTen())
        .email(nguoiDung.getEmail())
        .soDienThoai(nguoiDung.getSoDienThoai())
        .anhDaiDien(nguoiDung.getAnhDaiDien())
        .trangThai(nguoiDung.getTrangThai().getValue())
        .diaChiMacDinh(diaChiResponse)
        .build();
  }

  @Transactional
  public UpdateUserProfileResponse updateMyProfile(
      NguoiDung nguoiDung, UpdateUserProfileRequest request) {

    int updated =
        nguoiDungRepository.updateProfileForSession(
            nguoiDung.getId(),
            nguoiDung.getPhienBanXacThuc(),
            TrangThaiCoBanEnum.HOAT_DONG,
            request.getHoTen(),
            request.getAnhDaiDien(),
            LocalDateTime.now());

    if (updated != 1) throw new AppException(ErrorCode.UNAUTHORIZED);

    return UpdateUserProfileResponse.builder()
        .id(nguoiDung.getId())
        .hoTen(request.getHoTen())
        .anhDaiDien(request.getAnhDaiDien())
        .build();
  }
}
