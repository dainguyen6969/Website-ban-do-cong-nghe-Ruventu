import { useContext } from 'react';
import FontPreferenceContext from './FontPreferenceContext';

export default function useFontPreference() {
  const value = useContext(FontPreferenceContext);
  if (!value) throw new Error('useFontPreference must be used inside FontPreferenceContext.Provider');
  return value;
}
