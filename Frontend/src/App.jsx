import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import "./App.css";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthCallback from "./pages/AuthCallback/AuthCallback";
import ProductsCatalog from "./pages/Catalog/ProductsCatalog";
import ProductDetail from "./pages/Catalog/ProductDetail";
import Cart from "./pages/Cart/Cart";
import Checkout from "./pages/Cart/Checkout";
import Profile from "./pages/Profile/Profile";
import OrderHistory from "./pages/Profile/OrderHistory";
import SavedItems from "./pages/Profile/SavedItems";
import SettingsSecurity from "./pages/Profile/SettingsSecurity";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import { isAuthenticated } from "./utils/authToken";

function RootRedirect() {
  return <Navigate to={isAuthenticated() ? "/home" : "/login"} replace />;
}

/** Old bookmarks: /catalog/laptops?segment=… → /catalog/products?segment=… */
function RedirectLegacyCatalogList() {
  const { search } = useLocation();
  return <Navigate to={`/catalog/products${search}`} replace />;
}

function RedirectLegacyCatalogDetail() {
  const { id } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/catalog/products/${id}${search}`} replace />;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/products"
          element={
            <ProtectedRoute>
              <ProductsCatalog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/products/:id"
          element={
            <ProtectedRoute>
              <ProductDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/laptops"
          element={
            <ProtectedRoute>
              <RedirectLegacyCatalogList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/laptops/:id"
          element={
            <ProtectedRoute>
              <RedirectLegacyCatalogDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/settings"
          element={
            <ProtectedRoute>
              <SettingsSecurity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/saved"
          element={
            <ProtectedRoute>
              <SavedItems />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </>
  );
}

export default App;
