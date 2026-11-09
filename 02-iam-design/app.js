require("dotenv").config();

const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");
const { createRemoteJWKSet, jwtVerify } = require("jose");
const { isAuthenticated, hasScope } = require("./middleware/auth");

const requiredEnv = [
  "AUTH0_DOMAIN",
  "CLIENT_ID",
  "CLIENT_SECRET",
  "AUDIENCE",
  "SESSION_SECRET",
];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_PORT = Number(process.env.API_PORT || 4000);
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN.replace(
  /^https?:\/\//,
  "",
).replace(/\/$/, "");
const ISSUER = `https://${AUTH0_DOMAIN}/`;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const JWKS = createRemoteJWKSet(new URL(".well-known/jwks.json", ISSUER));

const base64url = (value) => value.toString("base64url");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "ai_portal_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    },
  }),
);

function createAuthorizationUrl(req, extraParams = {}) {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  const state = base64url(crypto.randomBytes(32));
  const nonce = base64url(crypto.randomBytes(32));

  req.session.oauth = { verifier, state, nonce };

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email offline_access read:ai-data write:admin",
    audience: process.env.AUDIENCE,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    nonce,
    ...extraParams,
  });

  return `${ISSUER}authorize?${params.toString()}`;
}

app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.render("login", { title: "AI Secure Portal" });
});

app.get("/login", (req, res) => {
  res.redirect(createAuthorizationUrl(req));
});

app.get("/sso", (req, res) => {
  res.redirect(createAuthorizationUrl(req, { prompt: "none" }));
});

app.get("/callback", async (req, res) => {
  try {
    const {
      code,
      state,
      error,
      error_description: errorDescription,
    } = req.query;

    if (error) {
      return res.status(400).render("error", {
        title: "Authentication failed",
        message: errorDescription || error,
        user: req.session.user || null,
      });
    }

    const oauth = req.session.oauth;
    if (!oauth || !state || state !== oauth.state || !code) {
      return res.status(400).render("error", {
        title: "Invalid authentication response",
        message:
          "The OAuth state or authorization code is invalid. Please try logging in again.",
        user: null,
      });
    }

    const { verifier, nonce } = oauth;
    delete req.session.oauth;

    const tokenResponse = await fetch(`${ISSUER}oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(
        tokens.error_description || tokens.error || "Token exchange failed",
      );
    }
    if (!tokens.id_token || !tokens.access_token) {
      throw new Error(
        "Auth0 did not return the expected ID and access tokens.",
      );
    }

    const { payload: idPayload } = await jwtVerify(tokens.id_token, JWKS, {
      issuer: ISSUER,
      audience: process.env.CLIENT_ID,
      algorithms: ["RS256"],
      clockTolerance: 5,
    });

    if (idPayload.nonce !== nonce) {
      throw new Error("ID token nonce validation failed.");
    }

    const { payload: accessPayload } = await jwtVerify(
      tokens.access_token,
      JWKS,
      {
        issuer: ISSUER,
        audience: process.env.AUDIENCE,
        algorithms: ["RS256"],
        clockTolerance: 5,
      },
    );

    // Regenerate the session to prevent session fixation.
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.user = {
      sub: idPayload.sub,
      name: idPayload.name || idPayload.nickname || idPayload.email || "User",
      email: idPayload.email || "",
      picture: idPayload.picture || "",
    };

    // Tokens stay server-side; they are never rendered into browser HTML.
    req.session.accessToken = tokens.access_token;
    req.session.idToken = tokens.id_token;
    req.session.refreshToken = tokens.refresh_token;
    console.log("ACCESS TOKEN:\n", tokens.access_token);
    console.log("ID TOKEN:\n", tokens.id_token);
    console.log("REFRESH TOKEN:\n", tokens.refresh_token);
    req.session.permissions = accessPayload.permissions || [];
    req.session.expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Auth callback error:", err.message);
    res.status(401).render("error", {
      title: "Login failed",
      message: err.message,
      user: null,
    });
  }
});

app.get("/dashboard", isAuthenticated, (req, res) => {
  res.render("dashboard", {
    title: "Dashboard",
    user: req.session.user,
    permissions: req.session.permissions || [],
    expiresAt: req.session.expiresAt,
  });
});

app.get("/profile", isAuthenticated, (req, res) => {
  res.render("profile", {
    title: "My Profile",
    user: req.session.user,
    permissions: req.session.permissions || [],
  });
});

app.get(
  "/chat",
  isAuthenticated,
  hasScope("read:ai-data"),
  async (req, res) => {
    try {
      const response = await fetch(`http://localhost:${API_PORT}/chat`, {
        headers: { Authorization: `Bearer ${req.session.accessToken}` },
      });
      const result = await response.json();

      if (!response.ok) {
        return res.status(response.status).render("error", {
          title: "Chat API request failed",
          message: result.message || `API returned HTTP ${response.status}`,
          user: req.session.user,
        });
      }

      res.render("chat", {
        title: "AI Chat API",
        user: req.session.user,
        result,
        status: response.status,
      });
    } catch (err) {
      res.status(502).render("error", {
        title: "API unavailable",
        message: `Could not connect to the protected API: ${err.message}`,
        user: req.session.user,
      });
    }
  },
);

app.get(
  "/admin",
  isAuthenticated,
  hasScope("write:admin"),
  async (req, res) => {
    try {
      const response = await fetch(`http://localhost:${API_PORT}/admin`, {
        headers: { Authorization: `Bearer ${req.session.accessToken}` },
      });
      const result = await response.json();

      if (!response.ok) {
        return res.status(response.status).render("error", {
          title: "Admin API request failed",
          message: result.message || `API returned HTTP ${response.status}`,
          user: req.session.user,
        });
      }

      res.render("admin", {
        title: "Admin Panel",
        user: req.session.user,
        result,
        status: response.status,
      });
    } catch (err) {
      res.status(502).render("error", {
        title: "API unavailable",
        message: `Could not connect to the protected API: ${err.message}`,
        user: req.session.user,
      });
    }
  },
);

app.get("/logout", (req, res, next) => {
  const returnTo = `http://localhost:${PORT}`;
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("ai_portal_session");
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      returnTo,
    });
    res.redirect(`${ISSUER}v2/logout?${params.toString()}`);
  });
});

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page not found",
    message: "The page you requested does not exist.",
    user: req.session?.user || null,
  });
});

app.listen(PORT, () => {
  console.log(`Regular Web App running at http://localhost:${PORT}`);
});
