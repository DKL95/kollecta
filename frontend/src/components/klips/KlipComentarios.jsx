import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { timeAgo } from "../../utils/format";
import { esModerador } from "../../utils/roles";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";

const MAX_COMENTARIO = 300;

// Panel de comentarios de un Klip (sube desde abajo en el celular, a un lado en compu).
export default function KlipComentarios({ klip, onCerrar, onTotal }) {
  const { user } = useAuth();
  const [comentarios, setComentarios] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    apiRequest(`/klips/${klip.id}/comentarios`)
      .then((datos) => !cancelado && setComentarios(datos.comentarios))
      .catch((err) => {
        if (cancelado) return;
        setError(err.message);
        setComentarios([]);
      });
    return () => {
      cancelado = true;
    };
  }, [klip.id]);

  useEffect(() => {
    const conEscape = (event) => event.key === "Escape" && onCerrar();
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [onCerrar]);

  async function enviar(event) {
    event.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    setEnviando(true);
    setError("");
    try {
      const datos = await apiRequest(`/klips/${klip.id}/comentarios`, { method: "POST", body: { texto: limpio } });
      setComentarios((actual) => [...(actual || []), datos.comentario]);
      setTexto("");
      onTotal(datos.totalComentarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function borrar(id) {
    try {
      const datos = await apiRequest(`/klips/${klip.id}/comentarios/${id}`, { method: "DELETE" });
      setComentarios((actual) => actual.filter((c) => c.id !== id));
      onTotal(datos.totalComentarios);
    } catch (err) {
      setError(err.message);
    }
  }

  const puedeBorrarTodo = klip.esMio || esModerador(user);

  return (
    <div className="klip-comentarios-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <aside className="klip-comentarios" role="dialog" aria-modal="true" aria-label="Comentarios del Klip">
        <header>
          <strong>Comentarios{comentarios ? ` (${comentarios.length})` : ""}</strong>
          <button type="button" className="icon-btn" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="close" size={16} />
          </button>
        </header>

        <ul className="klip-comentarios-lista">
          {comentarios === null && <li className="sub">Cargando…</li>}
          {comentarios?.length === 0 && <li className="sub">Sé la primera persona en comentar.</li>}
          {comentarios?.map((c) => (
            <li key={c.id}>
              <Link to={`/perfil/${encodeURIComponent(c.autor.username)}`} onClick={onCerrar}>
                <UserAvatar user={c.autor} size={30} fontSize={11} />
              </Link>
              <div>
                <div className="klip-comentario-cabeza">
                  <strong>{c.autor.nombre || c.autor.username}</strong>
                  <small>{timeAgo(c.fecha)}</small>
                </div>
                <p>{c.texto}</p>
              </div>
              {(c.esMio || puedeBorrarTodo) && (
                <button type="button" className="icon-btn" onClick={() => borrar(c.id)} aria-label="Borrar comentario">
                  <Icon name="trash" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="form-error" style={{ margin: "0 14px 8px" }}>{error}</p>}

        <form className="klip-comentar" onSubmit={enviar}>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un comentario…"
            maxLength={MAX_COMENTARIO}
            aria-label="Escribe un comentario"
            autoFocus
          />
          <button type="submit" className="icon-btn" disabled={enviando || !texto.trim()} aria-label="Enviar comentario">
            <Icon name="send" size={17} />
          </button>
        </form>
      </aside>
    </div>
  );
}
