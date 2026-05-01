import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthCallback from "./pages/AuthCallback/AuthCallback";
import LaptopsCatalog from "./pages/Catalog/LaptopsCatalog";
import ProductDetail from "./pages/Catalog/ProductDetail";
import Cart from "./pages/Cart/Cart";
import Profile from "./pages/Profile/Profile";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import { isAuthenticated } from "./utils/authToken";

function RootRedirect() {
  return <Navigate to={isAuthenticated() ? "/home" : "/login"} replace />;
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
          path="/catalog/laptops"
          element={
            <ProtectedRoute>
              <LaptopsCatalog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/laptops/:id"
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
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
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
