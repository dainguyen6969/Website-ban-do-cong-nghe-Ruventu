import { createContext } from 'react';
import {
  AUTH_CHANGED,
  readCurrentUser,
  saveLogin,
  logoutBackend,
} from './backendAuth';

const MockAuthContext = createContext(null);

export default MockAuthContext;
