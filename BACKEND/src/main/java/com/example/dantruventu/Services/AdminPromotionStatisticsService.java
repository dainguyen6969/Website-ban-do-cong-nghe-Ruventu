package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.promotion.AdminPromotionStatisticsResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionStatisticsResponse.Gift;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionStatisticsResponse.PeriodStatistics;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionStatisticsResponse.UsageCounts;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionStatisticsRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionStatisticsRepository.UsageAggregate;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class AdminPromotionStatisticsService {

  private final AdminPromotionRepository programs;
  private final AdminPromotionStatisticsRepository statistics;
  private final SalesContext context;

  public AdminPromotionStatisticsResponse getStatistics(Long id, LocalDate from, LocalDate to) {
    requireAdminOrderReader();
    if (id == null || id <= 0) {
      throw invalid("ID khuyến mại phải là số nguyên dương");
    }
    if (from == null || to == null) {
      throw invalid("Cần cung cấp đầy đủ tu_ngay và den_ngay");
    }
    if (from.isAfter(to)) {
      throw invalid("Ngày bắt đầu thống kê phải trước hoặc bằng ngày kết thúc thống kê");
    }

    LocalDateTime end;
    try {
      end = to.plusDays(1).atStartOfDay();
    } catch (DateTimeException exception) {
      throw invalid("Khoảng ngày thống kê không hợp lệ");
    }
    // Keep bound parameters within the MySQL DATETIME range.
    if (from.getYear() < 1000 || end.getYear() > 9999) {
      throw invalid("Khoảng ngày thống kê vượt phạm vi ngày được hỗ trợ");
    }
    LocalDateTime start = from.atStartOfDay();

    if (!programs.existsById(id)) {
      throw new AppException(ErrorCode.NOT_FOUND, "Chương trình khuyến mại không tồn tại");
    }

    UsageSummary all = summarize(statistics.summarizeAll(id));
    UsageSummary period = summarize(statistics.summarizePeriod(id, start, end));
    List<Gift> gifts = new ArrayList<>();
    long giftQuantity = 0;
    for (var row :
        statistics.summarizeDeliveredGifts(id, start, end, TrangThaiApDungKhuyenMai.DA_SU_DUNG)) {
      long quantity = row.getQuantity();
      if (quantity <= 0) {
        throw new AppException(
            ErrorCode.INTERNAL_SERVER_ERROR, "Dữ liệu số lượng quà tặng không hợp lệ");
      }
      gifts.add(new Gift(row.getVariantId(), quantity));
      giftQuantity = Math.addExact(giftQuantity, quantity);
    }

    return new AdminPromotionStatisticsResponse(
        id,
        from,
        to,
        "Asia/Ho_Chi_Minh",
        "NGAY_CHOT_UU_DAI",
        "TRANG_THAI_HIEN_TAI",
        new UsageCounts(all.held(), all.used(), all.released()),
        new PeriodStatistics(
            period.held(),
            period.used(),
            period.released(),
            period.usedDiscount(),
            giftQuantity,
            List.copyOf(gifts)));
  }

  private void requireAdminOrderReader() {
    var actor = context.actor();
    if (actor.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || actor.getVaiTro() == null
        || !"ADMIN".equals(actor.getVaiTro().getMaVaiTro())) {
      throw new AppException(ErrorCode.FORBIDDEN);
    }
  }

  private UsageSummary summarize(List<UsageAggregate> rows) {
    long held = 0;
    long used = 0;
    long released = 0;
    BigDecimal usedDiscount = BigDecimal.ZERO;
    for (var row : rows) {
      switch (row.getUsageStatus()) {
        case GIU_CHO -> held = row.getOrderCount();
        case DA_SU_DUNG -> {
          used = row.getOrderCount();
          usedDiscount = row.getDiscountTotal();
        }
        case DA_GIAI_PHONG -> released = row.getOrderCount();
      }
    }
    return new UsageSummary(held, used, released, usedDiscount);
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private record UsageSummary(long held, long used, long released, BigDecimal usedDiscount) {}
}
