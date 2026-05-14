const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { readDb, withDb } = require("../lib/store");
const { hashPassword, verifyPassword } = require("../lib/passwords");
const authMiddleware = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimits");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_URL,
  IS_PROD,
} = require("../config/env");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.role === "admin" || Boolean(user.isAdmin),
  };
}

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.email === email);

  if (!user || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    message: "Login successful",
    jwt_token: signToken(user),
    user: publicUser(user),
  });
});

router.post("/register", authLimiter, async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email and password are required" });
  }

  if (String(password).length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const newUser = await withDb(async (db) => {
    if (db.users.find((item) => item.email === email)) {
      return { conflict: true };
    }
    const created = {
      id: `u${Date.now()}`,
      name,
      email,
      password: await hashPassword(password),
      role: "customer",
    };
    db.users.push(created);
    return created;
  });

  if (newUser.conflict) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists" });
  }

  return res.status(201).json({
    message: "Account created successfully",
    jwt_token: signToken(newUser),
    user: publicUser(newUser),
  });
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_RESET_REPLY =
  "If an account exists for this email, a reset link is on its way.";

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issue a password reset token. Always returns the same generic message so
 * the endpoint can't be used to enumerate registered emails. In dev we
 * additionally include the reset URL in the response so you can complete
 * the flow without an email provider configured.
 *
 * The token itself is random, single-use, hashed at rest, and expires in
 * an hour. OAuth-only accounts (no password) silently get the generic
 * reply too — they should keep using their IDP.
 */
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }
  const cleanEmail = email.trim().toLowerCase();

  const result = await withDb(async (db) => {
    if (!Array.isArray(db.passwordResets)) db.passwordResets = [];

    // Drop expired entries opportunistically so the array doesn't grow forever.
    const now = Date.now();
    db.passwordResets = db.passwordResets.filter(
      (r) => Number(r.expiresAt) > now && !r.usedAt
    );

    const user = (db.users || []).find(
      (u) => String(u.email).toLowerCase() === cleanEmail
    );
    if (!user || !user.password) {
      // Email doesn't exist OR account has no password (OAuth only).
      // Return the same message either way.
      return { masked: true };
    }

    // Invalidate any prior pending tokens for this user (one active at a time).
    db.passwordResets = db.passwordResets.filter((r) => r.userId !== user.id);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const record = {
      id: `pr${Date.now()}`,
      userId: user.id,
      tokenHash: hashToken(rawToken),
      createdAt: new Date().toISOString(),
      expiresAt: now + RESET_TOKEN_TTL_MS,
      usedAt: null,
    };
    db.passwordResets.push(record);

    return { rawToken };
  });

  const payload = { message: GENERIC_RESET_REPLY };
  if (!IS_PROD && result.rawToken) {
    // Dev convenience: hand back the link so the page can show it.
    const url = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(result.rawToken)}`;
    payload.devResetUrl = url;
  }
  return res.json(payload);
});

/**
 * Consume a reset token and set a new password. Single-use: marks the
 * token used on success so the same link can't be replayed.
 */
router.post("/reset-password", authLimiter, async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (typeof token !== "string" || token.length < 32) {
    return res.status(400).json({ message: "Reset token is invalid" });
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const tokenHash = hashToken(token);

  const outcome = await withDb(async (db) => {
    if (!Array.isArray(db.passwordResets)) db.passwordResets = [];
    const now = Date.now();

    const record = db.passwordResets.find((r) => r.tokenHash === tokenHash);
    if (!record) return { error: "Reset link is invalid or already used" };
    if (record.usedAt) return { error: "Reset link has already been used" };
    if (Number(record.expiresAt) < now) {
      return { error: "Reset link has expired — request a new one" };
    }

    const user = (db.users || []).find((u) => u.id === record.userId);
    if (!user) return { error: "Account no longer exists" };

    user.password = await hashPassword(newPassword);
    record.usedAt = new Date().toISOString();

    return { user };
  });

  if (outcome.error) {
    return res.status(400).json({ message: outcome.error });
  }
  return res.json({ message: "Password reset — you can sign in now." });
});

/**
 * Light validation endpoint so the reset page can show "this link expired"
 * before the user types out a new password. Always returns 200 with a
 * boolean rather than 4xx so it can't be used for enumeration timing.
 */
router.get("/reset-password/validate", async (req, res) => {
  const token = String(req.query.token || "");
  if (token.length < 32) return res.json({ valid: false });

  const db = await readDb();
  const tokenHash = hashToken(token);
  const record = (db.passwordResets || []).find((r) => r.tokenHash === tokenHash);
  if (!record) return res.json({ valid: false });
  if (record.usedAt) return res.json({ valid: false, reason: "used" });
  if (Number(record.expiresAt) < Date.now()) {
    return res.json({ valid: false, reason: "expired" });
  }
  return res.json({ valid: true });
});

async function findOrCreateGoogleUser({ email, name }) {
  return withDb(async (db) => {
    let user = db.users.find((item) => item.email === email);
    if (!user) {
      user = {
        id: `u${Date.now()}`,
        name,
        email,
        password: null,
        role: "customer",
        provider: "google",
      };
      db.users.push(user);
    }
    return user;
  });
}

router.post("/google", authLimiter, async (req, res) => {
  const { access_token } = req.body || {};

  if (!access_token) {
    return res.status(400).json({ message: "Google access token is required" });
  }

  try {
    const googleResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!googleResponse.ok) {
      return res.status(401).json({ message: "Google authentication failed" });
    }

    const googleUser = await googleResponse.json();
    const email = googleUser.email;
    const name = googleUser.name || googleUser.given_name || "Google User";

    if (!email) {
      return res
        .status(401)
        .json({ message: "Google account email not available" });
    }

    const user = await findOrCreateGoogleUser({ email, name });

    return res.json({
      message: "Google login successful",
      jwt_token: signToken(user),
      user: publicUser(user),
    });
  } catch {
    return res.status(500).json({ message: "Google login failed" });
  }
});

router.get("/google/start", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ message: "Google OAuth is not configured on backend" });
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "select_account");

  return res.redirect(authUrl.toString());
});

router.get("/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent("google_access_denied")}`
    );
  }

  if (!code) {
    return res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent("missing_google_code")}`
    );
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent("google_not_configured")}`
    );
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return res.redirect(
        `${FRONTEND_URL}/login?error=${encodeURIComponent("google_token_failed")}`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!profileResponse.ok) {
      return res.redirect(
        `${FRONTEND_URL}/login?error=${encodeURIComponent("google_profile_failed")}`
      );
    }

    const googleUser = await profileResponse.json();
    const email = googleUser.email;
    const name = googleUser.name || googleUser.given_name || "Google User";

    if (!email) {
      return res.redirect(
        `${FRONTEND_URL}/login?error=${encodeURIComponent("google_email_missing")}`
      );
    }

    const user = await findOrCreateGoogleUser({ email, name });

    return res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(signToken(user))}`
    );
  } catch {
    return res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent("google_auth_failed")}`
    );
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  const db = await readDb();
  const user = db.users.find((item) => item.id === req.user.sub);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user: publicUser(user) });
});

