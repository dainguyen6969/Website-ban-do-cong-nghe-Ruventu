package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyReplacementPlanRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyReplacementPlanResponse;
import com.example.dantruventu.Error.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminWarrantyReplacementPlanService {
  private final WarrantyReplacementTransactions transactions;

  public ApiResponse<AdminWarrantyReplacementPlanResponse> save(
      String rawId, AdminWarrantyReplacementPlanRequest request, String key, Long actorId) {
    Long id = WarrantyReadValidation.id(rawId, WarrantyReplacementValidation.INVALID);
    var input = WarrantyReplacementValidation.validate(request);
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    // Chính sách tạm đã được xác nhận: ADMIN duyệt dùng hàng kho và xác nhận hạn mới.
    if ("PHE_DUYET".equals(input.get("hanh_dong"))
        || "HAN_MOI_XAC_NHAN".equals(input.get("cach_tinh_han"))) {
      var auth = SecurityContextHolder.getContext().getAuthentication();
      if (auth == null
          || !auth.isAuthenticated()
          || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))
        throw WarrantyReadException.of(
            ErrorCode.WARRANTY_REPLACEMENT_APPROVAL_FORBIDDEN,
            "hanh_dong",
            "REPLACEMENT_APPROVAL_FORBIDDEN");
    }
    try {
      return transactions.apply(id, input, key, actorId);
    } catch (AppException e) {
      throw e;
    } catch (RuntimeException e) {
      log.error("Không cập nhật được phương án đổi bảo hành", e);
      throw new AppException(ErrorCode.WARRANTY_REPLACEMENT_FAILED);
    }
  }
}
