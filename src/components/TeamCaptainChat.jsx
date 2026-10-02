import { useEffect, useRef, useState } from "react";

export default function TeamCaptainChat({ socket, teamName, readOnly = false }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const receive = (message) => setMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message].slice(-100);
    });
    socket.on("team_chat_message", receive);
    socket.emit("team_chat_history", (result) => {
      if (result?.success) setMessages(result.messages || []);
      else setError(result?.message || "Unable to load chat");
    });
    return () => socket.off("team_chat_message", receive);
  }, [socket]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending || !socket?.connected) return;
    setSending(true);
    setError("");
    socket.emit("team_chat_send", { message }, (result) => {
      setSending(false);
      if (result?.success) setDraft("");
      else setError(result?.message || "Unable to send message");
    });
  };

  return (
    <section className="card" style={{ padding: 20, margin: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div>
          <span className="eyebrow">{readOnly ? "SUPER ADMIN · READ ONLY" : "CAPTAINS' ROOM"}</span>
          <h2 style={{ margin: "5px 0 14px" }}>Team chat</h2>
        </div>
        <span className="muted">{readOnly ? "Viewing all team messages" : "Messages show your team name"}</span>
      </div>
      <div ref={listRef} aria-live="polite" style={{ height: 260, overflowY: "auto", padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "var(--panel-alt)" }}>
        {messages.length === 0 ? <p className="muted">No messages yet. Start the conversation.</p> : messages.map((item) => (
          <article key={item.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <strong>{item.teamName}</strong>
              <small className="muted">{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{item.senderName}</div>
            <p style={{ margin: "4px 0", overflowWrap: "anywhere" }}>{item.message}</p>
          </article>
        ))}
      </div>
      {!readOnly && <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input aria-label="Chat message" maxLength={500} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message as ${teamName || "your team"}`} style={{ flex: 1, minWidth: 0 }} />
        <button className="btn primary" type="submit" disabled={sending || !draft.trim()}>Send</button>
      </form>}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {error ? <small role="alert" style={{ color: "var(--danger)" }}>{error}</small> : <span />}
        <small className="muted">{draft.length}/500</small>
      </div>
    </section>
  );
}
