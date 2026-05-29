import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID;
const M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET;

const JWKS = createRemoteJWKSet(
  new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`),
);

async function verifyToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing bearer token");
  const token = authHeader.slice("Bearer ".length);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${AUTH0_DOMAIN}/`,
    audience: AUTH0_AUDIENCE,
  });
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

// Marketing profile is user-owned (favorite pizza, dietary prefs, opt-ins)
// so it lives in user_metadata. Contrast with orders which are system-owned
// and live in app_metadata.
async function patchUserMetadata(userId, user_metadata, mgmtToken) {
  const res = await fetch(
    `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_metadata }),
    },
  );
  if (!res.ok) throw new Error(`Patch user failed: ${res.status}`);
  return res.json();
}

const ALLOWED_FIELDS = new Set([
  "favoriteItem",
  "dietary",
  "marketingEmailOptIn",
  "marketingSmsOptIn",
]);

function sanitize(input) {
  const out = {};
  for (const key of Object.keys(input || {})) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    out[key] = input[key];
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  let claims;
  try {
    claims = await verifyToken(req.headers.authorization);
  } catch (e) {
    return res.status(401).send(e.message);
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const incoming = sanitize(body || {});

    const mgmtToken = await getManagementToken();
    const userRecord = await getUser(claims.sub, mgmtToken);

    const existing = userRecord.user_metadata?.marketingProfile ?? {};
    const marketingProfile = {
      ...existing,
      ...incoming,
      updatedAt: new Date().toISOString(),
    };

    await patchUserMetadata(
      claims.sub,
      { ...userRecord.user_metadata, marketingProfile },
      mgmtToken,
    );

    return res.status(200).json({ marketingProfile });
  } catch (e) {
    console.error("[profile]", e);
    return res.status(500).send(e.message);
  }
}
