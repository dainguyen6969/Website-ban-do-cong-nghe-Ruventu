package com.example.dantruventu.Error;

import lombok.Getter;

@Getter
public class AppException extends RuntimeException {

  private final ErrorCode errorCode;
  private final String field;
  private final String code;

  public AppException(ErrorCode errorCode) {
    this(errorCode, null, null, errorCode.getMessage());
  }

  public AppException(ErrorCode errorCode, String message) {
    this(errorCode, null, null, message);
  }

  public AppException(ErrorCode errorCode, String field, String code, String message) {

    super(message);
    this.errorCode = errorCode;
    this.field = field;
    this.code = code;
  }
}
