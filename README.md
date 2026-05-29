# Pizza 42 — Auth0 CIAM PoC

Single-page React app + Vercel serverless API demonstrating Auth0 Universal Login,
social login, email verification gating, scoped API access, order persistence to
`user_metadata`, and a custom ID-token claim with order history.

## Architecture

- **Frontend** — Vite + React, `@auth0/auth0-react` for Universal Login.
- **Backend** — Vercel serverless function (`/api/orders.js`):
  - Verifies the Auth0 access token via JWKS (`jose`).
  - Enforces the `create:orders` scope.
  - Checks `email_verified` via the Management API.
  - Persists orders to `user_metadata.orders`.
- **Auth0 Action (Post-Login)** — copies `user_metadata.orders` into the ID token
  as the custom claim `https://pizza42.com/orders`.

## Local dev

```bash
cp .env.example .env.local
# fill in M2M client id / secret
npm install
npm run dev          # frontend only
npx vercel dev       # frontend + /api serverless together (recommended)
```

## Auth0 dashboard setup

### 1. Application (SPA)
- Type: Single Page Application
- Allowed Callback URLs: `http://localhost:5173, http://localhost:3000, https://<your-vercel-app>.vercel.app`
- Allowed Logout URLs / Web Origins: same as above
- Refresh Token Rotation: on

### 2. API
- Identifier (audience): `https://pizza42-api`
- Scopes: `create:orders`

### 3. Machine-to-Machine application (for the backend)
- Authorize for **Auth0 Management API**
- Scopes: `read:users`, `update:users`, `update:users_app_metadata`
- Put the credentials into `AUTH0_M2M_CLIENT_ID` / `AUTH0_M2M_CLIENT_SECRET`

### 4. Social connection
- Authentication → Social → Google → enable for the SPA application

### 5. Passkeys
- Authentication → Database → your DB connection → enable Passkeys

### 6. Post-Login Action — add orders to ID token
Library → Actions → Create Action → Post-Login:

```js
exports.onExecutePostLogin = async (event, api) => {
  const orders = event.user.app_metadata?.orders ?? [];
  const marketing = event.user.user_metadata?.marketingProfile ?? null;
  api.idToken.setCustomClaim("https://pizza42.com/orders", orders);
  api.idToken.setCustomClaim("https://pizza42.com/marketing_profile", marketing);
};
```

> Orders live in `app_metadata` (not `user_metadata`) because order history is
> system-owned data — customers shouldn't be able to tamper with it. `app_metadata`
> has no user-self-service scope equivalent to `update:current_user_metadata`,
> so it's structurally tamper-proof regardless of how the SPA is configured.

Deploy and add it to the **Login** flow.

### 7. Email verification
- Branding → Email Templates → Verification Email — enabled by default.
- The `/api/orders` endpoint blocks orders until `email_verified === true`;
  login itself is not blocked.

## Requirements → implementation

| Requirement | Where |
|---|---|
| Sign up / sign in | `loginWithRedirect` w/ `screen_hint=signup` |
| Social login (Google) | Auth0 social connection |
| Passkeys | Database connection setting |
| Password reset | Built into Universal Login |
| Verified email required to order | Backend checks `email_verified` |
| API requires token + scope | `jose` verifies JWT + checks `create:orders` |
| Save order to Auth0 profile | PATCH `user_metadata.orders` via Mgmt API |
| Order history in ID token | Post-Login Action sets `https://pizza42.com/orders` |

## Talking points

- **Why Universal Login?** Offloads credential storage, gets MFA / password
  reset / passkeys / breached-password detection for free, decouples identity
  providers from app code.
- **Why `user_metadata`?** Auth0-native, flows naturally into tokens. In a real
  Pizza 42 system we'd persist orders to our own DB (source of truth) and mirror
  a summary into `user_metadata` to keep tokens small.
- **Why check `email_verified` server-side?** Client checks are UX hints. The
  backend is the authority — a hostile client could call `/api/orders` directly.
- **Custom claim namespace.** Auth0 requires non-Auth0 claims to be namespaced
  by URL — hence `https://pizza42.com/orders`.
- **Token freshness.** New orders only appear in the ID token after the next
  login. For immediate UI we return the order from the API and merge client-side.
- **Passkeys for Pizza 42.** Pizzas are impulse purchases — every friction
  point costs revenue. Passkeys eliminate passwords on supported devices.
