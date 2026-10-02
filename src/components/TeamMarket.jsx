import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeftRight, Check, Clock3, X } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import PlayerImage from "./PlayerImage";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api";

export default function TeamMarket({
  token,
  teamId,
  teams = [],
  ownRoster = [],
  isTeamApproved = true,
  onApprovalRequired,
}) {
  const { socket } = useSocket();
  const [windowOpen, setWindowOpen] = useState(false);
  const [offers, setOffers] = useState([]);
  const [targetTeamId, setTargetTeamId] = useState("");
  const [offeredPlayerId, setOfferedPlayerId] = useState("");
  const [requestedPlayerId, setRequestedPlayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const headers = { Authorization: `Bearer ${token}` };
  const targetTeams = teams.filter((team) => team.team_id !== teamId);
  const targetTeam = targetTeams.find((team) => team.team_id === targetTeamId);

  const refresh = async () => {
    const [windowResponse, offerResponse] = await Promise.all([
      axios.get(`${apiBaseUrl}/trades/window`, { headers }),
      axios.get(`${apiBaseUrl}/trades/offers`, { headers }),
    ]);
    setWindowOpen(windowResponse.data.open);
    setOffers(offerResponse.data.offers);
  };

  useEffect(() => {
    if (!token || !teamId) return;
    refresh().catch((requestError) => {
      setError(
        requestError.response?.data?.message || "Unable to load trade room",
      );
    });
  }, [token, teamId]);

  useEffect(() => {
    if (!socket) return undefined;
    const onTradeUpdate = () => {
      refresh().catch(() => setError("Unable to refresh trade offers"));
    };
    const onWindowUpdate = (payload) => setWindowOpen(payload?.open === true);
    socket.on("trade_offer_updated", onTradeUpdate);
    socket.on("trade_window_updated", onWindowUpdate);
    return () => {
      socket.off("trade_offer_updated", onTradeUpdate);
      socket.off("trade_window_updated", onWindowUpdate);
    };
  }, [socket, token, teamId]);

  const sendOffer = async (event) => {
    event.preventDefault();
    if (!isTeamApproved) {
      onApprovalRequired?.();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await axios.post(
        `${apiBaseUrl}/trades/offers`,
        { toTeamId: targetTeamId, offeredPlayerId, requestedPlayerId },
        { headers },
      );
      await refresh();
      setNotice("Trade offer sent");
      setOfferedPlayerId("");
      setRequestedPlayerId("");
    } catch (requestError) {
      if (requestError.response?.data?.code === "TEAM_PAYMENT_NOT_APPROVED") {
        onApprovalRequired?.();
      } else {
        setError(
          requestError.response?.data?.message || "Unable to send trade offer",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const respond = async (offerId, accepted) => {
    if (!isTeamApproved) {
      onApprovalRequired?.();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await axios.post(
        `${apiBaseUrl}/trades/offers/${offerId}/respond`,
        { accepted },
        { headers },
      );
      await refresh();
      setNotice(accepted ? "Trade completed" : "Offer declined");
    } catch (requestError) {
      if (requestError.response?.data?.code === "TEAM_PAYMENT_NOT_APPROVED") {
        onApprovalRequired?.();
      } else {
        setError(
          requestError.response?.data?.message || "Unable to update offer",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (offerId) => {
    setBusy(true);
    setError("");
    try {
      await axios.delete(`${apiBaseUrl}/trades/offers/${offerId}`, { headers });
      await refresh();
      setNotice("Trade offer cancelled");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to cancel offer",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card team-market">
      <div className="section-heading market-heading">
        <div>
          <span className="eyebrow">THE TRADE DESK</span>
          <h2>
            <ArrowLeftRight size={19} /> Player exchange
          </h2>
          <p className="muted">
            One player for one player. Team purse and scoring stay unchanged.
          </p>
        </div>
        <span
          className={`trade-window-state ${windowOpen ? "open" : "closed"}`}
        >
          <i /> {windowOpen ? "WINDOW OPEN" : "WINDOW CLOSED"}
        </span>
      </div>

      {windowOpen && (
        <form className="trade-offer-form" onSubmit={sendOffer}>
          <label>
            <span>TRADE WITH</span>
            <select
              required
              value={targetTeamId}
              onChange={(event) => {
                setTargetTeamId(event.target.value);
                setRequestedPlayerId("");
              }}
            >
              <option value="">Choose team</option>
              {targetTeams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>OFFER FROM YOUR SQUAD</span>
            <select
              required
              value={offeredPlayerId}
              onChange={(event) => setOfferedPlayerId(event.target.value)}
            >
              <option value="">Choose your player</option>
              {ownRoster.map((player) => (
                <option key={player.player_id} value={player.player_id}>
                  {player.display_name || player.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>REQUEST FROM THEIR SQUAD</span>
            <select
              required
              value={requestedPlayerId}
              onChange={(event) => setRequestedPlayerId(event.target.value)}
              disabled={!targetTeamId || !targetTeam?.players?.length}
            >
              <option value="">Choose their player</option>
              {targetTeam?.players?.map((player) => (
                <option key={player.player_id} value={player.player_id}>
                  {player.display_name || player.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={busy || !ownRoster.length || !targetTeam?.players?.length}
          >
            {busy ? "Sending" : "Send offer"} <ArrowLeftRight size={15} />
          </button>
        </form>
      )}

      {(error || notice) && (
        <p
          className={error ? "form-error" : "trade-notice"}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </p>
      )}

      <div className="trade-offers-list">
        {offers.length === 0 ? (
          <p className="trade-empty">
            {windowOpen
              ? "No open offers. Make the first move."
              : "Trade desk is waiting for the admin to open the window."}
          </p>
        ) : (
          offers.map((offer) => {
            const incoming = offer.to_team_id === teamId;
            return (
              <article className="trade-offer-row" key={offer.id}>
                <div className="trade-offer-parties">
                  <strong>
                    {incoming ? offer.from_team_name : offer.to_team_name}
                  </strong>
                  <span>{incoming ? "offers" : "requested from"}</span>
                </div>
                <div className="trade-player-pair">
                  <div>
                    <PlayerImage
                      src={
                        incoming
                          ? offer.offered_player_photo
                          : offer.requested_player_photo
                      }
                      alt=""
                    />
                    <span>
                      {incoming
                        ? offer.offered_player_name
                        : offer.requested_player_name}
                    </span>
                  </div>
                  <ArrowLeftRight size={15} />
                  <div>
                    <PlayerImage
                      src={
                        incoming
                          ? offer.requested_player_photo
                          : offer.offered_player_photo
                      }
                      alt=""
                    />
                    <span>
                      {incoming
                        ? offer.requested_player_name
                        : offer.offered_player_name}
                    </span>
                  </div>
                </div>
                <span className={`trade-status ${offer.status.toLowerCase()}`}>
                  <Clock3 size={12} /> {offer.status}
                </span>
                {offer.status === "PENDING" && (
                  <div className="trade-actions">
                    {incoming ? (
                      <>
                        <button
                          className="icon-action accept-action"
                          type="button"
                          title="Accept trade"
                          aria-label="Accept trade"
                          disabled={busy || !windowOpen}
                          onClick={() => respond(offer.id, true)}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="icon-action remove-action"
                          type="button"
                          title="Decline trade"
                          aria-label="Decline trade"
                          disabled={busy || !windowOpen}
                          onClick={() => respond(offer.id, false)}
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="icon-action remove-action"
                        type="button"
                        title="Cancel offer"
                        aria-label="Cancel offer"
                        disabled={busy}
                        onClick={() => cancel(offer.id)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
