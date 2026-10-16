import { useEffect, useMemo, useState } from "react";

import Header from "../components/Header";
import HeroBanner from "../components/HeroBanner";
import InfoBar from "../components/InfoBar";
import CategoryBar from "../components/CategoryBar";
import ProductSection from "../components/ProductSection";
import ConsultationBanner from "../components/ConsultationBanner";
import Footer from "../components/Footer";

import {
  productService,
  toProductCard,
} from "../../shared/services/productService";

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
        const response = await productService.getProducts({
          page: 0,
          limit: 100,
          sort: "moi_nhat",
        });

        const items = response?.data?.danhSachSanPham;

        if (!Array.isArray(items)) {
          throw new Error("Dữ liệu danh sách sản phẩm không hợp lệ.");
        }

        if (active) {
          setProducts(items.map(toProductCard));
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
    () => products.filter((product) => product.loaiSanPham === "BO_PC"),
    [products],
  );

  const standaloneProducts = useMemo(
    () => products.filter((product) => product.loaiSanPham === "DON"),
    [products],
  );

  const standaloneCategories = useMemo(
    () =>
      [
        ...new Set(
          standaloneProducts.map(
            (product) => product.category || "Chưa phân loại",
          ),
        ),
      ].sort((a, b) => a.localeCompare(b, "vi")),
    [standaloneProducts],
  );

  return (
    <div className="home-page">
      <Header />
      <HeroBanner />
      <InfoBar />
      <CategoryBar />

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
            title="LINH KIỆN & GAMING GEAR"
            subtitle="Linh kiện, thiết bị và phụ kiện công nghệ"
            linkText="XEM DANH SÁCH"
            linkUrl="/search"
            products={standaloneProducts}
            categories={standaloneCategories}
          />
        </>
      )}

      <Footer />
    </div>
  );
}
