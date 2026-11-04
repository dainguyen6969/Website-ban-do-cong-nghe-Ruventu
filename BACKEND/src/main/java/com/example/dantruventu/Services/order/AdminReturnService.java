package com.example.dantruventu.Services.order;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminReturnCreateRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnPreviewRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnReceiveRequest;
import com.example.dantruventu.DTO.Request.order.AdminReturnRefundRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.cashbook.CashVoucherResponse;
import com.example.dantruventu.DTO.Response.order.AdminReturnResponse;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.LoaiThuChi;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhieuGiaoHang;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Entity.ThietBiBaoHanh;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiBaoHanh;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiTraHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.AdminReturnOrderRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.ChiTietTraHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.order.PhieuTraHangRepository;
import com.example.dantruventu.Repository.order.ThietBiBaoHanhRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Specification.PhieuTraHangSpecification;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReturnService {

  private static final String REFUND_CASH_TYPE_CODE = "CHI_HOAN_DON_HANG";
  private static final String REFUND_IDEMPOTENCY_PREFIX = "TH-REFUND-REQ-";
  private static final String UUID_PATTERN =
      "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-" + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
  private static final Set<String> REFUND_PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN");
  private static final Set<TrangThaiTraHang> RELEASED_RETURN_STATUSES =
      Set.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI);

  private final PhieuTraHangRepository returnRepository;
  private final AdminReturnOrderRepository returnOrderRepository;
  private final ThietBiBaoHanhRepository warrantyDeviceRepository;
  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository orderLineRepository;
  private final ChiTietTraHangRepository returnLineRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final SoQuyThuChiRepository cashRepository;
  private final LoaiThuChiRepository cashTypeRepository;
  private final CashbookService cashbookService;
  private final ReturnInventoryService returnInventoryService;
  private final SalesProperties salesProperties;
  private final OrderEvents orderEvents;
  private final EntityManager entityManager;
  private final ReturnMoneySnapshotService returnMoneySnapshots;

  @Transactional
  public AdminReturnResponse.RefundResponse refund(
      Long returnId, String idempotencyKey, AdminReturnRefundRequest request, NguoiDung actor) {

    validateId(returnId, "ID phiếu trả không hợp lệ");
    if (request == null) {
      throw invalid("Thiếu dữ liệu hoàn tiền");
    }
    if (actor == null || actor.getId() == null || actor.getId() <= 0) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    String requestKey = refundRequestKey(idempotencyKey);

    return cashbookService.executeOnce(
        requestKey,
        actor,
        List.of(returnId, request),
        AdminReturnResponse.RefundResponse.class,
        () -> doRefund(returnId, request, actor));
  }

  private AdminReturnResponse.RefundResponse doRefund(
      Long returnId, AdminReturnRefundRequest request, NguoiDung actor) {

    if (!Boolean.TRUE.equals(request.getXacNhanDaHoanTien())) {
      throw invalid("Phải xác nhận đã hoàn tiền thực tế cho khách");
    }

    String paymentMethod = request.getPhuongThucHoan();
    if (paymentMethod == null || !REFUND_PAYMENT_METHODS.contains(paymentMethod)) {
      throw invalid("Phương thức hoàn tiền chỉ nhận TIEN_MAT hoặc CHUYEN_KHOAN");
    }

    String transactionCode = normalizeNote(request.getMaGiaoDich());
    if ("CHUYEN_KHOAN".equals(paymentMethod) && transactionCode == null) {
      throw invalid("Hoàn tiền chuyển khoản phải có mã giao dịch");
    }

    PhieuTraHang returnSlip =
        returnRepository
            .findByIdForUpdate(returnId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    if (returnSlip.getTrangThaiTraHang() == TrangThaiTraHang.DA_HOAN_TIEN
        || returnSlip.getTrangThaiTraHang() == TrangThaiTraHang.HOAN_TAT) {
      throw new AppException(ErrorCode.CONFLICT, "Phiếu trả đã kết thúc");
    }

    if (returnSlip.getTrangThaiTraHang() != TrangThaiTraHang.DA_NHAN_HANG) {
      throw new AppException(ErrorCode.CONFLICT, "Phiếu trả chưa nhận hàng");
    }

    BigDecimal totalRefund = validatedRefundTotal(returnSlip);
    ensureCodReconciled(returnSlip.getDonHang());

    String voucherCode = "CHI-TH-" + returnSlip.getId();
    if (cashRepository.findByBusinessKey(voucherCode).isPresent()
        || cashRepository.existsByLoaiPhieuAndNguonTaoAndMaChungTuThamChieuAndSoTien(
            LoaiPhieuThuChi.CHI,
            NguonTaoPhieuThuChi.TU_DONG,
            returnSlip.getMaTraHang(),
            totalRefund)) {
      throw new AppException(ErrorCode.CONFLICT, "Phiếu chi hoàn tiền đã tồn tại");
    }

    requireRefundCashTypeConfiguration();

    NguoiDung customer = returnSlip.getKhachHang();
    String description = "Hoàn tiền phiếu trả " + returnSlip.getMaTraHang();
    if (transactionCode != null) {
      description += "; Mã giao dịch: " + transactionCode;
    }

    SoQuyThuChi expense =
        cashbookService.createAutomatic(
            CashbookService.AutomaticVoucher.builder()
                .khoaNghiepVu(voucherCode)
                .loaiPhieu(LoaiPhieuThuChi.CHI)
                .maLoaiThuChi(REFUND_CASH_TYPE_CODE)
                .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.KHACH_HANG)
                .nguoiNopNhan(customer)
                .tenDoiTuongTuDo(customer == null ? refundRecipientName(returnSlip) : null)
                .maChungTuThamChieu(returnSlip.getMaTraHang())
                .soTien(totalRefund)
                .phuongThucThanhToan(paymentMethod)
                .ngayGhiNhan(request.getNgayHoanTien())
                .moTa(description)
                .nguoiTao(actor)
                .phieuTraHang(returnSlip)
                .donHang(returnSlip.getDonHang())
                .build());

    returnSlip.setHinhThucHoanTien(paymentMethod);
    returnSlip.setTrangThaiTraHang(TrangThaiTraHang.HOAN_TAT);

    returnSlip.setNgayKetThuc(
        request
            .getNgayHoanTien()
            .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
            .toLocalDateTime());

    returnRepository.saveAndFlush(returnSlip);
    orderEvents.changed(returnSlip.getDonHang().getId(), "REFUNDED");

    return AdminReturnResponse.RefundResponse.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .trangThaiTraHang(returnSlip.getTrangThaiTraHang())
        .tongTienHoan(totalRefund)
        .hinhThucHoanTien(returnSlip.getHinhThucHoanTien())
        .phieuChi(CashVoucherResponse.from(expense))
        .build();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminReturnResponse.ReceiveResponse receive(
      Long returnId, AdminReturnReceiveRequest request, Long actorId) {

    requireReturnActor(actorId);
    validateId(returnId, "ID phiếu trả không hợp lệ");

    Long orderId =
        returnRepository
            .findById(returnId)
            .map(item -> item.getDonHang().getId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    DonHang order =
        orderRepository
            .findByIdForUpdate(orderId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));

    entityManager.refresh(order);

    orderLineRepository.findByDonHangIdForUpdate(orderId);

    PhieuTraHang slip =
        returnRepository
            .findByIdForUpdate(returnId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    entityManager.refresh(slip);

    if (!Objects.equals(slip.getDonHang().getId(), orderId)) {
      throw new AppException(ErrorCode.CONFLICT, "Liên kết phiếu trả đã thay đổi");
    }

    if (slip.getTrangThaiTraHang() != TrangThaiTraHang.CHO_TIEP_NHAN) {
      throw new AppException(ErrorCode.CONFLICT, "Phiếu trả không còn chờ tiếp nhận");
    }

    ensureReturnEligible(order);

    orderEvents.watchOrder(order);

    OffsetDateTime actual = request.getNgayNhanHang();

    if (actual == null || actual.isAfter(OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))) {
      throw invalid("Ngày nhận hàng không hợp lệ");
    }

    LocalDateTime receivedAt =
        actual.atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();

    if (order.getNgayHoanThanh() == null) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "don_hang_id",
          "HANDOVER_HISTORY_UNVERIFIED",
          "Chưa xác minh được thời điểm khách thực nhận");
    }

    if (receivedAt.isBefore(order.getNgayHoanThanh())) {
      throw invalid("Ngày nhận trả không được sớm hơn lúc khách nhận hàng");
    }

    List<ChiTietTraHang> returnLines =
        returnLineRepository.findByPhieuTraHang_IdOrderByIdAsc(returnId);

    // Xác minh tiền trước khi cập nhật tồn.
    String receivedSnapshot =
        returnMoneySnapshots.receivedSnapshot(
            slip, returnLines, actual, actorId, request.getHangNhan());

    List<AdminReturnResponse.ReceivedItem> receivedItems =
        returnInventoryService.receive(slip, order, request);

    Map<String, Object> receiptData = ReturnSnapshotJson.decode(receivedSnapshot);
    receiptData.put("hang_da_nhan", receivedItems);
    receiptData.put("hang_dang_giu", List.of());

    slip.setNgayNhanHang(receivedAt);

    if (slip.getNgayTiepNhanThucTe() == null) {
      slip.setNgayTiepNhanThucTe(receivedAt);
    }

    slip.setDuLieuNhanHang(ReturnSnapshotJson.encode(receiptData));

    boolean zeroRefund = slip.getTongTienHoan().signum() == 0;

    slip.setTrangThaiTraHang(
        zeroRefund ? TrangThaiTraHang.HOAN_TAT : TrangThaiTraHang.DA_NHAN_HANG);

    slip.setNgayKetThuc(zeroRefund ? receivedAt : null);

    returnRepository.saveAndFlush(slip);

    if (isFullyReceived(orderId)) {
      order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);

      orderRepository.saveAndFlush(order);
    }

    orderEvents.changed(orderId, "RETURN_RECEIVED");

    return AdminReturnResponse.ReceiveResponse.builder()
        .id(slip.getId())
        .trangThaiTraHang(slip.getTrangThaiTraHang())
        .hangDaNhan(receivedItems)
        .donHang(
            AdminReturnResponse.ReceivedOrder.builder()
                .id(order.getId())
                .trangThaiDonHang(order.getTrangThaiDonHang())
                .trangThaiThanhToan(order.getTrangThaiThanhToan())
                .trangThaiXuatKho(order.getTrangThaiXuatKho())
                .build())
        .build();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminReturnResponse.ReceiveResponse receive(
      Long returnId, AdminReturnReceiveRequest request, Long actorId, String requestKey) {

    NguoiDung actor = requireReturnActor(actorId);

    return cashbookService.executeOnce(
        CashbookService.uuidKey("TH-REC-", requestKey),
        actor,
        List.of(returnId, request),
        AdminReturnResponse.ReceiveResponse.class,
        () -> receive(returnId, request, actorId));
  }

  private NguoiDung requireReturnActor(Long actorId) {
    if (actorId == null || actorId <= 0) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    NguoiDung actor = entityManager.find(NguoiDung.class, actorId);

    if (actor == null || actor.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    return actor;
  }

  public AdminReturnResponse.DetailResponse getReturnDetail(Long returnId) {
    validateId(returnId, "ID phiếu trả không hợp lệ");

    PhieuTraHang returnSlip =
        returnRepository
            .findById(returnId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    List<ChiTietTraHang> returnLines = returnLineRepository.findSavedDetailLines(returnId);
    ReturnDetailSnapshot snapshot =
        ReturnDetailSnapshot.read(ReturnSnapshotJson.decode(returnSlip.getDuLieuNhanHang()));
    AdminReturnResponse.DetailRefundVoucher expense =
        returnRepository
            .findRefundExpenseByReturnId(returnId)
            .map(this::toDetailRefundVoucher)
            .orElse(null);
    TrangThaiTraHang status = toCurrentReturnStatus(returnSlip.getTrangThaiTraHang());

    return AdminReturnResponse.DetailResponse.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .donHang(
            AdminReturnResponse.OrderSummary.builder()
                .id(returnSlip.getDonHang().getId())
                .maDonHang(returnSlip.getDonHang().getMaDonHang())
                .build())
        .khachHangId(returnSlip.getKhachHang() == null ? null : returnSlip.getKhachHang().getId())
        .tenNguoiLienHe(returnSlip.getTenNguoiLienHe())
        .sdtNguoiLienHe(returnSlip.getSdtNguoiLienHe())
        .lyDoTra(returnSlip.getLyDoTra())
        .trangThaiTraHang(status)
        .chiTietTra(returnLines.stream().map(this::toDetailReturnLine).toList())
        .tongTienHoan(returnSlip.getTongTienHoan())
        .hinhThucHoanTien(returnSlip.getHinhThucHoanTien())
        .ngayTiepNhanThucTe(toOffsetDateTime(returnSlip.getNgayTiepNhanThucTe()))
        .ngayNhanHang(toOffsetDateTime(returnSlip.getNgayNhanHang()))
        .ngayKetThuc(toOffsetDateTime(returnSlip.getNgayKetThuc()))
        .lyDoKetThuc(returnSlip.getLyDoKetThuc())
        .mucDichKetThuc(snapshot.endPurpose())
        .ketQuaKiemTra(snapshot.inspection())
        .hangDangGiu(snapshot.heldItems())
        .hangDaNhan(snapshot.acceptedItems())
        .banGiaoLai(snapshot.handover())
        .pheDuyetNgoaiLe(snapshot.exceptionApproval())
        .phieuChi(expense)
        .thaoTacDuocPhep(
            snapshot.allowedActions(
                status,
                returnSlip.getTongTienHoan(),
                returnSlip.getNgayNhanHang(),
                returnSlip.getNgayKetThuc(),
                expense != null))
        .build();
  }

  private AdminReturnResponse.DetailRefundVoucher toDetailRefundVoucher(
      PhieuTraHangRepository.RefundExpenseProjection expense) {
    return AdminReturnResponse.DetailRefundVoucher.builder()
        .id(expense.getId())
        .maPhieu(expense.getMaPhieu())
        .phieuTraHangId(expense.getPhieuTraHangId())
        .loaiPhieu(expense.getLoaiPhieu())
        .soTien(expense.getSoTien())
        .phuongThucThanhToan(expense.getPhuongThucThanhToan())
        .tenNguoiNopNhan(expense.getTenNguoiNopNhan())
        .maChungTuThamChieu(expense.getMaChungTuThamChieu())
        .ngayGhiNhan(toOffsetDateTime(expense.getNgayGhiNhan()))
        .nguonTao(expense.getNguonTao())
        .trangThai(expense.getTrangThai())
        .build();
  }

  @Transactional
  public AdminReturnResponse.CreateResponse create(
      AdminReturnCreateRequest request, String idempotencyKey, NguoiDung actor) {
    if (actor == null || actor.getId() == null || actor.getId() <= 0) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }
    String requestKey = createRequestKey(idempotencyKey);
    Map<Long, Integer> requestedQuantities = validatedCreateSelection(request);
    return cashbookService.executeOnce(
        requestKey,
        actor,
        request,
        AdminReturnResponse.CreateResponse.class,
        () -> createUnderLock(request, requestedQuantities, actor));
  }

  private AdminReturnResponse.CreateResponse createUnderLock(
      AdminReturnCreateRequest request, Map<Long, Integer> requestedQuantities, NguoiDung actor) {
    DonHang order =
        orderRepository
            .findByIdForUpdate(request.getDonHangId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));
    ensureReturnEligible(order);
    ensureReturnDateEligible(order);
    orderEvents.watchOrder(order);

    // All creators lock order -> purchase lines in the same order before reading held rights.
    List<ChiTietDonHang> orderLines = orderLineRepository.findByDonHangIdForUpdate(order.getId());
    if (orderLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không có sản phẩm để trả");
    }
    Map<Long, ChiTietDonHang> linesById = new LinkedHashMap<>();
    for (ChiTietDonHang line : orderLines) {
      linesById.put(line.getId(), line);
    }
    for (Long lineId : requestedQuantities.keySet()) {
      if (!linesById.containsKey(lineId)) {
        throw new AppException(
            ErrorCode.NOT_FOUND, "Chi tiết đơn hàng không tồn tại trong đơn hàng đã chọn");
      }
    }
    ensureCreateWarrantyEligible(order, request.getChiTietTra(), linesById, requestedQuantities);
    Map<Long, ReturnStats> returnedStats = readReturnStats(order.getId());
    Map<Long, BigDecimal> linePayments = validatedLinePayments(order, orderLines);

    for (int index = 0; index < request.getChiTietTra().size(); index++) {
      var selected = request.getChiTietTra().get(index);
      ChiTietDonHang line = linesById.get(selected.getChiTietDonHangId());
      ReturnStats previous = returnedStats.getOrDefault(line.getId(), ReturnStats.empty());
      int purchased = requiredPurchasedQuantity(line);
      if (previous.quantity() < 0 || previous.quantity() > purchased) {
        throw new AppException(ErrorCode.CONFLICT, "Số lượng trả của đơn hàng không nhất quán");
      }
      if (selected.getSoLuong() > purchased - previous.quantity()) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "chi_tiet_tra[" + index + "].so_luong",
            "RETURN_QUANTITY_EXCEEDED",
            "Số lượng yêu cầu vượt quyền trả còn lại");
      }
    }
    ensurePreviewFullReturnPolicy(orderLines, requestedQuantities, returnedStats);
    ensurePreviewDeviceEvidence(order, orderLines, requestedQuantities);

    List<ReturnRefundCalculator.Quote> quotes = new ArrayList<>();
    BigDecimal totalRefund = BigDecimal.ZERO.setScale(0);
    for (var selected : request.getChiTietTra()) {
      ChiTietDonHang line = linesById.get(selected.getChiTietDonHangId());
      ReturnStats previous = returnedStats.getOrDefault(line.getId(), ReturnStats.empty());
      var quote =
          ReturnRefundCalculator.quote(
              linePayments.get(line.getId()),
              requiredPurchasedQuantity(line),
              selected.getSoLuong(),
              previous.quantity(),
              previous.amount());
      quotes.add(quote);
      totalRefund = totalRefund.add(quote.lineRefund());
    }

    PhieuTraHang returnSlip =
        PhieuTraHang.builder()
            .maTraHang("TH-TMP-" + UUID.randomUUID())
            .donHang(order)
            .khachHang(order.getKhachHang())
            .nguoiTao(actor)
            .tenNguoiLienHe(request.getTenNguoiLienHe().strip())
            .sdtNguoiLienHe(request.getSdtNguoiLienHe().strip())
            .tongTienHoan(totalRefund)
            .hinhThucHoanTien(request.getHinhThucHoanTien())
            .trangThaiTraHang(TrangThaiTraHang.CHO_TIEP_NHAN)
            .lyDoTra(request.getLyDoTra().strip())
            .ghiChu(normalizeNote(request.getGhiChu()))
            .duLieuNhanHang(
                creationPolicyEvidence(
                    order, actor, requestedQuantities, returnedStats, linePayments))
            .build();
    returnSlip = returnRepository.saveAndFlush(returnSlip);
    returnSlip.setMaTraHang(String.format(Locale.ROOT, "TH%06d", returnSlip.getId()));
    returnSlip = returnRepository.saveAndFlush(returnSlip);

    List<ChiTietTraHang> returnLines = new ArrayList<>();
    for (int index = 0; index < request.getChiTietTra().size(); index++) {
      var selected = request.getChiTietTra().get(index);
      var quote = quotes.get(index);
      returnLines.add(
          ChiTietTraHang.builder()
              .phieuTraHang(returnSlip)
              .chiTietDonHang(linesById.get(selected.getChiTietDonHangId()))
              .soLuong(selected.getSoLuong())
              .donGiaHoan(quote.unitRefund())
              .thanhTienHoan(quote.lineRefund())
              .build());
    }
    returnLines = returnLineRepository.saveAllAndFlush(returnLines);
    orderEvents.changed(order.getId(), "RETURN_CREATED");

    return AdminReturnResponse.CreateResponse.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .donHangId(order.getId())
        .khachHangId(order.getKhachHang() == null ? null : order.getKhachHang().getId())
        .tenNguoiLienHe(returnSlip.getTenNguoiLienHe())
        .sdtNguoiLienHe(returnSlip.getSdtNguoiLienHe())
        .trangThaiTraHang(returnSlip.getTrangThaiTraHang())
        .chiTietTra(returnLines.stream().map(this::toReturnLineResponse).toList())
        .tongTienHoan(returnSlip.getTongTienHoan())
        .ngayTao(toOffsetDateTime(returnSlip.getNgayTao()))
        .build();
  }

  private Map<Long, Integer> validatedCreateSelection(AdminReturnCreateRequest request) {
    if (request == null) {
      throw invalid("Thiếu dữ liệu lập phiếu trả");
    }
    validateId(request.getDonHangId(), "ID đơn hàng không hợp lệ");
    requiredCreateText(request.getTenNguoiLienHe(), "Tên người liên hệ", 100);
    requiredCreateText(request.getSdtNguoiLienHe(), "Số điện thoại người liên hệ", 20);
    requiredCreateText(request.getLyDoTra(), "Lý do trả hàng", 255);
    if (!REFUND_PAYMENT_METHODS.contains(
        request.getHinhThucHoanTien() == null ? "" : request.getHinhThucHoanTien())) {
      throw invalid("Hình thức hoàn tiền chỉ nhận TIEN_MAT hoặc CHUYEN_KHOAN");
    }
    if (request.getGhiChu() != null && request.getGhiChu().length() > 2000) {
      throw invalid("Ghi chú tối đa 2000 ký tự");
    }
    if (request.getPheDuyetNgoaiLe() != null) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Cần xác minh căn cứ và quyền phê duyệt ngoại lệ");
    }
    if (request.getChiTietTra() == null || request.getChiTietTra().isEmpty()) {
      throw invalid("Phải chọn ít nhất một sản phẩm trả");
    }
    if (request.getChiTietTra().size() > 1000) {
      throw invalid("Tối đa 1000 dòng sản phẩm trả");
    }
    Map<Long, Integer> result = new LinkedHashMap<>();
    for (var selected : request.getChiTietTra()) {
      if (selected == null) {
        throw invalid("Chi tiết trả không hợp lệ");
      }
      validateId(selected.getChiTietDonHangId(), "Chi tiết đơn hàng không hợp lệ");
      if (selected.getSoLuong() == null || selected.getSoLuong() <= 0) {
        throw invalid("Số lượng trả phải là số nguyên dương");
      }
      if (result.putIfAbsent(selected.getChiTietDonHangId(), selected.getSoLuong()) != null) {
        throw invalid("Không được lặp chi tiết đơn hàng trong cùng phiếu trả");
      }
    }
    return result;
  }

  private void requiredCreateText(String value, String label, int maximumLength) {
    if (value == null || value.isBlank()) {
      throw invalid(label + " không được để trống");
    }
    if (value.length() > maximumLength) {
      throw invalid(label + " tối đa " + maximumLength + " ký tự");
    }
  }

  private String createRequestKey(String value) {
    if (value == null || !value.matches(UUID_PATTERN)) {
      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }
    return "TH-CREATE-" + value.toLowerCase(Locale.ROOT);
  }

  private void ensureCreateWarrantyEligible(
      DonHang order,
      List<AdminReturnCreateRequest.ReturnLine> selectedLines,
      Map<Long, ChiTietDonHang> linesById,
      Map<Long, Integer> requestedQuantities) {
    Set<Long> blockedLines =
        new HashSet<>(
            returnOrderRepository.findOrderLineIdsWithOpenWarranties(
                requestedQuantities.keySet(), TrangThaiBaoHanh.HOAN_TAT));
    Set<Long> legacyVariants =
        new HashSet<>(
            returnOrderRepository.findOpenLegacyWarrantyVariantIds(
                order.getId(), TrangThaiBaoHanh.HOAN_TAT));
    for (int index = 0; index < selectedLines.size(); index++) {
      Long lineId = selectedLines.get(index).getChiTietDonHangId();
      boolean legacyConflict =
          !legacyVariants.isEmpty()
              && physicalVariantIds(linesById.get(lineId)).stream()
                  .anyMatch(legacyVariants::contains);
      if (blockedLines.contains(lineId) || legacyConflict) {
        throw new AppException(
            ErrorCode.CONFLICT,
            "chi_tiet_tra[" + index + "].chi_tiet_don_hang_id",
            "ORDER_LINE_WARRANTY_OPEN",
            "Dòng mua đang được xử lý bảo hành");
      }
    }
  }

  private String creationPolicyEvidence(
      DonHang order,
      NguoiDung actor,
      Map<Long, Integer> requestedQuantities,
      Map<Long, ReturnStats> returnedStats,
      Map<Long, BigDecimal> linePayments) {
    int windowDays = salesProperties.getReturnWindowDays();
    Map<String, Object> decision = new LinkedHashMap<>();
    decision.put("du_dieu_kien", true);
    decision.put("nguoi_xac_minh_id", actor.getId());
    decision.put("thoi_diem_xac_minh", OffsetDateTime.now(salesProperties.zone()).toString());
    decision.put("ngay_khach_thuc_nhan", toOffsetDateTime(order.getNgayHoanThanh()).toString());
    decision.put("thoi_han_tra_ngay", windowDays);
    decision.put(
        "han_lap_yeu_cau",
        toOffsetDateTime(order.getNgayHoanThanh().plusDays(windowDays)).toString());
    List<Map<String, Object>> evidence = new ArrayList<>();
    for (var selected : requestedQuantities.entrySet()) {
      ReturnStats previous = returnedStats.getOrDefault(selected.getKey(), ReturnStats.empty());
      Map<String, Object> line = new LinkedHashMap<>();
      line.put("chi_tiet_don_hang_id", selected.getKey());
      line.put("so_luong_yeu_cau", selected.getValue());
      line.put("thanh_toan_dong", linePayments.get(selected.getKey()));
      line.put("so_luong_da_yeu_cau_tra", previous.quantity());
      line.put("tien_da_yeu_cau_tra", previous.amount());
      evidence.add(line);
    }
    decision.put("chi_tiet", evidence);
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("kiem_tra_chinh_sach_khi_lap", decision);
    return ReturnSnapshotJson.encode(snapshot);
  }

  @Transactional(readOnly = true)
  public AdminReturnResponse.PreviewResponse preview(AdminReturnPreviewRequest request) {
    Map<Long, Integer> requestedQuantities = validatedPreviewSelection(request);
    if (request.getPheDuyetNgoaiLe() != null) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Cần xác minh căn cứ và quyền phê duyệt ngoại lệ");
    }

    DonHang order =
        orderRepository
            .findById(request.getDonHangId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));
    ensureReturnEligible(order);
    ensureReturnDateEligible(order);

    List<ChiTietDonHang> orderLines =
        orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId());
    if (orderLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không có sản phẩm để trả");
    }
    Map<Long, ChiTietDonHang> linesById = new LinkedHashMap<>();
    for (ChiTietDonHang line : orderLines) {
      linesById.put(line.getId(), line);
    }
    for (Long lineId : requestedQuantities.keySet()) {
      if (!linesById.containsKey(lineId)) {
        throw new AppException(
            ErrorCode.NOT_FOUND, "Chi tiết đơn hàng không tồn tại trong đơn hàng đã chọn");
      }
    }
    if (returnOrderRepository.countOpenWarrantiesForOrderLines(
            requestedQuantities.keySet(), TrangThaiBaoHanh.HOAN_TAT)
        > 0) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "chi_tiet_tra",
          "ORDER_LINE_WARRANTY_OPEN",
          "Dòng mua đang được xử lý bảo hành");
    }

    Map<Long, ReturnStats> returnedStats = readReturnStats(order.getId());
    Map<Long, BigDecimal> linePayments = validatedLinePayments(order, orderLines);
    ensurePreviewFullReturnPolicy(orderLines, requestedQuantities, returnedStats);

    List<AdminReturnResponse.PreviewLine> quotes = new ArrayList<>();
    BigDecimal totalRefund = BigDecimal.ZERO.setScale(0);
    for (Map.Entry<Long, Integer> entry : requestedQuantities.entrySet()) {
      ChiTietDonHang line = linesById.get(entry.getKey());
      ReturnStats previous = returnedStats.getOrDefault(line.getId(), ReturnStats.empty());
      var quote =
          ReturnRefundCalculator.quote(
              linePayments.get(line.getId()),
              requiredPurchasedQuantity(line),
              entry.getValue(),
              previous.quantity(),
              previous.amount());
      quotes.add(
          AdminReturnResponse.PreviewLine.builder()
              .chiTietDonHangId(line.getId())
              .soLuong(entry.getValue())
              .donGiaHoan(quote.unitRefund())
              .thanhTienHoan(quote.lineRefund())
              .dieuChinhLamTron(quote.roundingAdjustment())
              .build());
      totalRefund = totalRefund.add(quote.lineRefund());
    }
    ensurePreviewDeviceEvidence(order, orderLines, requestedQuantities);

    return AdminReturnResponse.PreviewResponse.builder()
        .donHangId(order.getId())
        .duDieuKien(true)
        .chiTietTra(List.copyOf(quotes))
        .tongTienHoan(totalRefund)
        .daGiuQuyenTra(false)
        .canKiemTraLaiKhiTao(true)
        .build();
  }

  private Map<Long, Integer> validatedPreviewSelection(AdminReturnPreviewRequest request) {
    if (request == null) {
      throw invalid("Phải gửi dữ liệu tính thử phiếu trả");
    }
    validateId(request.getDonHangId(), "ID đơn hàng không hợp lệ");
    if (request.getChiTietTra() == null || request.getChiTietTra().isEmpty()) {
      throw invalid("Phải chọn ít nhất một sản phẩm trả");
    }
    Map<Long, Integer> requested = new LinkedHashMap<>();
    for (AdminReturnPreviewRequest.ReturnLine line : request.getChiTietTra()) {
      if (line == null) {
        throw invalid("Chi tiết trả không hợp lệ");
      }
      validateId(line.getChiTietDonHangId(), "Chi tiết đơn hàng không hợp lệ");
      if (line.getSoLuong() == null || line.getSoLuong() <= 0) {
        throw invalid("Số lượng trả phải là số nguyên dương");
      }
      if (requested.putIfAbsent(line.getChiTietDonHangId(), line.getSoLuong()) != null) {
        throw invalid("Không được lặp chi tiết đơn hàng trong cùng yêu cầu trả");
      }
    }
    return requested;
  }

  private void ensurePreviewFullReturnPolicy(
      List<ChiTietDonHang> orderLines,
      Map<Long, Integer> requestedQuantities,
      Map<Long, ReturnStats> returnedStats) {
    if (!requiresFullReturn(orderLines)) {
      return;
    }
    if (returnedStats.values().stream().anyMatch(stats -> stats.quantity() > 0)) {
      throw new AppException(
          ErrorCode.CONFLICT, "Đơn có combo hoặc quà đã có yêu cầu trả còn hiệu lực");
    }
    boolean complete = requestedQuantities.size() == orderLines.size();
    for (ChiTietDonHang line : orderLines) {
      int purchased = requiredPurchasedQuantity(line);
      if (!Objects.equals(requestedQuantities.get(line.getId()), purchased)) {
        complete = false;
      }
    }
    if (!complete) {
      boolean hasGift =
          orderLines.stream().anyMatch(line -> Boolean.TRUE.equals(line.getLaQuaTang()));
      String message =
          hasGift
              ? "Đơn có quà phải chọn trả toàn bộ hàng đã giao"
              : "Đơn có combo phải chọn trả toàn bộ hàng đã giao";
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "chi_tiet_tra", "FULL_ORDER_RETURN_REQUIRED", message);
    }
  }

  private void ensurePreviewDeviceEvidence(
      DonHang order, List<ChiTietDonHang> orderLines, Map<Long, Integer> requestedQuantities) {
    Map<Long, SoldConfigurationSnapshot.Snapshot> snapshots = new HashMap<>();
    for (ChiTietDonHang line : orderLines) {
      if (requestedQuantities.containsKey(line.getId())
          && line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC) {
        snapshots.put(
            line.getId(),
            SoldConfigurationSnapshot.read(
                ReturnSnapshotJson.decode(line.getCauHinhDaBan()),
                requiredPurchasedQuantity(line)));
      }
    }
    Map<Long, List<AdminReturnResponse.EligibleCurrentDevice>> devicesByLine =
        currentDevicesByLine(order, orderLines);
    addRecordedPhysicalUnitCodes(snapshots, devicesByLine);
    for (Map.Entry<Long, Integer> requested : requestedQuantities.entrySet()) {
      List<AdminReturnResponse.EligibleCurrentDevice> devices =
          devicesByLine.getOrDefault(requested.getKey(), List.of());
      var snapshot = snapshots.get(requested.getKey());
      if (snapshot != null) {
        Set<String> actualCodes = new HashSet<>();
        for (var device : devices) {
          if (!hasDeviceIdentification(device)
              || device.getMaDonViVatLy() == null
              || !actualCodes.add(device.getMaDonViVatLy())) {
            throw SoldConfigurationSnapshot.missing();
          }
        }
        if (!actualCodes.equals(snapshot.unitCodes())) {
          throw SoldConfigurationSnapshot.missing();
        }
      } else if (devices.stream().filter(this::hasDeviceIdentification).count()
          < requested.getValue()) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "chi_tiet_tra",
            "CURRENT_DEVICE_IDENTIFICATION_MISSING",
            "Cần xác minh nhận dạng thiết bị hiện hành của dòng mua");
      }
    }
  }

  public AdminReturnResponse.EligibleOrderDetailResponse getEligibleOrderDetail(Long orderId) {
    validateId(orderId, "ID đơn hàng không hợp lệ");
    DonHang order =
        orderRepository
            .findById(orderId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));
    ensureReturnEligible(order);
    ensureReturnDateEligible(order);

    if (returnOrderRepository.countOpenWarranties(orderId, TrangThaiBaoHanh.HOAN_TAT) > 0) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "orderId",
          "ORDER_LINE_WARRANTY_OPEN",
          "Dòng mua đang được xử lý bảo hành");
    }

    List<ChiTietDonHang> orderLines = orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);
    if (orderLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không có sản phẩm để trả");
    }
    Map<Long, ReturnStats> returnedStats = readReturnStats(orderId);
    Map<Long, BigDecimal> linePayments = validatedLinePayments(order, orderLines);
    boolean fullReturnOnly = requiresFullReturn(orderLines);
    if (fullReturnOnly && returnedStats.values().stream().anyMatch(stats -> stats.quantity() > 0)) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "Đơn có combo, quà tặng hoặc phiên bản lặp chỉ được trả toàn bộ một lần");
    }

    Map<Long, SoldConfigurationSnapshot.Snapshot> snapshots = new HashMap<>();
    for (ChiTietDonHang line : orderLines) {
      if (line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC) {
        snapshots.put(
            line.getId(),
            SoldConfigurationSnapshot.read(
                ReturnSnapshotJson.decode(line.getCauHinhDaBan()),
                line.getSoLuong() == null ? 0 : line.getSoLuong()));
      }
    }
    Map<Long, List<AdminReturnResponse.EligibleCurrentDevice>> devicesByLine =
        currentDevicesByLine(order, orderLines);
    addRecordedPhysicalUnitCodes(snapshots, devicesByLine);
    List<AdminReturnResponse.EligibleOrderLine> responseLines =
        orderLines.stream()
            .map(
                line ->
                    toEligibleOrderLine(
                        line,
                        returnedStats.getOrDefault(line.getId(), ReturnStats.empty()),
                        linePayments.get(line.getId()),
                        devicesByLine.getOrDefault(line.getId(), List.of())))
            .toList();
    if (responseLines.stream().noneMatch(line -> line.getSoLuongConDuocTra() > 0)) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không còn số lượng sản phẩm được trả");
    }

    List<AdminReturnResponse.EligibilityBlockReason> blockedReasons = new ArrayList<>();
    for (AdminReturnResponse.EligibleOrderLine line : responseLines) {
      var snapshot = snapshots.get(line.getChiTietDonHangId());
      if (snapshot != null) {
        Set<String> actualUnitCodes = new HashSet<>();
        for (var device : line.getThietBiHienHanh()) {
          if (!hasDeviceIdentification(device)
              || device.getMaDonViVatLy() == null
              || !actualUnitCodes.add(device.getMaDonViVatLy())) {
            throw SoldConfigurationSnapshot.missing();
          }
        }
        if (!actualUnitCodes.equals(snapshot.unitCodes())) {
          throw SoldConfigurationSnapshot.missing();
        }
      } else if (line.getSoLuongConDuocTra() > 0
          && line.getThietBiHienHanh().stream().filter(this::hasDeviceIdentification).count()
              < line.getSoLuongConDuocTra()) {
        blockedReasons.add(
            AdminReturnResponse.EligibilityBlockReason.builder()
                .chiTietDonHangId(line.getChiTietDonHangId())
                .code("CURRENT_DEVICE_IDENTIFICATION_MISSING")
                .message("Cần xác minh nhận dạng thiết bị hiện hành của dòng mua")
                .build());
      }
    }

    return AdminReturnResponse.EligibleOrderDetailResponse.builder()
        .donHang(
            AdminReturnResponse.EligibleOrderSummary.builder()
                .id(order.getId())
                .maDonHang(order.getMaDonHang())
                .khachHangId(order.getKhachHang() == null ? null : order.getKhachHang().getId())
                .ngayHoanThanh(toOffsetDateTime(order.getNgayHoanThanh()))
                .build())
        .duDieuKienLapPhieu(blockedReasons.isEmpty())
        .lyDoChan(List.copyOf(blockedReasons))
        .chiDuocTraToanBo(fullReturnOnly)
        .chiTiet(responseLines)
        .build();
  }

  private boolean hasDeviceIdentification(AdminReturnResponse.EligibleCurrentDevice device) {
    return (device.getThietBiId() != null && normalizeText(device.getMaTheoDoi()) != null)
        || (device.getSoSerialId() != null && normalizeText(device.getSoSerial()) != null);
  }

  private void addRecordedPhysicalUnitCodes(
      Map<Long, SoldConfigurationSnapshot.Snapshot> snapshots,
      Map<Long, List<AdminReturnResponse.EligibleCurrentDevice>> devicesByLine) {
    if (snapshots.isEmpty()) {
      return;
    }
    if (warrantyDeviceRepository.countWarrantyHistoryTables() == 0) {
      throw SoldConfigurationSnapshot.missing();
    }

    List<Long> comboLineIds = snapshots.keySet().stream().sorted().toList();
    var identities =
        warrantyDeviceRepository.findRecordedPhysicalIdentities(comboLineIds).stream()
            .map(
                identity ->
                    new SoldConfigurationSnapshot.Identity(
                        identity.getThietBiId(),
                        identity.getChiTietDonHangId(),
                        identity.getMaDonViVatLy()))
            .toList();
    var replacements =
        warrantyDeviceRepository
            .findCompletedReplacements(comboLineIds, TrangThaiBaoHanh.HOAN_TAT)
            .stream()
            .map(
                replacement ->
                    new SoldConfigurationSnapshot.Replacement(
                        replacement.getPreviousDeviceId(), replacement.getReplacementDeviceId()))
            .toList();
    Map<Long, String> codesByDevice =
        SoldConfigurationSnapshot.resolveUnitCodes(snapshots, identities, replacements);

    for (Long lineId : comboLineIds) {
      for (var device : devicesByLine.getOrDefault(lineId, List.of())) {
        device.setMaDonViVatLy(codesByDevice.get(device.getThietBiId()));
      }
    }
  }

  public AdminReturnResponse.EligibleOrderListResponse getEligibleOrders(
      String keyword, int page, int limit) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    var result =
        returnOrderRepository.findEligibleOrders(
            normalizedKeyword,
            TrangThaiDonHang.HOAN_THANH,
            TrangThaiThanhToanDonHang.DA_THANH_TOAN,
            TrangThaiXuatKho.DA_XUAT_KHO,
            Set.of(TrangThaiTraHang.HUY, TrangThaiTraHang.TU_CHOI),
            TrangThaiBaoHanh.HOAN_TAT,
            PageRequest.of(
                page, limit, Sort.by(Sort.Order.desc("ngayHoanThanh"), Sort.Order.desc("id"))));

    List<Long> orderIds = result.getContent().stream().map(DonHang::getId).toList();
    Set<Long> fullReturnOrderIds =
        orderIds.isEmpty()
            ? Set.of()
            : Set.copyOf(
                orderLineRepository.findOrderIdsRequiringFullReturn(orderIds, LoaiSanPham.BO_PC));

    return AdminReturnResponse.EligibleOrderListResponse.builder()
        .items(
            result.getContent().stream()
                .map(
                    order -> toEligibleOrderItem(order, fullReturnOrderIds.contains(order.getId())))
                .toList())
        .pagination(
            PaginationResponse.builder()
                .page(result.getNumber())
                .limit(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build())
        .build();
  }

  public AdminReturnResponse.ListResponse getReturns(
      String keyword,
      TrangThaiTraHang returnStatus,
      String rawFrom,
      String rawTo,
      int page,
      int limit) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    OffsetDateTime from = parseFilterDateTime(rawFrom, "tu_ngay");
    OffsetDateTime to = parseFilterDateTime(rawTo, "den_ngay");
    if (from != null && to != null && !from.isBefore(to)) {
      throw invalid("tu_ngay phải nhỏ hơn den_ngay");
    }

    LocalDateTime fromInclusive = toStoreDateTime(from);
    LocalDateTime toExclusive = toStoreDateTime(to);

    var result =
        returnRepository.findAll(
            PhieuTraHangSpecification.build(
                normalizedKeyword, returnStatus, fromInclusive, toExclusive),
            PageRequest.of(
                page, limit, Sort.by(Sort.Order.desc("ngayTao"), Sort.Order.desc("id"))));

    return AdminReturnResponse.ListResponse.builder()
        .items(result.getContent().stream().map(this::toListItem).toList())
        .pagination(
            PaginationResponse.builder()
                .page(result.getNumber())
                .limit(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build())
        .build();
  }

  private AdminReturnResponse.ListItem toListItem(PhieuTraHang returnSlip) {
    NguoiDung customer = returnSlip.getKhachHang();
    DonHang order = returnSlip.getDonHang();

    String contactName = firstNonBlank(returnSlip.getTenNguoiLienHe(), order.getTenNguoiNhan());
    String contactPhone = firstNonBlank(returnSlip.getSdtNguoiLienHe(), order.getSdtNguoiNhan());
    if (contactName == null && customer != null) {
      contactName = normalizeText(customer.getHoTen());
    }
    if (contactPhone == null && customer != null) {
      contactPhone = normalizeText(customer.getSoDienThoai());
    }

    return AdminReturnResponse.ListItem.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .donHang(
            AdminReturnResponse.OrderSummary.builder()
                .id(order.getId())
                .maDonHang(order.getMaDonHang())
                .build())
        .khachHangId(customer == null ? null : customer.getId())
        .tenNguoiLienHe(contactName)
        .sdtNguoiLienHe(contactPhone)
        .tongTienHoan(returnSlip.getTongTienHoan())
        .lyDoTra(returnSlip.getLyDoTra())
        .trangThaiTraHang(toCurrentReturnStatus(returnSlip.getTrangThaiTraHang()))
        .ngayTao(toOffsetDateTime(returnSlip.getNgayTao()))
        .build();
  }

  private TrangThaiTraHang toCurrentReturnStatus(TrangThaiTraHang status) {
    return status == TrangThaiTraHang.DA_HOAN_TIEN ? TrangThaiTraHang.HOAN_TAT : status;
  }

  private OffsetDateTime parseFilterDateTime(String value, String field) {
    if (value == null) {
      return null;
    }
    if (value.isBlank()) {
      throw invalid(field + " không hợp lệ");
    }
    try {
      return OffsetDateTime.parse(value.trim());
    } catch (DateTimeParseException exception) {
      throw invalid(field + " không hợp lệ");
    }
  }

  private LocalDateTime toStoreDateTime(OffsetDateTime value) {
    return value == null ? null : value.atZoneSameInstant(salesProperties.zone()).toLocalDateTime();
  }

  private OffsetDateTime toOffsetDateTime(LocalDateTime value) {
    return value == null ? null : value.atZone(salesProperties.zone()).toOffsetDateTime();
  }

  private String firstNonBlank(String first, String second) {
    String normalized = normalizeText(first);
    return normalized != null ? normalized : normalizeText(second);
  }

  private String normalizeText(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private AdminReturnResponse.EligibleOrderItem toEligibleOrderItem(
      DonHang order, boolean fullReturnOnly) {
    NguoiDung customer = order.getKhachHang();

    return AdminReturnResponse.EligibleOrderItem.builder()
        .id(order.getId())
        .maDonHang(order.getMaDonHang())
        .khachHangId(customer == null ? null : customer.getId())
        .tenNguoiLienHe(
            firstNonBlank(order.getTenNguoiNhan(), customer == null ? null : customer.getHoTen()))
        .sdtNguoiLienHe(
            firstNonBlank(
                order.getSdtNguoiNhan(), customer == null ? null : customer.getSoDienThoai()))
        .trangThaiDonHang(order.getTrangThaiDonHang())
        .trangThaiThanhToan(order.getTrangThaiThanhToan())
        .trangThaiXuatKho(order.getTrangThaiXuatKho())
        .ngayHoanThanh(toOffsetDateTime(order.getNgayHoanThanh()))
        .chiDuocTraToanBo(fullReturnOnly)
        .build();
  }

  private AdminReturnResponse.EligibleOrderLine toEligibleOrderLine(
      ChiTietDonHang line,
      ReturnStats returned,
      BigDecimal linePayment,
      List<AdminReturnResponse.EligibleCurrentDevice> currentDevices) {

    int purchasedQuantity = line.getSoLuong() == null ? 0 : line.getSoLuong();
    long returnedQuantity = returned.quantity();
    if (purchasedQuantity <= 0 || returnedQuantity < 0 || returnedQuantity > purchasedQuantity) {
      throw new AppException(ErrorCode.CONFLICT, "Số lượng trả của đơn hàng không nhất quán");
    }

    BigDecimal unitRefund =
        linePayment.divide(BigDecimal.valueOf(purchasedQuantity), 2, RoundingMode.HALF_UP);
    BigDecimal remainingAmount = linePayment.subtract(returned.amount());
    if (remainingAmount.signum() < 0) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Lịch sử tiền hoàn của dòng hàng không nhất quán");
    }

    var variant = line.getPhienBan();
    var product = variant.getSanPham();

    return AdminReturnResponse.EligibleOrderLine.builder()
        .chiTietDonHangId(line.getId())
        .phienBanId(variant.getId())
        .tenSanPham(product.getTenSanPham())
        .laQuaTang(Boolean.TRUE.equals(line.getLaQuaTang()))
        .soLuongDaGiao(purchasedQuantity)
        .soLuongDaYeuCauTra(returnedQuantity)
        .soLuongConDuocTra((long) purchasedQuantity - returnedQuantity)
        .tienChietKhau(line.getTienChietKhau())
        .thanhToanDong(linePayment)
        .soTienConDuocHoan(remainingAmount)
        .donGiaHoanDuKien(unitRefund)
        .thietBiHienHanh(currentDevices)
        .cauHinhDaBan(
            line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC
                ? ReturnSnapshotJson.decode(line.getCauHinhDaBan())
                : null)
        .build();
  }

  private void ensureReturnEligible(DonHang order) {
    if (order.getTrangThaiDonHang() != TrangThaiDonHang.HOAN_THANH
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không đủ điều kiện trả hàng");
    }
  }

  private void ensureReturnDateEligible(DonHang order) {
    LocalDateTime completedAt = order.getNgayHoanThanh();
    if (completedAt == null) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "Đơn hàng thiếu ngày khách thực nhận để xác minh thời hạn trả");
    }

    LocalDateTime now = LocalDateTime.now(salesProperties.zone());
    if (completedAt.isAfter(now)) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Ngày khách thực nhận của đơn hàng không hợp lệ");
    }

    int returnWindowDays = salesProperties.getReturnWindowDays();
    if (returnWindowDays < 0) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Cần xác minh chính sách thời hạn trả hàng");
    }
    if (completedAt.plusDays(returnWindowDays).isBefore(now)) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Đơn hàng đã quá thời hạn được yêu cầu trả");
    }
  }

  private Map<Long, BigDecimal> validatedLinePayments(
      DonHang order, List<ChiTietDonHang> orderLines) {
    Map<Long, BigDecimal> result = new LinkedHashMap<>();
    BigDecimal allocated = BigDecimal.ZERO.setScale(0);

    for (ChiTietDonHang line : orderLines) {
      if (line.getThanhToanDong() == null) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "orderId",
            "SALE_PAYMENT_SNAPSHOT_MISSING",
            "Cần xác minh tiền dòng của giao dịch mua trước khi lập phiếu trả");
      }
      BigDecimal payment =
          requiredVndHistory(
              line.getThanhToanDong(), "Dòng hàng " + line.getId() + " thiếu lịch sử thanh toán");
      result.put(line.getId(), payment);
      allocated = allocated.add(payment);
    }

    BigDecimal refundableTotal = refundableGoodsTotal(order);
    if (allocated.compareTo(refundableTotal) != 0) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "Lịch sử thanh toán từng dòng không khớp tổng tiền hàng được hoàn");
    }
    return result;
  }

  private BigDecimal requiredVndHistory(BigDecimal value, String missingMessage) {
    if (value == null) {
      throw new AppException(ErrorCode.UNPROCESSABLE_ENTITY, missingMessage);
    }
    if (value.signum() < 0) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Lịch sử thanh toán dòng hàng không hợp lệ");
    }
    try {
      return value.setScale(0, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Lịch sử thanh toán dòng hàng phải theo đơn vị VND");
    }
  }

  private boolean requiresFullReturn(List<ChiTietDonHang> orderLines) {
    boolean hasCombo =
        orderLines.stream()
            .anyMatch(
                line -> line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC);
    boolean hasGift =
        orderLines.stream().anyMatch(line -> Boolean.TRUE.equals(line.getLaQuaTang()));
    return hasCombo || hasGift;
  }

  private Map<Long, List<AdminReturnResponse.EligibleCurrentDevice>> currentDevicesByLine(
      DonHang order, List<ChiTietDonHang> orderLines) {
    Map<Long, List<AdminReturnResponse.EligibleCurrentDevice>> result = new LinkedHashMap<>();
    Map<Long, ChiTietDonHang> linesById = new HashMap<>();
    for (ChiTietDonHang line : orderLines) {
      result.put(line.getId(), new ArrayList<>());
      linesById.put(line.getId(), line);
    }

    List<Long> lineIds = orderLines.stream().map(ChiTietDonHang::getId).toList();
    Set<Long> trackedSerialIds = new HashSet<>();
    for (ThietBiBaoHanh device :
        warrantyDeviceRepository.findCurrentDevices(lineIds, TrangThaiBaoHanh.HOAN_TAT)) {
      Long lineId = device.getChiTietDonHang().getId();
      if (!linesById.containsKey(lineId)) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Lịch sử thiết bị hiện hành không thuộc đơn hàng đã chọn");
      }
      if (device.getSoSerial() != null && device.getSoSerial().getId() != null) {
        trackedSerialIds.add(device.getSoSerial().getId());
      }
      result.get(lineId).add(toCurrentDevice(device));
    }

    /*
     * Dữ liệu trước khi có bảng thiet_bi_bao_hanh vẫn có liên kết serial -> đơn.
     * Chỉ dùng liên kết đó làm fallback nhận dạng, không tự tạo lịch sử bảo hành.
     */
    for (SoSerialSanPham serial :
        serialRepository.findCurrentLegacyReturnSerials(
            order.getId(), TrangThaiSerial.DA_BAN, TrangThaiBaoHanh.HOAN_TAT)) {
      if (serial.getTrangThai() != TrangThaiSerial.DA_BAN) {
        continue;
      }
      if (serial.getId() != null && trackedSerialIds.contains(serial.getId())) {
        continue;
      }
      List<ChiTietDonHang> candidates =
          orderLines.stream()
              .filter(line -> physicalVariantIds(line).contains(serial.getPhienBan().getId()))
              .toList();
      if (candidates.size() == 1) {
        result.get(candidates.getFirst().getId()).add(toLegacyCurrentDevice(serial));
      }
    }

    Map<Long, List<AdminReturnResponse.EligibleCurrentDevice>> immutable = new LinkedHashMap<>();
    result.forEach((lineId, devices) -> immutable.put(lineId, List.copyOf(devices)));
    return immutable;
  }

  private Set<Long> physicalVariantIds(ChiTietDonHang line) {
    if (line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.DON) {
      return Set.of(line.getPhienBan().getId());
    }
    Map<String, Object> snapshot = ReturnSnapshotJson.decode(line.getCauHinhDaBan());
    if (snapshot == null || snapshot.isEmpty()) {
      return Set.of(line.getPhienBan().getId());
    }
    if (snapshot.containsKey("schema_version")) {
      return SoldConfigurationSnapshot.read(snapshot, line.getSoLuong()).variantIds();
    }
    // The shared sales writer records component IDs in its versioned JSON snapshot.
    // This lookup establishes variant membership only, never a physical unit identity.
    if (snapshot.containsKey("phien_ban_snapshot")) {
      if (!(snapshot.get("thanh_phan") instanceof List<?> components) || components.isEmpty()) {
        throw SoldConfigurationSnapshot.missing();
      }
      Set<Long> ids = new HashSet<>();
      for (Object component : components) {
        if (!(component instanceof Map<?, ?> part)
            || !(part.get("phien_ban_id") instanceof Number id)) {
          throw SoldConfigurationSnapshot.missing();
        }
        try {
          long value = new BigDecimal(id.toString()).longValueExact();
          if (value <= 0 || !ids.add(value)) {
            throw SoldConfigurationSnapshot.missing();
          }
        } catch (ArithmeticException exception) {
          throw SoldConfigurationSnapshot.missing();
        }
      }
      return Set.copyOf(ids);
    }
    Set<Long> ids = new HashSet<>();
    for (String value : snapshot.keySet()) {
      try {
        ids.add(Long.valueOf(value));
      } catch (NumberFormatException exception) {
        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Cấu hình đã bán của dòng hàng không hợp lệ");
      }
    }
    return ids;
  }

  private AdminReturnResponse.EligibleCurrentDevice toCurrentDevice(ThietBiBaoHanh device) {
    SoSerialSanPham serial = device.getSoSerial();
    return AdminReturnResponse.EligibleCurrentDevice.builder()
        .thietBiId(device.getId())
        .maTheoDoi(device.getMaTheoDoi())
        .phienBanId(device.getPhienBan().getId())
        .soSerialId(serial == null ? null : serial.getId())
        .soSerial(serial == null ? null : serial.getSoSerial())
        .build();
  }

  private AdminReturnResponse.EligibleCurrentDevice toLegacyCurrentDevice(SoSerialSanPham serial) {
    return AdminReturnResponse.EligibleCurrentDevice.builder()
        .thietBiId(null)
        .maTheoDoi(null)
        .phienBanId(serial.getPhienBan().getId())
        .soSerialId(serial.getId())
        .soSerial(serial.getSoSerial())
        .build();
  }

  private Map<Long, ReturnStats> readReturnStats(Long orderId) {
    Map<Long, ReturnStats> result = new HashMap<>();
    for (ChiTietTraHangRepository.ReturnedQuantityProjection item :
        returnLineRepository.sumReturnedQuantityByOrder(orderId, RELEASED_RETURN_STATUSES)) {
      long quantity = item.getSoLuongDaYeuCauTra() == null ? 0L : item.getSoLuongDaYeuCauTra();
      BigDecimal amount =
          requiredVndHistory(
              item.getTongTienDaYeuCauTra(), "Lịch sử tiền hoàn của dòng hàng không đầy đủ");
      if (quantity < 0 || amount.signum() < 0) {
        throw new AppException(ErrorCode.CONFLICT, "Dữ liệu trả hàng trước đó không nhất quán");
      }
      result.put(item.getChiTietDonHangId(), new ReturnStats(quantity, amount));
    }
    return result;
  }

  private BigDecimal refundableGoodsTotal(DonHang order) {
    BigDecimal result = money(order.getTongThanhToan()).subtract(money(order.getPhiGiaoHang()));
    if (result.signum() < 0) {
      throw new AppException(ErrorCode.CONFLICT, "Phí giao hàng lớn hơn tổng thanh toán");
    }
    return result.setScale(0, RoundingMode.HALF_UP);
  }

  private int requiredPurchasedQuantity(ChiTietDonHang line) {
    int quantity = line.getSoLuong() == null ? 0 : line.getSoLuong();
    if (quantity <= 0) {
      throw new AppException(ErrorCode.CONFLICT, "Số lượng mua trong đơn hàng không hợp lệ");
    }
    return quantity;
  }

  private boolean isFullyReceived(Long orderId) {
    Map<Long, Long> receivedQuantityByLine = new HashMap<>();
    for (ChiTietTraHangRepository.ReceivedQuantityProjection item :
        returnLineRepository.sumReceivedQuantityByOrder(
            orderId,
            List.of(
                TrangThaiTraHang.DA_NHAN_HANG,
                TrangThaiTraHang.HOAN_TAT,
                TrangThaiTraHang.DA_HOAN_TIEN))) {
      receivedQuantityByLine.put(item.getChiTietDonHangId(), item.getSoLuongDaNhan());
    }

    List<ChiTietDonHang> orderLines = orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);
    if (orderLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không có chi tiết sản phẩm");
    }

    boolean full = true;
    for (ChiTietDonHang orderLine : orderLines) {
      long purchased = requiredPurchasedQuantity(orderLine);
      long received = receivedQuantityByLine.getOrDefault(orderLine.getId(), 0L);
      if (received > purchased) {
        throw new AppException(
            ErrorCode.CONFLICT, "Số lượng hàng nhận trả vượt số lượng trong đơn");
      }
      if (received < purchased) {
        full = false;
      }
    }
    return full;
  }

  private BigDecimal validatedRefundTotal(PhieuTraHang returnSlip) {
    BigDecimal storedTotal = returnSlip.getTongTienHoan();
    if (storedTotal == null || storedTotal.signum() <= 0) {
      throw new AppException(
          ErrorCode.CONFLICT, "Tổng tiền hoàn bằng 0, không phát sinh hoàn tiền");
    }

    BigDecimal normalizedTotal = exactRefundMoney(storedTotal);
    if (normalizedTotal.precision() > 15) {
      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tiền hoàn không nhất quán");
    }

    List<ChiTietTraHang> returnLines =
        returnLineRepository.findByPhieuTraHang_IdOrderByIdAsc(returnSlip.getId());
    if (returnLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tiền hoàn không nhất quán");
    }

    BigDecimal calculatedTotal = BigDecimal.ZERO.setScale(2);
    for (ChiTietTraHang returnLine : returnLines) {
      BigDecimal lineAmount = returnLine.getThanhTienHoan();
      if (lineAmount == null || lineAmount.signum() < 0) {
        throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tiền hoàn không nhất quán");
      }
      calculatedTotal = calculatedTotal.add(exactRefundMoney(lineAmount));
    }

    if (calculatedTotal.compareTo(normalizedTotal) != 0) {
      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tiền hoàn không nhất quán");
    }

    return normalizedTotal;
  }

  private BigDecimal exactRefundMoney(BigDecimal value) {
    try {
      return value.setScale(2, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw new AppException(ErrorCode.CONFLICT, "Dữ liệu tiền hoàn không nhất quán");
    }
  }

  private void requireRefundCashTypeConfiguration() {
    LoaiThuChi cashType =
        cashTypeRepository
            .findByMaLoai(REFUND_CASH_TYPE_CODE)
            .orElseThrow(
                () ->
                    new AppException(
                        ErrorCode.INTERNAL_SERVER_ERROR,
                        "Thiếu cấu hình loại chi hoàn tiền " + REFUND_CASH_TYPE_CODE));

    if (cashType.getLoaiPhieu() != LoaiPhieuThuChi.CHI
        || cashType.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Cấu hình loại chi hoàn tiền " + REFUND_CASH_TYPE_CODE + " không hợp lệ");
    }
  }

  private void ensureCodReconciled(DonHang order) {
    List<PhieuGiaoHang> codDeliveries =
        deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .filter(
                delivery ->
                    delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.HUY_GIAO_HANG
                        && delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.DA_HOAN_HANG)
            .filter(
                delivery ->
                    delivery.getTienThuHoCod() != null && delivery.getTienThuHoCod().signum() > 0)
            .toList();

    for (PhieuGiaoHang delivery : codDeliveries) {
      SoQuyThuChi receipt =
          cashRepository.findByBusinessKey("THU-COD-" + delivery.getId()).orElse(null);
      if (!isValidCodReceipt(order, delivery, receipt)) {
        throw new AppException(
            ErrorCode.CONFLICT,
            "COD chưa được đối tác nộp đủ, cần đối soát thực thu trước khi hoàn tiền");
      }
    }
  }

  private boolean isValidCodReceipt(DonHang order, PhieuGiaoHang delivery, SoQuyThuChi receipt) {
    return receipt != null
        && receipt.getLoaiPhieu() == LoaiPhieuThuChi.THU
        && receipt.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG
        && receipt.getTrangThai() == TrangThaiPhieuThuChi.DA_GHI_NHAN
        && receipt.getLoaiThuChi() != null
        && "THU_BAN_HANG".equals(receipt.getLoaiThuChi().getMaLoai())
        && receipt.getNhomNguoiNopNhan() == NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG
        && receipt.getDoiTacVanChuyen() != null
        && delivery.getDoiTacVanChuyen() != null
        && Objects.equals(
            receipt.getDoiTacVanChuyen().getId(), delivery.getDoiTacVanChuyen().getId())
        && Objects.equals(receipt.getMaChungTuThamChieu(), order.getMaDonHang())
        && receipt.getSoTien() != null
        && receipt.getSoTien().compareTo(delivery.getTienThuHoCod()) == 0;
  }

  private String refundRecipientName(PhieuTraHang returnSlip) {
    String recipientName = normalizeNote(returnSlip.getDonHang().getTenNguoiNhan());
    return recipientName == null ? "Khách lẻ" : recipientName;
  }

  private String refundRequestKey(String value) {
    if (value == null || !value.matches(UUID_PATTERN)) {
      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }

    String key = REFUND_IDEMPOTENCY_PREFIX + UUID.fromString(value).toString();
    if (key.length() > 50) {
      throw new IllegalStateException(
          "Khóa idempotency vượt giới hạn sales_idempotency.request_key");
    }
    return key;
  }

  private String normalizeNote(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private AdminReturnResponse.ReturnLine toReturnLineResponse(ChiTietTraHang line) {
    BigDecimal baseRefund = line.getDonGiaHoan().multiply(BigDecimal.valueOf(line.getSoLuong()));
    return AdminReturnResponse.ReturnLine.builder()
        .id(line.getId())
        .chiTietDonHangId(line.getChiTietDonHang().getId())
        .soLuong(line.getSoLuong())
        .donGiaHoan(line.getDonGiaHoan())
        .thanhTienHoan(line.getThanhTienHoan())
        .dieuChinhLamTron(line.getThanhTienHoan().subtract(baseRefund))
        .build();
  }

  private AdminReturnResponse.DetailReturnLine toDetailReturnLine(ChiTietTraHang line) {
    return AdminReturnResponse.DetailReturnLine.builder()
        .id(line.getId())
        .chiTietDonHangId(line.getChiTietDonHang().getId())
        .soLuong(line.getSoLuong())
        .donGiaHoan(line.getDonGiaHoan())
        .thanhTienHoan(line.getThanhTienHoan())
        .build();
  }

  private BigDecimal money(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private void validateId(Long id, String message) {
    if (id == null || id <= 0) {
      throw invalid(message);
    }
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100) {
      throw invalid("Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }
  }

  private String normalizeOptional(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim().toLowerCase(Locale.ROOT);
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private record ReturnStats(long quantity, BigDecimal amount) {

    private static ReturnStats empty() {
      return new ReturnStats(0L, BigDecimal.ZERO.setScale(0));
    }
  }
}
