import React, { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import Home from './pages/Home';
import ToastContainer from './components/ToastContainer';
import BackToTop from './components/BackToTop';
import FontPreferenceContext from '../typography/FontPreferenceContext';
import useQaTypography from '../typography/useQaTypography';
import { StorefrontScrollPosition } from './scrollPosition';
import './App.css';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WarrantyLookupPage = lazy(() => import('./pages/WarrantyLookupPage'));
const OrderLookupPage = lazy(() => import('./pages/OrderLookupPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const BuildPCDetail = lazy(() => import('./pages/BuildPCDetail'));
const CustomBuildPage = lazy(() => import('./pages/CustomBuildPage'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PromotionsPage = lazy(() => import('./pages/PromotionsPage'));

function StorefrontApp() {
  const fontPreference = useQaTypography();
  const { key, pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();
  const [homeTabs, setHomeTabs] = useState(() => new Map());

  const selectHomeTab = (section, category) => {
    setHomeTabs(previous => new Map(previous).set(key, {
      ...previous.get(key),
      [section]: category,
    }));
  };

  return (
    <FontPreferenceContext.Provider value={fontPreference}>
      <div className="app storefront-app" style={{ fontFamily: fontPreference.font.family, '--font-family-base': fontPreference.font.family, '--project-font-family': fontPreference.font.family, '--project-font-scale': fontPreference.fontSize / 14 }}>
        <ToastContainer />
        <Suspense fallback={<p role="status">Đang tải trang…</p>}>
          <Routes>
            <Route path="/" element={<Home selectedTabs={homeTabs.get(key)} onSelectTab={selectHomeTab} />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/bao-tri" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/warranty-lookup" element={<WarrantyLookupPage />} />
            <Route path="/order-lookup" element={<OrderLookupPage />} />
            <Route path="/order/:id" element={<OrderDetailPage />} />
            <Route path="/build-pc" element={<CustomBuildPage />} />
            <Route path="/build-pc/:id" element={<BuildPCDetail />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            {/* Redirect unknown routes to 404 Not Found Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <BackToTop />
        <StorefrontScrollPosition entryKey={key} url={`${pathname}${search}${hash}`} navigationType={navigationType} />
      </div>
    </FontPreferenceContext.Provider>
  );
}

export default StorefrontApp;
