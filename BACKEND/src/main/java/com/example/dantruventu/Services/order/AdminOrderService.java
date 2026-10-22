package com.example.dantruventu.Services.order;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.order.AdminOrderResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Mapper.order.AdminOrderMapper;
import com.example.dantruventu.Mapper.order.AdminSalesMapper;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.*;
import com.example.dantruventu.Repository.partner.DoiTacVanChuyenRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.order.sales.*;
import com.example.dantruventu.Services.order.sales.SoldDeviceService;
import com.example.dantruventu.Services.warranty.WarrantyDeviceResolver;
import com.example.dantruventu.Specification.OrderSpecification;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.criteria.JoinType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
public class AdminOrderService {

  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository lineRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final LichSuXuLyDonHangRepository historyRepository;
  private final DoiTacVanChuyenRepository partnerRepository;
  private final AnhSanPhamRepository imageRepository;
  private final PhienBanSanPhamRepository variantRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final LoaiThuChiRepository cashTypeRepository;
  private final SoQuyThuChiRepository cashRepository;

  private final AdminOrderMapper mapper;
  private final AdminSalesMapper salesMapper;
  private final AdminSalesService salesService;
  private final SalesCalculationService calculation;
  private final SalesContext context;
  private final SalesProperties properties;
  private final OrderInventoryService inventory;
  private final DeliveryInventoryService deliveryInventory;
  private final EntityManager entityManager;
  private final CashbookService cashbookService;
  private final OrderEvents orderEvents;
  private final OrderSaleSnapshotService saleSnapshots;
  private final SalesQuoteService saleQuotes;
  private final SoldDeviceService soldDevices;
  private final OrderDeviceHistoryService orderDeviceHistory;
  private final PhieuTraHangRepository returnRepository;
  private final WarrantyDeviceResolver warrantyDeviceResolver;
  private final ObjectMapper objectMapper;

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action counterExchange(
      Long id, String idempotencyKey, AdminOrderRequest.CounterExchange request) {

    validateId(id);

    if (!Boolean.TRUE.equals(request.getXacNhan())) {
      throw invalid("Phải xác nhận lỗi tại quầy và việc nhận, đổi thiết bị");
    }

    NguoiDung actor = context.actor();

    return cashbookService.executeOnce(
        paymentRequestKey("DH-DOA-", idempotencyKey),
        actor,
        Map.of("order_id", id, "request", request),
        AdminOrderResponse.Action.class,
        () -> doCounterExchange(id, request, actor));
  }

  private AdminOrderResponse.Action doCounterExchange(
      Long id, AdminOrderRequest.CounterExchange request, NguoiDung actor) {

    DonHang order = lockOrder(id);

    if (orderDeviceHistory.counterInspectionClosed(order.getId())) {
      throw conflict(
          "Đơn đã kết thúc kiểm tra tại quầy. "
              + "Lỗi phát sinh tiếp theo phải xử lý qua luồng bảo hành.");
    }

    boolean atCounter =
        order.getLoaiDonHang() == LoaiDonHang.TAI_QUAY
            || (order.getLoaiDonHang() == LoaiDonHang.ONLINE && !shipping(order));

    if (!atCounter
        || order.getTrangThaiDonHang() != TrangThaiDonHang.HOAN_THANH
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO
        || order.getNgayHoanThanh() == null
        || inventory.hasAnyQuantityReservation(order)
        || !lockDeliveries(order).isEmpty()) {

      throw conflict("Chỉ đổi lỗi cho đơn đã hoàn tất, thu đủ tiền và nhận tại cửa hàng");
    }

    var plan = inventory.plan(order, true);

    if (returnRepository.findByDonHang_IdOrderByIdAsc(id).stream()
        .anyMatch(p -> p.getTrangThaiTraHang() != TrangThaiTraHang.HUY)) {

      throw conflict("Đơn đã có phiếu trả hàng, cần xử lý theo phiếu hiện có");
    }

    var evidence = requireMoneyEvidence(order);

    if (((BigDecimal) evidence.get("so_tien_thuc_thu")).compareTo(money(order.getTongThanhToan()))
            != 0
        || ((BigDecimal) evidence.get("so_tien_da_hoan")).signum() != 0) {

      throw conflict("Chưa đủ căn cứ đã thu đủ tiền và chưa hoàn tiền");
    }

    ThietBiBaoHanh oldDevice =
        entityManager.find(
            ThietBiBaoHanh.class, request.getThietBiId(), LockModeType.PESSIMISTIC_WRITE);

    if (oldDevice == null) {
      throw notFound("Không tìm thấy thiết bị cần đổi");
    }

    entityManager.refresh(oldDevice);

    if (!Objects.equals(oldDevice.getChiTietDonHang().getDonHang().getId(), id)
        || oldDevice.getChiTietTraHang() != null
        || oldDevice.getNgayKichHoat() == null) {

      throw conflict("Thiết bị không thuộc quyền đang thực hiện của đơn");
    }

    var state = warrantyDeviceResolver.resolve(oldDevice);

    if (!state.hienHanh() || !state.lyDoChan().isEmpty()) {
      throw conflict("Thiết bị đã đổi, đã trả hoặc đang được xử lý bảo hành");
    }

    boolean traced = false;

    for (var original : soldDevices.details(id)) {
      var root = entityManager.find(ThietBiBaoHanh.class, original.thietBiId());

      if (root != null) {
        var current = warrantyDeviceResolver.resolve(root).thietBiHienHanh();

        if (current != null && Objects.equals(current.getId(), oldDevice.getId())) {
          traced = true;
          break;
        }
      }
    }

    if (!traced) {
      throw conflict("Thiết bị không có liên kết với lần xuất gốc");
    }

    long openWarranties =
        entityManager
            .createQuery(
                """
                                SELECT COUNT(w) FROM PhieuBaoHanh w
                                WHERE w.trangThaiXuLy <> :completed
                                  AND (
                                    w.thietBi = :device
                                    OR w.thietBiThayThe = :device
                                  )
                                """,
                Long.class)
            .setParameter("completed", TrangThaiBaoHanh.HOAN_TAT)
            .setParameter("device", oldDevice)
            .getSingleResult();

    if (openWarranties != 0) {
      throw conflict("Thiết bị đang có phiếu bảo hành chưa hoàn tất");
    }

    Long variantId = oldDevice.getPhienBan().getId();

    var physical = saleSnapshots.physical(oldDevice.getChiTietDonHang()).get(variantId);

    if (physical == null || !plan.quantities().containsKey(variantId)) {
      throw conflict("Thiết bị không khớp cấu hình hàng đã bán");
    }

    context.warehouse(context.defaultWarehouseId());

    TonKho stock = calculation.stock(context.defaultWarehouseId(), variantId, true);

    if (stock == null || stock.getTonCoTheBan() <= 0) {
      throw conflict("Chưa có hàng có thể bán để đổi ngay cho khách");
    }

    long held =
        (long) stock.getTonThucTe()
            - stock.getHangLoi()
            - stock.getSoLuongGiuChoBaoHanh()
            - stock.getTonCoTheBan();

    if (held != inventory.expectedHeld(variantId)) {
      throw conflict("Tồn giữ hàng không nhất quán, cần đối soát");
    }

    boolean managed = physical.serialManaged();
    String newSerialText = text(request.getSoSerialMoi());
    String identification = text(request.getDauHieuNhanDangMoi());

    SoSerialSanPham replacementSerial = null;

    if (managed) {
      if (oldDevice.getSoSerial() == null || newSerialText == null) {
        throw invalid("Phải cung cấp serial mới cho sản phẩm quản lý serial");
      }

      var candidate =
          serialRepository
              .findBySoSerial(newSerialText)
              .orElseThrow(() -> notFound("Serial mới không tồn tại"));

      Long oldSerialId = oldDevice.getSoSerial().getId();

      if (Objects.equals(oldSerialId, candidate.getId())) {
        throw invalid("Serial mới phải khác serial thiết bị lỗi");
      }

      Map<Long, SoSerialSanPham> locked = new TreeMap<>();

      for (Long serialId : new TreeSet<>(Set.of(oldSerialId, candidate.getId()))) {

        var serial =
            serialRepository
                .findByIdForUpdate(serialId)
                .orElseThrow(() -> notFound("Serial không còn tồn tại"));

        entityManager.refresh(serial);
        locked.put(serialId, serial);
      }

      var oldSerial = locked.get(oldSerialId);
      replacementSerial = locked.get(candidate.getId());

      if (oldSerial.getTrangThai() != TrangThaiSerial.DA_BAN) {
        throw conflict(
            "Serial cũ "
                + oldSerial.getSoSerial()
                + " phải đang DA_BAN; hiện tại: "
                + oldSerial.getTrangThai());
      }

      if (oldSerial.getDonHang() == null || !Objects.equals(oldSerial.getDonHang().getId(), id)) {
        throw conflict(
            "Serial cũ " + oldSerial.getSoSerial() + " không được liên kết với đơn " + id);
      }

      if (oldSerial.getChiTietDongGoi() != null) {
        throw conflict(
            "Serial cũ "
                + oldSerial.getSoSerial()
                + " vẫn còn liên kết đóng gói #"
                + oldSerial.getChiTietDongGoi().getId());
      }

      if (!Objects.equals(oldSerial.getPhienBan().getId(), variantId)) {
        throw conflict("Serial cũ không cùng phiên bản với thiết bị");
      }

      if (!sameWarrantyTimestamp(oldSerial.getNgayKichHoat(), oldDevice.getNgayKichHoat())) {

        throw conflict(
            "Ngày kích hoạt không khớp: serial="
                + oldSerial.getNgayKichHoat()
                + "; thiết bị="
                + oldDevice.getNgayKichHoat());
      }

      if (!sameWarrantyTimestamp(oldSerial.getHanBaoHanh(), oldDevice.getHanBaoHanh())) {

        throw conflict(
            "Hạn bảo hành không khớp: serial="
                + oldSerial.getHanBaoHanh()
                + "; thiết bị="
                + oldDevice.getHanBaoHanh());
      }

      if (!Objects.equals(replacementSerial.getSoSerial(), newSerialText)
          || !Objects.equals(replacementSerial.getPhienBan().getId(), variantId)
          || replacementSerial.getTrangThai() != TrangThaiSerial.TRONG_KHO
          || replacementSerial.getDonHang() != null
          || replacementSerial.getChiTietDongGoi() != null
          || replacementSerial.getNgayKichHoat() != null
          || replacementSerial.getHanBaoHanh() != null) {

        throw conflict("Serial mới phải cùng phiên bản, còn trong kho và chưa được giữ");
      }

    } else if (oldDevice.getSoSerial() != null || newSerialText != null || identification == null) {

      throw invalid("Sản phẩm không quản lý serial phải có dấu hiệu nhận dạng thiết bị mới");
    }

    var replacement =
        ThietBiBaoHanh.builder()
            .maTheoDoi("TB-" + UUID.randomUUID())
            .chiTietDonHang(oldDevice.getChiTietDonHang())
            .phienBan(oldDevice.getPhienBan())
            .soSerial(replacementSerial)
            .dauHieuNhanDang(identification)
            .ngayKichHoat(oldDevice.getNgayKichHoat())
            .hanBaoHanh(oldDevice.getHanBaoHanh())
            .build();

    if (replacement.getSoSerial() != null) {
      Long usedInOrder =
          entityManager
              .createQuery(
                  """
                                  SELECT COUNT(d) FROM ThietBiBaoHanh d
                                  WHERE d.chiTietDonHang.donHang.id = :orderId
                                    AND d.soSerial.id = :serialId
                                  """,
                  Long.class)
              .setParameter("orderId", order.getId())
              .setParameter("serialId", replacement.getSoSerial().getId())
              .getSingleResult();

      if (usedInOrder > 0) {
        throw conflict(
            "Serial thay thế đã từng được giao trong đơn này. "
                + "Không được quay lại serial cũ trong chuỗi đổi.");
      }
    }

    entityManager.persist(replacement);

    var ticket =
        PhieuBaoHanh.builder()
            .maPhieu("BH-DOA-" + UUID.randomUUID())
            .donHang(order)
            .khachHang(order.getKhachHang())
            .nhanVien(actor)
            .soSerial(oldDevice.getSoSerial())
            .thietBi(oldDevice)
            .thietBiThayThe(replacement)
            .lyDoBaoHanh(request.getLyDo().strip())
            .tinhTrangTiepNhan("Lỗi phát hiện khi bóc seal, kiểm tra tại quầy")
            .ketLuanKiemTra(request.getLyDo().strip())
            .tenNguoiLienHe(request.getTenNguoiLienHe().strip())
            .sdtNguoiLienHe(request.getSdtNguoiLienHe().strip())
            .trangThaiXuLy(TrangThaiBaoHanh.HOAN_TAT)
            .ketQuaXuLy(KetQuaXuLyBaoHanh.DOI_SAN_PHAM)
            .nguonSanPhamThayThe(NguonSanPhamThayTheBaoHanh.TON_KHO_CUA_HANG)
            .ghiChu("Đổi 1-1 lỗi tại quầy; giữ nguyên đơn và khoản thu")
            .build();

    entityManager.persist(ticket);

    stock.setTonThucTe(quantity((long) stock.getTonThucTe() + 1));

    stock.setHangLoi(quantity((long) stock.getHangLoi() + 1));

    counterMovement(stock, ticket, LoaiGiaoDichKho.KHACH_TRA, 1, "Nhận thiết bị lỗi tại quầy");

    stock.setTonThucTe(stock.getTonThucTe() - 1);
    stock.setTonCoTheBan(stock.getTonCoTheBan() - 1);

    counterMovement(
        stock, ticket, LoaiGiaoDichKho.XUAT_DOI_BAO_HANH, -1, "Xuất đổi 1-1 lỗi tại quầy");

    if (managed) {
      var oldSerial = oldDevice.getSoSerial();

      oldSerial.setTrangThai(TrangThaiSerial.LOI);
      oldSerial.setDonHang(null);
      oldSerial.setNgayKichHoat(null);
      oldSerial.setHanBaoHanh(null);

      replacementSerial.setTrangThai(TrangThaiSerial.DA_BAN);
      replacementSerial.setDonHang(order);
      replacementSerial.setNgayKichHoat(replacement.getNgayKichHoat());
      replacementSerial.setHanBaoHanh(replacement.getHanBaoHanh());
    }

    recordCounterExchange(ticket, actor, request.getLyDo().strip());

    recordHistory(
        order,
        "DOI_1_1_LOI_TAI_QUAY",
        "Đổi thiết bị "
            + oldDevice.getMaTheoDoi()
            + " → "
            + replacement.getMaTheoDoi()
            + "; phiếu "
            + ticket.getMaPhieu()
            + "; lý do: "
            + request.getLyDo().strip());

    return action(order);
  }

