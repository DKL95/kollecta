import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import { formatMoney } from "../utils/format";
import { ESTADOS, PASOS, accionesDisponibles, etiquetaEstado, siguientePaso } from "../utils/ordenes";

function fecha(valor) {
  return new Date(valor).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function Estrellas({ valor, onChange }) {
  return (
    <span className="order-stars" role={onChange ? "radiogroup" : undefined} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={`${n} estrella${n === 1 ? "" : "s"}`}
            className={n <= valor ? "on" : ""}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= valor ? "on" : ""}>
            ★
          </span>
        )
      )}
    </span>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accionError, setAccionError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    apiRequest(`/ordenes/${id}`)
      .then((data) => !cancelado && setOrden(data.orden))
      .catch((err) => !cancelado && setError(err.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  async function ejecutar(accion) {
    if (guardando) return;
    const peligrosa = accion.peligro;
    if (peligrosa && !window.confirm(`¿Seguro que quieres "${accion.label.toLowerCase()}"?`)) return;

    setGuardando(true);
    setAccionError("");
    try {
      if (accion.estado === "retirar") {
        await apiRequest(`/ordenes/${id}`, { method: "DELETE" });
        const data = await apiRequest(`/ordenes/${id}`);
        setOrden(data.orden);
      } else {
        const data = await apiRequest(`/ordenes/${id}/estado`, { method: "PATCH", body: { estado: accion.estado } });
        setOrden(data.orden);
      }
      window.dispatchEvent(new Event("notificaciones-actualizadas"));
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function calificar(event) {
    event.preventDefault();
    if (!estrellas || guardando) return;
    setGuardando(true);
    setAccionError("");
    try {
      const data = await apiRequest(`/ordenes/${id}/calificacion`, {
        method: "POST",
        body: { estrellas, comentario: comentario.trim() },
      });
      setOrden(data.orden);
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main className="page">
        <p className="sub">Cargando orden...</p>
      </main>
    );
  }

  if (error || !orden) {
    return (
      <main className="page">
        <EmptyState icon="bag">{error || "Orden no encontrada."}</EmptyState>
        <Link to="/ordenes" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
          Volver a mis órdenes
        </Link>
      </main>
    );
  }

  const otra = orden.miRol === "comprador" ? orden.vendedor : orden.comprador;
  const acciones = accionesDisponibles(orden);
  const terminada = ["rechazada", "cancelada"].includes(orden.estado);
  const pasos = orden.entrega === "envio" ? PASOS : PASOS.filter((p) => p !== "enviada");
  const indiceActual = pasos.indexOf(orden.estado);
  const fechaDe = (estado) => orden.historial.find((h) => h.estado === estado)?.fecha;
  const puedeCalificar = orden.miRol === "comprador" && orden.estado === "completada" && !orden.calificacion?.estrellas;

  return (
    <main className="page order-detail">
      <Link to={`/ordenes${orden.miRol === "vendedor" ? "?vista=ventas" : ""}`} className="detail-back">
        <span aria-hidden="true">←</span> Volver a mis órdenes
      </Link>

      <div className="card order-head">
        <span className="order-head-thumb">
          <Photo src={orden.articulo.imagen} alt={orden.articulo.titulo} cover />
        </span>
        <div className="order-head-main">
          <span className="detail-group">{orden.articulo.grupo}</span>
          <h2>
            <Link to={`/marketplace/${orden.articulo.articuloId}`}>{orden.articulo.titulo}</Link>
          </h2>
          <div className="badges-row">
            <span className={`pill ${ESTADOS[orden.estado]?.pill || ""}`}>{etiquetaEstado(orden.estado)}</span>
            <span className="pill purple">{orden.tipo === "compra" ? "Compra" : "Intercambio"}</span>
            <span className="pill">{orden.entrega === "envio" ? "Envío" : "En persona"}</span>
          </div>
        </div>
        {orden.tipo === "compra" && (
          <div className="order-head-price">
            <span>{formatMoney(orden.precio)}</span>
            <small>MXN</small>
          </div>
        )}
      </div>

      <div className="order-grid">
        <section className="card order-section">
          <h3>Estado</h3>
          <p className="order-next">{siguientePaso(orden)}</p>

          {terminada ? (
            <ol className="order-timeline">
              {orden.historial.map((h, i) => (
                <li key={i} className="done">
                  <span className="dot" />
                  <span>
                    <strong>{etiquetaEstado(h.estado)}</strong>
                    <small>
                      {fecha(h.fecha)}
                      {h.nota ? ` · ${h.nota}` : ""}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="order-timeline">
              {pasos.map((paso, i) => (
                <li key={paso} className={i <= indiceActual ? "done" : ""}>
                  <span className="dot" />
                  <span>
                    <strong>{etiquetaEstado(paso)}</strong>
                    {fechaDe(paso) && <small>{fecha(fechaDe(paso))}</small>}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {acciones.length > 0 && (
            <div className="order-actions">
              {acciones.map((accion) => (
                <button
                  key={accion.estado}
                  type="button"
                  className={`btn btn-sm ${accion.primaria ? "btn-primary" : accion.peligro ? "btn-ghost order-danger" : "btn-secondary"}`}
                  onClick={() => ejecutar(accion)}
                  disabled={guardando}
                >
                  {accion.label}
                </button>
              ))}
            </div>
          )}

          {accionError && <p className="form-error">{accionError}</p>}

          {puedeCalificar && (
            <form className="order-rate" onSubmit={calificar}>
              <h4>¿Cómo te fue con @{orden.vendedor.username}?</h4>
              <Estrellas valor={estrellas} onChange={setEstrellas} />
              <textarea
                className="order-note"
                rows={2}
                maxLength={500}
                placeholder="Comentario (opcional)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!estrellas || guardando}>
                Enviar calificación
              </button>
            </form>
          )}

          {orden.calificacion?.estrellas && (
            <div className="order-rate">
              <h4>Calificación</h4>
              <Estrellas valor={orden.calificacion.estrellas} />
              {orden.calificacion.comentario && <p>"{orden.calificacion.comentario}"</p>}
            </div>
          )}
        </section>

        <aside className="order-side">
          {otra && (
            <section className="card order-section">
              <h3>{orden.miRol === "comprador" ? "Vendedor" : orden.miRol === "vendedor" ? "Comprador" : "Participantes"}</h3>
              {orden.miRol ? (
                <Link to={`/perfil/${encodeURIComponent(otra.username)}`} className="order-person">
                  <UserAvatar user={otra} size={40} fontSize={14} />
                  <span>
                    <strong>{otra.nombre || otra.username}</strong>
                    <small>@{otra.username}</small>
                  </span>
                </Link>
              ) : (
                <p className="sub">
                  @{orden.comprador.username} → @{orden.vendedor.username}
                </p>
              )}
              {orden.conversacion && orden.miRol && (
                <Link to={`/mensajes?c=${orden.conversacion}`} className="btn btn-secondary btn-sm order-chat-btn">
                  <Icon name="chat" size={15} /> Abrir chat
                </Link>
              )}
            </section>
          )}

          {orden.tipo === "intercambio" && (
            <section className="card order-section">
              <h3>Ofrecido a cambio</h3>
              <ul className="order-offered">
                {orden.ofrecidos.map((o) => (
                  <li key={o.articuloId}>
                    <span className="order-row-thumb">
                      <Photo src={o.imagen} alt={o.titulo} cover />
                    </span>
                    <span>
                      <strong>{o.titulo}</strong>
                      <small>{o.grupo}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {orden.nota && (
            <section className="card order-section">
              <h3>Mensaje inicial</h3>
              <p className="order-quote">{orden.nota}</p>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
