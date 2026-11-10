import { apiRequest } from "../api/client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "../components/Avatar";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES, GROUP_NAMES } from "../data/mockData";
import { categoryClass, categoryIcon } from "../utils/categories";
import { formatMoney } from "../utils/format";

const MODES = ["Venta", "Intercambio", "Ambos"];

const CONDITIONS = [
  "Nuevo / sellado",
  "Como nuevo",
  "Buen estado",
  "Con desgaste visible",
];

const MAX_FOTOS = 10;
const MAX_TAMANO_FOTO = 5 * 1024 * 1024;

export default function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Referencia al input que permite seleccionar archivos.
  const inputFotosRef = useRef(null);

  const [fotos, setFotos] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [errorFotos, setErrorFotos] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [errorPublicacion, setErrorPublicacion] = useState("");

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

  // Liberar las URL temporales de las imágenes al desmontar
  // el componente o cuando se eliminen fotos.
  useEffect(() => {
    return () => {
      fotos.forEach((foto) => URL.revokeObjectURL(foto.preview));
    };
  }, [fotos]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  // Seleccionar o arrastrar imágenes.
  function agregarFotos(archivos) {
    const seleccionados = Array.from(archivos || []);

    if (seleccionados.length === 0) return;

    setErrorFotos("");

    const nuevasFotos = [];

    for (const archivo of seleccionados) {
      if (!archivo.type.startsWith("image/")) {
        setErrorFotos("Solo puedes seleccionar archivos de imagen.");
        continue;
      }

      if (archivo.size > MAX_TAMANO_FOTO) {
        setErrorFotos(
          `"${archivo.name}" supera el límite de 5 MB.`
        );
        continue;
      }

      nuevasFotos.push(archivo);
    }

    setFotos((actuales) => {
      const espacioDisponible = MAX_FOTOS - actuales.length;

      if (espacioDisponible <= 0) {
        setErrorFotos("Ya alcanzaste el máximo de 10 fotos.");
        return actuales;
      }

      const aceptadas = nuevasFotos.slice(0, espacioDisponible);

      if (nuevasFotos.length > espacioDisponible) {
        setErrorFotos("Solo puedes agregar un máximo de 10 fotos.");
      }

      const preparadas = aceptadas.map((archivo) => ({
        archivo,
        preview: URL.createObjectURL(archivo),
      }));

      return [...actuales, ...preparadas];
    });
  }

  // Abrir el selector de archivos.
  function abrirSelectorFotos() {
    inputFotosRef.current?.click();
  }

  function manejarSeleccion(event) {
    agregarFotos(event.target.files);

    // Permite volver a seleccionar el mismo archivo.
    event.target.value = "";
  }

  function manejarArrastre(event) {
    event.preventDefault();
    setArrastrando(true);
  }

  function manejarSalida(event) {
    event.preventDefault();

    // Evita quitar el resaltado cuando el cursor pasa
    // de la zona principal a uno de sus elementos hijos.
    if (
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setArrastrando(false);
  }

  function manejarSoltado(event) {
    event.preventDefault();
    setArrastrando(false);

    agregarFotos(event.dataTransfer.files);
  }

  function eliminarFoto(indice) {
    setFotos((actuales) =>
      actuales.filter((_, i) => i !== indice)
    );

    setErrorFotos("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (publicando) return;

    setPublicando(true);
    setErrorPublicacion("");

    try {
      const datos = new FormData();

      // Datos principales del artículo
      datos.append("titulo", form.title.trim());
      datos.append("grupo", form.group);
      datos.append("categoria", form.type);
      datos.append("descripcion", form.description);
      datos.append(
        "valorEstimado",
        form.price !== "" ? form.price : "0"
      );

      // Adaptar el estado al enum del modelo de MongoDB
      const estados = {
        "Nuevo / sellado": "Nuevo / sellado",
        "Como nuevo": "Como nuevo",
        "Buen estado": "Buen estado",
        "Con desgaste visible": "Con detalles",
      };

      datos.append("estado", estados[form.condition]);

      // Modalidad de publicación
      datos.append(
        "disponibleCompra",
        String(form.mode !== "Intercambio")
      );

      datos.append(
        "disponibleIntercambio",
        String(form.mode !== "Venta")
      );

      // Fotografías seleccionadas
      fotos.forEach((foto) => {
        datos.append("imagenes", foto.archivo);
      });

      // Enviar al backend
      const respuesta = await apiRequest("/coleccion/articulos", {
        method: "POST",
        body: datos,
      });

      alert(respuesta.mensaje || "¡Artículo publicado correctamente!");

      navigate("/coleccion");
    } catch (error) {
      console.error("Error al publicar el artículo:", error);

      setErrorPublicacion(
        error.message || "No se pudo publicar el artículo."
      );
    } finally {
      setPublicando(false);
    }
  }

  const isTrade = form.mode === "Intercambio";

  return (
    <main className="page">
      <div className="layout-2col">
        <form
          className="card"
          style={{ padding: 24 }}
          onSubmit={handleSubmit}
        >
          <div className="section-title">
            <h3>Datos del artículo</h3>
          </div>

          <div className="field">
            <label htmlFor="s-title">Título</label>

            <input
              type="text"
              id="s-title"
              name="title"
              placeholder="Ej. Photocard Jimin — 'Face' Album"
              required
              value={form.title}
              onChange={updateField}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="s-group">Grupo</label>

              <select
                id="s-group"
                name="group"
                value={form.group}
                onChange={updateField}
              >
                {GROUP_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="s-type">Categoría</label>

              <select
                id="s-type"
                name="type"
                value={form.type}
                onChange={updateField}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selección y arrastre de fotografías */}
          <div className="field">
            <label>Fotos del artículo</label>

            <div
              role="button"
              tabIndex={0}
              aria-label="Seleccionar fotos del artículo"
              onClick={abrirSelectorFotos}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  abrirSelectorFotos();
                }
              }}
              onDragOver={manejarArrastre}
              onDragLeave={manejarSalida}
              onDrop={manejarSoltado}
              style={{
                border: `1.5px dashed ${
                  arrastrando
                    ? "var(--cyan)"
                    : "var(--border-strong)"
                }`,
                borderRadius: "var(--radius-md)",
                padding: 28,
                textAlign: "center",
                color: "var(--text-faint)",
                fontSize: 13,
                cursor: "pointer",
                background: arrastrando
                  ? "rgba(0, 220, 255, 0.08)"
                  : "transparent",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              <Icon name="package" size={24} />

              <div style={{ marginTop: 8 }}>
                Arrastra tus fotos aquí o{" "}
                <span
                  style={{
                    color: "var(--cyan)",
                    fontWeight: 700,
                  }}
                >
                  selecciona archivos
                </span>
              </div>

              <div
                className="hint"
                style={{ marginTop: 6 }}
              >
                Puedes agregar hasta 10 fotos de máximo 5 MB
                cada una.
              </div>

              <div
                className="hint"
                style={{ marginTop: 4 }}
              >
                {fotos.length} de {MAX_FOTOS} fotos seleccionadas
              </div>
            </div>

            <input
              ref={inputFotosRef}
              type="file"
              accept="image/*"
              multiple
              onChange={manejarSeleccion}
              style={{ display: "none" }}
            />

            {errorFotos && (
              <p
                role="alert"
                style={{
                  color: "var(--pink)",
                  marginTop: 8,
                  fontSize: 12,
                }}
              >
                {errorFotos}
              </p>
            )}

            {/* Vista previa de las imágenes seleccionadas */}
            {fotos.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {fotos.map((foto, indice) => (
                  <div
                    key={`${foto.archivo.name}-${indice}`}
                    style={{
                      position: "relative",
                      minWidth: 0,
                    }}
                  >
                    <img
                      src={foto.preview}
                      alt={`Foto ${indice + 1} del artículo`}
                      style={{
                        width: "100%",
                        height: 110,
                        objectFit: "cover",
                        borderRadius: 10,
                        border: "1px solid var(--border-strong)",
                        display: "block",
                      }}
                    />

                    <button
                      type="button"
                      aria-label={`Eliminar foto ${indice + 1}`}
                      title="Eliminar foto"
                      onClick={(event) => {
                        event.stopPropagation();
                        eliminarFoto(indice);
                      }}
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        background: "rgba(15, 10, 28, 0.9)",
                        color: "#fff",
                        fontSize: 17,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>

                    <div
                      title={foto.archivo.name}
                      style={{
                        fontSize: 10,
                        marginTop: 5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {foto.archivo.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="section-title"
            style={{ marginTop: 8 }}
          >
            <h3>Modalidad</h3>
          </div>

          <div className="trade-toggle">
            {MODES.map((mode) => (
              <div
                key={mode}
                role="button"
                tabIndex={0}
                className={`opt ${
                  form.mode === mode ? "active" : ""
                }`}
                onClick={() =>
                  setForm((actual) => ({
                    ...actual,
                    mode,
                  }))
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();

                    setForm((actual) => ({
                      ...actual,
                      mode,
                    }));
                  }
                }}
              >
                {mode}
              </div>
            ))}
          </div>

          {!isTrade && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="s-price">
                  Precio (MXN)
                </label>

                <input
                  type="number"
                  id="s-price"
                  name="price"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={updateField}
                />
              </div>

              <div className="field">
                <label htmlFor="s-condition">Estado</label>

                <select
                  id="s-condition"
                  name="condition"
                  value={form.condition}
                  onChange={updateField}
                >
                  {CONDITIONS.map((condition) => (
                    <option
                      key={condition}
                      value={condition}
                    >
                      {condition}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {form.mode !== "Venta" && (
            <div className="field">
              <label htmlFor="s-wants">
                ¿Qué buscas a cambio?
              </label>

              <input
                type="text"
                id="s-wants"
                name="wants"
                placeholder="Ej. Photocard de Rosé, versión japonesa"
                value={form.wants}
                onChange={updateField}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="s-desc">Descripción</label>

            <textarea
              id="s-desc"
              name="description"
              placeholder="Cuenta el estado del artículo, si viene con extras, etc."
              value={form.description}
              onChange={updateField}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 8,
            }}
          >
            
            {errorPublicacion && (
              <p role="alert" style={{ color: "var(--pink)", fontSize: 13 }}>
                {errorPublicacion}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={publicando}
            >
              {publicando ? "Publicando..." : "Publicar artículo"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
            >
              Guardar borrador
            </button>
          </div>
        </form>

        {/* Vista previa del artículo */}
        <div>
          <div className="card side-card">
            <h4>Vista previa</h4>

            <div
              className="card product-card"
              style={{ cursor: "default" }}
            >
              <div
                className={`thumb ${categoryClass(form.type)}`}
              >
                {fotos.length > 0 ? (
                  <img
                    src={fotos[0].preview}
                    alt={form.title || "Vista previa del artículo"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span className="category-icon">
                    <Icon
                      name={categoryIcon(form.type)}
                      size={32}
                    />
                  </span>
                )}

                <span
                  className={`tag pill ${
                    isTrade ? "cyan" : "pink"
                  }`}
                >
                  {form.mode}
                </span>
              </div>

              <div className="body">
                <div className="group-name">
                  {form.group}
                </div>

                <div className="title">
                  {form.title || "Título de tu artículo"}
                </div>

                <div className="price-row">
                  <span className="price">
                    {isTrade ? (
                      <>
                        <Icon name="repeat" size={14} />{" "}
                        Intercambio
                      </>
                    ) : (
                      <>
                        {formatMoney(form.price || 0)}{" "}
                        <small>MXN</small>
                      </>
                    )}
                  </span>
                </div>

                <div className="seller">
                  <UserAvatar
                    user={user}
                    size={20}
                    fontSize={9}
                  />

                  <span>@{user?.username || "usuario"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card side-card">
            <h4>Consejos para vender rápido</h4>

            <ul
              style={{
                fontSize: 12.5,
                color: "var(--text-dim)",
                lineHeight: 1.6,
                margin: 0,
                paddingLeft: 18,
              }}
            >
              <li>
                Usa buena iluminación y fotos del artículo real.
              </li>
              <li>Sé honesto con el estado del artículo.</li>
              <li>
                Responde rápido a los mensajes de interesados.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}