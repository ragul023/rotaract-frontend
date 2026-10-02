import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import PlayerImage from "./PlayerImage";

export default function AuctionResultModal({ socket }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!socket) return undefined;

    const onPlayerResult = (payload) => {
      if (!["SOLD", "UNSOLD"].includes(payload?.status)) return;
      setResult(payload);
    };

    socket.on("player_result", onPlayerResult);
    return () => socket.off("player_result", onPlayerResult);
  }, [socket]);

  useEffect(() => {
    if (!result) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setResult(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result]);

  if (!result) return null;

  const sold = result.status === "SOLD";
  const amount = Number(result.amount);

  return (
    <div
      className="auction-result-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setResult(null);
      }}
    >
      <section
        className={`card auction-result-modal${sold ? " is-sold" : " is-unsold"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-result-title"
      >
        <button
          className="auction-result-close"
          type="button"
          aria-label="Close player result"
          onClick={() => setResult(null)}
        >
          <X size={18} />
        </button>
        <div className="auction-result-icon" aria-hidden="true">
          <CheckCircle2 size={27} />
        </div>
        <span className="eyebrow">AUCTION RESULT</span>
        <h2 id="auction-result-title">
          {sold ? "PLAYER SOLD" : "PLAYER UNSOLD"}
        </h2>
        {result.playerPhoto && (
          <PlayerImage
            className="auction-result-player-image"
            src={result.playerPhoto}
            alt={result.playerName || "Player"}
          />
        )}
        <p className="auction-result-player">{result.playerName || "Player"}</p>
        {sold ? (
          <div className="auction-result-details">
            {result.acquisitionMethod === "SUPER_STEAL" && (
              <div className="auction-result-method">
                <span>ACQUIRED BY</span>
                <strong>SUPER STEAL</strong>
              </div>
            )}
            <div>
              <span>COLLEGE TEAM</span>
              <strong>{result.teamName || "College team"}</strong>
            </div>
            <div>
              <span>SALE PRICE</span>
              <strong>
                ₹{Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} Cr
              </strong>
            </div>
          </div>
        ) : (
          <p className="auction-result-status">Status: Unsold</p>
        )}
        <button
          className="btn primary auction-result-dismiss"
          type="button"
          onClick={() => setResult(null)}
        >
          Continue auction
        </button>
      </section>
    </div>
  );
}
