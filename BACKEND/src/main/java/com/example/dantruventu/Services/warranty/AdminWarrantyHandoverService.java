package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyHandoverRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyHandoverResponse;
import com.example.dantruventu.Error.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminWarrantyHandoverService {
  private final WarrantyHandoverTransactions transactions;

  public ApiResponse<AdminWarrantyHandoverResponse> save(
      String rawId, AdminWarrantyHandoverRequest request, String key, Long actorId) {
    Long id = WarrantyReadValidation.id(rawId, WarrantyHandoverValidation.INVALID);
    var input = WarrantyHandoverValidation.validate(request);
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    try {
      return transactions.apply(id, input, key, actorId);
    } catch (AppException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      log.error("Không hoàn tất được bàn giao bảo hành", failure);
      throw new AppException(ErrorCode.WARRANTY_HANDOVER_FAILED);
    }
  }
}
