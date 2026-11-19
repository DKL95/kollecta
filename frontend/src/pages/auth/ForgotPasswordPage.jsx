import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import AuthVisual from "./AuthVisual";

// Paso 1 de "Recuperar contraseña": pide el correo y el backend manda el enlace.
export default function ForgotPasswordPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = "KollectA — Recuperar contraseña";
  }, []);

  if (user) return <Navigate to="/inicio" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const data = await apiRequest("/auth/recuperar", { method: "POST", body: { email } });
      setEnviado(data.mensaje);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthVisual
        headline="¿Olvidaste tu contraseña? Tu colección te espera."
        sub="Te mandamos un enlace a tu correo para que elijas una nueva en un minuto."
        cards={[["Paso 1", "tu correo"], ["Paso 2", "abre el enlace"], ["Paso 3", "nueva contraseña"]]}
      />

      <div className="auth-form-side">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="top-links">
            <Link to="/login" style={{ fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}>
              Volver a iniciar sesión
            </Link>
          </div>
          <h1>Recuperar contraseña</h1>
          <p className="lead">Escribe el correo con el que te registraste y te enviaremos un enlace para restablecerla.</p>

          {enviado ? (
            <>
              <p className="form-success">{enviado}</p>
              <p className="auth-footer-note">
                ¿No te llegó? Espera un minuto y <button type="button" className="link-button" onClick={() => setEnviado("")}>vuelve a intentarlo</button>.
              </p>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input type="email" id="email" name="email" placeholder="tucorreo@ejemplo.com" required autoComplete="email"
                  value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
                {sending ? "Enviando…" : "Enviar enlace"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
