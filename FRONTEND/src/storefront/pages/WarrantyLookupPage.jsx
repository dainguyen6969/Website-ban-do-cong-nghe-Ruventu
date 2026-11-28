import AdminHelp from '../../shared/components/ui/AdminHelp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Check, HelpCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TablePagination from '../../shared/components/ui/TablePagination';
import { orderService } from '../../shared/services/orderService';
import { AUTH_CHANGED, getAccessToken, readCurrentUser } from '../../auth/backendAuth';
import { displayDate, statusLabels } from '../../features/admin/warranty/data/warrantyContract';
import './WarrantyLookupPage.css';

const PAGE_SIZE = 20;

const identity = () => (getAccessToken() ? String(readCurrentUser()?.id || 'authenticated') : '');

const pickTicket = (item, keyword) => {
  const tickets = item.phieu_bao_hanh || [];
  const value = keyword.trim().toLocaleLowerCase('vi');

  return (
    tickets.find((ticket) => ticket.ma_phieu.toLocaleLowerCase('vi') === value) ||
    (value
      ? tickets.find((ticket) => ticket.ma_phieu.toLocaleLowerCase('vi').includes(value))
      : null) ||
    tickets[0] ||
    null
  );
};

const statusDescriptions = {
  TIEP_NHAN: 'Cửa hàng đã tiếp nhận thiết bị.',
  DANG_KIEM_TRA: 'Kiểm tra thiết bị và xác định phương án xử lý.',
  DA_GUI_BAO_HANH: 'Thiết bị đã được gửi đến đơn vị bảo hành.',
  DANG_BAO_HANH: 'Thiết bị đang được xử lý bảo hành hoặc sửa chữa.',
  DA_NHAN_LAI: 'Cửa hàng đã nhận lại thiết bị sau khi gửi xử lý.',
  CHO_DOI_SAN_PHAM: 'Chờ sản phẩm thay thế theo phương án đổi đã được chấp thuận.',
  CHO_TRA_KHACH: 'Thiết bị đã sẵn sàng để bàn giao cho khách.',
  HOAN_TAT: 'Thiết bị đã được bàn giao cho khách.',
};

const getTicketTimeline = (ticket) => {
  if (!ticket) return [];

  if (Array.isArray(ticket.tien_trinh) && ticket.tien_trinh.length) {
    return ticket.tien_trinh;
  }

  const timeline = [
    {
      trang_thai_xu_ly: 'TIEP_NHAN',
      thoi_diem: ticket.ngay_tiep_nhan,
    },
  ];

  if (ticket.trang_thai_xu_ly !== 'TIEP_NHAN') {
    timeline.push({
      trang_thai_xu_ly: ticket.trang_thai_xu_ly,
      thoi_diem: null,
    });
  }

  return timeline;
};

