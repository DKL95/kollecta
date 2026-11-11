import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import Photo from "./Photo";
import { formatMoney } from "../utils/format";

const MAX_OFRECIDOS = 5;

// Ventana para pedir una compra o proponer un intercambio de un artículo del marketplace.
export default function OrderDialog({ tipo, articulo, precio, vendedor, onClose, onCreated }) {
  const esIntercambio = tipo === "intercambio";
  const [entrega, setEntrega] = useState("en_persona");
  const [nota, setNota] = useState("");
  const [misArticulos, setMisArticulos] = useState([]);
  const [ofrecidos, setOfrecidos] = useState([]);
  const [cargandoColeccion, setCargandoColeccion] = useState(esIntercambio);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!esIntercambio) return;
    apiRequest("/coleccion")
      .then((data) => setMisArticulos((data.articulos || []).filter((a) => !a.reservadoPor)))
      .catch((err) => setError(err.message))
      .finally(() => setCargandoColeccion(false));
  }, [esIntercambio]);

  useEffect(() => {
    function alPresionarTecla(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [onClose]);

  function alternarOfrecido(id) {
    setOfrecidos((actuales) => {
      if (actuales.includes(id)) return actuales.filter((x) => x !== id);
      if (actuales.length >= MAX_OFRECIDOS) return actuales;
      return [...actuales, id];
    });
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;

    if (esIntercambio && ofrecidos.length === 0) {
      setError("Elige al menos un artículo de tu colección para ofrecer.");
      return;
    }

    setEnviando(true);
    setError("");
    try {
      const respuesta = await apiRequest("/ordenes", {
        method: "POST",
        body: {
          articuloId: articulo._id,
          tipo,
          entrega,
          nota: nota.trim(),
          ...(esIntercambio ? { ofrecidos } : {}),
        },
      });
      onCreated(respuesta.orden);
    } catch (err) {
      setError(err.message || "No se pudo enviar la solicitud.");
      setEnviando(false);
    }
  }

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-dialog-title">
        <div className="group-dialog-head">
          <h3 id="order-dialog-title">{esIntercambio ? "Proponer intercambio" : "Comprar artículo"}</h3>
          <button type="button" className="group-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form className="group-dialog-body" onSubmit={enviar}>
          <div className="order-summary">
            <span className="order-summary-thumb">
              <Photo src={articulo.imagenes?.[0]} alt={articulo.titulo} cover />
            </span>
            <span>
              <strong>{articulo.titulo}</strong>
              <small>
                {articulo.grupo} · de @{vendedor?.username}
              </small>
            </span>
            {!esIntercambio && <b className="order-summary-price">{formatMoney(precio)} MXN</b>}
          </div>

          {esIntercambio && (
            <div className="group-field">
              <span>
                ¿Qué ofreces a cambio? ({ofrecidos.length}/{MAX_OFRECIDOS})
              </span>
              {cargandoColeccion ? (
                <p className="messages-search-status">Cargando tu colección...</p>
              ) : misArticulos.length === 0 ? (
                <p className="messages-search-status">
                  Tu colección está vacía. Agrega piezas en "Mi colección" para poder intercambiarlas.
                </p>
              ) : (
                <div className="order-offer-grid">
                  {misArticulos.map((mio) => {
                    const elegido = ofrecidos.includes(mio._id);
                    return (
                      <button
                        type="button"
                        key={mio._id}
                        className={`order-offer ${elegido ? "is-selected" : ""}`}
                        onClick={() => alternarOfrecido(mio._id)}
                        aria-pressed={elegido}
                      >
                        <span className="order-offer-thumb">
                          <Photo src={mio.imagenes?.[0]} alt={mio.titulo} cover />
                        </span>
                        <span className="order-offer-title">{mio.titulo}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="group-field">
            <span>Entrega</span>
            <div className="trade-toggle">
              <button
                type="button"
                className={`opt ${entrega === "en_persona" ? "active" : ""}`}
                onClick={() => setEntrega("en_persona")}
              >
                En persona
              </button>
              <button
                type="button"
                className={`opt ${entrega === "envio" ? "active" : ""}`}
                onClick={() => setEntrega("envio")}
              >
                Envío
              </button>
            </div>
          </div>

          <label className="group-field">
            <span>Mensaje para @{vendedor?.username} (opcional)</span>
            <textarea
              className="order-note"
              value={nota}
              maxLength={500}
              rows={3}
              placeholder={esIntercambio ? "Cuéntale por qué te interesa el cambio..." : "¿Dónde y cuándo podrían verse?"}
              onChange={(event) => setNota(event.target.value)}
            />
          </label>

          <p className="order-disclaimer">
            El pago se acuerda directamente con la otra persona; KollectA registra la operación y abre un chat entre
            ustedes. No compartas contraseñas ni datos bancarios completos.
          </p>

          {error && <p className="form-error">{error}</p>}

          <div className="group-dialog-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
              {enviando ? "Enviando..." : esIntercambio ? "Enviar propuesta" : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
