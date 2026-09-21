package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.AddressRequest;
import com.example.dantruventu.DTO.Response.AddressResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoDiaChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.SoDiaChiRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final SoDiaChiRepository soDiaChiRepository;
    private final NguoiDungRepository nguoiDungRepository;

    public NguoiDung getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof NguoiDung) {
                return (NguoiDung) principal;
            }
            String identifier = authentication.getName();
            try {
                Long userId = Long.parseLong(identifier);
                return nguoiDungRepository.findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.INVALID_OR_EXPIRED_ACCESS_TOKEN));
            } catch (NumberFormatException e) {
                return nguoiDungRepository.findByEmail(identifier)
                        .orElseThrow(() -> new AppException(ErrorCode.INVALID_OR_EXPIRED_ACCESS_TOKEN));
            }
        }

        throw new AppException(ErrorCode.INVALID_OR_EXPIRED_ACCESS_TOKEN);
    }

    @Transactional
    public AddressResponse addAddress(AddressRequest request) {
        NguoiDung currentUser = getCurrentAuthenticatedUser();

        boolean isDefault = Boolean.TRUE.equals(request.getLaMacDinh());

        if (isDefault) {
            soDiaChiRepository.findByNguoiDungIdAndLaMacDinhTrue(currentUser.getId())
                    .ifPresent(existingDefault -> {
                        existingDefault.setLaMacDinh(false);
                        soDiaChiRepository.save(existingDefault);
                    });
        }

        SoDiaChi newAddress = SoDiaChi.builder()
                .nguoiDung(currentUser)
                .tenNguoiNhan(request.getTenNguoiNhan())
                .soDienThoai(request.getSoDienThoai())
                .diaChiChiTiet(request.getDiaChiChiTiet())
                .phuongXa(request.getPhuongXa())
                .tinhThanh(request.getTinhThanh())
                .laMacDinh(isDefault)
                .build();

        SoDiaChi savedAddress = soDiaChiRepository.save(newAddress);

        return mapToResponse(savedAddress);
    }

    @Transactional(readOnly = true)
    public List<AddressResponse> getUserAddresses() {
        NguoiDung currentUser = getCurrentAuthenticatedUser();

        List<SoDiaChi> addresses = soDiaChiRepository.findByNguoiDungId(currentUser.getId());

        return addresses.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AddressResponse getAddressDetail(Long id) {
        NguoiDung currentUser = getCurrentAuthenticatedUser();

        SoDiaChi address = soDiaChiRepository.findByIdAndNguoiDungId(id, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

        return mapToResponse(address);
    }

    @Transactional
    public AddressResponse updateAddress(Long id, AddressRequest request) {
        NguoiDung currentUser = getCurrentAuthenticatedUser();

        SoDiaChi address = soDiaChiRepository.findByIdAndNguoiDungId(id, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

        boolean isDefault = Boolean.TRUE.equals(request.getLaMacDinh());

        if (isDefault) {
            soDiaChiRepository.findByNguoiDungIdAndLaMacDinhTrue(currentUser.getId())
                    .ifPresent(existingDefault -> {
                        if (!existingDefault.getId().equals(id)) {
                            existingDefault.setLaMacDinh(false);
                            soDiaChiRepository.save(existingDefault);
                        }
                    });
        }

        address.setTenNguoiNhan(request.getTenNguoiNhan());
        address.setSoDienThoai(request.getSoDienThoai());
        address.setDiaChiChiTiet(request.getDiaChiChiTiet());
        address.setPhuongXa(request.getPhuongXa());
        address.setTinhThanh(request.getTinhThanh());
        address.setLaMacDinh(isDefault);

        SoDiaChi updatedAddress = soDiaChiRepository.save(address);

        return mapToResponse(updatedAddress);
    }

    @Transactional
    public void deleteAddress(Long id) {
        NguoiDung currentUser = getCurrentAuthenticatedUser();

        SoDiaChi address = soDiaChiRepository.findByIdAndNguoiDungId(id, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

        soDiaChiRepository.delete(address);
    }


    private AddressResponse mapToResponse(SoDiaChi entity) {
        return AddressResponse.builder()
                .id(entity.getId())
                .tenNguoiNhan(entity.getTenNguoiNhan())
                .soDienThoai(entity.getSoDienThoai())
                .diaChiChiTiet(entity.getDiaChiChiTiet())
                .phuongXa(entity.getPhuongXa())
                .tinhThanh(entity.getTinhThanh())
                .laMacDinh(entity.getLaMacDinh())
                .build();
    }
}
