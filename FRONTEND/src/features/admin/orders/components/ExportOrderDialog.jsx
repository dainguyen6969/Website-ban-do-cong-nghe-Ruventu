import { useEffect, useRef, useState } from 'react';
import { getSerialCandidates } from '../api/orderApi';
import { canExport, exportPayload } from './exportSelection';
import OrderModal from './OrderModal';
import TablePagination from '../../../../shared/components/ui/TablePagination';

export default function ExportOrderDialog({
  order,
  dialog,
  setDialog,
  warehouses,
  busy,
  error,
  submit,
  mode = 'export',
}) {
  const [picker, setPicker] = useState(null);

  const packing = mode === 'packing';
  const defectIds = dialog.defectIds || [];

  const ready =
    canExport(dialog.warehouseId, dialog.groups) &&
    (!packing || !defectIds.length || Boolean(dialog.defectReason?.trim()));

  return (
    <>
      <div inert={picker !== null}>
        <OrderModal
          title={packing ? 'SERIAL ĐÓNG GÓI' : 'XUẤT KHO ĐƠN HÀNG'}
          subtitle={
            packing ? 'CHỌN / QUÉT SERIAL VÀ LƯU PHÂN BỔ' : 'XUẤT THEO SERIAL ĐÃ CHỐT KHI ĐÓNG GÓI'
          }
          className="order-export-modal"
          showClose
          cancelLabel="HỦY"
          confirmLabel={packing ? 'LƯU SERIAL ĐÓNG GÓI' : 'XÁC NHẬN XUẤT KHO'}
          close={() => setDialog(null)}
          busy={busy}
          error={error}
          disabled={!ready || picker !== null}
          submit={() => {
            const payload = exportPayload(dialog.warehouseId, dialog.requirements, dialog.groups);

            submit(
              packing
                ? {
                    ...payload,
                    serial_loi_ids: defectIds,
                    ly_do_doi_serial: dialog.defectReason?.trim() || null,
                  }
                : payload
            );
          }}
        >
          <div className="order-export-warehouses" role="group" aria-label="Kho xuất hàng">
            <span>KHO XUẤT HÀNG</span>

            {warehouses.map((warehouse) => (
              <label key={warehouse.id}>
                <input
                  type="radio"
                  name="export-warehouse"
                  disabled={busy || !packing}
                  checked={Number(dialog.warehouseId) === warehouse.id}
                  onChange={() =>
                    setDialog((current) => ({
                      ...current,
                      warehouseId: warehouse.id,
                    }))
                  }
                />
                {warehouse.name}
              </label>
            ))}
          </div>

          {!warehouses.length && <p role="status">Chưa có kho xuất hàng.</p>}

          {packing && Boolean(dialog.savedSerials?.length) && (
            <section className="order-export-product">
              <strong>SERIAL ĐÃ GIỮ</strong>

              <p>Chọn mã bị lỗi, chọn serial thay thế rồi lưu phân bổ.</p>

              {dialog.savedSerials.map((serial) => (
                <label key={serial.id} className="order-operation-confirm">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={defectIds.includes(serial.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;

                      setDialog((current) => ({
                        ...current,
                        defectIds: checked
                          ? [...(current.defectIds || []), serial.id]
                          : (current.defectIds || []).filter((id) => id !== serial.id),
                        groups: checked
                          ? current.groups.map((group) => ({
                              ...group,
                              selected: group.selected.filter((id) => id !== serial.id),
                            }))
                          : current.groups,
                      }));
                    }}
                  />

                  <span>{serial.so_serial} — đánh dấu lỗi</span>
                </label>
              ))}

              {defectIds.length > 0 && (
                <label className="order-operation-field">
                  <span>LÝ DO ĐỔI SERIAL LỖI</span>

                  <textarea
                    required
                    maxLength={150}
                    disabled={busy}
                    value={dialog.defectReason || ''}
                    onChange={(event) =>
                      setDialog((current) => ({
                        ...current,
                        defectReason: event.target.value,
                      }))
                    }
                  />
                </label>
              )}
            </section>
          )}

          {!packing && (
            <p>
              Serial được lấy từ phân bổ đã lưu khi đóng gói. Muốn đổi mã, hủy hoàn tất đóng gói rồi
              chọn lại.
            </p>
          )}

          {dialog.requirements.map((line) => {
            const product = order.san_pham.find(
              (item) => item.chi_tiet_don_hang_id === line.chi_tiet_don_hang_id
            );

            const groups = dialog.groups.filter(
              (group) => group.lineId === line.chi_tiet_don_hang_id
            );

            return (
              <section className="order-export-product" key={line.chi_tiet_don_hang_id}>
                <header>
                  <strong>{product?.ten_san_pham || '—'}</strong>

                  <span className="order-export-product__type">
                    {line.loai_san_pham === 'BO_PC' ? 'BỘ PC' : 'SẢN PHẨM ĐƠN'}
                  </span>

                  <small>SỐ LƯỢNG ĐẶT: {line.so_luong_dat}</small>
                </header>

                {line.la_qua_tang && <span className="sale-history-gift">QUÀ TẶNG</span>}

                {groups.map((group) => (
                  <div className="order-export-variant" key={group.phien_ban_id}>
                    <div>
                      <strong>{group.name}</strong>
                      <small>{group.barcode || '—'}</small>

                      <span>
                        SL MỖI ĐƠN VỊ: {group.so_luong_moi_don_vi}
                        {' · '}CẦN SERIAL: {group.so_luong_can_serial}
                      </span>
                    </div>

                    <div className="order-export-variant__actions">
                      <span
                        className={
                          group.selected.length === group.so_luong_can_serial
                            ? 'is-complete'
                            : 'is-missing'
                        }
                      >
                        {group.selected.length === group.so_luong_can_serial
                          ? `✓ ĐÃ CHỌN: ${group.selected.length} / ${group.so_luong_can_serial}`
                          : `CÒN THIẾU ${group.so_luong_can_serial - group.selected.length} SERIAL`}
                      </span>

                      <button
                        type="button"
                        className={`order-action ${
                          group.selected.length ? '' : 'order-action--black'
                        }`}
                        disabled={busy || !packing}
                        onClick={() => setPicker(group)}
                      >
                        {group.selected.length ? 'SỬA SERIAL' : 'CHỌN SERIAL'}
                      </button>
                    </div>
                  </div>
                ))}

                {(line.hang_vat_ly || [])
                  .filter((item) => !item.quan_ly_serial)
                  .map((item) => (
                    <p className="order-export-no-serial" key={item.phien_ban_id}>
                      {item.ten_san_pham || `Phiên bản #${item.phien_ban_id}`}
                      {item.ten_phien_ban ? ` · ${item.ten_phien_ban}` : ''}
                      {' · '}Số lượng xuất: {item.so_luong}
                      {' · '}Không quản lý serial
                    </p>
                  ))}
              </section>
            );
          })}
        </OrderModal>
      </div>

      {packing && picker && (
        <SerialPicker
          orderId={order.id}
          group={picker}
          usedIds={[
            ...dialog.groups.filter((group) => group !== picker).flatMap((group) => group.selected),
            ...defectIds,
          ]}
          close={() => setPicker(null)}
          confirm={(selected) => {
            setDialog((current) => ({
              ...current,
              groups: current.groups.map((group) =>
                group.lineId === picker.lineId && group.phien_ban_id === picker.phien_ban_id
                  ? { ...group, selected }
                  : group
              ),
            }));

            setPicker(null);
          }}
        />
      )}
    </>
  );
}

