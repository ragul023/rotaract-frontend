import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ArrowRight, Check, Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import "../styles/registration.css";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api";

export default function TeamPaymentPage() {
  const { user, token, loading } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [fee, setFee] = useState(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, navigate, user]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const [teamResponse, feeResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/teams/me/registration`, { headers }),
        axios.get(`${apiBaseUrl}/teams/registration-settings`),
      ]);
      setRegistration(teamResponse.data.registration);
      setFee(feeResponse.data.fee);
      setPaymentReference(
        teamResponse.data.registration?.payment_reference || "",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load team payment status",
      );
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.on("team_registration_updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("team_registration_updated", refresh);
      socket.off("connect", refresh);
    };
  }, [socket, refresh]);

  const createOrder = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/teams/me/payment-order`,
        {},
        { headers },
      );
      setRegistration((current) => ({
        ...current,
        payment_id: response.data.payment.id,
        amount: response.data.payment.amount,
        payment_status: response.data.payment.payment_status,
        payment_reference: response.data.payment.payment_reference,
      }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to prepare team payment",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitReference = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/teams/me/payment-reference`,
        { paymentReference },
        { headers },
      );
      setRegistration((current) => ({
        ...current,
        payment_status: response.data.payment.payment_status,
        payment_reference: response.data.payment.payment_reference,
      }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to submit payment reference",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyTeamCode = async () => {
    await navigator.clipboard.writeText(registration.team_code);
    setCopied(true);
  };

  if (loading || !user) return null;

  const isConfirmed = registration?.registration_status === "CONFIRMED";
  const paymentPending =
    registration?.payment_status === "PENDING_VERIFICATION";
  const paymentRejected = registration?.payment_status === "REJECTED";
  const canSubmitReference = ["PENDING", "REJECTED"].includes(
    registration?.payment_status,
  );

  return (
    <main className="registration-page">
      <div className="registration-shell">
        <header className="registration-topbar">
          <Link to="/dashboard" className="registration-brand">
            <img
              className="brand-mark"
              src="/rotaract-logo.jpeg"
              alt="Rotaract Club of ACCET"
            />
            <span>
              ROTARACT <b>IPL</b>
            </span>
          </Link>
          <span className="registration-user">TEAM LEADER · {user.name}</span>
        </header>

        <section className="registration-intro">
          <span className="eyebrow">TEAM REGISTRATION</span>
          <h1>
            One team.<em> One payment.</em>
          </h1>
          <p>
            The captain pays once. You can enter the auction while payment is
            reviewed; bidding and team-code sharing unlock after approval.
          </p>
        </section>

        {error && (
          <div className="registration-alert" role="alert">
            {error}
          </div>
        )}

        {!registration ? (
          <section className="registration-panel registration-result">
            <span className="eyebrow">CREATE A TEAM FIRST</span>
            <h2>No team found for this account.</h2>
            <p>
              Use Create a team to register as captain. The team code is
              released only after payment approval.
            </p>
            <button
              className="btn primary"
              type="button"
              onClick={() => navigate("/register")}
            >
              Create a team <ArrowRight size={16} />
            </button>
          </section>
        ) : isConfirmed ? (
          <section className="registration-panel registration-result is-confirmed">
            <div className="registration-result-icon">
              <Check size={28} />
            </div>
            <span className="eyebrow">PAYMENT VERIFIED</span>
            <h2>Team registration confirmed.</h2>
            <p>
              Your team is active. Share this code with teammates so they can
              join.
            </p>
            <div className="registration-result-code">
              <small>TEAM · {registration.team_name}</small>
              <strong>{registration.team_code}</strong>
            </div>
            <button
              className="btn primary"
              type="button"
              onClick={copyTeamCode}
            >
              <Copy size={16} />
              {copied ? "Copied" : "Copy team code"}
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Start Auction <ArrowRight size={16} />
            </button>
          </section>
        ) : (
          <section className="registration-panel payment-panel">
            <div className="registration-section-heading">
              <div>
                <span className="eyebrow">CAPTAIN PAYMENT</span>
                <h2>{registration.team_name}</h2>
              </div>
              <span className="registration-code">
                {registration.member_count} MEMBER
                {registration.member_count === 1 ? "" : "S"}
              </span>
            </div>
            <div className="registration-fee-band">
              <div>
                <small>REGISTRATION FEE · ENTIRE TEAM</small>
                <strong>
                  {registration.amount == null
                    ? fee == null
                      ? "Set by admin"
                      : `₹${Number(fee).toFixed(2)}`
                    : `₹${Number(registration.amount).toFixed(2)}`}
                </strong>
                <p>
                  Only the captain needs to pay. Teammates do not make separate
                  payments.
                </p>
              </div>
              <ShieldCheck size={25} />
            </div>

            {!registration.payment_id ? (
              <div className="registration-payment-form">
                <p>
                  The team is saved as pending payment. Create the team's single
                  payment order to continue.
                </p>
                <button
                  className="btn primary"
                  type="button"
                  disabled={busy || fee == null || !registration.is_captain}
                  onClick={createOrder}
                >
                  {busy
                    ? "Preparing payment..."
                    : fee == null
                      ? "Waiting for admin fee"
                      : "Proceed to payment"}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : paymentPending ? (
              <div className="registration-result">
                <div className="registration-result-icon">
                  <RefreshCw size={24} />
                </div>
                <span className="eyebrow">REFERENCE SUBMITTED</span>
                <h2>Awaiting admin approval.</h2>
                <p>
                  Team code remains private until the captain's payment is
                  approved. You can enter the dashboard while the review is
                  pending; bidding unlocks after approval.
                </p>
                <div className="registration-result-code">
                  <small>PAYMENT REFERENCE</small>
                  <strong>{registration.payment_reference}</strong>
                  <span>
                    ₹{Number(registration.amount).toFixed(2)} · PENDING
                    VERIFICATION
                  </span>
                </div>
                <button
                  className="btn primary"
                  type="button"
                  disabled={busy}
                  onClick={refresh}
                >
                  {busy ? "Checking..." : "Refresh status"}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => navigate("/dashboard")}
                >
                  Start Auction <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="registration-payment-layout">
                <div
                  className="registration-qr-placeholder"
                  aria-label="Placeholder for event UPI QR code"
                >
                  <div className="qr-mark">
                    <span />
                    <span />
                    <span />
                    <b>UPI</b>
                  </div>
                  <strong>UPI QR CODE</strong>
                  <small>QR IMAGE PLACEHOLDER</small>
                </div>
                <form
                  className="registration-payment-form"
                  onSubmit={submitReference}
                >
                  <span className="eyebrow">
                    {paymentRejected
                      ? "PAYMENT REJECTED"
                      : "MANUAL UPI PAYMENT"}
                  </span>
                  <h3>
                    {paymentRejected
                      ? "Submit a corrected reference"
                      : "Captain pays once"}
                  </h3>
                  <p>
                    {paymentRejected
                      ? "Check the reference and submit it again for review."
                      : "Pay the amount shown, then enter the UPI transaction or reference ID. The team stays pending until the admin verifies it."}
                  </p>
                  {canSubmitReference && (
                    <label className="registration-field">
                      <span>UPI transaction / reference ID</span>
                      <input
                        value={paymentReference}
                        onChange={(event) =>
                          setPaymentReference(event.target.value)
                        }
                        minLength={6}
                        maxLength={255}
                        required
                      />
                    </label>
                  )}
                  {canSubmitReference && (
                    <div className="registration-no-proof">
                      A screenshot alone is not accepted as proof of payment.
                    </div>
                  )}
                  {canSubmitReference ? (
                    <button
                      className="btn primary"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? "Submitting..." : "Submit for admin approval"}
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      className="btn primary"
                      type="button"
                      disabled={busy}
                      onClick={refresh}
                    >
                      Refresh payment status
                    </button>
                  )}
                </form>
              </div>
            )}
            {!registration.is_captain && !isConfirmed && (
              <p className="registration-config-note">
                Only the team captain can create or submit the payment.
              </p>
            )}
          </section>
        )}

        {registration && !isConfirmed && (
          <button
            className="registration-back-link"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Start Auction
          </button>
        )}
        <footer className="registration-footer">
          <span>{registration?.team_name || "TEAM REGISTRATION"}</span>
          <span>TEAM CODE RELEASED AFTER PAYMENT APPROVAL</span>
        </footer>
      </div>
    </main>
  );
}
