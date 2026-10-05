export function canExport(warehouseId, groups) {
  const ids = groups.flatMap((group) => group.selected);
  return Boolean(warehouseId) && groups.every((group) => group.selected.length === group.so_luong_can_serial)
    && new Set(ids).size === ids.length;
}

export function exportPayload(warehouseId, requirements, groups) {
  return { kho_hang_id: Number(warehouseId), items: requirements.map((line) => ({
    chi_tiet_don_hang_id: line.chi_tiet_don_hang_id,
    serials: groups.filter((group) => group.lineId === line.chi_tiet_don_hang_id).map((group) => ({ phien_ban_id: group.phien_ban_id, serial_ids: group.selected })),
  })) };
}
