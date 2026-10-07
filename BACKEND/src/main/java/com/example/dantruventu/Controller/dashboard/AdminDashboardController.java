package com.example.dantruventu.Controller.dashboard;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.DTO.Response.dashboard.AdminDashboardResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

  private static final MediaType XLSX =
      MediaType.parseMediaType(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  private final AdminDashboardService service;

  @GetMapping("/summary")
  public ApiResponse<AdminDashboardResponse.Summary> getSummary(
      @RequestParam(required = false) String ky,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "kenh_ban", required = false) String kenhBan) {
    return ok("Lấy tổng quát thành công", service.getSummary(ky, tuNgay, denNgay, kenhBan));
  }

  @GetMapping("/tasks")
  public ApiResponse<AdminDashboardResponse.Tasks> getTasks(
      @RequestParam(name = "kenh_ban", required = false) String kenhBan,
      @RequestParam(defaultValue = "5") String limit) {
    return ok("Lấy việc cần xử lý thành công", service.getTasks(kenhBan, limit));
  }

  @GetMapping("/business-chart")
  public ApiResponse<AdminDashboardResponse.BusinessChart> getBusinessChart(
      @RequestParam(required = false) String ky,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "kenh_ban", required = false) String kenhBan,
      @RequestParam(name = "nhom_theo", required = false) String nhomTheo) {
    return ok(
        "Lấy biểu đồ kinh doanh thành công",
        service.getBusinessChart(ky, tuNgay, denNgay, kenhBan, nhomTheo));
  }

  @GetMapping("/top-products")
  public ApiResponse<AdminDashboardResponse.TopProducts> getTopProducts(
      @RequestParam(required = false) String ky,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "kenh_ban", required = false) String kenhBan,
      @RequestParam(name = "xep_hang_theo", required = false) String xepHangTheo,
      @RequestParam(defaultValue = "5") String limit) {
    return ok(
        "Lấy sản phẩm bán chạy thành công",
        service.getTopProducts(ky, tuNgay, denNgay, kenhBan, xepHangTheo, limit));
  }

  @GetMapping("/inventory")
  public ApiResponse<AdminDashboardResponse.Inventory> getInventory(
      @RequestParam(defaultValue = "5") String limit) {
    return ok("Lấy tổng quát tồn kho thành công", service.getInventory(limit));
  }

  @GetMapping("/slow-moving-products")
  public ApiResponse<AdminDashboardResponse.SlowMovingProducts> getSlowMovingProducts(
      @RequestParam(name = "so_ngay_khong_ban", defaultValue = "30") String soNgayKhongBan,
      @RequestParam(defaultValue = "5") String limit) {
    return ok(
        "Lấy sản phẩm tồn lâu thành công",
        service.getSlowMovingProducts(soNgayKhongBan, limit));
  }

  @GetMapping("/purchases")
  public ApiResponse<AdminDashboardResponse.Purchases> getPurchases() {
    return ok("Lấy tổng quát nhập hàng thành công", service.getPurchases());
  }

  @GetMapping("/customers")
  public ApiResponse<AdminDashboardResponse.Customers> getCustomers(
      @RequestParam(required = false) String ky,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "kenh_ban", required = false) String kenhBan) {
    return ok(
        "Lấy tổng quát khách hàng thành công",
        service.getCustomers(ky, tuNgay, denNgay, kenhBan));
  }

  @GetMapping("/cashflow")
  public ApiResponse<AdminDashboardResponse.Cashflow> getCashflow(
      @RequestParam(required = false) String ky,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "kenh_ban", required = false) String kenhBan,
      @RequestParam(name = "nhom_theo", required = false) String nhomTheo) {
    return ok(
        "Lấy tổng quát sổ quỹ thành công",
        service.getCashflow(ky, tuNgay, denNgay, kenhBan, nhomTheo));
  }

  @GetMapping("/after-sales")
  public ApiResponse<AdminDashboardResponse.AfterSales> getAfterSales(
      @RequestParam(name = "kenh_ban", required = false) String kenhBan) {
    return ok(
        "Lấy tổng quát bảo hành và trả hàng thành công",
        service.getAfterSales(kenhBan));
  }

  @GetMapping("/promotions")
  public ApiResponse<AdminDashboardResponse.Promotions> getPromotions() {
    return ok("Lấy tổng quát khuyến mại thành công", service.getPromotions());
  }

  @GetMapping("/export")
  public ResponseEntity<byte[]> export(
      @RequestParam(required = false) String ky,
      @RequestParam(name = "tu_ngay", required = false) String tuNgay,
      @RequestParam(name = "den_ngay", required = false) String denNgay,
      @RequestParam(name = "kenh_ban", required = false) String kenhBan,
      @RequestParam(name = "nhom_theo", required = false) String nhomTheo,
      @RequestParam(name = "xep_hang_theo", required = false) String xepHangTheo,
      @RequestParam(name = "so_ngay_khong_ban", defaultValue = "30") String soNgayKhongBan,
      @RequestParam(defaultValue = "5") String limit) {
    try {
      AdminDashboardService.ExportResult result =
          service.export(
              ky,
              tuNgay,
              denNgay,
              kenhBan,
              nhomTheo,
              xepHangTheo,
              soNgayKhongBan,
              limit);
      return ResponseEntity.ok()
          .contentType(XLSX)
          .header(
              HttpHeaders.CONTENT_DISPOSITION,
              "attachment; filename=\"" + result.filename() + "\"")
          .contentLength(result.content().length)
          .body(result.content());
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Xuất báo cáo không thành công, vui lòng thử lại");
    }
  }

  private <T> ApiResponse<T> ok(String message, T data) {
    return ApiResponse.<T>builder()
        .status(HttpStatus.OK.value())
        .message(message)
        .data(data)
        .build();
  }
}