  private void counterMovement(
      TonKho stock, PhieuBaoHanh ticket, LoaiGiaoDichKho type, int delta, String note) {

    entityManager.persist(
        TheKho.builder()
            .khoHang(stock.getKhoHang())
            .phienBan(stock.getPhienBan())
            .loaiGiaoDich(type)
            .maChungTuGoc(ticket.getId())
            .phieuBaoHanh(ticket)
            .soLuongThayDoi(delta)
            .tonCuoi(stock.getTonThucTe())
            .ghiChu(note + " - " + ticket.getMaPhieu())
            .build());
  }

  private boolean sameWarrantyTimestamp(LocalDateTime serialTime, LocalDateTime deviceTime) {

    if (serialTime == null || deviceTime == null) {
      return Objects.equals(serialTime, deviceTime);
    }

    return java.time.Duration.between(serialTime, deviceTime)
            .abs()
            .compareTo(java.time.Duration.ofSeconds(1))
        < 0;
  }

  private Map<String, Object> counterDeviceSnapshot(ThietBiBaoHanh device) {

    Map<String, Object> result = new LinkedHashMap<>();

    result.put("id", device.getId());
    result.put("ma_theo_doi", device.getMaTheoDoi());
    result.put("phien_ban_id", device.getPhienBan().getId());

    result.put("so_serial_id", device.getSoSerial() == null ? null : device.getSoSerial().getId());

    result.put(
        "so_serial", device.getSoSerial() == null ? null : device.getSoSerial().getSoSerial());

    result.put(
        "ngay_kich_hoat",
        device.getNgayKichHoat() == null
            ? null
            : device.getNgayKichHoat().atZone(properties.zone()).toOffsetDateTime().toString());

    result.put(
        "han_bao_hanh",
        device.getHanBaoHanh() == null
            ? null
            : device.getHanBaoHanh().atZone(properties.zone()).toOffsetDateTime().toString());

    result.put("can_cu_tinh_han", "Giữ nguyên mốc bảo hành của đơn gốc");

    return result;
  }

  private void recordCounterExchange(PhieuBaoHanh ticket, NguoiDung actor, String reason) {

    var oldDevice = ticket.getThietBi();
    var replacement = ticket.getThietBiThayThe();

    String at = now().atZone(properties.zone()).toOffsetDateTime().toString();

    Map<String, Object> received = new LinkedHashMap<>();

    received.put("thoi_diem", at);
    received.put("thiet_bi", counterDeviceSnapshot(oldDevice));

    received.put(
        "giao_nhan",
        Map.of(
            "su_kien",
            "NHAN_LOI_TAI_QUAY",
            "thiet_bi_id",
            oldDevice.getId(),
            "ngay",
            at,
            "ly_do",
            reason));

    received.put("noi_dang_giu", Map.of("loai", "CUA_HANG", "thiet_bi_id", oldDevice.getId()));

    counterWarrantyEvent(ticket, actor, "BOC_SEAL_LOI", "Nhận thiết bị lỗi tại quầy", received);

    Map<String, Object> exchange = new LinkedHashMap<>();

    exchange.put("phien_ban", 1);
    exchange.put("da_duyet", true);
    exchange.put("khach_dong_y", true);
    exchange.put("nguon", NguonSanPhamThayTheBaoHanh.TON_KHO_CUA_HANG.name());
    exchange.put("thiet_bi_cu_id", oldDevice.getId());
    exchange.put("thiet_bi_thay_the_id", replacement.getId());
    exchange.put("han_bao_hanh_ap_dung", counterDeviceSnapshot(replacement).get("han_bao_hanh"));
    exchange.put("da_ban_giao", true);

    Map<String, Object> handed = new LinkedHashMap<>();

    handed.put("thoi_diem", at);
    handed.put("phuong_an_doi", exchange);
    handed.put("thiet_bi_hien_hanh", counterDeviceSnapshot(replacement));

    handed.put(
        "giao_nhan",
        Map.of(
            "su_kien",
            "BAN_GIAO_DOI_TAI_QUAY",
            "thiet_bi_id",
            replacement.getId(),
            "thiet_bi_cu_id",
            oldDevice.getId(),
            "thiet_bi_thay_the_id",
            replacement.getId(),
            "ngay",
            at,
            "thoi_diem",
            at));

    handed.put("noi_dang_giu", Map.of("loai", "KHACH_HANG", "thiet_bi_id", replacement.getId()));

    handed.put(
        "noi_dang_giu_thiet_bi_cu", Map.of("loai", "CUA_HANG", "thiet_bi_id", oldDevice.getId()));

    counterWarrantyEvent(ticket, actor, "HANDOVER", "Bàn giao thiết bị đổi 1-1 tại quầy", handed);
  }

