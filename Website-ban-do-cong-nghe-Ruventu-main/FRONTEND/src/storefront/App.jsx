import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import ProfilePage from './pages/ProfilePage';
import WarrantyLookupPage from './pages/WarrantyLookupPage';
import OrderDetailPage from './pages/OrderDetailPage';
import BuildPCDetail from './pages/BuildPCDetail';
import ProductDetail from './pages/ProductDetail';
import CategoryPage from './pages/CategoryPage';
import './App.css';
import './index.css';

function StorefrontApp() {
  return (
      <div className="app storefront-app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/warranty-lookup" element={<WarrantyLookupPage />} />
          <Route path="/order/:id" element={<OrderDetailPage />} />
          <Route path="/build-pc/:id" element={<BuildPCDetail />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
  );
}

export default StorefrontApp;
