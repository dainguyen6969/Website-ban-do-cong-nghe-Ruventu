package com.example.dantruventu.Services.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnReceiveRequest;
import com.example.dantruventu.DTO.Response.order.AdminReturnResponse;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.KhoHang;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Entity.ThanhPhanCombo;
import com.example.dantruventu.Entity.TheKho;
import com.example.dantruventu.Entity.TonKho;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.ChiTietTraHangRepository;
import com.example.dantruventu.Repository.warehouse.KhoHangRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.ThanhPhanComboRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class ReturnInventoryService {

  private final ChiTietTraHangRepository returnLineRepository;
  private final ChiTietDonHangRepository orderLineRepository;
  private final ThanhPhanComboRepository componentRepository;
  private final KhoHangRepository warehouseRepository;
  private final TonKhoRepository stockRepository;
  private final TheKhoRepository ledgerRepository;
  private final SoSerialSanPhamRepository serialRepository;

  private record ItemKey(Long orderLineId, Long variantId) {}

  private record StockKey(Long warehouseId, Long variantId) {}

  private record Source(ChiTietDonHang orderLine, int quantity) {}

  private record Expected(ChiTietDonHang orderLine, PhienBanSanPham variant, int quantity) {}

  public List<AdminReturnResponse.ReceivedItem> receive(
      PhieuTraHang returnSlip,
      DonHang order,
      AdminReturnReceiveRequest request) {

    if (ledgerRepository.existsByMaChungTuGocAndLoaiGiaoDich(
        returnSlip.getId(), LoaiGiaoDichKho.KHACH_TRA)) {
      throw conflict("Phiếu trả đã có chứng từ nhập hàng trả");
    }

    Map<ItemKey, Expected> expected = expectedForReturn(returnSlip.getId());
    Map<ItemKey, AdminReturnReceiveRequest.Item> received =
        validateReceivedItems(request, expected);

    verifyOriginalExport(order.getId());

    Map<Long, KhoHang> warehouses = loadWarehouses(received.values());
    Map<StockKey, Integer> goodTotals = new TreeMap<>(stockKeyComparator());
    Map<StockKey, Integer> damagedTotals = new TreeMap<>(stockKeyComparator());

    for (var entry : received.entrySet()) {
      AdminReturnReceiveRequest.Item item = entry.getValue();
      StockKey stockKey = new StockKey(item.getKhoHangId(), item.getPhienBanId());
      mergeStock(goodTotals, stockKey, item.getSoLuongNguyenVen());
      mergeStock(damagedTotals, stockKey, item.getSoLuongLoi());
    }

    Map<StockKey, TonKho> stocks = lockStocks(goodTotals.keySet());
    validateAndUpdateSerials(order, expected, received);

    for (StockKey stockKey : stocks.keySet()) {
      TonKho stock = stocks.get(stockKey);
      int good = goodTotals.getOrDefault(stockKey, 0);
      int damaged = damagedTotals.getOrDefault(stockKey, 0);
      int total = bounded((long) good + damaged);

      stock.setTonThucTe(bounded((long) stock.getTonThucTe() + total));
      stock.setTonCoTheBan(bounded((long) stock.getTonCoTheBan() + good));
      stock.setHangLoi(bounded((long) stock.getHangLoi() + damaged));

      ledgerRepository.save(
          TheKho.builder()
              .khoHang(warehouses.get(stockKey.warehouseId()))
              .phienBan(stock.getPhienBan())
              .loaiGiaoDich(LoaiGiaoDichKho.KHACH_TRA)
              .maChungTuGoc(returnSlip.getId())
              .soLuongThayDoi(total)
              .tonCuoi(stock.getTonThucTe())
              .ghiChu("Nhận hàng trả " + returnSlip.getMaTraHang())
              .build());
    }

    return request.getHangNhan().stream().map(this::toReceivedItem).toList();
  }

  private Map<ItemKey, AdminReturnReceiveRequest.Item> validateReceivedItems(
      AdminReturnReceiveRequest request,
      Map<ItemKey, Expected> expected) {

    Map<ItemKey, AdminReturnReceiveRequest.Item> received = new LinkedHashMap<>();

    for (AdminReturnReceiveRequest.Item item : request.getHangNhan()) {
      ItemKey key = new ItemKey(item.getChiTietDonHangId(), item.getPhienBanId());
      if (received.putIfAbsent(key, item) != null) {
        throw invalid("Không được lặp dòng nhận hàng");
      }

      Expected required = expected.get(key);
      if (required == null) {
        throw invalid("Dòng nhận hàng không thuộc phiếu trả");
      }

      long total = (long) item.getSoLuongNguyenVen() + item.getSoLuongLoi();
      if (total != required.quantity()) {
        throw invalid(
            "Tổng số lượng nguyên vẹn và lỗi phải bằng "
                + required.quantity()
                + " tại dòng "
                + item.getChiTietDonHangId()
                + ", phiên bản "
                + item.getPhienBanId());
      }
    }

    if (!received.keySet().equals(expected.keySet())) {
      throw invalid("Danh sách nhận thiếu hoặc thừa sản phẩm của phiếu trả");
    }

    return received;
  }

  private Map<Long, KhoHang> loadWarehouses(
      Iterable<AdminReturnReceiveRequest.Item> items) {

    Set<Long> warehouseIds = new TreeSet<>();
    for (AdminReturnReceiveRequest.Item item : items) {
      warehouseIds.add(item.getKhoHangId());
    }

    Map<Long, KhoHang> result = new HashMap<>();
    for (Long warehouseId : warehouseIds) {
      KhoHang warehouse =
          warehouseRepository
              .findById(warehouseId)
              .orElseThrow(() -> notFound("Kho hàng không tồn tại"));

      if (warehouse.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
        throw conflict("Kho hàng đã ngừng hoạt động");
      }
      result.put(warehouseId, warehouse);
    }
    return result;
  }

  private Map<StockKey, TonKho> lockStocks(Set<StockKey> stockKeys) {
    List<StockKey> sortedKeys = new ArrayList<>(stockKeys);
    sortedKeys.sort(stockKeyComparator());

    Map<StockKey, TonKho> result = new LinkedHashMap<>();
    for (StockKey key : sortedKeys) {
      List<TonKho> rows =
          stockRepository.findForSerialUpdate(key.warehouseId(), key.variantId());
      if (rows.isEmpty()) {
        throw notFound(
            "Chưa có dữ liệu tồn kho cho phiên bản "
                + key.variantId()
                + " tại kho "
                + key.warehouseId());
      }
      if (rows.size() != 1) {
        throw conflict("Dữ liệu tồn kho bị trùng, cần đối chiếu trước khi nhận hàng");
      }

      TonKho stock = rows.getFirst();
      validateStock(stock);
      result.put(key, stock);
    }
    return result;
  }

  private void validateAndUpdateSerials(
      DonHang order,
      Map<ItemKey, Expected> expected,
      Map<ItemKey, AdminReturnReceiveRequest.Item> received) {

    Set<Long> serialIds = new TreeSet<>();

    for (var entry : expected.entrySet()) {
      Expected required = entry.getValue();
      AdminReturnReceiveRequest.Item item = received.get(entry.getKey());
      boolean managed = serialRepository.countByPhienBanId(required.variant().getId()) > 0;
      List<AdminReturnReceiveRequest.SerialItem> serials = item.getSerials();

      if (managed && serials.size() != required.quantity()) {
        throw invalid("Phiên bản quản lý serial phải nhận đủ serial");
      }
      if (!managed && !serials.isEmpty()) {
        throw invalid("Phiên bản không quản lý serial phải gửi serials rỗng");
      }

      int goodSerials = 0;
      int damagedSerials = 0;
      for (AdminReturnReceiveRequest.SerialItem serialItem : serials) {
        if (!serialIds.add(serialItem.getSoSerialId())) {
          throw invalid("Một serial không được gửi nhiều lần");
        }

        if (serialItem.getTrangThaiSauNhan() == TrangThaiSerial.TRONG_KHO) {
          goodSerials++;
        } else if (serialItem.getTrangThaiSauNhan() == TrangThaiSerial.LOI) {
          damagedSerials++;
        } else {
          throw invalid("Serial nhận về chỉ được TRONG_KHO hoặc LOI");
        }
      }

      if (managed
          && (goodSerials != item.getSoLuongNguyenVen()
              || damagedSerials != item.getSoLuongLoi())) {
        throw invalid("Tình trạng serial không khớp số lượng nguyên vẹn và lỗi");
      }
    }

    if (serialIds.isEmpty()) {
      return;
    }

    List<SoSerialSanPham> serials =
        serialRepository.findAllByIdsForUpdate(serialIds);
    if (serials.size() != serialIds.size()) {
      throw notFound("Serial không tồn tại");
    }

    Map<Long, SoSerialSanPham> serialById = new HashMap<>();
    for (SoSerialSanPham serial : serials) {
      serialById.put(serial.getId(), serial);
    }

    for (var entry : expected.entrySet()) {
      Expected required = entry.getValue();
      AdminReturnReceiveRequest.Item item = received.get(entry.getKey());

      for (AdminReturnReceiveRequest.SerialItem serialItem : item.getSerials()) {
        SoSerialSanPham serial = serialById.get(serialItem.getSoSerialId());
        if (serial == null) {
          throw notFound("Serial không tồn tại");
        }

        if (serial.getDonHang() == null
            || !Objects.equals(serial.getDonHang().getId(), order.getId())
            || !Objects.equals(serial.getPhienBan().getId(), required.variant().getId())
            || serial.getTrangThai() != TrangThaiSerial.DA_BAN) {
          throw conflict(
              "Serial không thuộc đơn/phiên bản, đã nhận trước đó hoặc đang bảo hành");
        }
      }
    }

    for (var entry : expected.entrySet()) {
      AdminReturnReceiveRequest.Item item = received.get(entry.getKey());
      for (AdminReturnReceiveRequest.SerialItem serialItem : item.getSerials()) {
        SoSerialSanPham serial = serialById.get(serialItem.getSoSerialId());
        serial.setTrangThai(serialItem.getTrangThaiSauNhan());
        serial.setDonHang(null);
        // Giữ nguyên ngày kích hoạt và hạn bảo hành cũ theo Q08.
      }
    }
  }

  private Map<ItemKey, Expected> expectedForReturn(Long returnId) {
    List<ChiTietTraHang> returnLines =
        returnLineRepository.findByPhieuTraHang_IdOrderByIdAsc(returnId);
    if (returnLines.isEmpty()) {
      throw conflict("Phiếu trả không có chi tiết sản phẩm");
    }

    List<Source> sources =
        returnLines.stream()
            .map(line -> new Source(line.getChiTietDonHang(), requiredQuantity(line.getSoLuong())))
            .toList();
    return expandPhysicalItems(sources);
  }

  private Map<ItemKey, Expected> expectedForOrder(Long orderId) {
    List<ChiTietDonHang> orderLines =
        orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);
    if (orderLines.isEmpty()) {
      throw conflict("Đơn hàng không có chi tiết sản phẩm");
    }

    List<Source> sources =
        orderLines.stream()
            .map(line -> new Source(line, requiredQuantity(line.getSoLuong())))
            .toList();
    return expandPhysicalItems(sources);
  }

  private Map<ItemKey, Expected> expandPhysicalItems(List<Source> sources) {
    Set<Long> comboIds = new TreeSet<>();
    for (Source source : sources) {
      if (source.orderLine().getPhienBan().getSanPham().getLoaiSanPham()
          == LoaiSanPham.BO_PC) {
        comboIds.add(source.orderLine().getPhienBan().getSanPham().getId());
      }
    }

    Map<Long, List<ThanhPhanCombo>> componentsByCombo = new HashMap<>();
    if (!comboIds.isEmpty()) {
      for (ThanhPhanCombo component : componentRepository.findByComboIds(comboIds)) {
        componentsByCombo
            .computeIfAbsent(component.getSanPhamCombo().getId(), ignored -> new ArrayList<>())
            .add(component);
      }
    }

    Map<ItemKey, Expected> result = new LinkedHashMap<>();
    for (Source source : sources) {
      ChiTietDonHang orderLine = source.orderLine();
      PhienBanSanPham saleVariant = orderLine.getPhienBan();
      LoaiSanPham productType = saleVariant.getSanPham().getLoaiSanPham();

      if (productType == LoaiSanPham.DON) {
        addExpected(result, orderLine, saleVariant, source.quantity());
        continue;
      }
      if (productType != LoaiSanPham.BO_PC) {
        throw conflict("Loại sản phẩm không được hỗ trợ khi nhận hàng trả");
      }

      List<ThanhPhanCombo> components =
          componentsByCombo.getOrDefault(saleVariant.getSanPham().getId(), List.of());
      if (components.isEmpty()) {
        throw conflict("Combo không có cấu hình thành phần");
      }

      for (ThanhPhanCombo component : components) {
        int componentQuantity = requiredQuantity(component.getSoLuong());
        if (component.getPhienBanThanhPhan().getSanPham().getLoaiSanPham()
            != LoaiSanPham.DON) {
          throw conflict("Cấu hình thành phần combo không hợp lệ");
        }
        addExpected(
            result,
            orderLine,
            component.getPhienBanThanhPhan(),
            bounded((long) source.quantity() * componentQuantity));
      }
    }
    return result;
  }

  private void addExpected(
      Map<ItemKey, Expected> result,
      ChiTietDonHang orderLine,
      PhienBanSanPham variant,
      int quantity) {

    ItemKey key = new ItemKey(orderLine.getId(), variant.getId());
    Expected previous = result.get(key);
    int total = previous == null ? quantity : bounded((long) previous.quantity() + quantity);
    result.put(key, new Expected(orderLine, variant, total));
  }

  private void verifyOriginalExport(Long orderId) {
    Map<Long, Integer> expectedTotals = totals(expectedForOrder(orderId));
    List<TheKho> exports =
        ledgerRepository.findByMaChungTuGocAndLoaiGiaoDichOrderByIdAsc(
            orderId, LoaiGiaoDichKho.XUAT_BAN);
    if (exports.isEmpty()) {
      throw conflict("Không xác định được chứng từ hàng đã xuất của đơn hàng");
    }

    Map<Long, Integer> exportedTotals = new TreeMap<>();
    for (TheKho movement : exports) {
      if (movement.getSoLuongThayDoi() == null || movement.getSoLuongThayDoi() >= 0) {
        throw conflict("Chứng từ xuất bán của đơn hàng không hợp lệ");
      }
      mergeVariant(
          exportedTotals,
          movement.getPhienBan().getId(),
          bounded(-(long) movement.getSoLuongThayDoi()));
    }

    if (!exportedTotals.equals(expectedTotals)) {
      throw conflict("Hàng trong đơn không khớp chứng từ xuất bán");
    }
  }

  private Map<Long, Integer> totals(Map<ItemKey, Expected> expected) {
    Map<Long, Integer> result = new TreeMap<>();
    for (Expected item : expected.values()) {
      mergeVariant(result, item.variant().getId(), item.quantity());
    }
    return result;
  }

  private AdminReturnResponse.ReceivedItem toReceivedItem(
      AdminReturnReceiveRequest.Item item) {

    return AdminReturnResponse.ReceivedItem.builder()
        .chiTietDonHangId(item.getChiTietDonHangId())
        .phienBanId(item.getPhienBanId())
        .khoHangId(item.getKhoHangId())
        .soLuongNguyenVen(item.getSoLuongNguyenVen())
        .soLuongLoi(item.getSoLuongLoi())
        .serials(
            item.getSerials().stream()
                .map(
                    serial ->
                        AdminReturnResponse.ReceivedSerial.builder()
                            .soSerialId(serial.getSoSerialId())
                            .trangThai(serial.getTrangThaiSauNhan())
                            .donHangId(null)
                            .build())
                .toList())
        .build();
  }

  private void validateStock(TonKho stock) {
    Integer physical = stock.getTonThucTe();
    Integer available = stock.getTonCoTheBan();
    Integer damaged = stock.getHangLoi();

    if (physical == null
        || available == null
        || damaged == null
        || physical < 0
        || available < 0
        || damaged < 0
        || (long) available + damaged > physical) {
      throw conflict("Dữ liệu tồn kho không hợp lệ, cần đối chiếu trước khi nhận hàng");
    }
  }

  private int requiredQuantity(Integer quantity) {
    if (quantity == null || quantity <= 0) {
      throw conflict("Số lượng sản phẩm không hợp lệ");
    }
    return quantity;
  }

  private Comparator<StockKey> stockKeyComparator() {
    return Comparator.comparing(StockKey::warehouseId).thenComparing(StockKey::variantId);
  }

  private void mergeStock(Map<StockKey, Integer> map, StockKey key, int value) {
    map.put(key, bounded((long) map.getOrDefault(key, 0) + value));
  }

  private void mergeVariant(Map<Long, Integer> map, Long key, int value) {
    map.put(key, bounded((long) map.getOrDefault(key, 0) + value));
  }

  private int bounded(long value) {
    if (value < 0 || value > Integer.MAX_VALUE) {
      throw conflict("Số lượng vượt giới hạn lưu trữ");
    }
    return (int) value;
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException notFound(String message) {
    return new AppException(ErrorCode.NOT_FOUND, message);
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }
}
