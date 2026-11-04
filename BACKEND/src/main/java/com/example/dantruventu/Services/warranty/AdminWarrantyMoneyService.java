package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyMoneyRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyMoneyResponse;
import com.example.dantruventu.Error.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminWarrantyMoneyService {
  private final WarrantyMoneyTransactions transactions;

  public ApiResponse<AdminWarrantyMoneyResponse> save(
      String rawId, AdminWarrantyMoneyRequest request, String key, Long actorId) {
    Long id = WarrantyReadValidation.id(rawId, WarrantyMoneyValidation.INVALID);
    var input = WarrantyMoneyValidation.validate(request);
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    try {
      return transactions.apply(id, input, key, actorId);
    } catch (AppException e) {
      throw e;
    } catch (RuntimeException e) {
      log.error("Không ghi nhận được giao dịch tiền bảo hành", e);
      throw new AppException(ErrorCode.WARRANTY_MONEY_FAILED);
    }
  }
}
