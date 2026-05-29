import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID;
const M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET;

const JWKS = createRemoteJWKSet(
  new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`),
);

async function verifyToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing bearer token");
  }
  const token = authHeader.slice("Bearer ".length);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${AUTH0_DOMAIN}/`,
    audience: AUTH0_AUDIENCE,
  });
  const scopes = (payload.scope || "").split(" ");
  console.log("[orders] token scopes:", payload.scope, "| permissions:", payload.permissions);
  const permissions = payload.permissions || [];
  if (!scopes.includes("create:orders") && !permissions.includes("create:orders")) {
    throw new Error(`Missing required scope: create:orders. Got scope="${payload.scope}" permissions=${JSON.stringify(permissions)}`);
  }
  return payload;
}

let cachedMgmtToken = null;
async function getManagementToken() {
  if (cachedMgmtToken && cachedMgmtToken.expiresAt > Date.now() + 60_000) {
    return cachedMgmtToken.token;
  }
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: M2M_CLIENT_ID,
      client_secret: M2M_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Mgmt token fetch failed: ${res.status}`);
  const data = await res.json();
  cachedMgmtToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function getUser(userId, mgmtToken) {
  const res = await fetch(
    `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${mgmtToken}` } },
  );
  if (!res.ok) throw new Error(`Get user failed: ${res.status}`);
  return res.json();
}

// Orders are written to app_metadata (system-owned, not user-editable)
// rather than user_metadata, so that even if the SPA later requests
// `update:current_user_metadata`, customers can't tamper with their
// own order history.
async function patchUserAppMetadata(userId, app_metadata, mgmtToken) {
  const res = await fetch(
    `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ app_metadata }),
    },
  );
  if (!res.ok) throw new Error(`Patch user failed: ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  console.log("[orders] hit", req.method, {
    hasAuth: !!req.headers.authorization,
    domain: AUTH0_DOMAIN,
    audience: AUTH0_AUDIENCE,
    hasM2M: !!M2M_CLIENT_ID,
  });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  let claims;
  try {
    claims = await verifyToken(req.headers.authorization);
  } catch (e) {
    console.error("[orders] verifyToken failed:", e);
    return res.status(401).send(e.message);
  }

  // Require email_verified before allowing an order.
  // The access token doesn't include email_verified by default,
  // so we look it up via the Management API.
  try {
    const mgmtToken = await getManagementToken();
    const userRecord = await getUser(claims.sub, mgmtToken);

    if (!userRecord.email_verified) {
      return res.status(403).send("Email not verified");
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { item, price } = body || {};
    if (!item || typeof price !== "number") {
      return res.status(400).send("Invalid order payload");
    }

    const order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      item,
      price,
      placedAt: new Date().toISOString(),
    };

    const existing = userRecord.app_metadata?.orders ?? [];
    const orders = [...existing, order];

    await patchUserAppMetadata(
      claims.sub,
      { ...userRecord.app_metadata, orders },
      mgmtToken,
    );

    return res.status(200).json({ order, orders });
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.message);
  }
}
