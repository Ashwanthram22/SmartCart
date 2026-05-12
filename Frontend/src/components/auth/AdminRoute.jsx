import { Navigate, useLocation } from "react-router-dom";
import { isAdmin, isAuthenticated } from "../../utils/authToken";

/**
 * Gate around `/admin/*` routes. Sends anonymous visitors to login
 * (preserving the intended destination) and signed-in non-admins to
 * the regular home so they don't see a confusing 403.
 */
export default function AdminRoute({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isAdmin()) {
    return <Navigate to="/home" replace />;
  }
  return children;
}
