import { useEffect, useState } from 'react';
import { categoryService } from '../../shared/services/categoryService';

export default function useCatalogOptions() {
  const [state, setState] = useState(() => {
    const cached = categoryService.getCachedOptions();
    return { categories: cached?.danhMuc || [], brands: cached?.thuongHieu || [], loading: !cached, error: '' };
  });
  useEffect(() => {
    let active = true;
    categoryService.getOptions().then(data => {
      if (active) setState({ categories: data.danhMuc, brands: data.thuongHieu, loading: false, error: '' });
    }).catch(error => {
      if (active) setState(current => ({ ...current, loading: false, error: error.response?.data?.message || error.message || 'Không tải được danh mục và thương hiệu.' }));
    });
    return () => { active = false; };
  }, []);
  return state;
}
