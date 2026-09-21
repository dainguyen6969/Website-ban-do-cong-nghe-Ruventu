package com.example.dantruventu.Controller.warehouse;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryDetailResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryLedgerListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryListResponse;
import com.example.dantruventu.Services.AdminInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminInventoryController {

  private final AdminInventoryService adminInventoryService;

  @GetMapping("/items")
  public ApiResponse<AdminInventoryListResponse> getItems(
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "loai_doi_tuong", defaultValue = "ALL") String loaiDoiTuong,
      @RequestParam(name = "kho_hang_id", required = false) Long khoHangId,
      @RequestParam(name = "chi_canh_bao", defaultValue = "false") boolean chiCanhBao,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit,
      @RequestParam(name = "sort", defaultValue = "ten_hien_thi,asc") String sort) {

    return ApiResponse.<AdminInventoryListResponse>builder()
        .status(200)
        .message("Lấy danh sách tồn kho thành công")
        .data(
            adminInventoryService.getItems(
                keyword, loaiDoiTuong, khoHangId, chiCanhBao, page, limit, sort))
        .build();
  }

  @GetMapping("/items/{id}")
  public ApiResponse<AdminInventoryDetailResponse> getDetail(
      @PathVariable("id") Long id,
      @RequestParam(name = "loai_doi_tuong", required = false) String loaiDoiTuong) {

    // Service kiểm tra bắt buộc và trả 400 nếu thiếu/sai loại.
    return ApiResponse.<AdminInventoryDetailResponse>builder()
        .status(200)
        .message("Lấy chi tiết tồn kho thành công")
        .data(adminInventoryService.getDetail(id, loaiDoiTuong))
        .build();
  }

  @GetMapping("/ledger")
  public ApiResponse<AdminInventoryLedgerListResponse> getLedger(
      @RequestParam(name = "kho_hang_id", required = false) Long khoHangId,
      @RequestParam(name = "phien_ban_id", required = false) Long phienBanId,
      @RequestParam(name = "loai_giao_dich", required = false) String loaiGiaoDich,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {

    return ApiResponse.<AdminInventoryLedgerListResponse>builder()
        .status(200)
        .message("Lấy lịch sử biến động tồn kho thành công")
        .data(
            adminInventoryService.getLedger(
                khoHangId, phienBanId, loaiGiaoDich, tuNgay, denNgay, page, limit))
        .build();
  }
}
