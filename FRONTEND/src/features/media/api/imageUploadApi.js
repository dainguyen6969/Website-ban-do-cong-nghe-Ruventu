import { apiRequest } from '../../../auth/backendAuth';

export async function uploadImage(file, folder = 'general') {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  const data = await apiRequest('/api/v1/admin/uploads/images', {
    method: 'POST',
    body: form,
  });

  if (!data?.url) {
    throw new Error('Cloudinary không trả về URL ảnh.');
  }

  return data;
}