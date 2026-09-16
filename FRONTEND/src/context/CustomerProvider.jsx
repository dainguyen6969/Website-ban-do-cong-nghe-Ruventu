import { useEffect, useRef, useState } from 'react';
import CustomerContext from './customerContext';
import { formatUpdatedAt, seedCustomers } from '../data/mockCustomers';
import { readSharedState, subscribeToAdminSlice, writeSharedState } from '../sync/adminSync';

const STORAGE_KEY = 'ruventu_customers_v1';

export default function CustomerProvider({ children }) {
  const [customers, setCustomers] = useState(() => readSharedState(STORAGE_KEY, seedCustomers));
  const customersRef = useRef(customers);

  useEffect(() => subscribeToAdminSlice('customers', () => {
    const next = readSharedState(STORAGE_KEY, seedCustomers);
    customersRef.current = next;
    setCustomers(next);
  }), []);

  const commitCustomers = (next, action, entityId) => {
    customersRef.current = next;
    setCustomers(next);
    writeSharedState(STORAGE_KEY, next, { slice: 'customers', action, entityId });
  };

  const addCustomer = (draft) => {
    const now = formatUpdatedAt();
    const newCustomer = {
      id: String(Math.max(...customersRef.current.map((customer) => Number(customer.id)), 0) + 1),
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      address: {
        recipient: draft.name.trim(),
        phone: draft.phone.trim(),
        lines: [draft.address.trim(), draft.ward.trim(), draft.city.trim()].filter(Boolean),
      },
    };
    commitCustomers([newCustomer, ...customersRef.current], 'created', newCustomer.id);
    return newCustomer;
  };

  const setCustomerStatus = (customerId, status) => {
    const next = customersRef.current.map((customer) => (
      customer.id === customerId
        ? { ...customer, status, updatedAt: formatUpdatedAt() }
        : customer
    ));
    commitCustomers(next, 'status-updated', customerId);
  };

  const value = { customers, addCustomer, setCustomerStatus };
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}
