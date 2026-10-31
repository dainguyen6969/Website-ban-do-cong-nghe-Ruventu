package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyInvoiceRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyInvoiceResponse;
import com.example.dantruventu.Error.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminWarrantyInvoiceService {
  private final WarrantyInvoiceTransactions transactions;

  public ApiResponse<AdminWarrantyInvoiceResponse> update(
      String rawId, AdminWarrantyInvoiceRequest request, String key, Long actorId) {
    Long id = WarrantyReadValidation.id(rawId, WarrantyInvoiceValidation.INVALID);
    var input = WarrantyInvoiceValidation.validate(request);
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    var auth = SecurityContextHolder.getContext().getAuthentication();
    boolean approvalAllowed =
        auth != null
            && auth.isAuthenticated()
            && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    // Temporary policy approved by the product owner: ADMIN can approve reductions/debt.
    if (input.get("hanh_dong").toString().startsWith("DUYET_") && !approvalAllowed)
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_FINANCIAL_APPROVAL_FORBIDDEN,
          "hanh_dong",
          "FINANCIAL_APPROVAL_FORBIDDEN");
    try {
      return transactions.apply(id, input, key, actorId);
    } catch (AppException | PessimisticLockingFailureException e) {
      throw e;
    } catch (RuntimeException e) {
      log.error("Updating warranty invoice failed", e);
      throw new AppException(ErrorCode.WARRANTY_INVOICE_FAILED);
    }
  }
}
