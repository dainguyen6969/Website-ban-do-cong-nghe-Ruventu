package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyQuoteEventRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyQuoteEventResponse;
import com.example.dantruventu.Error.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminWarrantyQuoteEventService {
  private final WarrantyQuoteEventTransactions transactions;

  public ApiResponse<AdminWarrantyQuoteEventResponse> save(
      String rawId,
      String rawVersion,
      AdminWarrantyQuoteEventRequest request,
      String key,
      Long actorId) {
    Long id = WarrantyReadValidation.id(rawId, WarrantyQuoteEventValidation.INVALID);
    Long version = WarrantyReadValidation.id(rawVersion, WarrantyQuoteEventValidation.INVALID);
    if (version > Integer.MAX_VALUE) throw WarrantyQuoteEventValidation.invalid();
    var input = WarrantyQuoteEventValidation.validate(request);
    try {
      return transactions.apply(id, version.intValue(), input, key, actorId);
    } catch (AppException failure) {
      if (failure.getErrorCode() == ErrorCode.WARRANTY_QUOTE_EXPIRED) {
        // apply() has rolled back before this separate transaction. Record factual expiration,
        // not a late consent or an incomplete idempotency record. Recheck under the same lock.
        try {
          transactions.expire(id, version.intValue(), actorId);
        } catch (RuntimeException expiryFailure) {
          throw failed(expiryFailure);
        }
      }
      throw failure;
    } catch (PessimisticLockingFailureException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      throw failed(failure);
    }
  }

  private AppException failed(RuntimeException failure) {
    log.error("Processing warranty quote event failed", failure);
    return new AppException(ErrorCode.WARRANTY_QUOTE_EVENT_FAILED);
  }
}
