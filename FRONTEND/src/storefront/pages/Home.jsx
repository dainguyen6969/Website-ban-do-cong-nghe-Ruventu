import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import InfoBar from '../components/InfoBar';
import CategoryBar from '../components/CategoryBar';
import ProductSection from '../components/ProductSection';
import Footer from '../components/Footer';
import { productService } from '../../shared/services/productService';
import { categoryService } from '../../shared/services/categoryService';
import ConsultationBanner from '../components/ConsultationBanner';

const LINH_KIEN_KEYWORDS = [
  'vga', 'gpu', 'cpu', 'mainboard', 'bo mạch', 'ram', 'ssd', 'hdd', 'ổ cứng',
  'psu', 'nguồn', 'tản nhiệt', 'case', 'vỏ case', 'vỏ máy tính', 'linh kiện', 'linh-kien'
];
const GAMING_GEAR_KEYWORDS = [
  'bàn phím', 'chuột', 'tai nghe', 'gaming gear', 'gamming gear', 'gaming-gear',
  'gamming-gear', 'gear', 'headset', 'mouse', 'keyboard', 'lót chuột', 'pad'
];

function categorizeProduct(p) {
  const cat = (p.category || p.tenDanhMuc || '').toLowerCase();
  const parent = (p.parentCategory || p.tenDanhMucCha || '').toLowerCase();
  const slug = (p.categorySlug || p.duongDanUrl || '').toLowerCase();
  const brand = (p.brand || p.tenThuongHieu || '').toLowerCase();
  const fullText = `${cat} ${parent} ${slug} ${brand}`;

  if (GAMING_GEAR_KEYWORDS.some(k => fullText.includes(k))) return 'gaming-gear';
  if (LINH_KIEN_KEYWORDS.some(k => fullText.includes(k))) return 'linh-kien';
  return 'pc-build';
}

function mapProduct(p) {
  return {
    id: p.id,
    title: p.tenSanPham,
    name: p.tenSanPham,
    image: p.anhChinh || 'https://via.placeholder.com/300',
    price: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.giaThapNhat || 0),
    rawPrice: p.giaThapNhat || 0,
    category: p.tenDanhMuc || '',
    categoryId: p.danhMucId || null,
    categorySlug: p.duongDanUrl || '',
    parentCategory: p.tenDanhMucCha || '',
    parentCategoryId: p.danhMucChaId || null,
    brand: p.tenThuongHieu || '',
    outOfStock: !p.conHang,
  };
}

const Home = () => {
  const [pcBuildProducts, setPcBuildProducts] = useState([]);
  const [linhKienProducts, setLinhKienProducts] = useState([]);
  const [gamingGearProducts, setGamingGearProducts] = useState([]);
  const [linhKienTabs, setLinhKienTabs] = useState(['Tất cả', 'Case', 'CPU', 'VGA', 'RAM', 'Mainboard', 'SSD']);
  const [gamingGearTabs, setGamingGearTabs] = useState(['Tất cả', 'Bàn phím cơ', 'Chuột gaming', 'Tai nghe']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, catRes] = await Promise.allSettled([
          productService.getProducts({ ton_kho: true, limit: 100 }),
          categoryService.getCategories({ trang_thai: 1, limit: 100 }),
        ]);

        let allCats = [];
        if (catRes.status === 'fulfilled' && catRes.value?.data?.items) {
          allCats = catRes.value.data.items;
        }

        if (prodRes.status === 'fulfilled' && prodRes.value?.data?.danhSachSanPham) {
          const all = prodRes.value.data.danhSachSanPham
            .map(mapProduct)
            .filter(p => !p.outOfStock);
          const pcBuild = all.filter(p => categorizeProduct(p) === 'pc-build');
          const linhKien = all.filter(p => categorizeProduct(p) === 'linh-kien');
          const gamingGear = all.filter(p => categorizeProduct(p) === 'gaming-gear');

          setPcBuildProducts(pcBuild);
          setLinhKienProducts(linhKien);
          setGamingGearProducts(gamingGear);

          // 1. Tìm các danh mục con của "Linh Kiện" từ API categories
          const lkParent = allCats.find(c => {
            const name = (c.ten_danh_muc || '').toLowerCase();
            return (name.includes('linh kiện') || name.includes('linh-kien')) && !c.danh_muc_cha_id;
          });

          let lkSubs = [];
          if (lkParent) {
            lkSubs = allCats
              .filter(c => c.danh_muc_cha_id === lkParent.id)
              .map(c => c.ten_danh_muc);
          }

          // Lấy thêm danh mục con từ sản phẩm (loại bỏ tên danh mục gốc "Linh Kiện")
          const productLKSubs = [
            ...new Set(
              linhKien
                .map(p => p.category)
                .filter(c => c && !c.toLowerCase().includes('linh kiện'))
            )
          ];

          const combinedLK = [...new Set([...lkSubs, ...productLKSubs])];
          if (combinedLK.length > 0) {
            setLinhKienTabs(['Tất cả', ...combinedLK]);
          }

          // 2. Tìm các danh mục con của "Gaming Gear"
          const ggParent = allCats.find(c => {
            const name = (c.ten_danh_muc || '').toLowerCase();
            return (name.includes('gear') || name.includes('gaming')) && !c.danh_muc_cha_id;
          });

          let ggSubs = [];
          if (ggParent) {
            ggSubs = allCats
              .filter(c => c.danh_muc_cha_id === ggParent.id)
              .map(c => c.ten_danh_muc);
          }

          const productGGSubs = [
            ...new Set(
              gamingGear
                .map(p => p.category)
                .filter(c => c && !c.toLowerCase().includes('gear'))
            )
          ];

          const combinedGG = [...new Set([...ggSubs, ...productGGSubs])];
          if (combinedGG.length > 0) {
            setGamingGearTabs(['Tất cả', ...combinedGG]);
          }
        }
      } catch (error) {
        console.error("Lỗi fetch trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="home-page">
      <Header />
      <HeroBanner />
      <InfoBar />
      <CategoryBar />

      <ProductSection
        title="PC BUILD SẴN"
        subtitle="Cấu hình hoàn chỉnh - Lắp ráp & kiểm tra 100% - Bảo hành 36 tháng"
        linkText="XEM TẤT CẢ"
        linkUrl="/category/pc-build"
        products={pcBuildProducts}
        loading={loading}
      />

      <ConsultationBanner />

      <ProductSection
        title="LINH KIỆN KHỦNG"
        subtitle="GPU flagship & mainboard cao cấp - Hiệu năng không thỏa hiệp"
        linkText="XEM TẤT CẢ"
        linkUrl="/category/linh-kien"
        products={linhKienProducts}
        categories={linhKienTabs}
        loading={loading}
      />

      <ProductSection
        title="GAMING GEAR"
        subtitle="Bàn phím cơ & chuột gaming - Độ trễ 0 - Chiến thắng mọi đối thủ"
        linkText="XEM TẤT CẢ"
        linkUrl="/category/gaming-gear"
        products={gamingGearProducts}
        categories={gamingGearTabs}
        darkTheme={true}
        loading={loading}
      />

      <Footer />
    </div>
  );
};

export default Home;
