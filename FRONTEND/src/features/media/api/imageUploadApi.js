import { apiRequest } from '../../../auth/backendAuth';

export function uploadImage(file, folder = 'general') {
  const endpoint =
    folder === 'categories' || folder === 'brands'
      ? `/api/v1/admin/uploads/images/catalog/${folder}`
      : '/api/v1/admin/uploads/images';

  return sendImage(file, folder, endpoint);
}

export function uploadWarrantyIntakeImage(file) {
  return sendImage(file, 'general', '/api/v1/admin/uploads/images/warranty-intake');
}

async function sendImage(file, folder, endpoint) {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  const data = await apiRequest(endpoint, {
    method: 'POST',
    body: form,
  });

  if (!data?.url) {
    throw new Error('Cloudinary không trả về URL ảnh.');
  }

  return data;
}
