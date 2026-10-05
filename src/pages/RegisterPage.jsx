import { useState } from "react";
import { ArrowRight, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, joinTeam } = useAuth();
  const [flow, setFlow] = useState("CREATE");
  const [form, setForm] = useState({
    teamName: "",
    leaderName: "",
    leaderEmail: "",
    leaderPhone: "",
    leaderRegisterNumber: "",
    department: "",
    password: "",
    name: "",
    email: "",
    registerNumber: "",
    teamCode: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (flow === "CREATE") {
        await register(form);
        navigate("/team-registration");
      } else {
        await joinTeam({
          teamCode: form.teamCode.trim().toUpperCase(),
          name: form.name,
          email: form.email,
          registerNumber: form.registerNumber,
          department: form.department,
          password: form.password,
        });
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to complete registration",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="card auth-box registration-box">
        <Link className="register-brand" to="/login">
          <img
            className="brand-mark"
            src="/rotaract-logo.jpeg"
            alt="Rotaract Club of ACCET"
          />
          <span>
            ROTARACT <b>IPL</b>
          </span>
        </Link>

        <>
          <div className="registration-heading">
            <span className="eyebrow">THE AUCTION STARTS WITH YOUR TEAM</span>
            <h1>
              Get in the
              <br />
              <span>game.</span>
            </h1>
            <p className="muted">
              Create a team as captain, or join a registered squad.
            </p>
          </div>

          <div
            className="registration-switch"
            role="group"
            aria-label="Registration type"
          >
            <button
              type="button"
              disabled={submitting}
              className={flow === "CREATE" ? "selected" : ""}
              aria-pressed={flow === "CREATE"}
              onClick={() => {
                setFlow("CREATE");
                setError("");
              }}
            >
              Create a team
            </button>
            <button
              type="button"
              disabled={submitting}
              className={flow === "JOIN" ? "selected" : ""}
              aria-pressed={flow === "JOIN"}
              onClick={() => {
                setFlow("JOIN");
                setError("");
              }}
            >
              Join a team
            </button>
          </div>

          <form className="auth-form registration-form" onSubmit={handleSubmit}>
            {flow === "CREATE" ? (
              <>
                <label className="form-section-label">
                  <UsersRound size={15} /> TEAM DETAILS
                </label>
                <input
                  required
                  minLength="2"
                  placeholder="Team name"
                  value={form.teamName}
                  onChange={(event) =>
                    setForm({ ...form, teamName: event.target.value })
                  }
                />
                <label className="form-section-label">TEAM LEADER</label>
                <div className="grid-2">
                  <input
                    required
                    minLength="2"
                    placeholder="Leader name"
                    value={form.leaderName}
                    onChange={(event) =>
                      setForm({ ...form, leaderName: event.target.value })
                    }
                  />
                  <input
                    required
                    type="email"
                    placeholder="Leader email"
                    value={form.leaderEmail}
                    onChange={(event) =>
                      setForm({ ...form, leaderEmail: event.target.value })
                    }
                  />
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    minLength="7"
                    maxLength="20"
                    pattern="\\+?[0-9\\s()-]{7,20}"
                    placeholder="Captain mobile number"
                    value={form.leaderPhone}
                    onChange={(event) =>
                      setForm({ ...form, leaderPhone: event.target.value })
                    }
                  />
                  <input
                    required
                    minLength="2"
                    placeholder="Register number"
                    value={form.leaderRegisterNumber}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        leaderRegisterNumber: event.target.value,
                      })
                    }
                  />
                  <input
                    required
                    minLength="2"
                    placeholder="Department"
                    value={form.department}
                    onChange={(event) =>
                      setForm({ ...form, department: event.target.value })
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <label className="form-section-label">
                  <UsersRound size={15} /> TEAM INVITE
                </label>
                <input
                  required
                  minLength="4"
                  placeholder="Team invite code"
                  value={form.teamCode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      teamCode: event.target.value.toUpperCase(),
                    })
                  }
                />
                <label className="form-section-label">YOUR DETAILS</label>
                <div className="grid-2">
                  <input
                    required
                    minLength="2"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                  <input
                    required
                    minLength="2"
                    placeholder="Register number"
                    value={form.registerNumber}
                    onChange={(event) =>
                      setForm({ ...form, registerNumber: event.target.value })
                    }
                  />
                  <input
                    required
                    minLength="2"
                    placeholder="Department"
                    value={form.department}
                    onChange={(event) =>
                      setForm({ ...form, department: event.target.value })
                    }
                  />
                </div>
              </>
            )}
            <input
              required
              minLength="6"
              type="password"
              placeholder="Create password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="btn primary"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting
                ? flow === "CREATE"
                  ? "Creating team..."
                  : "Joining team..."
                : flow === "CREATE"
                  ? "Create team"
                  : "Join team"}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
          <div className="eyebrow net">
            Already Registerd?{" "}
            <span>
              <Link to="/login" cla>
                Login
              </Link>
            </span>
          </div>
        </>
      </div>
    </div>
  );
}
