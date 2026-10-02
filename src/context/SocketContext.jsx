import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { io } from "socket.io-client";

import { useAuth } from "./AuthContext";

import AuctionResultModal from "../components/AuctionResultModal";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();

  const [socket, setSocket] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | SOCKET SERVER URL
  |--------------------------------------------------------------------------
  */

  const socketBaseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL;

    if (!apiUrl) {
      return "http://localhost:5002";
    }

    return apiUrl.replace(/\/api\/?$/, "");
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SOCKET CONNECTION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    console.log(
      "Connecting to Socket.IO:",
      socketBaseUrl
    );

    const instance = io(socketBaseUrl, {
      auth: {
        token,
      },

      /*
       * Do NOT force websocket-only.
       *
       * Socket.IO will establish the connection using
       * polling and upgrade to websocket when possible.
       */
      transports: ["polling", "websocket"],

      withCredentials: true,

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    /*
    |--------------------------------------------------------------------------
    | CONNECT
    |--------------------------------------------------------------------------
    */

    instance.on("connect", () => {
      console.log(
        "Socket connected:",
        instance.id
      );

      instance.emit("join_game", {
        room: "auction-room",
      });
    });

    /*
    |--------------------------------------------------------------------------
    | CONNECT ERROR
    |--------------------------------------------------------------------------
    */

    instance.on("connect_error", (error) => {
      console.error(
        "Socket connection error:",
        error.message
      );

      console.error(
        "Socket connection details:",
        error
      );
    });

    /*
    |--------------------------------------------------------------------------
    | DISCONNECT
    |--------------------------------------------------------------------------
    */

    instance.on("disconnect", (reason) => {
      console.log(
        "Socket disconnected:",
        reason
      );
    });

    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    instance.on("error", (error) => {
      console.error(
        "Socket error:",
        error
      );
    });

    /*
    |--------------------------------------------------------------------------
    | SAVE SOCKET
    |--------------------------------------------------------------------------
    */

    setSocket(instance);

    /*
    |--------------------------------------------------------------------------
    | CLEANUP
    |--------------------------------------------------------------------------
    */

    return () => {
      console.log("Closing Socket.IO connection");

      instance.disconnect();
    };
  }, [socketBaseUrl, token]);

  /*
  |--------------------------------------------------------------------------
  | CONTEXT VALUE
  |--------------------------------------------------------------------------
  */

  const value = useMemo(
    () => ({
      socket,
    }),
    [socket]
  );

  /*
  |--------------------------------------------------------------------------
  | PROVIDER
  |--------------------------------------------------------------------------
  */

  return (
    <SocketContext.Provider value={value}>
      {children}

      <AuctionResultModal socket={socket} />
    </SocketContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export const useSocket = () => {
  return useContext(SocketContext);
};