function SerialPicker({ orderId, group, usedIds, close, confirm }) {
  const [selected, setSelected] = useState(group.selected);
  const [filter, setFilter] = useState({ keyword: '', page: 0 });
  const previousSearch = useRef(filter.keyword);
  const [result, setResult] = useState({
    items: [],
    pagination: {},
    loading: true,
    error: '',
  });

  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scanController = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    setResult((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    const delay = previousSearch.current === filter.keyword ? 0 : 150;
    previousSearch.current = filter.keyword;
    const timer = setTimeout(async () => {
      try {
        const data = await getSerialCandidates(
          orderId,
          {
            chi_tiet_don_hang_id: group.lineId,
            phien_ban_id: group.phien_ban_id,
            keyword: filter.keyword.trim(),
            page: filter.page,
            limit: 100,
          },
          controller.signal
        );

        if (!controller.signal.aborted) {
          setResult({
            ...data,
            loading: false,
            error: '',
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            items: [],
            pagination: {},
            loading: false,
            error: error.message || 'Không tải được serial.',
          });
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [orderId, group.lineId, group.phien_ban_id, filter]);

  useEffect(() => {
    return () => scanController.current?.abort();
  }, []);

  const toggle = (id) => {
    setScanError('');

    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id);
      }

      if (usedIds.includes(id) || current.length >= group.so_luong_can_serial) {
        return current;
      }

      return [...current, id];
    });
  };

  const search = (keyword, page = 0) => {
    setScanError('');
    setFilter({ keyword, page });
  };

  const scan = async () => {
    const code = filter.keyword.trim();
    if (!code || scanning) return;

    scanController.current?.abort();
    const controller = new AbortController();
    scanController.current = controller;

    setScanning(true);
    setScanError('');

    try {
      const data = await getSerialCandidates(
        orderId,
        {
          chi_tiet_don_hang_id: group.lineId,
          phien_ban_id: group.phien_ban_id,
          so_serial: code,
          page: 0,
          limit: 2,
        },
        controller.signal
      );

      if (controller.signal.aborted) return;

      const matches = data.items || [];

      if (matches.length !== 1) {
        throw new Error('Không tìm thấy duy nhất một serial khả dụng.');
      }

      const item = matches[0];

      if (usedIds.includes(item.id)) {
        throw new Error('Serial đã được chọn cho dòng khác.');
      }

      if (selected.includes(item.id)) {
        setScanError('Serial này đã được chọn.');
        return;
      }

      if (selected.length >= group.so_luong_can_serial) {
        throw new Error('Đã chọn đủ số lượng serial.');
      }

      setSelected((current) =>
        current.includes(item.id) || current.length >= group.so_luong_can_serial
          ? current
          : [...current, item.id]
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setScanError(error.message || 'Không kiểm tra được serial.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setScanning(false);
      }
    }
  };

  return (
    <OrderModal
      title={`CHỌN SERIAL - ${group.name}`}
      className="order-select-serial"
      showClose
      cancelLabel="HỦY"
      close={close}
      error={scanError || result.error}
      disabled={
        scanning ||
        result.loading ||
        !!result.error ||
        selected.length !== group.so_luong_can_serial
      }
      submit={() => confirm(selected)}
    >
      <p className="order-serial-count">
        SỐ LƯỢNG CẦN CHỌN: <strong>{group.so_luong_can_serial}</strong>
        <span>
          ĐÃ CHỌN: <strong>{selected.length}</strong>
        </span>
      </p>

      <input
        className="order-serial-search"
        aria-label="Tìm hoặc quét serial"
        placeholder="TÌM / QUÉT SERIAL..."
        value={filter.keyword}
        onChange={(event) => search(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            scan();
          }
        }}
      />

      {scanning && <p role="status">Đang kiểm tra mã vừa quét...</p>}

      <div className="order-serial-results" aria-busy={result.loading}>
        {result.loading ? (
          <p role="status">Đang tải serial...</p>
        ) : result.items.length ? (
          result.items.map((item) => (
            <button
              type="button"
              key={item.id}
              className="order-serial-row"
              aria-pressed={selected.includes(item.id)}
              disabled={
                usedIds.includes(item.id) ||
                (!selected.includes(item.id) && selected.length >= group.so_luong_can_serial)
              }
              onClick={() => toggle(item.id)}
            >
              <span>{item.so_serial}</span>
              <span className="order-serial-stock">
                {selected.includes(item.id)
                  ? '✓ ĐÃ CHỌN'
                  : usedIds.includes(item.id)
                    ? 'ĐÃ CHỌN Ở DÒNG KHÁC'
                    : 'TRONG KHO'}
              </span>
            </button>
          ))
        ) : (
          <p role="status">Không có serial khả dụng.</p>
        )}
      </div>

      {result.pagination?.total_pages > 1 && (
        <TablePagination totalItems={Number(result.pagination.total_elements) || result.pagination.total_pages * 100} pageSize={100} currentPage={filter.page + 1} onPageChange={page => search(filter.keyword, page - 1)} showSummary={false} idPrefix="export-serials" />
      )}
    </OrderModal>
  );
}
