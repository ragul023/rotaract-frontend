import { Fragment, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, RefreshCw, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/registration-admin.css";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api";

export default function RegistrationAdminPage() {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [fee, setFee] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (
      !loading &&
      user &&
      !["SUPER_ADMIN", "AUCTION_ADMIN"].includes(user.role)
    )
      navigate("/dashboard");
  }, [loading, navigate, user]);

  const headers = { Authorization: `Bearer ${token}` };
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoadingData(true);
    setError("");
    try {
      const [registrationResponse, settingsResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/admin/registrations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${apiBaseUrl}/admin/registration-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setRegistrations(registrationResponse.data.registrations);
      setFee(
        settingsResponse.data.fee == null
          ? ""
          : String(settingsResponse.data.fee),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load team registrations",
      );
    } finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveFee = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setBusyAction("fee");
    setError("");
    setNotice("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/admin/registration-settings`,
        { fee: Number(fee) },
        { headers },
      );
      setFee(String(response.data.fee));
      setNotice(
        "Registration fee updated. New payment orders will use this amount.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save registration fee",
      );
    } finally {
      setBusyAction("");
      setBusy(false);
    }
  };

  const decidePayment = async (registrationId, decision) => {
    if (busy) return;
    setBusy(true);
    setBusyAction(`${decision}:${registrationId}`);
    setError("");
    setNotice("");
    try {
      await axios.post(
        `${apiBaseUrl}/admin/registrations/${registrationId}/${decision}`,
        {},
        { headers },
      );
      setNotice(
        decision === "verify"
          ? "Payment verified. The full team is confirmed."
          : "Payment rejected. The captain can submit a corrected reference.",
      );
      await loadData();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update payment status",
      );
    } finally {
      setBusyAction("");
      setBusy(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className="registration-admin-page">
      <div className="registration-admin-shell">
        <header className="registration-admin-header">
          <div>
            <span className="eyebrow">EVENT OPERATIONS</span>
            <h1>Team registrations</h1>
            <p>Review rosters and verify the captain's single team payment.</p>
          </div>
          <button
            className="btn secondary"
            type="button"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft size={15} /> Auction control
          </button>
        </header>

        {error && (
          <div className="registration-admin-alert" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="registration-admin-notice" role="status">
            {notice}
          </div>
        )}

        <section className="registration-admin-fee">
          <div>
            <span className="eyebrow">PAYMENT CONFIGURATION</span>
            <h2>Registration fee per team</h2>
            <p>
              Changing this affects new payment orders. Existing orders keep
              their recorded amount.
            </p>
          </div>
          <form onSubmit={saveFee}>
            <label htmlFor="team-registration-fee">Amount (INR)</label>
            <div>
              <span>₹</span>
              <input
                id="team-registration-fee"
                type="number"
                min="0.01"
                step="0.01"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                required
              />
              <button
                className="btn primary"
                type="submit"
                disabled={busy || !fee}
                aria-busy={busyAction === "fee"}
              >
                {busyAction === "fee" ? "Saving..." : "Save fee"}
              </button>
            </div>
          </form>
        </section>

        <section className="registration-admin-list">
          <div className="registration-admin-list-heading">
            <div>
              <span className="eyebrow">REGISTRATION QUEUE</span>
              <h2>
                {registrations.length} team
                {registrations.length === 1 ? "" : "s"}
              </h2>
            </div>
            <button
              className="icon-action"
              type="button"
              aria-label={
                loadingData
                  ? "Refreshing registrations"
                  : "Refresh registrations"
              }
              aria-busy={loadingData}
              title={loadingData ? "Refreshing..." : "Refresh"}
              disabled={loadingData || busy}
              onClick={loadData}
            >
              <RefreshCw
                size={16}
                className={loadingData ? "registration-admin-refreshing" : ""}
              />
            </button>
          </div>
          {registrations.length === 0 ? (
            <div className="registration-admin-empty">
              <UsersRound size={24} />
              <p>No team registrations are awaiting review.</p>
            </div>
          ) : (
            <div className="registration-admin-table-wrap">
              <table className="registration-admin-table">
                <thead>
                  <tr>
                    <th>Team / Event</th>
                    <th>Captain</th>
                    <th>Members</th>
                    <th>Registered</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Payment</th>
                    <th>Registration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration) => {
                    const isOpen = expanded === registration.id;
                    return (
                      <Fragment key={registration.id}>
                        <tr>
                          <td data-label="Team / Event">
                            <strong>{registration.team_name}</strong>
                            <small>
                              {registration.event_name}
                              <br />
                              {registration.registration_code}
                            </small>
                          </td>
                          <td data-label="Captain">
                            {registration.captain_name}
                            <small>{registration.captain_email}</small>
                          </td>
                          <td data-label="Members">{registration.team_size}</td>
                          <td data-label="Registered">
                            {new Date(
                              registration.created_at,
                            ).toLocaleDateString()}
                          </td>
                          <td data-label="Amount">
                            {registration.amount == null
                              ? "—"
                              : `₹${Number(registration.amount).toFixed(2)}`}
                          </td>
                          <td data-label="Payment reference">
                            {registration.upi_reference ||
                              registration.payment_reference ||
                              "—"}
                          </td>
                          <td data-label="Payment status">
                            <span
                              className={`registration-admin-status ${String(
                                registration.payment_status || "NOT STARTED",
                              )
                                .toLowerCase()
                                .replaceAll("_", "-")}`}
                            >
                              {(
                                registration.payment_status || "NOT STARTED"
                              ).replaceAll("_", " ")}
                            </span>
                          </td>
                          <td data-label="Registration status">
                            <span
                              className={`registration-admin-status ${registration.registration_status.toLowerCase().replaceAll("_", "-")}`}
                            >
                              {registration.registration_status.replaceAll(
                                "_",
                                " ",
                              )}
                            </span>
                          </td>
                          <td data-label="Actions">
                            <div className="registration-admin-actions">
                              <button
                                className="btn secondary"
                                type="button"
                                onClick={() =>
                                  setExpanded(isOpen ? null : registration.id)
                                }
                              >
                                {isOpen ? "Hide team" : "View team"}
                              </button>
                              {registration.payment_status ===
                                "PENDING_VERIFICATION" && (
                                <>
                                  <button
                                    className="btn primary"
                                    type="button"
                                    disabled={busy}
                                    aria-busy={
                                      busyAction === `verify:${registration.id}`
                                    }
                                    onClick={() =>
                                      decidePayment(registration.id, "verify")
                                    }
                                  >
                                    {busyAction === `verify:${registration.id}`
                                      ? "Verifying..."
                                      : "Verify"}
                                  </button>
                                  <button
                                    className="btn secondary reject"
                                    type="button"
                                    disabled={busy}
                                    aria-busy={
                                      busyAction === `reject:${registration.id}`
                                    }
                                    onClick={() =>
                                      decidePayment(registration.id, "reject")
                                    }
                                  >
                                    {busyAction === `reject:${registration.id}`
                                      ? "Rejecting..."
                                      : "Reject"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr
                            className="registration-admin-detail"
                            key={`${registration.id}-detail`}
                          >
                            <td colSpan="9">
                              <div className="registration-admin-roster">
                                {registration.members.map((member) => (
                                  <article key={member.registerNumber}>
                                    <div>
                                      <strong>
                                        {member.name}
                                        {member.isCaptain ? " · Captain" : ""}
                                      </strong>
                                      <small>
                                        {member.registerNumber} · {member.email}
                                      </small>
                                    </div>
                                    <span>{member.department}</span>
                                  </article>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
