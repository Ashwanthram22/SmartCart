const express = require("express");
const { readDb } = require("../lib/store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

/**
 * Look up + validate a coupon, returning the resolved discount in INR
 * for the given subtotal. Logic intentionally lives here so the cart UI
 * can preview the savings and the orders route can re-run the same
 * function at order time (server-authoritative discount).
 *
 * Returns:
 *   { coupon, discount }   on success (subtotal already passes minOrder)
 *   { error: string }      on any validation failure
 */
async function resolveCoupon(rawCode, subtotal) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { error: "Enter a coupon code" };

  const db = await readDb();
  const list = Array.isArray(db.coupons) ? db.coupons : [];
  const coupon = list.find((c) => String(c.code).toUpperCase() === code);

  if (!coupon) return { error: "That code isn't valid" };
  if (coupon.active === false) return { error: "That code is no longer active" };

  const expiresAt = coupon.expiresAt ? Date.parse(coupon.expiresAt) : null;
  if (expiresAt && Number.isFinite(expiresAt) && expiresAt < Date.now()) {
    return { error: "That code has expired" };
  }

  const minOrder = Number(coupon.minOrder) || 0;
  if (subtotal < minOrder) {
    return {
      error: `Add \u20b9${(minOrder - subtotal).toFixed(2)} more to use ${code} (min order \u20b9${minOrder})`,
    };
  }

  let discount = 0;
  if (coupon.type === "percent") {
    const pct = Math.max(0, Math.min(100, Number(coupon.value) || 0));
    discount = (subtotal * pct) / 100;
  } else if (coupon.type === "flat") {
    discount = Math.max(0, Number(coupon.value) || 0);
  }
  discount = Math.min(discount, subtotal);
  discount = Number(discount.toFixed(2));

  return {
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      label: coupon.label || code,
      description: coupon.description || "",
      minOrder,
    },
    discount,
  };
}

router.post("/validate", async (req, res) => {
  const subtotalRaw = Number(req.body?.subtotal);
  if (!Number.isFinite(subtotalRaw) || subtotalRaw < 0) {
    return res.status(400).json({ message: "Subtotal is required" });
  }
  const result = await resolveCoupon(req.body?.code, subtotalRaw);
  if (result.error) return res.status(400).json({ message: result.error });
  return res.json(result);
});

router.resolveCoupon = resolveCoupon;
module.exports = router;
