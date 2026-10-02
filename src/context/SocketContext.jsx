import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import AuctionResultModal from "../components/AuctionResultModal";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketBaseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
    : "http://localhost:5002";

  useEffect(() => {
    if (!token) return;

    const instance = io(socketBaseUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    setSocket(instance);

    instance.on("connect", () => {
      instance.emit("join_game", { room: "auction-room" });
    });

    return () => instance.disconnect();
  }, [socketBaseUrl, token]);

  const value = useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={value}>
      {children}
      <AuctionResultModal socket={socket} />
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
