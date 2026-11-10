package com.example.dantruventu.Controller.cashbook;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.Services.cashbook.CashbookReadService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/cashbook")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCashbookController {

  private final CashbookReadService reads;

  @GetMapping("/overview")
  public ApiResponse<Map<String, Object>> getOverview(@RequestParam Map<String, String> params) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy tổng quan quỹ thành công")
        .data(reads.overview(params))
        .build();
  }

  @GetMapping("/cash-flow")
  public ApiResponse<Map<String, Object>> getCashFlow(@RequestParam Map<String, String> params) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy dữ liệu biểu đồ dòng tiền thành công")
        .data(reads.cashFlow(params))
        .build();
  }

  @GetMapping("/export")
  public org.springframework.http.ResponseEntity<byte[]> exportCashbook(
      @RequestParam java.util.Map<String, String> params) {

    byte[] content = reads.exportCashbook(params);

    String filename = "So_quy_" + params.get("tu_ngay") + "_" + params.get("den_ngay") + ".xlsx";

    return org.springframework.http.ResponseEntity.ok()
        .contentType(
            org.springframework.http.MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .header(
            org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
            org.springframework.http.ContentDisposition.attachment()
                .filename(filename, java.nio.charset.StandardCharsets.UTF_8)
                .build()
                .toString())
        .body(content);
  }

  @GetMapping
  public ApiResponse<Map<String, Object>> getCashbook(@RequestParam Map<String, String> params) {

    return ApiResponse.<Map<String, Object>>builder()
        .status(200)
        .message("Lấy dữ liệu sổ quỹ thành công")
        .data(reads.cashbook(params))
        .build();
  }
}
