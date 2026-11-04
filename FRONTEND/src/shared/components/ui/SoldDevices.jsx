import { formatDateTimeVN } from "../../services/mutationUtils";

import "./SoldDevices.css";

export default function SoldDevices({ order }) {
  const devices = order?.thiet_bi_da_giao || [];

  return (
    <div className="sold-devices">
      {order?.ngay_hoan_thanh && (
        <div className="sold-devices-notice">
          <span>Thời điểm giao nhận thực tế:</span>
          <strong>{formatDateTimeVN(order.ngay_hoan_thanh)}</strong>
        </div>
      )}

      {order?.canh_bao_thiet_bi && (
        <div className="sold-devices-warning" role="status">
          {order.canh_bao_thiet_bi}
        </div>
      )}

      {!devices.length ? (
        <p className="sold-devices-empty">Chưa có thông tin thiết bị đã xuất.</p>
      ) : (
        <div className="sold-devices-scroll">
          <div className="admin-table-scroll admin-table-scroll--embedded" tabIndex={0} role="region" aria-label="Bảng dữ liệu liên quan"><table className="sold-devices-table admin-data-table admin-data-table--records">
            <thead>
              <tr>
                <th>MÃ THEO DÕI</th>
                <th>SẢN PHẨM / PHIÊN BẢN</th>
                <th>SERIAL</th>
                <th className="align-center">THỜI HẠN</th>
                <th>KÍCH HOẠT</th>
                <th>HẾT HẠN</th>
              </tr>
            </thead>

            <tbody>
              {devices.map((item, index) => {
                const months = item.thoi_han_bao_hanh_thang;

                return (
                  <tr
                    key={
                      item.thiet_bi_id ||
                      item.ma_theo_doi ||
                      `${item.chi_tiet_don_hang_id}:${item.phien_ban_id}:${index}`
                    }
                  >
                    <td>
                      <span className="sold-device-code">{item.ma_theo_doi || '—'}</span>
                    </td>

                    <td>
                      <strong className="sold-device-product-name">
                        {item.ten_san_pham || `Phiên bản #${item.phien_ban_id}`}
                      </strong>
                      <small className="sold-device-version-name">{item.ten_phien_ban || '—'}</small>
                    </td>

                    <td>
                      {item.so_serial ? (
                        <strong className="sold-device-serial">{item.so_serial}</strong>
                      ) : (
                        <span className="sold-device-no-serial">-</span>
                      )}
                    </td>

                    <td className="align-center">
                      {months == null ? (
                        <span className="sold-device-no-serial">Chưa xác định</span>
                      ) : Number(months) === 0 ? (
                        <span className="sold-device-no-serial">Không bảo hành</span>
                      ) : (
                        <span className="sold-device-warranty-badge">{months} tháng</span>
                      )}
                    </td>

                    <td>
                      {item.ngay_kich_hoat ? (
                        <span className="sold-device-date">{formatDateTimeVN(item.ngay_kich_hoat)}</span>
                      ) : (
                        <span className="sold-device-no-serial">Chưa kích hoạt</span>
                      )}
                    </td>

                    <td>
                      {months != null && Number(months) === 0 ? (
                        <span className="sold-device-no-serial">Không bảo hành</span>
                      ) : item.han_bao_hanh ? (
                        <span className="sold-device-date">{formatDateTimeVN(item.han_bao_hanh)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
