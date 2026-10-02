import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

const rtcConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function sendSignal(socket, targetId, signal) {
  socket.emit("voice_signal", { targetId, signal });
}

function applyPendingCandidates(peer, pendingCandidates) {
  const candidates = pendingCandidates.splice(0);
  return candidates.reduce(
    (chain, candidate) => chain.then(() => peer.addIceCandidate(candidate)),
    Promise.resolve(),
  );
}

export function AdminVoiceBroadcast({ socket }) {
  const [broadcasting, setBroadcasting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [error, setError] = useState("");
  const streamRef = useRef(null);
  const peersRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());

  const closePeer = (listenerId) => {
    peersRef.current.get(listenerId)?.close();
    peersRef.current.delete(listenerId);
    pendingCandidatesRef.current.delete(listenerId);
    setListenerCount(peersRef.current.size);
  };

  const closeBroadcast = () => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setListenerCount(0);
    setBroadcasting(false);
    setStarting(false);
  };

  const connectListener = async (listenerId) => {
    if (!streamRef.current || peersRef.current.has(listenerId)) return;

    const peer = new RTCPeerConnection(rtcConfiguration);
    peersRef.current.set(listenerId, peer);
    pendingCandidatesRef.current.set(listenerId, []);
    setListenerCount(peersRef.current.size);
    streamRef.current.getTracks().forEach((track) => {
      peer.addTrack(track, streamRef.current);
    });
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal(socket, listenerId, { candidate });
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(peer.connectionState)) {
        closePeer(listenerId);
      }
    };

    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignal(socket, listenerId, { description: peer.localDescription });
    } catch {
      closePeer(listenerId);
      setError("Unable to connect to a bidder's audio session.");
    }
  };

  useEffect(() => {
    if (!socket) return undefined;

    const onListenerJoined = ({ listenerId }) => connectListener(listenerId);
    const onListenerLeft = ({ listenerId }) => closePeer(listenerId);
    const onDisconnect = () => closeBroadcast();
    const onSignal = async ({ fromId, signal }) => {
      const peer = peersRef.current.get(fromId);
      if (!peer) return;

      try {
        if (signal?.description) {
          await peer.setRemoteDescription(signal.description);
          await applyPendingCandidates(
            peer,
            pendingCandidatesRef.current.get(fromId) || [],
          );
        } else if (signal?.candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(signal.candidate);
          } else {
            pendingCandidatesRef.current.get(fromId)?.push(signal.candidate);
          }
        }
      } catch {
        closePeer(fromId);
      }
    };
    const onBroadcastStopped = () => closeBroadcast();

    socket.on("voice_listener_joined", onListenerJoined);
    socket.on("voice_listener_left", onListenerLeft);
    socket.on("voice_signal", onSignal);
    socket.on("voice_broadcast_stopped", onBroadcastStopped);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("voice_listener_joined", onListenerJoined);
      socket.off("voice_listener_left", onListenerLeft);
      socket.off("voice_signal", onSignal);
      socket.off("voice_broadcast_stopped", onBroadcastStopped);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(
    () => () => {
      if (streamRef.current) socket?.emit("voice_broadcast_stop");
      closeBroadcast();
    },
    [socket],
  );

  const toggleBroadcast = async () => {
    setError("");
    if (starting) return;
    if (broadcasting) {
      socket.emit("voice_broadcast_stop");
      closeBroadcast();
      return;
    }
    if (!socket?.connected) {
      setError("Live auction connection is not ready.");
      return;
    }

    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      socket.emit("voice_broadcast_start", (result) => {
        if (!result?.success) {
          closeBroadcast();
          setError(result?.message || "Unable to start the broadcast.");
          return;
        }
        setStarting(false);
        setBroadcasting(true);
      });
    } catch (requestError) {
      closeBroadcast();
      setError(
        requestError.name === "NotAllowedError"
          ? "Allow microphone access in your browser to start speaking."
          : "Unable to access a microphone on this device.",
      );
      setStarting(false);
    }
  };

  return (
    <section className="card auction-voice-control" aria-live="polite">
      <div className="auction-voice-copy">
        <span className="eyebrow">AUCTION AUDIO</span>
        <strong>
          {broadcasting ? "Your microphone is live" : "Admin voice broadcast"}
        </strong>
        <span className="muted">
          {broadcasting
            ? `${listenerCount} ${listenerCount === 1 ? "listener" : "listeners"} connected`
            : "Speak live to team bidders"}
        </span>
        {error && (
          <span className="auction-voice-error" role="alert">
            {error}
          </span>
        )}
      </div>
      <button
        className={`btn ${broadcasting ? "secondary" : "primary"}`}
        type="button"
        onClick={toggleBroadcast}
        disabled={starting}
        aria-pressed={broadcasting}
      >
        {broadcasting ? <MicOff size={16} /> : <Mic size={16} />}
        {starting
          ? "Starting..."
          : broadcasting
            ? "Stop speaking"
            : "Start speaking"}
      </button>
    </section>
  );
}

