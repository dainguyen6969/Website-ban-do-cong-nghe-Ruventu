package com.example.dantruventu.Controller;

import com.example.dantruventu.DTO.Request.UpdateUserProfileRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.UpdateUserProfileResponse;
import com.example.dantruventu.DTO.Response.UserMeResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserMeResponse>> getMyProfile(
            Authentication authentication
    ) {

        NguoiDung nguoiDung =
                (NguoiDung) authentication.getPrincipal();

        UserMeResponse data =
                userProfileService.getMyProfile(nguoiDung);

        ApiResponse<UserMeResponse> response =
                ApiResponse.<UserMeResponse>builder()
                        .status(HttpStatus.OK.value())
                        .message("Lấy thông tin tài khoản thành công")
                        .data(data)
                        .build();

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UpdateUserProfileResponse>>
    updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateUserProfileRequest request
    ) {

        NguoiDung nguoiDung =
                (NguoiDung) authentication.getPrincipal();

        UpdateUserProfileResponse data =
                userProfileService.updateMyProfile(
                        nguoiDung,
                        request
                );

        ApiResponse<UpdateUserProfileResponse> response =
                ApiResponse.<UpdateUserProfileResponse>builder()
                        .status(HttpStatus.OK.value())
                        .message("Cập nhật thông tin thành công")
                        .data(data)
                        .build();

        return ResponseEntity.ok(response);
    }
}