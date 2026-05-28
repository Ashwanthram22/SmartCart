const express = require("express");
const { withDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");
const { withUserProfile } = require("../lib/user-profile");
const {
  publicNotification,
  publicNotificationWithProduct,
} = require("../lib/user-notifications");
const { clearAlertsForNotification } = require("../lib/notification-dismiss");

const router = express.Router();

router.use(authMiddleware);

// Inbox is per-user and changes often — avoid browser revalidation (304) loops
// that make DevTools look like repeated failed loads.
router.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  next();
});

router.get("/", async (req, res) => {
  const list = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    if (!user) return [];
    return (user.inbox || []).map((row) => publicNotificationWithProduct(db, row));
  });
  const unread = list.filter((n) => !n.read).length;
  return res.json({ notifications: list, unread });
});

router.patch("/:id/read", async (req, res) => {
  const id = String(req.params.id || "");
  const result = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    if (!user) return { notFound: true };
    const row = (user.inbox || []).find((n) => n.id === id);
    if (!row) return { notFound: true };
    row.read = true;
    const alertsCleared = clearAlertsForNotification(user, row);
    return { notification: publicNotification(row), alertsCleared };
  });
  if (result.notFound) return res.status(404).json({ message: "Notification not found" });
  return res.json({
    notification: result.notification,
    alertsCleared: result.alertsCleared,
  });
});

router.post("/read-all", async (req, res) => {
  const count = await withDb(async (db) => {
    const user = withUserProfile(db, req.user.sub);
    if (!user) return { marked: 0, clearedProductIds: [] };
    let n = 0;
    const clearedProductIds = [];
    for (const row of user.inbox || []) {
      if (!row.read) {
        row.read = true;
        n += 1;
        const cleared = clearAlertsForNotification(user, row);
        if (cleared.productId && (cleared.stock || cleared.price)) {
          clearedProductIds.push(cleared.productId);
        }
      }
    }
    return { marked: n, clearedProductIds: [...new Set(clearedProductIds)] };
  });
  return res.json({
    marked: count.marked,
    clearedProductIds: count.clearedProductIds,
  });
});

module.exports = router;
