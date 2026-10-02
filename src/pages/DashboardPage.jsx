import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import PlayerImage from "../components/PlayerImage";
import { ArrowRight, ClipboardList, Shield, Zap } from "lucide-react";
import TeamMarket from "../components/TeamMarket";
import TeamRosterBoard from "../components/TeamRosterBoard";
import { AuctionVoiceListener } from "../components/AuctionAudio";
import PaymentApprovalModal from "../components/PaymentApprovalModal";
import TeamCaptainChat from "../components/TeamCaptainChat";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api";

export default function DashboardPage() {
  const { user, token, loading, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [powers, setPowers] = useState(null);
  const [teamRosters, setTeamRosters] = useState([]);
  const [powerBusy, setPowerBusy] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState("");
  const [bidPending, setBidPending] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const teamPaymentApproved = myTeam?.registration_status === "CONFIRMED";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const requests = [
      axios.get(`${apiBaseUrl}/auction/state`, { headers }),
      axios.get(`${apiBaseUrl}/teams/me`, { headers }),
      axios.get(`${apiBaseUrl}/teams/me/assignment`, { headers }),
    ];
    if (user?.role === "PARTICIPANT") {
      requests.push(axios.get(`${apiBaseUrl}/teams/rosters`, { headers }));
    }
    Promise.all(requests)
      .then(
        ([
          auctionResponse,
          teamResponse,
          assignmentResponse,
          rosterResponse,
        ]) => {
          setAuction(auctionResponse.data.state);
          setWallet(teamResponse.data.wallet);
          setAssignment(assignmentResponse.data.assignment);
          setMyTeam(teamResponse.data.team);
          setMembers(teamResponse.data.members || []);
          setPowers(teamResponse.data.powers);
          if (rosterResponse) setTeamRosters(rosterResponse.data.teams);
        },
      )
      .catch(() => setBidError("Unable to load live auction data"));
  }, [token, user?.role]);

  useEffect(() => {
    if (!socket) return;
    const onAuctionState = (payload) => {
      if (payload?.state) setAuction(payload.state);
    };
    const onBidRejected = (payload) => {
      setBidPending(false);
      if (payload?.code === "TEAM_PAYMENT_NOT_APPROVED") {
        setApprovalModalOpen(true);
      } else {
        setBidError(payload?.message || "Bid was rejected");
      }
    };
    const onObjectiveRevealed = (payload) => setAssignment(payload);
    const onSuperSteal = (payload) => {
      if (payload?.teamId !== myTeam?.id) return;
      setPowers((current) => ({
        ...current,
        superStealUses: payload.superStealUses,
        superStealRemaining: payload.superStealRemaining,
        superStealUsed: payload.superStealRemaining === 0,
      }));
    };
    const onRostersUpdated = () => {
      const headers = { Authorization: `Bearer ${token}` };
      Promise.all([
        axios.get(`${apiBaseUrl}/teams/me`, { headers }),
        axios.get(`${apiBaseUrl}/teams/rosters`, { headers }),
      ])
        .then(([teamResponse, rosterResponse]) => {
          setWallet(teamResponse.data.wallet);
          setMyTeam(teamResponse.data.team);
          setMembers(teamResponse.data.members || []);
          setPowers(teamResponse.data.powers);
          setTeamRosters(rosterResponse.data.teams || []);
        })
        .catch(() => setBidError("Unable to refresh live team data"));
    };
    socket.on("auction_state", onAuctionState);
    socket.on("bid_rejected", onBidRejected);
    socket.on("objective_revealed", onObjectiveRevealed);
    socket.on("super_steal_claimed", onSuperSteal);
    socket.on("team_rosters_updated", onRostersUpdated);
    socket.on("team_registration_updated", onRostersUpdated);
    socket.on("connect", onRostersUpdated);
    return () => {
      socket.off("auction_state", onAuctionState);
      socket.off("bid_rejected", onBidRejected);
      socket.off("objective_revealed", onObjectiveRevealed);
      socket.off("super_steal_claimed", onSuperSteal);
      socket.off("team_rosters_updated", onRostersUpdated);
      socket.off("team_registration_updated", onRostersUpdated);
      socket.off("connect", onRostersUpdated);
    };
  }, [socket, myTeam?.id, token]);

  useEffect(() => {
    if (!auction?.current_player_id) return;
    const minimum = auction.highest_bidder_team_id
      ? Number(auction.current_bid) + Number(auction.bid_increment)
      : Number(auction.player_base_price || 0);
    setBidAmount(minimum.toFixed(2));
  }, [
    auction?.current_player_id,
    auction?.current_bid,
    auction?.highest_bidder_team_id,
    auction?.bid_increment,
    auction?.player_base_price,
  ]);

  const placeBid = () => {
    if (!teamPaymentApproved) {
      setApprovalModalOpen(true);
      return;
    }
    if (!socket?.connected || !auction?.current_player_id || bidPending) {
      setBidError("Live auction connection is not ready");
      return;
    }
    setBidPending(true);
    setBidError("");
    socket.emit(
      "place_bid",
      { playerId: auction.current_player_id, amount: Number(bidAmount) },
      (result) => {
        setBidPending(false);
        if (!result?.success) {
          if (result?.code === "TEAM_PAYMENT_NOT_APPROVED") {
            setApprovalModalOpen(true);
          } else {
            setBidError(result?.message || "Bid was rejected");
          }
        }
      },
    );
  };

  const useSuperSteal = async () => {
    if (!teamPaymentApproved) {
      setApprovalModalOpen(true);
      return;
    }
    if (powerBusy) return;
    setPowerBusy(true);
    setBidError("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/auction/super-steal`,
        { playerId: auction.current_player_id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAuction(response.data.state);
      setPowers((current) => ({
        ...current,
        superStealUses: response.data.result.superStealUses,
        superStealRemaining: response.data.result.superStealRemaining,
        superStealUsed: response.data.result.superStealRemaining === 0,
      }));
      setBidError("");
    } catch (requestError) {
      if (requestError.response?.data?.code === "TEAM_PAYMENT_NOT_APPROVED") {
        setApprovalModalOpen(true);
      } else {
        setBidError(
          requestError.response?.data?.message || "Power activation failed",
        );
      }
    } finally {
      setPowerBusy(false);
    }
  };

  if (loading)
    return (
      <div className="auth-layout">
        <div className="card auth-box">
          <h2>Loading dashboard...</h2>
        </div>
      </div>
    );
  if (!user) return null;

  const status = auction?.status || "LOADING";
  const minBid = auction?.highest_bidder_team_id
    ? Number(auction.current_bid) + Number(auction.bid_increment)
    : Number(auction?.player_base_price || 0);
  const canBid =
    user.role === "PARTICIPANT" &&
    teamPaymentApproved &&
    teamPaymentApproved &&
    status === "BIDDING" &&
    Boolean(auction?.current_player_id) &&
    !bidPending;
  const stealThreshold = Number(powers?.threshold ?? Number.POSITIVE_INFINITY);
  const superStealRemaining = Number(powers?.superStealRemaining || 0);
  const currentAuctionBid = Number(auction?.current_bid || 0);
  const teamAlreadyLeads = auction?.highest_bidder_team_id === myTeam?.id;
  const canAffordSuperSteal =
    currentAuctionBid <= Number(wallet?.available_purse || 0);
  const canSuperSteal =
    user.role === "PARTICIPANT" &&
    Boolean(powers) &&
    status === "BIDDING" &&
    currentAuctionBid >= stealThreshold &&
    !teamAlreadyLeads &&
    canAffordSuperSteal &&
    superStealRemaining > 0;
  return (
    <div className="app-shell">
      {approvalModalOpen && (
        <PaymentApprovalModal
          onClose={() => setApprovalModalOpen(false)}
          onViewPayment={() => {
            setApprovalModalOpen(false);
            navigate("/team-registration");
          }}
        />
      )}
      <div className="container dashboard-grid participant-layout">
        <aside className="card sidebar participant-sidebar">
          <div className="brand-lockup">
            <img
              className="brand-mark"
              src="/rotaract-logo.jpeg"
              alt="Rotaract Club of ACCET"
            />
            <div>
              <strong>ROTARACT</strong>
              <span>IPL AUCTION</span>
            </div>
          </div>
          <div className="participant-profile">
            <span className="eyebrow">TEAM ACCESS</span>
            <strong>{user.name}</strong>
            <span className="role-chip">{user.role.replaceAll("_", " ")}</span>
          </div>
          {user.role === "PARTICIPANT" && (
            <>
              <button
                className="btn secondary my-team-nav"
                type="button"
                onClick={() => navigate("/team")}
              >
                My Team <ArrowRight size={15} />
              </button>
              <button
                className="btn primary my-team-nav"
                type="button"
                onClick={() => navigate("/team-registration")}
              >
                Team payment & invite code <ClipboardList size={15} />
              </button>
            </>
          )}
          {["SUPER_ADMIN", "AUCTION_ADMIN"].includes(user.role) && (
            <button
              className="btn secondary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => navigate("/admin")}
            >
              Admin control room
            </button>
          )}
          {user.role === "VIEWER" && (
            <button
              className="btn secondary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => navigate("/viewer")}
            >
              Live broadcast
            </button>
          )}
          <button
            className="btn primary"
            style={{ width: "100%", marginTop: 18 }}
            onClick={logout}
          >
            Logout
          </button>
        </aside>

        <main className="main-panel participant-main">
          <section className="participant-masthead">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> IPL LIVE AUCTION
              </div>
              <h1>
                The bidding
                <br />
                <span>floor is open.</span>
              </h1>
            </div>
            <div className="participant-masthead-status">
              <span>{status.replaceAll("_", " ")}</span>
              <strong>{status === "BIDDING" ? "BIDS OPEN" : "AUCTION"}</strong>
            </div>
            <div className="participant-masthead-stripes" aria-hidden="true" />
          </section>

          {user.role === "PARTICIPANT" &&
            members.some((member) => member.user_id === user.id && member.is_leader) && (
              <TeamCaptainChat socket={socket} teamName={myTeam?.name} />
            )}

          {user.role === "PARTICIPANT" && (
            <AuctionVoiceListener socket={socket} />
          )}

          {user.role === "PARTICIPANT" && myTeam && !teamPaymentApproved && (
            <section className="card team-approval-notice" role="status">
              <div>
                <span className="eyebrow">AUCTION ACCESS</span>
                <strong>Payment approval is pending</strong>
                <span className="muted">
                  You can follow the auction now. Bidding unlocks once an admin
                  approves the team.
                </span>
              </div>
              <button
                className="btn secondary"
                type="button"
                onClick={() => navigate("/team-registration")}
              >
                Payment status
              </button>
            </section>
          )}

          <div className="grid-4">
            <div className="card stat-card">
              <h3>Auction status</h3>
              <strong>{status.replaceAll("_", " ")}</strong>
            </div>
            <div className="card stat-card">
              <h3>My purse</h3>
              <strong>
                ₹{Number(wallet?.available_purse || 0).toFixed(2)} Cr
              </strong>
            </div>
            <div className="card stat-card">
              <h3>Bid sequence</h3>
              <strong>{auction?.current_sequence ?? 0}</strong>
            </div>
            <div className="card stat-card">
              <h3>Current bid</h3>
              <strong>
                ₹{Number(auction?.current_bid || 0).toFixed(2)} Cr
              </strong>
            </div>
          </div>

          {assignment?.status === "REVEALED" && (
            <section className="card" style={{ padding: 18 }}>
              <div className="muted">Your revealed target</div>
              <h2 style={{ margin: "8px 0 0" }}>
                {assignment.franchiseName || assignment.franchise_name}
              </h2>
            </section>
          )}

          <div className="card live-player-card" style={{ padding: 18 }}>
            <div
              className="live-player-heading"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className="live-player-identity">
                {auction?.current_player_id && (
                  <PlayerImage
                    className="live-player-portrait"
                    src={auction.player_photo}
                    alt={
                      auction.player_display_name ||
                      auction.player_name ||
                      "Current player"
                    }
                  />
                )}
                <div>
                  <div className="badge gold">Current player</div>
                  <h2 style={{ margin: "10px 0 6px" }}>
                    {auction?.player_display_name ||
                      auction?.player_name ||
                      "Waiting for next player"}
                  </h2>
                  <div className="muted">
                    {auction?.player_role || "-"}
                    {auction?.player_country
                      ? ` · ${auction.player_country}`
                      : ""}
                    {auction?.player_base_price
                      ? ` · Base price ₹${Number(auction.player_base_price).toFixed(2)} Cr`
                      : ""}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid-2" style={{ marginTop: 20 }}>
              <div className="bid-panel">
                <div className="muted">Current bid</div>
                <h3 style={{ fontSize: 28, margin: "8px 0" }}>
                  ₹{Number(auction?.current_bid || 0).toFixed(2)} Cr
                </h3>
                <div className="muted">
                  Highest bidder: {auction?.highest_bidder_team_name || "None"}
                </div>
              </div>
              <div className="bid-panel bid-entry-panel">
                <label className="muted" htmlFor="bid-amount">
                  Your bid (Cr)
                </label>
                <input
                  id="bid-amount"
                  type="number"
                  min={minBid}
                  step={auction?.bid_increment || 1}
                  value={bidAmount}
                  onChange={(event) => setBidAmount(event.target.value)}
                  disabled={!canBid}
                  style={{
                    display: "block",
                    width: "100%",
                    margin: "8px 0 12px",
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    background: "var(--panel-alt)",
                    color: "var(--text)",
                  }}
                />
                <button
                  className="btn primary"
                  style={{ width: "100%" }}
                  disabled={
                    status !== "BIDDING" ||
                    !auction?.current_player_id ||
                    bidPending ||
                    (teamPaymentApproved && Number(bidAmount) < minBid)
                  }
                  onClick={placeBid}
                >
                  {!teamPaymentApproved
                    ? "Payment approval required"
                    : bidPending
                      ? "Submitting..."
                      : "Place bid"}
                </button>
                {bidError && (
                  <p
                    className="muted"
                    role="alert"
                    style={{ color: "var(--danger)" }}
                  >
                    {bidError}
                  </p>
                )}
              </div>
              {user.role === "PARTICIPANT" && (
                <div className="power-actions">
                  <button
                    className="power-button super-steal-button"
                    type="button"
                    disabled={
                      teamPaymentApproved && (!canSuperSteal || powerBusy)
                    }
                    onClick={useSuperSteal}
                  >
                    <span className="power-icon">
                      <Zap size={18} />
                    </span>
                    <span>
                      <strong>Super Steal</strong>
                      <small>
                        {!powers
                          ? "Checking eligibility..."
                          : superStealRemaining === 0
                            ? "NO USES LEFT THIS AUCTION"
                            : status !== "BIDDING"
                              ? "AVAILABLE WHILE A PLAYER IS ON THE BLOCK"
                              : teamAlreadyLeads
                                ? "YOUR TEAM ALREADY LEADS THIS PLAYER"
                                : !canAffordSuperSteal
                                  ? "REMAINING PURSE IS BELOW THE CURRENT BID"
                                  : currentAuctionBid < stealThreshold
                                    ? `${superStealRemaining} USE${superStealRemaining === 1 ? "" : "S"} LEFT · UNLOCKS AT ₹${stealThreshold.toFixed(2)} Cr`
                                    : `${superStealRemaining} USE${superStealRemaining === 1 ? "" : "S"} LEFT · AVAILABLE`}
                      </small>
                    </span>
                    <Shield size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {user.role === "PARTICIPANT" && myTeam && (
            <>
              <section className="team-members-strip">
                <div>
                  <span className="eyebrow">YOUR TEAM</span>
                  <strong>{myTeam.name}</strong>
                </div>
                <span className="member-capacity">
                  {members.length}/5 registered members can bid
                </span>
                <div className="team-member-list">
                  {members.map((member) => (
                    <span key={member.id}>
                      {member.name}
                      {member.is_leader ? " · CAPTAIN" : ""}
                    </span>
                  ))}
                </div>
              </section>
              <TeamRosterBoard teams={teamRosters} ownTeamId={myTeam.id} />
              <TeamMarket
                token={token}
                teamId={myTeam.id}
                teams={teamRosters}
                isTeamApproved={teamPaymentApproved}
                onApprovalRequired={() => setApprovalModalOpen(true)}
                ownRoster={
                  teamRosters.find((team) => team.team_id === myTeam.id)
                    ?.players || []
                }
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
