const express = require("express");
const jwt = require("jsonwebtoken");
const { readDb, withDb } = require("../lib/data-store");
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
  return { id: user.id, name: user.name, email: user.email, role: user.role };
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

router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  return res.json({
    message:
      "If an account exists for this email, you will receive reset instructions shortly.",
  });
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
