package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.AddressRequest;
import com.example.dantruventu.DTO.Request.UpdateUserProfileRequest;
import com.example.dantruventu.DTO.Response.AddressResponse;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.SetDefaultAddressResponse;
import com.example.dantruventu.DTO.Response.UpdateUserProfileResponse;
import com.example.dantruventu.DTO.Response.UserMeResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.AddressService;
import com.example.dantruventu.Services.UserProfileService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

  private final UserProfileService userProfileService;
  private final AddressService addressService;

  @GetMapping("/me")
  public ResponseEntity<ApiResponse<UserMeResponse>> getMyProfile(Authentication authentication) {

    NguoiDung nguoiDung = (NguoiDung) authentication.getPrincipal();

    UserMeResponse data = userProfileService.getMyProfile(nguoiDung);

    ApiResponse<UserMeResponse> response =
        ApiResponse.<UserMeResponse>builder()
            .status(HttpStatus.OK.value())
            .message("Lấy thông tin tài khoản thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }

  @PutMapping("/me")
  public ResponseEntity<ApiResponse<UpdateUserProfileResponse>> updateMyProfile(
      Authentication authentication, @Valid @RequestBody UpdateUserProfileRequest request) {

    NguoiDung nguoiDung = (NguoiDung) authentication.getPrincipal();

    UpdateUserProfileResponse data = userProfileService.updateMyProfile(nguoiDung, request);

    ApiResponse<UpdateUserProfileResponse> response =
        ApiResponse.<UpdateUserProfileResponse>builder()
            .status(HttpStatus.OK.value())
            .message("Cập nhật thông tin thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }

  @PostMapping("/addresses")
  public ResponseEntity<ApiResponse<AddressResponse>> addAddress(
      @Valid @RequestBody AddressRequest request) {
    AddressResponse data = addressService.addAddress(request);

    ApiResponse<AddressResponse> response =
        ApiResponse.<AddressResponse>builder()
            .status(HttpStatus.CREATED.value())
            .message("Thêm địa chỉ thành công")
            .data(data)
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping("/addresses")
  public ResponseEntity<ApiResponse<List<AddressResponse>>> getUserAddresses() {
    List<AddressResponse> data = addressService.getUserAddresses();

    ApiResponse<List<AddressResponse>> response =
        ApiResponse.<List<AddressResponse>>builder()
            .status(HttpStatus.OK.value())
            .message("Lấy danh sách địa chỉ thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }

  @GetMapping("/addresses/{id}")
  public ResponseEntity<ApiResponse<AddressResponse>> getAddressDetail(@PathVariable Long id) {
    AddressResponse data = addressService.getAddressDetail(id);

    ApiResponse<AddressResponse> response =
        ApiResponse.<AddressResponse>builder()
            .status(HttpStatus.OK.value())
            .message("Lấy địa chỉ thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }

  @PutMapping("/addresses/{id}")
  public ResponseEntity<ApiResponse<AddressResponse>> updateAddress(
      @PathVariable Long id, @Valid @RequestBody AddressRequest request) {
    AddressResponse data = addressService.updateAddress(id, request);

    ApiResponse<AddressResponse> response =
        ApiResponse.<AddressResponse>builder()
            .status(HttpStatus.OK.value())
            .message("Cập nhật địa chỉ thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/addresses/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteAddress(@PathVariable Long id) {
    addressService.deleteAddress(id);

    ApiResponse<Void> response =
        ApiResponse.<Void>builder()
            .status(HttpStatus.OK.value())
            .message("Xóa địa chỉ thành công")
            .build();

    return ResponseEntity.ok(response);
  }

  @PatchMapping("/addresses/{id}/default")
  public ResponseEntity<ApiResponse<SetDefaultAddressResponse>> setDefaultAddress(
      @PathVariable Long id) {
    SetDefaultAddressResponse data = addressService.setDefaultAddress(id);

    ApiResponse<SetDefaultAddressResponse> response =
        ApiResponse.<SetDefaultAddressResponse>builder()
            .status(HttpStatus.OK.value())
            .message("Đặt địa chỉ mặc định thành công")
            .data(data)
            .build();

    return ResponseEntity.ok(response);
  }
}
