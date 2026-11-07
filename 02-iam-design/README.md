# Auth0 Regular Web Application

A server-rendered web application built with Node.js, Express, EJS and Auth0. It demonstrates Authorization Code Flow with PKCE, Universal Login, silent SSO, JWT validation, scope-protected API routes and M2M token testing.

## Requirements

- Node.js 18 or later
- npm
- An Auth0 tenant
- An Auth0 Regular Web Application
- An Auth0 API
- An Auth0 Machine-to-Machine application authorized for that API

## Setup

1. Clone or download this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your Auth0 values:

   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # macOS/Linux
   cp .env.example .env
   ```

4. Configure the Auth0 Regular Web Application:
   - Application type: Regular Web Application
   - Allowed Callback URL: `http://localhost:3000/callback`
   - Allowed Logout URL: `http://localhost:3000`
   - Allowed Web Origin: `http://localhost:3000`

5. Create an Auth0 API:
   - Identifier: `https://ai-api` (or exactly the value in `AUDIENCE`)
   - Signing algorithm: RS256
   - Permissions: `read:ai-data`, `write:admin`
   - Enable RBAC. Configure the API to include permissions in access tokens if you want the dashboard to display the `permissions` claim.

6. Create an Auth0 Machine-to-Machine application, authorize it for the API, and grant `read:ai-data`. Put its credentials in `M2M_CLIENT_ID` and `M2M_CLIENT_SECRET`.

7. Assign the required permissions to your test user. Requesting scopes during login does not itself grant permissions.

## Run locally

Open two terminals in the project directory.

Terminal 1 — protected API:

```bash
npm run api
```

Terminal 2 — Regular Web Application:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Routes

| Route | Purpose |
|---|---|
| `/` | Login landing page |
| `/login` | Starts Auth0 login |
| `/sso` | Attempts silent SSO with `prompt=none` |
| `/callback` | Handles the authorization response |
| `/dashboard` | Authenticated dashboard |
| `/profile` | User profile |
| `/chat` | Calls the API with `read:ai-data` |
| `/admin` | Calls the API with `write:admin` |
| `/logout` | Clears local session and logs out of Auth0 |

The protected resource server runs on port 4000:
- `GET /chat` requires `read:ai-data`
- `GET /admin` requires `write:admin`

## M2M token expiry test

With the API running, run:

```bash
npm run rotate
```

It obtains an M2M token, calls `/chat`, waits for the token's configured lifetime, and replays it to demonstrate expiration. This can take a long time if the token lifetime is long. For a quick demonstration, temporarily set a short access-token lifetime in the Auth0 API settings.

## Security notes

- Never commit `.env` or expose client secrets.
- Tokens are stored server-side in the Express session and are not rendered into the browser.
- The default Express MemoryStore is for local development only. Use a persistent session store in production.
- Use HTTPS in production and set `NODE_ENV=production` so the session cookie is marked Secure.
- Add CSRF protection for state-changing routes before production use.
- Configure a production callback/logout URL and update `REDIRECT_URI`/logout URLs accordingly.
- This demo does not implement refresh-token rotation.

## Troubleshooting

- `login_required` from `/sso`: no active Auth0 SSO session; use `/login`.
- `401` from API: check issuer, audience, signing algorithm and access token.
- `403` from API: verify that the required permission was granted and included in the access token's `scope`.
- Callback mismatch: check the Auth0 Allowed Callback URLs exactly.
- API connection error: ensure `npm run api` is running on port 4000.
