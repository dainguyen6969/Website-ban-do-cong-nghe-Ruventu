package com.example.dantruventu.DTO.Request.warehouse;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public final class NccRequest {

  private NccRequest() {}

  public record Open(
      @NotBlank String purpose,
      @NotBlank @Size(max = 500) String reason,
      Long employeeId,
      OffsetDateTime deadline,
      @Size(max = 100) String document,
      @NotNull @PastOrPresent OffsetDateTime at,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record Command(
      @NotNull @Min(0) Long revision,
      @NotBlank String action,
      Long unitId,
      Long detailId,
      Long previousUnitId,
      Integer quantity,
      Integer damagedQuantity,
      List<Long> serialIds,
      List<String> serialCodes,
      String method,
      Long variantId,
      BigDecimal credit,
      BigDecimal value,
      String condition,
      Boolean passed,
      Boolean alreadyInStock,
      BigDecimal amount,
      String paymentMethod,
      @Size(max = 255) String transactionId,
      Long employeeId,
      OffsetDateTime deadline,
      @Size(max = 100) String document,
      @NotBlank @Size(max = 1000) String note,
      @NotNull @PastOrPresent OffsetDateTime at,
      @NotNull @AssertTrue Boolean confirmed) {}
}
