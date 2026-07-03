import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useSelector((s) => s.auth);
  const hasToken = !!sessionStorage.getItem("access_token");

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user && !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
