import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5002/api",
  withCredentials: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("rotaract_token") || null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    api
      .get("/auth/me")
      .then((response) => setUser(response.data.user || response.data))
      .catch(() => {
        localStorage.removeItem("rotaract_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (payload) => {
    const response = await api.post("/auth/login", payload);
    const { accessToken, user: userData } = response.data;
    localStorage.setItem("rotaract_token", accessToken);
    setToken(accessToken);
    setUser(userData);
    return response.data;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", payload);
    const { accessToken, user: userData } = response.data;
    localStorage.setItem("rotaract_token", accessToken);
    setToken(accessToken);
    setUser(userData);
    return response.data;
  };

  const joinTeam = async (payload) => {
    const response = await api.post("/auth/join-team", payload);
    const { accessToken, user: userData } = response.data;
    localStorage.setItem("rotaract_token", accessToken);
    setToken(accessToken);
    setUser(userData);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("rotaract_token");
      setUser(null);
      setToken(null);
    }
  };

  const value = useMemo(
    () => ({ user, token, login, register, joinTeam, logout, loading }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
