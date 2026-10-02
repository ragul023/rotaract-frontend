import { lazy, Suspense, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  CircleUserRound,
  ClipboardList,
  LogOut,
  ListOrdered,
  Menu,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PlayerImage from "../components/PlayerImage";
import { AdminVoiceBroadcast } from "../components/AuctionAudio";

const StadiumScene = lazy(() => import("../components/StadiumScene"));

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api";

function SortableQueueRow({
  id,
  player,
  index,
  count,
  editable,
  busy,
  onRemove,
  onMove,
  onMoveTo,
  searchMatch,
}) {
  const [destination, setDestination] = useState(index + 1);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.player_id, disabled: !editable || busy });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
  };

  useEffect(() => {
    setDestination(index + 1);
  }, [index]);

  const submitDestination = (event) => {
    event.preventDefault();
    const position = Number(destination);
    if (!Number.isInteger(position) || position < 1 || position > count) return;
    onMoveTo(index, position - 1);
  };

  return (
    <article
      id={id}
      tabIndex={-1}
      className={`queue-row${isDragging ? " is-dragging" : ""}${searchMatch ? " is-search-match" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      <span className="queue-rank">{String(index + 1).padStart(2, "0")}</span>
      <button
        type="button"
        className="queue-drag-handle"
        aria-label={`Drag ${player.name} to reorder`}
        title="Drag to reorder"
        disabled={!editable || busy}
        {...attributes}
        {...listeners}
      >
        <ListOrdered size={16} />
      </button>
      <div className="queue-player-image">
        <PlayerImage
          src={player.photo}
          alt={player.display_name || player.name}
        />
      </div>
      <div className="queue-player-copy">
        <strong>{player.display_name || player.name}</strong>
        <span>
          {player.role} <i /> {player.country || "Unknown country"}
        </span>
      </div>
      <span
        className={`queue-status ${player.queue_status?.toLowerCase() || "pending"}`}
      >
        {player.queue_status || "PENDING"}
      </span>
      {editable && (
        <div className="queue-row-actions">
          <form className="queue-position-control" onSubmit={submitDestination}>
            <label htmlFor={`queue-position-${player.player_id}`}>
              Move to
            </label>
            <input
              id={`queue-position-${player.player_id}`}
              type="number"
              min="1"
              max={count}
              step="1"
              value={destination}
              aria-label={`Position for ${player.name}, currently ${index + 1} of ${count}`}
              disabled={busy}
              onChange={(event) => setDestination(event.target.value)}
            />
            <button
              type="submit"
              disabled={busy || Number(destination) === index + 1}
            >
              Go
            </button>
          </form>
          <button
            type="button"
            className="icon-action"
            aria-label={`Move ${player.name} up`}
            title="Move up"
            disabled={busy || index === 0}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            className="icon-action"
            aria-label={`Move ${player.name} down`}
            title="Move down"
            disabled={busy || index === count - 1}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            className="icon-action remove-action"
            aria-label={`Remove ${player.name} from queue`}
            title="Remove from queue"
            disabled={busy || count === 1}
            onClick={() => onRemove(player.player_id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </article>
  );
}

function QueueSearchResult({
  player,
  index,
  count,
  editable,
  busy,
  onJump,
  onMoveTo,
}) {
  const [destination, setDestination] = useState(index + 1);

  useEffect(() => {
    setDestination(index + 1);
  }, [index]);

  const submitDestination = (event) => {
    event.preventDefault();
    const position = Number(destination);
    if (!Number.isInteger(position) || position < 1 || position > count) return;
    onMoveTo(index, position - 1);
  };

  return (
    <article className="queue-search-result">
      <button
        className="queue-search-result-jump"
        type="button"
        onClick={() => onJump(player.player_id)}
        aria-label={`Jump to ${player.display_name || player.name}, queue position ${index + 1}`}
      >
        <span className="queue-search-result-rank">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="queue-search-result-copy">
          <strong>{player.display_name || player.name}</strong>
          <small>
            {player.role} · {player.country || "Unknown country"}
          </small>
        </span>
        <span className="queue-search-result-status">
          {player.queue_status || "PENDING"}
        </span>
      </button>
      {editable && (
        <form
          className="queue-search-result-position"
          onSubmit={submitDestination}
        >
          <label htmlFor={`search-result-position-${player.player_id}`}>
            Move to
          </label>
          <input
            id={`search-result-position-${player.player_id}`}
            type="number"
            min="1"
            max={count}
            step="1"
            value={destination}
            aria-label={`New position for ${player.display_name || player.name}`}
            disabled={busy}
            onChange={(event) => setDestination(event.target.value)}
          />
          <button
            type="submit"
            disabled={busy || Number(destination) === index + 1}
          >
            Go
          </button>
        </form>
      )}
    </article>
  );
}

export default function AdminPage() {
  const { user, token, loading, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [overview, setOverview] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [queueData, setQueueData] = useState({
    queue: [],
    availablePlayers: [],
    editable: false,
    auctionStatus: "LOBBY",
  });
  const [playerQueue, setPlayerQueue] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [tradeWindowOpen, setTradeWindowOpen] = useState(false);
  const [bidTime, setBidTime] = useState(30);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [scoring, setScoring] = useState({
    target_player: 1,
    captain_bonus: 1,
    overseas: 1,
    all_rounder: 1,
  });
  const [reveal, setReveal] = useState({
    mode: "MANUAL",
    threshold: 60,
    autoReveal: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (
      !loading &&
      user &&
      !["SUPER_ADMIN", "AUCTION_ADMIN"].includes(user.role)
    ) {
      navigate("/dashboard");
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${apiBaseUrl}/auction/state`, { headers }),
      axios.get(`${apiBaseUrl}/admin/overview`, { headers }),
      axios.get(`${apiBaseUrl}/admin/assignments`, { headers }),
      axios.get(`${apiBaseUrl}/admin/franchises`, { headers }),
      axios.get(`${apiBaseUrl}/admin/leaderboard`, { headers }),
      axios.get(`${apiBaseUrl}/admin/scoring-settings`, { headers }),
      axios.get(`${apiBaseUrl}/admin/reveal-settings`, { headers }),
      axios.get(`${apiBaseUrl}/admin/player-queue`, { headers }),
      axios.get(`${apiBaseUrl}/admin/trade-window`, { headers }),
      axios.get(`${apiBaseUrl}/admin/bid-time`, { headers }),
    ])
      .then(
        ([
          stateResponse,
          overviewResponse,
          assignmentResponse,
          franchiseResponse,
          leaderboardResponse,
          scoringResponse,
          revealResponse,
          queueResponse,
          tradeWindowResponse,
          bidTimeResponse,
        ]) => {
          setAuction(stateResponse.data.state);
          setOverview(overviewResponse.data);
          setAssignments(assignmentResponse.data.assignments);
          setFranchises(franchiseResponse.data.franchises);
          setLeaderboard(leaderboardResponse.data.leaderboard);
          setScoring(scoringResponse.data.scoring);
          setReveal(revealResponse.data.reveal);
          setQueueData(queueResponse.data);
          setPlayerQueue(queueResponse.data.queue);
          setTradeWindowOpen(tradeWindowResponse.data.open);
          setBidTime(bidTimeResponse.data.seconds);
        },
      )
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message ||
            "Unable to load auction state",
        );
      });
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onAuctionState = (payload) => {
      if (payload?.state) setAuction(payload.state);
    };
    const onRevealConditionReached = (payload) => {
      setNotice(
        payload?.autoRevealed
          ? "Reveal condition reached; targets were automatically revealed."
          : "Reveal condition reached. Review assignments before revealing.",
      );
    };
    const refreshAuctionSummary = () => {
      const headers = { Authorization: `Bearer ${token}` };
      Promise.all([
        axios.get(`${apiBaseUrl}/admin/overview`, { headers }),
        axios.get(`${apiBaseUrl}/admin/leaderboard`, { headers }),
      ])
        .then(([overviewResponse, leaderboardResponse]) => {
          setOverview(overviewResponse.data);
          setLeaderboard(leaderboardResponse.data.leaderboard);
        })
        .catch(() => {});
    };
    socket.on("auction_state", onAuctionState);
    socket.on("reveal_condition_reached", onRevealConditionReached);
    socket.on("player_result", refreshAuctionSummary);
    socket.on("connect", refreshAuctionSummary);
    return () => {
      socket.off("auction_state", onAuctionState);
      socket.off("reveal_condition_reached", onRevealConditionReached);
      socket.off("player_result", refreshAuctionSummary);
      socket.off("connect", refreshAuctionSummary);
    };
  }, [socket, token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const performAction = async (action, payload = {}) => {
    setBusy(true);
    setError("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/auction/${action}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAuction(response.data.state);
      const overviewResponse = await axios.get(`${apiBaseUrl}/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOverview(overviewResponse.data);
      const queueResponse = await axios.get(
        `${apiBaseUrl}/admin/player-queue`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setQueueData(queueResponse.data);
      setPlayerQueue(queueResponse.data.queue);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Auction action failed");
    } finally {
      setBusy(false);
    }
  };

  const performObjectiveAction = async (action, payload = {}) => {
    setBusy(true);
    setError("");
    try {
      await axios.post(`${apiBaseUrl}/admin/${action}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const headers = { Authorization: `Bearer ${token}` };
      const [assignmentResponse, leaderboardResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/admin/assignments`, { headers }),
        axios.get(`${apiBaseUrl}/admin/leaderboard`, { headers }),
      ]);
      setAssignments(assignmentResponse.data.assignments);
      setLeaderboard(leaderboardResponse.data.leaderboard);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Objective action failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveTeamAssignment = async (teamId, franchiseId) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/admin/assignments/${teamId}`,
        { franchiseId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAssignments((current) =>
        current.map((assignment) =>
          assignment.team_id === teamId
            ? { ...assignment, ...response.data.assignment }
            : assignment,
        ),
      );
      setNotice("Team assignment saved.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save team assignment",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveScoringSettings = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/admin/scoring-settings`,
        scoring,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScoring(response.data.result);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save scoring settings",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveRevealSettings = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/admin/reveal-settings`,
        reveal,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setReveal(response.data.result);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save reveal settings",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveBidTime = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/admin/bid-time`,
        { seconds: Number(bidTime) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setBidTime(response.data.seconds);
      setAuction(response.data.state);
      setNotice("Default bid time saved. The active countdown is unchanged.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save default bid time",
      );
    } finally {
      setBusy(false);
    }
  };

  const moveQueuePlayer = (index, offset) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= playerQueue.length) return;
    setPlayerQueue((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const moveQueuePlayerTo = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= playerQueue.length || fromIndex === toIndex) {
      return;
    }
    setPlayerQueue((current) => arrayMove(current, fromIndex, toIndex));
  };

  const handleQueueDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setPlayerQueue((current) => {
      const fromIndex = current.findIndex(
        (player) => player.player_id === active.id,
      );
      const toIndex = current.findIndex(
        (player) => player.player_id === over.id,
      );
      return fromIndex < 0 || toIndex < 0
        ? current
        : arrayMove(current, fromIndex, toIndex);
    });
  };

  const addQueuePlayer = () => {
    const player = queueAvailablePlayers.find(
      (candidate) => candidate.player_id === selectedPlayer,
    );
    if (!player) return;
    setPlayerQueue((current) => [
      ...current,
      { ...player, queue_status: "PENDING" },
    ]);
    setSelectedPlayer("");
  };

  const savePlayerQueue = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/admin/player-queue`,
        { playerIds: playerQueue.map((player) => player.player_id) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setQueueData(response.data);
      setPlayerQueue(response.data.queue);
      setNotice("Player queue saved");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save queue");
    } finally {
      setBusy(false);
    }
  };

  const toggleTradeWindow = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/admin/trade-window`,
        { open: !tradeWindowOpen },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setTradeWindowOpen(response.data.open);
      setNotice(
        response.data.open ? "Trade window opened" : "Trade window closed",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to update trade window",
      );
    } finally {
      setBusy(false);
    }
  };

  if (
    loading ||
    !user ||
    !["SUPER_ADMIN", "AUCTION_ADMIN"].includes(user.role)
  ) {
    return null;
  }

  const status = auction?.status || "LOADING";
  const timeLeft = auction?.bid_ends_at
    ? Math.max(0, Math.ceil((Date.parse(auction.bid_ends_at) - now) / 1000))
    : 0;
  const canSell =
    status === "BIDDING" &&
    auction?.highest_bidder_team_id &&
    Number(auction.current_bid) > 0;
  const queueAvailablePlayers = [
    ...queueData.availablePlayers,
    ...queueData.queue.filter(
      (player) =>
        !playerQueue.some((queued) => queued.player_id === player.player_id),
    ),
  ];
  const normalizedQueueSearch = queueSearch.trim().toLocaleLowerCase();
  const matchesQueueSearch = (player) =>
    !normalizedQueueSearch ||
    [player.name, player.display_name, player.role, player.country].some(
      (value) => value?.toLocaleLowerCase().includes(normalizedQueueSearch),
    );
  const filteredAvailablePlayers =
    queueAvailablePlayers.filter(matchesQueueSearch);
  const matchingQueuedCount = playerQueue.filter(matchesQueueSearch).length;
  const matchingQueuedPlayers = playerQueue
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => matchesQueueSearch(player));

  const jumpToQueuedPlayer = (playerId) => {
    const row = document.getElementById(`queue-player-${playerId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.focus({ preventScroll: true });
  };

  return (
    <div className="app-shell">
      <div className="container dashboard-grid admin-layout">
        <aside
          className={`card sidebar admin-sidebar${mobileSidebarOpen ? " is-mobile-open" : ""}`}
        >
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
          <div className="sidebar-profile">
            <span className="eyebrow">SIGNED IN AS</span>
            <strong>{user.name}</strong>
            <span className="role-chip">{user.role.replaceAll("_", " ")}</span>
          </div>
          <button
            className="admin-mobile-payments"
            type="button"
            aria-label="Open payment approvals"
            title="Payment approvals"
            onClick={() => navigate("/admin/registrations")}
          >
            <ClipboardList size={17} aria-hidden="true" />
            <span>Payments</span>
          </button>
          <button
            className="admin-sidebar-toggle"
            type="button"
            aria-label={
              mobileSidebarOpen
                ? "Close admin navigation"
                : "Open admin navigation"
            }
            aria-expanded={mobileSidebarOpen}
            aria-controls="admin-sidebar-navigation"
            onClick={() => setMobileSidebarOpen((open) => !open)}
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div
            className="admin-sidebar-navigation"
            id="admin-sidebar-navigation"
          >
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">CONTROL ROOM</div>
            <button
              className="btn secondary sidebar-link active"
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate("/dashboard");
              }}
            >
              Live auction <span className="sidebar-link-dot" />
            </button>
            <button
              className="btn secondary sidebar-link"
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate("/admin/registrations");
              }}
            >
              Team registrations <ClipboardList size={15} />
            </button>
            <button className="btn secondary sidebar-link" onClick={logout}>
              Sign out <LogOut size={15} />
            </button>
            <div className="sidebar-footer">
              <span className="connection-light" />
              <span>Server connected</span>
            </div>
          </div>
        </aside>

        <main className="main-panel admin-main">
          <section className="admin-masthead">
            <div className="masthead-copy">
              <div className="eyebrow">
                <span className="live-dot" /> LIVE EVENT OPERATIONS
              </div>
              <h1>
                Draft night
                <br />
                <span>control room</span>
              </h1>
              <p>
                Manage the player order, drive the bidding floor, and shape the
                reveal.
              </p>
              <div className="masthead-status">
                <span className="status-orbit" />
                {status.replaceAll("_", " ")}
                <span className="masthead-separator">/</span>
                {overview?.activeTeams ?? 0} active teams
              </div>
            </div>
            <div className="masthead-art">
              <Suspense fallback={<div className="stadium-scene" />}>
                <StadiumScene />
              </Suspense>
              <span className="scene-caption">THE AUCTION IS LIVE</span>
            </div>
            <div className="masthead-index">
              01 <span>—</span> AUCTION
            </div>
          </section>

          <AdminVoiceBroadcast socket={socket} />

          <div className="grid-4">
            <div className="card stat-card">
              <h3>Auction status</h3>
              <strong>{status.replaceAll("_", " ")}</strong>
            </div>
            <div className="card stat-card">
              <h3>Players sold</h3>
              <strong>{overview?.soldPlayers ?? "--"}</strong>
            </div>
            <div className="card stat-card">
              <h3>Active teams</h3>
              <strong>{overview?.activeTeams ?? "--"}</strong>
            </div>
            <div className="card stat-card">
              <h3>Bid timer</h3>
              <strong>{timeLeft}s</strong>
            </div>
          </div>

          <section className="card trade-window-admin">
            <div>
              <span className="eyebrow">POST-AUCTION MARKET</span>
              <h2>Team trade window</h2>
              <p className="muted">
                {tradeWindowOpen
                  ? "Teams can exchange one acquired player for another."
                  : "Trading is closed. Existing offers can no longer be accepted."}
              </p>
            </div>
            <button
              className={`btn ${tradeWindowOpen ? "secondary" : "primary"}`}
              type="button"
              disabled={busy}
              onClick={toggleTradeWindow}
            >
              <ArrowLeftRight size={16} />
              {tradeWindowOpen ? "Close trading" : "Open trading"}
            </button>
          </section>

          {error && (
            <div
              className="badge"
              role="alert"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </div>
          )}
          {notice && (
            <div className="badge gold" role="status">
              {notice}
            </div>
          )}

          <section className="card" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <span className="badge green">
                  {status.replaceAll("_", " ")}
                </span>
                <h2 style={{ margin: "12px 0 6px" }}>
                  {auction?.player_display_name ||
                    auction?.player_name ||
                    "No player selected"}
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  {auction?.player_role || "Waiting for auction"}
                  {auction?.player_country
                    ? ` · ${auction.player_country}`
                    : ""}
                  {auction?.player_base_price
                    ? ` · Base ₹${Number(auction.player_base_price).toFixed(2)} Cr`
                    : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["LOBBY", "AUCTION_COMPLETED", "FINISHED"].includes(
                  status,
                ) && (
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => performAction("start")}
                  >
                    Start auction
                  </button>
                )}
                {status === "BIDDING" && (
                  <>
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() => performAction("pause")}
                    >
                      Pause
                    </button>
                    <button
                      className="btn primary"
                      disabled={busy || !canSell}
                      onClick={() =>
                        performAction("force-sell", {
                          teamId: auction.highest_bidder_team_id,
                          amount: Number(auction.current_bid),
                        })
                      }
                    >
                      Sell to highest bidder
                    </button>
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() => performAction("unsold")}
                    >
                      Mark unsold
                    </button>
                  </>
                )}
                {status === "AUCTION_PAUSED" && (
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => performAction("resume")}
                  >
                    Resume
                  </button>
                )}
                {["PLAYER_SOLD", "PLAYER_UNSOLD"].includes(status) && (
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => performAction("next")}
                  >
                    Next player
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 18,
                marginTop: 26,
                paddingTop: 18,
                borderTop: "1px solid var(--line)",
              }}
            >
              <div>
                <div className="muted">Current bid</div>
                <strong
                  style={{ display: "block", fontSize: 26, marginTop: 6 }}
                >
                  ₹{Number(auction?.current_bid || 0).toFixed(2)} Cr
                </strong>
              </div>
              <div>
                <div className="muted">Highest bidder</div>
                <strong style={{ display: "block", marginTop: 10 }}>
                  {auction?.highest_bidder_team_name || "No bids yet"}
                </strong>
              </div>
              <div>
                <div className="muted">Bid sequence</div>
                <strong style={{ display: "block", marginTop: 10 }}>
                  {auction?.current_sequence ?? 0}
                </strong>
              </div>
            </div>
          </section>

          <section className="card queue-panel">
            <div className="section-heading queue-heading">
              <div>
                <div className="eyebrow">THE RUNNING ORDER</div>
                <h2>
                  <ListOrdered size={21} /> Player queue
                </h2>
                <p className="muted">
                  {queueData.editable
                    ? queueData.auctionStatus === "LOBBY" ||
                      ["AUCTION_COMPLETED", "FINISHED"].includes(
                        queueData.auctionStatus,
                      )
                      ? "Shape the order before the first ball is bowled."
                      : "Reorder upcoming players; the player on the block stays put."
                    : "Queue order is locked in the current auction state."}
                </p>
              </div>
              <div className="queue-count">
                <strong>
                  {playerQueue.length.toString().padStart(2, "0")}
                </strong>
                <span>PLAYERS</span>
              </div>
            </div>

            <div className="queue-add-row">
              <label className="queue-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={queueSearch}
                  onChange={(event) => {
                    setQueueSearch(event.target.value);
                    setSelectedPlayer("");
                  }}
                  placeholder="Search players by name, role, or country"
                  aria-label="Search players by name, role, or country"
                  autoComplete="off"
                />
                {queueSearch && (
                  <button
                    type="button"
                    className="queue-search-clear"
                    aria-label="Clear player search"
                    onClick={() => {
                      setQueueSearch("");
                      setSelectedPlayer("");
                    }}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </label>
              {queueData.editable && (
                <>
                  <select
                    aria-label="Choose player to add to queue"
                    value={selectedPlayer}
                    onChange={(event) => setSelectedPlayer(event.target.value)}
                    disabled={busy || filteredAvailablePlayers.length === 0}
                  >
                    <option value="">
                      {filteredAvailablePlayers.length === 0
                        ? "No matching available players"
                        : "Add a player to the queue..."}
                    </option>
                    {filteredAvailablePlayers.map((player) => (
                      <option key={player.player_id} value={player.player_id}>
                        {player.display_name || player.name} · {player.role}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn secondary icon-action"
                    type="button"
                    aria-label="Add selected player"
                    title="Add selected player"
                    disabled={busy || !selectedPlayer}
                    onClick={addQueuePlayer}
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    className="btn primary queue-save"
                    type="button"
                    disabled={busy || playerQueue.length === 0}
                    onClick={savePlayerQueue}
                  >
                    <Save size={16} />
                    {busy ? "Saving" : "Save queue"}
                  </button>
                </>
              )}
            </div>

            {normalizedQueueSearch && (
              <section
                className="queue-search-results"
                aria-label={`Queue search results: ${matchingQueuedCount} matches`}
              >
                <div className="queue-search-results-heading">
                  <strong>Search results</strong>
                  <span>{matchingQueuedCount} in queue</span>
                </div>
                {matchingQueuedPlayers.length > 0 ? (
                  <div className="queue-search-results-list">
                    {matchingQueuedPlayers.map(({ player, index }) => (
                      <QueueSearchResult
                        key={player.player_id}
                        player={player}
                        index={index}
                        count={playerQueue.length}
                        editable={queueData.editable}
                        busy={busy}
                        onJump={jumpToQueuedPlayer}
                        onMoveTo={moveQueuePlayerTo}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="queue-search-results-empty">
                    No matching players are currently in the queue.
                  </p>
                )}
              </section>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleQueueDragEnd}
            >
              <SortableContext
                items={playerQueue.map((player) => player.player_id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="queue-list">
                  {playerQueue.length === 0 ? (
                    <div className="queue-empty">
                      No available players to queue.
                    </div>
                  ) : (
                    playerQueue.map((player, index) => (
                      <SortableQueueRow
                        key={player.player_id}
                        id={`queue-player-${player.player_id}`}
                        player={player}
                        index={index}
                        count={playerQueue.length}
                        editable={queueData.editable}
                        busy={busy}
                        searchMatch={
                          Boolean(normalizedQueueSearch) &&
                          matchesQueueSearch(player)
                        }
                        onMove={moveQueuePlayer}
                        onMoveTo={moveQueuePlayerTo}
                        onRemove={(playerId) =>
                          setPlayerQueue((current) =>
                            current.filter(
                              (item) => item.player_id !== playerId,
                            ),
                          )
                        }
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>
            {queueData.editable && (
              <div className="queue-footnote">
                <span>Changes stay local until saved.</span>
                <span>
                  {queueAvailablePlayers.length} available ·{" "}
                  {matchingQueuedCount} matching in queue
                </span>
              </div>
            )}
          </section>

          <section className="card" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Default bid time</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Sets upcoming bid windows. The current countdown will not
                  reset.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "end",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <label className="muted" style={{ display: "grid", gap: 5 }}>
                  Seconds per player
                  <input
                    type="number"
                    min="5"
                    max="600"
                    step="1"
                    value={bidTime}
                    onChange={(event) => setBidTime(Number(event.target.value))}
                    style={{
                      width: 150,
                      padding: "9px 10px",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      background: "var(--panel-alt)",
                      color: "var(--text)",
                    }}
                  />
                </label>
                <button
                  className="btn primary"
                  disabled={busy || bidTime < 5 || bidTime > 600}
                  onClick={saveBidTime}
                >
                  <Save size={15} /> Save bid time
                </button>
              </div>
            </div>
          </section>

          <section className="card" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Reveal timing</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Automatic exposure is optional; otherwise admins reveal
                  manually.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "end",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <label className="muted" style={{ display: "grid", gap: 5 }}>
                  Condition
                  <select
                    value={reveal.mode}
                    onChange={(event) =>
                      setReveal((current) => ({
                        ...current,
                        mode: event.target.value,
                      }))
                    }
                    style={{
                      minWidth: 180,
                      padding: "9px 10px",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "var(--panel-alt)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="AFTER_PLAYERS">
                      After players sold/unsold
                    </option>
                    <option value="AT_END">At auction end</option>
                  </select>
                </label>
                {reveal.mode === "AFTER_PLAYERS" && (
                  <label className="muted" style={{ display: "grid", gap: 5 }}>
                    Player threshold
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={reveal.threshold}
                      onChange={(event) =>
                        setReveal((current) => ({
                          ...current,
                          threshold: Number(event.target.value),
                        }))
                      }
                      style={{
                        width: 130,
                        padding: "9px 10px",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        background: "var(--panel-alt)",
                        color: "var(--text)",
                      }}
                    />
                  </label>
                )}
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={reveal.autoReveal}
                    onChange={(event) =>
                      setReveal((current) => ({
                        ...current,
                        autoReveal: event.target.checked,
                      }))
                    }
                  />
                  Auto-reveal when reached
                </label>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={saveRevealSettings}
                >
                  Save reveal settings
                </button>
              </div>
            </div>
          </section>

          <section className="card" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Scoring weights</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Points per matching player and objective bonus.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  ["target_player", "Target player"],
                  ["captain_bonus", "Captain bonus"],
                  ["overseas", "Overseas bonus"],
                  ["all_rounder", "All-rounder bonus"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="muted"
                    style={{ display: "grid", gap: 5 }}
                  >
                    {label}
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={scoring[key]}
                      onChange={(event) =>
                        setScoring((current) => ({
                          ...current,
                          [key]: Number(event.target.value),
                        }))
                      }
                      style={{
                        width: 110,
                        padding: "9px 10px",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        background: "var(--panel-alt)",
                        color: "var(--text)",
                      }}
                    />
                  </label>
                ))}
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={saveScoringSettings}
                >
                  Save weights
                </button>
              </div>
            </div>
          </section>

          <section className="card" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Hidden targets</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Choose a target for each team. Assignments stay private until
                  revealed.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn secondary"
                  disabled={busy || assignments.length === 0}
                  onClick={() =>
                    performObjectiveAction("assignments/randomize", {
                      scope: "ALL",
                    })
                  }
                >
                  Randomize all
                </button>
                <button
                  className="btn secondary"
                  disabled={busy || assignments.length === 0}
                  onClick={() =>
                    performObjectiveAction("assignments/randomize", {
                      scope: "UNASSIGNED",
                    })
                  }
                >
                  Randomize unassigned
                </button>
                <button
                  className="btn secondary"
                  disabled={busy || assignments.length === 0}
                  onClick={() => performObjectiveAction("assignments/lock")}
                >
                  Lock assignments
                </button>
                <button
                  className="btn secondary"
                  disabled={busy || assignments.length === 0}
                  onClick={() => performObjectiveAction("assignments/reveal")}
                >
                  Reveal all
                </button>
                <button
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm("Reset all hidden assignments and scores?")
                    ) {
                      performObjectiveAction("assignments/reset");
                    }
                  }}
                >
                  Reset
                </button>
                <button
                  className="btn primary"
                  disabled={busy || assignments.length === 0}
                  onClick={() => performObjectiveAction("scores/calculate")}
                >
                  Calculate scores
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: 20 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr className="muted">
                    <th style={{ padding: "10px 8px" }}>Team</th>
                    <th style={{ padding: "10px 8px" }}>Members</th>
                    <th style={{ padding: "10px 8px" }}>Secret franchise</th>
                    <th style={{ padding: "10px 8px" }}>Status</th>
                    <th style={{ padding: "10px 8px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr
                      key={assignment.team_id}
                      style={{ borderTop: "1px solid var(--line)" }}
                    >
                      <td style={{ padding: "12px 8px" }}>
                        {assignment.team_name}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        {assignment.members
                          .map((member) => member.name)
                          .join(", ") || "No members"}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <select
                          value={assignment.franchise_id || ""}
                          disabled={
                            busy ||
                            ["LOCKED", "REVEALED"].includes(
                              assignment.assignment_status,
                            )
                          }
                          onChange={(event) =>
                            saveTeamAssignment(
                              assignment.team_id,
                              event.target.value,
                            )
                          }
                          aria-label={`Secret franchise for ${assignment.team_name}`}
                          style={{
                            minWidth: 160,
                            padding: "9px 10px",
                            border: "1px solid var(--line)",
                            borderRadius: 4,
                            background: "var(--panel-alt)",
                            color: "var(--text)",
                          }}
                        >
                          <option value="">Unassigned</option>
                          {franchises.map((franchise) => (
                            <option key={franchise.id} value={franchise.id}>
                              {franchise.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        {assignment.assignment_status || "UNASSIGNED"}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        {assignment.franchise_id &&
                          assignment.assignment_status !== "REVEALED" && (
                            <button
                              className="btn secondary"
                              disabled={busy}
                              onClick={() =>
                                performObjectiveAction("assignments/reveal", {
                                  teamId: assignment.team_id,
                                })
                              }
                            >
                              Reveal one
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {leaderboard.length > 0 && (
            <section className="card" style={{ padding: 22 }}>
              <h2 style={{ margin: "0 0 14px" }}>Final leaderboard</h2>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr className="muted">
                      <th style={{ padding: "10px 8px" }}>Rank</th>
                      <th style={{ padding: "10px 8px" }}>Team</th>
                      <th style={{ padding: "10px 8px" }}>Franchise</th>
                      <th style={{ padding: "10px 8px" }}>Matches</th>
                      <th style={{ padding: "10px 8px" }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr
                        key={entry.team_id}
                        style={{ borderTop: "1px solid var(--line)" }}
                      >
                        <td style={{ padding: "12px 8px" }}>{index + 1}</td>
                        <td style={{ padding: "12px 8px" }}>
                          {entry.team_name}
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          {entry.franchise_name}
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          {entry.details.matchingPlayerCount}
                        </td>
                        <td style={{ padding: "12px 8px", fontWeight: 700 }}>
                          {entry.total_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
