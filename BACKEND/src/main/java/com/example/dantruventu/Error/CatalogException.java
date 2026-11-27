package com.example.dantruventu.Error;

import lombok.Getter;

@Getter
public class CatalogException extends AppException {

  private final String field;
  private final String code;

  private CatalogException(ErrorCode errorCode, String field, String code, String message) {
    super(errorCode, message);
    this.field = field;
    this.code = code;
  }

  public static CatalogException bad(String field, String code, String message) {
    return new CatalogException(ErrorCode.INVALID_DATA, field, code, message);
  }

  public static CatalogException conflict(String field, String code, String message) {
    return new CatalogException(ErrorCode.CONFLICT, field, code, message);
  }
}
