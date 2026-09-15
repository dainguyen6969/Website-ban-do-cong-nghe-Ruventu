import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import SearchPage from './pages/SearchPage';
import NotFoundPage from './pages/NotFoundPage';
import PromotionsPage from './pages/PromotionsPage';
import ToastContainer from './components/ToastContainer';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
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
          <Route path="/promotions" element={<PromotionsPage />} />
          {/* Redirect unknown routes to 404 Not Found Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