  private void counterWarrantyEvent(
      PhieuBaoHanh ticket, NguoiDung actor, String type, String note, Map<String, Object> data) {

    entityManager.persist(
        LichSuBaoHanh.builder()
            .phieuBaoHanh(ticket)
            .nguoiThucHien(actor)
            .loaiSuKien(type)
            .noiDung(note)
            .duLieuChiTiet(objectMapper.writeValueAsString(data))
            .build());
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action completeCounterInspection(
      Long id, String idempotencyKey, AdminOrderRequest.Confirm request) {

    validateId(id);

    if (!Boolean.TRUE.equals(request.getXacNhan())) {
      throw invalid("Phải xác nhận đã kết thúc kiểm tra tại quầy");
    }

    return cashbookService.executeOnce(
        paymentRequestKey("DH-KTQ-", idempotencyKey),
        context.actor(),
        Map.of("order_id", id, "request", request),
        AdminOrderResponse.Action.class,
        () -> {
          DonHang order = lockOrder(id);

          boolean atCounter =
              order.getLoaiDonHang() == LoaiDonHang.TAI_QUAY
                  || (order.getLoaiDonHang() == LoaiDonHang.ONLINE && !shipping(order));

          if (!atCounter
              || order.getTrangThaiDonHang() != TrangThaiDonHang.HOAN_THANH
              || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN
              || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
              || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO
              || order.getNgayHoanThanh() == null
              || !lockDeliveries(order).isEmpty()) {
            throw conflict("Chỉ kết thúc kiểm tra cho đơn đã hoàn tất và nhận tại cửa hàng");
          }

          if (orderDeviceHistory.counterInspectionClosed(id)) {
            return action(order);
          }

          var view = orderDeviceHistory.read(order);

          if (view.needsVerification() || view.current().isEmpty()) {
            throw conflict("Chưa xác minh đủ thiết bị hiện hành để kết thúc kiểm tra");
          }

          recordHistory(
              order,
              "KET_THUC_KIEM_TRA_TAI_QUAY",
              "Đã kết thúc kiểm tra, bàn giao tại quầy; "
                  + "lỗi phát sinh tiếp theo xử lý qua bảo hành.");

          return action(order);
        });
  }

  private boolean matchesOrderMoneyCode(String code, String prefix, Long orderId) {

    String base = prefix + orderId;

    return Objects.equals(code, base)
        || (code != null
            && code.startsWith(base + "-")
            && code.substring(base.length() + 1).matches("[0-9a-f]{16}"));
  }

  private String newOrderMoneyCode(
      String prefix, DonHang order, String method, String transaction) {

    String reference = text(transaction);
    UUID identifier;

    if (!"TIEN_MAT".equals(method) && reference != null) {
      String identity = method + "|" + reference.toUpperCase(Locale.ROOT);

      identifier =
          UUID.nameUUIDFromBytes(identity.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    } else {
      identifier = UUID.randomUUID();
    }

    String suffix = identifier.toString().replace("-", "").substring(0, 16);

    return prefix + order.getId() + "-" + suffix;
  }

  private Map<String, Object> requireMoneyEvidence(DonHang order) {
    Map<String, Object> evidence = failedDeliveryMoney(order);

    if (!Boolean.TRUE.equals(evidence.get("co_du_can_cu"))) {
      throw conflict(
          "Chứng từ tiền chưa đủ căn cứ đối soát. " + "Không ghi nhận thêm tiền hoặc hoàn tiền.");
    }

    return evidence;
  }

  public BigDecimal remainingForCod(DonHang order) {
    Map<String, Object> evidence = requireMoneyEvidence(order);

    BigDecimal refunded = (BigDecimal) evidence.get("so_tien_da_hoan");

    if (refunded.signum() != 0) {
      throw conflict("Đơn đang thực hiện đã có khoản hoàn tiền, cần đối soát.");
    }

    BigDecimal received = (BigDecimal) evidence.get("so_tien_thuc_thu");

    return money(order.getTongThanhToan()).subtract(received);
  }

  private Map<String, Object> paymentSummary(DonHang order) {
    Map<String, Object> result = new LinkedHashMap<>(failedDeliveryMoney(order));

    BigDecimal total = money(order.getTongThanhToan());
    boolean verified = Boolean.TRUE.equals(result.get("co_du_can_cu"));

    BigDecimal remaining = null;

    if (verified) {
      remaining = total.subtract((BigDecimal) result.get("so_tien_thuc_thu"));
    }

    result.put("tong_thanh_toan", total);

    // Đơn hủy không còn khoản phải thu từ khách.
    // Giới hạn ghi nhận tiền đến muộn vẫn dựa trên tổng thực thu.
    result.put(
        "so_tien_con_phai_thu",
        verified
            ? (order.getTrangThaiDonHang() == TrangThaiDonHang.HUY_HANG
                ? BigDecimal.ZERO
                : remaining)
            : null);

    result.put("gioi_han_thu", remaining);

    List<Map<String, Object>> receipts = new ArrayList<>();

    for (SoQuyThuChi voucher : orderMoneyDocuments(order)) {
      if (voucher.getLoaiPhieu() != LoaiPhieuThuChi.THU) {
        continue;
      }

      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", voucher.getId());
      item.put("ma_phieu", voucher.getMaPhieu());
      item.put("so_tien", voucher.getSoTien());
      item.put("phuong_thuc_thanh_toan", voucher.getPhuongThucThanhToan());
      item.put(
          "ngay_ghi_nhan",
          voucher.getNgayGhiNhan() == null
              ? null
              : voucher.getNgayGhiNhan().atZone(properties.zone()).toOffsetDateTime());
      item.put("mo_ta", voucher.getMoTa());

      receipts.add(item);
    }

    result.put("phieu_thu", receipts);
    return result;
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public Map<String, Object> screen(Long id) {
    validateId(id);
    NguoiDung actor = context.actor();

    Map<String, Object> result = new LinkedHashMap<>();

    var detail = detail(id);

    if (detail.getDoiSoatThanhToan() == null) {
      detail.setDoiSoatThanhToan(paymentSummary(findOrder(id)));
    }

    result.put("don_hang", detail);
    result.put("lich_su", history(id));

    boolean admin = actor.getVaiTro() != null && "ADMIN".equals(actor.getVaiTro().getTenVaiTro());

    result.put("hoan_tien", admin ? refundOptions(id) : null);

    return result;
  }

  public AdminSalesResponse.Order detail(Long id) {
    context.actor();

    DonHang order = findOrder(id);
    AdminSalesResponse.Order response = salesService.getOrder(id);

    if (order.getLoaiDonHang() == LoaiDonHang.ONLINE) {
      response.setDoiSoatThanhToan(paymentSummary(order));
    }

    return response;
  }

  private List<SoQuyThuChi> orderMoneyDocuments(DonHang order) {
    Map<Long, SoQuyThuChi> documents = new TreeMap<>();

    for (SoQuyThuChi voucher : cashRepository.findByMaChungTuThamChieu(order.getMaDonHang())) {
      documents.put(voucher.getId(), voucher);
    }

    for (String prefix : List.of("THU-DH-", "CHI-HUY-DH-")) {
      String base = prefix + order.getId();

      cashRepository
          .findByMaPhieu(base)
          .ifPresent(voucher -> documents.put(voucher.getId(), voucher));

      for (SoQuyThuChi voucher : cashRepository.findByMaPhieuStartingWith(base + "-")) {
        documents.put(voucher.getId(), voucher);
      }
    }

    for (PhieuGiaoHang delivery : deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId())) {

      cashRepository
          .findByMaPhieu("THU-COD-" + delivery.getId())
          .ifPresent(voucher -> documents.put(voucher.getId(), voucher));
    }

    return List.copyOf(documents.values());
  }

  private void requireNoOrderMoneyDocuments(DonHang order) {
    if (!orderMoneyDocuments(order).isEmpty()) {
      throw conflict(
          "Đơn đã có chứng từ tiền. " + "Cần đối soát chứng từ hiện có, không ghi nhận trùng.");
    }
  }

  @Transactional(
      readOnly = false,
      isolation = Isolation.READ_COMMITTED,
      propagation = Propagation.REQUIRES_NEW)
  public void processPendingOrderLifecycle(Long id) {
    if (id == null || id <= 0) {
      return;
    }

    DonHang order = orderRepository.findByIdForUpdate(id).orElse(null);

    if (order == null) {
      return;
    }

    entityManager.refresh(order);
    orderEvents.watchOrder(order);

    processPendingOrder(order);

    if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_HANG) {
      reserveWaitingStockAutomatically(order);
    }
  }

  private void reserveWaitingStockAutomatically(DonHang order) {
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE
        || order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_HANG
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO
        || !Set.of(
                TrangThaiThanhToanDonHang.THANH_TOAN_MOT_PHAN,
                TrangThaiThanhToanDonHang.DA_THANH_TOAN)
            .contains(order.getTrangThaiThanhToan())) {
      return;
    }

    if (order.getHanGiuHang() != null) {
      throw conflict("Đơn chờ hàng không được có hạn tự hủy");
    }

    var promotionUsage = saleSnapshots.lockPromotionForOrder(order.getId());

    if (promotionUsage != null
        && promotionUsage.getTrangThaiApDung() != TrangThaiApDungKhuyenMai.GIU_CHO) {
      throw conflict("Lượt khuyến mại của đơn chờ hàng không còn được giữ");
    }

    if (!lockDeliveries(order).isEmpty()) {
      throw conflict("Đơn chờ hàng có lịch sử giao hàng, cần đối soát");
    }

    inventory.requireNoExport(order);
    validateStoredAmounts(order);

    var evidence = requireMoneyEvidence(order);

    if (((BigDecimal) evidence.get("so_tien_thuc_thu")).signum() <= 0
        || ((BigDecimal) evidence.get("so_tien_da_hoan")).signum() != 0) {
      throw conflict("Chưa đủ căn cứ thực thu để tự giữ hàng cho đơn");
    }

    var added = inventory.reserveWaitingStock(order);

    if (!added.isEmpty()) {
      recordSystemHistory(
          order,
          "TU_DONG_GIU_HANG_CHO_HANG",
          "Tự giữ bổ sung cho đơn chờ hàng (phiên bản=số lượng): " + added);
    }
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action retryWaitingStock(Long id) {
    DonHang order = lockOrder(id);
    requireOnline(order);

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_HANG
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI) {

      throw conflict("Chỉ kiểm tra hàng cho đơn đang chờ hàng, chưa đóng gói");
    }

    requireUnexported(order);

    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action reserveWaitingStock(
      Long id, String idempotencyKey, AdminOrderRequest.Confirm request) {

    validateId(id);

    if (request == null || !Boolean.TRUE.equals(request.getXacNhan())) {
      throw invalid("Phải xác nhận giữ hàng cho đơn");
    }

    return cashbookService.executeOnce(
        paymentRequestKey("DH-HOLD-", idempotencyKey),
        context.actor(),
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> {
          DonHang order = lockOrder(id);

          requireOnline(order);
          requireUnexported(order);
          inventory.requireNoExport(order);

          if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_HANG
              || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
              || order.getHanGiuHang() != null) {

            throw conflict("Chỉ giữ hàng cho đơn chờ hàng hợp lệ, chưa đóng gói");
          }

          var promotionUsage = saleSnapshots.lockPromotionForOrder(order.getId());

          if (promotionUsage != null
              && promotionUsage.getTrangThaiApDung() != TrangThaiApDungKhuyenMai.GIU_CHO) {
            throw conflict("Lượt khuyến mại của đơn không còn được giữ");
          }

          if (!lockDeliveries(order).isEmpty()) {
            throw conflict("Đơn chờ hàng có lịch sử giao hàng, cần đối soát");
          }

          validateStoredAmounts(order);

          if (!Set.of(
                  TrangThaiThanhToanDonHang.THANH_TOAN_MOT_PHAN,
                  TrangThaiThanhToanDonHang.DA_THANH_TOAN)
              .contains(order.getTrangThaiThanhToan())) {

            throw conflict("Phải ghi nhận tiền khách đã trả trước khi giữ hàng chờ");
          }

          var evidence = requireMoneyEvidence(order);

          if (((BigDecimal) evidence.get("so_tien_thuc_thu")).signum() <= 0
              || ((BigDecimal) evidence.get("so_tien_da_hoan")).signum() != 0) {

            throw conflict("Chưa đủ căn cứ thực thu để giữ hàng cho đơn");
          }

          var added = inventory.reserveWaitingStock(order);

          if (!added.isEmpty()) {
            recordHistory(
                order,
                "GIU_HANG_TUNG_PHAN",
                "Giữ bổ sung cho đơn chờ hàng (phiên bản=số lượng): " + added);
          }

          return action(order);
        });
  }

  private void processPendingOrder(DonHang order) {
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE
        || order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {
      return;
    }

    var promotionUsage = saleSnapshots.lockPromotionForOrder(order.getId());

    if (promotionUsage != null
        && promotionUsage.getTrangThaiApDung() != TrangThaiApDungKhuyenMai.GIU_CHO) {
      throw conflict("Lượt khuyến mại của đơn chờ xử lý không còn được giữ");
    }

    if (!lockDeliveries(order).isEmpty()) {
      throw conflict("Đơn chờ xử lý đã có lịch sử giao hàng, cần đối soát");
    }

    inventory.requireNoExport(order);
    validateStoredAmounts(order);

    var documents = orderMoneyDocuments(order);

    if (order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {

      if (!Boolean.TRUE.equals(order.getDaGiuHang())
          || order.getHanGiuHang() == null
          || order.getHanGiuHang().isAfter(now())) {
        return;
      }

      if (!documents.isEmpty()) {
        throw conflict("Đơn chưa thanh toán có chứng từ tiền, cần đối soát");
      }

      if (!saleSnapshots.hasUnpaidCreationEvidence(order.getId())) {
        throw conflict("Chưa đủ căn cứ xác nhận đơn được tạo khi chưa thu tiền");
      }

      LocalDateTime deadline = order.getHanGiuHang();

      inventory.releaseQuantityReservation(order);
      order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
      saleSnapshots.onOrderStateChanged(order);

      recordSystemHistory(
          order,
          "HET_HAN_GIU_HANG",
          "Hủy đơn do hết hạn giữ hàng lúc "
              + deadline
              + "; đã giải phóng hàng và lượt khuyến mại.");

      return;
    }

    if (!Set.of(
            TrangThaiThanhToanDonHang.THANH_TOAN_MOT_PHAN, TrangThaiThanhToanDonHang.DA_THANH_TOAN)
        .contains(order.getTrangThaiThanhToan())) {
      throw conflict("Trạng thái thanh toán không hợp lệ");
    }

    var evidence = requireMoneyEvidence(order);

    if (((BigDecimal) evidence.get("so_tien_da_hoan")).signum() != 0) {
      throw conflict("Đơn chờ xử lý đã có hoàn tiền, cần đối soát");
    }

    order.setHanGiuHang(null);

    boolean paid = order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN;

    if (!paid && inventory.hasQuantityReservation(order)) {
      return;
    }

    if (!inventory.tryReserve(order)) {
      markWaitingForStock(order, true);
      return;
    }

    if (paid) {
      order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);

      recordSystemHistory(
          order, "TU_DUYET_DON_DA_THANH_TOAN", "Tự duyệt: đã nhận đủ tiền và giữ đủ hàng.");
    } else {
      recordSystemHistory(
          order, "DU_HANG_CHO_DUYET", "Đã giữ đủ hàng cho đơn thu một phần; chờ nhân viên duyệt.");
    }
  }

  private void markWaitingForStock(DonHang order, boolean system) {

    boolean changed = order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_HANG;

    order.setDaGiuHang(false);
    order.setHanGiuHang(null);
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_HANG);

