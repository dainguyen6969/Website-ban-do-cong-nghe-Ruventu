package com.example.dantruventu.DTO.Request.warehouse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;
import java.util.List;

public final class SupplierRecallRequest {
  private SupplierRecallRequest() {}

  public record Open(
      @NotNull @Positive Long purchaseId,
      @NotBlank @Size(max = 100) String document,
      @NotBlank @Size(max = 1000) String reason,
      Long employeeId,
      OffsetDateTime deadline,
      @Size(max = 500) List<@NotBlank @Size(max = 100) String> serialCodes,
      Long receiptLineId,
      @Min(1) @Max(500) Integer quantity,
      Boolean acceptVariantBlock,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record Command(
      @NotNull @Min(0) Long revision,
      @NotBlank String action,
      Long itemId,
      Long deviceId,
      Long nccUnitId,
      Long warrantyId,
      @Size(max = 100) String document,
      @NotBlank @Size(max = 1000) String note,
      OffsetDateTime nextContactAt,
      Boolean sourceVerified,
      Boolean qualityConfirmed,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record Backfill(
      @NotBlank @Size(max = 100) String document,
      @NotBlank @Size(max = 1000) String note,
      @NotEmpty @Size(max = 100) List<@Valid BackfillLine> items,
      @NotNull @AssertTrue Boolean confirmed) {}

  public record BackfillLine(
      @NotNull @Positive Long purchaseLineId,
      @NotNull @Min(1) @Max(500) Integer quantity,
      @Size(max = 100) String lot,
      @Size(max = 500) List<@NotBlank @Size(max = 100) String> serialCodes) {}
}
