import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/format";
import { ETIQUETA_ROL } from "../utils/roles";

// Cada rol ve sus reportes y los de los roles inferiores.
const SECCIONES = [
  { rol: "usuario", etiqueta: "Mis estadísticas", sub: "Solo tú ves estos datos." },
  { rol: "moderador", etiqueta: "Moderación", sub: "Salud de la comunidad: denuncias y cuentas a vigilar." },
  { rol: "administrador", etiqueta: "Plataforma", sub: "Métricas del negocio y del equipo." },
];

// Paleta de las gráficas validada contra el fondo de las tarjetas (#1c1533).
const COLORES_SERIE = ["#e8478f", "#1a9cc4"];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatearMes(valor) {
  const [anio, mes] = String(valor).split("-");
  return `${MESES[Number(mes) - 1] || mes} ${anio}`;
}

function formatear(valor, tipo) {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (tipo) {
    case "dinero":
      return formatMoney(valor);
    case "porcentaje":
      return `${valor} %`;
    case "estrellas":
      return valor ? `★ ${valor}` : "—";
    case "mes":
      return formatearMes(valor);
    case "fecha":
      return new Date(valor).toLocaleDateString("es-MX");
    case "numero":
      return Number(valor).toLocaleString("es-MX");
    default:
      return String(valor);
  }
}

