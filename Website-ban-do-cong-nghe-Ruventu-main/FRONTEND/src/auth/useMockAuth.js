import { useContext } from 'react';
import MockAuthContext from './mockAuthContext';

export default function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context) throw new Error('useMockAuth must be used inside MockAuthProvider');
  return context;
}
