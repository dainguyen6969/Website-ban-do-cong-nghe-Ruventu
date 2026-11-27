package com.example.dantruventu.Services.printing;

import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.warehouse.DonNhapHangRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseReceiptPrintSource {
  private final DonNhapHangRepository orders;
  private final TheKhoRepository movements;

  public PrintDocument load(Long id) {
    orders
        .findById(id)
        .orElseThrow(
            () ->
                new AppException(ErrorCode.PRINT_RECORD_NOT_FOUND, "Không tìm thấy đơn nhập hàng"));

    var receipts =
        movements.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(id, LoaiGiaoDichKho.NHAP_HANG);
    if (receipts.isEmpty()) {
      throw new AppException(
          ErrorCode.PRINT_HISTORY_CONFLICT, "Đơn nhập hàng chưa có xác nhận nhập kho thành công");
    }

    // Thẻ kho hiện chỉ giữ lượng nhập, kho và thời điểm. Người tạo đơn không phải
    // người nhận; serial hiện tại cũng không có liên kết với lần nhập ban đầu.
    // Không lấy lượng tồn hoặc trừ hàng trả NCC để dựng lại phiếu nhập gốc.
    throw new AppException(
        ErrorCode.PRINT_HISTORY_CONFLICT,
        "Thiếu lịch sử người nhận và danh sách hàng, serial thực nhận để in phiếu nhập kho");
  }
}
