# Auth0 Dashboard Setup

## 1. Regular Web Application

Create an application with type **Regular Web Application**.

Set:

- Allowed Callback URLs: `http://localhost:3000/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

- Allowed Callback URLs: `http://localhost:3001/callback`
- Allowed Logout URLs: `http://localhost:3001`
- Allowed Web Origins: `http://localhost:3001`

This second callback list is required to perform sso by using below code in terminal
$env:PORT=3001; $env:CLIENT_ID="<client 2 id>"; $env:CLIENT_SECRET="<client 2 secret>"; npm run app.js

Copy its Domain, Client ID and Client Secret to `.env`.

## 2. API

Create an API with identifier matching `AUDIENCE` in `.env`, for example `https://ai-api`. Select RS256.

Create permissions:

- `read:ai-data`
- `write:admin`

Enable RBAC. To populate the dashboard's permission list from the access token, enable the API setting that adds permissions to access tokens.

## 3. Machine-to-Machine application

Create a Machine-to-Machine application and authorize it for the API. Grant `read:ai-data`. Copy its client ID and secret to the M2M variables in `.env`.

## 4. User permissions

Assign `read:ai-data` and/or `write:admin` to the user or a role assigned to the user. Requesting a scope in the authorize URL does not grant it automatically.

## 5. Scope claim note

The API middleware `requiredScopes()` checks the access token's `scope` claim. Ensure the requested API permissions are actually granted and represented in that claim. The dashboard reads the optional `permissions` claim for display.

# 🚀 Running the Auth0 Regular Web Application

Follow these steps to run the project locally.

## 1. Prerequisites

Make sure you have installed:

- Node.js (v18 or later)
- npm
- Visual Studio Code
- Auth0 account

## 2. Clone the Repository

```bash
git clone https://github.com/Karanjeet-kumar/Cybersecurity-Capstone-Project
```

Navigate to the project directory:

```bash
cd 02-iam-design
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Environment Variables

Create your `.env` file using the provided example:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Update `.env` with your Auth0 credentials:

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com

CLIENT_ID=your_regular_web_app_client_id
CLIENT_SECRET=your_regular_web_app_client_secret

AUDIENCE=https://ai-api

M2M_CLIENT_ID=your_m2m_client_id
M2M_CLIENT_SECRET=your_m2m_client_secret

PORT=3000
API_PORT=4000

SESSION_SECRET=your_secure_random_secret
```

**Note:** Never commit your `.env` file to GitHub.

## 5. Configure Auth0

Configure the following settings in your Auth0 Dashboard.

### Regular Web Application

- Allowed Callback URLs: `http://localhost:3000/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

### Auth0 API

- API Identifier: `https://securenova-api`
- Signing Algorithm: `RS256`
- Permissions:
  - `read:ai-data`
  - `write:admin`
- Enable RBAC.
- Enable Add Permissions in the Access Token.

Authorize your M2M application and assign the required permissions to your test user.

## 6. Start the Protected API Server

Open the first terminal:

```bash
npm run api
```

The API server will run at:

```text
http://localhost:4000
```

## 7. Start the Regular Web Application

Open a second terminal:

```bash
npm run dev
```

The web application will run at:

```text
http://localhost:3000
```

## 8. Access the Application

Open your browser and visit:

[http://localhost:3000](http://localhost:3000)

Log in using Auth0 Universal Login.

## 9. Test API Endpoints

| Endpoint   | Required Permission |
| ---------- | ------------------- |
| GET /      | Public              |
| GET /chat  | `read:ai-data`      |
| GET /admin | `write:admin`       |

## 10. Test Machine-to-Machine Authentication

Ensure the protected API server is running.

Open another terminal and execute:

```bash
npm run rotate
```

This script:

1. Requests an M2M access token from Auth0.
2. Calls the protected Chat API.
3. Waits for the token to expire.
4. Replays the expired token.
5. Verifies that the API rejects the expired token.

**Note:** The test duration depends on the access-token lifetime configured in Auth0.

## 11. Available Features

- Auth0 Universal Login
- Authorization Code Flow with PKCE
- Regular Web Application authentication
- Silent Single Sign-On (SSO)
- JWT authentication and validation
- Scope-based API authorization
- Protected AI Chat API
- Protected Admin API
- Machine-to-Machine authentication
- Access Token expiration testing
- Secure logout and session management

## 12. Technology Stack

- Node.js
- Express.js
- EJS
- HTML, CSS and JavaScript
- Auth0
- OAuth 2.0
- OpenID Connect
- JWT
- PKCE

---

**Developed as an Auth0 Identity and Access Management project.**
