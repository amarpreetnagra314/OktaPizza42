import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Landing from "./Landing.jsx";

const ORDERS_CLAIM = "https://pizza42.com/orders";
const MARKETING_CLAIM = "https://pizza42.com/marketing_profile";

const MENU = [
  { id: "margherita", name: "Margherita", price: 12 },
  { id: "pepperoni", name: "Pepperoni Deluxe", price: 18 },
  { id: "veggie", name: "Veggie Supreme", price: 16 },
  { id: "bbq", name: "BBQ Chicken", price: 20 },
  { id: "hawaiian", name: "Hawaiian", price: 14 },
];

function App() {
  const {
    isLoading,
    isAuthenticated,
    error,
    logout,
    user,
    getAccessTokenSilently,
  } = useAuth0();

  // When the user returns to this tab (e.g. after clicking the verification
  // link in another tab), force a silent token refresh so `user.email_verified`
  // reflects the latest state without requiring a logout/login.
  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = async () => {
      try {
        await getAccessTokenSilently({ cacheMode: "off" });
        console.log("[auth] silent renew OK, user.email_verified =", user?.email_verified);
      } catch (e) {
        console.warn("[auth] silent renew failed:", e?.error || e?.message || e);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, getAccessTokenSilently, user?.email_verified]);

  const [selected, setSelected] = useState(MENU[0].id);
  const [placing, setPlacing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [profileDraft, setProfileDraft] = useState({
    favoriteItem: "",
    dietary: "",
    marketingEmailOptIn: false,
    marketingSmsOptIn: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const marketingProfileClaim = user?.[MARKETING_CLAIM] ?? null;
  useEffect(() => {
    if (marketingProfileClaim) {
      setProfileDraft((d) => ({
        favoriteItem: marketingProfileClaim.favoriteItem ?? d.favoriteItem,
        dietary: marketingProfileClaim.dietary ?? d.dietary,
        marketingEmailOptIn: !!marketingProfileClaim.marketingEmailOptIn,
        marketingSmsOptIn: !!marketingProfileClaim.marketingSmsOptIn,
      }));
    }
  }, [marketingProfileClaim]);

  // Decode the current access token for the debug panel.
  const [accessTokenPayload, setAccessTokenPayload] = useState(null);
  const [accessTokenRaw, setAccessTokenRaw] = useState(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        if (cancelled) return;
        setAccessTokenRaw(token);
        const [, payload] = token.split(".");
        const json = JSON.parse(
          atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
        );
        setAccessTokenPayload(json);
      } catch (e) {
        if (!cancelled) console.warn("[debug] decode access token failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, getAccessTokenSilently, user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileDraft),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      setProfileMsg("Saved! It'll appear in your ID token on next login.");
    } catch (e) {
      setProfileMsg(`Failed: ${e.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const doLogout = () =>
    logout({ logoutParams: { returnTo: window.location.origin } });

  const placeOrder = async () => {
    setPlacing(true);
    setStatusMsg(null);
    try {
      const token = await getAccessTokenSilently();
      const item = MENU.find((m) => m.id === selected);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item: item.name, price: item.price }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      setStatusMsg("Order placed! Log out and back in to see it in your history.");
    } catch (e) {
      setStatusMsg(`Failed: ${e.message}`);
    } finally {
      setPlacing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {error && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 px-4 py-2 rounded-lg">
            {error.message}
          </div>
        )}
        <Landing />
      </>
    );
  }

  const emailVerified = user?.email_verified;
  const orderHistory = user?.[ORDERS_CLAIM] ?? [];
  const marketingProfile = marketingProfileClaim;

  return (
    <div className="min-h-screen">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://raw.githubusercontent.com/apnagra24/image/main/pizza%20logo.jpg"
              alt="Pizza 42 logo"
              className="w-10 h-10 rounded-full"
            />
            <h1 className="text-2xl font-bold tracking-wide">Pizza42</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full border border-white/20 object-cover bg-white/10"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.style.removeProperty("display");
                  }}
                />
              ) : null}
              <div
                style={{ display: user.picture ? "none" : "flex" }}
                className="w-9 h-9 rounded-full border border-white/20 bg-orange-500/30 items-center justify-center font-bold text-sm"
              >
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <div className="font-semibold">{user.name || user.email}</div>
                <div className="text-gray-400 text-xs">{user.email}</div>
              </div>
            </div>
            <button
              onClick={doLogout}
              className="glass hover:bg-white/10 transition px-4 py-2 rounded-xl font-semibold text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <div className="hero-bg min-h-screen pt-32 pb-16">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          {!emailVerified && (
            <div className="glass rounded-2xl p-5 border-l-4 border-yellow-400">
              <div className="font-bold text-yellow-300 mb-1">
                Verify your email
              </div>
              <div className="text-gray-200 text-sm">
                Check your inbox for a verification link. You can browse the
                menu, but orders are disabled until your email is verified.
              </div>
            </div>
          )}

          {/* ORDER CARD */}
          <div className="glass rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-black mb-6">Order a pizza</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {MENU.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={`text-left rounded-2xl p-4 border transition ${
                    selected === m.id
                      ? "bg-orange-500/20 border-orange-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="font-bold text-lg">{m.name}</div>
                  <div className="text-orange-400 font-semibold">${m.price}</div>
                </button>
              ))}
            </div>
            <button
              onClick={placeOrder}
              disabled={!emailVerified || placing}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition px-8 py-4 rounded-2xl font-bold text-lg shadow-xl"
            >
              {placing ? "Placing…" : "Place order"}
            </button>
            {statusMsg && (
              <div className="mt-4 text-sm text-gray-200">{statusMsg}</div>
            )}
          </div>

          {/* ORDER HISTORY */}
          <div className="glass rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-black mb-2">Your order history</h2>
            <p className="text-gray-400 text-sm mb-6">
              Pulled from your ID token's <code>https://pizza42.com/orders</code> claim.
            </p>
            {orderHistory.length === 0 ? (
              <p className="text-gray-300">
                No orders yet. Place one, then log out and back in.
              </p>
            ) : (
              <ul className="space-y-3">
                {orderHistory.map((o, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold">{o.item}</div>
                      <div className="text-gray-400 text-xs">
                        {new Date(o.placedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-orange-400 font-bold">${o.price}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* MARKETING PROFILE */}
          <div className="glass rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-black mb-2">Tell us about you</h2>
            <p className="text-gray-400 text-sm mb-6">
              Helps us personalize your experience. Stored in your Auth0
              profile and surfaced as a claim on next login.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Favorite pizza
                </label>
                <select
                  value={profileDraft.favoriteItem}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, favoriteItem: e.target.value })
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">— pick one —</option>
                  {MENU.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Dietary preference
                </label>
                <select
                  value={profileDraft.dietary}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, dietary: e.target.value })
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">— none —</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten-free">Gluten-free</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2 text-gray-200">
                <input
                  type="checkbox"
                  checked={profileDraft.marketingEmailOptIn}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, marketingEmailOptIn: e.target.checked })
                  }
                />
                Email me about new pizzas and deals
              </label>
              <label className="flex items-center gap-2 text-gray-200">
                <input
                  type="checkbox"
                  checked={profileDraft.marketingSmsOptIn}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, marketingSmsOptIn: e.target.checked })
                  }
                />
                Text me about order status and offers
              </label>
            </div>
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="bg-orange-500 hover:bg-orange-400 disabled:bg-gray-600 transition px-6 py-3 rounded-xl font-bold shadow-lg"
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
            {profileMsg && (
              <div className="mt-4 text-sm text-gray-200">{profileMsg}</div>
            )}
            {marketingProfile && (
              <div className="mt-4 text-xs text-gray-400">
                Last updated: {marketingProfile.updatedAt ? new Date(marketingProfile.updatedAt).toLocaleString() : "—"}
              </div>
            )}
          </div>

          {/* DEBUG */}
          <details className="glass rounded-2xl p-6">
            <summary className="cursor-pointer font-semibold">
              Debug: ID token payload
            </summary>
            <p className="text-xs text-gray-400 mt-2">
              Issued by Auth0 at login. Contains identity claims + the custom
              <code className="mx-1">https://pizza42.com/orders</code> and
              <code className="mx-1">https://pizza42.com/marketing_profile</code>
              claims injected by the Post-Login Action. Used by the SPA only.
            </p>
            <pre className="mt-4 text-xs overflow-auto bg-black/40 p-4 rounded-lg">
              {JSON.stringify(user, null, 2)}
            </pre>
          </details>

          <details className="glass rounded-2xl p-6">
            <summary className="cursor-pointer font-semibold">
              Debug: Access token payload
            </summary>
            <p className="text-xs text-gray-400 mt-2">
              Bearer credential sent to <code>/api/orders</code> and{" "}
              <code>/api/profile</code>. Notice the <code>aud</code> is the
              Pizza 42 API identifier, and the <code>scope</code> claim carries{" "}
              <code>create:orders</code> — what the backend enforces. No
              identity data is included by design.
            </p>
            <pre className="mt-4 text-xs overflow-auto bg-black/40 p-4 rounded-lg">
              {accessTokenPayload
                ? JSON.stringify(accessTokenPayload, null, 2)
                : "Loading…"}
            </pre>
            {accessTokenRaw && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-400">
                  Show raw JWT (paste into jwt.io to verify signature)
                </summary>
                <pre className="mt-2 text-[10px] break-all whitespace-pre-wrap overflow-auto bg-black/40 p-3 rounded-lg">
                  {accessTokenRaw}
                </pre>
              </details>
            )}
          </details>
        </div>
      </div>
    </div>
  );
}

export default App;
