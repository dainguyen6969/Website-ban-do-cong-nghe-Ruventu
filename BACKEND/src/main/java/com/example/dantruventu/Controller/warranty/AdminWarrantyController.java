package com.example.dantruventu.Controller.warranty;

import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyCreateRequest;
import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyEventRequest;
import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyIntakeResultRequest;
import com.example.dantruventu.DTO.Request.warranty.AdminWarrantyStatusRequest;
import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warranty.*;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Services.warranty.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/warranties")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminWarrantyController {
  private final AdminWarrantyService service;
  private final AdminWarrantyLookupService lookupService;
  private final AdminWarrantyDetailService detailService;
  private final AdminWarrantyCreateService createService;
  private final AdminWarrantyIntakeResultService intakeResultService;
  private final AdminWarrantyStatusService statusService;
  private final AdminWarrantyEventService eventService;

  @PostMapping("/{id}/events")
  public ApiResponse<AdminWarrantyEventResponse> saveEvent(
      @PathVariable String id,
      @RequestBody AdminWarrantyEventRequest request,
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @AuthenticationPrincipal NguoiDung actor) {
    return eventService.save(id, request, key, actor == null ? null : actor.getId());
  }

  @PatchMapping("/{id}/status")
  public ApiResponse<AdminWarrantyStatusResponse> updateStatus(
      @PathVariable String id,
      @RequestBody AdminWarrantyStatusRequest request,
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @AuthenticationPrincipal NguoiDung actor) {
    return statusService.update(id, request, key, actor == null ? null : actor.getId());
  }

  @PostMapping("/intake-results")
  public ResponseEntity<ApiResponse<AdminWarrantyIntakeResultResponse>> saveIntakeResult(
      @RequestBody AdminWarrantyIntakeResultRequest request,
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @AuthenticationPrincipal NguoiDung actor) {
    return ResponseEntity.status(201)
        .body(intakeResultService.save(request, key, actor == null ? null : actor.getId()));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminWarrantyCreateResponse>> create(
      @RequestBody AdminWarrantyCreateRequest request,
      @RequestHeader(name = "Idempotency-Key", required = false) String key,
      @AuthenticationPrincipal NguoiDung actor) {
    var result = createService.create(request, key, actor == null ? null : actor.getId());
    return ResponseEntity.status(201)
        .body(
            ApiResponse.<AdminWarrantyCreateResponse>builder()
                .status(201)
                .message("Tiếp nhận bảo hành thành công")
                .data(result)
                .build());
  }

  @GetMapping("/lookup")
  public ApiResponse<AdminWarrantyLookupResponse> lookup(
      @RequestParam(name = "so_serial", required = false) String soSerial,
      @RequestParam(name = "ma_theo_doi", required = false) String maTheoDoi,
      @RequestParam(name = "ma_don_hang", required = false) String maDonHang,
      @RequestParam(name = "sdt_nguoi_lien_he", required = false) String sdt,
      @RequestParam(name = "yeu_cau_tiep_nhan_id", required = false) String intakeId,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {
    return ApiResponse.<AdminWarrantyLookupResponse>builder()
        .status(200)
        .message("Tra cứu bảo hành thành công")
        .data(lookupService.getLookup(soSerial, maTheoDoi, maDonHang, sdt, intakeId, page, limit))
        .build();
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminWarrantyDetailResponse> getDetail(
      @PathVariable String id,
      @RequestParam(name = "history_page", defaultValue = "0") String historyPage,
      @RequestParam(name = "history_limit", defaultValue = "1") String historyLimit) {
    return ApiResponse.<AdminWarrantyDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết phiếu bảo hành thành công")
        .data(detailService.getDetail(id, historyPage, historyLimit))
        .build();
  }

  @GetMapping
  public ApiResponse<AdminWarrantyListResponse> getWarranties(
      @RequestParam(required = false) String keyword,
      @RequestParam(name = "trang_thai_xu_ly", required = false) String trangThaiXuLy,
      @RequestParam(name = "trang_thai_bao_gia", required = false) String trangThaiBaoGia,
      @RequestParam(name = "trang_thai_thanh_toan", required = false) String trangThaiThanhToan,
      @RequestParam(name = "trang_thai_hoan_tien", required = false) String trangThaiHoanTien,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(defaultValue = "0") String page,
      @RequestParam(defaultValue = "20") String limit) {
    return ApiResponse.<AdminWarrantyListResponse>builder()
        .status(200)
        .message("Lấy danh sách phiếu bảo hành thành công")
        .data(
            service.getWarranties(
                keyword,
                trangThaiXuLy,
                trangThaiBaoGia,
                trangThaiThanhToan,
                trangThaiHoanTien,
                tuNgay,
                denNgay,
                page,
                limit))
        .build();
  }
}
