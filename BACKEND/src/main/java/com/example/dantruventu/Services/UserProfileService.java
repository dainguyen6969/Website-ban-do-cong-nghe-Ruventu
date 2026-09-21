package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.UpdateUserProfileRequest;
import com.example.dantruventu.DTO.Response.UpdateUserProfileResponse;
import com.example.dantruventu.DTO.Response.UserMeResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoDiaChi;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.SoDiaChiRepository;
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
        .trangThai(nguoiDung.getTrangThai().name())
        .diaChiMacDinh(diaChiResponse)
        .build();
  }

  @Transactional
  public UpdateUserProfileResponse updateMyProfile(
      NguoiDung nguoiDung, UpdateUserProfileRequest request) {

    nguoiDung.setHoTen(request.getHoTen());
    nguoiDung.setAnhDaiDien(request.getAnhDaiDien());

    NguoiDung updatedNguoiDung = nguoiDungRepository.save(nguoiDung);

    return UpdateUserProfileResponse.builder()
        .id(updatedNguoiDung.getId())
        .hoTen(updatedNguoiDung.getHoTen())
        .anhDaiDien(updatedNguoiDung.getAnhDaiDien())
        .build();
  }
}
