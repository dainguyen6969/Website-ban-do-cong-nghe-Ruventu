import { useEffect, useRef } from 'react';
import { HiOutlineCheck, HiOutlineInformationCircle } from 'react-icons/hi';

const money = (value) => `${Number(value).toLocaleString('vi-VN')}đ`;

export default function PaymentSuccessModal({ receipt, onDismiss }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} className="pos-payment-modal" aria-labelledby="pos-payment-title" onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
    <header><HiOutlineCheck aria-hidden="true" /><h2 id="pos-payment-title">THANH TOÁN THÀNH CÔNG</h2></header>
    <div className="pos-payment-body">
      <dl><div><dt>Mã đơn hàng</dt><dd>{receipt.code}</dd></div><div><dt>Tổng tiền</dt><dd className="pos-payment-total">{money(receipt.total)}</dd></div><div><dt>Tiền thối</dt><dd className={receipt.change >= 0 ? 'pos-payment-change' : 'pos-payment-total'}>{money(receipt.change)}</dd></div></dl>
      <p><HiOutlineInformationCircle aria-hidden="true" /><span>Trạng thái đơn: Hoàn thành — kho đã xuất tự động.</span></p>
    </div>
    <footer><button type="button" onClick={() => onDismiss(true)}>IN HOÁ ĐƠN</button><button type="button" autoFocus onClick={() => onDismiss()}>ĐÓNG</button></footer>
  </dialog>;
}
