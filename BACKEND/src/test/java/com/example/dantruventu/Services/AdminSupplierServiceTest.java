package com.example.dantruventu.Services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.dantruventu.DTO.Request.partner.AdminSupplierCreateRequest;
import com.example.dantruventu.DTO.Request.partner.AdminSupplierUpdateRequest;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierDetailResponse;
import com.example.dantruventu.DTO.Response.partner.AdminSupplierResponse;
import com.example.dantruventu.Entity.DonNhapHang;
import com.example.dantruventu.Entity.NhaCungCap;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.partner.NhaCungCapMapper;
import com.example.dantruventu.Repository.partner.NhaCungCapRepository;
import com.example.dantruventu.Repository.warehouse.DonNhapHangRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminSupplierServiceTest {

  @Mock private NhaCungCapRepository supplierRepository;
  @Mock private DonNhapHangRepository purchaseOrderRepository;
  @Mock private NhaCungCapMapper mapper;

  private AdminSupplierService service;

  @BeforeEach
  void setUp() {
    service = new AdminSupplierService(supplierRepository, purchaseOrderRepository, mapper);
    ReflectionTestUtils.setField(service, "purchaseTimeZone", "Asia/Ho_Chi_Minh");
  }

  @Test
  void getSuppliersAppliesStatusAndPagination() {
    NhaCungCap supplier = supplier();
    when(supplierRepository.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(
            invocation ->
                new PageImpl<>(List.of(supplier), invocation.getArgument(1, Pageable.class), 21));

    var result = service.getSuppliers("ABC", (short) 1, 1, 10);

    assertEquals(1, result.getPagination().getPage());
    assertEquals(10, result.getPagination().getLimit());
    assertEquals(21, result.getPagination().getTotalElements());
    verify(supplierRepository)
        .findAll(
            any(Specification.class),
            org.mockito.ArgumentMatchers.<Pageable>argThat(
                pageable -> pageable.getPageNumber() == 1 && pageable.getPageSize() == 10));
  }

  @Test
  void getSuppliersRejectsInvalidStatusBeforeQueryingDatabase() {
    AppException exception =
        assertThrows(AppException.class, () -> service.getSuppliers(null, (short) 2, 0, 20));

    assertEquals(ErrorCode.INVALID_DATA, exception.getErrorCode());
    verifyNoInteractions(supplierRepository);
  }

  @Test
  void getDetailReturnsPurchaseHistoryPagination() {
    NhaCungCap supplier = supplier();
    DonNhapHang order = DonNhapHang.builder().id(100L).build();
    AdminSupplierDetailResponse detail = AdminSupplierDetailResponse.builder().id(1L).build();
    var history = AdminSupplierDetailResponse.PurchaseHistoryData.builder().id(100L).build();
    when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier));
    when(purchaseOrderRepository.findByNhaCungCap_Id(eq(1L), any(Pageable.class)))
        .thenAnswer(
            invocation ->
                new PageImpl<>(List.of(order), invocation.getArgument(1, Pageable.class), 6));
    when(mapper.toDetail(supplier)).thenReturn(detail);
    when(mapper.toPurchaseHistory(eq(order), any())).thenReturn(history);

    var result = service.getDetail(1L, 1, 5);

    assertEquals(List.of(history), result.getLichSuDonNhap());
    assertEquals(6, result.getPagination().getTotalElements());
    assertEquals(2, result.getPagination().getTotalPages());
  }

  @Test
  void createRejectsDuplicateSupplierCode() {
    AdminSupplierCreateRequest request =
        AdminSupplierCreateRequest.builder()
            .maNhaCungCap("ncc-001")
            .tenNhaCungCap("Công ty ABC")
            .soDienThoai("0901234567")
            .trangThai((short) 1)
            .build();
    when(mapper.toEntity(request)).thenReturn(supplier());
    when(supplierRepository.existsByMaNhaCungCapIgnoreCase("NCC-001")).thenReturn(true);

    AppException exception = assertThrows(AppException.class, () -> service.create(request));

    assertEquals(ErrorCode.CONFLICT, exception.getErrorCode());
    verify(supplierRepository, never()).saveAndFlush(any());
  }

  @Test
  void updateCanDeactivateWithoutRemovingPurchaseHistory() {
    DonNhapHang order = DonNhapHang.builder().id(100L).build();
    NhaCungCap supplier = supplier();
    supplier.setDanhSachDonNhapHang(List.of(order));
    AdminSupplierUpdateRequest request =
        AdminSupplierUpdateRequest.builder()
            .tenNhaCungCap("Công ty ABC 2026")
            .soDienThoai("0901234567")
            .trangThai((short) 0)
            .build();
    when(supplierRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(supplier));
    doAnswer(
            invocation -> {
              NhaCungCap entity = invocation.getArgument(1);
              entity.setTenNhaCungCap(request.getTenNhaCungCap());
              entity.setSoDienThoai(request.getSoDienThoai());
              return null;
            })
        .when(mapper)
        .updateEntity(request, supplier);
    when(supplierRepository.saveAndFlush(supplier)).thenReturn(supplier);
    when(mapper.toResponse(supplier)).thenReturn(AdminSupplierResponse.builder().id(1L).build());

    service.update(1L, request);

    assertEquals(TrangThaiCoBanEnum.NGUNG_HOAT_DONG, supplier.getTrangThai());
    assertEquals(List.of(order), supplier.getDanhSachDonNhapHang());
    verify(purchaseOrderRepository, never()).deleteAll(any());
  }

  private NhaCungCap supplier() {
    return NhaCungCap.builder()
        .id(1L)
        .maNhaCungCap("NCC-001")
        .tenNhaCungCap("Công ty ABC")
        .soDienThoai("0901234567")
        .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
        .build();
  }
}
