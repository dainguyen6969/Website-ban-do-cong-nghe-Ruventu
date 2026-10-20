import { useEffect, useMemo, useState } from "react";

import Header from "../components/Header";
import HeroBanner from "../components/HeroBanner";
import InfoBar from "../components/InfoBar";
import CategoryBar from "../components/CategoryBar";
import ProductSection from "../components/ProductSection";
import ConsultationBanner from "../components/ConsultationBanner";
import Footer from "../components/Footer";

import { productService } from "../../shared/services/productService";
import { catalogScopes, inCatalogScope, shuffleProducts } from "./catalogModel";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const items = await productService.getAllProducts({ sort: "moi_nhat" });

        if (active) {
          setProducts(shuffleProducts(items));
        }
      } catch (reason) {
        if (active) {
          setProducts([]);
          setError(
            reason.response?.data?.message ||
              reason.message ||
              "Không tải được danh sách sản phẩm.",
          );
        }
      } finally {
        if (active) setLoading(false);
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

  const componentProducts = useMemo(
    () => products.filter((product) => inCatalogScope(product, "linh-kien")),
    [products],
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
          />

          <ConsultationBanner />

          <ProductSection
            title="LINH KIỆN KHỦNG"
            subtitle="Linh kiện chính hãng cho cấu hình PC của bạn"
            linkText="XEM TẤT CẢ"
            linkUrl="/category/linh-kien"
            products={componentProducts}
            categories={catalogScopes["linh-kien"].categories.filter(category =>
              componentProducts.some(product => product.category === category)
            )}
          />

          <ProductSection
            title="GAMING GEAR"
            subtitle="Màn hình, linh kiện và phụ kiện cho góc gaming"
            linkText="XEM TẤT CẢ"
            linkUrl="/category/gaming-gear"
            products={gamingGearProducts}
            categories={[...new Set(gamingGearProducts.map(product => product.category).filter(Boolean))]
              .sort((a, b) => a.localeCompare(b, "vi"))}
            darkTheme
          />
        </>
      )}

      </div>
      <Footer />
    </div>
  );
}
