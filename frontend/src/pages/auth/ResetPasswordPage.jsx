import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/client";
import PasswordInput from "../../components/PasswordInput";
import AuthVisual from "./AuthVisual";

// Paso 2 de "Recuperar contraseña": se abre desde el enlace del correo (/restablecer?token=...).
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmar: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = "KollectA — Nueva contraseña";
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (form.password !== form.confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setSending(true);
    try {
      const data = await apiRequest("/auth/restablecer", { method: "POST", body: { token, password: form.password } });
      navigate("/login", { replace: true, state: { aviso: data.mensaje } });
    } catch (requestError) {
      setError(requestError.message);
      setSending(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthVisual
        headline="Elige una contraseña nueva y vuelve a tu colección."
        sub="Usa al menos 8 caracteres. El enlace del correo sirve una sola vez y vence en 1 hora."
        cards={[["Segura", "8+ caracteres"], ["Un uso", "por enlace"], ["Vence", "en 1 hora"]]}
      />

      <div className="auth-form-side">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="top-links">
            <Link to="/login" style={{ fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}>
              Volver a iniciar sesión
            </Link>
          </div>
          <h1>Nueva contraseña</h1>

          {!token ? (
            <>
              <p className="form-error">El enlace no es válido. Ábrelo tal cual llegó a tu correo o pide uno nuevo.</p>
              <Link to="/recuperar" className="btn btn-primary btn-block">Pedir un enlace nuevo</Link>
            </>
          ) : (
            <>
              <p className="lead">Escribe tu nueva contraseña dos veces para confirmarla.</p>
              <div className="field">
                <label htmlFor="password">Nueva contraseña</label>
                <PasswordInput id="password" name="password" placeholder="Mínimo 8 caracteres" required autoComplete="new-password"
                  value={form.password} onChange={updateField} />
              </div>
              <div className="field">
                <label htmlFor="confirmar">Confirmar contraseña</label>
                <PasswordInput id="confirmar" name="confirmar" placeholder="Repite la contraseña" required autoComplete="new-password"
                  value={form.confirmar} onChange={updateField} />
              </div>

              {error && <p className="form-error">{error}</p>}
              {error.includes("venció") && (
                <p className="auth-footer-note" style={{ marginTop: 0, marginBottom: 12 }}>
                  <Link to="/recuperar">Pedir un enlace nuevo</Link>
                </p>
              )}

              <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
                {sending ? "Guardando…" : "Guardar contraseña"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
