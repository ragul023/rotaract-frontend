import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5002/api",
  withCredentials: true,
});

const accessTokenKey = "rotaract_token";
const refreshTokenKey = "rotaract_refresh_token";
const userKey = "rotaract_user";

const saveSessionTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) {
    localStorage.setItem(accessTokenKey, accessToken);
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  }
  if (refreshToken) localStorage.setItem(refreshTokenKey, refreshToken);
};

const clearSession = () => {
  localStorage.removeItem(accessTokenKey);
  localStorage.removeItem(refreshTokenKey);
  localStorage.removeItem(userKey);
  delete api.defaults.headers.common.Authorization;
};

const refreshSession = async (refreshToken) => {
  const response = await api.post("/auth/refresh", { refreshToken });
  saveSessionTokens(response.data);
  return response.data;
};

const tokenExpiresAt = (token) => {
  try {
    const encodedPayload = token.split(".")[1];
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(base64)).exp * 1000;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("rotaract_token") || null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      let activeAccessToken = localStorage.getItem(accessTokenKey);
      let activeRefreshToken = localStorage.getItem(refreshTokenKey);
      const cachedUser = localStorage.getItem(userKey);

      if (!activeAccessToken && !activeRefreshToken) {
        setLoading(false);
        return;
      }

      try {
        let userResponse;
        if (activeAccessToken) {
          api.defaults.headers.common.Authorization = `Bearer ${activeAccessToken}`;
          try {
            userResponse = await api.get("/auth/me");
          } catch (requestError) {
            if (requestError.response?.status !== 401 || !activeRefreshToken) {
              throw requestError;
            }
          }
        }

        if (!userResponse && activeRefreshToken) {
          const refreshed = await refreshSession(activeRefreshToken);
          activeAccessToken = refreshed.accessToken;
          activeRefreshToken = refreshed.refreshToken;
          userResponse = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${activeAccessToken}` },
          });
        }

        if (cancelled) return;
        if (!userResponse) throw new Error("Unable to restore session");
        const userData = userResponse.data.user || userResponse.data;
        localStorage.setItem(userKey, JSON.stringify(userData));
        setUser(userData);
        setToken(activeAccessToken);
      } catch (requestError) {
        if (cancelled) return;
        if ([401, 403].includes(requestError.response?.status)) {
          clearSession();
          setUser(null);
          setToken(null);
        } else if (cachedUser && activeAccessToken) {
          setUser(JSON.parse(cachedUser));
          setToken(activeAccessToken);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const refreshToken = localStorage.getItem(refreshTokenKey);
    if (!refreshToken) return undefined;
    const expiration = tokenExpiresAt(token);
    const delay = expiration
      ? Math.max(1000, expiration - Date.now() - 5 * 60 * 1000)
      : 12 * 60 * 60 * 1000;
    const timeout = window.setTimeout(async () => {
      try {
        const refreshed = await refreshSession(
          localStorage.getItem(refreshTokenKey),
        );
        setToken(refreshed.accessToken);
      } catch (requestError) {
        if ([401, 403].includes(requestError.response?.status)) {
          clearSession();
          setUser(null);
          setToken(null);
        }
      }
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [token]);

  const acceptAuthResponse = (data) => {
    saveSessionTokens(data);
    if (data.user) localStorage.setItem(userKey, JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
  };

  const login = async (payload) => {
    const response = await api.post("/auth/login", payload);
    acceptAuthResponse(response.data);
    return response.data;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", payload);
    acceptAuthResponse(response.data);
    return response.data;
  };

  const joinTeam = async (payload) => {
    const response = await api.post("/auth/join-team", payload);
    acceptAuthResponse(response.data);
    return response.data;
  };

  const updateSession = (data) => acceptAuthResponse(data);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
      setUser(null);
      setToken(null);
    }
  };

  const value = useMemo(
    () => ({ user, token, login, register, joinTeam, updateSession, logout, loading }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
