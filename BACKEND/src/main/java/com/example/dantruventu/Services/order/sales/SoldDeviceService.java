package com.example.dantruventu.Services.order.sales;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.DTO.Response.order.SoldDeviceData;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Services.warehouse.RecallSafety;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SoldDeviceService {

  public record Key(Long lineId, Long variantId) {}

  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;
  private final ChiTietDonHangRepository lines;
  private final OrderSaleSnapshotService snapshots;
  private final SalesProperties properties;
  private final RecallSafety recallSafety;

  @Transactional(propagation = Propagation.MANDATORY)
  public void prepare(
      DonHang order, List<ChiTietDonHang> orderLines, Map<Key, List<SoSerialSanPham>> allocations) {

    long existing =
        entityManager
            .createQuery(
                """
                                select count(d) from ThietBiBaoHanh d
                                where d.chiTietDonHang.donHang.id = :id
                                """,
                Long.class)
            .setParameter("id", order.getId())
            .getSingleResult();

    if (existing != 0) {
      throw conflict("Đơn đã có nhận dạng thiết bị");
    }

    Set<Key> expectedSerialGroups = new HashSet<>();
    Set<Long> usedSerialIds = new HashSet<>();

    for (var line : orderLines) {
      if (!stored(line).isEmpty()) {
        throw conflict("Dòng đơn đã có dữ liệu thiết bị xuất");
      }

      List<SoldDeviceData> exported = new ArrayList<>();

      for (var unit : snapshots.physical(line).values()) {
        Key key = new Key(line.getId(), unit.variantId());
        List<SoSerialSanPham> selected = allocations.getOrDefault(key, List.of());

        if (unit.serialManaged()) {
          expectedSerialGroups.add(key);

          if (selected.size() != unit.quantity()) {
            throw conflict("Thiếu hoặc thừa serial cho linh kiện");
          }
        } else if (!selected.isEmpty()) {
          throw conflict("Phiên bản không quản lý serial");
        }

        for (int index = 0; index < unit.quantity(); index++) {
          SoSerialSanPham serial = unit.serialManaged() ? selected.get(index) : null;

          if (serial != null
              && (!Objects.equals(serial.getPhienBan().getId(), unit.variantId())
                  || !usedSerialIds.add(serial.getId()))) {
            throw conflict("Serial sai phiên bản hoặc bị phân bổ trùng");
          }

          if (serial != null) {
            recallSafety.requireSerialClear(serial);
          }

          var device =
              ThietBiBaoHanh.builder()
                  .maTheoDoi("TB-" + UUID.randomUUID())
                  .chiTietDonHang(line)
                  .phienBan(entityManager.getReference(PhienBanSanPham.class, unit.variantId()))
                  .soSerial(serial)
                  .build();

          entityManager.persist(device);

          exported.add(
              new SoldDeviceData(
                  device.getId(),
                  device.getMaTheoDoi(),
                  line.getId(),
                  unit.variantId(),
                  unit.productName(),
                  unit.variantName(),
                  serial == null ? null : serial.getId(),
                  serial == null ? null : serial.getSoSerial(),
                  unit.warrantyMonths(),
                  null,
                  null));
        }
      }

      save(line, exported);
    }

    if (!allocations.keySet().equals(expectedSerialGroups)) {
      throw conflict("Phân bổ serial không khớp các dòng hàng đã chốt");
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void handover(DonHang order) {
    if (order.getNgayHoanThanh() != null) return;

    if (order.getTrangThaiDonHang()
        != com.example.dantruventu.Enum.TrangThaiDonHang.DANG_GIAO_HANG) {
      recallSafety.requireOrderClear(order.getId());
    }

    var orderLines = lines.findByDonHang_IdOrderByIdAsc(order.getId());

    LocalDateTime actualTime = LocalDateTime.now(properties.zone());

    List<SoldDeviceData> all = orderLines.stream().flatMap(line -> stored(line).stream()).toList();

    Set<Long> serialIds = new TreeSet<>();
    all.stream().map(SoldDeviceData::soSerialId).filter(Objects::nonNull).forEach(serialIds::add);

    Map<Long, SoSerialSanPham> lockedSerials = new HashMap<>();

    for (Long serialId : serialIds) {
      var serial =
          entityManager.find(SoSerialSanPham.class, serialId, LockModeType.PESSIMISTIC_WRITE);

      if (serial == null
          || serial.getDonHang() == null
          || !Objects.equals(serial.getDonHang().getId(), order.getId())
          || serial.getTrangThai() != TrangThaiSerial.DA_BAN) {
        throw conflict("Không xác minh được serial thực tế bàn giao");
      }

      lockedSerials.put(serialId, serial);
    }

    for (var line : orderLines) {
      List<SoldDeviceData> exported = stored(line);

      int expected =
          snapshots.physical(line).values().stream()
              .mapToInt(OrderSaleSnapshotService.PhysicalItem::quantity)
              .sum();

      if (exported.size() != expected) {
        throw conflict(
            "Thiếu nhận dạng thiết bị của dòng " + line.getId() + "; cần xác minh trước bàn giao");
      }

      List<SoldDeviceData> activated = new ArrayList<>();

      for (var row : exported) {
        var device = entityManager.find(ThietBiBaoHanh.class, row.thietBiId());

        if (device == null
            || !Objects.equals(device.getChiTietDonHang().getId(), line.getId())
            || !Objects.equals(device.getPhienBan().getId(), row.phienBanId())
            || device.getNgayKichHoat() != null) {
          throw conflict("Nhận dạng thiết bị không nhất quán");
        }

        Integer months = row.thoiHanBaoHanhThang();

        LocalDateTime deadline =
            months != null && months > 0 ? actualTime.plusMonths(months) : null;

        device.setNgayKichHoat(actualTime);
        device.setHanBaoHanh(deadline);

        if (row.soSerialId() != null) {
          var serial = lockedSerials.get(row.soSerialId());
          serial.setNgayKichHoat(actualTime);
          serial.setHanBaoHanh(deadline);
        }

        activated.add(
            new SoldDeviceData(
                row.thietBiId(),
                row.maTheoDoi(),
                row.chiTietDonHangId(),
                row.phienBanId(),
                row.tenSanPham(),
                row.tenPhienBan(),
                row.soSerialId(),
                row.soSerial(),
                months,
                actualTime.atZone(properties.zone()).toOffsetDateTime(),
                deadline == null ? null : deadline.atZone(properties.zone()).toOffsetDateTime()));
      }

      save(line, activated);
    }

    order.setNgayHoanThanh(actualTime);
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void markReturned(DonHang order, Map<Long, ChiTietTraHang> returnLinesByOrderLine) {

    var originalDevices = details(order.getId());

    if (originalDevices.isEmpty()) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Thiếu nhận dạng thiết bị của lần xuất gốc");
    }

    Map<Long, SoldDeviceData> originals = new TreeMap<>();

    for (var row : originalDevices) {
      if (row.thietBiId() == null || originals.putIfAbsent(row.thietBiId(), row) != null) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Nhận dạng thiết bị xuất gốc bị thiếu hoặc trùng");
      }
    }

    for (var entry : originals.entrySet()) {
      SoldDeviceData original = entry.getValue();

      ThietBiBaoHanh device =
          entityManager.find(ThietBiBaoHanh.class, entry.getKey(), LockModeType.PESSIMISTIC_WRITE);

      if (device == null) {
        throw new AppException(ErrorCode.UNPROCESSABLE_ENTITY, "Không tìm thấy thiết bị xuất gốc");
      }

      entityManager.refresh(device);

      ChiTietTraHang returnLine = returnLinesByOrderLine.get(original.chiTietDonHangId());

      if (returnLine == null
          || !Objects.equals(device.getChiTietDonHang().getId(), original.chiTietDonHangId())
          || !Objects.equals(device.getChiTietDonHang().getDonHang().getId(), order.getId())
          || !Objects.equals(device.getPhienBan().getId(), original.phienBanId())) {

        throw new AppException(ErrorCode.UNPROCESSABLE_ENTITY, "Thiết bị không khớp dòng xuất gốc");
      }

      if (device.getChiTietTraHang() != null) {
        throw conflict("Thiết bị đã được nhận trả");
      }

      // Luồng này nhận lại hàng giao thất bại, chưa bàn giao cho khách.
      if (device.getNgayKichHoat() != null || device.getHanBaoHanh() != null) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Thiết bị đã có mốc bảo hành; cần xác minh lịch sử giao nhận");
      }

      device.setChiTietTraHang(returnLine);
    }
  }

  public List<SoldDeviceData> details(Long orderId) {
    return lines.findByDonHang_IdOrderByIdAsc(orderId).stream()
        .flatMap(line -> stored(line).stream())
        .toList();
  }

  public List<AdminSalesResponse.Serial> originalSerials(Long orderId) {
    Map<Long, AdminSalesResponse.Serial> result = new LinkedHashMap<>();

    for (var row : details(orderId)) {
      if (row.soSerialId() != null) {
        result.putIfAbsent(
            row.soSerialId(),
            new AdminSalesResponse.Serial(
                row.soSerialId(), row.phienBanId(), row.soSerial(), TrangThaiSerial.DA_BAN));
      }
    }

    return List.copyOf(result.values());
  }

  public String warning(DonHang order) {
    if (order.getTrangThaiXuatKho() == TrangThaiXuatKho.CHUA_XUAT_KHO) {
      return null;
    }

    boolean missing =
        lines.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .anyMatch(line -> stored(line).isEmpty());

    return missing ? "Đơn cũ chưa có đủ nhận dạng thiết bị xuất; cần xác minh." : null;
  }

  private List<SoldDeviceData> stored(ChiTietDonHang line) {
    if (text(line.getCauHinhDaBan()) == null) return List.of();

    try {
      var node = objectMapper.readTree(line.getCauHinhDaBan()).path("thiet_bi_da_xuat");

      if (!node.isArray()) return List.of();

      SoldDeviceData[] result = objectMapper.readValue(node.toString(), SoldDeviceData[].class);

      for (var row : result) {
        if (!Objects.equals(row.chiTietDonHangId(), line.getId())) {
          return List.of();
        }
      }

      return List.of(result);
    } catch (RuntimeException exception) {
      return List.of();
    }
  }

  @SuppressWarnings("unchecked")
  private void save(ChiTietDonHang line, List<SoldDeviceData> devices) {

    Map<String, Object> snapshot =
        objectMapper.readValue(line.getCauHinhDaBan(), LinkedHashMap.class);

    snapshot.put("thiet_bi_da_xuat", devices);

    line.setCauHinhDaBan(objectMapper.writeValueAsString(snapshot));
  }
}
