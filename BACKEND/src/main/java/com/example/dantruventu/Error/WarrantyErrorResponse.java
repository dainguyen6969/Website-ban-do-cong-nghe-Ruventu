package com.example.dantruventu.Error;

import java.util.List;
import lombok.Getter;

@Getter
public class WarrantyErrorResponse extends ErrorResponse {
  private final List<WarrantyReadException.FieldError> errors;

  public WarrantyErrorResponse(
      int status, String message, List<WarrantyReadException.FieldError> errors) {
    super(status, message);
    this.errors = errors;
  }
}
