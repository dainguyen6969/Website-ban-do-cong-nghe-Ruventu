const axios = require('axios');

async function createProduct() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:8080/api/v1/auth/login', {
      email: 'admin@gmail.com',
      mat_khau: 'Admin@123'
    });
    
    // Get cookies (the JSESSIONID or auth token)
    const cookies = loginRes.headers['set-cookie'];
    const authHeaders = {
      headers: {
        'Cookie': cookies ? cookies.join('; ') : '',
        'Content-Type': 'application/json'
      }
    };
    
    // If it uses bearer token
    if (loginRes.data?.data?.accessToken) {
      authHeaders.headers['Authorization'] = `Bearer ${loginRes.data.data.accessToken}`;
    }

    // 2. Create Product
    const prodRes = await axios.post('http://localhost:8080/api/v1/admin/products', {
      ten_san_pham: "MacBook Pro 16 M3 Max",
      danh_muc_id: 1, // Assuming 1 exists
      thuong_hieu_id: 1, // Assuming 1 exists
      loai_san_pham: "LAPTOP",
      mo_ta: "MacBook Pro M3 Max siêu mạnh",
      gia_niem_yet: 99000000,
      trang_thai: 1,
      thong_so_ky_thuat: {
        "CPU": "Apple M3 Max",
        "RAM": "36GB"
      }
    }, authHeaders);

    const productId = prodRes.data.data.id;
    console.log("Created Product ID:", productId);

    // 3. Create Variant 1
    await axios.post(`http://localhost:8080/api/v1/admin/products/${productId}/variants`, {
      ten_phien_ban: "Màu Bạc (Silver) - 1TB",
      gia_ban_le: 99000000,
      ton_kho: 5,
      gia_tri_thuoc_tinh: {
        "Màu sắc": "Bạc",
        "Ổ cứng": "1TB"
      }
    }, authHeaders);
    
    // 4. Create Variant 2
    await axios.post(`http://localhost:8080/api/v1/admin/products/${productId}/variants`, {
      ten_phien_ban: "Đen Nhám (Space Black) - 2TB",
      gia_ban_le: 110000000,
      ton_kho: 5,
      gia_tri_thuoc_tinh: {
        "Màu sắc": "Đen Nhám",
        "Ổ cứng": "2TB"
      }
    }, authHeaders);

    console.log("Created Variants!");

  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

createProduct();