function descargarCsv(datos) {
  const escapar = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lineas = [
    datos.columnas.map((c) => escapar(c.etiqueta)).join(","),
    ...datos.filas.map((fila) => datos.columnas.map((c) => escapar(fila[c.clave])).join(",")),
  ];
  // BOM para que Excel respete los acentos
  const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `kollecta-${datos.reporte.id}-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------------------
   Gráfica de barras (una o dos series con la misma unidad, un solo eje)
   -------------------------------------------------------------------------- */
function Grafica({ datos }) {
  const [activo, setActivo] = useState(null);
  const { grafica, columnas, filas } = datos;
  if (!grafica || filas.length === 0) return null;

  const columnaEtiqueta = columnas.find((c) => c.clave === grafica.etiqueta);
  const series = grafica.valores.map((clave) => columnas.find((c) => c.clave === clave)).filter(Boolean);
  const maximo = Math.max(0, ...filas.flatMap((f) => series.map((s) => Number(f[s.clave]) || 0)));

  if (maximo === 0) {
    return <p className="report-chart-empty">Todavía no hay datos suficientes para graficar.</p>;
  }

  const vertical = columnaEtiqueta?.tipo === "mes";
  const visibles = vertical ? filas : filas.slice(0, 12);
  const etiquetaDe = (fila) => formatear(fila[grafica.etiqueta], columnaEtiqueta?.tipo);
  const porcentaje = (valor) => `${Math.max(((Number(valor) || 0) / maximo) * 100, valor > 0 ? 1.5 : 0)}%`;

  return (
    <figure className="report-chart">
      {series.length > 1 && (
        <figcaption className="report-legend">
          {series.map((s, i) => (
            <span key={s.clave}>
              <i style={{ background: COLORES_SERIE[i] }} aria-hidden="true" />
              {s.etiqueta}
            </span>
          ))}
        </figcaption>
      )}

      {vertical ? (
        <div className="report-columns" role="img" aria-label={`Gráfica de ${series.map((s) => s.etiqueta).join(" y ")} por mes`}>
          {visibles.map((fila, indice) => (
            <div
              key={indice}
              className={`report-column-group ${activo === indice ? "active" : ""}`}
              onMouseEnter={() => setActivo(indice)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(indice)}
              onBlur={() => setActivo(null)}
              tabIndex={0}
            >
              <div className="report-column-bars">
                {series.map((s, i) => (
                  <span
                    key={s.clave}
                    className="report-column"
                    style={{ height: porcentaje(fila[s.clave]), background: COLORES_SERIE[i] }}
                  />
                ))}
              </div>
              <span className="report-column-label">{etiquetaDe(fila)}</span>
              {activo === indice && (
                <div className="report-tooltip" role="tooltip">
                  <strong>{etiquetaDe(fila)}</strong>
                  {series.map((s, i) => (
                    <span key={s.clave}>
                      <i style={{ background: COLORES_SERIE[i] }} />
                      {s.etiqueta}: <b>{formatear(fila[s.clave], s.tipo)}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="report-bars" role="img" aria-label={`Gráfica de ${series.map((s) => s.etiqueta).join(" y ")}`}>
          {visibles.map((fila, indice) => (
            <div
              key={indice}
              className={`report-bar-row ${activo === indice ? "active" : ""}`}
              onMouseEnter={() => setActivo(indice)}
              onMouseLeave={() => setActivo(null)}
            >
              <span className="report-bar-label" title={etiquetaDe(fila)}>
                {etiquetaDe(fila)}
              </span>
              <div className="report-bar-track">
                {series.map((s, i) => (
                  <div key={s.clave} className="report-bar-line">
                    <span className="report-bar" style={{ width: porcentaje(fila[s.clave]), background: COLORES_SERIE[i] }} />
                    <span className="report-bar-value">{formatear(fila[s.clave], s.tipo)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filas.length > visibles.length && (
            <p className="report-chart-note">La gráfica muestra los primeros 12; la tabla tiene todos.</p>
          )}
        </div>
      )}
    </figure>
  );
}

function Tabla({ datos }) {
  if (datos.filas.length === 0) {
    return <EmptyState icon="chart">Todavía no hay datos para este reporte.</EmptyState>;
  }

  return (
    <div className="mod-table-wrap">
      <table className="mod-table report-table">
        <thead>
          <tr>
            {datos.columnas.map((c) => (
              <th key={c.clave} className={["texto", "usuario", "mes", "fecha"].includes(c.tipo) ? "" : "num"}>
                {c.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.filas.map((fila, i) => (
            <tr key={i}>
              {datos.columnas.map((c) => (
                <td key={c.clave} className={["texto", "usuario", "mes", "fecha"].includes(c.tipo) ? "" : "num"}>
                  {c.tipo === "usuario" && fila.username ? (
                    <Link to={`/perfil/${fila.username}`}>{fila[c.clave]}</Link>
                  ) : (
                    formatear(fila[c.clave], c.tipo)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Un reporte con sus filtros
   -------------------------------------------------------------------------- */
function Reporte({ reporte }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [meses, setMeses] = useState(6);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const usaFechas = reporte.filtros.includes("fechas");
  const usaMeses = reporte.filtros.includes("meses");

  useEffect(() => {
    let cancelado = false;
    const params = new URLSearchParams();
    if (usaFechas && desde) params.set("desde", desde);
    if (usaFechas && hasta) params.set("hasta", hasta);
    if (usaMeses) params.set("meses", meses);

    setCargando(true);
    setError("");
    apiRequest(`/reportes/${reporte.id}?${params}`)
      .then((data) => !cancelado && setDatos(data))
      .catch((err) => !cancelado && setError(err.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [reporte.id, desde, hasta, meses, usaFechas, usaMeses]);

  return (
    <section className="card report-card" aria-labelledby={`reporte-${reporte.id}`}>
      <header className="report-head">
        <div>
          <h3 id={`reporte-${reporte.id}`}>{reporte.titulo}</h3>
          <p>{reporte.descripcion}</p>
          <p className="report-sources">
            Cruza: {reporte.colecciones.map((c) => <code key={c}>{c}</code>)}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => datos && descargarCsv(datos)}
          disabled={!datos || datos.filas.length === 0}
        >
          <Icon name="download" size={14} /> CSV
        </button>
      </header>

      {(usaFechas || usaMeses) && (
        <div className="report-filters">
          {usaFechas && (
            <>
              <label>
                Desde
                <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
              </label>
              <label>
                Hasta
                <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
              </label>
              {(desde || hasta) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setDesde("");
                    setHasta("");
                  }}
                >
                  Todo el periodo
                </button>
              )}
            </>
          )}
          {usaMeses && (
            <div className="report-range" role="group" aria-label="Periodo">
              {[3, 6, 12].map((n) => (
                <button key={n} type="button" className={`chip ${meses === n ? "active" : ""}`} onClick={() => setMeses(n)}>
                  {n} meses
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {cargando && !datos ? (
        <EmptyState icon="chart">Generando reporte…</EmptyState>
      ) : (
        datos && (
          <div className={cargando ? "report-loading" : ""}>
            <Grafica datos={datos} />
            <Tabla datos={datos} />
          </div>
        )
      )}
    </section>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [catalogo, setCatalogo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/reportes")
      .then((data) => setCatalogo(data.reportes))
      .catch((err) => setError(err.message));
  }, []);

  const secciones = useMemo(
    () => SECCIONES.filter((s) => catalogo?.some((r) => r.rol === s.rol)),
    [catalogo]
  );

  const seccionActual = secciones.find((s) => s.rol === params.get("seccion")) || secciones[0];
  const reportesSeccion = (catalogo || []).filter((r) => r.rol === seccionActual?.rol);
  const reporteActual = reportesSeccion.find((r) => r.id === params.get("reporte")) || reportesSeccion[0];

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Reportes</h2>
          <div className="sub">
            Ves los reportes de tu rol ({ETIQUETA_ROL[user?.rol || "usuario"].toLowerCase()}) y de los roles anteriores.
          </div>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {!catalogo && !error && <EmptyState icon="chart">Cargando reportes…</EmptyState>}

      {catalogo && seccionActual && (
        <>
          {secciones.length > 1 && (
            <div className="tabs" role="tablist">
              {secciones.map((s) => (
                <button
                  key={s.rol}
                  role="tab"
                  aria-selected={s.rol === seccionActual.rol}
                  className={`tab ${s.rol === seccionActual.rol ? "active" : ""}`}
                  onClick={() => setParams({ seccion: s.rol }, { replace: true })}
                >
                  {s.etiqueta}
                </button>
              ))}
            </div>
          )}

          <p className="report-section-sub">{seccionActual.sub}</p>

          <div className="report-picker">
            {reportesSeccion.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`report-pick ${r.id === reporteActual?.id ? "active" : ""}`}
                onClick={() => setParams({ seccion: seccionActual.rol, reporte: r.id }, { replace: true })}
              >
                <Icon name="chart" size={16} />
                <span>{r.titulo}</span>
              </button>
            ))}
          </div>

          {reporteActual && <Reporte key={reporteActual.id} reporte={reporteActual} />}
        </>
      )}
    </main>
  );
}
