package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyReplacementItemsRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.AdminWarrantyReplacementItemsResponse;
import com.example.dantruventu.Error.*;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminWarrantyReplacementItemsService {
  private final WarrantyReplacementItemsTransactions transactions;

  public ApiResponse<AdminWarrantyReplacementItemsResponse> save(
      String rawId, AdminWarrantyReplacementItemsRequest request, String key, Long actorId) {
    Long id = WarrantyReadValidation.id(rawId, WarrantyReplacementItemsValidation.INVALID);
    var input = WarrantyReplacementItemsValidation.validate(request);
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    try {
      return transactions.apply(id, input, key, actorId);
    } catch (AppException e) {
      throw e;
    } catch (DataIntegrityViolationException e) {
      for (Throwable cause = e; cause != null; cause = cause.getCause())
        if (cause instanceof java.sql.SQLException sql
            && sql.getErrorCode() == 1062
            && Objects.toString(sql.getMessage(), "").contains("so_serial_san_pham"))
          throw WarrantyReplacementItemsTransactions.conflict("so_serial_thuc_nhan");
      log.error("Không lưu được dữ liệu hàng đổi bảo hành", e);
      throw new AppException(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_FAILED);
    } catch (RuntimeException e) {
      log.error("Không cập nhật được hàng đổi bảo hành", e);
      throw new AppException(ErrorCode.WARRANTY_REPLACEMENT_ITEMS_FAILED);
    }
  }
}
