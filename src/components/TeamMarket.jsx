import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeftRight, Banknote, Check, Clock3, X } from "lucide-react";
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
  const [market, setMarket] = useState({ listings: [], requests: [] });
  const [targetTeamId, setTargetTeamId] = useState("");
  const [offeredPlayerId, setOfferedPlayerId] = useState("");
  const [requestedPlayerId, setRequestedPlayerId] = useState("");
  const [cashAmount, setCashAmount] = useState("0");
  const [listingPlayerId, setListingPlayerId] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const headers = { Authorization: `Bearer ${token}` };
  const targetTeams = teams.filter((team) => team.team_id !== teamId);
  const targetTeam = targetTeams.find((team) => team.team_id === targetTeamId);

  const refresh = async () => {
    const [windowResponse, offerResponse, marketResponse] = await Promise.all([
      axios.get(`${apiBaseUrl}/trades/window`, { headers }),
      axios.get(`${apiBaseUrl}/trades/offers`, { headers }),
      axios.get(`${apiBaseUrl}/trades/market`, { headers }),
    ]);
    setWindowOpen(windowResponse.data.open);
    setOffers(offerResponse.data.offers);
    setMarket(marketResponse.data.market);
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
    socket.on("trade_market_updated", onTradeUpdate);
    socket.on("trade_window_updated", onWindowUpdate);
    return () => {
      socket.off("trade_offer_updated", onTradeUpdate);
      socket.off("trade_market_updated", onTradeUpdate);
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
        {
          toTeamId: targetTeamId,
          offeredPlayerId,
          requestedPlayerId,
          cashAmount: Number(cashAmount || 0),
        },
        { headers },
      );
      await refresh();
      setNotice("Trade offer sent");
      setOfferedPlayerId("");
      setRequestedPlayerId("");
      setCashAmount("0");
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

  const createListing = async (event) => {
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
        `${apiBaseUrl}/trades/market/listings`,
        { playerId: listingPlayerId, askingPrice: Number(askingPrice) },
        { headers },
      );
      await refresh();
      setListingPlayerId("");
      setAskingPrice("");
      setNotice("Player listed for sale");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to list player");
    } finally {
      setBusy(false);
    }
  };

  const cancelListing = async (listingId) => {
    setBusy(true);
    setError("");
    try {
      await axios.delete(`${apiBaseUrl}/trades/market/listings/${listingId}`, {
        headers,
      });
      await refresh();
      setNotice("Listing cancelled");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to cancel listing",
      );
    } finally {
      setBusy(false);
    }
  };

  const requestPurchase = async (listingId) => {
    if (!isTeamApproved) {
      onApprovalRequired?.();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await axios.post(
        `${apiBaseUrl}/trades/market/listings/${listingId}/requests`,
        {},
        { headers },
      );
      await refresh();
      setNotice("Purchase request sent to seller");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to request purchase",
      );
    } finally {
      setBusy(false);
    }
  };

  const respondToPurchase = async (requestId, accepted) => {
    setBusy(true);
    setError("");
    try {
      await axios.post(
        `${apiBaseUrl}/trades/market/requests/${requestId}/respond`,
        { accepted },
        { headers },
      );
      await refresh();
      setNotice(accepted ? "Player sold" : "Purchase request declined");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to respond to purchase request",
      );
    } finally {
      setBusy(false);
    }
  };

  const acknowledge = async (type, id) => {
    setBusy(true);
    setError("");
    try {
      const path =
        type === "purchase"
          ? `/trades/market/requests/${id}/acknowledge`
          : `/trades/offers/${id}/acknowledge`;
      await axios.post(`${apiBaseUrl}${path}`, {}, { headers });
      await refresh();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to close notification",
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelPurchaseRequest = async (requestId) => {
    setBusy(true);
    setError("");
    try {
      await axios.delete(`${apiBaseUrl}/trades/market/requests/${requestId}`, {
        headers,
      });
      await refresh();
      setNotice("Purchase request cancelled");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to cancel purchase request",
      );
    } finally {
      setBusy(false);
    }
  };

  const sellerQueue = [
    ...offers
      .filter(
        (offer) => offer.to_team_id === teamId && offer.status === "PENDING",
      )
      .map((offer) => ({ ...offer, kind: "swap" })),
    ...market.requests
      .filter(
        (request) =>
          request.seller_team_id === teamId && request.status === "PENDING",
      )
      .map((request) => ({ ...request, kind: "purchase" })),
  ].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at),
  );
  const buyerQueue = [
    ...offers
      .filter(
        (offer) =>
          offer.from_team_id === teamId && !offer.buyer_acknowledged_at,
      )
      .map((offer) => ({ ...offer, kind: "swap" })),
    ...market.requests
      .filter(
        (request) =>
          request.buyer_team_id === teamId && !request.buyer_acknowledged_at,
      )
      .map((request) => ({ ...request, kind: "purchase" })),
  ].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at),
  );
  const activeSellerRequest = windowOpen ? sellerQueue[0] : null;
  const activeBuyerNotice = activeSellerRequest ? null : buyerQueue[0];

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
          <label>
            <span>OPTIONAL CASH OFFER · ₹ CR</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashAmount}
              onChange={(event) => setCashAmount(event.target.value)}
            />
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

      {windowOpen && (
        <div className="player-market">
          <div className="player-market-heading">
            <div>
              <span className="eyebrow">SELL A PLAYER</span>
              <h3>Set your asking price</h3>
            </div>
            <Banknote size={18} aria-hidden="true" />
          </div>
          <form className="player-listing-form" onSubmit={createListing}>
            <label>
              <span>YOUR PLAYER</span>
              <select
                required
                value={listingPlayerId}
                onChange={(event) => setListingPlayerId(event.target.value)}
              >
                <option value="">Choose player</option>
                {ownRoster
                  .filter(
                    (player) =>
                      !market.listings.some(
                        (listing) =>
                          listing.seller_team_id === teamId &&
                          listing.player_id === player.player_id,
                      ),
                  )
                  .map((player) => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.display_name || player.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>ASKING PRICE · ₹ CR</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={askingPrice}
                onChange={(event) => setAskingPrice(event.target.value)}
              />
            </label>
            <button
              className="btn secondary"
              type="submit"
              disabled={busy || !ownRoster.length || !askingPrice}
            >
              List player
            </button>
          </form>

          <div className="player-market-listings">
            <div className="player-market-heading">
              <div>
                <span className="eyebrow">OPEN LISTINGS</span>
                <h3>Player market</h3>
              </div>
            </div>
            {market.listings.length === 0 ? (
              <p className="trade-empty">No players are listed for sale.</p>
            ) : (
              market.listings.map((listing) => {
                const isOwnListing = listing.seller_team_id === teamId;
                const pendingRequest = market.requests.some(
                  (request) =>
                    request.listing_id === listing.id &&
                    request.buyer_team_id === teamId &&
                    request.status === "PENDING",
                );
                return (
                  <article className="player-listing-row" key={listing.id}>
                    <PlayerImage src={listing.player_photo} alt="" />
                    <div className="player-listing-details">
                      <strong>{listing.player_name}</strong>
                      <span>
                        {isOwnListing
                          ? "Your listing"
                          : listing.seller_team_name}
                      </span>
                    </div>
                    <strong className="player-listing-price">
                      ₹{Number(listing.asking_price).toFixed(2)} Cr
                    </strong>
                    {isOwnListing ? (
                      <button
                        className="icon-action remove-action"
                        type="button"
                        aria-label={`Cancel listing for ${listing.player_name}`}
                        title="Cancel listing"
                        disabled={busy}
                        onClick={() => cancelListing(listing.id)}
                      >
                        <X size={15} />
                      </button>
                    ) : (
                      <button
                        className="btn primary"
                        type="button"
                        disabled={busy || pendingRequest}
                        onClick={() => requestPurchase(listing.id)}
                      >
                        {pendingRequest ? "Requested" : "Request to buy"}
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
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
                {offer.cash_amount > 0 && (
                  <span className="trade-cash-amount">
                    + ₹{Number(offer.cash_amount).toFixed(2)} Cr
                  </span>
                )}
                {offer.status === "PENDING" && !incoming && (
                  <div className="trade-actions">
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
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {activeSellerRequest && (
        <div className="trade-modal-backdrop">
          <section
            className="trade-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-trade-title"
          >
            <span className="eyebrow">INCOMING TRADE REQUEST</span>
            <h3 id="seller-trade-title">
              {activeSellerRequest.kind === "purchase"
                ? `Purchase request · ${activeSellerRequest.player_name}`
                : "Player exchange request"}
            </h3>
            {activeSellerRequest.kind === "purchase" ? (
              <p>
                <strong>{activeSellerRequest.buyer_team_name}</strong> wants to
                buy this player for ₹
                {Number(activeSellerRequest.asking_price).toFixed(2)} Cr.
              </p>
            ) : (
              <>
                <p>
                  <strong>{activeSellerRequest.from_team_name}</strong> offers{" "}
                  {activeSellerRequest.offered_player_name} for your{" "}
                  {activeSellerRequest.requested_player_name}.
                </p>
                {Number(activeSellerRequest.cash_amount) > 0 && (
                  <p>
                    Additional offer: ₹
                    {Number(activeSellerRequest.cash_amount).toFixed(2)} Cr.
                  </p>
                )}
              </>
            )}
            <div className="trade-request-actions">
              <button
                className="btn secondary"
                type="button"
                disabled={busy || !windowOpen}
                onClick={() =>
                  activeSellerRequest.kind === "purchase"
                    ? respondToPurchase(activeSellerRequest.id, false)
                    : respond(activeSellerRequest.id, false)
                }
              >
                Decline
              </button>
              <button
                className="btn primary"
                type="button"
                disabled={busy || !windowOpen}
                onClick={() =>
                  activeSellerRequest.kind === "purchase"
                    ? respondToPurchase(activeSellerRequest.id, true)
                    : respond(activeSellerRequest.id, true)
                }
              >
                {busy ? "Processing..." : "Accept request"}
                <Check size={15} />
              </button>
            </div>
            <small>
              {sellerQueue.length} request{sellerQueue.length === 1 ? "" : "s"}{" "}
              in your queue
            </small>
          </section>
        </div>
      )}

      {activeBuyerNotice && (
        <div className="trade-modal-backdrop">
          <section
            className="trade-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="buyer-trade-title"
          >
            <span className="eyebrow">TRADE REQUEST UPDATE</span>
            <h3 id="buyer-trade-title">
              {activeBuyerNotice.kind === "purchase"
                ? `${activeBuyerNotice.player_name} · ${activeBuyerNotice.status}`
                : `Player exchange · ${activeBuyerNotice.status}`}
            </h3>
            {activeBuyerNotice.kind === "purchase" ? (
              <p>
                Your request to buy {activeBuyerNotice.player_name} from{" "}
                {activeBuyerNotice.seller_team_name} for ₹
                {Number(activeBuyerNotice.asking_price).toFixed(2)} Cr is{" "}
                {activeBuyerNotice.status.toLowerCase()}.
              </p>
            ) : (
              <p>
                Your offer of {activeBuyerNotice.offered_player_name} for{" "}
                {activeBuyerNotice.requested_player_name} is{" "}
                {activeBuyerNotice.status.toLowerCase()}.
                {Number(activeBuyerNotice.cash_amount) > 0 && (
                  <>
                    {" "}
                    Cash included: ₹
                    {Number(activeBuyerNotice.cash_amount).toFixed(2)} Cr.
                  </>
                )}
              </p>
            )}
            <button
              className="btn primary"
              type="button"
              disabled={busy}
              onClick={() =>
                acknowledge(activeBuyerNotice.kind, activeBuyerNotice.id)
              }
            >
              {buyerQueue.length > 1 ? "Next request" : "Got it"}
              <Check size={15} />
            </button>
            {activeBuyerNotice.kind === "purchase" &&
              activeBuyerNotice.status === "PENDING" && (
                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => cancelPurchaseRequest(activeBuyerNotice.id)}
                >
                  Cancel request
                </button>
              )}
            <small>
              {buyerQueue.length} update{buyerQueue.length === 1 ? "" : "s"} in
              your queue
            </small>
          </section>
        </div>
      )}
    </section>
  );
}
