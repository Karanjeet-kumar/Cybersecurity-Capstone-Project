require("dotenv").config();

const express = require("express");
const { auth, requiredScopes } = require("express-oauth2-jwt-bearer");

if (!process.env.AUTH0_DOMAIN || !process.env.AUDIENCE) {
  throw new Error("AUTH0_DOMAIN and AUDIENCE must be configured in .env");
}

const app = express();
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");

const checkJwt = auth({
  audience: process.env.AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: "RS256"
});

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true, message: "AI Secure API is running" });
});

app.get("/chat", checkJwt, requiredScopes("read:ai-data"), (req, res) => {
  res.json({
    success: true,
    message: "Hello from the AI chat endpoint",
    user: req.auth.payload.sub
  });
});

app.get("/admin", checkJwt, requiredScopes("write:admin"), (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the Admin area",
    user: req.auth.payload.sub
  });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`API error (${status}):`, err.message);
  res.status(status).json({
    success: false,
    message: status === 401
      ? "Missing or invalid access token"
      : status === 403
        ? "Insufficient scope or permissions"
        : "Internal server error"
  });
});

const PORT = Number(process.env.API_PORT || 4000);
app.listen(PORT, () => console.log(`Protected API running at http://localhost:${PORT}`));
