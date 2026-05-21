import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import AuthCallback from "./pages/AuthCallback/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import NotFound from "./pages/NotFound/NotFound";
import { isAdmin, isAuthenticated } from "./utils/authToken";

const Home = lazy(() => import("./pages/Home/Home"));
const ProductsCatalog = lazy(() => import("./pages/Catalog/ProductsCatalog"));
const ProductDetail = lazy(() => import("./pages/Catalog/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart/Cart"));
const Checkout = lazy(() => import("./pages/Cart/Checkout"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const OrderHistory = lazy(() => import("./pages/Profile/OrderHistory"));
const SavedItems = lazy(() => import("./pages/Profile/SavedItems"));
const AddressBook = lazy(() => import("./pages/Profile/AddressBook"));
const SettingsSecurity = lazy(() => import("./pages/Profile/SettingsSecurity"));
const SettingsPreferences = lazy(() => import("./pages/Profile/SettingsPreferences"));
const AdminDashboard = lazy(() => import("./pages/Admin/AdminDashboard"));
const AdminInventory = lazy(() => import("./pages/Admin/AdminInventory"));
const AdminOrders = lazy(() => import("./pages/Admin/AdminOrders"));
const AdminAnalytics = lazy(() => import("./pages/Admin/AdminAnalytics"));
const AdminActivity = lazy(() => import("./pages/Admin/AdminActivity"));

function RootRedirect() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin() ? "/admin" : "/home"} replace />;
}

function RouteBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

/** Shown while lazy route chunks load — keep markup/CSS tiny for first paint. */
function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-busy="true">
      <div className="route-fallback-inner" aria-hidden="true">
        <span className="route-fallback-dot" />
        <span className="route-fallback-dot" />
        <span className="route-fallback-dot" />
      </div>
      <span className="route-fallback-sr">Loading page</span>
    </div>
  );
}

function App() {
  return (
    <>
      <ScrollToTop />
      <KeyboardShortcuts />
      <RouteBoundary>
        <Suspense fallback={<RouteFallback />}>
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
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductsCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:segmentSlug"
              element={
                <ProtectedRoute>
                  <ProductsCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product/:segmentSlug/:id"
              element={
                <ProtectedRoute>
                  <ProductDetail />
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

            {/* ----- Admin console (separate lazy chunks) ----- */}
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
        </Suspense>
      </RouteBoundary>
    </>
  );
}

export default App;
