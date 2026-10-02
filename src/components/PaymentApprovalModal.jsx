import { useEffect } from "react";
import { Phone, ShieldAlert, X } from "lucide-react";

export default function PaymentApprovalModal({ onClose, onViewPayment }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="auction-result-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="card auction-result-modal payment-approval-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-approval-title"
      >
        <button
          className="auction-result-close"
          type="button"
          aria-label="Close payment approval message"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="auction-result-icon payment-approval-icon">
          <ShieldAlert size={26} />
        </div>
        <span className="eyebrow">TEAM PAYMENT REVIEW</span>
        <h2 id="payment-approval-title">Bidding is locked</h2>
        <p className="payment-approval-copy">
          Your team can view the auction, but bidding and offers unlock after an
          admin approves your payment.
        </p>
        <a className="payment-approval-phone" href="tel:9698813344">
          <Phone size={17} />
          <span>
            <small>CONTACT ADMIN</small>
            <strong>9698813344</strong>
          </span>
        </a>
        <div className="payment-approval-actions">
          <button className="btn primary" type="button" onClick={onViewPayment}>
            View payment status
          </button>
          <button className="btn secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
