export function brandLogoUrl(source) {
  try {
    const url = new URL(source);
    if (url.hostname !== 'res.cloudinary.com') return source;
    url.pathname = url.pathname.replace('/image/upload/', '/image/upload/c_scale,w_600/e_trim/c_fit,w_288,h_112/');
    return url.href;
  } catch {
    return source;
  }
}
