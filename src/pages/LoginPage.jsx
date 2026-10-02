import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StadiumScene = lazy(() => import("../components/StadiumScene"));

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(form);
      const destination = ["SUPER_ADMIN", "AUCTION_ADMIN"].includes(
        result.user.role,
      )
        ? "/admin"
        : result.user.role === "VIEWER"
          ? "/viewer"
          : "/dashboard";
      navigate(destination);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <main className="auth-layout login-layout">
      <section className="card auth-box login-panel">
        <div className="login-brandline">
          <img
            className="brand-mark"
            src="/rotaract-logo.jpeg"
            alt="Rotaract Club of ACCET"
          />
          <div>
            <strong>ROTARACT IPL</strong>
            <small>AUCTION ARENA</small>
          </div>
        </div>

        <div className="login-heading">
          <span className="eyebrow">TEAM ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Sign in to enter the auction room.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
          <button className="btn primary" type="submit">
            Login
          </button>
          <Link to="/register">
            <button
              type="button"
              className="btn secondary"
              style={{ width: "100%" }}
            >
              Create Team
            </button>
          </Link>
        </form>
      </section>

      <aside className="login-visual" aria-label="Rotaract IPL auction stadium">
        <span className="login-visual-kicker">
          <i className="live-dot" /> ROTARACT IPL · LIVE SEASON
        </span>
        <Suspense fallback={<div className="stadium-scene" />}>
          <StadiumScene />
        </Suspense>
        <div className="login-visual-copy">
          <span>STRATEGY · BIDDING · GLORY</span>
          <h2>
            The auction
            <br />
            begins.
          </h2>
        </div>
        <span className="login-visual-index">
          <b>01</b> / MATCH NIGHT
        </span>
      </aside>
    </main>
  );
}
