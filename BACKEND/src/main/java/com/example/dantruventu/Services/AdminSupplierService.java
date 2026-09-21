package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.partner.AdminSupplierCreateRequest;
import com.example.dantruventu.DTO.Request.partner.AdminSupplierUpdateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierDetailResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierListResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierResponse;
import com.example.dantruventu.Entity.NhaCungCap;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.partner.NhaCungCapMapper;
import com.example.dantruventu.Repository.partner.NhaCungCapRepository;
import com.example.dantruventu.Repository.warehouse.DonNhapHangRepository;
import com.example.dantruventu.Specification.NhaCungCapSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSupplierService {

    private final NhaCungCapRepository nhaCungCapRepository;
    private final DonNhapHangRepository donNhapHangRepository;
    private final NhaCungCapMapper nhaCungCapMapper;

    @Value("${ruventu.purchase.time-zone:Asia/Ho_Chi_Minh}")
    private String purchaseTimeZone;

    public AdminSupplierListResponse getSuppliers(
            String keyword,
            Short trangThai,
            int page,
            int limit) {

        validatePagination(page, limit);

        if (keyword != null && keyword.length() > 100) {
            throw invalid("Từ khóa tìm kiếm tối đa 100 ký tự");
        }

        TrangThaiCoBanEnum status =
                trangThai == null ? null : parseStatus(trangThai);

        var pageable =
                PageRequest.of(
                        page,
                        limit,
                        Sort.by("tenNhaCungCap").ascending()
                                .and(Sort.by("id").ascending()));

        var supplierPage =
                nhaCungCapRepository.findAll(
                        NhaCungCapSpecification.build(keyword, status),
                        pageable);

        return AdminSupplierListResponse.builder()
                .items(
                        supplierPage.getContent().stream()
                                .map(nhaCungCapMapper::toListItem)
                                .toList())
                .pagination(toPagination(supplierPage))
                .build();
    }

    public AdminSupplierDetailResponse getDetail(
            Long id,
            int page,
            int limit) {

        validatePagination(page, limit);

        NhaCungCap supplier = requireSupplier(id);

        var pageable =
                PageRequest.of(
                        page,
                        limit,
                        Sort.by("ngayTao").descending()
                                .and(Sort.by("id").descending()));

        var historyPage =
                donNhapHangRepository.findByNhaCungCap_Id(id, pageable);

        ZoneId timeZone = ZoneId.of(purchaseTimeZone);

        var response = nhaCungCapMapper.toDetail(supplier);

        response.setLichSuDonNhap(
                historyPage.getContent().stream()
                        .map(
                                order ->
                                        nhaCungCapMapper.toPurchaseHistory(
                                                order,
                                                timeZone))
                        .toList());

        response.setPagination(toPagination(historyPage));

        return response;
    }

    @Transactional
    public AdminSupplierResponse create(
            AdminSupplierCreateRequest request) {

        TrangThaiCoBanEnum status =
                parseStatus(request.getTrangThai());

        NhaCungCap supplier =
                nhaCungCapMapper.toEntity(request);

        normalizeContact(supplier);
        supplier.setTrangThai(status);

        String code = normalizeOptional(request.getMaNhaCungCap());

        if (code == null) {
            code = generateCode();
        } else {
            code = code.toUpperCase(Locale.ROOT);

            if (nhaCungCapRepository.existsByMaNhaCungCapIgnoreCase(code)) {
                throw conflict("Mã nhà cung cấp đã được sử dụng");
            }
        }

        supplier.setMaNhaCungCap(code);

        validateUniqueContact(supplier, null);

        supplier = nhaCungCapRepository.saveAndFlush(supplier);

        return nhaCungCapMapper.toResponse(supplier);
    }

    @Transactional
    public AdminSupplierResponse update(
            Long id,
            AdminSupplierUpdateRequest request) {

        validateId(id);

        NhaCungCap supplier =
                nhaCungCapRepository.findByIdForUpdate(id)
                        .orElseThrow(this::notFound);

        TrangThaiCoBanEnum status =
                parseStatus(request.getTrangThai());

        nhaCungCapMapper.updateEntity(request, supplier);

        normalizeContact(supplier);
        supplier.setTrangThai(status);

        validateUniqueContact(supplier, id);

        supplier = nhaCungCapRepository.saveAndFlush(supplier);

        return nhaCungCapMapper.toResponse(supplier);
    }

    /*
     * Dành cho service tạo đơn nhập hàng sau này.
     * Phải được gọi bên trong transaction tạo đơn nhập.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public NhaCungCap requireActiveForPurchase(Long id) {
        validateId(id);

        NhaCungCap supplier =
                nhaCungCapRepository.findByIdForShare(id)
                        .orElseThrow(this::notFound);

        if (supplier.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
            throw invalid(
                    "Nhà cung cấp đã ngừng hợp tác, không thể tạo đơn nhập mới");
        }

        return supplier;
    }

    private NhaCungCap requireSupplier(Long id) {
        validateId(id);

        return nhaCungCapRepository.findById(id)
                .orElseThrow(this::notFound);
    }

    private void normalizeContact(NhaCungCap supplier) {
        String name = normalizeOptional(supplier.getTenNhaCungCap());

        if (name == null) {
            throw invalid("Tên nhà cung cấp không được để trống");
        }

        supplier.setTenNhaCungCap(name.replaceAll("\\s+", " "));

        String phone = normalizeOptional(supplier.getSoDienThoai());

        if (phone == null || !phone.matches("\\+?[0-9]{9,15}")) {
            throw invalid(
                    "Số điện thoại gồm 9–15 chữ số, có thể bắt đầu bằng dấu +");
        }

        // Chuẩn hóa cùng một số Việt Nam về cùng cách lưu.
        if (phone.startsWith("+84")) {
            phone = "0" + phone.substring(3);
        }

        supplier.setSoDienThoai(phone);

        String email = normalizeOptional(supplier.getEmail());

        supplier.setEmail(
                email == null ? null : email.toLowerCase(Locale.ROOT));

        supplier.setDiaChi(normalizeOptional(supplier.getDiaChi()));
    }

    private void validateUniqueContact(
            NhaCungCap supplier,
            Long currentId) {

        boolean phoneExists =
                currentId == null
                        ? nhaCungCapRepository.existsBySoDienThoai(
                        supplier.getSoDienThoai())
                        : nhaCungCapRepository.existsBySoDienThoaiAndIdNot(
                        supplier.getSoDienThoai(),
                        currentId);

        if (phoneExists) {
            throw conflict("Số điện thoại nhà cung cấp đã được sử dụng");
        }

        if (supplier.getEmail() != null) {
            boolean emailExists =
                    currentId == null
                            ? nhaCungCapRepository.existsByEmailIgnoreCase(
                            supplier.getEmail())
                            : nhaCungCapRepository.existsByEmailIgnoreCaseAndIdNot(
                            supplier.getEmail(),
                            currentId);

            if (emailExists) {
                throw conflict("Email nhà cung cấp đã được sử dụng");
            }
        }
    }

    private String generateCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String code =
                    "NCC-"
                            + UUID.randomUUID()
                            .toString()
                            .replace("-", "")
                            .toUpperCase(Locale.ROOT);

            if (!nhaCungCapRepository.existsByMaNhaCungCapIgnoreCase(code)) {
                return code;
            }
        }

        throw conflict("Không thể sinh mã nhà cung cấp, vui lòng thử lại");
    }

    private TrangThaiCoBanEnum parseStatus(Short value) {
        if (value == null || (value != 0 && value != 1)) {
            throw invalid("Trạng thái chỉ nhận 0 hoặc 1");
        }

        return TrangThaiCoBanEnum.fromValue(value);
    }

    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw invalid("ID nhà cung cấp phải là số nguyên dương");
        }
    }

    private void validatePagination(int page, int limit) {
        if (page < 0
                || limit < 1
                || limit > 100
                || (long) page * limit > Integer.MAX_VALUE) {

            throw invalid(
                    "Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
        }
    }

    private PaginationResponse toPagination(Page<?> result) {
        return PaginationResponse.builder()
                .page(result.getNumber())
                .limit(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank()
                ? null
                : value.strip();
    }

    private AppException invalid(String message) {
        return new AppException(ErrorCode.INVALID_DATA, message);
    }

    private AppException conflict(String message) {
        return new AppException(ErrorCode.CONFLICT, message);
    }

    private AppException notFound() {
        return new AppException(
                ErrorCode.NOT_FOUND,
                "Không tìm thấy nhà cung cấp");
    }
}