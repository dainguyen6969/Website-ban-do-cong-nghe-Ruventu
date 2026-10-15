import { useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";
import "./ProductSection.css";

function categoryKey(value) {
  const key = String(value ?? "")
    .trim()
    .toLocaleLowerCase("vi");

  return key === "gpu" ? "vga" : key;
}

export default function ProductSection({
  title,
  subtitle,
  linkText,
  linkUrl,
  products = [],
  darkTheme = false,
  categories = [],
}) {
  const [activeTab, setActiveTab] = useState("");

  const items = Array.isArray(products) ? products : [];

  const tabs = [
    ...new Set(
      (Array.isArray(categories) ? categories : []).filter(
        (category) =>
          typeof category === "string" &&
          category.trim() !== "" &&
          categoryKey(category) !== "tất cả",
      ),
    ),
  ];

  // Khi danh mục thay đổi, tab cũ không còn tồn tại sẽ về Tất cả.
  const selectedTab = tabs.includes(activeTab) ? activeTab : "";

  const visibleProducts = selectedTab
    ? items.filter(
        (product) =>
          categoryKey(product.category || "Chưa phân loại") ===
          categoryKey(selectedTab),
      )
    : items;

  return (
    <section className={`product-section ${darkTheme ? "dark-theme" : ""}`}>
      <div className="container">
        <div className="section-header">
          <div className="section-title-wrapper">
            <h2 className="product-section-title">{title}</h2>

            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>

          {linkText && linkUrl && (
            <Link to={linkUrl} className="section-link">
              {linkText} &rarr;
            </Link>
          )}
        </div>

        {tabs.length > 0 && (
          <div className="section-tabs-wrapper">
            <div className="section-tabs">
              <button
                type="button"
                className={`section-tab-btn ${
                  selectedTab === "" ? "active" : ""
                }`}
                aria-pressed={selectedTab === ""}
                onClick={() => setActiveTab("")}
              >
                Tất cả
              </button>

              {tabs.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={`section-tab-btn ${
                    selectedTab === category ? "active" : ""
                  }`}
                  aria-pressed={selectedTab === category}
                  onClick={() => setActiveTab(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="product-grid">
          {visibleProducts.length > 0 ? (
            visibleProducts.map((product, index) => (
              <ProductCard key={product.id ?? index} product={product} />
            ))
          ) : (
            <div className="empty-products">
              Chưa có sản phẩm nào trong danh mục này.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
