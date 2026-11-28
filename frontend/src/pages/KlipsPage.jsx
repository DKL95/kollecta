import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import KlipComentarios from "../components/klips/KlipComentarios";
import KlipItem from "../components/klips/KlipItem";
import NuevoKlipDialog from "../components/klips/NuevoKlipDialog";

/**
 * Klips: feed vertical que se desliza de uno en uno (scroll-snap).
 * Se reproduce solo el que está en pantalla y se cargan más al acercarse al final.
 * /klips/:id abre primero ese Klip; ?autor= y ?grupo= filtran el feed.
 */
export default function KlipsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const autor = params.get("autor") || "";
  const grupo = params.get("grupo") || "";

  const [klips, setKlips] = useState([]);
  const [siguiente, setSiguiente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");
  const [activo, setActivo] = useState(0);
  const [silencio, setSilencio] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [comentando, setComentando] = useState(null);
  const contenedor = useRef(null);

  const filtros = useCallback(
    (antes) => {
      const q = new URLSearchParams();
      if (antes) q.set("antes", antes);
      if (autor) q.set("autor", autor);
      if (grupo) q.set("grupo", grupo);
      const texto = q.toString();
      return texto ? `?${texto}` : "";
    },
    [autor, grupo]
  );

  // Primera carga (y cada vez que cambia el filtro o el Klip abierto).
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError("");
    setActivo(0);

    async function cargar() {
      try {
        const [uno, feed] = await Promise.all([
          id ? apiRequest(`/klips/${id}`).catch(() => null) : null,
          apiRequest(`/klips${filtros()}`),
        ]);
        if (cancelado) return;
        const lista = feed.klips.filter((k) => !uno || k.id !== uno.klip.id);
        setKlips(uno ? [uno.klip, ...lista] : lista);
        setSiguiente(feed.siguiente);
        if (id && !uno) setError("Ese Klip ya no está disponible. Te mostramos los más nuevos.");
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    contenedor.current?.scrollTo({ top: 0 });
    return () => {
      cancelado = true;
    };
  }, [id, filtros]);

  const cargarMas = useCallback(async () => {
    if (!siguiente || cargandoMas) return;
    setCargandoMas(true);
    try {
      const feed = await apiRequest(`/klips${filtros(siguiente)}`);
      setKlips((actual) => {
        const ids = new Set(actual.map((k) => k.id));
        return [...actual, ...feed.klips.filter((k) => !ids.has(k.id))];
      });
      setSiguiente(feed.siguiente);
    } catch {
      // se reintenta al seguir deslizando
    } finally {
      setCargandoMas(false);
    }
  }, [siguiente, cargandoMas, filtros]);

  // ¿Cuál Klip está en pantalla? (el que se ve al menos en 60 %)
  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return undefined;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setActivo(Number(entrada.target.dataset.indice));
        }
      },
      { root: raiz, threshold: 0.6 }
    );
    raiz.querySelectorAll("[data-indice]").forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [klips]);

  useEffect(() => {
    if (activo >= klips.length - 3) cargarMas();
  }, [activo, klips.length, cargarMas]);

  // Flechas del teclado para pasar de Klip (en compu).
  useEffect(() => {
    function alPresionar(event) {
      if (subiendo || comentando || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const destino = Math.max(0, Math.min(klips.length - 1, activo + (event.key === "ArrowDown" ? 1 : -1)));
      contenedor.current?.querySelector(`[data-indice="${destino}"]`)?.scrollIntoView({ behavior: "smooth" });
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [activo, klips.length, subiendo, comentando]);

  const cambiar = useCallback((nuevo) => {
    setKlips((actual) => actual.map((k) => (k.id === nuevo.id ? { ...k, ...nuevo } : k)));
  }, []);

  const quitar = useCallback(
    (idKlip) => {
      setKlips((actual) => actual.filter((k) => k.id !== idKlip));
      if (id === idKlip) navigate("/klips", { replace: true });
    },
    [id, navigate]
  );

  function alCrear(klip) {
    setSubiendo(false);
    setKlips((actual) => [klip, ...actual]);
    setActivo(0);
    contenedor.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const titulo = autor ? `Klips de @${autor}` : grupo ? `Klips de ${grupo}` : "";

  return (
    <main className="klips-page">
      <div className="klips-barra">
        {titulo ? (
          <Link to="/klips" className="chip active">
            {titulo} <Icon name="close" size={12} />
          </Link>
        ) : (
          <span className="klips-titulo">
            <Icon name="klip" size={18} /> Klips
          </span>
        )}
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setSubiendo(true)}>
          <Icon name="plus" size={15} /> Subir Klip
        </button>
      </div>

      {error && <p className="klips-error" role="status">{error}</p>}

      <div className="klips-feed" ref={contenedor}>
        {cargando && <EmptyState icon="klip">Cargando Klips…</EmptyState>}

        {!cargando && klips.length === 0 && (
          <EmptyState icon="klip">
            {titulo ? "Todavía no hay Klips aquí." : "Todavía no hay Klips. ¡Sube el primero!"}
          </EmptyState>
        )}

        {klips.map((klip, i) => (
          <div className="klips-slot" data-indice={i} key={klip.id}>
            <KlipItem
              klip={klip}
              activo={i === activo && !subiendo}
              cercano={Math.abs(i - activo) <= 1}
              silencio={silencio}
              onSilencio={setSilencio}
              onCambio={cambiar}
              onBorrado={quitar}
              onComentarios={setComentando}
            />
          </div>
        ))}

        {cargandoMas && <p className="klips-mas">Cargando más…</p>}
        {!cargando && klips.length > 0 && !siguiente && <p className="klips-mas">Ya viste todos los Klips</p>}
      </div>

      {comentando && (
        <KlipComentarios
          klip={comentando}
          onCerrar={() => setComentando(null)}
          onTotal={(total) => cambiar({ id: comentando.id, totalComentarios: total })}
        />
      )}
      {subiendo && <NuevoKlipDialog onCerrar={() => setSubiendo(false)} onCreado={alCrear} />}
    </main>
  );
}
