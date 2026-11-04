package com.example.dantruventu.Error;

import java.util.List;
import lombok.Getter;

@Getter
public class WarrantyErrorResponse extends ErrorResponse {
  private final List<WarrantyReadException.FieldError> errors;
  private final Object data;

  public WarrantyErrorResponse(
      int status, String message, List<WarrantyReadException.FieldError> errors) {
    this(status, message, errors, null);
  }

  public WarrantyErrorResponse(
      int status, String message, List<WarrantyReadException.FieldError> errors, Object data) {
    super(status, message);
    this.errors = errors;
    this.data = data;
  }

  @Override
  @com.fasterxml.jackson.annotation.JsonInclude(
      com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
  public Object getData() {
    return data;
  }
}
