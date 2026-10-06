package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashFlowResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookOverviewResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashbookResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminCashbookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/cashbook")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCashbookController {

  private final AdminCashbookService service;

  @GetMapping("/overview")
  public ApiResponse<CashbookOverviewResponse> getOverview(
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "loai_phieu", required = false) String loaiPhieu,
      @RequestParam(name = "phuong_thuc_thanh_toan", required = false) String phuongThucThanhToan,
      @RequestParam(name = "nhom_nguoi_nop_nhan", required = false) String nhomNguoiNopNhan,
      @RequestParam(name = "ten_nguoi_nop_nhan", required = false) String tenNguoiNopNhan,
      @RequestParam(name = "nguoi_tao_id", required = false) String nguoiTaoId,
      @RequestParam MultiValueMap<String, String> queryParameters) {

    rejectPaginationParameters(queryParameters, ErrorCode.INVALID_CASHBOOK_OVERVIEW_FILTER);

    return ApiResponse.<CashbookOverviewResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy tổng quan quỹ thành công")
        .data(
            service.getOverview(
                tuNgay,
                denNgay,
                keyword,
                loaiPhieu,
                phuongThucThanhToan,
                nhomNguoiNopNhan,
                tenNguoiNopNhan,
                nguoiTaoId))
        .build();
  }

  @GetMapping("/cash-flow")
  public ApiResponse<CashFlowResponse> getCashFlow(
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "nhom_theo", required = false) String nhomTheo,
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "loai_phieu", required = false) String loaiPhieu,
      @RequestParam(name = "phuong_thuc_thanh_toan", required = false) String phuongThucThanhToan,
      @RequestParam(name = "nhom_nguoi_nop_nhan", required = false) String nhomNguoiNopNhan,
      @RequestParam(name = "ten_nguoi_nop_nhan", required = false) String tenNguoiNopNhan,
      @RequestParam(name = "nguoi_tao_id", required = false) String nguoiTaoId,
      @RequestParam MultiValueMap<String, String> queryParameters) {

    rejectPaginationParameters(queryParameters, ErrorCode.INVALID_CASH_FLOW_FILTER);

    return ApiResponse.<CashFlowResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy dữ liệu biểu đồ dòng tiền thành công")
        .data(
            service.getCashFlow(
                tuNgay,
                denNgay,
                nhomTheo,
                keyword,
                loaiPhieu,
                phuongThucThanhToan,
                nhomNguoiNopNhan,
                tenNguoiNopNhan,
                nguoiTaoId))
        .build();
  }

  @GetMapping("/export")
  public ResponseEntity<byte[]> exportCashbook(
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "loai_phieu", required = false) String loaiPhieu,
      @RequestParam(name = "phuong_thuc_thanh_toan", required = false) String phuongThucThanhToan,
      @RequestParam(name = "nhom_nguoi_nop_nhan", required = false) String nhomNguoiNopNhan,
      @RequestParam(name = "ten_nguoi_nop_nhan", required = false) String tenNguoiNopNhan,
      @RequestParam(name = "nguoi_tao_id", required = false) String nguoiTaoId,
      @RequestParam MultiValueMap<String, String> queryParameters) {

    boolean paginationParameterPresent =
        queryParameters.containsKey("page") || queryParameters.containsKey("limit");
    byte[] content;
    try {
      content =
          service.exportCashbook(
              tuNgay,
              denNgay,
              keyword,
              loaiPhieu,
              phuongThucThanhToan,
              nhomNguoiNopNhan,
              tenNguoiNopNhan,
              nguoiTaoId,
              paginationParameterPresent);
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new AppException(ErrorCode.CASHBOOK_EXPORT_FAILED);
    }

    String startLabel = tuNgay == null || tuNgay.isBlank() ? "tat_ca" : tuNgay.strip();
    String endLabel = denNgay == null || denNgay.isBlank() ? "tat_ca" : denNgay.strip();
    String filename = "So_quy_" + startLabel + "_" + endLabel + ".xlsx";

    return ResponseEntity.ok()
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentLength(content.length)
        .body(content);
  }

  @GetMapping
  public ApiResponse<CashbookResponse> getCashbook(
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "loai_phieu", required = false) String loaiPhieu,
      @RequestParam(name = "phuong_thuc_thanh_toan", required = false) String phuongThucThanhToan,
      @RequestParam(name = "nhom_nguoi_nop_nhan", required = false) String nhomNguoiNopNhan,
      @RequestParam(name = "ten_nguoi_nop_nhan", required = false) String tenNguoiNopNhan,
      @RequestParam(name = "nguoi_tao_id", required = false) String nguoiTaoId,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {

    return ApiResponse.<CashbookResponse>builder()
        .status(HttpStatus.OK.value())
        .message("Lấy dữ liệu sổ quỹ thành công")
        .data(
            service.getCashbook(
                tuNgay,
                denNgay,
                keyword,
                loaiPhieu,
                phuongThucThanhToan,
                nhomNguoiNopNhan,
                tenNguoiNopNhan,
                nguoiTaoId,
                page,
                limit))
        .build();
  }

  private void rejectPaginationParameters(
      MultiValueMap<String, String> queryParameters, ErrorCode errorCode) {
    if (queryParameters.containsKey("page") || queryParameters.containsKey("limit")) {
      throw new AppException(errorCode);
    }
  }
}
