import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "../components/Avatar";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES, GROUP_NAMES } from "../data/mockData";
import { categoryClass, categoryIcon } from "../utils/categories";
import { formatMoney } from "../utils/format";

const MODES = ["Venta", "Intercambio", "Ambos"];
const CONDITIONS = ["Nuevo / sellado", "Como nuevo", "Buen estado", "Con desgaste visible"];

export default function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    group: GROUP_NAMES[0],
    type: CATEGORIES[0],
    mode: "Venta",
    price: "",
    condition: CONDITIONS[0],
    wants: "",
    description: "",
  });

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    alert("¡Artículo publicado! (simulado — el marketplace todavía no está conectado a la base de datos)");
    navigate("/marketplace");
  }

  const isTrade = form.mode === "Intercambio";

  return (
    <main className="page">
      <div className="layout-2col">
        <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <div className="section-title"><h3>Datos del artículo</h3></div>

          <div className="field">
            <label htmlFor="s-title">Título</label>
            <input type="text" id="s-title" name="title" placeholder="Ej. Photocard Jimin — 'Face' Album" required value={form.title} onChange={updateField} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="s-group">Grupo</label>
              <select id="s-group" name="group" value={form.group} onChange={updateField}>
                {GROUP_NAMES.map((name) => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-type">Categoría</label>
              <select id="s-type" name="type" value={form.type} onChange={updateField}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Fotos del artículo</label>
            <div style={{ border: "1.5px dashed var(--border-strong)", borderRadius: "var(--radius-md)", padding: 28, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Arrastra tus fotos aquí o <span style={{ color: "var(--cyan)", fontWeight: 700 }}>selecciona archivos</span>
              <div className="hint" style={{ marginTop: 6 }}>Sugerencia: mínimo 2 fotos (frente y detalle).</div>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 8 }}><h3>Modalidad</h3></div>
          <div className="trade-toggle">
            {MODES.map((mode) => (
              <div key={mode} className={`opt ${form.mode === mode ? "active" : ""}`} onClick={() => setForm({ ...form, mode })}>
                {mode}
              </div>
            ))}
          </div>

          {!isTrade && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="s-price">Precio (MXN)</label>
                <input type="number" id="s-price" name="price" placeholder="0.00" min="0" value={form.price} onChange={updateField} />
              </div>
              <div className="field">
                <label htmlFor="s-condition">Estado</label>
                <select id="s-condition" name="condition" value={form.condition} onChange={updateField}>
                  {CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
                </select>
              </div>
            </div>
          )}

          {form.mode !== "Venta" && (
            <div className="field">
              <label htmlFor="s-wants">¿Qué buscas a cambio?</label>
              <input type="text" id="s-wants" name="wants" placeholder="Ej. Photocard de Rosé, versión japonesa" value={form.wants} onChange={updateField} />
            </div>
          )}

          <div className="field">
            <label htmlFor="s-desc">Descripción</label>
            <textarea id="s-desc" name="description" placeholder="Cuenta el estado del artículo, si viene con extras, etc." value={form.description} onChange={updateField} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary btn-block">Publicar artículo</button>
            <button type="button" className="btn btn-secondary">Guardar borrador</button>
          </div>
        </form>

        <div>
          <div className="card side-card">
            <h4>Vista previa</h4>
            <div className="card product-card" style={{ cursor: "default" }}>
              <div className={`thumb ${categoryClass(form.type)}`}>
                <span className="category-icon"><Icon name={categoryIcon(form.type)} size={32} /></span>
                <span className={`tag pill ${isTrade ? "cyan" : "pink"}`}>{form.mode}</span>
              </div>
              <div className="body">
                <div className="group-name">{form.group}</div>
                <div className="title">{form.title || "Título de tu artículo"}</div>
                <div className="price-row">
                  <span className="price">
                    {isTrade ? (
                      <><Icon name="repeat" size={14} /> Intercambio</>
                    ) : (
                      <>{formatMoney(form.price || 0)} <small>MXN</small></>
                    )}
                  </span>
                </div>
                <div className="seller">
                  <UserAvatar user={user} size={20} fontSize={9} />
                  <span>@{user.username}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="card side-card">
            <h4>Consejos para vender rápido</h4>
            <ul style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
              <li>Usa buena iluminación y fotos del artículo real.</li>
              <li>Sé honesto con el estado del artículo.</li>
              <li>Responde rápido a los mensajes de interesados.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
