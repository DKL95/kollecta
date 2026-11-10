import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { GROUP_NAMES } from "../../data/mockData";
import AuthVisual from "./AuthVisual";

const INITIAL_FORM = { name: "", username: "", email: "", password: "", descripcion: "", bias: GROUP_NAMES[0] };

export default function RegisterPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = "KollectA — Crear cuenta";
  }, []);

  if (user) return <Navigate to="/inicio" replace />;

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

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (photo) body.append("fotoPerfil", photo);

    setSending(true);
    try {
      const data = await apiRequest("/auth/register", { method: "POST", body });
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
        headline="Tu próxima photocard favorita está a un intercambio de distancia."
        sub="Crea tu perfil de coleccionista, arma tu vitrina y conéctate con fans de tus grupos favoritos."
        cards={[["Sigue", "grupos"], ["Presume", "tu colección"], ["Haz", "amigos"]]}
      />

      <div className="auth-form-side">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="top-links">
            <span style={{ fontSize: 13, color: "var(--text-faint)" }}>
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" style={{ color: "var(--cyan)", fontWeight: 700 }}>
                Inicia sesión
              </Link>
            </span>
          </div>
          <h1>Crea tu cuenta</h1>
          <p className="lead">Empieza a coleccionar, comprar, vender e intercambiar en minutos.</p>

          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Nombre</label>
              <input type="text" id="name" name="name" placeholder="Tu nombre" required value={form.name} onChange={updateField} />
            </div>
            <div className="field">
              <label htmlFor="username">Usuario</label>
              <input type="text" id="username" name="username" placeholder="usuario" required value={form.username} onChange={updateField} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input type="email" id="email" name="email" placeholder="tucorreo@ejemplo.com" required value={form.email} onChange={updateField} />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input type="password" id="password" name="password" placeholder="Mínimo 8 caracteres" required value={form.password} onChange={updateField} />
          </div>
          <div className="field">
            <label htmlFor="fotoPerfil">Foto de perfil</label>
            <input type="file" id="fotoPerfil" accept="image/*" onChange={(event) => setPhoto(event.target.files[0] || null)} />
          </div>
          <div className="field">
            <label htmlFor="descripcion">Descripción</label>
            <textarea id="descripcion" name="descripcion" placeholder="Cuéntanos un poco sobre ti..." rows="3" value={form.descripcion} onChange={updateField} />
          </div>
          <div className="field">
            <label htmlFor="bias">Grupo favorito (bias)</label>
            <select id="bias" name="bias" value={form.bias} onChange={updateField}>
              {GROUP_NAMES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="checkbox-row">
            <input type="checkbox" id="terms" required defaultChecked />
            <label htmlFor="terms" style={{ margin: 0 }}>
              Acepto los términos y condiciones de la comunidad
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
            {sending ? "Creando cuenta…" : "Crear mi cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
