package com.example.dantruventu.Services.order;

import com.example.dantruventu.DTO.Request.order.AdminReturnCreateRequest;
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
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
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
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Specification.PhieuTraHangSpecification;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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

  private final PhieuTraHangRepository returnRepository;
  private final AdminReturnOrderRepository returnOrderRepository;
  private final DonHangRepository orderRepository;
  private final OrderEvents orderEvents;
  private final ChiTietDonHangRepository orderLineRepository;
  private final ChiTietTraHangRepository returnLineRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final SoQuyThuChiRepository cashRepository;
  private final LoaiThuChiRepository cashTypeRepository;
  private final CashbookService cashbookService;
  private final ReturnInventoryService returnInventoryService;
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
    if (cashRepository.findByMaPhieu(voucherCode).isPresent()
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
                .maPhieu(voucherCode)
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
      Long returnId, AdminReturnReceiveRequest request, Long actorId, String requestKey) {

    NguoiDung actor = requireReturnActor(actorId);

    return cashbookService.executeOnce(
        CashbookService.uuidKey("TH-REC-", requestKey),
        actor,
        List.of(returnId, request),
        AdminReturnResponse.ReceiveResponse.class,
        () -> receive(returnId, request, actorId));
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

    slip.setNgayNhanHang(receivedAt);

    if (slip.getNgayTiepNhanThucTe() == null) {
      slip.setNgayTiepNhanThucTe(receivedAt);
    }

    slip.setDuLieuNhanHang(receivedSnapshot);

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

  public AdminReturnResponse.DetailResponse getReturnDetail(Long returnId) {
    validateId(returnId, "ID phiếu trả không hợp lệ");

    PhieuTraHang returnSlip =
        returnRepository
            .findById(returnId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    List<ChiTietTraHang> returnLines =
        returnLineRepository.findByPhieuTraHang_IdOrderByIdAsc(returnId);
    if (returnLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Phiếu trả không có chi tiết sản phẩm");
    }

    int totalQuantity =
        returnLines.stream().map(ChiTietTraHang::getSoLuong).reduce(0, Integer::sum);

    NguoiDung customer = returnSlip.getKhachHang();
    TrangThaiTraHang status = returnSlip.getTrangThaiTraHang();
    BigDecimal totalRefund = money(returnSlip.getTongTienHoan());

    return AdminReturnResponse.DetailResponse.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .trangThaiTraHang(status)
        .donHang(
            AdminReturnResponse.OrderSummary.builder()
                .id(returnSlip.getDonHang().getId())
                .maDonHang(returnSlip.getDonHang().getMaDonHang())
                .build())
        .khachHang(
            customer == null
                ? null
                : AdminReturnResponse.CustomerSummary.builder()
                    .id(customer.getId())
                    .hoTen(customer.getHoTen())
                    .soDienThoai(customer.getSoDienThoai())
                    .build())
        .chiTietTra(returnLines.stream().map(this::toDetailReturnLine).toList())
        .tongSoLuong(totalQuantity)
        .tongTienHoan(totalRefund)
        .hinhThucHoanTien(returnSlip.getHinhThucHoanTien())
        .lyDoTra(returnSlip.getLyDoTra())
        .ghiChu(returnSlip.getGhiChu())
        .ngayTao(returnSlip.getNgayTao())
        .canNhanHang(status == TrangThaiTraHang.CHO_TIEP_NHAN)
        .canHoanTien(status == TrangThaiTraHang.DA_NHAN_HANG && totalRefund.signum() > 0)
        .build();
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

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminReturnResponse.CreateResponse create(
      AdminReturnCreateRequest request, Long actorId, String requestKey) {

    NguoiDung actor = requireReturnActor(actorId);

    return cashbookService.executeOnce(
        CashbookService.uuidKey("TH-CREATE-", requestKey),
        actor,
        request,
        AdminReturnResponse.CreateResponse.class,
        () -> create(request, actorId));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminReturnResponse.CreateResponse create(AdminReturnCreateRequest request, Long actorId) {

    NguoiDung actor = requireReturnActor(actorId);

    DonHang order =
        orderRepository
            .findByIdForUpdate(request.getDonHangId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));

    entityManager.refresh(order);
    ensureReturnEligible(order);

    List<ChiTietDonHang> orderLines = orderLineRepository.findByDonHangIdForUpdate(order.getId());

    if (orderLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không có sản phẩm để trả");
    }

    Map<Long, ChiTietDonHang> byId = new HashMap<>();

    for (var line : orderLines) {
      byId.put(line.getId(), line);
    }

    Set<Long> requestedIds = new HashSet<>();

    for (var input : request.getChiTietTra()) {
      if (!requestedIds.add(input.getChiTietDonHangId())) {
        throw invalid("Không được lặp chi tiết đơn hàng");
      }

      if (!byId.containsKey(input.getChiTietDonHangId())) {
        throw invalid("Chi tiết đơn hàng không thuộc đơn đã chọn");
      }
    }

    if (orderLineRepository.countOpenWarrantiesForLines(requestedIds) > 0) {
      throw new AppException(ErrorCode.CONFLICT, "Dòng mua đang có phiếu bảo hành chưa kết thúc");
    }

    Map<Long, ReturnStats> previous = readReturnStats(order.getId());

    ensureSpecialOrderReturnPolicy(orderLines, request.getChiTietTra(), previous);

    var allocations = returnMoneySnapshots.plan(order, orderLines, request.getChiTietTra());

    BigDecimal totalRefund =
        allocations.stream()
            .map(ReturnMoneySnapshotService.Allocation::afterVat)
            .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);

    PhieuTraHang slip =
        PhieuTraHang.builder()
            .maTraHang("TH-TMP-" + UUID.randomUUID())
            .donHang(order)
            .khachHang(order.getKhachHang())
            .tenNguoiLienHe(request.getTenNguoiLienHe().strip())
            .sdtNguoiLienHe(request.getSdtNguoiLienHe().strip())
            .nguoiTao(actor)
            .tongTienHoan(totalRefund)
            .hinhThucHoanTien(request.getHinhThucHoanTien())
            .trangThaiTraHang(TrangThaiTraHang.CHO_TIEP_NHAN)
            .lyDoTra(request.getLyDoTra().strip())
            .ghiChu(normalizeNote(request.getGhiChu()))
            .duLieuNhanHang(returnMoneySnapshots.createSnapshot(order, orderLines, allocations))
            .build();

    slip = returnRepository.saveAndFlush(slip);

    slip.setMaTraHang(String.format(Locale.ROOT, "TH%06d", slip.getId()));

    PhieuTraHang savedSlip = slip;

    List<ChiTietTraHang> details =
        allocations.stream()
            .map(
                allocation ->
                    ChiTietTraHang.builder()
                        .phieuTraHang(savedSlip)
                        .chiTietDonHang(byId.get(allocation.lineId()))
                        .soLuong(allocation.quantity())
                        .donGiaHoan(
                            allocation
                                .afterVat()
                                .divide(
                                    BigDecimal.valueOf(allocation.quantity()),
                                    2,
                                    RoundingMode.HALF_UP))
                        .thanhTienHoan(allocation.afterVat())
                        .build())
            .toList();

    details = returnLineRepository.saveAllAndFlush(details);

    returnRepository.saveAndFlush(slip);

    return AdminReturnResponse.CreateResponse.builder()
        .id(slip.getId())
        .maTraHang(slip.getMaTraHang())
        .donHangId(order.getId())
        .khachHangId(order.getKhachHang() == null ? null : order.getKhachHang().getId())
        .trangThaiTraHang(slip.getTrangThaiTraHang())
        .chiTietTra(details.stream().map(this::toReturnLineResponse).toList())
        .tongTienHoan(slip.getTongTienHoan())
        .build();
  }

  public AdminReturnResponse.EligibleOrderDetailResponse getEligibleOrderDetail(Long orderId) {

    validateId(orderId, "ID đơn hàng không hợp lệ");

    DonHang order =
        orderRepository
            .findById(orderId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));

    ensureReturnEligible(order);

    List<ChiTietDonHang> orderLines = orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);
    if (orderLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không có sản phẩm để trả");
    }

    Map<Long, ReturnStats> returnedStats = readReturnStats(orderId);
    Map<Long, BigDecimal> fullLineRefunds =
        calculateFullLineRefunds(orderLines, refundableGoodsTotal(order));

    List<AdminReturnResponse.EligibleOrderLine> responseLines =
        orderLines.stream()
            .map(
                line ->
                    toEligibleOrderLine(
                        line,
                        returnedStats.getOrDefault(line.getId(), ReturnStats.empty()).quantity(),
                        fullLineRefunds.get(line.getId())))
            .toList();

    boolean hasRemaining = responseLines.stream().anyMatch(line -> line.getSoLuongConDuocTra() > 0);
    if (!hasRemaining) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không còn số lượng sản phẩm được trả");
    }

    NguoiDung customer = order.getKhachHang();

    return AdminReturnResponse.EligibleOrderDetailResponse.builder()
        .donHang(
            AdminReturnResponse.EligibleOrderSummary.builder()
                .id(order.getId())
                .maDonHang(order.getMaDonHang())
                .trangThaiDonHang(order.getTrangThaiDonHang())
                .trangThaiThanhToan(order.getTrangThaiThanhToan())
                .tongTienHang(money(order.getTongTienHang()))
                .tienChietKhau(money(order.getTienChietKhau()))
                .phiGiaoHang(money(order.getPhiGiaoHang()))
                .tongThanhToan(money(order.getTongThanhToan()))
                .build())
        .khachHang(
            customer == null
                ? null
                : AdminReturnResponse.CustomerSummary.builder()
                    .id(customer.getId())
                    .hoTen(customer.getHoTen())
                    .soDienThoai(customer.getSoDienThoai())
                    .build())
        .sanPham(responseLines)
        .build();
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
            PageRequest.of(
                page, limit, Sort.by(Sort.Order.desc("ngayTao"), Sort.Order.desc("id"))));

    return AdminReturnResponse.EligibleOrderListResponse.builder()
        .items(result.getContent().stream().map(this::toEligibleOrderItem).toList())
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
      String keyword, TrangThaiTraHang returnStatus, int page, int limit) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    var result =
        returnRepository.findAll(
            PhieuTraHangSpecification.build(normalizedKeyword, returnStatus),
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

    return AdminReturnResponse.ListItem.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .donHang(
            AdminReturnResponse.OrderSummary.builder()
                .id(returnSlip.getDonHang().getId())
                .maDonHang(returnSlip.getDonHang().getMaDonHang())
                .build())
        .khachHang(
            customer == null
                ? null
                : AdminReturnResponse.CustomerSummary.builder()
                    .id(customer.getId())
                    .hoTen(customer.getHoTen())
                    .soDienThoai(customer.getSoDienThoai())
                    .build())
        .tongTienHoan(returnSlip.getTongTienHoan())
        .hinhThucHoanTien(returnSlip.getHinhThucHoanTien())
        .lyDoTra(returnSlip.getLyDoTra())
        .trangThaiTraHang(returnSlip.getTrangThaiTraHang())
        .ngayTao(returnSlip.getNgayTao())
        .build();
  }

  private AdminReturnResponse.EligibleOrderItem toEligibleOrderItem(DonHang order) {
    NguoiDung customer = order.getKhachHang();

    return AdminReturnResponse.EligibleOrderItem.builder()
        .id(order.getId())
        .maDonHang(order.getMaDonHang())
        .loaiDonHang(order.getLoaiDonHang())
        .khachHang(
            customer == null
                ? null
                : AdminReturnResponse.CustomerSummary.builder()
                    .id(customer.getId())
                    .hoTen(customer.getHoTen())
                    .soDienThoai(customer.getSoDienThoai())
                    .build())
        .trangThaiDonHang(order.getTrangThaiDonHang())
        .trangThaiThanhToan(order.getTrangThaiThanhToan())
        .tongThanhToan(order.getTongThanhToan())
        .ngayTao(order.getNgayTao())
        .build();
  }

  private AdminReturnResponse.EligibleOrderLine toEligibleOrderLine(
      ChiTietDonHang line, long returnedQuantity, BigDecimal fullLineRefund) {

    int purchasedQuantity = line.getSoLuong() == null ? 0 : line.getSoLuong();
    if (purchasedQuantity <= 0 || returnedQuantity < 0 || returnedQuantity > purchasedQuantity) {
      throw new AppException(ErrorCode.CONFLICT, "Số lượng trả của đơn hàng không nhất quán");
    }

    BigDecimal unitRefund =
        fullLineRefund.divide(BigDecimal.valueOf(purchasedQuantity), 2, RoundingMode.HALF_UP);

    var variant = line.getPhienBan();
    var product = variant.getSanPham();

    return AdminReturnResponse.EligibleOrderLine.builder()
        .chiTietDonHangId(line.getId())
        .phienBanId(variant.getId())
        .maSanPham(product.getMaSanPham())
        .tenSanPham(product.getTenSanPham())
        .tenPhienBan(variant.getTenPhienBan())
        .donGiaMua(money(line.getDonGia()))
        .soLuongMua(purchasedQuantity)
        .soLuongDaYeuCauTra(returnedQuantity)
        .soLuongConDuocTra((long) purchasedQuantity - returnedQuantity)
        .donGiaHoan(unitRefund)
        .build();
  }

  private void ensureReturnEligible(DonHang order) {
    if (order.getTrangThaiDonHang() != TrangThaiDonHang.HOAN_THANH
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không đủ điều kiện trả hàng");
    }
  }

  private BigDecimal lineTotal(ChiTietDonHang line) {
    if (line.getThanhTien() != null) {
      return line.getThanhTien();
    }
    return money(line.getDonGia())
        .multiply(BigDecimal.valueOf(line.getSoLuong() == null ? 0 : line.getSoLuong()));
  }

  private boolean isGiftLine(ChiTietDonHang line) {
    return Boolean.TRUE.equals(line.getLaQuaTang());
  }

  private Map<Long, ReturnStats> readReturnStats(Long orderId) {
    Map<Long, ReturnStats> result = new HashMap<>();
    for (ChiTietTraHangRepository.ReturnedQuantityProjection item :
        returnLineRepository.sumReturnedQuantityByOrder(orderId)) {
      long quantity = item.getSoLuongDaYeuCauTra() == null ? 0L : item.getSoLuongDaYeuCauTra();
      BigDecimal amount = money(item.getTongTienDaYeuCauTra());
      if (quantity < 0 || amount.signum() < 0) {
        throw new AppException(ErrorCode.CONFLICT, "Dữ liệu trả hàng trước đó không nhất quán");
      }
      result.put(item.getChiTietDonHangId(), new ReturnStats(quantity, amount));
    }
    return result;
  }

  private Map<Long, BigDecimal> calculateFullLineRefunds(
      List<ChiTietDonHang> orderLines, BigDecimal refundableTotal) {

    Map<Long, BigDecimal> result = new LinkedHashMap<>();

    BigDecimal total = BigDecimal.ZERO.setScale(2);

    for (var line : orderLines) {
      BigDecimal payable = returnMoneySnapshots.original(line).afterVat();

      result.put(line.getId(), payable);
      total = total.add(payable);
    }

    if (total.compareTo(exactRefundMoney(refundableTotal)) != 0) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Tiền dòng đã lưu không khớp tổng tiền hàng của đơn");
    }

    return result;
  }

  private BigDecimal refundableGoodsTotal(DonHang order) {
    BigDecimal result = money(order.getTongThanhToan()).subtract(money(order.getPhiGiaoHang()));

    if (result.signum() < 0) {
      throw new AppException(ErrorCode.CONFLICT, "Phí giao hàng lớn hơn tổng thanh toán");
    }

    return exactRefundMoney(result);
  }

  private void ensureSpecialOrderReturnPolicy(
      List<ChiTietDonHang> orderLines,
      List<AdminReturnCreateRequest.ReturnLine> requestedLines,
      Map<Long, ReturnStats> returnedStats) {

    boolean hasCombo =
        orderLines.stream()
            .anyMatch(
                line -> line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC);
    boolean hasGift = orderLines.stream().anyMatch(this::isGiftLine);
    long distinctVariants =
        orderLines.stream().map(line -> line.getPhienBan().getId()).distinct().count();
    boolean repeatedVariant = distinctVariants != orderLines.size();

    if (!hasCombo && !hasGift && !repeatedVariant) {
      return;
    }

    if (!returnedStats.isEmpty() || requestedLines.size() != orderLines.size()) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "Đơn có combo, quà tặng hoặc phiên bản lặp chỉ được trả toàn bộ một lần");
    }

    Map<Long, Integer> requestedQuantityByLine = new HashMap<>();
    for (AdminReturnCreateRequest.ReturnLine requestedLine : requestedLines) {
      requestedQuantityByLine.put(requestedLine.getChiTietDonHangId(), requestedLine.getSoLuong());
    }

    boolean fullReturn =
        orderLines.stream()
            .allMatch(
                line ->
                    requestedQuantityByLine.getOrDefault(line.getId(), 0)
                        == requiredPurchasedQuantity(line));
    if (!fullReturn) {
      throw new AppException(
          ErrorCode.CONFLICT,
          "Đơn có combo, quà tặng hoặc phiên bản lặp chỉ được trả toàn bộ một lần");
    }
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
          cashRepository.findByMaPhieu("THU-COD-" + delivery.getId()).orElse(null);
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
    return AdminReturnResponse.ReturnLine.builder()
        .chiTietDonHangId(line.getChiTietDonHang().getId())
        .soLuong(line.getSoLuong())
        .donGiaHoan(line.getDonGiaHoan())
        .thanhTienHoan(line.getThanhTienHoan())
        .build();
  }

  private AdminReturnResponse.DetailReturnLine toDetailReturnLine(ChiTietTraHang line) {
    ChiTietDonHang orderLine = line.getChiTietDonHang();
    var variant = orderLine.getPhienBan();
    var product = variant.getSanPham();

    return AdminReturnResponse.DetailReturnLine.builder()
        .chiTietDonHangId(orderLine.getId())
        .phienBanId(variant.getId())
        .maSanPham(product.getMaSanPham())
        .tenSanPham(product.getTenSanPham())
        .tenPhienBan(variant.getTenPhienBan())
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
      return new ReturnStats(0L, BigDecimal.ZERO.setScale(2));
    }
  }
}
