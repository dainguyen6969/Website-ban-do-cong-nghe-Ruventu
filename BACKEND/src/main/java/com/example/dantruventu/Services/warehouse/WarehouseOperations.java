package com.example.dantruventu.Services.warehouse;

import com.example.dantruventu.DTO.Request.warehouse.AdminPurchaseOrderReceiveRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminSerialStatusRequest;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckBalanceResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminPurchaseOrderReceiveResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialStatusResponse;
import com.example.dantruventu.Services.AdminInventoryCheckService;
import com.example.dantruventu.Services.AdminPurchaseOrderService;
import com.example.dantruventu.Services.AdminSerialService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class WarehouseOperations {

  private final WarehouseSupport support;
  private final SalesContext context;

  private final AdminSerialService serialService;
  private final AdminPurchaseOrderService purchaseService;
  private final AdminInventoryCheckService inventoryCheckService;

  public AdminSerialStatusResponse changeSerialStatus(
      Long id, String key, AdminSerialStatusRequest request) {

    Long actorId = context.actor().getId();

    context.warehouse(context.defaultWarehouseId());

    return support.once(
        "SERIAL_STATUS",
        id,
        key,
        request,
        actorId,
        AdminSerialStatusResponse.class,
        () -> serialService.updateStatus(id, request, actorId));
  }

  public AdminPurchaseOrderReceiveResponse receivePurchase(
      Long id, String key, AdminPurchaseOrderReceiveRequest request) {

    Long actorId = context.actor().getId();

    context.warehouse(request.getKhoHangId());

    return support.once(
        "PURCHASE_RECEIVE",
        id,
        key,
        request,
        actorId,
        AdminPurchaseOrderReceiveResponse.class,
        () -> purchaseService.receive(id, request));
  }

  public AdminInventoryCheckBalanceResponse balanceInventory(Long id, String key) {

    Long actorId = context.actor().getId();

    context.warehouse(context.defaultWarehouseId());

    return support.once(
        "INVENTORY_BALANCE",
        id,
        key,
        Map.of(),
        actorId,
        AdminInventoryCheckBalanceResponse.class,
        () -> inventoryCheckService.balance(id, actorId));
  }
}
