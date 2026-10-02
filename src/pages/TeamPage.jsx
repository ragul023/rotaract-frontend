import { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  LockKeyhole,
  Plus,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import PlayerImage from "../components/PlayerImage";
import TeamMarket from "../components/TeamMarket";
import PaymentApprovalModal from "../components/PaymentApprovalModal";
import "../styles/team.css";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api";

export default function TeamPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [members, setMembers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyingInviteCode, setCopyingInviteCode] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedXI, setSelectedXI] = useState([]);
  const [savingXI, setSavingXI] = useState(false);
  const [auctionCompleted, setAuctionCompleted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!token || user?.role !== "PARTICIPANT") {
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${apiBaseUrl}/teams/me`, { headers }),
      axios.get(`${apiBaseUrl}/teams/me/assignment`, { headers }),
      axios.get(`${apiBaseUrl}/teams/rosters`, { headers }),
      axios.get(`${apiBaseUrl}/auction/state`, { headers }),
    ])
      .then(
        ([
          teamResponse,
          assignmentResponse,
          leagueResponse,
          auctionResponse,
        ]) => {
          setTeam(teamResponse.data.team);
          setWallet(teamResponse.data.wallet);
          setMembers(teamResponse.data.members || []);
          setPlayers(teamResponse.data.players || []);
          setSelectedXI(
            (teamResponse.data.players || [])
              .filter((player) => player.is_playing_xi)
              .map((player) => player.player_id),
          );
          setAssignment(assignmentResponse.data.assignment);
          setLeagueTeams(leagueResponse.data.teams || []);
          setAuctionCompleted(
            ["AUCTION_COMPLETED", "FINISHED"].includes(
              auctionResponse.data.state?.status,
            ),
          );
        },
      )
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message || "Unable to load your team",
        );
      })
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  useEffect(() => {
    if (!socket || !token || user?.role !== "PARTICIPANT") return undefined;

    const refreshTeam = () => {
      const headers = { Authorization: `Bearer ${token}` };
      Promise.all([
        axios.get(`${apiBaseUrl}/teams/me`, { headers }),
        axios.get(`${apiBaseUrl}/teams/rosters`, { headers }),
        axios.get(`${apiBaseUrl}/auction/state`, { headers }),
      ])
        .then(([teamResponse, leagueResponse, auctionResponse]) => {
          setTeam(teamResponse.data.team);
          setWallet(teamResponse.data.wallet);
          setMembers(teamResponse.data.members || []);
          setPlayers(teamResponse.data.players || []);
          setSelectedXI(
            (teamResponse.data.players || [])
              .filter((player) => player.is_playing_xi)
              .map((player) => player.player_id),
          );
          setLeagueTeams(leagueResponse.data.teams || []);
          setAuctionCompleted(
            ["AUCTION_COMPLETED", "FINISHED"].includes(
              auctionResponse.data.state?.status,
            ),
          );
        })
        .catch(() => setError("Unable to refresh live team data"));
    };

    socket.on("team_rosters_updated", refreshTeam);
    socket.on("team_registration_updated", refreshTeam);
    socket.on("connect", refreshTeam);
    const refreshAuctionStatus = ({ state }) => {
      setAuctionCompleted(
        ["AUCTION_COMPLETED", "FINISHED"].includes(state?.status),
      );
    };
    socket.on("auction_state", refreshAuctionStatus);
    return () => {
      socket.off("team_rosters_updated", refreshTeam);
      socket.off("team_registration_updated", refreshTeam);
      socket.off("connect", refreshTeam);
      socket.off("auction_state", refreshAuctionStatus);
    };
  }, [socket, token, user?.role]);

  const revealed = assignment?.status === "REVEALED";
  const teamPaymentApproved = team?.registration_status === "CONFIRMED";
  const matchingPlayers = revealed
    ? players.filter(
        (player) => player.franchise_name === assignment.franchise_name,
      )
    : [];
  const hasSavedPlayingXI = players.some((player) => player.is_playing_xi);
  const playingXILocked = auctionCompleted || team.playing_xi_locked;

  const copyInviteCode = async () => {
    if (copyingInviteCode) return;
    setCopyingInviteCode(true);
    try {
      await navigator.clipboard.writeText(team.code);
      setCopied(true);
    } catch {
      setError("Clipboard access is unavailable in this browser");
    } finally {
      setCopyingInviteCode(false);
    }
  };

  const togglePlayingXI = (playerId) => {
    setSelectedXI((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : current.length < 11
          ? [...current, playerId]
          : current,
    );
  };

  const fixPlayingXI = async () => {
    setSavingXI(true);
    setError("");
    try {
      await axios.put(
        `${apiBaseUrl}/teams/me/playing-xi`,
        { playerIds: selectedXI },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPlayers((current) =>
        current.map((player) => ({
          ...player,
          is_playing_xi: selectedXI.includes(player.player_id),
        })),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to fix your playing XI",
      );
    } finally {
      setSavingXI(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="auth-layout">
        <div className="card auth-box">
          <h2>Loading team room...</h2>
        </div>
      </div>
    );
  }
  if (!user || user.role !== "PARTICIPANT") return null;

  if (!team) {
    return (
      <div className="app-shell">
        <main className="container team-empty-state">
          <span className="eyebrow">TEAM REGISTRATION</span>
          <h1>You're not on a squad yet.</h1>
          <p className="muted">
            Create a team as captain or join with the invite code from your team
            leader.
          </p>
          <div className="team-empty-actions">
            <button
              className="btn primary"
              onClick={() => navigate("/register")}
            >
              Register or join a team <ArrowRight size={16} />
            </button>
            <button
              className="btn secondary"
              onClick={() => navigate("/dashboard")}
            >
              Back to auction
            </button>
          </div>
        </main>
      </div>
    );
  }

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
      <main className="container team-management-page">
        <header className="team-management-masthead">
          <button
            className="team-back-button"
            type="button"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to live auction"
          >
            <ArrowLeft size={17} /> <span>LIVE AUCTION</span>
          </button>
          <div className="team-masthead-content">
            <div>
              <span className="eyebrow">THE SQUAD ROOM</span>
              <h1>
                Team
                <br />
                <span>management</span>
              </h1>
              <p>
                {team.name} · {members.length} of 5 members
              </p>
            </div>
            {team.code ? (
              <div className="team-invite-card">
                <span>TEAM INVITE CODE</span>
                <strong>{team.code}</strong>
                <button
                  type="button"
                  className="icon-action"
                  disabled={copyingInviteCode}
                  onClick={copyInviteCode}
                  aria-label="Copy invite code"
                  title={copyingInviteCode ? "Copying..." : "Copy invite code"}
                >
                  <Copy size={16} aria-hidden="true" />
                </button>
                {copyingInviteCode ? (
                  <small role="status">COPYING...</small>
                ) : copied ? (
                  <small role="status">COPIED</small>
                ) : null}
              </div>
            ) : (
              <div className="team-invite-card">
                <span>TEAM REGISTRATION</span>
                <strong>Payment approval required</strong>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => navigate("/team-registration")}
                >
                  Complete payment
                </button>
              </div>
            )}
          </div>
          <div className="team-masthead-graphic" aria-hidden="true">
            <span>XI</span>
          </div>
        </header>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <section className="team-overview-stats">
          <article>
            <span>AVAILABLE PURSE</span>
            <strong>
              ₹{Number(wallet?.available_purse || 0).toFixed(2)}
              <small> Cr</small>
            </strong>
          </article>
          <article>
            <span>PLAYERS BOUGHT</span>
            <strong>{players.length.toString().padStart(2, "0")}</strong>
          </article>
          <article>
            <span>REGISTERED MEMBERS</span>
            <strong>
              {members.length}
              <small> / 5</small>
            </strong>
          </article>
          <article
            className={
              revealed ? "match-stat revealed" : "match-stat hidden-match"
            }
          >
            <span>{revealed ? "TARGET MATCHES" : "TARGET STATUS"}</span>
            <strong>
              {revealed
                ? `${matchingPlayers.length} / ${players.length}`
                : "HIDDEN"}
            </strong>
          </article>
        </section>

        <section
          className={`team-objective-banner ${revealed ? "is-revealed" : "is-hidden"}`}
        >
          <div className="objective-icon">
            {revealed ? <Eye size={19} /> : <EyeOff size={19} />}
          </div>
          <div>
            <span className="eyebrow">SECRET FRANCHISE</span>
            {revealed ? (
              <>
                <h2>{assignment.franchise_name}</h2>
                <p>
                  {matchingPlayers.length} of your purchased players represent
                  your assigned franchise.
                </p>
              </>
            ) : (
              <>
                <h2>Target not revealed</h2>
                <p>
                  Your franchise objective and match count will appear here
                  after the admin reveals your team's assignment.
                </p>
              </>
            )}
          </div>
          {revealed && (
            <span className="objective-match-count">
              {matchingPlayers.length}
              <small>MATCHES</small>
            </span>
          )}
        </section>

        <section className="team-roster-management">
          <div className="team-page-section-heading">
            <div>
              <span className="eyebrow">YOUR AUCTION BUYS</span>
              <h2>Purchased squad</h2>
            </div>
            <span>
              {players.length} {players.length === 1 ? "PLAYER" : "PLAYERS"}
            </span>
          </div>
          <div className="playing-xi-controls">
            <div>
              <span className="eyebrow">FINAL LINEUP</span>
              <strong>
                {playingXILocked ? (
                  <>
                    <LockKeyhole size={15} /> Playing XI locked
                  </>
                ) : (
                  `${selectedXI.length} / 11 selected`
                )}
              </strong>
              <small>
                {players.length < 11
                  ? `Your squad needs at least 11 players. ${11 - players.length} more required.`
                  : players.length > 18
                    ? "A squad can contain no more than 18 players."
                    : playingXILocked
                      ? "Scores have been finalized for this XI."
                      : hasSavedPlayingXI
                        ? "Playing XI saved. You can update it until the auction is finished."
                        : "Select and save 11 players any time before the auction is finished."}
              </small>
            </div>
            {!playingXILocked && (
              <button
                className="btn primary"
                type="button"
                onClick={fixPlayingXI}
                disabled={
                  savingXI ||
                  !auctionCompleted ||
                  selectedXI.length !== 11 ||
                  players.length < 11 ||
                  players.length > 18
                }
              >
                <Check size={15} />
                {savingXI
                  ? "Saving..."
                  : hasSavedPlayingXI
                    ? "Update playing XI"
                    : "Save playing XI"}
              </button>
            )}
          </div>
          {players.length === 0 ? (
            <div className="team-empty-roster">
              <span className="eyebrow">NO PLAYERS YET</span>
              <p>
                Your squad will fill in here as your team wins players at
                auction.
              </p>
              <button
                className="btn secondary"
                onClick={() => navigate("/dashboard")}
              >
                Return to live bidding <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="team-player-grid">
              {players.map((player, index) => {
                const matchesTarget =
                  revealed &&
                  player.franchise_name === assignment.franchise_name;
                return (
                  <article
                    className={`team-player-card${matchesTarget ? " is-target-match" : ""}${selectedXI.includes(player.player_id) ? " is-playing-xi" : ""}`}
                    key={player.player_id}
                  >
                    <div className="team-player-photo-wrap">
                      <PlayerImage
                        className="team-player-photo"
                        src={player.photo}
                        alt={player.display_name || player.name}
                      />
                      <span className="team-player-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {matchesTarget && (
                        <span className="match-ribbon">TARGET MATCH</span>
                      )}
                    </div>
                    <div className="team-player-details">
                      <div className="team-player-role">
                        {player.role?.replaceAll("_", " ")}
                      </div>
                      <button
                        className={`playing-xi-toggle${selectedXI.includes(player.player_id) ? " is-selected" : ""}`}
                        type="button"
                        aria-pressed={selectedXI.includes(player.player_id)}
                        disabled={
                          playingXILocked ||
                          (!selectedXI.includes(player.player_id) &&
                            selectedXI.length === 11)
                        }
                        title={
                          !auctionCompleted
                            ? "Selection opens after the auction is complete"
                            : team.playing_xi_locked
                              ? "The playing XI is locked after scoring"
                              : selectedXI.includes(player.player_id)
                                ? "Remove from playing XI"
                                : "Add to playing XI"
                        }
                        onClick={() => togglePlayingXI(player.player_id)}
                      >
                        {selectedXI.includes(player.player_id) ? (
                          <Check size={15} aria-hidden="true" />
                        ) : (
                          <Plus size={15} aria-hidden="true" />
                        )}
                        <span>
                          {selectedXI.includes(player.player_id)
                            ? "Selected for playing XI"
                            : "Add to playing XI"}
                        </span>
                      </button>
                      <h3>{player.display_name || player.name}</h3>
                      <p>
                        {player.country} ·{" "}
                        {player.franchise_name || "Unlisted franchise"}
                      </p>
                      <div className="team-player-purchase">
                        <span>ACQUIRED FOR</span>
                        <strong>
                          ₹{Number(player.acquired_price || 0).toFixed(2)} Cr
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="team-members-management">
          <div className="team-page-section-heading">
            <div>
              <span className="eyebrow">YOUR BIDDING UNIT</span>
              <h2>
                <UsersRound size={20} /> Team members
              </h2>
            </div>
            <span>{members.length}/5 REGISTERED</span>
          </div>
          <div className="managed-member-list">
            {members.map((member, index) => (
              <article key={member.id}>
                <span className="member-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="member-initial">
                  {member.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
                <strong>{member.name}</strong>
                {member.is_leader && (
                  <span className="captain-label">TEAM LEADER</span>
                )}
                <span className="member-bid-access">CAN BID</span>
              </article>
            ))}
            {Array.from(
              { length: Math.max(0, 5 - members.length) },
              (_, index) => (
                <article className="member-slot-empty" key={`open-${index}`}>
                  <span className="member-number">
                    {String(members.length + index + 1).padStart(2, "0")}
                  </span>
                  <span className="member-initial">+</span>
                  <strong>Open roster slot</strong>
                  <span className="member-bid-access">JOIN WITH CODE</span>
                </article>
              ),
            )}
          </div>
          {team.code && members.length < 5 && (
            <p className="member-invite-note">
              Share <strong>{team.code}</strong> with your teammates. Every
              registered member can bid using the shared team purse.
            </p>
          )}
        </section>

        {!teamPaymentApproved && (
          <section className="card team-approval-notice" role="status">
            <div>
              <span className="eyebrow">TEAM TRADES</span>
              <strong>Payment approval is pending</strong>
              <span className="muted">
                Offers unlock when an admin approves your team.
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

        <TeamMarket
          token={token}
          teamId={team.id}
          teams={leagueTeams}
          ownRoster={players}
          isTeamApproved={teamPaymentApproved}
          onApprovalRequired={() => setApprovalModalOpen(true)}
        />
      </main>
    </div>
  );
}
