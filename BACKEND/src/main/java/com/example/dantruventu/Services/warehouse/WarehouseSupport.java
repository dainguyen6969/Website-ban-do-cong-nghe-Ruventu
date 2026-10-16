package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.TonKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import jakarta.persistence.EntityManager;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class WarehouseSupport {

  private final SalesIdempotencyRepository idempotencyRepository;
  private final PhienBanSanPhamRepository variantRepository;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;

  private record Fingerprint(String operation, Long targetId, Object body) {}

  public record StockNumbers(
      int actual, int available, int damaged, int warrantyHeld, int orderHeld) {}

  public PhienBanSanPham lockVariant(Long id) {
    PhienBanSanPham variant =
        variantRepository
            .findByIdForSaleUpdate(id)
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản " + id));

    // Đọc lại cấu hình sau khi đã lấy khóa.
    entityManager.refresh(variant);

    return variant;
  }

  public static StockNumbers numbers(TonKho stock) {
    Integer actual = stock.getTonThucTe();
    Integer available = stock.getTonCoTheBan();
    Integer damaged = stock.getHangLoi();
    Integer warrantyHeld = stock.getSoLuongGiuChoBaoHanh();

    if (actual == null
        || available == null
        || damaged == null
        || warrantyHeld == null
        || actual < 0
        || available < 0
        || damaged < 0
        || warrantyHeld < 0) {

      throw inconsistentStock();
    }

    long orderHeld = (long) actual - damaged - warrantyHeld - available;

    if (orderHeld < 0 || orderHeld > Integer.MAX_VALUE) {
      throw inconsistentStock();
    }

    return new StockNumbers(actual, available, damaged, warrantyHeld, (int) orderHeld);
  }

  public <T> T once(
      String operation,
      Long targetId,
      String requestKey,
      Object body,
      Long actorId,
      Class<T> responseType,
      Supplier<T> action) {

    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    if (targetId == null || targetId <= 0) {
      throw new AppException(ErrorCode.INVALID_DATA, "ID phải là số nguyên dương");
    }

    String uuid = canonicalUuid(requestKey);

    // 39 ký tự, phù hợp request_key VARCHAR(50).
    String storageKey = "WH:" + uuid;

    String requestHash = hash(new Fingerprint(operation, targetId, body));

    var entry = idempotencyRepository.acquire(storageKey, actorId, requestHash);

    if (!Objects.equals(entry.actorId(), actorId)
        || !Objects.equals(entry.requestHash(), requestHash)) {

      throw new AppException(ErrorCode.CONFLICT, "Idempotency-Key đã được dùng cho yêu cầu khác");
    }

    if (entry.responseJson() != null) {
      return objectMapper.readValue(entry.responseJson(), responseType);
    }

    T result = action.get();

    // Lỗi ghi nghiệp vụ phải xảy ra trước khi lưu kết quả chống lặp.
    entityManager.flush();

    idempotencyRepository.complete(storageKey, objectMapper.writeValueAsString(result));

    return result;
  }

  private String canonicalUuid(String value) {
    if (value == null || value.isBlank()) {
      throw invalidKey();
    }

    String normalized = value.trim();

    try {
      UUID uuid = UUID.fromString(normalized);

      if (!uuid.toString().equalsIgnoreCase(normalized)) {
        throw invalidKey();
      }

      return uuid.toString();
    } catch (IllegalArgumentException exception) {
      throw invalidKey();
    }
  }

  private String hash(Fingerprint value) {
    try {
      byte[] bytes = objectMapper.writeValueAsBytes(value);

      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));

    } catch (Exception exception) {
      throw new IllegalStateException("Không thể tạo dấu vân tay yêu cầu kho", exception);
    }
  }

  private static AppException inconsistentStock() {
    return new AppException(
        ErrorCode.CONFLICT, "Số liệu tồn kho không nhất quán; cần đối soát trước khi thao tác");
  }

  private AppException invalidKey() {
    return new AppException(ErrorCode.INVALID_DATA, "Idempotency-Key phải là UUID hợp lệ");
  }
}
