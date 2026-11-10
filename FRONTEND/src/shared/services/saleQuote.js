export function priceConfirmation(preview) {
  const expiresAt = Date.parse(preview?.het_han_xac_nhan_gia);
  const total = Number(preview?.tong_thanh_toan);

  if (
    !preview?.ma_xac_nhan_gia ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    !Number.isSafeInteger(total) ||
    total < 0
  ) {
    const error = new Error(
      'Giá cần được xác nhận lại. Vui lòng tính lại đơn hàng.',
    );
    error.status = 409;
    throw error;
  }

  return {
    ma_xac_nhan_gia: preview.ma_xac_nhan_gia,
    tong_thanh_toan_xac_nhan: total,
  };
}

export function sameQuotedPrice(previous, current) {
  return Boolean(
    previous?.dau_van_tay_gia &&
    previous.dau_van_tay_gia === current?.dau_van_tay_gia,
  );
}