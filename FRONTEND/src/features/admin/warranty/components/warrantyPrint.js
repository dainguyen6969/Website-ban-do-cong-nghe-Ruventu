import { getWarranty } from '../api/warrantyApi';
import {
  displayDate,
  money,
  paymentLabels,
  refundLabels,
  statusLabels,
} from '../data/warrantyContract';

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

function text(value) {
  return escapeHtml(value == null || value === '' ? '—' : value);
}

function amount(value, label) {
  if (
    !['number', 'string'].includes(typeof value) ||
    String(value).trim() === '' ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
  ) {
    throw new Error(`Chưa đủ dữ liệu hợp lệ để in: ${label}.`);
  }

  return money(Number(value));
}

function facts(rows) {
  return `
    <table class="facts">
      <tbody>
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <th>${text(label)}</th>
            <td>${text(value)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function section(title, content) {
  return `
    <section>
      <h2>${text(title)}</h2>
      ${content}
    </section>
  `;
}

function customerInfo(detail) {
  return section(
    'Khách hàng và hồ sơ',
    facts([
      ['Khách hàng', detail.nguoi_lien_he?.ten],
      ['Số điện thoại', detail.nguoi_lien_he?.sdt],
      ['Phiếu bảo hành', detail.ma_phieu],
      ['Đơn mua hàng', detail.don_hang?.ma_don_hang],
    ])
  );
}

function deviceInfo(device) {
  return facts([
    ['Sản phẩm', device?.ten_san_pham],
    ['Phiên bản', device?.ten_phien_ban],
    ['Serial', device?.so_serial],
    ['Mã theo dõi', device?.ma_theo_doi],
    ['Hạn bảo hành theo hồ sơ', displayDate(device?.han_bao_hanh)],
  ]);
}

function signatures() {
  return `
    <div class="signatures">
      <div>
        <strong>KHÁCH HÀNG</strong>
        <p>Ký, ghi rõ họ tên</p>
      </div>
      <div>
        <strong>ĐẠI DIỆN CỬA HÀNG</strong>
        <p>Ký, ghi rõ họ tên</p>
      </div>
    </div>
  `;
}

function receiptContent(detail) {
  const accessories = detail.tiep_nhan?.phu_kien || [];
  const current = detail.thiet_bi_hien_hanh;
  const changed = current?.id != null && String(current.id) !== String(detail.thiet_bi?.id);

  const accessoryTable = accessories.length
    ? `
      <table>
        <thead>
          <tr><th>Phụ kiện tiếp nhận</th><th>Số lượng</th></tr>
        </thead>
        <tbody>
          ${accessories
            .map(
              (item) => `
            <tr>
              <td>${text(item.ten)}</td>
              <td>${text(item.so_luong)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : '<p>Không ghi nhận phụ kiện khi tiếp nhận.</p>';

  return `
    <header>
      <div class="brand">RUVENTU</div>
      <h1>PHIẾU BẢO HÀNH</h1>
      <p>Số phiếu: <strong>${text(detail.ma_phieu)}</strong></p>
      <p>Thời điểm tiếp nhận: ${text(displayDate(detail.ngay_tiep_nhan))}</p>
      <p>Thời điểm in: ${text(displayDate(new Date().toISOString()))}</p>
    </header>

    ${customerInfo(detail)}

    ${section('Thiết bị tiếp nhận', deviceInfo(detail.thiet_bi))}

    ${section(
      'Nội dung tiếp nhận',
      facts([
        ['Lý do bảo hành', detail.tiep_nhan?.ly_do],
        ['Tình trạng khi nhận', detail.tiep_nhan?.tinh_trang],
      ]) + accessoryTable
    )}

    ${section(
      'Tình trạng hồ sơ tại thời điểm in',
      facts([
        ['Trạng thái xử lý', statusLabels[detail.trang_thai_xu_ly] || detail.trang_thai_xu_ly],
        ['Cập nhật hồ sơ', displayDate(detail.ngay_cap_nhat)],
      ])
    )}

    ${changed ? section('Thiết bị hiện hành sau đổi', deviceInfo(current)) : ''}

    <p class="note">
      Phiếu ghi nhận thông tin tiếp nhận và tình trạng hồ sơ tại thời điểm in.
      Điều kiện xử lý và chi phí được xác nhận theo kết quả kiểm tra,
      báo giá và thỏa thuận đã ghi nhận.
    </p>

    ${signatures()}
  `;
}

function invoiceContent(detail, invoiceId) {
  const invoices = [detail.hoa_don, ...(detail.hoa_don_da_huy || [])].filter(Boolean);

  const invoice = invoices.find((item) => String(item.id) === String(invoiceId));

  if (!invoice) {
    throw new Error('Không tìm thấy hóa đơn đã chọn trong phiếu bảo hành. Hãy tải lại hồ sơ.');
  }

  if (!['HIEU_LUC', 'HUY'].includes(invoice.trang_thai)) {
    throw new Error('Trạng thái hóa đơn chưa đủ căn cứ để in.');
  }

  const quote = (detail.bao_gia || []).find(
    (item) => Number(item.phien_ban) === Number(invoice.phien_ban_bao_gia)
  );

  if (!quote || !Array.isArray(quote.hang_muc) || !quote.hang_muc.length) {
    throw new Error('Thiếu chi tiết báo giá tương ứng với hóa đơn; chưa thể in hóa đơn.');
  }

  const rows = quote.hang_muc
    .map((item, index) => {
      const quantity = Number(item.so_luong);

      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error('Số lượng hạng mục hóa đơn không hợp lệ.');
      }

      return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${text(item.noi_dung)}</strong>
          <div class="note">${text(item.ma_hang_muc)}</div>
        </td>
        <td class="number">${quantity}</td>
        <td class="number">${text(amount(item.don_gia_khach, 'đơn giá'))}</td>
        <td class="number">
          ${text(amount(item.thanh_tien_khach, 'thành tiền hạng mục'))}
        </td>
      </tr>
    `;
    })
    .join('');

  const cancelled = invoice.trang_thai === 'HUY';

  const totals = [
    ['Giá trị theo báo giá', amount(quote.tong_tien_khach, 'giá trị báo giá')],
    ['Giá trị hóa đơn đã lưu', amount(invoice.tong_tien, 'giá trị hóa đơn')],
    [
      'Khoản phải thu còn hiệu lực',
      amount(invoice.khoan_phai_thu_hieu_luc, 'khoản phải thu hiệu lực'),
    ],
    ['Đã thu', amount(invoice.da_thu, 'tiền đã thu')],
    ['Đã hoàn', amount(invoice.da_hoan, 'tiền đã hoàn')],
    ['Còn phải thu', amount(invoice.con_phai_thu, 'tiền còn phải thu')],
    ['Còn phải hoàn', amount(invoice.con_phai_hoan, 'tiền còn phải hoàn')],
  ];

  return `
    <header>
      <div class="brand">RUVENTU</div>
      <h1>HÓA ĐƠN BẢO HÀNH</h1>
      <p>Số hóa đơn: <strong>${text(invoice.ma_hoa_don)}</strong></p>
      <p>Thời điểm in: ${text(displayDate(new Date().toISOString()))}</p>
      <div class="${cancelled ? 'cancelled' : 'status'}">
        ${cancelled ? 'ĐÃ HỦY' : 'HÓA ĐƠN HIỆU LỰC'}
      </div>
    </header>

    ${customerInfo(detail)}

    ${section('Thiết bị trên hồ sơ bảo hành', deviceInfo(detail.thiet_bi))}

    ${section(
      `Các hạng mục theo báo giá phiên bản ${invoice.phien_ban_bao_gia}`,
      `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Nội dung</th>
              <th>SL</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `
    )}

    ${section('Tổng hợp hóa đơn và thanh toán', facts(totals))}

    ${section(
      'Tình trạng thanh toán',
      facts([
        [
          'Thanh toán',
          cancelled
            ? 'Hóa đơn đã hủy'
            : paymentLabels[invoice.trang_thai_thanh_toan] || invoice.trang_thai_thanh_toan,
        ],
        ['Hoàn tiền', refundLabels[invoice.trang_thai_hoan_tien] || invoice.trang_thai_hoan_tien],
      ])
    )}

    <p class="note">
      Giá trị hóa đơn và các khoản thu, hoàn phản ánh dữ liệu đã lưu tại thời điểm in.
      Các điều chỉnh hóa đơn được thể hiện ở phần tổng hợp.
    </p>

    <p class="note">
      Bản in nội bộ phục vụ đối chiếu bảo hành và thanh toán;
      không thay thế hóa đơn điện tử.
    </p>

    ${signatures()}
  `;
}