export function AuctionVoiceListener({ socket }) {
  const [adminId, setAdminId] = useState(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const audioRef = useRef(null);
  const peerRef = useRef(null);
  const adminIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const closeConnection = () => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
    setNeedsTap(false);
  };

  const joinBroadcast = (nextAdminId) => {
    if (!nextAdminId || nextAdminId === socket?.id) return;
    if (adminIdRef.current === nextAdminId && peerRef.current) return;
    closeConnection();
    adminIdRef.current = nextAdminId;
    setAdminId(nextAdminId);
    socket.emit("voice_listener_join");
  };

  useEffect(() => {
    if (!socket) return undefined;

    const onStatus = ({ adminId: nextAdminId }) => {
      if (nextAdminId) joinBroadcast(nextAdminId);
      else {
        adminIdRef.current = null;
        setAdminId(null);
        closeConnection();
      }
    };
    const onStarted = ({ adminId: nextAdminId }) => joinBroadcast(nextAdminId);
    const onStopped = () => {
      adminIdRef.current = null;
      setAdminId(null);
      closeConnection();
    };
    const onSignal = async ({ fromId, signal }) => {
      if (!adminIdRef.current || fromId !== adminIdRef.current) return;

      try {
        if (signal?.description) {
          let peer = peerRef.current;
          if (!peer) {
            peer = new RTCPeerConnection(rtcConfiguration);
            peerRef.current = peer;
            peer.ontrack = ({ streams }) => setRemoteStream(streams[0]);
            peer.onicecandidate = ({ candidate }) => {
              if (candidate) sendSignal(socket, fromId, { candidate });
            };
            peer.onconnectionstatechange = () => {
              if (["failed", "closed"].includes(peer.connectionState)) {
                closeConnection();
              }
            };
          }
          await peer.setRemoteDescription(signal.description);
          await applyPendingCandidates(peer, pendingCandidatesRef.current);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal(socket, fromId, { description: peer.localDescription });
        } else if (signal?.candidate) {
          if (peerRef.current?.remoteDescription) {
            await peerRef.current.addIceCandidate(signal.candidate);
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch {
        closeConnection();
      }
    };
    const onConnect = () => socket.emit("voice_status_request");

    socket.on("voice_broadcast_status", onStatus);
    socket.on("voice_broadcast_started", onStarted);
    socket.on("voice_broadcast_stopped", onStopped);
    socket.on("voice_signal", onSignal);
    socket.on("connect", onConnect);
    socket.emit("voice_status_request");

    return () => {
      socket.off("voice_broadcast_status", onStatus);
      socket.off("voice_broadcast_started", onStarted);
      socket.off("voice_broadcast_stopped", onStopped);
      socket.off("voice_signal", onSignal);
      socket.off("connect", onConnect);
      closeConnection();
      adminIdRef.current = null;
    };
  }, [socket]);

  useEffect(() => {
    if (!remoteStream || !audioRef.current) return;
    audioRef.current.srcObject = remoteStream;
    audioRef.current
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
  }, [remoteStream]);

  const enableAudio = () => {
    audioRef.current
      ?.play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
  };

  return (
    <section className="card auction-voice-listener" aria-live="polite">
      <audio ref={audioRef} autoPlay playsInline />
      <div className="auction-voice-copy">
        <span className="eyebrow">ADMIN AUDIO</span>
        <strong>{adminId ? "Admin is speaking" : "Admin audio is off"}</strong>
        <span className="muted">
          {adminId
            ? "Live voice updates for team bidders"
            : "You will hear the admin when a broadcast starts"}
        </span>
      </div>
      {needsTap && (
        <button className="btn secondary" type="button" onClick={enableAudio}>
          <Volume2 size={16} /> Enable audio
        </button>
      )}
      {!adminId && (
        <MicOff className="auction-voice-idle" size={19} aria-hidden="true" />
      )}
    </section>
  );
}
