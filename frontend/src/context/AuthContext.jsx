import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest, SESSION_EXPIRED_EVENT, TOKEN_KEY, USER_KEY } from "../api/client";

const AuthContext = createContext(null);

// El backend deja una cookie httpOnly para que <img src="/api/imagenes/..."> lleve
// token. Esta marca solo recuerda que ya se pidió en este navegador.
const COOKIE_MEDIOS_KEY = "kollecta_medios_lista";

function marcarMedios(lista) {
  try {
    if (lista) localStorage.setItem(COOKIE_MEDIOS_KEY, "1");
    else localStorage.removeItem(COOKIE_MEDIOS_KEY);
  } catch {
    // sin almacenamiento: no pasa nada
  }
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (localStorage.getItem(TOKEN_KEY) ? readStoredUser() : null));
  // Sesión abierta antes de existir la cookie: se espera a /auth/me para que las fotos carguen.
  const [mediosListos, setMediosListos] = useState(
    () => !localStorage.getItem(TOKEN_KEY) || localStorage.getItem(COOKIE_MEDIOS_KEY) === "1"
  );

  const saveUser = useCallback((nextUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    (token, nextUser) => {
      localStorage.setItem(TOKEN_KEY, token);
      marcarMedios(true);
      setMediosListos(true);
      saveUser(nextUser);
    },
    [saveUser]
  );

  const logout = useCallback(() => {
    // Borra la cookie de imágenes; si el token ya expiró, la cookie expira sola.
    if (localStorage.getItem(TOKEN_KEY)) apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
    marcarMedios(false);
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
      .then((data) => {
        marcarMedios(true);
        saveUser(data.usuario);
      })
      .catch(() => {})
      .finally(() => setMediosListos(true));
  }, [saveUser]);

  return (
    <AuthContext.Provider value={{ user, login, logout, saveUser }}>{mediosListos ? children : null}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
