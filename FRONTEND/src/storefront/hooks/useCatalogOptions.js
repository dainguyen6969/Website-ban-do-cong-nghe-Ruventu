import { useEffect, useState } from 'react';
import { categoryService } from '../../shared/services/categoryService';

export default function useCatalogOptions() {
  const [state, setState] = useState({ categories: [], brands: [], loading: true, error: '' });
  useEffect(() => {
    let active = true;
    categoryService.getOptions().then(data => {
      if (!Array.isArray(data?.danhMuc) || !Array.isArray(data?.thuongHieu)) throw new Error('Dữ liệu danh mục không hợp lệ.');
      if (active) setState({ categories: data.danhMuc, brands: data.thuongHieu, loading: false, error: '' });
    }).catch(error => {
      if (active) setState({ categories: [], brands: [], loading: false, error: error.response?.data?.message || error.message || 'Không tải được danh mục và thương hiệu.' });
    });
    return () => { active = false; };
  }, []);
  return state;
}