/**
 * Update the signed-in user's profile fields. Only `name` is editable today
 * (email changes need a verification flow we haven't built yet). Auth-only
 * to avoid an attacker rebranding the demo account; rate limit is the
 * standard `apiLimiter` mounted at the app level.
 */
router.patch("/me", authMiddleware, async (req, res) => {
  const { name } = req.body || {};

  if (typeof name !== "string" || name.trim().length < 2) {
    return res
      .status(400)
      .json({ message: "Name must be at least 2 characters" });
  }
  if (name.trim().length > 80) {
    return res.status(400).json({ message: "Name is too long" });
  }

  const result = await withDb(async (db) => {
    const user = db.users.find((u) => u.id === req.user.sub);
    if (!user) return { notFound: true };
    user.name = name.trim();
    return { user };
  });

  if (result.notFound) return res.status(404).json({ message: "User not found" });
  return res.json({
    message: "Profile updated",
    user: publicUser(result.user),
  });
});

/**
 * Change the signed-in user's password. Requires the current password to
 * defend against session-hijack credential rotation. OAuth users (no
 * password set) are rejected with a clear message instead of silently
 * letting them set one — they should keep using the IDP.
 */
router.post("/change-password", authMiddleware, authLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Current and new password are required" });
  }
  if (String(newPassword).length < 6) {
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters" });
  }
  if (currentPassword === newPassword) {
    return res
      .status(400)
      .json({ message: "New password must be different from current" });
  }

  const db = await readDb();
  const user = db.users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.password) {
    return res.status(400).json({
      message:
        "This account uses a social login (Google) — set a password via the social provider.",
    });
  }
  if (!(await verifyPassword(currentPassword, user.password))) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  await withDb(async (snap) => {
    const target = snap.users.find((u) => u.id === req.user.sub);
    if (target) target.password = await hashPassword(newPassword);
  });

  return res.json({ message: "Password updated" });
});

module.exports = router;
