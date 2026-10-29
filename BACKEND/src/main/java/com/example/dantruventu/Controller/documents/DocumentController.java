package com.example.dantruventu.Controller.documents;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.Services.documents.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/documents")
@PreAuthorize("hasRole('ADMIN')")
public class DocumentController {

  private final DocumentService service;

  private ApiResponse<Object> ok(Object data) {
    return ApiResponse.builder()
        .status(200)
        .message("Xử lý chứng từ thành công")
        .data(data)
        .build();
  }

  @GetMapping("/options")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<Object> options() {
    return ok(service.options());
  }

  @PostMapping("/funds")
  public ApiResponse<Object> fund(
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody DocumentService.FundCommand request) {
    return ok(service.createFund(key, request));
  }

  @PostMapping("/funds/{id}/status")
  public ApiResponse<Object> fundStatus(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody DocumentService.FundStatus request) {
    return ok(service.fundStatus(id, key, request));
  }

  @PostMapping("/funds/{id}/delete")
  public ApiResponse<Object> deleteFund(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody DocumentService.DeleteFund request) {

    return ok(service.deleteFund(id, key, request));
  }

  @GetMapping("/money/{id}")
  public ApiResponse<Object> money(@PathVariable Long id) {
    return ok(service.moneyDetail(id));
  }

  @PostMapping("/money/{id}")
  public ApiResponse<Object> money(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody DocumentService.MoneyCommand request) {
    return ok(service.saveMoney(id, key, request));
  }

  @GetMapping("/purchases/{id}")
  public ApiResponse<Object> purchase(@PathVariable Long id) {
    return ok(service.purchase(id));
  }

  @PostMapping("/purchases/{id}/supplier-documents")
  public ApiResponse<Object> supplierDocument(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody DocumentService.SupplierDocument request) {
    return ok(service.supplierDocument(id, key, request));
  }

  @GetMapping("/orders/{id}")
  public ApiResponse<Object> order(@PathVariable Long id) {
    return ok(service.order(id));
  }

  @GetMapping("/devices/{id}/sources")
  public ApiResponse<Object> sourceOptions(@PathVariable Long id) {
    return ok(service.sourceOptions(id));
  }

  @PostMapping("/devices/{id}/source")
  public ApiResponse<Object> source(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody DocumentService.SourceCommand request) {
    return ok(service.bindSource(id, key, request));
  }

  @GetMapping("/devices/{id}/trace")
  public ApiResponse<Object> trace(@PathVariable Long id) {
    return ok(service.trace(id));
  }
}
