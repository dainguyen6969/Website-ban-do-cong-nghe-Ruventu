package com.example.dantruventu.Services.catalog;

import com.example.dantruventu.DTO.Request.product.ProductImageRequest;
import com.example.dantruventu.DTO.Request.warehouse.ComboComponentRequest;
import com.example.dantruventu.DTO.Response.warehouse.ComboComponentResponse;
import com.example.dantruventu.DTO.catalog.CatalogFields;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.CatalogException;
import jakarta.persistence.EntityManager;
import java.net.URI;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogSupport {

  private final EntityManager entityManager;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long warehouseId;

  public record Stock(long actual, long available, long damaged, long warrantyHeld) {
    public static final Stock ZERO = new Stock(0, 0, 0, 0);
  }

  public int warranty(CatalogFields.WarrantyInput request, LoaiSanPham type) {
    if (type == LoaiSanPham.BO_PC) {
      rejectComboWarranty(request);
      // Giá trị kỹ thuật, không phải chính sách bảo hành chung của bộ.
      return 0;
    }

    var value = request.getWarrantyValue();

    if (!request.isWarrantyProvided() || value == null || value.isNull()) {
      throw CatalogException.bad(
          "thoi_han_bao_hanh_thang",
          "WARRANTY_MONTHS_REQUIRED",
          "Vui lòng nhập thời hạn bảo hành; nhập 0 nếu không bảo hành");
    }

    if (!value.isIntegralNumber() || !value.canConvertToInt() || value.intValue() < 0) {
      throw CatalogException.bad(
          "thoi_han_bao_hanh_thang",
          "INVALID_WARRANTY_MONTHS",
          "Thời hạn bảo hành phải là số nguyên không âm");
    }

    return value.intValue();
  }

  public void rejectComboWarranty(CatalogFields.WarrantyInput request) {
    if (request.isWarrantyProvided()) {
      throw CatalogException.bad(
          "thoi_han_bao_hanh_thang",
          "COMBO_WARRANTY_DERIVED",
          "Bộ PC bảo hành theo từng linh kiện; không gửi thời hạn chung cho bộ");
    }
  }

  public void checkComponentWarranties(List<ComboComponentRequest> components) {
    if (components == null) return;

    for (int index = 0; index < components.size(); index++) {
      var item = components.get(index);
      if (item != null && item.isWarrantyProvided()) {
        throw CatalogException.bad(
            "thanh_phan[" + index + "].thoi_han_bao_hanh_thang",
            "COMPONENT_WARRANTY_READ_ONLY",
            "Thời hạn linh kiện được đọc từ sản phẩm linh kiện; không sửa tại API bộ PC");
      }
    }
  }

  public boolean active(PhienBanSanPham variant) {
    return variant.getTrangThai() == TrangThaiCoBanEnum.HOAT_DONG
        && variant.getSanPham().getTrangThai() == TrangThaiCoBanEnum.HOAT_DONG;
  }

  public Set<Long> ids(List<PhienBanSanPham> variants, List<ThanhPhanCombo> components) {
    Set<Long> result = new HashSet<>();
    variants.forEach(v -> result.add(v.getId()));
    components.forEach(c -> result.add(c.getPhienBanThanhPhan().getId()));
    return result;
  }

  public List<ThanhPhanCombo> components(Collection<Long> productIds) {
    if (productIds.isEmpty()) return List.of();

    return entityManager
        .createQuery(
            """
                        select c from ThanhPhanCombo c
                        join fetch c.phienBanThanhPhan v
                        join fetch v.sanPham
                        where c.sanPhamCombo.id in :ids
                        order by c.sanPhamCombo.id, v.id, c.id
                        """,
            ThanhPhanCombo.class)
        .setParameter("ids", productIds)
        .getResultList();
  }

  public Map<Long, Stock> stocks(Collection<Long> variantIds) {
    if (variantIds.isEmpty()) return Map.of();

    var rows =
        entityManager
            .createQuery(
                """
                                select t.phienBan.id,
                                       coalesce(sum(t.tonThucTe), 0),
                                       coalesce(sum(t.tonCoTheBan), 0),
                                       coalesce(sum(t.hangLoi), 0),
                                       coalesce(sum(t.soLuongGiuChoBaoHanh), 0)
                                from TonKho t
                                where t.khoHang.id = :warehouseId
                                  and t.phienBan.id in :ids
                                group by t.phienBan.id
                                """,
                Object[].class)
            .setParameter("warehouseId", warehouseId)
            .setParameter("ids", variantIds)
            .getResultList();

    Map<Long, Stock> result = new HashMap<>();
    for (Object[] row : rows) {
      result.put(
          ((Number) row[0]).longValue(),
          new Stock(
              ((Number) row[1]).longValue(),
              ((Number) row[2]).longValue(),
              ((Number) row[3]).longValue(),
              ((Number) row[4]).longValue()));
    }
    return result;
  }

  public Map<Long, String> primaryImages(Collection<Long> productIds) {
    if (productIds.isEmpty()) return Map.of();

    var rows =
        entityManager
            .createQuery(
                """
                                select a from AnhSanPham a
                                where a.sanPham.id in :ids
                                order by a.sanPham.id, a.thuTuHienThi, a.id
                                """,
                AnhSanPham.class)
            .setParameter("ids", productIds)
            .getResultList();

    Map<Long, String> result = new HashMap<>();
    Set<Long> selectedMain = new HashSet<>();

    for (var image : rows) {
      Long productId = image.getSanPham().getId();
      result.putIfAbsent(productId, image.getDuongDanAnh());

      if (Boolean.TRUE.equals(image.getLaAnhChinh()) && selectedMain.add(productId)) {
        result.put(productId, image.getDuongDanAnh());
      }
    }
    return result;
  }

  public void metadata(
      CatalogFields.Metadata response,
      SanPham product,
      List<PhienBanSanPham> variants,
      List<ThanhPhanCombo> components,
      Map<Long, Stock> stocks) {

    boolean combo = product.getLoaiSanPham() == LoaiSanPham.BO_PC;

    response.setThoiHanBaoHanhThang(combo ? null : product.getThoiHanBaoHanhThang());
    response.setBaoHanhTheoLinhKien(combo);
    response.setCoQuanLySerial(combo ? false : null);
    response.setSoBoCoTheLap(null);

    if (!combo) {
      boolean sellable =
          variants.stream()
              .anyMatch(
                  v -> active(v) && stocks.getOrDefault(v.getId(), Stock.ZERO).available() > 0);

      response.setDaCoCauHinhCombo(null);
      response.setSoThanhPhan(null);
      response.setConHang(sellable);
      response.setCoTheBan(sellable);
      response.setLyDoChuaTheBan(sellable ? null : "Sản phẩm ngừng kinh doanh hoặc hết hàng");
      return;
    }

    Map<Long, Integer> quantities = new TreeMap<>();
    boolean valid = true;

    for (var component : components) {
      var variant = component.getPhienBanThanhPhan();
      Integer quantity = component.getSoLuong();

      if (quantity == null
          || quantity <= 0
          || variant.getSanPham().getLoaiSanPham() != LoaiSanPham.DON) {
        valid = false;
        continue;
      }

      try {
        quantities.merge(variant.getId(), quantity, Math::addExact);
      } catch (ArithmeticException exception) {
        valid = false;
      }
    }

    boolean configured = !quantities.isEmpty() && valid;
    response.setDaCoCauHinhCombo(configured);
    response.setSoThanhPhan(quantities.size());

    if (!configured) {
      response.setConHang(false);
      response.setCoTheBan(false);
      response.setLyDoChuaTheBan("Chưa có cấu hình linh kiện hợp lệ");
      return;
    }

    long capacity =
        quantities.entrySet().stream()
            .mapToLong(
                entry ->
                    Math.max(0, stocks.getOrDefault(entry.getKey(), Stock.ZERO).available())
                        / entry.getValue())
            .min()
            .orElse(0);

    response.setSoBoCoTheLap(capacity);

    boolean representativeValid =
        variants.size() == 1
            && active(variants.get(0))
            && Boolean.FALSE.equals(variants.get(0).getCoQuanLySerial());

    boolean componentsActive = components.stream().allMatch(c -> active(c.getPhienBanThanhPhan()));

    boolean sellable = representativeValid && componentsActive && capacity > 0;

    response.setConHang(sellable);
    response.setCoTheBan(sellable);
    response.setLyDoChuaTheBan(
        sellable
            ? null
            : !representativeValid
                ? "Phiên bản bán của bộ PC chưa hợp lệ hoặc ngừng kinh doanh"
                : !componentsActive
                    ? "Có linh kiện ngừng kinh doanh"
                    : "Không đủ linh kiện để lắp bộ PC");
  }

  public List<ComboComponentResponse> componentResponses(
      List<ThanhPhanCombo> components, Map<Long, Stock> stocks) {

    var imageMap =
        primaryImages(
            components.stream()
                .map(c -> c.getPhienBanThanhPhan().getSanPham().getId())
                .distinct()
                .toList());

    Map<Long, ComboComponentResponse> result = new TreeMap<>();

    for (var component : components) {
      var variant = component.getPhienBanThanhPhan();
      var product = variant.getSanPham();
      var existing = result.get(variant.getId());

      if (component.getSoLuong() == null || component.getSoLuong() <= 0) {
        throw CatalogException.conflict(
            "thanh_phan", "INVALID_COMBO_CONFIGURATION", "Cấu hình linh kiện không hợp lệ");
      }

      if (existing != null) {
        try {
          existing.setSoLuong(Math.addExact(existing.getSoLuong(), component.getSoLuong()));
        } catch (ArithmeticException exception) {
          throw CatalogException.conflict(
              "thanh_phan", "INVALID_COMBO_CONFIGURATION", "Số lượng linh kiện vượt giới hạn");
        }
        continue;
      }

      result.put(
          variant.getId(),
          ComboComponentResponse.builder()
              .phienBanId(variant.getId())
              .maSanPham(product.getMaSanPham())
              .tenSanPham(product.getTenSanPham())
              .tenPhienBan(variant.getTenPhienBan())
              .maVach(variant.getMaVach())
              .soLuong(component.getSoLuong())
              .giaBanLe(variant.getGiaBanLe())
              .giaNhap(variant.getGiaNhap())
              .tonCoTheBan(stocks.getOrDefault(variant.getId(), Stock.ZERO).available())
              .thoiHanBaoHanhThang(product.getThoiHanBaoHanhThang())
              .coQuanLySerial(variant.getCoQuanLySerial())
              .anhChinh(imageMap.get(product.getId()))
              .build());
    }
    return new ArrayList<>(result.values());
  }

  public Map<Long, List<CatalogFields.ComboPart>> comboParts(Collection<Long> comboIds) {

    if (comboIds == null || comboIds.isEmpty()) {
      return Map.of();
    }

    var rows = components(comboIds);

    Map<Long, PhienBanSanPham> variants = new HashMap<>();
    Map<Long, Map<Long, Integer>> quantities = new TreeMap<>();

    for (var row : rows) {
      var variant = row.getPhienBanThanhPhan();
      var product = variant.getSanPham();
      Integer quantity = row.getSoLuong();

      if (quantity == null || quantity <= 0 || product.getLoaiSanPham() != LoaiSanPham.DON) {

        throw CatalogException.conflict(
            "thanh_phan", "INVALID_COMBO_CONFIGURATION", "Cấu hình linh kiện combo không hợp lệ");
      }

      variants.put(variant.getId(), variant);

      try {
        quantities
            .computeIfAbsent(row.getSanPhamCombo().getId(), ignored -> new TreeMap<>())
            .merge(variant.getId(), quantity, Math::addExact);

      } catch (ArithmeticException exception) {
        throw CatalogException.conflict(
            "thanh_phan", "INVALID_COMBO_CONFIGURATION", "Số lượng linh kiện vượt giới hạn");
      }
    }

    var images =
        primaryImages(
            variants.values().stream().map(v -> v.getSanPham().getId()).distinct().toList());

    Map<Long, List<CatalogFields.ComboPart>> result = new TreeMap<>();

    for (var combo : quantities.entrySet()) {
      List<CatalogFields.ComboPart> items = new ArrayList<>();

      for (var entry : combo.getValue().entrySet()) {
        var variant = variants.get(entry.getKey());
        var product = variant.getSanPham();
        Integer quantity = entry.getValue();

        items.add(
            new CatalogFields.ComboPart(
                product.getId(),
                variant.getId(),
                product.getMaSanPham(),
                product.getTenSanPham(),
                variant.getTenPhienBan(),
                variant.getMaVach(),
                images.get(product.getId()),
                quantity,
                quantity.longValue(),
                variant.getCoQuanLySerial(),
                product.getThoiHanBaoHanhThang()));
      }

      result.put(combo.getKey(), List.copyOf(items));
    }

    return result;
  }

  public List<CatalogFields.ComboPart> partsForQuantity(
      List<CatalogFields.ComboPart> parts, Integer quantity) {

    if (parts == null || parts.isEmpty()) {
      return List.of();
    }

    if (quantity == null || quantity <= 0) {
      throw CatalogException.conflict(
          "so_luong", "INVALID_ORDER_QUANTITY", "Số lượng bộ PC trong đơn không hợp lệ");
    }

    return parts.stream()
        .map(
            part ->
                new CatalogFields.ComboPart(
                    part.sanPhamId(),
                    part.phienBanId(),
                    part.maSanPham(),
                    part.tenSanPham(),
                    part.tenPhienBan(),
                    part.maVach(),
                    part.anhChinh(),
                    part.soLuongTrongBo(),
                    Math.multiplyExact(part.soLuongTrongBo().longValue(), quantity.longValue()),
                    part.coQuanLySerial(),
                    part.thoiHanBaoHanhThang()))
        .toList();
  }

  public Set<Long> lockedSerialModes(Collection<Long> ids) {
    if (ids.isEmpty()) return Set.of();

    Set<Long> result = new HashSet<>();

    for (String entity :
        List.of(
            "TonKho",
            "SoSerialSanPham",
            "ChiTietDonNhap",
            "TheKho",
            "PhieuKiemKho",
            "ChiTietDonHang")) {

      result.addAll(
          entityManager
              .createQuery(
                  "select distinct x.phienBan.id from " + entity + " x where x.phienBan.id in :ids",
                  Long.class)
              .setParameter("ids", ids)
              .getResultList());
    }

    return result;
  }

  public Map<Long, List<CatalogFields.AttributeData>> attributes(Collection<Long> ids) {
    if (ids.isEmpty()) return Map.of();

    var rows =
        entityManager
            .createQuery(
                """
                                select a from ThuocTinhPhienBan a
                                where a.phienBan.id in :ids
                                order by a.phienBan.id, a.id
                                """,
                ThuocTinhPhienBan.class)
            .setParameter("ids", ids)
            .getResultList();

    return rows.stream()
        .collect(
            Collectors.groupingBy(
                row -> row.getPhienBan().getId(),
                LinkedHashMap::new,
                Collectors.mapping(
                    row ->
                        new CatalogFields.AttributeData(
                            row.getId(), row.getTenThuocTinh(), row.getGiaTri()),
                    Collectors.toList())));
  }

  private String normalizedName(String value) {
    return Normalizer.normalize(value, Normalizer.Form.NFKC).strip().replaceAll("(?U)\\s+", " ");
  }

  private String attributeText(JsonNode node, int max, String field) {
    if (node == null || !node.isTextual()) {
      throw CatalogException.bad(field, "INVALID_ATTRIBUTE", "Thuộc tính phải là chuỗi ký tự");
    }

    String value = node.asText().strip();
    if (value.isEmpty() || value.length() > max) {
      throw CatalogException.bad(
          field, "INVALID_ATTRIBUTE", "Độ dài hợp lệ từ 1 đến " + max + " ký tự");
    }
    return value;
  }

  @Transactional
  public List<CatalogFields.AttributeData> replaceAttributes(
      PhienBanSanPham variant, List<CatalogFields.AttributeInput> inputs) {

    if (inputs == null || inputs.size() > 100) {
      throw CatalogException.bad(
          "thuoc_tinh_phien_ban",
          "INVALID_ATTRIBUTES",
          "Phải gửi mảng thuoc_tinh_phien_ban, tối đa 100 phần tử");
    }

    Map<String, String[]> requested = new LinkedHashMap<>();

    for (int index = 0; index < inputs.size(); index++) {
      var input = inputs.get(index);
      String prefix = "thuoc_tinh_phien_ban[" + index + "]";

      if (input == null) {
        throw CatalogException.bad(prefix, "INVALID_ATTRIBUTE", "Thuộc tính không được null");
      }

      String name =
          normalizedName(attributeText(input.tenThuocTinh(), 100, prefix + ".ten_thuoc_tinh"));
      String value = attributeText(input.giaTri(), 255, prefix + ".gia_tri");

      if (name.isEmpty() || name.length() > 100) {
        throw CatalogException.bad(
            prefix + ".ten_thuoc_tinh", "INVALID_ATTRIBUTE", "Tên thuộc tính dài 1–100 ký tự");
      }

      if (requested.putIfAbsent(name.toLowerCase(Locale.ROOT), new String[] {name, value})
          != null) {
        throw CatalogException.bad(
            prefix + ".ten_thuoc_tinh",
            "ATTRIBUTE_NAME_DUPLICATE",
            "Tên thuộc tính bị trùng sau khi chuẩn hóa");
      }
    }

    var existing =
        entityManager
            .createQuery(
                "select a from ThuocTinhPhienBan a where a.phienBan.id = :id order by a.id",
                ThuocTinhPhienBan.class)
            .setParameter("id", variant.getId())
            .getResultList();

    Map<String, ThuocTinhPhienBan> byName = new HashMap<>();

    for (var row : existing) {
      String key = normalizedName(row.getTenThuocTinh()).toLowerCase(Locale.ROOT);
      if (byName.putIfAbsent(key, row) != null) {
        throw CatalogException.conflict(
            "thuoc_tinh_phien_ban",
            "ATTRIBUTE_DATA_CONFLICT",
            "Dữ liệu cũ có tên thuộc tính trùng; cần đối soát trước khi cập nhật");
      }
      if (!requested.containsKey(key)) entityManager.remove(row);
    }

    // Xóa trước khi thêm, toàn bộ vẫn thuộc cùng transaction.
    entityManager.flush();

    for (var entry : requested.entrySet()) {
      var row = byName.get(entry.getKey());

      if (row == null) {
        row = new ThuocTinhPhienBan();
        row.setPhienBan(variant);
      }

      row.setTenThuocTinh(entry.getValue()[0]);
      row.setGiaTri(entry.getValue()[1]);

      if (row.getId() == null) entityManager.persist(row);
    }

    entityManager.flush();
    return attributes(List.of(variant.getId())).getOrDefault(variant.getId(), List.of());
  }

  public void validateImages(List<ProductImageRequest> images) {
    if (images == null) return;

    int mainCount = 0;
    for (var image : images) {
      if (image == null || image.getDuongDanAnh() == null) {
        throw CatalogException.bad("anh_san_pham", "INVALID_IMAGE", "Đường dẫn ảnh không hợp lệ");
      }

      String value = image.getDuongDanAnh().trim();

      try {
        URI uri = URI.create(value);

        boolean local = value.startsWith("/") && !value.startsWith("//") && !value.contains("..");

        boolean remote =
            ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                && uri.getHost() != null
                && uri.getUserInfo() == null;

        if (value.length() > 255 || (!local && !remote)) {
          throw new IllegalArgumentException();
        }
      } catch (IllegalArgumentException exception) {
        throw CatalogException.bad(
            "anh_san_pham",
            "INVALID_IMAGE",
            "Ảnh phải là đường dẫn nội bộ hoặc URL HTTP/HTTPS hợp lệ");
      }

      if (Boolean.TRUE.equals(image.getLaAnhChinh())) mainCount++;
    }

    if (mainCount > 1) {
      throw CatalogException.bad("anh_san_pham", "INVALID_IMAGE", "Chỉ được chọn một ảnh chính");
    }
  }

  public static boolean serialManaged(PhienBanSanPham variant) {
    if (variant == null) {
      throw CatalogException.conflict(
          "phien_ban_id",
          "SERIAL_MODE_VARIANT_MISSING",
          "Không tìm thấy phiên bản để đọc cấu hình serial");
    }

    Boolean configured = variant.getCoQuanLySerial();

    if (configured == null) {
      throw CatalogException.conflict(
          "co_quan_ly_serial",
          "SERIAL_MODE_NOT_CONFIGURED",
          "Phiên bản " + variant.getId() + " chưa có cấu hình quản lý serial");
    }

    return configured;
  }
}
