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
import java.math.BigDecimal;
import java.math.RoundingMode;
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
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReturnService {

  private static final String REFUND_CASH_TYPE_CODE = "CHI_HOAN_DON_HANG";
  private static final String REFUND_IDEMPOTENCY_PREFIX = "TH-REFUND-REQ-";
  private static final String UUID_PATTERN =
      "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
          + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
  private static final Set<String> REFUND_PAYMENT_METHODS = Set.of("TIEN_MAT", "CHUYEN_KHOAN");

  private final PhieuTraHangRepository returnRepository;
  private final AdminReturnOrderRepository returnOrderRepository;
  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository orderLineRepository;
  private final ChiTietTraHangRepository returnLineRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final SoQuyThuChiRepository cashRepository;
  private final LoaiThuChiRepository cashTypeRepository;
  private final CashbookService cashbookService;
  private final ReturnInventoryService returnInventoryService;

  @Transactional
  public AdminReturnResponse.RefundResponse refund(
      Long returnId,
      String idempotencyKey,
      AdminReturnRefundRequest request,
      NguoiDung actor) {

    validateId(returnId, "ID phiếu trả không hợp lệ");
    if (request == null) {
      throw invalid("Thiếu dữ liệu hoàn tiền");
    }
    if (actor == null || actor.getId() == null || actor.getId() <= 0) {
      throw new AppException(
          ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
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
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    if (returnSlip.getTrangThaiTraHang() == TrangThaiTraHang.DA_HOAN_TIEN) {
      throw new AppException(ErrorCode.CONFLICT, "Phiếu trả đã hoàn tiền");
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
                .build());

    returnSlip.setHinhThucHoanTien(paymentMethod);
    returnSlip.setTrangThaiTraHang(TrangThaiTraHang.DA_HOAN_TIEN);
    returnRepository.saveAndFlush(returnSlip);

    return AdminReturnResponse.RefundResponse.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .trangThaiTraHang(returnSlip.getTrangThaiTraHang())
        .tongTienHoan(totalRefund)
        .hinhThucHoanTien(returnSlip.getHinhThucHoanTien())
        .phieuChi(CashVoucherResponse.from(expense))
        .build();
  }

  @Transactional
  public AdminReturnResponse.ReceiveResponse receive(
      Long returnId,
      AdminReturnReceiveRequest request,
      Long actorId) {

    validateId(returnId, "ID phiếu trả không hợp lệ");
    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    PhieuTraHang returnSlip =
        returnRepository
            .findByIdForUpdate(returnId)
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    if (returnSlip.getTrangThaiTraHang() != TrangThaiTraHang.CHO_TIEP_NHAN) {
      throw new AppException(
          ErrorCode.CONFLICT, "Phiếu trả không còn ở trạng thái CHO_TIEP_NHAN");
    }

    DonHang order =
        orderRepository
            .findByIdForUpdate(returnSlip.getDonHang().getId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));
    ensureReturnEligible(order);

    List<AdminReturnResponse.ReceivedItem> receivedItems =
        returnInventoryService.receive(returnSlip, order, request);

    returnSlip.setTrangThaiTraHang(TrangThaiTraHang.DA_NHAN_HANG);
    returnRepository.saveAndFlush(returnSlip);

    if (isFullyReceived(order.getId())) {
      order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);
      orderRepository.saveAndFlush(order);
    }

    return AdminReturnResponse.ReceiveResponse.builder()
        .id(returnSlip.getId())
        .trangThaiTraHang(returnSlip.getTrangThaiTraHang())
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
            .orElseThrow(
                () -> new AppException(ErrorCode.NOT_FOUND, "Phiếu trả không tồn tại"));

    List<ChiTietTraHang> returnLines =
        returnLineRepository.findByPhieuTraHang_IdOrderByIdAsc(returnId);
    if (returnLines.isEmpty()) {
      throw new AppException(
          ErrorCode.CONFLICT, "Phiếu trả không có chi tiết sản phẩm");
    }

    int totalQuantity =
        returnLines.stream()
            .map(ChiTietTraHang::getSoLuong)
            .reduce(0, Integer::sum);

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
        .canHoanTien(
            status == TrangThaiTraHang.DA_NHAN_HANG && totalRefund.signum() > 0)
        .build();
  }

  @Transactional
  public AdminReturnResponse.CreateResponse create(
      AdminReturnCreateRequest request, Long actorId) {

    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    DonHang order =
        orderRepository
            .findByIdForUpdate(request.getDonHangId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));

    ensureReturnEligible(order);

    List<ChiTietDonHang> orderLines =
        orderLineRepository.findByDonHangIdForUpdate(order.getId());
    if (orderLines.isEmpty()) {
      throw new AppException(ErrorCode.CONFLICT, "Đơn hàng không có sản phẩm để trả");
    }

    Map<Long, ChiTietDonHang> orderLineById = new HashMap<>();
    for (ChiTietDonHang line : orderLines) {
      orderLineById.put(line.getId(), line);
    }

    Set<Long> requestedLineIds = new HashSet<>();
    for (AdminReturnCreateRequest.ReturnLine requestedLine : request.getChiTietTra()) {
      if (!requestedLineIds.add(requestedLine.getChiTietDonHangId())) {
        throw invalid("Không được lặp chi tiết đơn hàng trong cùng phiếu trả");
      }
      Long orderLineId = requestedLine.getChiTietDonHangId();
      if (!orderLineById.containsKey(orderLineId)) {
        if (orderLineRepository.existsById(orderLineId)) {
          throw invalid("Chi tiết đơn hàng không thuộc đơn hàng đã chọn");
        }
        throw new AppException(ErrorCode.NOT_FOUND, "Chi tiết đơn hàng không tồn tại");
      }
    }

    Map<Long, ReturnStats> returnedStats = readReturnStats(order.getId());
    ensureSpecialOrderReturnPolicy(orderLines, request.getChiTietTra(), returnedStats);

    BigDecimal refundableTotal = refundableGoodsTotal(order);
    Map<Long, BigDecimal> fullLineRefunds =
        calculateFullLineRefunds(orderLines, refundableTotal);

    PhieuTraHang returnSlip =
        PhieuTraHang.builder()
            .maTraHang("TH-TMP-" + UUID.randomUUID())
            .donHang(order)
            .khachHang(order.getKhachHang())
            .tongTienHoan(BigDecimal.ZERO.setScale(2))
            .hinhThucHoanTien(request.getHinhThucHoanTien())
            .trangThaiTraHang(TrangThaiTraHang.CHO_TIEP_NHAN)
            .lyDoTra(request.getLyDoTra().strip())
            .ghiChu(normalizeNote(request.getGhiChu()))
            .build();

    returnSlip = returnRepository.saveAndFlush(returnSlip);
    returnSlip.setMaTraHang(String.format(Locale.ROOT, "TH%06d", returnSlip.getId()));
    returnSlip = returnRepository.saveAndFlush(returnSlip);
    PhieuTraHang savedReturnSlip = returnSlip;

    List<ChiTietTraHang> returnLines =
        request.getChiTietTra().stream()
            .map(
                requestedLine -> {
                  ChiTietDonHang orderLine =
                      orderLineById.get(requestedLine.getChiTietDonHangId());
                  ReturnStats previous =
                      returnedStats.getOrDefault(orderLine.getId(), ReturnStats.empty());
                  int purchasedQuantity = requiredPurchasedQuantity(orderLine);
                  long remainingQuantity = purchasedQuantity - previous.quantity();

                  if (requestedLine.getSoLuong() > remainingQuantity) {
                    throw new AppException(
                        ErrorCode.UNPROCESSABLE_ENTITY,
                        "Số lượng hoàn trả không được vượt quá số lượng còn được trả");
                  }

                  BigDecimal fullLineRefund = fullLineRefunds.get(orderLine.getId());
                  BigDecimal remainingLineRefund =
                      fullLineRefund.subtract(previous.amount());
                  if (remainingLineRefund.signum() < 0) {
                    throw new AppException(
                        ErrorCode.CONFLICT, "Số tiền đã yêu cầu trả không nhất quán");
                  }

                  BigDecimal amount;
                  if (requestedLine.getSoLuong() == remainingQuantity) {
                    amount = remainingLineRefund;
                  } else {
                    BigDecimal baseUnitRefund =
                        fullLineRefund.divide(
                            BigDecimal.valueOf(purchasedQuantity), 0, RoundingMode.DOWN);
                    amount =
                        baseUnitRefund.multiply(
                            BigDecimal.valueOf(requestedLine.getSoLuong()));
                    if (amount.compareTo(remainingLineRefund) > 0) {
                      amount = remainingLineRefund;
                    }
                  }

                  amount = amount.setScale(0, RoundingMode.HALF_UP);
                  BigDecimal unitRefund =
                      amount.divide(
                          BigDecimal.valueOf(requestedLine.getSoLuong()),
                          2,
                          RoundingMode.HALF_UP);

                  return ChiTietTraHang.builder()
                      .phieuTraHang(savedReturnSlip)
                      .chiTietDonHang(orderLine)
                      .soLuong(requestedLine.getSoLuong())
                      .donGiaHoan(unitRefund)
                      .thanhTienHoan(amount)
                      .build();
                })
            .toList();

    returnLines = returnLineRepository.saveAllAndFlush(returnLines);

    BigDecimal totalRefund =
        returnLines.stream()
            .map(ChiTietTraHang::getThanhTienHoan)
            .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
    returnSlip.setTongTienHoan(totalRefund);
    returnRepository.saveAndFlush(returnSlip);

    return AdminReturnResponse.CreateResponse.builder()
        .id(returnSlip.getId())
        .maTraHang(returnSlip.getMaTraHang())
        .donHangId(order.getId())
        .khachHangId(order.getKhachHang() == null ? null : order.getKhachHang().getId())
        .trangThaiTraHang(returnSlip.getTrangThaiTraHang())
        .chiTietTra(returnLines.stream().map(this::toReturnLineResponse).toList())
        .tongTienHoan(returnSlip.getTongTienHoan())
        .build();
  }

  public AdminReturnResponse.EligibleOrderDetailResponse getEligibleOrderDetail(
      Long orderId) {

    validateId(orderId, "ID đơn hàng không hợp lệ");

    DonHang order =
        orderRepository
            .findById(orderId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Đơn hàng không tồn tại"));

    ensureReturnEligible(order);

    List<ChiTietDonHang> orderLines =
        orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);
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

    boolean hasRemaining =
        responseLines.stream().anyMatch(line -> line.getSoLuongConDuocTra() > 0);
    if (!hasRemaining) {
      throw new AppException(
          ErrorCode.CONFLICT, "Đơn hàng không còn số lượng sản phẩm được trả");
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
                page,
                limit,
                Sort.by(
                    Sort.Order.desc("ngayTao"),
                    Sort.Order.desc("id"))));

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
                page,
                limit,
                Sort.by(
                    Sort.Order.desc("ngayTao"),
                    Sort.Order.desc("id"))));

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
      ChiTietDonHang line,
      long returnedQuantity,
      BigDecimal fullLineRefund) {

    int purchasedQuantity = line.getSoLuong() == null ? 0 : line.getSoLuong();
    if (purchasedQuantity <= 0 || returnedQuantity < 0 || returnedQuantity > purchasedQuantity) {
      throw new AppException(
          ErrorCode.CONFLICT, "Số lượng trả của đơn hàng không nhất quán");
    }

    BigDecimal unitRefund =
        fullLineRefund.divide(
            BigDecimal.valueOf(purchasedQuantity), 2, RoundingMode.HALF_UP);

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
    return money(line.getDonGia()).signum() == 0
        && money(lineTotal(line)).signum() == 0;
  }

  private Map<Long, ReturnStats> readReturnStats(Long orderId) {
    Map<Long, ReturnStats> result = new HashMap<>();
    for (ChiTietTraHangRepository.ReturnedQuantityProjection item :
        returnLineRepository.sumReturnedQuantityByOrder(orderId)) {
      long quantity =
          item.getSoLuongDaYeuCauTra() == null ? 0L : item.getSoLuongDaYeuCauTra();
      BigDecimal amount = money(item.getTongTienDaYeuCauTra());
      if (quantity < 0 || amount.signum() < 0) {
        throw new AppException(
            ErrorCode.CONFLICT, "Dữ liệu trả hàng trước đó không nhất quán");
      }
      result.put(item.getChiTietDonHangId(), new ReturnStats(quantity, amount));
    }
    return result;
  }

  private Map<Long, BigDecimal> calculateFullLineRefunds(
      List<ChiTietDonHang> orderLines, BigDecimal refundableTotal) {

    BigDecimal grossLineTotal =
        orderLines.stream().map(this::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    if (grossLineTotal.signum() <= 0) {
      throw new AppException(
          ErrorCode.CONFLICT, "Giá trị sản phẩm trong đơn hàng không hợp lệ");
    }

    BigDecimal roundedRefundableTotal =
        refundableTotal.setScale(0, RoundingMode.HALF_UP);
    int lastPositiveLineIndex = -1;
    for (int index = orderLines.size() - 1; index >= 0; index--) {
      if (lineTotal(orderLines.get(index)).signum() > 0) {
        lastPositiveLineIndex = index;
        break;
      }
    }

    Map<Long, BigDecimal> allocations = new LinkedHashMap<>();
    BigDecimal allocated = BigDecimal.ZERO.setScale(0);

    for (int index = 0; index < orderLines.size(); index++) {
      ChiTietDonHang line = orderLines.get(index);
      BigDecimal weight = lineTotal(line);
      if (weight.signum() < 0) {
        throw new AppException(
            ErrorCode.CONFLICT, "Thành tiền sản phẩm trong đơn hàng không hợp lệ");
      }

      BigDecimal amount;
      if (weight.signum() == 0) {
        amount = BigDecimal.ZERO.setScale(0);
      } else if (index == lastPositiveLineIndex) {
        amount = roundedRefundableTotal.subtract(allocated);
      } else if (roundedRefundableTotal.signum() == 0) {
        amount = BigDecimal.ZERO.setScale(0);
      } else {
        amount =
            roundedRefundableTotal
                .multiply(weight)
                .divide(grossLineTotal, 0, RoundingMode.DOWN);
      }

      if (amount.signum() < 0) {
        throw new AppException(ErrorCode.CONFLICT, "Số tiền hoàn không nhất quán");
      }
      amount = amount.setScale(0, RoundingMode.HALF_UP);
      allocations.put(line.getId(), amount);
      allocated = allocated.add(amount);
    }

    return allocations;
  }

  private BigDecimal refundableGoodsTotal(DonHang order) {
    BigDecimal result =
        money(order.getTongThanhToan()).subtract(money(order.getPhiGiaoHang()));
    if (result.signum() < 0) {
      throw new AppException(
          ErrorCode.CONFLICT, "Phí giao hàng lớn hơn tổng thanh toán");
    }
    return result.setScale(0, RoundingMode.HALF_UP);
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
      requestedQuantityByLine.put(
          requestedLine.getChiTietDonHangId(), requestedLine.getSoLuong());
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
      throw new AppException(
          ErrorCode.CONFLICT, "Số lượng mua trong đơn hàng không hợp lệ");
    }
    return quantity;
  }

  private boolean isFullyReceived(Long orderId) {
    Map<Long, Long> receivedQuantityByLine = new HashMap<>();
    for (ChiTietTraHangRepository.ReceivedQuantityProjection item :
        returnLineRepository.sumReceivedQuantityByOrder(
            orderId,
            List.of(TrangThaiTraHang.DA_NHAN_HANG, TrangThaiTraHang.DA_HOAN_TIEN))) {
      receivedQuantityByLine.put(item.getChiTietDonHangId(), item.getSoLuongDaNhan());
    }

    List<ChiTietDonHang> orderLines =
        orderLineRepository.findByDonHang_IdOrderByIdAsc(orderId);
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
                        && delivery.getTrangThaiGiaoHang()
                            != TrangThaiGiaoHangEnum.DA_HOAN_HANG)
            .filter(
                delivery ->
                    delivery.getTienThuHoCod() != null
                        && delivery.getTienThuHoCod().signum() > 0)
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
