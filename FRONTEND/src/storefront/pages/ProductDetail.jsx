import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductGallery from "../components/ProductGallery";
import ProductInfoSidebar from "../components/ProductInfoSidebar";
import ProductPurchaseRightSidebar from "../components/ProductPurchaseRightSidebar";
import ProductSpecsTabs from "../components/ProductSpecsTabs";
import ProductRecommendations from "../components/ProductRecommendations";

import ComboContents from "../../shared/components/ui/ComboContents";
import { productService, toProductDetail } from "../../shared/services/productService";

import "./ProductDetail.css";
import { parseSpecifications, resolveProductContent } from './productDetailContent';

export default function ProductDetail() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  useEffect(() => {
    let active = true;

    window.scrollTo(0, 0);
    setLoading(true);
    setProduct(null);
    setError("");
    setSelectedVariantId(null);

    async function load() {
      try {
        const response = await productService.getProductDetail(id);
        const data = response?.data;

        if (!data) {
          throw new Error("Không tìm thấy sản phẩm.");
        }

        const mapped = toProductDetail(data);
        mapped.specifications = parseSpecifications(mapped.specifications);

        if (!active) return;

        setProduct(mapped);
        setSelectedVariantId(mapped.defaultVariantId);
      } catch (reason) {
        if (active) {
          setError(
            reason.response?.data?.message ||
              reason.message ||
              "Không tải được sản phẩm.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const displayProduct = product ? {
    ...product,
    ...resolveProductContent(product.specifications,product.description,product.category,selectedVariantId),
  } : null;

  const hasInfoSidebar = product && (product.loaiSanPham === "BO_PC" || product.variants.length > 1);

  return (
    <div className="product-detail-page">
      <Header />

      {loading ? (
        <div className="product-detail-status">
          Đang tải thông tin sản phẩm...
        </div>
      ) : !product ? (
        <div
          className="product-detail-status product-detail-status--error"
          role="alert"
        >
          {error || "Không tìm thấy sản phẩm."}
        </div>
      ) : (
        <>
          <div className="breadcrumb-container">
            <div className="breadcrumb">
              <Link to="/">Trang chủ</Link>
              <span className="separator">&gt;</span>
              <span>{product.category}</span>
              <span className="separator">&gt;</span>
              <span className="current">{product.name}</span>
            </div>
          </div>

          <div className={"product-main-container" + (hasInfoSidebar ? "" : " product-main-container--without-sidebar")}>
            {hasInfoSidebar && <div className="info-sidebar-column">
              {product.loaiSanPham === "BO_PC" ? (
                <ComboContents items={product.thanhPhan} scrollable />
              ) : (
                <ProductInfoSidebar
                  product={displayProduct}
                  selectedVariantId={selectedVariantId}
                  setSelectedVariantId={setSelectedVariantId}
                />
              )}
            </div>}

            <div className="gallery-column">
              <ProductGallery
                images={product.images}
                discountPercent={product.discountPercent}
                isFullBuild={product.loaiSanPham === "BO_PC"}
              />
            </div>

            <div className="purchase-right-sidebar-column">
              <ProductPurchaseRightSidebar
                product={displayProduct}
                selectedVariantId={selectedVariantId}
              />
            </div>

            <div className="product-description-column">
              <ProductSpecsTabs product={displayProduct} />
            </div>
          </div>
          <ProductRecommendations key={product.id} product={product} />
        </>
      )}

      <Footer />
    </div>
  );
}