export default function WarrantyLookupPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState(() => Boolean(getAccessToken()));
  const [verification, setVerification] = useState(null);
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const pendingKeyword = useRef('');
  const submitted = useRef(null);
  const controller = useRef(null);
  const sequence = useRef(0);

  const clearResult = useCallback(() => {
    sequence.current += 1;
    controller.current?.abort();
    setResult(null);
    setError('');
    setLoading(false);
    submitted.current = null;
  }, []);

  useEffect(() => {
    const changed = (event) => {
      if (event.type === 'storage' && ![null, 'accessToken', 'user'].includes(event.key)) return;

      clearResult();
      setAccount(Boolean(getAccessToken()));
      setVerification(null);
      setOrderCode('');
      setPhone('');
      setVerifyError('');
      pendingKeyword.current = '';
      dialogRef.current?.close();
    };

    window.addEventListener(AUTH_CHANGED, changed);
    window.addEventListener('storage', changed);

    return () => {
      window.removeEventListener(AUTH_CHANGED, changed);
      window.removeEventListener('storage', changed);
      sequence.current += 1;
      controller.current?.abort();
    };
  }, [clearResult]);

  const lookup = async (query, page = 0) => {
    controller.current?.abort();

    const active = new AbortController();
    controller.current = active;
    const number = ++sequence.current;
    const owner = identity();

    submitted.current = query;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await orderService.lookupWarranty(
        { ...query, page, limit: PAGE_SIZE },
        active.signal
      );

      if (active.signal.aborted || number !== sequence.current || owner !== identity()) return;

      const data = response.data?.data;
      if (
        !Array.isArray(data?.items) ||
        !Number.isInteger(data?.pagination?.page) ||
        !Number.isInteger(data?.pagination?.total_elements)
      ) {
        throw new Error('Dữ liệu tra cứu trả về không hợp lệ.');
      }

      if (page > 0 && data.items.length === 0) {
        await lookup(query, 0);
        return;
      }

      setResult(data);
    } catch (cause) {
      if (active.signal.aborted || number !== sequence.current || owner !== identity()) return;

      const status = cause.response?.status ?? cause.status;

      setError(
        status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại hoặc xác minh đơn hàng.'
          : status === 403
            ? 'Tài khoản hiện tại không có quyền thực hiện yêu cầu.'
            : status === 429
              ? 'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 10 phút.'
              : status >= 500
                ? 'Chưa thể tra cứu lúc này. Vui lòng thử lại sau.'
                : cause.response?.data?.message || cause.message || 'Không thể tra cứu bảo hành.'
      );
    } finally {
      if (number === sequence.current) setLoading(false);
    }
  };

  const openVerification = (keyword) => {
    pendingKeyword.current = keyword;
    setVerifyError('');

    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  };

  const search = (event) => {
    event.preventDefault();
    const keyword = searchValue.trim();

    if (!keyword) {
      setError('Vui lòng nhập thông tin cần tra cứu.');
      return;
    }

    clearResult();

    if (verification) {
      lookup({ pham_vi: 'DON_HANG', keyword, ...verification });
    } else if (getAccessToken()) {
      lookup({ pham_vi: 'TAI_KHOAN', keyword });
    } else {
      openVerification(keyword);
    }
  };

  const verify = (event) => {
    event.preventDefault();

    const code = orderCode.trim();
    const recipientPhone = phone.trim();

    if (
      !code ||
      !/^\+?[0-9][0-9 .()-]{6,19}$/.test(recipientPhone) ||
      recipientPhone.replace(/[^0-9]/g, '').length < 7
    ) {
      setVerifyError('Nhập mã đơn hàng và số điện thoại nhận hàng hợp lệ.');
      return;
    }

    const details = {
      ma_don_hang: code,
      sdt_nguoi_nhan: recipientPhone,
    };
    const keyword = pendingKeyword.current;

    setVerification(details);
    clearResult();
    dialogRef.current.close();

    if (keyword) {
      lookup({ pham_vi: 'DON_HANG', keyword, ...details });
    } else {
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    clearResult();
    setSearchValue('');
    inputRef.current?.focus();
  };

  const renderResult = (item) => {
    const ticket = pickTicket(item, submitted.current?.keyword || '');
    const processingTimeline = getTicketTimeline(ticket);

    const onlyBoundaryTimeline =
      processingTimeline.length === 2 &&
      processingTimeline[0].trang_thai_xu_ly === 'TIEP_NHAN' &&
      processingTimeline[1].trang_thai_xu_ly === 'HOAN_TAT';

    const timelineNote = onlyBoundaryTimeline
      ? 'Dữ liệu tra cứu hiện chỉ có mốc tiếp nhận và bàn giao. Các chặng trung gian chưa có đủ dữ liệu để hiển thị.'
      : processingTimeline.some((point) => !point.thoi_diem)
        ? 'Một số mốc chưa ghi nhận thời điểm chuyển trạng thái. Tiến trình chỉ hiển thị thông tin hiện có.'
        : '';

    const otherTickets = (item.phieu_bao_hanh || []).filter(
      (value) => value.ma_phieu !== ticket?.ma_phieu
    );

    return (
      <article
        className="found-grid"
        key={item.thiet_bi_id != null ? 'tb-' + item.thiet_bi_id : 'sn-' + item.so_serial_id}
      >
        <div className="product-info-panel">
          <div className="panel-header">
            <div className="red-line" />
            <h3>THÔNG TIN SẢN PHẨM</h3>
          </div>

          <div className="product-details">
            <h2 className="product-title">{item.ten_san_pham}</h2>
            <p className="product-category">{item.ten_phien_ban}</p>

            <div className="codes-table">
              <div className="code-col border-right">
                <span className="code-label">SỐ SERIAL</span>
                <span className="code-value">{item.so_serial || 'Không ghi nhận serial'}</span>
              </div>
              <div className="code-col">
                <span className="code-label">{ticket ? 'MÃ PHIẾU BẢO HÀNH' : 'MÃ THEO DÕI'}</span>
                <span className="code-value">{ticket?.ma_phieu || item.ma_theo_doi || '—'}</span>
              </div>
            </div>
          </div>

          <div className="panel-divider" />

          <div className="panel-header">
            <div className="red-line" />
            <h3>THÔNG TIN BẢO HÀNH</h3>
          </div>

          <div className="warranty-details">
            {[
              ['Mã đơn hàng', item.ma_don_hang + ' (#' + item.don_hang_id + ')'],
              ['Mã sản phẩm', item.ma_san_pham],
              ['Mã vạch phiên bản', item.ma_vach],
              ['Mã theo dõi', item.ma_theo_doi],
              ['Ngày kích hoạt', displayDate(item.ngay_kich_hoat)],
              ['Hạn bảo hành', displayDate(item.han_bao_hanh)],
              ...(ticket ? [['Ngày tiếp nhận', displayDate(ticket.ngay_tiep_nhan)]] : []),
            ].map(([label, value]) => (
              <div className="detail-row" key={label}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value || '—'}</span>
              </div>
            ))}

            <div className="detail-row">
              <span className="detail-label">Thời hạn hiện tại</span>
              <span className="detail-value">
                {item.trang_thai_thoi_han === 'CON_HAN' ? 'Còn hạn' : 'Hết hạn'}
              </span>
            </div>

            {ticket && (
              <div className="detail-row">
                <span className="detail-label">Trạng thái xử lý</span>
                <span className="detail-value">
                  {statusLabels[ticket.trang_thai_xu_ly] || 'Chưa xác định trạng thái'}
                </span>
              </div>
            )}

            {ticket && (
              <div className="detail-row">
                <span className="detail-label">Lý do bảo hành</span>
                <span className="detail-value reason">
                  {ticket.ly_do_bao_hanh || 'Chưa có thông tin'}
                </span>
              </div>
            )}
          </div>

          <div className="panel-footer">
            {item.can_xac_minh && <p>Quyền tiếp nhận cần cửa hàng xác minh thêm.</p>}
            Thời hạn hiện tại và điều kiện bảo hành miễn phí được xem xét riêng. Phiếu đã tiếp nhận
            hợp lệ tiếp tục được xử lý theo kết luận đã xác nhận.
          </div>
        </div>

        <div className="timeline-panel">
          <div className="panel-header">
            <div className="red-line" />
            <h3>TRẠNG THÁI XỬ LÝ</h3>
          </div>

          {timelineNote && (
            <p className="warranty-timeline-note" role="status">
              {timelineNote}
            </p>
          )}

          {ticket ? (
            <>
              <div className="timeline">
                {processingTimeline.map((point, index) => {
                  const isCurrent = index === processingTimeline.length - 1;
                  const isFinished = isCurrent && point.trang_thai_xu_ly === 'HOAN_TAT';
                  const done = !isCurrent || isFinished;

                  return (
                    <div
                      key={ticket.ma_phieu + '-' + index}
                      className={[
                        'timeline-item',
                        done ? 'done' : 'active',
                        isCurrent ? 'last' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="timeline-icon">
                        {done && <Check size={14} color="#fff" aria-hidden="true" />}
                      </div>

                      <div className="timeline-content">
                        <h4 className={'step-title' + (!done ? ' highlight' : '')}>
                          {statusLabels[point.trang_thai_xu_ly] || 'Chưa xác định trạng thái'}
                          {isCurrent && !isFinished ? ' · Hiện tại' : ''}
                        </h4>
                        <span className="step-date">
                          {point.thoi_diem
                            ? 'Ghi nhận: ' + displayDate(point.thoi_diem)
                            : 'Chưa có thời điểm chuyển trạng thái'}
                        </span>

                        <p className="step-desc">
                          {statusDescriptions[point.trang_thai_xu_ly] ||
                            'Vui lòng liên hệ cửa hàng để đối chiếu.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {otherTickets.length > 0 && (
                <div className="warranty-other-tickets">
                  <h4>Các phiếu khác của thiết bị</h4>
                  <ul>
                    {otherTickets.map((value) => (
                      <li key={value.ma_phieu}>
                        <span>{value.ma_phieu}</span>
                        <span>{statusLabels[value.trang_thai_xu_ly] || 'Chưa xác định'}</span>
                      </li>
                    ))}
                  </ul>
                  <p>Nhập mã phiếu vào ô tra cứu để xem lần xử lý tương ứng.</p>
                </div>
              )}
            </>
          ) : (
            <p className="step-desc">Thiết bị chưa phát sinh phiếu bảo hành.</p>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="warranty-lookup-page">
      <Header />

      <div className="warranty-banner">
        <div className="container">
          <button type="button" className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> QUAY LẠI
          </button>

          <div className="banner-title-container">
            <div className="red-vertical-line" />
            <h1 className="banner-title">TRA CỨU BẢO HÀNH</h1>
          </div>

          <AdminHelp>Nhập thông tin đơn hàng, sản phẩm hoặc bảo hành để tra cứu.</AdminHelp>

          <form className="search-form" onSubmit={search}>
            <div className="search-input-wrapper">
              <label className="warranty-search-label" htmlFor="warranty-keyword">
                Thông tin cần tra cứu
              </label>
              <input
                id="warranty-keyword"
                ref={inputRef}
                type="text"
                required
                maxLength={100}
                autoComplete="off"
                aria-describedby="warranty-search-hint"
                placeholder="Mã đơn, tên, SĐT, email, sản phẩm, serial, mã phiếu..."
                value={searchValue}
                onChange={(event) => {
                  clearResult();
                  setSearchValue(event.target.value);
                }}
              />
            </div>
            <button type="submit" className="search-submit-btn" disabled={loading}>
              {loading ? 'ĐANG TRA CỨU…' : 'TRA CỨU'}
            </button>
          </form>

          <div className="warranty-verification-hint">
            <span>
              {verification
                ? 'Đang đối chiếu theo đơn hàng đã nhập.'
                : account
                  ? 'Tra cứu trong đơn hàng thuộc tài khoản của bạn.'
                  : 'Khách vãng lai xác minh đơn hàng trước khi xem kết quả.'}
            </span>

            <button
              type="button"
              className="warranty-inline-action"
              onClick={() => openVerification(searchValue.trim())}
            >
              {verification
                ? 'Đổi thông tin đơn hàng'
                : account
                  ? 'Xác minh đơn mua không gắn tài khoản'
                  : 'Xác minh đơn hàng'}
            </button>

            {verification && (
              <button
                type="button"
                className="warranty-inline-action"
                onClick={() => {
                  clearResult();
                  setVerification(null);
                  setOrderCode('');
                  setPhone('');
                }}
              >
                {account ? 'Về đơn thuộc tài khoản' : 'Xóa thông tin đối chiếu'}
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container warranty-main-container">
        {error ? (
          <div className="warranty-content not-found">
            <div className="not-found-box" role="alert">
              <h2>CHƯA THỂ TRA CỨU</h2>
              <p>{error}</p>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  if (submitted.current) lookup(submitted.current);
                  else inputRef.current?.focus();
                }}
              >
                THỬ LẠI
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="warranty-content not-found">
            <div className="not-found-box" role="status">
              <h2>ĐANG TRA CỨU</h2>
              <p>Đang tải thông tin bảo hành…</p>
            </div>
          </div>
        ) : result ? (
          result.items.length ? (
            <div className="warranty-content found">
              <p className="warranty-result-count" role="status">
                {result.pagination.total_elements} thiết bị phù hợp
                {' · '}Cập nhật: {displayDate(result.thoi_diem_tra_cuu)}
              </p>

              {result.items.map(renderResult)}

              <TablePagination
                totalItems={result.pagination.total_elements}
                pageSize={PAGE_SIZE}
                currentPage={result.pagination.page + 1}
                idPrefix="customer-warranty"
                onPageChange={(page) => {
                  if (submitted.current) {
                    lookup(submitted.current, page - 1);
                  }
                }}
              />
            </div>
          ) : (
            <div className="warranty-content not-found">
              <div className="not-found-box" role="status">
                <div className="search-icon-large">
                  <Search size={32} color="#aaa" />
                </div>
                <h2>KHÔNG TÌM THẤY KẾT QUẢ</h2>
                <p>
                  Không tìm thấy thiết bị bảo hành phù hợp. Kiểm tra từ khóa và thông tin đối chiếu
                  đơn hàng. Hồ sơ cũ thiếu căn cứ kích hoạt cần cửa hàng xác minh.
                </p>
                <button type="button" className="btn-outline" onClick={reset}>
                  TÌM KIẾM LẠI
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="warranty-content idle">
            <div className="info-columns">
              <div className="info-col">
                <h3>Đơn hàng / khách hàng</h3>
                <p>Tìm bằng ID, mã đơn, tên hoặc SĐT trong phạm vi đơn hàng của bạn.</p>
              </div>
              <div className="info-col">
                <h3>Thông tin sản phẩm</h3>
                <p>Tìm bằng tên sản phẩm, phiên bản, mã sản phẩm, mã vạch hoặc serial.</p>
              </div>
              <div className="info-col">
                <h3>Thông tin bảo hành</h3>
                <p>Tìm bằng mã phiếu hoặc mã theo dõi thiết bị, kể cả thiết bị không có serial.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <button
        type="button"
        className="floating-help"
        aria-label="Quay lại ô tra cứu"
        onClick={() => inputRef.current?.focus()}
      >
        <HelpCircle size={24} color="#fff" />
      </button>

      <dialog
        ref={dialogRef}
        className="warranty-verify-dialog"
        aria-labelledby="warranty-verify-title"
        onClose={() => {
          pendingKeyword.current = '';
        }}
      >
        <form onSubmit={verify}>
          <div className="panel-header">
            <div className="red-line" />
            <h3 id="warranty-verify-title">XÁC MINH ĐƠN HÀNG</h3>
          </div>

          <p>
            Nhập thông tin nhận hàng để tra cứu thiết bị thuộc đơn. Thông tin này chỉ được giữ trong
            phiên mở trang.
          </p>

          <label>
            Mã đơn hàng
            <input
              required
              maxLength={50}
              autoComplete="off"
              value={orderCode}
              onChange={(event) => setOrderCode(event.target.value)}
            />
          </label>

          <label>
            Số điện thoại nhận hàng
            <input
              required
              type="tel"
              maxLength={20}
              autoComplete="off"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>

          {verifyError && (
            <p className="warranty-verify-error" role="alert">
              {verifyError}
            </p>
          )}

          <div className="warranty-verify-actions">
            <button type="button" className="btn-outline" onClick={() => dialogRef.current.close()}>
              Đóng
            </button>
            <button type="submit" className="search-submit-btn">
              XÁC NHẬN
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
