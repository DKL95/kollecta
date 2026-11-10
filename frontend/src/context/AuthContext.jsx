import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest, SESSION_EXPIRED_EVENT, TOKEN_KEY, USER_KEY } from "../api/client";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (localStorage.getItem(TOKEN_KEY) ? readStoredUser() : null));

  const saveUser = useCallback((nextUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    (token, nextUser) => {
      localStorage.setItem(TOKEN_KEY, token);
      saveUser(nextUser);
    },
    [saveUser]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Si el backend rechaza el token, se cierra la sesión
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
  }, [logout]);

  // Al abrir la app, refrescar los datos del usuario desde la base de datos
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    apiRequest("/auth/me")
      .then((data) => saveUser(data.usuario))
      .catch(() => {});
  }, [saveUser]);

  return <AuthContext.Provider value={{ user, login, logout, saveUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
