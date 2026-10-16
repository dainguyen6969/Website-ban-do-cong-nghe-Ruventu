package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.InventoryCountData;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.PhieuKiemKho;
import com.example.dantruventu.Entity.ThanhPhanCombo;
import com.example.dantruventu.Entity.TonKho;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.SalesContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryCountSupport {

  private final PhienBanSanPhamRepository variantRepository;
  private final TonKhoRepository stockRepository;
  private final WarehouseSupport warehouseSupport;
  private final SalesContext context;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;

  private record Part(PhienBanSanPham variant, int quantity) {}

  public Set<Long> physicalIds(Long sourceId) {
    return new TreeSet<>(parts(sourceId).keySet());
  }

  public InventoryCountData.Requirements requirements(Long sourceId) {
    var source = requireVariant(sourceId);
    var parts = parts(sourceId);
    var items = new ArrayList<InventoryCountData.Requirement>();

    for (var part : parts.values()) {
      var variant = part.variant();
      boolean managed = CatalogSupport.serialManaged(variant);
      var stock = stock(variant, false);

      items.add(
          new InventoryCountData.Requirement(
              variant.getId(),
              variant.getSanPham().getMaSanPham(),
              variant.getSanPham().getTenSanPham(),
              variant.getTenPhienBan(),
              part.quantity(),
              WarehouseSupport.numbers(stock).actual(),
              managed,
              managed ? snapshot(variant.getId(), false) : List.of()));
    }

    return new InventoryCountData.Requirements(
        sourceId, source.getSanPham().getLoaiSanPham(), List.copyOf(items));
  }

  private Map<Long, Part> parts(Long sourceId) {
    var source = requireVariant(sourceId);
    var result = new TreeMap<Long, Part>();

    if (source.getSanPham().getLoaiSanPham() == LoaiSanPham.DON) {
      result.put(source.getId(), new Part(source, 1));
      return result;
    }

    var components =
        entityManager
            .createQuery(
                """
        select c
        from ThanhPhanCombo c
        join fetch c.phienBanThanhPhan v
        join fetch v.sanPham
        where c.sanPhamCombo.id = :id
        order by v.id
        """,
                ThanhPhanCombo.class)
            .setParameter("id", source.getSanPham().getId())
            .getResultList();

    if (components.isEmpty()) {
      throw conflict("Bộ PC chưa có cấu hình linh kiện");
    }

    for (var component : components) {
      var variant = component.getPhienBanThanhPhan();
      Integer quantity = component.getSoLuong();

      if (variant.getSanPham().getLoaiSanPham() != LoaiSanPham.DON
          || quantity == null
          || quantity <= 0) {
        throw conflict("Cấu hình linh kiện của bộ PC không hợp lệ");
      }

      var previous = result.get(variant.getId());

      try {
        int total = previous == null ? quantity : Math.addExact(previous.quantity(), quantity);

        result.put(variant.getId(), new Part(variant, total));
      } catch (ArithmeticException exception) {
        throw conflict("Số lượng cấu hình bộ PC vượt giới hạn");
      }
    }

    return result;
  }

  private PhienBanSanPham requireVariant(Long id) {
    var variant =
        variantRepository
            .findById(id)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản"));

    if (variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || variant.getSanPham().getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Sản phẩm hoặc phiên bản đã ngừng hoạt động");
    }

    return variant;
  }

  public TonKho stock(PhienBanSanPham variant, boolean lock) {
    var warehouse = context.warehouse(context.defaultWarehouseId());

    var rows =
        lock
            ? stockRepository.findForSerialUpdate(warehouse.getId(), variant.getId())
            : stockRepository.findByKhoHang_IdAndPhienBan_IdOrderByIdAsc(
                warehouse.getId(), variant.getId());

    if (rows.size() > 1) {
      throw conflict("Phiên bản có dữ liệu tồn kho bị trùng");
    }

    if (!rows.isEmpty()) {
      var stock = rows.get(0);

      if (lock) {
        entityManager.refresh(stock, LockModeType.PESSIMISTIC_WRITE);
      }

      WarehouseSupport.numbers(stock);
      return stock;
    }

    var stock =
        TonKho.builder()
            .khoHang(warehouse)
            .phienBan(variant)
            .tonThucTe(0)
            .tonCoTheBan(0)
            .hangLoi(0)
            .soLuongGiuChoBaoHanh(0)
            .build();

    return lock ? stockRepository.saveAndFlush(stock) : stock;
  }

  private List<InventoryCountData.SerialRow> snapshot(Long variantId, boolean lock) {

    return warehouseSupport.shopSerials(List.of(variantId), lock).stream()
        .map(
            serial ->
                new InventoryCountData.SerialRow(
                    serial.getId(), serial.getSoSerial(), serial.getTrangThai()))
        .toList();
  }

  public InventoryCountData.Audit draft(
      PhienBanSanPham variant, int actual, List<String> codes, String previousJson) {

    boolean managed = CatalogSupport.serialManaged(variant);

    if (!managed) {
      if (codes != null && !codes.isEmpty()) {
        throw invalid("Hàng không quản lý serial không được gửi mã kiểm");
      }

      return null;
    }

    var previous = read(previousJson);

    var expected = previous == null ? snapshot(variant.getId(), true) : previous.system();

    if (codes == null) {
      if (previous == null) {
        throw invalid("Phải gửi serials_da_kiem cho hàng quản lý serial");
      }

      codes = previous.scanned();
    }

    if (codes.size() > 10000) {
      throw invalid("Một phiếu chỉ hỗ trợ tối đa 10000 serial");
    }

    var observed = new ArrayList<String>();
    var unique = new HashSet<String>();

    for (String code : codes) {
      if (code == null || code.isBlank() || code.trim().length() > 100) {
        throw invalid("Serial phải có giá trị và tối đa 100 ký tự");
      }

      String normalized = canonical(code);

      if (!unique.add(normalized)) {
        throw invalid("Serial đã kiểm bị trùng: " + normalized);
      }

      observed.add(normalized);
    }

    if (observed.size() != actual) {
      throw invalid("Tồn thực tế phải bằng số serial đã kiểm");
    }

    Set<String> expectedCodes = new HashSet<>();
    expected.forEach(
        serial -> {
          if (!expectedCodes.add(canonical(serial.code()))) {
            throw conflict("Danh sách serial hệ thống bị trùng");
          }
        });

    var missing =
        expected.stream()
            .map(InventoryCountData.SerialRow::code)
            .filter(code -> !unique.contains(canonical(code)))
            .toList();

    var unknown = observed.stream().filter(code -> !expectedCodes.contains(code)).toList();

    return new InventoryCountData.Audit(
        List.copyOf(expected), List.copyOf(observed), missing, unknown);
  }

  public void assertReady(PhieuKiemKho check, PhienBanSanPham variant, TonKho stock) {

    var audit = read(check.getDuLieuKiemSerial());

    if (audit == null) {
      throw conflict("Phiếu chưa có dữ liệu kiểm từng serial");
    }

    var current = snapshot(variant.getId(), true);
    var numbers = WarehouseSupport.numbers(stock);

    if (!audit.missing().isEmpty() || !audit.unknown().isEmpty()) {
      throw conflict("Còn serial thiếu hoặc ngoài danh sách; chưa thể cân bằng");
    }

    if (!current.equals(audit.system())) {
      throw conflict("Danh sách hoặc trạng thái serial đã thay đổi; cần kiểm lại");
    }

    if (audit.scanned().size() != check.getTonThucTe()
        || audit.scanned().size() != numbers.actual()
        || current.size() != numbers.actual()) {
      throw conflict("Số lượng serial và tồn vật lý chưa nhất quán");
    }

    long damaged = current.stream().filter(item -> item.status() == TrangThaiSerial.LOI).count();

    long warrantyHeld =
        current.stream().filter(item -> item.status() == TrangThaiSerial.GIU_CHO_BAO_HANH).count();

    if (damaged != numbers.damaged() || warrantyHeld != numbers.warrantyHeld()) {
      throw conflict("Phân loại serial chưa khớp hàng lỗi hoặc hàng giữ bảo hành");
    }
  }

  public InventoryCountData.Audit read(String json) {
    if (json == null || json.isBlank()) return null;

    try {
      var audit = objectMapper.readValue(json, InventoryCountData.Audit.class);

      if (audit.system() == null
          || audit.scanned() == null
          || audit.missing() == null
          || audit.unknown() == null) {
        throw conflict("Dữ liệu kiểm serial không đầy đủ");
      }

      return audit;
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      throw conflict("Không đọc được dữ liệu kiểm serial");
    }
  }

  public String write(InventoryCountData.Audit audit) {
    return audit == null ? null : objectMapper.writeValueAsString(audit);
  }

  private String canonical(String code) {
    return code.trim().toUpperCase(Locale.ROOT);
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }
}
