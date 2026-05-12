/**
 * Authorise admin-only endpoints.
 *
 * Mount AFTER `authMiddleware` so `req.user` is populated. Rejects
 * anonymous requests with 401 and authenticated non-admin users with
 * 403 — that distinction matters: 401 tells the client to log in,
 * 403 tells the client they're already logged in but can't access
 * this resource.
 */
function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

module.exports = adminMiddleware;
