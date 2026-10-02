import { lazy, Suspense, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import PlayerImage from "../components/PlayerImage";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5002/api";
const StadiumScene = lazy(() => import("../components/StadiumScene"));

export default function ViewerPage() {
  const { socket } = useSocket();
  const [auction, setAuction] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const token = localStorage.getItem("rotaract_token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${apiBaseUrl}/auction/state`, { headers }),
      axios.get(`${apiBaseUrl}/teams/leaderboard`, { headers }),
    ]).then(([auctionResponse, leaderboardResponse]) => {
      setAuction(auctionResponse.data.state);
      setLeaderboard(leaderboardResponse.data.leaderboard);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onAuctionState = (payload) => {
      if (payload?.state) setAuction(payload.state);
    };
    const onLeaderboardUpdated = (payload) => {
      if (payload?.leaderboard) setLeaderboard(payload.leaderboard);
    };
    const refreshLeaderboard = () => {
      const token = localStorage.getItem("rotaract_token");
      axios
        .get(`${apiBaseUrl}/teams/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => setLeaderboard(response.data.leaderboard))
        .catch(() => {});
    };
    socket.on("auction_state", onAuctionState);
    socket.on("leaderboard_updated", onLeaderboardUpdated);
    socket.on("player_result", refreshLeaderboard);
    socket.on("connect", refreshLeaderboard);
    return () => {
      socket.off("auction_state", onAuctionState);
      socket.off("leaderboard_updated", onLeaderboardUpdated);
      socket.off("player_result", refreshLeaderboard);
      socket.off("connect", refreshLeaderboard);
    };
  }, [socket]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeLeft = auction?.bid_ends_at
    ? Math.max(0, Math.ceil((Date.parse(auction.bid_ends_at) - now) / 1000))
    : 0;

  return (
    <div className="app-shell">
      <div className="container">
        <main className="main-panel viewer-main">
          <section className="viewer-masthead">
            <div className="viewer-brandline">
              <img
                className="brand-mark"
                src="/rotaract-logo.jpeg"
                alt="Rotaract Club of ACCET"
              />
              <div>
                <strong>ROTARACT IPL</strong>
                <span>AUCTION BROADCAST</span>
              </div>
              <Link className="viewer-return" to="/dashboard">
                Team room
              </Link>
            </div>
            <div className="viewer-title-block">
              <div className="eyebrow">
                <span className="live-dot" /> LIVE FROM THE FLOOR
              </div>
              <h1>
                Every bid
                <br />
                <span>changes the game.</span>
              </h1>
            </div>
            <div className="viewer-scene">
              <Suspense fallback={<div className="stadium-scene" />}>
                <StadiumScene />
              </Suspense>
            </div>
            <span className="viewer-roundel">
              LIVE
              <br />
              IPL
            </span>
          </section>

          <section className="card viewer-auction-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <span className="badge green">
                  {auction?.status?.replaceAll("_", " ") || "CONNECTING"}
                </span>
                <h2 style={{ margin: "12px 0 6px" }}>On the block</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {auction?.player_role || "Waiting for the next player"}
                  {auction?.player_country
                    ? ` · ${auction.player_country}`
                    : ""}
                </p>
              </div>
              <div className="viewer-countdown">
                <strong>{timeLeft}</strong>
                <span>SECONDS</span>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 24,
                alignItems: "center",
                marginTop: 24,
              }}
            >
              <div
                className="viewer-player"
                style={{ display: "flex", alignItems: "center", gap: 20 }}
              >
                {auction?.current_player_id && (
                  <PlayerImage
                    className="viewer-player-portrait"
                    src={auction.player_photo}
                    alt={
                      auction.player_display_name ||
                      auction.player_name ||
                      "Current player"
                    }
                  />
                )}
                <div>
                  <div className="muted">Now on the block</div>
                  <h2 style={{ margin: "6px 0" }}>
                    {auction?.player_display_name ||
                      auction?.player_name ||
                      "No active player"}
                  </h2>
                  <div className="muted">
                    {auction?.franchise_name || ""}
                    {auction?.player_base_price
                      ? ` · Base ₹${Number(auction.player_base_price).toFixed(2)} Cr`
                      : ""}
                  </div>
                </div>
              </div>
              <div>
                <div className="muted">Current bid</div>
                <strong
                  style={{ display: "block", fontSize: 30, margin: "6px 0" }}
                >
                  ₹{Number(auction?.current_bid || 0).toFixed(2)} Cr
                </strong>
                <div className="muted">
                  {auction?.highest_bidder_team_name || "No bids yet"}
                </div>
              </div>
            </div>
          </section>

          <section className="card viewer-leaderboard" style={{ padding: 24 }}>
            <div className="viewer-leaderboard-heading">
              <div>
                <span className="eyebrow">THE SCOREBOARD</span>
                <h2 style={{ margin: "4px 0 14px" }}>Leaderboard</h2>
              </div>
              <span className="viewer-leaderboard-mark">TOP TEAMS</span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Final scores will appear after reveal and scoring.
              </p>
            ) : (
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
                      <th style={{ padding: "10px 8px" }}>Target</th>
                      <th style={{ padding: "10px 8px" }}>Matching players</th>
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
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
