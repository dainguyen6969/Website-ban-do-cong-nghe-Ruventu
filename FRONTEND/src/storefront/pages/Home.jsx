import { useEffect, useMemo, useState } from "react";

import Header from "../components/Header";
import HeroBanner from "../components/HeroBanner";
import InfoBar from "../components/InfoBar";
import CategoryBar from "../components/CategoryBar";
import ProductSection from "../components/ProductSection";
import ConsultationBanner from "../components/ConsultationBanner";
import Footer from "../components/Footer";

import { productService, toProductCard } from "../../shared/services/productService";
import { categoryTreeIds, componentCategoryIds, inCatalogScope } from "./catalogModel";
import useCatalogOptions from '../hooks/useCatalogOptions';

const categoryTabs = items =>
  [...new Set(items.map(product => product.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "vi"));

function pcPlatform(product) {
  const cpu = product.specs?.find(spec => /^cpu$/i.test(spec.label))?.value || "";
  if (/\b(?:amd\b|ryzen)/i.test(cpu)) return "AMD";
  if (/\bintel\b/i.test(cpu)) return "Intel";
  return "";
}

export default function Home({ selectedTabs = {}, onSelectTab }) {
  const catalogOptions = useCatalogOptions();
  const componentIds = useMemo(() => componentCategoryIds(catalogOptions.categories), [catalogOptions.categories]);
  const [laptopSpecs, setLaptopSpecs] = useState({});
  const [{ products, loading, error }, setCatalog] = useState(() => {
    const cached = productService.getCachedAllProducts();
    return { products: cached || [], loading: !cached, error: '' };
  });

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const items = await productService.getAllProducts({ sort: "moi_nhat" });

        if (active) {
          setCatalog({ products: items, loading: false, error: '' });
        }
      } catch (reason) {
        if (active) {
          setCatalog({ products: [], loading: false, error: reason.response?.data?.message ||
              reason.message ||
              "Không tải được danh sách sản phẩm." });
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const pcProducts = useMemo(
    () => products.filter((product) => inCatalogScope(product, "pc-build")),
    [products],
  );

  const laptopProducts = useMemo(() => {
    const laptop = catalogOptions.categories.find(category => category.duongDanUrl === "laptop");
    const laptopIds = laptop ? categoryTreeIds(catalogOptions.categories, laptop.id) : null;
    return products.filter(product => laptopIds && product.categoryId != null
      ? product.loaiSanPham === "DON" && laptopIds.has(Number(product.categoryId))
      : inCatalogScope(product, "laptop")).slice(0, 4);
  }, [products, catalogOptions.categories]);

  useEffect(() => {
    const missing = laptopProducts.filter(product => !product.specs?.length);
    if (!missing.length) return;

    let active = true;
    Promise.allSettled(missing.map(async product => {
      const { data } = await productService.getProductDetail(product.id);
      const { specs } = toProductCard({ ...data, phienBanMacDinhId: product.defaultVariantId });
      return [product.id, { variantId: product.defaultVariantId, specs }];
    })).then(results => {
      if (active) {
        setLaptopSpecs(Object.fromEntries(results
          .filter(result => result.status === "fulfilled")
          .map(result => result.value)));
      }
    });
    return () => { active = false; };
  }, [laptopProducts]);

  const componentProducts = useMemo(
    () => products.filter(product => product.loaiSanPham === 'DON' && componentIds.has(Number(product.categoryId))),
    [products, componentIds],
  );

  const gamingGearProducts = useMemo(
    () => products.filter((product) => inCatalogScope(product, "gaming-gear")),
    [products],
  );

  return (
    <div className="home-page">
      <Header />
      <HeroBanner />
      <InfoBar />
      <CategoryBar />

      <div id="pc-build-san">
      {loading && (
        <div className="container home-catalog-status" role="status">
          Đang tải sản phẩm...
        </div>
      )}

      {error && (
        <div
          className="container home-catalog-status home-catalog-status--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <ProductSection
            title="PC BUILD SẴN"
            subtitle="Khám phá các bộ PC và cấu hình linh kiện"
            linkText="XEM TẤT CẢ"
            linkUrl="/category/pc-build"
            products={pcProducts}
            categories={["Intel", "AMD"].filter(platform => pcProducts.some(product => pcPlatform(product) === platform))}
            getCategory={pcPlatform}
            activeTab={selectedTabs.pcBuild}
            onTabChange={platform => onSelectTab?.('pcBuild', platform)}
          />

          <ProductSection
            id="laptop"
            title="LAPTOP"
            subtitle="Gaming, học tập & làm việc — chọn cấu hình phù hợp với bạn"
            linkText="XEM TẤT CẢ"
            linkUrl="/category/laptop"
            products={laptopProducts.map(product => {
              const fallback = laptopSpecs[product.id];
              return !product.specs?.length && fallback && fallback.variantId === product.defaultVariantId
                ? { ...product, specs: fallback.specs }
                : product;
            })}
          />

          <ConsultationBanner />

          <ProductSection
            title="LINH KIỆN KHỦNG"
            subtitle="Linh kiện chính hãng cho cấu hình PC của bạn"
            linkText="XEM TẤT CẢ"
            linkUrl="/category/linh-kien"
            products={componentProducts}
            activeTab={selectedTabs.components}
            onTabChange={category => onSelectTab?.('components', category)}
            categories={categoryTabs(componentProducts)}
          />

          <ProductSection
            title="GAMING GEAR"
            subtitle="Màn hình, linh kiện và phụ kiện cho góc gaming"
            linkText="XEM TẤT CẢ"
            linkUrl="/category/gaming-gear"
            products={gamingGearProducts}
            activeTab={selectedTabs.gamingGear}
            onTabChange={category => onSelectTab?.('gamingGear', category)}
            categories={categoryTabs(gamingGearProducts)}
            darkTheme
          />
        </>
      )}

      </div>
      <Footer />
    </div>
  );
}
