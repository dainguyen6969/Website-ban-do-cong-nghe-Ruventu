package com.example.dantruventu.Services.order;

import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Calculates from the stored sale payment and effective prior returns, without side effects. */
final class ReturnRefundCalculator {

  private ReturnRefundCalculator() {}

  record Quote(BigDecimal unitRefund, BigDecimal lineRefund, BigDecimal roundingAdjustment) {}

  static Quote quote(
      BigDecimal storedPayment,
      int purchasedQuantity,
      int requestedQuantity,
      long previouslyRequestedQuantity,
      BigDecimal previouslyRequestedAmount) {
    if (requestedQuantity <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "Số lượng trả phải là số nguyên dương");
    }
    if (purchasedQuantity <= 0
        || previouslyRequestedQuantity < 0
        || previouslyRequestedQuantity > purchasedQuantity) {
      throw new AppException(ErrorCode.CONFLICT, "Số lượng trả của đơn hàng không nhất quán");
    }
    long remainingQuantity = purchasedQuantity - previouslyRequestedQuantity;
    if (requestedQuantity > remainingQuantity) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "Số lượng hoàn trả không được vượt quá số lượng còn được trả");
    }

    BigDecimal payment = wholeVnd(storedPayment);
    BigDecimal usedAmount = wholeVnd(previouslyRequestedAmount);
    BigDecimal remainingAmount = payment.subtract(usedAmount);
    if (remainingAmount.signum() < 0) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Lịch sử tiền hoàn của dòng hàng không nhất quán");
    }

    BigDecimal unitRefund =
        payment.divide(BigDecimal.valueOf(purchasedQuantity), 0, RoundingMode.DOWN);
    BigDecimal baseAmount = unitRefund.multiply(BigDecimal.valueOf(requestedQuantity));
    BigDecimal amount =
        requestedQuantity == remainingQuantity ? remainingAmount : baseAmount.min(remainingAmount);
    return new Quote(unitRefund, amount, amount.subtract(baseAmount));
  }

  private static BigDecimal wholeVnd(BigDecimal amount) {
    if (amount == null || amount.signum() < 0) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "Lịch sử tiền hoàn của dòng hàng không đầy đủ hoặc không hợp lệ");
    }
    try {
      return amount.setScale(0, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Lịch sử tiền hoàn phải theo đơn vị VND");
    }
  }
}