    if (changed) {
      if (system) {
        recordSystemHistory(
            order, "CHO_HANG", "Chưa đủ hàng để giữ toàn bộ đơn; tiếp tục chờ bổ sung hàng.");
      } else {
        recordHistory(
            order, "CHO_HANG", "Chưa đủ hàng để giữ toàn bộ đơn; tiếp tục chờ bổ sung hàng.");
      }
    }
  }

  private void recordSystemHistory(DonHang order, String action, String description) {

    orderEvents.changed(order.getId(), action);

    historyRepository.save(
        LichSuXuLyDonHang.builder()
            .donHang(order)
            .nguoiThucHien(null)
            .hanhDong(action)
            .moTa(description)
            .ngayThucHien(now())
            .trangThaiDonHang(order.getTrangThaiDonHang())
            .trangThaiDongGoi(order.getTrangThaiDongGoi())
            .trangThaiXuatKho(order.getTrangThaiXuatKho())
            .build());
  }

  public AdminSalesResponse.PageData<AdminOrderResponse.ListItem> list(
      String keyword,
      LoaiDonHang type,
      TrangThaiDonHang orderStatus,
      TrangThaiThanhToanDonHang paymentStatus,
      TrangThaiDongGoi packingStatus,
      TrangThaiXuatKho stockStatus,
      LocalDate from,
      LocalDate to,
      int pageNumber,
      int limit,
      String sort) {

    page(keyword, pageNumber, limit);

    if (from != null && to != null && from.isAfter(to)) {
      throw invalid("tu_ngay không được sau den_ngay");
    }

    if ((from != null && (from.getYear() < 1 || from.getYear() > 9999))
        || (to != null && (to.getYear() < 1 || to.getYear() > 9998))) {
      throw invalid("Khoảng ngày không hợp lệ");
    }

    var result =
        orderRepository.findAll(
            OrderSpecification.build(
                keyword, type, orderStatus, paymentStatus, packingStatus, stockStatus, from, to),
            PageRequest.of(pageNumber, limit, sort(sort)));

    Map<Long, Long> productByOrder = new HashMap<>();
    Map<Long, String> imageByProduct = new HashMap<>();
    Map<Long, PhieuGiaoHang> deliveryByOrder = new HashMap<>();

    if (!result.isEmpty()) {
      var ids = result.getContent().stream().map(DonHang::getId).toList();

      for (var delivery : deliveryRepository.findByDonHang_IdInOrderByIdAsc(ids)) {
        // ID tăng dần: phiếu sau cùng là phiếu giao gần nhất của đơn.
        deliveryByOrder.put(delivery.getDonHang().getId(), delivery);
      }

      for (var line : lineRepository.findFirstLinesForOrders(ids)) {
        productByOrder.put(line.getDonHang().getId(), line.getPhienBan().getSanPham().getId());
      }
    }

    List<AdminOrderResponse.ListItem> items = new ArrayList<>();

    for (DonHang order : result.getContent()) {
      var response = mapper.toListItem(order, properties.zone());

      response.setHinhThucNhanHang(shipping(order) ? "GIAO_HANG" : "NHAN_TAI_CUA_HANG");

      PhieuGiaoHang latestDelivery = deliveryByOrder.get(order.getId());

      response.setPhieuGiaoHangGanNhatId(latestDelivery == null ? null : latestDelivery.getId());

      response.setTrangThaiGiaoHang(
          latestDelivery == null ? null : latestDelivery.getTrangThaiGiaoHang());
      if (order.getKhachHang() == null) {
        response.setTenKhachHang("Khách lẻ");
      }

      Long productId = productByOrder.get(order.getId());

      if (productId != null) {
        if (!imageByProduct.containsKey(productId)) {
          String image =
              imageRepository
                  .findFirstBySanPham_IdOrderByLaAnhChinhDescThuTuHienThiAscIdAsc(productId)
                  .map(AnhSanPham::getDuongDanAnh)
                  .orElse(null);

          imageByProduct.put(productId, image);
        }

        response.setAnhDaiDienSanPham(imageByProduct.get(productId));
      }

      items.add(response);
    }

    return new AdminSalesResponse.PageData<>(items, pagination(result));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action update(
      Long id, String idempotencyKey, AdminSalesRequest.Online request) {

    NguoiDung actor = context.actor();

    String key = paymentRequestKey("SUA-DH-REQ-", idempotencyKey);

    return cashbookService.executeOnce(
        key,
        actor,
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> doUpdate(id, request));
  }

  private AdminOrderResponse.Action doUpdate(Long id, AdminSalesRequest.Online request) {

    if (Boolean.TRUE.equals(request.getChoPhepChoHang())) {
      throw invalid("Chế độ chờ hàng chỉ áp dụng khi tạo đơn mới");
    }

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI) {

      throw conflict("Chỉ sửa đơn Online chờ duyệt, chưa thanh toán và chưa đóng gói");
    }

    if (!lockDeliveries(order).isEmpty()) {
      throw conflict("Đơn đã có lịch sử giao hàng, không được sửa nội dung");
    }

    requireNoCash(order);
    inventory.requireNoExport(order);
    inventory.requireReservationNotExpired(order);

    String address = text(request.getThongTinNguoiNhan().getDiaChiGiaoHang());

    if ("GIAO_HANG".equals(request.getHinhThucNhanHang())) {
      if (address == null) {
        throw invalid("Đơn giao hàng phải có địa chỉ");
      }
    } else if (address != null || inputMoney(request.getPhiGiaoHang()).signum() != 0) {

      throw invalid("Nhận tại cửa hàng phải có địa chỉ null và phí giao hàng bằng 0");
    }

    if (saleSnapshots.hasPromotion(order.getId())) {
      saleSnapshots.requireSameFinancialInput(order, request);

      order.setTenNguoiNhan(request.getThongTinNguoiNhan().getTenNguoiNhan().strip());
      order.setSdtNguoiNhan(request.getThongTinNguoiNhan().getSdtNguoiNhan());
      order.setDiaChiGiaoHang(address);
      order.setGhiChu(text(request.getGhiChu()));

      recordHistory(order, "SUA_THONG_TIN_NGUOI_NHAN", "Cập nhật thông tin người nhận và ghi chú");

      return action(order);
    }

    if (text(request.getMaChuongTrinh()) != null) {
      throw invalid("Không thêm khuyến mại bằng API sửa đơn; hãy tạo đơn mới");
    }

    var existingLines = lineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    if ((order.getTienChietKhau() != null && order.getTienChietKhau().signum() > 0)
        || existingLines.stream().anyMatch(line -> Boolean.TRUE.equals(line.getLaQuaTang()))) {

      throw conflict(
          "Đơn cũ có quyền lợi khuyến mại nhưng thiếu bản chụp; "
              + "chưa thể thay nội dung tài chính");
    }

    NguoiDung customer = context.customer(request.getKhachHangId(), false);

    var plan = calculation.calculate(request, LoaiDonHang.ONLINE, true);

    LocalDateTime previousReservationDeadline = order.getHanGiuHang();

    if (inventory.hasQuantityReservation(order)) {
      inventory.releaseQuantityReservation(order);
    }

    saleQuotes.require(
        request.getMaXacNhanGia(),
        SalesQuoteService.identity(context.actor(), null),
        SalesQuoteService.editScope(id),
        request,
        plan);

    if (inputMoney(request.getTongThanhToanXacNhan()).compareTo(plan.data().getTongThanhToan())
        != 0) {

      throw conflict("Tổng tiền thay đổi; hãy gọi preview và xác nhận lại");
    }

    order.setKhachHang(customer);
    order.setTenNguoiNhan(request.getThongTinNguoiNhan().getTenNguoiNhan().strip());
    order.setSdtNguoiNhan(request.getThongTinNguoiNhan().getSdtNguoiNhan());
    order.setDiaChiGiaoHang(address);
    order.setPhuongThucThanhToan(request.getPhuongThucThanhToan());
    order.setMaGiaoDichThanhToan(null);
    order.setTongTienHang(plan.data().getTongTienHang());
    order.setTienChietKhau(plan.data().getTienChietKhau());
    order.setPhiGiaoHang(plan.data().getPhiGiaoHang());
    order.setTongThanhToan(plan.data().getTongThanhToan());
    order.setGhiChu(text(request.getGhiChu()));

    boolean unpaidEvidenceKnown = saleSnapshots.hasUnpaidCreationEvidence(order.getId());

    lineRepository.deleteAll(existingLines);
    lineRepository.flush();

    saleSnapshots.saveLines(order, plan, request);

    if (unpaidEvidenceKnown) {
      saleSnapshots.recordUnpaidCreationEvidence(order);
    }

    inventory.reserve(order);

    // Sửa đơn không tự kéo dài thời hạn giữ.
    order.setHanGiuHang(previousReservationDeadline);

    recordHistory(order, "SUA_DON_HANG", "Cập nhật nội dung đơn hàng");

    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action approve(Long id) {
    DonHang order = lockOrder(id);

    requireOnline(order);
    requireUnexported(order);

    if (!Set.of(TrangThaiDonHang.CHO_DUYET, TrangThaiDonHang.CHO_HANG)
            .contains(order.getTrangThaiDonHang())
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI) {

      throw conflict("Đơn không còn ở trạng thái chờ duyệt hoặc chờ hàng hợp lệ");
    }

    if (!lockDeliveries(order).isEmpty()) {
      throw conflict("Đơn chờ xử lý không được có phiếu giao");
    }

    var promotionUsage = saleSnapshots.lockPromotionForOrder(order.getId());

    if (promotionUsage != null
        && promotionUsage.getTrangThaiApDung() != TrangThaiApDungKhuyenMai.GIU_CHO) {

      throw conflict("Lượt khuyến mại của đơn không còn được giữ");
    }

    inventory.requireNoExport(order);
    validateStoredAmounts(order);

    if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_HANG && order.getHanGiuHang() != null) {
      throw conflict("Đơn chờ hàng không được có hạn tự hủy");
    }

    if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_HANG
        && inventory.hasAnyQuantityReservation(order)
        && order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {

      throw conflict("Đơn chờ hàng chưa thu tiền nhưng đã giữ hàng, cần đối soát");
    }

    if (order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {

      requireNoOrderMoneyDocuments(order);
      requireNoCash(order);

      if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_HANG
          && !saleSnapshots.hasUnpaidCreationEvidence(order.getId())) {

        throw conflict("Chưa đủ căn cứ xác nhận đơn chờ hàng chưa thu tiền");
      }
    } else {
      var evidence = requireMoneyEvidence(order);

      if (((BigDecimal) evidence.get("so_tien_da_hoan")).signum() != 0) {
        throw conflict("Đơn đã có hoàn tiền, cần đối soát");
      }

      order.setHanGiuHang(null);
    }

    inventory.requireReservationNotExpired(order);

    if (!inventory.tryReserve(order)) {
      markWaitingForStock(order, false);
      return action(order);
    }

    order.setHanGiuHang(null);

    if (money(order.getTongThanhToan()).signum() == 0) {
      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    }

    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);

    recordHistory(order, "DUYET_DON", "Duyệt đơn hàng, đã giữ đủ toàn bộ hàng");

    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action fulfillment(Long id, AdminOrderRequest.Fulfillment request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);
    requireProcessing(order);

    if (!Boolean.TRUE.equals(request.getXacNhan())) {
      throw invalid("Phải xác nhận bắt đầu đóng gói");
    }

    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
        && order.getTrangThaiDongGoi() != TrangThaiDongGoi.HUY_DONG_GOI) {
      throw conflict("Đơn đã bắt đầu xử lý");
    }

    List<PhieuGiaoHang> deliveries = lockDeliveries(order);

    if (!effective(deliveries).isEmpty()) {
      throw conflict("Đơn đã có phiếu giao còn hiệu lực");
    }

    DoiTacVanChuyen partner = null;
    BigDecimal partnerFee = BigDecimal.ZERO;

    // Chấp nhận client cũ gửi đủ đối tác/phí; client mới chọn ở bước bắt đầu giao hàng.
    if (shipping(order)
        && (request.getDoiTacVanChuyenId() != null || request.getPhiTraDoiTac() != null)) {
      if (request.getDoiTacVanChuyenId() == null || request.getPhiTraDoiTac() == null) {
        throw invalid("Giao hàng phải chọn đối tác và phí trả đối tác");
      }

      partner =
          partnerRepository
              .findByIdForShare(request.getDoiTacVanChuyenId())
              .orElseThrow(() -> notFound("Đối tác vận chuyển không tồn tại"));

      if (partner.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
        throw conflict("Đối tác vận chuyển đã ngừng hoạt động");
      }

      partnerFee = inputMoney(request.getPhiTraDoiTac());
    } else if (!shipping(order)
        && (request.getDoiTacVanChuyenId() != null || request.getPhiTraDoiTac() != null)) {
      throw invalid("Nhận tại cửa hàng không gửi đối tác hoặc phí trả đối tác");
    }

    inventory.reserve(order);

    order.setTrangThaiDongGoi(TrangThaiDongGoi.DANG_DONG_GOI);

    if (partner != null) {
      deliveryRepository.save(
          PhieuGiaoHang.builder()
              .maPhieuGiaoHang(
                  "PGH" + UUID.randomUUID().toString().replace("-", "").substring(0, 16))
              .donHang(order)
              .doiTacVanChuyen(partner)
              .trangThaiGiaoHang(TrangThaiGiaoHangEnum.CHO_GIAO)
              .tienThuHoCod(remainingForCod(order))
              .phiTraDoiTac(partnerFee)
              .ngayCapNhat(now())
              .build());
    }

    recordHistory(order, "BAT_DAU_DONG_GOI", "Bắt đầu đóng gói");

    var response = action(order);
    response.setKhoHangId(context.defaultWarehouseId());
    response.setHangGiu(inventory.reservationRows(order, false));
    return response;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action startDelivery(Long id, AdminOrderRequest.DeliveryStart request) {

    DonHang order = lockOrder(id);
    requireOnline(order);

    if (!Boolean.TRUE.equals(request.getXacNhan())) {
      throw invalid("Phải xác nhận bắt đầu giao hàng");
    }

    validateId(request.getDoiTacVanChuyenId());

    BigDecimal partnerFee = request.getPhiTraDoiTac();

    if (partnerFee == null
        || partnerFee.signum() < 0
        || partnerFee.compareTo(new BigDecimal("9999999999999.99")) > 0
        || partnerFee.stripTrailingZeros().scale() > 2) {
      throw invalid("Phí trả đối tác phải không âm và tối đa hai chữ số thập phân");
    }

    partnerFee = partnerFee.setScale(2);

    if (!shipping(order)
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO) {
      throw conflict("Chỉ bắt đầu giao đơn giao hàng đã đóng gói và xuất kho");
    }

    var active = effective(lockDeliveries(order));

    if (active.size() > 1) {
      throw conflict("Đơn có nhiều phiếu giao còn hiệu lực");
    }

    PhieuGiaoHang delivery = active.isEmpty() ? null : active.get(0);

    // Client cũ không gửi ma_van_don: giữ mã hiện tại.
    // Client gửi chuỗi rỗng: bàn giao không có mã vận đơn.
    String tracking =
        request.getMaVanDon() == null
            ? (delivery == null ? null : delivery.getMaVanDon())
            : text(request.getMaVanDon());

    if (tracking != null && tracking.length() > 50) {
      throw invalid("Mã vận đơn tối đa 50 ký tự");
    }

    // Gửi lại cùng thao tác đã thành công: trả kết quả hiện tại.
    if (order.getTrangThaiDonHang() == TrangThaiDonHang.DANG_GIAO_HANG
        && delivery != null
        && delivery.getTrangThaiGiaoHang() == TrangThaiGiaoHangEnum.DA_NHAN_HANG
        && Objects.equals(delivery.getDoiTacVanChuyen().getId(), request.getDoiTacVanChuyenId())
        && delivery.getPhiTraDoiTac().compareTo(partnerFee) == 0
        && Objects.equals(delivery.getMaVanDon(), tracking)) {
      return action(order);
    }

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_LAY_HANG
        || (delivery != null
            && delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO)) {
      throw conflict("Chỉ bắt đầu giao khi đơn đang chờ lấy hàng, chưa bàn giao đối tác");
    }

    DoiTacVanChuyen partner =
        partnerRepository
            .findByIdForShare(request.getDoiTacVanChuyenId())
            .orElseThrow(() -> notFound("Đối tác vận chuyển không tồn tại"));

    if (partner.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Đối tác vận chuyển đã ngừng hoạt động");
    }

    if (tracking != null
        && deliveryRepository.existsByMaVanDonIgnoreCaseAndIdNot(
            tracking, delivery == null ? 0L : delivery.getId())) {
      throw conflict("Mã vận đơn đã được sử dụng");
    }

    BigDecimal codToCollect = remainingForCod(order);

    if (delivery == null) {
      delivery =
          PhieuGiaoHang.builder()
              .maPhieuGiaoHang(
                  "PGH" + UUID.randomUUID().toString().replace("-", "").substring(0, 16))
              .donHang(order)
              .build();
    }

    delivery.setDoiTacVanChuyen(partner);
    delivery.setPhiTraDoiTac(partnerFee);
    delivery.setMaVanDon(tracking);

    delivery.setTienThuHoCod(codToCollect);

    delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.DA_NHAN_HANG);
    delivery.setNgayCapNhat(now());

    deliveryRepository.save(delivery);
    order.setTrangThaiDonHang(TrangThaiDonHang.DANG_GIAO_HANG);

    recordHistory(
        order,
        "GIAO_VAN_DA_NHAN_HANG",
        "Bàn giao hàng cho đối tác; phiếu " + delivery.getMaPhieuGiaoHang());

    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action packing(Long id, AdminOrderRequest.Packing request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);
    requireProcessing(order);

    var deliveries = lockDeliveries(order);
    TrangThaiDongGoi target = request.getTrangThaiDongGoi();

    if (target == TrangThaiDongGoi.DA_DONG_GOI) {
      if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DANG_DONG_GOI) {
        throw conflict("Chỉ hoàn tất khi đang đóng gói");
      }

      inventory.requirePackingAllocation(order);
      order.setTrangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI);

    } else if (target == TrangThaiDongGoi.HUY_DONG_GOI) {
      if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DANG_DONG_GOI
          && order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI) {
        throw conflict("Chỉ hủy khi đang hoặc đã đóng gói, chưa xuất kho");
      }

      cancelWaitingDeliveries(deliveries);
      inventory.releasePackingSerials(order);
      order.setTrangThaiDongGoi(TrangThaiDongGoi.HUY_DONG_GOI);
    }

    recordPackingHistory(order);
    return action(order);
  }

  public List<AdminOrderResponse.History> history(Long id) {
    findOrder(id);

    return historyRepository.findByDonHang_IdOrderByNgayThucHienAscIdAsc(id).stream()
        .map(
            event ->
                new AdminOrderResponse.History(
                    event.getId(),
                    event.getHanhDong(),
                    event.getMoTa(),
                    event.getNguoiThucHien() == null
                        ? "Hệ thống"
                        : event.getNguoiThucHien().getHoTen(),
                    event.getNgayThucHien().atZone(properties.zone()).toOffsetDateTime(),
                    event.getTrangThaiDonHang(),
                    event.getTrangThaiDongGoi(),
                    event.getTrangThaiXuatKho(),
                    event.getPhieuGiaoHangId(),
                    event.getMaPhieuGiaoHang(),
                    event.getTrangThaiGiaoHang()))
        .toList();
  }

  private void recordPackingHistory(DonHang order) {
    switch (order.getTrangThaiDongGoi()) {
      case DA_DONG_GOI -> recordHistory(order, "HOAN_TAT_DONG_GOI", "Hoàn tất đóng gói");
      case HUY_DONG_GOI -> recordHistory(order, "HUY_DONG_GOI", "Hủy đóng gói");
      default -> throw invalid("Trạng thái đóng gói không hợp lệ");
    }
  }

  void recordHistory(DonHang order, String action, String description) {

    List<PhieuGiaoHang> deliveries = deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    PhieuGiaoHang latestDelivery =
        deliveries.isEmpty() ? null : deliveries.get(deliveries.size() - 1);

    recordHistory(order, action, description, latestDelivery);
  }

  void recordHistory(DonHang order, String action, String description, PhieuGiaoHang delivery) {

    if (delivery != null && !Objects.equals(delivery.getDonHang().getId(), order.getId())) {

      throw conflict("Phiếu giao hàng không thuộc đơn đang ghi lịch sử");
    }

    orderEvents.changed(order.getId(), action);

    historyRepository.save(
        LichSuXuLyDonHang.builder()
            .donHang(order)
            .nguoiThucHien(context.actor())
            .hanhDong(action)
            .moTa(description)
            .ngayThucHien(now())
            .trangThaiDonHang(order.getTrangThaiDonHang())
            .trangThaiDongGoi(order.getTrangThaiDongGoi())
            .trangThaiXuatKho(order.getTrangThaiXuatKho())
            .phieuGiaoHangId(delivery == null ? null : delivery.getId())
            .maPhieuGiaoHang(delivery == null ? null : delivery.getMaPhieuGiaoHang())
            .trangThaiGiaoHang(delivery == null ? null : delivery.getTrangThaiGiaoHang())
            .build());
  }

  public Map<String, Object> packingSerials(Long id) {
    DonHang order = findOrder(id);
    requireSerialPreparation(order);

    var allocation = inventory.packingAllocation(order);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("kho_hang_id", allocation.getKhoHangId());
    result.put("items", allocation.getItems());
    result.put(
        "serial_da_giu",
        serialRepository.findPackingByOrderId(id).stream().map(salesMapper::toSerial).toList());

    return result;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action savePackingSerials(
      Long id, String idempotencyKey, AdminOrderRequest.PackingSerials request) {

    validateId(id);

    return cashbookService.executeOnce(
        paymentRequestKey("DG-SN-", idempotencyKey),
        context.actor(),
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> {
          DonHang order = lockOrder(id);
          requireOnline(order);
          requireUnexported(order);
          requireProcessing(order);

          inventory.savePackingSerials(order, request);

          recordHistory(
              order,
              "CHOT_SERIAL_DONG_GOI",
              "Chốt serial đóng gói; số serial lỗi: " + request.getSerialLoiIds().size());

          return action(order);
        });
  }

  public AdminOrderResponse.Requirements requirements(Long id) {
    DonHang order = findOrder(id);
    requireSerialPreparation(order);

    var plan = inventory.plan(order, false);

    return new AdminOrderResponse.Requirements(
        order.getId(),
        order.getTrangThaiDonHang(),
        order.getTrangThaiDongGoi(),
        order.getTrangThaiXuatKho(),
        context.defaultWarehouseId(),
        plan.requirements());
  }

  public AdminOrderResponse.Candidates candidates(
      Long id,
      Long lineId,
      Long variantId,
      String keyword,
      String exactSerial,
      int pageNumber,
      int limit) {

    validateId(lineId);
    validateId(variantId);

    var pageable = page(keyword, pageNumber, limit);

    if (exactSerial != null && exactSerial.length() > 100) {
      throw invalid("so_serial tối đa 100 ký tự");
    }

    DonHang order = findOrder(id);
    requireSerialPreparation(order);

    var plan = inventory.plan(order, false);

    if (plan.lines().stream().noneMatch(x -> x.getId().equals(lineId))) {
      throw notFound("Chi tiết đơn hàng không thuộc đơn này");
    }

    if (!variantRepository.existsById(variantId)) {
      throw notFound("Phiên bản không tồn tại");
    }

    Integer required = plan.serials().get(new OrderInventoryService.Key(lineId, variantId));

    if (required == null) {
      throw conflict("Phiên bản không thuộc yêu cầu serial của dòng đơn");
    }

    String exact = text(exactSerial);
    String word = text(keyword);

    Specification<SoSerialSanPham> specification =
        (root, query, cb) -> {
          var packingLine = root.join("chiTietDongGoi", JoinType.LEFT);

          var packingOrder = packingLine.join("donHang", JoinType.LEFT);

          var condition =
              cb.and(
                  cb.equal(root.get("phienBan").get("id"), variantId),
                  cb.equal(root.get("trangThai"), TrangThaiSerial.TRONG_KHO),
                  cb.isNull(root.get("donHang")),
                  cb.or(
                      cb.isNull(packingLine.get("id")),
                      cb.equal(packingOrder.get("id"), order.getId())));

          if (exact != null) {
            return cb.and(condition, cb.equal(root.get("soSerial"), exact));
          }

          if (word != null) {
            String pattern =
                "%"
                    + word.toLowerCase(Locale.ROOT)
                        .replace("!", "!!")
                        .replace("%", "!%")
                        .replace("_", "!_")
                    + "%";

            return cb.and(condition, cb.like(cb.lower(root.get("soSerial")), pattern, '!'));
          }

          return condition;
        };

    var result = serialRepository.findAll(specification, pageable);

    return new AdminOrderResponse.Candidates(
        lineId,
        variantId,
        required,
        result.getContent().stream().map(salesMapper::toSerial).toList(),
        pagination(result));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action export(Long id, AdminOrderRequest.Export request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);
    requireProcessing(order);

    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI) {
      throw conflict("Phải hoàn tất đóng gói trước khi xuất");
    }

    var active = effective(lockDeliveries(order));

    if (shipping(order)) {
      if (active.size() > 1
          || (!active.isEmpty()
              && active.get(0).getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO)) {
        throw conflict("Đơn giao hàng chỉ được có tối đa một phiếu CHO_GIAO");
      }
    } else if (!active.isEmpty()) {
      throw conflict("Đơn nhận tại cửa hàng không được có phiếu giao hiệu lực");
    }

    inventory.export(order, request);

    order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO);
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_LAY_HANG);

    recordHistory(order, "XUAT_KHO", "Xuất kho đơn hàng");

    var response = action(order);
    response.setKhoHangId(context.defaultWarehouseId());
    response.setThietBiDaXuat(soldDevices.details(order.getId()));
    return response;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action confirmPayment(
      Long id, String idempotencyKey, AdminOrderRequest.Payment request) {

    NguoiDung actor = context.actor();

    String key = paymentRequestKey("THU-DH-REQ-", idempotencyKey);

    return cashbookService.executeOnce(
        key,
        actor,
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> doConfirmPayment(id, request, actor));
  }

  private AdminOrderResponse.Action doConfirmPayment(
      Long id, AdminOrderRequest.Payment request, NguoiDung actor) {

    DonHang order = lockOrder(id);

    requireOnline(order);
    validateStoredAmounts(order);

    if (!Boolean.TRUE.equals(request.getXacNhanDaNhanTien())) {
      throw invalid("Phải xác nhận cửa hàng đã thực nhận tiền");
    }

    validatePaymentMethod(request.getPhuongThucThanhToan(), request.getMaGiaoDichThanhToan());

    BigDecimal total = money(order.getTongThanhToan());
    BigDecimal received = inputMoney(request.getSoTienThanhToan());

    if (total.signum() <= 0) {
      throw conflict("Đơn tổng tiền bằng 0 không phát sinh phiếu thu");
    }

    if (received.signum() <= 0) {
      throw invalid("Số tiền thực nhận phải lớn hơn 0");
    }

    List<PhieuGiaoHang> deliveries = lockDeliveries(order);
    List<PhieuGiaoHang> activeDeliveries = effective(deliveries);

    SoQuyThuChi receipt;

    if ("KHACH_HANG".equals(request.getNguonThu())) {
      if (request.getPhieuGiaoHangId() != null) {
        throw invalid("Thu trực tiếp từ khách không gửi phieu_giao_hang_id");
      }

      Set<TrangThaiDonHang> allowedStates =
          Set.of(
              TrangThaiDonHang.CHO_DUYET,
              TrangThaiDonHang.CHO_HANG,
              TrangThaiDonHang.CHO_THANH_TOAN,
              TrangThaiDonHang.CHO_DONG_GOI,
              TrangThaiDonHang.CHO_LAY_HANG,
              TrangThaiDonHang.HUY_HANG);

      if (!allowedStates.contains(order.getTrangThaiDonHang())) {
        throw conflict("Không thể ghi nhận tiền khách ở trạng thái đơn hiện tại");
      }

      if (Set.of(TrangThaiDonHang.CHO_DUYET, TrangThaiDonHang.CHO_HANG)
          .contains(order.getTrangThaiDonHang())) {

        requireUnexported(order);
        inventory.requireNoExport(order);

        if (!activeDeliveries.isEmpty()) {
          throw conflict("Đơn chờ xử lý có phiếu giao hiệu lực");
        }
      }

      if (order.getTrangThaiDonHang() == TrangThaiDonHang.HUY_HANG) {
        requireCancelledStockResolved(order);

        if (!activeDeliveries.isEmpty()) {
          throw conflict("Đơn đã hủy có phiếu giao hiệu lực");
        }
      }

      if (order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_HOAN_KHO
          && !saleSnapshots.hasReceivedBeforeHandover(order)) {

        throw conflict("Không thu trực tiếp cho đơn hoàn kho theo luồng này");
      }

      for (PhieuGiaoHang delivery : activeDeliveries) {
        if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO) {

          throw conflict("Hàng đã bàn giao đối tác; ghi nhận tiền qua luồng COD");
        }
      }

      Map<String, Object> evidence = requireMoneyEvidence(order);

      BigDecimal previousReceived = (BigDecimal) evidence.get("so_tien_thuc_thu");

      BigDecimal previousRefunded = (BigDecimal) evidence.get("so_tien_da_hoan");

      if (order.getTrangThaiDonHang() != TrangThaiDonHang.HUY_HANG
          && previousRefunded.signum() != 0) {

        throw conflict("Đơn đang thực hiện đã có khoản hoàn tiền, cần đối soát");
      }

      BigDecimal remaining = total.subtract(previousReceived);

      if (received.compareTo(remaining) > 0) {
        throw invalid("Số tiền nhận vượt phần chưa được ghi nhận: " + remaining);
      }

      String receiptCode =
          newOrderMoneyCode(
              "THU-DH-", order, request.getPhuongThucThanhToan(), request.getMaGiaoDichThanhToan());

      if (cashRepository.findByMaPhieu(receiptCode).isPresent()) {
        throw conflict("Mã giao dịch này đã được ghi nhận cho đơn hàng");
      }

      receipt =
          createCash(
              order,
              actor,
              receiptCode,
              LoaiPhieuThuChi.THU,
              "THU_BAN_HANG",
              NhomNguoiNopNhanEnum.KHACH_HANG,
              order.getKhachHang(),
              null,
              customerName(order),
              received,
              request.getPhuongThucThanhToan(),
              request.getNgayThanhToan(),
              request.getMaGiaoDichThanhToan(),
              "Cửa hàng thực nhận tiền từ khách");

      BigDecimal accumulated = previousReceived.add(received);

      order.setTrangThaiThanhToan(
          accumulated.compareTo(total) == 0
              ? TrangThaiThanhToanDonHang.DA_THANH_TOAN
              : TrangThaiThanhToanDonHang.THANH_TOAN_MOT_PHAN);

      order.setPhuongThucThanhToan(request.getPhuongThucThanhToan());

      order.setMaGiaoDichThanhToan(text(request.getMaGiaoDichThanhToan()));

      // Đã nhận tiền: không tự hủy theo hạn giữ của đơn chưa trả tiền.
      if (Set.of(TrangThaiDonHang.CHO_DUYET, TrangThaiDonHang.CHO_HANG)
          .contains(order.getTrangThaiDonHang())) {

        order.setHanGiuHang(null);
      }

      if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_THANH_TOAN
          && order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN) {

        order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);
      }

      BigDecimal remainingCod = total.subtract(accumulated);

      for (PhieuGiaoHang delivery : activeDeliveries) {
        delivery.setTienThuHoCod(remainingCod);
        delivery.setNgayCapNhat(now());
      }

    } else if ("DOI_TAC_GIAO_HANG".equals(request.getNguonThu())) {
      if (request.getPhieuGiaoHangId() == null) {
        throw invalid("Thu COD phải có phieu_giao_hang_id");
      }

      PhieuGiaoHang delivery =
          deliveries.stream()
              .filter(item -> Objects.equals(item.getId(), request.getPhieuGiaoHangId()))
              .findFirst()
              .orElseThrow(() -> notFound("Phiếu giao không thuộc đơn hàng"));

      if (activeDeliveries.size() != 1
          || !Objects.equals(activeDeliveries.get(0).getId(), delivery.getId())) {

        throw conflict("Đơn phải có đúng một phiếu giao hiệu lực");
      }

      boolean pendingCod =
          Set.of(
                      TrangThaiThanhToanDonHang.CHUA_THANH_TOAN,
                      TrangThaiThanhToanDonHang.THANH_TOAN_MOT_PHAN)
                  .contains(order.getTrangThaiThanhToan())
              && Set.of(TrangThaiDonHang.DANG_GIAO_HANG, TrangThaiDonHang.HOAN_THANH)
                  .contains(order.getTrangThaiDonHang());

      boolean legacyCod =
          order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN
              && order.getTrangThaiDonHang() == TrangThaiDonHang.HOAN_THANH;

      if ((!pendingCod && !legacyCod)
          || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
          || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO
          || delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.GIAO_THANH_CONG) {

        throw conflict("Chỉ nhận COD khi đã giao thành công, đóng gói và xuất kho đủ");
      }

      if (delivery.getDoiTacVanChuyen() == null) {
        throw conflict("Phiếu giao chưa có đối tác vận chuyển");
      }

      if (cashRepository.findByMaPhieu("THU-COD-" + delivery.getId()).isPresent()) {

        throw conflict("Khoản COD của phiếu giao đã được ghi nhận");
      }

      BigDecimal expectedCod;

      if (legacyCod) {
        // Tương thích đơn cũ đã đánh dấu thanh toán khi giao thành công,
        // nhưng chưa có chứng từ thực thu nào.
        requireNoOrderMoneyDocuments(order);
        expectedCod = total;
      } else {
        expectedCod = remainingForCod(order);
      }

      BigDecimal cod = delivery.getTienThuHoCod();

      if (cod == null || cod.signum() <= 0 || cod.compareTo(expectedCod) != 0) {

        throw conflict("COD không khớp phần tiền cửa hàng còn phải thu");
      }

      if (received.compareTo(cod) != 0) {
        throw invalid("Số tiền đối tác nộp phải bằng COD của phiếu giao");
      }

      if (order.getNgayHoanThanh() == null) {
        throw conflict("Chưa có căn cứ thời điểm khách thực nhận hàng");
      }

      receipt =
          createCash(
              order,
              actor,
              "THU-COD-" + delivery.getId(),
              LoaiPhieuThuChi.THU,
              "THU_BAN_HANG",
              NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG,
              null,
              delivery.getDoiTacVanChuyen(),
              delivery.getDoiTacVanChuyen().getTenDoiTac(),
              received,
              request.getPhuongThucThanhToan(),
              request.getNgayThanhToan(),
              request.getMaGiaoDichThanhToan(),
              "Cửa hàng thực nhận COD, phiếu " + delivery.getMaPhieuGiaoHang());

      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
      order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);

      saleSnapshots.onOrderStateChanged(order);

    } else {
      throw invalid("Nguồn thu không hợp lệ");
    }

    recordHistory(order, "XAC_NHAN_THU_TIEN", "Ghi nhận thực thu " + receipt.getMaPhieu());

    AdminOrderResponse.Action response = action(order);
    response.setPhieuThu(mapper.toCashDocument(receipt, properties.zone()));

    return response;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action cancel(Long id, AdminOrderRequest.Cancel request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);

    if (!Set.of(
            TrangThaiDonHang.CHO_DUYET,
            TrangThaiDonHang.CHO_HANG,
            TrangThaiDonHang.CHO_THANH_TOAN,
            TrangThaiDonHang.CHO_DONG_GOI)
        .contains(order.getTrangThaiDonHang())) {

      throw conflict("Đơn không còn được phép hủy trực tiếp");
    }

    inventory.requireNoExport(order);

    Map<Long, Integer> heldBefore = inventory.reservedQuantities(order);

    boolean hadReservation = !heldBefore.isEmpty();

    var moneyEvidence = failedDeliveryMoney(order);

    var deliveries = lockDeliveries(order);
    cancelWaitingDeliveries(deliveries);

    if (hadReservation) {
      TrangThaiDongGoi previousPacking = order.getTrangThaiDongGoi();

      deliveryInventory.releaseReservation(order);

      if (previousPacking != TrangThaiDongGoi.CHUA_DONG_GOI) {
        order.setTrangThaiDongGoi(TrangThaiDongGoi.HUY_DONG_GOI);
      }
    } else if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
        && order.getTrangThaiDongGoi() != TrangThaiDongGoi.HUY_DONG_GOI) {
      throw conflict("Trạng thái đóng gói không nhất quán");
    }

    order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
    saleSnapshots.onOrderStateChanged(order);

    String note = "[Hủy đơn] " + request.getLyDo().strip();
    order.setGhiChu(text(order.getGhiChu()) == null ? note : order.getGhiChu() + "\n" + note);

    // Giữ trạng thái thanh toán và các phiếu thu đã phát sinh.
    recordHistory(order, "HUY_DON", "Hủy đơn hàng trước xuất kho");

    var response = action(order);

    response.setGiaiPhongGiuKho(inventory.releasedReservationRows(heldBefore));

    response.setTienCanDoiSoatHoan(
        Boolean.TRUE.equals(moneyEvidence.get("co_du_can_cu"))
            ? (BigDecimal) moneyEvidence.get("tong_tien_can_hoan")
            : null);

    return response;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action pickup(Long id) {
    DonHang order = lockOrder(id);

    requireOnline(order);
    validateStoredAmounts(order);

    if (shipping(order)) {
      throw conflict("Đơn giao tận nơi không xác nhận nhận tại cửa hàng");
    }

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_LAY_HANG
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO) {

      throw conflict(
          "Chỉ bàn giao tại cửa hàng khi đơn chờ lấy hàng, " + "đã đóng gói và xuất kho đầy đủ");
    }

    if (!effective(lockDeliveries(order)).isEmpty()) {
      throw conflict("Đơn đang có phiếu giao hàng hiệu lực");
    }

    requireMoneyEvidence(order);

    BigDecimal total = money(order.getTongThanhToan());
    BigDecimal received = sumCash(order, LoaiPhieuThuChi.THU);
    BigDecimal refunded = sumCash(order, LoaiPhieuThuChi.CHI);

    if (total.signum() > 0) {
      if (order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN
          || received.compareTo(total) != 0
          || refunded.signum() != 0) {

        throw conflict("Đơn chưa có đủ chứng từ thực thu để xác nhận khách nhận hàng");
      }
    } else {
      if (received.signum() != 0 || refunded.signum() != 0) {
        throw conflict("Đơn tổng 0 nhưng có giao dịch tiền cần đối soát");
      }

      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    }

    // Kích hoạt đúng từng thiết bị/linh kiện đã xuất.
    // Không dùng chính sách bảo hành hiện tại của danh mục.
    soldDevices.handover(order);

    order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);

    saleSnapshots.onOrderStateChanged(order);

    recordHistory(order, "XAC_NHAN_NHAN_TAI_CUA_HANG", "Xác nhận khách đã nhận hàng tại cửa hàng");

    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action refund(
      Long id, String idempotencyKey, AdminOrderRequest.Refund request) {

    NguoiDung actor = context.actor();

    String key = paymentRequestKey("HOAN-DH-REQ-", idempotencyKey);

    return cashbookService.executeOnce(
        key,
        actor,
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> doRefund(id, request, actor));
  }

  private void requireCancelledStockResolved(DonHang order) {
    if (order.getTrangThaiDonHang() != TrangThaiDonHang.HUY_HANG) {
      throw conflict("Đơn hàng chưa được hủy.");
    }

    if (inventory.hasAnyQuantityReservation(order)) {
      throw conflict("Đơn hủy vẫn còn hàng giữ, cần giải phóng trước khi xử lý tiền");
    }

    if (order.getTrangThaiXuatKho() == TrangThaiXuatKho.CHUA_XUAT_KHO) {
      inventory.requireNoExport(order);
      return;
    }

    if (saleSnapshots.hasReceivedBeforeHandover(order)) {
      return;
    }

    throw conflict(
        "Chưa có căn cứ nhận lại đủ hàng trước bàn giao; "
            + "cần xử lý theo phiếu trả hoặc luồng giao hàng.");
  }

  private AdminOrderResponse.Action doRefund(
      Long id, AdminOrderRequest.Refund request, NguoiDung actor) {

    DonHang order = lockOrder(id);

    requireOnline(order);
    requireCancelledStockResolved(order);

    if (!Boolean.TRUE.equals(request.getXacNhanDaHoanTien())) {
      throw invalid("Phải xác nhận đã hoàn tiền thực tế cho khách");
    }

    validatePaymentMethod(request.getPhuongThucHoan(), request.getMaGiaoDich());

    Map<String, Object> evidence = requireMoneyEvidence(order);

    BigDecimal refundDue = (BigDecimal) evidence.get("tong_tien_can_hoan");

    if (refundDue.signum() <= 0) {
      throw conflict("Đơn không còn khoản tiền cần hoàn");
    }

    String expenseCode =
        newOrderMoneyCode(
            "CHI-HUY-DH-", order, request.getPhuongThucHoan(), request.getMaGiaoDich());

    if (cashRepository.findByMaPhieu(expenseCode).isPresent()) {
      throw conflict("Mã giao dịch hoàn tiền đã được ghi nhận");
    }

    SoQuyThuChi expense =
        createCash(
            order,
            actor,
            expenseCode,
            LoaiPhieuThuChi.CHI,
            "CHI_HOAN_DON_HANG",
            NhomNguoiNopNhanEnum.KHACH_HANG,
            order.getKhachHang(),
            null,
            customerName(order),
            refundDue,
            request.getPhuongThucHoan(),
            request.getNgayHoanTien(),
            request.getMaGiaoDich(),
            "Ghi nhận đã hoàn tiền đơn hủy");

    recordHistory(order, "HOAN_TIEN_DON_HUY", "Ghi nhận hoàn tiền " + expense.getMaPhieu());

    AdminOrderResponse.Action response = action(order);
    response.setPhieuChi(mapper.toCashDocument(expense, properties.zone()));

    return response;
  }

  private SoQuyThuChi createCash(
      DonHang order,
      NguoiDung actor,
      String code,
      LoaiPhieuThuChi type,
      String typeCode,
      NhomNguoiNopNhanEnum group,
      NguoiDung counterpartyUser,
      DoiTacVanChuyen counterpartyPartner,
      String payer,
      BigDecimal amount,
      String method,
      OffsetDateTime date,
      String transactionCode,
      String description) {

    String reference = text(transactionCode);

    return cashbookService.createAutomatic(
        CashbookService.AutomaticVoucher.builder()
            .maPhieu(code)
            .loaiPhieu(type)
            .maLoaiThuChi(typeCode)
            .nhomNguoiNopNhan(group)
            .nguoiNopNhan(counterpartyUser)
            .doiTacVanChuyen(counterpartyPartner)
            .tenDoiTuongTuDo(counterpartyUser == null && counterpartyPartner == null ? payer : null)
            .maChungTuThamChieu(order.getMaDonHang())
            .soTien(amount)
            .phuongThucThanhToan(method)
            .ngayGhiNhan(date)
            .moTa(description + (reference == null ? "" : "; Mã giao dịch: " + reference))
            .nguoiTao(actor)
            .build());
  }

  private void validatePaymentMethod(String method, String transactionCode) {
    if ("THE".equals(method) && !properties.isCardEnabled()) {
      throw conflict("Chưa bật phương thức thanh toán thẻ");
    }

    if (!"TIEN_MAT".equals(method) && text(transactionCode) == null) {
      throw invalid("Chuyển khoản/thẻ phải có mã giao dịch");
    }
  }

  @Transactional(readOnly = true)
  public Map<String, Object> failedDeliveryMoney(DonHang order) {
    Map<String, Object> result = new LinkedHashMap<>();

    result.put("co_du_can_cu", false);
    result.put("so_tien_thuc_thu", null);
    result.put("so_tien_da_hoan", null);
    result.put("tong_tien_can_hoan", null);

    result.put("chinh_sach_phi_giao", "HOAN_TOAN_BO_TIEN_DA_THU_GOM_PHI_GIAO_KHI_HUY_GIAO");

    try {
      validateStoredAmounts(order);

      var lines = lineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

      if (lines.isEmpty()) {
        return result;
      }

      BigDecimal linePayable = BigDecimal.ZERO;

      for (var line : lines) {
        saleSnapshots.requireSnapshot(line);

        if (line.getThanhToanDong() == null
            || line.getThanhToanDong().signum() < 0
            || line.getTienChietKhau() == null
            || line.getTienChietKhau().signum() < 0) {

          return result;
        }

        linePayable = linePayable.add(line.getThanhToanDong());
      }

      BigDecimal shippingFee =
          order.getPhiGiaoHang() == null ? BigDecimal.ZERO : money(order.getPhiGiaoHang());

      BigDecimal total = money(order.getTongThanhToan());

      if (linePayable.add(shippingFee).compareTo(total) != 0) {
        return result;
      }

      var vouchers = orderMoneyDocuments(order);

      for (var voucher : vouchers) {
        if (voucher.getTrangThai() != TrangThaiPhieuThuChi.DA_GHI_NHAN) {
          return result;
        }

        if (voucher.getNguonTao() != NguonTaoPhieuThuChi.TU_DONG
            || voucher.getLoaiPhieu() == null
            || !belongsToOrderCashFlow(order, voucher, voucher.getLoaiPhieu())) {

          return result;
        }
      }

      BigDecimal received = sumCash(order, LoaiPhieuThuChi.THU);

      BigDecimal refunded = sumCash(order, LoaiPhieuThuChi.CHI);

      if (received.signum() < 0
          || refunded.signum() < 0
          || received.compareTo(total) > 0
          || refunded.compareTo(received) > 0) {

        return result;
      }

      if (total.signum() > 0) {
        TrangThaiThanhToanDonHang expectedStatus;

        if (received.signum() == 0) {
          expectedStatus = TrangThaiThanhToanDonHang.CHUA_THANH_TOAN;

          if (!saleSnapshots.hasUnpaidCreationEvidence(order.getId())) {
            return result;
          }
        } else if (received.compareTo(total) < 0) {
          expectedStatus = TrangThaiThanhToanDonHang.THANH_TOAN_MOT_PHAN;
        } else {
          expectedStatus = TrangThaiThanhToanDonHang.DA_THANH_TOAN;
        }

        if (order.getTrangThaiThanhToan() != expectedStatus) {
          return result;
        }
      } else if (received.signum() != 0 || refunded.signum() != 0) {
        return result;
      }

      result.put("co_du_can_cu", true);
      result.put("so_tien_thuc_thu", received);
      result.put("so_tien_da_hoan", refunded);
      result.put("tong_tien_can_hoan", received.subtract(refunded));

      return result;
    } catch (AppException exception) {
      if (exception.getErrorCode().getStatus().is5xxServerError()) {
        throw exception;
      }

      return result;
    }
  }

  private BigDecimal sumCash(DonHang order, LoaiPhieuThuChi type) {

    return cashRepository.findByMaChungTuThamChieu(order.getMaDonHang()).stream()
        .filter(
            voucher ->
                voucher.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG
                    && voucher.getTrangThai() == TrangThaiPhieuThuChi.DA_GHI_NHAN
                    && voucher.getLoaiPhieu() == type)
        .filter(voucher -> belongsToOrderCashFlow(order, voucher, type))
        .map(SoQuyThuChi::getSoTien)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private boolean belongsToOrderCashFlow(DonHang order, SoQuyThuChi voucher, LoaiPhieuThuChi type) {

    if (voucher.getLoaiThuChi() == null
        || voucher.getSoTien() == null
        || voucher.getSoTien().signum() <= 0
        || voucher.getNhaCungCap() != null
        || !Objects.equals(voucher.getMaChungTuThamChieu(), order.getMaDonHang())) {

      return false;
    }

    String cashType = voucher.getLoaiThuChi().getMaLoai();

    if (type == LoaiPhieuThuChi.CHI) {
      return "CHI_HOAN_DON_HANG".equals(cashType)
          && matchesOrderMoneyCode(voucher.getMaPhieu(), "CHI-HUY-DH-", order.getId())
          && matchesCustomerCounterparty(order, voucher);
    }

    if (!"THU_BAN_HANG".equals(cashType)) {
      return false;
    }

    if (order.getLoaiDonHang() == LoaiDonHang.TAI_QUAY
        && Objects.equals(voucher.getMaPhieu(), "THU-POS-" + order.getId())) {
      return matchesCustomerCounterparty(order, voucher);
    }

    if (matchesOrderMoneyCode(voucher.getMaPhieu(), "THU-DH-", order.getId())) {

      return matchesCustomerCounterparty(order, voucher);
    }

    if (voucher.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG
        || voucher.getNguoiNopNhan() != null
        || voucher.getDoiTacVanChuyen() == null) {

      return false;
    }

    return deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
        .anyMatch(
            delivery ->
                Objects.equals(voucher.getMaPhieu(), "THU-COD-" + delivery.getId())
                    && delivery.getDoiTacVanChuyen() != null
                    && Objects.equals(
                        voucher.getDoiTacVanChuyen().getId(),
                        delivery.getDoiTacVanChuyen().getId()));
  }

  private boolean matchesCustomerCounterparty(DonHang order, SoQuyThuChi voucher) {

    if (voucher.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.KHACH_HANG
        || voucher.getNhaCungCap() != null
        || voucher.getDoiTacVanChuyen() != null) {

      return false;
    }

    Long customerId = order.getKhachHang() == null ? null : order.getKhachHang().getId();

    Long counterpartyId =
        voucher.getNguoiNopNhan() == null ? null : voucher.getNguoiNopNhan().getId();

    return Objects.equals(customerId, counterpartyId);
  }

  private void requireNoCash(DonHang order) {
    if (sumCash(order, LoaiPhieuThuChi.THU).signum() != 0
        || sumCash(order, LoaiPhieuThuChi.CHI).signum() != 0) {
      throw conflict("Đơn đã có khoản thực thu/chi, không xử lý trùng");
    }
  }

  private void validateStoredAmounts(DonHang order) {
    BigDecimal goods = money(order.getTongTienHang());
    BigDecimal discount =
        order.getTienChietKhau() == null ? BigDecimal.ZERO : money(order.getTienChietKhau());
    BigDecimal shippingFee =
        order.getPhiGiaoHang() == null ? BigDecimal.ZERO : money(order.getPhiGiaoHang());
    BigDecimal total = money(order.getTongThanhToan());

    if (discount.compareTo(goods) > 0
        || total.subtract(goods).add(discount).subtract(shippingFee).signum() < 0) {
      throw conflict("Tổng tiền đã lưu trên đơn không hợp lệ");
    }

    BigDecimal sum = BigDecimal.ZERO;

    for (var line : lineRepository.findByDonHang_IdOrderByIdAsc(order.getId())) {
      if (line.getSoLuong() == null
          || line.getSoLuong() <= 0
          || line.getDonGia() == null
          || line.getDonGia().signum() < 0
          || line.getThanhTien() == null
          || line.getDonGia()
                  .multiply(BigDecimal.valueOf(line.getSoLuong()))
                  .compareTo(line.getThanhTien())
              != 0) {
        throw conflict("Thành tiền dòng đơn không hợp lệ");
      }

      sum = sum.add(line.getThanhTien());
    }

    if (sum.compareTo(goods) != 0) {
      throw conflict("Tổng tiền hàng không khớp các dòng đơn");
    }
  }

  private List<PhieuGiaoHang> lockDeliveries(DonHang order) {
    List<PhieuGiaoHang> locked = new ArrayList<>();

    for (var item : deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId())) {
      PhieuGiaoHang delivery =
          deliveryRepository
              .findByIdForUpdate(item.getId())
              .orElseThrow(() -> conflict("Phiếu giao hàng đã thay đổi"));

      entityManager.refresh(delivery);
      locked.add(delivery);
    }

    return locked;
  }

  private List<PhieuGiaoHang> effective(List<PhieuGiaoHang> deliveries) {
    return deliveries.stream()
        .filter(x -> x.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.HUY_GIAO_HANG)
        .filter(x -> x.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.DA_HOAN_HANG)
        .toList();
  }

  private void cancelWaitingDeliveries(List<PhieuGiaoHang> deliveries) {
    for (var delivery : effective(deliveries)) {
      if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO) {
        throw conflict("Có phiếu đã bàn giao đối tác, không được hủy trực tiếp");
      }
    }

    for (var delivery : effective(deliveries)) {
      delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.HUY_GIAO_HANG);
      delivery.setNgayCapNhat(now());
    }
  }

  public Map<String, Object> refundOptions(Long id) {
    context.actor();

    DonHang order = findOrder(id);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("don_hang_id", order.getId());

    boolean cancelledBeforeExport =
        order.getTrangThaiDonHang() == TrangThaiDonHang.HUY_HANG
            && (order.getTrangThaiXuatKho() == TrangThaiXuatKho.CHUA_XUAT_KHO
                || saleSnapshots.hasReceivedBeforeHandover(order));

    Map<String, Object> evidence = failedDeliveryMoney(order);

    boolean moneyVerified = Boolean.TRUE.equals(evidence.get("co_du_can_cu"));

    BigDecimal refundDue = null;

    if (moneyVerified) {
      Object value = evidence.get("tong_tien_can_hoan");

      if (value instanceof BigDecimal amount) {
        refundDue = amount;
      }
    }

    boolean canRefundCancelledOrder =
        cancelledBeforeExport && refundDue != null && refundDue.signum() > 0;

    Map<String, Object> cancelledRefund = new LinkedHashMap<>();
    cancelledRefund.put("hien_thi", cancelledBeforeExport);
    cancelledRefund.put("co_the_hoan", canRefundCancelledOrder);
    cancelledRefund.put("so_tien_can_hoan", refundDue);

    String unavailableReason = null;

    if (cancelledBeforeExport && !canRefundCancelledOrder) {
      if (!moneyVerified) {
        unavailableReason = "Chưa đủ căn cứ đối soát tiền của đơn hàng.";
      } else if (refundDue == null) {
        unavailableReason = "Chưa xác định được số tiền còn phải hoàn.";
      } else if (refundDue.signum() == 0) {
        unavailableReason = "Đơn không còn khoản tiền chờ hoàn.";
      } else {
        unavailableReason = "Đơn chưa đủ điều kiện hoàn tiền qua luồng hủy trước xuất kho.";
      }
    }

    cancelledRefund.put("ly_do", unavailableReason);
    result.put("hoan_don_huy", cancelledRefund);

    List<Map<String, Object>> returnRefunds = new ArrayList<>();

    for (PhieuTraHang document : returnRepository.findByDonHang_IdOrderByIdAsc(order.getId())) {

      BigDecimal amount = document.getTongTienHoan();

      boolean received = document.getTrangThaiTraHang() == TrangThaiTraHang.DA_NHAN_HANG;

      boolean finished =
          document.getTrangThaiTraHang() == TrangThaiTraHang.HOAN_TAT
              || document.getTrangThaiTraHang() == TrangThaiTraHang.DA_HOAN_TIEN;

      boolean hasRefundVoucher =
          cashRepository.findByMaPhieu("CHI-TH-" + document.getId()).isPresent();

      boolean canRefund = received && amount != null && amount.signum() > 0 && !hasRefundVoucher;

      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", document.getId());
      item.put("ma_tra_hang", document.getMaTraHang());
      item.put("trang_thai_tra_hang", document.getTrangThaiTraHang());
      item.put("tong_tien_hoan", amount);
      item.put("hinh_thuc_hoan_tien", document.getHinhThucHoanTien());
      item.put("co_the_hoan", canRefund);
      item.put("da_ghi_nhan_hoan", finished || hasRefundVoucher);

      String reason = null;

      if (!canRefund) {
        if (finished || hasRefundVoucher) {
          reason = "Phiếu trả đã kết thúc hoặc đã ghi nhận hoàn tiền.";
        } else if (!received) {
          reason = "Phiếu trả chưa xác nhận nhận hàng.";
        } else if (amount == null) {
          reason = "Phiếu trả chưa có số tiền hoàn hợp lệ.";
        } else if (amount.signum() == 0) {
          reason = "Phiếu trả không phát sinh tiền hoàn.";
        }
      }

      item.put("ly_do", reason);
      returnRefunds.add(item);
    }

    result.put("phieu_tra_hang", List.copyOf(returnRefunds));

    return result;
  }

  private DonHang lockOrder(Long id) {
    validateId(id);
    context.actor();

    DonHang order =
        orderRepository.findByIdForUpdate(id).orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

    entityManager.refresh(order);
    watchStatuses(order);

    saleSnapshots.lockPromotionForOrder(order.getId());

    return order;
  }

  void watchStatuses(DonHang order) {
    orderEvents.watchOrder(order);
  }

  private DonHang findOrder(Long id) {
    validateId(id);
    return orderRepository.findById(id).orElseThrow(() -> notFound("Đơn hàng không tồn tại"));
  }

  private void requireOnline(DonHang order) {
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE) {
      throw conflict("Thao tác này chỉ áp dụng đơn ONLINE");
    }
  }

  private void requireUnexported(DonHang order) {
    if (order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {
      throw conflict("Đơn đã xuất hoặc hoàn kho");
    }
  }

  private void requireProcessing(DonHang order) {
    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DONG_GOI) {
      throw conflict("Đơn phải ở trạng thái CHO_DONG_GOI");
    }
  }

  private void requireSerialPreparation(DonHang order) {
    requireOnline(order);
    requireUnexported(order);

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DONG_GOI
        && order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_THANH_TOAN) {
      throw conflict("Chỉ xem serial cho đơn đã duyệt, chưa hủy và chưa xuất");
    }
  }

  private boolean hasReservation(DonHang order) {
    return inventory.hasQuantityReservation(order);
  }

  private boolean shipping(DonHang order) {
    return text(order.getDiaChiGiaoHang()) != null;
  }

  private String customerName(DonHang order) {
    if (order.getKhachHang() != null) {
      return order.getKhachHang().getHoTen();
    }
    return text(order.getTenNguoiNhan()) == null ? "Khách lẻ" : order.getTenNguoiNhan();
  }

  private AdminOrderResponse.Action action(DonHang order) {
    entityManager.flush();

    AdminOrderResponse.Action response = mapper.toAction(salesService.getOrder(order.getId()));

    if (order.getLoaiDonHang() == LoaiDonHang.ONLINE) {
      response.setDoiSoatThanhToan(paymentSummary(order));
    }

    return response;
  }

  private LocalDateTime now() {
    return LocalDateTime.now(properties.zone());
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("ID phải là số nguyên dương");
    }
  }

  private Sort sort(String input) {
    String value = text(input);

    if (value == null) {
      value = "ngay_tao,desc";
    }

    String[] parts = value.split(",", -1);

    Map<String, String> fields =
        Map.of(
            "ngay_tao", "ngayTao",
            "tong_thanh_toan", "tongThanhToan",
            "ma_don_hang", "maDonHang",
            "id", "id");

    if (parts.length != 2 || !fields.containsKey(parts[0])) {
      throw invalid("sort phải có dạng ngay_tao,desc");
    }

    Sort.Direction direction;

    if ("asc".equalsIgnoreCase(parts[1])) {
      direction = Sort.Direction.ASC;
    } else if ("desc".equalsIgnoreCase(parts[1])) {
      direction = Sort.Direction.DESC;
    } else {
      throw invalid("Chiều sắp xếp phải là asc hoặc desc");
    }

    Sort result = Sort.by(direction, fields.get(parts[0]));

    return "id".equals(parts[0]) ? result : result.and(Sort.by(Sort.Direction.DESC, "id"));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action fulfillment(
      Long id, String idempotencyKey, AdminOrderRequest.Fulfillment request) {

    validateId(id);

    return cashbookService.executeOnce(
        paymentRequestKey("DH-FUL-", idempotencyKey),
        context.actor(),
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> fulfillment(id, request));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action export(
      Long id, String idempotencyKey, AdminOrderRequest.Export request) {

    validateId(id);

    return cashbookService.executeOnce(
        paymentRequestKey("DH-EXP-", idempotencyKey),
        context.actor(),
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> export(id, request));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action cancel(
      Long id, String idempotencyKey, AdminOrderRequest.Cancel request) {

    validateId(id);

    return cashbookService.executeOnce(
        paymentRequestKey("DH-CAN-", idempotencyKey),
        context.actor(),
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> cancel(id, request));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action pickup(
      Long id, String idempotencyKey, AdminOrderRequest.Pickup request) {

    validateId(id);

    if (!Boolean.TRUE.equals(request.getXacNhanDaNhanHang())) {
      throw invalid("Phải xác nhận khách đã thực nhận hàng");
    }

    return cashbookService.executeOnce(
        paymentRequestKey("DH-PICK-", idempotencyKey),
        context.actor(),
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> pickup(id));
  }

  private String paymentRequestKey(String prefix, String value) {
    if (value == null
        || !value.matches(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-" + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")) {

      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }

    String normalized = UUID.fromString(value).toString();

    String key = prefix + normalized;

    if (key.length() > 50) {
      throw new IllegalStateException(
          "Khóa idempotency vượt giới hạn sales_idempotency.request_key");
    }

    return key;
  }
}
