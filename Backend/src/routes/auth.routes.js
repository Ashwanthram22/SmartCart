const express = require("express");
const jwt = require("jsonwebtoken");
const { readDb, writeDb } = require("../lib/data-store");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "aicart-dev-secret-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:5000/api/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const db = await readDb();
  const user = db.users.find(
    (item) => item.email === email && item.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  const jwt_token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return res.json({
    message: "Login successful",
    jwt_token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required",
    });
  }

  const db = await readDb();
  const existingUser = db.users.find((item) => item.email === email);

  if (existingUser) {
    return res.status(409).json({
      message: "An account with this email already exists",
    });
  }

  const newUser = {
    id: `u${Date.now()}`,
    name,
    email,
    password,
    role: "customer",
  };

  db.users.push(newUser);
  await writeDb(db);

  const jwt_token = jwt.sign(
    {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return res.status(201).json({
    message: "Account created successfully",
    jwt_token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
  });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  return res.json({
    message:
      "If an account exists for this email, you will receive reset instructions shortly.",
  });
});

router.post("/google", async (req, res) => {
  const { access_token } = req.body || {};

  if (!access_token) {
    return res.status(400).json({
      message: "Google access token is required",
    });
  }

  try {
    const googleResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!googleResponse.ok) {
      return res.status(401).json({
        message: "Google authentication failed",
      });
    }

    const googleUser = await googleResponse.json();
    const email = googleUser.email;
    const name = googleUser.name || googleUser.given_name || "Google User";

    if (!email) {
      return res.status(401).json({
        message: "Google account email not available",
      });
    }

    const db = await readDb();
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
      await writeDb(db);
    }

    const jwt_token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Google login successful",
      jwt_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return res.status(500).json({
      message: "Google login failed",
    });
  }
});

router.get("/google/start", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      message: "Google OAuth is not configured on backend",
    });
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
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

    const db = await readDb();
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
      await writeDb(db);
    }

    const jwt_token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(jwt_token)}`
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
    return res.status(404).json({
      message: "User not found",
    });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

module.exports = router;
