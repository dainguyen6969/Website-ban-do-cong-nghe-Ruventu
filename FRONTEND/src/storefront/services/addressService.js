import { createReadCache } from '../../shared/services/readCache';

// Address queries contain personal data, so keep them only in memory.
const cache = createReadCache({ ttl: 5 * 60 * 1000 });

export function getAddressSuggestions(url, signal) {
  return cache.load(url, async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Không tải được gợi ý địa chỉ.');
    const data = await response.json();
    if (!Array.isArray(data.predictions)) throw new Error('Gợi ý địa chỉ không hợp lệ.');
    return data.predictions;
  }, { signal });
}
