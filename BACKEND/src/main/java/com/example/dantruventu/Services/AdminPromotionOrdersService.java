package com.example.dantruventu.Services;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionOrdersResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionOrdersResponse.Gift;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionOrdersResponse.OrderItem;
import com.example.dantruventu.Entity.KhuyenMaiDonHang;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.promotion.AdminPromotionOrderRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Specification.KhuyenMaiDonHangSpecification;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class AdminPromotionOrdersService {
  private final AdminPromotionRepository programs;
  private final AdminPromotionOrderRepository applications;
  private final SalesContext context;
  private final SalesProperties sales;
  private final ObjectMapper mapper;

  public AdminPromotionOrdersResponse getOrders(
      Long id,
      String keyword,
      TrangThaiApDungKhuyenMai status,
      LocalDate from,
      LocalDate to,
      int page,
      int limit) {
    requireAdminOrderReader();
    if (id == null || id <= 0) {
      throw invalid("Khuyến mại được chọn không hợp lệ. Vui lòng chọn lại.");
    }
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalid(
          "Số trang hoặc số kết quả mỗi trang không hợp lệ. Mỗi trang được hiển thị từ 1 đến 100"
              + " kết quả.");
    }
    String normalized = keyword == null || keyword.isBlank() ? null : keyword.strip();
    if (normalized != null && normalized.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }
    if (from != null && to != null && from.isAfter(to)) {
      throw invalid("Ngày bắt đầu lọc phải trước hoặc bằng ngày kết thúc lọc");
    }
    LocalDateTime start;
    LocalDateTime end;
    try {
      start = from == null ? null : from.atStartOfDay();
      end = to == null ? null : to.plusDays(1).atStartOfDay();
    } catch (DateTimeException exception) {
      throw invalid("Khoảng ngày lọc không hợp lệ");
    }
    if (!programs.existsById(id)) {
      throw new AppException(ErrorCode.NOT_FOUND, "Chương trình khuyến mại không tồn tại");
    }

    var specification = KhuyenMaiDonHangSpecification.build(id, normalized, status, start, end);
    var pageable =
        PageRequest.of(
            page, limit, Sort.by(Sort.Order.desc("donHang.ngayTao"), Sort.Order.desc("id")));
    var result = applications.findAll(specification, pageable);
    List<Long> ids = result.getContent().stream().map(a -> a.getDonHang().getId()).toList();
    Map<Long, List<Gift>> gifts = new HashMap<>();
    if (!ids.isEmpty()) {
      for (var gift : applications.findGiftRows(ids)) {
        gifts
            .computeIfAbsent(gift.getOrderId(), ignored -> new ArrayList<>())
            .add(
                new Gift(
                    gift.getLineId(),
                    gift.getVariantId(),
                    gift.getQuantity(),
                    gift.getUnitPrice(),
                    gift.getLinePayment()));
      }
    }
    List<OrderItem> items =
        result.getContent().stream()
            .map(a -> item(a, gifts.getOrDefault(a.getDonHang().getId(), List.of())))
            .toList();
    return new AdminPromotionOrdersResponse(
        id,
        items,
        PaginationResponse.builder()
            .page(result.getNumber())
            .limit(result.getSize())
            .totalElements(result.getTotalElements())
            .totalPages(result.getTotalPages())
            .build());
  }

  private void requireAdminOrderReader() {
    // The current order API gives active ADMIN actors access to all orders, including those
    // created by another employee. Check that scope before fetching any order/recipient data.
    var actor = context.actor();
    if (actor.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || actor.getVaiTro() == null
        || !"ADMIN".equals(actor.getVaiTro().getMaVaiTro())) {
      throw new AppException(ErrorCode.FORBIDDEN);
    }
  }

  private OrderItem item(KhuyenMaiDonHang application, List<Gift> gifts) {
    var order = application.getDonHang();
    Integer version = null;
    try {
      var data = mapper.readTree(application.getDuLieuApDung());
      var stored = data == null ? null : data.get("phien_ban_cau_hinh");
      if (stored != null
          && stored.isIntegralNumber()
          && stored.canConvertToInt()
          && stored.intValue() > 0) {
        version = stored.intValue();
      }
    } catch (JacksonException | IllegalArgumentException exception) {
      // Keep historical rows readable without inventing a version from today's configuration.
    }
    String warning =
        version == null
            ? "Lịch sử ưu đãi của đơn chưa đầy đủ. Vui lòng kiểm tra lại thông tin."
            : null;
    return new OrderItem(
        application.getId(),
        order.getId(),
        order.getMaDonHang(),
        order.getLoaiDonHang(),
        order.getKhachHang() == null ? null : order.getKhachHang().getId(),
        order.getTenNguoiNhan(),
        order.getSdtNguoiNhan(),
        offset(order.getNgayTao()),
        order.getTrangThaiDonHang(),
        application.getTrangThaiApDung(),
        application.getMaChuongTrinh(),
        application.getTenChuongTrinh(),
        version,
        application.getSoTienGiam(),
        List.copyOf(gifts),
        offset(application.getNgayTao()),
        offset(application.getNgayCapNhat()),
        warning);
  }

  private OffsetDateTime offset(LocalDateTime value) {
    return value == null ? null : value.atZone(sales.zone()).toOffsetDateTime();
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }
}