function documentHtml(title, content) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${text(title)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 20px auto;
      padding: 0 16px;
      max-width: 190mm;
      color: #111;
      background: #fff;
      font: 13px/1.55 Arial, sans-serif;
    }
    header { text-align: center; margin-bottom: 20px; }
    header p { margin: 4px 0; }
    .brand { font-weight: 800; letter-spacing: 2px; }
    h1 { margin: 8px 0; font-size: 21px; }
    h2 {
      margin: 18px 0 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #111;
      font-size: 13px;
      text-transform: uppercase;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #bbb;
      padding: 7px 8px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    thead { display: table-header-group; }
    thead th { background: #f1f1f1; }
    tr { break-inside: avoid; }
    .facts th { width: 34%; background: #f7f7f7; font-weight: 600; }
    .number { text-align: right; white-space: nowrap; }
    .note { color: #555; font-size: 12px; }
    .status { margin: 10px 0; font-weight: 700; }
    .cancelled {
      margin: 10px 0;
      padding: 8px;
      border: 2px solid #b00020;
      color: #b00020;
      font-size: 19px;
      font-weight: 800;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 28px;
      min-height: 105px;
      text-align: center;
      break-inside: avoid;
    }
    .signatures p { margin: 4px 0; font-size: 12px; }
    .print-toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 20px;
    }
    .print-toolbar button {
      padding: 8px 14px;
      border: 1px solid #111;
      background: #fff;
      font: inherit;
      cursor: pointer;
    }
    @media print {
      body { margin: 0; padding: 0; max-width: none; }
      .print-toolbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button id="print-document" type="button">In / Lưu PDF</button>
    <button id="close-document" type="button">Đóng</button>
  </div>
  ${content}
</body>
</html>`;
}

export async function printWarrantyDocument(ticketId, type, invoiceId) {
  if (!['receipt', 'invoice'].includes(type)) {
    throw new Error('Loại chứng từ in không hợp lệ.');
  }

  const popup = window.open('', '_blank', 'width=980,height=850');

  if (!popup) {
    throw new Error('Trình duyệt đang chặn cửa sổ in. Hãy cho phép cửa sổ bật lên cho trang này.');
  }

  popup.opener = null;
  popup.document.open();
  popup.document.write(documentHtml('Đang tải chứng từ', '<p>Đang tải dữ liệu…</p>'));
  popup.document.close();

  try {
    // Đọc lại hồ sơ để lấy trạng thái và số tiền mới nhất từ BE.
    const detail = await getWarranty(ticketId, 0);

    if (popup.closed) return;

    const content = type === 'receipt' ? receiptContent(detail) : invoiceContent(detail, invoiceId);

    popup.document.open();
    popup.document.write(
      documentHtml(
        type === 'receipt'
          ? `Phiếu bảo hành ${detail.ma_phieu}`
          : `Hóa đơn bảo hành ${detail.ma_phieu}`,
        content
      )
    );
    popup.document.close();

    popup.document.getElementById('print-document')?.addEventListener('click', () => {
      popup.focus();
      popup.print();
    });

    popup.document.getElementById('close-document')?.addEventListener('click', () => popup.close());

    popup.focus();
  } catch (cause) {
    if (!popup.closed) popup.close();
    throw cause;
  }
}
