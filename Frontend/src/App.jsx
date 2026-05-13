import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import "./App.css";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import AuthCallback from "./pages/AuthCallback/AuthCallback";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminInventory from "./pages/Admin/AdminInventory";
import AdminOrders from "./pages/Admin/AdminOrders";
import AdminAnalytics from "./pages/Admin/AdminAnalytics";
import AdminActivity from "./pages/Admin/AdminActivity";
import ProductsCatalog from "./pages/Catalog/ProductsCatalog";
import ProductDetail from "./pages/Catalog/ProductDetail";
import Cart from "./pages/Cart/Cart";
import Checkout from "./pages/Cart/Checkout";
import Profile from "./pages/Profile/Profile";
import OrderHistory from "./pages/Profile/OrderHistory";
import SavedItems from "./pages/Profile/SavedItems";
import AddressBook from "./pages/Profile/AddressBook";
import SettingsSecurity from "./pages/Profile/SettingsSecurity";
import SettingsPreferences from "./pages/Profile/SettingsPreferences";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import NotFound from "./pages/NotFound/NotFound";
import { isAdmin, isAuthenticated } from "./utils/authToken";

function RootRedirect() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin() ? "/admin" : "/home"} replace />;
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

function RouteBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <ScrollToTop />
      <KeyboardShortcuts />
      <RouteBoundary>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
          path="/profile/settings/preferences"
          element={
            <ProtectedRoute>
              <SettingsPreferences />
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
        <Route
          path="/profile/addresses"
          element={
            <ProtectedRoute>
              <AddressBook />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />

        {/* ----- Admin console ----- */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <AdminRoute>
              <AdminInventory />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminRoute>
              <AdminAnalytics />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/activity"
          element={
            <AdminRoute>
              <AdminActivity />
            </AdminRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </RouteBoundary>
    </>
  );
}

export default App;
