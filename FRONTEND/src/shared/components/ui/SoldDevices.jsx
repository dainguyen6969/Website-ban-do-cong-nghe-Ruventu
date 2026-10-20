import { formatDateTimeVN } from "../../services/mutationUtils";

import "./SoldDevices.css";

export default function SoldDevices({ order }) {
  const devices = order?.thiet_bi_da_giao || [];

  return (
    <div className="sold-devices">
      {order?.ngay_hoan_thanh && (
        <p className="sold-devices-note">
          Thời điểm giao nhận thực tế:{" "}
          <strong>{formatDateTimeVN(order.ngay_hoan_thanh)}</strong>
        </p>
      )}

      {order?.canh_bao_thiet_bi && (
        <p className="sold-devices-warning" role="status">
          {order.canh_bao_thiet_bi}
        </p>
      )}

      {!devices.length ? (
        <p className="sold-devices-note">Chưa có thông tin thiết bị đã xuất.</p>
      ) : (
        <div className="sold-devices-scroll">
          <table className="sold-devices-table">
            <thead>
              <tr>
                <th>MÃ THEO DÕI</th>
                <th>SẢN PHẨM / PHIÊN BẢN</th>
                <th>SERIAL</th>
                <th>THỜI HẠN</th>
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
                    <td>{item.ma_theo_doi || "—"}</td>

                    <td>
                      <strong>
                        {item.ten_san_pham || `Phiên bản #${item.phien_ban_id}`}
                      </strong>
                      <small>{item.ten_phien_ban || "—"}</small>
                    </td>

                    <td>{item.so_serial || "Không quản lý serial"}</td>

                    <td>
                      {months == null
                        ? "Chưa xác định"
                        : Number(months) === 0
                          ? "Không bảo hành"
                          : `${months} tháng`}
                    </td>

                    <td>
                      {item.ngay_kich_hoat
                        ? formatDateTimeVN(item.ngay_kich_hoat)
                        : "Chưa kích hoạt"}
                    </td>

                    <td>
                      {months != null && Number(months) === 0
                        ? "Không bảo hành"
                        : item.han_bao_hanh
                          ? formatDateTimeVN(item.han_bao_hanh)
                          : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
