require("dotenv").config();

const {
  AUTH0_DOMAIN,
  AUDIENCE,
  M2M_CLIENT_ID,
  M2M_CLIENT_SECRET,
  API_PORT = 4000
} = process.env;

for (const key of ["AUTH0_DOMAIN", "AUDIENCE", "M2M_CLIENT_ID", "M2M_CLIENT_SECRET"]) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

const domain = AUTH0_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
const timestamp = () => new Date().toISOString();

async function getToken() {
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: M2M_CLIENT_ID,
      client_secret: M2M_CLIENT_SECRET,
      audience: AUDIENCE,
      scope: "read:ai-data"
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function callChat(token) {
  const response = await fetch(`http://localhost:${API_PORT}/chat`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { status: response.status, body: await response.json() };
}

(async () => {
  try {
    console.log(`[${timestamp()}] Requesting M2M access token...`);
    const token = await getToken();
    console.log(`[${timestamp()}] Token received; expires_in=${token.expires_in}s`);

    const fresh = await callChat(token.access_token);
    console.log(`[${timestamp()}] Fresh token -> HTTP ${fresh.status}`);
    console.log(fresh.body);

    const waitMs = (token.expires_in + 5) * 1000;
    console.log(`[${timestamp()}] Waiting approximately ${Math.ceil(waitMs / 1000)} seconds for expiry...`);
    console.log("For a quick demo, temporarily configure a short access-token lifetime in your Auth0 API settings.");

    await new Promise(resolve => setTimeout(resolve, waitMs));

    const expired = await callChat(token.access_token);
    console.log(`[${timestamp()}] Replayed token -> HTTP ${expired.status}`);
    console.log(expired.body);
  } catch (err) {
    console.error(`[${timestamp()}] Token test failed:`, err.message);
    process.exitCode = 1;
  }
})();
