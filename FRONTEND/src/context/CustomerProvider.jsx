import { useState } from 'react';
import CustomerContext from './customerContext';
import { formatUpdatedAt, seedCustomers } from '../data/mockCustomers';

export default function CustomerProvider({ children }) {
  const [customers, setCustomers] = useState(seedCustomers);

  const addCustomer = (draft) => {
    const now = formatUpdatedAt();
    const newCustomer = {
      id: String(Math.max(...customers.map((customer) => Number(customer.id)), 0) + 1),
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
    setCustomers((current) => [newCustomer, ...current]);
    return newCustomer;
  };

  const setCustomerStatus = (customerId, status) => {
    setCustomers((current) => current.map((customer) => (
      customer.id === customerId
        ? { ...customer, status, updatedAt: formatUpdatedAt() }
        : customer
    )));
  };

  const value = { customers, addCustomer, setCustomerStatus };
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}
