import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import AuthVisual from "./AuthVisual";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = "KollectA — Iniciar sesión";
  }, []);

  if (user) return <Navigate to="/inicio" replace />;

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const data = await apiRequest("/auth/login", { method: "POST", body: form });
      login(data.token, data.usuario);
      navigate("/inicio");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthVisual
        headline="Compra, vende, intercambia y presume tu colección K-pop."
        sub="Únete a miles de fans que coleccionan photocards, álbumes y merch oficial, siguen a sus grupos favoritos y hacen amigos con el mismo bias."
        cards={[["Photocard", "Jimin · BTS"], ["Álbum", "Born Pink"], ["Lightstick", "Ver. 3"]]}
      />

      <div className="auth-form-side">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="top-links">
            <span style={{ fontSize: 13, color: "var(--text-faint)" }}>
              ¿No tienes cuenta?{" "}
              <Link to="/registro" style={{ color: "var(--cyan)", fontWeight: 700 }}>
                Regístrate
              </Link>
            </span>
          </div>
          <h1>Bienvenido de vuelta</h1>
          <p className="lead">Inicia sesión para ver tu feed, tu colección y tus intercambios.</p>

          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input type="email" id="email" name="email" placeholder="tucorreo@ejemplo.com" required value={form.email} onChange={updateField} />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input type="password" id="password" name="password" placeholder="••••••••" required value={form.password} onChange={updateField} />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
            {sending ? "Entrando…" : "Iniciar sesión"}
          </button>

          <p className="auth-footer-note">Inicia sesión con tu cuenta de KollectA.</p>
        </form>
      </div>
    </div>
  );
}
