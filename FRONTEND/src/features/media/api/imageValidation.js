export function validateImageFiles(files) {
  if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) throw new Error('Chỉ chọn ảnh JPG, PNG hoặc WEBP.');
  if (files.some(file => file.size === 0 || file.size > 5 * 1024 * 1024)) throw new Error('Mỗi ảnh cần có dữ liệu và không vượt quá 5 MB.');
}
