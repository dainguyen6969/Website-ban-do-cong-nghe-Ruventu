package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantySupplierSettlementRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantySupplierSettlementResponse;
import com.example.dantruventu.Error.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminWarrantySupplierSettlementService {
  private final WarrantySupplierSettlementTransactions transactions;

  public ApiResponse<AdminWarrantySupplierSettlementResponse> save(
      String rawId, AdminWarrantySupplierSettlementRequest request, String key, Long actorId) {
    Long id = WarrantyReadValidation.id(rawId, WarrantySupplierSettlementValidation.INVALID);
    var input = WarrantySupplierSettlementValidation.validate(request);
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    if (input.get("hanh_dong").equals("CHOT_PHUONG_AN_KHAC")
        || input.get("hanh_dong").equals("GHI_NCC_TU_CHOI")) {
      // Chính sách tạm đã được xác nhận: ADMIN quyết định phương án đối soát và cửa hàng chịu phí.
      var auth = SecurityContextHolder.getContext().getAuthentication();
      if (auth == null
          || !auth.isAuthenticated()
          || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))
        throw WarrantyReadException.of(
            ErrorCode.WARRANTY_SUPPLIER_APPROVAL_FORBIDDEN,
            "hanh_dong",
            "SUPPLIER_SETTLEMENT_APPROVAL_FORBIDDEN");
    }
    try {
      return transactions.apply(id, input, key, actorId);
    } catch (AppException e) {
      if (e.getErrorCode() == ErrorCode.INVALID_WARRANTY_HISTORY
          || e.getErrorCode() == ErrorCode.INVALID_WARRANTY_READ_DATA)
        log.error("Dữ liệu nguồn đối soát bảo hành không nhất quán", e);
      throw e;
    } catch (org.springframework.dao.DataIntegrityViolationException e) {
      for (Throwable cause = e; cause != null; cause = cause.getCause())
        if (cause instanceof java.sql.SQLException sql
            && sql.getErrorCode() == 1062
            && java.util.Objects.toString(sql.getMessage(), "").contains("so_serial_san_pham"))
          throw WarrantySupplierSettlementTransactions.conflict("serials");
      log.error("Không ghi được hàng bù bảo hành", e);
      throw new AppException(ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_FAILED);
    } catch (RuntimeException e) {
      log.error("Không cập nhật được đối soát bảo hành", e);
      throw new AppException(ErrorCode.WARRANTY_SUPPLIER_SETTLEMENT_FAILED);
    }
  }
}
