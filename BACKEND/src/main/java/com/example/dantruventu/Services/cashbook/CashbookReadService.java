package com.example.dantruventu.Services.cashbook;

import com.example.dantruventu.Entity.SoQuyThuChi;
import com.example.dantruventu.Enum.LoaiPhieuThuChi;
import com.example.dantruventu.Enum.NguonTaoPhieuThuChi;
import com.example.dantruventu.Enum.NhomNguoiNopNhanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuThuChi;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.*;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CashbookReadService {

  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final BigDecimal ZERO = BigDecimal.ZERO;
  private static final Sort SORT =
      Sort.by("ngayGhiNhan").descending().and(Sort.by("id").descending());

  private static final Map<String, String> IDS =
      Map.of(
          "loai_thu_chi_id", "loaiThuChi.id",
          "nguoi_tao_id", "nguoiTao.id",
          "nguoi_nop_nhan_id", "nguoiNopNhan.id",
          "nha_cung_cap_id", "nhaCungCap.id",
          "doi_tac_van_chuyen_id", "doiTacVanChuyen.id",
          "hoa_don_bao_hanh_id", "hoaDonBaoHanh.id",
          "phieu_bao_hanh_id", "phieuBaoHanh.id",
          "phieu_tra_hang_id", "phieuTraHang.id");

  private static final Set<String> BUSINESSES =
      Set.of(
          "THU_KHACH_BAO_HANH",
          "HOAN_KHACH_BAO_HANH",
          "CHI_DON_VI_BAO_HANH",
          "THU_HOAN_DON_VI_BAO_HANH",
          "HOAN_TIEN_TRA_HANG");

  private final SoQuyThuChiRepository repository;
  private final EntityManager entityManager;

  private record Filter(
      LocalDate from,
      LocalDate to,
      Map<String, Object> equals,
      String keyword,
      String payerName,
      String business,
      Map<String, Object> echo) {}

  public Map<String, Object> vouchers(Map<String, String> params, LoaiPhieuThuChi type) {
    return read(
        () -> {
          Filter filter = filter(params, type, false);
          return paged(filter, params, false);
        });
  }

  public Map<String, Object> detail(String rawId, LoaiPhieuThuChi type) {
    return read(
        () ->
            row(
                repository
                    .findByIdAndLoaiPhieu(positiveId(rawId, "id"), type)
                    .orElseThrow(
                        () ->
                            new AppException(
                                ErrorCode.NOT_FOUND, "Phiếu không tồn tại hoặc sai loại"))));
  }

  public Map<String, Object> cashbook(Map<String, String> params) {
    return read(
        () -> {
          Filter filter = filter(params, null, true);
          Map<String, Object> result = paged(filter, params, true);
          result.put("bo_loc", filter.echo());
          result.put("tong_hop", summary(filter));
          result.put("mui_gio", ZONE.getId());
          return result;
        });
  }

  public Map<String, Object> overview(Map<String, String> params) {
    rejectPagination(params);

    return read(
        () -> {
          Filter filter = filter(params, null, true);
          var summary = summary(filter);

          return m(
              "bo_loc", filter.echo(),
              "so_du_dau_ky", summary.get("so_du_dau_ky"),
              "tong_thu", summary.get("tong_thu"),
              "tong_chi", summary.get("tong_chi"),
              "ton_quy", summary.get("ton_cuoi_ky"),
              "mui_gio", ZONE.getId());
        });
  }

  public Map<String, Object> cashFlow(Map<String, String> params) {
    rejectPagination(params);

    String grouping = Optional.ofNullable(text(params.get("nhom_theo"))).orElse("NGAY");

    if (!Set.of("NGAY", "TUAN", "THANG").contains(grouping)) {
      throw invalid("nhom_theo", "Chỉ nhận NGAY, TUAN hoặc THANG");
    }

    return read(
        () -> {
          Filter filter = filter(params, null, true);
          CriteriaBuilder cb = entityManager.getCriteriaBuilder();
          CriteriaQuery<Tuple> query = cb.createTupleQuery();
          Root<SoQuyThuChi> root = query.from(SoQuyThuChi.class);

          Expression<LocalDate> date =
              cb.function("date", LocalDate.class, root.get("ngayGhiNhan"));
          Path<LoaiPhieuThuChi> type = root.get("loaiPhieu");

          query
              .multiselect(
                  date.alias("day"),
                  type.alias("type"),
                  cb.sum(root.<BigDecimal>get("soTien")).alias("amount"))
              .where(where(filter, root, cb, start(filter.from()), end(filter.to()), null))
              .groupBy(date, type)
              .orderBy(cb.asc(date));

          var daily = entityManager.createQuery(query).getResultList();
          List<Map<String, Object>> items = new ArrayList<>();

          if (!daily.isEmpty()) {
            Map<LocalDate, BigDecimal[]> buckets = new LinkedHashMap<>();
            LocalDate cursor = filter.from();

            while (!cursor.isAfter(filter.to())) {
              buckets.put(cursor, new BigDecimal[] {ZERO, ZERO});

              cursor =
                  switch (grouping) {
                    case "TUAN" -> cursor.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
                    case "THANG" -> cursor.withDayOfMonth(1).plusMonths(1);
                    default -> cursor.plusDays(1);
                  };
            }

            for (Tuple entry : daily) {
              LocalDate day = entry.get("day", LocalDate.class);

              LocalDate key =
                  switch (grouping) {
                    case "TUAN" -> day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                    case "THANG" -> day.withDayOfMonth(1);
                    default -> day;
                  };

              if (key.isBefore(filter.from())) key = filter.from();

              int index = entry.get("type", LoaiPhieuThuChi.class) == LoaiPhieuThuChi.THU ? 0 : 1;

              BigDecimal amount = entry.get("amount", BigDecimal.class);
              buckets.get(key)[index] = buckets.get(key)[index].add(amount == null ? ZERO : amount);
            }

            List<LocalDate> starts = new ArrayList<>(buckets.keySet());

            for (int i = 0; i < starts.size(); i++) {
              LocalDate bucketStart = starts.get(i);
              LocalDate bucketEnd =
                  i + 1 < starts.size() ? starts.get(i + 1).minusDays(1) : filter.to();

              BigDecimal[] amounts = buckets.get(bucketStart);

              items.add(
                  m(
                      "tu_ngay",
                      bucketStart,
                      "den_ngay",
                      bucketEnd,
                      "tong_thu",
                      amounts[0],
                      "tong_chi",
                      amounts[1]));
            }
          }

          return m(
              "bo_loc", filter.echo(),
              "nhom_theo", grouping,
              "co_du_lieu", !daily.isEmpty(),
              "items", items,
              "mui_gio", ZONE.getId());
        });
  }

  public byte[] exportCashbook(Map<String, String> params) {
    rejectPagination(params);
    Filter filter = filter(params, null, true);

    try {
      var vouchers =
          repository.findAll(
              (root, query, cb) ->
                  where(filter, root, cb, start(filter.from()), end(filter.to()), null),
              SORT);

      if (vouchers.size() > 1_048_568) {
        throw new AppException(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "source",
            "EXPORT_SOURCE_OR_RENDER_FAILED",
            "Số dòng vượt giới hạn một sheet XLSX");
      }

      var totals = summary(filter);

      try (var workbook = new XSSFWorkbook();
          var output = new ByteArrayOutputStream()) {

        Sheet sheet = workbook.createSheet("So quy");

        write(sheet, 0, "SỔ QUỸ RUVENTU");
        write(sheet, 1, "Kỳ", filter.from() + " - " + filter.to());
        write(sheet, 2, "Xuất lúc", OffsetDateTime.now(ZONE).toString());
        write(sheet, 3, "Bộ lọc", filter.echo().toString());
        write(
            sheet,
            4,
            "Đầu kỳ",
            totals.get("so_du_dau_ky"),
            "Thu",
            totals.get("tong_thu"),
            "Chi",
            totals.get("tong_chi"),
            "Cuối kỳ",
            totals.get("ton_cuoi_ky"));

        write(
            sheet,
            6,
            "STT",
            "LOẠI PHIẾU",
            "NGÀY GHI NHẬN",
            "MÃ PHIẾU",
            "NGƯỜI NỘP / NHẬN",
            "PHƯƠNG THỨC",
            "THU",
            "CHI",
            "MÔ TẢ",
            "HÓA ĐƠN BH ID",
            "PHIẾU BH ID",
            "PHIẾU TRẢ ID",
            "NGHIỆP VỤ NGUỒN",
            "THAM CHIẾU");

        CellStyle moneyStyle = workbook.createCellStyle();
        moneyStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));

        int index = 7;

        for (var voucher : vouchers) {
          var data = row(voucher);
          boolean receipt = voucher.getLoaiPhieu() == LoaiPhieuThuChi.THU;

          write(
              sheet,
              index,
              index - 6,
              data.get("loai_phieu"),
              data.get("ngay_ghi_nhan"),
              data.get("ma_phieu"),
              data.get("ten_nguoi_nop_nhan"),
              data.get("phuong_thuc_thanh_toan"),
              receipt ? voucher.getSoTien() : ZERO,
              receipt ? ZERO : voucher.getSoTien(),
              data.get("mo_ta"),
              idText(data.get("hoa_don_bao_hanh_id")),
              idText(data.get("phieu_bao_hanh_id")),
              idText(data.get("phieu_tra_hang_id")),
              data.get("nghiep_vu_nguon"),
              data.get("ma_chung_tu_tham_chieu"));

          sheet.getRow(index).getCell(6).setCellStyle(moneyStyle);
          sheet.getRow(index).getCell(7).setCellStyle(moneyStyle);
          index++;
        }

        sheet.createFreezePane(0, 7);

        for (int column = 0; column < 14; column++) {
          sheet.setColumnWidth(column, (column == 8 ? 55 : 24) * 256);
        }

        workbook.write(output);
        return output.toByteArray();
      }
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không xuất được sổ quỹ", exception);
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "source",
          "EXPORT_SOURCE_OR_RENDER_FAILED",
          "Không tạo được file xuất từ dữ liệu nguồn");
    }
  }

  private Map<String, Object> paged(Filter filter, Map<String, String> params, boolean cashbook) {

    int page = integer(params.getOrDefault("page", "0"), "page");
    int limit = integer(params.getOrDefault("limit", "20"), "limit");

    if (page < 0) {
      throw invalid("page", "page phải lớn hơn hoặc bằng 0");
    }

    if (limit < 1 || limit > 100) {
      throw invalid("limit", "limit phải nằm trong khoảng 1 đến 100");
    }

    if ((long) page * limit > Integer.MAX_VALUE) {
      throw invalid("page", "Vị trí bắt đầu trang vượt giới hạn truy vấn");
    }

    var result =
        repository.findAll(
            (root, query, cb) ->
                where(filter, root, cb, start(filter.from()), end(filter.to()), null),
            PageRequest.of(page, limit, SORT));

    List<Map<String, Object>> items = new ArrayList<>();
    long sequence = (long) page * limit + 1;

    for (var voucher : result.getContent()) {
      var data = row(voucher);

      if (cashbook) {
        boolean receipt = voucher.getLoaiPhieu() == LoaiPhieuThuChi.THU;
        data.put("stt", sequence++);
        data.put("tien_thu", receipt ? voucher.getSoTien() : ZERO);
        data.put("tien_chi", receipt ? ZERO : voucher.getSoTien());
      }

      items.add(data);
    }

    return m(
        "items",
        items,
        "pagination",
        m(
            "page",
            page,
            "limit",
            limit,
            "total_elements",
            result.getTotalElements(),
            "total_pages",
            result.getTotalPages()));
  }

  private Map<String, Object> summary(Filter filter) {
    BigDecimal opening =
        sum(filter, null, start(filter.from()), LoaiPhieuThuChi.THU)
            .subtract(sum(filter, null, start(filter.from()), LoaiPhieuThuChi.CHI));

    BigDecimal receipts = sum(filter, start(filter.from()), end(filter.to()), LoaiPhieuThuChi.THU);
    BigDecimal payments = sum(filter, start(filter.from()), end(filter.to()), LoaiPhieuThuChi.CHI);

    return m(
        "so_du_dau_ky", opening,
        "tong_thu", receipts,
        "tong_chi", payments,
        "ton_cuoi_ky", opening.add(receipts).subtract(payments));
  }

  private BigDecimal sum(
      Filter filter, LocalDateTime from, LocalDateTime to, LoaiPhieuThuChi type) {

    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<BigDecimal> query = cb.createQuery(BigDecimal.class);
    Root<SoQuyThuChi> root = query.from(SoQuyThuChi.class);

    query
        .select(cb.coalesce(cb.sum(root.<BigDecimal>get("soTien")), ZERO))
        .where(where(filter, root, cb, from, to, type));

    return entityManager.createQuery(query).getSingleResult();
  }

  private Predicate where(
      Filter filter,
      Root<SoQuyThuChi> root,
      CriteriaBuilder cb,
      LocalDateTime from,
      LocalDateTime to,
      LoaiPhieuThuChi amountType) {

    List<Predicate> predicates = new ArrayList<>();

    filter.equals().forEach((name, value) -> predicates.add(cb.equal(path(root, name), value)));

    if (from != null) {
      predicates.add(cb.greaterThanOrEqualTo(root.get("ngayGhiNhan"), from));
    }

    if (to != null) {
      predicates.add(cb.lessThan(root.get("ngayGhiNhan"), to));
    }

    if (amountType != null) {
      predicates.add(cb.equal(root.get("loaiPhieu"), amountType));
    }

    if (filter.keyword() != null) {
      String pattern = pattern(filter.keyword());

      predicates.add(
          cb.or(
              cb.like(cb.lower(root.get("maPhieu")), pattern, '!'),
              cb.like(cb.lower(root.get("tenNguoiNopNhan")), pattern, '!'),
              cb.like(cb.lower(root.get("maChungTuThamChieu")), pattern, '!')));
    }

    if (filter.payerName() != null) {
      predicates.add(
          cb.like(cb.lower(root.get("tenNguoiNopNhan")), pattern(filter.payerName()), '!'));
    }

    if (filter.business() != null) {
      Predicate returned = cb.isNotNull(root.get("phieuTraHang"));
      Predicate warranty =
          cb.or(cb.isNotNull(root.get("hoaDonBaoHanh")), cb.isNotNull(root.get("phieuBaoHanh")));

      Predicate receipt = cb.equal(root.get("loaiPhieu"), LoaiPhieuThuChi.THU);
      Predicate expense = cb.equal(root.get("loaiPhieu"), LoaiPhieuThuChi.CHI);
      Predicate customer = cb.equal(root.get("nhomNguoiNopNhan"), NhomNguoiNopNhanEnum.KHACH_HANG);
      Predicate supplier =
          cb.equal(root.get("nhomNguoiNopNhan"), NhomNguoiNopNhanEnum.NHA_CUNG_CAP);

      predicates.add(
          switch (filter.business()) {
            case "THU_KHACH_BAO_HANH" -> cb.and(warranty, cb.not(returned), receipt, customer);
            case "HOAN_KHACH_BAO_HANH" -> cb.and(warranty, cb.not(returned), expense, customer);
            case "CHI_DON_VI_BAO_HANH" -> cb.and(warranty, cb.not(returned), expense, supplier);
            case "THU_HOAN_DON_VI_BAO_HANH" ->
                cb.and(warranty, cb.not(returned), receipt, supplier);
            case "HOAN_TIEN_TRA_HANG" -> cb.and(returned, cb.not(warranty), expense, customer);
            default -> cb.disjunction();
          });
    }

    return cb.and(predicates.toArray(Predicate[]::new));
  }

  private Filter filter(Map<String, String> params, LoaiPhieuThuChi fixedType, boolean cashbook) {

    if (cashbook && params.containsKey("trang_thai")) {
      throw invalid("trang_thai", "Sổ quỹ chỉ lấy DA_GHI_NHAN; không nhận bộ lọc trang_thai");
    }

    LocalDate from = date(params.get("tu_ngay"), "tu_ngay");
    LocalDate to = date(params.get("den_ngay"), "den_ngay");

    if ((cashbook && (from == null || to == null))
        || (from != null && to != null && from.isAfter(to))) {
      throw invalid("tu_ngay", "Khoảng ngày không hợp lệ");
    }

    Map<String, Object> equals = new LinkedHashMap<>();
    Map<String, Object> echo = new LinkedHashMap<>();

    LoaiPhieuThuChi type =
        enumeration(params.get("loai_phieu"), LoaiPhieuThuChi.class, "loai_phieu");

    if (fixedType != null && type != null && type != fixedType) {
      throw invalid("loai_phieu", "Loại phiếu không khớp endpoint");
    }

    if (fixedType != null) type = fixedType;
    if (type != null) equals.put("loaiPhieu", type);

    var status = enumeration(params.get("trang_thai"), TrangThaiPhieuThuChi.class, "trang_thai");

    if (cashbook) status = TrangThaiPhieuThuChi.DA_GHI_NHAN;
    if (status != null) equals.put("trangThai", status);

    var source = enumeration(params.get("nguon_tao"), NguonTaoPhieuThuChi.class, "nguon_tao");
    if (source != null) equals.put("nguonTao", source);

    var group =
        enumeration(
            params.get("nhom_nguoi_nop_nhan"), NhomNguoiNopNhanEnum.class, "nhom_nguoi_nop_nhan");
    if (group != null) equals.put("nhomNguoiNopNhan", group);

    String method = text(params.get("phuong_thuc_thanh_toan"));
    if (method != null && !Set.of("TIEN_MAT", "CHUYEN_KHOAN", "THE").contains(method)) {
      throw invalid("phuong_thuc_thanh_toan", "Phương thức không hợp lệ");
    }
    if (method != null) equals.put("phuongThucThanhToan", method);

    IDS.forEach(
        (parameter, property) -> {
          Long id = positiveId(params.get(parameter), parameter);
          echo.put(parameter, id);
          if (id != null) equals.put(property, id);
        });

    boolean user = equals.containsKey("nguoiNopNhan.id");
    boolean supplier = equals.containsKey("nhaCungCap.id");
    boolean partner = equals.containsKey("doiTacVanChuyen.id");

    if ((user ? 1 : 0) + (supplier ? 1 : 0) + (partner ? 1 : 0) > 1
        || (group != null
            && (user
                    && group != NhomNguoiNopNhanEnum.KHACH_HANG
                    && group != NhomNguoiNopNhanEnum.NHAN_VIEN
                || supplier && group != NhomNguoiNopNhanEnum.NHA_CUNG_CAP
                || partner && group != NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG))) {
      throw invalid("nhom_nguoi_nop_nhan", "Nhóm và liên kết đối tượng mâu thuẫn");
    }

    String business = text(params.get("nghiep_vu_nguon"));
    if (business != null && !BUSINESSES.contains(business)) {
      throw invalid("nghiep_vu_nguon", "Nghiệp vụ nguồn không hợp lệ");
    }

    String keyword = text(params.get("keyword"));
    String payer = text(params.get("ten_nguoi_nop_nhan"));

    echo.put("tu_ngay", from);
    echo.put("den_ngay", to);
    echo.put("keyword", keyword);
    echo.put("loai_phieu", type);
    echo.put("nguon_tao", source);
    echo.put("nhom_nguoi_nop_nhan", group);
    echo.put("phuong_thuc_thanh_toan", method);
    echo.put("ten_nguoi_nop_nhan", payer);
    echo.put("nghiep_vu_nguon", business);

    return new Filter(from, to, equals, keyword, payer, business, echo);
  }

  private Map<String, Object> row(SoQuyThuChi voucher) {
    var creator = voucher.getNguoiTao();
    var type = voucher.getLoaiThuChi();

    var saleOrder = voucher.getDonHang();
    var purchaseOrder = voucher.getDonNhapHang();
    var delivery = voucher.getPhieuGiaoHang();

    // Phiếu trả cũ đã có quan hệ bằng ID đến đơn bán.
    if (saleOrder == null && voucher.getPhieuTraHang() != null) {
      saleOrder = voucher.getPhieuTraHang().getDonHang();
    }

    return m(
        "id",
        voucher.getId(),
        "ma_phieu",
        voucher.getMaPhieu(),
        "loai_phieu",
        voucher.getLoaiPhieu(),
        "loai_thu_chi_id",
        type.getId(),
        "ma_loai",
        type.getMaLoai(),
        "ten_loai",
        type.getTenLoai(),
        "nhom_nguoi_nop_nhan",
        voucher.getNhomNguoiNopNhan(),
        "nguoi_nop_nhan_id",
        voucher.getNguoiNopNhan() == null ? null : voucher.getNguoiNopNhan().getId(),
        "nha_cung_cap_id",
        voucher.getNhaCungCap() == null ? null : voucher.getNhaCungCap().getId(),
        "doi_tac_van_chuyen_id",
        voucher.getDoiTacVanChuyen() == null ? null : voucher.getDoiTacVanChuyen().getId(),
        "ten_nguoi_nop_nhan",
        voucher.getTenNguoiNopNhan(),
        "ma_chung_tu_tham_chieu",
        voucher.getMaChungTuThamChieu(),
        "so_tien",
        voucher.getSoTien(),
        "phuong_thuc_thanh_toan",
        voucher.getPhuongThucThanhToan(),
        "ngay_ghi_nhan",
        time(voucher.getNgayGhiNhan()),
        "mo_ta",
        voucher.getMoTa(),
        "tags",
        voucher.getTags(),
        "nguoi_tao_id",
        creator == null ? null : creator.getId(),
        "ten_nguoi_tao",
        creator == null ? "Hệ thống" : creator.getHoTen(),
        "nguon_tao",
        voucher.getNguonTao(),
        "trang_thai",
        voucher.getTrangThai(),
        "created_at",
        time(voucher.getCreatedAt()),
        "updated_at",
        time(voucher.getUpdatedAt()),
        "hoa_don_bao_hanh_id",
        voucher.getHoaDonBaoHanh() == null ? null : voucher.getHoaDonBaoHanh().getId(),
        "phieu_bao_hanh_id",
        voucher.getPhieuBaoHanh() == null ? null : voucher.getPhieuBaoHanh().getId(),
        "phieu_tra_hang_id",
        voucher.getPhieuTraHang() == null ? null : voucher.getPhieuTraHang().getId(),
        "nghiep_vu_nguon",
        CashbookService.sourceBusiness(voucher),
        "don_hang_id",
        saleOrder == null ? null : saleOrder.getId(),
        "ma_don_hang",
        saleOrder == null ? null : saleOrder.getMaDonHang(),
        "don_nhap_hang_id",
        purchaseOrder == null ? null : purchaseOrder.getId(),
        "ma_don_nhap",
        purchaseOrder == null ? null : purchaseOrder.getMaDonNhap(),
        "phieu_giao_hang_id",
        delivery == null ? null : delivery.getId(),
        "ma_phieu_giao_hang",
        delivery == null ? null : delivery.getMaPhieuGiaoHang());
  }

  private <T> T read(Supplier<T> operation) {
    try {
      return operation.get();
    } catch (AppException exception) {
      throw exception;
    } catch (RuntimeException exception) {
      log.error("Không đọc được nguồn sổ quỹ", exception);
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "source",
          "CASHBOOK_SOURCE_UNAVAILABLE",
          "Không truy xuất được nguồn dữ liệu sổ quỹ");
    }
  }

  private static Path<?> path(Root<SoQuyThuChi> root, String name) {
    Path<?> result = root;
    for (String part : name.split("\\.")) result = result.get(part);
    return result;
  }

  private static LocalDateTime start(LocalDate value) {
    return value == null ? null : value.atStartOfDay();
  }

  private static LocalDateTime end(LocalDate value) {
    return value == null ? null : value.plusDays(1).atStartOfDay();
  }

  private static OffsetDateTime time(LocalDateTime value) {
    return value == null ? null : value.atZone(ZONE).toOffsetDateTime();
  }

  private static String text(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private static String pattern(String value) {
    return "%"
        + value.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_")
        + "%";
  }

  private static Long positiveId(String raw, String field) {
    if (text(raw) == null) return null;
    try {
      long value = Long.parseLong(raw.strip());
      if (value <= 0) throw new NumberFormatException();
      return value;
    } catch (NumberFormatException exception) {
      throw invalid(field, "ID phải là số nguyên dương");
    }
  }

  private static int integer(String raw, String field) {
    try {
      return Integer.parseInt(raw);
    } catch (NumberFormatException | NullPointerException exception) {
      throw invalid(field, "Tham số phải là số nguyên");
    }
  }

  private static LocalDate date(String raw, String field) {
    if (text(raw) == null) return null;
    try {
      LocalDate value = LocalDate.parse(raw.strip());
      if (value.getYear() < 1000 || value.getYear() > 9998) {
        throw new DateTimeException("Out of range");
      }
      return value;
    } catch (DateTimeException exception) {
      throw invalid(field, "Ngày phải có dạng YYYY-MM-DD");
    }
  }

  private static <E extends Enum<E>> E enumeration(String raw, Class<E> type, String field) {
    if (text(raw) == null) return null;
    try {
      return Enum.valueOf(type, raw.strip());
    } catch (IllegalArgumentException exception) {
      throw invalid(field, "Giá trị lựa chọn không hợp lệ");
    }
  }

  private static void rejectPagination(Map<String, String> params) {
    if (params.containsKey("page") || params.containsKey("limit")) {
      throw invalid("page", "API này không nhận page hoặc limit");
    }
  }

  private static String idText(Object value) {
    return value == null ? "" : value.toString();
  }

  private static void write(Sheet sheet, int index, Object... values) {
    Row row = sheet.createRow(index);

    for (int column = 0; column < values.length; column++) {
      Cell cell = row.createCell(column);
      Object value = values[column];

      if (value instanceof Number number) {
        cell.setCellValue(number.doubleValue());
      } else {
        // setCellValue(String), không dùng setCellFormula().
        cell.setCellValue(value == null ? "" : value.toString());
      }
    }
  }

  private static Map<String, Object> m(Object... values) {
    Map<String, Object> result = new LinkedHashMap<>();
    for (int i = 0; i < values.length; i += 2) {
      result.put((String) values[i], values[i + 1]);
    }
    return result;
  }

  private static AppException invalid(String field, String message) {
    return new AppException(ErrorCode.INVALID_DATA, field, "INVALID_CASHBOOK_FILTER", message);
  }
}
