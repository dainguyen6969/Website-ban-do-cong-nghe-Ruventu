package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.SupplierRecallRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.Services.warehouse.SourceTraceService;
import com.example.dantruventu.Services.warehouse.SupplierRecallService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/recalls")
@PreAuthorize("hasRole('ADMIN')")
public class SupplierRecallController {
  private final SupplierRecallService service;
  private final SourceTraceService sources;

  private ApiResponse<Object> ok(Object data, String message) {
    return ApiResponse.builder().status(200).message(message).data(data).build();
  }

  @GetMapping
  public ApiResponse<Object> list(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int limit) {
    return ok(service.list(keyword, status, page, limit), "Lấy danh sách thu hồi thành công");
  }

  @GetMapping("/sources")
  public ApiResponse<Object> options(@RequestParam(required = false) String keyword) {
    return ok(service.sourceOptions(keyword), "Lấy nguồn nhập thành công");
  }

  @GetMapping("/sources/{poId}")
  public ApiResponse<Object> source(@PathVariable Long poId) {
    return ok(sources.purchaseSources(poId), "Lấy nguồn nhận thành công");
  }

  @PostMapping("/sources/{poId}/backfill")
  public ApiResponse<Object> backfill(
      @PathVariable Long poId,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody SupplierRecallRequest.Backfill request) {
    return ok(sources.backfill(poId, key, request), "Đã lưu đối soát nguồn cũ");
  }

  @GetMapping("/serials/{serialId}/trace")
  public ApiResponse<Object> trace(@PathVariable Long serialId) {
    return ok(sources.serialTrace(serialId), "Lấy truy vết serial thành công");
  }

  @GetMapping("/{id}")
  public ApiResponse<Object> detail(@PathVariable Long id) {
    return ok(service.detail(id), "Lấy chi tiết thu hồi thành công");
  }

  @PostMapping
  public ApiResponse<Object> open(
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody SupplierRecallRequest.Open request) {
    return ok(service.open(key, request), "Đã tạo đợt thu hồi");
  }

  @PostMapping("/{id}/events")
  public ApiResponse<Object> execute(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody SupplierRecallRequest.Command request) {
    return ok(service.execute(id, key, request), "Đã cập nhật đợt thu hồi");
  }
}
