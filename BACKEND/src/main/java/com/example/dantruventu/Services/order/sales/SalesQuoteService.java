package com.example.dantruventu.Services.order.sales;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.order.SalePreviewData;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Repository.order.SalesPromotionDetailRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class SalesQuoteService {

  public static final String CART = "CART";
  public static final String CUSTOMER_CHECKOUT = "CUSTOMER_CHECKOUT";
  public static final String ADMIN_CREATE = "ADMIN_ONLINE_CREATE";
  public static final String POS = "POS";

  private static final String PREFIX = "sales:quote:v1:";

  private final StringRedisTemplate redis;
  private final ObjectMapper objectMapper;
  private final EntityManager entityManager;
  private final SalesPromotionDetailRepository promotionDetails;
  private final CatalogSupport catalog;
  private final SalesProperties properties;

  @Value("${ruventu.sales.quote-ttl-seconds:600}")
  private long ttlSeconds;

  public record StoredQuote(String owner, String scope, String fingerprint, long expiresAt) {}

  public static String editScope(Long orderId) {
    if (orderId == null || orderId <= 0) {
      throw invalid("ID đơn hàng không hợp lệ");
    }
    return "ADMIN_ONLINE_EDIT:" + orderId;
  }

  public static String identity(NguoiDung user, String guestCartId) {
    if (user != null && user.getId() != null) {
      return "USER:" + user.getId();
    }

    return "GUEST:" + uuid(guestCartId);
  }

  public static String uuid(String value) {
    String normalized = text(value);

    if (normalized == null
        || !normalized.matches(
            "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
      throw invalid("Thiếu hoặc sai định dạng UUID");
    }

    return UUID.fromString(normalized).toString();
  }

  public <T extends SalePreviewData> T issue(
      T response,
      String owner,
      String scope,
      AdminSalesRequest.Base request,
      SalesCalculationService.Plan plan) {

    if (ttlSeconds < 30 || ttlSeconds > 3600) {
      throw new IllegalStateException("ruventu.sales.quote-ttl-seconds phải từ 30 đến 3600");
    }

    Map<String, Object> promotion = promotion(plan);
    String fingerprint = fingerprint(request, plan, promotion);

    long expiresAt = Instant.now().plusSeconds(ttlSeconds).toEpochMilli();

    String token = UUID.randomUUID().toString();

    StoredQuote stored = new StoredQuote(owner, scope, fingerprint, expiresAt);

    redis
        .opsForValue()
        .set(
            PREFIX + token,
            objectMapper.writeValueAsString(stored),
            Duration.ofSeconds(ttlSeconds));

    response.setMaXacNhanGia(token);
    response.setHetHanXacNhanGia(
        Instant.ofEpochMilli(expiresAt).atZone(properties.zone()).toOffsetDateTime());
    response.setDauVanTayGia(fingerprint);
    response.setKhuyenMai(promotion);
    response.setQuaTang(
        plan.data().getSanPham().stream().filter(line -> line.laQuaTang()).toList());
    response.setTrangThaiKhuyenMai(promotion == null ? "CHUA_CHON" : "HOP_LE");
    response.setLyDoKhuyenMai(null);
    response.setLyDoTinhGia(null);
    response.setCoTheThanhToan(true);

    return response;
  }

  public void require(
      String token,
      String owner,
      String scope,
      AdminSalesRequest.Base request,
      SalesCalculationService.Plan plan) {

    String normalizedToken = uuid(token);
    String raw = redis.opsForValue().get(PREFIX + normalizedToken);

    if (raw == null) {
      throw conflict("Mã xác nhận giá đã hết hạn. Vui lòng tính lại và xác nhận.");
    }

    StoredQuote stored;

    try {
      stored = objectMapper.readValue(raw, StoredQuote.class);
    } catch (RuntimeException exception) {
      throw conflict("Không thể xác minh mã giá. Vui lòng tính lại và xác nhận.");
    }

    String current = fingerprint(request, plan, promotion(plan));

    if (stored.expiresAt() <= System.currentTimeMillis()
        || !Objects.equals(stored.owner(), owner)
        || !Objects.equals(stored.scope(), scope)
        || !Objects.equals(stored.fingerprint(), current)) {

      throw conflict("Giá, cấu hình hoặc ưu đãi đã thay đổi. " + "Vui lòng tính lại và xác nhận.");
    }
  }

  private String fingerprint(
      AdminSalesRequest.Base request,
      SalesCalculationService.Plan plan,
      Map<String, Object> promotion) {

    Map<String, Object> input = new TreeMap<>();
    input.put("khach_hang_id", request.getKhachHangId());
    input.put("kho_hang_id", request.getKhoHangId());
    input.put("bang_gia", request.getBangGia());
    input.put("thue", request.getThue());
    input.put(
        "ma_chuong_trinh",
        text(request.getMaChuongTrinh()) == null
            ? null
            : request.getMaChuongTrinh().strip().toUpperCase(Locale.ROOT));
    input.put("phi_giao_hang", inputMoney(request.getPhiGiaoHang()));
    input.put("san_pham", request.getSanPham());

    if (Boolean.TRUE.equals(request.getChoPhepChoHang())) {
      input.put("cho_phep_cho_hang", true);
    }

    Set<Long> variantIds = new TreeSet<>(plan.quantities().keySet());
    plan.lines().forEach(line -> variantIds.add(line.variant().getId()));

    List<Object> policies = new ArrayList<>();

    for (Long id : variantIds) {
      PhienBanSanPham variant = entityManager.find(PhienBanSanPham.class, id);

      if (variant == null) {
        throw conflict("Không còn tìm thấy phiên bản " + id);
      }

      var product = variant.getSanPham();

      policies.add(
          Arrays.asList(
              variant.getId(),
              product.getId(),
              product.getLoaiSanPham(),
              product.getTrangThai(),
              variant.getTrangThai(),
              variant.getCoQuanLySerial(),
              variant.getGiaBanLe(),
              product.getThueVat(),
              product.getThoiHanBaoHanhThang()));
    }

    Map<String, Object> payload = new TreeMap<>();
    payload.put("version", 1);
    payload.put("input", input);
    payload.put("lines", plan.data().getSanPham());
    payload.put("physical_demand", new TreeMap<>(plan.quantities()));
    payload.put("policies", policies);
    payload.put("attributes", catalog.attributes(variantIds));
    payload.put("promotion", promotion);
    payload.put("subtotal", plan.data().getTongTienHang());
    payload.put("discount", plan.data().getTienChietKhau());
    payload.put("vat", plan.data().getTongTienVat());
    payload.put("shipping", plan.data().getPhiGiaoHang());
    payload.put("total", plan.data().getTongThanhToan());

    try {
      String canonical =
          objectMapper.writeValueAsString(canonical(objectMapper.valueToTree(payload)));

      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256")
                  .digest(canonical.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("Không tạo được dấu vân tay giá", exception);
    }
  }

  private Object canonical(JsonNode node) {
    if (node == null || node.isNull()) return null;

    if (node.isObject()) {
      Map<String, Object> result = new TreeMap<>();
      node.properties().forEach(entry -> result.put(entry.getKey(), canonical(entry.getValue())));
      return result;
    }

    if (node.isArray()) {
      List<Object> result = new ArrayList<>();
      node.forEach(item -> result.add(canonical(item)));
      return result;
    }

    if (node.isNumber()) {
      return node.decimalValue().stripTrailingZeros().toPlainString();
    }

    if (node.isBoolean()) return node.booleanValue();

    return node.asText();
  }

  private Map<String, Object> promotion(SalesCalculationService.Plan plan) {

    var promotion = plan.promotion();
    if (promotion == null) return null;

    Map<String, Object> result = new LinkedHashMap<>();

    result.put("khuyen_mai_id", promotion.getId());
    result.put("ma_chuong_trinh", promotion.getMaChuongTrinh());
    result.put("ten_chuong_trinh", promotion.getTenChuongTrinh());
    result.put("phien_ban_cau_hinh", promotion.getPhienBanCauHinh());
    result.put("phuong_thuc_khuyen_mai", promotion.getPhuongThucKhuyenMai());
    result.put("doi_tuong_khuyen_mai", promotion.getDoiTuongKhuyenMai());
    result.put("loai_chiet_khau", promotion.getLoaiChietKhau());
    result.put("gia_tri_khuyen_mai", promotion.getGiaTriKhuyenMai());
    result.put("gia_tri_hang_toi_thieu", promotion.getGiaTriHangToiThieu());
    result.put("so_luong_mua_toi_thieu", promotion.getSoLuongMuaToiThieu());
    result.put("muc_giam_toi_da", promotion.getMucGiamToiDa());
    result.put("so_luong_ap_dung", promotion.getSoLuongApDung());
    result.put("ngay_bat_dau", promotion.getNgayBatDau());
    result.put("ngay_ket_thuc", promotion.getNgayKetThuc());
    result.put("trang_thai", promotion.getTrangThai());
    result.put(
        "danh_muc_id", promotion.getDanhMuc() == null ? null : promotion.getDanhMuc().getId());
    result.put(
        "thuong_hieu_id",
        promotion.getThuongHieu() == null ? null : promotion.getThuongHieu().getId());
    result.put("so_tien_giam", plan.data().getTienChietKhau());

    result.put(
        "chi_tiet_dieu_kien",
        promotionDetails.findByKhuyenMai_IdOrderByIdAsc(promotion.getId()).stream()
            .map(
                detail -> {
                  Map<String, Object> item = new LinkedHashMap<>();
                  item.put("phien_ban_id", detail.getPhienBan().getId());
                  item.put("loai_ap_dung", detail.getLoaiApDung());
                  item.put("so_luong", detail.getSoLuong());
                  return item;
                })
            .toList());

    result.put(
        "qua_tang", plan.data().getSanPham().stream().filter(line -> line.laQuaTang()).toList());

    return result;
  }
}
