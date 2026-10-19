package com.example.dantruventu.Services.order;

import com.example.dantruventu.DTO.Request.order.AdminDeliveryReturnRequest;
import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse;
import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse.ReturnRequirement;
import com.example.dantruventu.DTO.Response.order.SoldDeviceData;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.warehouse.*;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.OrderSaleSnapshotService;
import com.example.dantruventu.Services.order.sales.SoldDeviceService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class DeliveryInventoryService {

  private final ChiTietDonHangRepository orderLineRepository;
  private final ThanhPhanComboRepository componentRepository;
  private final KhoHangRepository warehouseRepository;
  private final TonKhoRepository stockRepository;
  private final TheKhoRepository ledgerRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final OrderSaleSnapshotService saleSnapshots;
  private final SoldDeviceService soldDevices;
  private final EntityManager entityManager;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long defaultWarehouseId;

  private record Key(Long lineId, Long variantId) {}

  private record Expected(
      ChiTietDonHang line, PhienBanSanPham variant, int quantity, boolean serialManaged) {}

  public boolean usesSerial(PhienBanSanPham variant) {
    if (variant == null) {
      throw conflict("Không tìm thấy phiên bản");
    }

    LoaiSanPham productType = variant.getSanPham().getLoaiSanPham();

    if (productType == LoaiSanPham.DON) {
      return CatalogSupport.serialManaged(variant);
    }

    if (productType != LoaiSanPham.BO_PC) {
      throw conflict("Loại sản phẩm không được hỗ trợ");
    }

    var components = componentRepository.findByComboIds(List.of(variant.getSanPham().getId()));

    if (components.isEmpty()) {
      throw conflict("Combo chưa có thành phần");
    }

    boolean managed = false;

    for (var component : components) {
      boolean componentManaged = CatalogSupport.serialManaged(component.getPhienBanThanhPhan());

      managed = managed || componentManaged;
    }

    return managed;
  }

  public void releaseReservation(DonHang order) {
    requireWarehouse();

    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DANG_DONG_GOI
        && order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI) {
      throw conflict("Đơn không ở trạng thái có giữ hàng để hủy đóng gói");
    }

    if (ledgerRepository.existsByMaChungTuGocAndLoaiGiaoDich(
        order.getId(), LoaiGiaoDichKho.XUAT_BAN)) {
      throw conflict("Đơn đã có chứng từ xuất bán, không được giải phóng giữ hàng");
    }

    Map<Long, Integer> quantities = totals(expected(order.getId()));

    for (var entry : quantities.entrySet()) {
      Long variantId = entry.getKey();
      int quantity = entry.getValue();

      TonKho stock = lockStock(variantId);
      validateStock(stock);

      long held =
          (long) stock.getTonThucTe()
              - stock.getHangLoi()
              - stock.getSoLuongGiuChoBaoHanh()
              - stock.getTonCoTheBan();
      Long expectedHeld = orderLineRepository.sumReservedQuantity(variantId);

      if (expectedHeld == null || held != expectedHeld || held < quantity) {
        throw conflict(
            "Số lượng giữ hàng không khớp tại phiên bản "
                + variantId
                + ". Cần đối chiếu luồng giữ hàng trước khi hủy");
      }

      stock.setTonCoTheBan(bounded((long) stock.getTonCoTheBan() + quantity));
    }

    // Không đổi tồn thực tế, không sinh thẻ kho.
  }

  public List<ReturnRequirement> getReturnRequirements(DonHang order) {
    requireWarehouse();

    Map<Key, Expected> requirements = expected(order.getId());
    verifyExport(order.getId(), totals(requirements));

    List<SoldDeviceData> originals = soldDevices.details(order.getId());

    var actualDevices =
        entityManager
            .createQuery(
                """
                                select d
                                from ThietBiBaoHanh d
                                left join fetch d.soSerial
                                where d.chiTietDonHang.donHang.id = :orderId
                                order by d.id
                                """,
                ThietBiBaoHanh.class)
            .setParameter("orderId", order.getId())
            .getResultList();

    Map<Long, ThietBiBaoHanh> actualById = new HashMap<>();

    for (var device : actualDevices) {
      actualById.put(device.getId(), device);
    }

    Map<Key, List<SoldDeviceData>> byGroup = new HashMap<>();
    Set<Long> deviceIds = new HashSet<>();
    Set<Long> serialIds = new HashSet<>();

    for (var original : originals) {
      Key key = new Key(original.chiTietDonHangId(), original.phienBanId());

      Expected requirement = requirements.get(key);

      if (requirement == null
          || original.thietBiId() == null
          || !deviceIds.add(original.thietBiId())) {
        throw returnMismatch("Nhận dạng thiết bị xuất gốc bị thiếu, trùng hoặc sai dòng");
      }

      ThietBiBaoHanh actual = actualById.get(original.thietBiId());

      Long actualSerialId =
          actual == null || actual.getSoSerial() == null ? null : actual.getSoSerial().getId();

      if (actual == null
          || !Objects.equals(actual.getChiTietDonHang().getId(), original.chiTietDonHangId())
          || !Objects.equals(actual.getPhienBan().getId(), original.phienBanId())
          || !Objects.equals(actualSerialId, original.soSerialId())
          || actual.getChiTietTraHang() != null
          || actual.getNgayKichHoat() != null
          || actual.getHanBaoHanh() != null) {
        throw returnMismatch("Thiết bị không còn khớp nhận dạng xuất gốc chưa bàn giao");
      }

      if (requirement.serialManaged()) {
        if (original.soSerialId() == null || !serialIds.add(original.soSerialId())) {
          throw returnMismatch("Thiếu hoặc trùng serial xuất gốc");
        }

        SoSerialSanPham serial = actual.getSoSerial();

        if (serial.getTrangThai() != TrangThaiSerial.DA_BAN
            || serial.getDonHang() == null
            || !Objects.equals(serial.getDonHang().getId(), order.getId())) {
          throw returnMismatch("Serial xuất gốc không còn thuộc lượt giao này");
        }
      } else if (original.soSerialId() != null) {
        throw returnMismatch("Hàng không quản lý serial có nhận dạng serial không hợp lệ");
      }

      byGroup.computeIfAbsent(key, ignored -> new ArrayList<>()).add(original);
    }

    if (!deviceIds.equals(actualById.keySet())) {
      throw returnMismatch("Danh sách thiết bị không khớp toàn bộ lần xuất gốc");
    }

    List<ReturnRequirement> result = new ArrayList<>();

    for (var entry : requirements.entrySet()) {
      Expected requirement = entry.getValue();
      List<SoldDeviceData> devices = byGroup.getOrDefault(entry.getKey(), List.of());

      if (devices.size() != requirement.quantity()) {
        throw returnMismatch("Thiếu nhận dạng thiết bị của dòng xuất gốc");
      }

      var physical = saleSnapshots.physical(requirement.line()).get(requirement.variant().getId());

      result.add(
          new ReturnRequirement(
              requirement.line().getId(),
              requirement.variant().getId(),
              saleSnapshots.requireSnapshot(requirement.line()).productName(),
              physical.productName(),
              physical.variantName(),
              requirement.quantity(),
              requirement.serialManaged(),
              Boolean.TRUE.equals(requirement.line().getLaQuaTang()),
              devices.stream()
                  .map(
                      device ->
                          new AdminDeliveryResponse.ReturnDevice(
                              device.thietBiId(),
                              device.maTheoDoi(),
                              device.soSerialId(),
                              device.soSerial()))
                  .toList()));
    }

    return List.copyOf(result);
  }

  public List<AdminDeliveryResponse.ReturnStockChange> receiveAll(
      DonHang order, PhieuTraHang returnDocument, AdminDeliveryReturnRequest request) {

    KhoHang warehouse = requireWarehouse();

    Map<Key, Expected> expected = expected(order.getId());
    Map<Long, Integer> expectedTotals = totals(expected);

    List<ReturnRequirement> originalRequirements = getReturnRequirements(order);

    Map<Key, ReturnRequirement> originalByGroup = new HashMap<>();
    Map<Long, ReturnRequirement> requirementByDevice = new TreeMap<>();

    for (var requirement : originalRequirements) {
      originalByGroup.put(
          new Key(requirement.chiTietDonHangId(), requirement.phienBanId()), requirement);

      for (var device : requirement.thietBi()) {
        requirementByDevice.put(device.thietBiId(), requirement);
      }
    }

    // Khóa thiết bị theo ID; đơn và các dòng đơn đã được khóa ở service nguồn.
    for (var entry : requirementByDevice.entrySet()) {
      ThietBiBaoHanh device =
          entityManager.find(ThietBiBaoHanh.class, entry.getKey(), LockModeType.PESSIMISTIC_WRITE);

      if (device == null) {
        throw returnMismatch("Thiết bị xuất gốc không tồn tại");
      }

      entityManager.refresh(device);

      var requirement = entry.getValue();

      if (!Objects.equals(device.getChiTietDonHang().getId(), requirement.chiTietDonHangId())
          || !Objects.equals(device.getPhienBan().getId(), requirement.phienBanId())
          || device.getChiTietTraHang() != null
          || device.getNgayKichHoat() != null
          || device.getHanBaoHanh() != null) {
        throw returnMismatch("Thiết bị đã thay đổi, đã nhận trả hoặc đã bàn giao");
      }

      var original =
          requirement.thietBi().stream()
              .filter(item -> Objects.equals(item.thietBiId(), device.getId()))
              .findFirst()
              .orElseThrow(() -> returnMismatch("Thiếu nhận dạng thiết bị gốc"));

      Long actualSerialId = device.getSoSerial() == null ? null : device.getSoSerial().getId();

      if (!Objects.equals(actualSerialId, original.soSerialId())) {
        throw returnMismatch("Serial của thiết bị không khớp lần xuất gốc");
      }
    }

    Map<Key, AdminDeliveryReturnRequest.Item> received = new HashMap<>();

    for (var item : request.getHangNhan()) {
      Key key = new Key(item.getChiTietDonHangId(), item.getPhienBanId());

      if (received.putIfAbsent(key, item) != null) {
        throw new AppException(ErrorCode.INVALID_DATA, "Trùng dòng nhận hàng");
      }

      Expected requirement = expected.get(key);

      if (requirement == null) {
        throw returnMismatch("Dòng hoặc phiên bản không thuộc lần xuất gốc");
      }

      long receivedQuantity = (long) item.getSoLuongNguyenVen() + item.getSoLuongLoi();

      if (receivedQuantity != requirement.quantity()) {
        throw returnMismatch("Phải nhận đủ số lượng đã xuất của từng dòng vật lý");
      }

      if (!requirement.serialManaged() && item.getDuDieuKienBanLai() == null) {
        throw new AppException(
            ErrorCode.INVALID_DATA, "Hàng không serial phải có kết luận du_dieu_kien_ban_lai");
      }

      if (requirement.serialManaged() && item.getDuDieuKienBanLai() != null) {
        throw new AppException(
            ErrorCode.INVALID_DATA,
            "Hàng quản lý serial phải kết luận điều kiện bán lại trên từng serial");
      }
    }

    if (!received.keySet().equals(expected.keySet())) {
      throw returnMismatch("Danh sách nhận thiếu hoặc thừa hàng đã xuất");
    }

    Map<Long, TonKho> stocks = new TreeMap<>();

    for (Long variantId : expectedTotals.keySet()) {
      TonKho stock = lockStock(variantId);
      validateStock(stock);
      stocks.put(variantId, stock);
    }

    List<SoSerialSanPham> assigned = serialRepository.findByOrderForUpdate(order.getId());

    Map<Long, SoSerialSanPham> serialById = new HashMap<>();

    for (var serial : assigned) {
      entityManager.refresh(serial);
      serialById.put(serial.getId(), serial);
    }

    Set<Long> seenSerialIds = new HashSet<>();
    Map<Long, Integer> sellableTotals = new TreeMap<>();
    Map<Long, Integer> unavailableTotals = new TreeMap<>();

    for (var entry : expected.entrySet()) {
      Expected requirement = entry.getValue();
      var item = received.get(entry.getKey());
      Long variantId = requirement.variant().getId();

      int sellable;

      if (requirement.serialManaged()) {
        var original = originalByGroup.get(entry.getKey());

        Set<Long> originalSerialIds = new HashSet<>();

        for (var device : original.thietBi()) {
          if (device.soSerialId() != null) {
            originalSerialIds.add(device.soSerialId());
          }
        }

        if (item.getSerials().size() != requirement.quantity()) {
          throw returnMismatch("Phải nhận đủ serial của dòng xuất gốc");
        }

        sellable = 0;

        for (var serialItem : item.getSerials()) {
          Long serialId = serialItem.getSoSerialId();

          if (!originalSerialIds.contains(serialId)) {
            throw returnMismatch("Serial không thuộc lần xuất gốc của dòng đơn này");
          }

          if (!seenSerialIds.add(serialId)) {
            throw new AppException(ErrorCode.INVALID_DATA, "Một serial bị gửi nhiều lần");
          }

          SoSerialSanPham serial = serialById.get(serialId);

          if (serial == null
              || !Objects.equals(serial.getPhienBan().getId(), variantId)
              || serial.getTrangThai() != TrangThaiSerial.DA_BAN
              || serial.getDonHang() == null
              || !Objects.equals(serial.getDonHang().getId(), order.getId())) {
            throw returnMismatch("Serial không còn thuộc lượt giao cần nhận hoàn");
          }

          boolean canResell = Boolean.TRUE.equals(serialItem.getDuDieuKienBanLai());

          if (canResell) {
            sellable++;
          }

          serial.setTrangThai(canResell ? TrangThaiSerial.TRONG_KHO : TrangThaiSerial.LOI);

          serial.setDonHang(null);

          // Giao thất bại: không phát sinh mốc kích hoạt mới.
          serial.setNgayKichHoat(null);
          serial.setHanBaoHanh(null);
        }

        if (sellable > item.getSoLuongNguyenVen()) {
          throw returnMismatch(
              "Số serial đủ điều kiện bán lại không được vượt số lượng nguyên vẹn");
        }

      } else {
        if (!item.getSerials().isEmpty()) {
          throw new AppException(
              ErrorCode.INVALID_DATA, "Hàng không quản lý serial phải gửi serials rỗng");
        }

        sellable = Boolean.TRUE.equals(item.getDuDieuKienBanLai()) ? item.getSoLuongNguyenVen() : 0;
      }

      merge(sellableTotals, variantId, sellable);
      merge(unavailableTotals, variantId, requirement.quantity() - sellable);
    }

    if (!seenSerialIds.equals(serialById.keySet())) {
      throw returnMismatch("Danh sách serial không khớp toàn bộ lượt xuất");
    }

    List<AdminDeliveryResponse.ReturnStockChange> movements = new ArrayList<>();

    for (var entry : expectedTotals.entrySet()) {
      Long variantId = entry.getKey();
      TonKho stock = stocks.get(variantId);
      int quantity = entry.getValue();

      stock.setTonThucTe(bounded((long) stock.getTonThucTe() + quantity));

      stock.setTonCoTheBan(
          bounded((long) stock.getTonCoTheBan() + sellableTotals.getOrDefault(variantId, 0)));

      stock.setHangLoi(
          bounded((long) stock.getHangLoi() + unavailableTotals.getOrDefault(variantId, 0)));

      validateStock(stock);

      TheKho movement =
          ledgerRepository.save(
              TheKho.builder()
                  .khoHang(warehouse)
                  .phienBan(stock.getPhienBan())
                  .loaiGiaoDich(LoaiGiaoDichKho.KHACH_TRA)
                  .maChungTuGoc(returnDocument.getId())
                  .phieuTraHang(returnDocument)
                  .soLuongThayDoi(quantity)
                  .tonCuoi(stock.getTonThucTe())
                  .ghiChu("Nhận hàng hoàn " + returnDocument.getMaTraHang())
                  .build());

      movements.add(
          new AdminDeliveryResponse.ReturnStockChange(
              movement.getId(),
              variantId,
              LoaiGiaoDichKho.KHACH_TRA,
              quantity,
              stock.getTonThucTe(),
              stock.getTonCoTheBan(),
              stock.getHangLoi()));
    }

    entityManager.flush();
    return List.copyOf(movements);
  }

  public AdminDeliveryResponse.ReturnWarehouse returnWarehouse() {
    KhoHang warehouse = requireWarehouse();

    return new AdminDeliveryResponse.ReturnWarehouse(
        warehouse.getId(), warehouse.getMaKho(), warehouse.getTenKho());
  }

  private AppException returnMismatch(String message) {
    return new AppException(
        ErrorCode.UNPROCESSABLE_ENTITY, "hang_nhan", "RETURNED_GOODS_MISMATCH", message);
  }

  private Map<Key, Expected> expected(Long orderId) {
    var lines = orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);

    if (lines.isEmpty()) {
      throw conflict("Đơn hàng không có chi tiết sản phẩm");
    }

    Map<Key, Expected> result = new LinkedHashMap<>();

    for (var line : lines) {
      for (var physical : saleSnapshots.physical(line).values()) {
        var variant = entityManager.find(PhienBanSanPham.class, physical.variantId());

        if (variant == null) {
          throw conflict("Không tìm thấy linh kiện đã bán");
        }

        result.put(
            new Key(line.getId(), physical.variantId()),
            new Expected(line, variant, physical.quantity(), physical.serialManaged()));
      }
    }

    return result;
  }

  private Map<Long, Integer> totals(Map<Key, Expected> expected) {
    Map<Long, Integer> result = new TreeMap<>();

    for (Expected item : expected.values()) {
      merge(result, item.variant().getId(), item.quantity());
    }

    return result;
  }

  private void verifyExport(Long orderId, Map<Long, Integer> expected) {
    var exports =
        ledgerRepository.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(
            orderId, LoaiGiaoDichKho.XUAT_BAN);

    if (exports.isEmpty()) {
      throw conflict("Thiếu thẻ kho XUAT_BAN của đơn hàng");
    }

    Map<Long, Integer> exported = new TreeMap<>();

    for (TheKho movement : exports) {
      if (!Objects.equals(movement.getKhoHang().getId(), defaultWarehouseId)
          || movement.getSoLuongThayDoi() == null
          || movement.getSoLuongThayDoi() >= 0) {
        throw conflict("Chứng từ xuất kho không hợp lệ hoặc thuộc kho khác");
      }

      int quantity = bounded(-(long) movement.getSoLuongThayDoi());
      merge(exported, movement.getPhienBan().getId(), quantity);
    }

    if (!exported.equals(expected)) {
      throw conflict("Hàng trong đơn không khớp toàn bộ chứng từ xuất kho");
    }
  }

  private KhoHang requireWarehouse() {
    if (warehouseRepository.count() != 1) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR, "Chưa xác định được duy nhất một kho cửa hàng");
    }

    KhoHang warehouse =
        warehouseRepository
            .findById(defaultWarehouseId)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.INTERNAL_SERVER_ERROR, "Kho cửa hàng mặc định không tồn tại"));

    if (warehouse.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR, "Kho cửa hàng mặc định đã ngừng hoạt động");
    }

    return warehouse;
  }

  private TonKho lockStock(Long variantId) {
    var rows = stockRepository.findForSerialUpdate(defaultWarehouseId, variantId);

    if (rows.size() != 1) {
      throw conflict("Phiên bản " + variantId + " phải có đúng một bản ghi tồn tại kho mặc định");
    }

    TonKho stock = rows.get(0);
    entityManager.refresh(stock);
    return stock;
  }

  private void validateStock(TonKho stock) {
    Integer warrantyHeld = stock.getSoLuongGiuChoBaoHanh();
    Integer physical = stock.getTonThucTe();
    Integer available = stock.getTonCoTheBan();
    Integer damaged = stock.getHangLoi();

    if (physical == null
        || available == null
        || damaged == null
        || physical < 0
        || available < 0
        || damaged < 0
        || warrantyHeld == null
        || warrantyHeld < 0
        || (long) available + damaged + warrantyHeld > physical
        || (long) available + damaged > physical) {
      throw conflict("Dữ liệu tồn kho không hợp lệ, cần đối chiếu trước khi xử lý");
    }
  }

  private void merge(Map<Long, Integer> map, Long key, int value) {
    map.put(key, bounded((long) map.getOrDefault(key, 0) + value));
  }

  private int bounded(long value) {
    if (value < 0 || value > Integer.MAX_VALUE) {
      throw conflict("Số lượng vượt giới hạn lưu trữ");
    }
    return (int) value;
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }
}
