/* ==========================================================================
   Cliente de la API: agrega el token, convierte la respuesta a JSON y
   lanza un Error con el mensaje del backend cuando algo falla.
   ========================================================================== */

export const TOKEN_KEY = "kollecta_token";
export const USER_KEY = "kollecta_usuario";
export const SESSION_EXPIRED_EVENT = "kollecta:sesion-expirada";

export async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error("No se pudo conectar con el servidor");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(data.mensaje || "Ocurrió un error en el servidor");
  }

  return data;
}
