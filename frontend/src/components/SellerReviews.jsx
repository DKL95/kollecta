import { Link } from "react-router-dom";
import { timeAgo } from "../utils/format";
import { UserAvatar } from "./Avatar";
import EmptyState from "./EmptyState";

function Estrellas({ valor }) {
  return (
    <span className="review-stars" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(valor) ? "on" : ""} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

// Reputación como vendedor: promedio, distribución de estrellas y reseñas recientes.
// `reputacion` viene de GET /api/ordenes/resumen/:username.
export default function SellerReviews({ reputacion, username, propio }) {
  if (!reputacion) return <p className="sub">Cargando reseñas…</p>;

  const { operaciones, calificaciones, promedio, distribucion = {}, resenas = [] } = reputacion;

  if (operaciones === 0) {
    return (
      <EmptyState icon="star">
        {propio ? "Todavía no completas ninguna venta. Las reseñas aparecen aquí cuando te califiquen." : `@${username} todavía no tiene ventas completadas.`}
      </EmptyState>
    );
  }

  return (
    <div className="reviews">
      <section className="card reviews-summary">
        <div className="reviews-score">
          <b>{promedio ?? "—"}</b>
          {promedio && <Estrellas valor={promedio} />}
          <small>
            {calificaciones} calificación{calificaciones === 1 ? "" : "es"} · {operaciones} operación
            {operaciones === 1 ? "" : "es"} completada{operaciones === 1 ? "" : "s"}
          </small>
        </div>
        {calificaciones > 0 && (
          <ol className="reviews-bars" aria-label="Distribución de calificaciones">
            {[5, 4, 3, 2, 1].map((n) => {
              const total = distribucion[n] || 0;
              return (
                <li key={n}>
                  <span>{n} ★</span>
                  <span className="reviews-bar">
                    <span style={{ width: `${(total / calificaciones) * 100}%` }} />
                  </span>
                  <span className="reviews-count">{total}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {resenas.length === 0 ? (
        <EmptyState icon="star">Aún nadie ha dejado una calificación.</EmptyState>
      ) : (
        <ul className="reviews-list">
          {resenas.map((r) => (
            <li key={r.id} className="card review">
              <div className="review-head">
                {r.comprador ? (
                  <Link to={`/perfil/${encodeURIComponent(r.comprador.username)}`} className="review-author">
                    <UserAvatar user={r.comprador} size={32} fontSize={12} />
                    <span>
                      <strong>{r.comprador.nombre || r.comprador.username}</strong>
                      <small>@{r.comprador.username}</small>
                    </span>
                  </Link>
                ) : (
                  <span className="review-author">Cuenta eliminada</span>
                )}
                <Estrellas valor={r.estrellas} />
              </div>
              {r.comentario && <p className="review-text">“{r.comentario}”</p>}
              <small className="review-meta">
                {r.tipo === "compra" ? "Compró" : "Intercambió"} {r.articulo} · {timeAgo(r.fecha)}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
