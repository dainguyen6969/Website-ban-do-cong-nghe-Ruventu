import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductGallery from "../components/ProductGallery";
import ProductInfoSidebar from "../components/ProductInfoSidebar";
import ProductPurchaseRightSidebar from "../components/ProductPurchaseRightSidebar";
import ProductSpecsTabs from "../components/ProductSpecsTabs";

import ComboContents from "../../shared/components/ui/ComboContents";
import { productService } from "../../shared/services/productService";

import "./ProductDetail.css";

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

        let specifications = data.thongSoKyThuat || {};

        if (typeof specifications === "string") {
          try {
            specifications = JSON.parse(specifications);
          } catch {
            specifications = {};
          }
        }

        const specs = Object.entries(specifications).map(([label, value]) => ({
          label,
          value:
            value !== null && typeof value === "object"
              ? JSON.stringify(value)
              : String(value ?? ""),
        }));

        const variants = data.danhSachPhienBan || [];
        const combo = data.loaiSanPham === "BO_PC";

        const firstVariant =
          variants.find((variant) =>
            combo
              ? variant.coTheBan === true
              : Number(variant.tonCoTheBan ?? 0) > 0,
          ) ||
          variants[0] ||
          null;

        const mapped = {
          id: data.id,
          maSanPham: data.maSanPham,
          name: data.tenSanPham,
          category: data.danhMuc?.tenDanhMuc || "Sản phẩm",
          brand: data.thuongHieu?.tenThuongHieu || "",
          loaiSanPham: data.loaiSanPham,
          currentPrice: firstVariant?.giaBanLe ?? 0,
          originalPrice: firstVariant?.giaBanLe ?? 0,
          stock: combo
            ? (firstVariant?.soBoCoTheLap ?? null)
            : (firstVariant?.tonCoTheBan ?? 0),
          thanhPhan: data.thanhPhan || [],
          variants,
          images: (data.anhSanPham || [])
            .map((image) => image.duongDanAnh)
            .filter(Boolean),
          specsSummary: specs,
          fullSpecs: specs,
          description: data.moTa || "",
          discountPercent: 0,
          tags: [],
          policies: [
            {
              title: "MIỄN PHÍ VẬN CHUYỂN",
              desc: "Đơn từ 5tr",
              icon: "truck",
            },
            {
              title: "CAM KẾT GIÁ",
              desc: "Tốt nhất",
              icon: "tag",
            },
          ],
        };

        if (!active) return;

        setProduct(mapped);
        setSelectedVariantId(firstVariant?.id ?? null);
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

          <div className="product-main-container">
            <div className="info-sidebar-column">
              {product.loaiSanPham === "BO_PC" ? (
                <ComboContents items={product.thanhPhan} />
              ) : (
                <ProductInfoSidebar
                  product={product}
                  selectedVariantId={selectedVariantId}
                  setSelectedVariantId={setSelectedVariantId}
                />
              )}
            </div>

            <div className="gallery-column">
              <ProductGallery
                images={product.images}
                discountPercent={product.discountPercent}
                isFullBuild={product.loaiSanPham === "BO_PC"}
              />
            </div>

            <div className="purchase-right-sidebar-column">
              <ProductPurchaseRightSidebar
                product={product}
                selectedVariantId={selectedVariantId}
              />
            </div>
          </div>

          <div className="tabs-container">
            <ProductSpecsTabs product={product} />
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
