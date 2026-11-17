package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.PcBuilderExportRequest;
import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.PcBuilderExportException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PcBuilderExportService {
  private final PcBuilderService builder;
  private final PcBuilderExcelExporter exporter;

  public record File(String filename, byte[] content) {}

  // Giữ cùng bản đọc giá/tồn trong suốt lần đối chiếu và tạo file, không ghi dữ liệu.
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public File export(PcBuilderExportRequest request) {
    try {
      if (request == null || request.items() == null || request.items().isEmpty())
        throw invalid("items");
      var previewRequest =
          new PcBuilderPreviewRequest(
              request.items().stream()
                  .map(
                      item ->
                          item == null
                              ? null
                              : new PcBuilderPreviewRequest.Item(
                                  item.maHangMuc(), item.phienBanId(), item.soLuong()))
                  .toList());
      var selected = builder.validateSelections(previewRequest);
      List<BigDecimal> prices = new java.util.ArrayList<>();
      for (int i = 0; i < request.items().size(); i++) {
        Object raw = request.items().get(i).donGiaXacNhan();
        String field = "items[" + i + "].don_gia_xac_nhan";
        if (!(raw instanceof Number)) throw invalid(field);
        try {
          BigDecimal price = new BigDecimal(raw.toString()).stripTrailingZeros();
          if (price.signum() < 0
              || price.scale() > 2
              || (long) price.precision() - price.scale() > 36) throw invalid(field);
          prices.add(price);
        } catch (NumberFormatException | ArithmeticException exception) {
          throw invalid(field);
        }
      }
      var variants = builder.validateExportVariants(selected);
      var warranties = new LinkedHashMap<Long, Integer>();
      for (int i = 0; i < selected.size(); i++) {
        var variant = variants.get(selected.get(i).variantId());
        if (variant.getGiaBanLe().compareTo(prices.get(i)) != 0)
          throw new PcBuilderExportException(
              ErrorCode.PC_BUILDER_EXPORT_PRICE_CHANGED,
              "items[" + i + "].don_gia_xac_nhan",
              "PRICE_CHANGED",
              "Lấy preview mới và xác nhận trước xuất");
        Integer months = variant.getSanPham().getThoiHanBaoHanhThang();
        if (months == null || months < 0) throw sourceFailed();
        warranties.put(variant.getId(), months);
      }
      var preview = builder.preview(previewRequest);
      byte[] bytes = exporter.export(preview, warranties);
      if (bytes == null || bytes.length == 0) throw sourceFailed();
      String filename =
          "Ruventu_CauHinhPC_"
              + preview.thoiDiemTinh().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
              + ".xlsx";
      return new File(filename, bytes);
    } catch (PcBuilderExportException exception) {
      throw exception;
    } catch (AppException exception) {
      throw switch (exception.getErrorCode()) {
        case INVALID_PC_BUILDER_PREVIEW -> invalid("items");
        case PC_BUILDER_PREVIEW_VARIANT_NOT_FOUND, PC_BUILDER_EXPORT_PUBLIC_VARIANT_NOT_FOUND ->
            new PcBuilderExportException(
                ErrorCode.PC_BUILDER_EXPORT_PUBLIC_VARIANT_NOT_FOUND,
                "items.phien_ban_id",
                "PUBLIC_VARIANT_NOT_FOUND",
                "Không tìm thấy phiên bản được phép công bố trong công cụ");
        case PC_BUILDER_PREVIEW_UNAVAILABLE, PC_BUILDER_EXPORT_UNAVAILABLE ->
            new PcBuilderExportException(
                ErrorCode.PC_BUILDER_EXPORT_UNAVAILABLE,
                "items.phien_ban_id",
                "EXPORT_VARIANT_UNAVAILABLE",
                ErrorCode.PC_BUILDER_EXPORT_UNAVAILABLE.getMessage());
        default -> sourceFailed();
      };
    } catch (Exception exception) {
      log.error("Không tạo được Excel cấu hình PC", exception);
      throw sourceFailed();
    }
  }

  private static PcBuilderExportException invalid(String field) {
    return new PcBuilderExportException(
        ErrorCode.INVALID_PC_BUILDER_EXPORT,
        field,
        "INVALID_EXPORT_REQUEST",
        ErrorCode.INVALID_PC_BUILDER_EXPORT.getMessage());
  }

  private static PcBuilderExportException sourceFailed() {
    return new PcBuilderExportException(
        ErrorCode.PC_BUILDER_EXPORT_SOURCE_FAILED,
        "source",
        "EXPORT_SOURCE_OR_RENDER_FAILED",
        ErrorCode.PC_BUILDER_EXPORT_SOURCE_FAILED.getMessage());
  }
}
