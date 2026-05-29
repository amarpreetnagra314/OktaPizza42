import { useAuth0 } from "@auth0/auth0-react";

export default function Landing() {
  const { loginWithRedirect } = useAuth0();

  const login = () => loginWithRedirect();
  const signup = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });

  return (
    <div className="text-white">
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
          <div className="flex items-center gap-3">
            <button
              onClick={signup}
              className="glass hover:bg-white/10 transition px-5 py-2 rounded-xl font-semibold"
            >
              Sign up
            </button>
            <button
              onClick={login}
              className="bg-orange-500 hover:bg-orange-400 transition px-5 py-2 rounded-xl font-semibold shadow-lg"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-bg min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center pt-24">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <span className="text-orange-400">🍕</span>
              <span className="text-sm text-gray-200">
                Personalized Pizza Experience Powered by Auth0
              </span>
            </div>
            <h1 className="text-6xl font-black leading-tight mb-6">
              Pizza Made <br />
              Fast, Secure <br />
              &amp; Personal.
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed mb-8 max-w-xl">
              Login securely with Google, Apple, or Passwordless Login. Save
              your favorite orders, enjoy seamless checkout, and experience
              modern identity-powered customer personalization.
            </p>
            <div className="flex gap-4">
              <button
                onClick={login}
                className="bg-orange-500 hover:bg-orange-400 transition px-8 py-4 rounded-2xl font-bold text-lg shadow-xl"
              >
                Order Now
              </button>
              <a
                href="#featured"
                className="glass hover:bg-white/10 transition px-8 py-4 rounded-2xl font-semibold"
              >
                Explore Menu
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1981&auto=format&fit=crop"
              alt="Pizza"
              className="rounded-3xl shadow-2xl border border-white/10"
            />
            <div className="absolute -bottom-8 -left-8 glass p-5 rounded-2xl w-64 shadow-2xl">
              <div className="text-sm text-gray-300 mb-2">
                Returning customers see
              </div>
              <div className="text-2xl font-bold mb-1">
                Welcome back 🍕
              </div>
              <div className="text-orange-400 font-medium">
                Personalized order suggestions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">Why Pizza42?</h2>
            <p className="text-gray-400 text-lg">
              A modern pizza experience powered by secure identity.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass rounded-3xl p-8">
              <div className="text-5xl mb-6">🔐</div>
              <h3 className="text-2xl font-bold mb-4">Secure Login</h3>
              <p className="text-gray-300 leading-relaxed">
                Universal Login powered by Auth0 with social login,
                passwordless authentication, MFA, and passkeys.
              </p>
            </div>
            <div className="glass rounded-3xl p-8">
              <div className="text-5xl mb-6">⚡</div>
              <h3 className="text-2xl font-bold mb-4">Fast Checkout</h3>
              <p className="text-gray-300 leading-relaxed">
                Personalized ordering experience with saved preferences and
                seamless user sessions.
              </p>
            </div>
            <div className="glass rounded-3xl p-8">
              <div className="text-5xl mb-6">🎯</div>
              <h3 className="text-2xl font-bold mb-4">
                Personalized Experience
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Customer profiles enriched through Auth0 metadata for loyalty
                and marketing personalization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PIZZAS */}
      <section id="featured" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-5xl font-black mb-4">Featured Pizzas</h2>
              <p className="text-gray-400 text-lg">
                Freshly baked favorites customers love.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                img: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=1974&auto=format&fit=crop",
                name: "Pepperoni Deluxe",
                price: "$18",
                desc: "Loaded with premium pepperoni and mozzarella cheese.",
              },
              {
                img: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?q=80&w=1974&auto=format&fit=crop",
                name: "Veggie Supreme",
                price: "$16",
                desc: "Fresh vegetables with garlic sauce and herbs.",
              },
              {
                img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1974&auto=format&fit=crop",
                name: "BBQ Chicken",
                price: "$20",
                desc: "Smoky BBQ chicken pizza with caramelized onions.",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="pizza-card glass rounded-3xl overflow-hidden shadow-xl"
              >
                <div className="overflow-hidden">
                  <img src={p.img} alt={p.name} className="w-full h-64 object-cover" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold">{p.name}</h3>
                    <span className="text-orange-400 font-bold">{p.price}</span>
                  </div>
                  <p className="text-gray-300 mb-6">{p.desc}</p>
                  <button
                    onClick={login}
                    className="w-full bg-orange-500 hover:bg-orange-400 transition py-3 rounded-xl font-semibold"
                  >
                    Login to Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black mb-6">
            Secure Pizza Ordering Experience
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto">
            Powered by Auth0 Universal Login, OIDC, Authorization Code Flow
            with PKCE, social login, and secure customer identity management.
          </p>
          <button
            onClick={login}
            className="bg-orange-500 hover:bg-orange-400 transition px-10 py-5 rounded-2xl text-xl font-bold shadow-2xl"
          >
            Login &amp; Order Pizza
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 bg-black text-center text-gray-500">
        Pizza42 © 2026 • Secure Customer Identity Powered by Auth0
      </footer>
    </div>
  );
}
