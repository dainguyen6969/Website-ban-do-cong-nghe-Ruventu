package com.example.dantruventu.Services.order;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.DTO.Response.order.AdminOrderResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import com.example.dantruventu.Services.order.sales.OrderSaleSnapshotService;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.order.sales.SoldDeviceService;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class OrderInventoryService {

  private final ChiTietDonHangRepository lineRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final TheKhoRepository ledgerRepository;
  private final SalesCalculationService calculation;
  private final SalesContext context;
  private final SalesProperties properties;
  private final EntityManager entityManager;
  private final OrderSaleSnapshotService saleSnapshots;
  private final SoldDeviceService soldDevices;

  @Value("${ruventu.sales.reservation-ttl}")
  private Duration reservationTtl;

  public record Key(Long lineId, Long variantId) {}

  public record Plan(
      List<ChiTietDonHang> lines,
      Map<Long, Integer> quantities,
      Map<Key, Integer> serials,
      List<AdminOrderResponse.RequirementLine> requirements) {}

  public Plan plan(DonHang order, boolean lockCatalog) {
    context.warehouse(context.defaultWarehouseId());

    var lines =
        lockCatalog
            ? lineRepository.findByDonHangIdForUpdate(order.getId())
            : lineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    if (lines.isEmpty()) {
      throw conflict("Đơn hàng không có sản phẩm");
    }

    Map<Long, Integer> totals = new TreeMap<>();
    Map<Key, Integer> serials = new LinkedHashMap<>();
    List<AdminOrderResponse.RequirementLine> requirements = new ArrayList<>();

    for (var line : lines) {
      var snapshot = saleSnapshots.requireSnapshot(line);

      List<AdminOrderResponse.Requirement> groups = new ArrayList<>();
      List<Map<String, Object>> physicalRows = new ArrayList<>();

      for (var physical : saleSnapshots.physical(line).values()) {
        totals.merge(physical.variantId(), physical.quantity(), (a, b) -> quantity((long) a + b));

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("phien_ban_id", physical.variantId());
        row.put("ten_san_pham", physical.productName());
        row.put("ten_phien_ban", physical.variantName());
        row.put("so_luong", physical.quantity());
        row.put("quan_ly_serial", physical.serialManaged());
        physicalRows.add(row);

        if (physical.serialManaged()) {
          serials.put(new Key(line.getId(), physical.variantId()), physical.quantity());

          groups.add(
              new AdminOrderResponse.Requirement(
                  physical.variantId(),
                  physical.perUnit(),
                  physical.quantity(),
                  physical.productName(),
                  physical.variantName()));
        }
      }

      requirements.add(
          new AdminOrderResponse.RequirementLine(
              line.getId(),
              snapshot.productType(),
              line.getSoLuong(),
              List.copyOf(groups),
              snapshot.lineKey(),
              Boolean.TRUE.equals(line.getLaQuaTang()),
              snapshot.productName(),
              List.copyOf(physicalRows)));
    }

    return new Plan(lines, totals, serials, requirements);
  }

  public void checkAvailable(DonHang order) {
    Plan plan = plan(order, true);
    Map<Long, TonKho> stocks = lockStocks(plan, false);

    for (var need : plan.quantities().entrySet()) {
      if (stocks.get(need.getKey()).getTonCoTheBan() < need.getValue()) {
        throw conflict("Không đủ tồn có thể bán của phiên bản " + need.getKey());
      }
    }
  }

  public boolean hasQuantityReservation(DonHang order) {
    if (order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {
      return false;
    }

    if (order.getDaGiuHang() != null) {
      return Boolean.TRUE.equals(order.getDaGiuHang());
    }

    // Tương thích đơn cũ, chưa có cờ giữ hàng.
    return order.getLoaiDonHang() == LoaiDonHang.ONLINE
        && Set.of(TrangThaiDonHang.CHO_DONG_GOI, TrangThaiDonHang.CHO_LAY_HANG)
            .contains(order.getTrangThaiDonHang())
        && Set.of(TrangThaiDongGoi.DANG_DONG_GOI, TrangThaiDongGoi.DA_DONG_GOI)
            .contains(order.getTrangThaiDongGoi());
  }

  public void requireReservationNotExpired(DonHang order) {
    if (hasQuantityReservation(order)
        && order.getHanGiuHang() != null
        && !order.getHanGiuHang().isAfter(LocalDateTime.now(properties.zone()))) {

      throw conflict(
          "Đơn đã quá hạn giữ hàng, chưa thể thực hiện thao tác này. "
              + "Hệ thống cần kiểm tra chứng từ tiền và xử lý hết hạn.");
    }
  }

  private void requireUnexportedReservation(DonHang order) {
    if (order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {
      throw conflict("Không được thay đổi giữ hàng sau xuất kho");
    }

    requireNoExport(order);
  }

  public void reserve(DonHang order) {
    if (!tryReserve(order)) {
      throw conflict("Chưa đủ tồn có thể bán để giữ toàn bộ đơn hàng");
    }
  }

  public boolean tryReserve(DonHang order) {
    requireUnexportedReservation(order);
    requireReservationNotExpired(order);

    boolean alreadyHeld = hasQuantityReservation(order);

    Plan plan = plan(order, true);

    Map<Long, TonKho> stocks = lockStocks(plan, alreadyHeld, !alreadyHeld);

    if (alreadyHeld) {
      order.setDaGiuHang(true);
      return true;
    }

    if (!serialRepository.findPackingByOrderId(order.getId()).isEmpty()) {
      throw conflict("Đơn chưa giữ số lượng nhưng đang giữ serial, cần đối soát");
    }

    for (var need : plan.quantities().entrySet()) {
      TonKho stock = stocks.get(need.getKey());

      if (stock == null || stock.getTonCoTheBan() < need.getValue()) {
        return false;
      }
    }

    // Chỉ trừ tồn khi đã kiểm tra đủ toàn bộ hàng của đơn.
    for (var need : plan.quantities().entrySet()) {
      TonKho stock = stocks.get(need.getKey());
      stock.setTonCoTheBan(stock.getTonCoTheBan() - need.getValue());
    }

    order.setDaGiuHang(true);
    return true;
  }

  public void reserveForNewOrder(DonHang order) {
    reserveForNewOrder(order, false);
  }

  public void reserveForNewOrder(DonHang order, boolean allowWaiting) {
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE
        || order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {

      throw conflict("Không đúng trạng thái giữ hàng khi tạo đơn");
    }

    if (!tryReserve(order)) {
      if (!allowWaiting) {
        throw conflict("Chưa đủ tồn có thể bán để giữ toàn bộ đơn hàng");
      }

      order.setDaGiuHang(false);
      order.setHanGiuHang(null);
      order.setTrangThaiDonHang(TrangThaiDonHang.CHO_HANG);
      return;
    }

    startUnpaidReservationDeadline(order);
  }

  public void startUnpaidReservationDeadline(DonHang order) {
    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
        || !hasQuantityReservation(order)) {

      throw conflict("Chỉ đặt hạn cho đơn chờ duyệt chưa thu tiền và đã giữ hàng");
    }

    if (reservationTtl == null || reservationTtl.isZero() || reservationTtl.isNegative()) {

      throw new IllegalStateException("reservation-ttl phải lớn hơn 0");
    }

    order.setHanGiuHang(LocalDateTime.now(properties.zone()).plus(reservationTtl));
  }

  public List<Map<String, Object>> shortages(DonHang order) {
    Plan plan = plan(order, false);

    Map<Long, OrderSaleSnapshotService.PhysicalItem> metadata = new TreeMap<>();

    for (var line : plan.lines()) {
      saleSnapshots.physical(line).forEach(metadata::putIfAbsent);
    }

    List<Map<String, Object>> result = new ArrayList<>();

    boolean held = hasQuantityReservation(order);

    for (var need : plan.quantities().entrySet()) {
      TonKho stock = calculation.stock(context.defaultWarehouseId(), need.getKey(), false);

      long available =
          (stock == null ? 0L : stock.getTonCoTheBan()) + (held ? need.getValue() : 0L);

      if (available >= need.getValue()) {
        continue;
      }

      var item = metadata.get(need.getKey());

      Map<String, Object> row = new LinkedHashMap<>();
      row.put("phien_ban_id", need.getKey());
      row.put("ten_san_pham", item.productName());
      row.put("ten_phien_ban", item.variantName());
      row.put("so_luong_can", need.getValue());
      row.put("ton_co_the_ban", available);
      row.put("so_luong_thieu", need.getValue() - available);

      result.add(row);
    }

    return List.copyOf(result);
  }

  public void releaseQuantityReservation(DonHang order) {
    requireUnexportedReservation(order);

    if (!hasQuantityReservation(order)) {
      if (!serialRepository.findPackingByOrderId(order.getId()).isEmpty()) {
        throw conflict("Đơn không giữ số lượng nhưng vẫn giữ serial, cần đối soát");
      }

      order.setHanGiuHang(null);
      return;
    }

    Plan plan = plan(order, true);
    Map<Long, TonKho> stocks = lockStocks(plan, true);

    // Giải phóng serial trước khi thay đổi các số lượng tồn.
    releasePackingSerials(order);

    for (var need : plan.quantities().entrySet()) {
      TonKho stock = stocks.get(need.getKey());
      stock.setTonCoTheBan(quantity((long) stock.getTonCoTheBan() + need.getValue()));
    }

    order.setDaGiuHang(false);
    order.setHanGiuHang(null);
  }

  private boolean heldForOrder(SoSerialSanPham serial, DonHang order) {
    return serial.getChiTietDongGoi() != null
        && Objects.equals(serial.getChiTietDongGoi().getDonHang().getId(), order.getId());
  }

  private Map<Long, SoSerialSanPham> lockSerialRows(Collection<Long> ids) {
    Map<Long, SoSerialSanPham> result = new TreeMap<>();

    for (Long id : new TreeSet<>(ids)) {
      SoSerialSanPham serial =
          serialRepository
              .findByIdForUpdate(id)
              .orElseThrow(() -> notFound("Serial không tồn tại: " + id));

      entityManager.refresh(serial);
      result.put(id, serial);
    }

    return result;
  }

  public void releasePackingSerials(DonHang order) {
    requireUnexportedReservation(order);

    boolean held = hasQuantityReservation(order);
    var current = serialRepository.findPackingByOrderId(order.getId());

    if (!held) {
      if (!current.isEmpty()) {
        throw conflict("Serial đóng gói không khớp phần giữ số lượng");
      }
      return;
    }

    Plan plan = plan(order, true);
    lockStocks(plan, true);

    var locked = lockSerialRows(current.stream().map(SoSerialSanPham::getId).toList());

    for (var serial : locked.values()) {
      if (!heldForOrder(serial, order)
          || serial.getDonHang() != null
          || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO) {
        throw conflict("Serial giữ đóng gói không nhất quán: " + serial.getSoSerial());
      }
    }

    for (var serial : locked.values()) {
      serial.setChiTietDongGoi(null);
    }

    // Quan trọng với đơn cũ: hủy đóng gói không làm mất dấu giữ số lượng.
    order.setDaGiuHang(true);
  }

  private Map<Long, Key> packingIndex(Plan plan, AdminOrderRequest.Export request) {

    if (!Objects.equals(request.getKhoHangId(), context.defaultWarehouseId())) {
      throw conflict("Chỉ sử dụng kho mặc định");
    }

    if (request.getItems() == null) {
      throw invalid("Thiếu các dòng phân bổ");
    }

    Set<Long> expectedLines = new HashSet<>();
    plan.lines().forEach(line -> expectedLines.add(line.getId()));

    Set<Long> suppliedLines = new HashSet<>();
    Set<Key> suppliedGroups = new HashSet<>();
    Map<Long, Key> bySerial = new TreeMap<>();

    for (var item : request.getItems()) {
      if (item == null
          || item.getChiTietDonHangId() == null
          || !suppliedLines.add(item.getChiTietDonHangId())
          || !expectedLines.contains(item.getChiTietDonHangId())) {
        throw invalid("Dòng phân bổ thiếu, trùng hoặc không thuộc đơn");
      }

      if (item.getSerials() == null) {
        throw invalid("Thiếu danh sách nhóm serial");
      }

      for (var group : item.getSerials()) {
        if (group == null || group.getPhienBanId() == null) {
          throw invalid("Nhóm serial không hợp lệ");
        }

        Key key = new Key(item.getChiTietDonHangId(), group.getPhienBanId());

        if (!suppliedGroups.add(key)) {
          throw invalid("Nhóm serial bị gửi trùng");
        }

        Integer required = plan.serials().get(key);

        if (required == null) {
          throw conflict("Phiên bản không thuộc yêu cầu serial của dòng");
        }

        if (group.getSerialIds() == null || group.getSerialIds().size() != required) {
          throw conflict("Thiếu hoặc thừa serial tại dòng " + key.lineId());
        }

        for (Long id : group.getSerialIds()) {
          if (id == null || id <= 0) {
            throw invalid("ID serial không hợp lệ");
          }

          if (bySerial.putIfAbsent(id, key) != null) {
            throw invalid("Một serial không được dùng nhiều lần trong đơn");
          }
        }
      }
    }

    if (!suppliedLines.equals(expectedLines)) {
      throw invalid("Phải gửi đầy đủ các dòng đơn, gồm cả quà tặng");
    }

    if (!suppliedGroups.equals(plan.serials().keySet())) {
      throw conflict("Chưa phân bổ đủ các nhóm serial");
    }

    return bySerial;
  }

  public AdminOrderRequest.Export packingAllocation(DonHang order) {
    Plan plan = plan(order, false);
    Map<Key, List<Long>> ids = new HashMap<>();

    for (var serial : serialRepository.findPackingByOrderId(order.getId())) {
      Key key = new Key(serial.getChiTietDongGoi().getId(), serial.getPhienBan().getId());

      if (!plan.serials().containsKey(key)) {
        throw conflict("Serial đang giữ không khớp bản chụp hàng của đơn");
      }

      ids.computeIfAbsent(key, ignored -> new ArrayList<>()).add(serial.getId());
    }

    List<AdminOrderRequest.ExportItem> items = new ArrayList<>();

    for (var line : plan.lines()) {
      var item = new AdminOrderRequest.ExportItem();
      item.setChiTietDonHangId(line.getId());

      List<AdminOrderRequest.SerialGroup> groups = new ArrayList<>();

      for (var requirement : plan.serials().entrySet()) {
        if (!Objects.equals(requirement.getKey().lineId(), line.getId())) {
          continue;
        }

        var group = new AdminOrderRequest.SerialGroup();
        group.setPhienBanId(requirement.getKey().variantId());
        group.setSerialIds(List.copyOf(ids.getOrDefault(requirement.getKey(), List.of())));
        groups.add(group);
      }

      item.setSerials(groups);
      items.add(item);
    }

    var response = new AdminOrderRequest.Export();
    response.setKhoHangId(context.defaultWarehouseId());
    response.setItems(items);
    return response;
  }

  public void requirePackingAllocation(DonHang order) {
    requireUnexportedReservation(order);

    if (!hasQuantityReservation(order)) {
      throw conflict("Đơn chưa giữ đủ số lượng hàng");
    }

    Plan plan = plan(order, true);
    lockStocks(plan, true);

    var expected = packingIndex(plan, packingAllocation(order));
    var locked = lockSerialRows(expected.keySet());

    for (var entry : expected.entrySet()) {
      SoSerialSanPham serial = locked.get(entry.getKey());
      Key key = entry.getValue();

      if (!heldForOrder(serial, order)
          || !Objects.equals(serial.getChiTietDongGoi().getId(), key.lineId())
          || !Objects.equals(serial.getPhienBan().getId(), key.variantId())
          || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO
          || serial.getDonHang() != null) {
        throw conflict("Phân bổ serial không còn hợp lệ: " + serial.getSoSerial());
      }
    }
  }

  public void savePackingSerials(DonHang order, AdminOrderRequest.PackingSerials request) {

    requireUnexportedReservation(order);

    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DANG_DONG_GOI
        || !hasQuantityReservation(order)) {
      throw conflict("Chỉ chọn serial khi đang đóng gói và đã giữ đủ hàng");
    }

    Plan plan = plan(order, true);
    Map<Long, TonKho> stocks = lockStocks(plan, true);
    Map<Long, Key> selected = packingIndex(plan, request);

    var previous = serialRepository.findPackingByOrderId(order.getId());
    Set<Long> previousIds = new TreeSet<>();
    previous.forEach(serial -> previousIds.add(serial.getId()));

    if (request.getSerialLoiIds() == null) {
      throw invalid("Thiếu danh sách serial lỗi");
    }

    Set<Long> faultyIds = new TreeSet<>(request.getSerialLoiIds());

    if (faultyIds.size() != request.getSerialLoiIds().size()) {
      throw invalid("Serial lỗi bị gửi trùng");
    }

    if (!previousIds.containsAll(faultyIds) || faultyIds.stream().anyMatch(selected::containsKey)) {
      throw conflict("Chỉ đánh dấu lỗi serial đã giữ cho đơn và đã bỏ khỏi phân bổ mới");
    }

    String reason = text(request.getLyDoDoiSerial());

    if (!faultyIds.isEmpty() && (reason == null || reason.length() > 150)) {
      throw invalid("Phải nhập lý do đổi serial lỗi, tối đa 150 ký tự");
    }

    Set<Long> allIds = new TreeSet<>(previousIds);
    allIds.addAll(selected.keySet());

    Map<Long, SoSerialSanPham> locked = lockSerialRows(allIds);

    for (Long id : previousIds) {
      var serial = locked.get(id);

      if (!heldForOrder(serial, order)
          || serial.getDonHang() != null
          || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO) {
        throw conflict("Serial đã giữ không còn nhất quán: " + serial.getSoSerial());
      }
    }

    for (var entry : selected.entrySet()) {
      var serial = locked.get(entry.getKey());
      var key = entry.getValue();

      if (!Objects.equals(serial.getPhienBan().getId(), key.variantId())
          || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO
          || serial.getDonHang() != null
          || (serial.getChiTietDongGoi() != null && !heldForOrder(serial, order))) {
        throw conflict("Serial không còn khả dụng: " + serial.getSoSerial());
      }
    }

    Map<Long, Integer> faultyByVariant = new TreeMap<>();

    for (Long id : faultyIds) {
      var serial = locked.get(id);
      Long variantId = serial.getPhienBan().getId();

      if (!stocks.containsKey(variantId)) {
        throw conflict("Serial lỗi không thuộc nhu cầu vật lý của đơn");
      }

      faultyByVariant.merge(variantId, 1, Integer::sum);
    }

    for (var entry : faultyByVariant.entrySet()) {
      if (stocks.get(entry.getKey()).getTonCoTheBan() < entry.getValue()) {
        throw conflict(
            "Không đủ hàng tốt để thay serial lỗi của phiên bản "
                + entry.getKey()
                + ". Cần bổ sung hàng hoặc xử lý phần giữ trước.");
      }
    }

    Map<Long, ChiTietDonHang> lines = new HashMap<>();
    plan.lines().forEach(line -> lines.put(line.getId(), line));

    for (Long id : previousIds) {
      locked.get(id).setChiTietDongGoi(null);
    }

    for (var entry : selected.entrySet()) {
      locked.get(entry.getKey()).setChiTietDongGoi(lines.get(entry.getValue().lineId()));
    }

    for (Long id : faultyIds) {
      var serial = locked.get(id);
      var stock = stocks.get(serial.getPhienBan().getId());

      serial.setTrangThai(TrangThaiSerial.LOI);
      stock.setHangLoi(stock.getHangLoi() + 1);
      stock.setTonCoTheBan(stock.getTonCoTheBan() - 1);

      String note = "Lỗi đóng gói " + order.getMaDonHang() + "; serial_id=" + id + ": " + reason;

      var check =
          PhieuKiemKho.builder()
              .maPhieu("KK-SN-" + UUID.randomUUID().toString().replace("-", ""))
              .nguoiKiem(context.actor())
              .phienBan(serial.getPhienBan())
              .tonHeThong(stock.getTonThucTe())
              .tonThucTe(stock.getTonThucTe())
              .soLuongChenhLech(0)
              .lyDo(note)
              .trangThai(TrangThaiPhieuKiemKho.DA_CAN_BANG)
              .build();

      entityManager.persist(check);

      ledgerRepository.save(
          TheKho.builder()
              .khoHang(stock.getKhoHang())
              .phienBan(stock.getPhienBan())
              .loaiGiaoDich(LoaiGiaoDichKho.KIEM_KHO)
              .maChungTuGoc(check.getId())
              .soLuongThayDoi(0)
              .tonCuoi(stock.getTonThucTe())
              .ghiChu(note)
              .build());
    }

    order.setDaGiuHang(true);
  }

  public void export(DonHang order, AdminOrderRequest.Export request) {

    if (!Objects.equals(request.getKhoHangId(), context.defaultWarehouseId())) {
      throw conflict("Chỉ được xuất tại kho mặc định");
    }

    requireNoExport(order);

    Plan plan = plan(order, true);
    Map<Long, TonKho> stocks = lockStocks(plan, true);

    if (!hasQuantityReservation(order)) {
      throw conflict("Đơn chưa giữ đủ hàng");
    }

    Map<Long, Key> fixedSelection = packingIndex(plan, packingAllocation(order));

    if (!fixedSelection.equals(packingIndex(plan, request))) {
      throw conflict(
          "Serial xuất phải đúng phân bổ đã chốt khi đóng gói. "
              + "Muốn đổi mã phải hủy hoàn tất đóng gói và chọn lại.");
    }

    Set<Long> expectedLineIds = new HashSet<>();

    for (var line : plan.lines()) {
      expectedLineIds.add(line.getId());
    }

    Set<Long> suppliedLineIds = new HashSet<>();
    Set<Key> suppliedGroups = new HashSet<>();
    Map<Long, Long> variantBySerial = new TreeMap<>();

    for (var item : request.getItems()) {
      if (!suppliedLineIds.add(item.getChiTietDonHangId())) {
        throw invalid("Chi tiết đơn hàng bị gửi trùng");
      }

      if (!expectedLineIds.contains(item.getChiTietDonHangId())) {
        throw invalid("Chi tiết đơn hàng không thuộc đơn này");
      }

      for (var group : item.getSerials()) {
        Key key = new Key(item.getChiTietDonHangId(), group.getPhienBanId());

        if (!suppliedGroups.add(key)) {
          throw invalid("Nhóm serial bị gửi trùng");
        }

        Integer required = plan.serials().get(key);

        if (required == null) {
          throw conflict("Phiên bản không thuộc yêu cầu serial của dòng đơn");
        }

        if (group.getSerialIds().size() != required) {
          throw conflict("Thiếu hoặc thừa serial tại dòng " + key.lineId());
        }

        for (Long serialId : group.getSerialIds()) {
          if (variantBySerial.putIfAbsent(serialId, group.getPhienBanId()) != null) {
            throw invalid("Một serial không được dùng nhiều lần trong đơn");
          }
        }
      }
    }

    if (!suppliedLineIds.equals(expectedLineIds)) {
      throw invalid("Phải gửi đầy đủ các dòng đơn hàng");
    }

    if (!suppliedGroups.equals(plan.serials().keySet())) {
      throw conflict("Chưa phân bổ đầy đủ các nhóm serial");
    }

    List<SoSerialSanPham> selected = new ArrayList<>();

    // Khóa và kiểm tra serial, giữ nguyên trạng thái và phân bổ.
    for (var entry : variantBySerial.entrySet()) {
      SoSerialSanPham serial =
          serialRepository
              .findByIdForUpdate(entry.getKey())
              .orElseThrow(() -> notFound("Serial không tồn tại: " + entry.getKey()));

      entityManager.refresh(serial);

      Key fixedKey = fixedSelection.get(serial.getId());

      if (fixedKey == null
          || !Objects.equals(serial.getPhienBan().getId(), entry.getValue())
          || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO
          || serial.getDonHang() != null
          || !heldForOrder(serial, order)
          || !Objects.equals(serial.getChiTietDongGoi().getId(), fixedKey.lineId())) {

        throw conflict("Serial không còn đúng phân bổ đóng gói: " + serial.getSoSerial());
      }

      selected.add(serial);
    }

    // Toàn bộ serial đã hợp lệ, thực hiện cập nhật xuất kho.
    for (SoSerialSanPham serial : selected) {
      serial.setChiTietDongGoi(null);
      serial.setDonHang(order);
      serial.setTrangThai(TrangThaiSerial.DA_BAN);
      serial.setNgayKichHoat(null);
      serial.setHanBaoHanh(null);
    }

    Map<Long, SoSerialSanPham> selectedById = new HashMap<>();

    for (var serial : selected) {
      selectedById.put(serial.getId(), serial);
    }

    Map<SoldDeviceService.Key, List<SoSerialSanPham>> bindings = new HashMap<>();

    for (var item : request.getItems()) {
      for (var group : item.getSerials()) {
        bindings.put(
            new SoldDeviceService.Key(item.getChiTietDonHangId(), group.getPhienBanId()),
            group.getSerialIds().stream().map(selectedById::get).toList());
      }
    }

    soldDevices.prepare(order, plan.lines(), bindings);

    for (var need : plan.quantities().entrySet()) {
      TonKho stock = stocks.get(need.getKey());
      int quantity = need.getValue();

      stock.setTonThucTe(stock.getTonThucTe() - quantity);

      // tonCoTheBan đã giảm khi giữ hàng, không giảm lần hai.
      ledgerRepository.save(
          TheKho.builder()
              .khoHang(stock.getKhoHang())
              .phienBan(stock.getPhienBan())
              .loaiGiaoDich(LoaiGiaoDichKho.XUAT_BAN)
              .maChungTuGoc(order.getId())
              .soLuongThayDoi(-quantity)
              .tonCuoi(stock.getTonThucTe())
              .ghiChu("Xuất đơn " + order.getMaDonHang())
              .build());
    }

    order.setDaGiuHang(false);
    order.setHanGiuHang(null);
  }

  public List<Map<String, Object>> reservationRows(DonHang order, boolean released) {

    Plan plan = plan(order, false);
    List<Map<String, Object>> result = new ArrayList<>();

    if (!released) {
      for (var line : plan.lines()) {
        for (var item : saleSnapshots.physical(line).values()) {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("chi_tiet_don_hang_id", line.getId());
          row.put("phien_ban_id", item.variantId());
          row.put("so_luong", item.quantity());
          row.put("la_qua_tang", Boolean.TRUE.equals(line.getLaQuaTang()));
          result.add(row);
        }
      }
    } else {
      for (var entry : plan.quantities().entrySet()) {
        TonKho stock = calculation.stock(context.defaultWarehouseId(), entry.getKey(), false);

        if (stock == null) {
          throw conflict("Không tìm thấy tồn sau giải phóng giữ hàng");
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("phien_ban_id", entry.getKey());
        row.put("so_luong_da_giu", entry.getValue());
        row.put("ton_thuc_te_sau", stock.getTonThucTe());
        row.put("ton_co_the_ban_sau", stock.getTonCoTheBan());
        result.add(row);
      }
    }

    return List.copyOf(result);
  }

  public long expectedHeld(Long variantId) {
    long total = 0;

    for (var line : lineRepository.findHeldLines()) {
      // physical() bắt buộc có bản chụp hợp lệ.
      // Không lấy cấu hình combo hiện tại để dựng lại đơn cũ.
      var item = saleSnapshots.physical(line).get(variantId);

      if (item != null) {
        try {
          total = Math.addExact(total, item.quantity());
        } catch (ArithmeticException exception) {
          throw conflict("Số lượng giữ hàng vượt giới hạn");
        }
      }
    }

    return total;
  }

  private Map<Long, TonKho> lockStocks(Plan plan, boolean requireHeld) {
    return lockStocks(plan, requireHeld, false);
  }

  private Map<Long, TonKho> lockStocks(Plan plan, boolean requireHeld, boolean allowMissing) {

    Map<Long, TonKho> stocks = new TreeMap<>();

    for (Long variantId : plan.quantities().keySet()) {
      TonKho stock = calculation.stock(context.defaultWarehouseId(), variantId, true);

      if (stock == null) {
        if (allowMissing && !requireHeld) {
          if (expectedHeld(variantId) != 0) {
            throw conflict("Thiếu bản ghi tồn của phiên bản đang có hàng giữ: " + variantId);
          }

          continue;
        }

        throw conflict("Chưa có tồn kho của phiên bản " + variantId);
      }

      stocks.put(variantId, stock);
    }

    // Kiểm tra khi chưa thay đổi tồn hoặc trạng thái đơn.
    for (var entry : stocks.entrySet()) {
      TonKho stock = entry.getValue();

      long actualHeld =
          (long) stock.getTonThucTe()
              - stock.getHangLoi()
              - stock.getSoLuongGiuChoBaoHanh()
              - stock.getTonCoTheBan();

      Long expectedHeld = expectedHeld(entry.getKey());

      if (expectedHeld == null || actualHeld != expectedHeld.longValue()) {

        throw conflict("Tồn giữ hàng không nhất quán tại phiên bản " + entry.getKey());
      }

      if (requireHeld && actualHeld < plan.quantities().get(entry.getKey())) {

        throw conflict("Đơn chưa được giữ đủ hàng");
      }
    }

    return stocks;
  }

  public void requireNoExport(DonHang order) {
    if (ledgerRepository.existsByMaChungTuGocAndLoaiGiaoDich(
        order.getId(), LoaiGiaoDichKho.XUAT_BAN)) {
      throw conflict("Đơn đã có chứng từ xuất bán");
    }
  }
}
